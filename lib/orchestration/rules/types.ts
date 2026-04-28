import type { CardType, RoomType } from '@/lib/checklists/types';

export type GenerationRule = {
  id: string;                                    // 'arrivals.standard'
  description: string;                           // human-readable summary
  trigger: { event_type: string };               // matches inbound_events.event_type
  output: { card_type: CardType };
  assignment: {
    role: 'housekeeping' | 'frontdesk' | 'manager';
    specific_member_id?: string;                 // staff UUID if locked to one person
  };
  timing: {
    weekday_start: string;                       // 'HH:MM' 24h hotel-local
    weekend_start: string;
    deadline?: string;                           // 'HH:MM' or undefined
  };
  priority: 'low' | 'medium' | 'high';
  priority_boost_if?: string;                    // free-text condition for v1
  room_scope?: { types?: RoomType[]; numbers?: number[] };
  context_to_attach: string[];                   // reservation field paths
  notes?: string;                                // escape valve
};
