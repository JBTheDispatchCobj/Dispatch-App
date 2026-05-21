# ResNexus CSV — interpretation rules for the import chase

> Paste-ready brief for the chat that builds/refines the ResNexus channel-manager CSV import. Authoritative — encodes Bryan's business decisions plus the verified DB schema and the real export shape. If the CSV contradicts a rule, surface it to Bryan; don't guess. Real sample: the uploaded `channel manager - Sheet1.csv` (also `docs/kb/channel-manager-data-shape.csv` for the grid-only earlier sample).

## File shape — ONE sheet, three stacked blocks

ResNexus exports everything into a single CSV. Detect block boundaries by header row, not by fixed line numbers.

**Block A — Reservation details (the authoritative source).** Starts at the row whose first cell is `Res#`. Columns:
`Res#, Guest, Phone, Email, Arrives, Departs, Est. Arrival, Source, Total, Paid, Rooms, Notes, Preferences, Reserved On` (trailing empty columns padding to ~22 fields — ignore them).

**Block B — Room calendar grid.** Starts at the row whose first cell is `Room`. Header: `Room, Yesterday, 21 (T), 22 (F), …, Jun 1, 2, …` — dated columns are day-of-month + weekday letter; month rolls over explicitly (`Jun 1`). `Yesterday` = the day before the first dated column. **This header repeats every ~11 rows** (multi-page export) — de-dupe it.

**Block C — Aggregate + legend.** An `Arriving` header row, then per-day `Adults` / `Children` / `Pets` totals, then `Legend: B = Block, R = Repair, C = Call, X = Future Reservation`.

## Build reservations from Block A (primary path)

Block A alone gives you everything needed to create reservation rows. Use Block B only for occupancy codes and validation (below).

For each Block A row:

- **`Res#`** → base reservation number (no `#` prefix here; the grid adds `#`).
- **`Rooms`** is the room assignment **and** the per-room night range. Format: `"<room label>: <start>-<end>"`, or `"<room label>: <single date>"` for a one-night stay. Watch for stray spaces (`"28 Double : 5/19/2026-5/20/2026"`). A group booking lists **multiple room segments** in this one field — split them.
  - `room_number` = the leading number of the room label (`39 Queen` → `39`, `26 ADA Double Room` → `26`, `43 Two Bedroom Suite with Kitchen` → `43`).
  - The night range END is the **last night**; checkout is the morning after — which equals the row's **`Departs`** value.
- **`Arrives` / `Departs`** are reservation-level M/D/YYYY → `arrival_date` / `departure_date` (departure = checkout day). For multi-room reservations where each room segment has its own range, use the per-room range from `Rooms` for that room's card; `Departs` is the overall checkout.
- **`Est. Arrival`** → `arrival_time` when present (e.g. `5:00 PM`), else null.
- **`Source`** (Phone / Online / Direct Connect) is the booking channel — store in `raw_payload`. Our `reservations.source` is always `'resnexus'` for these imports.
- **`status`**: `arrived` if `arrival_date <= today`, else `confirmed`.

### Guest name cleaning

The `Guest` field carries trailing flags and rate notes that are NOT part of the name:
- `"Tyler Sauer, ***"` → guest_name `Tyler Sauer` (strip the trailing `, ***`).
- `"Tamzid Bin Mafiz, *** ($55 a night)"` → guest_name `Tamzid Bin Mafiz`; keep `$55 a night` as a rate note in `raw_payload`/`special_requests`.
- `"Larry & Marge Calvert"`, `"Lena Gray"` → unchanged (the `***` is inconsistent across rows).
Preserve the original string in `raw_payload`.

### Notes vs Preferences — the priority-note rule

There are **two** columns and both are usually blank: `Notes` and `Preferences`. In the real data the guest request rides in **`Preferences`** (e.g. `"Plain oatmeal"`). Bryan's rule: a guest note is a **priority IF present, but uncommon** — won't appear on most rows, even group blocks. Map `Notes` + `Preferences` → `guest_notes` / `special_requests`; when present, surface prominently on the card; when blank (the norm), do not fabricate or warn.

## Group / block bookings — CRITICAL RULE (Bryan)

