// lib/activity-feed.ts
//
// Activity feed query helper (master plan III.D Phase 2). Reads from
// task_events + notes + maintenance_issues, joins display names from
// profiles, normalizes to a unified ActivityFeedItem shape, and returns
// reverse-chronological with severity boost (criticals top → warns → info,
// then by created_at desc).
//
// Sources (per master plan III.D):
// - task_events (existing per-task append-only sink — 16 event_types
//   including the 3 audit events added in Phase 1).
// - notes (Day 27 III.A — staff-authored notes with 11/5/5 taxonomies).
// - maintenance_issues (Day 39 III.B Phase 5 — staff-reported maintenance
//   with 21/11/10/3 taxonomies). High severity surfaces above Info entries
//   via the existing severity-boost ordering.
// - Future: audit_log (separate table — deferred).
//
// Severity is DERIVED in this module per docs/TASK_EVENTS_CONTRACT.md
// "Severity classification" block. Not stored on the row. Notes derive
// severity from note_status (Urgent → critical, Today → warn, else info).
// Maintenance issues derive from maintenance_issues.severity (High → warn
// matching Day 34's reassigned-as-warn precedent, else info).
//
// Query strategy: three parallel fetches via Promise.all, merge in TS, sort,
// slice. A server-side view UNIONing the sources (master plan VII.E) is the
// cleaner long-term shape; deferred to post-beta per the Day 28 handoff.
// Refactor here if profiling shows the merge is a hot spot.
//
// Imports outside lib/orchestration/ use plain extensionless paths.

import type { SupabaseClient } from "@supabase/supabase-js";
import { taskEventType } from "./task-events";

// =============================================================================
// Types
// =============================================================================

export type ActivityKind = "task_event" | "note" | "maintenance_issue";

export type ActivitySeverity = "critical" | "warn" | "info";

/**
 * Unified row shape for the activity feed. Every row — whether sourced from
 * task_events or notes — projects to this shape so the renderer can be
 * source-agnostic. The kind discriminator + event_type / note_type carry
 * source-specific detail when the renderer wants finer treatment.
 */
export type ActivityFeedItem = {
  /** Composite id: `${kind}:${row.id}` to guarantee uniqueness across sources. */
  id: string;
  kind: ActivityKind;
  severity: ActivitySeverity;

  /** task_events.event_type for kind="task_event"; null for notes. */
  event_type: string | null;
  /** notes.note_type for kind="note"; null for task_events. */
  note_type: string | null;
  /** notes.note_status for kind="note"; null for task_events. */
  note_status: string | null;

  /** Actor user UUID. May be null for service-role-emitted audit events. */
  actor_user_id: string | null;
  /** Display name for the actor; "System" for null actors, "Staff" as last-resort fallback. */
  actor_name: string;

  /** Task this row is attached to. Always populated — every source row has a task_id. */
  related_task_id: string;
  related_task_title: string | null;
  related_room: string | null;

  /** Human-readable summary line. Derived per kind + event_type / note_type. */
  message: string;
  /** Raw payload for drill-in / debug. */
  detail: Record<string, unknown> | null;
  created_at: string;
};

