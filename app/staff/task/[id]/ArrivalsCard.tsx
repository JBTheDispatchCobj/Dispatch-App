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
  ARRIVALS_CANONICAL_CHECKLIST,
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

// ---------------------------------------------------------------------------
// Context parsers — all safe, never throw
// ---------------------------------------------------------------------------

function parseArrivalStatus(raw: unknown): ArrivalStatus {
  if (raw === "prepped" || raw === "ready" || raw === "welcomed") return raw;
  return "open";
}

type IncomingGuest = {
  name: string | null;
  checkin_time: string | null;
  nights: number | null;
  party_size: number | null;
  special_requests: string | null;
};

function parseIncomingGuest(ctx: Record<string, unknown>): IncomingGuest | null {
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

  return {
    name: str("name"),
    checkin_time: str("checkin_time"),
    nights: num("nights"),
    party_size: num("party_size"),
    special_requests: str("special_requests"),
  };
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
  return ARRIVALS_CANONICAL_CHECKLIST.map((title) => ({
    displayTitle: title,
    dbItem:
      dbItems.find((i) => i.title.toLowerCase() === title.toLowerCase()) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Display helpers
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
  if (!iso) return "";
  const m = String(iso).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return iso;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
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
  const stepsLocked = checklistInteractionDisabled(task.status);

  const descNote =
    task.description?.trim() && task.description.trim().length > 0
      ? task.description.trim()
      : null;

  const room = displayRoom(task);
  const dueTime = formatDueTime(task.due_time);
  const heroMeta = dueTime ? `RM ${room} · ${dueTime}` : `RM ${room}`;

  // Compose guest row values
  const guestDisplay = guest?.name
    ? guest.party_size !== null
      ? `${guest.name} (${guest.party_size} ${guest.party_size === 1 ? "guest" : "guests"})`
      : guest.name
    : "—";

  const nightsDisplay =
    guest?.nights !== null && guest?.nights !== undefined
      ? String(guest.nights)
      : "—";

  const requestsDisplay = guest?.special_requests ?? "—";

  const displayChecklist = buildDisplayChecklist(checklist);

  return (
    <main className="staff-app staff-task-exec staff-task-exec--work arrivals-card">
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

        {/* Unified mustard card: header strip + all content */}
        <div className="arrivals-card__card">

          {/* Card header strip */}
          <div className="arrivals-card__header">
            <div className="arrivals-card__hero">
              <div className="arrivals-card__hero-type mono">ARRIVAL</div>
              <div className="arrivals-card__hero-meta mono">{heroMeta}</div>
            </div>
          </div>

          {/* Card body */}
          <div className="arrivals-card__body">

            {/* Single-column info panel */}
            <div className="arrivals-card__panel">
              <div className="arrivals-card__row">
                <span className="arrivals-card__row-k mono">GUEST</span>
                <span className="arrivals-card__row-v">{guestDisplay}</span>
              </div>
              <div className="arrivals-card__row">
                <span className="arrivals-card__row-k mono">NIGHTS</span>
                <span className="arrivals-card__row-v">{nightsDisplay}</span>
              </div>
              <div className="arrivals-card__row">
                <span className="arrivals-card__row-k mono">EXTRAS</span>
                <span className="arrivals-card__row-v">—</span>
              </div>
              <div className="arrivals-card__row">
                <span className="arrivals-card__row-k mono">REQUESTS</span>
                <span className="arrivals-card__row-v arrivals-card__row-v--note">
                  {requestsDisplay}
                </span>
              </div>
              {descNote ? (
                <div className="arrivals-card__row">
                  <span className="arrivals-card__row-k mono">SETUP</span>
                  <span className="arrivals-card__row-v arrivals-card__row-v--note">
                    {descNote}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Status row — radio-dot */}
            <div
              className="arrivals-card__status-row"
              role="group"
              aria-label="Room readiness status"
            >
              <span className="arrivals-card__status-label mono">STATUS</span>
              <div className="arrivals-card__status-opts">
                {ARRIVAL_STATUS_CHIPS.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    className={
                      arrivalStatus === chip.value
                        ? "arrivals-card__status-opt arrivals-card__status-opt--active"
                        : "arrivals-card__status-opt"
                    }
                    onClick={() => void onSetArrivalStatus(chip.value)}
                    disabled={taskDone || statusBusy}
                    aria-pressed={arrivalStatus === chip.value}
                  >
                    <span className="arrivals-card__status-dot" aria-hidden />
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {inlineError ? (
              <p className="error arrivals-card__error">{inlineError}</p>
            ) : null}

            {/* 2-tile grid */}
            <div className="arrivals-card__tile-grid">

              {/* CHECKLIST */}
              <div className="arrivals-card__tile arrivals-card__tile--checklist">
                <div className="arrivals-card__tile-head mono">CHECKLIST</div>
                <div className="arrivals-card__tile-body">
                  {displayChecklist.map((item, idx) => (
                    <button
                      key={item.dbItem?.id ?? `canonical-${idx}`}
                      type="button"
                      className={
                        item.dbItem?.done
                          ? "arrivals-card__check-item arrivals-card__check-item--done"
                          : "arrivals-card__check-item"
                      }
                      onClick={() => {
                        if (item.dbItem) onToggleItem(item.dbItem);
                      }}
                      disabled={taskDone || stepsLocked || !item.dbItem}
                      aria-pressed={item.dbItem?.done ?? false}
                    >
                      <span className="arrivals-card__check-ring" aria-hidden />
                      <span className="arrivals-card__check-txt">{item.displayTitle}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* NOTES */}
              <div className="arrivals-card__tile arrivals-card__tile--notes">
                <div className="arrivals-card__tile-head mono">NOTES</div>
                <div className="arrivals-card__tile-body">
                  {comments.length > 0 ? (
                    <p className="arrivals-card__tile-note-count mono">
                      {comments.length} note{comments.length !== 1 ? "s" : ""}
                    </p>
                  ) : null}
                  {!taskDone ? (
                    <form
                      className="arrivals-card__note-form"
                      onSubmit={onPostNote}
                    >
                      <textarea
                        id="staff-task-note-arr"
                        className="arrivals-card__note-input"
                        rows={2}
                        placeholder="Add a note…"
                        value={noteBody}
                        onChange={(e) => setNoteBody(e.target.value)}
                        autoComplete="off"
                      />
                      <button
                        type="submit"
                        className="arrivals-card__note-send"
                        disabled={noteBusy || !noteBody.trim()}
                      >
                        {noteBusy ? "…" : "Post"}
                      </button>
                    </form>
                  ) : (
                    <div className="arrivals-card__plus-glyph" aria-hidden>+</div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>{/* end arrivals-card__card */}

        {/* Action pair — inline below card, not pinned to viewport */}
        <div className="arrivals-card__actions" aria-label="Task actions">
          <button
            type="button"
            className="arrivals-card__action-btn arrivals-card__action-btn--secondary"
            onClick={onNeedHelp}
            disabled={helpBusy || taskDone}
          >
            {helpBusy ? "…" : "NEED HELP"}
          </button>
          <button
            type="button"
            className="arrivals-card__action-btn arrivals-card__action-btn--primary"
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