A group/wedding block can appear two ways:
1. **One `Res#`, multiple room segments in the `Rooms` field** (or the same `#NNNNN` spanning multiple rows in the grid).
2. **Separate `Res#`s for related guests** in consecutive rooms (real example: 67290/67291/67292, same `process-technology.com` domain, rooms 21/23/25 — already distinct reservations).

Both resolve to **one card per room**. For case 1, do NOT collapse a block into one reservation even though the guest name is identical across rooms. To keep each room uniquely keyed and re-import idempotent, synthesize `external_id` as **`rx-<Res#>-<room>`** — e.g. `rx-67306-39`. Single-room bookings use the same scheme.

## Use Block B (grid) for codes the details table omits

The grid is the only place these non-guest states appear. Map them; they are NOT reservations:
- `X` — Future Reservation beyond the surfaced horizon: occupied for date math, no same-day housekeeping card.
- `B` — Block: room held out of service, no card (real example: room 35 blocked 5/22–5/26).
- `R` — Repair: route to the maintenance lane, not housekeeping.
- `C` — Call: surface to admin, no automatic card.
- `#NNNNN` — confirms a Block A reservation occupies that room/night; use to validate Block A parsing.

## Omissions in the real export (handle gracefully)

- **No per-reservation occupancy.** Block A has no adults/children/pets/party-size columns. Per-card occupant counts are NOT available — leave `party_size`/`adults`/`children`/`pets` at defaults. Only Block C carries headcounts, and only as property-wide daily totals.
- **Consequence: pet-clean / occupancy-driven card variants cannot auto-trigger from this file.** The D-430 pet-clean variant has no `pets` signal here. Flag to Bryan; do not infer pets.
- **Phone/Email frequently partial or blank** (`", 4145312995"`, empty email). Don't treat blanks as errors.
- **`Total`/`Paid`** are billing fields, not needed for cards (`Paid=$0.00` just means not yet paid). Keep in `raw_payload` if useful.

## Occupancy denominator (master plan IV.H Phase B)

- **Total rooms = 21** (fixed denominator).
- Block C `Adults` / `Children` / `Pets` rows are the data source for daily headcount/occupancy; per-day `Adults` feeds the occupancy figure.

## Assignment / split rule

The Rules for Housekeeping doc has a split rule for dividing rooms among staff. **For beta there is exactly one staffer — Angie — so every generated card assigns to her.** Do not build multi-staffer splitting for beta.

## Bucket mapping (per today's date vs the stay)

Set `context.staff_home_bucket` on each generated card:
- today == `arrival_date` → `arrivals`
- today == `departure_date` → `departures` (turnover/clean)
- `arrival_date` < today < `departure_date` → `stayovers`
- `start_of_day`, `dailys`, `eod` are not reservation-derived — leave to their existing seeders.

## Worked example (today = 2026-05-21, the `21 (T)` grid column)

From Block A:
- **Departures today** (Departs = 5/21): 67112 (room 41), 67637 (room 28), 67646 (room 22), 67655 (room 31).
- **Arrivals today** (Arrives = 5/21): 67158 (room 29, Preferences "Plain oatmeal" → priority note on the card).
- **Stayovers** (Arrives < 5/21 < Departs): 67290 (21), 67291 (23), 67292 (25), 67307 (27) — all 5/18→5/22.

Grid cross-check: room 35 `B` on 5/22–5/26 = block, no card; room 29 shows `#67158` starting 5/21 ✓.

## Target tables & idempotency

- `public.reservations` — one row per room per stay. `external_id` = `rx-<Res#>-<room>`, `source='resnexus'`, `status` per above, `guest_name` cleaned, `room_number` leading-number, `arrival_date`, `departure_date`, `arrival_time`, `guest_notes`/`special_requests` from Notes+Preferences, original row in `raw_payload`.
- `public.inbound_events` — optional raw audit queue; `source='resnexus_manual'`, dedup unique on `(source, external_id, event_type, event_date)`.
- **Re-importing the same CSV must not duplicate.** Upsert reservations on `external_id`. A reservation present in a prior import but absent now should be reconciled (mark `cancelled`), not silently left live — confirm reconciliation behavior with Bryan before implementing any delete/cancel path.
