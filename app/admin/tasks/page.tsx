"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchProfile, type ProfileFetchFailure } from "@/lib/profile";
import {
  resolveAuthUser,
  redirectToLoginUnlessLocalDevBypass,
} from "@/lib/dev-auth-bypass";
import ProfileLoadError from "../../profile-load-error";
import AddTaskModal from "@/components/admin/AddTaskModal";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type TaskBucket =
  | "arrivals"
  | "departures"
  | "stayovers"
  | "dailys"
  | "eod"
  | "start_of_day"
  | "maintenance";
type LaneKey = "housekeeping" | "admin" | "maintenance";
type StatusDot = "green" | "amber" | "red";

type DashboardTask = {
  id: string;
  badge: string;
  title: string;
  assignee: string;
  bucket: TaskBucket;
  status: StatusDot;
};

type Lane = {
  key: LaneKey;
  label: string;
  tasks: DashboardTask[];
};

// Live row shape — projection of the single tasks fetch that backs this
// dashboard. All columns we need to derive the stat strip + partition into
// lanes + render each row's badge / assignee / bucket / status dot.
type LiveTaskRow = {
  id: string;
  title: string;
  status: string;
  card_type: string;
  priority: string | null;
  room_number: string | null;
  assignee_name: string | null;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  context: Record<string, unknown> | null;
};

/* ------------------------------------------------------------------ */
/* Lookup maps                                                         */
/* ------------------------------------------------------------------ */

const STRIPE: Record<TaskBucket, string> = {
  arrivals:     "var(--arrivals-body)",
  departures:   "var(--departures-body)",
  stayovers:    "var(--stayovers-body)",
  dailys:       "var(--dailys-body)",
  eod:          "var(--eod-body)",
  // SOD has no `--sod-body` token (the SOD palette uses `--sod-accent` as
  // its primary signature color); reuse the accent for the stripe so an SOD
  // task on the admin lane carries its bucket color rather than rendering
  // un-themed.
  start_of_day: "var(--sod-accent)",
  maintenance:  "var(--sage-header)",
};

const BUCKET_LABEL: Record<TaskBucket, string> = {
  arrivals:     "Arrivals",
  departures:   "Departures",
  stayovers:    "Stayovers",
  dailys:       "Dailys",
  eod:          "EOD",
  start_of_day: "SOD",
  maintenance:  "Maintenance",
};

const LANE_HEAD_CLASS: Record<LaneKey, string> = {
  housekeeping: `${styles.laneHead} ${styles.laneHeadHousekeeping}`,
  admin:        `${styles.laneHead} ${styles.laneHeadAdmin}`,
  maintenance:  `${styles.laneHead} ${styles.laneHeadMaintenance}`,
};

const SDOT_CLASS: Record<StatusDot, string> = {
  green: styles.sdotGreen,
  amber: styles.sdotAmber,
  red:   styles.sdotRed,
};

/* ------------------------------------------------------------------ */
/* Helpers — TZ + partition + display derivation                       */
/* ------------------------------------------------------------------ */

/** YYYY-MM-DD in property TZ. Mirrors the helper on /admin/staff/[id]. */
function todayInPropertyTz(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year:  "numeric",
    month: "2-digit",
    day:   "2-digit",
  }).format(new Date());
}

