"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchProfile, type ProfileFetchFailure } from "@/lib/profile";
import {
  resolveAuthUser,
  redirectToLoginUnlessLocalDevBypass,
} from "@/lib/dev-auth-bypass";
import ProfileLoadError from "../../../profile-load-error";
import {
  AVATAR_COURTNEY,
  AVATAR_LIZZIE,
  AVATAR_ANGIE,
  AVATAR_MARK,
} from "../data";
import AddTaskModal from "@/components/admin/AddTaskModal";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/**
 * Live staff row backing every per-staff display field on this page.
 * Shape mirrors the public.staff columns we need (per Day 35 STATE.md
 * Schema in place — staff has id, name, role, status, notes, created_at,
 * clocked_in_at). The 4-name fixed palette + slug → fullName + avatar map
 * stays static (locked design tokens per master plan II.D/II.E); everything
 * around it derives from this row.
 */
type StaffLive = {
  id: string;
  name: string;
  role: string;
  status: string;
  clocked_in_at: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  card_type: string;
  status: string;
  room_number: string | null;
  completed_at: string | null;
};

// Master plan I.C Phase 4d — segment data shapes from the three views
// landed in Phase 4a-4c (staff_shifts_v / staff_segments_v / shift_summary_v).
// staff_id is text in all three views (sourced from inbound_events
// raw_payload->>'staff_id'), so the join is text-on-text.

type SegmentRow = {
  segment_start: string; // YYYY-MM-DD (a Wednesday)
  segment_end: string;   // YYYY-MM-DD (a Tuesday, segment_start + 13)
  shift_count: number;
  total_minutes: number;
};

type ShiftSummaryRow = {
  shift_start_at: string;       // ISO timestamptz
  shift_end_at: string | null;
  duration_minutes: number | null;
  is_current: boolean;
  departures_completed: number;
  arrivals_completed: number;
  stayovers_completed: number;
  dailys_completed: number;
  eod_completed: number;
  maintenance_completed: number;
  total_tasks_completed: number;
};

/* ------------------------------------------------------------------ */
/* Slug → fullName + avatar map (locked design tokens)                  */
/*                                                                      */
/* The 4-name fixed palette is locked per master plan II.D/II.E (CM     */
/* peach, LL sky, AL coral, MP sage — Profile surfaces handoff). Slugs  */
/* are URL-stable; full names bridge to the public.staff row by name    */
/* match; avatars are inline SVG data URIs from ../data.ts. Everything  */
/* else (role, status, metrics, lines) derives from the live staff row  */
/* + a small task fetch.                                                 */
/* ------------------------------------------------------------------ */

type SlugMeta = { fullName: string; avatarSrc: string };

