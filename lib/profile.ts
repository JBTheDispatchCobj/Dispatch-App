import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDevRoleOverride } from "@/lib/dev-auth-bypass";

export type AppRole = "admin" | "manager" | "staff";

export type ProfileRow = {
  id: string;
  role: AppRole;
  staff_id: string | null;
  display_name: string;
  /** Verbatim role from DB before normalize (undefined if not from a select row or absent in payload) */
  roleRaw?: string | null;
};

/**
 * Maps DB role to AppRole. Trims whitespace; only admin | manager | staff are recognized.
 * Unrecognized/empty values fall back to manager (for callers outside fetchProfile).
 */
export function normalizeRole(raw: unknown): AppRole {
  const rawStr = String(raw ?? "").trim().toLowerCase();
  let normalized: AppRole;
  if (rawStr === "admin") normalized = "admin";
  else if (rawStr === "manager") normalized = "manager";
  else if (rawStr === "staff") normalized = "staff";
  else normalized = "manager";

  if (process.env.NODE_ENV === "development") {
    console.log("[normalizeRole]", {
      raw,
      typeofRaw: typeof raw,
      normalized,
    });
  }

  return normalized;
}

/** Strict: only a non-empty admin | manager | staff string (after trim + lower) is valid. */
function parseProfilesRoleStrict(raw: unknown): { ok: true; role: AppRole } | { ok: false; message: string } {
  const rawStr = String(raw ?? "").trim().toLowerCase();
  if (!rawStr) {
    const why =
      raw === null || raw === undefined
        ? "Profile row has no role value (null/undefined)."
        : "Profile role is empty after trim.";
    return { ok: false, message: why };
  }
  if (rawStr === "admin" || rawStr === "manager" || rawStr === "staff") {
    return { ok: true, role: rawStr };
  }
  return {
    ok: false,
    message: `Profile role is not valid: ${JSON.stringify(String(raw))}. Expected admin, manager, or staff.`,
  };
}

export function isManagerLike(role: AppRole): boolean {
  return role === "admin" || role === "manager";
}

/**
 * Which app shell (/ manager vs /staff) to use when localhost dev view
 * (`dispatch_dev_role`) is set; otherwise follows DB profile.role.
 */
export function shouldUseManagerHome(profile: ProfileRow): boolean {
  const o = getDevRoleOverride();
  if (o === "manager") return true;
  if (o === "staff") return false;
  return isManagerLike(profile.role);
}

/** Staff routes: not forced to manager shell and (DB staff or dev “staff” view). */
export function mayAccessStaffRoutes(profile: ProfileRow): boolean {
  if (shouldUseManagerHome(profile)) return false;
  return profile.role === "staff" || getDevRoleOverride() === "staff";
}

/** TEMP: role-routing debug — remove after fixing staff redirect */
export type ProfileRoutingDebug = {
  authUserId: string;
  authEmail: string | undefined;
  profileRowId: string;
  profileRole: AppRole;
  staffId: string | null;
  source: string;
  details?: string;
};

export type ProfileFetchFailure = {
  reason: "select_error" | "no_profile_row" | "role_invalid";
  message: string;
  supabaseError?: string | null;
};

export type ProfileFetchResult =
  | { ok: true; profile: ProfileRow }
  | { ok: false; failure: ProfileFetchFailure };

/** Preserve DB role for display/debug; do not default to manager here. */
function roleRawFromRow(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value;
  return String(value);
}

function stampProfileRouting(user: User, row: ProfileRow, source: string, details?: string) {
  const payload: ProfileRoutingDebug = {
    authUserId: user.id,
    authEmail: user.email,
    profileRowId: row.id,
    profileRole: row.role,
    staffId: row.staff_id,
    source,
    ...(details ? { details } : {}),
  };
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    (window as Window & { __profileRoutingDebug?: ProfileRoutingDebug }).__profileRoutingDebug =
      payload;
  }
}

function rowFromSupabasePayload(
  data: Record<string, unknown>,
  user: User,
  displayNameFallback: string,
): { ok: true; profile: ProfileRow } | { ok: false; failure: ProfileFetchFailure } {
  const rawRole =
    Object.prototype.hasOwnProperty.call(data, "role") && data["role"] !== undefined
      ? data["role"]
      : data["app_role"];
  if (rawRole === undefined || rawRole === null) {
    console.warn(
      "[profile-routing] profile row missing role in payload",
      { id: data.id, keys: Object.keys(data) },
    );
    return {
      ok: false,
      failure: {
        reason: "role_invalid",
        message:
          "Profile row exists but role is missing from the API response. Check RLS, select list, or column name.",
        supabaseError: null,
      },
    };
  }
  const parsed = parseProfilesRoleStrict(rawRole);
  if (!parsed.ok) {
    console.warn("[profile-routing] profile role invalid", { id: data.id, rawRole });
    return {
      ok: false,
      failure: {
        reason: "role_invalid",
        message: parsed.message,
        supabaseError: null,
      },
    };
  }
  const profile: ProfileRow = {
    id: data.id as string,
    role: parsed.role,
    staff_id: (data.staff_id as string | null) ?? null,
    display_name: (data.display_name as string) || user.email || displayNameFallback,
    roleRaw: roleRawFromRow(rawRole),
  };
  return { ok: true, profile };
}

export async function fetchProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<ProfileFetchResult> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, staff_id, display_name, app_role:role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      failure: {
        reason: "select_error",
        message: "Could not load your profile from the database.",
        supabaseError: error.message,
      },
    };
  }

  if (!data) {
    return {
      ok: false,
      failure: {
        reason: "no_profile_row",
        message:
          "No profile row exists for this account. Add a row in public.profiles for this user id (or fix RLS if the row should be visible).",
        supabaseError: null,
      },
    };
  }

  const displayNameFallback =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "User";

  const built = rowFromSupabasePayload(data as Record<string, unknown>, user, displayNameFallback);
  if (!built.ok) {
    return built;
  }
  stampProfileRouting(user, built.profile, "profiles_row_matched_by_id");
  return built;
}

export async function fetchMentionTargets(
  supabase: SupabaseClient,
): Promise<{ id: string; display_name: string }[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .in("role", ["admin", "manager"])
    .order("display_name", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id as string,
    display_name: String(r.display_name || "Manager").trim() || "Manager",
  }));
}
