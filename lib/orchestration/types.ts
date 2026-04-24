// NOTE: InboundEvent.created_at maps to the DB column `created_at` (spec calls it `received_at`).
// Kept as created_at here to match the actual schema in inbound_events_and_task_drafts.sql.

export type InboundEvent = {
  id: string;
  source: string;
  external_id: string;
  event_type: string;
  event_date: string; // YYYY-MM-DD
  raw_payload: Record<string, unknown>;
  created_at: string;
  processed_at: string | null;
};

// Insert shape for task_drafts — excludes auto-generated id, drafted_at, created_at.
// Rule functions return these; orchestrator sets source_event_id before inserting.
export type TaskDraft = {
  source_event_id: string | null;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  due_time: string | null;
  assignee_name: string;
  staff_id: string | null;
  priority: string;
  created_by_user_id: string | null;
  is_staff_report: boolean;
  report_category: string | null;
  report_queue_status: string;
  report_image_url: string | null;
  attachment_url: string | null;
  card_type: string;
  source: string;
  template_id: string | null;
  template_version: number | null;
  room_number: string | null;
  room_id: string | null;
  location_label: string | null;
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
  expected_duration_minutes: number | null;
  require_checklist_complete: boolean;
  context: Record<string, unknown>;
};
