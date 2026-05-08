"use client";

/**
 * StayoverStatusPanel — discrete admin override for context.stayover_status
 * on a stayover card. Master plan I.G prerequisite for sub-items 2/3/4
 * (Day 46 chase). Drops onto /tasks/[id] between ReassignPanel and the big
 * card-edit form when card_type === "stayover".
 *
 * Multi-select chip array of: DND, Guest OK, Desk OK, Sheet Change, Done.
 * Save persists context.stayover_status as a string[] of KEYS (not labels)
 * and emits one stayover_status_overridden task_events row with from/to
 * arrays. Merge-safe context spread — preserves every other key.
 *
 * Today no orchestrator code writes context.stayover_status, and staff
 * side was locked display-only Day 21 — so this panel is the single
 * source of status writes. The S-430 brief (lib/stayover-history.ts →
 * StayoversCard "Last status" row) populates from past stayover task
 * rows that have non-empty stayover_status arrays, so writing here lights
 * up the brief on subsequent stayover cards for the same room.
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
  context: Record<string, unknown>;
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
    const nextContext = { ...(context ?? {}), stayover_status: pending };

    const { error: upErr } = await supabase
      .from("tasks")
      .update({ context: nextContext })
      .eq("id", taskId);

    if (upErr) {
      setSubmitting(false);
      setError(upErr.message);
      return;
    }

    await logTaskEvent(
      taskId,
      taskEventType.stayoverStatusOverridden,
      withTaskEventSchema({ from: initial, to: pending }),
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
