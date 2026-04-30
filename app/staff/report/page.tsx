"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  fetchProfile,
  mayAccessStaffRoutes,
  shouldUseManagerHome,
  type ProfileFetchFailure,
} from "@/lib/profile";
import {
  redirectToLoginUnlessLocalDevBypass,
  resolveAuthUser,
} from "@/lib/dev-auth-bypass";
import ProfileLoadError from "@/app/profile-load-error";
import {
  logTaskEvent,
  taskEventType,
  uploadTaskFile,
} from "@/lib/task-events";
import SignOutButton from "@/app/sign-out-button";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  "Maintenance",
  "Housekeeping",
  "Guest issue",
  "Inventory",
  "Safety",
  "Guest delight",
  "Other",
] as const;

export default function StaffReportPage() {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(
    null,
  );
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      const user = resolveAuthUser(session);
      if (!user) {
        redirectToLoginUnlessLocalDevBypass();
        return;
      }
      const result = await fetchProfile(supabase, user);
      if (cancelled) return;
      if (!result.ok) {
        setProfileFailure(result.failure);
        setProfileChecked(true);
        return;
      }
      const p = result.profile;
      if (shouldUseManagerHome(p) || !mayAccessStaffRoutes(p)) {
        window.location.replace("/");
        return;
      }
      setUserId(user.id);
      setProfileChecked(true);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (cancelled) return;
      if (!session) redirectToLoginUnlessLocalDevBypass();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId || !title.trim() || !note.trim() || !file || busy) return;
    setBusy(true);
    setError(null);
    const up = await uploadTaskFile(userId, file);
    if (!up) {
      setError("Image upload failed.");
      setBusy(false);
      return;
    }
    const { data: inserted, error: insErr } = await supabase
      .from("tasks")
      .insert({
        title: title.trim(),
        description: note.trim(),
        status: "open",
        priority,
        is_staff_report: true,
        report_category: category,
        report_queue_status: "pending",
        report_image_url: up.publicUrl,
        created_by_user_id: userId,
        staff_id: null,
        assignee_name: "",
        card_type: "general_report",
        source: "staff_report",
      })
      .select("id")
      .single();
    setBusy(false);
    if (insErr || !inserted) {
      setError(insErr?.message ?? "Could not save report.");
      return;
    }
    void logTaskEvent(
      inserted.id as string,
      taskEventType.noteReportCreated,
      { category, title: title.trim() },
      userId,
    );
    setDone(true);
  }

  if (profileFailure) {
    return <ProfileLoadError failure={profileFailure} />;
  }

  if (!profileChecked) {
    return (
      <main className="staff-app">
        <p className="loading-line">Loading…</p>
      </main>
    );
  }

  if (done) {
    return (
      <main className="staff-app">
        <div className="staff-report-body">
          <header className="staff-report-header">
            <h1 className="staff-report-h1">Report sent</h1>
            <SignOutButton />
          </header>
          <p className="success">Your note is in the manager queue.</p>
          <p>
            <Link href="/staff">Back to home</Link>
          </p>
        </div>
        <nav className="staff-bottom-nav" aria-label="Staff navigation">
          <Link href="/staff" className="staff-bottom-nav-item staff-bottom-nav-item--active">
            Home
          </Link>
          <span className="staff-bottom-nav-item">Report</span>
        </nav>
      </main>
    );
  }

  return (
    <main className="staff-app">
      <div className="staff-report-body">
      <header className="staff-report-header">
        <div>
          <h1 className="staff-report-h1">New report</h1>
          <p className="staff-report-lede">Sent to your manager queue</p>
        </div>
        <SignOutButton />
      </header>
      <form className="card-form report-form" onSubmit={onSubmit}>
        {error ? <p className="error">{error}</p> : null}
        <label className="card-label">Title</label>
        <input
          className="card-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={busy}
        />
        <label className="card-label">Note</label>
        <textarea
          className="card-textarea"
          rows={5}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required
          disabled={busy}
          placeholder="What should managers know? (room # in text is fine)"
        />
        <label className="card-label">Category</label>
        <select
          className="card-input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={busy}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="card-label">Priority</label>
        <select
          className="card-input"
          value={priority}
          onChange={(e) =>
            setPriority(e.target.value as "low" | "medium" | "high")
          }
          disabled={busy}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <label className="card-label">Image (required)</label>
        <input
          type="file"
          accept="image/*"
          required
          disabled={busy}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button type="submit" disabled={busy || !file}>
          {busy ? "Submitting…" : "Submit report"}
        </button>
      </form>
      </div>
      <nav className="staff-bottom-nav" aria-label="Staff navigation">
        <Link href="/staff" className="staff-bottom-nav-item">
          Home
        </Link>
        <span className="staff-bottom-nav-item staff-bottom-nav-item--active">
          Report
        </span>
      </nav>
    </main>
  );
}
