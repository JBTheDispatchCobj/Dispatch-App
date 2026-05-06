// lib/maintenance.ts
//
// Maintenance issues data-access helpers (master plan III.B + Global Rules
// R12-R17). Wraps the public.maintenance_issues table that landed Day 33
// (Phase 1). Mirrors lib/notes.ts API shape exactly — addMaintenanceIssue
// + listMaintenanceIssuesForTask + static taxonomy exports.
//
// 3-sink rule (master plan III.B): every issue surfaces as
//   1. admin table by location  (query: where location = X)
//   2. admin table by type      (query: where type = X)
//   3. admin task card view     (query: where id = X — the per-issue card)
// All three views are query-side over the same row, no fan-out write.
// That's why this module's API is just add + list.
//
// What's NOT here:
// - Cascading dropdown filter logic (Location → Item → Type). The Day 24
//   taxonomy seed isn't hierarchical — locations and items are independent
//   flat lists per taxonomy_tables.sql ("sub-location split deferred to
//   post-beta"). Phase 3 ships flat dropdowns; cascade filter is post-beta
//   when Jennifer authors the tree. [ASK JENNIFER] flag.
// - Image upload pipeline (master plan III.E + V.G — Storage policies still
//   being finalized; pass image_url=null pre-pipeline, same as notes).
// - High-severity live notification (master plan III.B last clause). Beta
//   surfaces High via the existing admin activity feed (lib/activity-feed.ts)
//   with a severity sort boost — wired in Phase 5. True live push is post-beta.
// - Resolution / reassignment flows (the resolved_at + resolved_by_user_id
//   columns are admin-side; admin-resolve UI is Item B / II.H follow-up).

import type { SupabaseClient } from "@supabase/supabase-js";

// =============================================================================
// Types
// =============================================================================

/**
 * Read shape for public.maintenance_issues rows. Matches the columns
 * selected in listMaintenanceIssuesForTask. Mirrors NoteRow shape where it
 * overlaps so the existing Notes thread render code can be parroted with
 * minimal changes when we wire the per-card display.
 */
export type MaintenanceIssueRow = {
  id: string;
  task_id: string;
  user_id: string; // alias of author_user_id, kept for thread renderer compat
  author_display_name: string;
  body: string | null;
  image_url: string | null;
  location: string;
  item: string;
  type: string;
  severity: string;
  room_number: string | null;
  card_type: string | null;
  created_at: string;
  resolved_at: string | null;
};

/** Insert payload for addMaintenanceIssue. Required fields match the NOT NULL columns. */
export type MaintenanceIssueInsert = {
  taskId: string;
  authorUserId: string;
  authorDisplayName: string;
  location: string;
  item: string;
  type: string;
  body?: string | null;
  severity?: string;       // default 'Normal' applied in insert
  imageUrl?: string | null;
};

export type MaintenanceResult =
  | { ok: true }
  | { ok: false; message: string };

// =============================================================================
// Public API
// =============================================================================

/**
 * Insert a new row into public.maintenance_issues. RLS requires the caller's
 * auth.uid() to match author_user_id, so authorUserId must be the live
 * session user (not a forged value). The denormalize trigger fills
 * room_number + card_type from the parent task at insert time.
 *
 * Body is optional (an issue can be photo-only or taxonomy-only — the three
 * required taxonomy fields carry the structured payload). Severity defaults
 * to 'Normal' both in the table and here.
 */
