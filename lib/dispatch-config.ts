// lib/dispatch-config.ts
//
// Static reference data for Dispatch — single canonical source of every
// magic number, threshold, lookup table, and policy constant the rule
// engine and X-430 cards depend on.
//
// What goes here: STATIC DATA the spreadsheet rules-table specifies.
// What does NOT go here: assignment policy LOGIC (lives in
// lib/orchestration/assignment-policies.ts, item A) or per-card UI strings
// (those live in the React components).
//
// Spec source-of-truth: docs/kb/Dispatch — Rules Table for Card and
// Section Governance.xlsx (and Jennifer's Rules for HouseKeeping.docx.md
// for the D-430 time-target matrix). Each section below cites its row(s).
//
// Beta-only assumption: this is a TypeScript config file for now. Post-beta,
// these become Supabase tables editable via admin UI.
//
// Pure data + small lookup helpers. No runtime deps. No React. No Supabase.

import type { RoomType } from "./checklists/types";

// =============================================================================
// 1. Hall model — Hallway + Assignment R03–R05
// =============================================================================

export type HallId = "20s" | "30s" | "40s";

export const HALL_IDS: readonly HallId[] = ["20s", "30s", "40s"] as const;

/**
 * Ordered cart-traversal sequence per hall. Stations are either room
 * numbers (string) or named utility stops. Note: Room 43 (Suite) lives
 * in the 20s hall, not its own zone — easy to miss, called out in R03.
 */
export const HALL_SEQUENCES: Record<HallId, readonly string[]> = {
  "20s": ["43", "Supply Room", "21", "22", "23", "24", "25", "26", "27", "28", "29"],
  "30s": ["Laundry Room", "31", "32", "33", "34", "35", "36", "37", "38", "39"],
  "40s": ["Public Restroom", "41", "42"],
} as const;

/**
 * Two-cart constraint: at most this many halls can be actively staffed
 * simultaneously, property-wide. Hard cap. Doubling-up within a single
 * hall is allowed. R05.
 */
export const MAX_CONCURRENT_HALLS = 2;

/**
 * Derived: room number → hall id. Computed at module load from
 * HALL_SEQUENCES so HALL_SEQUENCES stays the single source of truth.
 * Utility stops (Supply Room, Laundry Room, Public Restroom) are not
 * room numbers and are skipped.
 */
export const ROOM_TO_HALL: Readonly<Record<string, HallId>> = (() => {
  const map: Record<string, HallId> = {};
  for (const hallId of HALL_IDS) {
    for (const station of HALL_SEQUENCES[hallId]) {
      // Numeric strings are rooms; everything else is a utility stop.
      if (/^\d+$/.test(station)) {
        map[station] = hallId;
      }
    }
  }
  return map;
})();

/** Returns the hall a room belongs to, or null if unmapped. */
export function getRoomHall(roomNumber: string | null | undefined): HallId | null {
  if (!roomNumber) return null;
  return ROOM_TO_HALL[roomNumber.trim()] ?? null;
}

// =============================================================================
// 2. Standard load thresholds — Hallway + Assignment R11
// =============================================================================

/**
 * Per-housekeeper standard load. Above-standard days trigger admin
 * notification (recurring daily until fulfilled per R11).
 */
export const STANDARD_LOAD_PER_HOUSEKEEPER = {
  departures: 5,
  stayovers: 10,
  dailys: 15,
} as const;

/**
 * Lighter load applies after this many consecutive working days. R11.
 */
export const CONSECUTIVE_DAYS_LOAD_REDUCTION_THRESHOLD = 5;

// =============================================================================
// 3. Departure priority stack — Hallway + Assignment R08
// =============================================================================

/**
 * Departure card priority by Departure Status, highest first. Drives
 * the within-hall sort order. Statuses are admin-set; staff sees only
 * the resulting priority. Card execution is locked until status >= "Open".
 */
export const DEPARTURE_STATUS_PRIORITY = [
  "Has Sheets",
  "Odobanned",
  "Stripped",
  "Open",
  "Checked Out",
] as const;

export type DepartureStatus = (typeof DEPARTURE_STATUS_PRIORITY)[number];

// =============================================================================
// 4. Departure cross-cutting bumps — Hallway + Assignment R09
// =============================================================================

/**
 * Bumps applied on top of the status-stack sort, in this order. Later
 * bumps do NOT override earlier ones. The actual condition predicates
 * live in lib/orchestration/assignment-policies.ts; this file just
 * records the order.
 */
export const DEPARTURE_BUMP_ORDER = [
  "same_day_arrival", // departure with same-day arrival jumps queue regardless of status
  "earlier_arrival_time", // earlier arrival time beats later
  "last_of_type_fallback", // last-of-type when no arrival flag
] as const;

export type DepartureBump = (typeof DEPARTURE_BUMP_ORDER)[number];

