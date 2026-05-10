# Maintenance Compose Drawer — Dropdown lists (KB substrate)

*Authored Day 53 chase #1 from Jennifer's "Maintenance Dropdowns" upload. Closes the **Q21** Open-Jennifer-question content gap (lists were missing from rules-table xlsx per Day 52 chase #5 mining). Pairs with **`lib/maintenance.ts`** taxonomy exports (already shipped Day 33). Cascade-vs-flat behavior is the narrowed remaining open question — see Day 53 chase ask Q4.*

---

## The three lists

Jennifer's authoring is **three independent axes** (Location / Item / Type), not a Location → Item cascade tree. Each axis is one-pick. Location and Item carry their own internal 2-level structure (parenthetical sub-options); Type is single-level flat.

### Axis 1 — Location (12 parents + sub-locations)

| Parent location | Sub-locations |
|---|---|
| Rooms | 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 35, 36, 37, 38, 39, 41, 42, 43 |
| Lobby | — |
| Supply Room | — |
| Laundry Room | — |
| Breakfast Room | — |
| Hallways | 20s hall, 30s hall, 40s hall, Laundry hall, Breakfast Hall |
| Front Office | — |
| Public Restroom | — |
| Outside | Front, East, West, Back, Garage |
| Entry | — |
| Breakfast Area | — |
| Apartment | — |
| Back Office | — |

### Axis 2 — Item (11 parents + sub-items)

| Parent item | Sub-items |
|---|---|
| Furniture | Tables, Chairs, Dressers, Nightstands, Mattress, Bed, Sofa, Rollaway |
| Appliances | TV, Roku, Microwave, AC, Iron, Refrigerator, Freezer |
| Plumbing | Sink, Drains, Tub/Shower, Jacuzzi |
| Walls | Paint, Drywall, Trim, Doors, Door locks/handles, Hanging Fixtures, Towel Bars, Windows |
| Electrical | Outlets, Switches, Lights, Cables/Cords, Fans |
| Decor | Mirrors, Art, Plants, Signs |
| Linens | Sheets, Towels, Curtains, Pillows, Blankets, Shower Curtain |
| Tools | Cart, Vacuum, Mop, Spray bottles, Tools, etc. |
| Floors | Carpet, Mats, Tile, Laminate |
| Built-In | Countertops, Cabinets, Closet fixtures |
| Small Items | Luggage rack, Soap dish, Cup tray, Trash cans, Ironing board, Tissue box, Alarm, Hangers, Cups, Ice bucket, etc. |

### Axis 3 — Type (10 options, flat)

Broken · Chipped · Missing · Hole · Loose · Faded · Scratched · Cut · Stained · Other

---

## Reconciliation against `lib/maintenance.ts` (Day 33 ship)

Current code exports flat lists. Differences between Jennifer's authoring and what's currently shipped:

**`MAINTENANCE_LOCATIONS` (21 flat values shipped):**

```
Rooms · Lobby · Supply Room · Laundry Room · Breakfast Room ·
Hallway - 20s · Hallway - 30s · Hallway - 40s · Hallway - Laundry · Hallway - Breakfast ·
Front Office · Public Restroom ·
Outside - Front · Outside - East · Outside - West · Outside - Back · Outside - Garage ·
Entry · Breakfast Area · Apartment · Back Office
```

vs Jennifer's 12-parent structure:
- Code pre-flattens "Hallways" into 5 separate values (`Hallway - 20s` etc.) — Jennifer keeps Hallways as parent.
- Code pre-flattens "Outside" into 5 separate values (`Outside - Front` etc.) — Jennifer keeps Outside as parent.
- Code keeps "Rooms" as single value — Jennifer enumerates 21 room numbers as sub-locations under Rooms.

Net: code's 21 flat matches the same operational coverage as Jennifer's 12 + sub-locations EXCEPT for the missing per-room enumeration. A staff person reporting an issue in room 23 currently picks "Rooms" with no second-step picker — they'd have to enter the room number in the body field. Per-room enumeration is the meaningful behavior gap, not the flat-vs-tree shape.

**`MAINTENANCE_ITEMS` (11 flat values shipped):** Match Jennifer's 11 parents 1-for-1. No second-step picker — staff can't pick "Mattress" under "Furniture"; they pick "Furniture" and put "Mattress" in the body. Same gap as Rooms.

**`MAINTENANCE_TYPES` (10 flat values shipped):** Match Jennifer's 10 1-for-1. No gap — Type is flat in both.

**`MAINTENANCE_SEVERITIES` (3 values shipped):** Low / Normal / High — not in Jennifer's doc, separate axis added Day 33 for III.B Phase 5 sort-boost. No reconciliation needed.

---

## Cascade-vs-flat behavior — open question (Day 53 chase ask Q4)

Jennifer's authoring is structurally three-axis-with-sub-options-inline. Two implementation interpretations:

1. **Flat 3-axis** (current Day 33 ship): pick any Location, any Item, any Type. Sub-options inline as parenthetical hints in the dropdown labels OR as a second-step picker per axis where present. Allows nonsense combos ("Lobby + Mattress") but trusts staff. Cheaper to wire.
2. **Cascade — Location filters Item** (and optionally Item filters Type): picking Lobby hides Mattress because Lobby has no beds. Catches data-entry mistakes. Requires authoring a Location → allowed-Item map (and optionally Item → allowed-Type map) Jennifer hasn't provided. Same Day 53 chase ask Q4 closes both directions.

**Recommended pre-Beta wire:** stay flat 3-axis. Add per-axis 2-step picker (top-level → sub-option) in a follow-up chase if/when Jennifer asks for it. Cascade-tree authoring is a separate post-beta task even after Q4 lands.

---

## What Day 53 ship covers vs. what stays open

**Day 53 covers:**
- Jennifer's three lists committed as canonical KB substrate (closes Q21 content gap surfaced Day 52 chase #5).
- Reconciliation map vs `lib/maintenance.ts` documented for any future chase that reconciles code with KB.
- Flat-vs-cascade question narrowed and routed to Jennifer ask Q4.

**Day 53 does NOT cover (still pending):**
- `lib/maintenance.ts` reconciliation — code stays at Day 33 flat-21-locations / 11-items / 10-types. Operationally adequate for beta per master plan III.B framing. Reconciliation chase = post-beta.
- 2-step picker UI in compose drawer — post-beta.
- Cascade filter map (if Jennifer chooses cascade) — pending Q4 + separate authoring chase.
