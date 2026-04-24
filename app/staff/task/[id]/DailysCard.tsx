"use client";

import Link from "next/link";
import { type FormEvent } from "react";
import {
  type CommentRow,
  type TaskCard,
} from "@/app/tasks/[id]/task-card-shared";
import { type ExecutionChecklistItem } from "@/lib/staff-task-execution-checklist";

// ---------------------------------------------------------------------------
// Context parsers — all safe, never throw
// ---------------------------------------------------------------------------

type DailyTaskContext = {
  location: string | null;
};

function parseDailyTaskContext(ctx: Record<string, unknown>): DailyTaskContext | null {
  const raw = ctx.daily_task;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const d = raw as Record<string, unknown>;
  const loc = d.location;
  return {
    location: typeof loc === "string" && loc.trim() ? loc.trim() : null,
  };
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
  const daily = parseDailyTaskContext(task.context);

  const taskDone = task.status === "done";
  const inProgress = task.status === "in_progress";
  const paused = task.status === "paused";
  const stepsLocked = checklistInteractionDisabled(task.status);

  const locationLabel = daily?.location ?? task.location_label ?? "DAILY";
  const heroMeta = `${locationLabel.toUpperCase()} · ${checklist.length} TASK${checklist.length !== 1 ? "S" : ""}`;

  const descNote =
    task.description?.trim() && task.description.trim().length > 0
      ? task.description.trim()
      : null;

  return (
    <main className="staff-app staff-task-exec staff-task-exec--work dailys-card">
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

        {/* Unified lavender card: header strip + all content */}
        <div className="dailys-card__card">

          {/* Card header strip */}
          <div className="dailys-card__header">
            <div className="dailys-card__hero">
              <div className="dailys-card__hero-type mono">DAILYS</div>
              <div className="dailys-card__hero-meta mono">{heroMeta}</div>
            </div>
          </div>

          {/* Card body */}
          <div className="dailys-card__body">

            {/* Team Updates panel */}
            <div className="dailys-card__panel">
              <div className="dailys-card__tile-head mono">TEAM UPDATES</div>
              <div className="dailys-card__panel-body">
                {descNote ? (
                  <p className="dailys-card__panel-text">{descNote}</p>
                ) : (
                  <div className="dailys-card__plus-glyph" aria-hidden>+</div>
                )}
              </div>
            </div>

            {/* Notes panel */}
            <div className="dailys-card__panel">
              <div className="dailys-card__tile-head mono">NOTES</div>
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

            {/* 2-column task grid (checklist items as compact rows) */}
            {checklist.length > 0 ? (
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
                    <div className="dailys-card__task-info">
                      <div className="dailys-card__task-title">{item.title}</div>
                      {/* post-beta: Location and Notes are task-level, not per-checklist-item */}
                      <div className="dailys-card__task-meta">
                        <span className="dailys-card__task-meta-k mono">Location</span>
                        <span className="dailys-card__task-meta-v mono">
                          {daily?.location ?? "—"}
                        </span>
                      </div>
                      <div className="dailys-card__task-meta">
                        <span className="dailys-card__task-meta-k mono">Notes</span>
                        <span className="dailys-card__task-meta-v mono">—</span>
                      </div>
                    </div>
                    <div className="dailys-card__task-actions">
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
                        {item.done ? "DONE" : "COMPLETE"}
                      </button>
                      {/* post-beta: per-item Details link not wired */}
                      <span className="dailys-card__details-link" aria-hidden>Details</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="dailys-card__empty mono">No tasks yet.</p>
            )}

          </div>

        </div>{/* end dailys-card__card */}

        {/* Action pair — inline below card */}
        <div className="dailys-card__actions" aria-label="Task actions">
          <button
            type="button"
            className="dailys-card__action-btn dailys-card__action-btn--secondary"
            onClick={onNeedHelp}
            disabled={helpBusy || taskDone}
          >
            {helpBusy ? "…" : "NEED HELP"}
          </button>
          <button
            type="button"
            className="dailys-card__action-btn dailys-card__action-btn--primary"
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
