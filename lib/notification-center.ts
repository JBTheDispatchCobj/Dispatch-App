// lib/notification-center.ts
//
// Notification Center live-data layer. Fetches the property's notes /
// exception activity / maintenance issues / tasks and buckets them into the
// locked NC structure (4 masters → sub-tiles → items). Returns the SAME shape
// the NotificationCenter component renders.
//
// Mapping (signed off Day 55):
//   Incoming · Admin    ← notes type ∈ {Admin, Team, Change/Update, Needed, Employee}
//   Incoming · Guest    ← notes type ∈ {Guest Needs/Profile/Damage/Update}
//   Incoming · Supply   ← notes type = Supply
//   System              ← EXCEPTIONS only ("what needed admin intervention"):
//                         · Employee ← staff "needs help" flags
//                         · Schedule ← assignment overrides + reassignments
//                         · Today    ← blocked + high-priority tasks (+ deep-clean)
//                         The raw activity firehose is NOT here — it folds into
//                         the searchable View-all route (Region B). The staff
//                         roster is not a notification, so it left System (the
//                         Daily Brief's On-Shift count carries the summary).
//                         This tile becomes the real orchestration-agent
//                         exception feed once the agent is live (post-beta).
//   Maint    · Incoming ← maintenance_issues, unresolved (old Watchlist)
//   Maint    · Outgoing ← maintenance_issues, resolved
//   Outgoing · History  ← all admin-sent (manual) cards
//   Outgoing · Scheduled← manual cards still pending (light beta heuristic)

import type { SupabaseClient } from "@supabase/supabase-js";
import { getActivityFeed } from "./activity-feed";
import { taskEventType } from "./task-events";

export type MasterKey = "incoming" | "system" | "outgoing" | "maintenance";

export type NcItem = {
  id: string;
  title: string;
  authorName?: string;
  source?: string;
  noteBody?: string;
  metaCategory?: string;
  timeAgo?: string;
  hasImage?: boolean;
};

export type NcSub = { key: string; label: string };

export type NcMaster = {
  key: MasterKey;
  label: string;
  subTiles: NcSub[];
  items: Record<string, NcItem[]>;
};

const GUEST_NOTE_TYPES = new Set([
  "Guest Needs",
  "Guest Profile",
  "Guest Damage",
  "Guest Update",
]);

/** Task-event types that read as scheduling/assignment exceptions. */
const SCHEDULE_EXCEPTION_EVENTS = new Set<string>([
  taskEventType.assignmentCrossHallOverride,
  taskEventType.assignmentAboveStandardLoad,
  taskEventType.reassigned,
]);

