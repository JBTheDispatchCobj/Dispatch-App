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
  STAYOVERS_CANONICAL_CHECKLIST,
} from "@/lib/staff-task-execution-checklist";
import { resolveChecklist } from "@/lib/checklists/resolve";
import ChecklistDrillDown from "./ChecklistDrillDown";

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

export default function StayoversCard({
  task,
  userId,
  displayName: _displayName,
  checklist,
  comments: _comments,
  inlineError,
  setInlineError,
  noteBody: _noteBody,
  setNoteBody: _setNoteBody,
  noteBusy: _noteBusy,
  helpBusy,
  doneBusy,
  pauseBusy,
  resumeBusy,
  onToggleItem,
  onNeedHelp,
  onImDone,
  onPause,
  onResume,
  onPostNote: _onPostNote,
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

  const guest = parseCurrentGuest(task.context);

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
              {STAYOVER_STATUS_OPTIONS.map((opt) => (
                <span
                  key={opt.value}
                  className={
                    selectedStatuses.includes(opt.value)
                      ? "status-pill status-pill--active"
                      : "status-pill"
                  }
                >
                  {opt.label}
                </span>
              ))}
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

          {/* Maintenance — locked placeholder (Gap 4; no live data, out of beta scope) */}
          <section className="section">
            <header className="section__head">
              <span className="section__label">Maintenance</span>
              <span className="section__count">Coming soon</span>
            </header>
            <div className="exrow" data-open="false">
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
    </div>/* end .preview-s-430 */
  );
}
