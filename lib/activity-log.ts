import { supabase } from "./supabase";

/** Machine-readable event keys (also stored in activity_events.type). */
export const activityType = {
  dispatchSaved: "dispatch_saved",
  taskCreated: "task_created",
  taskCompleted: "task_completed",
  staffAdded: "staff_added",
  staffStatusChanged: "staff_status_changed",
  staffOutcomeAdded: "staff_outcome_added",
} as const;

const REFRESH_EVENT = "dispatch-activity-logged";

export function subscribeActivityRefresh(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(REFRESH_EVENT, handler);
  return () => window.removeEventListener(REFRESH_EVENT, handler);
}

export async function logActivity(type: string, message: string): Promise<void> {
  const { error } = await supabase.from("activity_events").insert({
    type,
    message,
  });
  if (!error && typeof window !== "undefined") {
    window.dispatchEvent(new Event(REFRESH_EVENT));
  }
}
