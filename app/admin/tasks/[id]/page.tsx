"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchProfile, type ProfileFetchFailure } from "@/lib/profile";
import {
  resolveAuthUser,
  redirectToLoginUnlessLocalDevBypass,
} from "@/lib/dev-auth-bypass";
import ProfileLoadError from "../../../profile-load-error";
import ReassignPanel from "@/components/admin/ReassignPanel";
import { taskEventType } from "@/lib/task-events";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type TaskBucket =
  | "arrivals"
  | "departures"
  | "stayovers"
  | "dailys"
  | "eod"
  | "start_of_day"
  | "maintenance";

/** Schema-aligned: tasks.priority enum is `low | medium | high` (per
 *  docs/supabase/tasks_priority.sql). The legacy 4-value mock array in this
 *  file (Low/Normal/High/Critical) was UI-only — never matched the DB
 *  constraint. Day 36 chase #1 wires writes; the chips conform to schema. */
type Priority = "low" | "medium" | "high";
type DotColor = "green" | "amber" | "red";

/**
 * Live shape of the task row backing this page. Projection of the columns
 * needed to drive the title, work-order line, meta grid (assignee/room/
 * bucket/status), priority chips, admin notes editor, and Save & Deploy.
 */
type LiveTask = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  card_type: string;
  room_number: string | null;
  assignee_name: string | null;
  staff_id: string | null;
  staff_name_join: string | null; // resolved from staff(name) embed
  context: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
  due_date: string | null;
  due_time: string | null;
};

/** Activity panel row — inline lighter shape than the unified
 *  ActivityFeedItem in lib/activity-feed.ts. We already know the task from
 *  context, so we drop the task join + severity classification. */
type ActivityPanelRow = {
  id: string;
  actor: string;
  text: string;
  timestamp: string;
};

/* ------------------------------------------------------------------ */
/* Bucket theme — drives dull-body, dull-header, dull-text, dull-text-on
   dull-text: text color on dull surfaces (panel heads, hero strip)
   dull-text-on: text inside elements filled with dull-text (CTAs, chips)
   ------------------------------------------------------------------ */

type BucketTheme = {
  body: string;
  header: string;
  text: string;
  textOn: string;
};

const BUCKET_THEME: Record<TaskBucket, BucketTheme> = {
  arrivals:     { body: "var(--arrivals-dull-body)",   header: "var(--arrivals-dull-header)",   text: "#5C3A00",            textOn: "var(--shell-cream)" },
  departures:   { body: "var(--departures-dull-body)", header: "var(--departures-dull-header)", text: "var(--shell-cream)",  textOn: "#1A3A30"            },
  stayovers:    { body: "var(--stayovers-dull-body)",  header: "var(--stayovers-dull-header)",  text: "var(--shell-cream)",  textOn: "var(--shell-cream)" },
  dailys:       { body: "var(--dailys-dull-body)",     header: "var(--dailys-dull-header)",     text: "#2C2040",             textOn: "var(--shell-cream)" },
  eod:          { body: "var(--eod-dull-body)",        header: "var(--eod-dull-header)",        text: "#5C2020",             textOn: "var(--shell-cream)" },
  // SOD + maintenance dull tokens are not in globals.css yet (master plan
  // II.G "dulled-color tokens" blocker). Fall back to the regular palette
  // tokens so the page still themes correctly per card_type.
  start_of_day: { body: "var(--sod-accent-pale)",      header: "var(--sod-accent)",             text: "#3B1F00",             textOn: "var(--shell-cream)" },
  maintenance:  { body: "var(--sage-body)",            header: "var(--sage-header)",            text: "var(--sage-text)",    textOn: "var(--shell-cream)" },
};

const BUCKET_LABEL: Record<TaskBucket, string> = {
  arrivals:     "ARRIVALS",
  departures:   "DEPARTURES",
  stayovers:    "STAYOVERS",
  dailys:       "DAILYS",
  eod:          "EOD",
  start_of_day: "SOD",
  maintenance:  "MAINTENANCE",
};

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: "low",    label: "Low"    },
  { key: "medium", label: "Medium" },
  { key: "high",   label: "High"   },
];

