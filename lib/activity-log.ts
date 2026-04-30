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

export const ACTIVITY_REFRESH_EVENT = "dispatch-activity-logged";
export const ACTIVITY_INSERT_FAILED_EVENT = "dispatch-activity-log-failed";

export function subscribeActivityRefresh(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(ACTIVITY_REFRESH_EVENT, handler);
  return () => window.removeEventListener(ACTIVITY_REFRESH_EVENT, handler);
}

export async function logActivity(type: string, message: string): Promise<void> {
  console.log("[activity] insert attempt", { type, message });
  const { error } = await supabase.from("activity_events").insert({
    type,
    message,
  });
  if (error) {
    console.error("[activity] insert failed", error.message, error);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(ACTIVITY_INSERT_FAILED_EVENT, {
          detail: { message: error.message },
        }),
      );
    }
    return;
  }
  console.log("[activity] insert ok", { type });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACTIVITY_REFRESH_EVENT));
  }
}
