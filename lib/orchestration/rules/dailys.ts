// lib/orchestration/rules/dailys.ts
//
// Da-430 (Dailys) auto-creation rule. One card per housekeeper per shift,
// triggered by a real `shift_start` inbound_event written when staff clocks
// in (Day 31 I.C Phase 3). The event itself is emitted by the SECURITY
// DEFINER trigger `staff_clock_in_event_trigger` on public.staff (see
// docs/supabase/staff_clock_in_event_trigger.sql); raw_payload carries
// `staff_id` + `staff_name`, which interpret() stamps onto the draft so the
// card is bound to its owner. The assignment-policies layer recognizes
// pre-assigned drafts and preserves them — the lane logic doesn't apply to
// dailys/eod because each card is owned by a specific housekeeper by
// construction.
//
// Pre-Phase-3 path: a synthesizer in run.ts wrote a `daily_shift` event per
// active staff row at the top of every cron cycle. Phase 3 dropped the
// synthesizer in favor of clockIn-driven events. Latency trade-off: cards
// now appear within one orchestrator cron interval of the staff member
// clocking in, rather than at the top of every cron cycle regardless of
// shift. Acceptable for beta.
//
// Card content (KB-driven daily/weekly/monthly tasks per Da-430 R10) is
// pending Jennifer's authoring pass per master plan VI.G. Until that
// content lands the card renders as a "Section pending — rules being
// authored" shell on the staff home; the rule scaffolding here is enough
// to make Da-430 cards appear in the dailys bucket on every clocked-in
// housekeeper's queue.

import type { GenerationRule } from "./types.ts";

export const dailyRules: GenerationRule[] = [
  {
    id: "dailys.standard",
    description: "Standard Da-430 dailys card per housekeeper per shift",
    trigger: { event_type: "shift_start" },
    output: { card_type: "dailys" },
    assignment: {
      role: "housekeeping",
      // staff_id flows through interpret() from raw_payload.staff_id on the
      // shift_start event. specific_member_id intentionally omitted —
      // assignment is per-event, not per-rule.
    },
    timing: {
      // Dailys execute through the day; nominal start matches the
      // stayover/arrival window since dailys interleave with those buckets.
      // No deadline — dailys complete by the EOD activation gate (E-430 R04).
      weekday_start: "11:00",
      weekend_start: "12:00",
    },
    priority: "medium",
    context_to_attach: [],
    notes:
      "Card content (daily/weekly/monthly tasks) pending Jennifer per master plan VI.G. Realtime task reassignment per Da-430 R04 lands separately (master plan IV.I).",
  },
];
