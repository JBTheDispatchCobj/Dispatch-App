import type { CardType, ChecklistNode } from "../types";
import { singleQueenChecklists } from "./single_queen";
import { withAdditions } from "../with-additions";

// Jacuzzi rooms: 38.
// Per Alternatives doc — adds carpet (in Clean), jacuzzi tub (in Clean), and
// robes & slippers (in Restock) to the single-queen base.

const PLACEHOLDER_DETAIL = "Text to come";

const JACUZZI_CARPET: ChecklistNode = {
  id: "hk_turn.clean.carpet",
  label: "Carpet (Jacuzzi)",
  detail: PLACEHOLDER_DETAIL,
  tools: [PLACEHOLDER_DETAIL],
};

const JACUZZI_TUB: ChecklistNode = {
  id: "hk_turn.clean.jacuzzi_tub",
  label: "Jacuzzi tub",
  detail: PLACEHOLDER_DETAIL,
  chemicals: [PLACEHOLDER_DETAIL],
  tools: [PLACEHOLDER_DETAIL],
};

const JACUZZI_ROBES: ChecklistNode = {
  id: "hk_turn.restock.robes",
  label: "Robes & slippers",
  detail: PLACEHOLDER_DETAIL,
};

export const jacuzziChecklists: Record<CardType, ChecklistNode> = {
  ...singleQueenChecklists,
  housekeeping_turn: withAdditions(singleQueenChecklists.housekeeping_turn, {
    "hk_turn.clean": [JACUZZI_CARPET, JACUZZI_TUB],
    "hk_turn.restock": [JACUZZI_ROBES],
  }),
};
