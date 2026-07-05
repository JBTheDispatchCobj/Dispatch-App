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
  isRolledOver,
  partitionStaffHomeTasks,
  staffHomeBucketForTask,
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

// Day 54 chase #3 — Dailys preview-expand surface fetches the underlying
// task_checklist_items for the Dailys task so they render inline on the
// home page (display-only — Bryan's "you can only click the top one"
// rule). Rows are keyed by item.id; done state mirrors item.done.
type ChecklistRow = {
  id: string;
  task_id: string;
  title: string;
  sort_order: number | null;
  done: boolean;
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

// Day 54 chase #2 / #3 / #4 — three bucket render modes:
//
//   DIRECT_LINK_BUCKETS  — single-task, no expansion. Bucket header is
//                          a direct <Link> to the task's detail card.
//                          Currently {sod, e}. EOD additionally gates
//                          on all-non-eod-buckets-clear (chase #3).
//
//   PREVIEW_EXPAND_BUCKETS — Expands like a multi-task bucket (whole
//                            header is a toggle button, no split, no
//                            separate Link), BUT the expanded rows
//                            show task_checklist_items (display-only,
//                            no Link wrap). Bryan's chase #4 spec:
//                            "Should be able to be expanded like the
//                            other tabs that are not EOD and SOD";
//                            rows are NOT clickable as individual tasks.
//                            Currently {da}.
//
//   (multi-task default)   — Departures / Stayovers / Arrivals. Whole
//                            header is a toggle <button>; rows are
//                            <Link> anchors to each task's detail.
//
const DIRECT_LINK_BUCKETS = new Set<BucketKey>(["sod", "e"]);
const PREVIEW_EXPAND_BUCKETS = new Set<BucketKey>(["da"]);

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
  const [dailysChecklist, setDailysChecklist] = useState<ChecklistRow[]>([]);
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
    const rows = ((data ?? []) as Record<string, unknown>[])
      .map((r) => ({
        id: String(r.id),
        title: String(r.title ?? ""),
        status: String(r.status ?? "open"),
        card_type: String(r.card_type ?? "housekeeping_turn"),
        context: r.context,
        room_number: r.room_number ? String(r.room_number) : null,
      }))
      // Day 57 — drop departures an admin has rolled over (Jennifer QA §3 #31).
      .filter((r) => !isRolledOver(r));
    setTasks(rows);

    // Day 54 chase #3 — fetch task_checklist_items for any Dailys task(s)
    // so the home page can preview them inline when the Dailys bucket
    // expands. Display-only on home; the Da-430 detail card is where
    // staff actually toggle them.
    const dailysIds = rows
      .filter((r) => staffHomeBucketForTask(r) === "dailys")
      .map((r) => r.id);
    if (dailysIds.length === 0) {
      setDailysChecklist([]);
    } else {
      const { data: ciData, error: ciErr } = await supabase
        .from("task_checklist_items")
        .select("id, task_id, title, sort_order, done")
        .in("task_id", dailysIds)
        .order("sort_order", { ascending: true, nullsFirst: false });
      if (ciErr) {
        console.warn("[staff-home] Dailys checklist fetch failed:", ciErr.message);
        setDailysChecklist([]);
      } else {
        setDailysChecklist(
          ((ciData ?? []) as Record<string, unknown>[]).map((c) => ({
            id: String(c.id),
            task_id: String(c.task_id),
            title: String(c.title ?? ""),
            sort_order: typeof c.sort_order === "number" ? c.sort_order : null,
            done: c.done === true,
          })),
        );
      }
    }

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

  // Day 54 chase #3 — EOD gate. The EOD bucket header is locked until
  // every non-EOD bucket has zero incomplete tasks. Empty buckets
  // (totalCount === 0) count as clear; nothing to do = no blocker.
  // This mirrors the clock-out gate inside the E-430 detail card —
  // surfacing the gate on the home so staff can see what's blocking
  // their wrap before they tap into EOD.
  const allNonEodBucketsClear = useMemo(() => {
    for (const [, key] of BUCKET_ENTRIES) {
      if (key === "e") continue;
      if (bucketStates[key].openCount > 0) return false;
    }
    return true;
  }, [bucketStates]);

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
      // Skip non-expandable buckets (SOD/EOD). Dailys is expandable (preview
      // mode) and IS a valid auto-expand target — matches Bryan's chase #4
      // "Should be able to be expanded like the other tabs" parity.
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
            // Day 54 chase #2 / #3 / #4 — three render modes per bucket.
            const isDirectLink = DIRECT_LINK_BUCKETS.has(key);
            const isPreviewExpand = PREVIEW_EXPAND_BUCKETS.has(key);
            const firstTaskId = state.tasks[0]?.id ?? null;
            // EOD specifically locks until all non-EOD buckets are clear.
            const isEodLocked = key === "e" && !allNonEodBucketsClear;
            // Only direct-link buckets get a nav href (Dailys is now
            // expand-toggle like Stayovers, no header link).
            const navHref =
              isDirectLink && firstTaskId && !isEodLocked
                ? `/staff/task/${firstTaskId}`
                : null;
            const isExpanded = !isDirectLink && expandedBucket === key;
            const showStack = state.totalCount > 1 && !isExpanded;
            const classes = ["bucket"];
            if (showStack) classes.push("bucket--has-stack");
            if (isExpanded) classes.push("bucket--expanded");
            if (state.isDone) classes.push("bucket--done");
            if (state.isEmpty) classes.push("bucket--empty");
            if (isEodLocked) classes.push("bucket--locked");
            // Count: open count when active, total when done, 0 when empty.
            const headerCount = state.isEmpty
              ? 0
              : state.isDone
                ? state.totalCount
                : state.openCount;

            // Right-side cluster (lock chip / check / count / chevron).
            // Chevron renders on every expandable bucket with at least one
            // task (Dep / Sta / Arr / Dailys). Hidden on direct-link buckets
            // (SOD / EOD) and on empty buckets.
            const showChevron = !isDirectLink && !state.isEmpty;
            const rightCluster = (
              <>
                {isEodLocked && (
                  <span className="bucket__lock-label">Locked</span>
                )}
                {state.isDone && (
                  <div className="bucket__check" aria-label="All complete">
                    ✓
                  </div>
                )}
                <div className="bucket__count">{headerCount}</div>
                {showChevron && (
                  <span className="bucket__chevron" aria-hidden>
                    ▾
                  </span>
                )}
              </>
            );

            // Left-side cluster (stripe + abbr + name). Shared across modes.
            const leftCluster = (
              <>
                <div className="bucket__stripe" />
                <div className="bucket__head-body">
                  <div className="bucket__abbr">{stat.abbr}</div>
                  <div className="bucket__name">{stat.title}</div>
                </div>
              </>
            );

            return (
              <div
                key={key}
                className={classes.join(" ")}
                data-bucket={stat.dataAttr}
              >
                {navHref ? (
                  /* ── Mode: DIRECT_LINK (SOD, EOD-unlocked) ── */
                  <Link href={navHref} className="bucket__header">
                    {leftCluster}
                    <div className="bucket__right">{rightCluster}</div>
                  </Link>
                ) : isDirectLink || state.isEmpty ? (
                  /* ── Mode: inert (direct-link with zero tasks / EOD locked,
                     OR any empty bucket like an empty Dailys) — greyed via
                     .bucket--empty, no click target, no expand. ── */
                  <div className="bucket__header bucket__header--inert">
                    {leftCluster}
                    <div className="bucket__right">{rightCluster}</div>
                  </div>
                ) : (
                  /* Mode: expand-toggle (Dep / Sta / Arr / Dailys).
                     Whole header is a button; tap toggles inline expand.
                     Rows that render below differ by bucket type — Dailys
                     shows task_checklist_items as display-only previews,
                     Dep/Sta/Arr show task rows wrapped in Link anchors. */
                  <button
                    type="button"
                    className="bucket__header"
                    onClick={() => handleBucketTap(key)}
                    aria-expanded={isExpanded}
                    aria-controls={`bucket-rows-${key}`}
                  >
                    {leftCluster}
                    <div className="bucket__right">{rightCluster}</div>
                  </button>
                )}

                {/* Expanded rows. Two shapes:
                    · Dailys (preview-expand): task_checklist_items, display-only
                    · Multi-task: task rows wrapped in <Link> */}
                {isExpanded && isPreviewExpand && (
                  <div className="bucket__rows" id={`bucket-rows-${key}`}>
                    {dailysChecklist.length === 0 ? (
                      <div className="bucket-row bucket-row--empty">
                        <div className="bucket-row__stripe" />
                        <div className="bucket-row__check" />
                        <div className="bucket-row__body">
                          <div className="bucket-row__primary">
                            No checklist items yet
                          </div>
                        </div>
                      </div>
                    ) : (
                      dailysChecklist.map((item) => {
                        const rowClasses = ["bucket-row", "bucket-row--preview"];
                        if (item.done) rowClasses.push("bucket-row--done");
                        return (
                          <div key={item.id} className={rowClasses.join(" ")}>
                            <div className="bucket-row__stripe" />
                            <div className="bucket-row__check" aria-hidden>
                              ✓
                            </div>
                            <div className="bucket-row__body">
                              <div className="bucket-row__primary">
                                {item.title}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {isExpanded && !isPreviewExpand && (
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
