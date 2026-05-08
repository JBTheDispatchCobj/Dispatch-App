"use client";

// app/staff/task/[id]/NoteComposeModal.tsx
//
// Day 48 — Cream-themed modal that wraps NoteComposeForm. Replaces the
// previous inline NoteComposeForm mount on every staff X-430 card.
// Triggered by a + icon-circle button in the topstrip-right of each card.
//
// Visual style follows the maintenance work-order detail screen Bryan
// referenced as the target aesthetic: cream backdrop dialog, sage section
// header, simple white surfaces. Bucket-agnostic — same modal chrome on
// every card. The form inside still picks up its existing
// .note-compose styles, which already work on cream surfaces.
//
// State contract: parent owns ALL note compose state (noteBody, noteType,
// noteStatus, noteAssignedTo, noteFile) and the onPostNote handler. The
// modal only owns its open/close state, lifted to the parent card so the
// + button trigger and the modal mount can share it. The parent passes
// an `open` flag and an `onClose` callback. After a successful post the
// parent resets noteBody to "" — the modal watches that and auto-closes
// (so the user doesn't have to dismiss after submit). When body becomes
// non-empty again (user starts typing), the auto-close watch resets.

import { useEffect } from "react";
import type { FormEvent } from "react";
import NoteComposeForm from "./NoteComposeForm";

export type NoteComposeModalProps = {
  open: boolean;
  onClose: () => void;

  // All passthrough props for the inner form.
  body: string;
  setBody: (v: string) => void;
  noteType: string;
  setNoteType: (v: string) => void;
  noteStatus: string;
  setNoteStatus: (v: string) => void;
  noteAssignedTo: string;
  setNoteAssignedTo: (v: string) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  onSubmit: (e: FormEvent) => void;
  busy: boolean;
  disabled?: boolean;
};

export default function NoteComposeModal(props: NoteComposeModalProps) {
  const {
    open,
    onClose,
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
  } = props;

  // Auto-close on successful post: parent clears body to "" on success.
  // We watch for the transition from busy=true to body="" while open.
  // Plus: lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Esc-to-close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="note-modal__overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-modal-title"
    >
      <div className="note-modal__dialog" onClick={(e) => e.stopPropagation()}>
        <header className="note-modal__head">
          <h2 id="note-modal-title" className="note-modal__title">Add Note</h2>
          <button
            type="button"
            className="note-modal__close"
            onClick={onClose}
            aria-label="Close"
            disabled={busy}
          >
            ×
          </button>
        </header>
        <div className="note-modal__body">
          <NoteComposeForm
            body={body}
            setBody={setBody}
            noteType={noteType}
            setNoteType={setNoteType}
            noteStatus={noteStatus}
            setNoteStatus={setNoteStatus}
            noteAssignedTo={noteAssignedTo}
            setNoteAssignedTo={setNoteAssignedTo}
            file={file}
            setFile={setFile}
            onSubmit={onSubmit}
            busy={busy}
            disabled={disabled}
            placeholder="Visible to your team…"
            rows={4}
            className="note-compose--modal"
          />
        </div>
      </div>
    </div>
  );
}
