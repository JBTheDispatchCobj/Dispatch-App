"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { fetchProfile } from "@/lib/profile";
import { parsePaste, type SkippedRow } from "./parser";
import { ingestReservations } from "./ingest";
import { PROPERTY_TIMEZONE } from "../dispatch-config";

export type ImportActionResult =
  | {
      ok: true;
      inserted: number;
      skippedDupes: number;
      parseSkipped: SkippedRow[];
    }
  | {
      ok: false;
      message: string;
      parseSkipped?: SkippedRow[];
    };

export async function runImport(
  pasteText: string,
): Promise<ImportActionResult> {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  const cookieStore = await cookies();
  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        toSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });

  // Session is resolved from the sb-*-auth-token cookie — no client argument
  const {
    data: { user },
    error: authErr,
  } = await client.auth.getUser();
  if (authErr || !user) {
    return { ok: false, message: "Authentication required." };
  }

  // Profile fetch uses the same cookie-backed client (RLS applies)
  const profileResult = await fetchProfile(client, user);
  if (!profileResult.ok) {
    return { ok: false, message: profileResult.failure.message };
  }
  if (profileResult.profile.role !== "admin") {
    return { ok: false, message: "Admin access required." };
  }

  // "today" resolved server-side in hotel local time (PROPERTY_TIMEZONE).
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: PROPERTY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const { events, skipped: parseSkipped } = parsePaste(pasteText, today);

  if (events.length === 0) {
    return { ok: true, inserted: 0, skippedDupes: 0, parseSkipped };
  }

  const ingestResult = await ingestReservations(events);
  if (ingestResult.error) {
    return { ok: false, message: ingestResult.error, parseSkipped };
  }

  return {
    ok: true,
    inserted: ingestResult.inserted,
    skippedDupes: ingestResult.skipped,
    parseSkipped,
  };
}
