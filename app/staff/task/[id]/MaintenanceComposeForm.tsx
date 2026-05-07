"use client";

// app/staff/task/[id]/MaintenanceComposeForm.tsx
//
// Shared compose form for staff-reported maintenance issues. Mirrors
// NoteComposeForm.tsx structurally: pure presentational, parent owns state,
// rendered inside every X-430 card's Maintenance section (D-430, A-430,
// S-430, Da-430, SOD-430 — NOT E-430 per master plan I.I).
//
// Spec: master plan III.B + Global Rules R12-R17. Three required
// dropdowns (Location → Item/Sub-location → Type) sit above a Severity
// row, an optional body textarea, and a Post button.
//
// What's NOT here:
// - Cascading dropdown filter logic. Day 24 taxonomy seed isn't
//   hierarchical — locations and items are independent flat lists per
//   taxonomy_tables.sql ("sub-location split deferred to post-beta").
//   Phase 3 ships flat dropdowns; cascade filter is post-beta when
//   Jennifer authors the tree. [ASK JENNIFER] flag.
// - Avatar render (cosmetic; lives at the consumer's discretion).
// - Resolution / status pill (admin-side only).
//
// Day 40 — Image attachment input added (master plan III.E + V.G). File is
// optional; submit gating unchanged (still gates on the three required
// taxonomy fields). An issue can now be photo-only, taxonomy-only, or both.
// Mobile: accept="image/*" + capture="environment" surfaces iOS Safari's
// "Take Photo / Choose from Library" sheet directly.
//
// Body is OPTIONAL — an issue can be photo-only or taxonomy-only. Submit
// gates on the three required taxonomy fields, not on body. Severity
// always has a default ('Normal'), so it's never empty.

import type { FormEvent } from "react";
import {
  MAINTENANCE_LOCATIONS,
  MAINTENANCE_ITEMS,
  MAINTENANCE_TYPES,
  MAINTENANCE_SEVERITIES,
} from "@/lib/maintenance";

export type MaintenanceComposeFormProps = {
  /** Optional free-text body. */
  body: string;
  setBody: (v: string) => void;
  /** Location — required, starts "" so submit stays disabled until picked. */
  location: string;
  setLocation: (v: string) => void;
  /** Item / sub-location — required. */
  item: string;
  setItem: (v: string) => void;
  /** Damage type — required. */
  type: string;
  setType: (v: string) => void;
  /** Severity — defaults to 'Normal'. */
  severity: string;
  setSeverity: (v: string) => void;

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

  /** Inline label text. Defaults to "Add a maintenance issue". */
  label?: string;
  /** Placeholder text inside the textarea. */
  placeholder?: string;
  /** Number of textarea rows. Defaults to 3. */
  rows?: number;
  /** Optional className applied to the form root for surface-specific styles. */
  className?: string;
};

export default function MaintenanceComposeForm(
  props: MaintenanceComposeFormProps,
) {
  const {
    body,
    setBody,
    location,
    setLocation,
    item,
    setItem,
    type,
    setType,
    severity,
    setSeverity,
    file,
    setFile,
    onSubmit,
    busy,
    disabled = false,
    label = "Add a maintenance issue",
    placeholder = "Describe the issue (optional)…",
    rows = 3,
    className,
  } = props;

  // Body is OPTIONAL — submit gates on the three required taxonomy fields.
  // Severity has a default, so it's never empty.
  const submitDisabled = busy || disabled || !location || !item || !type;

  return (
    <form
      className={className ? `maint-compose ${className}` : "maint-compose"}
      onSubmit={onSubmit}
    >
      <div className="maint-compose__selects">
        <label className="maint-compose__field">
          <span className="maint-compose__field-label">Location</span>
          <select
            className="maint-compose__select"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={busy || disabled}
            required
          >
            <option value="" disabled>
              Pick a location…
            </option>
            {MAINTENANCE_LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className="maint-compose__field">
          <span className="maint-compose__field-label">Item</span>
          <select
            className="maint-compose__select"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            disabled={busy || disabled}
            required
          >
            <option value="" disabled>
              Pick an item…
            </option>
            {MAINTENANCE_ITEMS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>

        <label className="maint-compose__field">
          <span className="maint-compose__field-label">Type</span>
          <select
            className="maint-compose__select"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={busy || disabled}
            required
          >
            <option value="" disabled>
              Pick a type…
            </option>
            {MAINTENANCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="maint-compose__severity-row">
        <label className="maint-compose__field maint-compose__field--severity">
          <span className="maint-compose__field-label">Severity</span>
          <select
            className="maint-compose__select"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            disabled={busy || disabled}
            required
          >
            {MAINTENANCE_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label
        className="maint-compose__body-label"
        htmlFor="maint-compose-body"
      >
        {label}
      </label>
      <textarea
        id="maint-compose-body"
        className="maint-compose__body"
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
        className="maint-compose__submit"
        disabled={submitDisabled}
      >
        {busy ? "Sending…" : "Post issue"}
      </button>
    </form>
  );
}
