"use client";

import { useEffect, useState } from "react";
import {
  fetchProfile,
  mayAccessStaffRoutes,
  shouldUseManagerHome,
  type ProfileFetchFailure,
} from "@/lib/profile";
import {
  redirectToLoginUnlessLocalDevBypass,
  resolveAuthUser,
} from "@/lib/dev-auth-bypass";
import { supabase } from "@/lib/supabase";
import ProfileLoadError from "@/app/profile-load-error";
import ManagerCardDetail from "./manager-card-detail";
import StaffCardDetail from "./staff-card-detail";

type Gate = "loading" | "staff" | "manager" | "profile_error";

export default function CardDetail({ taskId }: { taskId: string }) {
  const [gate, setGate] = useState<Gate>("loading");
  const [profileFailure, setProfileFailure] = useState<ProfileFetchFailure | null>(
    null,
  );

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
        setProfileFailure(result.failure);
        setGate("profile_error");
        return;
      }
      const p = result.profile;
      if (shouldUseManagerHome(p)) {
        setGate("manager");
      } else if (mayAccessStaffRoutes(p)) {
        setGate("staff");
      } else {
        setGate("manager");
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (cancelled) return;
      if (!session) redirectToLoginUnlessLocalDevBypass();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (gate === "loading") {
    return (
      <main className="wrap card-page">
        <p className="loading-line">Loading…</p>
      </main>
    );
  }

  if (gate === "profile_error" && profileFailure) {
    return <ProfileLoadError failure={profileFailure} />;
  }

  if (gate === "staff") {
    return <StaffCardDetail taskId={taskId} />;
  }

  return <ManagerCardDetail taskId={taskId} />;
}
