import type { InboundEvent, TaskDraft } from "../types";
import { arrivalsRule } from "./arrivals";
import { departuresRule } from "./departures";
import { stayoversRule } from "./stayovers";

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
