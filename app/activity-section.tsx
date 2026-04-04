"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { subscribeActivityRefresh } from "@/lib/activity-log";

type Row = {
  id: string;
  type: string;
  message: string;
  created_at: string;
};

const LIMIT = 40;

export default function ActivitySection() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: qError } = await supabase
      .from("activity_events")
      .select("id, type, message, created_at")
      .order("created_at", { ascending: false })
      .limit(LIMIT);

    if (qError) {
      setError(qError.message);
      setRows([]);
    } else {
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribeActivityRefresh(() => void load()), [load]);

  return (
    <>
      <h2>Activity</h2>
      <p className="activity-lede">Recent changes</p>

      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <p className="activity-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="activity-muted">Nothing logged yet.</p>
      ) : (
        <ul className="activity-list">
          {rows.map((r) => (
            <li key={r.id} className="activity-item">
              <p className="activity-message">{r.message}</p>
              <time className="activity-time" dateTime={r.created_at}>
                {new Date(r.created_at).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
