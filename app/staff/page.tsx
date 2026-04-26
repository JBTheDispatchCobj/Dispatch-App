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
import SignOutButton from "@/app/sign-out-button";
import { supabase } from "@/lib/supabase";
import {
  partitionStaffHomeTasks,
  type StaffHomeBucket,
} from "@/lib/staff-home-bucket";
import styles from "./page.module.css";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  due_time: string | null;
  priority: string;
  card_type: string;
  context: unknown;
  room_number: string | null;
  location_label: string | null;
};

function formatDueAndPriority(t: TaskRow): string {
  const parts: string[] = [];
  if (t.due_time) {
    const m = /^(\d{1,2}):(\d{2})/.exec(t.due_time);
    if (m) {
      let h = parseInt(m[1], 10);
      const min = m[2];
      const pm = h >= 12;
      const h12 = h % 12 || 12;
      parts.push(`${h12}:${min} ${pm ? "PM" : "AM"}`);
    }
  }
  if (t.due_date) parts.push(t.due_date);
  const duePart = parts.length ? parts.join(" · ") : "No due time";
  const pr =
    t.priority === "high"
      ? "High"
      : t.priority === "low"
        ? "Low"
        : "Medium";
  return `${duePart} · ${pr}`;
}

function formatStatusShort(status: string): string {
  return status.replace(/_/g, " ");
}

const BUCKET_ORDER: StaffHomeBucket[] = [
  "start_of_day",
  "departures",
  "arrivals",
  "stayovers",
  "eod",
  "dailys",
];

const BUCKET_LABEL: Record<StaffHomeBucket, string> = {
  start_of_day: "Start of Day",
  departures: "Departures",
  arrivals: "Arrivals",
  stayovers: "Stayovers",
  eod: "End of Day",
  dailys: "Dailys",
};

