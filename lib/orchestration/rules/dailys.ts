// lib/orchestration/rules/dailys.ts
//
// Da-430 (Dailys) auto-creation rule. One card per active housekeeper per
// shift, triggered by a synthesized 'daily_shift' inbound_event from the
// fan-out pre-pass in lib/orchestration/run.ts.
//
// Why a synthesized event instead of clock-in?
// Per master plan I.C, the clock-in flow is partial — there's no
// 'shift_start' event source today. The synthesized 'daily_shift' event
// is the option-2 unblocking path called out in master plan IV.F: bypass
// clock-in entirely and treat any active staff row as proxy for "scheduled
// today." Each synthesized event carries `staff_id` + `staff_name` in
// raw_payload, which interpret() stamps onto the draft so the card is
// bound to its owner. The assignment-policies layer recognizes pre-assigned
// drafts and preserves them — the lane logic doesn't apply to dailys/eod
// because each card is owned by a specific housekeeper by construction.
//
// Card content (KB-driven daily/weekly/monthly tasks per Da-430 R10) is
// pending Jennifer's authoring pass per master plan VI.G. Until that
// content lands the card renders as a "Section pending — rules being
// authored" shell on the staff home; the rule scaffolding here is enough
// to make Da-430 cards appear in the dailys bucket on every active
// housekeeper's queue.
//
// When master plan I.C clock-in flow ships and writes a real `shift_start`
// event per housekeeper, swap `event_type: 'daily_shift'` for
// `'shift_start'` and drop the synthesizer in run.ts.

import type { GenerationRule } from "./types.ts";

export const dailyRules: GenerationRule[] = [
  {
    id: "dailys.standard",
    description: "Standard Da-430 dailys card per active housekeeper per shift",
    trigger: { event_type: "daily_shift" },
    output: { card_type: "dailys" },
    assignment: {
      role: "housekeeping",
      // staff_id flows through interpret() from raw_payload.staff_id on the
      // synthesized event. specific_member_id intentionally omitted —
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
