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

  return (
    <main className="staff-app departures-card">
      {showChecklist ? (
        <ChecklistDrillDown
          root={checklistTree}
          onClose={() => setShowChecklist(false)}
        />
      ) : null}

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
        <div className="departures-card__shell">

          {/* Hero — three ink-stamp pills */}
          <div className="departures-card__hero">
            <span className="hero-stamp departures-card__stamp">DEPARTURE</span>
            <span className="hero-stamp departures-card__stamp">RM {room}</span>
            {dueTime ? (
              <span className="hero-stamp departures-card__stamp">{dueTime}</span>
            ) : null}
          </div>

          {/* Body */}
          <div className="departures-card__body">

            {/* Dual panel — Outgoing / Incoming */}
            <div className="departures-card__panel">
              <div className="departures-card__dual">
                <div className="departures-card__dual-col">
                  <div className="departures-card__dual-head">OUTGOING</div>
                  <p className="departures-card__dual-p">{outgoing.name ?? "—"}</p>
                  <div className="departures-card__dual-k">Guests</div>
                  <p className="departures-card__dual-p">{outgoing.guests ?? "—"}</p>
                  <div className="departures-card__dual-k">Nights</div>
                  <p className="departures-card__dual-p">{outgoing.nights ?? "—"}</p>
                  <div className="departures-card__dual-k">Clean</div>
                  <p className="departures-card__dual-p">{outgoing.clean_type ?? "—"}</p>
                </div>
                <div className="departures-card__dual-col">
                  <div className="departures-card__dual-head">INCOMING</div>
                  <p className="departures-card__dual-p">{incoming.name ?? "—"}</p>
                  <div className="departures-card__dual-k">Party</div>
                  <p className="departures-card__dual-p">{incoming.party ?? "—"}</p>
                  <div className="departures-card__dual-k">Notes</div>
                  <p className="departures-card__dual-p">{incoming.notes ?? "—"}</p>
                </div>
              </div>
            </div>

            {/* Info ledger — setup + context */}
            <div className="departures-card__panel">
              <div className="departures-card__info-list">
                <div className="departures-card__info-row">
                  <div className="departures-card__info-label">SETUP</div>
                  <div className="departures-card__info-val">
                    {descNote ?? "—"}
                  </div>
                </div>
                <div className="departures-card__info-row">
                  <div className="departures-card__info-label">STATUS</div>
                  <div className="departures-card__info-val">
                    {task.location_label ?? "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Status panel */}
            <div className="departures-card__panel">
              <div className="departures-card__panel-head">
                <span>STATUS</span>
              </div>
              <div
                className="departures-card__status-body"
                role="group"
                aria-label="Room turnover status"
              >
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
                    <span
                      className={
                        departureStatus === chip.value
                          ? "departures-card__status-dot departures-card__status-dot--on"
                          : "departures-card__status-dot"
                      }
                      aria-hidden
                    />
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {inlineError ? (
              <p className="error departures-card__error">{inlineError}</p>
            ) : null}

            {/* 2×2 tile grid — aspect-ratio:1 (count = 4) */}
            <div className="departures-card__tile-grid">

              {/* CHECKLIST */}
              <div className="departures-card__tile">
                <div className="departures-card__tile-head">
                  <span>CHECKLIST</span>
                  <button
                    type="button"
                    className="departures-card__tile-head-link"
                    onClick={() => setShowChecklist(true)}
                  >
                    View ›
                  </button>
                </div>
                <div className="departures-card__check-list">
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
                      <span className="departures-card__check-box" aria-hidden />
                      <span className="departures-card__check-txt">{item.displayTitle}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* NOTES */}
              <div className="departures-card__tile">
                <div className="departures-card__tile-head">
                  <span>NOTES</span>
                </div>
                <div className="departures-card__tile-body">
                  {comments.length > 0 ? (
                    <p className="departures-card__tile-note-count mono">
                      {comments.length} note{comments.length !== 1 ? "s" : ""}
                    </p>
                  ) : null}
                  {!taskDone ? (
                    <form className="departures-card__note-form" onSubmit={onPostNote}>
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
                    <div className="departures-card__tile-plus" aria-hidden>+</div>
                  )}
                </div>
              </div>

              {/* DEEP CLEAN — placeholder */}
              <div className="departures-card__tile">
                <div className="departures-card__tile-head">
                  <span>DEEP CLEAN</span>
                </div>
                <div className="departures-card__tile-body departures-card__tile-body--center">
                  <div className="departures-card__tile-plus" aria-hidden>+</div>
                </div>
              </div>

              {/* MAINTENANCE — placeholder (renamed from Maint.) */}
              <div className="departures-card__tile">
                <div className="departures-card__tile-head">
                  <span>MAINTENANCE</span>
                </div>
                <div className="departures-card__tile-body departures-card__tile-body--center">
                  <div className="departures-card__tile-plus" aria-hidden>+</div>
                </div>
              </div>

            </div>
          </div>
        </div>{/* end departures-card__shell */}

        {/* CTAs — on cream surface, outside shell */}
        <div className="departures-card__cta-row" aria-label="Task actions">
          <button
            type="button"
            className="departures-card__btn"
            onClick={onNeedHelp}
            disabled={helpBusy || taskDone}
          >
            {helpBusy ? "…" : "NEED HELP"}
          </button>
          <button
            type="button"
            className="departures-card__btn departures-card__btn--primary"
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
