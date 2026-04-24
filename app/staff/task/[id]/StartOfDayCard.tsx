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

  const taskDone = task.status === "done";
  const inProgress = task.status === "in_progress";
  const paused = task.status === "paused";
  const stepsLocked = checklistInteractionDisabled(task.status);

  const dateStr = formatSodDate(task.due_date);
  const heroMeta = [dateStr, displayName ? displayName.toUpperCase() : null]
    .filter(Boolean)
    .join(" · ");

  const updatesText =
    task.description?.trim() && task.description.trim().length > 0
      ? task.description.trim()
      : null;

  const showBrief = hasBriefContent(brief);

  return (
    <main className="staff-app staff-task-exec staff-task-exec--work sod-card">
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

        {/* Unified cream card: mustard header strip + cream body */}
        <div className="sod-card__card">

          {/* Card header strip — mustard */}
          <div className="sod-card__header">
            <div className="sod-card__hero">
              <div className="sod-card__hero-type mono">START OF DAY</div>
              {heroMeta ? (
                <div className="sod-card__hero-meta mono">{heroMeta}</div>
              ) : null}
            </div>
          </div>

          {/* Card body — cream */}
          <div className="sod-card__body">

            {/* Brief info panel — white inset, shows context.sod_brief fields */}
            {showBrief ? (
              <div className="sod-card__brief-panel">
                {(brief?.date_label || brief?.date_accent) ? (
                  <div className="sod-card__date-line">
                    {brief?.date_label ? (
                      <span className="sod-card__date">{brief.date_label}</span>
                    ) : null}
                    {brief?.date_accent ? (
                      <span className="sod-card__date-accent">{brief.date_accent}</span>
                    ) : null}
                  </div>
                ) : null}
                <div className="sod-card__fields">
                  {brief?.status ? (
                    <div className="sod-card__field">
                      <span className="sod-card__field-k mono">Status</span>
                      <span className="sod-card__field-v">{brief.status}</span>
                    </div>
                  ) : null}
                  {brief?.weather ? (
                    <div className="sod-card__field">
                      <span className="sod-card__field-k mono">Weather</span>
                      <span className="sod-card__field-v">{brief.weather}</span>
                    </div>
                  ) : null}
                  {brief?.events ? (
                    <div className="sod-card__field">
                      <span className="sod-card__field-k mono">Events</span>
                      <span className="sod-card__field-v">{brief.events}</span>
                    </div>
                  ) : null}
                  {brief?.notes ? (
                    <div className="sod-card__field">
                      <span className="sod-card__field-k mono">Notes</span>
                      <span className="sod-card__field-v">{brief.notes}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* UPDATES panel */}
            <div className="sod-card__panel">
              <div className="sod-card__panel-head">
                <span className="sod-card__panel-label mono">UPDATES</span>
              </div>
              <div className="sod-card__panel-body">
                {updatesText ? (
                  <p className="sod-card__panel-text">{updatesText}</p>
                ) : (
                  <div className="sod-card__plus-glyph" aria-hidden>+</div>
                )}
              </div>
            </div>

            {/* NOTES panel */}
            <div className="sod-card__panel">
              <div className="sod-card__panel-head">
                <span className="sod-card__panel-label mono">NOTES</span>
              </div>
              <div className="sod-card__panel-body">
                {comments.length > 0 ? (
                  <p className="sod-card__note-count mono">
                    {comments.length} note{comments.length !== 1 ? "s" : ""}
                  </p>
                ) : null}
                {!taskDone ? (
                  <form className="sod-card__note-form" onSubmit={onPostNote}>
                    <textarea
                      id="staff-task-note-sod"
                      className="sod-card__note-input"
                      rows={2}
                      placeholder="Add a note…"
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      className="sod-card__note-send"
                      disabled={noteBusy || !noteBody.trim()}
                    >
                      {noteBusy ? "…" : "Post"}
                    </button>
                  </form>
                ) : (
                  <div className="sod-card__plus-glyph" aria-hidden>+</div>
                )}
              </div>
            </div>

            {inlineError ? (
              <p className="error sod-card__error">{inlineError}</p>
            ) : null}

            {/* 2-col daily task grid */}
            {checklist.length > 0 ? (
              <div className="sod-card__task-grid">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className={
                      item.done
                        ? "sod-card__task-row sod-card__task-row--done"
                        : "sod-card__task-row"
                    }
                  >
                    <div className="sod-card__task-info">
                      <div className="sod-card__task-title">{item.title}</div>
                      {/* post-beta: per-item location + notes not in checklist schema */}
                    </div>
                    <div className="sod-card__task-actions">
                      <button
                        type="button"
                        className={
                          item.done
                            ? "sod-card__complete-pill sod-card__complete-pill--done"
                            : "sod-card__complete-pill"
                        }
                        onClick={() => onToggleItem(item)}
                        disabled={taskDone || stepsLocked}
                      >
                        {item.done ? "DONE" : "COMPLETE"}
                      </button>
                      {/* post-beta: per-item Details link not wired */}
                      <span className="sod-card__details-link" aria-hidden>Details</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

          </div>

        </div>{/* end sod-card__card */}

        {/* Action pair — inline below card, I'M DONE = start shift */}
        <div className="sod-card__actions" aria-label="Task actions">
          <button
            type="button"
            className="sod-card__action-btn sod-card__action-btn--secondary"
            onClick={onNeedHelp}
            disabled={helpBusy || taskDone}
          >
            {helpBusy ? "…" : "NEED HELP"}
          </button>
          <button
            type="button"
            className="sod-card__action-btn sod-card__action-btn--primary"
            onClick={onImDone}
            disabled={doneBusy || taskDone || paused}
          >
            {taskDone ? "DONE" : doneBusy ? "…" : "START SHIFT"}
          </button>
        </div>

      </div>
    </main>
  );
}
