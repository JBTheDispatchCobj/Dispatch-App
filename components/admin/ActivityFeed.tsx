"use client";

// components/admin/ActivityFeed.tsx
//
// Day 29 III.D Phase 3 — live activity feed component for /admin home.
// Replaces the hardcoded FEED_ITEMS array that's been sitting in
// app/admin/page.tsx since Phase 3 of the original UI build.
//
// Reads via lib/activity-feed.ts (Phase 2). Renders day-grouped, severity-
// dotted, dismissable rows. Filter dropdowns for severity + kind. Refresh
// button. Per-browser dismiss state via localStorage (no schema needed for
// beta — dismiss is personal-view-state, not system-truth).
//
// Mounts on /admin home in place of the hardcoded feed (master plan III.D).
// Will also surface on /admin/staff/[id] post-Day-29 once II.E wires
// getActivityForUser() — that's the Phase 4 helper API delivered alongside
// Phase 2.
//
// Inline CSS via <style> block follows the existing pattern from the
// soon-to-be-deleted app/activity-section.tsx (Phase 5 cleanup). When the
// /admin home rebuild (II.C) lands properly, this component's styles can
// move to app/admin/page.module.css.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getActivityFeed,
  type ActivityFeedItem,
  type ActivityKind,
  type ActivitySeverity,
} from "@/lib/activity-feed";

// =============================================================================
// localStorage dismiss state
// =============================================================================

const DISMISSED_STORAGE_KEY = "dispatch.activity-feed.dismissed.v1";

function loadDismissedFromStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((x): x is string => typeof x === "string"));
    }
  } catch {
    // Corrupted storage — start fresh.
  }
  return new Set();
}

function persistDismissedToStorage(dismissed: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DISMISSED_STORAGE_KEY,
      JSON.stringify([...dismissed]),
    );
  } catch {
    // Storage full / disabled — in-memory dismiss only this session.
  }
}

// =============================================================================
// Day grouping + time-ago helpers (mirrors app/activity-section.tsx pattern)
// =============================================================================

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayKey(): string {
  return localDateKey(new Date());
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateKey(d);
}

