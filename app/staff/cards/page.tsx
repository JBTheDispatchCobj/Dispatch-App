"use client";

import { useEffect } from "react";

/** @deprecated Use /staff — tasks live on the staff home. */
export default function StaffCardsRedirectPage() {
  useEffect(() => {
    window.location.replace("/staff");
  }, []);
  return (
    <main className="staff-app">
      <p className="loading-line">Redirecting…</p>
    </main>
  );
}
