// lib/reservations.ts
//
// Helpers for reading reservation data. Powers daily brief counts on staff
// home + admin home, plus guest fields on X-430 detail cards.
//
// Property timezone hardcoded to America/Chicago (Jennifer's Wisconsin
// property). Multi-property / per-property timezone is post-beta.
//
// Returns raw Supabase errors via thrown Error so callers can surface them
// in their own .error UI per the project convention.

import { supabase } from "./supabase";
import { PROPERTY_TIMEZONE } from "./dispatch-config";

// =============================================================================
// Types
// =============================================================================

export type ReservationStatus =
  | "confirmed"
  | "arrived"
  | "departed"
  | "cancelled"
  | "no_show";

export type ReservationSource = "resnexus" | "manual" | "walk_in";

export type Reservation = {
  id: string;
  external_id: string | null;
  source: ReservationSource;
  status: ReservationStatus;

  guest_name: string;
  party_size: number;
  adults: number;
  children: number;
  pets: number;
  vip: boolean;
  return_guest: boolean;
  guest_notes: string | null;
  special_requests: string[] | null;

  room_number: string;
  arrival_date: string; // YYYY-MM-DD
  departure_date: string; // YYYY-MM-DD
  arrival_time: string | null; // HH:MM:SS
  nights: number;

  raw_payload: unknown;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
};

// Statuses considered "live" for brief and detail-card queries.
// Cancelled / departed / no_show are filtered out.
const LIVE_STATUSES: ReservationStatus[] = ["confirmed", "arrived"];

// =============================================================================
// Property timezone helpers
// =============================================================================

// PROPERTY_TIMEZONE imported from ./dispatch-config (single source of truth).

/**
 * Today's date in the property's timezone as a YYYY-MM-DD string.
 * en-CA locale yields the ISO format directly.
 */
export function todayInPropertyTz(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PROPERTY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// =============================================================================
// Brief queries — today's arrivals, departures, stayovers
// =============================================================================

/** Reservations checking in today. */
export async function getTodaysArrivals(): Promise<Reservation[]> {
  const today = todayInPropertyTz();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("arrival_date", today)
    .in("status", LIVE_STATUSES)
    .order("arrival_time", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`getTodaysArrivals: ${error.message}`);
  return (data ?? []) as Reservation[];
}

/** Reservations checking out today. */
export async function getTodaysDepartures(): Promise<Reservation[]> {
  const today = todayInPropertyTz();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("departure_date", today)
    .in("status", LIVE_STATUSES)
    .order("room_number", { ascending: true });
  if (error) throw new Error(`getTodaysDepartures: ${error.message}`);
  return (data ?? []) as Reservation[];
}

/**
 * Reservations mid-stay today: checked in before today AND checking out
 * after today. Excludes today's arrivals and today's departures.
 */
export async function getTodaysStayovers(): Promise<Reservation[]> {
  const today = todayInPropertyTz();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .lt("arrival_date", today)
    .gt("departure_date", today)
    .in("status", LIVE_STATUSES)
    .order("room_number", { ascending: true });
  if (error) throw new Error(`getTodaysStayovers: ${error.message}`);
  return (data ?? []) as Reservation[];
}

/**
 * Counts only — three concurrent queries. Used by brief cards on staff home
 * and admin home where the full row data isn't needed.
 */
export async function getTodaysReservationCounts(): Promise<{
  arrivals: number;
  departures: number;
  stayovers: number;
}> {
  const [arrivals, departures, stayovers] = await Promise.all([
    getTodaysArrivals(),
    getTodaysDepartures(),
    getTodaysStayovers(),
  ]);
  return {
    arrivals: arrivals.length,
    departures: departures.length,
    stayovers: stayovers.length,
  };
}

// =============================================================================
// Detail-card queries — used by X-430 briefs (BR4)
// =============================================================================

/**
 * The single live reservation occupying a given room today, if any.
 * Used by S-430 (current guest brief) and the D-430 outgoing column.
 */
export async function getCurrentReservationForRoom(
  roomNumber: string,
): Promise<Reservation | null> {
  const today = todayInPropertyTz();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("room_number", roomNumber)
    .lte("arrival_date", today)
    .gte("departure_date", today)
    .in("status", LIVE_STATUSES)
    .order("arrival_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getCurrentReservationForRoom: ${error.message}`);
  return (data as Reservation | null) ?? null;
}

/**
 * The next-incoming reservation for a given room (arrival_date >= today).
 * Used by D-430 incoming column and A-430 brief.
 */
export async function getNextIncomingReservationForRoom(
  roomNumber: string,
): Promise<Reservation | null> {
  const today = todayInPropertyTz();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("room_number", roomNumber)
    .gte("arrival_date", today)
    .in("status", LIVE_STATUSES)
    .order("arrival_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`getNextIncomingReservationForRoom: ${error.message}`);
  }
  return (data as Reservation | null) ?? null;
}
