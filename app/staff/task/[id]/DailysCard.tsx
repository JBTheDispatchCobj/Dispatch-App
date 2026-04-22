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
// Dailys-specific types
// ---------------------------------------------------------------------------

type DailyStatus = "open" | "in_progress" | "done";

const DAILYS_STATUS_CHIPS: ReadonlyArray<{
  value: DailyStatus;
  label: string;
}> = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

type DailyTask = {
  location: string | null;
  frequency: string | null;
  // undefined = key absent from context (hide line); null = present but empty (show "Never")
  last_completed_at: string | null | undefined;
  instructions: string | null;
};

// ---------------------------------------------------------------------------
// Context parsers — all safe, never throw
// ---------------------------------------------------------------------------

function parseDailyStatus(raw: unknown): DailyStatus {
  if (raw === "in_progress" || raw === "done") return raw;
  return "open";
}

function parseDailyTask(ctx: Record<string, unknown>): DailyTask | null {
  const raw = ctx.daily_task;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const d = raw as Record<string, unknown>;

  const str = (key: string): string | null => {
    const v = d[key];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  const location = str("location");
  const frequency = str("frequency");
  const instructions = str("instructions");

  // Distinguish absent key from present-but-empty
  let last_completed_at: string | null | undefined;
  if (!("last_completed_at" in d)) {
    last_completed_at = undefined;
  } else {
    const v = d["last_completed_at"];
    last_completed_at = typeof v === "string" && v.trim() ? v.trim() : null;
  }

  if (!location && !frequency && last_completed_at === undefined && !instructions) {
    return null;
  }
  return { location, frequency, last_completed_at, instructions };
}

// ---------------------------------------------------------------------------
// Small display helpers
// ---------------------------------------------------------------------------

function formatLastCompleted(raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;

  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();
  const dStr = d.toDateString();

  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (dStr === todayStr) return `Today ${time}`;
  if (dStr === yesterdayStr) return `Yesterday ${time}`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  }) + ` ${time}`;
}

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

export type DailysCardProps = {
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

export default function DailysCard({
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
}: DailysCardProps) {
  const [dailyStatus, setDailyStatus] = useState<DailyStatus>(
    parseDailyStatus(task.context.daily_status),
  );
  const [statusBusy, setStatusBusy] = useState(false);

  const onSetDailyStatus = useCallback(
    async (next: DailyStatus) => {
      if (!userId || statusBusy || next === dailyStatus) return;
      const prev = dailyStatus;
      setStatusBusy(true);
      setInlineError(null);

      const { error: upErr } = await supabase
        .from("tasks")
        .update({ context: { ...task.context, daily_status: next } })
        .eq("id", task.id);

      if (upErr) {
        setInlineError(upErr.message);
        setStatusBusy(false);
        return;
      }

      await logTaskEvent(
        task.id,
        "daily_status_changed",
        withTaskEventSchema({ from: prev, to: next }),
        userId,
      );

      setDailyStatus(next);
      setStatusBusy(false);
    },
    [userId, statusBusy, dailyStatus, task, setInlineError],
  );

  const daily = parseDailyTask(task.context);

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
    <main className="staff-app staff-task-exec staff-task-exec--work dailys-card">
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

        {/* Location header — primary identifier, analogous to "Room 3" */}
        <p className="dailys-card__location">
          {daily?.location ?? "Daily Task"}
        </p>

        {/* ----------------------------------------------------------------
            Dailys-specific: frequency + last completed info block
        ---------------------------------------------------------------- */}
        {daily ? (
          <section className="dailys-card__info" aria-label="Task info">
            {(daily.frequency || daily.last_completed_at !== undefined) ? (
              <div className="dailys-card__info-row">
                {daily.frequency ? (
                  <span className="dailys-card__info-item">
                    <span className="dailys-card__info-k">Frequency</span>
                    {daily.frequency}
                  </span>
                ) : null}
                {daily.last_completed_at !== undefined ? (
                  <span className="dailys-card__info-item">
                    <span className="dailys-card__info-k">Last done</span>
                    {daily.last_completed_at
                      ? formatLastCompleted(daily.last_completed_at)
                      : "Never"}
                  </span>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : (
          <p className="dailys-card__no-detail">No task details</p>
        )}

        {/* Instructions block — quiet gray, not yellow callout or purple handoff */}
        {daily?.instructions ? (
          <div
            className="dailys-card__instructions"
            role="note"
            aria-label="Instructions"
          >
            <p className="dailys-card__instructions-label">Instructions</p>
            <p className="dailys-card__instructions-body">
              {daily.instructions}
            </p>
          </div>
        ) : null}

        {/* ----------------------------------------------------------------
            Dailys-specific: three-chip status row
        ---------------------------------------------------------------- */}
        <div
          className="dailys-card__chips"
          role="group"
          aria-label="Task status"
        >
          {DAILYS_STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={
                dailyStatus === chip.value
                  ? "dailys-card__chip dailys-card__chip--active"
                  : "dailys-card__chip"
              }
              onClick={() => void onSetDailyStatus(chip.value)}
              disabled={taskDone || statusBusy}
              aria-pressed={dailyStatus === chip.value}
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
                htmlFor="staff-task-note-dailys"
              >
                Add a note
              </label>
              <textarea
                id="staff-task-note-dailys"
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
