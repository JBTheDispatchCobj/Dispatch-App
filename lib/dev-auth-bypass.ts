/**
 * Localhost-only dev **view** switcher (localStorage: dispatch_dev_role).
 * Does not replace Supabase auth: `resolveAuthUser` is always the real JWT
 * user. Role override affects routing/shell only (see `shouldUseManagerHome`
 * in profile.ts). RLS and writes use `auth.uid()` from the real session.
 */
import type { Session, User } from "@supabase/supabase-js";

export const DEV_ROLE_STORAGE_KEY = "dispatch_dev_role";

export type DevRoleMode = "off" | "manager" | "staff";

export type DevRoleOverride = "manager" | "staff";

/**
 * Returns true only when NEXT_PUBLIC_DEV_BYPASS=true AND the current hostname
 * is a local dev address. Production deploys leave the env var unset so this
 * is always false there, regardless of hostname.
 */
export function isLocalDevHost(): boolean {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS !== "true") return false;
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "[::1]" ||
    h === "::1" ||
    h === "host.docker.internal"
  );
}

function readRoleRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(DEV_ROLE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getDevRoleMode(): DevRoleMode {
  if (typeof window === "undefined") return "off";
  if (!isLocalDevHost()) return "off";
  const v = (readRoleRaw() ?? "").trim().toLowerCase();
  if (v === "manager" || v === "staff" || v === "off") return v;
  return "off";
}

export function getDevRoleOverride(): DevRoleOverride | null {
  if (typeof window === "undefined") return null;
  if (!isLocalDevHost()) return null;
  const v = (readRoleRaw() ?? "").trim().toLowerCase();
  if (v === "manager" || v === "staff") return v;
  return null;
}

/** True when localhost + manager/staff view mode (routing/shell override only). */
export function isLocalDevBypassAuthenticated(): boolean {
  return getDevRoleOverride() !== null;
}

/** Alias for older call sites */
export const isDevAuthBypassActive = isLocalDevBypassAuthenticated;

/** Where /login would send you based on dev view role only (no session implied). */
export function getDevBypassLandingPath(): "/" | "/staff" | null {
  const r = getDevRoleOverride();
  if (r === "manager") return "/";
  if (r === "staff") return "/staff";
  return null;
}

/** Unauthenticated users always go to /login (dev view mode does not skip sign-in). */
export function redirectToLoginUnlessLocalDevBypass(): void {
  window.location.replace("/login");
}

/** Real Supabase user only; dev view mode never substitutes a fake user id. */
export function resolveAuthUser(session: Session | null): User | null {
  return session?.user ?? null;
}
