"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, Suspense } from "react";
import {
  fetchProfile,
  shouldUseManagerHome,
  type ProfileFetchFailure,
} from "@/lib/profile";
import { resolveAuthUser } from "@/lib/dev-auth-bypass";
import { supabase } from "@/lib/supabase";
import ProfileLoadError from "@/app/profile-load-error";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [linkSent, setLinkSent] = useState(false);
  const [profileGateFailure, setProfileGateFailure] =
    useState<ProfileFetchFailure | null>(null);

  useEffect(() => {
    const paramError = searchParams.get("error");
    if (paramError === "callback") {
      setError("Sign-in link expired or was invalid. Try again.");
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      const user = resolveAuthUser(session);
      if (user) {
        const result = await fetchProfile(supabase, user);
        if (cancelled) return;
        if (!result.ok) {
          setProfileGateFailure(result.failure);
          setCheckingSession(false);
          return;
        }
        const p = result.profile;
        const managerLike = shouldUseManagerHome(p);
        const target = managerLike ? "/" : "/staff";
        console.log("[login-routing]", {
          authUserId: user.id,
          authEmail: user.email,
          profileId: p.id,
          role: p.role,
          staffId: p.staff_id,
          decision: `replace(${target})`,
        });
        window.location.replace(target);
        return;
      }
      setCheckingSession(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLinkSent(false);
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setLinkSent(true);
  }

  if (checkingSession) {
    return (
      <main className="wrap login-screen">
        <p className="loading-line">Loading…</p>
      </main>
    );
  }

  if (profileGateFailure) {
    return <ProfileLoadError failure={profileGateFailure} />;
  }

  return (
    <main className="wrap login-screen">
      <h1>Sign in</h1>
      <p className="subtitle">
        Enter your work email. We will send you a link to sign in—no password
        needed.
      </p>
      <form className="stack" onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
            disabled={loading}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        {linkSent ? (
          <p className="success">
            Check your email for the sign-in link. You can close this tab.
          </p>
        ) : null}
        <button type="submit" disabled={loading}>
          {loading ? "Sending link…" : "Email me a link"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="wrap login-screen">
          <p className="loading-line">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
