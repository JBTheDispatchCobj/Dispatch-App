// lib/orchestration/assignment-policies.ts
//
// Auto-assignment policies layer (master plan IV.A). Takes a batch of
// TaskDrafts produced by the rule engine and assigns each to a member of
// today's roster per the Hallway + Assignment governance rules.
//
// Current scope (cumulative through Step 6 + Day 27 pre-assigned guard):
//   - Public API: assignDrafts(drafts, ctx) and AssignmentContext type.
//   - Pre-assigned drafts: if interpret() already stamped staff_id on a
//     draft (e.g., dailys / eod from synthesized daily_shift events
//     carrying staff_id in raw_payload), the lane logic is skipped and
//     the draft passes through unchanged. The load tracker still
//     increments so the per-type count reflects reality across the batch.
//     This is what makes Item E (master plan IV.F dailys + eod rules)
//     work without a separate "skip dailys/eod" branch in the lane logic.
//   - Departure drafts (card_type === "housekeeping_turn") sorted by
//     DEPARTURE_STATUS_PRIORITY before assignment ("Has Sheets" first,
//     "Checked Out" last). [Step 2]
//   - Primary-housekeeper lane (Hallway + Assignment R06-R07): stayovers +
//     arrivals route to primaries by preferred_hall match (lighter-loaded
//     primary takes 40s and any unmatched-hall fallback); departures route
//     to non-primaries by preferred_hall match with lighter-load fallback;
//     all other card types round-robin across the full roster by lighter
//     load. Each pick falls back through a chain so nothing orphans. [Step 4]
//   - Hallway adjacency rule (master plan IV.B / R10): once a member has
//     received their first draft, they're "locked" to that hall until its
//     remaining demand reaches zero — pickByLighterLoad filters out
//     candidates whose starting hall still has unassigned work. If every
//     candidate is blocked, the constraint relaxes with a console.warn
//     ("cross-hall override") so the draft still finds an assignee.
//     Override audit event deferred until III.D activity feed lands. [Step 5]
//   - No-orphan distribution (master plan IV.C / R11): the per-member load
//     tracker is split per-type (departures / stayovers / dailys / other)
//     so each member can be evaluated against STANDARD_LOAD_PER_HOUSEKEEPER
//     thresholds (5 / 10 / 15). Picker logic unchanged — lighter-loaded
//     candidate still wins, where "lighter" is total drafts across all
//     types. After each pick, if the member's per-type count exceeds the
//     threshold (count > threshold), a console.warn is emitted flagging
//     the above-standard pick. arrival / eod / maintenance / general_report
//     drafts land in "other", which has no threshold and never warns.
//     One warn line per above-standard pick (matches Step 5's per-pick
//     pattern); structured audit event deferred until III.D activity feed
//     lands. [Step 6]
//
// TODO in subsequent steps (each its own commit):
//   - Step 4-follow: DEPARTURE_BUMP_ORDER cross-cutting bumps applied on
//     top of the status sort (same_day_arrival, earlier_arrival_time,
//     last_of_type_fallback).
//   - Step 5-follow: replace the cross-hall console.warn with a structured
//     audit event once the activity feed (III.D) is online.
//   - Step 6-follow: replace the above-standard console.warn with a
//     structured audit event once the activity feed (III.D) is online.
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
  STANDARD_LOAD_PER_HOUSEKEEPER,
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
 * Distribution (cumulative through Step 6):
 *   1. Sort departures by DEPARTURE_STATUS_PRIORITY ("Has Sheets" first).
 *   2. Pre-pass: count remaining demand per hall.
 *   3. For each draft in sorted order, pick the right assignee per the
 *      primary-housekeeper lane logic with hall adjacency filtering.
 *   4. Track per-member load (split per-type: departures / stayovers /
 *      dailys / other), starting hall, and remaining hall demand to drive
 *      the lighter-load tiebreak, the adjacency rule, and the above-
 *      standard-load console.warn (Step 6 / R11).
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

  // PolicyState bundles per-batch tracking: per-type load counts, starting
  // hall, and remaining hall demand. Step 6 (no-orphan) split the load
  // tracker per-type so each member can be evaluated against
  // STANDARD_LOAD_PER_HOUSEKEEPER thresholds (5 / 10 / 15).
  const state: PolicyState = {
    loads: new Map(),
    startingHalls: new Map(),
    hallDemand: new Map(),
  };
  for (const m of ctx.roster) state.loads.set(m.staff_id, zeroLoadCounts());

  const sorted = sortDraftsForAssignment(drafts);

  // Pre-pass: count drafts per hall so the adjacency rule can tell when
  // a member's starting hall is fully assigned and they're free to move.
  for (const d of sorted) {
    const hall = getRoomHall(d.room_number);
    if (hall) {
      state.hallDemand.set(hall, (state.hallDemand.get(hall) ?? 0) + 1);
    }
  }

  return sorted.map((draft) => {
    // Preserve pre-assigned drafts (Day 27 / Item E). interpret() stamps
    // draft.staff_id from raw_payload.staff_id for dailys / eod cards
    // generated by synthesized daily_shift events; those drafts are
    // already tied to a specific housekeeper. Skip the lane logic but
    // still update the load tracker so the per-type counts reflect the
    // full batch (and the above-standard warn fires correctly if a
    // housekeeper accumulates beyond their per-type threshold across a
    // mix of pre-assigned and lane-assigned drafts).
    if (draft.staff_id) {
      const preMember = ctx.roster.find((m) => m.staff_id === draft.staff_id);
      if (preMember) incrementLoadAndWarn(preMember, draft, state);
      return { ...draft };
    }

    const member = pickAssignee(
      draft,
      ctx.roster,
      primaries,
      nonPrimaries,
      state,
    );
    if (!member) {
      // Defensive: ctx.roster.length > 0 was checked above, and the
      // fallback chain in pickAssignee should always return a member.
      return { ...draft };
    }

    // Update state: per-type load count (with above-standard warn),
    // starting hall (first time only), and decrement remaining hall
    // demand for the assigned room's hall.
    incrementLoadAndWarn(member, draft, state);
    const roomHall = getRoomHall(draft.room_number);
    if (roomHall) {
      if (!state.startingHalls.has(member.staff_id)) {
        state.startingHalls.set(member.staff_id, roomHall);
      }
      state.hallDemand.set(
        roomHall,
        Math.max(0, (state.hallDemand.get(roomHall) ?? 0) - 1),
      );
    }

    return {
      ...draft,
      staff_id: member.staff_id,
      assignee_name: member.name,
    };
  });
}

