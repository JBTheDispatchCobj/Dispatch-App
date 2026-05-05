import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { dispatch } from "./rules/index.ts";
import type { InboundEvent, TaskDraft } from "./types.ts";
import { loadRoster, type RosterMember } from "./roster.ts";
import { assignDrafts } from "./assignment-policies.ts";
import { reshuffle } from "./reshuffle.ts";
import { writeAuditEvent } from "./audit-events.ts";
import { PROPERTY_TIMEZONE } from "../dispatch-config.ts";

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

/**
 * Today's date as YYYY-MM-DD anchored to the property's timezone. Inlined
 * here rather than importing from lib/reservations.ts because that module
 * imports the browser Supabase client; the orchestrator runs with the
 * service-role client. Matches the inlined helper in reshuffle.ts.
 */
function todayInPropertyTz(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PROPERTY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Daily fan-out pre-pass (master plan IV.F option-2 unblocking path).
 *
 * Per master plan I.C, the clock-in flow is partial — there's no
 * 'shift_start' event source today. To get Da-430 + E-430 cards onto every
 * active housekeeper's queue, we synthesize one 'daily_shift' inbound_event
 * per active staff row at the top of every live orchestrator run. Each
 * synthesized event carries staff_id + staff_name in raw_payload; the
 * dailys.standard and eod.standard rules both trigger on event_type
 * 'daily_shift' and produce one draft each, and interpret() stamps the
 * staff_id straight onto each draft so assignment-policies preserves it.
 *
 * Idempotency: the inbound_events table has a UNIQUE constraint on
 * (source, external_id, event_type, event_date). Re-runs on the same day
 * trip the constraint and the upsert with ignoreDuplicates: true silently
 * drops them. New day → new event_date → fresh row, new dailys + eod card
 * for each active staff member.
 *
 * Skipped on dry-run for the same reason reshuffle is skipped: the live
 * synthesizer flips inbound_events.processed_at via the downstream pass,
 * and mixing dry-run + live cycles on the same daily_shift row would
 * leave today's dailys / eod tasks in task_drafts (never promoted to
 * tasks) while the dedup constraint blocks re-synthesis. Live-only keeps
 * the semantics clean.
 *
 * Future: when master plan I.C clock-in flow ships and writes its own
 * 'shift_start' event per housekeeper, drop this synthesizer and update
 * the dailys / eod rule triggers to match.
 */
