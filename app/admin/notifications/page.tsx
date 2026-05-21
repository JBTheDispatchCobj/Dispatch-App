"use client";

/**
 * /admin/notifications — the Notification Center "View all" archive (NC
 * Region B). Reached from the Outgoing tile's "View all" button. Mirrors the
 * /admin/tasks screen but swaps the stats strip for a search bar: the full
 * building flow (notes + maintenance + task-events) split into Housekeeping /
 * Admin / Maintenance, searchable, with each section expandable full-screen.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchProfile, type ProfileFetchFailure } from "@/lib/profile";
import {
  resolveAuthUser,
  redirectToLoginUnlessLocalDevBypass,
} from "@/lib/dev-auth-bypass";
import ProfileLoadError from "../../profile-load-error";
import {
  getNotificationArchive,
  type ArchiveItem,
  type ArchiveLane,
  type NotificationArchive,
} from "@/lib/notification-archive";
import styles from "./page.module.css";

const LANES: { key: ArchiveLane; label: string; headClass: string }[] = [
  { key: "housekeeping", label: "HOUSEKEEPING", headClass: styles.laneHeadHousekeeping },
  { key: "admin", label: "ADMIN", headClass: styles.laneHeadAdmin },
  { key: "maintenance", label: "MAINTENANCE", headClass: styles.laneHeadMaintenance },
];

const SDOT: Record<ArchiveItem["dot"], string> = {
  green: styles.sdotGreen,
  amber: styles.sdotAmber,
  red: styles.sdotRed,
};

const COLLAPSED_CAP = 6;

function todayLabel(): string {
  const d = new Date();
  const wd = d
    .toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Chicago" })
    .toUpperCase();
  const md = d
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Chicago",
    })
    .toUpperCase();
  return `${wd} · ${md}`;
}

export default function AdminNotificationsPage() {
  const [ready, setReady] = useState(false);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(null);
  const [archive, setArchive] = useState<NotificationArchive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<ArchiveLane | null>(null);

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

  const load = useCallback(async () => {
    try {
      const a = await getNotificationArchive(supabase);
      setArchive(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load notifications.");
    }
  }, []);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  const q = query.trim().toLowerCase();
  function filterItems(items: ArchiveItem[]): ArchiveItem[] {
    if (!q) return items;
    return items.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.meta.toLowerCase().includes(q) ||
        it.badge.toLowerCase().includes(q),
    );
  }

  if (profileFailure) return <ProfileLoadError failure={profileFailure} />;
  if (!ready) return null;

  const visibleLanes = expanded ? LANES.filter((l) => l.key === expanded) : LANES;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* Top bar */}
        <div className={styles.topbar}>
          <Link href="/admin" className={styles.navBtn} aria-label="Back">
            &lsaquo;
          </Link>
          <div className={styles.pageHead}>
            <div className={styles.pageTitle}>Notifications</div>
            <div className={styles.pageSub}>{todayLabel()}</div>
          </div>
          <span className={styles.navBtn} style={{ visibility: "hidden" }} aria-hidden>
            +
          </span>
        </div>

        {/* Search (replaces the Tasks stats strip) */}
        <div className={styles.searchWrap}>
          <input
            className={styles.searchInput}
            type="search"
            inputMode="search"
            placeholder="Search notifications…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Section label / back-to-all when a section is expanded */}
        <div className={styles.sectionLabel}>
          {expanded ? (
            <>
              <button className={styles.backBtn} onClick={() => setExpanded(null)}>
                &lsaquo; ALL
              </button>
              <span>{LANES.find((l) => l.key === expanded)?.label}</span>
            </>
          ) : (
            <>
              <span>ARCHIVE</span>
              <span>TAP VIEW ALL</span>
            </>
          )}
        </div>

        {error && (
          <div className="error" style={{ margin: "0 14px 14px" }}>
            {error}
          </div>
        )}

        {!archive ? (
          <p className="loading-line" style={{ margin: "0 4px" }}>
            Loading…
          </p>
        ) : (
          visibleLanes.map((lane) => {
            const all = filterItems(archive[lane.key]);
            const shown = expanded ? all : all.slice(0, COLLAPSED_CAP);
            return (
              <div key={lane.key} className={styles.laneCard}>
                <div className={`${styles.laneHead} ${lane.headClass}`}>
                  <span>{lane.label}</span>
                  <span className={styles.laneHeadRight}>
                    <span className={styles.laneCount}>{all.length}</span>
                    {!expanded && all.length > COLLAPSED_CAP && (
                      <button
                        className={styles.viewAllBtn}
                        onClick={() => setExpanded(lane.key)}
                      >
                        View all
                      </button>
                    )}
                  </span>
                </div>
                {shown.length === 0 ? (
                  <div className={styles.emptyRow}>
                    {q ? "No matches" : "Nothing here"}
                  </div>
                ) : (
                  shown.map((it) => (
                    <div key={it.id} className={styles.row}>
                      <div className={styles.badge}>{it.badge}</div>
                      <div className={styles.rowMain}>
                        <div className={styles.rowTitle}>{it.title}</div>
                        <div className={styles.rowMeta}>{it.meta}</div>
                      </div>
                      <div className={styles.rowStatus}>
                        <span className={SDOT[it.dot]} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })
        )}

        <div className={styles.footnote}>THE DISPATCH CO &middot; ADMIN &middot; NOTIFICATIONS</div>
      </div>
    </div>
  );
}
