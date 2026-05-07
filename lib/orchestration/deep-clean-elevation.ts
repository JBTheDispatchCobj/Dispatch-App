// lib/orchestration/deep-clean-elevation.ts
//
// IV.H Wed-occupancy Deep Clean trigger. Auto-elevates housekeeping_turn
// drafts from Standard to Deep on Wednesdays when a set of conditions hold.
// Spec: master plan IV.H / D-430 R26. Threshold constants in
// lib/dispatch-config.ts Section 12 (DEEP_CLEAN_AUTO_TRIGGER).
//
// Conditions (all must hold for elevation):
//   1. eventDate is a Wednesday.
//   2. Departures count for the day < max_departures (5).
//   3. [DAY 43 PHASE A — SKIPPED] Occupancy >= min_occupancy_pct (40) over
//      the last lookback_days (45). [ASK JENNIFER] — data source + total
//      room-count denominator unresolved as of Day 43. The gate is currently
//      a no-op; elevation fires regardless of occupancy. Phase B will
//      activate this gate when Jennifer confirms the data source.
//   4. Per-room: no prior housekeeping_turn task with
//      context->outgoing_guest->>clean_type='Deep' in the last lookback_days.
//   5. Per-room: <=max_recent_deep_items_completed (3) rows in
//      public.deep_clean_history in the last lookback_days.
//
// Pure module with one side-channel: per-elevation PendingAudit emitted as
// kind='deep_clean_triggered'. run.ts pairs each audit with its insert row
// post-insert (matches the assignment-policies pattern — staff_id and
// room_number are enriched at emission time from the inserted row).
//
// Internal imports under lib/orchestration use .ts extensions; no
// browser-coupled imports (Day 29 caveat — anything that imports
// lib/supabase fails at orchestrator runtime).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskDraft } from "./types.ts";
import type { PendingAudit } from "./audit-events.ts";
import { DEEP_CLEAN_AUTO_TRIGGER } from "../dispatch-config.ts";

// JS Date.getUTCDay(): 0=Sun, 3=Wed.
const WEDNESDAY = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// =============================================================================
// Types
// =============================================================================

export type ElevationContext = {
  client: SupabaseClient;
  /** YYYY-MM-DD — the orchestrator's representative event_date for the batch. */
  eventDate: string;
};

export type ElevationResult = {
  /** Same array reference as input — drafts are mutated in place when they qualify. */
  drafts: TaskDraft[];
  /** Aligned by index with drafts; pending audit events to emit post-insert. */
  pendingAudits: PendingAudit[][];
};

// =============================================================================
// Date helpers
// =============================================================================

