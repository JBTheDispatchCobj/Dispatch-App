// lib/orchestration/reshuffle.ts
//
// Priority-tier reshuffle phase (master plan IV.D / Hallway + Assignment
// R15) + departure cross-cutting bumps (R09 / what was Step 4-follow). One
// pass over every active task on shift; computes a priority_tier (1 / 2 /
// 3) per task per the same-day-arrival rule; writes context.priority_tier
// when it differs from the current value. The staff home reads
// context->priority_tier as the primary in-bucket sort key, ahead of
// due_date.
//
// Tier rule (per Bryan's Day 26 product clarification):
//   - Tier 1: Departure tasks (card_type === "housekeeping_turn") whose
//     room has a same-day arrival booking. Turnover required — highest
//     priority. Surfaces at the top of the Departures bucket.
//   - Tier 2: Stayover and arrival tasks. Standard priority. Internal
//     order within these buckets is unchanged (still by due_date).
//   - Tier 3: Departure tasks WITHOUT a same-day arrival. Lowest priority
//     — "done whenever" per Bryan: housekeeper is expected to defer these
//     until after stayovers and arrivals, picked back up before the
//     dailys / EOD lane. Sorts to the bottom of the Departures bucket.
//   - null: Every other card_type (start_of_day, dailys, eod, maintenance,
//     general_report). NULLS LAST in the staff home sort.
//
// "Ever-changing" semantics: this phase runs after assignDrafts() on
// every orchestrator run. The orchestrator runs on every relevant
// inbound_event plus a periodic schedule, so context.priority_tier always
// reflects current bookings. A future improvement (deferred per Day 26
// design — Bryan opted to keep a note rather than build it now): a
// polling refresh on the staff home itself that re-reads priority_tier
// between orchestrator runs, for live freshness on lower-frequency event
// types.
//
// The reshuffle is purely a data write — NO UI assumptions baked in. The
// staff home owns the read + sort + active-bucket auto-advance behavior.
//
// Internal imports under lib/orchestration use .ts extensions for the
// Node orchestrator script (--experimental-strip-types).

import type { SupabaseClient } from "@supabase/supabase-js";
import { PROPERTY_TIMEZONE } from "../dispatch-config.ts";
import { writeAuditEvent } from "./audit-events.ts";
import { taskEventType } from "../task-events";

// =============================================================================
// Types
// =============================================================================

export type PriorityTier = 1 | 2 | 3;

export type ReshuffleResult = {
  /** Total active tasks examined (across all card types). */
  tasks_examined: number;
  /** Departures with a same-day arrival in the same room. */
  tier1_count: number;
  /** Stayovers + arrivals. */
  tier2_count: number;
  /** Departures without a same-day arrival. */
  tier3_count: number;
  /** Tasks that did not match any tier (sod / dailys / eod / etc.). */
  untiered_count: number;
  /** Tasks where priority_tier was actually written (changed from previous). */
  tasks_updated: number;
};

type ActiveTaskRow = {
  id: string;
  card_type: string;
  room_number: string | null;
  context: Record<string, unknown> | null;
};