function excerpt(s: string | null | undefined, max = 64): string {
  if (!s) return "";
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const min = Math.floor((Date.now() - then) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day} days ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Fixed 4-master / sub-tile skeleton with empty item buckets. */
function emptyMasters(): NcMaster[] {
  return [
    {
      key: "incoming",
      label: "Incoming",
      subTiles: [
        { key: "admin", label: "Admin" },
        { key: "guest", label: "Guest" },
        { key: "supply", label: "Supply" },
      ],
      items: { admin: [], guest: [], supply: [] },
    },
    {
      key: "system",
      label: "System",
      subTiles: [
        { key: "employee", label: "Employee" },
        { key: "schedule", label: "Schedule" },
        { key: "today", label: "Today" },
      ],
      items: { employee: [], schedule: [], today: [] },
    },
    {
      key: "outgoing",
      label: "Outgoing",
      subTiles: [
        { key: "history", label: "History" },
        { key: "scheduled", label: "Scheduled" },
      ],
      items: { history: [], scheduled: [] },
    },
    {
      key: "maintenance",
      label: "Maint",
      subTiles: [
        { key: "outgoing", label: "Outgoing" },
        { key: "incoming", label: "Incoming" },
      ],
      items: { outgoing: [], incoming: [] },
    },
  ];
}

type NoteRow = {
  id: string;
  body: string | null;
  image_url: string | null;
  note_type: string;
  note_status: string;
  note_assigned_to: string;
  author_display_name: string;
  room_number: string | null;
  card_type: string | null;
  created_at: string;
};

type MaintRow = {
  id: string;
  body: string | null;
  image_url: string | null;
  location: string;
  item: string;
  type: string;
  severity: string;
  author_display_name: string;
  room_number: string | null;
  created_at: string;
  resolved_at: string | null;
};

type TaskRow = {
  id: string;
  title: string | null;
  priority: string | null;
  status: string;
  room_number: string | null;
  assignee_name: string | null;
  due_date: string | null;
  created_at: string;
  context: Record<string, unknown> | null;
};

const TASK_SELECT =
  "id, title, priority, status, room_number, assignee_name, due_date, created_at, context";

export async function getNotificationCenterData(
  client: SupabaseClient,
): Promise<NcMaster[]> {
  const masters = emptyMasters();
  const inc = masters[0].items;
  const sys = masters[1].items;
  const out = masters[2].items;
  const mnt = masters[3].items;

  const [notesRes, exceptions, maintRes, critical, manualRes] =
    await Promise.all([
      client
        .from("notes")
        .select(
          "id, body, image_url, note_type, note_status, note_assigned_to, author_display_name, room_number, card_type, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(60),
      // System = exceptions: only critical/warn task-events (needs-help,
      // blocked status changes, assignment overrides, reassignments, deep-clean).
      getActivityFeed(client, {
        limit: 40,
        severityFilter: ["critical", "warn"],
        kindFilter: ["task_event"],
      }).catch(() => []),
      client
        .from("maintenance_issues")
        .select(
          "id, body, image_url, location, item, type, severity, author_display_name, room_number, created_at, resolved_at",
        )
        .order("created_at", { ascending: false })
        .limit(60),
      Promise.all([
        client
          .from("tasks")
          .select(TASK_SELECT)
          .eq("priority", "high")
          .neq("status", "done")
          .order("created_at", { ascending: false })
          .limit(15),
        client
          .from("tasks")
          .select(TASK_SELECT)
          .eq("status", "blocked")
          .order("created_at", { ascending: false })
          .limit(15),
      ]),
      client
        .from("tasks")
        .select(TASK_SELECT)
        .eq("source", "manual")
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

  // --- Notes → Incoming (Admin/Guest/Supply) + Maint/Incoming
  if (!notesRes.error && notesRes.data) {
    for (const r of notesRes.data as NoteRow[]) {
      const item: NcItem = {
        id: `note:${r.id}`,
        title: excerpt(r.body) || `[${r.note_type}]`,
        authorName: r.author_display_name || "Staff",
        source: r.room_number
          ? `RM ${r.room_number}`
          : r.card_type || r.note_assigned_to || undefined,
        noteBody: r.body || undefined,
        metaCategory: [r.note_type, r.note_assigned_to].filter(Boolean).join(" · "),
        timeAgo: timeAgo(r.created_at),
        hasImage: Boolean(r.image_url),
      };
      if (GUEST_NOTE_TYPES.has(r.note_type)) inc.guest.push(item);
      else if (r.note_type === "Supply") inc.supply.push(item);
      else if (r.note_type === "Maintenance") mnt.incoming.push(item);
      else inc.admin.push(item); // Admin / Team / Change-Update / Needed / Employee / fallback
    }
  }

  // --- Exception task-events → System (Employee / Schedule / Today)
  for (const ev of exceptions) {
    const bucket =
      ev.event_type === taskEventType.needsHelp
        ? sys.employee
        : ev.event_type && SCHEDULE_EXCEPTION_EVENTS.has(ev.event_type)
          ? sys.schedule
          : sys.today; // deep-clean + any other warn/critical task-event
    bucket.push({
      id: ev.id,
      title: ev.message,
      authorName: ev.actor_name,
      source: ev.related_room
        ? `RM ${ev.related_room}`
        : ev.related_task_title || undefined,
      metaCategory: ev.severity === "critical" ? "Needs attention" : "Exception",
      timeAgo: timeAgo(ev.created_at),
    });
  }

  // --- maintenance_issues → Maint/Incoming (open) + Maint/Outgoing (resolved)
  if (!maintRes.error && maintRes.data) {
    for (const r of maintRes.data as MaintRow[]) {
      const title = [r.location, r.item].filter(Boolean).join(" — ");
      const item: NcItem = {
        id: `mnt:${r.id}`,
        title: title || "Maintenance issue",
        authorName: r.author_display_name || "Staff",
        source: r.room_number ? `RM ${r.room_number}` : r.location || undefined,
        noteBody: r.body || [r.type, r.severity].filter(Boolean).join(" · "),
        metaCategory: [r.type, r.severity].filter(Boolean).join(" · "),
        timeAgo: timeAgo(r.created_at),
        hasImage: Boolean(r.image_url),
      };
      if (r.resolved_at) mnt.outgoing.push(item);
      else mnt.incoming.push(item);
    }
  }

  // --- high-priority + blocked tasks → System/Today (dedup across the 2 queries)
  const [highRes, blockedRes] = critical;
  const seenTodayIds = new Set<string>();
  const todayRows = [
    ...((highRes.data as TaskRow[] | null) ?? []),
    ...((blockedRes.data as TaskRow[] | null) ?? []),
  ];
  for (const r of todayRows) {
    if (seenTodayIds.has(r.id)) continue;
    seenTodayIds.add(r.id);
    const bucket =
      r.context && typeof r.context === "object"
        ? String(r.context.staff_home_bucket ?? "")
        : "";
    sys.today.push({
      id: `task:${r.id}`,
      title: r.title || "(untitled)",
      authorName: r.assignee_name || "Unassigned",
      source: r.room_number ? `RM ${r.room_number}` : bucket || undefined,
      metaCategory: r.status === "blocked" ? "Blocked" : "High priority",
      timeAgo: timeAgo(r.created_at),
    });
  }

  // --- manual (admin-sent) tasks → Outgoing/History (all) + Outgoing/Scheduled (pending)
  if (!manualRes.error && manualRes.data) {
    for (const r of manualRes.data as TaskRow[]) {
      const base: NcItem = {
        id: `task:${r.id}`,
        title: r.title || "(untitled)",
        authorName: r.assignee_name || "Team",
        source: r.room_number ? `RM ${r.room_number}` : undefined,
        metaCategory: `Sent · ${r.status || "open"}`,
        timeAgo: timeAgo(r.created_at),
      };
      out.history.push(base);
      // Scheduled = still pending (open) — light beta heuristic; evolves with the agent.
      if (r.status === "open") {
        out.scheduled.push({
          ...base,
          id: `sched:${r.id}`,
          metaCategory: "Scheduled",
        });
      }
    }
  }

  return masters;
}
