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
  // Day 43 IV.H — Wed-occupancy Deep Clean trigger. Service-role audit
  // emitted post-insert when the orchestrator auto-elevates a
  // housekeeping_turn draft from Standard to Deep on a Wednesday. See
  // docs/TASK_EVENTS_CONTRACT.md for detail-key shapes; constants live
  // at lib/dispatch-config.ts Section 12 (DEEP_CLEAN_AUTO_TRIGGER).
  deepCleanTriggered: "deep_clean_triggered",
  // Day 46 — admin override of context.stayover_status from
  // /tasks/[id] via <StayoverStatusPanel/>. Master plan I.G prerequisite
  // for sub-items 2/3 (status-driven auto-complete + Sheet Change
  // skip semantics). Day 52 chase #2 reversed the Day 21 staff lock;
  // staff-set toggles now emit stayoverStatusChanged. Admin pre-set
  // events stay as stayoverStatusOverridden for the source distinction.
  // Per rules table line 88: staff-tracked percentages key off staff
  // selections only — admin pre-selections do NOT count. Future
  // percentages tracking filters by event_type to honor that contract.
  // detail keys per docs/TASK_EVENTS_CONTRACT.md.
  stayoverStatusOverridden: "stayover_status_overridden",
  // Day 52 chase #2 — staff-side toggle on S-430 status pills
  // restored after Day-21 lock reversal (Jennifer Q18 + rules table
  // line 88). Pills are now <button>s; this event fires from the
  // onToggleStayoverStatus handler in StayoversCard.tsx. Staff selections
  // are post-facto records of "what happened in the room" (DND signal
  // observed, Guest OK confirmed, etc.) and key the percentages tracking
  // surface that's still post-beta.
  stayoverStatusChanged: "stayover_status_changed",
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
