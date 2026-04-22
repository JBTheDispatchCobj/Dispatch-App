"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import {
  displayAssignee,
  type CommentRow,
  type TaskCard,
} from "@/app/tasks/[id]/task-card-shared";
import { logTaskEvent, withTaskEventSchema } from "@/lib/task-events";
import { supabase } from "@/lib/supabase";
import {
  checklistCompletionPercent,
  type ExecutionChecklistItem,
} from "@/lib/staff-task-execution-checklist";

// ---------------------------------------------------------------------------
// EOD-specific types
// ---------------------------------------------------------------------------

type EodStatus = "open" | "reviewing" | "submitted" | "closed";

const EOD_STATUS_CHIPS: ReadonlyArray<{ value: EodStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "reviewing", label: "Reviewing" },
  { value: "submitted", label: "Submitted" },
  { value: "closed", label: "Closed" },
];

type EodSummary = {
  tasks_done_count: number | null;
  tasks_open_count: number | null;
  shift_lead: string | null;
  handoff_notes: string | null;
};

// ---------------------------------------------------------------------------
// Context parsers — all safe, never throw
// ---------------------------------------------------------------------------

function parseEodStatus(raw: unknown): EodStatus {
  if (raw === "reviewing" || raw === "submitted" || raw === "closed") return raw;
  return "open";
}

function parseEodSummary(ctx: Record<string, unknown>): EodSummary | null {
  const raw = ctx.eod_summary;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const s = raw as Record<string, unknown>;

  const num = (key: string): number | null => {
    const v = s[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v);
      return Number.isFinite(n) && v.trim() !== "" ? n : null;
    }
    return null;
  };
  const str = (key: string): string | null => {
    const v = s[key];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  const tasks_done_count = num("tasks_done_count");
  const tasks_open_count = num("tasks_open_count");
  const shift_lead = str("shift_lead");
  const handoff_notes = str("handoff_notes");

  if (
    tasks_done_count === null && tasks_open_count === null &&
    !shift_lead && !handoff_notes
  ) {
    return null;
  }
  return { tasks_done_count, tasks_open_count, shift_lead, handoff_notes };
}

// ---------------------------------------------------------------------------
// Small display helpers
// ---------------------------------------------------------------------------

