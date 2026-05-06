"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { type TaskCard } from "@/app/tasks/[id]/task-card-shared";
import { type NoteRow } from "@/lib/notes";
import { type MaintenanceIssueRow } from "@/lib/maintenance";
import { type Reservation } from "@/lib/reservations";
import NoteComposeForm from "./NoteComposeForm";
import MaintenanceComposeForm from "./MaintenanceComposeForm";
import {
  type ExecutionChecklistItem,
  ARRIVALS_CANONICAL_CHECKLIST,
} from "@/lib/staff-task-execution-checklist";
import { resolveChecklist } from "@/lib/checklists/resolve";
import ChecklistDrillDown from "./ChecklistDrillDown";
import { formatCommentTime } from "@/lib/staff-card-formatters";

// ---------------------------------------------------------------------------
// Context parsers — safe, never throw
// ---------------------------------------------------------------------------

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

// Master plan V.A BR4 — derive an IncomingGuest from a reservation row when
// task.context.incoming_guest is missing. checkin_time formats are aligned
// with formatDueTime's HH:MM regex (HH:MM:SS slices fine — the parser only
// reads the leading "HH:MM").
function incomingGuestFromReservation(r: Reservation): IncomingGuest {
  const requests =
    r.special_requests && r.special_requests.length > 0
      ? r.special_requests.join(", ")
      : r.guest_notes && r.guest_notes.trim()
        ? r.guest_notes.trim()
        : null;
  return {
    name: r.guest_name?.trim() || null,
    checkin_time: r.arrival_time,
    nights: r.nights,
    party_size: r.party_size,
    special_requests: requests,
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
  // Master plan III.B — Maintenance compose drawer (Day 33).
  maintenanceItems: MaintenanceIssueRow[];
  maintBody: string;
  setMaintBody: (v: string) => void;
  maintLocation: string;
  setMaintLocation: (v: string) => void;
  maintItem: string;
  setMaintItem: (v: string) => void;
  maintType: string;
  setMaintType: (v: string) => void;
  maintSeverity: string;
  setMaintSeverity: (v: string) => void;
  maintBusy: boolean;
  onPostMaintenance: (e: FormEvent) => void;
  // Master plan V.A BR4 — reservation fallback for the incoming guest brief.
  // Used only when task.context.incoming_guest is missing.
  incomingReservation?: Reservation | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ArrivalsCard({
  task,
  userId: _userId,
  displayName: _displayName,
  checklist,
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
  maintenanceItems,
  maintBody,
  setMaintBody,
  maintLocation,
  setMaintLocation,
  maintItem,
  setMaintItem,
  maintType,
  setMaintType,
  maintSeverity,
  setMaintSeverity,
  maintBusy,
  onPostMaintenance,
  incomingReservation = null,
}: ArrivalsCardProps) {
  const [showChecklist, setShowChecklist] = useState(false);

  const checklistTree = resolveChecklist("arrival", task.room_number);
  const parsedGuest = parseIncomingGuest(task.context);
  // Reservation fallback (master plan V.A BR4) — only kicks in when context
  // had no incoming_guest subkey AND a matching next-incoming reservation
  // exists for this room.
  const guest =
    parsedGuest ??
    (incomingReservation
      ? incomingGuestFromReservation(incomingReservation)
      : null);

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

  const guestDisplay = guest?.name
    ? guest.party_size !== null
      ? `${guest.name} · ${guest.party_size} ${guest.party_size === 1 ? "guest" : "guests"}`
      : guest.name
    : "—";

  const nightsDisplay =
    guest?.nights !== null && guest?.nights !== undefined
      ? String(guest.nights)
      : "—";

  const requestsDisplay = guest?.special_requests ?? "—";

  const displayChecklist = buildDisplayChecklist(checklist);
  const doneCount = displayChecklist.filter((i) => i.dbItem?.done).length;

  // Date line: check-in time + nights (room type omitted — no data source)
  const checkinStr = guest?.checkin_time
    ? formatDueTime(guest.checkin_time)
    : dueTime;
  const dateLine = [
    checkinStr ? `Check-in ${checkinStr}` : null,
    guest?.nights != null
      ? `${guest.nights} night${guest.nights !== 1 ? "s" : ""}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="preview-a-430">

      {/* ChecklistDrillDown overlay — position:fixed, mounts outside shell */}
      {showChecklist ? (
        <ChecklistDrillDown
          root={checklistTree}
          onClose={() => setShowChecklist(false)}
        />
      ) : null}

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
              <span className="greet__chip">Arrival</span>
              <span className="greet__loc">Room {room}</span>
            </div>
            <h1 className="greet__hello">{task.title}</h1>
            <div className="greet__date">{dateLine || " "}</div>
          </header>

          {/* Brief — guest / nights / requests / setup (extras omitted: no data source) */}
          <section className="brief">
            <div className="briefrow">
              <span className="briefrow__label">Guest</span>
              <span className="briefrow__value">{guestDisplay}</span>
            </div>
            <div className="briefrow">
              <span className="briefrow__label">Nights</span>
              <span className="briefrow__value">{nightsDisplay}</span>
            </div>
            <div className="briefrow">
              <span className="briefrow__label">Requests</span>
              <span className="briefrow__value">{requestsDisplay}</span>
            </div>
            {descNote ? (
              <div className="briefrow">
                <span className="briefrow__label">Setup</span>
                <span className="briefrow__value">{descNote}</span>
              </div>
            ) : null}
          </section>

          {inlineError ? <p className="error">{inlineError}</p> : null}

          {/* Notes section — comment feed + inline compose below */}
          <section className="section">
            <header className="section__head">
              <span className="section__label">Notes</span>
              <span className="section__count">
                {notes.length > 0
                  ? `${notes.length} left for you`
                  : "no notes yet"}
              </span>
            </header>
            {notes.length > 0 ? (
              <div className="notes">
                {notes.map((note) => (
                  <button key={note.id} className="note" type="button">
                    <div className="note__head">
                      <span className="note__dot" />
                      <div className="note__body">
                        <div className="note__line">
                          <span className="note__name">{note.author_display_name}</span>
                          <span className="note__action"> left a note: </span>
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
                      </div>
                      <span className="note__time">{formatCommentTime(note.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
            {/* Inline compose — below feed; ＋ topstrip dropped, form is the compose UI */}
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
                onSubmit={onPostNote}
                busy={noteBusy}
                placeholder="Leave a note for the team…"
                rows={2}
                className="note-compose--section"
              />
            ) : null}
          </section>

          {/* Maintenance compose drawer — master plan III.B (Day 33). */}
          <section className="section">
            <header className="section__head">
              <span className="section__label">Maintenance</span>
              <span className="section__count">
                {maintenanceItems.length === 0
                  ? "Report an issue"
                  : `${maintenanceItems.length} issue${maintenanceItems.length !== 1 ? "s" : ""}`}
              </span>
            </header>
            {maintenanceItems.length > 0 ? (
              <ul className="maint-list" role="list">
                {maintenanceItems.map((m) => (
                  <li key={m.id} className="maint-row">
                    <div className="maint-row__head">
                      <span className="maint-row__author">
                        {m.author_display_name || "Team"}
                      </span>
                      <time
                        className="maint-row__time"
                        dateTime={m.created_at}
                      >
                        {new Date(m.created_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <div className="maint-row__chips">
                      <span className="maint-row__chip">{m.location}</span>
                      <span className="maint-row__chip">{m.item}</span>
                      <span className="maint-row__chip">{m.type}</span>
                      <span
                        className={
                          m.severity === "High"
                            ? "maint-row__chip maint-row__chip--severity-high"
                            : "maint-row__chip"
                        }
                      >
                        {m.severity}
                      </span>
                    </div>
                    {m.body ? (
                      <p className="maint-row__body">{m.body}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {!taskDone ? (
              <MaintenanceComposeForm
                body={maintBody}
                setBody={setMaintBody}
                location={maintLocation}
                setLocation={setMaintLocation}
                item={maintItem}
                setItem={setMaintItem}
                type={maintType}
                setType={setMaintType}
                severity={maintSeverity}
                setSeverity={setMaintSeverity}
                onSubmit={onPostMaintenance}
                busy={maintBusy}
                className="maint-compose--card"
              />
            ) : null}
          </section>

          {/* Checklist section — bar fill driven by data-checked CSS selector */}
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
    </div>/* end .preview-a-430 */
  );
}
