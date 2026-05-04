// lib/orchestration/assignment-policies.ts
//
// Auto-assignment policies layer (master plan IV.A). Takes a batch of
// TaskDrafts produced by the rule engine and assigns each to a member of
// today's roster per the Hallway + Assignment governance rules.
//
// Step 2 scope (this file's initial commit):
//   - Skeleton with public API: assignDrafts(drafts, ctx) and types.
//   - Departure drafts (card_type === "housekeeping_turn") sorted by
//     DEPARTURE_STATUS_PRIORITY before assignment ("Has Sheets" first,
//     "Checked Out" last).
//   - Naive round-robin distribution of the sorted drafts across roster.
//
// TODO in subsequent steps (each its own commit):
//   - Step 4: primary-housekeeper lane — arrivals + stayovers route to
//     primaries; one to 30s, the other to 20s; lighter primary takes 40s;
//     non-primaries get departures + dailys overflow (Hallway+Assignment R06-R07).
//   - Step 5: hallway adjacency rule — refuse cross-hall assignment until
//     starting hall is empty (master plan IV.B).
//   - Step 6: no-orphan distribution — overflow handling for above-standard
//     load (5 dep / 10 stay / 15 daily per housekeeper) with console.warn
//     until the activity feed (III.D) lands (master plan IV.C).
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
 * Phase 1 distribution: sort departures by DEPARTURE_STATUS_PRIORITY, then
 * round-robin across roster. Non-departure drafts keep their input order
 * and are appended after departures in the assignment cycle.
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

  const sorted = sortDraftsForAssignment(drafts);

  return sorted.map((draft, idx) => {
    const member = ctx.roster[idx % ctx.roster.length];
    return {
      ...draft,
      staff_id: member.staff_id,
      assignee_name: member.name,
    };
  });
}

// =============================================================================
// Sorting — departures by status priority, non-departures stable
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
