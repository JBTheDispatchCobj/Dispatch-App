import type { InboundEvent, TaskDraft } from "../types";

// Stub — returns no drafts until Jennifer's arrival rules doc lands.
export function arrivalsRule(_event: InboundEvent): TaskDraft[] {
  return [];
}
