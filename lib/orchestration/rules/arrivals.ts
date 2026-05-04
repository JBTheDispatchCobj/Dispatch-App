import type { InboundEvent, TaskDraft } from "../types.ts";
import type { GenerationRule } from "./types.ts";

// Stub — returns no drafts until Jennifer's arrival rules doc lands.
export function arrivalsRule(_event: InboundEvent): TaskDraft[] {
  return [];
}

export const arrivalRules: GenerationRule[] = [
  {
    id: 'arrivals.standard',
    description: 'Standard arrival check for all rooms with an incoming guest today',
    trigger: { event_type: 'arrival' },
    output: { card_type: 'arrival' },
    assignment: {
      role: 'housekeeping',
    },
    timing: {
      weekday_start: '11:00',  // confirmed from KB
      weekend_start: '12:00',  // confirmed from KB
      deadline: '14:00',       // confirmed from KB ("All arrivals must be checked by 2pm")
    },
    priority: 'high',           // deadline-driven
    priority_boost_if: 'arrival_in_departing_room_same_day',  // [ASK JENNIFER] confirm exact wording
    // room_scope: [ASK JENNIFER] differs by room type (queen vs suite vs ADA)?
    context_to_attach: [
      // [ASK JENNIFER] which reservation fields flow in: guest_name? arrival_time? VIP? scent_pref? length_of_stay?
    ],
    notes: 'Triggered even if room cleaned today (per KB). Fires per arrival event.',
  },
];
