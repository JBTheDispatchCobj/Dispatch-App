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
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type MaintPriority = "low" | "normal" | "high" | "critical";
type MaintStatus =
  | "new"
  | "in_progress"
  | "waiting_parts"
  | "waiting_vendor"
  | "resolved";

type MaintPart = {
  label: string;
  source: string;
  orderedAt: string;
  eta: string;
};

type MaintOrder = {
  id: string;
  workOrderId: string;
  title: string;
  category: string;
  priority: MaintPriority;
  status: MaintStatus;
  statusLabel: string;
  reporter: string;
  reportedAt: string;
  assignee: { name: string; avatarUri: string };
  description: string;
  parts: MaintPart[];
  activity: { actor: string; text: string; timestamp: string }[];
};

/* ------------------------------------------------------------------ */
/* Lookup maps                                                         */
/* ------------------------------------------------------------------ */

const PRIORITIES: { key: MaintPriority; label: string }[] = [
  { key: "low",      label: "Low"      },
  { key: "normal",   label: "Normal"   },
  { key: "high",     label: "High"     },
  { key: "critical", label: "Critical" },
];

const PRIORITY_STRIP_LABEL: Record<MaintPriority, string> = {
  low:      "LOW PRIORITY",
  normal:   "NORMAL",
  high:     "HIGH PRIORITY",
  critical: "CRITICAL",
};

const STATUS_DOT_CLASS: Record<MaintStatus, string> = {
  new:            styles.sdotBlue,
  in_progress:    styles.sdotAmber,
  waiting_parts:  styles.sdotAmber,
  waiting_vendor: styles.sdotAmber,
  resolved:       styles.sdotGreen,
};

/* ------------------------------------------------------------------ */
/* Avatar placeholder                                                  */
/* ------------------------------------------------------------------ */

const AVATAR_MARK =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'><defs><linearGradient id='g' x1='0.15' y1='0' x2='0.85' y2='1'><stop offset='0' stop-color='%23DAE0C2'/><stop offset='1' stop-color='%239BA67C'/></linearGradient></defs><rect width='80' height='80' fill='url(%23g)'/><circle cx='40' cy='30' r='13' fill='%233C4728'/><ellipse cx='40' cy='74' rx='26' ry='20' fill='%233C4728'/></svg>";

/* ------------------------------------------------------------------ */
/* Static data — TODO: replace with Supabase fetch post-beta          */
/* ------------------------------------------------------------------ */

