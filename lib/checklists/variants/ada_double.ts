import type { CardType, ChecklistNode } from "../types";
import { doubleChecklists } from "./double";
import { withAdditions } from "../with-additions";

// ADA Double — room 26.
// Inherits Double (second bed) and adds an ADA-specific check section.
// Jennifer's Alternatives doc lists 'Check' under ADA Double — content pending.

const ADA_CHECK: ChecklistNode = {
  id: "hk_turn.ada_check",
  label: "ADA Check",
  detail:
    "ADA-specific room features check. Jennifer to specify items (grab bars, clearances, ADA shower, ADA toilet, etc.).",
  children: [],
};

export const adaDoubleChecklists: Record<CardType, ChecklistNode> = {
  ...doubleChecklists,
  housekeeping_turn: withAdditions(doubleChecklists.housekeeping_turn, {
    "hk_turn.root": [ADA_CHECK],
  }),
};
