/**
 * Groups staff home tasks into execution sections. Uses only existing columns
 * (`card_type`, `context` jsonb). Optional context keys (no migration):
 *   staff_home_bucket | staff_bucket | flow
 * Values: departure | arrival | stayover | start_of_day (and short aliases).
 * Defaults to start_of_day when unset (typical housekeeping_turn cards).
 */

export type StaffHomeBucket =
  | "start_of_day"
  | "departures"
  | "arrivals"
  | "stayovers"
  | "eod"
  | "dailys";

export const STAFF_HOME_BUCKET_OPTIONS: ReadonlyArray<{
  value: StaffHomeBucket;
  label: string;
}> = [
  { value: "start_of_day", label: "Start of Day" },
  { value: "departures", label: "Departures" },
  { value: "arrivals", label: "Arrivals" },
  { value: "stayovers", label: "Stayovers" },
  { value: "eod", label: "End of Day" },
  { value: "dailys", label: "Dailys" },
];

function parseContext(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    try {
      const o = JSON.parse(raw) as unknown;
      return o && typeof o === "object" && !Array.isArray(o)
        ? (o as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function staffHomeBucketForTask(row: {
  card_type: string;
  context?: unknown;
}): StaffHomeBucket {
  const ctx = parseContext(row.context);
  const raw = String(
    ctx["staff_home_bucket"] ?? ctx["staff_bucket"] ?? ctx["flow"] ?? "",
  )
    .trim()
    .toLowerCase();

  if (
    raw === "departure" ||
    raw === "departures" ||
    raw === "checkout" ||
    raw === "d"
  ) {
    return "departures";
  }
  if (
    raw === "arrival" ||
    raw === "arrivals" ||
    raw === "checkin" ||
    raw === "a"
  ) {
    return "arrivals";
  }
  if (raw === "stayover" || raw === "stayovers" || raw === "s") {
    return "stayovers";
  }
  if (raw === "eod" || raw === "end_of_day") {
    return "eod";
  }
  if (raw === "dailys") {
    return "dailys";
  }
  if (
    raw === "start_of_day" ||
    raw === "sod" ||
    raw === "housekeeping" ||
    raw === "daily"
  ) {
    return "start_of_day";
  }

  const ct = (row.card_type ?? "").toLowerCase();
  if (ct.includes("departure")) return "departures";
  if (ct.includes("arrival")) return "arrivals";
  if (ct.includes("stayover") || ct.includes("stay_over")) {
    return "stayovers";
  }
  if (ct === "eod" || ct.includes("end_of_day")) {
    return "eod";
  }
  if (ct === "dailys" || ct === "daily") {
    return "dailys";
  }
  if (ct.includes("start_of_day") || ct.includes("sod")) {
    return "start_of_day";
  }

  return "start_of_day";
}

export function partitionStaffHomeTasks<
  T extends { card_type: string; context?: unknown },
>(tasks: T[]): Record<StaffHomeBucket, T[]> {
  const out: Record<StaffHomeBucket, T[]> = {
    start_of_day: [],
    departures: [],
    arrivals: [],
    stayovers: [],
    eod: [],
    dailys: [],
  };
  for (const t of tasks) {
    out[staffHomeBucketForTask(t)].push(t);
  }
  return out;
}