// =============================================================================
// 5. Timing windows — Hallway + Assignment R13–R15 + A-430 R05
// =============================================================================

/**
 * Stayovers and Arrivals begin at the same time-of-day. Earlier on
 * weekdays, later on weekends + holidays. Holiday calendar handling
 * is deferred — admin can shift the day's window per R13.
 */
export const STAYOVER_ARRIVAL_START = {
  weekday: "11:00",
  weekend: "12:00",
} as const;

/** All arrivals must be checked by this time. Hard deadline. R14 + A-430 R05. */
export const ARRIVAL_HARD_DEADLINE = "14:00";

/**
 * Pre-stayover reshuffle trigger time. Reorders queue to prioritize
 * stayovers + arrivals over remaining departures. Same time-of-day as
 * STAYOVER_ARRIVAL_START. R15.
 */
export const PRE_STAYOVER_RESHUFFLE_AT = STAYOVER_ARRIVAL_START;

/** JS Date.getUTCDay() values considered weekend. 0=Sun, 6=Sat. */
export const WEEKEND_DAY_NUMBERS: ReadonlySet<number> = new Set([0, 6]);

// =============================================================================
// 6. S-430 status time targets — S-430 R08
// =============================================================================

export type StayoverStatus =
  | "DND"
  | "Guest OK"
  | "Desk OK"
  | "Sheet Change"
  | "Done (Standard)"
  | "Done (Long-term/*)";

/**
 * Time target per Stayover Status. Tolerance is decimal (0.50 = ±50%).
 * - target: single-point target (e.g., 1 minute exactly)
 * - max: upper bound only (e.g., Guest OK ≤5 min)
 * - min/max: a window (e.g., Sheet Change 15–25 min)
 */
export type TimeTargetSpec = {
  target?: number;
  min?: number;
  max?: number;
  tolerance: number;
  unit: "min";
};

export const STAYOVER_STATUS_TIME_TARGETS: Record<StayoverStatus, TimeTargetSpec> = {
  "DND":               { target: 1, tolerance: 0.50, unit: "min" },
  "Guest OK":          { max: 5, tolerance: 0.30, unit: "min" },
  "Desk OK":           { target: 1, tolerance: 0.30, unit: "min" },
  "Sheet Change":      { min: 15, max: 25, tolerance: 0.25, unit: "min" },
  "Done (Standard)":   { min: 8, max: 15, tolerance: 0.30, unit: "min" },
  "Done (Long-term/*)":{ min: 3, max: 8, tolerance: 0.40, unit: "min" },
} as const;

// =============================================================================
// 7. D-430 weather temperature bands — D-430 R20 (also referenced from A-430 R15)
// =============================================================================

export type TemperatureBand = {
  /** Inclusive lower bound in °F; undefined = unbounded below. */
  min?: number;
  /** Exclusive upper bound in °F; undefined = unbounded above. */
  max?: number;
  setting: string;
};

/**
 * Weather-driven thermostat setting bands. Lookup is by 1pm–6pm average
 * temperature on the day of the card. Defaults to the 65–75 band if the
 * weather pull fails (held last known per R20 in production; this file
 * just owns the band data).
 */
export const TEMPERATURE_BANDS: readonly TemperatureBand[] = [
  { max: 45, setting: "Heat 68° / Auto" },
  { min: 45, max: 65, setting: "Heat 64° / Auto" },
  { min: 65, max: 75, setting: "Fan Auto / Off" },
  { min: 75, max: 90, setting: "Cool 70° / Auto" },
  { min: 90, setting: "Cool 67° / Auto" },
] as const;

/** Returns the band whose [min, max) bracket contains degreesF, or null. */
export function lookupTemperatureBand(degreesF: number): TemperatureBand | null {
  for (const band of TEMPERATURE_BANDS) {
    const overMin = band.min === undefined || degreesF >= band.min;
    const underMax = band.max === undefined || degreesF < band.max;
    if (overMin && underMax) return band;
  }
  return null;
}

// =============================================================================
// 8. Seasonal scent windows — D-430 R21 (also referenced from A-430 R16)
// =============================================================================

export type ScentWindow = {
  /** MM-DD inclusive start. */
  fromMonthDay: string;
  /** MM-DD inclusive end. May year-wrap (Fir Tree). */
  toMonthDay: string;
  scent: string;
};

/**
 * Year-round scent rotation. Default fallback is "Day Dream" (May 1–Sep 4).
 * Fir Tree's window wraps across New Year (Nov 11 → Jan 5).
 */
export const SEASONAL_SCENTS: readonly ScentWindow[] = [
  { fromMonthDay: "09-05", toMonthDay: "11-10", scent: "Apple Orchard" },
  { fromMonthDay: "11-11", toMonthDay: "01-05", scent: "Fir Tree" },
  { fromMonthDay: "01-06", toMonthDay: "04-30", scent: "The One" },
  { fromMonthDay: "05-01", toMonthDay: "09-04", scent: "Day Dream" },
] as const;

