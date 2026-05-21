"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { type TaskCard } from "@/app/tasks/[id]/task-card-shared";
import { type NoteRow } from "@/lib/notes";
import { type MaintenanceIssueRow } from "@/lib/maintenance";
import { type Reservation } from "@/lib/reservations";
import NoteComposeModal from "./NoteComposeModal";
import MaintenanceComposeForm from "./MaintenanceComposeForm";
import {
  type ExecutionChecklistItem,
  DEPARTURES_CANONICAL_CHECKLIST,
  DEPARTURES_DEEP_CANONICAL_CHECKLIST,
} from "@/lib/staff-task-execution-checklist";
import { resolveChecklist } from "@/lib/checklists/resolve";
import ChecklistDrillDown from "./ChecklistDrillDown";
import { lookupSeasonalScent } from "@/lib/dispatch-config";
import { type DeepCleanItemStatus } from "@/lib/deep-clean";

/** YYYY-MM-DD → "Apr 15"; null/empty → "Never done". */
function formatDeepCleanDate(ymd: string | null): string {
  if (!ymd) return "Never done";
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

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

// Master plan V.A BR4 — when task.context.{outgoing,incoming}_guest is missing
// or empty, derive a GuestRecord from the matching reservation row instead of
// rendering "—" placeholders. clean_type has no reservation-side source (per-
// turn cleaning tier is KB-driven), so it stays null on fallback.
function isAllNull(r: GuestRecord): boolean {
  return (
    r.name === null &&
    r.guests === null &&
    r.nights === null &&
    r.clean_type === null &&
    r.party === null &&
    r.notes === null
  );
}

function guestRecordFromReservation(
  r: Reservation,
  direction: "outgoing" | "incoming",
): GuestRecord {
  const partyString = `${r.party_size} guest${r.party_size !== 1 ? "s" : ""}`;
  const nightsString = `${r.nights} night${r.nights !== 1 ? "s" : ""}`;
  const notesString =
    r.guest_notes && r.guest_notes.trim()
      ? r.guest_notes.trim()
      : r.special_requests && r.special_requests.length > 0
        ? r.special_requests.join(", ")
        : null;
  if (direction === "outgoing") {
    return {
      name:       r.guest_name?.trim() || null,
      guests:     partyString,
      nights:     nightsString,
      clean_type: null,
      party:      null,
      notes:      null,
    };
  }
  return {
    name:       r.guest_name?.trim() || null,
    guests:     null,
    nights:     nightsString,
    clean_type: null,
    party:      partyString,
    notes:      notesString,
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

function buildDisplayChecklist(
  dbItems: ExecutionChecklistItem[],
  cleanType: string | null,
): DisplayChecklistItem[] {
  // Day 53 chase #2 (Chase E): Deep Clean variant adds an 8th "Deep Clean" line per
  // Jennifer Q2 + docs/kb/Departure_DeepClean_variant.md. Selection keyed on
  // task.context.outgoing_guest.clean_type === 'Deep'. Standard / Pet / null fall
  // through to the 7-item standard canonical list.
  const canonical =
    cleanType === "Deep"
      ? DEPARTURES_DEEP_CANONICAL_CHECKLIST
      : DEPARTURES_CANONICAL_CHECKLIST;
  return canonical.map((title) => ({
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
  // Day 40 III.E + V.G — optional photo on the note compose.
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
  // Day 40 III.E + V.G — optional photo on the maintenance compose.
  maintFile: File | null;
  setMaintFile: (f: File | null) => void;
  maintBusy: boolean;
  onPostMaintenance: (e: FormEvent) => void;
  // Master plan V.A BR4 — reservation fallback for outgoing/incoming briefs.
  // Used only when task.context.outgoing_guest / incoming_guest is missing.
  outgoingReservation?: Reservation | null;
  incomingReservation?: Reservation | null;
  // Day 47 — free-text note authored by manager via AddTaskModal,
  // stored at task.context.notes. Surfaced inline via .manager-note.
  managerNote?: string | null;
  // Deep Clean tray (D-430 R34-R36) — per-room monthly deep-clean items.
  deepCleanItems?: DeepCleanItemStatus[];
  onToggleDeepClean?: (itemKey: string) => void;
  deepCleanBusy?: string | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DeparturesCard({
  task,
  userId: _userId,
  displayName: _displayName,
  checklist,
  notes,
  inlineError,
  setInlineError: _setInlineError,
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
  maintFile,
  setMaintFile,
  maintBusy,
  onPostMaintenance,
  outgoingReservation = null,
  incomingReservation = null,
  managerNote = null,
  deepCleanItems = [],
  onToggleDeepClean,
  deepCleanBusy = null,
}: DeparturesCardProps) {
  const [showChecklist, setShowChecklist] = useState(false);
  const [openDeepCleanDetail, setOpenDeepCleanDetail] = useState<string | null>(null);
  // Per-room work collapsible cards (D-430 artifact) + maintenance compose drawer.
  const [deepCleanOpen, setDeepCleanOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  const [maintDrawerOpen, setMaintDrawerOpen] = useState(false);
  // Day 48 — Notes compose moved into a popout modal triggered by the
  // topstrip-right + button; replaces the previous inline NoteComposeForm
  // mount inside .setstat. State scoped to this card; opens/closes locally.
  const [noteModalOpen, setNoteModalOpen] = useState(false);

  const departureStatus = parseDepartureStatus(task.context.departure_status);

  const checklistTree = resolveChecklist("housekeeping_turn", task.room_number);
  const outgoingParsed = parseGuestRecord(task.context.outgoing_guest);
  const incomingParsed = parseGuestRecord(task.context.incoming_guest);
  // Reservation fallback (master plan V.A BR4) — only kicks in when the task
  // context guest subkey was missing/empty AND a matching reservation exists.
  const outgoing =
    isAllNull(outgoingParsed) && outgoingReservation
      ? guestRecordFromReservation(outgoingReservation, "outgoing")
      : outgoingParsed;
  const incoming =
    isAllNull(incomingParsed) && incomingReservation
      ? guestRecordFromReservation(incomingReservation, "incoming")
      : incomingParsed;

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
  const seasonalScent = lookupSeasonalScent();

  const displayChecklist = buildDisplayChecklist(checklist, outgoing.clean_type);
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

      {/* Day 48 — Note compose modal. Triggered by topstrip-right + button. */}
      <NoteComposeModal
        open={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
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
        onSubmit={(e) => {
          onPostNote(e);
          // Close optimistically; parent clears state on success and shows
          // inlineError on failure (visible on the card after re-open).
          setNoteModalOpen(false);
        }}
        busy={noteBusy}
        disabled={taskDone}
      />

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

          {/* Topstrip — back nav left, + note trigger right (Day 48). The +
              button opens NoteComposeModal in a cream-themed popout. */}
          <div className="topstrip">
            <Link href="/staff" className="icon-circle" aria-label="Back to tasks">←</Link>
            {!taskDone ? (
              <button
                type="button"
                className="icon-circle"
                aria-label="Add note"
                onClick={() => setNoteModalOpen(true)}
              >
                +
              </button>
            ) : null}
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

          {/* Day 48 — manager note moved out of above-brief and into the
              setstat container below as a setstat__row, between Room Spray
              and Status (Bryan's spec). The standalone .manager-note block
              is unused on this card. */}

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
              <div className="setstat__label">Room Spray</div>
              <div className="setstat__input">{seasonalScent}</div>
            </div>
            {/* Day 48 — Manager Note row. Renders only when AddTaskModal
                wrote a non-empty task.context.notes string. Placed between
                Room Spray and Status per Bryan's spec. Inline whitespace
                styles preserve any line breaks in the note body. */}
            {managerNote ? (
              <div className="setstat__row">
                <div className="setstat__label">Manager Note</div>
                <div
                  className="setstat__input"
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {managerNote}
                </div>
              </div>
            ) : null}
            <div className="setstat__row setstat__row--status">
              <div className="setstat__label">Status</div>
              <div className="setstat__pills" role="group" aria-label="Room turnover status">
                {DEPARTURE_STATUS_CHIPS.map((chip) => (
                  <span
                    key={chip.value}
                    className={
                      departureStatus === chip.value
                        ? "status-pill status-pill--active"
                        : "status-pill"
                    }
                  >
                    {chip.label}
                  </span>
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
                      <span className="brow__title">{item.displayTitle}</span>
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

          {/* Per-room work — Deep Clean + Maintenance as collapsible exrow
              cards (D-430 artifact). Deep Clean expands to the 7-item tray;
              Maintenance expands to the issue list + Log New Issue drawer. */}
          <section className="section">
            <header className="section__head">
              <span className="section__label">Per-room work</span>
              <span className="section__count">Deep Clean &middot; Maintenance</span>
            </header>

            {/* Deep Clean — collapsible */}
            <div className="exrow" data-open={deepCleanOpen ? "true" : "false"}>
              <button
                type="button"
                className="exrow__head"
                onClick={() => setDeepCleanOpen((o) => !o)}
                aria-expanded={deepCleanOpen}
              >
                <span className="exrow__icon">DC</span>
                <div className="exrow__text">
                  <div className="exrow__title">Deep Clean</div>
                  <div className="exrow__sub">
                    {deepCleanItems.filter((i) => i.doneThisTask).length} of{" "}
                    {deepCleanItems.length} done
                  </div>
                </div>
                <span className="exrow__count">{deepCleanItems.length}</span>
                <span className="exrow__chev">›</span>
              </button>
              <div className="exrow__expand">
                <div className="exrow__expand-inner">
                  <div className="exrow__expand-pad">
            <div className="deepclean">
              {deepCleanItems.map((item) => {
                const busy = deepCleanBusy === item.key;
                const due = !item.doneThisTask && item.dueStatus !== "ok";
                const detailOpen = openDeepCleanDetail === item.key;
                return (
                  <div
                    key={item.key}
                    className={[
                      "deepclean__item",
                      item.doneThisTask ? "deepclean__item--done" : "",
                      due ? "deepclean__item--due" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="deepclean__top">
                      <span className="deepclean__name">{item.name}</span>
                      <button
                        type="button"
                        className="deepclean__check"
                        aria-pressed={item.doneThisTask}
                        aria-label={`Mark ${item.name} done`}
                        disabled={
                          item.doneThisTask ||
                          busy ||
                          taskDone ||
                          !onToggleDeepClean
                        }
                        onClick={() => onToggleDeepClean?.(item.key)}
                      >
                        {item.doneThisTask ? "✓" : busy ? "…" : ""}
                      </button>
                    </div>
                    <div className="deepclean__meta">
                      <span className="deepclean__last">
                        {item.lastCompletedBy
                          ? `${item.lastCompletedBy} · ${formatDeepCleanDate(item.lastCompletedOn)}`
                          : "Never done"}
                      </span>
                      {due ? <span className="deepclean__due">Due</span> : null}
                    </div>
                    <button
                      type="button"
                      className="deepclean__details"
                      aria-expanded={detailOpen}
                      onClick={() =>
                        setOpenDeepCleanDetail(detailOpen ? null : item.key)
                      }
                    >
                      {detailOpen ? "Hide" : "Details ›"}
                    </button>
                    {detailOpen ? (
                      <p className="deepclean__detailtext">{item.details}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Maintenance — collapsible. Issue rows per the D-430 artifact;
                "Log New Issue" opens the compose drawer below. */}
            <div className="exrow" data-open={maintOpen ? "true" : "false"}>
              <button
                type="button"
                className="exrow__head"
                onClick={() => setMaintOpen((o) => !o)}
                aria-expanded={maintOpen}
              >
                <span className="exrow__icon">MX</span>
                <div className="exrow__text">
                  <div className="exrow__title">Maintenance</div>
                  <div className="exrow__sub">
                    {maintenanceItems.length === 0
                      ? "No issues"
                      : `${maintenanceItems.length} open · ${
                          maintenanceItems.filter((m) => m.severity === "High").length
                        } high · ${
                          maintenanceItems.filter((m) => m.severity === "Normal").length
                        } normal · ${
                          maintenanceItems.filter((m) => m.severity === "Low").length
                        } low`}
                  </div>
                </div>
                <span className="exrow__count">{maintenanceItems.length}</span>
                <span className="exrow__chev">›</span>
              </button>
              <div className="exrow__expand">
                <div className="exrow__expand-inner">
                  <div className="exrow__expand-pad">
                    <div className="issues">
                      {maintenanceItems.length === 0 ? (
                        <div
                          style={{
                            padding: "10px 4px",
                            fontSize: 12,
                            opacity: 0.55,
                          }}
                        >
                          No issues logged yet.
                        </div>
                      ) : (
                        maintenanceItems.map((m) => {
                          const sev =
                            m.severity === "High"
                              ? "high"
                              : m.severity === "Low"
                                ? "low"
                                : "normal";
                          const img = m.image_url;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              className="issue"
                              onClick={
                                img
                                  ? () => window.open(img, "_blank", "noopener")
                                  : undefined
                              }
                            >
                              <span className={`issue__sev issue__sev--${sev}`} />
                              <div className="issue__main">
                                <div className="issue__title">
                                  {m.item} · {m.type}
                                </div>
                                <div className="issue__loc">
                                  {task.room_number
                                    ? `${m.location} · Room ${task.room_number}`
                                    : m.location}
                                </div>
                              </div>
                              <div className="issue__right">
                                <span className="issue__status issue__status--open">
                                  Open
                                </span>
                                <span className="issue__time">
                                  {new Date(m.created_at).toLocaleTimeString(
                                    undefined,
                                    { hour: "numeric", minute: "2-digit" },
                                  )}
                                </span>
                                {img ? (
                                  <span className="issue__photo">📎</span>
                                ) : null}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                    {!taskDone ? (
                      <button
                        type="button"
                        className="issue-add"
                        onClick={() => setMaintDrawerOpen(true)}
                      >
                        <span className="issue-add__plus">+</span> Log New Issue
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Maintenance compose drawer — opens from "Log New Issue". Reuses the
              note-modal chrome around MaintenanceComposeForm. */}
          {maintDrawerOpen ? (
            <div
              className="note-modal__overlay"
              onClick={(e) => {
                if (e.target === e.currentTarget) setMaintDrawerOpen(false);
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="maint-modal-title"
            >
              <div
                className="note-modal__dialog"
                onClick={(e) => e.stopPropagation()}
              >
                <header className="note-modal__head">
                  <h2 id="maint-modal-title" className="note-modal__title">
                    Log New Issue
                  </h2>
                  <button
                    type="button"
                    className="note-modal__close"
                    onClick={() => setMaintDrawerOpen(false)}
                    aria-label="Close"
                    disabled={maintBusy}
                  >
                    ×
                  </button>
                </header>
                <div className="note-modal__body">
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
                    file={maintFile}
                    setFile={setMaintFile}
                    onSubmit={onPostMaintenance}
                    busy={maintBusy}
                    className="maint-compose--card"
                  />
                </div>
              </div>
            </div>
          ) : null}

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
