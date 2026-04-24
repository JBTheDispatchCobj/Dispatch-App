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

type EodSummary = {
  tasks_done_count: number | null;
  tasks_open_count: number | null;
  handoff_notes: string | null;
};

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

  return {
    tasks_done_count: num("tasks_done_count"),
    tasks_open_count: num("tasks_open_count"),
    handoff_notes: str("handoff_notes"),
  };
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
  userId: _userId,
  displayName,
  checklist: _checklist,
  comments,
  inlineError,
  noteBody,
  setNoteBody,
  noteBusy,
  helpBusy,
  doneBusy,
  pauseBusy,
  resumeBusy,
  onToggleItem: _onToggleItem,
  onNeedHelp,
  onImDone,
  onPause,
  onResume,
  onPostNote,
}: EODCardProps) {
  const summary = parseEodSummary(task.context);

  const taskDone = task.status === "done";
  const inProgress = task.status === "in_progress";
  const paused = task.status === "paused";

  const heroMeta = displayName
    ? `LOOK AT ALL YOU DID · ${displayName.toUpperCase()}`
    : "LOOK AT ALL YOU DID";

  return (
    <main className="staff-app staff-task-exec staff-task-exec--work eod-card">
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

        {/* Unified salmon card: header strip + all content */}
        <div className="eod-card__card">

          {/* Card header strip */}
          <div className="eod-card__header">
            <div className="eod-card__hero">
              {/* cream text: --eod-text (#4A1B0C) fails contrast on --eod-header (#C75F5F) */}
              <div className="eod-card__hero-type mono">EOD</div>
              <div className="eod-card__hero-meta mono">{heroMeta}</div>
            </div>
          </div>

          {/* Card body */}
          <div className="eod-card__body">

            {/* Team Status panel */}
            <div className="eod-card__panel">
              <div className="eod-card__tile-head mono">TEAM STATUS</div>
              <div className="eod-card__panel-body">
                {summary?.tasks_done_count !== null && summary?.tasks_done_count !== undefined ? (
                  <p className="eod-card__status-line">
                    {summary.tasks_done_count} task{summary.tasks_done_count !== 1 ? "s" : ""} completed today.
                  </p>
                ) : null}
                {summary?.tasks_open_count !== null && summary?.tasks_open_count !== undefined ? (
                  <p className="eod-card__status-line">{summary.tasks_open_count} still open.</p>
                ) : null}
                {summary?.handoff_notes ? (
                  <p className="eod-card__status-line">{summary.handoff_notes}</p>
                ) : null}
                {/* post-beta: celebratory recap template (dynamic "You cleaned X rooms") not wired */}
                <p className="eod-card__status-celebrate">
                  {displayName ? `Great job today, ${displayName}!` : "Great shift today!"}
                </p>
              </div>
            </div>

            {inlineError ? (
              <p className="error eod-card__error">{inlineError}</p>
            ) : null}

            {/* 2×2 tile grid — all static placeholders (post-beta derived views) */}
            <div className="eod-card__tile-grid">

              {/* OPEN STILL — post-beta: query for unfinished tasks */}
              <div className="eod-card__tile">
                <div className="eod-card__tile-head mono">OPEN STILL</div>
                <div className="eod-card__tile-body">
                  <div className="eod-card__plus-glyph" aria-hidden>+</div>
                  <p className="eod-card__tile-caption">Tasks still open will appear here.</p>
                </div>
              </div>

              {/* REVIEW — post-beta: notes left by staff */}
              <div className="eod-card__tile">
                <div className="eod-card__tile-head mono">REVIEW</div>
                <div className="eod-card__tile-body">
                  <div className="eod-card__plus-glyph" aria-hidden>+</div>
                  <p className="eod-card__tile-caption">Your notes from today.</p>
                </div>
              </div>

              {/* WHAT'S NEXT — post-beta: forward-looking notes */}
              <div className="eod-card__tile">
                <div className="eod-card__tile-head mono">WHAT'S NEXT</div>
                <div className="eod-card__tile-body">
                  <div className="eod-card__plus-glyph" aria-hidden>+</div>
                  <p className="eod-card__tile-caption">Notes for tomorrow and admin.</p>
                </div>
              </div>

              {/* SUPPLY NEEDS — post-beta: supply request feed */}
              <div className="eod-card__tile">
                <div className="eod-card__tile-head mono">SUPPLY NEEDS</div>
                <div className="eod-card__tile-body">
                  <div className="eod-card__plus-glyph" aria-hidden>+</div>
                  <p className="eod-card__tile-caption">Supply requests sent to admin.</p>
                </div>
              </div>

            </div>

            {/* Notes form below tile grid */}
            {comments.length > 0 || !taskDone ? (
              <div className="eod-card__notes-panel">
                {comments.length > 0 ? (
                  <p className="eod-card__notes-count mono">
                    {comments.length} note{comments.length !== 1 ? "s" : ""}
                  </p>
                ) : null}
                {!taskDone ? (
                  <form className="eod-card__note-form" onSubmit={onPostNote}>
                    <textarea
                      id="staff-task-note-eod"
                      className="eod-card__note-input"
                      rows={2}
                      placeholder="Add a handoff note…"
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      className="eod-card__note-send"
                      disabled={noteBusy || !noteBody.trim()}
                    >
                      {noteBusy ? "…" : "Post"}
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}

          </div>

        </div>{/* end eod-card__card */}

        {/* Action pair — inline below card, I'M DONE = wrap shift */}
        <div className="eod-card__actions" aria-label="Task actions">
          <button
            type="button"
            className="eod-card__action-btn eod-card__action-btn--secondary"
            onClick={onNeedHelp}
            disabled={helpBusy || taskDone}
          >
            {helpBusy ? "…" : "NEED HELP"}
          </button>
          <button
            type="button"
            className="eod-card__action-btn eod-card__action-btn--primary"
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
