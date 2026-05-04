import type { CardType, ChecklistNode } from "../types";
import { singleQueenChecklists } from "./single_queen";
import { withAdditions } from "../with-additions";

// Suite — room 43.
// Per Alternatives doc — Suite has additional living spaces beyond the
// bedroom. Adds Kitchen, Living Room, Dining Table, Sofa & Chair, and a
// Second Bedroom section to the housekeeping_turn tree.

const PLACEHOLDER_DETAIL = "Text to come";

const SUITE_KITCHEN: ChecklistNode = {
  id: "hk_turn.suite.kitchen",
  label: "Kitchen",
  detail: "Clean the suite kitchen.",
  children: [
    { id: "hk_turn.suite.kitchen.surfaces", label: "Surfaces", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL], tools: [PLACEHOLDER_DETAIL] },
    { id: "hk_turn.suite.kitchen.appliances", label: "Appliances", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL] },
    { id: "hk_turn.suite.kitchen.dishes", label: "Dishes & utensils", detail: PLACEHOLDER_DETAIL },
    { id: "hk_turn.suite.kitchen.floor", label: "Floor", detail: PLACEHOLDER_DETAIL, chemicals: [PLACEHOLDER_DETAIL] },
  ],
};

const SUITE_LIVING_ROOM: ChecklistNode = {
  id: "hk_turn.suite.living_room",
  label: "Living room",
  detail: "Clean the suite living room.",
  children: [
    { id: "hk_turn.suite.living_room.surfaces", label: "Surfaces", detail: PLACEHOLDER_DETAIL },
    { id: "hk_turn.suite.living_room.floor", label: "Floor", detail: PLACEHOLDER_DETAIL, tools: [PLACEHOLDER_DETAIL] },
    { id: "hk_turn.suite.living_room.dust", label: "Dust", detail: PLACEHOLDER_DETAIL, tools: [PLACEHOLDER_DETAIL] },
  ],
};

const SUITE_DINING_TABLE: ChecklistNode = {
  id: "hk_turn.suite.dining_table",
  label: "Dining table",
  detail: PLACEHOLDER_DETAIL,
  chemicals: [PLACEHOLDER_DETAIL],
  tools: [PLACEHOLDER_DETAIL],
};

const SUITE_SOFA_CHAIR: ChecklistNode = {
  id: "hk_turn.suite.sofa_chair",
  label: "Sofa & chair",
  detail: PLACEHOLDER_DETAIL,
  tools: [PLACEHOLDER_DETAIL],
};

const SUITE_SECOND_BEDROOM: ChecklistNode = {
  id: "hk_turn.suite.second_bedroom",
  label: "Second bedroom",
  detail: "Full housekeeping turn for the suite's second bedroom.",
  children: [
    { id: "hk_turn.suite.second_bedroom.bed", label: "Bed", detail: PLACEHOLDER_DETAIL },
    { id: "hk_turn.suite.second_bedroom.surfaces", label: "Surfaces", detail: PLACEHOLDER_DETAIL },
    { id: "hk_turn.suite.second_bedroom.floor", label: "Floor", detail: PLACEHOLDER_DETAIL },
    { id: "hk_turn.suite.second_bedroom.linens", label: "Linens", detail: PLACEHOLDER_DETAIL, photo: true },
  ],
};

export const suiteChecklists: Record<CardType, ChecklistNode> = {
  ...singleQueenChecklists,
  housekeeping_turn: withAdditions(singleQueenChecklists.housekeeping_turn, {
    "hk_turn.root": [
      SUITE_KITCHEN,
      SUITE_LIVING_ROOM,
      SUITE_DINING_TABLE,
      SUITE_SOFA_CHAIR,
      SUITE_SECOND_BEDROOM,
    ],
  }),
};