export type ActivityFeedOptions = {
  /** Hard cap on returned rows. Default 100. */
  limit?: number;
  /** Filter by severity. Empty/undefined = no filter. */
  severityFilter?: ActivitySeverity[];
  /** Filter by source kind. Empty/undefined = no filter. */
  kindFilter?: ActivityKind[];
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Load the property-wide activity feed. Reads task_events + notes +
 * maintenance_issues in parallel, normalizes, merges, sorts by severity-
 * boosted reverse-chron, applies filters, slices to limit. Default limit 100.
 *
 * Errors from any source log a warning and that source contributes zero
 * rows — the feed degrades gracefully rather than failing entirely.
 */
export async function getActivityFeed(
  client: SupabaseClient,
  options: ActivityFeedOptions = {},
): Promise<ActivityFeedItem[]> {
  const limit = options.limit ?? 100;
  // Fetch double the limit per source so the post-merge slice has room to
  // honor severity boost without truncating the wrong source.
  const perSourceLimit = Math.min(limit * 2, 200);

  const [taskEventItems, noteItems, maintenanceItems] = await Promise.all([
    fetchTaskEventItems(client, { limit: perSourceLimit }),
    fetchNoteItems(client, { limit: perSourceLimit }),
    fetchMaintenanceIssueItems(client, { limit: perSourceLimit }),
  ]);

  return mergeAndRank(
    [...taskEventItems, ...noteItems, ...maintenanceItems],
    options,
    limit,
  );
}

/**
 * Per-staff variant for II.E Admin Staff Profile (Phase 4 helper). Filters
 * task_events to user_id = userId, notes to author_user_id = userId, and
 * maintenance_issues to author_user_id = userId. Same merge / sort / limit
 * semantics as getActivityFeed.
 *
 * Note: task_events with user_id=null (service-role audit events) are
 * intentionally excluded from per-user feed — they belong to the property
 * stream, not any single user.
 */
export async function getActivityForUser(
  client: SupabaseClient,
  userId: string,
  options: ActivityFeedOptions = {},
): Promise<ActivityFeedItem[]> {
  const limit = options.limit ?? 100;
  const perSourceLimit = Math.min(limit * 2, 200);

  const [taskEventItems, noteItems, maintenanceItems] = await Promise.all([
    fetchTaskEventItems(client, { limit: perSourceLimit, userId }),
    fetchNoteItems(client, { limit: perSourceLimit, authorUserId: userId }),
    fetchMaintenanceIssueItems(client, {
      limit: perSourceLimit,
      authorUserId: userId,
    }),
  ]);

  return mergeAndRank(
    [...taskEventItems, ...noteItems, ...maintenanceItems],
    options,
    limit,
  );
}

// =============================================================================
// Source fetchers
// =============================================================================

type TaskEventFetchOptions = {
  limit: number;
  userId?: string;
};

async function fetchTaskEventItems(
  client: SupabaseClient,
  options: TaskEventFetchOptions,
): Promise<ActivityFeedItem[]> {
  let query = client
    .from("task_events")
    .select(
      "id, task_id, user_id, event_type, detail, created_at, tasks(id, title, room_number)",
    )
    .order("created_at", { ascending: false })
    .limit(options.limit);

  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("[activity-feed] task_events fetch failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) return [];

  // Resolve actor names via a single profiles lookup. Some rows (service-
  // role audit events) have user_id=null — those skip the lookup and
  // render as "System."
  const userIds = Array.from(
    new Set(
      rows
        .map((r) => r.user_id)
        .filter((u): u is string => typeof u === "string" && u.length > 0),
    ),
  );
  const nameMap = await fetchProfileNames(client, userIds);

  return rows.map((r) => normalizeTaskEventRow(r, nameMap));
}

type NoteFetchOptions = {
  limit: number;
  authorUserId?: string;
};

async function fetchNoteItems(
  client: SupabaseClient,
  options: NoteFetchOptions,
): Promise<ActivityFeedItem[]> {
  let query = client
    .from("notes")
    .select(
      "id, task_id, author_user_id, author_display_name, body, note_type, " +
        "note_status, note_assigned_to, room_number, card_type, created_at, " +
        "tasks(id, title)",
    )
    .order("created_at", { ascending: false })
    .limit(options.limit);

  if (options.authorUserId) {
    query = query.eq("author_user_id", options.authorUserId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("[activity-feed] notes fetch failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  return rows.map(normalizeNoteRow);
}

type MaintenanceIssueFetchOptions = {
  limit: number;
  authorUserId?: string;
};

async function fetchMaintenanceIssueItems(
  client: SupabaseClient,
  options: MaintenanceIssueFetchOptions,
): Promise<ActivityFeedItem[]> {
  let query = client
    .from("maintenance_issues")
    .select(
      "id, task_id, author_user_id, author_display_name, body, " +
        "location, item, type, severity, room_number, card_type, " +
        "created_at, tasks(id, title, room_number)",
    )
    .order("created_at", { ascending: false })
    .limit(options.limit);

  if (options.authorUserId) {
    query = query.eq("author_user_id", options.authorUserId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn(
      "[activity-feed] maintenance_issues fetch failed:",
      error.message,
    );
    return [];
  }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  return rows.map(normalizeMaintenanceIssueRow);
}

async function fetchProfileNames(
  client: SupabaseClient,
  userIds: string[],
): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { data, error } = await client
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);
  if (error) {
    console.warn("[activity-feed] profile name lookup failed:", error.message);
    return {};
  }
  const map: Record<string, string> = {};
  for (const p of (data ?? []) as Array<{ id: string; display_name: string | null }>) {
    if (p.display_name) map[p.id] = p.display_name;
  }
  return map;
}

// =============================================================================
// Normalization
// =============================================================================

function normalizeTaskEventRow(
  raw: Record<string, unknown>,
  nameMap: Record<string, string>,
): ActivityFeedItem {
  const eventType = String(raw.event_type ?? "");
  const userId =
    raw.user_id === null || raw.user_id === undefined
      ? null
      : String(raw.user_id);
  const actorName = userId
    ? (nameMap[userId] ?? "Staff")
    : "System";

  const taskInfo = readTaskJoin(raw.tasks);
  const detail =
    raw.detail && typeof raw.detail === "object" && !Array.isArray(raw.detail)
      ? (raw.detail as Record<string, unknown>)
      : null;

  return {
    id: `task_event:${String(raw.id)}`,
    kind: "task_event",
    severity: classifyTaskEventSeverity(eventType, detail),
    event_type: eventType,
    note_type: null,
    note_status: null,
    actor_user_id: userId,
    actor_name: actorName,
    related_task_id: String(raw.task_id),
    related_task_title: taskInfo.title,
    related_room: taskInfo.roomNumber,
    message: composeTaskEventMessage(actorName, eventType, taskInfo.title, detail),
    detail,
    created_at: String(raw.created_at ?? ""),
  };
}

function normalizeNoteRow(raw: Record<string, unknown>): ActivityFeedItem {
  const taskInfo = readTaskJoin(raw.tasks);
  const noteStatus = String(raw.note_status ?? "");
  const noteType = String(raw.note_type ?? "");
  const actorName = String(raw.author_display_name ?? "Staff");
  const body = String(raw.body ?? "");

  return {
    id: `note:${String(raw.id)}`,
    kind: "note",
    severity: classifyNoteSeverity(noteStatus),
    event_type: null,
    note_type: noteType || null,
    note_status: noteStatus || null,
    actor_user_id:
      raw.author_user_id === null || raw.author_user_id === undefined
        ? null
        : String(raw.author_user_id),
    actor_name: actorName,
    related_task_id: String(raw.task_id),
    related_task_title: taskInfo.title,
    related_room:
      (raw.room_number as string | null) ?? taskInfo.roomNumber ?? null,
    message: composeNoteMessage(actorName, noteType, body),
    detail: { body, note_type: noteType, note_status: noteStatus, note_assigned_to: raw.note_assigned_to ?? null },
    created_at: String(raw.created_at ?? ""),
  };
}

function normalizeMaintenanceIssueRow(
  raw: Record<string, unknown>,
): ActivityFeedItem {
  const taskInfo = readTaskJoin(raw.tasks);
  const location = String(raw.location ?? "");
  const item = String(raw.item ?? "");
  const type = String(raw.type ?? "");
  const severity = String(raw.severity ?? "");
  const actorName = String(raw.author_display_name ?? "Staff");
  const body = (raw.body as string | null) ?? null;

  return {
    id: `maintenance_issue:${String(raw.id)}`,
    kind: "maintenance_issue",
    severity: classifyMaintenanceIssueSeverity(severity),
    event_type: null,
    note_type: null,
    note_status: null,
    actor_user_id:
      raw.author_user_id === null || raw.author_user_id === undefined
        ? null
        : String(raw.author_user_id),
    actor_name: actorName,
    related_task_id: String(raw.task_id),
    related_task_title: taskInfo.title,
    related_room:
      (raw.room_number as string | null) ?? taskInfo.roomNumber ?? null,
    message: composeMaintenanceIssueMessage(
      actorName,
      location,
      item,
      type,
      body,
    ),
    detail: { location, item, type, severity, body },
    created_at: String(raw.created_at ?? ""),
  };
}

function readTaskJoin(
  raw: unknown,
): { id: string | null; title: string | null; roomNumber: string | null } {
  let t: Record<string, unknown> | null = null;
  if (Array.isArray(raw) && raw[0]) {
    t = raw[0] as Record<string, unknown>;
  } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    t = raw as Record<string, unknown>;
  }
  if (!t) return { id: null, title: null, roomNumber: null };
  return {
    id: t.id ? String(t.id) : null,
    title: t.title ? String(t.title) : null,
    roomNumber:
      t.room_number === null || t.room_number === undefined
        ? null
        : String(t.room_number),
  };
}

// =============================================================================
// Severity classification
// =============================================================================

const WARN_TASK_EVENT_TYPES: ReadonlySet<string> = new Set([
  taskEventType.assignmentCrossHallOverride,
  taskEventType.assignmentAboveStandardLoad,
  // Day 34 III.H — admin reassignment is a significant action; surface
  // alongside cross-hall override / above-standard-load on the activity feed.
  taskEventType.reassigned,
]);

function classifyTaskEventSeverity(
  eventType: string,
  detail: Record<string, unknown> | null,
): ActivitySeverity {
  if (eventType === taskEventType.needsHelp) return "critical";
  if (WARN_TASK_EVENT_TYPES.has(eventType)) return "warn";
  // status_changed → blocked is the only status change we elevate to warn.
  if (eventType === taskEventType.statusChanged && detail) {
    if (detail.to === "blocked") return "warn";
  }
  return "info";
}

function classifyNoteSeverity(noteStatus: string): ActivitySeverity {
  if (noteStatus === "Urgent") return "critical";
  if (noteStatus === "Today") return "warn";
  return "info";
}

function classifyMaintenanceIssueSeverity(
  severity: string,
): ActivitySeverity {
  // High → warn, mirroring Day 34's reassigned-as-warn precedent. Bumping
  // Normal to warn would dominate the feed since most issues land Normal.
  // Low + Normal both fall through to info.
  if (severity === "High") return "warn";
  return "info";
}

// =============================================================================
// Message composition
// =============================================================================

const TASK_EVENT_VERB: Record<string, string> = {
  [taskEventType.cardOpened]: "opened the card",
  [taskEventType.cardPaused]: "paused the card",
  [taskEventType.cardResumed]: "resumed the card",
  [taskEventType.commentAdded]: "added a note",
  [taskEventType.checklistChecked]: "checked an item",
  [taskEventType.checklistUnchecked]: "unchecked an item",
  [taskEventType.statusChanged]: "changed status",
  [taskEventType.imageAttached]: "attached a photo",
  [taskEventType.markedDone]: "marked done",
  [taskEventType.reassigned]: "reassigned",
  [taskEventType.dueDateChanged]: "changed due date",
  [taskEventType.noteReportCreated]: "filed a report",
  [taskEventType.needsHelp]: "asked for help",
  [taskEventType.assignmentCrossHallOverride]: "got cross-hall override",
  [taskEventType.assignmentAboveStandardLoad]: "is above standard load",
  [taskEventType.reshuffleTierChanged]: "tier changed",
};

function composeTaskEventMessage(
  actorName: string,
  eventType: string,
  taskTitle: string | null,
  detail: Record<string, unknown> | null,
): string {
  const verb = TASK_EVENT_VERB[eventType] ?? eventType;
  const titleSuffix = taskTitle ? ` — ${taskTitle}` : "";

  // Status-changed: enrich verb with from→to when available.
  if (eventType === taskEventType.statusChanged && detail) {
    const from = detail.from ? String(detail.from) : null;
    const to = detail.to ? String(detail.to) : null;
    if (from && to) {
      return `${actorName} status: ${from} → ${to}${titleSuffix}`;
    }
  }

  // Reshuffle tier change: include from→to tier numbers.
  if (eventType === taskEventType.reshuffleTierChanged && detail) {
    const from = detail.from_tier;
    const to = detail.to_tier;
    return `Reshuffle: tier ${from ?? "—"} → ${to ?? "—"}${titleSuffix}`;
  }

  // Above-standard load: include load type + count.
  if (eventType === taskEventType.assignmentAboveStandardLoad && detail) {
    const loadKey = detail.load_key ? String(detail.load_key) : "load";
    const count = detail.count;
    const threshold = detail.threshold;
    return `${actorName} ${count} ${loadKey} (standard ${threshold})${titleSuffix}`;
  }

  // Cross-hall override: include from-hall → to-hall.
  if (eventType === taskEventType.assignmentCrossHallOverride && detail) {
    const fromHall = detail.from_hall ? String(detail.from_hall) : "—";
    const toHall = detail.to_hall ? String(detail.to_hall) : "—";
    return `${actorName} cross-hall: ${fromHall} → ${toHall}${titleSuffix}`;
  }

  // Reassignment: include from → to staff names. Falls back to "Unassigned"
  // when either side is null (newly assigned or unassigned).
  if (eventType === taskEventType.reassigned && detail) {
    const fromName = detail.from_staff_name
      ? String(detail.from_staff_name)
      : "Unassigned";
    const toName = detail.to_staff_name
      ? String(detail.to_staff_name)
      : "Unassigned";
    return `${actorName} reassigned: ${fromName} → ${toName}${titleSuffix}`;
  }

  return `${actorName} ${verb}${titleSuffix}`;
}

function composeNoteMessage(
  actorName: string,
  noteType: string,
  body: string,
): string {
  const excerpt = body.length > 120 ? `${body.slice(0, 117)}…` : body;
  const typePrefix = noteType ? `[${noteType}] ` : "";
  return `${actorName} noted: ${typePrefix}${excerpt}`;
}

function composeMaintenanceIssueMessage(
  actorName: string,
  location: string,
  item: string,
  type: string,
  body: string | null,
): string {
  // "Lizzie reported: Broken Plumbing in Rooms" or with body suffix:
  // "Lizzie reported: Broken Plumbing in Rooms — water under the sink"
  const tag = `${type} ${item} in ${location}`.trim();
  const trimmedBody = body?.trim() ?? "";
  if (trimmedBody.length === 0) {
    return `${actorName} reported: ${tag}`;
  }
  const excerpt =
    trimmedBody.length > 100 ? `${trimmedBody.slice(0, 97)}…` : trimmedBody;
  return `${actorName} reported: ${tag} — ${excerpt}`;
}

// =============================================================================
// Merge + rank + filter + slice
// =============================================================================

const SEVERITY_RANK: Record<ActivitySeverity, number> = {
  critical: 0,
  warn: 1,
  info: 2,
};

function mergeAndRank(
  items: ActivityFeedItem[],
  options: ActivityFeedOptions,
  limit: number,
): ActivityFeedItem[] {
  const severitySet =
    options.severityFilter && options.severityFilter.length > 0
      ? new Set(options.severityFilter)
      : null;
  const kindSet =
    options.kindFilter && options.kindFilter.length > 0
      ? new Set(options.kindFilter)
      : null;

  const filtered = items.filter((item) => {
    if (severitySet && !severitySet.has(item.severity)) return false;
    if (kindSet && !kindSet.has(item.kind)) return false;
    return true;
  });

  // Severity boost ordering: criticals first, then warns, then info.
  // Within each severity bucket, reverse-chronological by created_at.
  filtered.sort((a, b) => {
    const sevDelta = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sevDelta !== 0) return sevDelta;
    // created_at is ISO-8601 — string comparison sorts lexicographically
    // descending → reverse-chronological. Newer first.
    if (a.created_at > b.created_at) return -1;
    if (a.created_at < b.created_at) return 1;
    return 0;
  });

  return filtered.slice(0, limit);
}
