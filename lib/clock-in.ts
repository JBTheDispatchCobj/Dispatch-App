// lib/clock-in.ts
//
// Clock-In / Wrap Shift helpers (master plan I.C). Wraps the
// public.staff.clocked_in_at column added Day 30 in
// docs/supabase/staff_clocked_in_at.sql.
//
// Atomic single-column flip — null = clocked out, set = clocked in at that
// timestamp. Wrap Shift on E-430 nulls it.
//
// Day 31 I.C Phase 3: the column flip is also the source of truth for the
// orchestrator's shift_start / shift_end events. A SECURITY DEFINER trigger
// `staff_clock_in_event_trigger` on public.staff (see
// docs/supabase/staff_clock_in_event_trigger.sql) inserts the matching
// inbound_events row inside the same transaction, so this module stays a
// thin column-flipper. The browser client doesn't have permission to write
// inbound_events directly — the trigger is the cleanest way to get an
// atomic, RLS-correct event written from a browser-initiated action.
//
// What's NOT here:
// - Shift summary computation — Phase 4 (master plan III.J / VII.D).
//   Computed at clockOut time from task_events durations + the shift_start
//   / shift_end event pair.
// - 14-day segment view — Phase 4. Segments will be a view over clock-in/out
//   events, not a write.

import type { SupabaseClient } from "@supabase/supabase-js";

// =============================================================================
// Types
// =============================================================================

export type ClockInResult =
  | { ok: true; clockedInAt: string }
  | { ok: false; message: string };

export type ClockOutResult =
  | { ok: true }
  | { ok: false; message: string };

// =============================================================================
// Public API
// =============================================================================

/**
 * Mark the given staff member as clocked in right now. Writes
 * `clocked_in_at = now()` to public.staff. Idempotent at the DB level —
 * calling it twice just rewrites the timestamp to the second call's now.
 *
 * The caller is responsible for ensuring `staffId` matches the live
 * session user's staff record. RLS on public.staff prevents cross-staff
 * writes.
 *
 * Day 38: chains `.select()` after the update so we can detect zero-row
 * writes as a real failure. Without this, supabase-js returns
 * `error: null` whether the UPDATE matched 0 rows or 1, and we'd silently
 * flip local React state to "clocked in" while the DB row never changed —
 * meaning the `staff_clock_in_event_trigger` never fires, no shift_start
 * lands in inbound_events, the orchestrator never picks up the start,
 * and no tasks generate. The bucket deck then renders but stays empty.
 * That was the Day 37 SOD start-shift bug (chase #1).
 */
export async function clockIn(
  client: SupabaseClient,
  staffId: string,
): Promise<ClockInResult> {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("staff")
    .update({ clocked_in_at: now })
    .eq("id", staffId)
    .select("id, clocked_in_at");
  if (error) return { ok: false, message: error.message };
  const rows = (data ?? []) as Array<{ id: string; clocked_in_at: string | null }>;
  if (rows.length === 0) {
    return {
      ok: false,
      message:
        `Clock-in wrote 0 rows for staff_id ${staffId}. Check that ` +
        `public.staff has a row with this id and that this user has ` +
        `permission to update it.`,
    };
  }
  if (rows.length > 1) {
    return {
      ok: false,
      message: `Clock-in wrote ${rows.length} rows for staff_id ${staffId} (expected 1). Aborting.`,
    };
  }
  return { ok: true, clockedInAt: rows[0].clocked_in_at ?? now };
}

/**
 * Mark the given staff member as clocked out. Nulls clocked_in_at on
 * public.staff. Wrap Shift on E-430 calls this in Phase 2.
 *
 * Day 38: same `.select()` zero-row guard as clockIn. Existing call site
 * at app/staff/task/[id]/page.tsx already treats failure as fire-and-forget
 * (console.warn), so the new failure case surfaces as a warning rather
 * than blocking the wrap.
 */
