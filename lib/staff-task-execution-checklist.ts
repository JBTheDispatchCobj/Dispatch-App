import type { SupabaseClient } from "@supabase/supabase-js";
import type { CheckRow } from "@/app/tasks/[id]/task-card-shared";

/** Checklist row for staff execution UI (always persisted in `task_checklist_items`). */
export type ExecutionChecklistItem = {
  id: string;
  title: string;
  done: boolean;
};

export function checklistCompletionPercent(
  items: ExecutionChecklistItem[],
): number {
  if (items.length === 0) return 0;
  const done = items.filter((i) => i.done).length;
  return Math.round((done / items.length) * 100);
}

/**
 * Load checklist rows from Supabase. Default rows are created by DB trigger
 * on task insert (housekeeping) or milestone backfill — no client mock path.
 */
export async function loadStaffExecutionChecklist(
  client: SupabaseClient,
  taskId: string,
): Promise<ExecutionChecklistItem[]> {
  const { data, error } = await client
    .from("task_checklist_items")
    .select("id, task_id, title, sort_order, done")
    .eq("task_id", taskId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as CheckRow[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    done: r.done,
  }));
}
