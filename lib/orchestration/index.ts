/**
 * Orchestration boundary (Milestone 1): all mutating staff execution flows
 * for cards/tasks. UI should call these instead of scattering Supabase writes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { coerceBoolean } from "@/lib/coerce-boolean";
import {
  logTaskEvent,
  taskEventType,
  withTaskEventSchema,
} from "@/lib/task-events";

export type OrchestrationResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; message: string };

type TaskStatusRow = {
  id: string;
  status: string;
  started_at: string | null;
  require_checklist_complete: boolean;
};

export async function openCard(
  client: SupabaseClient,
  input: { taskId: string; userId: string },
): Promise<OrchestrationResult> {
  const { taskId, userId } = input;
  const { data: row, error: fetchErr } = await client
    .from("tasks")
    .select("id, status, started_at")
    .eq("id", taskId)
    .maybeSingle();
  if (fetchErr) return { ok: false, message: fetchErr.message };
  if (!row) return { ok: false, message: "Task not found." };

  const status = String(row.status ?? "open");
  await logTaskEvent(
    taskId,
    taskEventType.cardOpened,
    withTaskEventSchema({
      status_at_open: status,
      ...(status === "done" ? { terminal: true } : {}),
    }),
    userId,
  );

  if (status === "done") {
    return { ok: true };
  }

  if (status === "open") {
    const startedAt =
      row.started_at ??
      new Date().toISOString();
    const { error: upErr } = await client
      .from("tasks")
      .update({
        status: "in_progress",
        started_at: startedAt,
      })
      .eq("id", taskId);
    if (upErr) return { ok: false, message: upErr.message };
    await logTaskEvent(
      taskId,
      taskEventType.statusChanged,
      withTaskEventSchema({ from: "open", to: "in_progress", reason: "card_opened" }),
      userId,
    );
  }

  return { ok: true };
}

export async function pauseCard(
  client: SupabaseClient,
  input: { taskId: string; userId: string },
): Promise<OrchestrationResult> {
  const { taskId, userId } = input;
  const { data: row, error: fetchErr } = await client
    .from("tasks")
    .select("id, status")
    .eq("id", taskId)
    .maybeSingle();
  if (fetchErr) return { ok: false, message: fetchErr.message };
  if (!row) return { ok: false, message: "Task not found." };
  if (row.status !== "in_progress") {
    return { ok: false, message: "Only in-progress tasks can be paused." };
  }
  const now = new Date().toISOString();
  const { error: upErr } = await client
    .from("tasks")
    .update({ status: "paused", paused_at: now })
    .eq("id", taskId);
  if (upErr) return { ok: false, message: upErr.message };
  await logTaskEvent(
    taskId,
    taskEventType.cardPaused,
    withTaskEventSchema({}),
    userId,
  );
  await logTaskEvent(
    taskId,
    taskEventType.statusChanged,
    withTaskEventSchema({ from: "in_progress", to: "paused", reason: "user_pause" }),
    userId,
  );
  return { ok: true };
}

export async function resumeCard(
  client: SupabaseClient,
  input: { taskId: string; userId: string },
): Promise<OrchestrationResult> {
  const { taskId, userId } = input;
  const { data: row, error: fetchErr } = await client
    .from("tasks")
    .select("id, status")
    .eq("id", taskId)
    .maybeSingle();
  if (fetchErr) return { ok: false, message: fetchErr.message };
  if (!row) return { ok: false, message: "Task not found." };
  if (row.status !== "paused") {
    return { ok: false, message: "Only paused tasks can be resumed." };
  }
  const { error: upErr } = await client
    .from("tasks")
    .update({ status: "in_progress", paused_at: null })
    .eq("id", taskId);
  if (upErr) return { ok: false, message: upErr.message };
  await logTaskEvent(
    taskId,
    taskEventType.cardResumed,
    withTaskEventSchema({}),
    userId,
  );
  await logTaskEvent(
    taskId,
    taskEventType.statusChanged,
    withTaskEventSchema({ from: "paused", to: "in_progress", reason: "user_resume" }),
    userId,
  );
  return { ok: true };
}

export async function requestHelp(
  client: SupabaseClient,
  input: {
    taskId: string;
    userId: string;
    authorDisplayName: string;
  },
): Promise<OrchestrationResult> {
  const { taskId, userId, authorDisplayName } = input;
  const note = await addTaskComment(client, {
    taskId,
    userId,
    authorDisplayName,
    body: "Needs help",
    imageUrl: null,
    checklistItemId: null,
  });
  if (!note.ok) return note;

  const { data: row, error: fetchErr } = await client
    .from("tasks")
    .select("id, status")
    .eq("id", taskId)
    .maybeSingle();
  if (fetchErr) return { ok: false, message: fetchErr.message };
  if (!row) return { ok: false, message: "Task not found." };
  const prev = String(row.status);
  if (prev === "done") {
    return { ok: true };
  }
  if (prev !== "blocked") {
    const { error: upErr } = await client
      .from("tasks")
      .update({ status: "blocked", paused_at: null })
      .eq("id", taskId);
    if (upErr) return { ok: false, message: upErr.message };
    await logTaskEvent(
      taskId,
      taskEventType.statusChanged,
      withTaskEventSchema({ from: prev, to: "blocked", reason: "needs_help" }),
      userId,
    );
  }
  await logTaskEvent(
    taskId,
    taskEventType.needsHelp,
    withTaskEventSchema({}),
    userId,
  );
  return { ok: true };
}

export async function completeCard(
  client: SupabaseClient,
  input: {
    taskId: string;
    userId: string;
    authorDisplayName: string;
  },
): Promise<OrchestrationResult> {
  const { taskId, userId, authorDisplayName } = input;

  const { data: task, error: tErr } = await client
    .from("tasks")
    .select("id, status, require_checklist_complete")
    .eq("id", taskId)
    .maybeSingle();
  if (tErr) return { ok: false, message: tErr.message };
  if (!task) return { ok: false, message: "Task not found." };

  const row = task as TaskStatusRow;
  if (row.status === "done") {
    return { ok: false, message: "Task is already completed." };
  }

  const requireChecklist = coerceBoolean(
    (row as { require_checklist_complete?: unknown }).require_checklist_complete,
    false,
  );
  if (requireChecklist) {
    const { data: items, error: chErr } = await client
      .from("task_checklist_items")
      .select("done")
      .eq("task_id", taskId);
    if (chErr) return { ok: false, message: chErr.message };
    const list = items ?? [];
    if (list.length === 0) {
      return {
        ok: false,
        message: "Checklist must be completed before marking done.",
      };
    }
    const allDone = list.every((i: { done: boolean }) => i.done);
    if (!allDone) {
      return {
        ok: false,
        message: "Complete all checklist steps before marking done.",
      };
    }
  }

  const commentFirst = await addTaskComment(client, {
    taskId,
    userId,
    authorDisplayName,
    body: "Marked done",
    imageUrl: null,
    checklistItemId: null,
  });
  if (!commentFirst.ok) {
    return { ok: false, message: commentFirst.message };
  }

  const now = new Date().toISOString();
  const { error: upErr } = await client
    .from("tasks")
    .update({ status: "done", completed_at: now })
    .eq("id", taskId);
  if (upErr) return { ok: false, message: upErr.message };

  const prev = String(row.status);
  await logTaskEvent(
    taskId,
    taskEventType.statusChanged,
    withTaskEventSchema({ from: prev, to: "done", reason: "completed" }),
    userId,
  );

  await logTaskEvent(
    taskId,
    taskEventType.markedDone,
    withTaskEventSchema({}),
    userId,
  );
  return { ok: true };
}

export async function toggleChecklistItem(
  client: SupabaseClient,
  input: {
    taskId: string;
    userId: string;
    checklistItemId: string;
    nextDone: boolean;
  },
): Promise<OrchestrationResult<{ title: string }>> {
  const { taskId, userId, checklistItemId, nextDone } = input;

  const { data: item, error: fetchErr } = await client
    .from("task_checklist_items")
    .select("id, task_id, title, done")
    .eq("id", checklistItemId)
    .maybeSingle();
  if (fetchErr) return { ok: false, message: fetchErr.message };
  if (!item || String(item.task_id) !== taskId) {
    return { ok: false, message: "Checklist item not found for this task." };
  }

  const { error: upErr } = await client
    .from("task_checklist_items")
    .update({ done: nextDone })
    .eq("id", checklistItemId);
  if (upErr) return { ok: false, message: upErr.message };

  const title = String(item.title ?? "");
  await logTaskEvent(
    taskId,
    nextDone ? taskEventType.checklistChecked : taskEventType.checklistUnchecked,
    withTaskEventSchema({ checklist_item_id: checklistItemId, title }),
    userId,
  );
  return { ok: true, data: { title } };
}

export async function addTaskComment(
  client: SupabaseClient,
  input: {
    taskId: string;
    userId: string;
    authorDisplayName: string;
    body: string;
    imageUrl: string | null;
    checklistItemId: string | null;
  },
): Promise<OrchestrationResult> {
  const {
    taskId,
    userId,
    authorDisplayName,
    body,
    imageUrl,
    checklistItemId,
  } = input;

  const { error: insErr } = await client.from("task_comments").insert({
    task_id: taskId,
    user_id: userId,
    author_display_name: authorDisplayName,
    body,
    image_url: imageUrl,
    checklist_item_id: checklistItemId,
  });
  if (insErr) return { ok: false, message: insErr.message };

  await logTaskEvent(
    taskId,
    taskEventType.commentAdded,
    withTaskEventSchema({
      body,
      has_image: Boolean(imageUrl),
      ...(checklistItemId
        ? { checklist_item_id: checklistItemId }
        : {}),
    }),
    userId,
  );
  return { ok: true };
}
