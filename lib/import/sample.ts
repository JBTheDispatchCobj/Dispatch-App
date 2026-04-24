function todayChicago(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Row layout (relative to today in America/Chicago):
// CONF-2026-001 — arrival  (checkin=today,   checkout=today+2)
// CONF-2026-002 — departure (checkin=today-2, checkout=today)
// CONF-2026-003 — stayover  (checkin=today-1, checkout=today+1)
// CONF-2026-001 duplicate   → intra-paste dedup
// CONF-2026-004 — future skip (checkin=today+1, checkout=today+3)
export function getSamplePaste(): string {
  const t0 = todayChicago();
  const tm2 = shiftDate(t0, -2);
  const tm1 = shiftDate(t0, -1);
  const tp1 = shiftDate(t0, 1);
  const tp2 = shiftDate(t0, 2);
  const tp3 = shiftDate(t0, 3);

  const rows: string[][] = [
    ["confirmation_number", "guest_name", "checkin_date", "checkout_date", "nights", "party_size", "room_number", "booking_source", "special_requests"],
    ["CONF-2026-001", "Alice Nguyen", t0,   tp2, "2", "2", "101", "Direct",      "Early check-in requested"],
    ["CONF-2026-002", "Bob Chen",     tm2,  t0,  "2", "1", "205", "Booking.com", ""],
    ["CONF-2026-003", "Carol Park",   tm1,  tp1, "2", "3", "312", "Expedia",     "Extra towels"],
    ["CONF-2026-001", "Alice Nguyen", t0,   tp2, "2", "2", "101", "Direct",      "Early check-in requested"],
    ["CONF-2026-004", "Dave Smith",   tp1,  tp3, "2", "2", "108", "Direct",      ""],
  ];

  return rows.map((cols) => cols.join("\t")).join("\n");
}
