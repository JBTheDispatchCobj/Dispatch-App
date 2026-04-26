/* ------------------------------------------------------------------ */
/* Shared admin staff roster — used by admin home + roster page       */
/* ------------------------------------------------------------------ */

export type StaffMetric = { label: string; value: number };

export type StaffMember = {
  slug: string;
  firstName: string;
  lastName: string;
  roleStrip: string;
  shiftLabel: string;
  metrics: [StaffMetric, StaffMetric, StaffMetric];
  off: boolean;
  avatarSrc: string;
};

export const AVATAR_COURTNEY =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'><defs><linearGradient id='g' x1='0.15' y1='0' x2='0.85' y2='1'><stop offset='0' stop-color='%23F5D8B8'/><stop offset='1' stop-color='%23D9A87C'/></linearGradient></defs><rect width='80' height='80' fill='url(%23g)'/><circle cx='40' cy='30' r='13' fill='%237A4A2E'/><ellipse cx='40' cy='74' rx='26' ry='20' fill='%237A4A2E'/></svg>";

export const AVATAR_LIZZIE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'><defs><linearGradient id='g' x1='0.15' y1='0' x2='0.85' y2='1'><stop offset='0' stop-color='%23CDE0E4'/><stop offset='1' stop-color='%237FA3A8'/></linearGradient></defs><rect width='80' height='80' fill='url(%23g)'/><circle cx='40' cy='30' r='13' fill='%232C4F54'/><ellipse cx='40' cy='74' rx='26' ry='20' fill='%232C4F54'/></svg>";

export const AVATAR_ANGIE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'><defs><linearGradient id='g' x1='0.15' y1='0' x2='0.85' y2='1'><stop offset='0' stop-color='%23F5C8A8'/><stop offset='1' stop-color='%23C68B64'/></linearGradient></defs><rect width='80' height='80' fill='url(%23g)'/><circle cx='40' cy='30' r='13' fill='%235C3320'/><ellipse cx='40' cy='74' rx='26' ry='20' fill='%235C3320'/></svg>";

export const AVATAR_MARK =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'><defs><linearGradient id='g' x1='0.15' y1='0' x2='0.85' y2='1'><stop offset='0' stop-color='%23DAE0C2'/><stop offset='1' stop-color='%239BA67C'/></linearGradient></defs><rect width='80' height='80' fill='url(%23g)'/><circle cx='40' cy='30' r='13' fill='%233C4728'/><ellipse cx='40' cy='74' rx='26' ry='20' fill='%233C4728'/></svg>";

export const STAFF: StaffMember[] = [
  {
    slug: "courtney-manager",
    firstName: "Courtney",
    lastName: "Manager",
    roleStrip: "MANAGER",
    shiftLabel: "On call · til 10pm",
    metrics: [
      { label: "Rooms", value: 6 },
      { label: "Open", value: 2 },
      { label: "Done", value: 9 },
    ],
    off: false,
    avatarSrc: AVATAR_COURTNEY,
  },
  {
    slug: "lizzie-larson",
    firstName: "Lizzie",
    lastName: "Larson",
    roleStrip: "OPS LEAD",
    shiftLabel: "Front of house",
    metrics: [
      { label: "Rooms", value: 4 },
      { label: "Open", value: 1 },
      { label: "Done", value: 7 },
    ],
    off: false,
    avatarSrc: AVATAR_LIZZIE,
  },
  {
    slug: "angie-lopez",
    firstName: "Angie",
    lastName: "Lopez",
    roleStrip: "HOUSEKEEPING",
    shiftLabel: "Shift 7–3",
    metrics: [
      { label: "Rooms", value: 8 },
      { label: "Open", value: 3 },
      { label: "Done", value: 5 },
    ],
    off: false,
    avatarSrc: AVATAR_ANGIE,
  },
  {
    slug: "mark-parry",
    firstName: "Mark",
    lastName: "Parry",
    roleStrip: "GC / MAINT",
    shiftLabel: "Off-site · on call",
    metrics: [
      { label: "Jobs", value: 3 },
      { label: "Open", value: 2 },
      { label: "Done", value: 1 },
    ],
    off: true,
    avatarSrc: AVATAR_MARK,
  },
];
