// lib/notification-archive.ts
//
// Backs the Notification Center "View all" route (/admin/notifications) — the
// complete, searchable archive of the building's flow. Pulls the full activity
// feed (notes + maintenance + task-events, all severities) and categorizes each
// item into Housekeeping / Admin / Maintenance by the related task's card_type
// (same 3-way split /admin/tasks uses), so the screen mirrors the Tasks lanes.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getActivityFeed, type ActivityFeedItem } from "./activity-feed";

export type ArchiveLane = "housekeeping" | "admin" | "maintenance";

export type ArchiveItem = {
  id: string;
  badge: string;
  title: string;
  meta: string;
  dot: "green" | "amber" | "red";
};

export type NotificationArchive = Record<ArchiveLane, ArchiveItem[]>;

// Mirrors app/admin/tasks/page.tsx card_type → lane split.
const HOUSEKEEPING_CARD_TYPES = new Set(["housekeeping_turn", "arrival", "stayover"]);

function laneForCardType(cardType: string | null): ArchiveLane {
  if (cardType === "maintenance") return "maintenance";
  if (cardType && HOUSEKEEPING_CARD_TYPES.has(cardType)) return "housekeeping";
  return "admin"; // dailys / eod / start_of_day / generic / null / unknown
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const min = Math.floor((Date.now() - then) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "yesterday";
  if (day < 7) return `${day} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function kindLabel(it: ActivityFeedItem): string {
  if (it.kind === "note") return it.note_type || "Note";
  if (it.kind === "maintenance_issue") return "Maintenance";
  return "Activity";
}

function dotForSeverity(s: ActivityFeedItem["severity"]): ArchiveItem["dot"] {
  if (s === "critical") return "red";
  if (s === "warn") return "amber";
  return "green";
}

function badgeFor(it: ActivityFeedItem): string {
  if (it.related_room) return it.related_room;
  if (it.kind === "note") return "NOTE";
  if (it.kind === "maintenance_issue") return "MNT";
  return "LOG";
}

export async function getNotificationArchive(
  client: SupabaseClient,
): Promise<NotificationArchive> {
  const archive: NotificationArchive = {
    housekeeping: [],
    admin: [],
    maintenance: [],
  };

  let items: ActivityFeedItem[] = [];
  try {
    items = await getActivityFeed(client, { limit: 200 });
  } catch {
    return archive;
  }

  for (const it of items) {
    const lane = laneForCardType(it.related_card_type);
    archive[lane].push({
      id: it.id,
      badge: badgeFor(it),
      title: it.message,
      meta: `${kindLabel(it)} · ${timeAgo(it.created_at)}`,
      dot: dotForSeverity(it.severity),
    });
  }

  return archive;
}
