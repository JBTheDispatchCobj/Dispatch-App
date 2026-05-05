// lib/orchestration/audit-events.ts
//
// Service-role audit-event writer used by the orchestrator pipeline
// (assignment-policies + reshuffle). Mirrors lib/task-events.ts logTaskEvent
// but accepts the client as a parameter so the orchestrator can pass its
// service-role client (lib/task-events.ts imports the browser supabase
// client from lib/supabase, which doesn't work server-side).
//
// All audit events are TASK-SCOPED — they carry a real task_id matching a
// row in public.tasks. The cross-hall-override and above-standard-load
// audits fire DURING assignment (before insert, when no task_id exists yet),
// so assignment-policies returns them as a `pendingAudits` side-channel and
// run.ts emits them after the bulk insert with the freshly-generated ids.
// reshuffle.ts emits inline because tier changes happen against existing
// task rows that already have ids.
//
// Spec: master plan III.D Phase 1 + docs/TASK_EVENTS_CONTRACT.md (3 new
// event_types: assignment_cross_hall_override, assignment_above_standard_load,
// reshuffle_tier_changed). Schema_version stays 1 — these are vocabulary
// additions, not a contract bump.
//
// Internal imports under lib/orchestration use .ts extensions for the Node
// orchestrator script (--experimental-strip-types).

import type { SupabaseClient } from "@supabase/supabase-js";
// Inlined to avoid pulling the browser Supabase client (lib/task-events.ts) into Node.
const TASK_EVENT_SCHEMA_VERSION = 1 as const;

// =============================================================================
// Types
// =============================================================================

/** Discriminated union of audit event kinds emitted by the orchestrator. */
export type AuditEventKind =
  | "assignment_cross_hall_override"
  | "assignment_above_standard_load"
  | "reshuffle_tier_changed";

/**
 * Pending audit signal emitted by assignment-policies during a pick. Held
 * in a per-batch side-channel until run.ts can pair it with a real task_id
 * (post bulk-insert) and call writeAuditEvent.
 *
 * `kind` discriminates which audit fired; `detail` holds the kind-specific
 * payload (matches the columns documented in TASK_EVENTS_CONTRACT.md for
 * that event_type, minus schema_version which writeAuditEvent injects).
 */
export type PendingAudit = {
  kind: AuditEventKind;
  detail: Record<string, unknown>;
};

/** Insert payload for writeAuditEvent. */
export type AuditEventInput = {
  /** Real task_id from public.tasks. Required — every audit event is task-scoped. */
  taskId: string;
  /** null for service-role-emitted events from the orchestrator. */
  userId: string | null;
  eventType: AuditEventKind;
  detail: Record<string, unknown>;
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Write a single audit event to public.task_events. Service-role-callable —
 * the orchestrator passes its own client. Failures log a warning and
 * return; audit events are fire-and-forget by design (the assignment /
 * reshuffle pass succeeds regardless).
 *
 * Detail keys are merged with schema_version. Caller is responsible for
 * providing the kind-specific keys per docs/TASK_EVENTS_CONTRACT.md.
 */
export async function writeAuditEvent(
  client: SupabaseClient,
  input: AuditEventInput,
): Promise<void> {
  const { error } = await client.from("task_events").insert({
    task_id: input.taskId,
    user_id: input.userId,
    event_type: input.eventType,
    detail: { ...input.detail, schema_version: TASK_EVENT_SCHEMA_VERSION },
  });
  if (error) {
    console.warn(
      `[audit-events] Failed to write ${input.eventType} for task ${input.taskId}:`,
      error.message,
    );
  }
}

/**
 * Bulk-write a batch of audit events. Sequential rather than parallel —
 * audit events at our shift scale are <50 per orchestrator run and we'd
 * rather see ordered failures in the console than race condition surprises.
 */
export async function writeAuditEvents(
  client: SupabaseClient,
  inputs: AuditEventInput[],
): Promise<void> {
  for (const input of inputs) {
    await writeAuditEvent(client, input);
  }
}
