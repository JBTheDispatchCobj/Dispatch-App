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
import { resolveChecklist } from "@/lib/checklists/resolve";
import ChecklistDrillDown from "./ChecklistDrillDown";

// ---------------------------------------------------------------------------
// Departure-specific types
// ---------------------------------------------------------------------------

type DepartureStatus = "open" | "stripped" | "sheets" | "done";

const DEPARTURE_STATUS_CHIPS: ReadonlyArray<{
  value: DepartureStatus;
  label: string;
}> = [
  { value: "open",     label: "Open" },
  { value: "sheets",   label: "Sheets" },
  { value: "stripped", label: "Stripped" },
  { value: "done",     label: "Done" },
];

// ---------------------------------------------------------------------------
// Context parsers
// ---------------------------------------------------------------------------

function parseDepartureStatus(raw: unknown): DepartureStatus {
  if (raw === "stripped" || raw === "sheets" || raw === "done") return raw;
  return "open";
}

type GuestRecord = {
  name: string | null;
  guests: string | null;
  nights: string | null;
  clean_type: string | null;
  party: string | null;
  notes: string | null;
};

function parseGuestRecord(raw: unknown): GuestRecord {
  const empty: GuestRecord = { name: null, guests: null, nights: null, clean_type: null, party: null, notes: null };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;
  const g = raw as Record<string, unknown>;
  const str = (k: string): string | null => {
    const v = g[k];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  return {
    name:       str("name"),
    guests:     str("guests"),
    nights:     str("nights"),
    clean_type: str("clean_type"),
    party:      str("party"),
    notes:      str("notes"),
  };
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

function buildDisplayChecklist(dbItems: ExecutionChecklistItem[]): DisplayChecklistItem[] {
  return DEPARTURES_CANONICAL_CHECKLIST.map((title) => ({
    displayTitle: title,
    dbItem: dbItems.find((i) => i.title.toLowerCase() === title.toLowerCase()) ?? null,
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
  const [showChecklist, setShowChecklist] = useState(false);

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

  const checklistTree = resolveChecklist("housekeeping_turn", task.room_number);
  const outgoing = parseGuestRecord(task.context.outgoing_guest);
  const incoming = parseGuestRecord(task.context.incoming_guest);

  const taskDone   = task.status === "done";
  const inProgress = task.status === "in_progress";
  const paused     = task.status === "paused";
  const stepsLocked = checklistInteractionDisabled(task.status);

  const descNote =
    task.description?.trim() && task.description.trim().length > 0
      ? task.description.trim()
      : null;

  const room    = displayRoom(task);
  const dueTime = formatDueTime(task.due_time);

  const displayChecklist = buildDisplayChecklist(checklist);
  const doneCount = displayChecklist.filter((i) => i.dbItem?.done).length;

  return (
    <div className="preview-d-430">

      {/* ChecklistDrillDown — position:fixed overlay, mounts outside shell */}
      {showChecklist ? (
        <ChecklistDrillDown
          root={checklistTree}
          onClose={() => setShowChecklist(false)}
        />
      ) : null}

      <div className="page">

        {/* Pause/Resume toolbar — above shell, only when task is active or paused.
            Back nav lives in the topstrip below; toolbar is action-only here. */}
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

          {/* Topstrip — back nav only; ＋ button dropped (no compose drawer, gap 5) */}
          <div className="topstrip">
            <Link href="/staff" className="icon-circle" aria-label="Back to tasks">←</Link>
          </div>

          {/* Greeting block */}
          <header className="greet">
            <div className="greet__label">
              <span className="greet__chip">Departure</span>
              <span className="greet__loc">Room {room}</span>
            </div>
            <h1 className="greet__hello">{task.title}</h1>
            <div className="greet__date">{dueTime ? `Due ${dueTime}` : " "}</div>
          </header>

          {/* Brief — outgoing / incoming dual column */}
          <section className="brief">
            <div className="cols">
              <div className="col">
                <h3 className="col__heading">Outgoing</h3>
                <div className="col__row">
                  <span className="col__label">Guests</span>
                  <span className="col__value">{outgoing.guests ?? "—"}</span>
                </div>
                <div className="col__row">
                  <span className="col__label">Nights</span>
                  <span className="col__value">{outgoing.nights ?? "—"}</span>
                </div>
                <div className="col__row">
                  <span className="col__label">Clean</span>
                  <span className="col__value">{outgoing.clean_type ?? "—"}</span>
                </div>
              </div>
              <div className="col col--right">
                <h3 className="col__heading">Incoming</h3>
                <div className="col__row">
                  <span className="col__label">Party</span>
                  <span className="col__value">{incoming.party ?? "—"}</span>
                </div>
                <div className="col__row">
                  <span className="col__label">Nights</span>
                  <span className="col__value">{incoming.nights ?? "—"}</span>
                </div>
                <div className="col__row">
                  <span className="col__label">Notes</span>
                  <span className="col__value col__value--small">{incoming.notes ?? "—"}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Setstat — setup (read-only display) + notes compose + status pills */}
          <section className="setstat">
            <div className="setstat__row">
              <div className="setstat__label">Setup</div>
              <div className="setstat__input">{descNote ?? "—"}</div>
            </div>
            <div className="setstat__row">
              <div className="setstat__label">Notes</div>
              <form onSubmit={onPostNote}>
                {comments.length > 0 ? (
                  <p className="setstat__note-count">
                    {comments.length} note{comments.length !== 1 ? "s" : ""}
                  </p>
                ) : null}
                <textarea
                  className="setstat__input"
                  placeholder="Add notes for this turnover…"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  disabled={noteBusy || taskDone}
                  rows={3}
                />
                {!taskDone ? (
                  <button
                    type="submit"
                    className="compose__submit"
                    disabled={noteBusy || !noteBody.trim()}
                  >
                    {noteBusy ? "…" : "Post"}
                  </button>
                ) : null}
              </form>
            </div>
            <div className="setstat__row setstat__row--status">
              <div className="setstat__label">Status</div>
              <div className="setstat__pills" role="group" aria-label="Room turnover status">
                {DEPARTURE_STATUS_CHIPS.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    className={
                      departureStatus === chip.value
                        ? "status-pill status-pill--active"
                        : "status-pill"
                    }
                    onClick={() => void onSetDepartureStatus(chip.value)}
                    disabled={taskDone || statusBusy}
                    aria-pressed={departureStatus === chip.value}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {inlineError ? <p className="error">{inlineError}</p> : null}

          {/* Checklist — bar fill driven by data-checked CSS selector, no inline style needed */}
          <section className="section">
            <header className="section__head">
              <span className="section__label">Checklist</span>
              <span className="section__count">{doneCount} of {displayChecklist.length} done</span>
            </header>
            <div className="bucketcard">
              {displayChecklist.map((item, idx) => (
                <div
                  key={item.dbItem?.id ?? `canonical-${idx}`}
                  role="button"
                  tabIndex={stepsLocked || taskDone || !item.dbItem ? -1 : 0}
                  className="brow"
                  data-checked={item.dbItem?.done ? "true" : "false"}
                  onClick={() => {
                    if (item.dbItem && !stepsLocked && !taskDone) onToggleItem(item.dbItem);
                  }}
                  onKeyDown={(e) => {
                    if (
                      (e.key === " " || e.key === "Enter") &&
                      item.dbItem &&
                      !stepsLocked &&
                      !taskDone
                    ) {
                      e.preventDefault();
                      onToggleItem(item.dbItem);
                    }
                  }}
                  aria-pressed={item.dbItem?.done ?? false}
                  aria-disabled={!item.dbItem || stepsLocked || taskDone}
                >
                  <div className="brow__head">
                    <span className="brow__label">
                      <span className="brow__num">{idx + 1}</span>
                      {item.displayTitle}
                    </span>
                    <span className="brow__right">
                      <span className="brow__meta">
                        {item.dbItem?.done ? "Done" : "Pending"}
                      </span>
                      <span className="brow__sep">·</span>
                      <button
                        type="button"
                        className="brow__details"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowChecklist(true);
                        }}
                      >
                        Details ›
                      </button>
                    </span>
                  </div>
                  <div className="bar">
                    <div className="bar__fill" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Per-room work — DC and MX as locked placeholders (beta scope gaps 3 & 4) */}
          <section className="section">
            <header className="section__head">
              <span className="section__label">Per-room work</span>
              <span className="section__count">Deep Clean · Maintenance</span>
            </header>

            <div className="exrow" data-open="false">
              <div className="exrow__head" style={{ cursor: "default", opacity: 0.55 }}>
                <span className="exrow__icon">DC</span>
                <div className="exrow__text">
                  <div className="exrow__title">Deep Clean</div>
                  <div className="exrow__sub">Coming soon</div>
                </div>
                <span className="exrow__chev">›</span>
              </div>
            </div>

            <div className="exrow" data-open="false" style={{ marginTop: "8px" }}>
              <div className="exrow__head" style={{ cursor: "default", opacity: 0.55 }}>
                <span className="exrow__icon">MX</span>
                <div className="exrow__text">
                  <div className="exrow__title">Maintenance</div>
                  <div className="exrow__sub">Coming soon</div>
                </div>
                <span className="exrow__chev">›</span>
              </div>
            </div>
          </section>

          {/* CTAs */}
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
    </div>/* end .preview-d-430 */
  );
}
