"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DispatchSection from "./dispatch-section";
import SignOutButton from "./sign-out-button";
import StaffSection from "./staff-section";
import TasksSection from "./tasks-section";

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
    <main className="wrap home-shell">
      <header className="shell-header">
        <div>
          <h1>Dispatch</h1>
          <p className="shell-lede">Today&apos;s operations</p>
        </div>
        <SignOutButton />
      </header>

      <ul className="shell-sections">
        <li className="shell-section shell-section--dispatch">
          <DispatchSection />
        </li>
        <li className="shell-section">
          <h2>Activity</h2>
          <p>Recent changes will appear here.</p>
        </li>
        <li className="shell-section shell-section--tasks">
          <TasksSection />
        </li>
        <li className="shell-section shell-section--staff">
          <StaffSection />
        </li>
      </ul>
    </main>
  );
}
