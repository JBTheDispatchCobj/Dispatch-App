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
import {
  AVATAR_COURTNEY,
  AVATAR_LIZZIE,
  AVATAR_ANGIE,
  AVATAR_MARK,
} from "../staff/data";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Delta = { value: string; direction: "up" | "down" };

type HeroStat = {
  label: string;
  value: string;
  unit?: string;
  delta: Delta;
};

type BucketRow = {
  bucket: "arrivals" | "departures" | "stayovers" | "dailys" | "eod";
  label: string;
  done: number;
  tol: number;
  percent: number;
};

type StaffRow = {
  name: string;
  sub: string;
  avatarUri: string;
  tasks: number;
};

type Recap = {
  weekLabel: string;
  heroStats: HeroStat[];
  bucketRows: BucketRow[];
  staff: StaffRow[];
  maintenance: { opened: number; closed: number; open: number };
};

/* ------------------------------------------------------------------ */
/* Bucket bar fill colors                                              */
/* arrivals/eod → header token (body too light against white track)   */
/* departures/stayovers → body token (dark/warm, reads well)          */
/* dailys → dull-header (richer lavender vs. muted blue-grey header)  */
/* ------------------------------------------------------------------ */

const BAR_COLOR: Record<BucketRow["bucket"], string> = {
  arrivals:   "var(--arrivals-header)",
  departures: "var(--departures-body)",
  stayovers:  "var(--stayovers-body)",
  dailys:     "var(--dailys-dull-header)",
  eod:        "var(--eod-header)",
};

/* ------------------------------------------------------------------ */
/* Avatar placeholders                                                 */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/* Static data                                                         */
/* All aggregations are static for this translation.                  */
/* TODO: wire to weekly aggregation query post-beta (BR item 12).     */
/* ------------------------------------------------------------------ */

