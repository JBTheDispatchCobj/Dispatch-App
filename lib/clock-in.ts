// lib/clock-in.ts
//
// Clock-In / Wrap Shift helpers (master plan I.C). Wraps the
// public.staff.clocked_in_at column added Day 30 in
// docs/supabase/staff_clocked_in_at.sql.
//
// Atomic single-column flip — null = clocked out, set = clocked in at that
// timestamp. Wrap Shift on E-430 nulls it (Phase 2). The orchestrator
// rules for dailys.ts / eod.ts continue to use the daily_shift synthesizer
// for now; Phase 3 will swap them to consume real shift_start events
// emitted from clockIn.
//
// What's NOT here:
// - inbound_events 'shift_start' write — deferred to Phase 3 with the
//   orchestrator swap. Once that lands, clockIn writes one inbound_event
//   per call and the run.ts synthesizer can drop.
// - Shift summary computation — deferred to Phase 2 with the Wrap Shift
//   CTA on E-430. Computed at clockOut time from task_events durations.
// - 14-day segment write — deferred to Phase 4 (master plan III.J / VII.D).
//   Segments will be a view over clock-in/out timestamps, not a write.

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
 */
export async function clockIn(
  client: SupabaseClient,
  staffId: string,
): Promise<ClockInResult> {
  const now = new Date().toISOString();
  const { error } = await client
    .from("staff")
    .update({ clocked_in_at: now })
    .eq("id", staffId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, clockedInAt: now };
}

/**
 * Mark the given staff member as clocked out. Nulls clocked_in_at on
 * public.staff. Wrap Shift on E-430 calls this in Phase 2.
 */
export async function clockOut(
  client: SupabaseClient,
  staffId: string,
): Promise<ClockOutResult> {
  const { error } = await client
    .from("staff")
    .update({ clocked_in_at: null })
    .eq("id", staffId);
  if (error) return { ok: false, message: error.message };
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
