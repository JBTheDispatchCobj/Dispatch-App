import type { CardType, ChecklistNode, RoomType } from "./types";
import { getRoomType } from "./rooms";
import { singleQueenChecklists } from "./variants/single_queen";
import { doubleChecklists } from "./variants/double";
import { adaDoubleChecklists } from "./variants/ada_double";
import { jacuzziChecklists } from "./variants/jacuzzi";
import { adaJacuzziChecklists } from "./variants/ada_jacuzzi";
import { suiteChecklists } from "./variants/suite";

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

const VARIANT_BY_ROOM_TYPE: Record<RoomType, Record<CardType, ChecklistNode>> = {
  single_queen: singleQueenChecklists,
  double: doubleChecklists,
  ada_double: adaDoubleChecklists,
  jacuzzi: jacuzziChecklists,
  ada_jacuzzi: adaJacuzziChecklists,
  suite: suiteChecklists,
  // Unknown rooms (anything outside the property's room list) fall back to
  // the single-queen base so the drill-down isn't empty.
  unknown: singleQueenChecklists,
};

function getChecklistForRoomType(
  cardType: CardType,
  roomType: RoomType,
): ChecklistNode {
  const variant = VARIANT_BY_ROOM_TYPE[roomType] ?? singleQueenChecklists;
  return variant[cardType] ?? FALLBACK_NODE;
}

export function resolveChecklist(
  cardType: string,
  roomNumber: string | null | undefined,
): ChecklistNode {
  if (!KNOWN_CARD_TYPES.has(cardType)) return FALLBACK_NODE;
  const roomType = getRoomType(roomNumber);
  return getChecklistForRoomType(cardType as CardType, roomType);
}
