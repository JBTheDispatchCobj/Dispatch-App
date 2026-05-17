// lib/admin-brief.ts
//
// Day 54 chase #6 — admin Daily Brief stat fetchers.
//
// Three of the six cells in the new 2x3 grid are sourced here:
//   · On Shift count       — public.staff with clocked_in_at IS NOT NULL
//   · Weather              — STUB (TODO: Google source integration)
//   · Town events          — STUB (TODO: Google source integration)
//
// Arrivals + Departures continue to come from lib/reservations.ts's
// existing getTodaysReservationCounts() helper.
//
// All three fetchers fail-soft: errors return a sensible default rather than
// throwing, so a transient Supabase or Google blip doesn't break the page.

import type { SupabaseClient } from "@supabase/supabase-js";

// =============================================================================
// On Shift
// =============================================================================

/**
 * Count staff currently clocked in (staff.clocked_in_at IS NOT NULL).
 * Returns 0 on fetch error.
 */
export async function getOnShiftCount(
  client: SupabaseClient,
): Promise<number> {
  const { data, error } = await client
    .from("staff")
    .select("id")
    .not("clocked_in_at", "is", null);
  if (error) {
    console.warn("[admin-brief] getOnShiftCount failed:", error.message);
    return 0;
  }
  return (data ?? []).length;
}

// =============================================================================
// Weather  ── STUB pending Google source
// =============================================================================

export type WeatherBrief = {
  temp_f: number | null;
  condition: string | null;
};

/**
 * Current weather for the property's location.
 *
 * TODO (post-beta): wire to Google Weather / Open-Meteo / NWS. For now
 * returns a stubbed value so the Daily Brief renders something believable
 * during the beta + demo phase. Property lat/lon will need to live in
 * dispatch-config.ts when the real source goes in.
 */
export async function getCurrentWeather(): Promise<WeatherBrief> {
  // STUB — replace with real source.
  return {
    temp_f: 72,
    condition: "Sunny",
  };
}

// =============================================================================
// Town events  ── STUB pending Google source
// =============================================================================

export type EventBrief = {
  headline: string | null;
  venue: string | null;
};

/**
 * Today's notable events in town (impacts hotel demand / staff awareness).
 *
 * TODO (post-beta): wire to Google Events / a city events feed. For now
 * returns a stubbed value matching the demo data so the brief reads
 * realistically.
 */
export async function getTownEventsToday(): Promise<EventBrief | null> {
  // STUB — replace with real source.
  return {
    headline: "Dueling Pianos",
    venue: "Balsam",
  };
}
