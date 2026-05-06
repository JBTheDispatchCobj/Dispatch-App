"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { STAFF } from "./staff/data";
import { fetchProfile, type ProfileFetchFailure } from "@/lib/profile";
import {
  resolveAuthUser,
  redirectToLoginUnlessLocalDevBypass,
} from "@/lib/dev-auth-bypass";
import ProfileLoadError from "../profile-load-error";
import AddTaskModal from "@/components/admin/AddTaskModal";
import ActivityFeed from "@/components/admin/ActivityFeed";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type DotColor = "green" | "amber" | "red" | "blue" | "mute";

type LaneItem = { id: string; title: string; body: string; chip: string };

type BriefStat = {
  label: string;
  value: string;
  unit: string;
  compact?: boolean;
};

// FeedItem / FeedTagType + FEED_ITEMS hardcoded data removed Day 29 III.D
// Phase 3 — replaced with the live <ActivityFeed/> component sourced from
// lib/activity-feed.ts (task_events + notes union with severity boost).

/* ------------------------------------------------------------------ */
/* BRIEF_STATS — out of chase #1 scope; stays mocked                   */
/* ------------------------------------------------------------------ */

const BRIEF_STATS: BriefStat[] = [
  { label: "OCCUPANCY", value: "87", unit: "%" },
  { label: "ON SHIFT", value: "4", unit: " staff" },
  { label: "EVENT", value: "Dueling Pianos · Balsam", unit: "", compact: true },
];

/* ------------------------------------------------------------------ */
/* Lane fetchers — Day 36 chase #1 derives                              */
/*                                                                      */
/* All four lane types share the LaneItem shape so the rendering loop   */
/* doesn't care about source. Each fetcher returns LaneItem[] and       */
/* degrades gracefully on error (logs + empty array).                   */
/* ------------------------------------------------------------------ */