function isWednesday(eventDate: string): boolean {
  // Parse as UTC noon to dodge DST edges.
  const d = new Date(`${eventDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return d.getUTCDay() === WEDNESDAY;
}

/** Rolling start of the lookback window as an ISO timestamp (for tasks.created_at). */
function lookbackStartIso(eventDate: string, days: number): string {
  const d = new Date(`${eventDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    return new Date(Date.now() - days * MS_PER_DAY).toISOString();
  }
  return new Date(d.getTime() - days * MS_PER_DAY).toISOString();
}

/** Rolling start of the lookback window as a YYYY-MM-DD date string (for deep_clean_history.completed_on). */
function lookbackStartDate(eventDate: string, days: number): string {
  const d = new Date(`${eventDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    return new Date(Date.now() - days * MS_PER_DAY).toISOString().slice(0, 10);
  }
  return new Date(d.getTime() - days * MS_PER_DAY).toISOString().slice(0, 10);
}

// =============================================================================
// Per-room queries
// =============================================================================

/**
 * Cond 4: look up any prior housekeeping_turn task for the room within the
 * lookback window whose context.outgoing_guest.clean_type is 'Deep'. Returns
 * true if found (which BLOCKS elevation), false if none. Falls back to true
 * (fail-closed) on query error to avoid double-elevation.
 *
 * Note: queries `tasks` (not `task_drafts`), so dry-run elevations still see
 * real prior Deep cards.
 */
async function hasRecentDeepCard(
  client: SupabaseClient,
  roomNumber: string,
  eventDate: string,
  lookbackDays: number,
): Promise<boolean> {
  const since = lookbackStartIso(eventDate, lookbackDays);
  const { data, error } = await client
    .from("tasks")
    .select("id, context")
    .eq("card_type", "housekeeping_turn")
    .eq("room_number", roomNumber)
    .gte("created_at", since);
  if (error) {
    console.warn(
      `[deep-clean-elevation] tasks lookup failed for room ${roomNumber}: ${error.message} — failing closed (no elevation).`,
    );
    return true;
  }
  const rows = (data ?? []) as Array<{
    id: string;
    context: Record<string, unknown> | null;
  }>;
  for (const row of rows) {
    const ctx = row.context ?? {};
    const outgoing = (ctx as { outgoing_guest?: { clean_type?: string } })
      .outgoing_guest;
    if (outgoing?.clean_type === "Deep") {
      return true;
    }
  }
  return false;
}

/**
 * Cond 5: count rows in public.deep_clean_history for the room in the
 * lookback window. Returns the count (0 if none). Falls back to
 * Number.MAX_SAFE_INTEGER (fail-closed — high count blocks elevation) on
 * query error.
 */
async function countRecentDeepItems(
  client: SupabaseClient,
  roomNumber: string,
  eventDate: string,
  lookbackDays: number,
): Promise<number> {
  const sinceDate = lookbackStartDate(eventDate, lookbackDays);
  const { count, error } = await client
    .from("deep_clean_history")
    .select("id", { count: "exact", head: true })
    .eq("room_number", roomNumber)
    .gte("completed_on", sinceDate);
  if (error) {
    console.warn(
      `[deep-clean-elevation] deep_clean_history count failed for room ${roomNumber}: ${error.message} — failing closed (no elevation).`,
    );
    return Number.MAX_SAFE_INTEGER;
  }
  return count ?? 0;
}

// =============================================================================
// Mutation helper
// =============================================================================

/**
 * Mutate `context.outgoing_guest.clean_type` from "Standard" to "Deep" on a
 * draft. Idempotent — re-flipping a draft already at "Deep" is a no-op.
 *
 * If the draft happens to lack an outgoing_guest block (defensive — interpret
 * always builds one for housekeeping_turn cards with a guest name in the
 * payload), an empty object is created so clean_type lands in a known shape.
 */
function elevateDraft(draft: TaskDraft): void {
  const ctx = draft.context as Record<string, unknown>;
  const outgoing =
    (ctx.outgoing_guest as Record<string, unknown> | undefined) ?? {};
  outgoing.clean_type = "Deep";
  ctx.outgoing_guest = outgoing;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Run the Wed-occupancy Deep Clean trigger over a batch of drafts (post-
 * assignment). Mutates qualifying housekeeping_turn drafts in place
 * (Standard -> Deep) and returns a pendingAudits side-channel aligned by
 * index with `drafts`. The drafts array reference is preserved.
 *
 * On non-Wednesdays this returns immediately with empty audit slots and no
 * mutations — so it's safe to call unconditionally from run.ts.
 */
export async function elevateDeepClean(
  drafts: TaskDraft[],
  ctx: ElevationContext,
): Promise<ElevationResult> {
  const result: ElevationResult = {
    drafts,
    pendingAudits: drafts.map(() => []),
  };

  // Cond 1: Wednesday gate. Bail early on every other weekday.
  if (!isWednesday(ctx.eventDate)) {
    return result;
  }

  // Build the candidate index list: housekeeping_turn drafts with a
  // room_number whose clean_type is currently "Standard". Skips already-Deep
  // drafts (idempotent in case run.ts ever calls elevation twice in a row).
  const candidateIdxs: number[] = [];
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    if (d.card_type !== "housekeeping_turn") continue;
    if (!d.room_number) continue;
    const outgoing = (d.context as { outgoing_guest?: { clean_type?: string } })
      .outgoing_guest;
    if (outgoing?.clean_type !== "Standard") continue;
    candidateIdxs.push(i);
  }

  // Cond 2: departures < max_departures. We count ALL housekeeping_turn
  // drafts in the batch (not just candidates) so already-Deep drafts still
  // contribute to the day's departure count — the threshold is about the
  // day's overall departure load, not the unelevated subset.
  const departuresCount = drafts.filter(
    (d) => d.card_type === "housekeeping_turn",
  ).length;
  if (departuresCount >= DEEP_CLEAN_AUTO_TRIGGER.max_departures) {
    console.log(
      `[deep-clean-elevation] Wednesday but ${departuresCount} departures >= ${DEEP_CLEAN_AUTO_TRIGGER.max_departures} threshold — no elevations.`,
    );
    return result;
  }

  // Cond 3: occupancy >= min_occupancy_pct over lookback_days.
  //
  // [ASK JENNIFER] Day 43 Phase A — data source + total-room-count
  // denominator unresolved. lib/reservations.ts has per-day arrival/departure/
  // stayover queries but imports the browser Supabase client (Day 29 caveat),
  // and there's no `rooms` table or fixed total-room-count constant to divide
  // by. Skipping cond 3 for now; elevation fires regardless of occupancy on
  // Wednesdays that pass conds 1/2/4/5. When Jennifer confirms (1) the data
  // source for occupied-room-nights and (2) the total room count, replace
  // this comment block with the real query and bail when the threshold isn't
  // met. Constant lives at DEEP_CLEAN_AUTO_TRIGGER.min_occupancy_pct.

  if (candidateIdxs.length === 0) {
    return result;
  }

  // Per-room conds 4 + 5. Run sequentially per draft to keep failure modes
  // legible — batch volume is at most a single shift's housekeeping_turn
  // drafts, so the latency cost is bounded and the audit log stays ordered.
  let elevatedCount = 0;
  for (const i of candidateIdxs) {
    const draft = drafts[i];
    const room = draft.room_number;
    if (!room) continue;

    // Cond 4: no prior Deep card for this room in lookback window.
    const priorDeep = await hasRecentDeepCard(
      ctx.client,
      room,
      ctx.eventDate,
      DEEP_CLEAN_AUTO_TRIGGER.lookback_days,
    );
    if (priorDeep) {
      continue;
    }

    // Cond 5: deep_clean_history item count <= max_recent_deep_items_completed.
    const recentItems = await countRecentDeepItems(
      ctx.client,
      room,
      ctx.eventDate,
      DEEP_CLEAN_AUTO_TRIGGER.lookback_days,
    );
    if (recentItems > DEEP_CLEAN_AUTO_TRIGGER.max_recent_deep_items_completed) {
      continue;
    }

    // All conditions held — elevate the draft and stash the audit.
    // staff_id + room_number get enriched by run.ts at emission time from
    // the post-insert row (mirrors the assignment-policies audit pattern).
    elevateDraft(draft);
    elevatedCount++;

    result.pendingAudits[i].push({
      kind: "deep_clean_triggered",
      detail: {
        // Carry assignee_name through directly so the activity feed renders
        // a real name rather than waiting on a per-event roster join.
        // Empty string when assignment-policies left the draft unassigned.
        staff_name: draft.assignee_name,
        recent_deep_items_count: recentItems,
        departures_count: departuresCount,
        lookback_days: DEEP_CLEAN_AUTO_TRIGGER.lookback_days,
        max_recent_deep_items_completed:
          DEEP_CLEAN_AUTO_TRIGGER.max_recent_deep_items_completed,
        max_departures: DEEP_CLEAN_AUTO_TRIGGER.max_departures,
      },
    });
  }

  if (elevatedCount > 0) {
    console.log(
      `[deep-clean-elevation] Elevated ${elevatedCount} draft(s) Standard -> Deep ` +
        `(Wednesday, ${departuresCount} departures, conds 4+5 active, cond 3 skipped pending Jennifer).`,
    );
  }

  return result;
}