async function synthesizeDailyShiftEvents(
  client: SupabaseClient,
  roster: RosterMember[],
): Promise<{ requested: number; inserted: number }> {
  if (roster.length === 0) return { requested: 0, inserted: 0 };

  const today = todayInPropertyTz();
  const rows = roster.map((m) => ({
    source: "internal_daily_fanout",
    // No date in external_id — event_date column carries the date and is
    // part of the dedup constraint. Same staff_id tomorrow → different
    // event_date → fresh row, no conflict.
    external_id: `daily-shift-${m.staff_id}`,
    event_type: "daily_shift",
    event_date: today,
    raw_payload: { staff_id: m.staff_id, staff_name: m.name },
  }));

  // ignoreDuplicates: true relies on inbound_events_dedup
  // (source, external_id, event_type, event_date). Existing rows are
  // silently dropped — no-op on subsequent same-day runs.
  const { data, error } = await client
    .from("inbound_events")
    .upsert(rows, {
      onConflict: "source,external_id,event_type,event_date",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) {
    throw new Error(
      `Failed to synthesize daily_shift events: ${error.message}`,
    );
  }

  return { requested: rows.length, inserted: data?.length ?? 0 };
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

  // Load today's on-shift roster up-front so we can pass it to assignDrafts
  // after the event-fan-out loop. Phase 1 treats every active staff row as
  // on-shift (Clock-In flow per master plan I.C is unbuilt).
  const roster = await loadRoster(client);
  console.log(`[orchestrator] Roster loaded: ${roster.length} member(s).`);
  if (roster.length === 0) {
    console.warn(
      "[orchestrator] Roster is empty — drafts will retain whatever staff_id interpret() seeded (likely null).",
    );
  }

  // Daily fan-out pre-pass — synthesizes one 'daily_shift' inbound_event per
  // active staff row so the dailys.standard + eod.standard rules can
  // generate Da-430 + E-430 cards on the next fetch. Idempotent via the
  // inbound_events_dedup constraint. Live-only — see synthesizer comment.
  if (!dryRun) {
    const synth = await synthesizeDailyShiftEvents(client, roster);
    console.log(
      `[orchestrator] Daily fan-out: requested ${synth.requested} event(s); ${synth.inserted} newly inserted (rest already existed today).`,
    );
  } else {
    console.log("[orchestrator] Daily fan-out: skipped (dry-run mode).");
  }

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

  // Collect drafts across all events into a single batch so the auto-assignment
  // policies layer can balance load across the full roster (master plan IV.A).
  // interpret() already stamps source_event_id on each draft from its source
  // event, so attribution is preserved through the bulk path below.
  const allDrafts: TaskDraft[] = [];
  for (const event of rows) {
    const drafts = dispatch(event);
    allDrafts.push(...drafts);
  }
  console.log(
    `[orchestrator] Generated ${allDrafts.length} draft(s) before assignment.`,
  );

  // Run the auto-assignment policies pass. Pure — returns a new array
  // plus a per-draft pendingAudits side-channel (Day 29 III.D Phase 1).
  // eventDate is the first event's date as a representative.
  const assignmentResult =
    allDrafts.length > 0
      ? assignDrafts(allDrafts, {
          eventDate: rows[0]?.event_date ?? "",
          roster,
        })
      : { drafts: allDrafts, pendingAudits: allDrafts.map(() => []) };
  const assignedDrafts = assignmentResult.drafts;
  const pendingAudits = assignmentResult.pendingAudits;

  if (assignedDrafts.length > 0) {
    const assignedCount = assignedDrafts.filter(
      (d) => d.staff_id !== null,
    ).length;
    const auditTotal = pendingAudits.reduce((acc, list) => acc + list.length, 0);
    console.log(
      `[orchestrator] After assignment: ${assignedCount} of ${assignedDrafts.length} draft(s) have staff_id populated; ${auditTotal} pending audit event(s) collected.`,
    );
  }

  // Persist — single bulk insert into task_drafts (dry-run) or tasks. All-
  // or-nothing: if the insert fails, no events are marked processed and the
  // whole run rolls back from the caller's perspective. Earlier per-event
  // semantics didn't have this property.
  let drafts_inserted = 0;
  let tasks_inserted = 0;
  if (assignedDrafts.length > 0) {
    if (dryRun) {
      const { error: insertErr } = await client
        .from("task_drafts")
        .insert(assignedDrafts);
      if (insertErr) {
        throw new Error(`Failed to insert task_drafts: ${insertErr.message}`);
      }
      drafts_inserted = assignedDrafts.length;
      // Audit events skipped on dry-run — drafts go to task_drafts, not
      // tasks, so there are no real task_ids to attach the audits to.
      // Live runs only.
    } else {
      const taskRows = assignedDrafts.map(toTaskRow);
      const { data: insertedRows, error: insertErr } = await client
        .from("tasks")
        .insert(taskRows)
        .select("id, staff_id, room_number");
      if (insertErr) {
        throw new Error(`Failed to insert tasks: ${insertErr.message}`);
      }
      tasks_inserted = taskRows.length;

      // Day 29 III.D Phase 1: emit deferred audit events for each inserted
      // task. pendingAudits is aligned by index with assignedDrafts; the
      // .insert preserves order so insertedRows is aligned too. Each audit's
      // detail is enriched with the matching task's staff_id + room_number
      // (run.ts knows the post-insert row; the picker only knew the draft).
      // Audit emission is fire-and-forget per writeAuditEvent — failures
      // log a warning and the orchestrator run continues.
      const insertedRowList =
        (insertedRows ?? []) as Array<{
          id: string;
          staff_id: string | null;
          room_number: string | null;
        }>;
      if (insertedRowList.length === pendingAudits.length) {
        let auditCount = 0;
        for (let i = 0; i < insertedRowList.length; i++) {
          const taskRow = insertedRowList[i];
          const audits = pendingAudits[i];
          for (const audit of audits) {
            await writeAuditEvent(client, {
              taskId: taskRow.id,
              userId: null,
              eventType: audit.kind,
              detail: {
                ...audit.detail,
                staff_id: taskRow.staff_id,
                room_number: taskRow.room_number,
              },
            });
            auditCount++;
          }
        }
        if (auditCount > 0) {
          console.log(`[orchestrator] Audit events written: ${auditCount}.`);
        }
      } else if (insertedRowList.length > 0) {
        console.warn(
          `[orchestrator] Audit/insert length mismatch — ${insertedRowList.length} inserted vs. ${pendingAudits.length} audit slots. Audits skipped.`,
        );
      }
    }
  }

  // Reshuffle phase (master plan IV.D / R15 + R09 cross-cutting bumps).
  // Runs over EVERY active task, not just the freshly-inserted ones, so
  // pre-existing tasks get re-tiered when bookings change. Skipped on
  // dry-run since the freshly-inserted drafts live in task_drafts (not
  // tasks) and the reshuffle reads from tasks. On dry-run, pre-existing
  // active tasks would be re-tiered but the new draft batch wouldn't —
  // mixing those signals would confuse the dry-run preview.
  if (!dryRun) {
    const reshuffleResult = await reshuffle(client);
    console.log(
      `[orchestrator] Reshuffle: examined ${reshuffleResult.tasks_examined} active task(s) — ` +
        `tier1=${reshuffleResult.tier1_count}, tier2=${reshuffleResult.tier2_count}, ` +
        `tier3=${reshuffleResult.tier3_count}, untiered=${reshuffleResult.untiered_count}; ` +
        `${reshuffleResult.tasks_updated} updated.`,
    );
  } else {
    console.log("[orchestrator] Reshuffle: skipped (dry-run mode).");
  }

  // Mark every event processed regardless of draft count — events with no
  // matching rules produce 0 drafts but still need to be flipped processed
  // so they don't appear in the next run.
  for (const event of rows) {
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
