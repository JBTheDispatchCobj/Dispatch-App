"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import {
  displayAssignee,
  type CommentRow,
  type GuestContext,
  type TaskCard,
} from "@/app/tasks/[id]/task-card-shared";
import { logTaskEvent, withTaskEventSchema } from "@/lib/task-events";
import { supabase } from "@/lib/supabase";
import {
  checklistCompletionPercent,
  type ExecutionChecklistItem,
} from "@/lib/staff-task-execution-checklist";

// ---------------------------------------------------------------------------
// Departure-specific types
// ---------------------------------------------------------------------------

type DepartureStatus = "open" | "stripped" | "sheets" | "done";

const DEPARTURE_STATUS_CHIPS: ReadonlyArray<{
  value: DepartureStatus;
  label: string;
}> = [
  { value: "open", label: "Open" },
  { value: "stripped", label: "Stripped" },
  { value: "sheets", label: "Sheets" },
  { value: "done", label: "Done" },
];

// ---------------------------------------------------------------------------
// Context parsers — all safe, never throw
// ---------------------------------------------------------------------------

function parseDepartureStatus(raw: unknown): DepartureStatus {
  if (raw === "stripped" || raw === "sheets" || raw === "done") return raw;
  return "open";
}

function parseGuestContext(ctx: Record<string, unknown>): GuestContext | null {
  const raw = ctx.guest;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const g = raw as Record<string, unknown>;
  const guestName =
    typeof g.guestName === "string" && g.guestName.trim()
      ? g.guestName.trim()
      : undefined;
  const checkoutTime =
    typeof g.checkoutTime === "string" && g.checkoutTime.trim()
      ? g.checkoutTime.trim()
      : undefined;
  const lateCheckout = g.lateCheckout === true ? true : undefined;
  const vip = g.vip === true ? true : undefined;
  const specialRequests =
    typeof g.specialRequests === "string" && g.specialRequests.trim()
      ? g.specialRequests.trim()
      : undefined;
  const notes =
    typeof g.notes === "string" && g.notes.trim() ? g.notes.trim() : undefined;
  if (!guestName && !checkoutTime && !lateCheckout && !vip && !specialRequests && !notes) {
    return null;
  }
  return { guestName, checkoutTime, lateCheckout, vip, specialRequests, notes };
}

// ---------------------------------------------------------------------------
// Small display helpers (mirrors page.tsx — kept local so page.tsx is untouched)
// ---------------------------------------------------------------------------

function roomFromTitle(title: string | null): string | null {
  if (!title) return null;
  const m = title.match(/\broom\s*#?\s*(\d+)\b/i);
  return m ? m[1] : null;
}

function displayRoom(task: TaskCard): string {
  const ctxRoom = task.context.room_number;
  if (typeof ctxRoom === "string" && ctxRoom.trim()) return ctxRoom.trim();
  const n = task.room_number?.trim();
  if (n) return n;
  return roomFromTitle(task.title) ?? "—";
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

export type DeparturesCardProps = {
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

export default function DeparturesCard({
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
}: DeparturesCardProps) {
  const [departureStatus, setDepartureStatus] = useState<DepartureStatus>(
    parseDepartureStatus(task.context.departure_status),
  );
  const [statusBusy, setStatusBusy] = useState(false);

  const onSetDepartureStatus = useCallback(
    async (next: DepartureStatus) => {
      if (!userId || statusBusy || next === departureStatus) return;
      const prev = departureStatus;
      setStatusBusy(true);
      setInlineError(null);

      const { error: upErr } = await supabase
        .from("tasks")
        .update({ context: { ...task.context, departure_status: next } })
        .eq("id", task.id);

      if (upErr) {
        setInlineError(upErr.message);
        setStatusBusy(false);
        return;
      }

      await logTaskEvent(
        task.id,
        "departure_status_changed",
        withTaskEventSchema({ from: prev, to: next }),
        userId,
      );

      setDepartureStatus(next);
      setStatusBusy(false);
    },
    [userId, statusBusy, departureStatus, task, setInlineError],
  );

  const guest = parseGuestContext(task.context);

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
    <main className="staff-app staff-task-exec staff-task-exec--work departures-card">
      <div className="staff-task-exec-scroll">
        {/* Header — back + pause/resume (identical to generic card) */}
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

        {/* Room label */}
        <p className="staff-task-exec-room-label departures-card__room">
          Room {displayRoom(task)}
        </p>

        {/* ----------------------------------------------------------------
            Departures-specific: guest info panel
        ---------------------------------------------------------------- */}
        {guest ? (
          <section className="departures-card__guests" aria-label="Guest info">
            <h3 className="departures-card__col-heading">Guest info</h3>
            {guest.guestName ? (
              <p className="departures-card__guest-name">{guest.guestName}</p>
            ) : null}
            {guest.checkoutTime ? (
              <p className="departures-card__guest-time">
                Check-out: {guest.checkoutTime}
              </p>
            ) : null}
            {guest.lateCheckout || guest.vip ? (
              <div className="departures-card__guest-badges">
                {guest.lateCheckout ? (
                  <span className="departures-card__chip departures-card__chip--active">
                    Late check-out
                  </span>
                ) : null}
                {guest.vip ? (
                  <span className="departures-card__chip departures-card__chip--active">
                    VIP
                  </span>
                ) : null}
              </div>
            ) : null}
            {guest.specialRequests ? (
              <p className="departures-card__guest-notes">
                Special: {guest.specialRequests}
              </p>
            ) : null}
            {guest.notes ? (
              <p className="departures-card__guest-notes">{guest.notes}</p>
            ) : null}
          </section>
        ) : null}

        {/* ----------------------------------------------------------------
            Departures-specific: turnover status chip row
        ---------------------------------------------------------------- */}
        <div
          className="departures-card__chips"
          role="group"
          aria-label="Room turnover status"
        >
          {DEPARTURE_STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={
                departureStatus === chip.value
                  ? "departures-card__chip departures-card__chip--active"
                  : "departures-card__chip"
              }
              onClick={() => void onSetDepartureStatus(chip.value)}
              disabled={taskDone || statusBusy}
              aria-pressed={departureStatus === chip.value}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Title, meta, description — identical to generic card */}
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

        {/* Progress — identical to generic card */}
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

        {/* Checklist — identical to generic card */}
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

        {/* Notes — identical to generic card */}
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
                htmlFor="staff-task-note-dep"
              >
                Add a note
              </label>
              <textarea
                id="staff-task-note-dep"
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

      {/* Footer — identical to generic card */}
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
