// lib/orchestration/rules/eod.ts
//
// E-430 (End of Day) auto-creation rule. One card per housekeeper per shift,
// triggered by the same `shift_start` inbound_event the dailys rule consumes
// — each clock-in produces one Dailys card and one EOD card for that
// housekeeper, in a single dispatch pass over the event.
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
// Day 31 I.C Phase 3: trigger swapped from `daily_shift` (synthesized in
// run.ts) to `shift_start` (written by the staff_clock_in_event_trigger
// on public.staff). Behavior unchanged from interpret() / assignment-
// policies' perspective — the synthesizer used the same raw_payload shape
// (`staff_id` + `staff_name`) the trigger now writes.

import type { GenerationRule } from "./types.ts";

export const eodRules: GenerationRule[] = [
  {
    id: "eod.standard",
    description: "Standard E-430 end-of-day card per housekeeper per shift",
    trigger: { event_type: "shift_start" },
    output: { card_type: "eod" },
    assignment: {
      role: "housekeeping",
      // staff_id flows through interpret() from raw_payload.staff_id on the
      // shift_start event (same shape as dailys.standard).
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
