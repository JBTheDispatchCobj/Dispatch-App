// Master plan I.G sub-item 1 — Last Stayover Status lookup. Sources from
// the tasks table (NOT reservations). Queries the most recent past
// stayover or housekeeping_turn task for the same room that has
// context.stayover_status populated as a non-empty array, and returns
// the statuses + the row's created_at. Used by the S-430 brief to
// surface "Last status" in lieu of the hardcoded "Type: —".
//
// Defensive shape: today no setter writes context.stayover_status (the
// staff-side toggle was locked display-only Day 21, and the orchestrator
// pre-set + admin override path is a deferred chase). The helper returns
// null until that data starts flowing — at which point the brief
// populates automatically with no further code changes.

import { supabase } from "./supabase";

export type LastStayoverStatus = {
  statuses: string[];
  recorded_at: string;
};

const STAYOVER_CARD_TYPES = ["stayover", "housekeeping_turn"] as const;
const LOOKUP_LIMIT = 20;

function isNonEmptyStringArray(v: unknown): v is string[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((s) => typeof s === "string" && s.length > 0)
  );
}

/**
 * Most-recent past stayover / housekeeping_turn task for `roomNumber`
 * whose context.stayover_status array is non-empty. Pass the current
 * task id as `excludeTaskId` so the staff member's own card doesn't
 * surface its own status as "last".
 *
 * Returns null when no match (including the common case today where no
 * rows have status set). Errors degrade to null with a console.warn —
 * the brief should show "—" rather than break, matching the V.A BR4
 * reservation-fallback pattern in lib/reservations.ts.
 */
export async function getLastStayoverStatusForRoom(
  roomNumber: string,
  excludeTaskId?: string,
): Promise<LastStayoverStatus | null> {
  const room = roomNumber?.trim();
  if (!room) return null;

  let query = supabase
    .from("tasks")
    .select("id, context, created_at")
    .eq("room_number", room)
    .in("card_type", STAYOVER_CARD_TYPES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(LOOKUP_LIMIT);

  if (excludeTaskId) {
    query = query.neq("id", excludeTaskId);
  }

  const { data, error } = await query;

  if (error) {
    console.warn("[stayover-history]", error.message);
    return null;
  }

  for (const row of data ?? []) {
    const r = row as { context?: unknown; created_at: string };
    if (!r.context || typeof r.context !== "object" || Array.isArray(r.context)) {
      continue;
    }
    const raw = (r.context as Record<string, unknown>).stayover_status;
    if (isNonEmptyStringArray(raw)) {
      return {
        statuses: raw,
        recorded_at: r.created_at,
      };
    }
  }

  return null;
}
