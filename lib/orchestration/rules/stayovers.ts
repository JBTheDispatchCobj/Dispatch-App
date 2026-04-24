import type { InboundEvent, TaskDraft } from "../types.ts";

// Stub — returns no drafts until Jennifer's stayover rules doc lands.
export function stayoversRule(_event: InboundEvent): TaskDraft[] {
  return [];
}
