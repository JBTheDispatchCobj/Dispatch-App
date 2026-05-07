"use client";

import Link from "next/link";
import { type FormEvent } from "react";
import { type TaskCard } from "@/app/tasks/[id]/task-card-shared";
import { type NoteRow } from "@/lib/notes";
import NoteComposeForm from "./NoteComposeForm";
import { type ExecutionChecklistItem } from "@/lib/staff-task-execution-checklist";
import { formatCommentTime, formatTodayDate, firstNameFromDisplayName } from "@/lib/staff-card-formatters";

// ---------------------------------------------------------------------------
// Context parsers — safe, never throw
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
// Display helpers
// ---------------------------------------------------------------------------

function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type EODCardProps = {
  task: TaskCard;
  userId: string | null;
  displayName: string;
  checklist: ExecutionChecklistItem[];
  notes: NoteRow[];
  inlineError: string | null;
  setInlineError: (e: string | null) => void;
  noteBody: string;
  setNoteBody: (v: string) => void;
  noteType: string;
  setNoteType: (v: string) => void;
  noteStatus: string;
  setNoteStatus: (v: string) => void;
  noteAssignedTo: string;
  setNoteAssignedTo: (v: string) => void;
  // Day 40 III.E + V.G — optional photo on the note compose. EOD has no
  // Maintenance host per master plan I.I, so only the Notes file pair is
  // threaded here.
  noteFile: File | null;
  setNoteFile: (f: File | null) => void;
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
  /** Phase 2b — cross-staff EOD activation gate state. */
  wrapBlockedBy: string[];
  canWrapKnown: boolean;
  canWrapBusy: boolean;
  onRefreshCanWrap: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EODCard({
  task,
  userId: _userId,
  displayName,
  checklist: _checklist,
  notes,
  inlineError,
  noteBody,
  setNoteBody,
  noteType,
  setNoteType,
  noteStatus,
  setNoteStatus,
  noteAssignedTo,
  setNoteAssignedTo,
  noteFile,
  setNoteFile,
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
  wrapBlockedBy,
  canWrapKnown,
  canWrapBusy,
  onRefreshCanWrap,
}: EODCardProps) {
  const summary = parseEodSummary(task.context);

  const taskDone = task.status === "done";
  const inProgress = task.status === "in_progress";
  const paused = task.status === "paused";

  // Greet loc — tasks done today; fallback to location_label then static
  const greetLoc =
    summary?.tasks_done_count != null
      ? `${summary.tasks_done_count} task${summary.tasks_done_count !== 1 ? "s" : ""} done`
      : task.location_label?.trim() || "End of Day";

  // Greet date line — today's date with optional short handoff note suffix
  const dateLine = (() => {
    const date = formatTodayDate();
    const notes = summary?.handoff_notes?.trim();
    return notes && notes.length <= 40 ? `${date} · ${notes}` : date;
  })();

  // Review entries — current user's notes posted today only (Gap 5)
  // Filters to first-person "You noted:" voice: only self-authored, only today.
  // user_id on NoteRow is projected from notes.author_user_id (see lib/notes.ts).
  const reviewEntries = notes.filter(
    (n) => n.user_id === _userId && isToday(n.created_at),
  );

  const firstName = firstNameFromDisplayName(displayName);

  return (
    <div className="preview-e-430">
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

          {/* Topstrip — back nav only; ＋ dropped (no compose drawer) */}
          <div className="topstrip">
            <Link href="/staff" className="icon-circle" aria-label="Back to tasks">←</Link>
          </div>

          {/* Greeting block */}
          <header className="greet">
            <div className="greet__label">
              <span className="greet__chip">End of Day</span>
              <span className="greet__loc">{greetLoc}</span>
            </div>
            {/* TODO: replace with system-set rotating EOD phrase field when
                schema adds it. Currently locked to artifact example. */}
            <h1 className="greet__hello">
              {`You crushed it, ${firstName ?? "team"}.`}
            </h1>
            <div className="greet__date">{dateLine}</div>
          </header>

          {/* Team Updates — locked placeholder (Gap 4; no roster data available) */}
          <section className="section">
            <header className="section__head">
              <span className="section__label">Team Updates</span>
              <span className="section__count">Coming soon</span>
            </header>
            <div className="team" aria-hidden style={{ opacity: 0.55, minHeight: "52px" }} />
          </section>

          {inlineError ? <p className="error">{inlineError}</p> : null}

          {/* Review section — current-user notes from today, "You noted:" voice */}
          <section className="section">
            <header className="section__head">
              <span className="section__label">Review</span>
              <span className="section__count">
                {reviewEntries.length > 0
                  ? `${reviewEntries.length} from today`
                  : "no entries yet"}
              </span>
            </header>
            {reviewEntries.length > 0 ? (
              <div className="notes">
                {reviewEntries.map((note) => (
                  <button key={note.id} className="note" type="button">
                    <div className="note__head">
                      <span className="note__dot" />
                      <div className="note__body">
                        <div className="note__line">
                          <span className="note__name">You</span>
                          <span className="note__action"> noted: </span>
                          <span className="note__quote">&ldquo;{note.body}&rdquo;</span>
                        </div>
                        {note.note_type || note.note_status || note.note_assigned_to ? (
                          <div className="note__chips">
                            {note.note_type ? (
                              <span className="note__chip">{note.note_type}</span>
                            ) : null}
                            {note.note_status ? (
                              <span className="note__chip">{note.note_status}</span>
                            ) : null}
                            {note.note_assigned_to ? (
                              <span className="note__chip">→ {note.note_assigned_to}</span>
                            ) : null}
                          </div>
                        ) : null}
                        {note.image_url ? (
                          <a
                            href={note.image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="staff-photo-thumb-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <img
                              src={note.image_url}
                              alt=""
                              className="staff-photo-thumb"
                            />
                          </a>
                        ) : null}
                      </div>
                      <span className="note__time">
                        {formatCommentTime(note.created_at)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
            {/* Inline compose — drop ＋ topstrip, form is the compose UI */}
            {!taskDone ? (
              <NoteComposeForm
                body={noteBody}
                setBody={setNoteBody}
                noteType={noteType}
                setNoteType={setNoteType}
                noteStatus={noteStatus}
                setNoteStatus={setNoteStatus}
                noteAssignedTo={noteAssignedTo}
                setNoteAssignedTo={setNoteAssignedTo}
                file={noteFile}
                setFile={setNoteFile}
                onSubmit={onPostNote}
                busy={noteBusy}
                placeholder="Note for the wrap…"
                rows={2}
                className="note-compose--section"
              />
            ) : null}
          </section>

          {/* What's Next — locked placeholder (Gap 6; ResNexus data, out of Phase 3 scope) */}
          <section className="section">
            <header className="section__head">
              <span className="section__label">{"What's Next"}</span>
              <span className="section__count">Coming soon</span>
            </header>
            <div className="brief" aria-hidden style={{ opacity: 0.55, minHeight: "52px" }} />
          </section>

          {/* Supply Needs — locked placeholder (Gap 7; supply CRUD out of Phase 3 scope) */}
          <section className="section">
            <header className="section__head">
              <span className="section__label">Supply Needs</span>
              <span className="section__count">Coming soon</span>
            </header>
            <div className="supply" aria-hidden style={{ opacity: 0.55, minHeight: "52px" }} />
          </section>

          {/* Phase 2b — cross-staff EOD activation gate. The Wrap Shift
              button is locked when there are still on-shift housekeepers
              who haven't started their EOD card. Fail-open via
              canWrapShift's error handling — when the gate fetch errors,
              wrapBlockedBy stays empty and the button is enabled. */}
          {!taskDone && wrapBlockedBy.length > 0 ? (
            <div className="staff-task-exec-eod-gate" role="status" aria-live="polite">
              <div className="staff-task-exec-eod-gate-icon" aria-hidden>
                ⏸
              </div>
              <div className="staff-task-exec-eod-gate-body">
                <div className="staff-task-exec-eod-gate-title">Wrap Shift locked</div>
                <div className="staff-task-exec-eod-gate-msg">
                  Waiting on {wrapBlockedBy.join(", ")} to start their End of Day.
                </div>
              </div>
              <button
                type="button"
                className="staff-task-exec-eod-gate-refresh"
                onClick={onRefreshCanWrap}
                disabled={canWrapBusy}
              >
                {canWrapBusy ? "…" : "Refresh"}
              </button>
            </div>
          ) : null}

          {/* CTAs — "Wrap Shift" label on primary; wired to onImDone.
              Phase 2a wires clockOut into onImDone for EOD card_type.
              Phase 2b disables the button until canWrapKnown resolves
              and while wrapBlockedBy is non-empty. */}
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
              disabled={
                doneBusy ||
                taskDone ||
                paused ||
                !canWrapKnown ||
                wrapBlockedBy.length > 0
              }
            >
              {taskDone ? "Done" : doneBusy ? "…" : "Wrap Shift"}
            </button>
          </div>

        </div>{/* end .shell */}
      </div>{/* end .page */}
    </div>/* end .preview-e-430 */
  );
}