const SLUG_PROFILES: Record<string, SlugMeta> = {
  "courtney-manager": { fullName: "Courtney Manager", avatarSrc: AVATAR_COURTNEY },
  "lizzie-larson":    { fullName: "Lizzie Larson",    avatarSrc: AVATAR_LIZZIE   },
  "angie-lopez":      { fullName: "Angie Lopez",      avatarSrc: AVATAR_ANGIE    },
  "mark-parry":       { fullName: "Mark Parry",       avatarSrc: AVATAR_MARK     },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function firstNameOf(fullName: string): string {
  return fullName.split(/\s+/)[0] ?? fullName;
}

/** Loose match — "GC / MAINT", "Maintenance", "MAINT", etc. all read as a
 *  maintenance-flavored role for the metric label swap (Jobs vs Rooms). */
function isMaintenanceRole(role: string): boolean {
  const r = role.toUpperCase();
  return r.includes("MAINT") || r.includes("GC");
}

function heroRoleOf(staff: StaffLive): string {
  return staff.role.trim() ? staff.role.toUpperCase() : "STAFF";
}

function heroStatusOf(staff: StaffLive): string {
  if (staff.status === "inactive") return "INACTIVE";
  return staff.clocked_in_at ? "ON SHIFT" : "OFF SHIFT";
}

function roleLineOf(staff: StaffLive): string {
  const role = staff.role.trim() || "Staff";
  if (staff.clocked_in_at) {
    const since = new Date(staff.clocked_in_at).toLocaleTimeString("en-US", {
      hour:   "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Chicago",
    });
    return `${role} · On shift since ${since}`;
  }
  return staff.status === "inactive" ? `${role} · Inactive` : `${role} · Off shift`;
}

function statusLineOf(staff: StaffLive): string {
  if (staff.status === "inactive") return "INACTIVE";
  return staff.clocked_in_at ? "ACTIVE" : "OFF SHIFT";
}

function cardTypeLabel(cardType: string): string {
  const map: Record<string, string> = {
    housekeeping_turn: "HK TURN",
    arrival:           "ARRIVAL",
    departure:         "DEPARTURE",
    stayover:          "STAYOVER",
    daily:             "DAILY",
    dailys:            "DAILY",
    eod:               "EOD",
    maintenance:       "MAINT",
  };
  return map[cardType] ?? cardType.toUpperCase().slice(0, 8);
}

function cardTypeChipClass(cardType: string): string {
  const map: Record<string, string> = {
    housekeeping_turn: styles.chipDep,
    departure:         styles.chipDep,
    arrival:           styles.chipArr,
    stayover:          styles.chipSta,
    daily:             styles.chipDly,
    dailys:            styles.chipDly,
    eod:               styles.chipDly,
    maintenance:       styles.chipMnt,
  };
  return `${styles.chip} ${map[cardType] ?? ""}`.trim();
}

function statusDotClass(status: string): string {
  const map: Record<string, string> = {
    open:        styles.taskDotOpen,
    in_progress: styles.taskDotInProgress,
    blocked:     styles.taskDotBlocked,
    paused:      styles.taskDotPaused,
  };
  return `${styles.taskStatusDot} ${map[status] ?? ""}`.trim();
}

// Phase 4d formatters (kept).

/** Today's date as YYYY-MM-DD in property timezone (matches the views' event_date). */
function todayInPropertyTz(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year:  "numeric",
    month: "2-digit",
    day:   "2-digit",
  }).format(new Date());
}

