"use client";

// components/admin/ActivityFeed.tsx
//
// Day 54 chase #5 — rewritten to drop severity/kind filters + day grouping
// in favor of an employee-categorized layout per Bryan's product call:
//
//   ┌─ ACTIVITY · [Refresh] ─────────────────────────────────────┐
//   │ Management card (collapsed) — total item count, chevron     │
//   │ Housekeeping card (auto-expanded)                            │
//   │   ├─ Lizzie Larson  · top 3 most recent items               │
//   │   ├─ Angie Lopez    · top 3                                 │
//   │   └─ Mark Parry     · "No activity today" empty state       │
//   └─────────────────────────────────────────────────────────────┘
//
// Single accordion (one category open at a time). Today-only filter
// (zero-inbox EOD — yesterday's items don't carry over). Per-employee
// top-3 hard cap. Dismiss persistence via localStorage preserved.
//
// Category mapping for beta: profile.role 'admin'/'manager' → Management;
// everything else → Housekeeping. When Jennifer's role schema lands
// (Section 14 Phase 2), swap to the multi-tier mapping.
//
// Mockup spec at design/admin-activity-redesign.html.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getActivityFeed,
  type ActivityFeedItem,
} from "@/lib/activity-feed";

// =============================================================================
// Types + category config
// =============================================================================

type CategoryKey = "management" | "housekeeping";

type ProfileRow = {
  id: string;
  role: string;
  display_name: string;
};

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "management", label: "Management" },
  { key: "housekeeping", label: "Housekeeping" },
];

function roleToCategory(role: string): CategoryKey {
  const r = (role ?? "").toLowerCase();
  if (r === "admin" || r === "manager") return "management";
  return "housekeeping";
}

// =============================================================================
// localStorage dismiss state (unchanged from Day 29)
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
// Today filter + time-ago helpers
// =============================================================================

// Compare in the property's local timezone so a midnight rollover doesn't
// wipe activity from a still-active overnight shift.
const PROPERTY_TZ = "America/Chicago";

function localDateKey(iso: string, tz: string): string {
  // en-CA gives YYYY-MM-DD, which is easy to compare as a string.
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: tz });
}

function isTodayInPropertyTz(iso: string): boolean {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: PROPERTY_TZ });
  return localDateKey(iso, PROPERTY_TZ) === today;
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
// Avatar helpers — map staff display_name to the 4-name locked palette
// (master plan II.D / II.E). Phase 2: swap to slug column on profiles/staff.
// =============================================================================

type AvatarSlug = "cm" | "ll" | "al" | "mp" | null;

function avatarSlugFor(name: string): AvatarSlug {
  const n = (name ?? "").toLowerCase();
  if (n.includes("courtney")) return "cm";
  if (n.includes("lizzie")) return "ll";
  if (n.includes("angie")) return "al";
  if (n.includes("mark")) return "mp";
  return null;
}

