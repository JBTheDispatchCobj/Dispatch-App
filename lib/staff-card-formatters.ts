// lib/staff-card-formatters.ts
//
// Shared formatters used by the staff task cards (A-430, S-430, Da-430,
// E-430, SOD-430). Phase 4 — extracted from per-card audits so multiple
// cards format dates and names identically.

/**
 * Format an ISO timestamp for the staff comment feed.
 * Today  → "h:mm AM/PM"
 * Yesterday → "Yesterday"
 * Older  → "M/D"
 * Bad / missing input → "".
 */
export function formatCommentTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);
  if (d >= startOfToday) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (d >= startOfYesterday) return "Yesterday";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Today's date as "Tue Apr 30" (mixed-case, short).
 */
export function formatTodayDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date-only ISO (YYYY-MM-DD) as "Tue Apr 30" (mixed-case, short).
 * Used by SOD-430 where the source field is task.due_date (date, not timestamp).
 * Falls back to today's date if input is missing or invalid.
 */
export function formatSodDateShort(iso: string | null | undefined): string {
  if (!iso) return formatTodayDate();
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return formatTodayDate();
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Extract first name from a display name string.
 * "Angie Lopez" → "Angie"
 * Empty / null / whitespace-only → null.
 */
export function firstNameFromDisplayName(
  displayName: string | null | undefined,
): string | null {
  const trimmed = displayName?.trim();
  if (!trimmed) return null;
  const first = trimmed.split(/\s+/)[0];
  return first || null;
}
