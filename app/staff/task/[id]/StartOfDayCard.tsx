"use client";

import Link from "next/link";
import { type FormEvent } from "react";
import {
  type CommentRow,
  type TaskCard,
} from "@/app/tasks/[id]/task-card-shared";
import { type ExecutionChecklistItem } from "@/lib/staff-task-execution-checklist";
import { formatSodDateShort, firstNameFromDisplayName, formatCommentTime } from "@/lib/staff-card-formatters";

// ---------------------------------------------------------------------------
// Context parsers — all safe, never throw
// ---------------------------------------------------------------------------

type SodBrief = {
  date_label: string | null;
  date_accent: string | null;
  status: string | null;
  weather: string | null;
  events: string | null;
  notes: string | null;
};

function parseSodBrief(ctx: Record<string, unknown>): SodBrief | null {
  const raw = ctx.sod_brief;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const b = raw as Record<string, unknown>;
  const str = (key: string): string | null => {
    const v = b[key];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  return {
    date_label: str("date_label"),
    date_accent: str("date_accent"),
    status: str("status"),
    weather: str("weather"),
    events: str("events"),
    notes: str("notes"),
  };
}

function hasBriefContent(brief: SodBrief | null): boolean {
  if (!brief) return false;
  return !!(
    brief.date_label ||
    brief.status ||
    brief.weather ||
    brief.events ||
    brief.notes
  );
}

function formatSodDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d
    .toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .toUpperCase();
}