function formatDateHeading(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function firstName(displayName: string): string {
  const t = displayName.trim();
  if (!t) return "there";
  return t.split(/\s+/)[0] ?? t;
}

function avatarLetter(displayName: string): string {
  const t = displayName.trim();
  if (!t) return "?";
  return t.charAt(0).toUpperCase();
}

/** Matches wireframe “spring” kicker around the equinox (demo). */
function springKicker(d: Date): string | null {
  const m = d.getMonth();
  const day = d.getDate();
  if (m === 2 && day >= 19 && day <= 21) {
    return "1st official day of Spring!";
  }
  return null;
}

/* Per-bucket CSS variable sets for lead cards / scan wrappers */
const BUCKET_VARS: Record<StaffHomeBucket, React.CSSProperties> = {
  start_of_day: {} as React.CSSProperties,
  departures:   { "--lc-body": "var(--departures-body)",  "--lc-header": "var(--departures-header)",  "--lc-text": "var(--departures-text)"  } as React.CSSProperties,
  arrivals:     { "--lc-body": "var(--arrivals-body)",    "--lc-header": "var(--arrivals-header)",    "--lc-text": "var(--arrivals-text)"    } as React.CSSProperties,
  stayovers:    { "--lc-body": "var(--stayovers-body)",   "--lc-header": "var(--stayovers-header)",   "--lc-text": "var(--stayovers-text)"   } as React.CSSProperties,
  eod:          { "--lc-body": "var(--eod-body)",         "--lc-header": "var(--eod-header)",         "--lc-text": "var(--eod-text)"         } as React.CSSProperties,
  dailys:       { "--lc-body": "var(--dailys-body)",      "--lc-header": "var(--dailys-header)",      "--lc-text": "var(--dailys-text)"      } as React.CSSProperties,
};

export default function StaffHomePage() {
  const [ready, setReady] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [staffId, setStaffId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [now] = useState(() => new Date());
  const [expandedBucket, setExpandedBucket] = useState<StaffHomeBucket | null>(null);

  const loadTasks = useCallback(async (sid: string | null) => {
    setLoadingTasks(true);
    setError(null);
    if (!sid) {
      setTasks([]);
      setLoadingTasks(false);
      return;
    }
    const { data, error: qErr } = await supabase
      .from("tasks")
      .select(
        "id, title, status, due_date, due_time, priority, card_type, context, room_number, location_label",
      )
      .eq("staff_id", sid)
      .in("status", ["open", "in_progress", "paused", "blocked"])
      .order("due_date", { ascending: true, nullsFirst: false });
    if (qErr) {
      setError(qErr.message);
      setTasks([]);
    } else {
      const rows = (data ?? []) as Record<string, unknown>[];
      setTasks(
        rows.map((r) => ({
          id: String(r.id),
          title: String(r.title ?? ""),
          status: String(r.status ?? ""),
          due_date:
            r.due_date === null || r.due_date === undefined
              ? null
              : String(r.due_date),
          due_time:
            r.due_time === null || r.due_time === undefined
              ? null
              : String(r.due_time),
          priority: String(r.priority ?? "medium"),
          card_type: String(r.card_type ?? "housekeeping_turn"),
          context: r.context,
          room_number:
            r.room_number === null || r.room_number === undefined
              ? null
              : String(r.room_number),
          location_label:
            r.location_label === null || r.location_label === undefined
              ? null
              : String(r.location_label),
        })),
      );
    }
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
      setStaffId(p.staff_id);
      await loadTasks(p.staff_id);
      setReady(true);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [tasks, search]);

  const buckets = useMemo(
    () => partitionStaffHomeTasks(filtered),
    [filtered],
  );

  if (profileFailure) {
    return <ProfileLoadError failure={profileFailure} />;
  }

  if (!ready) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <p className={styles.emptyState}>Loading…</p>
        </div>
      </div>
    );
  }

  const sodList = buckets.start_of_day;
  const otherBuckets = BUCKET_ORDER.filter((b) => b !== "start_of_day");

  return (
    <div className={styles.page}>
      <div className={styles.shell}>

        {/* Top bar */}
        <div className={styles.topbar}>
          <div className={styles.topLeft}>
            <p className={styles.greet}>Hi {firstName(displayName)}!</p>
            <p className={styles.greetDate}>{formatDateHeading(now)}</p>
          </div>
          <div className={styles.topRight}>
            <div className={styles.avatar} aria-hidden>{avatarLetter(displayName)}</div>
            <div className={styles.signOutWrap}><SignOutButton /></div>
          </div>
        </div>

        {/* Daily Brief */}
        <div className={styles.dailyBrief}>
          <div className={styles.briefStrip}>
            <span>DAILY BRIEF</span>
            <span>{formatDateHeading(now).toUpperCase()}</span>
          </div>
          <div className={styles.briefBody}>
            <p className={styles.briefHeading}>{formatDateHeading(now)}</p>
            <p className={styles.briefMeta}>Arrivals: 3 · Departures: 2 · Stayovers: 4</p>
          </div>
        </div>

        {/* Tasks */}
        {!staffId ? (
          <p className={styles.emptyState}>Not linked to a staff profile yet.</p>
        ) : error ? (
          <p className={styles.errorLine}>{error}</p>
        ) : loadingTasks ? (
          <p className={styles.emptyState}>Loading tasks…</p>
        ) : (
          <>
            <div className={styles.sectionLabel}>
              <span>TASKS TODAY</span>
              <span>{filtered.length} OPEN</span>
            </div>

            {/* Start of Day — inline mustard card */}
            <div className={styles.sodCard}>
              <div className={styles.sodStrip}>
                <span>START OF DAY</span>
                <span>{sodList.length} TASKS</span>
              </div>
              <div className={styles.sodBody}>
                {sodList.length === 0 ? (
                  <p className={styles.sodEmpty}>No tasks assigned.</p>
                ) : (
                  <div className={styles.sodRow}>
                    {sodList.map((t) => (
                      <Link
                        key={t.id}
                        href={`/staff/task/${t.id}`}
                        className={styles.sodItem}
                        aria-label={t.title}
                      >
                        <div className={styles.sodItemMain}>
                          <div className={styles.sodItemTitle}>{t.title}</div>
                          <div className={styles.sodItemMeta}>{formatDueAndPriority(t)}</div>
                        </div>
                        <span className={styles.sodChev}>&rsaquo;</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Other buckets as lead cards / scan lists */}
            {otherBuckets.map((bucket) => {
              const list = buckets[bucket];
              const cssVars = BUCKET_VARS[bucket];
              const hasNextUp = bucket === "departures" && list.some((t) => t.status === "in_progress");
              const isExpanded = expandedBucket === bucket;

              if (isExpanded) {
                return (
                  <div key={bucket} className={styles.scanWrap} style={cssVars}>
                    <div
                      className={styles.scanStrip}
                      onClick={() => setExpandedBucket(null)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpandedBucket(null); }}
                    >
                      <span>{BUCKET_LABEL[bucket].toUpperCase()} · {list.length} TASKS</span>
                      <span className={styles.scanCollapseIcon}>&#x25BE;</span>
                    </div>
                    {list.length === 0 ? (
                      <p className={styles.scanEmpty}>No tasks assigned.</p>
                    ) : (
                      <div className={styles.scanList}>
                        {list.map((t) => (
                          <Link
                            key={t.id}
                            href={`/staff/task/${t.id}`}
                            className={styles.scanRow}
                            aria-label={t.title}
                          >
                            <div className={styles.scanRowMain}>
                              <div className={styles.scanTitle}>{t.title}</div>
                              <div className={styles.scanMeta}>{formatDueAndPriority(t)}</div>
                            </div>
                            <span className={styles.scanChev}>&rsaquo;</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={bucket}
                  className={styles.leadCard}
                  style={cssVars}
                  onClick={() => setExpandedBucket(bucket)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpandedBucket(bucket); }}
                  aria-label={`${BUCKET_LABEL[bucket]}, ${list.length} tasks`}
                >
                  <div className={styles.leadStrip}>
                    <span>{BUCKET_LABEL[bucket].toUpperCase()}</span>
                    <span>{list.length} TASKS</span>
                  </div>
                  <div className={styles.leadBody}>
                    <div className={styles.leadTitle}>{list.length}</div>
                    <div className={styles.leadSub}>
                      {hasNextUp && (
                        <span className={styles.nextUpPill}>
                          <span className={styles.nextUpDot} />
                          NEXT UP
                        </span>
                      )}
                      {list.length === 0
                        ? "No tasks assigned"
                        : `${list.length} task${list.length !== 1 ? "s" : ""} · tap to open`}
                    </div>
                    <span className={styles.leadChev}>&rsaquo;</span>
                  </div>
                </div>
              );
            })}
          </>
        )}

        <div className={styles.footnote}>THE DISPATCH CO · STAFF</div>
      </div>
    </div>
  );
}
