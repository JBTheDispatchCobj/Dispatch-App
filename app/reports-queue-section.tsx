"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Row = {
  id: string;
  title: string;
  report_category: string | null;
  created_at: string;
};

export default function ReportsQueueSection() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, report_category, created_at")
      .eq("is_staff_report", true)
      .eq("report_queue_status", "pending")
      .order("created_at", { ascending: false });
    if (!error && data) setRows(data as Row[]);
    else setRows([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markReviewed(id: string) {
    setBusyId(id);
    await supabase
      .from("tasks")
      .update({ report_queue_status: "reviewed" })
      .eq("id", id);
    setBusyId(null);
    void load();
  }

  if (loading) {
    return (
      <>
        <h2>Report queue</h2>
        <p className="tasks-muted">Loading…</p>
      </>
    );
  }

  if (rows.length === 0) {
    return (
      <>
        <h2>Report queue</h2>
        <p className="tasks-muted">No pending staff reports.</p>
      </>
    );
  }

  return (
    <>
      <h2>Report queue</h2>
      <p className="tasks-lede">Staff-submitted notes awaiting review</p>
      <ul className="tasks-list">
        {rows.map((r) => (
          <li key={r.id} className="tasks-item">
            <div className="tasks-item-main">
              <Link href={`/tasks/${r.id}`} className="tasks-title-link">
                {r.title}
              </Link>
              <span className="tasks-meta">
                {r.report_category ?? "Other"} ·{" "}
                {new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="tasks-item-actions">
              <button
                type="button"
                className="outline"
                disabled={busyId === r.id}
                onClick={() => void markReviewed(r.id)}
              >
                {busyId === r.id ? "…" : "Mark reviewed"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
