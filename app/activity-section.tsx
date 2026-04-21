"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const AF_STYLES = `
.af-toolbar { margin-bottom: 0.35rem; }
.af-feed {
  display: flex;
  flex-direction: column;
  margin: 0 -0.15rem;
  max-height: min(70vh, 32rem);
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  min-height: 0;
}
.af-item {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.85rem 0.15rem;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 9%, transparent);
}
.af-day-group {
  display: flex;
  flex-direction: column;
}
.af-dayhdr {
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--background);
  padding: 8px 0.15rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(2px);
  font-size: 0.8125rem;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
  letter-spacing: 0.02em;
}
.af-feed > .af-day-group:last-child > .af-item-link:last-child > .af-item {
  border-bottom: none;
}
.af-maincol {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.af-main {
  font-size: 0.9375rem;
  line-height: 1.45;
  color: var(--foreground);
}
.af-name { font-weight: 700; }
.af-action { font-weight: 400; color: color-mix(in srgb, var(--foreground) 92%, transparent); }
.af-title { font-weight: 600; font-style: normal; color: color-mix(in srgb, var(--foreground) 88%, transparent); }
.af-meta {
  font-size: 0.8125rem;
  color: color-mix(in srgb, var(--foreground) 52%, transparent);
  line-height: 1.35;
}
.af-footer {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.15rem;
}
.af-time {
  font-size: 0.75rem;
  color: color-mix(in srgb, var(--foreground) 48%, transparent);
}
.af-refresh-row { margin-bottom: 0.5rem; }
.af-refresh-min {
  font-size: 0.8125rem;
  padding: 0.35rem 0.55rem;
  min-height: 2rem;
  border: 1px solid color-mix(in srgb, var(--foreground) 28%, transparent);
  border-radius: 6px;
  background: transparent;
  color: var(--foreground);
  cursor: pointer;
}
.af-empty {
  font-size: 0.875rem;
  color: color-mix(in srgb, var(--foreground) 52%, transparent);
  padding: 0.5rem 0;
}
.af-item-link {
  display: block;
  color: inherit;
  text-decoration: none;
}
.af-item-link:hover .af-item {
  background: color-mix(in srgb, var(--foreground) 4%, transparent);
  border-radius: 4px;
}
`;

type TaskEventRow = {
  id: string;
  task_id: string;
  user_id: string | null;
  event_type: string;
  detail: Record<string, unknown>;
  created_at: string;
  tasks: { id: string; title: string } | null;
};

function localDateKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localDateKeyFromIso(iso: string): string {
  return localDateKeyFromDate(new Date(iso));
}

function todayKey(): string {
  return localDateKeyFromDate(new Date());
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateKeyFromDate(d);
}

function dayHeaderLabel(key: string): string {
  if (key === todayKey()) return "Today";
  if (key === yesterdayKey()) return "Yesterday";
  const [y, mo, da] = key.split("-").map(Number);
  const dt = new Date(y, mo - 1, da);
  const cy = new Date().getFullYear();
  if (dt.getFullYear() !== cy) {
    return dt.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function groupByDay(
  items: TaskEventRow[],
): { key: string; label: string; items: TaskEventRow[] }[] {
  const groups: { key: string; label: string; items: TaskEventRow[] }[] = [];
  for (const item of items) {
    const key = localDateKeyFromIso(item.created_at);
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label: dayHeaderLabel(key), items: [] };
      groups.push(g);
    }
    g.items.push(item);
  }
  return groups;
}

function formatTimeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const sec = Math.floor((Date.now() - then) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

function eventActionLabel(eventType: string): string {
  switch (eventType) {
    case "marked_done":        return "marked done";
    case "needs_help":         return "asked for help";
    case "comment_added":      return "added a note";
    case "checklist_checked":  return "checked an item";
    case "checklist_unchecked":return "unchecked an item";
    case "card_opened":        return "opened the card";
    default:                   return eventType;
  }
}

function normalizeEventRow(raw: Record<string, unknown>): TaskEventRow {
  const tasksRaw = raw.tasks;
  let tasks: { id: string; title: string } | null = null;
  if (Array.isArray(tasksRaw) && tasksRaw[0]) {
    const t = tasksRaw[0] as Record<string, unknown>;
    if (t.id && t.title) tasks = { id: String(t.id), title: String(t.title) };
  } else if (tasksRaw && typeof tasksRaw === "object" && !Array.isArray(tasksRaw)) {
    const t = tasksRaw as Record<string, unknown>;
    if (t.id && t.title) tasks = { id: String(t.id), title: String(t.title) };
  }
  return {
    id: String(raw.id),
    task_id: String(raw.task_id),
    user_id: raw.user_id === null || raw.user_id === undefined ? null : String(raw.user_id),
    event_type: String(raw.event_type ?? ""),
    detail:
      raw.detail && typeof raw.detail === "object" && !Array.isArray(raw.detail)
        ? (raw.detail as Record<string, unknown>)
        : {},
    created_at: String(raw.created_at ?? ""),
    tasks,
  };
}

export default function ActivitySection() {
  const [events, setEvents] = useState<TaskEventRow[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: qErr } = await supabase
      .from("task_events")
      .select("id, task_id, user_id, event_type, detail, created_at, tasks(id, title)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (qErr) {
      setError(qErr.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []).map((r) =>
      normalizeEventRow(r as Record<string, unknown>),
    );
    setEvents(rows);

    const userIds = [
      ...new Set(
        rows.map((r) => r.user_id).filter((id): id is string => id !== null),
      ),
    ];
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      if (profileData) {
        const map: Record<string, string> = {};
        for (const p of profileData as Array<{
          id: string;
          display_name: string;
        }>) {
          if (p.display_name) map[p.id] = p.display_name;
        }
        setNameMap(map);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const groups = groupByDay(events);

  return (
    <>
      <style>{AF_STYLES}</style>
      <div className="af-toolbar">
        <h2>Activity</h2>
        <p className="activity-lede">Recent staff actions</p>
        <div className="af-refresh-row">
          <button
            type="button"
            className="af-refresh-min"
            onClick={() => void loadActivity()}
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <p className="af-empty">Loading activity…</p>
      ) : events.length === 0 ? (
        <p className="af-empty">No recent activity yet.</p>
      ) : (
        <div className="activity-feed af-feed" role="feed">
          {groups.map((g) => (
            <div key={g.key} className="af-day-group">
              <div className="af-dayhdr">{g.label}</div>
              {g.items.map((row) => {
                const displayName =
                  (row.user_id && nameMap[row.user_id]) || "Staff";
                const action = eventActionLabel(row.event_type);
                const taskTitle = row.tasks?.title ?? null;
                return (
                  <Link
                    key={row.id}
                    href={`/tasks/${row.task_id}`}
                    className="af-item-link"
                  >
                    <div className="af-item" role="article">
                      <div className="af-maincol">
                        <span className="af-main">
                          <strong className="af-name">{displayName}</strong>
                          <span className="af-action"> {action}</span>
                          {taskTitle ? (
                            <>
                              <span className="af-action"> — </span>
                              <span className="af-title">{taskTitle}</span>
                            </>
                          ) : null}
                        </span>
                        <div className="af-footer">
                          <time className="af-time" dateTime={row.created_at}>
                            {formatTimeAgo(row.created_at)}
                          </time>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
