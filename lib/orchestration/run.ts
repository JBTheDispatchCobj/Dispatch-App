import { createClient } from "@supabase/supabase-js";
import { dispatch } from "./rules/index";
import type { InboundEvent, TaskDraft } from "./types";

function makeServiceRoleClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Strip source_event_id before inserting into tasks (tasks table has no such column).
function toTaskRow(draft: TaskDraft): Omit<TaskDraft, "source_event_id"> {
  const { source_event_id: _excluded, ...rest } = draft;
  return rest;
}

export type OrchestratorResult =
  | { killed: true }
  | {
      killed: false;
      events_processed: number;
      drafts_inserted: number;
      tasks_inserted: number;
    };

export async function run(): Promise<OrchestratorResult> {
  if (process.env.AGENT_KILL === "true") {
    console.log(
      "[orchestrator] Kill switch engaged — halting before any DB reads or writes",
    );
    return { killed: true };
  }

  // Default to dry-run (task_drafts) unless explicitly set to "false".
  const dryRun = process.env.AGENT_DRY_RUN !== "false";
  console.log(
    `[orchestrator] Starting. dry_run=${dryRun ? "true (→ task_drafts)" : "false (→ tasks)"}`,
  );

  const client = makeServiceRoleClient();

  const { data: events, error: fetchErr } = await client
    .from("inbound_events")
    .select(
      "id, source, external_id, event_type, event_date, raw_payload, created_at, processed_at",
    )
    .is("processed_at", null)
    .order("created_at", { ascending: true });

  if (fetchErr) {
    throw new Error(`Failed to fetch inbound_events: ${fetchErr.message}`);
  }

  const rows = (events ?? []) as InboundEvent[];
  console.log(`[orchestrator] Found ${rows.length} unprocessed event(s).`);

  let drafts_inserted = 0;
  let tasks_inserted = 0;

  for (const event of rows) {
    const drafts = dispatch(event);

    if (drafts.length > 0) {
      if (dryRun) {
        const draftRows = drafts.map((d) => ({
          ...d,
          source_event_id: event.id,
        }));
        const { error: insertErr } = await client
          .from("task_drafts")
          .insert(draftRows);
        if (insertErr) {
          throw new Error(
            `Failed to insert task_drafts for event ${event.id}: ${insertErr.message}`,
          );
        }
        drafts_inserted += draftRows.length;
      } else {
        const taskRows = drafts.map(toTaskRow);
        const { error: insertErr } = await client.from("tasks").insert(taskRows);
        if (insertErr) {
          throw new Error(
            `Failed to insert tasks for event ${event.id}: ${insertErr.message}`,
          );
        }
        tasks_inserted += taskRows.length;
      }
    }

    // Mark processed regardless of draft count — stubs produce 0 drafts intentionally.
    const { error: markErr } = await client
      .from("inbound_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", event.id);
    if (markErr) {
      throw new Error(
        `Failed to mark event ${event.id} processed: ${markErr.message}`,
      );
    }
  }

  return {
    killed: false,
    events_processed: rows.length,
    drafts_inserted,
    tasks_inserted,
  };
}
