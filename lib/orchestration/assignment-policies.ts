// lib/orchestration/assignment-policies.ts
//
// Auto-assignment policies layer (master plan IV.A). Takes a batch of
// TaskDrafts produced by the rule engine and assigns each to a member of
// today's roster per the Hallway + Assignment governance rules.
//
// Current scope (cumulative through Step 4):
//   - Public API: assignDrafts(drafts, ctx) and AssignmentContext type.
//   - Departure drafts (card_type === "housekeeping_turn") sorted by
//     DEPARTURE_STATUS_PRIORITY before assignment ("Has Sheets" first,
//     "Checked Out" last). [Step 2]
//   - Primary-housekeeper lane (Hallway + Assignment R06-R07): stayovers +
//     arrivals route to primaries by preferred_hall match (lighter-loaded
//     primary takes 40s and any unmatched-hall fallback); departures route
//     to non-primaries by preferred_hall match with lighter-load fallback;
//     all other card types round-robin across the full roster by lighter
//     load. Each pick falls back through a chain so nothing orphans. [Step 4]
//
// TODO in subsequent steps (each its own commit):
//   - Step 5: hallway adjacency rule — refuse cross-hall assignment until
//     starting hall is empty (master plan IV.B).
//   - Step 6: no-orphan distribution — overflow handling for above-standard
//     load (5 dep / 10 stay / 15 daily per housekeeper from
//     STANDARD_LOAD_PER_HOUSEKEEPER) with console.warn until the activity
//     feed (III.D) lands (master plan IV.C). Today's `loads` map tracks
//     total-per-member; Step 6 will refine to per-type-per-member to
//     evaluate against per-type standard thresholds.
//   - Step 4-follow: DEPARTURE_BUMP_ORDER cross-cutting bumps applied on
//     top of the status sort (same_day_arrival, earlier_arrival_time,
//     last_of_type_fallback).
//
// Internal imports under lib/orchestration use .ts extensions for the Node
// orchestrator script (--experimental-strip-types).

import type { TaskDraft } from "./types.ts";
import type { RosterMember } from "./roster.ts";
import {
  DEPARTURE_STATUS_PRIORITY,
  type DepartureStatus,
  getRoomHall,
  type HallId,
} from "../dispatch-config.ts";

// =============================================================================
// Public API
// =============================================================================

export type AssignmentContext = {
  /** YYYY-MM-DD; same as event_date on the source InboundEvent. */
  eventDate: string;
  /** Today's on-shift roster from loadRoster(). */
  roster: RosterMember[];
};

/**
 * Assign every draft in the batch to a roster member. Returns a new array
 * with staff_id and assignee_name populated. Pure — does not mutate the
 * input array or its members.
 *
 * Distribution (cumulative through Step 4):
 *   1. Sort departures by DEPARTURE_STATUS_PRIORITY ("Has Sheets" first).
 *   2. For each draft in sorted order, pick the right assignee per the
 *      primary-housekeeper lane logic (see pickAssignee).
 *   3. Track per-member load to drive lighter-load tiebreaks.
 *
 * If the roster is empty, every draft is returned unchanged (each retains
 * whatever staff_id and assignee_name interpret() seeded from
 * rule.assignment.specific_member_id, which may be null and ""). The
 * caller (run.ts) is responsible for surfacing the empty-roster condition.
 */
export function assignDrafts(
  drafts: TaskDraft[],
  ctx: AssignmentContext,
): TaskDraft[] {
  if (ctx.roster.length === 0) {
    return drafts.slice();
  }

  const primaries = ctx.roster.filter((r) => r.is_primary);
  const nonPrimaries = ctx.roster.filter((r) => !r.is_primary);

  // Per-member draft count. Drives lighter-load picks for primary 40s
  // assignment, no-exact-hall fallback, and final round-robin overflow.
  // Step 6 (no-orphan) will refine this to per-type-per-member to evaluate
  // against STANDARD_LOAD_PER_HOUSEKEEPER thresholds.
  const loads = new Map<string, number>();
  for (const m of ctx.roster) loads.set(m.staff_id, 0);

  const sorted = sortDraftsForAssignment(drafts);

  return sorted.map((draft) => {
    const member = pickAssignee(
      draft,
      ctx.roster,
      primaries,
      nonPrimaries,
      loads,
    );
    if (!member) {
      // Defensive: ctx.roster.length > 0 was checked above, and the
      // fallback chain in pickAssignee should always return a member.
      return { ...draft };
    }
    loads.set(member.staff_id, (loads.get(member.staff_id) ?? 0) + 1);
    return {
      ...draft,
      staff_id: member.staff_id,
      assignee_name: member.name,
    };
  });
}

// =============================================================================
// Pick — primary lane (Hallway + Assignment R06-R07) plus fallback chain
// =============================================================================

