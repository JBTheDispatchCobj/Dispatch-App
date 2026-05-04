import type { InboundEvent, TaskDraft } from "../types.ts";
import { interpret } from "../interpret.ts";

import { arrivalRules } from "./arrivals.ts";
import { departureRules } from "./departures.ts";
import { stayoverRules } from "./stayovers.ts";
import { dailyRules } from "./dailys.ts";
import { eodRules } from "./eod.ts";
import { maintenanceRules } from "./maintenance.ts";
import type { GenerationRule } from "./types.ts";

// ---------------------------------------------------------------------------
// Declarative rules registry — single source of truth.
// Each rule file exports a typed GenerationRule[]. The interpreter at
// ../interpret.ts turns (rule, event) pairs into TaskDrafts.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// dispatch() — entry point used by run.ts.
// Reads allRules, filters by event_type, runs each match through interpret(),
// returns the resulting TaskDraft[]. A rule that fails its room_scope or other
// guard inside interpret() returns null and is filtered out.
// ---------------------------------------------------------------------------

export function dispatch(event: InboundEvent): TaskDraft[] {
  const matching = getRulesForEvent(event.event_type);
  if (matching.length === 0) {
    console.warn(
      `[orchestrator] No rule for event_type="${event.event_type}" — skipping event ${event.id}`,
    );
    return [];
  }

  const drafts: TaskDraft[] = [];
  for (const rule of matching) {
    const draft = interpret(rule, event);
    if (draft) drafts.push(draft);
  }
  return drafts;
}
