import type { InboundEvent, TaskDraft } from "../types.ts";
import { arrivalsRule } from "./arrivals.ts";
import { departuresRule } from "./departures.ts";
import { stayoversRule } from "./stayovers.ts";

type RuleFn = (event: InboundEvent) => TaskDraft[];

const REGISTRY: Record<string, RuleFn> = {
  arrival: arrivalsRule,
  departure: departuresRule,
  stayover: stayoversRule,
};

export function dispatch(event: InboundEvent): TaskDraft[] {
  const rule = REGISTRY[event.event_type];
  if (!rule) {
    console.warn(
      `[orchestrator] No rule for event_type="${event.event_type}" — skipping event ${event.id}`,
    );
    return [];
  }
  return rule(event);
}

// ---------------------------------------------------------------------------
// Declarative rules layer — parallel to the function-based dispatch path.
// run.ts continues to use dispatch() above; this layer feeds the interpreter
// (next prompt) that turns GenerationRule[] + InboundEvent → TaskInsert[].
// ---------------------------------------------------------------------------

import { arrivalRules } from "./arrivals.ts";
import { departureRules } from "./departures.ts";
import { stayoverRules } from "./stayovers.ts";
import { dailyRules } from "./dailys.ts";
import { eodRules } from "./eod.ts";
import { maintenanceRules } from "./maintenance.ts";
import type { GenerationRule } from "./types.ts";

export const allRules: GenerationRule[] = [
  ...arrivalRules,
  ...departureRules,
  ...stayoverRules,
  ...dailyRules,
  ...eodRules,
  ...maintenanceRules,
];

export function getRulesForEvent(eventType: string): GenerationRule[] {
  return allRules.filter((r) => r.trigger.event_type === eventType);
}
