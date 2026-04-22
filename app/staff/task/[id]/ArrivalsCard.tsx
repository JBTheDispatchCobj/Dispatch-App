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
// Arrival-specific types
// ---------------------------------------------------------------------------

type ArrivalStatus = "open" | "prepped" | "ready" | "welcomed";

const ARRIVAL_STATUS_CHIPS: ReadonlyArray<{
  value: ArrivalStatus;
  label: string;
}> = [
  { value: "open", label: "Open" },
  { value: "prepped", label: "Prepped" },
  { value: "ready", label: "Ready" },
  { value: "welcomed", label: "Welcomed" },
];

type IncomingGuestFull = {
  name: string | null;
  checkin_time: string | null;
  checkout_date: string | null;
  nights: number | null;
  party_size: number | null;
  confirmation_number: string | null;
  source: string | null;
  special_requests: string | null;
};

// ---------------------------------------------------------------------------
// Context parsers — all safe, never throw
// ---------------------------------------------------------------------------

function parseArrivalStatus(raw: unknown): ArrivalStatus {
  if (raw === "prepped" || raw === "ready" || raw === "welcomed") return raw;
  return "open";
}

function parseIncomingGuest(ctx: Record<string, unknown>): IncomingGuestFull | null {
  const raw = ctx.incoming_guest;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const g = raw as Record<string, unknown>;

  const str = (key: string): string | null => {
    const v = g[key];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const num = (key: string): number | null => {
    const v = g[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v);
      return Number.isFinite(n) && v.trim() !== "" ? n : null;
    }
    return null;
  };

  const name = str("name");
  const checkin_time = str("checkin_time");
  const checkout_date = str("checkout_date");
  const nights = num("nights");
  const party_size = num("party_size");
  const confirmation_number = str("confirmation_number");
  const source = str("source");
  const special_requests = str("special_requests");

  if (
    !name && !checkin_time && !checkout_date && !nights && !party_size &&
    !confirmation_number && !source && !special_requests
  ) {
    return null;
  }
  return {
    name, checkin_time, checkout_date, nights, party_size,
    confirmation_number, source, special_requests,
  };
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

export type ArrivalsCardProps = {
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

export default function ArrivalsCard({
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
}: ArrivalsCardProps) {
  const [arrivalStatus, setArrivalStatus] = useState<ArrivalStatus>(
    parseArrivalStatus(task.context.arrival_status),
  );
  const [statusBusy, setStatusBusy] = useState(false);

  const onSetArrivalStatus = useCallback(
    async (next: ArrivalStatus) => {
      if (!userId || statusBusy || next === arrivalStatus) return;
      const prev = arrivalStatus;
      setStatusBusy(true);
      setInlineError(null);

      const { error: upErr } = await supabase
        .from("tasks")
        .update({ context: { ...task.context, arrival_status: next } })
        .eq("id", task.id);

      if (upErr) {
        setInlineError(upErr.message);
        setStatusBusy(false);
        return;
      }

      await logTaskEvent(
        task.id,
        "arrival_status_changed",
        withTaskEventSchema({ from: prev, to: next }),
        userId,
      );

      setArrivalStatus(next);
      setStatusBusy(false);
    },
    [userId, statusBusy, arrivalStatus, task, setInlineError],
  );

  const guest = parseIncomingGuest(task.context);

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
    <main className="staff-app staff-task-exec staff-task-exec--work arrivals-card">
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
        <p className="staff-task-exec-room-label arrivals-card__room">
          Room {displayRoom(task)}
        </p>

        {/* ----------------------------------------------------------------
            Arrivals-specific: single-column incoming guest details
        ---------------------------------------------------------------- */}
        <section className="arrivals-card__guest" aria-label="Incoming guest">
          <h3 className="arrivals-card__col-heading">Incoming</h3>
          {guest ? (
            <>
              {guest.name ? (
                <p className="arrivals-card__guest-name">{guest.name}</p>
              ) : null}

              {(guest.checkin_time || guest.checkout_date || guest.nights || guest.party_size) ? (
                <div className="arrivals-card__guest-meta">
                  {guest.checkin_time ? (
                    <span>Check-in: {guest.checkin_time}</span>
                  ) : null}
                  {guest.checkout_date ? (
                    <span>Checkout: {guest.checkout_date}</span>
                  ) : null}
                  {guest.nights !== null ? (
                    <span>{guest.nights} {guest.nights === 1 ? "night" : "nights"}</span>
                  ) : null}
                  {guest.party_size !== null ? (
                    <span>{guest.party_size} {guest.party_size === 1 ? "guest" : "guests"}</span>
                  ) : null}
                </div>
              ) : null}

              {guest.confirmation_number ? (
                <p className="arrivals-card__conf">Conf # {guest.confirmation_number}</p>
              ) : null}

              {guest.source ? (
                <p className="arrivals-card__source">{guest.source}</p>
              ) : null}
            </>
          ) : (
            <p className="arrivals-card__no-guest">No booking details</p>
          )}
        </section>

        {/* Special requests callout — rendered outside the guest panel for visual prominence */}
        {guest?.special_requests ? (
          <div className="arrivals-card__requests" role="note" aria-label="Special requests">
            <p className="arrivals-card__requests-label">Special Requests</p>
            <p className="arrivals-card__requests-body">{guest.special_requests}</p>
          </div>
        ) : null}

        {/* ----------------------------------------------------------------
            Arrivals-specific: room readiness chip row
        ---------------------------------------------------------------- */}
        <div
          className="arrivals-card__chips"
          role="group"
          aria-label="Room readiness status"
        >
          {ARRIVAL_STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={
                arrivalStatus === chip.value
                  ? "arrivals-card__chip arrivals-card__chip--active"
                  : "arrivals-card__chip"
              }
              onClick={() => void onSetArrivalStatus(chip.value)}
              disabled={taskDone || statusBusy}
              aria-pressed={arrivalStatus === chip.value}
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
                htmlFor="staff-task-note-arr"
              >
                Add a note
              </label>
              <textarea
                id="staff-task-note-arr"
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
