// lib/orchestration/rules/eod.ts
//
// E-430 (End of Day) auto-creation rule. One card per active housekeeper
// per shift, triggered by the same synthesized 'daily_shift' inbound_event
// the dailys rule consumes — each shift gets exactly one Dailys card and
// one EOD card per active staff row in a single fan-out pass.
//
// Activation gate per E-430 R04: the card is created at shift start but
// stays locked until every other on-shift card completes. The gating UI
// lives in app/staff/task/[id]/EODCard.tsx; this rule's job is just to
// make sure the card exists in the eod bucket so the gate has something
// to gate.
//
// Affirmation line (E-430 R06) and day-summary computations (E-430 R07-R12)
// depend on Jennifer's KB authoring pass + the Wave 4E real-data verticals
// (master plan VI.C + VII.A). The card renders as a shell on the staff
// home until those land.
//
// When master plan I.C clock-in flow ships and writes a real `shift_start`
// event per housekeeper, swap `event_type: 'daily_shift'` per the
// dailys.ts comment.

import type { GenerationRule } from "./types.ts";

export const eodRules: GenerationRule[] = [
  {
    id: "eod.standard",
    description: "Standard E-430 end-of-day card per active housekeeper per shift",
    trigger: { event_type: "daily_shift" },
    output: { card_type: "eod" },
    assignment: {
      role: "housekeeping",
      // staff_id flows through interpret() from raw_payload.staff_id on the
      // synthesized event (same shape as dailys.standard).
    },
    timing: {
      // EOD activation isn't time-of-day driven — the card is gated by
      // other-cards-complete (E-430 R04). These values are nominal only;
      // the card still sorts to the eod bucket regardless. Late-day
      // defaults so due_date sort places it last when bucket order falls
      // back to time.
      weekday_start: "16:00",
      weekend_start: "16:00",
    },
    priority: "low",
    context_to_attach: [],
    notes:
      "Activation gated by all-other-cards-complete (E-430 R04). Day summary, Affirmation, Note Review, and Supply Needs all pending Jennifer's KB authoring + Wave 4E (master plan VI.C / VII.A).",
  },
];
