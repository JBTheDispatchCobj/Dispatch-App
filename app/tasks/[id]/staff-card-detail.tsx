"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { fetchMentionTargets, fetchProfile } from "@/lib/profile";
import {
  logTaskEvent,
  taskEventType,
  uploadTaskFile,
} from "@/lib/task-events";
import {
  redirectToLoginUnlessLocalDevBypass,
  resolveAuthUser,
} from "@/lib/dev-auth-bypass";
import { supabase } from "@/lib/supabase";
import {
  checklistProgress,
  displayAssignee,
  normalizeTask,
  TASK_CARD_SELECT_FIELDS,
  type CheckRow,
  type CommentRow,
  type TaskCard,
} from "./task-card-shared";

function formatDueTime(iso: string | null): string {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return iso;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function priorityUpper(p: string): string {
  return p.replace(/_/g, " ").toUpperCase();
}

export default function StaffCardDetail({ taskId }: { taskId: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [task, setTask] = useState<TaskCard | null>(null);
  const [checklist, setChecklist] = useState<CheckRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [mentionTargets, setMentionTargets] = useState<
    { id: string; display_name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const openedLogged = useRef(false);

  const [staffStatus, setStaffStatus] = useState("open");
  const [statusBusy, setStatusBusy] = useState(false);
  const [doneBusy, setDoneBusy] = useState(false);
  const [helpBusy, setHelpBusy] = useState(false);

  const [commentBody, setCommentBody] = useState("");
  const [commentCheckId, setCommentCheckId] = useState("");
  const [commentFile, setCommentFile] = useState<File | null>(null);
  const [commentBusy, setCommentBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = resolveAuthUser(session);
    if (!user) {
      redirectToLoginUnlessLocalDevBypass();
      return;
    }
    const profileResult = await fetchProfile(supabase, user);
    if (!profileResult.ok) {
      setError(profileResult.failure.message);
      setLoading(false);
      return;
    }
    const profile = profileResult.profile;
    setUserId(user.id);
    setDisplayName(profile.display_name);

    const { data: tRow, error: tErr } = await supabase
      .from("tasks")
      .select(TASK_CARD_SELECT_FIELDS)
      .eq("id", taskId)
      .maybeSingle();

    if (tErr || !tRow) {
      setError(tErr?.message ?? "Card not found or access denied.");
      setTask(null);
      setLoading(false);
      return;
    }

    const t = normalizeTask(tRow as Record<string, unknown>);
    setTask(t);
    setStaffStatus(t.status);

    const [{ data: ch }, { data: cm }, mt] = await Promise.all([
      supabase
        .from("task_checklist_items")
        .select("id, task_id, title, sort_order, done")
        .eq("task_id", taskId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("task_comments")
        .select(
          "id, task_id, user_id, author_display_name, body, image_url, checklist_item_id, created_at",
        )
        .eq("task_id", taskId)
        .order("created_at", { ascending: true }),
      fetchMentionTargets(supabase),
    ]);

    setChecklist((ch as CheckRow[]) ?? []);
    setComments((cm as CommentRow[]) ?? []);
    setMentionTargets(mt);

    if (!openedLogged.current) {
      openedLogged.current = true;
      void logTaskEvent(
        taskId,
        taskEventType.cardOpened,
        {},
        user.id,
      );
    }

    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) redirectToLoginUnlessLocalDevBypass();
    });
    return () => subscription.unsubscribe();
  }, []);

  async function onStatusChange(next: string) {
    if (!task || !userId) return;
    const prev = task.status;
    if (prev === next) return;
    setStatusBusy(true);
    setError(null);
    const { error: upErr } = await supabase
      .from("tasks")
      .update({ status: next })
      .eq("id", task.id);
    setStatusBusy(false);
    if (upErr) {
      setError(upErr.message);
      setStaffStatus(prev);
      return;
    }
    setStaffStatus(next);
    void logTaskEvent(
      task.id,
      taskEventType.statusChanged,
      { from: prev, to: next },
      userId,
    );
    await load();
  }

  async function onImDone() {
    if (!task || !userId) return;
    setDoneBusy(true);
    setError(null);
    const { error: upErr } = await supabase
      .from("tasks")
      .update({ status: "done" })
      .eq("id", task.id);
    if (upErr) {
      setError(upErr.message);
      setDoneBusy(false);
      return;
    }
    const { error: cErr } = await supabase.from("task_comments").insert({
      task_id: task.id,
      user_id: userId,
      author_display_name: displayName,
      body: "Marked done",
    });
    if (!cErr) {
      void logTaskEvent(
        task.id,
        taskEventType.commentAdded,
        { body: "Marked done" },
        userId,
      );
    }
    void logTaskEvent(task.id, taskEventType.markedDone, {}, userId);
    setDoneBusy(false);
    await load();
  }

  async function onNeedHelp() {
    if (!task || !userId) return;
    setHelpBusy(true);
    setError(null);
    const prev = task.status;
    const { error: cErr } = await supabase.from("task_comments").insert({
      task_id: task.id,
      user_id: userId,
      author_display_name: displayName,
      body: "Needs help",
    });
    if (cErr) {
      setError(cErr.message);
      setHelpBusy(false);
      return;
    }
    void logTaskEvent(
      task.id,
      taskEventType.commentAdded,
      { body: "Needs help" },
      userId,
    );

    if (prev !== "done" && prev !== "blocked") {
      const { error: upErr } = await supabase
        .from("tasks")
        .update({ status: "blocked" })
        .eq("id", task.id);
      if (!upErr) {
        void logTaskEvent(
          task.id,
          taskEventType.statusChanged,
          { from: prev, to: "blocked", reason: "needs_help" },
          userId,
        );
        void logTaskEvent(task.id, taskEventType.needsHelp, {}, userId);
      }
    } else {
      void logTaskEvent(task.id, taskEventType.needsHelp, {}, userId);
    }

    setHelpBusy(false);
    await load();
  }

  async function toggleCheckItem(row: CheckRow) {
    if (!task || !userId) return;
    const next = !row.done;
    const { error: upErr } = await supabase
      .from("task_checklist_items")
      .update({ done: next })
      .eq("id", row.id);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    void logTaskEvent(
      task.id,
      next ? taskEventType.checklistChecked : taskEventType.checklistUnchecked,
      { checklist_item_id: row.id, title: row.title },
      userId,
    );
    await load();
  }

  async function onPostComment(e: FormEvent) {
    e.preventDefault();
    if (!task || !userId) return;
    const body = commentBody.trim();
    if (!body && !commentFile) return;
    setCommentBusy(true);
    setError(null);
    let imageUrl: string | null = null;
    if (commentFile) {
      const up = await uploadTaskFile(userId, commentFile);
      if (!up) {
        setError("Image upload failed.");
        setCommentBusy(false);
        return;
      }
      imageUrl = up.publicUrl;
    }
    const { error: insErr } = await supabase.from("task_comments").insert({
      task_id: task.id,
      user_id: userId,
      author_display_name: displayName,
      body: body || "(image)",
      image_url: imageUrl,
      checklist_item_id: commentCheckId || null,
    });
    setCommentBusy(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    void logTaskEvent(
      task.id,
      taskEventType.commentAdded,
      { has_image: Boolean(imageUrl), checklist_item_id: commentCheckId || null },
      userId,
    );
    if (imageUrl) {
      void logTaskEvent(
        task.id,
        taskEventType.imageAttached,
        { url: imageUrl, scope: "comment" },
        userId,
      );
    }
    setCommentBody("");
    setCommentFile(null);
    setCommentCheckId("");
    await load();
  }

  if (loading) {
    return (
      <main className="staff-card-page staff-card-page--loading">
        <p className="loading-line">Loading…</p>
      </main>
    );
  }

  if (error && !task) {
    return (
      <main className="staff-card-page staff-card-page--loading">
        <p className="error">{error}</p>
        <Link href="/staff" className="staff-card-back">
          Back
        </Link>
      </main>
    );
  }

  if (!task) return null;

  const progress = checklistProgress(checklist);
  const who = displayAssignee(task);
  const done = task.status === "done";
  const descLines =
    task.description
      ?.split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0) ?? [];
  const subtitleLine = descLines.length > 1 ? descLines[0] : null;
  const descriptionBody =
    descLines.length > 1
      ? descLines.slice(1).join("\n\n")
      : descLines[0] ?? "";

  return (
    <main className="staff-card-page">
      <div className="staff-card-body-scroll">
      <header className="staff-card-topbar">
        <Link href="/staff" className="staff-card-back">
          ← Tasks
        </Link>
      </header>

      {error ? <p className="error staff-card-error">{error}</p> : null}

      <section className="staff-card-hero">
        <p className="staff-card-field-label">Assigned to</p>
        <p className="staff-card-assignee-name">{who || "—"}</p>
        <h1 className="staff-card-title">{task.title}</h1>
        {subtitleLine ? (
          <p className="staff-card-subtitle">{subtitleLine}</p>
        ) : null}
        <div className="staff-card-meta">
          <div>
            <span className="staff-card-field-label">Due date</span>
            <span className="staff-card-field-value">
              {task.due_date || "—"}
            </span>
          </div>
          <div>
            <span className="staff-card-field-label">Due time</span>
            <span className="staff-card-field-value">
              {formatDueTime(task.due_time)}
            </span>
          </div>
          <div>
            <span className="staff-card-field-label">Status</span>
            <select
              className="staff-card-select"
              value={staffStatus}
              disabled={statusBusy || done}
              onChange={(e) => void onStatusChange(e.target.value)}
            >
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="paused">Paused</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <span className="staff-card-field-label">Priority</span>
            <span
              className={`staff-card-field-value staff-priority staff-priority--${task.priority}`}
            >
              {priorityUpper(task.priority)}
            </span>
          </div>
        </div>
      </section>

      {task.description ? (
        <section className="staff-card-block">
          <h2 className="staff-card-h2">Description</h2>
          <p className="staff-card-desc">{descriptionBody}</p>
        </section>
      ) : null}

      {task.is_staff_report && task.report_image_url ? (
        <section className="staff-card-block staff-card-block--muted">
          <p className="staff-card-h2">Your report</p>
          <a href={task.report_image_url} target="_blank" rel="noreferrer">
            View photo
          </a>
        </section>
      ) : null}

      {task.attachment_url ? (
        <section className="staff-card-block">
          <h2 className="staff-card-h2">Attachment</h2>
          <a href={task.attachment_url} target="_blank" rel="noreferrer">
            Open file
          </a>
        </section>
      ) : null}

      <section className="staff-card-block">
        <div className="staff-checklist-head">
          <h2 className="staff-card-h2">Checklist</h2>
          <span className="staff-checklist-pct">{progress}%</span>
        </div>
        {checklist.length === 0 ? (
          <p className="staff-card-muted">No checklist items.</p>
        ) : (
          <ul className="staff-checklist">
            {checklist.map((row) => (
              <li key={row.id} className="staff-checklist-row">
                <label className="staff-check-label">
                  <input
                    type="checkbox"
                    checked={row.done}
                    disabled={done}
                    onChange={() => void toggleCheckItem(row)}
                  />
                  <span>{row.title}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="staff-card-block">
        <h2 className="staff-card-h2">Comments</h2>
        <p className="staff-comments-hint">
          You can give updates, ask for help, tag a teammate, attach
          documents, or use the big green button at the bottom.
        </p>
        <ul className="staff-comments">
          {comments.map((c) => (
            <li key={c.id} className="staff-comment">
              <div className="staff-comment-head">
                <strong>{c.author_display_name}</strong>
                <span>
                  {new Date(c.created_at).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <p className="staff-comment-body">{c.body}</p>
              {c.checklist_item_id ? (
                <p className="staff-card-muted">
                  Ref:{" "}
                  {checklist.find((x) => x.id === c.checklist_item_id)?.title ??
                    "item"}
                </p>
              ) : null}
              {c.image_url ? (
                <a href={c.image_url} target="_blank" rel="noreferrer">
                  <img
                    src={c.image_url}
                    alt=""
                    className="staff-comment-img"
                  />
                </a>
              ) : null}
            </li>
          ))}
        </ul>

        <form className="staff-comment-form" onSubmit={onPostComment}>
          {mentionTargets.length > 0 ? (
            <div className="staff-mentions">
              {mentionTargets.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="staff-mention-btn"
                  onClick={() =>
                    setCommentBody((b) => `${b}@${m.display_name} `)
                  }
                >
                  @{m.display_name}
                </button>
              ))}
            </div>
          ) : null}
          <textarea
            className="staff-comment-input"
            rows={3}
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Add a comment…"
            disabled={done}
          />
          <label className="staff-field-label">Checklist ref (optional)</label>
          <select
            className="staff-card-select staff-comment-select"
            value={commentCheckId}
            onChange={(e) => setCommentCheckId(e.target.value)}
            disabled={done}
          >
            <option value="">None</option>
            {checklist.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <label className="staff-field-label">Photo (optional)</label>
          <input
            type="file"
            accept="image/*"
            disabled={done}
            onChange={(e) => setCommentFile(e.target.files?.[0] ?? null)}
          />
          <button type="submit" className="staff-btn-secondary" disabled={commentBusy || done}>
            {commentBusy ? "Sending…" : "Send comment"}
          </button>
        </form>
      </section>
      </div>

      <footer className="staff-card-actions-bar" aria-label="Primary actions">
        <button
          type="button"
          className="staff-btn-help"
          disabled={helpBusy || done}
          onClick={() => void onNeedHelp()}
        >
          {helpBusy ? "…" : "NEED HELP"}
        </button>
        <button
          type="button"
          className="staff-btn-done"
          disabled={doneBusy || done}
          onClick={() => void onImDone()}
        >
          {doneBusy ? "…" : "I’M DONE"}
        </button>
      </footer>
    </main>
  );
}