function formatDueTime(iso: string | null): string {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return iso;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDueDate(iso: string | null): string {
  if (!iso) return "—";
  const day = String(iso).slice(0, 10);
  const d = new Date(`${day}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function priorityLabel(p: string): string {
  if (p === "high") return "High";
  if (p === "low") return "Low";
  return "Medium";
}

function formatCommentTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function checklistInteractionDisabled(status: string): boolean {
  return status === "done" || status === "blocked" || status === "paused";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type EODCardProps = {
  task: TaskCard;
  userId: string | null;
  displayName: string;
  checklist: ExecutionChecklistItem[];
  comments: CommentRow[];
  inlineError: string | null;
  setInlineError: (e: string | null) => void;
  noteBody: string;
  setNoteBody: (v: string) => void;
  noteBusy: boolean;
  helpBusy: boolean;
  doneBusy: boolean;
  pauseBusy: boolean;
  resumeBusy: boolean;
  onToggleItem: (row: ExecutionChecklistItem) => void;
  onNeedHelp: () => void;
  onImDone: () => void;
  onPause: () => void;
  onResume: () => void;
  onPostNote: (e: FormEvent) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EODCard({
  task,
  userId,
  displayName: _displayName,
  checklist,
  comments,
  inlineError,
  setInlineError,
  noteBody,
  setNoteBody,
  noteBusy,
  helpBusy,
  doneBusy,
  pauseBusy,
  resumeBusy,
  onToggleItem,
  onNeedHelp,
  onImDone,
  onPause,
  onResume,
  onPostNote,
}: EODCardProps) {
  const [eodStatus, setEodStatus] = useState<EodStatus>(
    parseEodStatus(task.context.eod_status),
  );
  const [statusBusy, setStatusBusy] = useState(false);

  const onSetEodStatus = useCallback(
    async (next: EodStatus) => {
      if (!userId || statusBusy || next === eodStatus) return;
      const prev = eodStatus;
      setStatusBusy(true);
      setInlineError(null);

      const { error: upErr } = await supabase
        .from("tasks")
        .update({ context: { ...task.context, eod_status: next } })
        .eq("id", task.id);

      if (upErr) {
        setInlineError(upErr.message);
        setStatusBusy(false);
        return;
      }

      await logTaskEvent(
        task.id,
        "eod_status_changed",
        withTaskEventSchema({ from: prev, to: next }),
        userId,
      );

      setEodStatus(next);
      setStatusBusy(false);
    },
    [userId, statusBusy, eodStatus, task, setInlineError],
  );

  const summary = parseEodSummary(task.context);

  const taskDone = task.status === "done";
  const inProgress = task.status === "in_progress";
  const paused = task.status === "paused";
  const assignee = displayAssignee(task);
  const progress = checklistCompletionPercent(checklist);
  const descNote =
    task.description?.trim() && task.description.trim().length > 0
      ? task.description.trim()
      : null;
  const stepsLocked = checklistInteractionDisabled(task.status);

  return (
    <main className="staff-app staff-task-exec staff-task-exec--work eod-card">
      <div className="staff-task-exec-scroll">
        {/* Header — back + pause/resume */}
        <header className="staff-task-exec-top staff-task-exec-toolbar">
          <Link href="/staff" className="staff-task-exec-back">
            ← Tasks
          </Link>
          {!taskDone ? (
            <div className="staff-task-exec-toolbar-actions">
              {inProgress ? (
                <button
                  type="button"
                  className="staff-task-exec-linkbtn"
                  onClick={() => onPause()}
                  disabled={pauseBusy}
                >
                  {pauseBusy ? "…" : "Pause"}
                </button>
              ) : null}
              {paused ? (
                <button
                  type="button"
                  className="staff-task-exec-linkbtn"
                  onClick={() => onResume()}
                  disabled={resumeBusy}
                >
                  {resumeBusy ? "…" : "Resume"}
                </button>
              ) : null}
            </div>
          ) : null}
        </header>

        {/* EOD header label */}
        <p className="eod-card__day-label">End of Day</p>

        {/* ----------------------------------------------------------------
            EOD-specific: shift summary panel
        ---------------------------------------------------------------- */}
        {summary ? (
          <section className="eod-card__summary" aria-label="Shift summary">
            <h3 className="eod-card__summary-heading">Shift Summary</h3>
            <div className="eod-card__summary-stats">
              {summary.tasks_done_count !== null ? (
                <div className="eod-card__stat">
                  <span className="eod-card__stat-value">{summary.tasks_done_count}</span>
                  <span className="eod-card__stat-label">completed today</span>
                </div>
              ) : null}
              {summary.tasks_open_count !== null ? (
                <div className="eod-card__stat eod-card__stat--open">
                  <span className="eod-card__stat-value">{summary.tasks_open_count}</span>
                  <span className="eod-card__stat-label">open, carrying over</span>
                </div>
              ) : null}
            </div>
            {summary.shift_lead ? (
              <p className="eod-card__shift-lead">Shift lead: {summary.shift_lead}</p>
            ) : null}
          </section>
        ) : null}

        {/* Handoff notes block */}
        {summary?.handoff_notes ? (
          <div className="eod-card__handoff" role="note" aria-label="Handoff notes">
            <p className="eod-card__handoff-label">Handoff Notes</p>
            <p className="eod-card__handoff-body">{summary.handoff_notes}</p>
          </div>
        ) : null}

        {/* ----------------------------------------------------------------
            EOD-specific: workflow status chip row
        ---------------------------------------------------------------- */}
        <div
          className="eod-card__chips"
          role="group"
          aria-label="EOD workflow status"
        >
          {EOD_STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={
                eodStatus === chip.value
                  ? "eod-card__chip eod-card__chip--active"
                  : "eod-card__chip"
              }
              onClick={() => void onSetEodStatus(chip.value)}
              disabled={taskDone || statusBusy}
              aria-pressed={eodStatus === chip.value}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Title, meta, description */}
        <h1 className="staff-task-exec-title">{task.title}</h1>

        <div
          className="staff-task-exec-meta"
          aria-label="Due time, date, priority, assignee"
        >
          <span className="staff-task-exec-meta-item">
            <span className="staff-task-exec-meta-k">Time</span>
            {formatDueTime(task.due_time)}
          </span>
          <span className="staff-task-exec-meta-dot" aria-hidden>·</span>
          <span className="staff-task-exec-meta-item">
            <span className="staff-task-exec-meta-k">Date</span>
            {formatDueDate(task.due_date)}
          </span>
          <span className="staff-task-exec-meta-dot" aria-hidden>·</span>
          <span className="staff-task-exec-meta-item">
            <span className="staff-task-exec-meta-k">Priority</span>
            {priorityLabel(task.priority)}
          </span>
          <span className="staff-task-exec-meta-dot" aria-hidden>·</span>
          <span className="staff-task-exec-meta-item">
            <span className="staff-task-exec-meta-k">Assignee</span>
            {assignee || "—"}
          </span>
          <span className="staff-task-exec-meta-dot" aria-hidden>·</span>
          <span className="staff-task-exec-meta-item">
            <span className="staff-task-exec-meta-k">Status</span>
            {task.status.replace("_", " ")}
          </span>
        </div>

        {descNote ? (
          <p className="staff-task-exec-desc">{descNote}</p>
        ) : null}

        {inlineError ? (
          <p className="error staff-task-exec-error">{inlineError}</p>
        ) : null}

        {/* Progress */}
        <section
          className="staff-task-exec-section staff-task-exec-section--progress"
          aria-label="Checklist progress"
        >
          <div className="staff-task-exec-progress-head">
            <span className="staff-task-exec-h2 staff-task-exec-h2--inline">
              Progress
            </span>
            <span className="staff-task-exec-progress-pct">{progress}%</span>
          </div>
          <div
            className="staff-task-exec-progress-track"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progress} percent complete`}
          >
            <div
              className="staff-task-exec-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        {/* Checklist */}
        <section className="staff-task-exec-section" aria-label="Checklist">
          <h2 className="staff-task-exec-h2">Steps</h2>
          {checklist.length === 0 ? (
            <p className="staff-task-exec-muted">No steps for this task yet.</p>
          ) : (
            <ul className="staff-task-exec-steps" role="list">
              {checklist.map((item) => (
                <li key={item.id} className="staff-task-exec-steps__item">
                  <button
                    type="button"
                    className="staff-task-exec-step"
                    onClick={() => onToggleItem(item)}
                    disabled={taskDone || stepsLocked}
                    aria-pressed={item.done}
                  >
                    <span
                      className={
                        item.done
                          ? "staff-task-exec-step-box staff-task-exec-step-box--done"
                          : "staff-task-exec-step-box"
                      }
                      aria-hidden
                    />
                    <span className="staff-task-exec-step-label">
                      {item.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Notes */}
        <section className="staff-task-exec-section" aria-label="Notes">
          <h2 className="staff-task-exec-h2">Notes &amp; updates</h2>
          {comments.length === 0 ? (
            <p className="staff-task-exec-muted">No notes yet.</p>
          ) : (
            <ul className="staff-task-exec-notes" role="list">
              {comments.map((c) => (
                <li key={c.id} className="staff-task-exec-note">
                  <div className="staff-task-exec-note-head">
                    <span className="staff-task-exec-note-author">
                      {c.author_display_name || "Team"}
                    </span>
                    <time
                      className="staff-task-exec-note-time"
                      dateTime={c.created_at}
                    >
                      {formatCommentTime(c.created_at)}
                    </time>
                  </div>
                  <p className="staff-task-exec-note-body">{c.body}</p>
                  {c.image_url ? (
                    <a href={c.image_url} target="_blank" rel="noreferrer">
                      <img src={c.image_url} alt="" className="staff-comment-img" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {!taskDone ? (
            <form
              className="staff-task-exec-note-form"
              onSubmit={onPostNote}
            >
              <label
                className="staff-task-exec-note-label"
                htmlFor="staff-task-note-eod"
              >
                Add a note
              </label>
              <textarea
                id="staff-task-note-eod"
                className="staff-task-exec-note-input"
                rows={2}
                placeholder="Visible to your team…"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                autoComplete="off"
              />
              <button
                type="submit"
                className="staff-task-exec-note-send"
                disabled={noteBusy || !noteBody.trim()}
              >
                {noteBusy ? "Sending…" : "Post note"}
              </button>
            </form>
          ) : null}
        </section>
      </div>

      {/* Footer */}
      <footer className="staff-task-exec-bar" aria-label="Task actions">
        <button
          type="button"
          className="staff-task-exec-bar-btn staff-task-exec-bar-btn--secondary"
          onClick={() => onNeedHelp()}
          disabled={helpBusy || taskDone}
        >
          {helpBusy ? "…" : "NEED HELP"}
        </button>
        <button
          type="button"
          className="staff-task-exec-bar-btn staff-task-exec-bar-btn--primary"
          onClick={() => onImDone()}
          disabled={doneBusy || taskDone || paused}
        >
          {taskDone ? "DONE" : doneBusy ? "…" : "I'M DONE"}
        </button>
      </footer>
    </main>
  );
}
