"use client";

import { supabase } from "@/lib/supabase";

export default function SignOutButton() {
  return (
    <button
      type="button"
      className="outline"
      onClick={() => {
        void supabase.auth.signOut().then(() => {
          window.location.replace("/login");
        });
      }}
    >
      Sign out
    </button>
  );
}
