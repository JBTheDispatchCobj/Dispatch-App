"use client";

// app/staff/task/[id]/NoteComposeForm.tsx
//
// Shared compose form rendered inside every X-430 card's Notes section
// plus the legacy fallback execution surface in page.tsx. Replaces the
// per-card inline `<form><textarea /></form>` blocks from Phase 3.
//
// Spec: master plan III.A. LinkedIn-mobile-comment style — three required
// dropdowns above the textarea (Note Type, Note Status, Note Assigned-to)
// then body + Post. Required fields enforced via the disabled state on the
// submit button (note_type defaults to "" and submit is disabled until
// the user picks one).
//
// What's NOT here:
// - @mention autocomplete (post-beta).
// - Avatar render (cosmetic; lives at the consumer's discretion).
//
// Day 40 — Image attachment input added (master plan III.E + V.G). File is
// optional; submit gating unchanged (still gates on body + note type only).
// Mobile: accept="image/*" + capture="environment" surfaces iOS Safari's
// "Take Photo / Choose from Library" sheet directly. Native input is
// visually hidden; the styled <label> is the click target.
//
// The component is purely presentational — state lives in the parent
// (page.tsx) and is threaded down through every X-430 card. That keeps
// the compose state in one place across the six cards a task can be on.

import type { FormEvent } from "react";
import {
  NOTE_TYPES,
  NOTE_STATUSES,
  NOTE_ASSIGNED_TO,
} from "@/lib/notes";

export type NoteComposeFormProps = {
  /** Free-text body. */
  body: string;
  setBody: (v: string) => void;
  /** Note Type — required, starts "" so submit stays disabled until picked. */
  noteType: string;
  setNoteType: (v: string) => void;
  /** Note Status — defaults to "Just Noting" per master plan III.A. */
  noteStatus: string;
  setNoteStatus: (v: string) => void;
  /** Note Assigned-to — defaults to "Employee" for typical case. */
  noteAssignedTo: string;
  setNoteAssignedTo: (v: string) => void;

  /** Optional image attachment (master plan III.E + V.G, Day 40). Null when
   *  no photo is attached. Parent owns the state so it can be cleared on
   *  successful post and threaded through every X-430 card mount site. */
  file: File | null;
  setFile: (f: File | null) => void;

  /** Submit handler from the parent. */
  onSubmit: (e: FormEvent) => void;
  /** Submit-in-flight flag from the parent. */
  busy: boolean;
  /** Disable the entire form (e.g., when the task is done). */
  disabled?: boolean;

  /** Inline label text. Defaults to "Add a note". */
  label?: string;
  /** Placeholder text inside the textarea. */
  placeholder?: string;
  /** Number of textarea rows. Defaults to 3. */
  rows?: number;
  /** Optional className applied to the form root for surface-specific styles. */
  className?: string;
};

export default function NoteComposeForm(props: NoteComposeFormProps) {
  const {
    body,
    setBody,
    noteType,
    setNoteType,
    noteStatus,
    setNoteStatus,
    noteAssignedTo,
    setNoteAssignedTo,
    file,
    setFile,
    onSubmit,
    busy,
    disabled = false,
    label = "Add a note",
    placeholder = "Visible to your team…",
    rows = 3,
    className,
  } = props;

  const trimmedEmpty = body.trim().length === 0;
  const submitDisabled = busy || disabled || trimmedEmpty || !noteType;

  return (
    <form
      className={className ? `note-compose ${className}` : "note-compose"}
      onSubmit={onSubmit}
    >
      <div className="note-compose__selects">
        <label className="note-compose__field">
          <span className="note-compose__field-label">Type</span>
          <select
            className="note-compose__select"
            value={noteType}
            onChange={(e) => setNoteType(e.target.value)}
            disabled={busy || disabled}
            required
          >
            <option value="" disabled>
              Pick a type…
            </option>
            {NOTE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="note-compose__field">
          <span className="note-compose__field-label">Status</span>
          <select
            className="note-compose__select"
            value={noteStatus}
            onChange={(e) => setNoteStatus(e.target.value)}
            disabled={busy || disabled}
            required
          >
            {NOTE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="note-compose__field">
          <span className="note-compose__field-label">Assign to</span>
          <select
            className="note-compose__select"
            value={noteAssignedTo}
            onChange={(e) => setNoteAssignedTo(e.target.value)}
            disabled={busy || disabled}
            required
          >
            {NOTE_ASSIGNED_TO.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="note-compose__body-label" htmlFor="note-compose-body">
        {label}
      </label>
      <textarea
        id="note-compose-body"
        className="note-compose__body"
        rows={rows}
        placeholder={placeholder}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={busy || disabled}
        autoComplete="off"
      />

      <div className="staff-attach-row">
        <label className="staff-attach-btn">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={busy || disabled}
            className="staff-attach-input"
          />
          {file ? "Change photo" : "Add photo"}
        </label>
        {file ? (
          <>
            <span className="staff-attach-name" title={file.name}>
              {file.name}
            </span>
            <button
              type="button"
              className="staff-attach-clear"
              onClick={() => setFile(null)}
              disabled={busy || disabled}
              aria-label="Remove photo"
            >
              ×
            </button>
          </>
        ) : null}
      </div>

      <button
        type="submit"
        className="note-compose__submit"
        disabled={submitDisabled}
      >
        {busy ? "Sending…" : "Post note"}
      </button>
    </form>
  );
}
