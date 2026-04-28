import type { InboundEvent, TaskDraft } from "../types.ts";
import type { GenerationRule } from "./types.ts";

// Stub — returns no drafts until Jennifer's departure rules doc lands.
export function departuresRule(_event: InboundEvent): TaskDraft[] {
  return [];
}

export const departureRules: GenerationRule[] = [
  {
    id: 'departures.standard',
    description: 'Standard departure / housekeeping turn for a checking-out room',
    trigger: { event_type: 'departure' },
    output: { card_type: 'housekeeping_turn' },
    assignment: {
      role: 'housekeeping',
      // specific_member_id: [ASK JENNIFER]
    },
    timing: {
      // weekday_start: [ASK JENNIFER] — does departure cleaning have its own start time, or does it follow arrivals?
      // weekend_start: [ASK JENNIFER]
      // deadline: [ASK JENNIFER] — what time does a departure room need to be turned by?
      weekday_start: '11:00',  // placeholder — overwrite once Jennifer confirms
      weekend_start: '12:00',  // placeholder
    },
    priority: 'medium',
    priority_boost_if: 'arrival_scheduled_same_day',  // confirmed from KB
    // room_scope: [ASK JENNIFER]
    context_to_attach: [
      // [ASK JENNIFER] outgoing guest name? checkout time? length of stay just completed? flags?
    ],
    notes: '[ASK JENNIFER] Late-checkout handling — does the system adjust timing if guest checks out late, or is that manual?',
  },
];