export async function addMaintenanceIssue(
  client: SupabaseClient,
  input: MaintenanceIssueInsert,
): Promise<MaintenanceResult> {
  // Body trim is defensive — empty body is allowed at the schema level
  // (column is nullable). Normalize "" to null so admin queries can rely on
  // body IS NULL meaning "no description provided."
  const trimmedBody = input.body?.trim() ?? "";
  const bodyForInsert = trimmedBody.length > 0 ? trimmedBody : null;

  const { error } = await client.from("maintenance_issues").insert({
    task_id: input.taskId,
    author_user_id: input.authorUserId,
    author_display_name: input.authorDisplayName,
    body: bodyForInsert,
    image_url: input.imageUrl ?? null,
    location: input.location,
    item: input.item,
    type: input.type,
    severity: input.severity ?? "Normal",
    // room_number + card_type omitted — denormalize trigger fills from
    // the parent task. Passing them explicitly is allowed but
    // double-bookkeeping with no upside (same trade-off as notes).
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/**
 * Load all maintenance issues attached to a task, oldest first. Mirrors
 * listNotesForTask so the per-card render code can stay near-identical.
 *
 * The select projects author_user_id as user_id so consumers can drop in
 * MaintenanceIssueRow as a CommentRow / NoteRow replacement without
 * touching the thread render code.
 *
 * The `as unknown as` cast is the supabase-js GenericStringError workaround
 * — same pattern used in lib/notes.ts:138 and the Day 32 Phase 4d cast fix
 * on /admin/staff/[id]/page.tsx.
 */
export async function listMaintenanceIssuesForTask(
  client: SupabaseClient,
  taskId: string,
): Promise<MaintenanceIssueRow[]> {
  const { data, error } = await client
    .from("maintenance_issues")
    .select(
      "id, task_id, author_user_id, author_display_name, body, image_url, " +
        "location, item, type, severity, room_number, card_type, " +
        "created_at, resolved_at",
    )
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn(
      "[maintenance] listMaintenanceIssuesForTask failed:",
      error.message,
    );
    return [];
  }

  // Project author_user_id → user_id so the thread render code can stay
  // unchanged (it expects that field name from the legacy CommentRow shape).
  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    task_id: String(r.task_id),
    user_id: String(r.author_user_id),
    author_display_name: String(r.author_display_name ?? ""),
    body: (r.body as string | null) ?? null,
    image_url: (r.image_url as string | null) ?? null,
    location: String(r.location ?? ""),
    item: String(r.item ?? ""),
    type: String(r.type ?? ""),
    severity: String(r.severity ?? ""),
    room_number: (r.room_number as string | null) ?? null,
    card_type: (r.card_type as string | null) ?? null,
    created_at: String(r.created_at),
    resolved_at: (r.resolved_at as string | null) ?? null,
  }));
}

// =============================================================================
// Static taxonomy values
//
// These mirror the seed inserts in docs/supabase/taxonomy_tables.sql in
// display_order — the dropdown rendering order matches what admin sees on
// the read side. Used to populate the compose form's dropdowns without a
// runtime fetch — beta-only convenience. When admin gains the ability to
// extend taxonomies post-beta (master plan II.J), swap these for live
// fetches against the maintenance_locations / maintenance_items /
// maintenance_types / maintenance_severities tables.
// =============================================================================

export const MAINTENANCE_LOCATIONS: readonly string[] = [
  "Rooms",
  "Lobby",
  "Supply Room",
  "Laundry Room",
  "Breakfast Room",
  "Hallway - 20s",
  "Hallway - 30s",
  "Hallway - 40s",
  "Hallway - Laundry",
  "Hallway - Breakfast",
  "Front Office",
  "Public Restroom",
  "Outside - Front",
  "Outside - East",
  "Outside - West",
  "Outside - Back",
  "Outside - Garage",
  "Entry",
  "Breakfast Area",
  "Apartment",
  "Back Office",
] as const;

export const MAINTENANCE_ITEMS: readonly string[] = [
  "Furniture",
  "Appliances",
  "Plumbing",
  "Walls",
  "Electrical",
  "Decor",
  "Linens",
  "Tools",
  "Floors",
  "Built-In",
  "Small Items",
] as const;

export const MAINTENANCE_TYPES: readonly string[] = [
  "Broken",
  "Chipped",
  "Missing",
  "Hole",
  "Loose",
  "Faded",
  "Scratched",
  "Cut",
  "Stained",
  "Other",
] as const;

export const MAINTENANCE_SEVERITIES: readonly string[] = [
  "Low",
  "Normal",
  "High",
] as const;

/** Default values the compose form starts with. */
export const MAINTENANCE_DEFAULTS = {
  severity: "Normal",
} as const;
