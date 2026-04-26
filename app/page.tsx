"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { fetchProfile } from "@/lib/profile";
import {
  resolveAuthUser,
  redirectToLoginUnlessLocalDevBypass,
} from "@/lib/dev-auth-bypass";

export default function RootRedirect() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      const user = resolveAuthUser(session);
      if (!user) {
        redirectToLoginUnlessLocalDevBypass();
        return;
      }
      const result = await fetchProfile(supabase, user);
      if (cancelled) return;
      if (!result.ok) {
        redirectToLoginUnlessLocalDevBypass();
        return;
      }
      const dest = result.profile.role === "admin" ? "/admin" : "/staff";
      window.location.replace(dest);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