// =============================================================================
// Private state — threaded through pickAssignee and helpers
// =============================================================================

/**
 * Per-type load counts for a single roster member. Split per-type (Step 6)
 * so each member can be evaluated against STANDARD_LOAD_PER_HOUSEKEEPER
 * thresholds. "other" buckets card types without a per-type threshold
 * (arrival / eod / maintenance / general_report) — they still count toward
 * total load for lighter-load comparisons but never trigger an above-
 * standard warn. Total is computed via getTotalLoad() to avoid drift.
 */
type LoadCounts = {
  departures: number;
  stayovers: number;
  dailys: number;
  other: number;
};

/** Bucket key for the per-type load tracker. */
type LoadKey = keyof LoadCounts;

type PolicyState = {
  /** staff_id → per-type drafts assigned so far this batch. */
  loads: Map<string, LoadCounts>;
  /** staff_id → hall of the member's first assignment this batch. */
  startingHalls: Map<string, HallId>;
  /** hall → drafts in that hall not yet assigned this batch. */
  hallDemand: Map<HallId, number>;
};

// =============================================================================
// Pick — primary lane (R06-R07) + adjacency rule (R10) + fallback chain
// =============================================================================

/**
 * Pick the right roster member for a draft per Hallway + Assignment R06-R07
 * and R10. Routing logic (cumulative through Step 5):
 *
 * Stayovers + arrivals route to primaries:
 *   - 20s/30s rooms: primary whose preferred_hall matches takes it (with
 *     adjacency check — lighter-loaded primary if the match is locked to
 *     a different hall that's still active).
 *   - 40s rooms (or unmapped): lighter-loaded primary, adjacency-aware.
 *   - No primaries at all: lighter-loaded non-primary, then any roster
 *     member as final fallback.
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
  state: PolicyState,
): RosterMember | null {
  const roomHall = getRoomHall(draft.room_number);

  if (draft.card_type === "stayover" || draft.card_type === "arrival") {
    return (
      pickPrimaryByHall(roomHall, primaries, state) ??
      pickByLighterLoad(nonPrimaries, state, roomHall) ??
      pickByLighterLoad(roster, state, roomHall)
    );
  }

  if (draft.card_type === "housekeeping_turn") {
    return (
      pickByHall(roomHall, nonPrimaries, state) ??
      pickByLighterLoad(nonPrimaries, state, roomHall) ??
      pickByLighterLoad(primaries, state, roomHall)
    );
  }

  return pickByLighterLoad(roster, state, roomHall);
}

/**
 * Stayover/arrival pick: primary whose preferred_hall matches a 20s/30s
 * room (subject to adjacency check), else the lighter-loaded primary.
 * Returns null if there are no primaries (caller falls back to non-primaries).
 */
