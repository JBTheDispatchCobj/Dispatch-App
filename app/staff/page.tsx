"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
};

// ---------------------------------------------------------------------------
// Bucket config
// ---------------------------------------------------------------------------

const INCOMPLETE_STATUSES = new Set(["open", "in_progress", "paused", "blocked"]);

const BUCKET_ORDER: BucketKey[] = ["sod", "d", "s", "a", "da", "e"];

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
  context: string;
  accent: string;
  ink: string;
  titleOnAccent?: string;
};

const BUCKET_STATIC: Record<BucketKey, BucketStatic> = {
  sod: { title: "Start of Day", context: "Open shift",      accent: "var(--sod-accent)",       ink: "var(--sod-accent-ink)" },
  d:   { title: "Departures",   context: "Checkout window", accent: "var(--departures-accent)", ink: "var(--departures-accent-ink)" },
  s:   { title: "Stayovers",    context: "Service rounds",  accent: "var(--stayovers-accent)",  ink: "var(--stayovers-accent-ink)" },
  a:   { title: "Arrivals",     context: "Check-in window", accent: "var(--arrivals-accent)",   ink: "var(--arrivals-accent-ink)" },
  da:  { title: "Dailys",       context: "Property rounds", accent: "var(--dailys-accent)",     ink: "var(--dailys-accent-ink)",   titleOnAccent: "var(--dailys-accent-pale)" },
  e:   { title: "End of Day",   context: "Wrap shift",      accent: "var(--eod-accent)",        ink: "var(--eod-accent-ink)",      titleOnAccent: "var(--eod-accent-pale)" },
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

// ---------------------------------------------------------------------------
// Icons (unchanged from Day 20 static page)
// ---------------------------------------------------------------------------

const CalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v4M16 3v4" />
  </svg>
);

