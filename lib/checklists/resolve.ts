import type { CardType, ChecklistNode, RoomType } from "./types";
import { getRoomType } from "./rooms";
import { queenChecklists } from "./variants/queen";

const KNOWN_CARD_TYPES = new Set<string>([
  "housekeeping_turn",
  "arrival",
  "stayover",
  "dailys",
  "eod",
  "maintenance",
  "general_report",
]);

const FALLBACK_NODE: ChecklistNode = {
  id: "fallback",
  label: "Checklist not yet defined",
  detail: "No checklist is available for this card type.",
  children: [],
};

function getChecklistForRoomType(
  cardType: CardType,
  roomType: RoomType,
): ChecklistNode {
  if (roomType === "queen" || roomType === "unknown") {
    return queenChecklists[cardType] ?? FALLBACK_NODE;
  }
  // Post-beta: add king/suite/cabin variants. Fall back to queen for now.
  return queenChecklists[cardType] ?? FALLBACK_NODE;
}

export function resolveChecklist(
  cardType: string,
  roomNumber: string | null | undefined,
): ChecklistNode {
  if (!KNOWN_CARD_TYPES.has(cardType)) return FALLBACK_NODE;
  const roomType = getRoomType(roomNumber);
  return getChecklistForRoomType(cardType as CardType, roomType);
}
