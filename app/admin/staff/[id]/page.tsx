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

type StaffProfile = {
  slug: string;
  firstName: string;
  fullName: string;
  heroRole: string;
  heroStatus: string;
  roleLine: string;
  statusLine: string;
  off: boolean;
  avatarSrc: string;
  metrics: [
    { label: string; value: number },
    { label: string; value: number },
    { label: string; value: number },
  ];
  activitySub: string;
  ctaLabel: string;
};

type TaskRow = {
  id: string;
  title: string;
  card_type: string;
  status: string;
  room_number: string | null;
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
/* Static profile data — replace with Supabase fetch post-beta        */
/* ------------------------------------------------------------------ */

const PROFILES: StaffProfile[] = [
  {
    slug: "courtney-manager",
    firstName: "Courtney",
    fullName: "Courtney Manager",
    heroRole: "MANAGER",
    heroStatus: "ON SHIFT",
    roleLine: "Front desk lead · until 10pm",
    statusLine: "ACTIVE · RM 12, RM 8",
    off: false,
    avatarSrc: AVATAR_COURTNEY,
    metrics: [
      { label: "Rooms", value: 6 },
      { label: "Open", value: 2 },
      { label: "Done today", value: 9 },
    ],
    activitySub: "9 completions · 3 notes today",
    ctaLabel: "Message Courtney",
  },
  {
    slug: "lizzie-larson",
    firstName: "Lizzie",
    fullName: "Lizzie Larson",
    heroRole: "OPS LEAD",
    heroStatus: "ON SHIFT",
    roleLine: "Front of house",
    statusLine: "ACTIVE · LOBBY",
    off: false,
    avatarSrc: AVATAR_LIZZIE,
    metrics: [
      { label: "Rooms", value: 4 },
      { label: "Open", value: 1 },
      { label: "Done today", value: 7 },
    ],
    activitySub: "7 completions · 1 note today",
    ctaLabel: "Message Lizzie",
  },
  {
    slug: "angie-lopez",
    firstName: "Angie",
    fullName: "Angie Lopez",
    heroRole: "HOUSEKEEPING",
    heroStatus: "ON SHIFT",
    roleLine: "Shift 7–3",
    statusLine: "ACTIVE · RM 18, RM 22",
    off: false,
    avatarSrc: AVATAR_ANGIE,
    metrics: [
      { label: "Rooms", value: 8 },
      { label: "Open", value: 3 },
      { label: "Done today", value: 5 },
    ],
    activitySub: "5 completions · 2 notes today",
    ctaLabel: "Message Angie",
  },
  {
    slug: "mark-parry",
    firstName: "Mark",
    fullName: "Mark Parry",
    heroRole: "GC / MAINT",
    heroStatus: "OFF SITE",
    roleLine: "Off-site · on call",
    statusLine: "OFF SITE · ON CALL",
    off: true,
    avatarSrc: AVATAR_MARK,
    metrics: [
      { label: "Jobs", value: 3 },
      { label: "Open", value: 2 },
      { label: "Done today", value: 1 },
    ],
    activitySub: "1 completion today",
    ctaLabel: "Message Mark",
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

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

// Phase 4d formatters.

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
  const [taskRows, setTaskRows] = useState<TaskRow[]>([]);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [staffRowId, setStaffRowId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Phase 4d — segment data state.
  const [currentSegment, setCurrentSegment] = useState<SegmentRow | null>(null);
  const [segmentShifts, setSegmentShifts] = useState<ShiftSummaryRow[]>([]);
  const [lifetimeMinutes, setLifetimeMinutes] = useState<number | null>(null);

  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

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

  async function fetchTasks(sid: string) {
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, card_type, status, room_number")
      .eq("staff_id", sid)
      .neq("status", "done")
      .order("created_at", { ascending: false });
    setTaskRows(data ?? []);
    if (error) setTasksError(error.message);
  }

  // Phase 4d — fetch segment + shifts + lifetime in parallel. staff_id in
  // the views is text (raw_payload->>'staff_id'), so we pass the UUID as a
  // string. Failures degrade gracefully — the segment block renders an
  // empty state rather than blocking the page.
  async function fetchSegmentData(sid: string) {
    const today = todayInPropertyTz();

    const [segmentRes, shiftsRes, lifetimeRes] = await Promise.all([
      // Current segment: the row whose [segment_start, segment_end] window
      // contains today.
      supabase
        .from("staff_segments_v")
        .select("segment_start, segment_end, shift_count, total_minutes")
        .eq("staff_id", sid)
        .lte("segment_start", today)
        .gte("segment_end", today)
        .maybeSingle(),

      // All shifts (with summaries) in roughly the last 14 days. Filtering
      // by exact segment_start / segment_end happens client-side once we
      // know the segment — keeps the query simple and lets us include the
      // currently-clocked-in shift even when it's outside the segment view's
      // duration_minutes-NOT-NULL filter.
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

      // Lifetime: sum of every segment's total_minutes for this staff.
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
    const allShifts = (shiftsRes.data ?? []) as ShiftSummaryRow[];
    // Client-side filter to current segment range. If we don't know the
    // segment yet (no shifts in it), fall back to the most recent shift so
    // the section isn't empty when there's data.
    const segStart = (segmentRes.data as SegmentRow | null)?.segment_start ?? null;
    const segEnd   = (segmentRes.data as SegmentRow | null)?.segment_end ?? null;
    const inSegment = segStart && segEnd
      ? allShifts.filter((s) => {
          const d = s.shift_start_at.slice(0, 10); // YYYY-MM-DD prefix; close enough for property-TZ approximation
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

  // Fetch tasks once auth is confirmed
  useEffect(() => {
    if (!ready) return;
    const member = PROFILES.find((p) => p.slug === id);
    if (!member) return;
    let cancelled = false;
    void (async () => {
      // Bridge slug → staff UUID via public.staff.name
      const { data: staffRow } = await supabase
        .from("staff")
        .select("id")
        .eq("name", member.fullName)
        .maybeSingle();
      if (cancelled || !staffRow) return;
      const sid = staffRow.id as string;
      if (!cancelled) setStaffRowId(sid);
      await Promise.all([fetchTasks(sid), fetchSegmentData(sid)]);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (profileFailure) return <ProfileLoadError failure={profileFailure} />;
  if (!ready) return null;

  const member = PROFILES.find((p) => p.slug === id) ?? null;

  if (!member) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          Staff member not found.{" "}
          <Link href="/admin/staff">Back to roster</Link>
        </div>
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
            {member.firstName.toUpperCase()}
          </div>
          <div className={styles.spacer} />
        </div>

        {/* Sky hero */}
        <div className={styles.heroWrap}>
          <div className={styles.hero}>
            <div className={styles.heroStrip}>
              <span className={styles.heroStripLeft}>{member.heroRole}</span>
              <span>{member.heroStatus}</span>
            </div>
            <div className={styles.heroBody}>
              <div className={styles.heroTop}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.avatarLg}
                  src={member.avatarSrc}
                  alt={member.fullName}
                  width={60}
                  height={60}
                />
                <div>
                  <h1 className={styles.heroName}>{member.fullName}</h1>
                  <div className={styles.heroRoleLine}>{member.roleLine}</div>
                </div>
              </div>

              <div className={styles.statusPill}>
                <span className={styles.statusDot} />
                {member.statusLine}
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

        {/* Stats trio */}
        <div className={styles.stats}>
          {member.metrics.map((m, i) => (
            <div key={i} className={styles.stat}>
              <div className={styles.statVal}>{m.value}</div>
              <div className={styles.statLbl}>{m.label}</div>
            </div>
          ))}
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
              <div className={styles.navSub}>{member.activitySub}</div>
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
            {member.ctaLabel}
          </button>
        </div>

        <div className={styles.footnote}>
          ADMIN VIEW · {member.firstName.toUpperCase()} · MAR 21
        </div>
      </div>
      {staffRowId && (
        <AddTaskModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => void fetchTasks(staffRowId)}
          preselectedStaffId={staffRowId}
          preselectedStaffName={member.fullName}
        />
      )}
    </div>
  );
}