function checklistInteractionDisabled(status: string): boolean {
  return status === "done" || status === "blocked" || status === "paused";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type StartOfDayCardProps = {
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

export default function StartOfDayCard({
  task,
  userId: _userId,
  displayName,
  checklist,
  comments,
  inlineError,
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
}: StartOfDayCardProps) {
  const brief = parseSodBrief(task.context);

  const taskDone   = task.status === "done";
  const inProgress = task.status === "in_progress";
  const paused     = task.status === "paused";
  const stepsLocked = checklistInteractionDisabled(task.status);

  const updatesText =
    task.description?.trim() && task.description.trim().length > 0
      ? task.description.trim()
      : null;

  const firstName = firstNameFromDisplayName(displayName);
  const doneCount = checklist.filter((i) => i.done).length;

  return (
    <div className="preview-sod-430">
      <div className="page">

        {/* Pause/Resume toolbar — above shell, only when task is active or paused */}
        {!taskDone && (inProgress || paused) ? (
          <header className="staff-task-exec-top staff-task-exec-toolbar">
            <div className="staff-task-exec-toolbar-actions">
              {inProgress ? (
                <button
                  type="button"
                  className="staff-task-exec-linkbtn"
                  onClick={onPause}
                  disabled={pauseBusy}
                >
                  {pauseBusy ? "…" : "Pause"}
                </button>
              ) : null}
              {paused ? (
                <button
                  type="button"
                  className="staff-task-exec-linkbtn"
                  onClick={onResume}
                  disabled={resumeBusy}
                >
                  {resumeBusy ? "…" : "Resume"}
                </button>
              ) : null}
            </div>
          </header>
        ) : null}

        <div className="shell">

          {/* Topstrip — back nav only; ＋ dropped (Gap 6) */}
          <div className="topstrip">
            <Link href="/staff" className="icon-circle" aria-label="Back to tasks">←</Link>
          </div>

          {/* Greeting block */}
          <header className="greet">
            <div className="greet__label">
              <span className="greet__chip">Start of Day</span>
              <span className="greet__loc">{formatSodDateShort(task.due_date)}</span>
            </div>
            <h1 className="greet__hello">Hi, {firstName ?? "there"}.</h1>
            {/* TODO: replace with system-set rotating SOD date-context phrase
                when schema adds it. Currently locked to artifact example. */}
            <div className="greet__date">1st day of spring</div>
          </header>

          {/* Daily Brief — always render (Gap 9); placeholder cells handle empty state */}
          <section className="brief">
            <div className="brief__head">
              <span className="brief__head-label">Daily Brief</span>
            </div>
            {/* Gap 3: brief.notes → prose headline; empty slot if null */}
            <div className="brief__top">{brief?.notes}</div>
            <div className="brief__grid">
              {/* Weather — locked placeholder (Gap 4) */}
              <div className="cell">
                <div className="cell__label">Weather</div>
                <div className="cell__value" aria-hidden style={{ opacity: 0.55 }}>—</div>
                <div className="cell__sub">Coming soon</div>
              </div>
              {/* Events — locked placeholder (Gap 4) */}
              <div className="cell cell--tr">
                <div className="cell__label">Events</div>
                <div className="cell__value" aria-hidden style={{ opacity: 0.55 }}>—</div>
                <div className="cell__sub">Coming soon</div>
              </div>
              {/* Status — live (Gap 10: plain text, no structured em/sep HTML) */}
              <div className="cell cell--bl">
                <div className="cell__label">Status</div>
                <div className="cell__value cell__value--big">{brief?.status}</div>
              </div>
              {/* Team — locked placeholder (Gap 4) */}
              <div className="cell cell--br">
                <div className="cell__label">Team</div>
                <div className="cell__value" aria-hidden style={{ opacity: 0.55 }}>—</div>
                <div className="cell__sub">Coming soon</div>
              </div>
            </div>
          </section>

          {/* Updates panel — always render; locked placeholder when no content */}
          <section className="updates">
            <header className="updates__head">
              <span className="updates__label">Updates</span>
            </header>
            {updatesText ? (
              <div className="updates__body">
                <p className="updates__text">{updatesText}</p>
              </div>
            ) : (
              <div className="updates__body" aria-hidden style={{ opacity: 0.55, minHeight: "52px" }} />
            )}
          </section>

          {/* Notes section — A-430 pattern: comment feed + inline compose (Gap 6) */}
          <section className="section">
            <header className="section__head">
              <span className="section__label">Notes</span>
              <span className="section__count">
                {comments.length > 0
                  ? `${comments.length} left for you`
                  : "no notes yet"}
              </span>
            </header>
            {comments.length > 0 ? (
              <div className="notes">
                {comments.map((comment) => (
                  <button key={comment.id} className="note" type="button">
                    <div className="note__head">
                      <span className="note__dot" />
                      <div className="note__body">
                        <div className="note__line">
                          <span className="note__name">{comment.author_display_name}</span>
                          <span className="note__action"> left a note: </span>
                          <span className="note__quote">&ldquo;{comment.body}&rdquo;</span>
                        </div>
                        {comment.image_url ? (
                          <div className="note__chips">
                            <span className="note__chip">📎 1</span>
                          </div>
                        ) : null}
                      </div>
                      <span className="note__time">{formatCommentTime(comment.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
            {!taskDone ? (
              <form onSubmit={onPostNote}>
                <div className="compose__row">
                  <input
                    className="compose__input"
                    placeholder="Leave a note for the team…"
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    disabled={noteBusy}
                    autoComplete="off"
                  />
                </div>
                <div className="compose__foot">
                  <div />
                  <button
                    type="submit"
                    className="compose__send"
                    disabled={noteBusy || !noteBody.trim()}
                  >
                    {noteBusy ? "…" : "Send"}
                  </button>
                </div>
              </form>
            ) : null}
          </section>

          {inlineError ? <p className="error">{inlineError}</p> : null}

          {/* Today's Tasks — 2-col grid; no per-item sub-labels (Gap 7) */}
          <section className="section">
            <header className="section__head">
              <span className="section__label">Today's Tasks</span>
              <span className="section__count">
                {doneCount} of {checklist.length} done
              </span>
            </header>
            {checklist.length > 0 ? (
              <div className="tasks">
                {checklist.map((item) => (
                  <button
                    key={item.id}
                    className="task"
                    type="button"
                    data-done={item.done ? "true" : "false"}
                    onClick={() => {
                      if (!stepsLocked && !taskDone) onToggleItem(item);
                    }}
                  >
                    <div className="task__title">{item.title}</div>
                    <div className="task__row">
                      <span
                        className={
                          item.done ? "task__pill" : "task__pill task__pill--pending"
                        }
                      >
                        {item.done ? "Done" : "Complete"}
                      </span>
                      <span className="task__link" aria-hidden>Details ›</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="section__count" style={{ padding: "14px 0" }}>No tasks yet.</p>
            )}
          </section>

          {/* CTAs — "Need Help" secondary, "Start Shift" primary (label change only, Gap CTA) */}
          <div className="cta">
            <button
              type="button"
              className="cta__secondary"
              onClick={onNeedHelp}
              disabled={helpBusy || taskDone}
            >
              {helpBusy ? "…" : "Need Help"}
            </button>
            <button
              type="button"
              className="cta__primary"
              onClick={onImDone}
              disabled={doneBusy || taskDone || paused}
            >
              {taskDone ? "Done" : doneBusy ? "…" : "Start Shift"}
            </button>
          </div>

        </div>{/* end .shell */}
      </div>{/* end .page */}
    </div>/* end .preview-sod-430 */
  );
}