const SDOT_CLASS: Record<DotColor, string> = {
  green: styles.sdotGreen,
  amber: styles.sdotAmber,
  red:   styles.sdotRed,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Normalize a raw priority string from the DB to our 3-value enum. */
function normalizePriority(raw: string | null | undefined): Priority {
  if (raw === "low" || raw === "medium" || raw === "high") return raw;
  return "medium";
}

/** Bucket from context.staff_home_bucket with card_type fallback. Mirrors
 *  the partition logic in /admin/tasks. */
function bucketForTask(task: LiveTask): TaskBucket {
  if (task.card_type === "maintenance") return "maintenance";
  const ctx = task.context;
  const raw = ctx && typeof ctx === "object"
    ? (ctx as Record<string, unknown>).staff_home_bucket
    : null;
  if (typeof raw === "string") {
    if (
      raw === "arrivals" ||
      raw === "departures" ||
      raw === "stayovers" ||
      raw === "dailys" ||
      raw === "eod" ||
      raw === "start_of_day"
    ) {
      return raw;
    }
  }
  switch (task.card_type) {
    case "arrival":           return "arrivals";
    case "stayover":          return "stayovers";
    case "housekeeping_turn": return "departures";
    case "eod":               return "eod";
    case "dailys":            return "dailys";
    case "start_of_day":      return "start_of_day";
    default:                  return "dailys";
  }
}

/** Work-order line: "DEPARTURE · ROOM 33" */
function workOrderLine(task: LiveTask): string {
  const cardLabel = (() => {
    switch (task.card_type) {
      case "housekeeping_turn": return "DEPARTURE";
      case "arrival":           return "ARRIVAL";
      case "stayover":          return "STAYOVER";
      case "dailys":            return "DAILYS";
      case "eod":               return "EOD";
      case "start_of_day":      return "START OF DAY";
      case "maintenance":       return "MAINTENANCE";
      default:                  return task.card_type.toUpperCase();
    }
  })();
  if (task.room_number?.trim()) {
    return `${cardLabel} · ROOM ${task.room_number.trim()}`;
  }
  return cardLabel;
}

/** Status pill: dot color + human label. */
function statusPill(task: LiveTask): { label: string; dot: DotColor } {
  switch (task.status) {
    case "in_progress": return { label: "In progress", dot: "amber" };
    case "paused":      return { label: "Paused",      dot: "amber" };
    case "blocked":     return { label: "Blocked",     dot: "red"   };
    case "done":        return { label: "Done",        dot: "green" };
    case "open":
    default:            return { label: "Open",        dot: "green" };
  }
}

/** "10:15 AM" in property TZ. */
function formatTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour:   "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
  });
}

/** "10:15 AM by Courtney" — created line. */
function formatCreatedLine(iso: string, actor: string | null): string {
  const t = formatTimeOfDay(iso);
  return actor ? `${t} by ${actor}` : t;
}

/** Due display: "Wed · 3:30 PM" or "3:30 PM" or "—". */
function formatDueLine(date: string | null, time: string | null): string {
  if (!date && !time) return "—";
  if (date && time) {
    const iso = `${date}T${time.length === 5 ? `${time}:00` : time}`;
    const d = new Date(iso);
    const dPart = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Chicago" });
    const tPart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Chicago" });
    return `${dPart} · ${tPart}`;
  }
  if (date) return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return time ?? "—";
}

/** Verb mapping for activity panel. Inline (deliberate light duplication
 *  with lib/activity-feed.ts:TASK_EVENT_VERB — extracting a shared map can
 *  be a post-beta polish if the duplication starts hurting). */
const TASK_EVENT_VERB: Record<string, string> = {
  [taskEventType.cardOpened]:                 "opened the card",
  [taskEventType.cardPaused]:                 "paused the card",
  [taskEventType.cardResumed]:                "resumed the card",
  [taskEventType.commentAdded]:               "added a note",
  [taskEventType.checklistChecked]:           "checked an item",
  [taskEventType.checklistUnchecked]:         "unchecked an item",
  [taskEventType.statusChanged]:              "changed status",
  [taskEventType.imageAttached]:              "attached a photo",
  [taskEventType.markedDone]:                 "marked done",
  [taskEventType.reassigned]:                 "reassigned",
  [taskEventType.dueDateChanged]:             "changed due date",
  [taskEventType.noteReportCreated]:          "filed a report",
  [taskEventType.needsHelp]:                  "asked for help",
  [taskEventType.assignmentCrossHallOverride]:"got cross-hall override",
  [taskEventType.assignmentAboveStandardLoad]:"is above standard load",
  [taskEventType.reshuffleTierChanged]:       "tier changed",
};

