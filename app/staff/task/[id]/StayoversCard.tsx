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
}: StayoversCardProps) {
  const [selectedStatuses, setSelectedStatuses] = useState<StayoverStatusKey[]>(
    parseStayoverStatuses(task.context.stayover_status),
  );
  const [statusBusy, setStatusBusy] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

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

  const guest = parseCurrentGuest(task.context);

  const taskDone   = task.status === "done";
  const inProgress = task.status === "in_progress";
  const paused     = task.status === "paused";
  const stepsLocked = checklistInteractionDisabled(task.status);

  const room    = displayRoom(task);
  const dueTime = formatDueTime(task.due_time);

  const guestDisplay = guest?.name
    ? guest.party_size !== null
      ? `${guest.name} · ${guest.party_size} ${guest.party_size === 1 ? "guest" : "guests"}`
      : guest.name
    : "—";

  const nightsDisplay = guest?.nights_remaining ?? "—";
  const notesDisplay  = guest?.special_requests ?? "—";

  const displayChecklist = buildDisplayChecklist(checklist);
  const checklistTree    = resolveChecklist("stayover", task.room_number);

  return (
    <main className="staff-app stayover-card">
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
        <div className="stayover-card__shell">

          {/* Hero — ink-stamp pills */}
          <div className="stayover-card__hero">
            <span className="hero-stamp stayover-card__stamp">STAYOVER</span>
            <span className="hero-stamp stayover-card__stamp">RM {room}</span>
            {dueTime ? (
              <span className="hero-stamp stayover-card__stamp">{dueTime}</span>
            ) : null}
          </div>

          {/* Body */}
          <div className="stayover-card__body">

            {/* Status panel */}
            <div className="stayover-card__panel">
              <div className="stayover-card__panel-head">
                <span>STATUS</span>
              </div>
              <div
                className="stayover-card__status-body"
                role="group"
                aria-label="Stayover status"
              >
                {STAYOVER_STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={
                      selectedStatuses.includes(opt.value)
                        ? "stayover-card__status-check stayover-card__status-check--checked"
                        : "stayover-card__status-check"
                    }
                    onClick={() => void onToggleStayoverStatus(opt.value)}
                    disabled={taskDone || statusBusy}
                    aria-pressed={selectedStatuses.includes(opt.value)}
                  >
                    <span className="stayover-card__status-box" aria-hidden />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Guest info ledger */}
            <div className="stayover-card__panel">
              <div className="stayover-card__info-list">
                <div className="stayover-card__info-row">
                  <div className="stayover-card__info-label">GUEST</div>
                  <div className="stayover-card__info-val">{guestDisplay}</div>
                </div>
                <div className="stayover-card__info-row">
                  <div className="stayover-card__info-label">NIGHT</div>
                  <div className="stayover-card__info-val">{nightsDisplay}</div>
                </div>
                <div className="stayover-card__info-row">
                  <div className="stayover-card__info-label">TYPE</div>
                  <div className="stayover-card__info-val">—</div>
                </div>
                <div className="stayover-card__info-row">
                  <div className="stayover-card__info-label">NOTES</div>
                  <div className="stayover-card__info-val stayover-card__info-val--note">
                    {notesDisplay}
                  </div>
                </div>
              </div>
            </div>

            {inlineError ? (
              <p className="error stayover-card__error">{inlineError}</p>
            ) : null}

            {/* 3-tile grid */}
            <div className="stayover-card__tile-grid">

              {/* CHECKLIST */}
              <div className="stayover-card__tile">
                <div className="stayover-card__tile-head">CHECKLIST</div>
                <div className="stayover-card__check-list">
                  {displayChecklist.map((item, idx) => (
                    <button
                      key={item.dbItem?.id ?? `canonical-${idx}`}
                      type="button"
                      className={
                        item.dbItem?.done
                          ? "stayover-card__check-item stayover-card__check-item--done"
                          : "stayover-card__check-item"
                      }
                      onClick={() => {
                        if (item.dbItem) onToggleItem(item.dbItem);
                      }}
                      disabled={taskDone || stepsLocked || !item.dbItem}
                      aria-pressed={item.dbItem?.done ?? false}
                    >
                      <span className="stayover-card__check-box" aria-hidden />
                      <span className="stayover-card__check-txt">{item.displayTitle}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* NOTES */}
              <div className="stayover-card__tile">
                <div className="stayover-card__tile-head">NOTES</div>
                <div className="stayover-card__tile-body">
                  {comments.length > 0 ? (
                    <p className="stayover-card__tile-note-count mono">
                      {comments.length} note{comments.length !== 1 ? "s" : ""}
                    </p>
                  ) : null}
                  {!taskDone ? (
                    <form
                      className="stayover-card__note-form"
                      onSubmit={onPostNote}
                    >
                      <textarea
                        id="staff-task-note-stay"
                        className="stayover-card__note-input"
                        rows={2}
                        placeholder="Add a note…"
                        value={noteBody}
                        onChange={(e) => setNoteBody(e.target.value)}
                        autoComplete="off"
                      />
                      <button
                        type="submit"
                        className="stayover-card__note-send"
                        disabled={noteBusy || !noteBody.trim()}
                      >
                        {noteBusy ? "…" : "Post"}
                      </button>
                    </form>
                  ) : (
                    <div className="stayover-card__plus-glyph" aria-hidden>+</div>
                  )}
                </div>
              </div>

              {/* MAINTENANCE — placeholder */}
              <div className="stayover-card__tile">
                <div className="stayover-card__tile-head">MAINTENANCE</div>
                <div className="stayover-card__tile-body stayover-card__tile-body--center">
                  <div className="stayover-card__plus-glyph" aria-hidden>+</div>
                </div>
              </div>

            </div>
          </div>
        </div>{/* end stayover-card__shell */}

        {/* CTAs — outside shell */}
        <div className="stayover-card__cta-row" aria-label="Task actions">
          <button
            type="button"
            className="stayover-card__btn"
            onClick={onNeedHelp}
            disabled={helpBusy || taskDone}
          >
            {helpBusy ? "…" : "NEED HELP"}
          </button>
          <button
            type="button"
            className="stayover-card__btn stayover-card__btn--primary"
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