function pickPrimaryByHall(
  hall: HallId | null,
  primaries: RosterMember[],
  state: PolicyState,
): RosterMember | null {
  if (primaries.length === 0) return null;

  if (hall === "20s" || hall === "30s") {
    const match = primaries.find((p) => p.preferred_hall === hall);
    if (match && isHallEligible(match, hall, state)) {
      return match;
    }
  }

  // 40s, unmapped room, no preferred-hall match, or match-but-locked-elsewhere:
  // lighter-loaded primary with adjacency filtering.
  return pickByLighterLoad(primaries, state, hall);
}

/**
 * Pick a member from the pool whose preferred_hall matches the given hall.
 * Ties broken by lighter load with adjacency filtering. Returns null if no
 * candidate matches the hall.
 */
function pickByHall(
  hall: HallId | null,
  pool: RosterMember[],
  state: PolicyState,
): RosterMember | null {
  if (!hall || pool.length === 0) return null;
  const matches = pool.filter((m) => m.preferred_hall === hall);
  if (matches.length === 0) return null;
  return pickByLighterLoad(matches, state, hall);
}

/**
 * Pick the member from the pool with the lowest load count, filtering by
 * hall adjacency (Step 5 / R10): a member whose starting hall still has
 * unassigned drafts is ineligible for cross-hall work. Ties broken by
 * input order (stable).
 *
 * If every candidate is adjacency-blocked, the constraint relaxes — pick
 * the lighter-loaded member from the unfiltered pool and emit a
 * console.warn flagging the cross-hall override. Audit event deferred to
 * Step 5-follow once III.D activity feed is online.
 */
function pickByLighterLoad(
  pool: RosterMember[],
  state: PolicyState,
  roomHall: HallId | null,
): RosterMember | null {
  if (pool.length === 0) return null;

  const eligible = pool.filter((m) => isHallEligible(m, roomHall, state));

  if (eligible.length === 0) {
    // Cross-hall override: every candidate is locked to a different hall
    // whose starting hall still has unassigned drafts. Relax + warn.
    const best = pickLighterFromUnfiltered(pool, state);
    if (best) {
      const startHall = state.startingHalls.get(best.staff_id) ?? "none";
      const targetHall = roomHall ?? "unmapped";
      console.warn(
        `[assignment-policies] Cross-hall override: ${best.name} ` +
          `(starting hall ${startHall}) assigned to ${targetHall} hall ` +
          `while their starting hall still has unassigned drafts.`,
      );
    }
    return best;
  }

  return pickLighterFromUnfiltered(eligible, state);
}

/**
 * Pure lighter-load picker over a pre-filtered pool. No adjacency check.
 * Used internally by pickByLighterLoad both as the standard path (after
 * filtering) and as the override fallback (no filter).
 */
