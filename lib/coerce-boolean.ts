/** Coerce DB / API values to boolean (avoids `Boolean("false") === true`). */
export function coerceBoolean(value: unknown, defaultValue = false): boolean {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s === "true" || s === "t" || s === "1") return true;
    if (s === "false" || s === "f" || s === "0" || s === "") return false;
  }
  return defaultValue;
}
