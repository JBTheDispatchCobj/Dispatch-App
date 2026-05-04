// lib/orchestration/interpret.ts
//
// Rule-engine interpreter. Turns a GenerationRule + InboundEvent into a
// TaskDraft (or null if the rule doesn't apply to the event).
//
// This is the core of the automation arc. dispatch() in ./rules/index.ts
// reads allRules, filters by event_type, and runs each through interpret().
// Returned drafts are written by the run loop into task_drafts (dry-run,
// the AGENT_DRY_RUN default) or directly into tasks.

import type { InboundEvent, TaskDraft } from "./types.ts";
import type { GenerationRule } from "./rules/types.ts";

// =============================================================================
// Constants
// =============================================================================

// Days of week considered "weekend" for the weekday_start / weekend_start
// distinction. JS Date.getUTCDay(): 0=Sun, 6=Sat.
const WEEKEND_DAYS: ReadonlySet<number> = new Set([0, 6]);

const DEFAULT_STATUS = "open";
const DEFAULT_SOURCE = "agent"; // distinguishes rule-generated tasks from manual ones

// Verb prefix used to compose default task titles when the rule doesn't supply
// a richer title rendering hook. Best-effort; manager can edit post-creation.
const CARD_TITLE_VERB: Record<string, string> = {
  housekeeping_turn: "Turn over",
  arrival: "Prepare for",
  stayover: "Refresh",
  dailys: "Property round",
  eod: "End of day",
  maintenance: "Maintenance",
  general_report: "Report",
};

// card_type → staff_home_bucket (the JSONB key staff home reads from to bucket
// tasks). Set in context.staff_home_bucket on every generated draft.
const CARD_TYPE_TO_BUCKET: Record<string, string> = {
  housekeeping_turn: "departures",
  arrival: "arrivals",
  stayover: "stayovers",
  dailys: "dailys",
  eod: "eod",
  maintenance: "departures", // maintenance lives in the departures bucket pre-beta
  general_report: "start_of_day",
};

// =============================================================================
// Payload reading helpers
// =============================================================================

function readPayload<T = unknown>(
  payload: Record<string, unknown> | undefined,
  key: string,
): T | undefined {
  if (!payload) return undefined;
  const v = payload[key];
  return v === undefined ? undefined : (v as T);
}