function describeEvent(eventType: string, detail: Record<string, unknown> | null): string {
  if (eventType === taskEventType.statusChanged && detail) {
    const from = detail.from ? String(detail.from) : null;
    const to   = detail.to   ? String(detail.to)   : null;
    if (from && to) return `status: ${from} → ${to}`;
  }
  if (eventType === taskEventType.reassigned && detail) {
    const from = detail.from_staff_name ? String(detail.from_staff_name) : "Unassigned";
    const to   = detail.to_staff_name   ? String(detail.to_staff_name)   : "Unassigned";
    return `reassigned: ${from} → ${to}`;
  }
  return TASK_EVENT_VERB[eventType] ?? eventType;
}

/** Read context.admin_notes as a string. Returns "" when absent. */
function readAdminNotes(context: Record<string, unknown> | null): string {
  if (!context || typeof context !== "object") return "";
  const v = (context as Record<string, unknown>).admin_notes;
  return typeof v === "string" ? v : "";
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminTaskViewPage() {
  const [ready, setReady] = useState(false);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(null);

  // Live task + auxiliary state.
  const [task, setTask] = useState<LiveTask | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityPanelRow[]>([]);
  const [creatorName, setCreatorName] = useState<string | null>(null);

  // Editor state — local until Save & Deploy.
  const [priority, setPriority] = useState<Priority>("medium");
  const [adminNotes, setAdminNotes] = useState<string>("");

  // Save & Deploy lifecycle.
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  /**
   * Single full-task fetch — drives every panel except the activity log
   * (which has its own query). Joins staff(name) for assignee fallback so
   * the meta grid renders the right name even when assignee_name is stale.
   */
  const loadTask = useCallback(async () => {
    if (!id || id === "unknown") return;
    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id, title, status, priority, card_type, room_number, " +
        "assignee_name, staff_id, context, created_at, started_at, " +
        "paused_at, completed_at, due_date, due_time, created_by_user_id, " +
        "staff (name)",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) {
      setTaskError(error.message);
      return;
    }
    if (!data) {
      setTask(null);
      return;
    }

    const row = data as unknown as Record<string, unknown>;

    // Resolve embedded staff name (PostgREST may return array or object).
    const staffEmbed = row.staff as unknown;
    let embeddedName: string | null = null;
    if (Array.isArray(staffEmbed) && staffEmbed[0] && typeof staffEmbed[0] === "object") {
      embeddedName = (staffEmbed[0] as { name?: string }).name ?? null;
    } else if (staffEmbed && typeof staffEmbed === "object") {
      embeddedName = (staffEmbed as { name?: string }).name ?? null;
    }

    const ctx = (row.context && typeof row.context === "object" && !Array.isArray(row.context))
      ? (row.context as Record<string, unknown>)
      : null;

    const live: LiveTask = {
      id: String(row.id),
      title: String(row.title ?? ""),
      status: String(row.status ?? "open"),
      priority: typeof row.priority === "string" ? row.priority : null,
      card_type: String(row.card_type ?? "generic"),
      room_number: (row.room_number as string | null) ?? null,
      assignee_name: (row.assignee_name as string | null) ?? null,
      staff_id: (row.staff_id as string | null) ?? null,
      staff_name_join: embeddedName,
      context: ctx,
      created_at: String(row.created_at ?? ""),
      started_at: (row.started_at as string | null) ?? null,
      paused_at: (row.paused_at as string | null) ?? null,
      completed_at: (row.completed_at as string | null) ?? null,
      due_date: (row.due_date as string | null) ?? null,
      due_time: (row.due_time as string | null) ?? null,
    };
    setTask(live);
    setTaskError(null);

    // Hydrate editor state from the loaded row.
    setPriority(normalizePriority(live.priority));
    setAdminNotes(readAdminNotes(live.context));

    // Resolve the creator name (created_by_user_id → profiles.display_name).
    const createdById = row.created_by_user_id;
    if (typeof createdById === "string" && createdById) {
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", createdById)
        .maybeSingle();
      const dn = profileRow && typeof profileRow === "object"
        ? (profileRow as { display_name?: string | null }).display_name
        : null;
      setCreatorName(dn?.trim() || null);
    } else {
      setCreatorName(null);
    }
  }, [id]);

  /**
   * Activity panel — task_events for this task, joined to profiles for
   * actor display names. Per-task, lighter than the unified activity feed.
   */
  const loadActivity = useCallback(async () => {
    if (!id || id === "unknown") return;
    const { data, error } = await supabase
      .from("task_events")
      .select("id, user_id, event_type, detail, created_at")
      .eq("task_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.warn("[admin-task] task_events fetch failed:", error.message);
      setActivity([]);
      return;
    }
    const rows = (data ?? []) as Array<{
      id: string;
      user_id: string | null;
      event_type: string;
      detail: Record<string, unknown> | null;
      created_at: string;
    }>;
    if (rows.length === 0) {
      setActivity([]);
      return;
    }

    // Resolve actor display names in one shot.
    const userIds = Array.from(
      new Set(
        rows
          .map((r) => r.user_id)
          .filter((u): u is string => typeof u === "string" && u.length > 0),
      ),
    );
    const nameMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      for (const p of (profileRows ?? []) as Array<{ id: string; display_name: string | null }>) {
        if (p.display_name) nameMap[p.id] = p.display_name;
      }
    }

    setActivity(
      rows.map((r) => ({
        id: r.id,
        actor: r.user_id ? (nameMap[r.user_id] ?? "Staff") : "System",
        text: describeEvent(r.event_type, r.detail),
        timestamp: r.created_at ? formatTimeOfDay(r.created_at) : "",
      })),
    );
  }, [id]);

  // Auth gate.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      const user = resolveAuthUser(session);
      if (!user) {
        redirectToLoginUnlessLocalDevBypass();
        return;
      }
      const profileResult = await fetchProfile(supabase, user);
      if (cancelled) return;
      if (!profileResult.ok) {
        setProfileFailure(profileResult.failure);
        return;
      }
      if (profileResult.profile.role !== "admin") {
        window.location.replace("/");
        return;
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate task + activity once auth resolves.
  useEffect(() => {
    if (!ready) return;
    void loadTask();
    void loadActivity();
  }, [ready, loadTask, loadActivity]);

  /**
   * Save & Deploy — writes the local priority + admin notes back to the
   * task row in a single update. Merge-safe context write per CLAUDE.md
   * "tasks.context is JSONB" rule. No event log: tasks.priority has no
   * dedicated `priority_changed` event_type in the v1 vocabulary
   * (docs/TASK_EVENTS_CONTRACT.md); admin_notes lives in the JSONB blob and
   * is similarly out-of-vocabulary for v1. STATE.md tracks both as a
   * standing-tabled "v2 vocabulary widening" item.
   */
  async function handleSaveAndDeploy() {
    if (!task || saving) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const trimmed = adminNotes.trim();
    const nextContext = {
      ...(task.context ?? {}),
      admin_notes: trimmed,
    };
    const { error } = await supabase
      .from("tasks")
      .update({ priority, context: nextContext })
      .eq("id", task.id);
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setSaveSuccess(true);
    await loadTask();
  }

  if (profileFailure) return <ProfileLoadError failure={profileFailure} />;
  if (!ready) return null;

  if (id === "unknown") {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          Task not found.{" "}
          <Link href="/admin/tasks">Back to tasks</Link>
        </div>
      </div>
    );
  }

  if (!task) {
    if (taskError) {
      return (
        <div className={styles.page}>
          <div className="error" style={{ margin: 14 }}>{taskError}</div>
        </div>
      );
    }
    // Loading or row not found in DB.
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          Loading task…{" "}
          <Link href="/admin/tasks">Back to tasks</Link>
        </div>
      </div>
    );
  }

  const bucket    = bucketForTask(task);
  const theme     = BUCKET_THEME[bucket];
  const order     = workOrderLine(task);
  const sts       = statusPill(task);
  const createdLn = formatCreatedLine(task.created_at, creatorName);
  const dueLn     = formatDueLine(task.due_date, task.due_time);
  const assigneeName = task.staff_name_join?.trim() || task.assignee_name?.trim() || "Unassigned";

  return (
    <div className={styles.page}>
      <div
        className={styles.shell}
        style={{
          "--dull-body":    theme.body,
          "--dull-header":  theme.header,
          "--dull-text":    theme.text,
          "--dull-text-on": theme.textOn,
        } as React.CSSProperties}
      >
        {/* Hero strip */}
        <div className={styles.hero}>
          <div className={styles.heroLeft}>
            <span className={styles.heroBadge}>ADMIN VIEW</span>
            <span>{order}</span>
          </div>
          <button
            className={styles.closeBtn}
            aria-label="Close"
            onClick={() => router.back()}
          >
            &times;
          </button>
        </div>

        <div className={styles.body}>
          {/* Title */}
          <div className={styles.taskTitle}>{task.title || "(untitled)"}</div>
          <div className={styles.taskSub}>
            Created {createdLn} &middot; Due {dueLn}
          </div>

          {/* Meta grid */}
          <div className={styles.metaGrid}>
            <div>
              <div className={styles.metaLabel}>ASSIGNED TO</div>
              <div className={styles.metaVal}>
                <span className={styles.assigneeChip}>{assigneeName}</span>
              </div>
            </div>
            <div>
              <div className={styles.metaLabel}>ROOM</div>
              <div className={`${styles.metaVal} ${styles.metaValMono}`}>
                {task.room_number?.trim() || "—"}
              </div>
            </div>
            <div>
              <div className={styles.metaLabel}>BUCKET</div>
              <div className={`${styles.metaVal} ${styles.metaValMono} ${styles.metaValMonoSm}`}>
                {BUCKET_LABEL[bucket]}
              </div>
            </div>
            <div>
              <div className={styles.metaLabel}>CURRENT STATUS</div>
              <div className={styles.metaVal}>
                <span className={SDOT_CLASS[sts.dot]} />
                {sts.label}
              </div>
            </div>
          </div>

          {/* Priority panel — 3-value enum aligned to schema */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <span>PRIORITY</span>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.chipRow}>
                {PRIORITIES.map(({ key, label }) => {
                  const isActive = priority === key;
                  const isAlert = isActive && key === "high";
                  return (
                    <button
                      key={key}
                      className={[
                        styles.chip,
                        isActive ? styles.chipActive : null,
                        isAlert ? styles.chipAlert : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setPriority(key)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Admin notes panel — editable, persists to context.admin_notes */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <span>ADMIN NOTES</span>
              <span className={styles.panelHeadRight}>
                {creatorName ? `FROM ${creatorName.toUpperCase()}` : "ADMIN"}
              </span>
            </div>
            <div className={styles.panelBody}>
              <textarea
                className={styles.notesText}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Notes for staff — context, special handling, allergens, etc."
                rows={4}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 6,
                  padding: 8,
                  color: "inherit",
                  font: "inherit",
                  resize: "vertical",
                }}
              />
            </div>
          </div>

          {/* Activity panel — live task_events */}
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <span>ACTIVITY</span>
              <span className={styles.panelHeadRight}>
                {activity.length} EVENTS
              </span>
            </div>
            <div className={`${styles.panelBody} ${styles.panelBodyLog}`}>
              {activity.length === 0 ? (
                <div className={styles.logRow}>
                  <span className={styles.logDot} />
                  <div className={styles.logText}>No activity yet.</div>
                </div>
              ) : (
                activity.map((event) => (
                  <div key={event.id} className={styles.logRow}>
                    <span className={styles.logDot} />
                    <div className={styles.logText}>
                      <b>{event.actor}</b> {event.text}
                    </div>
                    <div className={styles.logTime}>{event.timestamp}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reassign panel — live, plumbed to reassignTask helper. */}
          {id && id !== "unknown" ? (
            <ReassignPanel
              taskId={id}
              currentStaffId={task.staff_id}
              currentStaffName={assigneeName === "Unassigned" ? null : assigneeName}
              onSuccess={async () => {
                await loadTask();
                await loadActivity();
              }}
            />
          ) : null}

          {/* Save & Deploy — writes priority + context.admin_notes */}
          {saveError && (
            <div className="error" style={{ marginTop: 8 }}>{saveError}</div>
          )}
          {saveSuccess && !saveError && (
            <div style={{ marginTop: 8, color: "#1F5C3C", fontSize: 13 }}>
              Saved.
            </div>
          )}
          <div className={styles.ctaPair}>
            <button
              className={styles.btnSecondary}
              onClick={() => router.back()}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className={styles.btnPrimary}
              onClick={handleSaveAndDeploy}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save & Deploy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
