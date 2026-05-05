import { supabase } from "./supabase";

export const taskEventType = {
  cardOpened: "card_opened",
  cardPaused: "card_paused",
  cardResumed: "card_resumed",
  commentAdded: "comment_added",
  checklistChecked: "checklist_checked",
  checklistUnchecked: "checklist_unchecked",
  statusChanged: "status_changed",
  imageAttached: "image_attached",
  markedDone: "marked_done",
  reassigned: "reassigned",
  dueDateChanged: "due_date_changed",
  noteReportCreated: "note_report_created",
  needsHelp: "needs_help",
  // Day 29 III.D Phase 1 — structured audit events emitted by the
  // orchestrator. All three are task-scoped (per-task task_id) so they
  // surface in the activity feed under the relevant task + staff member.
  // See docs/TASK_EVENTS_CONTRACT.md for detail-key shapes.
  assignmentCrossHallOverride: "assignment_cross_hall_override",
  assignmentAboveStandardLoad: "assignment_above_standard_load",
  reshuffleTierChanged: "reshuffle_tier_changed",
} as const;

/** Required on all `task_events.detail` payloads (see docs/TASK_EVENTS_CONTRACT.md). */
export const TASK_EVENT_SCHEMA_VERSION = 1 as const;

export function withTaskEventSchema(
  detail: Record<string, unknown>,
): Record<string, unknown> {
  return { ...detail, schema_version: TASK_EVENT_SCHEMA_VERSION };
}

export async function logTaskEvent(
  taskId: string,
  eventType: string,
  detail: Record<string, unknown> = {},
  userId: string | null,
): Promise<void> {
  const { error } = await supabase.from("task_events").insert({
    task_id: taskId,
    user_id: userId,
    event_type: eventType,
    detail,
  });
  if (error) {
    console.warn("[task_events]", error.message);
  }
}

export async function uploadTaskFile(
  userId: string,
  file: File,
): Promise<{ path: string; publicUrl: string } | null> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("task-files").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    console.warn("[storage]", error.message);
    return null;
  }
  const { data } = supabase.storage.from("task-files").getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}
