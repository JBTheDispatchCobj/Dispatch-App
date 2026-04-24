import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchProfile } from "@/lib/profile";
import type { TaskDraftRow } from "@/lib/orchestration/types";
import DraftsTable from "./drafts-table";

export default async function DraftsPage() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  // Cookie-native auth — no token passed from client
  const cookieStore = await cookies();
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        toSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
    error: authErr,
  } = await authClient.auth.getUser();

  if (authErr || !user) {
    redirect("/");
  }

  const profileResult = await fetchProfile(authClient, user);
  if (!profileResult.ok || profileResult.profile.role !== "admin") {
    redirect("/");
  }

  // Service-role client for task_drafts (RLS blocks authenticated reads)
  const serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error: fetchErr } = await serviceClient
    .from("task_drafts")
    .select("*")
    .order("drafted_at", { ascending: false });

  if (fetchErr) {
    throw new Error(`Failed to load task_drafts: ${fetchErr.message}`);
  }

  const drafts = (data ?? []) as TaskDraftRow[];

  return <DraftsTable drafts={drafts} />;
}