function isWeekend(eventDate: string): boolean {
  // event_date is YYYY-MM-DD; parse as UTC noon to dodge DST edges.
  const d = new Date(`${eventDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return WEEKEND_DAYS.has(d.getUTCDay());
}

// =============================================================================
// Field derivers — pulled from event.raw_payload
// =============================================================================

function deriveRoom(event: InboundEvent): string | null {
  const raw = readPayload<string | number>(event.raw_payload, "room_number");
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  return s || null;
}

function deriveGuestName(event: InboundEvent): string | null {
  const name = readPayload<string>(event.raw_payload, "guest_name");
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  return trimmed || null;
}

function deriveTitle(rule: GenerationRule, event: InboundEvent): string {
  const verb = CARD_TITLE_VERB[rule.output.card_type] ?? "Task";
  const room = deriveRoom(event);
  const guest = deriveGuestName(event);

  // Arrivals lead with the guest name when available — that's how the artifact
  // greets ("Prepare for Katie Wilkins").
  if (rule.output.card_type === "arrival" && guest) {
    return `${verb} ${guest}${room ? ` (Room ${room})` : ""}`;
  }
  // Departures lead with the room number — staff thinks in rooms.
  if (room) {
    return `${verb} ${room}`;
  }
  // Fallback: rule description, else verb alone.
  return rule.description || verb;
}

function deriveDueTime(rule: GenerationRule, event: InboundEvent): string | null {
  // Prefer hard deadline when set (e.g., arrivals must be checked by 2pm).
  // Otherwise use the start-of-window time which differs weekday vs weekend.
  const hhmm = rule.timing.deadline
    ?? (isWeekend(event.event_date)
      ? rule.timing.weekend_start
      : rule.timing.weekday_start);
  return hhmm ? `${hhmm}:00` : null;
}

// =============================================================================
// Context derivation
// =============================================================================

function buildIncomingGuest(event: InboundEvent): Record<string, unknown> | null {
  const name = deriveGuestName(event);
  if (!name) return null;
  return {
    name,
    party_size: readPayload<number>(event.raw_payload, "party_size") ?? null,
    nights: readPayload<number>(event.raw_payload, "nights") ?? null,
    checkin_time: readPayload<string>(event.raw_payload, "arrival_time") ?? null,
    confirmation_number: readPayload<string>(event.raw_payload, "external_id") ?? null,
    special_requests:
      readPayload<string | string[]>(event.raw_payload, "special_requests") ?? null,
  };
}

function buildCurrentGuest(event: InboundEvent): Record<string, unknown> | null {
  const name = deriveGuestName(event);
  if (!name) return null;
  return {
    name,
    party_size: readPayload<number>(event.raw_payload, "party_size") ?? null,
    nights_remaining:
      readPayload<string | number>(event.raw_payload, "nights_remaining") ?? null,
    checkin_date: readPayload<string>(event.raw_payload, "arrival_date") ?? null,
    checkout_date: readPayload<string>(event.raw_payload, "departure_date") ?? null,
    special_requests:
      readPayload<string | string[]>(event.raw_payload, "special_requests") ?? null,
  };
}

function buildOutgoingGuest(event: InboundEvent): Record<string, unknown> | null {
  const name = deriveGuestName(event);
  if (!name && readPayload(event.raw_payload, "party_size") === undefined) {
    return null;
  }
  return {
    name,
    guests: readPayload<number>(event.raw_payload, "party_size") ?? null,
    nights: readPayload<number>(event.raw_payload, "nights") ?? null,
    clean_type: "Standard", // overridden by priority_boost_if logic later (deep clean, pet, etc.)
  };
}

function deriveContext(
  rule: GenerationRule,
  event: InboundEvent,
): Record<string, unknown> {
  const ctx: Record<string, unknown> = {};

  // Required for staff home bucketing.
  ctx.staff_home_bucket = CARD_TYPE_TO_BUCKET[rule.output.card_type] ?? "start_of_day";

  // Universal: room number when present.
  const room = deriveRoom(event);
  if (room) ctx.room_number = room;

  // Card-type-specific guest blocks.
  if (rule.output.card_type === "arrival") {
    const incoming = buildIncomingGuest(event);
    if (incoming) ctx.incoming_guest = incoming;
  } else if (rule.output.card_type === "stayover") {
    const current = buildCurrentGuest(event);
    if (current) ctx.current_guest = current;
  } else if (rule.output.card_type === "housekeeping_turn") {
    const outgoing = buildOutgoingGuest(event);
    if (outgoing) ctx.outgoing_guest = outgoing;
    // Departures-with-arrivals priority boost surfaces here too. The rule's
    // priority_boost_if is currently free-text [ASK JENNIFER]; once the
    // condition language firms up we'll evaluate it and stash an incoming
    // guest object as well.
  }

  // Honor explicit context_to_attach paths from the rule itself.
  for (const fieldName of rule.context_to_attach) {
    const v = readPayload(event.raw_payload, fieldName);
    if (v !== undefined) ctx[fieldName] = v;
  }

  return ctx;
}

// =============================================================================
// Conditions / scope checks
// =============================================================================

function passesRoomScope(rule: GenerationRule, event: InboundEvent): boolean {
  if (!rule.room_scope) return true;

  const roomStr = deriveRoom(event);
  const numbers = rule.room_scope.numbers;
  if (numbers && numbers.length > 0) {
    if (!roomStr) return false;
    const n = parseInt(roomStr, 10);
    if (Number.isNaN(n) || !numbers.includes(n)) return false;
  }

  // Type-based scope (rule.room_scope.types) requires reading
  // lib/checklists/rooms.ts — wire when the first rule actually uses it.
  // Treating "no number scope, no implementable type scope" as pass-through.

  return true;
}

// =============================================================================
// interpret() — the public entry point
// =============================================================================

/**
 * Turn a single rule + event into a TaskDraft, or return null if the rule
 * doesn't apply to this event. Doesn't write anything; the caller (dispatch)
 * collects drafts and the run loop writes them.
 */
export function interpret(
  rule: GenerationRule,
  event: InboundEvent,
): TaskDraft | null {
  // Trigger match — first gate.
  if (rule.trigger.event_type !== event.event_type) return null;

  // Room scope filter.
  if (!passesRoomScope(rule, event)) return null;

  // Build the draft.
  return {
    source_event_id: event.id,
    title: deriveTitle(rule, event),
    description: null,
    status: DEFAULT_STATUS,
    due_date: event.event_date,
    due_time: deriveDueTime(rule, event),
    // Pre-beta we leave the assignee unset and let admin claim it. Once
    // assignment_policies land, this becomes a lookup.
    assignee_name: rule.assignment.specific_member_id ?? "",
    staff_id: rule.assignment.specific_member_id ?? null,
    priority: rule.priority,
    created_by_user_id: null,
    is_staff_report: false,
    report_category: null,
    report_queue_status: "none", // task_drafts CHECK: 'none' | 'pending' | 'reviewed'
    report_image_url: null,
    attachment_url: null,
    card_type: rule.output.card_type,
    source: DEFAULT_SOURCE,
    template_id: null,
    template_version: null,
    room_number: deriveRoom(event),
    room_id: null,
    location_label: null,
    started_at: null,
    paused_at: null,
    completed_at: null,
    expected_duration_minutes: null,
    require_checklist_complete: false,
    context: deriveContext(rule, event),
  };
}
