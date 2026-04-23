export type ParsedReservation = {
  confirmation_number: string;
  guest_name: string;
  checkin_date: string;
  checkout_date: string;
  nights: number | null;
  party_size: number | null;
  room_number: string | null;
  booking_source: string | null;
  special_requests: string | null;
  event_type: "arrival" | "departure" | "stayover";
  event_date: string;
};

export type SkippedRow = {
  rawLine: string;
  reason: string;
};

export type ParseResult = {
  events: ParsedReservation[];
  skipped: SkippedRow[];
};

const HEADER_FIRST_COL = "confirmation_number";
const EXPECTED_COLUMNS = 9;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseIntOrNull(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function nullIfEmpty(s: string): string | null {
  const t = s.trim();
  return t === "" ? null : t;
}

export function parsePaste(raw: string, today: string): ParseResult {
  const events: ParsedReservation[] = [];
  const skipped: SkippedRow[] = [];

  const lines = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");

  let seenFirstLine = false;

  for (const line of lines) {
    if (!line.trim()) continue;

    // Skip header row (first non-empty line starting with the expected column name)
    if (!seenFirstLine) {
      seenFirstLine = true;
      if (line.trim().toLowerCase().startsWith(HEADER_FIRST_COL)) continue;
    }

    const cols = line.split("\t");
    if (cols.length < EXPECTED_COLUMNS) {
      skipped.push({
        rawLine: line,
        reason: `Expected ${EXPECTED_COLUMNS} columns, got ${cols.length}`,
      });
      continue;
    }

    const confirmation_number = cols[0].trim();
    const guest_name = cols[1].trim();
    const checkin_date = cols[2].trim();
    const checkout_date = cols[3].trim();
    const nights = parseIntOrNull(cols[4]);
    const party_size = parseIntOrNull(cols[5]);
    const room_number = nullIfEmpty(cols[6]);
    const booking_source = nullIfEmpty(cols[7]);
    // Join remaining cols in case special_requests itself contains tabs
    const special_requests = nullIfEmpty(cols.slice(8).join("\t"));

    if (!confirmation_number) {
      skipped.push({ rawLine: line, reason: "Missing confirmation_number" });
      continue;
    }
    if (!checkin_date || !checkout_date) {
      skipped.push({ rawLine: line, reason: "Missing checkin_date or checkout_date" });
      continue;
    }
    if (!ISO_DATE_RE.test(checkin_date) || !ISO_DATE_RE.test(checkout_date)) {
      skipped.push({
        rawLine: line,
        reason: `Invalid date format — expected YYYY-MM-DD, got checkin="${checkin_date}" checkout="${checkout_date}"`,
      });
      continue;
    }

    let event_type: "arrival" | "departure" | "stayover";
    // checkin_date takes priority over checkout_date for same-day edge cases
    if (checkin_date === today) {
      event_type = "arrival";
    } else if (checkout_date === today) {
      event_type = "departure";
    } else if (checkin_date < today && today < checkout_date) {
      event_type = "stayover";
    } else {
      skipped.push({ rawLine: line, reason: "Not relevant to today" });
      continue;
    }

    events.push({
      confirmation_number,
      guest_name,
      checkin_date,
      checkout_date,
      nights,
      party_size,
      room_number,
      booking_source,
      special_requests,
      event_type,
      event_date: today,
    });
  }

  return { events, skipped };
}