const CheckIcon = () => (
  <svg className="icon-check" viewBox="0 0 24 24" fill="none" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l5 5L20 7" />
  </svg>
);

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
  const [done, setDone] = useState<Set<BucketKey>>(new Set());
  const [active, setActive] = useState<BucketKey>("sod");
  const [now] = useState(() => new Date());
  // Brief counts — initial values match the pre-BR1 hardcoded fallback so the
  // brief card renders sensibly even before the reservations table exists.
  // Replaced live by getTodaysReservationCounts() once the reservations table
  // is in place. If the fetch fails (table not yet migrated, RLS issue, etc.)
  // these fallback values stay visible.
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
    // Sort by reshuffle priority_tier first (NULLS LAST so untiered tasks
    // — sod / dailys / eod / etc. — fall to the end of their bucket), then
    // by due_date. priority_tier is written by lib/orchestration/reshuffle.ts:
    //   1 = same-day-arrival departure (turnover required, top of Departures)
    //   2 = stayover or arrival
    //   3 = leftover departure (no booking after, bottom of Departures)
    // priority_tier lives in tasks.context (jsonb). The "->" notation tells
    // PostgREST to project the jsonb subkey for sorting; jsonb numeric
    // values sort numerically.
    const { data, error: qErr } = await supabase
      .from("tasks")
      .select("id, title, status, card_type, context")
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
    }));
    setTasks(rows);

    // Derive initial is-done state from real data: bucket is done when it
    // has tasks but all of them are complete (Option A — single query, full picture).
    const partitioned = partitionStaffHomeTasks(rows);
    const initialDone = new Set<BucketKey>();
    for (const [bucket, key] of BUCKET_ENTRIES) {
      const all = partitioned[bucket];
      if (all.length > 0 && !all.some((t) => INCOMPLETE_STATUSES.has(t.status))) {
        initialDone.add(key);
      }
    }
    setDone(initialDone);
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
      // Non-blocking: if the column / RLS isn't ready, we fall through to
      // the bucket deck (legacy behavior) rather than trapping the user on
      // an empty Pre-Clock-In screen.
      if (p.staff_id) {
        const clk = await fetchClockedInAt(supabase, p.staff_id);
        if (!cancelled) setClockedInAt(clk);
        // Only load tasks if already clocked in; the bucket deck is gated
        // on clocked_in_at being a string. Pre-Clock-In view doesn't need
        // task data.
        if (clk) {
          await loadTasks(p.staff_id);
        } else {
          setLoadingTasks(false);
        }
      } else {
        // No staff_id (manager / admin) — fall through to legacy behavior.
        setClockedInAt(null);
        await loadTasks(null);
      }
      setReady(true);

      // BR3: live reservation counts. Non-blocking — if the table isn't
      // migrated yet or the query errors, the hardcoded fallback above stays.
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

  // Per-bucket derived data: count (incomplete only), nextTask title, nextTaskId for navigation
  // CHASE #1 PROBE: also expose allCount (total tasks per bucket) for the debug strip below.
  const bucketData = useMemo(() => {
    const partitioned = partitionStaffHomeTasks(tasks);
    const out = {} as Record<BucketKey, {
      count: number;
      allCount: number;
      nextTask: string;
      nextTaskId: string | null;
    }>;
    for (const [bucket, key] of BUCKET_ENTRIES) {
      const all = partitioned[bucket];
      const incomplete = all.filter((t) => INCOMPLETE_STATUSES.has(t.status));
      const first = incomplete[0] ?? null;
      out[key] = {
        count: incomplete.length,
        allCount: all.length,
        nextTask: first?.title ?? (all.length > 0 ? "All complete" : "No tasks"),
        nextTaskId: first?.id ?? null,
      };
    }
    return out;
  }, [tasks]);

  const incompleteTotal = useMemo(
    () => tasks.filter((t) => INCOMPLETE_STATUSES.has(t.status)).length,
    [tasks],
  );

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
    // Now that we're clocked in, load the bucket deck data.
    await loadTasks(staffId);
    setClockingIn(false);
  }, [staffId, clockingIn, loadTasks]);

  const handleCardClick = (key: BucketKey) => {
    if (key === active) return;
    setDone((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setActive(key);
  };

  const handleActionClick = (e: React.MouseEvent, key: BucketKey) => {
    e.stopPropagation();
    if (key !== active) return;
    const newDone = new Set(done);
    newDone.add(key);

    // Pre-stayover reshuffle re-activation (master plan IV.D / R15 + Bryan's
    // Day 26 product clarification): when the housekeeper marks Arrivals
    // done, if the Departures bucket still has incomplete tasks, re-activate
    // Departures so Tier-3 leftover turnovers get cleaned up before Dailys /
    // EOD. The within-bucket sort (priority_tier ASC, due_date ASC) places
    // Tier-3 leftovers naturally at the bottom of Departures. Tier-1
    // departures (same-day-arrival turnovers) should already be done by
    // this point; if any aren't, they get done now too.
    if (key === "a" && bucketData.d.count > 0) {
      newDone.delete("d");
      setDone(newDone);
      setActive("d");
      return;
    }

    setDone(newDone);
    const idx = BUCKET_ORDER.indexOf(key);
    for (let i = idx + 1; i < BUCKET_ORDER.length; i++) {
      if (!newDone.has(BUCKET_ORDER[i])) {
        setActive(BUCKET_ORDER[i]);
        return;
      }
    }
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

  // Master plan I.B — Pre-Clock-In screen. Renders only when we know for
  // sure the staff member is clocked out (clockedInAt === null). If the
  // column isn't migrated yet or the fetch errored, clockedInAt is
  // undefined and we fall through to the legacy bucket deck so existing
  // staff aren't trapped on an empty screen.
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

  return (
    <main className="staff-home">
      <div className="staff-home__shell">

        {/* Master plan I.A: staff side is execution-first per
            dispatch-ui-rules; admin owns task creation via AddTaskModal on
            /admin, /admin/tasks, /admin/staff/[id]. The Day 20 visual
            placeholder + button was removed Day 30. */}
        <div className="staff-home__hdr">
          <div>
            <h1 className="staff-home__hello">Hi, {firstName(displayName)}.</h1>
            <p className="staff-home__date">{formatGreetDate(now)}</p>
          </div>
        </div>

        {/* Brief — counts remain hardcoded pending ResNexus integration (post-beta BR) */}
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
          <span>{incompleteTotal} open</span>
        </div>

        {/* CHASE #1 TEMP PROBE — remove when SOD advancement bug is fixed */}
        <div style={{
          background: "#fff8e1",
          border: "1px solid #f5b400",
          borderRadius: "8px",
          padding: "8px 12px",
          margin: "8px 0",
          fontFamily: "ui-monospace, monospace",
          fontSize: "11px",
          color: "#5a4500",
          lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 600 }}>DEBUG (chase #1)</div>
          <div>active = {active}</div>
          <div>done = [{Array.from(done).sort().join(", ") || "empty"}]</div>
          <div>tasks total = {tasks.length}</div>
          <div>per-bucket (incomplete/total): {BUCKET_ORDER.map((k) => `${k}=${bucketData[k].count}/${bucketData[k].allCount}`).join(" · ")}</div>
        </div>

        <div className="deck">
          {BUCKET_ORDER.map((key) => {
            const stat = BUCKET_STATIC[key];
            const data = bucketData[key];
            const isActive = active === key;
            const isDone = done.has(key);
            const classes = ["bcard"];
            if (isActive) classes.push("is-active");
            if (isDone) classes.push("is-done");
            const titleColor = stat.titleOnAccent ?? stat.ink;
            return (
              <div
                key={key}
                className={classes.join(" ")}
                data-bucket={key}
                style={{ ["--accent" as string]: stat.accent, ["--ink" as string]: stat.ink } as React.CSSProperties}
                onClick={() => handleCardClick(key)}
              >
                <div className="bcard__head">
                  <h2 className="bcard__title" style={{ color: titleColor }}>
                    {stat.title}
                  </h2>
                  <button
                    className="bcard__action"
                    aria-label={isDone ? "Completed" : "Complete"}
                    onClick={(e) => handleActionClick(e, key)}
                  >
                    <span className="num">{data.count}</span>
                    <CheckIcon />
                  </button>
                </div>
                <span className="bcard__meta" style={{ color: titleColor }}>
                  <CalIcon />
                  {formatShortDate(now)} · {stat.context}
                </span>
                <div className="bcard__inset">
                  <div className="bcard__insetlabel">
                    <span className="bcard__insetpre">Next up</span>
                    {data.nextTask}
                  </div>
                  {data.nextTaskId ? (
                    <Link
                      href={`/staff/task/${data.nextTaskId}`}
                      className="bcard__insetcta"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View ›
                    </Link>
                  ) : (
                    <span className="bcard__insetcta" style={{ opacity: 0.4 }}>View ›</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="staff-home__foot">The Dispatch Co · Staff</p>
      </div>
    </main>
  );
}
