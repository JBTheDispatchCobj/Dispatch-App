"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { activityType, logActivity } from "@/lib/activity-log";
import { supabase } from "@/lib/supabase";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  assignee_name: string;
};

export default function TasksSection() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function openEdit(t: TaskRow) {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditDescription(t.description ?? "");
    const rawDue = t.due_date ?? "";
    setEditDueDate(rawDue ? rawDue.slice(0, 10) : "");
    setEditAssignee(t.assignee_name ?? "");
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
      .select("id, title, description, status, due_date, assignee_name")
      .eq("status", "open")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (qError) {
      setError(qError.message);
      setTasks([]);
    } else {
      setTasks((data ?? []) as TaskRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    setError(null);
    const { error: insError } = await supabase.from("tasks").insert({
      title,
      status: "open",
    });
    setAdding(false);
    if (insError) {
      setError(insError.message);
      return;
    }
    setNewTitle("");
    void logActivity(activityType.taskCreated, `Task created: ${title}`);
    void load();
  }

  async function onComplete(id: string) {
    const t = tasks.find((x) => x.id === id);
    const label = t?.title ?? "Task";
    setBusyId(id);
    setError(null);
    const { error: upError } = await supabase
      .from("tasks")
      .update({ status: "complete" })
      .eq("id", id);
    setBusyId(null);
    if (upError) {
      setError(upError.message);
      return;
    }
    void logActivity(
      activityType.taskCompleted,
      `Task completed: ${label}`,
    );
    void load();
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId || savingEdit) return;
    const title = editTitle.trim();
    if (!title) return;
    setSavingEdit(true);
    setError(null);
    const { error: upError } = await supabase
      .from("tasks")
      .update({
        title,
        description: editDescription.trim() || null,
        due_date: editDueDate.trim() || null,
        assignee_name: editAssignee.trim(),
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

  return (
    <>
      <h2>Tasks</h2>
      <p className="tasks-lede">Open work</p>

      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <p className="tasks-muted">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="tasks-muted">No open tasks.</p>
      ) : (
        <ul className="tasks-list">
          {tasks.map((t) => (
            <li key={t.id} className="tasks-item">
              {editingId === t.id ? (
                <form className="tasks-edit-form" onSubmit={onSaveEdit}>
                  <label className="tasks-edit-label" htmlFor={`task-title-${t.id}`}>
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
                  <label className="tasks-edit-label" htmlFor={`task-due-${t.id}`}>
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
                    htmlFor={`task-assignee-${t.id}`}
                  >
                    Assignee
                  </label>
                  <input
                    id={`task-assignee-${t.id}`}
                    className="tasks-edit-input"
                    type="text"
                    value={editAssignee}
                    onChange={(e) => setEditAssignee(e.target.value)}
                    disabled={savingEdit}
                    placeholder="Name"
                  />
                  <div className="tasks-edit-actions">
                    <button type="submit" disabled={savingEdit || !editTitle.trim()}>
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
                    <span className="tasks-title">{t.title}</span>
                    {t.description ? (
                      <span className="tasks-desc">{t.description}</span>
                    ) : null}
                    {t.assignee_name.trim() || t.due_date ? (
                      <span className="tasks-meta">
                        {t.assignee_name.trim()
                          ? `Assigned: ${t.assignee_name.trim()}`
                          : ""}
                        {t.assignee_name.trim() && t.due_date ? " · " : ""}
                        {t.due_date ? `Due ${t.due_date}` : ""}
                      </span>
                    ) : null}
                  </div>
                  <div className="tasks-item-actions">
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
          ))}
        </ul>
      )}

      <form className="tasks-add-form" onSubmit={onAdd}>
        <input
          type="text"
          className="tasks-add-input"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New task title"
          disabled={adding || loading}
          aria-label="New task title"
        />
        <button type="submit" disabled={adding || loading || !newTitle.trim()}>
          {adding ? "Adding…" : "Add"}
        </button>
      </form>
    </>
  );
}
