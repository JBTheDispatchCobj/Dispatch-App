"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { fetchProfile, shouldUseManagerHome } from "@/lib/profile";
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
      // Manager-likes (admin OR manager) use the admin home; only true staff
      // go to /staff. Routing the "manager" default here (instead of /staff,
      // which bounces manager-likes straight back to /) is what breaks the
      // first-login redirect loop. Must stay in lockstep with the /admin guard.
      const dest = shouldUseManagerHome(result.profile) ? "/admin" : "/staff";
      window.location.replace(dest);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
