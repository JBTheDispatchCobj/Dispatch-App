import type { InboundEvent, TaskDraft } from "../types";

// Stub — returns no drafts until Jennifer's departure rules doc lands.
export function departuresRule(_event: InboundEvent): TaskDraft[] {
  return [];
}