/** HH:MM:SS in property TZ. Used for "due_date = today AND due_time < now" overdue detection. */
function nowTimeInPropertyTz(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Chicago",
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

const HOUSEKEEPING_CARD_TYPES = new Set(["housekeeping_turn", "arrival", "stayover"]);
const ADMIN_CARD_TYPES        = new Set(["dailys", "eod", "start_of_day", "generic"]);

function laneForRow(row: LiveTaskRow): LaneKey | null {
  if (row.card_type === "maintenance") return "maintenance";
  if (HOUSEKEEPING_CARD_TYPES.has(row.card_type)) return "housekeeping";
  if (ADMIN_CARD_TYPES.has(row.card_type)) return "admin";
  return null;
}

function bucketForRow(row: LiveTaskRow): TaskBucket {
  if (row.card_type === "maintenance") return "maintenance";
  // Prefer context.staff_home_bucket — that's the canonical UX-driving field
  // per CLAUDE.md beta scope lock #2 + STATE.md Architecture rules.
  const ctx = row.context;
  const raw = ctx && typeof ctx === "object"
    ? (ctx as Record<string, unknown>).staff_home_bucket
    : null;
  if (typeof raw === "string") {
    if (
      raw === "arrivals" ||
      raw === "departures" ||
      raw === "stayovers" ||
      raw === "dailys" ||
      raw === "eod" ||
      raw === "start_of_day"
    ) {
      return raw;
    }
  }
  // Fallback by card_type when context.staff_home_bucket is missing/invalid.
  // The DB default is sloppy per CLAUDE.md; this keeps stripes coherent.
  switch (row.card_type) {
    case "arrival":           return "arrivals";
    case "stayover":          return "stayovers";
    case "housekeeping_turn": return "departures";
    case "eod":               return "eod";
    case "dailys":            return "dailys";
    case "start_of_day":      return "start_of_day";
    default:                  return "dailys";
  }
}

function badgeForRow(row: LiveTaskRow): string {
  const room = row.room_number?.trim();
  if (room) return room;
  switch (row.card_type) {
    case "maintenance":      return "MNT";
    case "eod":              return "EOD";
    case "start_of_day":     return "SOD";
    case "dailys":           return "DLY";
    case "arrival":          return "ARR";
    case "stayover":         return "STA";
    case "housekeeping_turn":return "HK";
    default:                 return "—";
  }
}

function isOverdue(row: LiveTaskRow, today: string, now: string): boolean {
  if (!row.due_date) return false;
  if (row.due_date < today) return true;
  if (row.due_date === today && row.due_time && row.due_time < now) return true;
  return false;
}

function statusDotForRow(row: LiveTaskRow, today: string, now: string): StatusDot {
  if (row.status === "blocked") return "red";
  if (isOverdue(row, today, now)) return "red";
  if (row.status === "in_progress" || row.status === "paused") return "amber";
  return "green";
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminTasksDashboardPage() {
  const [ready, setReady] = useState(false);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Live dashboard state — derived from a single tasks fetch.
  const [statOpen, setStatOpen]       = useState<number>(0);
  const [statDone, setStatDone]       = useState<number>(0);
  const [statOverdue, setStatOverdue] = useState<number>(0);
  const [lanes, setLanes]             = useState<Lane[]>([]);
  const [tasksError, setTasksError]   = useState<string | null>(null);

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
      const profileResult = await fetchProfile(supabase, user);
      if (cancelled) return;
      if (!profileResult.ok) {
        setProfileFailure(profileResult.failure);
        return;
      }
      if (profileResult.profile.role !== "admin") {
        window.location.replace("/");
        return;
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Single tasks fetch + derive everything client-side. Limit 200 — beta
  // single-property volume; the full set fits comfortably and keeps the
  // OPEN/DONE/OVERDUE math coherent (no PostgREST-side count drift vs the
  // partitioned lanes).
  const fetchDashboard = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id, title, status, card_type, priority, room_number, " +
        "assignee_name, due_date, due_time, completed_at, context",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setTasksError(error.message);
      return;
    }

    const rows = (data ?? []) as unknown as LiveTaskRow[];
    const today = todayInPropertyTz();
    const now   = nowTimeInPropertyTz();

    let openCount    = 0;
    let doneCount    = 0;
    let overdueCount = 0;
    const housekeeping: DashboardTask[] = [];
    const adminLane:    DashboardTask[] = [];
    const maintenance:  DashboardTask[] = [];

    for (const r of rows) {
      if (r.status === "done") {
        // DONE TODAY counts only completions that landed on today's date.
        if (r.completed_at && r.completed_at.slice(0, 10) === today) {
          doneCount += 1;
        }
        continue;
      }
      openCount += 1;
      if (isOverdue(r, today, now)) overdueCount += 1;

      const lane = laneForRow(r);
      if (!lane) continue;
      const dt: DashboardTask = {
        id: r.id,
        badge: badgeForRow(r),
        title: r.title || "(untitled)",
        assignee: r.assignee_name?.trim() || "Unassigned",
        bucket: bucketForRow(r),
        status: statusDotForRow(r, today, now),
      };
      if (lane === "housekeeping") housekeeping.push(dt);
      else if (lane === "admin") adminLane.push(dt);
      else maintenance.push(dt);
    }

    setStatOpen(openCount);
    setStatDone(doneCount);
    setStatOverdue(overdueCount);
    setLanes([
      { key: "housekeeping", label: "HOUSEKEEPING", tasks: housekeeping },
      { key: "admin",        label: "ADMIN",        tasks: adminLane    },
      { key: "maintenance",  label: "MAINTENANCE",  tasks: maintenance  },
    ]);
    setTasksError(null);
  }, []);

  useEffect(() => {
    if (!ready) return;
    void fetchDashboard();
  }, [ready, fetchDashboard]);

  if (profileFailure) return <ProfileLoadError failure={profileFailure} />;
  if (!ready) return null;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* Top bar */}
        <div className={styles.topbar}>
          <Link href="/admin" className={styles.navBtn} aria-label="Back">
            &lsaquo;
          </Link>
          <div className={styles.pageHead}>
            <div className={styles.pageTitle}>Tasks</div>
            <div className={styles.pageSub}>SAT &middot; MAR 21, 2026</div>
          </div>
          <button className={styles.navBtn} aria-label="Add task" onClick={() => setModalOpen(true)}>+</button>
        </div>

        {/* Stats strip — live derived from the tasks fetch */}
        <div className={styles.stats}>
          <div>
            <div className={styles.statLabel}>OPEN</div>
            <div className={styles.statVal}>{statOpen}</div>
          </div>
          <div>
            <div className={styles.statLabel}>DONE TODAY</div>
            <div className={styles.statVal}>{statDone}</div>
          </div>
          <div>
            <div className={styles.statLabel}>OVERDUE</div>
            <div className={`${styles.statVal} ${styles.statValOverdue}`}>
              {statOverdue}
            </div>
          </div>
        </div>

        {tasksError && (
          <div className="error" style={{ margin: "0 14px" }}>{tasksError}</div>
        )}

        {/* Section label */}
        <div className={styles.sectionLabel}>
          <span>ASSIGNMENT LANES</span>
          <span>TAP ROW TO OPEN</span>
        </div>

        {/* Lane cards */}
        {lanes.map((lane) => (
          <div key={lane.key} className={styles.laneCard}>
            <div
              className={LANE_HEAD_CLASS[lane.key]}
              id={lane.key === "maintenance" ? "maintenance" : undefined}
            >
              <span>{lane.label}</span>
              <span className={styles.laneCount}>
                {lane.tasks.length} TASKS
              </span>
            </div>
            {lane.tasks.length === 0 ? (
              <div
                className={styles.taskRow}
                style={{
                  cursor: "default",
                  pointerEvents: "none",
                  opacity: 0.55,
                }}
              >
                <div className={styles.taskMain}>
                  <div className={styles.taskMeta}>
                    No open {lane.label.toLowerCase()} tasks.
                  </div>
                </div>
              </div>
            ) : (
              lane.tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/admin/tasks/${task.id}`}
                  className={styles.taskRow}
                  style={{ "--bucket": STRIPE[task.bucket] } as React.CSSProperties}
                >
                  <div className={styles.taskBadge}>{task.badge}</div>
                  <div className={styles.taskMain}>
                    <div className={styles.taskTitle}>{task.title}</div>
                    <div className={styles.taskMeta}>
                      {task.assignee} &middot; {BUCKET_LABEL[task.bucket]}
                    </div>
                  </div>
                  <div className={styles.taskStatus}>
                    <span className={SDOT_CLASS[task.status]} />
                    <span className={styles.chev}>&rsaquo;</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        ))}

        <div className={styles.footnote}>THE DISPATCH CO &middot; ADMIN &middot; TASKS</div>
      </div>
      <AddTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          void fetchDashboard();
        }}
      />
    </div>
  );
}
