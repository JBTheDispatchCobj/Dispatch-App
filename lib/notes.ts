// lib/notes.ts
//
// Notes data-access helpers (master plan III.A). Wraps the public.notes
// table that landed Day 24. Mirrors the existing task_comments access
// pattern in lib/orchestration/index.ts addTaskComment, but writes to the
// new schema with the four taxonomy FKs (note_type, note_status,
// note_assigned_to, plus optional assigned_user_id).
//
// Dual-sink rule (Global Rules R25): every note hits both an individual
// log under the relevant staff member on /admin/staff/[id] AND a category
// card grouped by Note Type. Both views are query-side over the same row,
// no fan-out write — that's why this module's API is just add + list.
//
// What's NOT here:
// - @mention autocomplete (post-beta per Open Assumption).
// - Image upload pipeline (master plan III.E + V.G — Storage policies still
//   being finalized; pass image_url=null pre-pipeline).
// - Reassignment / resolution flows (the assigned_user_id field is set on
//   insert when applicable; admin-side resolve flow is post-beta).

import type { SupabaseClient } from "@supabase/supabase-js";

// =============================================================================
// Types
// =============================================================================

/**
 * Read shape for public.notes rows. Matches the columns selected in
 * listNotesForTask. Mirrors the legacy CommentRow shape where it overlaps,
 * so the existing thread renderer (page.tsx) continues to work without
 * reshaping. Adds the four taxonomy fields.
 */
export type NoteRow = {
  id: string;
  task_id: string;
  user_id: string; // alias of author_user_id, kept for thread renderer compat
  author_display_name: string;
  body: string;
  image_url: string | null;
  note_type: string;
  note_status: string;
  note_assigned_to: string;
  assigned_user_id: string | null;
  room_number: string | null;
  card_type: string | null;
  created_at: string;
};

/** Insert payload for addNote. Required fields match the NOT NULL columns. */
export type NoteInsert = {
  taskId: string;
  authorUserId: string;
  authorDisplayName: string;
  body: string;
  noteType: string;
  noteStatus?: string;       // default 'Just Noting' applied in insert
  noteAssignedTo: string;
  assignedUserId?: string | null;
  imageUrl?: string | null;
};

export type NotesResult =
  | { ok: true }
  | { ok: false; message: string };

// =============================================================================
// Public API
// =============================================================================

/**
 * Insert a new row into public.notes. RLS requires the caller's auth.uid()
 * to match author_user_id, so authorUserId must be the live session user
 * (not a forged value). The denormalize trigger fills room_number +
 * card_type from the parent task at insert time.
 *
 * Note type / assigned-to are required by the table; status defaults to
 * 'Just Noting' both in the table and here.
 */
export async function addNote(
  client: SupabaseClient,
  input: NoteInsert,
): Promise<NotesResult> {
  const trimmedBody = input.body.trim();
  if (!trimmedBody) {
    return { ok: false, message: "Note body cannot be empty." };
  }

  const { error } = await client.from("notes").insert({
    task_id: input.taskId,
    author_user_id: input.authorUserId,
    author_display_name: input.authorDisplayName,
    body: trimmedBody,
    image_url: input.imageUrl ?? null,
    note_type: input.noteType,
    note_status: input.noteStatus ?? "Just Noting",
    note_assigned_to: input.noteAssignedTo,
    assigned_user_id: input.assignedUserId ?? null,
    // room_number + card_type omitted — denormalize trigger fills from
    // the parent task. Passing them explicitly is allowed but
    // double-bookkeeping with no upside.
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/**
 * Load all notes attached to a task, oldest first. Mirrors the legacy
 * task_comments fetch in app/staff/task/[id]/page.tsx so the thread
 * renderer there continues to work.
 *
 * The select projects user_id as an alias of author_user_id so consumers
 * can drop in NoteRow as a CommentRow replacement without touching the
 * thread render code.
 */
export async function listNotesForTask(
  client: SupabaseClient,
  taskId: string,
): Promise<NoteRow[]> {
  const { data, error } = await client
    .from("notes")
    .select(
      "id, task_id, author_user_id, author_display_name, body, image_url, " +
        "note_type, note_status, note_assigned_to, assigned_user_id, " +
        "room_number, card_type, created_at",
    )
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[notes] listNotesForTask failed:", error.message);
    return [];
  }

  // Project author_user_id → user_id so the thread render code can stay
  // unchanged (it expected that field name from the legacy CommentRow shape).
  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    task_id: String(r.task_id),
    user_id: String(r.author_user_id),
    author_display_name: String(r.author_display_name ?? ""),
    body: String(r.body ?? ""),
    image_url: (r.image_url as string | null) ?? null,
    note_type: String(r.note_type ?? ""),
    note_status: String(r.note_status ?? ""),
    note_assigned_to: String(r.note_assigned_to ?? ""),
    assigned_user_id: (r.assigned_user_id as string | null) ?? null,
    room_number: (r.room_number as string | null) ?? null,
    card_type: (r.card_type as string | null) ?? null,
    created_at: String(r.created_at),
  }));
}

// =============================================================================
// Static taxonomy values
//
// These mirror the seed inserts in docs/supabase/taxonomy_tables.sql. Used
// to populate the compose form's dropdowns without a runtime fetch — beta-
// only convenience. When admin gains the ability to extend taxonomies
// post-beta (master plan II.J), swap these for live fetches against the
// note_types / note_statuses / note_assigned_to tables.
// =============================================================================

export const NOTE_TYPES: readonly string[] = [
  "Maintenance",
  "Guest Needs",
  "Guest Profile",
  "Guest Damage",
  "Guest Update",
  "Supply",
  "Admin",
  "Team",
  "Change/Update",
  "Employee",
  "Needed",
] as const;

export const NOTE_STATUSES: readonly string[] = [
  "Urgent",
  "Today",
  "This week",
  "Upcoming",
  "Just Noting",
] as const;

export const NOTE_ASSIGNED_TO: readonly string[] = [
  "Employee",
  "Guest",
  "Desk",
  "Admin",
  "Room",
] as const;

/** Default values the compose form starts with. */
export const NOTE_DEFAULTS = {
  status: "Just Noting",
  assignedTo: "Employee",
} as const;