type ArrivalRow = {
  room_number: string;
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Reshuffle phase. Reads every uncompleted task, looks up rooms with
 * same-day arrival bookings, computes priority_tier per task, and writes
 * context.priority_tier when it differs from the current value. Returns
 * counts for orchestrator logging.
 *
 * Throws on any Supabase error so the orchestrator can surface it.
 */
export async function reshuffle(
  client: SupabaseClient,
): Promise<ReshuffleResult> {
  const activeTasks = await loadActiveTasks(client);
  const roomsWithSameDayArrival = await loadSameDayArrivalRooms(client);

  let tier1_count = 0;
  let tier2_count = 0;
  let tier3_count = 0;
  let untiered_count = 0;
  let tasks_updated = 0;

  // Per-task update via individual writes. A single SQL UPDATE with
  // jsonb_set + a CASE expression would let us do this in one round-trip
  // but supabase-js doesn't expose jsonb_set ergonomically and per-task
  // writes are trivial at our shift scale (<50 active tasks per day).
  // Refine if profiling shows it's a hot spot.
  for (const task of activeTasks) {
    const targetTier = computePriorityTier(task, roomsWithSameDayArrival);

    if (targetTier === 1) tier1_count++;
    else if (targetTier === 2) tier2_count++;
    else if (targetTier === 3) tier3_count++;
    else untiered_count++;

    const currentTier = readCurrentTier(task.context);
    if (currentTier === targetTier) continue;

    // Merge-safe context update — never clobber other context keys.
    const currentContext =
      task.context && typeof task.context === "object" ? task.context : {};
    const newContext = { ...currentContext, priority_tier: targetTier };

    const { error: updateErr } = await client
      .from("tasks")
      .update({ context: newContext })
      .eq("id", task.id);
    if (updateErr) {
      throw new Error(
        `reshuffle: failed to update task ${task.id}: ${updateErr.message}`,
      );
    }
    tasks_updated++;

    // Day 29 III.D Phase 1: emit a reshuffle_tier_changed audit event so
    // the activity feed surfaces tier movements per task. Severity is
    // info (per the contract) — these are chatty by design (one per
    // tier-change per pass) and shouldn't crowd warns/criticals on the
    // default-filter view. userId is null because this is service-role
    // emitted from the orchestrator. Fire-and-forget — failures log a
    // warning and the reshuffle pass continues.
    await writeAuditEvent(client, {
      taskId: task.id,
      userId: null,
      eventType: taskEventType.reshuffleTierChanged,
      detail: {
        from_tier: currentTier,
        to_tier: targetTier,
        room_number: task.room_number,
      },
    });
  }

  return {
    tasks_examined: activeTasks.length,
    tier1_count,
    tier2_count,
    tier3_count,
    untiered_count,
    tasks_updated,
  };
}

// =============================================================================
// Pure tier classifier
// =============================================================================

/**
 * Map a task to its priority tier per the rule:
 *   - housekeeping_turn (departure) + room has same-day arrival → 1
 *   - housekeeping_turn (departure) + no same-day arrival       → 3
 *   - stayover OR arrival                                       → 2
 *   - everything else                                           → null
 *
 * Pure — no I/O, safe to unit-test if a test suite ever lands.
 */
export function computePriorityTier(
  task: { card_type: string; room_number: string | null },
  roomsWithSameDayArrival: ReadonlySet<string>,
): PriorityTier | null {
  if (task.card_type === "housekeeping_turn") {
    if (task.room_number && roomsWithSameDayArrival.has(task.room_number)) {
      return 1;
    }
    return 3;
  }
  if (task.card_type === "stayover" || task.card_type === "arrival") {
    return 2;
  }
  return null;
}

// =============================================================================
// Data loaders
// =============================================================================

async function loadActiveTasks(
  client: SupabaseClient,
): Promise<ActiveTaskRow[]> {
  const { data, error } = await client
    .from("tasks")
    .select("id, card_type, room_number, context")
    .is("completed_at", null);
  if (error) {
    throw new Error(`reshuffle: failed to load active tasks: ${error.message}`);
  }
  return (data ?? []) as ActiveTaskRow[];
}

/**
 * Set of room_numbers with at least one live (confirmed / arrived)
 * reservation arriving today. Inlined here rather than calling out to
 * lib/reservations.ts because that module imports the browser Supabase
 * client; the orchestrator runs with the service-role client and needs
 * its own data path.
 *
 * Distinct from getNextIncomingReservationForRoom, which returns the
 * next future arrival regardless of date. For tier classification we
 * specifically want "arrival on EXACTLY today's date".
 */
async function loadSameDayArrivalRooms(
  client: SupabaseClient,
): Promise<ReadonlySet<string>> {
  const today = todayInPropertyTz();
  const { data, error } = await client
    .from("reservations")
    .select("room_number")
    .eq("arrival_date", today)
    .in("status", ["confirmed", "arrived"]);
  if (error) {
    throw new Error(`reshuffle: failed to load arrivals: ${error.message}`);
  }
  const rows = (data ?? []) as ArrivalRow[];
  return new Set(rows.map((r) => r.room_number));
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Today's date as YYYY-MM-DD anchored to the property's timezone. Inlined
 * here rather than importing from lib/reservations.ts for the same reason
 * as loadSameDayArrivalRooms — that module imports the browser client.
 */
function todayInPropertyTz(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PROPERTY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function readCurrentTier(
  context: Record<string, unknown> | null,
): PriorityTier | null {
  if (!context || typeof context !== "object") return null;
  const raw = (context as Record<string, unknown>)["priority_tier"];
  if (raw === 1 || raw === 2 || raw === 3) return raw;
  return null;
}
