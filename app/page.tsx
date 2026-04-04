"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SignOutButton from "./sign-out-button";

export default function Home() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session) {
        window.location.replace("/login");
        return;
      }
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (!session) {
        window.location.replace("/login");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <main className="wrap">
        <p className="loading-line">Loading…</p>
      </main>
    );
  }

  return (
    <main className="wrap">
      <h1>Home</h1>
      <p>You are signed in.</p>
      <nav>
        <SignOutButton />
      </nav>
    </main>
  );
}
