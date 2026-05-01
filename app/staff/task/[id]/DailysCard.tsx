"use client";

import Link from "next/link";
import { type FormEvent } from "react";
import {
  type CommentRow,
  type TaskCard,
} from "@/app/tasks/[id]/task-card-shared";
import { type ExecutionChecklistItem } from "@/lib/staff-task-execution-checklist";

// ---------------------------------------------------------------------------
// Context parsers — safe, never throw
// ---------------------------------------------------------------------------

function parseDailyLocation(ctx: Record<string, unknown>): string | null {
  const raw = ctx.daily_task;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const d = raw as Record<string, unknown>;
  const loc = d.location;
  return typeof loc === "string" && loc.trim() ? loc.trim() : null;
}

function checklistInteractionDisabled(status: string): boolean {
  return status === "done" || status === "blocked" || status === "paused";
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

function formatTodayDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatCommentTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  if (date >= todayStart) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (date >= yesterdayStart) {
    return "Yesterday";
  }
  return date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
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
  userId: _userId,
  displayName: _displayName,
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
}: DailysCardProps) {
  const location = parseDailyLocation(task.context) ?? task.location_label;

  const taskDone   = task.status === "done";
  const inProgress = task.status === "in_progress";
  const paused     = task.status === "paused";
  const stepsLocked = checklistInteractionDisabled(task.status);

  const doneCount = checklist.filter((i) => i.done).length;

  const dateLine =
    checklist.length > 0
      ? `${formatTodayDate()} · ${checklist.length} stop${checklist.length !== 1 ? "s" : ""}`
      : formatTodayDate();

  return (
    <div className="preview-da-430">
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
              <span className="greet__chip">Dailys</span>
              <span className="greet__loc">{location ?? "Property Round"}</span>
            </div>
            <h1 className="greet__hello">{task.title}</h1>
            <div className="greet__date">{dateLine}</div>
          </header>

          {/* Team Updates — locked placeholder (Gap 2 Option B; no roster data available) */}
          <section className="section">
            <header className="section__head">
              <span className="section__label">Team Updates</span>
              <span className="section__count">Coming soon</span>
            </header>
            <div className="team" aria-hidden style={{ opacity: 0.55, minHeight: "52px" }} />
          </section>

          {/* Notes section — A-430 pattern (Gap 3): comment feed + inline compose */}
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
            {/* Inline compose — ＋ topstrip dropped, form is the compose UI */}
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

          {/* Property Round — .tasks 2-col grid; data-done drives CSS strikethrough/opacity */}
          <section className="section">
            <header className="section__head">
              <span className="section__label">Property Round</span>
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
                    {location ? (
                      <div className="task__sub">{location}</div>
                    ) : null}
                    <div className="task__row">
                      <span
                        className={
                          item.done
                            ? "task__pill"
                            : "task__pill task__pill--pending"
                        }
                      >
                        {item.done ? "Done" : "Complete"}
                      </span>
                      {/* Details link — inert per Gap 5; no drill-down in DailysCard */}
                      <span className="task__link" aria-hidden>Details ›</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="section__count" style={{ padding: "14px 0" }}>No tasks yet.</p>
            )}
          </section>

          {/* CTAs — "Complete All" circle button removed (Gap 7; not in artifact) */}
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
              {taskDone ? "Done" : doneBusy ? "…" : "I'm Done"}
            </button>
          </div>

        </div>{/* end .shell */}
      </div>{/* end .page */}
    </div>/* end .preview-da-430 */
  );
}
