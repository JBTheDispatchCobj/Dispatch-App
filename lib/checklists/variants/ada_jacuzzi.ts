import type { CardType, ChecklistNode } from "../types";
import { jacuzziChecklists } from "./jacuzzi";
import { withAdditions } from "../with-additions";

// ADA Jacuzzi — room 42.
// Inherits Jacuzzi (carpet / tub / robes) and adds the ADA check section.
// Jennifer's Alternatives doc lists 'Check' under Jacuzzi ADA — content pending.

const ADA_CHECK: ChecklistNode = {
  id: "hk_turn.ada_check",
  label: "ADA Check",
  detail:
    "ADA-specific room features check. Jennifer to specify items (grab bars, jacuzzi-tub transfer, ADA clearances, etc.).",
  children: [],
};

export const adaJacuzziChecklists: Record<CardType, ChecklistNode> = {
  ...jacuzziChecklists,
  housekeeping_turn: withAdditions(jacuzziChecklists.housekeeping_turn, {
    "hk_turn.root": [ADA_CHECK],
  }),
};