function excerpt(s: string | null | undefined, max = 70): string {
  if (!s) return "";
  const trimmed = s.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

/** WATCHLIST — unresolved maintenance issues, severity desc → newest first. */
async function fetchWatchlistItems(): Promise<LaneItem[]> {
  const { data, error } = await supabase
    .from("maintenance_issues")
    .select("id, location, item, type, severity, body, room_number, created_at, resolved_at")
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    console.warn("[admin-home] watchlist fetch failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as Array<{
    id: string;
    location: string;
    item: string;
    type: string;
    severity: string;
    body: string | null;
    room_number: string | null;
  }>;
  // Severity sort client-side: High → Normal → Low (mirrors UI severity order).
  const SEV_RANK: Record<string, number> = { High: 0, Normal: 1, Low: 2 };
  rows.sort((a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9));
  return rows.slice(0, 5).map((r) => ({
    id: `mnt-${r.id}`,
    title: `${r.location} — ${r.item}`,
    body:
      excerpt(r.body) ||
      [r.type, r.severity, r.room_number ? `RM ${r.room_number}` : null]
        .filter(Boolean)
        .join(" · "),
    chip: "MAINTENANCE",
  }));
}

/** SCHEDULING — clock-in snapshot from public.staff. Honest substrate
 *  (not II.K Calendar) — on-shift staff first, then off-shift, then inactive. */
async function fetchSchedulingItems(): Promise<LaneItem[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, name, role, status, clocked_in_at")
    .order("name", { ascending: true });
  if (error) {
    console.warn("[admin-home] scheduling fetch failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as Array<{
    id: string;
    name: string;
    role: string | null;
    status: string | null;
    clocked_in_at: string | null;
  }>;
  // Sort: on-shift first, then active off-shift, then inactive.
  const sortKey = (r: typeof rows[number]): number => {
    if (r.clocked_in_at) return 0;
    if ((r.status ?? "active") === "active") return 1;
    return 2;
  };
  rows.sort((a, b) => sortKey(a) - sortKey(b));
  return rows.slice(0, 8).map((r) => {
    const onShift = Boolean(r.clocked_in_at);
    const since = r.clocked_in_at
      ? new Date(r.clocked_in_at).toLocaleTimeString("en-US", {
          hour:   "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "America/Chicago",
        })
      : null;
    const isInactive = (r.status ?? "active") === "inactive";
    const body = onShift
      ? `On shift since ${since}`
      : isInactive
        ? `Inactive`
        : `Off shift${r.role ? ` · ${r.role}` : ""}`;
    return {
      id: `sch-${r.id}`,
      title: r.name,
      body,
      chip: onShift ? "ON SHIFT" : isInactive ? "INACTIVE" : "OFF",
    };
  });
}

/** CRITICAL — high-priority open tasks + any blocked tasks. */
async function fetchCriticalItems(): Promise<LaneItem[]> {
  // Two queries, merge — Postgres OR across (priority + status) needs `.or()`
  // syntax and we'd still need to filter status != 'done' on one side. Two
  // narrow queries are easier to read and keep the limit math sane.
  const [highRes, blockedRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, priority, status, card_type, room_number, assignee_name, context")
      .eq("priority", "high")
      .neq("status", "done")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("tasks")
      .select("id, title, priority, status, card_type, room_number, assignee_name, context")
      .eq("status", "blocked")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  if (highRes.error) console.warn("[admin-home] critical/high fetch failed:", highRes.error.message);
  if (blockedRes.error) console.warn("[admin-home] critical/blocked fetch failed:", blockedRes.error.message);
  const seen = new Set<string>();
  const merged: Array<{
    id: string; title: string; priority: string | null; status: string;
    card_type: string; room_number: string | null; assignee_name: string | null;
    context: Record<string, unknown> | null;
  }> = [];
  for (const r of [...(highRes.data ?? []), ...(blockedRes.data ?? [])] as Array<{
    id: string; title: string; priority: string | null; status: string;
    card_type: string; room_number: string | null; assignee_name: string | null;
    context: Record<string, unknown> | null;
  }>) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    merged.push(r);
  }
  return merged.slice(0, 5).map((r) => {
    const bucket =
      r.context && typeof r.context === "object"
        ? String((r.context as Record<string, unknown>).staff_home_bucket ?? r.card_type)
        : r.card_type;
    const bodyParts = [
      r.assignee_name?.trim() || "Unassigned",
      bucket,
      r.room_number?.trim() ? `RM ${r.room_number.trim()}` : null,
    ].filter(Boolean);
    return {
      id: `crit-${r.id}`,
      title: r.title || "(untitled)",
      body: bodyParts.join(" · "),
      chip: r.status === "blocked" ? "BLOCKED" : (r.priority ?? "HIGH").toUpperCase(),
    };
  });
}

/** NOTES — recent rows from public.notes. */
async function fetchNotesItems(): Promise<LaneItem[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, body, note_type, note_status, author_display_name, room_number, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    console.warn("[admin-home] notes fetch failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as Array<{
    id: string;
    body: string;
    note_type: string;
    note_status: string;
    author_display_name: string;
    room_number: string | null;
  }>;
  return rows.slice(0, 5).map((r) => ({
    id: `note-${r.id}`,
    title: excerpt(r.body) || `[${r.note_type}]`,
    body: [
      r.note_type,
      r.author_display_name,
      r.room_number ? `RM ${r.room_number}` : null,
    ].filter(Boolean).join(" · "),
    chip: (r.note_status || r.note_type || "NOTE").toUpperCase(),
  }));
}

/* ------------------------------------------------------------------ */
/* Lookup maps                                                         */
/* ------------------------------------------------------------------ */

const SDOT_CLASS: Record<DotColor, string> = {
  green: styles.sdotGreen,
  amber: styles.sdotAmber,
  red:   styles.sdotRed,
  blue:  styles.sdotBlue,
  mute:  styles.sdotMute,
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminHomePage() {
  const [ready, setReady] = useState(false);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [staffExpanded, setStaffExpanded] = useState(false);
  const [watchlistExpanded, setWatchlistExpanded] = useState(false);
  const [schedulingExpanded, setSchedulingExpanded] = useState(false);
  const [criticalExpanded, setCriticalExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  // Live lane state.
  const [watchlistItems, setWatchlistItems]   = useState<LaneItem[]>([]);
  const [schedulingItems, setSchedulingItems] = useState<LaneItem[]>([]);
  const [criticalItems, setCriticalItems]     = useState<LaneItem[]>([]);
  const [notesItems, setNotesItems]           = useState<LaneItem[]>([]);

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

  // Fan-out lane fetches in parallel once auth resolves.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void (async () => {
      const [watch, sched, crit, notes] = await Promise.all([
        fetchWatchlistItems(),
        fetchSchedulingItems(),
        fetchCriticalItems(),
        fetchNotesItems(),
      ]);
      if (cancelled) return;
      setWatchlistItems(watch);
      setSchedulingItems(sched);
      setCriticalItems(crit);
      setNotesItems(notes);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (profileFailure) return <ProfileLoadError failure={profileFailure} />;
  if (!ready) return null;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* Top bar */}
        <div className={styles.topbar}>
          <div>
            <div className={styles.greet}>Hi, Courtney</div>
            <div className={styles.greetDate}>SAT &middot; MAR 21, 2026</div>
          </div>
          <button className={styles.addBtn} aria-label="Add task" onClick={() => setModalOpen(true)}>+</button>
        </div>

        {/* Daily Brief */}
        <div className={styles.brief}>
          <div className={styles.briefHead}>
            <span>DAILY BRIEF</span>
            <span>PROPERTY</span>
          </div>
          <div className={styles.briefTitle}>
            High turnover today &mdash; 5 check-ins later.
          </div>
          <div className={styles.briefStat}>
            {BRIEF_STATS.map((s) => (
              <div key={s.label}>
                <div className={styles.statLabel}>{s.label}</div>
                <div className={`${styles.statVal}${s.compact ? ` ${styles.statValCompact}` : ""}`}>
                  {s.value}
                  {s.unit && <small className={styles.statValUnit}>{s.unit}</small>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Watchlist lane */}
        {watchlistExpanded ? (
          <>
            <div
              className={`${styles.sectionLabel} ${styles.sectionLabelExpanded}`}
              onClick={() => setWatchlistExpanded(false)}
              role="button"
              tabIndex={0}
            >
              <span>WATCHLIST &middot; {watchlistItems.length} ITEMS</span>
              <span className={styles.collapseHint}>
                TAP TO COLLAPSE
                <span className={styles.chevDown}>&#9662;</span>
              </span>
            </div>
            <div
              className={styles.laneItemGrid}
              style={{ "--lchip-bg": "rgba(217,168,44,0.18)", "--lchip-text": "#8A6A1C" } as React.CSSProperties}
            >
              {watchlistItems.length === 0 && (
                <div className={styles.laneItem}>
                  <div className={styles.laneItemBody}>No open maintenance issues.</div>
                </div>
              )}
              {watchlistItems.slice(0, 5).map((item) => (
                <div key={item.id} className={styles.laneItem}>
                  <div className={styles.laneItemHead}>
                    <div className={styles.laneItemTitle}>{item.title}</div>
                    <span className={styles.laneItemChip}>{item.chip}</span>
                  </div>
                  <div className={styles.laneItemBody}>{item.body}</div>
                </div>
              ))}
              {watchlistItems.length > 5 && (
                <div className={styles.laneItemMore}>+{watchlistItems.length - 5} more</div>
              )}
            </div>
          </>
        ) : (
          <div
            className={styles.lane}
            onClick={() => setWatchlistExpanded(true)}
            role="button"
            tabIndex={0}
          >
            <div className={`${styles.laneIcon} ${styles.laneIconWatchlist}`}>&#9651;</div>
            <div>
              <div className={styles.laneTitle}>Watchlist</div>
              <div className={styles.laneSub}>
                <span className={styles.sdotAmber} />
                {watchlistItems.length} items
              </div>
            </div>
            <div className={styles.chev}>&rsaquo;</div>
          </div>
        )}

        {/* Scheduling lane — clock-in snapshot until II.K Calendar lands */}
        {schedulingExpanded ? (
          <>
            <div
              className={`${styles.sectionLabel} ${styles.sectionLabelExpanded}`}
              onClick={() => setSchedulingExpanded(false)}
              role="button"
              tabIndex={0}
            >
              <span>SCHEDULING &middot; {schedulingItems.length} ITEMS</span>
              <span className={styles.collapseHint}>
                TAP TO COLLAPSE
                <span className={styles.chevDown}>&#9662;</span>
              </span>
            </div>
            <div
              className={styles.laneItemGrid}
              style={{ "--lchip-bg": "rgba(46,123,84,0.16)", "--lchip-text": "#1F5C3C" } as React.CSSProperties}
            >
              {schedulingItems.length === 0 && (
                <div className={styles.laneItem}>
                  <div className={styles.laneItemBody}>No staff records.</div>
                </div>
              )}
              {schedulingItems.slice(0, 5).map((item) => (
                <div key={item.id} className={styles.laneItem}>
                  <div className={styles.laneItemHead}>
                    <div className={styles.laneItemTitle}>{item.title}</div>
                    <span className={styles.laneItemChip}>{item.chip}</span>
                  </div>
                  <div className={styles.laneItemBody}>{item.body}</div>
                </div>
              ))}
              {schedulingItems.length > 5 && (
                <div className={styles.laneItemMore}>+{schedulingItems.length - 5} more</div>
              )}
            </div>
          </>
        ) : (
          <div
            className={styles.lane}
            onClick={() => setSchedulingExpanded(true)}
            role="button"
            tabIndex={0}
          >
            <div className={`${styles.laneIcon} ${styles.laneIconScheduling}`}>&#9681;</div>
            <div>
              <div className={styles.laneTitle}>Scheduling</div>
              <div className={styles.laneSub}>
                <span className={styles.sdotGreen} />
                {schedulingItems.length} on roster
              </div>
            </div>
            <div className={styles.chev}>&rsaquo;</div>
          </div>
        )}

        {/* Critical lane */}
        {criticalExpanded ? (
          <>
            <div
              className={`${styles.sectionLabel} ${styles.sectionLabelExpanded}`}
              onClick={() => setCriticalExpanded(false)}
              role="button"
              tabIndex={0}
            >
              <span>CRITICAL &middot; {criticalItems.length} ITEMS</span>
              <span className={styles.collapseHint}>
                TAP TO COLLAPSE
                <span className={styles.chevDown}>&#9662;</span>
              </span>
            </div>
            <div
              className={styles.laneItemGrid}
              style={{ "--lchip-bg": "rgba(199,95,95,0.18)", "--lchip-text": "#8A3A3A" } as React.CSSProperties}
            >
              {criticalItems.length === 0 && (
                <div className={styles.laneItem}>
                  <div className={styles.laneItemBody}>Nothing critical.</div>
                </div>
              )}
              {criticalItems.slice(0, 5).map((item) => (
                <div key={item.id} className={styles.laneItem}>
                  <div className={styles.laneItemHead}>
                    <div className={styles.laneItemTitle}>{item.title}</div>
                    <span className={styles.laneItemChip}>{item.chip}</span>
                  </div>
                  <div className={styles.laneItemBody}>{item.body}</div>
                </div>
              ))}
              {criticalItems.length > 5 && (
                <div className={styles.laneItemMore}>+{criticalItems.length - 5} more</div>
              )}
            </div>
          </>
        ) : (
          <div
            className={styles.lane}
            onClick={() => setCriticalExpanded(true)}
            role="button"
            tabIndex={0}
          >
            <div className={`${styles.laneIcon} ${styles.laneIconCritical}`}>&#9650;</div>
            <div>
              <div className={styles.laneTitle}>Critical</div>
              <div className={styles.laneSub}>
                <span className={styles.sdotRed} />
                {criticalItems.length} active
              </div>
            </div>
            <div className={styles.chev}>&rsaquo;</div>
          </div>
        )}

        {/* Notes lane */}
        {notesExpanded ? (
          <>
            <div
              className={`${styles.sectionLabel} ${styles.sectionLabelExpanded}`}
              onClick={() => setNotesExpanded(false)}
              role="button"
              tabIndex={0}
            >
              <span>NOTES &middot; {notesItems.length} ITEMS</span>
              <span className={styles.collapseHint}>
                TAP TO COLLAPSE
                <span className={styles.chevDown}>&#9662;</span>
              </span>
            </div>
            <div
              className={styles.laneItemGrid}
              style={{ "--lchip-bg": "rgba(74,127,168,0.18)", "--lchip-text": "#2B6C8A" } as React.CSSProperties}
            >
              {notesItems.length === 0 && (
                <div className={styles.laneItem}>
                  <div className={styles.laneItemBody}>No recent notes.</div>
                </div>
              )}
              {notesItems.slice(0, 5).map((item) => (
                <div key={item.id} className={styles.laneItem}>
                  <div className={styles.laneItemHead}>
                    <div className={styles.laneItemTitle}>{item.title}</div>
                    <span className={styles.laneItemChip}>{item.chip}</span>
                  </div>
                  <div className={styles.laneItemBody}>{item.body}</div>
                </div>
              ))}
              {notesItems.length > 5 && (
                <div className={styles.laneItemMore}>+{notesItems.length - 5} more</div>
              )}
            </div>
          </>
        ) : (
          <div
            className={styles.lane}
            onClick={() => setNotesExpanded(true)}
            role="button"
            tabIndex={0}
          >
            <div className={`${styles.laneIcon} ${styles.laneIconNotes}`}>&#9678;</div>
            <div>
              <div className={styles.laneTitle}>Notes</div>
              <div className={styles.laneSub}>
                <span className={styles.sdotBlue} />
                {notesItems.length} items
              </div>
            </div>
            <div className={styles.chev}>&rsaquo;</div>
          </div>
        )}

        {/* Activity feed — Day 29 III.D Phase 3.
            Live <ActivityFeed/> component replaces the hardcoded FEED_ITEMS
            array that's been sitting here since the original Phase 3 UI
            build. Sources task_events + notes via lib/activity-feed.ts. */}
        <ActivityFeed />

        {/* Staff — expanded inline or minimized lane */}
        {staffExpanded && (
          <>
            <div
              className={`${styles.sectionLabel} ${styles.sectionLabelExpanded}`}
              onClick={() => setStaffExpanded(false)}
              role="button"
              tabIndex={0}
            >
              <span>STAFF &middot; {STAFF.filter((s) => !s.off).length} ACTIVE</span>
              <span className={styles.collapseHint}>
                TAP TO COLLAPSE
                <span className={styles.chevDown}>&#9662;</span>
              </span>
            </div>
            <div className={styles.staffGrid}>
              {STAFF.map((member) => (
                <Link
                  key={member.slug}
                  href={`/admin/staff/${member.slug}`}
                  className={[
                    styles.staffCard,
                    member.off ? styles.staffCardOff : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className={styles.staffCardStrip}>
                    <span>{member.roleStrip}</span>
                    <span className={styles.staffOnlineDot} />
                  </div>
                  <div className={styles.staffCardBody}>
                    <div className={styles.staffIdRow}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className={styles.staffAvatar}
                        src={member.avatarSrc}
                        alt={`${member.firstName} ${member.lastName}`}
                        width={38}
                        height={38}
                      />
                      <div className={styles.staffName}>
                        {member.firstName}
                        <br />
                        {member.lastName}
                      </div>
                    </div>
                    <div className={styles.staffRole}>{member.shiftLabel}</div>
                    <div className={styles.staffBottomRow}>
                      {member.metrics.map((m, i) => (
                        <div key={i} className={styles.staffMetric}>
                          <div className={styles.staffMetricVal}>{m.value}</div>
                          <div className={styles.staffMetricLbl}>{m.label}</div>
                        </div>
                      ))}
                      <div className={styles.staffDrillBtn} aria-hidden="true">
                        &rsaquo;
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Overview lanes */}
        <div className={styles.sectionLabel}>
          <span>OVERVIEW</span>
          <span>TAP TO EXPAND</span>
        </div>

        {!staffExpanded && (
          <div
            className={styles.lane}
            onClick={() => setStaffExpanded(true)}
            role="button"
            tabIndex={0}
          >
            <div className={`${styles.laneIcon} ${styles.laneIconStaff}`}>&#9673;</div>
            <div>
              <div className={styles.laneTitle}>Staff</div>
              <div className={styles.laneSub}>
                <span className={styles.sdotGreen} />
                4 on shift
                <span className={styles.laneSep}>&middot;</span>
                <span className={styles.sdotRed} />
                2 overdue
              </div>
            </div>
            <div className={styles.chev}>&rsaquo;</div>
          </div>
        )}

        <Link href="/admin/tasks" className={styles.lane}>
          <div className={`${styles.laneIcon} ${styles.laneIconTasks}`}>&#9776;</div>
          <div>
            <div className={styles.laneTitle}>Tasks</div>
            <div className={styles.laneSub}>Housekeeping &middot; Admin &middot; Maint</div>
          </div>
          <div className={styles.chev}>&rsaquo;</div>
        </Link>

        <Link href="/admin/tasks#maintenance" className={styles.lane}>
          <div className={`${styles.laneIcon} ${styles.laneIconMaint}`}>&#9672;</div>
          <div>
            <div className={styles.laneTitle}>Maintenance</div>
            <div className={styles.laneSub}>
              <span className={styles.sdotAmber} />
              {watchlistItems.length} open
            </div>
          </div>
          <div className={styles.chev}>&rsaquo;</div>
        </Link>

        <div className={styles.footnote}>THE DISPATCH CO &middot; ADMIN</div>
      </div>
      <AddTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => setModalOpen(false)}
      />
    </div>
  );
}
