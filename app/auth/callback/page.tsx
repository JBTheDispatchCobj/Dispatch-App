"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const POLL_MS = 250;
const MAX_ATTEMPTS = 12;

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;

    async function resolveSession() {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        if (cancelled) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace("/");
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      if (cancelled) return;
      setMessage("Could not complete sign-in.");
      router.replace("/login?error=callback");
    }

    void resolveSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="wrap">
      <p className="loading-line">{message}</p>
    </main>
  );
}
