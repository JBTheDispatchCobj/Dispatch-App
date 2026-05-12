"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchProfile,
  mayAccessStaffRoutes,
  shouldUseManagerHome,
  type ProfileFetchFailure,
} from "@/lib/profile";
import {
  redirectToLoginUnlessLocalDevBypass,
  resolveAuthUser,
} from "@/lib/dev-auth-bypass";
import ProfileLoadError from "@/app/profile-load-error";
import { supabase } from "@/lib/supabase";
import {
  partitionStaffHomeTasks,
  type StaffHomeBucket,
} from "@/lib/staff-home-bucket";
import { getTodaysReservationCounts } from "@/lib/reservations";
import { clockIn, fetchClockedInAt } from "@/lib/clock-in";
import {
  PRE_STAYOVER_RESHUFFLE_AT,
  PROPERTY_TIMEZONE,
  WEEKEND_DAY_NUMBERS,
} from "@/lib/dispatch-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BucketKey = "sod" | "d" | "s" | "a" | "da" | "e";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  card_type: string;
  context: unknown;
  room_number: string | null;
};

// ---------------------------------------------------------------------------
// Bucket config
// ---------------------------------------------------------------------------

const INCOMPLETE_STATUSES = new Set(["open", "in_progress", "paused", "blocked"]);

// Day 38 — Standard time-arc order vs. Reshuffled order. Reshuffled
// applies when past PRE_STAYOVER_RESHUFFLE_AT (11 AM weekday / 12 PM
// weekend) AND Departures still has incomplete tasks. Day 54 chase #1
// keeps this reshuffle but drops the hard sequential gating —
// reshuffle now just changes RENDER ORDER, not lockability. Staff can
// work any bucket any time; clock-out is the gate.
const STANDARD_BUCKET_ORDER: BucketKey[] = ["sod", "d", "s", "a", "da", "e"];
const RESHUFFLED_BUCKET_ORDER: BucketKey[] = ["sod", "s", "a", "d", "da", "e"];

// Day 54 chase #2 — single-task buckets. SOD, Dailys, and EOD are
// conceptually one card per shift (one X-430 with internal checklist
// tiles), not N task rows like Departures/Stayovers/Arrivals. The
// bucket header for these buckets renders as a direct <Link> to the
// task's detail card — no expansion affordance, no chevron, no rows
// on the home. Bryan's product call: "you can only click the top one"
// for Dailys; "you can just open it" for SOD/EOD. Multi-task buckets
// (Departures / Stayovers / Arrivals) keep the expand-and-row-link
// behavior since each task is a separate room.
const DIRECT_LINK_BUCKETS = new Set<BucketKey>(["sod", "da", "e"]);

// Type-safe StaffHomeBucket → BucketKey pairs in display order
const BUCKET_ENTRIES: [StaffHomeBucket, BucketKey][] = [
  ["start_of_day", "sod"],
  ["departures",   "d"],
  ["stayovers",    "s"],
  ["arrivals",     "a"],
  ["dailys",       "da"],
  ["eod",          "e"],
];

type BucketStatic = {
  title: string;
  abbr: string;       // 3-char abbr in left column: SOD / DEP / STA / ARR / DLY / EOD
  dataAttr: string;   // CSS [data-bucket="..."] selector value
};

