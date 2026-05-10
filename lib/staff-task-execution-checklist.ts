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
 * Canonical 7-item departures execution checklist.
 * Used as the display list for the DeparturesCard tile; DB items are matched
 * by title to carry persisted done-state. Items without a DB match render
 * disabled until the task_checklist_items trigger is updated to seed all 7.
 *
 * Jennifer Q1 (Day 52): "That is the appropriate placeholder. This is not
 * relevant to the product working." — D-430 canonical step names accepted
 * as final for beta. The "Text to come" detail per step also accepted.
 *
 * IMPORTANT: this list MUST stay in lockstep with the per-card_type seed
 * arm in `tasks_seed_default_checklist()` at
 * `docs/supabase/checklist_seed_per_card_type.sql` (housekeeping_turn arm).
 * Day 49 codification: DB-trigger-vs-UI-canonical-list drift audit — any
 * change to one MUST update the other in the same commit.
 */
export const DEPARTURES_CANONICAL_CHECKLIST: ReadonlyArray<string> = [
  "Open/Strip",
  "Bed",
  "Report/Doc",
  "Prep",
  "Clean",
  "Close Out",
  "Restock",
];

/**
 * Canonical 3-item arrivals execution checklist (Day 52 chase #3, VI.B).
 *
 * Jennifer Q3 PROVIDED actual canonical list: "An arrival is a simple check
 * of a room that a guest is coming into — we always double check the room
 * before the guest arrives." Tree: `[Open Room, Arrival Notes (Check), Prep]`.
 *
 * Replaces the Day-49 hotfix alias to D-430 7-item canonical (which Jennifer
 * Q3 clarified was wrong shape — A-430 has its own KB list distinct from
 * the departure KB list).
 *
 * IMPORTANT: this list MUST stay in lockstep with the `arrival` arm in
 * `tasks_seed_default_checklist()` at
 * `docs/supabase/checklist_seed_per_card_type.sql`. Day 49 codification.
 */
export const ARRIVALS_CANONICAL_CHECKLIST: ReadonlyArray<string> = [
  "Open Room",
  "Arrival Notes",
  "Prep",
];

/**
 * Canonical 8-item stayovers execution checklist (Day 52 chase #3, VI.B).
 *
 * Jennifer Q3 PROVIDED actual canonical list. Tree:
 * `[Status (DND / Guest Notes / What Each Status Means), Open Room, Remove,
 * Replace, Bed, Clean, Close, Card in App]`. The "Status" row is a
 * checklist step asking staff to set the status pill (the actual pill
 * cluster is rendered separately in S-430 statcard); DND / Guest Notes /
 * What Each Status Means are KB sub-detail under Status.
 *
 * Replaces the Day-49 hotfix alias to D-430 7-item canonical.
 *
 * IMPORTANT: this list MUST stay in lockstep with the `stayover` arm in
 * `tasks_seed_default_checklist()` at
 * `docs/supabase/checklist_seed_per_card_type.sql`. Day 49 codification.
 */
export const STAYOVERS_CANONICAL_CHECKLIST: ReadonlyArray<string> = [
  "Status",
  "Open Room",
  "Remove",
  "Replace",
  "Bed",
  "Clean",
  "Close",
  "Card in App",
];

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
