"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { activityType, logActivity } from "@/lib/activity-log";
import { supabase } from "@/lib/supabase";

type StaffRow = {
  id: string;
  name: string;
  role: string;
  status: string;
  notes: string;
};

type OutcomeRow = {
  id: string;
  body: string;
  created_at: string;
};

export default function StaffDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [notes, setNotes] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [outcomes, setOutcomes] = useState<OutcomeRow[]>([]);
  const [outcomeDraft, setOutcomeDraft] = useState("");
  const [addingOutcome, setAddingOutcome] = useState(false);
  const statusLoadedRef = useRef<string>("active");

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session) {
        window.location.replace("/login");
        return;
      }
      setAuthReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) window.location.replace("/login");
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const loadStaff = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    const { data, error: qError } = await supabase
      .from("staff")
      .select("id, name, role, status, notes")
      .eq("id", id)
      .maybeSingle();

    if (qError) {
      setError(qError.message);
      setLoading(false);
      return;
    }
    if (!data) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const row = data as StaffRow;
    setName(row.name);
    setRole(row.role ?? "");
    const st = row.status === "inactive" ? "inactive" : "active";
    setStatus(st);
    statusLoadedRef.current = st;
    setNotes(row.notes ?? "");
    setLoading(false);
  }, [id]);

  const loadOutcomes = useCallback(async () => {
    if (!id) return;
    const { data, error: qError } = await supabase
      .from("staff_outcomes")
      .select("id, body, created_at")
      .eq("staff_id", id)
      .order("created_at", { ascending: false });

    if (!qError && data) {
      setOutcomes(data as OutcomeRow[]);
    }
  }, [id]);

  useEffect(() => {
    if (!authReady || !id) return;
    void loadStaff();
    void loadOutcomes();
  }, [authReady, id, loadStaff, loadOutcomes]);

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n || savingProfile || !id) return;
    setSavingProfile(true);
    setError(null);
    const { error: upError } = await supabase
      .from("staff")
      .update({
        name: n,
        role: role.trim(),
        status,
        notes: notes.trim(),
      })
      .eq("id", id);
    setSavingProfile(false);
    if (upError) {
      setError(upError.message);
      return;
    }
    const prev = statusLoadedRef.current;
    if (status !== prev) {
      void logActivity(
        activityType.staffStatusChanged,
        `${n}: ${prev} → ${status}`,
      );
      statusLoadedRef.current = status;
    }
    void loadStaff();
  }

  async function onAddOutcome(e: FormEvent) {
    e.preventDefault();
    const body = outcomeDraft.trim();
    if (!body || addingOutcome || !id) return;
    setAddingOutcome(true);
    setError(null);
    const { error: insError } = await supabase.from("staff_outcomes").insert({
      staff_id: id,
      body,
    });
    setAddingOutcome(false);
    if (insError) {
      setError(insError.message);
      return;
    }
    setOutcomeDraft("");
    const snippet =
      body.length > 120 ? `${body.slice(0, 117)}…` : body;
    void logActivity(
      activityType.staffOutcomeAdded,
      `Outcome (${name}): ${snippet}`,
    );
    void loadOutcomes();
  }

  if (!authReady) {
    return (
      <main className="wrap">
        <p className="loading-line">Loading…</p>
      </main>
    );
  }

  if (!id) {
    return (
      <main className="wrap home-shell">
        <p className="error">Invalid link.</p>
        <Link href="/">Back to home</Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="wrap home-shell">
        <p className="loading-line">Loading…</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="wrap home-shell">
        <p className="staff-muted">Staff not found.</p>
        <nav className="staff-detail-nav">
          <Link href="/">← Home</Link>
        </nav>
      </main>
    );
  }

  return (
    <main className="wrap home-shell staff-detail">
      <nav className="staff-detail-nav">
        <Link href="/">← Home</Link>
      </nav>

      <h1 className="staff-detail-title">{name}</h1>

      {error ? <p className="error">{error}</p> : null}

      <form className="staff-detail-form" onSubmit={onSaveProfile}>
        <label className="staff-detail-label" htmlFor="staff-name">
          Name
        </label>
        <input
          id="staff-name"
          className="staff-detail-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={savingProfile}
          required
        />
        <label className="staff-detail-label" htmlFor="staff-role">
          Role
        </label>
        <input
          id="staff-role"
          className="staff-detail-input"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={savingProfile}
        />
        <label className="staff-detail-label" htmlFor="staff-status">
          Status
        </label>
        <select
          id="staff-status"
          className="staff-detail-input"
          value={status}
          onChange={(e) =>
            setStatus(e.target.value === "inactive" ? "inactive" : "active")
          }
          disabled={savingProfile}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <label className="staff-detail-label" htmlFor="staff-notes">
          Notes
        </label>
        <textarea
          id="staff-notes"
          className="staff-detail-textarea"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={savingProfile}
          placeholder="Operational notes…"
        />
        <button type="submit" disabled={savingProfile || !name.trim()}>
          {savingProfile ? "Saving…" : "Save"}
        </button>
      </form>

      <section className="staff-outcomes" aria-labelledby="outcomes-heading">
        <h2 id="outcomes-heading" className="staff-outcomes-heading">
          Outcomes
        </h2>
        <p className="staff-muted staff-outcomes-lede">
          Short log for this person.
        </p>
        {outcomes.length === 0 ? (
          <p className="staff-muted">No entries yet.</p>
        ) : (
          <ul className="staff-outcomes-list">
            {outcomes.map((o) => (
              <li key={o.id} className="staff-outcomes-item">
                <p className="staff-outcomes-body">{o.body}</p>
                <time className="staff-outcomes-time" dateTime={o.created_at}>
                  {new Date(o.created_at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
        <form className="staff-outcome-add" onSubmit={onAddOutcome}>
          <input
            type="text"
            className="staff-detail-input"
            value={outcomeDraft}
            onChange={(e) => setOutcomeDraft(e.target.value)}
            placeholder="Add outcome or note"
            disabled={addingOutcome}
            aria-label="New outcome"
          />
          <button type="submit" disabled={addingOutcome || !outcomeDraft.trim()}>
            {addingOutcome ? "Adding…" : "Add"}
          </button>
        </form>
      </section>
    </main>
  );
}