const BUCKET_STATIC: Record<BucketKey, BucketStatic> = {
  sod: { title: "Start of Day", abbr: "SOD", dataAttr: "sod" },
  d:   { title: "Departures",   abbr: "DEP", dataAttr: "departures" },
  s:   { title: "Stayovers",    abbr: "STA", dataAttr: "stayovers" },
  a:   { title: "Arrivals",     abbr: "ARR", dataAttr: "arrivals" },
  da:  { title: "Dailys",       abbr: "DLY", dataAttr: "dailys" },
  e:   { title: "End of Day",   abbr: "EOD", dataAttr: "eod" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function firstName(displayName: string): string {
  const t = displayName.trim();
  if (!t) return "there";
  return t.split(/\s+/)[0] ?? t;
}

function formatGreetDate(d: Date): string {
  const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
  const month = d.toLocaleDateString(undefined, { month: "long" });
  return `${weekday} · ${month} ${d.getDate()}`;
}

function formatShortDate(d: Date): string {
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
  const month = d.toLocaleDateString(undefined, { month: "short" });
  return `${weekday} · ${month} ${d.getDate()}`;
}

// Day 38 — late-Departures reshuffle gate. Returns true when the given
// timestamp is at or past the PRE_STAYOVER_RESHUFFLE_AT cutoff in the
// property timezone. Cutoff is 11:00 weekdays / 12:00 weekend per
// dispatch-config.ts Section 5 (R13–R15).
function isPastReshuffleTime(now: Date): boolean {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: PROPERTY_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const weekdayShort = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dayNumber = weekdayMap[weekdayShort] ?? -1;
  const isWeekend = WEEKEND_DAY_NUMBERS.has(dayNumber);
  const cutoff = isWeekend
    ? PRE_STAYOVER_RESHUFFLE_AT.weekend
    : PRE_STAYOVER_RESHUFFLE_AT.weekday;
  const [cHourStr, cMinStr] = cutoff.split(":");
  const cutoffHour = parseInt(cHourStr, 10);
  const cutoffMin = parseInt(cMinStr, 10);
  return hour > cutoffHour || (hour === cutoffHour && minute >= cutoffMin);
}

function computeBucketOrder(
  now: Date,
  departuresHasIncomplete: boolean,
): BucketKey[] {
  if (!departuresHasIncomplete) return STANDARD_BUCKET_ORDER;
  if (!isPastReshuffleTime(now)) return STANDARD_BUCKET_ORDER;
  return RESHUFFLED_BUCKET_ORDER;
}

// Parse the jsonb `tasks.context` blob safely. Mirrors lib/staff-home-bucket.ts.
function parseContext(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    try {
      const o = JSON.parse(raw) as unknown;
      return o && typeof o === "object" && !Array.isArray(o)
        ? (o as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

function readObjectField(
  ctx: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const v = ctx[key];
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

// Format a 24h "HH:MM" / "HH:MM:SS" string → 12h "H:MM AM/PM".
// Returns a default of "2:00 PM" when input is empty (per Bryan's spec
// for Arrivals — default check-in 2:00 PM if system has no data).
function formatEta(raw: string): string {
  const m = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return raw || "2:00 PM";
  const h24 = parseInt(m[1], 10);
  const mm = m[2];
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${mm} ${period}`;
}

// Per-bucket row content shape:
//   Departures: Room # · type · guest · clean type
//   Stayovers:  Room # · type · guest · Night N/M
//   Arrivals:   Room # · type · guest · ETA (default 2:00 PM)
//   Dailys:     task title · location · (no meta)
//   SOD:        task title · location · (no meta)
//   EOD:        Wrap Shift · "Sign off & clock out" · short date
// When `context.{outgoing,incoming,current}_guest` is missing, the row
// falls back to task.title / room_number / em-dash. The X-430 detail
// card still does the V.A BR4 reservation fallback per-task on tap;
// we don't repeat that here (would multiply DB calls).
type RowContent = {
  primary: string;
  secondary: string;
  meta?: string;
};

function buildRowContent(task: TaskRow, bucket: BucketKey): RowContent {
  const ctx = parseContext(task.context);
  const room = task.room_number ?? "";

  if (bucket === "d") {
    const og = readObjectField(ctx, "outgoing_guest");
    const roomType = asString(og.room_type);
    const guestName = asString(og.name);
    const cleanType = asString(og.clean_type) || "Standard";
    return {
      primary: room && roomType
        ? `Room ${room} · ${roomType}`
        : room ? `Room ${room}` : task.title,
      secondary: guestName || "—",
      meta: cleanType,
    };
  }

  if (bucket === "s") {
    const cg = readObjectField(ctx, "current_guest");
    const roomType = asString(cg.room_type);
    const guestName = asString(cg.name);
    const nightN = cg.night_n;
    const totalN = cg.total_nights;
    const nightDisplay =
      typeof nightN === "number" && typeof totalN === "number"
        ? `Night ${nightN} / ${totalN}`
        : "";
    return {
      primary: room && roomType
        ? `Room ${room} · ${roomType}`
        : room ? `Room ${room}` : task.title,
      secondary: guestName || "—",
      meta: nightDisplay || undefined,
    };
  }

  if (bucket === "a") {
    const ig = readObjectField(ctx, "incoming_guest");
    const roomType = asString(ig.room_type);
    const guestName = asString(ig.name);
    const rawEta = asString(ig.checkin_time) || asString(ig.eta);
    return {
      primary: room && roomType
        ? `Room ${room} · ${roomType}`
        : room ? `Room ${room}` : task.title,
      secondary: guestName || "—",
      meta: formatEta(rawEta),
    };
  }

  if (bucket === "e") {
    return {
      primary: task.title || "Wrap Shift",
      secondary: "Sign off & clock out",
      meta: formatShortDate(new Date()),
    };
  }

  // SOD or Dailys — task.title + location_label-equivalent
  const location =
    asString(ctx.location) ||
    asString(ctx.location_label) ||
    asString(ctx.where) ||
    "";
  return {
    primary: task.title || "Task",
    secondary: location || "—",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StaffHomePage() {
  const [ready, setReady] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [staffId, setStaffId] = useState<string | null>(null);
  const [clockedInAt, setClockedInAt] = useState<string | null | undefined>(undefined);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockInError, setClockInError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(null);
  // Day 54 chase #1 — single-accordion expansion. null = no bucket open.
  // First bucket with open tasks auto-expands once on initial task load
  // (see useEffect below). After that, expanding is fully user-driven.
  const [expandedBucket, setExpandedBucket] = useState<BucketKey | null>(null);
  const [now] = useState(() => new Date());
  // Brief counts — initial fallback values match the pre-BR1 hardcoded brief
  // so the card renders sensibly before reservations table is in place.
  const [briefCounts, setBriefCounts] = useState({
    arrivals: 3,
    departures: 2,
    stayovers: 4,
  });

  const loadTasks = useCallback(async (sid: string | null) => {
    setLoadingTasks(true);
    setError(null);
    if (!sid) {
      setTasks([]);
      setLoadingTasks(false);
      return;
    }
    // Day 54 chase #1 — added room_number to the select so per-bucket
    // row content can render "Room 29 · Single Queen" without a separate
    // per-task fetch. Existing priority_tier + due_date sort preserved.
    const { data, error: qErr } = await supabase
      .from("tasks")
      .select("id, title, status, card_type, context, room_number")
      .eq("staff_id", sid)
      .order("context->priority_tier", { ascending: true, nullsFirst: false })
      .order("due_date", { ascending: true, nullsFirst: false });
    if (qErr) {
      setError(qErr.message);
      setTasks([]);
      setLoadingTasks(false);
      return;
    }
    const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      title: String(r.title ?? ""),
      status: String(r.status ?? "open"),
      card_type: String(r.card_type ?? "housekeeping_turn"),
      context: r.context,
      room_number: r.room_number ? String(r.room_number) : null,
    }));
    setTasks(rows);
    setLoadingTasks(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      const user = resolveAuthUser(session);
      if (!user) {
        redirectToLoginUnlessLocalDevBypass();
        return;
      }
      const result = await fetchProfile(supabase, user);
      if (cancelled) return;
      if (!result.ok) {
        setProfileFailure(result.failure);
        return;
      }
      const p = result.profile;
      if (shouldUseManagerHome(p)) {
        window.location.replace("/");
        return;
      }
      if (!mayAccessStaffRoutes(p)) {
        window.location.replace("/");
        return;
      }
      setDisplayName(p.display_name);
      setStaffId(p.staff_id ?? null);

      // Master plan I.C — fetch the staff row's clocked_in_at to decide
      // whether to render the Pre-Clock-In screen (I.B) or the bucket deck.
      if (p.staff_id) {
        const clk = await fetchClockedInAt(supabase, p.staff_id);
        if (!cancelled) setClockedInAt(clk);
        if (clk) {
          await loadTasks(p.staff_id);
        } else {
          setLoadingTasks(false);
        }
      } else {
        setClockedInAt(null);
        await loadTasks(null);
      }
      setReady(true);

      // BR3 — live reservation counts. Non-blocking.
      try {
        const counts = await getTodaysReservationCounts();
        if (!cancelled) setBriefCounts(counts);
      } catch (err) {
        console.warn(
          "[staff-home] Reservation counts unavailable; using fallback. Apply docs/supabase/reservations_br1.sql to enable.",
          err,
        );
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (cancelled) return;
      if (!session) redirectToLoginUnlessLocalDevBypass();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadTasks]);

  // Per-bucket partitioned tasks + derived state.
  const partitionedTasks = useMemo(() => partitionStaffHomeTasks(tasks), [tasks]);

  const bucketStates = useMemo(() => {
    const out = {} as Record<BucketKey, {
      tasks: TaskRow[];
      openCount: number;
      totalCount: number;
      isDone: boolean;   // all tasks done (and there's at least one task)
      isEmpty: boolean;  // 0 tasks total
    }>;
    for (const [bucket, key] of BUCKET_ENTRIES) {
      const bucketTasks = partitionedTasks[bucket] ?? [];
      const openCount = bucketTasks.filter(
        (t) => INCOMPLETE_STATUSES.has(t.status),
      ).length;
      out[key] = {
        tasks: bucketTasks,
        openCount,
        totalCount: bucketTasks.length,
        isDone: bucketTasks.length > 0 && openCount === 0,
        isEmpty: bucketTasks.length === 0,
      };
    }
    return out;
  }, [partitionedTasks]);

  // Day 38 — dynamic bucket order; late-Departures reshuffle preserved.
  const bucketOrder = useMemo<BucketKey[]>(
    () => computeBucketOrder(now, bucketStates.d.openCount > 0),
    [now, bucketStates],
  );

  const totalOpenCount = useMemo(
    () => tasks.filter((t) => INCOMPLETE_STATUSES.has(t.status)).length,
    [tasks],
  );
  const totalDoneCount = useMemo(
    () => tasks.filter((t) => t.status === "done").length,
    [tasks],
  );

  // Auto-expand first bucket with open tasks once on initial task load.
  // Ref-gated so subsequent task updates (e.g., a task being marked done
  // and the bucket no longer having opens) don't re-trigger the
  // auto-expand and clobber the user's manual collapse.
  // Day 54 chase #2 — skip direct-link buckets (SOD/Dailys/EOD); they
  // don't have an expanded state in the new model.
  const autoExpandedOnceRef = useRef(false);
  useEffect(() => {
    if (autoExpandedOnceRef.current) return;
    if (loadingTasks) return;
    if (tasks.length === 0) {
      autoExpandedOnceRef.current = true;
      return;
    }
    for (const key of bucketOrder) {
      if (DIRECT_LINK_BUCKETS.has(key)) continue;
      if (bucketStates[key].openCount > 0) {
        setExpandedBucket(key);
        autoExpandedOnceRef.current = true;
        return;
      }
    }
    autoExpandedOnceRef.current = true;
  }, [loadingTasks, tasks, bucketOrder, bucketStates]);

  const handleClockIn = useCallback(async () => {
    if (!staffId || clockingIn) return;
    setClockingIn(true);
    setClockInError(null);
    const result = await clockIn(supabase, staffId);
    if (!result.ok) {
      setClockInError(result.message);
      setClockingIn(false);
      return;
    }
    setClockedInAt(result.clockedInAt);
    await loadTasks(staffId);
    setClockingIn(false);
  }, [staffId, clockingIn, loadTasks]);

  // Single-accordion expansion. Tapping an open bucket header collapses
  // it; tapping a different one collapses the prior + expands this one.
  // Done buckets stay tappable (Day 38 re-touch rule); empty buckets
  // still expand to show their "No <bucket> today" placeholder.
  const handleBucketTap = (key: BucketKey) => {
    setExpandedBucket((current) => (current === key ? null : key));
  };

  if (profileFailure) {
    return <ProfileLoadError failure={profileFailure} />;
  }

  if (!ready) {
    return (
      <main className="staff-home">
        <div className="staff-home__shell">
          <p style={{
            color: error ? "#d32f2f" : "var(--cream-muted)",
            fontFamily: "ui-monospace, monospace",
            fontSize: "11px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            padding: "24px 4px",
          }}>
            {error ?? "Loading…"}
          </p>
        </div>
      </main>
    );
  }

  // Master plan I.B — Pre-Clock-In screen. Renders only when we know
  // for sure the staff member is clocked out (clockedInAt === null).
  if (clockedInAt === null && staffId) {
    return (
      <main className="staff-home">
        <div className="staff-home__shell">
          <div className="staff-home__pre-clock">
            <div className="staff-home__pre-clock-greet">
              <h1 className="staff-home__hello">Hi, {firstName(displayName)}.</h1>
              <p className="staff-home__date">{formatGreetDate(now)}</p>
            </div>
            <p className="staff-home__pre-clock-msg">
              Tap below when you&rsquo;re ready to start your shift.
            </p>
            {clockInError && (
              <div className="staff-home__pre-clock-error" role="alert">
                {clockInError}
              </div>
            )}
            <button
              type="button"
              className="staff-home__clock-in-cta"
              onClick={handleClockIn}
              disabled={clockingIn}
            >
              {clockingIn ? "Starting…" : "Start your day"}
            </button>
          </div>
          <p className="staff-home__foot">The Dispatch Co &middot; Staff</p>
        </div>
      </main>
    );
  }

  // Clock-out gate computed values for the footer card.
  const incompleteBucketCount = bucketOrder.filter(
    (k) => bucketStates[k].openCount > 0,
  ).length;
  const clockOutReady = tasks.length > 0 && totalOpenCount === 0;

  return (
    <main className="staff-home">
      <div className="staff-home__shell">

        <div className="staff-home__hdr">
          <div>
            <h1 className="staff-home__hello">Hi, {firstName(displayName)}.</h1>
            <p className="staff-home__date">{formatGreetDate(now)}</p>
          </div>
        </div>

        {/* Daily brief — UNCHANGED from Day 20 / Day 47 (Bryan's spec:
            keep the header + brief identical, only redesign below). */}
        <div className="staff-home__brief">
          <div className="staff-home__brief-head">
            <span>Daily brief</span>
            <span>{formatShortDate(now)}</span>
          </div>
          <div className="staff-home__brief-grid">
            <div>
              <div className="staff-home__brief-lbl">Arrivals</div>
              <div className="staff-home__brief-val">{briefCounts.arrivals}</div>
            </div>
            <div>
              <div className="staff-home__brief-lbl">Departures</div>
              <div className="staff-home__brief-val">{briefCounts.departures}</div>
            </div>
            <div>
              <div className="staff-home__brief-lbl">Stayovers</div>
              <div className="staff-home__brief-val">{briefCounts.stayovers}</div>
            </div>
          </div>
        </div>

        <div className="staff-home__tasksbar">
          <span>Tasks today</span>
          <span>
            {totalOpenCount} open
            {totalDoneCount > 0 ? ` · ${totalDoneCount} done` : ""}
          </span>
        </div>

        {/* Day 54 chase #1 — new stacked-deck render. Replaces the old
            .deck / .bcard hard-locked sequential deck. All buckets
            always visible + expandable; rows go directly to /staff/task/[id]
            via <Link>; per-row checkmark mirrors task.status. */}
        <div className="bucket-deck">
          {bucketOrder.map((key) => {
            const stat = BUCKET_STATIC[key];
            const state = bucketStates[key];
            // Day 54 chase #2 — SOD / Dailys / EOD render as a single
            // navigation link (one task per shift). No expansion.
            const isDirectLink = DIRECT_LINK_BUCKETS.has(key);
            const firstTaskId = state.tasks[0]?.id ?? null;
            const directLinkHref =
              isDirectLink && firstTaskId ? `/staff/task/${firstTaskId}` : null;
            const isExpanded = !isDirectLink && expandedBucket === key;
            const showStack = state.totalCount > 1 && !isExpanded;
            const classes = ["bucket"];
            if (showStack) classes.push("bucket--has-stack");
            if (isExpanded) classes.push("bucket--expanded");
            if (state.isDone) classes.push("bucket--done");
            if (state.isEmpty) classes.push("bucket--empty");
            // Count shown in header pill:
            //   Active (has opens): open count, solid accent
            //   Done (all done):    total count, outlined + check
            //   Empty (0 tasks):    "0", outlined
            const headerCount = state.isEmpty
              ? 0
              : state.isDone
                ? state.totalCount
                : state.openCount;

            // Inner content of the bucket header (same regardless of
            // whether wrapper is Link, button, or inert div).
            const headerInner = (
              <>
                <div className="bucket__stripe" />
                <div className="bucket__head-body">
                  <div className="bucket__abbr">{stat.abbr}</div>
                  <div className="bucket__name">{stat.title}</div>
                </div>
                <div className="bucket__right">
                  {state.isDone && (
                    <div className="bucket__check" aria-label="All complete">
                      ✓
                    </div>
                  )}
                  <div className="bucket__count">{headerCount}</div>
                  {!state.isEmpty && !isDirectLink && (
                    <span className="bucket__chevron" aria-hidden>
                      ▾
                    </span>
                  )}
                </div>
              </>
            );

            return (
              <div
                key={key}
                className={classes.join(" ")}
                data-bucket={stat.dataAttr}
              >
                {directLinkHref ? (
                  <Link href={directLinkHref} className="bucket__header">
                    {headerInner}
                  </Link>
                ) : isDirectLink ? (
                  // Direct-link bucket but no task to link to (count=0).
                  // Render inert — no click handler, no Link target.
                  <div className="bucket__header bucket__header--inert">
                    {headerInner}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="bucket__header"
                    onClick={() => handleBucketTap(key)}
                    aria-expanded={isExpanded}
                    aria-controls={`bucket-rows-${key}`}
                  >
                    {headerInner}
                  </button>
                )}
                {isExpanded && (
                  <div className="bucket__rows" id={`bucket-rows-${key}`}>
                    {state.tasks.length === 0 ? (
                      <div className="bucket-row bucket-row--empty">
                        <div className="bucket-row__stripe" />
                        <div className="bucket-row__check" />
                        <div className="bucket-row__body">
                          <div className="bucket-row__primary">
                            No {stat.title.toLowerCase()} today
                          </div>
                        </div>
                      </div>
                    ) : (
                      state.tasks.map((task) => {
                        const content = buildRowContent(task, key);
                        const isTaskDone = task.status === "done";
                        const rowClasses = ["bucket-row"];
                        if (isTaskDone) rowClasses.push("bucket-row--done");
                        return (
                          <Link
                            key={task.id}
                            href={`/staff/task/${task.id}`}
                            className={rowClasses.join(" ")}
                          >
                            <div className="bucket-row__stripe" />
                            <div className="bucket-row__check" aria-hidden>
                              ✓
                            </div>
                            <div className="bucket-row__body">
                              <div className="bucket-row__primary">
                                {content.primary}
                              </div>
                              {content.secondary && (
                                <div className="bucket-row__secondary">
                                  {content.secondary}
                                </div>
                              )}
                            </div>
                            {content.meta && (
                              <div className="bucket-row__meta">
                                {content.meta}
                              </div>
                            )}
                          </Link>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Day 54 chase #1 — clock-out gate visualization. Real gate
            enforcement lives in lib/clock-in.ts canWrapShift + the
            EOD detail card. This footer mirrors that state on the
            home page so staff knows what's left before they can wrap. */}
        {tasks.length > 0 && (
          <div className={`clockout-gate${clockOutReady ? " clockout-gate--ready" : ""}`}>
            <div className="clockout-gate__label">Clock-Out Gate</div>
            <div className="clockout-gate__text">
              {clockOutReady
                ? "All buckets clear. Open End of Day to wrap your shift."
                : `${totalOpenCount} card${totalOpenCount === 1 ? "" : "s"} still open across ${incompleteBucketCount} bucket${incompleteBucketCount === 1 ? "" : "s"}.`}
            </div>
          </div>
        )}

        <p className="staff-home__foot">The Dispatch Co · Staff</p>
      </div>
    </main>
  );
}
