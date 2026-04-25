"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchProfile, type ProfileFetchFailure } from "@/lib/profile";
import {
  resolveAuthUser,
  redirectToLoginUnlessLocalDevBypass,
} from "@/lib/dev-auth-bypass";
import ProfileLoadError from "../../profile-load-error";
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

/* ------------------------------------------------------------------ */
/* Lookup maps                                                         */
/* ------------------------------------------------------------------ */

const STRIPE: Record<TaskBucket, string> = {
  arrivals:    "var(--arrivals-body)",
  departures:  "var(--departures-body)",
  stayovers:   "var(--stayovers-body)",
  dailys:      "var(--dailys-body)",
  eod:         "var(--eod-body)",
  maintenance: "var(--sage-header)",
};

const BUCKET_LABEL: Record<TaskBucket, string> = {
  arrivals:    "Arrivals",
  departures:  "Departures",
  stayovers:   "Stayovers",
  dailys:      "Dailys",
  eod:         "EOD",
  maintenance: "Maintenance",
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
/* Static data — TODO: wire to derived counts + Supabase query post-beta */
/* ------------------------------------------------------------------ */

const STAT_OPEN      = 7;
const STAT_DONE      = 12;
const STAT_OVERDUE   = 2;

const LANES: Lane[] = [
  {
    key: "housekeeping",
    label: "HOUSEKEEPING",
    tasks: [
      {
        id: "hk-1",
        badge: "33",
        title: "Turn over 33 for 4pm check-in",
        assignee: "Angie",
        bucket: "departures",
        status: "amber",
      },
      {
        id: "hk-2",
        badge: "RET",
        title: "Restock retail snacks after breakfast",
        assignee: "Angie",
        bucket: "dailys",
        status: "red",
      },
      {
        id: "hk-3",
        badge: "22",
        title: "Late checkout — refresh towels at 2pm",
        assignee: "Lizzie",
        bucket: "stayovers",
        status: "green",
      },
    ],
  },
  {
    key: "admin",
    label: "ADMIN",
    tasks: [
      {
        id: "ad-1",
        badge: "EOD",
        title: "End of day summary + handoff notes",
        assignee: "Courtney",
        bucket: "eod",
        status: "amber",
      },
      {
        id: "ad-2",
        badge: "VIP",
        title: "VIP arrival briefing — Suite 12",
        assignee: "Lizzie",
        bucket: "arrivals",
        status: "green",
      },
    ],
  },
  {
    key: "maintenance",
    label: "MAINTENANCE",
    tasks: [
      {
        id: "mt-1",
        badge: "14",
        title: "AC still broken — waiting on parts",
        assignee: "Mark",
        bucket: "maintenance",
        status: "amber",
      },
      {
        id: "mt-2",
        badge: "EXT",
        title: "Replace siding on west side of property",
        assignee: "Mark",
        bucket: "maintenance",
        status: "red",
      },
      {
        id: "mt-3",
        badge: "LOB",
        title: "Fix lobby sconce bulb",
        assignee: "Mark",
        bucket: "maintenance",
        status: "green",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminTasksDashboardPage() {
  const [ready, setReady] = useState(false);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(null);

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
          <button className={styles.navBtn} aria-label="Add task">+</button>
        </div>

        {/* Stats strip — TODO: wire to derived counts post-beta */}
        <div className={styles.stats}>
          <div>
            <div className={styles.statLabel}>OPEN</div>
            <div className={styles.statVal}>{STAT_OPEN}</div>
          </div>
          <div>
            <div className={styles.statLabel}>DONE TODAY</div>
            <div className={styles.statVal}>{STAT_DONE}</div>
          </div>
          <div>
            <div className={styles.statLabel}>OVERDUE</div>
            <div className={`${styles.statVal} ${styles.statValOverdue}`}>
              {STAT_OVERDUE}
            </div>
          </div>
        </div>

        {/* Section label */}
        <div className={styles.sectionLabel}>
          <span>ASSIGNMENT LANES</span>
          <span>TAP ROW TO OPEN</span>
        </div>

        {/* Lane cards */}
        {LANES.map((lane) => (
          <div key={lane.key} className={styles.laneCard}>
            <div className={LANE_HEAD_CLASS[lane.key]}>
              <span>{lane.label}</span>
              <span className={styles.laneCount}>
                {lane.tasks.length} TASKS
              </span>
            </div>
            {lane.tasks.map((task) => (
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
            ))}
          </div>
        ))}

        <div className={styles.footnote}>THE DISPATCH CO &middot; ADMIN &middot; TASKS</div>
      </div>
    </div>
  );
}
