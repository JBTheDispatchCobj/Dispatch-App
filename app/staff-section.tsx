"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type StaffRow = {
  id: string;
  name: string;
  role: string;
  status: string;
};

export default function StaffSection() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: qError } = await supabase
      .from("staff")
      .select("id, name, role, status")
      .order("status", { ascending: true })
      .order("name", { ascending: true });

    if (qError) {
      setError(qError.message);
      setRows([]);
    } else {
      setRows((data ?? []) as StaffRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || adding) return;
    setAdding(true);
    setError(null);
    const { error: insError } = await supabase.from("staff").insert({
      name,
      role: newRole.trim(),
      status: "active",
    });
    setAdding(false);
    if (insError) {
      setError(insError.message);
      return;
    }
    setNewName("");
    setNewRole("");
    // Day 29 III.D Phase 6: dropped logActivity wrapper.
    window.dispatchEvent(new Event("activity:refresh"));
    void load();
  }

  async function toggleStatus(s: StaffRow) {
    setBusyId(s.id);
    setError(null);
    const next = s.status === "active" ? "inactive" : "active";
    const { error: upError } = await supabase
      .from("staff")
      .update({ status: next })
      .eq("id", s.id);
    setBusyId(null);
    if (upError) {
      setError(upError.message);
      return;
    }
    // Day 29 III.D Phase 6: dropped logActivity wrapper.
    window.dispatchEvent(new Event("activity:refresh"));
    void load();
  }

  return (
    <>
      <h2>Staff</h2>
      <p className="staff-lede">Team</p>

      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <p className="staff-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="staff-muted">No staff yet.</p>
      ) : (
        <ul className="staff-list">
          {rows.map((s) => (
            <li
              key={s.id}
              className={
                s.status === "inactive"
                  ? "staff-list-item staff-list-item--inactive"
                  : "staff-list-item"
              }
            >
              <Link href={`/staff/${s.id}`} className="staff-row-main">
                <span className="staff-row-name">{s.name}</span>
                <span className="staff-row-role">{s.role.trim() || "—"}</span>
                <span className="staff-row-status">{s.status}</span>
              </Link>
              <button
                type="button"
                className="outline staff-toggle"
                disabled={busyId === s.id}
                onClick={() => void toggleStatus(s)}
              >
                {busyId === s.id
                  ? "…"
                  : s.status === "active"
                    ? "Deactivate"
                    : "Activate"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="staff-add-form" onSubmit={onAdd}>
        <input
          type="text"
          className="staff-add-input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name"
          disabled={adding || loading}
          aria-label="New staff name"
          required
        />
        <input
          type="text"
          className="staff-add-input"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          placeholder="Role"
          disabled={adding || loading}
          aria-label="New staff role"
        />
        <button type="submit" disabled={adding || loading || !newName.trim()}>
          {adding ? "Adding…" : "Add"}
        </button>
      </form>
    </>
  );
}