/** "5h 23m" / "23m" / "—" depending on minutes. */
function formatHoursMinutes(mins: number | null): string {
  if (mins === null || mins === undefined) return "—";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "Apr 29 – May 12" from two YYYY-MM-DD strings. Same-month collapses. */
function formatSegmentRange(startIso: string, endIso: string): string {
  // Parse as UTC noon to dodge DST and TZ math; we only display month/day.
  const s = new Date(`${startIso}T12:00:00Z`);
  const e = new Date(`${endIso}T12:00:00Z`);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt(s)} – ${fmt(e)}`;
}

/** "Tue · May 5" from an ISO timestamptz, in property TZ. */
function formatShiftDate(iso: string): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Chicago" });
  const md      = d.toLocaleDateString("en-US", { month: "short",   day: "numeric", timeZone: "America/Chicago" });
  return `${weekday} · ${md}`;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function StaffProfilePage() {
  const [ready, setReady] = useState(false);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(null);

  // Live staff row + lookup state.
  const [staffLive, setStaffLive] = useState<StaffLive | null>(null);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffRowId, setStaffRowId] = useState<string | null>(null);

  // Tasks + derived metrics (rooms/jobs, open count, done-today count).
  const [taskRows, setTaskRows] = useState<TaskRow[]>([]);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [metricRooms, setMetricRooms] = useState<number>(0);
  const [metricDoneToday, setMetricDoneToday] = useState<number>(0);

  const [modalOpen, setModalOpen] = useState(false);

  // Phase 4d — segment data state.
  const [currentSegment, setCurrentSegment] = useState<SegmentRow | null>(null);
  const [segmentShifts, setSegmentShifts] = useState<ShiftSummaryRow[]>([]);
  const [lifetimeMinutes, setLifetimeMinutes] = useState<number | null>(null);

  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const slugMeta = SLUG_PROFILES[id] ?? null;

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

  /**
   * Tasks + derived metrics. Single fetch over all tasks for this staff
   * (open + recent-done); we partition client-side. Mirrors the dashboard
   * pattern at /admin/tasks. "Rooms" / "Jobs" label swaps based on role.
   */
  async function fetchTasksAndMetrics(sid: string) {
    const today = todayInPropertyTz();
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, card_type, status, room_number, completed_at")
      .eq("staff_id", sid)
      .order("created_at", { ascending: false });

    if (error) {
      setTasksError(error.message);
      setTaskRows([]);
      setMetricRooms(0);
      setMetricDoneToday(0);
      return;
    }
    setTasksError(null);

    const all = (data ?? []) as TaskRow[];
    const open = all.filter((t) => t.status !== "done");
    setTaskRows(open);

    const distinctRooms = new Set<string>();
    for (const t of open) {
      const r = t.room_number?.trim();
      if (r) distinctRooms.add(r);
    }
    setMetricRooms(distinctRooms.size);

    const doneTodayCount = all.filter(
      (t) =>
        t.status === "done" &&
        t.completed_at &&
        t.completed_at.slice(0, 10) === today,
    ).length;
    setMetricDoneToday(doneTodayCount);
  }

  // Phase 4d — fetch segment + shifts + lifetime in parallel. staff_id in
  // the views is text (raw_payload->>'staff_id'), so we pass the UUID as a
  // string. Failures degrade gracefully — the segment block renders an
  // empty state rather than blocking the page.
  async function fetchSegmentData(sid: string) {
    const today = todayInPropertyTz();

    const [segmentRes, shiftsRes, lifetimeRes] = await Promise.all([
      supabase
        .from("staff_segments_v")
        .select("segment_start, segment_end, shift_count, total_minutes")
        .eq("staff_id", sid)
        .lte("segment_start", today)
        .gte("segment_end", today)
        .maybeSingle(),

      supabase
        .from("shift_summary_v")
        .select(
          "shift_start_at, shift_end_at, duration_minutes, is_current, " +
          "departures_completed, arrivals_completed, stayovers_completed, " +
          "dailys_completed, eod_completed, maintenance_completed, " +
          "total_tasks_completed",
        )
        .eq("staff_id", sid)
        .order("shift_start_at", { ascending: false })
        .limit(20),

      supabase
        .from("staff_segments_v")
        .select("total_minutes")
        .eq("staff_id", sid),
    ]);

    if (segmentRes.error) {
      console.warn("[admin-staff] staff_segments_v fetch failed:", segmentRes.error.message);
    }
    setCurrentSegment((segmentRes.data as SegmentRow | null) ?? null);

    if (shiftsRes.error) {
      console.warn("[admin-staff] shift_summary_v fetch failed:", shiftsRes.error.message);
    }
    const allShifts = (shiftsRes.data ?? []) as unknown as ShiftSummaryRow[];
    const segStart = (segmentRes.data as SegmentRow | null)?.segment_start ?? null;
    const segEnd   = (segmentRes.data as SegmentRow | null)?.segment_end ?? null;
    const inSegment = segStart && segEnd
      ? allShifts.filter((s) => {
          const d = s.shift_start_at.slice(0, 10);
          return d >= segStart && d <= segEnd;
        })
      : allShifts.slice(0, 1);
    setSegmentShifts(inSegment);

    if (lifetimeRes.error) {
      console.warn("[admin-staff] staff_segments_v lifetime fetch failed:", lifetimeRes.error.message);
      setLifetimeMinutes(null);
    } else {
      const rows = (lifetimeRes.data ?? []) as Array<{ total_minutes: number }>;
      const total = rows.reduce((acc, r) => acc + (r.total_minutes ?? 0), 0);
      setLifetimeMinutes(total);
    }
  }

  // Auth-gated: bridge slug → live staff row, then fan out to tasks + segments.
  useEffect(() => {
    if (!ready) return;
    if (!slugMeta) return;
    let cancelled = false;
    void (async () => {
      const { data: staffRow, error: staffErr } = await supabase
        .from("staff")
        .select("id, name, role, status, clocked_in_at")
        .eq("name", slugMeta.fullName)
        .maybeSingle();
      if (cancelled) return;
      if (staffErr) {
        setStaffError(staffErr.message);
        return;
      }
      if (!staffRow) {
        setStaffLive(null);
        setStaffRowId(null);
        return;
      }
      const live = staffRow as StaffLive;
      setStaffLive(live);
      setStaffRowId(live.id);
      await Promise.all([
        fetchTasksAndMetrics(live.id),
        fetchSegmentData(live.id),
      ]);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (profileFailure) return <ProfileLoadError failure={profileFailure} />;
  if (!ready) return null;

  if (!slugMeta) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          Staff member not found.{" "}
          <Link href="/admin/staff">Back to roster</Link>
        </div>
      </div>
    );
  }

  // Pre-staff-fetch render — slug resolved, but staff row still loading.
  // Show the avatar + name from the slug map so the page isn't blank during
  // the live fetch round-trip.
  const fullName  = slugMeta.fullName;
  const firstName = firstNameOf(fullName);
  const avatarSrc = slugMeta.avatarSrc;

  if (staffError) {
    return (
      <div className={styles.page}>
        <div className="error" style={{ margin: 14 }}>{staffError}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* Top strip */}
        <div className={styles.topstrip}>
          <Link href="/admin/staff" className={styles.backBtn} aria-label="Back to staff roster">
            &lsaquo;
          </Link>
          <div className={styles.crumb}>
            <span className={styles.crumbParent}>STAFF /</span>
            {firstName.toUpperCase()}
          </div>
          <div className={styles.spacer} />
        </div>

        {/* Sky hero */}
        <div className={styles.heroWrap}>
          <div className={styles.hero}>
            <div className={styles.heroStrip}>
              <span className={styles.heroStripLeft}>
                {staffLive ? heroRoleOf(staffLive) : "STAFF"}
              </span>
              <span>{staffLive ? heroStatusOf(staffLive) : "—"}</span>
            </div>
            <div className={styles.heroBody}>
              <div className={styles.heroTop}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.avatarLg}
                  src={avatarSrc}
                  alt={fullName}
                  width={60}
                  height={60}
                />
                <div>
                  <h1 className={styles.heroName}>{fullName}</h1>
                  <div className={styles.heroRoleLine}>
                    {staffLive ? roleLineOf(staffLive) : "Loading…"}
                  </div>
                </div>
              </div>

              <div className={styles.statusPill}>
                <span className={styles.statusDot} />
                {staffLive ? statusLineOf(staffLive) : "—"}
              </div>

              <div className={styles.quickRow}>
                <button className={styles.quickBtn}>
                  <span className={styles.quickIc}>✉</span>Message
                </button>
                <button className={styles.quickBtn}>
                  <span className={styles.quickIc}>✆</span>Call
                </button>
                <button className={styles.quickBtn}>
                  <span className={styles.quickIc}>⊕</span>Assign
                </button>
                <button className={styles.quickBtn}>
                  <span className={styles.quickIc}>⏗</span>Schedule
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats trio — live derived */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statVal}>{metricRooms}</div>
            <div className={styles.statLbl}>
              {staffLive && isMaintenanceRole(staffLive.role) ? "Jobs" : "Rooms"}
            </div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statVal}>{taskRows.length}</div>
            <div className={styles.statLbl}>Open</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statVal}>{metricDoneToday}</div>
            <div className={styles.statLbl}>Done today</div>
          </div>
        </div>

        {/* Phase 4d — 14-day segment block (master plan I.C Phase 4 / III.J).
            Wired to staff_segments_v + shift_summary_v, both landed Day 32.
            Renders an empty state when no segment data yet (e.g., staff has
            never clocked in). */}
        <div className={styles.sectionWrap}>
          <div className={styles.sectionLabel}>
            <span>14-DAY SEGMENT</span>
            {currentSegment && (
              <span>{formatSegmentRange(currentSegment.segment_start, currentSegment.segment_end)}</span>
            )}
          </div>

          {currentSegment ? (
            <>
              <div className={styles.segmentTrio}>
                <div className={styles.stat}>
                  <div className={styles.statVal}>{formatHoursMinutes(currentSegment.total_minutes)}</div>
                  <div className={styles.statLbl}>Segment</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statVal}>{currentSegment.shift_count}</div>
                  <div className={styles.statLbl}>Shifts</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statVal}>{formatHoursMinutes(lifetimeMinutes)}</div>
                  <div className={styles.statLbl}>Lifetime</div>
                </div>
              </div>

              {segmentShifts.length > 0 && (
                <div className={styles.shiftList}>
                  {segmentShifts.map((shift) => (
                    <div
                      key={shift.shift_start_at}
                      className={`${styles.shiftRow}${shift.is_current ? ` ${styles.shiftRowCurrent}` : ""}`}
                    >
                      <div className={styles.shiftRowMain}>
                        <div className={styles.shiftRowDate}>{formatShiftDate(shift.shift_start_at)}</div>
                        <div className={styles.shiftRowSub}>
                          <span>
                            {shift.is_current
                              ? "In progress"
                              : formatHoursMinutes(shift.duration_minutes)}
                          </span>
                          <span aria-hidden>·</span>
                          <span>{shift.total_tasks_completed} done</span>
                        </div>
                      </div>
                      <div className={styles.shiftRowChips}>
                        {shift.departures_completed > 0 && (
                          <span className={`${styles.chip} ${styles.chipDep}`}>{shift.departures_completed} D</span>
                        )}
                        {shift.arrivals_completed > 0 && (
                          <span className={`${styles.chip} ${styles.chipArr}`}>{shift.arrivals_completed} A</span>
                        )}
                        {shift.stayovers_completed > 0 && (
                          <span className={`${styles.chip} ${styles.chipSta}`}>{shift.stayovers_completed} S</span>
                        )}
                        {shift.dailys_completed > 0 && (
                          <span className={`${styles.chip} ${styles.chipDly}`}>{shift.dailys_completed} Da</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className={styles.tasksEmpty}>No segment data yet.</div>
          )}
        </div>

        {/* Profile nav rows */}
        <div className={styles.sectionWrap}>
          <div className={styles.sectionLabel}>
            <span>PROFILE</span>
            <span>4 VIEWS</span>
          </div>

          <div className={styles.navRow}>
            <div className={styles.navIcon}>ℹ</div>
            <div>
              <div className={styles.navTitle}>Details</div>
              <div className={styles.navSub}>Contact · role · start date</div>
            </div>
            <div className={styles.chev}>&rsaquo;</div>
          </div>

          {/* Tasks — live fetch */}
          <div className={styles.tasksSectionHead}>
            <span>TASKS</span>
            <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span>{taskRows.length} OPEN</span>
              {staffRowId && (
                <button
                  onClick={() => setModalOpen(true)}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(27,51,64,0.35)",
                    borderRadius: "50%",
                    width: 22,
                    height: 22,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(27,51,64,0.65)",
                    fontSize: 16,
                    lineHeight: 1,
                    padding: 0,
                  }}
                  aria-label="Add task"
                >
                  +
                </button>
              )}
            </span>
          </div>

          {tasksError && (
            <div className={styles.tasksErrorText}>{tasksError}</div>
          )}

          {!tasksError && taskRows.length === 0 && (
            <div className={styles.tasksEmpty}>No open tasks assigned.</div>
          )}

          {taskRows.length > 0 && (
            <div className={styles.taskList}>
              {taskRows.map((task) => (
                <Link
                  key={task.id}
                  href={`/admin/tasks/${task.id}`}
                  className={styles.taskRow}
                >
                  <span className={statusDotClass(task.status)} />
                  <div className={styles.taskRowMain}>
                    <div className={styles.taskRowTitle}>{task.title}</div>
                    <div className={styles.taskRowMeta}>
                      <span className={cardTypeChipClass(task.card_type)}>
                        {cardTypeLabel(task.card_type)}
                      </span>
                      {task.room_number && (
                        <span className={styles.taskRowRoom}>RM {task.room_number}</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.chev}>&rsaquo;</div>
                </Link>
              ))}
            </div>
          )}

          <div className={styles.navRow}>
            <div className={styles.navIcon}>⏸</div>
            <div>
              <div className={styles.navTitle}>Activity</div>
              <div className={styles.navSub}>{metricDoneToday} completions today</div>
            </div>
            <div className={styles.chev}>&rsaquo;</div>
          </div>

          <div className={styles.navRow}>
            <div className={styles.navIcon}>◧</div>
            <div>
              <div className={styles.navTitle}>Reports</div>
              <div className={styles.navSub}>Weekly · monthly · ytd</div>
            </div>
            <div className={styles.chev}>&rsaquo;</div>
          </div>
        </div>

        {/* CTA pair */}
        <div className={styles.ctaRow}>
          <button className={`${styles.cta} ${styles.ctaSecondary}`}>Flag</button>
          <button className={`${styles.cta} ${styles.ctaPrimary}`}>
            Message {firstName}
          </button>
        </div>

        <div className={styles.footnote}>
          ADMIN VIEW · {firstName.toUpperCase()} · {todayInPropertyTz()}
        </div>
      </div>
      {staffRowId && (
        <AddTaskModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => void fetchTasksAndMetrics(staffRowId)}
          preselectedStaffId={staffRowId}
          preselectedStaffName={fullName}
        />
      )}
    </div>
  );
}
