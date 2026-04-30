"use client";

import { redirectToLoginUnlessLocalDevBypass } from "@/lib/dev-auth-bypass";
import { supabase } from "@/lib/supabase";

export default function SignOutButton() {
  return (
    <button
      type="button"
      className="outline"
      onClick={() => {
        void supabase.auth.signOut().then(() => {
          redirectToLoginUnlessLocalDevBypass();
        });
      }}
    >
      Sign out
    </button>
  );
}
