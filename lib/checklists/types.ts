export type CardType =
  | "housekeeping_turn"
  | "arrival"
  | "stayover"
  | "dailys"
  | "eod"
  | "maintenance"
  | "general_report";

export type RoomType =
  | "single_queen"
  | "double"
  | "ada_double"
  | "jacuzzi"
  | "ada_jacuzzi"
  | "suite"
  | "unknown";

export type ChecklistNode = {
  id: string;
  label: string;
  detail?: string;
  chemicals?: string[];
  tools?: string[];
  photo?: boolean;
  children?: ChecklistNode[];
};
