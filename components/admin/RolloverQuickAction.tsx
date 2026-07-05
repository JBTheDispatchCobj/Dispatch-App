"use client";

// Day 57 — Rollover quick action (Jennifer QA §3 #31). Lists today's open
// departures; rolling one sets context.rolled_over = true so it drops off
// Angie's staff home (the task row is kept for history). The full admin
// departure-status table where Rollover eventually lives is post-beta — this
// is the beta-scoped entry point on the admin home.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  logTaskEvent,
  taskEventType,
  withTaskEventSchema,
} from "@/lib/task-events";
import { isRolledOver, staffHomeBucketForTask } from "@/lib/staff-home-bucket";
import styles from "./RolloverQuickAction.module.css";

type DepartureRow = {
  id: string;
  title: string;
  status: string;
  card_type: string;
  room_number: string | null;
  context: Record<string, unknown>;
};

function normalizeContext(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export default function RolloverQuickAction() {
  const [rows, setRows] = useState<DepartureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setUserId(session?.user?.id ?? null);

    const { data, error: qErr } = await supabase
      .from("tasks")
      .select("id, title, status, card_type, room_number, context")
      .eq("context->>staff_home_bucket", "departures")
      .neq("status", "done")
      .order("room_number", { ascending: true });

    if (qErr) {
      setError(qErr.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const mapped: DepartureRow[] = ((data ?? []) as Record<string, unknown>[])
      .map((r) => ({
        id: String(r.id),
        title: String(r.title ?? ""),
        status: String(r.status ?? "open"),
        card_type: String(r.card_type ?? "housekeeping_turn"),
        room_number: r.room_number ? String(r.room_number) : null,
        context: normalizeContext(r.context),
      }))
      // Belt-and-suspenders: keep only true departures, drop already-rolled.
      .filter((r) => staffHomeBucketForTask(r) === "departures")
      .filter((r) => !isRolledOver(r));

    setRows(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRollover = useCallback(
    async (row: DepartureRow) => {
      if (busyId) return;
      setBusyId(row.id);
      setError(null);

      const { error: upErr } = await supabase
        .from("tasks")
        .update({ context: { ...row.context, rolled_over: true } })
        .eq("id", row.id);

      if (upErr) {
        setError(upErr.message);
        setBusyId(null);
        return;
      }

      await logTaskEvent(
        row.id,
        taskEventType.departureRolledOver,
        withTaskEventSchema({ room_number: row.room_number }),
        userId,
      );

      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setBusyId(null);
    },
    [busyId, userId],
  );

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span>ROLLOVER &middot; DEPARTURES</span>
        <span className={styles.count}>{rows.length}</span>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {loading ? (
        <div className={styles.empty}>Loading&hellip;</div>
      ) : rows.length === 0 ? (
        <div className={styles.empty}>No departures to roll over today.</div>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.id} className={styles.row}>
              <div className={styles.rowMain}>
                <div className={styles.rowTitle}>{row.title}</div>
                <div className={styles.rowSub}>
                  {row.room_number ? `Room ${row.room_number}` : "—"}
                </div>
              </div>
              <button
                type="button"
                className={styles.rollBtn}
                disabled={busyId === row.id}
                onClick={() => onRollover(row)}
              >
                {busyId === row.id ? "…" : "Roll over"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
