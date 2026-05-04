import type { RoomType } from "./types";

// Room number → room class mapping for Jennifer's hotel.
// Source: Jennifer's "Alternatives to the standard lists" doc.
// ADA modifier rooms (26 ada_double, 42 ada_jacuzzi) inherit base content
// and add ADA-specific check items via their own variant file.
const ROOMS: Record<string, RoomType> = {
  // Single Queen — single bed, standard layout
  "21": "single_queen",
  "23": "single_queen",
  "25": "single_queen",
  "27": "single_queen",
  "29": "single_queen",
  "31": "single_queen",
  "33": "single_queen",
  "35": "single_queen",
  "37": "single_queen",
  "39": "single_queen",
  "41": "single_queen",
  // Double — two beds
  "22": "double",
  "24": "double",
  "28": "double",
  "32": "double",
  "34": "double",
  "36": "double",
  // ADA Double — two beds + ADA modifications
  "26": "ada_double",
  // Jacuzzi — carpet, robes/slippers, jacuzzi tub
  "38": "jacuzzi",
  // ADA Jacuzzi — jacuzzi base + ADA modifications
  "42": "ada_jacuzzi",
  // Suite — kitchen, living room, dining table, sofa, second bedroom
  "43": "suite",
};

export function getRoomType(roomNumber: string | null | undefined): RoomType {
  if (!roomNumber) return "unknown";
  return ROOMS[roomNumber.trim()] ?? "unknown";
}
