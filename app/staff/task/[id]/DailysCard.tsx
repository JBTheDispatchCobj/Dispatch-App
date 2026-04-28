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

  const descNote =
    task.description?.trim() && task.description.trim().length > 0
      ? task.description.trim()
      : null;

  const allDone = checklist.length > 0 && checklist.every((i) => i.done);

  return (
    <main className="staff-app dailys-card">
      <div className="staff-task-exec-scroll">

        {/* Toolbar — back + pause/resume */}
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
          ) : null}
        </header>

        {/* Cream shell */}
        <div className="dailys-card__shell">

          {/* Hero — ink-stamp pills */}
          <div className="dailys-card__hero">
            <span className="hero-stamp dailys-card__stamp">DAILYS</span>
            <span className="hero-stamp dailys-card__stamp">PROPERTY ROUND</span>
          </div>

          {/* Body */}
          <div className="dailys-card__body">

            {/* Team Updates panel */}
            <div className="dailys-card__panel">
              <div className="dailys-card__panel-head">
                <span>TEAM UPDATES</span>
              </div>
              {descNote ? (
                <div className="dailys-card__panel-body">{descNote}</div>
              ) : (
                <div className="dailys-card__plus-glyph" aria-hidden>+</div>
              )}
            </div>

            {/* Notes panel */}
            <div className="dailys-card__panel">
              <div className="dailys-card__panel-head">
                <span>NOTES</span>
              </div>
              <div className="dailys-card__panel-body">
                {comments.length > 0 ? (
                  <p className="dailys-card__note-count mono">
                    {comments.length} note{comments.length !== 1 ? "s" : ""}
                  </p>
                ) : null}
                {!taskDone ? (
                  <form className="dailys-card__note-form" onSubmit={onPostNote}>
                    <textarea
                      id="staff-task-note-dailys"
                      className="dailys-card__note-input"
                      rows={2}
                      placeholder="Add a note…"
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      className="dailys-card__note-send"
                      disabled={noteBusy || !noteBody.trim()}
                    >
                      {noteBusy ? "…" : "Post"}
                    </button>
                  </form>
                ) : (
                  <div className="dailys-card__plus-glyph" aria-hidden>+</div>
                )}
              </div>
            </div>

            {inlineError ? (
              <p className="error dailys-card__error">{inlineError}</p>
            ) : null}

            {/* 2-column task grid */}
            {checklist.length > 0 ? (
              <>
                <div className="dailys-card__task-grid">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      className={
                        item.done
                          ? "dailys-card__task-row dailys-card__task-row--done"
                          : "dailys-card__task-row"
                      }
                    >
                      <div>
                        <div className="dailys-card__task-title">{item.title}</div>
                        {location ? (
                          <div className="dailys-card__task-meta">{location.toUpperCase()}</div>
                        ) : null}
                      </div>
                      <div className="dailys-card__task-foot">
                        <button
                          type="button"
                          className={
                            item.done
                              ? "dailys-card__complete-pill dailys-card__complete-pill--done"
                              : "dailys-card__complete-pill"
                          }
                          onClick={() => onToggleItem(item)}
                          disabled={taskDone || stepsLocked}
                        >
                          {item.done ? "Done" : "Complete"}
                        </button>
                        <span className="dailys-card__details-link" aria-hidden>
                          Details &rsaquo;
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Complete All — circle mark-all button */}
                {!taskDone && !stepsLocked ? (
                  <div className="dailys-card__complete-all">
                    <button
                      type="button"
                      className="dailys-card__complete-circle"
                      aria-label="Mark all tasks done"
                      disabled={allDone}
                      onClick={() => {
                        checklist
                          .filter((i) => !i.done)
                          .forEach((i) => onToggleItem(i));
                      }}
                    >
                      &#10003;
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="dailys-card__empty mono">No tasks yet.</p>
            )}

          </div>
        </div>{/* end dailys-card__shell */}

        {/* CTAs — outside shell */}
        <div className="dailys-card__cta-row" aria-label="Task actions">
          <button
            type="button"
            className="dailys-card__btn"
            onClick={onNeedHelp}
            disabled={helpBusy || taskDone}
          >
            {helpBusy ? "…" : "NEED HELP"}
          </button>
          <button
            type="button"
            className="dailys-card__btn dailys-card__btn--primary"
            onClick={onImDone}
            disabled={doneBusy || taskDone || paused}
          >
            {taskDone ? "DONE" : doneBusy ? "…" : "I'M DONE"}
          </button>
        </div>

      </div>
    </main>
  );
}
