"use client";

/**
 * ReassignPanel — discrete, intentional task reassignment with a required
 * reason note. Master plan III.H Scope B + Day 28 audit's II.G "Reassign"
 * UNBUILT admin action. Drops onto the manager card view (/tasks/[id]) and
 * the admin task view (/admin/tasks/[id]).
 *
 * Plumbing-only: routes through `reassignTask()` in lib/orchestration so the
 * task_events row + assignee mutation stay atomic with the existing helper.
 */

import { type FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolveAuthUser } from "@/lib/dev-auth-bypass";
import { fetchAssignableStaffOptions } from "@/lib/assignable-staff";
import { reassignTask } from "@/lib/orchestration";
import styles from "./ReassignPanel.module.css";

type StaffOpt = { id: string; name: string };

type Props = {
  taskId: string;
  currentStaffId: string | null;
  currentStaffName: string | null;
  onSuccess?: () => void | Promise<void>;
};

export default function ReassignPanel({
  taskId,
  currentStaffId,
  currentStaffName,
  onSuccess,
}: Props) {
  const [staffOptions, setStaffOptions] = useState<StaffOpt[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [optsLoading, setOptsLoading] = useState(true);
  const [optsError, setOptsError] = useState<string | null>(null);
  const [pendingStaffId, setPendingStaffId] = useState<string | null>(
    currentStaffId,
  );
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      const user = resolveAuthUser(session);
      if (!cancelled) setUserId(user?.id ?? null);
      const res = await fetchAssignableStaffOptions(supabase);
      if (cancelled) return;
      setStaffOptions(res.options);
      setOptsError(res.error);
      setOptsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // When the parent reloads with a new currentStaffId, reset selection + form.
  useEffect(() => {
    setPendingStaffId(currentStaffId);
    setReason("");
    setError(null);
  }, [currentStaffId]);

  const isChanged = pendingStaffId !== currentStaffId;
  const reasonProvided = reason.trim().length > 0;
  const canSubmit =
    isChanged && reasonProvided && !submitting && Boolean(userId);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId) {
      setError("Sign-in required.");
      return;
    }
    if (!isChanged) return;
    if (!reasonProvided) {
      setError("A reason is required for reassignment.");
      return;
    }
    const toName = pendingStaffId
      ? (staffOptions.find((s) => s.id === pendingStaffId)?.name ?? null)
      : null;
    setSubmitting(true);
    setError(null);
    const result = await reassignTask(supabase, {
      taskId,
      fromStaffId: currentStaffId,
      toStaffId: pendingStaffId,
      fromStaffName: currentStaffName,
      toStaffName: toName,
      userId,
      reason: reason.trim(),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setReason("");
    if (onSuccess) await onSuccess();
  }

  return (
    <section className={styles.panel} aria-label="Reassign task">
      <header className={styles.head}>
        <h3 className={styles.h3}>Reassign</h3>
        <span className={styles.current}>
          Currently: {currentStaffName?.trim() || "Unassigned"}
        </span>
      </header>
      <form onSubmit={onSubmit} className={styles.form}>
        <fieldset className={styles.fieldset}>
          <legend className={styles.label}>Assign to</legend>
          {optsLoading ? (
            <p className={styles.muted}>Loading staff…</p>
          ) : (
            <div className={styles.chipRow}>
              <button
                type="button"
                className={`${styles.chip} ${
                  pendingStaffId === null ? styles.chipActive : ""
                }`}
                onClick={() => setPendingStaffId(null)}
                disabled={submitting}
              >
                Unassigned
              </button>
              {staffOptions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`${styles.chip} ${
                    pendingStaffId === s.id ? styles.chipActive : ""
                  }`}
                  onClick={() => setPendingStaffId(s.id)}
                  disabled={submitting}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
          {optsError ? <p className={styles.error}>{optsError}</p> : null}
        </fieldset>
        <label
          className={styles.label}
          htmlFor={`reassign-reason-${taskId}`}
        >
          Reason (required)
        </label>
        <textarea
          id={`reassign-reason-${taskId}`}
          className={styles.textarea}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={submitting}
          placeholder={
            isChanged
              ? "Why is this card moving?"
              : "Pick a different assignee to reassign."
          }
        />
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.actions}>
          <button
            type="submit"
            disabled={!canSubmit}
            className={styles.submit}
          >
            {submitting ? "Reassigning…" : "Reassign"}
          </button>
        </div>
      </form>
    </section>
  );
}
