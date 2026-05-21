"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, Suspense } from "react";
import type { User } from "@supabase/supabase-js";
import {
  fetchProfile,
  shouldUseManagerHome,
  type ProfileFetchFailure,
  type ProfileRow,
} from "@/lib/profile";
import { resolveAuthUser } from "@/lib/dev-auth-bypass";
import { supabase } from "@/lib/supabase";
import ProfileLoadError from "@/app/profile-load-error";

/**
 * Email -> one-time code sign-in (Supabase OTP; length is whatever the
 * project is configured for — currently 8 digits — so the input is
 * length-flexible, not hardcoded).
 *
 * We email a one-time code (Supabase OTP) and verify it in-app instead of
 * having the user click a magic link. Magic-link clicks were unreliable on
 * mobile: tapping the link inside a mail app opens an in-app browser that does
 * NOT carry the PKCE code-verifier the requesting browser stored, so the
 * code-for-session exchange failed and the user fell back to whatever session
 * the device already had (e.g. an admin), landing them on the wrong home.
 * Typing the code happens in the same browser, so there is no cross-context
 * verifier dependency.
 *
 * NOTE: requires the Supabase "Magic Link" email template to surface the code
 * via {{ .Token }}; otherwise the email arrives with no code to type.
 */

/** Where to send a freshly-authed user. Matches the already-signed-in gate. */
function routeForProfile(p: ProfileRow): "/" | "/staff" {
  return shouldUseManagerHome(p) ? "/" : "/staff";
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [profileGateFailure, setProfileGateFailure] =
    useState<ProfileFetchFailure | null>(null);

  useEffect(() => {
    const paramError = searchParams.get("error");
    if (paramError === "callback" || paramError === "auth_callback_failed") {
      setError("That sign-in link expired or was invalid. Enter your email to get a new code.");
    }
  }, [searchParams]);

  // Already signed in? Route by role (no sign-in step needed).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
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
        window.location.replace(routeForProfile(result.profile));
        return;
      }
      setCheckingSession(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function routeAfterAuth(user: User) {
    const result = await fetchProfile(supabase, user);
    if (!result.ok) {
      setProfileGateFailure(result.failure);
      setLoading(false);
      return;
    }
    window.location.replace(routeForProfile(result.profile));
    // Keep `loading` true through the redirect so the form stays disabled.
  }

  async function onSendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // emailRedirectTo is harmless here; if a link is also present in the
    // template it stays valid, but the code path is what we rely on.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    setStep("code");
  }

  async function onVerifyCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    if (verifyError) {
      setLoading(false);
      setError(verifyError.message);
      return;
    }
    if (!data.user) {
      setLoading(false);
      setError("Could not complete sign-in. Request a new code and try again.");
      return;
    }
    await routeAfterAuth(data.user);
  }

  function backToEmail() {
    setStep("email");
    setCode("");
    setError(null);
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

  if (step === "code") {
    return (
      <main className="wrap login-screen">
        <h1>Enter your code</h1>
        <p className="subtitle">
          We emailed a sign-in code to <strong>{email}</strong>. Enter the whole
          code below to sign in.
        </p>
        <form className="stack" onSubmit={onVerifyCode}>
          <label>
            Sign-in code
            <input
              type="text"
              name="code"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              value={code}
              onChange={(ev) => setCode(ev.target.value.replace(/\D/g, ""))}
              required
              disabled={loading}
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" disabled={loading || code.trim().length < 6}>
            {loading ? "Verifying…" : "Verify & sign in"}
          </button>
        </form>
        <button
          type="button"
          onClick={backToEmail}
          disabled={loading}
          style={{
            marginTop: 16,
            background: "none",
            border: "none",
            padding: 0,
            color: "inherit",
            textDecoration: "underline",
            cursor: "pointer",
            font: "inherit",
            opacity: 0.8,
          }}
        >
          Use a different email or resend a code
        </button>
      </main>
    );
  }

  return (
    <main className="wrap login-screen">
      <h1>Sign in</h1>
      <p className="subtitle">
        Enter your work email. We will email you a one-time sign-in code—no
        password needed.
      </p>
      <form className="stack" onSubmit={onSendCode}>
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
        <button type="submit" disabled={loading}>
          {loading ? "Sending code…" : "Email me a code"}
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
