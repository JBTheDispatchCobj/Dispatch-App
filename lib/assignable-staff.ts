import type { SupabaseClient } from "@supabase/supabase-js";

export type AssignableStaffOption = { id: string; name: string };

/** Trim; return null unless the string is a full UUID (tasks.staff_id FK). */
export function parseStaffRowId(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const re =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return re.test(t) ? t.toLowerCase() : null;
}

/** Match staff.sql check: treat null/empty as assignable for legacy rows. */
function isActiveDirectoryStatus(raw: unknown): boolean {
  const s = (raw === null || raw === undefined ? "active" : String(raw))
    .trim()
    .toLowerCase();
  return s === "" || s === "active";
}

/**
 * Staff rows for task assignee dropdowns. Uses a validated session, loads the
 * full directory, then filters to active (avoids PostgREST filter drift vs
 * Staff section and handles legacy null status).
 */
export async function fetchAssignableStaffOptions(
  client: SupabaseClient,
): Promise<{ options: AssignableStaffOption[]; error: string | null }> {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) {
    return {
      options: [],
      error: authError?.message ?? "No valid session; sign in to load staff.",
    };
  }

  const { data, error } = await client
    .from("staff")
    .select("id, name, status")
    .order("name", { ascending: true });

  if (error) {
    return { options: [], error: error.message };
  }

  const rows = (data ?? []) as {
    id: string;
    name: string;
    status?: string | null;
  }[];

  const options = rows
    .filter((r) => isActiveDirectoryStatus(r.status))
    .map((r) => ({ id: r.id, name: r.name }));

  return { options, error: null };
}
