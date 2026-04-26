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

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function StaffProfilePage() {
  const [ready, setReady] = useState(false);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(null);
  const [taskRows, setTaskRows] = useState<TaskRow[]>([]);
  const [tasksError, setTasksError] = useState<string | null>(null);

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
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, card_type, status, room_number")
        .eq("staff_id", staffRow.id)
        .neq("status", "done")
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setTaskRows(data ?? []);
        if (error) setTasksError(error.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, id]);

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
            <span>{taskRows.length} OPEN</span>
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
    </div>
  );
}
