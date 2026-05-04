import type { CardType, ChecklistNode } from "../types";
import { singleQueenChecklists } from "./single_queen";
import { withAdditions } from "../with-additions";

// Double rooms: 22, 24, 28, 32, 34, 36.
// Per Alternatives doc — adds 'Second bed' to housekeeping_turn bed section.

const SECOND_BED: ChecklistNode = {
  id: "hk_turn.bed.second_bed",
  label: "Second bed",
  detail:
    "Strip, change, and remake the second queen bed (Double rooms have two beds).",
};

export const doubleChecklists: Record<CardType, ChecklistNode> = {
  ...singleQueenChecklists,
  housekeeping_turn: withAdditions(singleQueenChecklists.housekeeping_turn, {
    "hk_turn.bed": [SECOND_BED],
  }),
};