export async function clockOut(
  client: SupabaseClient,
  staffId: string,
): Promise<ClockOutResult> {
  const { data, error } = await client
    .from("staff")
    .update({ clocked_in_at: null })
    .eq("id", staffId)
    .select("id");
  if (error) return { ok: false, message: error.message };
  const rows = (data ?? []) as Array<{ id: string }>;
  if (rows.length === 0) {
    return {
      ok: false,
      message:
        `Clock-out wrote 0 rows for staff_id ${staffId}. Check that ` +
        `public.staff has a row with this id and that this user has ` +
        `permission to update it.`,
    };
  }
  if (rows.length > 1) {
    return {
      ok: false,
      message: `Clock-out wrote ${rows.length} rows for staff_id ${staffId} (expected 1). Aborting.`,
    };
  }
  return { ok: true };
}

/**
 * Read the current clocked_in_at for a staff member. Returns the ISO
 * timestamp string if clocked in, null if clocked out, or undefined on
 * fetch failure.
 *
 * Returns undefined (not null) on fetch failure so callers can
 * distinguish "definitely clocked out" from "we don't know yet" — the
 * Pre-Clock-In gate uses this to avoid flashing the wrong screen on a
 * transient error.
 */
export async function fetchClockedInAt(
  client: SupabaseClient,
  staffId: string,
): Promise<string | null | undefined> {
  const { data, error } = await client
    .from("staff")
    .select("clocked_in_at")
    .eq("id", staffId)
    .maybeSingle();
  if (error) {
    console.warn("[clock-in] fetchClockedInAt failed:", error.message);
    return undefined;
  }
  if (!data) return null;
  const v = (data as { clocked_in_at: string | null }).clocked_in_at;
  return v ?? null;
}

// =============================================================================
// Phase 2b — Cross-staff EOD activation gate
// =============================================================================

export type CanWrapShiftResult = {
  /** True when no other clocked-in staff is blocking the wrap. */
  canWrap: boolean;
  /** Names of clocked-in staff who haven't started their EOD card yet. */
  blockedBy: string[];
};

/**
 * Master plan I.C — "EOD activation gate: locked until all other on-shift
 * housekeepers are in their EOD card." Returns the gate state for the
 * current staff member.
 *
 * Definition of "in their EOD card": at least one task with
 * `card_type='eod'` and `status != 'open'` created in the last 24h. The
 * 24h window keeps stale EOD rows from previous shifts out of the check.
 *
 * Fail-open: any fetch error returns `{ canWrap: true, blockedBy: [] }`.
 * For 4-staff beta, surfacing a Supabase error to the user inside an
 * already-failure-prone wrap-shift flow is worse than letting them
 * proceed. Admin override per master plan exception clause is the
 * intended escape hatch when the gate misbehaves.
 */
export async function canWrapShift(
  client: SupabaseClient,
  currentStaffId: string,
): Promise<CanWrapShiftResult> {
  const { data: othersRaw, error: othersErr } = await client
    .from("staff")
    .select("id, name")
    .not("clocked_in_at", "is", null)
    .neq("id", currentStaffId);
  if (othersErr) {
    console.warn(
      "[clock-in] canWrapShift others fetch failed:",
      othersErr.message,
    );
    return { canWrap: true, blockedBy: [] };
  }
  const others = (othersRaw ?? []) as Array<{ id: string; name: string }>;
  if (others.length === 0) {
    return { canWrap: true, blockedBy: [] };
  }

  const otherIds = others.map((s) => s.id);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: eodRaw, error: eodErr } = await client
    .from("tasks")
    .select("staff_id")
    .in("staff_id", otherIds)
    .eq("card_type", "eod")
    .neq("status", "open")
    .gte("created_at", since);
  if (eodErr) {
    console.warn(
      "[clock-in] canWrapShift tasks fetch failed:",
      eodErr.message,
    );
    return { canWrap: true, blockedBy: [] };
  }

  const inEod = new Set<string>();
  for (const t of (eodRaw ?? []) as Array<{ staff_id: string }>) {
    if (t.staff_id) inEod.add(t.staff_id);
  }

  const blockedBy = others
    .filter((s) => !inEod.has(s.id))
    .map((s) => s.name)
    .filter((n) => typeof n === "string" && n.trim().length > 0);

  return { canWrap: blockedBy.length === 0, blockedBy };
}