function dayHeaderLabel(key: string): string {
  if (key === todayKey()) return "Today";
  if (key === yesterdayKey()) return "Yesterday";
  const [y, mo, da] = key.split("-").map(Number);
  const dt = new Date(y, mo - 1, da);
  if (dt.getFullYear() !== new Date().getFullYear()) {
    return dt.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function groupByDay(
  items: ActivityFeedItem[],
): { key: string; label: string; items: ActivityFeedItem[] }[] {
  const groups: { key: string; label: string; items: ActivityFeedItem[] }[] = [];
  for (const item of items) {
    const key = localDateKey(new Date(item.created_at));
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

// =============================================================================
// Component
// =============================================================================

export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<"all" | ActivitySeverity>("all");
  const [kindFilter, setKindFilter] = useState<"all" | ActivityKind>("all");

  // Load persisted dismissals on mount
  useEffect(() => {
    setDismissed(loadDismissedFromStorage());
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getActivityFeed(supabase, {
        limit: 100,
        severityFilter:
          severityFilter === "all" ? undefined : [severityFilter],
        kindFilter: kindFilter === "all" ? undefined : [kindFilter],
      });
      setItems(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity.");
    } finally {
      setLoading(false);
    }
  }, [severityFilter, kindFilter]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const dismissItem = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      persistDismissedToStorage(next);
      return next;
    });
  }, []);

  const restoreDismissed = useCallback(() => {
    setDismissed(new Set());
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(DISMISSED_STORAGE_KEY);
      } catch {
        // Ignore storage errors on clear.
      }
    }
  }, []);

  const visibleItems = useMemo(
    () => items.filter((item) => !dismissed.has(item.id)),
    [items, dismissed],
  );

  const groups = useMemo(() => groupByDay(visibleItems), [visibleItems]);

  return (
    <>
      <style>{ACTIVITY_FEED_STYLES}</style>
      <div className="af3-section">
        <div className="af3-header">
          <span className="af3-header-title">ACTIVITY</span>
          <span className="af3-header-meta">
            {visibleItems.length} ITEMS · LIVE
          </span>
        </div>

        <div className="af3-controls">
          <label className="af3-control">
            <span className="af3-control-label">Severity</span>
            <select
              className="af3-select"
              value={severityFilter}
              onChange={(e) =>
                setSeverityFilter(e.target.value as "all" | ActivitySeverity)
              }
              disabled={loading}
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
            </select>
          </label>

          <label className="af3-control">
            <span className="af3-control-label">Kind</span>
            <select
              className="af3-select"
              value={kindFilter}
              onChange={(e) =>
                setKindFilter(e.target.value as "all" | ActivityKind)
              }
              disabled={loading}
            >
              <option value="all">All</option>
              <option value="task_event">Events</option>
              <option value="note">Notes</option>
              <option value="maintenance_issue">Maintenance</option>
            </select>
          </label>

          <button
            type="button"
            className="af3-refresh"
            onClick={() => void loadFeed()}
            disabled={loading}
          >
            {loading ? "…" : "Refresh"}
          </button>
        </div>

        {error && <p className="af3-error">{error}</p>}

        {loading ? (
          <p className="af3-empty">Loading activity…</p>
        ) : visibleItems.length === 0 ? (
          <p className="af3-empty">
            No recent activity
            {dismissed.size > 0 ? ` (${dismissed.size} dismissed)` : ""}.
          </p>
        ) : (
          <div className="af3-feed" role="feed">
            {groups.map((g) => (
              <div key={g.key} className="af3-day">
                <div className="af3-day-hdr">{g.label}</div>
                {g.items.map((item) => (
                  <div
                    key={item.id}
                    className={`af3-item af3-item--${item.severity}`}
                  >
                    <span
                      className={`af3-sev af3-sev--${item.severity}`}
                      aria-label={item.severity}
                    />
                    <Link
                      href={`/admin/tasks/${item.related_task_id}`}
                      className="af3-item-main"
                    >
                      <div className="af3-msg">{item.message}</div>
                      <div className="af3-meta">
                        {item.related_room && (
                          <span className="af3-room">
                            RM {item.related_room}
                          </span>
                        )}
                        <time
                          className="af3-time"
                          dateTime={item.created_at}
                        >
                          {formatTimeAgo(item.created_at)}
                        </time>
                        <span className="af3-kind">
                          {item.kind === "note"
                            ? "NOTE"
                            : item.kind === "maintenance_issue"
                              ? "MAINT"
                              : "EVENT"}
                        </span>
                      </div>
                    </Link>
                    <button
                      type="button"
                      className="af3-dismiss"
                      onClick={() => dismissItem(item.id)}
                      aria-label="Dismiss"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {dismissed.size > 0 && (
          <button
            type="button"
            className="af3-restore"
            onClick={restoreDismissed}
          >
            Restore {dismissed.size} dismissed
          </button>
        )}
      </div>
    </>
  );
}

// =============================================================================
// Inline styles
//
// af3- prefix avoids collision with af- (existing app/activity-section.tsx,
// slated for Phase 5 deletion) and any other component-level naming.
// Mobile-first per CLAUDE.md (390px viewport). Severity dot colors match
// the existing /admin sdotGreen/Amber/Red palette to stay visually
// consistent with the lanes.
// =============================================================================

const ACTIVITY_FEED_STYLES = `
.af3-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0.75rem 0;
}
.af3-header {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  font-size: 0.6875rem;
  letter-spacing: 0.12em;
  color: color-mix(in srgb, var(--foreground) 60%, transparent);
  padding: 0 0.15rem;
}
.af3-header-title {
  font-weight: 700;
}
.af3-controls {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.5rem;
  padding: 0 0.15rem;
}
.af3-control {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
}
.af3-control-label {
  text-transform: uppercase;
}
.af3-select {
  font-size: 0.8125rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid color-mix(in srgb, var(--foreground) 25%, transparent);
  border-radius: 6px;
  background: var(--background);
  color: var(--foreground);
  min-height: 2rem;
}
.af3-refresh {
  font-size: 0.8125rem;
  padding: 0.35rem 0.65rem;
  min-height: 2rem;
  border: 1px solid color-mix(in srgb, var(--foreground) 28%, transparent);
  border-radius: 6px;
  background: transparent;
  color: var(--foreground);
  cursor: pointer;
  margin-left: auto;
}
.af3-refresh:disabled {
  opacity: 0.5;
  cursor: wait;
}
.af3-error {
  font-size: 0.8125rem;
  color: #c52c2c;
  padding: 0.35rem 0.5rem;
  background: rgba(197, 44, 44, 0.08);
  border-radius: 6px;
}
.af3-empty {
  font-size: 0.875rem;
  color: color-mix(in srgb, var(--foreground) 52%, transparent);
  padding: 0.5rem 0.15rem;
}
.af3-feed {
  display: flex;
  flex-direction: column;
  margin: 0 -0.15rem;
  max-height: min(70vh, 32rem);
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.af3-day {
  display: flex;
  flex-direction: column;
}
.af3-day-hdr {
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--background);
  padding: 0.5rem 0.15rem;
  font-weight: 600;
  font-size: 0.8125rem;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(2px);
}
.af3-item {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.55rem;
  padding: 0.7rem 0.15rem;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 8%, transparent);
}
.af3-feed > .af3-day:last-child > .af3-item:last-child {
  border-bottom: none;
}
.af3-sev {
  flex-shrink: 0;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  margin-top: 0.4rem;
}
.af3-sev--critical { background: #c52c2c; }
.af3-sev--warn     { background: #d9a82c; }
.af3-sev--info     { background: #4A7FA8; }
.af3-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  text-decoration: none;
  color: inherit;
}
.af3-item-main:hover {
  background: color-mix(in srgb, var(--foreground) 4%, transparent);
  border-radius: 4px;
}
.af3-msg {
  font-size: 0.9375rem;
  line-height: 1.4;
  color: var(--foreground);
}
.af3-meta {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: color-mix(in srgb, var(--foreground) 50%, transparent);
}
.af3-room {
  font-weight: 600;
  letter-spacing: 0.04em;
}
.af3-kind {
  font-weight: 600;
  letter-spacing: 0.06em;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  background: color-mix(in srgb, var(--foreground) 8%, transparent);
}
.af3-dismiss {
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: color-mix(in srgb, var(--foreground) 40%, transparent);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0 0.35rem;
  line-height: 1;
}
.af3-dismiss:hover {
  color: var(--foreground);
}
.af3-restore {
  align-self: flex-start;
  background: transparent;
  border: 1px dashed color-mix(in srgb, var(--foreground) 25%, transparent);
  border-radius: 6px;
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 60%, transparent);
  cursor: pointer;
}
`;
