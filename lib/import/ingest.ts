import { createClient } from "@supabase/supabase-js";
import type { ParsedReservation } from "./parser";

export type IngestResult = {
  inserted: number;
  skipped: number;
  error?: string;
};

function makeServiceRoleClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function ingestReservations(
  events: ParsedReservation[],
): Promise<IngestResult> {
  if (events.length === 0) return { inserted: 0, skipped: 0 };

  const client = makeServiceRoleClient();

  const rows = events.map((ev) => ({
    source: "resnexus_manual",
    external_id: ev.confirmation_number,
    event_type: ev.event_type,
    event_date: ev.event_date,
    raw_payload: ev as Record<string, unknown>,
    processed_at: null as string | null,
  }));

  const { data, error } = await client
    .from("inbound_events")
    .upsert(rows, {
      onConflict: "source,external_id,event_type,event_date",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) {
    return { inserted: 0, skipped: 0, error: error.message };
  }

  const inserted = (data ?? []).length;
  const skipped = events.length - inserted;

  return { inserted, skipped };
}
