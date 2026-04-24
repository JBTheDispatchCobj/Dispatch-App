"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import {
  type CommentRow,
  type TaskCard,
} from "@/app/tasks/[id]/task-card-shared";
import { logTaskEvent, withTaskEventSchema } from "@/lib/task-events";
import { supabase } from "@/lib/supabase";
import {
  type ExecutionChecklistItem,
  DEPARTURES_CANONICAL_CHECKLIST,
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
  { value: "sheets", label: "Sheets" },
  { value: "stripped", label: "Stripped" },
  { value: "done", label: "Done" },
];

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

function parseDepartureStatus(raw: unknown): DepartureStatus {
  if (raw === "stripped" || raw === "sheets" || raw === "done") return raw;
  return "open";
}

function checklistInteractionDisabled(status: string): boolean {
  return status === "done" || status === "blocked" || status === "paused";
}

// ---------------------------------------------------------------------------
// Canonical checklist merge
// ---------------------------------------------------------------------------

type DisplayChecklistItem = {
  displayTitle: string;
  dbItem: ExecutionChecklistItem | null;
};

function buildDisplayChecklist(
  dbItems: ExecutionChecklistItem[],
): DisplayChecklistItem[] {
  return DEPARTURES_CANONICAL_CHECKLIST.map((title) => ({
    displayTitle: title,
    dbItem:
      dbItems.find(
        (i) => i.title.toLowerCase() === title.toLowerCase(),
      ) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Room display
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

  const taskDone = task.status === "done";
  const inProgress = task.status === "in_progress";
  const paused = task.status === "paused";
  const stepsLocked = checklistInteractionDisabled(task.status);

  const descNote =
    task.description?.trim() && task.description.trim().length > 0
      ? task.description.trim()
      : null;

  const room = displayRoom(task);
  const heroMeta = task.location_label
    ? `RM ${room} · ${task.location_label.toUpperCase()}`
    : `RM ${room}`;

  const displayChecklist = buildDisplayChecklist(checklist);

  return (
    <main className="staff-app staff-task-exec staff-task-exec--work departures-card">
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

        {/* Unified teal card: header strip + all content */}
        <div className="departures-card__card">

        {/* Card header strip */}
        <div className="departures-card__header">
          <div className="departures-card__hero">
            <div className="departures-card__hero-type mono">DEPARTURE</div>
            <div className="departures-card__hero-meta mono">{heroMeta}</div>
          </div>
        </div>

        {/* Card body */}
        <div className="departures-card__body">

          {/* Dual-column guest panel — OUTGOING/INCOMING */}
          <div className="departures-card__panel departures-card__panel--dual">
            <div className="departures-card__col">
              <div className="departures-card__col-head mono">OUTGOING</div>
              <div className="departures-card__field">
                <span className="departures-card__field-k mono">Guests</span>
                <span className="departures-card__field-v">—</span>
              </div>
              <div className="departures-card__field">
                <span className="departures-card__field-k mono">Nights Stayed</span>
                <span className="departures-card__field-v">—</span>
              </div>
              <div className="departures-card__field">
                <span className="departures-card__field-k mono">Clean Type</span>
                <span className="departures-card__field-v">—</span>
              </div>
              <div className="departures-card__field">
                <span className="departures-card__field-k mono">Extras</span>
                <span className="departures-card__field-v">—</span>
              </div>
            </div>
            <div className="departures-card__col">
              <div className="departures-card__col-head mono">INCOMING</div>
              <div className="departures-card__field">
                <span className="departures-card__field-k mono">Guest Name</span>
                <span className="departures-card__field-v">—</span>
              </div>
              <div className="departures-card__field">
                <span className="departures-card__field-k mono">Guests</span>
                <span className="departures-card__field-v">—</span>
              </div>
              <p className="departures-card__incoming-notes">
                <span className="mono" style={{ fontWeight: 500 }}>Notes:</span>{" "}—
              </p>
            </div>
          </div>

          {/* Daily setup panel — from task.description */}
          {descNote ? (
            <div className="departures-card__panel departures-card__panel--single">
              <div className="departures-card__panel-label mono">DAILY SETUP</div>
              <div className="departures-card__panel-value">{descNote}</div>
            </div>
          ) : null}

          {/* Status row — radio-dot, same write path as before */}
          <div
            className="departures-card__status-row"
            role="group"
            aria-label="Room turnover status"
          >
            <span className="departures-card__status-label mono">STATUS</span>
            <div className="departures-card__status-opts">
              {DEPARTURE_STATUS_CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  className={
                    departureStatus === chip.value
                      ? "departures-card__status-opt departures-card__status-opt--active"
                      : "departures-card__status-opt"
                  }
                  onClick={() => void onSetDepartureStatus(chip.value)}
                  disabled={taskDone || statusBusy}
                  aria-pressed={departureStatus === chip.value}
                >
                  <span className="departures-card__status-dot" aria-hidden />
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {inlineError ? (
            <p className="error departures-card__error">{inlineError}</p>
          ) : null}

          {/* 2×2 tile grid */}
          <div className="departures-card__tile-grid">

            {/* CHECKLIST — canonical 7-item list merged with DB state */}
            <div className="departures-card__tile departures-card__tile--checklist">
              <div className="departures-card__tile-head mono">CHECKLIST</div>
              <div className="departures-card__tile-body">
                {displayChecklist.map((item, idx) => (
                  <button
                    key={item.dbItem?.id ?? `canonical-${idx}`}
                    type="button"
                    className={
                      item.dbItem?.done
                        ? "departures-card__check-item departures-card__check-item--done"
                        : "departures-card__check-item"
                    }
                    onClick={() => {
                      if (item.dbItem) onToggleItem(item.dbItem);
                    }}
                    disabled={taskDone || stepsLocked || !item.dbItem}
                    aria-pressed={item.dbItem?.done ?? false}
                  >
                    <span className="departures-card__check-ring" aria-hidden />
                    <span className="departures-card__check-txt">{item.displayTitle}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* NOTES */}
            <div className="departures-card__tile departures-card__tile--notes">
              <div className="departures-card__tile-head mono">NOTES</div>
              <div className="departures-card__tile-body">
                {comments.length > 0 ? (
                  <p className="departures-card__tile-note-count mono">
                    {comments.length} note{comments.length !== 1 ? "s" : ""}
                  </p>
                ) : null}
                {!taskDone ? (
                  <form
                    className="departures-card__note-form"
                    onSubmit={onPostNote}
                  >
                    <textarea
                      id="staff-task-note-dep"
                      className="departures-card__note-input"
                      rows={2}
                      placeholder="Add a note…"
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      className="departures-card__note-send"
                      disabled={noteBusy || !noteBody.trim()}
                    >
                      {noteBusy ? "…" : "Post"}
                    </button>
                  </form>
                ) : (
                  <div className="departures-card__plus-glyph" aria-hidden>+</div>
                )}
              </div>
            </div>

            {/* DEEP CLEAN — placeholder (BR post-beta) */}
            <div className="departures-card__tile departures-card__tile--placeholder">
              <div className="departures-card__tile-head mono">DEEP CLEAN</div>
              <div className="departures-card__tile-body">
                <div className="departures-card__plus-glyph" aria-hidden>+</div>
              </div>
            </div>

            {/* MAINT. — placeholder (BR post-beta) */}
            <div className="departures-card__tile departures-card__tile--placeholder">
              <div className="departures-card__tile-head mono">MAINT.</div>
              <div className="departures-card__tile-body">
                <div className="departures-card__plus-glyph" aria-hidden>+</div>
              </div>
            </div>

          </div>
        </div>

        </div>{/* end departures-card__card */}

        {/* Action pair — inline below card, not pinned to viewport */}
        <div className="departures-card__actions" aria-label="Task actions">
          <button
            type="button"
            className="departures-card__action-btn departures-card__action-btn--secondary"
            onClick={onNeedHelp}
            disabled={helpBusy || taskDone}
          >
            {helpBusy ? "…" : "NEED HELP"}
          </button>
          <button
            type="button"
            className="departures-card__action-btn departures-card__action-btn--primary"
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
