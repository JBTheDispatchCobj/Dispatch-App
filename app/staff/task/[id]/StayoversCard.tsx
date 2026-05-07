"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import { type TaskCard } from "@/app/tasks/[id]/task-card-shared";
import { type NoteRow } from "@/lib/notes";
import { type MaintenanceIssueRow } from "@/lib/maintenance";
import {
  todayInPropertyTz,
  type Reservation,
} from "@/lib/reservations";
import NoteComposeForm from "./NoteComposeForm";
import MaintenanceComposeForm from "./MaintenanceComposeForm";
import { logTaskEvent, withTaskEventSchema } from "@/lib/task-events";
import { supabase } from "@/lib/supabase";
import {
  type ExecutionChecklistItem,
  STAYOVERS_CANONICAL_CHECKLIST,
} from "@/lib/staff-task-execution-checklist";
import { resolveChecklist } from "@/lib/checklists/resolve";
import ChecklistDrillDown from "./ChecklistDrillDown";
import { formatCommentTime } from "@/lib/staff-card-formatters";
import {
  STAYOVER_STATUS_TIME_TARGETS,
  type StayoverStatus,
  type TimeTargetSpec,
} from "@/lib/dispatch-config";

// ---------------------------------------------------------------------------
// Stayover-specific types — multi-select status
// ---------------------------------------------------------------------------

type StayoverStatusKey = "dnd" | "guest_ok" | "desk_ok" | "sheet_change" | "done";

const STAYOVER_STATUS_OPTIONS: ReadonlyArray<{
  value: StayoverStatusKey;
  label: string;
}> = [
  { value: "dnd",          label: "Do Not Disturb" },
  { value: "guest_ok",     label: "Guest OK" },
  { value: "desk_ok",      label: "Desk OK" },
  { value: "sheet_change", label: "Sheet Change" },
  { value: "done",         label: "Done" },
];

// Maps local card keys to dispatch-config StayoverStatus keys. The card has
// one "Done" pill; the config splits Done into "Done (Standard)" vs.
// "Done (Long-term/*)". Use Standard here; long-term variant selection is
// follow-on work (master plan I.G — Sheet Change weekly / * guest variant).
const STATUS_KEY_TO_CONFIG: Record<StayoverStatusKey, StayoverStatus> = {
  dnd: "DND",
  guest_ok: "Guest OK",
  desk_ok: "Desk OK",
  sheet_change: "Sheet Change",
  done: "Done (Standard)",
};

function formatTimeTarget(spec: TimeTargetSpec): string {
  if (spec.target !== undefined) return `~${spec.target} ${spec.unit}`;
  if (spec.min !== undefined && spec.max !== undefined) return `${spec.min}-${spec.max} ${spec.unit}`;
  if (spec.max !== undefined) return `≤${spec.max} ${spec.unit}`;
  if (spec.min !== undefined) return `≥${spec.min} ${spec.unit}`;
  return "";
}

const VALID_STATUS_KEYS = new Set<string>(["dnd", "guest_ok", "desk_ok", "sheet_change", "done"]);

// ---------------------------------------------------------------------------
// Context parsers — all safe, never throw
// ---------------------------------------------------------------------------

function parseStayoverStatuses(raw: unknown): StayoverStatusKey[] {
  if (Array.isArray(raw)) {
    return raw.filter((v): v is StayoverStatusKey =>
      typeof v === "string" && VALID_STATUS_KEYS.has(v),
    );
  }
  return [];
}

type CurrentGuest = {
  name: string | null;
  nights_remaining: string | null;
  party_size: number | null;
  special_requests: string | null;
};

function parseCurrentGuest(ctx: Record<string, unknown>): CurrentGuest | null {
  const raw = ctx.current_guest;
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
  const nightsStr = (key: string): string | null => {
    const v = g[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) {
      return `${v} ${v === 1 ? "night" : "nights"} left`;
    }
    return null;
  };

  return {
    name: str("name"),
    nights_remaining: nightsStr("nights_remaining"),
    party_size: num("party_size"),
    special_requests: str("special_requests"),
  };
}