function avatarInitials(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

// =============================================================================
// Component
// =============================================================================

export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  // Auto-expand Housekeeping by default (where most activity lives at beta).
  const [expandedCategory, setExpandedCategory] = useState<CategoryKey | null>(
    "housekeeping",
  );

  useEffect(() => {
    setDismissed(loadDismissedFromStorage());
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [feed, profilesResult] = await Promise.all([
        getActivityFeed(supabase, { limit: 200 }),
        supabase
          .from("profiles")
          .select("id, role, display_name")
          .order("display_name", { ascending: true }),
      ]);

      // Today-only filter — yesterday's items are presumed dealt with.
      const todayItems = feed.filter((item) =>
        isTodayInPropertyTz(item.created_at),
      );
      setItems(todayItems);

      if (profilesResult.error) {
        console.warn(
          "[ActivityFeed] Profiles fetch failed:",
          profilesResult.error.message,
        );
        setProfiles([]);
      } else {
        const rows = (profilesResult.data ?? []) as Array<{
          id: unknown;
          role: unknown;
          display_name: unknown;
        }>;
        setProfiles(
          rows
            .filter((r) => typeof r.id === "string")
            .map((r) => ({
              id: String(r.id),
              role: typeof r.role === "string" ? r.role : "staff",
              display_name:
                typeof r.display_name === "string" && r.display_name.trim()
                  ? r.display_name
                  : "Staff",
            })),
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load activity.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

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

  // ── Grouping: category → employees → top-3 items per employee ─────────
  const grouped = useMemo(() => {
    // Partition profiles by category
    const profilesByCat: Record<CategoryKey, ProfileRow[]> = {
      management: [],
      housekeeping: [],
    };
    for (const p of profiles) {
      profilesByCat[roleToCategory(p.role)].push(p);
    }

    // Index visible items by actor_user_id; sort desc; cap at 3 per actor
    const itemsByActor = new Map<string, ActivityFeedItem[]>();
    for (const item of visibleItems) {
      if (!item.actor_user_id) continue;
      const list = itemsByActor.get(item.actor_user_id);
      if (list) list.push(item);
      else itemsByActor.set(item.actor_user_id, [item]);
    }
    for (const [actor, list] of itemsByActor) {
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
      itemsByActor.set(actor, list.slice(0, 3));
    }

    return CATEGORIES.map((cat) => {
      const catProfiles = profilesByCat[cat.key];
      const employees = catProfiles.map((p) => ({
        id: p.id,
        name: p.display_name,
        role: p.role,
        items: itemsByActor.get(p.id) ?? [],
      }));
      const totalItems = employees.reduce(
        (sum, e) => sum + e.items.length,
        0,
      );
      const lastTimestamp = employees
        .flatMap((e) => e.items)
        .map((i) => new Date(i.created_at).getTime())
        .reduce((max, t) => Math.max(max, t), 0);
      return {
        key: cat.key,
        label: cat.label,
        employees,
        totalItems,
        lastTimestamp,
      };
    });
  }, [profiles, visibleItems]);

  const handleCategoryTap = (key: CategoryKey) => {
    setExpandedCategory((curr) => (curr === key ? null : key));
  };

  return (
    <>
      <style>{ACTIVITY_FEED_STYLES}</style>
      <div className="af3-section">
        <div className="af3-section-cap">
          <span className="af3-section-label">Activity</span>
          <button
            type="button"
            className="af3-refresh-pill"
            onClick={() => void loadFeed()}
            disabled={loading}
          >
            {loading ? "…" : "Refresh"}
          </button>
        </div>

        {error && <p className="af3-error">{error}</p>}

        {loading ? (
          <p className="af3-empty">Loading activity…</p>
        ) : (
          <div className="af3-cats">
            {grouped.map((cat) => {
              const isExpanded = expandedCategory === cat.key;
              const isEmpty = cat.employees.length === 0;
              const classes = ["af3-cat"];
              if (isExpanded) classes.push("af3-cat--expanded");
              if (isEmpty) classes.push("af3-cat--empty");
              return (
                <div
                  key={cat.key}
                  className={classes.join(" ")}
                  data-cat={cat.key}
                >
                  <button
                    type="button"
                    className="af3-cat-header"
                    onClick={() => handleCategoryTap(cat.key)}
                    aria-expanded={isExpanded}
                    aria-controls={`af3-cat-body-${cat.key}`}
                    disabled={isEmpty}
                  >
                    <div className="af3-cat-stripe" />
                    <div className="af3-cat-head-body">
                      <div className="af3-cat-name">{cat.label}</div>
                      <div className="af3-cat-sub">
                        {cat.employees.length}{" "}
                        {cat.employees.length === 1 ? "Staff" : "Staff"}
                        {cat.lastTimestamp > 0 && (
                          <>
                            {" · Last "}
                            {formatTimeAgo(
                              new Date(cat.lastTimestamp).toISOString(),
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="af3-cat-right">
                      <div className="af3-cat-count">{cat.totalItems}</div>
                      {!isEmpty && (
                        <span className="af3-cat-chevron" aria-hidden>
                          ▾
                        </span>
                      )}
                    </div>
                  </button>
                  {isExpanded && !isEmpty && (
                    <div
                      className="af3-cat-body"
                      id={`af3-cat-body-${cat.key}`}
                    >
                      {cat.employees.map((emp) => {
                        const slug = avatarSlugFor(emp.name);
                        return (
                          <div
                            key={emp.id}
                            className="af3-emp"
                            data-staff={slug ?? "default"}
                          >
                            <div className="af3-emp-head">
                              <div
                                className="af3-emp-avatar"
                                aria-hidden
                              >
                                {avatarInitials(emp.name)}
                              </div>
                              <div className="af3-emp-id">
                                <div className="af3-emp-name">
                                  {emp.name}
                                </div>
                                <div className="af3-emp-role">
                                  {emp.role || "Staff"}
                                </div>
                              </div>
                              <div className="af3-emp-count">
                                {emp.items.length}{" "}
                                {emp.items.length === 1 ? "Item" : "Items"}
                              </div>
                            </div>
                            <div className="af3-emp-items">
                              {emp.items.length === 0 ? (
                                <div className="af3-item af3-item--empty">
                                  <div className="af3-item-msg">
                                    No activity today.
                                  </div>
                                </div>
                              ) : (
                                emp.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className={`af3-item af3-item--${item.severity}`}
                                  >
                                    <span
                                      className="af3-item-dot"
                                      aria-hidden
                                    />
                                    <Link
                                      href={`/admin/tasks/${item.related_task_id}`}
                                      className="af3-item-body"
                                    >
                                      <div className="af3-item-msg">
                                        {item.message}
                                      </div>
                                      <div className="af3-item-meta">
                                        {item.related_room && (
                                          <span className="af3-item-target">
                                            RM {item.related_room}
                                          </span>
                                        )}
                                        <time
                                          className="af3-item-time"
                                          dateTime={item.created_at}
                                        >
                                          {formatTimeAgo(item.created_at)}
                                        </time>
                                        <span
                                          className={
                                            "af3-item-kind af3-item-kind--" +
                                            (item.kind === "note"
                                              ? "note"
                                              : item.kind ===
                                                  "maintenance_issue"
                                                ? "maint"
                                                : "event")
                                          }
                                        >
                                          {item.kind === "note"
                                            ? "Note"
                                            : item.kind ===
                                                "maintenance_issue"
                                              ? "Maint"
                                              : "Event"}
                                        </span>
                                      </div>
                                    </Link>
                                    <button
                                      type="button"
                                      className="af3-item-dismiss"
                                      onClick={() => dismissItem(item.id)}
                                      aria-label="Dismiss"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
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
// Inline styles — ported from design/admin-activity-redesign.html with the
// af3- prefix preserved for component scoping.
// =============================================================================

const ACTIVITY_FEED_STYLES = `
.af3-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0.75rem 0;
}
.af3-section-cap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0.15rem;
  margin-bottom: 4px;
}
.af3-section-label {
  font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 11px;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: var(--ink-muted, rgba(44, 22, 8, 0.62));
  font-weight: 500;
}
.af3-refresh-pill {
  font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 10px;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  color: var(--shell-ink, #2C1608);
  background: #FFFFFF;
  border: 1px solid var(--ink-faint, rgba(44, 22, 8, 0.20));
  border-radius: 999px;
  padding: 6px 14px;
  cursor: pointer;
  font-weight: 600;
}
.af3-refresh-pill:hover:not(:disabled) {
  background: var(--shell-bg, #F5F0E6);
}
.af3-refresh-pill:disabled {
  opacity: 0.5;
  cursor: wait;
}

.af3-error {
  font-size: 13px;
  color: #c52c2c;
  padding: 8px 12px;
  background: rgba(197, 44, 44, 0.08);
  border-radius: 6px;
}
.af3-empty {
  font-size: 13px;
  color: var(--ink-muted, rgba(44, 22, 8, 0.62));
  padding: 8px 4px;
}

/* Category card stack — bud tight (Day 54 chase #4 product call) */
.af3-cats {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.af3-cat {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: var(--shadow-raised, 0 1px 1px rgba(30,20,10,0.04), 0 2px 6px rgba(30,20,10,0.06));
  overflow: hidden;
  transition: box-shadow 200ms ease;
}
.af3-cat-header {
  display: grid;
  grid-template-columns: 6px 1fr auto;
  align-items: stretch;
  cursor: pointer;
  user-select: none;
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
  font-family: inherit;
  padding: 0;
  color: inherit;
}
.af3-cat-header:disabled { cursor: default; }
.af3-cat-stripe { background: var(--cat-accent, #999); }
.af3-cat-head-body {
  padding: 20px 0 20px 16px;
}
.af3-cat-name {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.4px;
  color: var(--shell-ink, #2C1608);
  line-height: 1;
}
.af3-cat-sub {
  font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 10px;
  letter-spacing: 1.4px;
  color: var(--ink-muted, rgba(44, 22, 8, 0.62));
  text-transform: uppercase;
  margin-top: 6px;
  font-weight: 500;
}
.af3-cat-right {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-right: 18px;
}
.af3-cat-count {
  min-width: 38px;
  height: 32px;
  border-radius: 999px;
  background: var(--cat-accent, #999);
  color: #FFFFFF;
  font-weight: 700;
  font-size: 14px;
  display: grid;
  place-items: center;
  padding: 0 12px;
  line-height: 1;
}
.af3-cat-chevron {
  color: var(--ink-faint, rgba(44, 22, 8, 0.20));
  font-size: 14px;
  transition: transform 200ms ease;
}
.af3-cat--expanded .af3-cat-chevron { transform: rotate(180deg); }
.af3-cat--empty .af3-cat-count {
  background: transparent;
  color: var(--ink-soft, rgba(44, 22, 8, 0.42));
  border: 1.5px solid var(--ink-faint, rgba(44, 22, 8, 0.20));
}
.af3-cat--empty .af3-cat-name {
  color: var(--ink-muted, rgba(44, 22, 8, 0.62));
}

/* Per-category accent injection */
.af3-cat[data-cat="management"]   { --cat-accent: #D9A87C; }
.af3-cat[data-cat="housekeeping"] { --cat-accent: #7FA3A8; }

/* Expanded body — employee blocks */
.af3-cat-body {
  display: block;
  border-top: 1px solid var(--hairline, rgba(44, 22, 8, 0.10));
}

.af3-emp { border-bottom: 1px solid var(--hairline, rgba(44, 22, 8, 0.10)); }
.af3-emp:last-child { border-bottom: none; }

.af3-emp-head {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 14px 18px 8px;
}
.af3-emp-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  background: var(--shell-bg, #F5F0E6);
  color: var(--shell-ink, #2C1608);
}
.af3-emp[data-staff="cm"] .af3-emp-avatar {
  background: linear-gradient(135deg, #F5D8B8, #D9A87C);
  color: #7A4A2E;
}
.af3-emp[data-staff="ll"] .af3-emp-avatar {
  background: linear-gradient(135deg, #CDE0E4, #7FA3A8);
  color: #2C4F54;
}
.af3-emp[data-staff="al"] .af3-emp-avatar {
  background: linear-gradient(135deg, #F5C8A8, #C68B64);
  color: #5C3320;
}
.af3-emp[data-staff="mp"] .af3-emp-avatar {
  background: linear-gradient(135deg, #DAE0C2, #9BA67C);
  color: #3C4728;
}

.af3-emp-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--shell-ink, #2C1608);
  line-height: 1.2;
}
.af3-emp-role {
  font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 9px;
  letter-spacing: 1.4px;
  color: var(--ink-muted, rgba(44, 22, 8, 0.62));
  text-transform: uppercase;
  margin-top: 3px;
  font-weight: 500;
}
.af3-emp-count {
  font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 10px;
  letter-spacing: 1.4px;
  color: var(--ink-muted, rgba(44, 22, 8, 0.62));
  text-transform: uppercase;
  font-weight: 600;
}
.af3-emp-items { padding: 0 0 10px; }

/* Activity item row */
.af3-item {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  align-items: start;
  gap: 12px;
  padding: 10px 18px 10px 14px;
}
.af3-item + .af3-item {
  border-top: 1px solid var(--hairline, rgba(44, 22, 8, 0.10));
}
.af3-item-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 7px;
  background: #2563EB;
}
.af3-item--critical .af3-item-dot { background: #EC4899; }
.af3-item--warn .af3-item-dot { background: #FFD000; }
.af3-item-body {
  min-width: 0;
  text-decoration: none;
  color: inherit;
  display: block;
}
.af3-item-body:hover .af3-item-msg {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
.af3-item-msg {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  color: var(--shell-ink, #2C1608);
}
.af3-item-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 10px;
  color: var(--ink-muted, rgba(44, 22, 8, 0.62));
  text-transform: uppercase;
  letter-spacing: 1.2px;
}
.af3-item-target { color: var(--shell-ink, #2C1608); font-weight: 600; }
.af3-item-time { color: var(--ink-soft, rgba(44, 22, 8, 0.42)); }
.af3-item-kind {
  font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
}
.af3-item-kind--event { background: rgba(37, 99, 235, 0.12); color: #0A1C5C; }
.af3-item-kind--note  { background: rgba(168, 85, 247, 0.14); color: #2E0B5C; }
.af3-item-kind--maint { background: rgba(255, 87, 34, 0.14); color: #3A1502; }
.af3-item-dismiss {
  background: transparent;
  border: none;
  color: var(--ink-faint, rgba(44, 22, 8, 0.20));
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  align-self: start;
  margin-top: 2px;
}
.af3-item-dismiss:hover { color: var(--ink-soft, rgba(44, 22, 8, 0.42)); }

.af3-item--empty { padding: 4px 18px 14px 32px; }
.af3-item--empty .af3-item-msg {
  color: var(--ink-soft, rgba(44, 22, 8, 0.42));
  font-style: italic;
  font-weight: 400;
  font-size: 12px;
}

.af3-restore {
  align-self: flex-start;
  background: transparent;
  border: 1px dashed var(--ink-faint, rgba(44, 22, 8, 0.20));
  border-radius: 6px;
  padding: 6px 12px;
  font-family: var(--mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 10px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: var(--ink-muted, rgba(44, 22, 8, 0.62));
  cursor: pointer;
  margin-top: 6px;
}
`;
