import type { RoomType } from "./types";

// Room number → room type. Expand as the property layout is confirmed.
const ROOMS: Record<string, RoomType> = {
  "1":  "queen",
  "2":  "queen",
  "3":  "queen",
  "4":  "queen",
  "5":  "queen",
  "6":  "queen",
  "7":  "queen",
  "8":  "queen",
  "9":  "queen",
  "10": "queen",
  "11": "queen",
  "12": "queen",
  "13": "queen",
  "14": "queen",
  "15": "queen",
  "16": "queen",
  "17": "queen",
  "18": "queen",
  "19": "queen",
  "20": "queen",
  "21": "queen",
  "22": "queen",
  "23": "queen",
  "24": "queen",
};

export function getRoomType(roomNumber: string | null | undefined): RoomType {
  if (!roomNumber) return "unknown";
  return ROOMS[roomNumber.trim()] ?? "unknown";
}
