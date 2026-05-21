"use client";

/**
 * TEMP diagnostic page — remove once the mobile staff-login redirect bug is
 * fixed. Shows exactly which Supabase user the browser is logged in as and
 * what role fetchProfile resolves, WITHOUT redirecting. This is how we tell,
 * on the actual device, whether a staff magic link is authenticating as the
 * wrong (admin) user or whether the profile read is returning the wrong role.
 *
 * Safe to deploy: a signed-in user can only ever see their own session/profile.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchProfile, type ProfileFetchResult } from "@/lib/profile";
import { resolveAuthUser } from "@/lib/dev-auth-bypass";

type Snapshot = {
  hasSession: boolean;
  sessionError: string | null;
  userId: string | null;
  userEmail: string | null;
  profile: ProfileFetchResult | null;
  rootDecision: string | null;
};

export default function WhoAmIPage() {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      const session = data.session;
      const user = resolveAuthUser(session);
      let profile: ProfileFetchResult | null = null;
      let rootDecision: string | null = null;
      if (user) {
        profile = await fetchProfile(supabase, user);
        if (profile.ok) {
          rootDecision = profile.profile.role === "admin" ? "/admin" : "/staff";
        }
      }
      if (cancelled) return;
      setSnap({
        hasSession: Boolean(session),
        sessionError: error?.message ?? null,
        userId: user?.id ?? null,
        userEmail: user?.email ?? null,
        profile,
        rootDecision,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const row = (label: string, value: string) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, opacity: 0.6 }}>
        {label}
      </div>
      <div style={{ fontSize: 17, fontWeight: 600, wordBreak: "break-all" }}>{value}</div>
    </div>
  );

  return (
    <main className="wrap" style={{ padding: 20, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
      <h1 style={{ fontSize: 20 }}>whoami (debug)</h1>
      {!snap ? (
        <p className="loading-line">Reading session…</p>
      ) : (
        <>
          {row("Session present", snap.hasSession ? "YES" : "NO")}
          {snap.sessionError ? <p className="error">getSession error: {snap.sessionError}</p> : null}
          {row("Auth user id", snap.userId ?? "(none)")}
          {row("Auth user email", snap.userEmail ?? "(none)")}
          {snap.profile === null
            ? row("Profile", "(no session — not fetched)")
            : snap.profile.ok
              ? (
                <>
                  {row("Profile role", snap.profile.profile.role)}
                  {row("Profile role (raw from DB)", String(snap.profile.profile.roleRaw ?? "(none)"))}
                  {row("Profile staff_id", snap.profile.profile.staff_id ?? "(null)")}
                  {row("Profile display_name", snap.profile.profile.display_name)}
                  {row("Where the home page WOULD send this user", snap.rootDecision ?? "(unknown)")}
                </>
              )
              : (
                <>
                  {row("Profile fetch", "FAILED")}
                  {row("Failure reason", snap.profile.failure.reason)}
                  <p className="error">{snap.profile.failure.message}</p>
                  {snap.profile.failure.supabaseError ? (
                    <p className="error">Supabase: {snap.profile.failure.supabaseError}</p>
                  ) : null}
                </>
              )}
        </>
      )}
    </main>
  );
}