const ORDER: MaintOrder = {
  id: "mo-0347",
  workOrderId: "MO-0347",
  title: "Room 14 — AC not cooling",
  category: "HVAC",
  priority: "high",
  status: "waiting_parts",
  statusLabel: "Waiting parts",
  reporter: "Lizzie Larson",
  reportedAt: "MAR 18 · 10:15 PM",
  assignee: { name: "Mark Parry", avatarUri: AVATAR_MARK },
  description:
    "Guest called at 10pm reporting room at 82°F. Thermostat unresponsive after reset attempts. Guest relocated to Room 22. AC compressor capacitor appears to have failed — standard 5-year fault pattern for this unit.",
  parts: [
    {
      label: "Compressor capacitor — 35uF / 370V",
      source: "Grainger",
      orderedAt: "Mar 19",
      eta: "MAR 22",
    },
  ],
  activity: [
    {
      actor: "Mark",
      text: "added note: “Capacitor arrived — install Mon AM”",
      timestamp: "MAR 21",
    },
    {
      actor: "Mark",
      text: "ordered replacement part",
      timestamp: "MAR 19",
    },
    {
      actor: "Mark",
      text: "diagnosed capacitor failure",
      timestamp: "MAR 19",
    },
    {
      actor: "Lizzie",
      text: "reported issue — guest relocated to 22",
      timestamp: "MAR 18",
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminMaintenanceDetailPage() {
  const [ready, setReady] = useState(false);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(null);
  const [priority, setPriority] = useState<MaintPriority>(ORDER.priority);

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

  if (profileFailure) return <ProfileLoadError failure={profileFailure} />;
  if (!ready) return null;

  if (id === "unknown") {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          Work order not found.{" "}
          <Link href="/admin">Back to admin</Link>
        </div>
      </div>
    );
  }

  const order = ORDER;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* Top bar */}
        <div className={styles.topbar}>
          <Link href="/admin" className={styles.navBtn} aria-label="Back">
            &lsaquo;
          </Link>
          <div className={styles.pageHead}>
            <div className={styles.pageTitle}>Work Order</div>
            <div className={styles.pageSub}>MAINTENANCE</div>
          </div>
          <button className={styles.navBtn} aria-label="More">&hellip;</button>
        </div>

        {/* Hero sage card */}
        <div className={styles.heroCard}>
          <div className={styles.heroStrip}>
            <span>
              <span className={styles.heroBadge}>WORK ORDER</span>
              {" "}{order.workOrderId}
            </span>
            <span>{PRIORITY_STRIP_LABEL[order.priority]}</span>
          </div>
          <div className={styles.heroBody}>
            <div className={styles.heroTitle}>{order.title}</div>
            <div className={styles.heroMeta}>
              {order.category} &middot; Reported 3 days ago
            </div>
            <div className={styles.heroGrid}>
              <div>
                <div className={styles.heroCellLabel}>ASSIGNED</div>
                <div className={styles.heroCellVal}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={styles.assigneeAvatar}
                    src={order.assignee.avatarUri}
                    alt={order.assignee.name}
                    width={22}
                    height={22}
                  />
                  {order.assignee.name}
                </div>
              </div>
              <div>
                <div className={styles.heroCellLabel}>STATUS</div>
                <div className={styles.heroCellVal}>
                  <span className={STATUS_DOT_CLASS[order.status]} />
                  {order.statusLabel}
                </div>
              </div>
              <div>
                <div className={styles.heroCellLabel}>REPORTED BY</div>
                <div className={`${styles.heroCellVal} ${styles.heroCellValSm}`}>
                  {order.reporter}
                </div>
              </div>
              <div>
                <div className={styles.heroCellLabel}>REPORTED</div>
                <div className={`${styles.heroCellVal} ${styles.heroCellValMono}`}>
                  {order.reportedAt}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Issue panel */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span>ISSUE</span>
            <span className={styles.panelHeadRight}>DESCRIPTION</span>
          </div>
          <div className={styles.panelBody}>{order.description}</div>
        </div>

        {/* Priority panel */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span>PRIORITY</span>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.chipRow}>
              {PRIORITIES.map(({ key, label }) => {
                const isActive = priority === key;
                const isAlert = isActive && (key === "high" || key === "critical");
                return (
                  <button
                    key={key}
                    className={[
                      styles.chip,
                      isActive ? styles.chipActive : null,
                      isAlert ? styles.chipAlert : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setPriority(key)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Parts & Supplies panel */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span>PARTS &amp; SUPPLIES</span>
            <span className={styles.panelHeadRight}>
              {order.parts.length} AWAITING
            </span>
          </div>
          <div className={styles.panelBody}>
            {order.parts.map((part, i) => (
              <div key={i} className={styles.waitingRow}>
                <div className={styles.waitingIcon}>&#9879;</div>
                <div className={styles.waitingMain}>
                  <div className={styles.waitingTitle}>{part.label}</div>
                  <div className={styles.waitingSub}>
                    Ordered {part.orderedAt} &middot; {part.source}
                  </div>
                </div>
                <div className={styles.waitingEta}>ETA {part.eta}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity panel */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span>ACTIVITY</span>
            <span className={styles.panelHeadRight}>
              {order.activity.length} EVENTS
            </span>
          </div>
          <div className={`${styles.panelBody} ${styles.panelBodyLog}`}>
            {order.activity.map((event, i) => (
              <div key={i} className={styles.logRow}>
                <span className={styles.logDot} />
                <div className={styles.logText}>
                  <b>{event.actor}</b> {event.text}
                </div>
                <div className={styles.logTime}>{event.timestamp}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA pair — TODO: Escalate + Mark Resolved write-path post-beta */}
        <div className={styles.ctaPair}>
          <button className={styles.btnSecondary}>Escalate</button>
          <button className={styles.btnPrimary}>Mark Resolved</button>
        </div>

        <div className={styles.footnote}>
          THE DISPATCH CO &middot; ADMIN &middot; MAINTENANCE
        </div>
      </div>
    </div>
  );
}
