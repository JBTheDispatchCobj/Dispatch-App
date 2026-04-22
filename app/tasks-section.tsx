"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { activityType, logActivity } from "@/lib/activity-log";
import {
  fetchAssignableStaffOptions,
  parseStaffRowId,
} from "@/lib/assignable-staff";
import {
  isLocalDevBypassAuthenticated,
  resolveAuthUser,
} from "@/lib/dev-auth-bypass";
import {
  STAFF_HOME_BUCKET_OPTIONS,
  type StaffHomeBucket,
} from "@/lib/staff-home-bucket";
import { supabase } from "@/lib/supabase";

type StaffEmbed = { name: string } | null;

export type TaskPriority = "low" | "medium" | "high";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  assignee_name: string;
  staff_id: string | null;
  priority: TaskPriority;
  staff: StaffEmbed;
  created_at: string;
  context: Record<string, unknown>;
};

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function displayAssigneeName(t: TaskRow): string {
  const fromStaff = t.staff?.name?.trim();
  if (fromStaff) return fromStaff;
  return (t.assignee_name ?? "").trim();
}

function normalizePriority(raw: unknown): TaskPriority {
  const p = String(raw ?? "medium").toLowerCase();
  if (p === "low" || p === "high") return p;
  return "medium";
}

function priorityLabel(p: TaskPriority): string {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function priorityClassName(p: TaskPriority): string {
  if (p === "high") return "tasks-priority-high";
  if (p === "low") return "tasks-priority-low";
  return "tasks-priority-medium";
}

const ACTIVE_STATUSES = ["open", "in_progress", "paused", "blocked"] as const;

function isActiveStatus(status: string): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

/** Active task with due_date before today is overdue. */
export function isOverdue(task: TaskRow, today: string): boolean {
  if (!isActiveStatus(task.status)) return false;
  const d = task.due_date?.slice(0, 10);
  if (!d) return false;
  return d < today;
}

function dueBucket(t: TaskRow, today: string): number {
  const d = t.due_date?.slice(0, 10) ?? "";
  if (!d) return 2;
  if (d < today) return 0;
  if (d === today) return 1;
  return 3;
}

function priorityRank(p: TaskPriority): number {
  if (p === "high") return 0;
  if (p === "low") return 2;
  return 1;
}

/** Overdue → today → no date → future; then high → medium → low; then oldest first. */
function sortOpenTasks(a: TaskRow, b: TaskRow, today: string): number {
  const ba = dueBucket(a, today);
  const bb = dueBucket(b, today);
  if (ba !== bb) return ba - bb;
  const pa = priorityRank(a.priority);
  const pb = priorityRank(b.priority);
  if (pa !== pb) return pa - pb;
  if (ba === 3) {
    const da = a.due_date!.slice(0, 10);
    const db = b.due_date!.slice(0, 10);
    if (da !== db) return da < db ? -1 : da > db ? 1 : 0;
  }
  const ca = new Date(a.created_at).getTime();
  const cb = new Date(b.created_at).getTime();
  return ca - cb;
}

function normalizeTaskRow(raw: Record<string, unknown>): TaskRow {
  const staffRaw = raw.staff;
  let staff: StaffEmbed = null;
  if (Array.isArray(staffRaw) && staffRaw[0] && typeof staffRaw[0] === "object") {
    const n = (staffRaw[0] as { name?: string }).name;
    staff = n != null ? { name: String(n) } : null;
  } else if (staffRaw && typeof staffRaw === "object" && !Array.isArray(staffRaw)) {
    const n = (staffRaw as { name?: string }).name;
    staff = n != null ? { name: String(n) } : null;
  }
  return {
    id: String(raw.id),
    title: String(raw.title ?? ""),
    description:
      raw.description === null || raw.description === undefined
        ? null
        : String(raw.description),
    status: String(raw.status ?? ""),
    due_date:
      raw.due_date === null || raw.due_date === undefined
        ? null
        : String(raw.due_date),
    assignee_name: String(raw.assignee_name ?? ""),
    staff_id:
      raw.staff_id === null || raw.staff_id === undefined
        ? null
        : String(raw.staff_id),
    priority: normalizePriority(raw.priority),
    staff,
    created_at: String(raw.created_at ?? ""),
    context:
      raw.context !== null &&
      raw.context !== undefined &&
      typeof raw.context === "object" &&
      !Array.isArray(raw.context)
        ? (raw.context as Record<string, unknown>)
        : {},
  };
}

function bucketLabel(ctx: Record<string, unknown>): string {
  const raw = String(ctx.staff_home_bucket ?? "").trim();
  const found = STAFF_HOME_BUCKET_OPTIONS.find((o) => o.value === raw);
  return found?.label ?? "";
}

function taskActivityMeta(assigneeName: string, priority: TaskPriority): string {
  const pr = `${priority} priority`;
  const a = assigneeName.trim();
  if (a) return ` (assigned to ${a}, ${pr})`;
  return ` (${pr})`;
}

export default function TasksSection() {
  const router = useRouter();
  const [today] = useState(() => localDateKey(new Date()));
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [staffOptions, setStaffOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [staffDirectoryEmpty, setStaffDirectoryEmpty] = useState(false);
  const [taskScope, setTaskScope] = useState<"today" | "all">("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newStaffId, setNewStaffId] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editStaffId, setEditStaffId] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("medium");
  const [savingEdit, setSavingEdit] = useState(false);
  const [staffListError, setStaffListError] = useState<string | null>(null);
  const [newBucket, setNewBucket] = useState<StaffHomeBucket | "">("");
  const [editBucket, setEditBucket] = useState<StaffHomeBucket>("start_of_day");
  const [editContext, setEditContext] = useState<Record<string, unknown>>({});

  const [newGuestName, setNewGuestName] = useState("");
  const [newCheckoutTime, setNewCheckoutTime] = useState("");
  const [newLateCheckout, setNewLateCheckout] = useState(false);
  const [newVip, setNewVip] = useState(false);
  const [newSpecialRequests, setNewSpecialRequests] = useState("");
  const [newGuestNotes, setNewGuestNotes] = useState("");

  const loadStaff = useCallback(async () => {
    setStaffListError(null);
    const result = await fetchAssignableStaffOptions(supabase);
    if (result.error) {
      setStaffOptions([]);
      setStaffDirectoryEmpty(false);
      setStaffListError(`Could not load staff list: ${result.error}`);
      if (process.env.NODE_ENV === "development") {
        console.warn("[tasks-section] staff query", result.error);
      }
      return;
    }
    setStaffOptions(result.options);
    setStaffDirectoryEmpty(result.options.length === 0);
    if (process.env.NODE_ENV === "development") {
      console.log("[tasks-section] staff options", {
        count: result.options.length,
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (process.env.NODE_ENV === "development") {
        console.log("[tasks-section] auth", {
          jwtUserId: session?.user?.id ?? null,
          resolvedUserId: resolveAuthUser(session)?.id ?? null,
          devBypass: isLocalDevBypassAuthenticated(),
        });
      }
      await loadStaff();
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[tasks-section] auth change", {
          jwtUserId: session?.user?.id ?? null,
        });
      }
      void loadStaff();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadStaff]);

  function openEdit(t: TaskRow) {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditDescription(t.description ?? "");
    const rawDue = t.due_date ?? "";
    setEditDueDate(rawDue ? rawDue.slice(0, 10) : "");
    setEditStaffId(t.staff_id ?? "");
    setEditPriority(t.priority);
    setEditContext(t.context);
    const rawBucket = t.context.staff_home_bucket;
    setEditBucket(
      STAFF_HOME_BUCKET_OPTIONS.some((o) => o.value === rawBucket)
        ? (rawBucket as StaffHomeBucket)
        : "start_of_day",
    );
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: qError } = await supabase
      .from("tasks")
      .select(
        "id, title, description, status, due_date, assignee_name, staff_id, priority, created_at, context, staff (name)",
      )
      .in("status", [...ACTIVE_STATUSES]);

    if (qError) {
      setError(qError.message);
      setTasks([]);
    } else {
      const rows = (data ?? []).map((r) =>
        normalizeTaskRow(r as Record<string, unknown>),
      );
      rows.sort((a, b) => sortOpenTasks(a, b, today));
      setTasks(rows);
    }
    setLoading(false);
  }, [today]);

  useEffect(() => {
    void load();
  }, [load]);

  function nameForStaffId(id: string): string {
    if (!id) return "";
    const key = id.trim().toLowerCase();
    return (
      staffOptions.find((s) => s.id.trim().toLowerCase() === key)?.name?.trim() ??
      ""
    );
  }

  function bucketToCardType(bucket: StaffHomeBucket): string {
    if (bucket === "eod") return "eod";
    if (bucket === "dailys") return "dailys";
    if (bucket === "departures") return "housekeeping_turn";
    if (bucket === "arrivals") return "arrival";
    if (bucket === "stayovers") return "stayover";
    return "generic";
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || !newBucket || adding) return;
    // Capture before any await so React state cannot drift during async work.
    const bucket: StaffHomeBucket = newBucket;
    const staffIdParsed = parseStaffRowId(newStaffId);
    const assigneeName = staffIdParsed
      ? nameForStaffId(staffIdParsed)
      : "";
    setAdding(true);
    setError(null);
    const {
      data: { session: insertSession },
    } = await supabase.auth.getSession();
    const createdByUserId = insertSession?.user?.id ?? null;
    const insertPayload = {
      title,
      status: "open",
      due_date: today,
      staff_id: staffIdParsed,
      assignee_name: assigneeName,
      priority: newPriority,
      created_by_user_id: createdByUserId,
      card_type: bucketToCardType(bucket),
      source: "manual",
      context: {
        staff_home_bucket: bucket,
        ...(bucket === "departures"
          ? {
              guest: {
                guestName: newGuestName.trim(),
                checkoutTime: newCheckoutTime.trim(),
                lateCheckout: newLateCheckout || undefined,
                vip: newVip || undefined,
                specialRequests: newSpecialRequests.trim(),
                notes: newGuestNotes.trim(),
              },
            }
          : {}),
      },
    };
    if (process.env.NODE_ENV === "development") {
      console.log("[tasks-section] create task", {
        payload: insertPayload,
        jwtUserId: insertSession?.user?.id ?? null,
        resolvedUserId: resolveAuthUser(insertSession)?.id ?? null,
        devBypass: isLocalDevBypassAuthenticated(),
      });
    }
    const { data: created, error: insError } = await supabase
      .from("tasks")
      .insert(insertPayload)
      .select("id, staff_id")
      .single();
    setAdding(false);
    if (insError) {
      setError(insError.message);
      return;
    }
    const newId = created?.id as string | undefined;
    const returnedStaffId = created?.staff_id as string | null | undefined;
    if (
      staffIdParsed &&
      newId &&
      (returnedStaffId === null ||
        returnedStaffId === undefined ||
        returnedStaffId !== staffIdParsed)
    ) {
      const { error: fixErr } = await supabase
        .from("tasks")
        .update({
          staff_id: staffIdParsed,
          assignee_name: assigneeName || nameForStaffId(staffIdParsed),
        })
        .eq("id", newId);
      if (fixErr) {
        setError(fixErr.message);
        return;
      }
    }
    setNewTitle("");
    setNewStaffId("");
    setNewPriority("medium");
    setNewBucket("");
    setNewGuestName("");
    setNewCheckoutTime("");
    setNewLateCheckout(false);
    setNewVip(false);
    setNewSpecialRequests("");
    setNewGuestNotes("");
    void logActivity(
      activityType.taskCreated,
      `Task created today: ${title}${taskActivityMeta(assigneeName, newPriority)}`,
    ).then(() => {
      window.dispatchEvent(new Event("activity:refresh"));
    });
    void load();
    if (newId) {
      router.push(`/tasks/${newId}`);
    }
  }

  async function onComplete(id: string) {
    const t = tasks.find((x) => x.id === id);
    const label = t?.title ?? "Task";
    const who = t ? displayAssigneeName(t) : "";
    const pri = t?.priority ?? "medium";
    setBusyId(id);
    setError(null);
    const { error: upError } = await supabase
      .from("tasks")
      .update({ status: "done" })
      .eq("id", id);
    setBusyId(null);
    if (upError) {
      setError(upError.message);
      return;
    }
    void logActivity(
      activityType.taskCompleted,
      `Task completed today: ${label}${taskActivityMeta(who, pri)}`,
    ).then(() => {
      window.dispatchEvent(new Event("activity:refresh"));
    });
    void load();
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId || savingEdit) return;
    const title = editTitle.trim();
    if (!title) return;
    const staffIdParsed = parseStaffRowId(editStaffId);
    const assigneeName = staffIdParsed
      ? nameForStaffId(staffIdParsed)
      : "";
    setSavingEdit(true);
    setError(null);
    const { error: upError } = await supabase
      .from("tasks")
      .update({
        title,
        description: editDescription.trim() || null,
        due_date: editDueDate.trim() || null,
        staff_id: staffIdParsed,
        assignee_name: assigneeName,
        priority: editPriority,
        context: { ...editContext, staff_home_bucket: editBucket },
      })
      .eq("id", editingId);
    setSavingEdit(false);
    if (upError) {
      setError(upError.message);
      return;
    }
    setEditingId(null);
    void load();
  }

  const visibleTasks =
    taskScope === "today"
      ? tasks.filter((t) => {
          const d = t.due_date?.slice(0, 10) ?? "";
          return !d || d === today || d < today;
        })
      : tasks;

  return (
    <>
      <h2>Tasks</h2>
      <p className="tasks-lede">
        {taskScope === "today"
          ? `Today (${today}) · open work`
          : "All active tasks"}
      </p>
      <div className="tasks-filter-row" role="group" aria-label="Task scope">
        <button
          type="button"
          className={
            taskScope === "today" ? "tasks-filter-on" : "outline tasks-filter-off"
          }
          onClick={() => setTaskScope("today")}
        >
          Today
        </button>
        <button
          type="button"
          className={
            taskScope === "all" ? "tasks-filter-on" : "outline tasks-filter-off"
          }
          onClick={() => setTaskScope("all")}
        >
          All
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {staffListError ? <p className="error">{staffListError}</p> : null}

      {loading ? (
        <p className="tasks-muted">Loading…</p>
      ) : visibleTasks.length === 0 ? (
        <p className="tasks-muted">
          {taskScope === "today"
            ? "Nothing due today, overdue, or undated."
            : "No active tasks."}
        </p>
      ) : (
        <ul className="tasks-list">
          {visibleTasks.map((t) => {
            const who = displayAssigneeName(t);
            const overdue = isOverdue(t, today);
            const bucket = bucketLabel(t.context);
            return (
              <li key={t.id} className="tasks-item">
                {editingId === t.id ? (
                  <form className="tasks-edit-form" onSubmit={onSaveEdit}>
                    <label
                      className="tasks-edit-label"
                      htmlFor={`task-title-${t.id}`}
                    >
                      Title
                    </label>
                    <input
                      id={`task-title-${t.id}`}
                      className="tasks-edit-input"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      disabled={savingEdit}
                      required
                    />
                    <label
                      className="tasks-edit-label"
                      htmlFor={`task-desc-${t.id}`}
                    >
                      Description
                    </label>
                    <textarea
                      id={`task-desc-${t.id}`}
                      className="tasks-edit-textarea"
                      rows={2}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      disabled={savingEdit}
                      placeholder="Optional"
                    />
                    <label
                      className="tasks-edit-label"
                      htmlFor={`task-due-${t.id}`}
                    >
                      Due date
                    </label>
                    <input
                      id={`task-due-${t.id}`}
                      className="tasks-edit-input"
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      disabled={savingEdit}
                    />
                    <label
                      className="tasks-edit-label"
                      htmlFor={`task-staff-${t.id}`}
                    >
                      Assign to staff
                    </label>
                    <select
                      id={`task-staff-${t.id}`}
                      className="tasks-edit-input"
                      value={editStaffId}
                      onChange={(e) => setEditStaffId(e.target.value)}
                      disabled={savingEdit}
                    >
                      <option value="">Unassigned</option>
                      {staffOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <label
                      className="tasks-edit-label"
                      htmlFor={`task-priority-${t.id}`}
                    >
                      Priority
                    </label>
                    <select
                      id={`task-priority-${t.id}`}
                      className="tasks-edit-input"
                      value={editPriority}
                      onChange={(e) =>
                        setEditPriority(normalizePriority(e.target.value))
                      }
                      disabled={savingEdit}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <label
                      className="tasks-edit-label"
                      htmlFor={`task-bucket-${t.id}`}
                    >
                      Where does this show up for staff?
                    </label>
                    <select
                      id={`task-bucket-${t.id}`}
                      className="tasks-edit-input"
                      value={editBucket}
                      onChange={(e) =>
                        setEditBucket(e.target.value as StaffHomeBucket)
                      }
                      disabled={savingEdit}
                      required
                    >
                      {STAFF_HOME_BUCKET_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <div className="tasks-edit-actions">
                      <button
                        type="submit"
                        disabled={savingEdit || !editTitle.trim()}
                      >
                        {savingEdit ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        className="outline"
                        disabled={savingEdit}
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="tasks-item-main">
                      <Link
                        href={`/tasks/${t.id}`}
                        className="tasks-title tasks-title-link"
                      >
                        {t.title}
                      </Link>
                      <div className="tasks-badges">
                        {overdue ? (
                          <span className="tasks-overdue">Overdue</span>
                        ) : null}
                        <span className={priorityClassName(t.priority)}>
                          {priorityLabel(t.priority)} priority
                        </span>
                        {bucket ? (
                          <span className="tasks-priority-low">{bucket}</span>
                        ) : null}
                      </div>
                      {t.description ? (
                        <span className="tasks-desc">{t.description}</span>
                      ) : null}
                      {who || t.due_date ? (
                        <span className="tasks-meta">
                          {who ? `Assigned to: ${who}` : ""}
                          {who && t.due_date ? " · " : ""}
                          {t.due_date ? `Due ${t.due_date}` : ""}
                        </span>
                      ) : null}
                    </div>
                    <div className="tasks-item-actions">
                      <Link
                        href={`/tasks/${t.id}`}
                        className="tasks-open-link"
                      >
                        View card
                      </Link>
                      <button
                        type="button"
                        className="outline tasks-edit-btn"
                        disabled={busyId === t.id}
                        onClick={() => openEdit(t)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="outline tasks-done"
                        disabled={busyId === t.id}
                        onClick={() => void onComplete(t.id)}
                      >
                        {busyId === t.id ? "…" : "Done"}
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <h3 className="tasks-add-heading">New card</h3>
      <form className="tasks-add-form" onSubmit={onAdd}>
        <div className="tasks-add-field">
          <label className="tasks-add-label" htmlFor="tasks-new-title">
            Title
          </label>
          <input
            id="tasks-new-title"
            type="text"
            className="tasks-add-input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Room 12 – Strip and remake"
            disabled={adding || loading}
            required
          />
        </div>
        <div className="tasks-add-field">
          <label className="tasks-add-label" htmlFor="tasks-new-assign">
            Assign to staff
          </label>
          <select
            id="tasks-new-assign"
            className="tasks-add-input"
            value={newStaffId}
            onChange={(e) => setNewStaffId(e.target.value)}
            disabled={adding || loading}
          >
            <option value="">— Unassigned —</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {staffDirectoryEmpty && !staffListError ? (
            <p className="tasks-muted tasks-staff-empty-hint" id="tasks-new-assign-hint">
              No <strong>active</strong> people in Staff yet, or all rows are
              Inactive. Add people in <strong>Staff</strong> below (status{" "}
              <strong>Active</strong>), then refresh.
            </p>
          ) : null}
        </div>
        <div className="tasks-add-field">
          <label className="tasks-add-label" htmlFor="tasks-new-priority">
            Priority
          </label>
          <select
            id="tasks-new-priority"
            className="tasks-add-input"
            value={newPriority}
            onChange={(e) =>
              setNewPriority(normalizePriority(e.target.value))
            }
            disabled={adding || loading}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="tasks-add-field">
          <label className="tasks-add-label" htmlFor="tasks-new-bucket">
            Where does this show up for staff?
          </label>
          <select
            id="tasks-new-bucket"
            className="tasks-add-input"
            value={newBucket}
            onChange={(e) => setNewBucket(e.target.value as StaffHomeBucket | "")}
            disabled={adding || loading}
            required
          >
            <option value="" disabled>— Choose bucket —</option>
            {STAFF_HOME_BUCKET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {newBucket === "departures" ? (
          <>
            <div className="tasks-add-field">
              <label className="tasks-add-label" htmlFor="tasks-new-guest-name">
                Guest name
              </label>
              <input
                id="tasks-new-guest-name"
                className="tasks-add-input"
                value={newGuestName}
                onChange={(e) => setNewGuestName(e.target.value)}
                disabled={adding || loading}
                placeholder="e.g. Smith"
              />
            </div>
            <div className="tasks-add-field">
              <label className="tasks-add-label" htmlFor="tasks-new-checkout-time">
                Check-out time
              </label>
              <input
                id="tasks-new-checkout-time"
                className="tasks-add-input"
                type="time"
                value={newCheckoutTime}
                onChange={(e) => setNewCheckoutTime(e.target.value)}
                disabled={adding || loading}
              />
            </div>
            <div className="tasks-add-field">
              <label className="tasks-add-label tasks-add-label--check">
                <input
                  type="checkbox"
                  checked={newLateCheckout}
                  onChange={(e) => setNewLateCheckout(e.target.checked)}
                  disabled={adding || loading}
                />
                Late check-out
              </label>
            </div>
            <div className="tasks-add-field">
              <label className="tasks-add-label tasks-add-label--check">
                <input
                  type="checkbox"
                  checked={newVip}
                  onChange={(e) => setNewVip(e.target.checked)}
                  disabled={adding || loading}
                />
                VIP guest
              </label>
            </div>
            <div className="tasks-add-field">
              <label className="tasks-add-label" htmlFor="tasks-new-special-requests">
                Special requests
              </label>
              <textarea
                id="tasks-new-special-requests"
                className="tasks-add-input"
                rows={2}
                value={newSpecialRequests}
                onChange={(e) => setNewSpecialRequests(e.target.value)}
                disabled={adding || loading}
                placeholder="e.g. Extra pillows"
              />
            </div>
            <div className="tasks-add-field">
              <label className="tasks-add-label" htmlFor="tasks-new-guest-notes">
                Guest notes
              </label>
              <textarea
                id="tasks-new-guest-notes"
                className="tasks-add-input"
                rows={2}
                value={newGuestNotes}
                onChange={(e) => setNewGuestNotes(e.target.value)}
                disabled={adding || loading}
                placeholder="Internal notes for housekeeping"
              />
            </div>
          </>
        ) : null}
        <button type="submit" disabled={adding || loading || !newTitle.trim() || !newBucket}>
          {adding ? "Creating…" : "Create card"}
        </button>
      </form>
    </>
  );
}
