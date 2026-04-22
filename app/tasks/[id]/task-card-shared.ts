import { coerceBoolean } from "@/lib/coerce-boolean";

/** Supabase `.select()` fragment for card detail + execution screens. */
export const TASK_CARD_SELECT_FIELDS =
  "id, title, description, status, due_date, due_time, assignee_name, staff_id, priority, attachment_url, created_by_user_id, is_staff_report, report_category, report_queue_status, report_image_url, created_at, card_type, source, template_id, template_version, room_number, room_id, location_label, started_at, paused_at, completed_at, expected_duration_minutes, require_checklist_complete, context, staff (name)";

export type StaffEmbed = { name: string } | null;

export type TaskCard = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  due_time: string | null;
  assignee_name: string;
  staff_id: string | null;
  priority: string;
  attachment_url: string | null;
  created_by_user_id: string | null;
  is_staff_report: boolean;
  report_category: string | null;
  report_queue_status: string;
  report_image_url: string | null;
  created_at: string;
  staff: StaffEmbed;
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

export type CheckRow = {
  id: string;
  task_id: string;
  title: string;
  sort_order: number;
  done: boolean;
};

export type CommentRow = {
  id: string;
  task_id: string;
  user_id: string;
  author_display_name: string;
  body: string;
  image_url: string | null;
  checklist_item_id: string | null;
  created_at: string;
};

export type GuestContext = {
  guestName?: string;
  checkoutTime?: string;
  lateCheckout?: boolean;
  vip?: boolean;
  specialRequests?: string;
  notes?: string;
};

export function normalizeStaff(raw: unknown): StaffEmbed {
  if (Array.isArray(raw) && raw[0] && typeof raw[0] === "object") {
    const n = (raw[0] as { name?: string }).name;
    return n != null ? { name: String(n) } : null;
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const n = (raw as { name?: string }).name;
    return n != null ? { name: String(n) } : null;
  }
  return null;
}

function normalizeContext(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* ignore */
    }
  }
  return {};
}

export function normalizeTask(raw: Record<string, unknown>): TaskCard {
  const tv = raw.template_version;
  const ed = raw.expected_duration_minutes;
  return {
    id: String(raw.id),
    title: String(raw.title ?? ""),
    description:
      raw.description === null || raw.description === undefined
        ? null
        : String(raw.description),
    status: String(raw.status ?? "open"),
    due_date:
      raw.due_date === null || raw.due_date === undefined
        ? null
        : String(raw.due_date).slice(0, 10),
    due_time:
      raw.due_time === null || raw.due_time === undefined
        ? null
        : String(raw.due_time).slice(0, 5),
    assignee_name: String(raw.assignee_name ?? ""),
    staff_id:
      raw.staff_id === null || raw.staff_id === undefined
        ? null
        : String(raw.staff_id),
    priority: String(raw.priority ?? "medium"),
    attachment_url:
      raw.attachment_url === null || raw.attachment_url === undefined
        ? null
        : String(raw.attachment_url),
    created_by_user_id:
      raw.created_by_user_id === null || raw.created_by_user_id === undefined
        ? null
        : String(raw.created_by_user_id),
    is_staff_report: Boolean(raw.is_staff_report),
    report_category:
      raw.report_category === null || raw.report_category === undefined
        ? null
        : String(raw.report_category),
    report_queue_status: String(raw.report_queue_status ?? "none"),
    report_image_url:
      raw.report_image_url === null || raw.report_image_url === undefined
        ? null
        : String(raw.report_image_url),
    created_at: String(raw.created_at ?? ""),
    staff: normalizeStaff(raw.staff),
    card_type: String(raw.card_type ?? "housekeeping_turn"),
    source: String(raw.source ?? "manual"),
    template_id:
      raw.template_id === null || raw.template_id === undefined
        ? null
        : String(raw.template_id),
    template_version: (() => {
      if (tv === null || tv === undefined || tv === "") return null;
      const n = Number(tv);
      return Number.isFinite(n) ? n : null;
    })(),
    room_number:
      raw.room_number === null || raw.room_number === undefined
        ? null
        : String(raw.room_number),
    room_id:
      raw.room_id === null || raw.room_id === undefined
        ? null
        : String(raw.room_id),
    location_label:
      raw.location_label === null || raw.location_label === undefined
        ? null
        : String(raw.location_label),
    started_at:
      raw.started_at === null || raw.started_at === undefined
        ? null
        : String(raw.started_at),
    paused_at:
      raw.paused_at === null || raw.paused_at === undefined
        ? null
        : String(raw.paused_at),
    completed_at:
      raw.completed_at === null || raw.completed_at === undefined
        ? null
        : String(raw.completed_at),
    expected_duration_minutes: (() => {
      if (ed === null || ed === undefined || ed === "") return null;
      const n = Number(ed);
      return Number.isFinite(n) ? n : null;
    })(),
    require_checklist_complete: coerceBoolean(
      raw.require_checklist_complete,
      false,
    ),
    context: normalizeContext(raw.context),
  };
}

export function displayAssignee(t: TaskCard): string {
  const n = t.staff?.name?.trim();
  if (n) return n;
  return (t.assignee_name ?? "").trim();
}

export function checklistProgress(items: CheckRow[]): number {
  if (items.length === 0) return 0;
  const done = items.filter((i) => i.done).length;
  return Math.round((done / items.length) * 100);
}
