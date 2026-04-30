/**
 * Bypass requires both NEXT_PUBLIC_DEV_BYPASS=true AND a local hostname.
 * Production deploys leave the env var unset; bypass never fires.
 */
"use client";

import { useEffect, useState } from "react";
import {
  DEV_ROLE_STORAGE_KEY,
  getDevRoleOverride,
  isLocalDevHost,
} from "@/lib/dev-auth-bypass";
import { supabase } from "@/lib/supabase";

type BannerMode = "hidden" | "view_with_session" | "view_no_session";

export default function DevBypassBanner() {
  const [mode, setMode] = useState<BannerMode>("hidden");
  const [role, setRole] = useState<"manager" | "staff" | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isLocalDevHost()) {
      setMode("hidden");
      return;
    }

    const sync = () => {
      const r = getDevRoleOverride();
      setRole(r);
      if (!r) {
        setMode("hidden");
        setEmail(null);
        return;
      }
      void supabase.auth.getSession().then(({ data: { session } }) => {
        const u = session?.user;
        if (u) {
          setMode("view_with_session");
          setEmail(u.email ?? u.id);
        } else {
          setMode("view_no_session");
          setEmail(null);
        }
      });
    };

    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === DEV_ROLE_STORAGE_KEY || e.key === null) sync();
    };
    window.addEventListener("storage", onStorage);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      sync();
    });

    return () => {
      window.removeEventListener("storage", onStorage);
      subscription.unsubscribe();
    };
  }, []);

  if (mode === "hidden" || !role) return null;

  const base = {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100000,
    padding: "6px 12px",
    textAlign: "center" as const,
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "ui-monospace, monospace",
    letterSpacing: "0.04em",
    color: "#fff",
    borderBottom: "2px solid #fbbf24",
  };

  const bg =
    mode === "view_no_session"
      ? "#7f1d1d"
      : role === "manager"
        ? "#1e3a8a"
        : "#14532d";

  const line1 =
    mode === "view_with_session"
      ? `DEV VIEW: ${role} shell · API: ${email ?? "signed in"}`
      : `DEV VIEW: ${role} shell · no Supabase session — sign in for API calls`;

  return (
    <div style={{ ...base, background: bg }} title={line1}>
      {line1}
    </div>
  );
}
