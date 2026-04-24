"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchProfile, type ProfileFetchFailure } from "@/lib/profile";
import {
  resolveAuthUser,
  redirectToLoginUnlessLocalDevBypass,
} from "@/lib/dev-auth-bypass";
import ProfileLoadError from "../../profile-load-error";
import { getSamplePaste } from "@/lib/import/sample";
import { runImport, type ImportActionResult } from "@/lib/import/actions";

export default function ImportPage() {
  const [ready, setReady] = useState(false);
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(null);
  const [paste, setPaste] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ImportActionResult | null>(null);

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
      const profileResult = await fetchProfile(supabase, user);
      if (cancelled) return;
      if (!profileResult.ok) {
        setProfileFailure(profileResult.failure);
        return;
      }
      if (profileResult.profile.role !== "admin") {
        window.location.replace("/");
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleImport() {
    if (!paste.trim()) return;
    setRunning(true);
    setResult(null);
    try {
      const r = await runImport(paste);
      setResult(r);
    } finally {
      setRunning(false);
    }
  }

  if (profileFailure) {
    return <ProfileLoadError failure={profileFailure} />;
  }

  if (!ready) {
    return (
      <main className="wrap">
        <p className="loading-line">Loading...</p>
      </main>
    );
  }

  return (
    <main className="wrap">
      <h1>Import Reservations</h1>
      <p className="subtitle">
        Paste a tab-separated export from ResNexus. Include the header row.
        Rows are matched to today and categorized as arrivals, departures, or
        stayovers. Duplicates are silently skipped.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <button
          type="button"
          className="outline"
          onClick={() => {
            setPaste(getSamplePaste());
            setResult(null);
          }}
        >
          Load sample
        </button>
        <button
          type="button"
          className="outline"
          onClick={() => {
            setPaste("");
            setResult(null);
          }}
        >
          Clear
        </button>
      </div>

      <textarea
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        rows={12}
        placeholder="Paste TSV here..."
        style={{
          width: "100%",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "0.75rem",
          padding: "0.5rem 0.6rem",
          border:
            "1px solid color-mix(in srgb, var(--foreground) 25%, transparent)",
          borderRadius: "6px",
          background: "var(--background)",
          color: "var(--foreground)",
          resize: "vertical",
          display: "block",
        }}
      />

      <div style={{ marginTop: "0.75rem" }}>
        <button
          type="submit"
          onClick={handleImport}
          disabled={running || !paste.trim()}
          style={{ opacity: running || !paste.trim() ? 0.55 : 1 }}
        >
          {running ? "Importing..." : "Import"}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: "1.25rem" }}>
          {result.ok ? (
            <>
              <p className="success">
                {result.inserted} inserted,{" "}
                {result.skippedDupes} skipped as duplicates.
              </p>
              {result.parseSkipped.length > 0 && (
                <div style={{ marginTop: "0.75rem" }}>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      margin: "0 0 0.35rem",
                    }}
                  >
                    {result.parseSkipped.length} row
                    {result.parseSkipped.length !== 1 ? "s" : ""} not imported:
                  </p>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "1.25rem",
                      fontSize: "0.8125rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                    }}
                  >
                    {result.parseSkipped.map((s, i) => (
                      <li key={i}>
                        <span
                          style={{
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            wordBreak: "break-all",
                          }}
                        >
                          {s.rawLine.length > 60
                            ? s.rawLine.slice(0, 60) + "…"
                            : s.rawLine}
                        </span>
                        {" — "}
                        {s.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="error">{result.message}</p>
          )}
        </div>
      )}
    </main>
  );
}
