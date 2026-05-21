// lib/deep-clean.ts
//
// Deep Clean tray — per-room monthly deep-clean tracking on the Departures card
// (D-430). Each of the 7 fixed items runs on a ROLLING monthly clock: completing
// an item logs to `deep_clean_history` and resets that item's clock (next due
// ≈ 30 days later). Items can be checked ad-hoc during any departure clean.
//
// Item names + how-to text are verbatim from Bryan's Deep Clean Admin List CSV
// / docs/kb/Departure_DeepClean_variant.md. `task_name` in deep_clean_history
// stores the display name (e.g. "AC Unit"), so we match on `name`.

import type { SupabaseClient } from "@supabase/supabase-js";

export type DeepCleanItem = { key: string; name: string; details: string };

/** The 7 fixed deep-clean items + KB procedure ("Details"). */
export const DEEP_CLEAN_ITEMS: ReadonlyArray<DeepCleanItem> = [
  { key: "ac_unit", name: "AC Unit", details: "Remove cover, vacuum, wash, replace, etc." },
  { key: "bedding", name: "Bedding", details: "Remove & replace all pillows, mattress pad, comforter, etc. Curtains." },
  { key: "bed", name: "Bed", details: "Flip & rotate mattress, vacuum, move frame and clean under." },
  { key: "walls", name: "Walls", details: "Wash & dry walls with mop — floor to ceiling. Wipe down baseboards." },
  { key: "bathroom", name: "Bathroom", details: "Remove light cover & vent fan. Scrub floor with drill." },
  { key: "shower_sink", name: "Shower / Sink", details: "Clean faucet & heads, remove cap on sink, clean out drains with tool & Drano." },
  { key: "defrost_freezer", name: "Defrost Freezer", details: "Unplug, let melt, clean out, sanitize, plug back in." },
];

/** Rolling clock: an item is due again ~30 days after it was last completed. */
export const DEEP_CLEAN_CYCLE_DAYS = 30;

export type DeepCleanDueStatus = "never" | "due" | "ok";

export type DeepCleanItemStatus = {
  key: string;
  name: string;
  details: string;
  /** Most-recent completion date (YYYY-MM-DD), any source, or null if never. */
  lastCompletedOn: string | null;
  lastCompletedBy: string | null;
  /** never = no record; due = >= cycle days since last; ok = within the cycle. */
  dueStatus: DeepCleanDueStatus;
  daysSince: number | null;
  /** True when this item was already logged against the CURRENT departure task. */
  doneThisTask: boolean;
};

function todayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysBetween(fromYmd: string, toYmd: string): number {
  const a = new Date(`${fromYmd}T00:00:00Z`).getTime();
  const b = new Date(`${toYmd}T00:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.floor((b - a) / 86_400_000);
}

/**
 * Per-item deep-clean status for a room: most-recent completion + rolling
 * due/overdue, plus whether each item was already done on the current task.
 * Returns all 7 items even when the room has no history.
 */
export async function getDeepCleanStatus(
  client: SupabaseClient,
  roomNumber: string | null,
  currentTaskId: string | null,
): Promise<DeepCleanItemStatus[]> {
  const base: DeepCleanItemStatus[] = DEEP_CLEAN_ITEMS.map((it) => ({
    key: it.key,
    name: it.name,
    details: it.details,
    lastCompletedOn: null,
    lastCompletedBy: null,
    dueStatus: "never",
    daysSince: null,
    doneThisTask: false,
  }));
  if (!roomNumber) return base;

  const { data, error } = await client
    .from("deep_clean_history")
    .select("task_name, completed_on, completed_by_display_name, source_task_id")
    .eq("room_number", roomNumber)
    .order("completed_on", { ascending: false });
  if (error || !data) return base;

  const rows = data as Array<{
    task_name: string;
    completed_on: string;
    completed_by_display_name: string | null;
    source_task_id: string | null;
  }>;
  const today = todayYmd();

  for (const item of base) {
    const matches = rows.filter((r) => r.task_name === item.name);
    if (matches.length === 0) continue;
    const latest = matches[0]; // ordered completed_on desc
    item.lastCompletedOn = latest.completed_on;
    item.lastCompletedBy = latest.completed_by_display_name || null;
    item.daysSince = daysBetween(latest.completed_on, today);
    item.dueStatus = item.daysSince >= DEEP_CLEAN_CYCLE_DAYS ? "due" : "ok";
    item.doneThisTask =
      currentTaskId != null &&
      matches.some((r) => r.source_task_id === currentTaskId);
  }
  return base;
}

/** Log a deep-clean item completion for a room — resets that item's clock. */
export async function logDeepCleanItem(
  client: SupabaseClient,
  args: {
    roomNumber: string;
    taskName: string;
    details?: string | null;
    sourceTaskId: string;
    userId: string;
    displayName: string;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await client.from("deep_clean_history").insert({
    room_number: args.roomNumber,
    task_name: args.taskName,
    details: args.details ?? null,
    source_task_id: args.sourceTaskId,
    completed_by_user_id: args.userId,
    completed_by_display_name: args.displayName,
    // completed_on defaults to current_date server-side.
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