function pickLighterFromUnfiltered(
  pool: RosterMember[],
  state: PolicyState,
): RosterMember | null {
  if (pool.length === 0) return null;
  let best = pool[0];
  let bestLoad = getTotalLoad(state.loads.get(best.staff_id));
  for (let i = 1; i < pool.length; i++) {
    const m = pool[i];
    const l = getTotalLoad(state.loads.get(m.staff_id));
    if (l < bestLoad) {
      best = m;
      bestLoad = l;
    }
  }
  return best;
}

/**
 * Hall-adjacency eligibility check (Step 5 / R10).
 *
 * A member is eligible to take a draft in roomHall when:
 *   - they have no starting hall yet (this would be their first draft), OR
 *   - their starting hall equals roomHall (still in their hall), OR
 *   - their starting hall has zero remaining demand (their hall is done,
 *     so they're free to move).
 *
 * Otherwise they're locked to their starting hall and can't take cross-
 * hall work without an admin override.
 */
function isHallEligible(
  member: RosterMember,
  roomHall: HallId | null,
  state: PolicyState,
): boolean {
  const start = state.startingHalls.get(member.staff_id);
  if (!start) return true;
  if (start === roomHall) return true;
  const remaining = state.hallDemand.get(start) ?? 0;
  return remaining === 0;
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

// =============================================================================
// Load tracking — per-type counts + above-standard warn (Step 6 / R11)
// =============================================================================

/**
 * Map a draft's card_type to the load bucket key. Departures, stayovers,
 * and dailys each have an explicit threshold from STANDARD_LOAD_PER_HOUSEKEEPER.
 * Arrivals, EOD, maintenance, and general_report drafts land in "other" —
 * they count toward total load (so lighter-load picks see them) but never
 * trigger an above-standard warn.
 */
function cardTypeToLoadKey(cardType: string): LoadKey {
  if (cardType === "housekeeping_turn") return "departures";
  if (cardType === "stayover") return "stayovers";
  if (cardType === "dailys") return "dailys";
  return "other";
}

/** Fresh zeroed LoadCounts for a roster member at the start of a batch. */
function zeroLoadCounts(): LoadCounts {
  return { departures: 0, stayovers: 0, dailys: 0, other: 0 };
}

/**
 * Total drafts assigned to a member across all types. Used by
 * pickLighterFromUnfiltered for the lighter-load tiebreak. Computed
 * on-demand to avoid drift between an explicit total field and the
 * per-type counters.
 */
function getTotalLoad(counts: LoadCounts | undefined): number {
  if (!counts) return 0;
  return counts.departures + counts.stayovers + counts.dailys + counts.other;
}

/**
 * Increment the per-type load counter for the picked member and emit a
 * console.warn if the new count exceeds the per-type threshold (Step 6 /
 * master plan IV.C / Hallway + Assignment R11).
 *
 * Threshold lookup: STANDARD_LOAD_PER_HOUSEKEEPER has entries for
 * departures (5), stayovers (10), dailys (15). The "other" bucket has no
 * threshold and is silently incremented — it still counts toward total
 * load for the lighter-load comparison.
 *
 * Warn semantics matches Step 5's cross-hall override: one line per pick
 * that lands the member above their per-type standard. Once a member is
 * above-standard, every subsequent above-standard pick warns again, so
 * the cumulative load is visible in the dev console. Structured audit
 * event deferred until III.D activity feed lands.
 */
function incrementLoadAndWarn(
  member: RosterMember,
  draft: TaskDraft,
  state: PolicyState,
): void {
  const counts = state.loads.get(member.staff_id) ?? zeroLoadCounts();
  const key = cardTypeToLoadKey(draft.card_type);
  counts[key] += 1;
  state.loads.set(member.staff_id, counts);

  if (key === "other") return;
  const threshold = STANDARD_LOAD_PER_HOUSEKEEPER[key];
  if (counts[key] > threshold) {
    console.warn(
      `[assignment-policies] Above standard load: ${member.name} now has ` +
        `${counts[key]} ${key} (standard load ${threshold}).`,
    );
  }
}