/**
 * Pick the right roster member for a draft per Hallway + Assignment R06-R07.
 *
 * Stayovers + arrivals route to primaries:
 *   - 20s/30s rooms: primary whose preferred_hall matches takes it.
 *   - 40s rooms (or rooms with no hall): lighter-loaded primary takes it.
 *   - No primary preferred_hall match in 20s/30s: lighter-loaded primary.
 *   - No primaries at all: lighter-loaded non-primary, then any roster.
 *
 * Departures route to non-primaries:
 *   - Non-primary whose preferred_hall matches the room takes it.
 *   - Else lighter-loaded non-primary.
 *   - Else lighter-loaded primary as overflow.
 *
 * All other card types (dailys, eod, sod, maintenance, generic) round-
 * robin across the full roster by lighter load. Step 6 (no-orphan) will
 * revisit this for above-standard load.
 *
 * Returns null only if both primaries and non-primaries are empty
 * (caller already handles ctx.roster.length === 0; this is defensive).
 */
function pickAssignee(
  draft: TaskDraft,
  roster: RosterMember[],
  primaries: RosterMember[],
  nonPrimaries: RosterMember[],
  loads: Map<string, number>,
): RosterMember | null {
  const roomHall = getRoomHall(draft.room_number);

  if (draft.card_type === "stayover" || draft.card_type === "arrival") {
    return (
      pickPrimaryByHall(roomHall, primaries, loads) ??
      pickByLighterLoad(nonPrimaries, loads) ??
      pickByLighterLoad(roster, loads)
    );
  }

  if (draft.card_type === "housekeeping_turn") {
    return (
      pickByHall(roomHall, nonPrimaries, loads) ??
      pickByLighterLoad(nonPrimaries, loads) ??
      pickByLighterLoad(primaries, loads)
    );
  }

  return pickByLighterLoad(roster, loads);
}

/**
 * Stayover/arrival pick: primary whose preferred_hall matches a 20s/30s
 * room, else the lighter-loaded primary. Returns null if there are no
 * primaries (caller falls back to non-primaries).
 */
function pickPrimaryByHall(
  hall: HallId | null,
  primaries: RosterMember[],
  loads: Map<string, number>,
): RosterMember | null {
  if (primaries.length === 0) return null;

  if (hall === "20s" || hall === "30s") {
    const match = primaries.find((p) => p.preferred_hall === hall);
    if (match) return match;
  }

  // 40s, unmapped room, or no preferred-hall match: lighter-loaded primary.
  return pickByLighterLoad(primaries, loads);
}

/**
 * Pick a member from the pool whose preferred_hall matches the given hall.
 * Ties broken by lighter load. Returns null if no candidate matches.
 */
function pickByHall(
  hall: HallId | null,
  pool: RosterMember[],
  loads: Map<string, number>,
): RosterMember | null {
  if (!hall || pool.length === 0) return null;
  const matches = pool.filter((m) => m.preferred_hall === hall);
  if (matches.length === 0) return null;
  return pickByLighterLoad(matches, loads);
}

/**
 * Pick the member from the pool with the lowest load count. Ties broken
 * by input order (stable). Returns null if pool is empty.
 */
function pickByLighterLoad(
  pool: RosterMember[],
  loads: Map<string, number>,
): RosterMember | null {
  if (pool.length === 0) return null;
  let best = pool[0];
  let bestLoad = loads.get(best.staff_id) ?? 0;
  for (let i = 1; i < pool.length; i++) {
    const m = pool[i];
    const l = loads.get(m.staff_id) ?? 0;
    if (l < bestLoad) {
      best = m;
      bestLoad = l;
    }
  }
  return best;
}

// =============================================================================
// Sorting — departures by status priority, non-departures stable (Step 2)
// =============================================================================

/**
 * Read context.departure_status for a draft, defaulting to "Open" when
 * the value is missing or not one of the canonical priority statuses.
 *
 * The admin master Departures table that would canonically set this is
 * unbuilt (master plan II.F). Pre-beta, the import path may stash a value
 * into context.departure_status; absent that, every departure sorts as
 * "Open" and the priority sort is effectively a no-op until data lands.
 */
function readDepartureStatus(draft: TaskDraft): DepartureStatus {
  const raw = draft.context.departure_status;
  if (typeof raw === "string") {
    const idx = (DEPARTURE_STATUS_PRIORITY as readonly string[]).indexOf(raw);
    if (idx >= 0) return raw as DepartureStatus;
  }
  return "Open";
}

/**
 * Returns a new array of drafts sorted for assignment:
 *   1. Departures (card_type === "housekeeping_turn") first, ordered by
 *      DEPARTURE_STATUS_PRIORITY (lower index = higher priority).
 *   2. All other drafts after, in their original input order.
 *
 * Stable on ties — Array.prototype.sort is stable in modern engines.
 */
function sortDraftsForAssignment(drafts: TaskDraft[]): TaskDraft[] {
  const departures: TaskDraft[] = [];
  const others: TaskDraft[] = [];

  for (const draft of drafts) {
    if (draft.card_type === "housekeeping_turn") {
      departures.push(draft);
    } else {
      others.push(draft);
    }
  }

  departures.sort((a, b) => {
    const aIdx = (DEPARTURE_STATUS_PRIORITY as readonly string[]).indexOf(
      readDepartureStatus(a),
    );
    const bIdx = (DEPARTURE_STATUS_PRIORITY as readonly string[]).indexOf(
      readDepartureStatus(b),
    );
    return aIdx - bIdx;
  });

  return [...departures, ...others];
}
