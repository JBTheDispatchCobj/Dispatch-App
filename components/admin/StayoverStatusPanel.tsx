"use client";

/**
 * StayoverStatusPanel — discrete admin override for context.stayover_status
 * on a stayover card. Master plan I.G prerequisite for sub-items 2/3
 * (Day 46 admin override leg + Day 52 chase #2 staff lock reversal +
 * auto-complete behavior wired). Drops onto /tasks/[id] AND
 * /admin/tasks/[id] between ReassignPanel and the big card-edit form
 * when card_type === "stayover".
 *
 * Multi-select chip array of: DND, Guest OK, Desk OK, Sheet Change, Done.
 * Save persists context.stayover_status as a string[] of KEYS (not labels)
 * and emits one stayover_status_overridden task_events row with from/to
 * arrays. Merge-safe context spread — preserves every other key.
 *
 * Day 52 chase #2 — auto-complete behavior per rules table line 88:
 * if the saved `to` array intersects {dnd, desk_ok, guest_ok} (any of
 * those keys present, even when co-selected with sheet_change/done),
 * the panel additionally flips tasks.status → "done" and writes
 * completed_at = now() so the card auto-archives off the staff queue.
 * Pre-selection of sheet_change or done WITHOUT any auto-complete key
 * is admin-tag only — staff still executes the card.
 *
 * Day 52 chase #2 — staff-side toggle restored on S-430 (Day 21 lock
 * reversed per Jennifer Q18). Staff toggles emit
 * stayover_status_changed; admin toggles emit stayover_status_overridden.
 * The source distinction lets future percentages tracking filter
 * staff-set events only per "staff-tracked percentages key off staff
 * selections only — admin pre-selections do NOT count" (rules table
 * line 88). The lib/stayover-history.ts lookup helper reads
 * context.stayover_status arrays from past stayover/housekeeping_turn
 * rows for the same room, so writing here also lights up the S-430
 * brief "Last status" row on subsequent stayover cards for that room.
 */

import { type FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  logTaskEvent,
  taskEventType,
  withTaskEventSchema,
} from "@/lib/task-events";
import styles from "./StayoverStatusPanel.module.css";

// Mirrors STAYOVER_STATUS_OPTIONS in app/staff/task/[id]/StayoversCard.tsx
// — the staff card is the canonical render of this status, so the admin
// override must use the same key + label set or the brief / pill row will
// drop unrecognized keys.
const STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "dnd",          label: "Do Not Disturb" },
  { value: "guest_ok",     label: "Guest OK" },
  { value: "desk_ok",      label: "Desk OK" },
  { value: "sheet_change", label: "Sheet Change" },
  { value: "done",         label: "Done" },
];

const VALID_KEYS = new Set(STATUS_OPTIONS.map((o) => o.value));

// Day 52 chase #2 — auto-complete trigger keys per rules table line 88.
// Pre-selection of any of these auto-completes + auto-archives the card
// off the staff queue. Sheet Change and Done co-selected do NOT block
// the auto-complete (admin error case wins per Bryan's chase #2 ratify).
const AUTO_COMPLETE_KEYS = new Set(["dnd", "desk_ok", "guest_ok"]);

function intersectsAutoComplete(keys: string[]): boolean {
  return keys.some((k) => AUTO_COMPLETE_KEYS.has(k));
}

function parseStatuses(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (v): v is string => typeof v === "string" && VALID_KEYS.has(v),
  );
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

type Props = {
  taskId: string;
  userId: string | null;
  // Nullable to match the admin task view's LiveTask.context shape
  // (set to null when the row's context column is missing or non-object).
  // Internal logic already handles null defensively via context?.stayover_status
  // and { ...(context ?? {}), ... } merge spread.
  context: Record<string, unknown> | null;
  onSuccess?: () => void | Promise<void>;
};

export default function StayoverStatusPanel({
  taskId,
  userId,
  context,
  onSuccess,
}: Props) {
  const initial = parseStatuses(context?.stayover_status);
  const [pending, setPending] = useState<string[]>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset selection when the parent reloads with new context (e.g. after
  // onSuccess re-fetches the task row). Mirrors ReassignPanel's reset
  // pattern but keys on context reference rather than a primitive ID.
  useEffect(() => {
    setPending(parseStatuses(context?.stayover_status));
    setError(null);
  }, [context]);

  const isChanged = !arraysEqual(initial, pending);
  const canSubmit = isChanged && !submitting && Boolean(userId);

  function toggle(key: string) {
    setPending((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId) {
      setError("Sign-in required.");
      return;
    }
    if (!isChanged) return;
    setSubmitting(true);
    setError(null);

    // Merge-safe context save (master plan §I.M) — preserve every other key.
    // Day 52 chase #2 — if pending intersects {dnd, desk_ok, guest_ok}, also
    // flip status → done + write completed_at = now() so the card
    // auto-archives off the staff queue per rules table line 88.
    const autoComplete = intersectsAutoComplete(pending);
    const nextContext = { ...(context ?? {}), stayover_status: pending };
    const updatePayload: Record<string, unknown> = { context: nextContext };
    if (autoComplete) {
      updatePayload.status = "done";
      updatePayload.completed_at = new Date().toISOString();
    }

    const { error: upErr } = await supabase
      .from("tasks")
      .update(updatePayload)
      .eq("id", taskId);

    if (upErr) {
      setSubmitting(false);
      setError(upErr.message);
      return;
    }

    await logTaskEvent(
      taskId,
      taskEventType.stayoverStatusOverridden,
      withTaskEventSchema({
        from: initial,
        to: pending,
        auto_completed: autoComplete,
      }),
      userId,
    );

    setSubmitting(false);
    if (onSuccess) await onSuccess();
  }

  const summary =
    initial.length === 0
      ? "None set"
      : initial
          .map((k) => STATUS_OPTIONS.find((o) => o.value === k)?.label ?? k)
          .join(", ");

  return (
    <section className={styles.panel} aria-label="Stayover status">
      <header className={styles.head}>
        <h3 className={styles.h3}>Stayover status</h3>
        <span className={styles.current}>Currently: {summary}</span>
      </header>
      <form onSubmit={onSubmit} className={styles.form}>
        <fieldset className={styles.fieldset}>
          <legend className={styles.label}>Set status (multi-select)</legend>
          <div className={styles.chipRow}>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`${styles.chip} ${
                  pending.includes(opt.value) ? styles.chipActive : ""
                }`}
                onClick={() => toggle(opt.value)}
                disabled={submitting}
                aria-pressed={pending.includes(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.actions}>
          <button
            type="submit"
            disabled={!canSubmit}
            className={styles.submit}
          >
            {submitting ? "Saving…" : "Save status"}
          </button>
        </div>
      </form>
    </section>
  );
}
