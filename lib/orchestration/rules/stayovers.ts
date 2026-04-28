import type { InboundEvent, TaskDraft } from "../types.ts";
import type { GenerationRule } from "./types.ts";

// Stub — returns no drafts until Jennifer's stayover rules doc lands.
export function stayoversRule(_event: InboundEvent): TaskDraft[] {
  return [];
}

export const stayoverRules: GenerationRule[] = [
  {
    id: 'stayovers.standard',
    description: 'Standard stayover service for a room continuing past today',
    trigger: { event_type: 'stayover' },
    output: { card_type: 'stayover' },
    assignment: {
      role: 'housekeeping',
      // specific_member_id: [ASK JENNIFER]
    },
    timing: {
      weekday_start: '11:00',  // confirmed from KB
      weekend_start: '12:00',  // confirmed from KB
      // deadline: [ASK JENNIFER] — none stated in KB; is there one?
    },
    priority: 'medium',  // default per KB; lower than arrivals and departures-with-arrivals
    // priority_boost_if: [ASK JENNIFER] — DND multiple days? guest request? long-stay?
    // room_scope: [ASK JENNIFER]
    context_to_attach: [
      // [ASK JENNIFER] guest_name? day_of_stay? scent/temperature preferences? standing requests?
    ],
    notes: '[ASK JENNIFER] DND handling — task created and flagged, or held back/skipped?',
  },
];
