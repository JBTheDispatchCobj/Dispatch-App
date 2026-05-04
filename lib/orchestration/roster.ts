// lib/orchestration/roster.ts
//
// Today's on-shift roster. Phase 1 treats every active staff row as on-shift
// (Clock-In flow per master plan I.C is unbuilt; deferring to it would block
// the auto-assignment build IV.A). Joins each row against the static primary
// + hall maps in lib/dispatch-config to produce RosterMember entries the
// assignment-policies layer consumes.
//
// Internal imports under lib/orchestration use .ts extensions for the Node
// orchestrator script (--experimental-strip-types).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  STAFF_PRIMARY_NAMES,
  STAFF_PREFERRED_HALL,
  type HallId,
} from "../dispatch-config.ts";

export type RosterMember = {
  staff_id: string;
  name: string;
  is_primary: boolean;
  preferred_hall: HallId | null;
  /** Phase 1 stub — always 0. Activated once master plan I.C Clock-In flow
   *  + 14-day segment infrastructure (III.J) lands. */
  consecutive_days_worked: number;
};

/**
 * Load today's on-shift roster. Returns RosterMember[] in name-ascending
 * order. Reads staff rows where status = 'active' and joins against the
 * static primary + preferred-hall config maps.
 *
 * Throws if the staff query errors. Returns an empty array if the staff
 * table is empty (no policies applicable; assignDrafts will surface a
 * console.warn under that condition).
 */
export async function loadRoster(
  client: SupabaseClient,
): Promise<RosterMember[]> {
  const { data, error } = await client
    .from("staff")
    .select("id, name, status")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load roster: ${error.message}`);
  }

  const rows = (data ?? []) as { id: string; name: string; status: string }[];

  return rows.map((r) => {
    const key = r.name.trim().toLowerCase();
    return {
      staff_id: r.id,
      name: r.name,
      is_primary: STAFF_PRIMARY_NAMES.has(key),
      preferred_hall: STAFF_PREFERRED_HALL[key] ?? null,
      consecutive_days_worked: 0,
    };
  });
}
