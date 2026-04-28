export type CardType =
  | "housekeeping_turn"
  | "arrival"
  | "stayover"
  | "dailys"
  | "eod"
  | "maintenance"
  | "general_report";

export type RoomType = "queen" | "king" | "suite" | "cabin" | "unknown";

export type ChecklistNode = {
  id: string;
  label: string;
  detail?: string;
  chemicals?: string[];
  tools?: string[];
  photo?: boolean;
  children?: ChecklistNode[];
};