const DEFAULT_SCENT = "Day Dream";

/**
 * Returns the scent for the given date (or current date if omitted).
 * Falls back to "Day Dream" if no window matches (shouldn't happen with
 * the seed above, which is exhaustive — defensive only).
 */
export function lookupSeasonalScent(date?: Date): string {
  const d = date ?? new Date();
  const month = d.getMonth() + 1; // 1-indexed
  const day = d.getDate();
  const md = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  for (const window of SEASONAL_SCENTS) {
    const { fromMonthDay, toMonthDay } = window;
    const wraps = fromMonthDay > toMonthDay;
    if (!wraps) {
      if (md >= fromMonthDay && md <= toMonthDay) return window.scent;
    } else {
      if (md >= fromMonthDay || md <= toMonthDay) return window.scent;
    }
  }
  return DEFAULT_SCENT;
}

// =============================================================================
// 9. Card-level time targets
//
// Per-card target durations sourced from the spreadsheet's I'm Done /
// Wrap Shift / Start Shift rows. The D-430 matrix (Standard/Deep/Pet ×
// six room classes = 18 cells) lives in Jennifer's Rules for
// HouseKeeping.docx.md and is NOT in the spreadsheet — cells below
// are placeholders pending her authoring pass. See [ASK JENNIFER].
// =============================================================================

/** Tolerance assumed when Rules.md doesn't pin the value. */
const DEFAULT_TIME_TOLERANCE = 0.20;

/** Card-type-keyed targets that are fully spec'd in the spreadsheet. */
export const CARD_TIME_TARGETS: Readonly<Record<string, TimeTargetSpec>> = {
  // SOD-430 R22: Start Shift target 5–15 min, ±thresholds (assumed 0.20).
  start_of_day: { min: 5, max: 15, tolerance: DEFAULT_TIME_TOLERANCE, unit: "min" },
  // A-430 R26: I'm Done ≤5 min per room ±20%.
  arrival: { max: 5, tolerance: 0.20, unit: "min" },
  // Da-430 R10/R17: KB task time sum + 5-min card overhead, ±20%.
  // Stored as tolerance + overhead; per-task minutes come from the KB.
  dailys: { tolerance: 0.20, unit: "min" },
  // E-430 R13: Wrap Shift 10 min ±15%.
  eod: { target: 10, tolerance: 0.15, unit: "min" },
  // S-430 / D-430 not listed here — see STAYOVER_STATUS_TIME_TARGETS
  // (per-status) and DEPARTURE_TIME_TARGET_MATRIX (per-cell).
} as const;

/** Da-430 fixed card overhead added on top of the per-task KB sum. R10. */
export const DAILYS_CARD_OVERHEAD_MINUTES = 5;

/** Da-430 distribution rule. R13. ≥80% or ≤20% of team dailys → admin note. */
export const DAILYS_DISTRIBUTION_BOUNDS = { min: 0.20, max: 0.80 } as const;

/** Da-430 repeated-instance threshold. R10. */
export const DAILYS_REPEATED_INSTANCE_THRESHOLD = {
  count: 3,
  window_days: 30,
} as const;

// -----------------------------------------------------------------------------
// D-430 Standard/Deep/Pet × room-class time matrix
// -----------------------------------------------------------------------------

export type CleanType = "Standard" | "Deep" | "Pet";

/**
 * One cell of the D-430 time matrix.
 * - target_minutes: single-point target if specified
 * - target_min_minutes / target_max_minutes: range if specified
 * - tolerance: decimal (0.20 = ±20%)
 *
 * `null` means the cell is not yet authored. Consumers should treat null
 * cells as "no admin-note threshold fires" — the assignment-policies layer
 * is the place to enforce this guard.
 */
export type DepartureTimeTargetCell =
  | (TimeTargetSpec & { repeated_instance_threshold?: { count: number; window_days: number } })
  | null;

/**
 * Departure card time-target matrix: 3 clean types × 6 room classes = 18 cells.
 * Spec source: Jennifer's Rules for HouseKeeping.docx.md. Pending her
 * authoring pass — every cell currently null. Mirror of the project's
 * existing `[ASK JENNIFER]` convention used in lib/orchestration/rules/*.
 *
 * When Bryan/Jennifer fills these, replace each null with a TimeTargetSpec.
 * The lookup helper below tolerates nulls.
 */
export const DEPARTURE_TIME_TARGET_MATRIX: Readonly<
  Record<CleanType, Readonly<Record<RoomType, DepartureTimeTargetCell>>>
