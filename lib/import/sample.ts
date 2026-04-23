// Synthetic TSV anchored to 2026-04-23.
// Row 1: arrival (checkin today)
// Row 2: departure (checkout today)
// Row 3: stayover (checkin < today < checkout)
// Row 4: skip (future checkin — not relevant today)
// Row 5: duplicate of row 1 — tests dedup path
export const SAMPLE_PASTE = [
  "confirmation_number\tguest_name\tcheckin_date\tcheckout_date\tnights\tparty_size\troom_number\tbooking_source\tspecial_requests",
  "CONF-2026-001\tAlice Martin\t2026-04-23\t2026-04-25\t2\t2\t101\tDirect\tHigh floor preferred",
  "CONF-2026-002\tBob Chen\t2026-04-21\t2026-04-23\t2\t1\t205\tBooking.com\t",
  "CONF-2026-003\tCarol Davis\t2026-04-18\t2026-04-30\t12\t3\t312\tExpedia\tExtra pillows please",
  "CONF-2026-004\tDave Smith\t2026-04-25\t2026-04-28\t3\t2\t108\tDirect\t",
  "CONF-2026-001\tAlice Martin\t2026-04-23\t2026-04-25\t2\t2\t101\tDirect\tHigh floor preferred",
].join("\n");