// Master plan V.A BR4 — derive a CurrentGuest from a reservation row when
// task.context.current_guest is missing. nights_remaining is computed from
// departure_date minus today in property TZ. Both YYYY-MM-DD strings are
// parsed at noon-local to avoid DST/zone rounding.
function currentGuestFromReservation(r: Reservation): CurrentGuest {
  const today = todayInPropertyTz();
  const todayDate = new Date(`${today}T12:00:00`);
  const departDate = new Date(`${r.departure_date}T12:00:00`);
  let nightsLeft: string | null = null;
  if (
    !Number.isNaN(todayDate.getTime()) &&
    !Number.isNaN(departDate.getTime())
  ) {
    const ms = departDate.getTime() - todayDate.getTime();
    const days = Math.max(0, Math.round(ms / 86_400_000));
    nightsLeft = `${days} ${days === 1 ? "night" : "nights"} left`;
  }
  const requests =
    r.special_requests && r.special_requests.length > 0
      ? r.special_requests.join(", ")
      : r.guest_notes && r.guest_notes.trim()
        ? r.guest_notes.trim()
        : null;
  return {
    name: r.guest_name?.trim() || null,
    nights_remaining: nightsLeft,
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
  return STAYOVERS_CANONICAL_CHECKLIST.map((title) => ({
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

export type StayoversCardProps = {
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
  // Master plan V.A BR4 — reservation fallback for the current guest brief.
  // Used only when task.context.current_guest is missing.
  currentReservation?: Reservation | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StayoversCard({
  task,
  userId,
  displayName: _displayName,
  checklist,
  notes,
  inlineError,
  setInlineError,
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
  currentReservation = null,
}: StayoversCardProps) {
  const [selectedStatuses, setSelectedStatuses] = useState<StayoverStatusKey[]>(
    parseStayoverStatuses(task.context.stayover_status),
  );
  const [statusBusy, setStatusBusy] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  // onToggleStayoverStatus: handler is preserved but not wired to any UI in
  // S-430 — status is system/admin-set; staff don't change it from this card.
  const onToggleStayoverStatus = useCallback(
    async (key: StayoverStatusKey) => {
      if (!userId || statusBusy) return;
      const prev = selectedStatuses;
      const next = selectedStatuses.includes(key)
        ? selectedStatuses.filter((s) => s !== key)
        : [...selectedStatuses, key];

      setStatusBusy(true);
      setInlineError(null);

      const { error: upErr } = await supabase
        .from("tasks")
        .update({ context: { ...task.context, stayover_status: next } })
        .eq("id", task.id);

      if (upErr) {
        setInlineError(upErr.message);
        setStatusBusy(false);
        return;
      }

      await logTaskEvent(
        task.id,
        "stayover_status_changed",
        withTaskEventSchema({ from: prev, to: next }),
        userId,
      );

      setSelectedStatuses(next);
      setStatusBusy(false);
    },
    [userId, statusBusy, selectedStatuses, task, setInlineError],
  );

  // Suppress "defined but never used" for the above handler — it is
  // intentionally preserved but not called from S-430 UI.
  void onToggleStayoverStatus;

  const parsedGuest = parseCurrentGuest(task.context);
  // Reservation fallback (master plan V.A BR4) — only kicks in when context
  // had no current_guest subkey AND a matching live reservation exists for
  // this room.
  const guest =
    parsedGuest ??
    (currentReservation
      ? currentGuestFromReservation(currentReservation)
      : null);

  const taskDone   = task.status === "done";
  const inProgress = task.status === "in_progress";
  const paused     = task.status === "paused";
  const stepsLocked = checklistInteractionDisabled(task.status);

  const room    = displayRoom(task);
  const dueTime = formatDueTime(task.due_time);

  const descNote =
    task.description?.trim() && task.description.trim().length > 0
      ? task.description.trim()
      : null;

  const guestDisplay = guest?.name
    ? guest.party_size !== null
      ? `${guest.name} · ${guest.party_size} ${guest.party_size === 1 ? "guest" : "guests"}`
      : guest.name
    : "—";

  const nightsDisplay = guest?.nights_remaining ?? "—";
  const notesDisplay  = guest?.special_requests ?? "—";

  const displayChecklist = buildDisplayChecklist(checklist);
  const checklistTree    = resolveChecklist("stayover", task.room_number);
  const doneCount        = displayChecklist.filter((i) => i.dbItem?.done).length;

  // Active count from DB state (selectedStatuses initialised from context, never toggled in UI)
  const activeCount = selectedStatuses.length;

  // Date line: nights remaining + short service description if available
  const dateLine = [
    guest?.nights_remaining ? `Night ${guest.nights_remaining}` : null,
    descNote && descNote.length <= 30 ? descNote : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Suppress dueTime "unused" warning — retained for hero stamp rendering
  void dueTime;

  return (
    <div className="preview-s-430">

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

          {/* Topstrip — back nav only; ＋ dropped (Gap 5) */}
          <div className="topstrip">
            <Link href="/staff" className="icon-circle" aria-label="Back to tasks">←</Link>
          </div>

          {/* Greeting block */}
          <header className="greet">
            <div className="greet__label">
              <span className="greet__chip">Stayover</span>
              <span className="greet__loc">Room {room}</span>
            </div>
            <h1 className="greet__hello">{task.title}</h1>
            <div className="greet__date">{dateLine || " "}</div>
          </header>

          {/* Statcard — display-only status pills (Gap 2: spans, no onClick, pointer-events preserved) */}
          <section className="statcard">
            <div className="statcard__head">
              <span>Status</span>
              <span className="statcard__sub">
                {activeCount > 0 ? `${activeCount} active` : "None active"}
              </span>
            </div>
            <div className="statcard__pills">
              {STAYOVER_STATUS_OPTIONS.map((opt) => {
                const target = STAYOVER_STATUS_TIME_TARGETS[STATUS_KEY_TO_CONFIG[opt.value]];
                const targetLabel = formatTimeTarget(target);
                return (
                  <span
                    key={opt.value}
                    className={
                      selectedStatuses.includes(opt.value)
                        ? "status-pill status-pill--active"
                        : "status-pill"
                    }
                  >
                    {opt.label}
                    {targetLabel ? ` · ${targetLabel}` : null}
                  </span>
                );
              })}
            </div>
          </section>

          {/* Brief — guest / nights / type (—) / admin-set notes */}
          <section className="brief">
            <div className="briefrow">
              <span className="briefrow__label">Guest</span>
              <span className="briefrow__value">{guestDisplay}</span>
            </div>
            <div className="briefrow">
              <span className="briefrow__label">Night</span>
              <span className="briefrow__value">{nightsDisplay}</span>
            </div>
            <div className="briefrow">
              <span className="briefrow__label">Type</span>
              <span className="briefrow__value">—</span>
            </div>
            <div className="briefrow">
              <span className="briefrow__label">Notes</span>
              <span className="briefrow__value">{notesDisplay}</span>
            </div>
          </section>

          {inlineError ? <p className="error">{inlineError}</p> : null}

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

          {/* Notes section — A-430 pattern (Gap 6) */}
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
                      <span className="note__time">{formatCommentTime(note.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
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
                placeholder="Leave a note for the team…"
                rows={2}
                className="note-compose--section"
              />
            ) : null}
          </section>

          {/* Maintenance compose drawer — master plan III.B (Day 33). Replaces
              the locked MX exrow placeholder. Issue list above + compose form
              below. Issues persist on archived cards forever per Global Rules R21. */}
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
                    {m.image_url ? (
                      <a
                        href={m.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="staff-photo-thumb-link"
                      >
                        <img
                          src={m.image_url}
                          alt=""
                          className="staff-photo-thumb"
                        />
                      </a>
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
                file={maintFile}
                setFile={setMaintFile}
                onSubmit={onPostMaintenance}
                busy={maintBusy}
                className="maint-compose--card"
              />
            ) : null}
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
    </div>/* end .preview-s-430 */
  );
}