> = {
  Standard: {
    single_queen: null, // [ASK JENNIFER]
    double:       null, // [ASK JENNIFER]
    ada_double:   null, // [ASK JENNIFER]
    jacuzzi:      null, // [ASK JENNIFER]
    ada_jacuzzi:  null, // [ASK JENNIFER]
    suite:        null, // [ASK JENNIFER]
    unknown:      null, // never authored — fallback only
  },
  Deep: {
    single_queen: null, // [ASK JENNIFER]
    double:       null, // [ASK JENNIFER]
    ada_double:   null, // [ASK JENNIFER]
    jacuzzi:      null, // [ASK JENNIFER]
    ada_jacuzzi:  null, // [ASK JENNIFER]
    suite:        null, // [ASK JENNIFER]
    unknown:      null,
  },
  Pet: {
    single_queen: null, // [ASK JENNIFER]
    double:       null, // [ASK JENNIFER]
    ada_double:   null, // [ASK JENNIFER]
    jacuzzi:      null, // [ASK JENNIFER]
    ada_jacuzzi:  null, // [ASK JENNIFER]
    suite:        null, // [ASK JENNIFER]
    unknown:      null,
  },
} as const;

/** Returns the cell for a given clean × room class. Null if not authored. */
export function lookupDepartureTimeTarget(
  cleanType: CleanType,
  roomClass: RoomType,
): DepartureTimeTargetCell {
  return DEPARTURE_TIME_TARGET_MATRIX[cleanType]?.[roomClass] ?? null;
}

// =============================================================================
// 10. Time-between-card thresholds — Global Rules R06
// =============================================================================

/** Standard time between cards. Anything beyond this triggers thresholds. */
export const BETWEEN_CARDS_NORMAL_MINUTES = 1;

/** Per-shift allowance for breaks. Beyond these counts → admin note. */
export const BETWEEN_CARDS_ALLOWED_BREAKS = {
  five_min_count: 2,
  fifteen_min_count: 1,
} as const;

// =============================================================================
// 11. 14-day segment — Global Rules R07
// =============================================================================

/**
 * 14-day segment is anchored on Wednesday and runs through the second
 * Tuesday. JS Date.getUTCDay(): 0=Sun, 3=Wed.
 */
export const SEGMENT_ANCHOR_WEEKDAY = 3;
export const SEGMENT_LENGTH_DAYS = 14;

// =============================================================================
// 12. Wed-occupancy Deep Clean trigger — D-430 R26
// =============================================================================

/**
 * All four conditions must hold for a Standard departure to auto-elevate
 * to Deep on a Wednesday. R26.
 */
export const DEEP_CLEAN_AUTO_TRIGGER = {
  max_departures: 5,
  min_occupancy_pct: 40,
  lookback_days: 45,
  max_recent_deep_items_completed: 3,
} as const;

// =============================================================================
// 13. Property timezone — single source of truth
// =============================================================================

/**
 * Hardcoded for Jennifer's Wisconsin property. Multi-property timezone
 * is post-beta. Currently also referenced (string-literal duplicates) in
 * lib/import/actions.ts and lib/import/sample.ts — those should import
 * from here in a follow-up cleanup.
 */
export const PROPERTY_TIMEZONE = "America/Chicago";

// =============================================================================
// 14. Staff roster — primaries + hall preferences
//
// Per-staff flags consumed by lib/orchestration/assignment-policies.ts. Static
// for beta; promotes to Supabase admin-editable post-beta. Keys are lowercased
// staff names (matched case-insensitively at load time so casing/whitespace
// drift doesn't silently dis-flag a primary). If a staff member's display
// name changes, this map needs a corresponding edit — that's intentional;
// drift surfaces loudly rather than hiding.
//
// [ASK JENNIFER] — which two of Courtney/Lizzie/Angie/Mark are primaries
// today, and which primary takes 30s vs. 20s. Defaults below are
// alphabetical-first placeholders. Reversible one-line edits.
// =============================================================================

/**
 * Lowercased staff names that are designated primaries. Up to 2 entries per
 * Hallway + Assignment R06. Primaries handle stayovers + arrivals.
 */
export const STAFF_PRIMARY_NAMES: ReadonlySet<string> = new Set([
  "courtney", // [ASK JENNIFER]
  "lizzie",   // [ASK JENNIFER]
]);

/**
 * Preferred starting hall per staff member. Lowercased name keys. Used by
 * the primary-housekeeper lane (Hallway + Assignment R07) to seat each
 * primary in their default hall before fan-out. Non-primaries can be left
 * absent — they pick up overflow regardless of preferred hall.
 */
export const STAFF_PREFERRED_HALL: Readonly<Record<string, HallId>> = {
  courtney: "30s", // [ASK JENNIFER]
  lizzie:   "20s", // [ASK JENNIFER]
  angie:    "20s", // non-primary; overflow
  mark:     "30s", // non-primary; overflow
};