const RECAP: Recap = {
  weekLabel: "MAR 15 — 21, 2026 · WEEK 12",
  heroStats: [
    {
      label: "OCCUPANCY",
      value: "87",
      unit: "%",
      delta: { value: "4 pts vs prior", direction: "up" },
    },
    {
      label: "TURNOVERS",
      value: "42",
      delta: { value: "6 vs prior", direction: "up" },
    },
    {
      label: "TASKS DONE",
      value: "213",
      delta: { value: "18 vs prior", direction: "up" },
    },
    {
      label: "ON-TIME RATE",
      value: "96",
      unit: "%",
      delta: { value: "1 pt vs prior", direction: "down" },
    },
  ],
  bucketRows: [
    { bucket: "arrivals",   label: "Arrivals",   done: 44, tol: 45, percent: 98  },
    { bucket: "departures", label: "Departures", done: 42, tol: 42, percent: 100 },
    { bucket: "stayovers",  label: "Stayovers",  done: 31, tol: 33, percent: 94  },
    { bucket: "dailys",     label: "Dailys",     done: 89, tol: 92, percent: 97  },
    { bucket: "eod",        label: "EOD",        done: 7,  tol: 7,  percent: 100 },
  ],
  staff: [
    { name: "Courtney Manager", sub: "ON CALL · 7 DAYS",      avatarUri: AVATAR_COURTNEY, tasks: 48 },
    { name: "Lizzie Larson",    sub: "FRONT OF HOUSE · 98%",   avatarUri: AVATAR_LIZZIE,   tasks: 62 },
    { name: "Angie Lopez",      sub: "HOUSEKEEPING · 95%",     avatarUri: AVATAR_ANGIE,    tasks: 87 },
    { name: "Mark Parry",       sub: "GC · 6 WORK ORDERS",     avatarUri: AVATAR_MARK,     tasks: 16 },
  ],
  maintenance: { opened: 8, closed: 6, open: 2 },
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminReportsPage() {
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

  const recap = RECAP;
  const { opened, closed, open: stillOpen } = recap.maintenance;
  const closedPct = opened > 0 ? (closed / opened) * 100 : 0;
  const openPct   = opened > 0 ? (stillOpen / opened) * 100 : 0;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* Top bar */}
        <div className={styles.topbar}>
          <Link href="/admin" className={styles.navBtn} aria-label="Back">
            &lsaquo;
          </Link>
          <div />
          <button className={styles.navBtn} aria-label="More">&hellip;</button>
        </div>

        {/* Hero heading */}
        <div className={styles.heroTitle}>Weekly Recap</div>
        <div className={styles.heroDate}>{recap.weekLabel}</div>

        {/* 01 — Overview */}
        <div className={styles.secLabel}>
          <span className={styles.secNum}>01</span>
          <span>Overview</span>
        </div>
        <div className={styles.heroStats}>
          {recap.heroStats.map((stat, i) => (
            <div key={i}>
              <div className={styles.hsLabel}>{stat.label}</div>
              <div className={styles.hsVal}>
                {stat.value}
                {stat.unit && <small className={styles.hsUnit}>{stat.unit}</small>}
              </div>
              <div
                className={[
                  styles.hsDelta,
                  stat.delta.direction === "up" ? styles.hsDeltaUp : styles.hsDeltaDown,
                ].join(" ")}
              >
                {stat.delta.direction === "up" ? "↑" : "↓"}{" "}
                {stat.delta.value}
              </div>
            </div>
          ))}
        </div>

        {/* 02 — By Bucket */}
        <div className={styles.secLabel}>
          <span className={styles.secNum}>02</span>
          <span>By Bucket</span>
        </div>
        <div className={styles.bars}>
          {recap.bucketRows.map((row) => (
            <div key={row.bucket} className={styles.barRow}>
              <div className={styles.barHead}>
                <span className={styles.barLabel}>{row.label}</span>
                <span className={styles.barCount}>
                  {row.done} / {row.tol} &middot; {row.percent}%
                </span>
              </div>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{
                    width: `${row.percent}%`,
                    "--bc": BAR_COLOR[row.bucket],
                  } as React.CSSProperties}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 03 — By Staff */}
        <div className={styles.secLabel}>
          <span className={styles.secNum}>03</span>
          <span>By Staff</span>
        </div>
        <div className={styles.staffLedger}>
          {recap.staff.map((member, i) => (
            <div key={i} className={styles.slRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.slAvatar}
                src={member.avatarUri}
                alt={member.name}
                width={36}
                height={36}
              />
              <div>
                <div className={styles.slName}>{member.name}</div>
                <div className={styles.slSub}>{member.sub}</div>
              </div>
              <div className={styles.slMetric}>
                <div className={styles.slVal}>{member.tasks}</div>
                <div className={styles.slLbl}>TASKS</div>
              </div>
            </div>
          ))}
        </div>

        {/* 04 — Maintenance throughput */}
        <div className={styles.secLabel}>
          <span className={styles.secNum}>04</span>
          <span>Maintenance</span>
        </div>
        <div className={styles.throughput}>
          <div className={styles.tpSplit}>
            <div className={styles.tpCell}>
              <div className={styles.tpVal}>{opened}</div>
              <div className={styles.tpLbl}>OPENED</div>
            </div>
            <div className={styles.tpCell}>
              <div className={`${styles.tpVal} ${styles.tpValClosed}`}>{closed}</div>
              <div className={styles.tpLbl}>CLOSED</div>
            </div>
            <div className={styles.tpCell}>
              <div className={`${styles.tpVal} ${styles.tpValOpen}`}>{stillOpen}</div>
              <div className={styles.tpLbl}>STILL OPEN</div>
            </div>
          </div>
          <div className={styles.tpBar}>
            <div
              className={`${styles.tpSeg} ${styles.tpSegClosed}`}
              style={{ width: `${closedPct}%` }}
            />
            <div
              className={`${styles.tpSeg} ${styles.tpSegOpen}`}
              style={{ width: `${openPct}%` }}
            />
          </div>
          <div className={styles.tpLegend}>
            <span>
              <span className={`${styles.tpSwatch} ${styles.tpSwatchClosed}`} />
              CLOSED
            </span>
            <span>
              <span className={`${styles.tpSwatch} ${styles.tpSwatchOpen}`} />
              STILL OPEN
            </span>
          </div>
        </div>

        {/* CTA pair — TODO: Share + Export PDF post-beta */}
        <div className={styles.ctaPair}>
          <button className={styles.btnSecondary}>Share</button>
          <button className={styles.btnPrimary}>Export PDF</button>
        </div>

        <div className={styles.footnote}>THE DISPATCH CO &middot; WEEKLY RECAP</div>
      </div>
    </div>
  );
}
