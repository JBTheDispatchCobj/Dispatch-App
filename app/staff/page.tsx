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
      <main className="staff-app staff-home">
        <p className="loading-line">Loading…</p>
      </main>
    );
  }

  const springLine = springKicker(now);

  return (
    <main className="staff-app staff-home">
      <header className="staff-home-header">
        <div className="staff-home-profile">
          <div className="staff-home-avatar" aria-hidden>
            {avatarLetter(displayName)}
          </div>
        </div>
        <SignOutButton />
      </header>

      <p className="staff-weather-strip">
        High of 40° Low of 21°. Windy.
      </p>

      <p className="staff-turnover-line" role="status">
        TURN OVER ROOM 15
      </p>

      <p className="staff-occupancy-line">
        Arrivals: 3 · Departures: 2 · Stay overs: 4
      </p>

      <section className="staff-greeting-block">
        <p className="staff-home-greeting">Hi {firstName(displayName)}!</p>
        <p className="staff-home-date">{formatDateHeading(now)}</p>
        {springLine ? (
          <p className="staff-home-kicker">{springLine}</p>
        ) : null}
      </section>

      <section className="staff-snapshot" aria-label="Today snapshot">
        <div className="staff-snapshot-grid">
          <div className="staff-snapshot-cell">
            <span className="staff-snapshot-label">Status</span>
            <span className="staff-snapshot-value">On shift</span>
          </div>
          <div className="staff-snapshot-cell">
            <span className="staff-snapshot-label">Weather</span>
            <span className="staff-snapshot-value">
              High 40° / Low 21° · Windy
            </span>
          </div>
          <div className="staff-snapshot-cell staff-snapshot-cell--wide">
            <span className="staff-snapshot-label">Events</span>
            <span className="staff-snapshot-value">
              Dueling Pianos – Balsam Lake Lodge
              <span className="staff-snapshot-sub">12:00 pm – 6:00 pm</span>
            </span>
          </div>
          <div className="staff-snapshot-cell staff-snapshot-cell--wide">
            <span className="staff-snapshot-label">Notes</span>
            <span className="staff-snapshot-value">
              Room 15 guest prefers 2% milk
            </span>
          </div>
        </div>
      </section>

      <section className="staff-cta-block">
        <button type="button" className="staff-cta-btn">
          START LAUNDRY
        </button>
      </section>

      <section className="staff-tasks-section" aria-label="Your work">
        <div className="staff-tasks-head">
          <h2 className="staff-tasks-title">Today</h2>
          <span className="staff-tasks-count">{filtered.length}</span>
        </div>
        <label className="staff-search-wrap">
          <span className="staff-search-label">Search</span>
          <input
            type="search"
            className="staff-search-input"
            placeholder="Filter by title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
        </label>
        {!staffId ? (
          <p className="staff-card-muted">
            Your account isn’t linked to a staff profile yet. Ask a manager to
            connect you in the staff directory.
          </p>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        {staffId && loadingTasks ? (
          <p className="staff-card-muted">Loading…</p>
        ) : null}
        {staffId && !loadingTasks && filtered.length === 0 ? (
          <p className="staff-card-muted">No tasks assigned.</p>
        ) : null}
        {staffId && !loadingTasks && filtered.length > 0 ? (
          <div className="staff-exec-buckets">
            {BUCKET_ORDER.map((bucket) => {
              const list = buckets[bucket];
              return (
                <section
                  key={bucket}
                  className="staff-exec-bucket"
                  aria-label={BUCKET_LABEL[bucket]}
                >
                  <div className="staff-exec-bucket-head">
                    <h3 className="staff-exec-bucket-title">
                      {BUCKET_LABEL[bucket]}
                    </h3>
                    <span className="staff-exec-bucket-count">{list.length}</span>
                  </div>
                  {list.length === 0 ? (
                    <p className="staff-exec-bucket-empty">None</p>
                  ) : bucket === "start_of_day" ? (
                    <div className="staff-sod-row" role="list">
                      {list.map((t) => (
                        <Link
                          key={t.id}
                          href={`/staff/task/${t.id}`}
                          className="staff-sod-mini"
                          aria-label={`${t.title}, ${formatDueAndPriority(t)}`}
                          role="listitem"
                        >
                          <span className="staff-sod-mini__title">{t.title}</span>
                          <span className="staff-sod-mini__meta">
                            {formatDueAndPriority(t)}
                          </span>
                          <span className="staff-sod-mini__status">
                            {formatStatusShort(t.status)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <ul className="staff-task-rows staff-scan-rows" role="list">
                      {list.map((t) => (
                        <li key={t.id} className="staff-task-rows__item">
                          <Link
                            href={`/staff/task/${t.id}`}
                            className="staff-task-row staff-scan-row"
                            aria-label={`${t.title}, ${formatDueAndPriority(t)}`}
                          >
                            <span className="staff-task-row__main">
                              <span className="staff-task-row__title">
                                {t.title}
                              </span>
                              <span className="staff-task-row__meta">
                                {formatDueAndPriority(t)}
                              </span>
                            </span>
                            <span className="staff-task-row__chev" aria-hidden>
                              ›
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        ) : null}
      </section>

      <nav className="staff-bottom-nav" aria-label="Staff navigation">
        <span className="staff-bottom-nav-item staff-bottom-nav-item--active">
          Home
        </span>
        <Link href="/staff/report" className="staff-bottom-nav-item">
          Report
        </Link>
      </nav>
    </main>
  );
}
