# Daily Reservation Batch — Morning Upload Guide

**What this file is for:** Bryan hands this to a fresh chat each morning. It explains why he
uploads the channel-manager CSV, how the data is shaped, and exactly what he wants the
assistant to do — read this, read the day's CSV, then hand back one ready-to-paste Supabase
SQL batch that reconciles the day's reservations and rebuilds the housekeeping cards.

The assistant does **not** need to re-derive any logic. There is a worked, verified example
at `docs/supabase/daily_batch_2026-05-22.sql` — mirror its structure exactly and just swap in
the new day's data.

---

## Why I'm uploading this

Dispatch turns reservations into the housekeeping cards Angie works each day. The room data
lives in ResNexus (the channel manager). There is **no live sync yet** — that's post-beta. So
each morning I export the channel manager to a CSV and upload it, and the assistant turns it
into SQL that I paste into Supabase. That refreshes the day's cards before Angie clocks in.

The export is a fresh photo of the books every morning. Bookings change overnight — guests
arrive, check out, extend, cancel, get re-roomed. The job is to **reconcile**: recognize what
changed, keep what stayed, and clear from Angie's phone what no longer applies.

---

## How it works

- A Supabase table, `public.reservations`, holds one row per room per stay, keyed on
  `external_id = 'rx-<Res#>-<room>'`. Re-uploading **updates rows in place** — it never
  duplicates — because of that key.
- The housekeeping cards live in `public.tasks` with `source = 'pms'`. They are **rebuilt from
  scratch each morning** from whatever reservations apply to today. (Angie's home shows *all*
  her cards with no date filter, so yesterday's must be cleared or they pile up.)
- **The morning job is data only.** I paste one SQL batch into the Supabase SQL editor; the
  live site reflects it with no code change and no deploy. Same pattern as town events.
- Run it **once each morning, before Angie clocks in.** The SQL is date-relative (it keys off
  the database's `current_date`), so run it on the day the export is for.

---

## What I want you (the assistant) to do

1. Read this file.
2. **Read the day's channel-manager CSV** I've uploaded (or ask me for it).
3. **Give me one ready-to-paste SQL batch** with the four sections below, following the rules
   exactly. I run it in the Supabase SQL editor myself.
4. Give me the one-line **verification query** and tell me the expected bucket counts.

For a normal morning you do **not** change any code — just produce the SQL.

---

## How to read the CSV

The export has two blocks. **Only the first block matters.**

**Block A — reservation rows** (the top of the file). Columns:
`Res#, Guest, Phone, Email, Arrives, Departs, Est. Arrival, Source, Total, Paid, Rooms, Notes, Preferences, Reserved On`.
Each row is one reservation. This is the authoritative source.

**Block B — the grid** (starts at the row beginning `Room,Yesterday,22 (F),...`). This is a
visual occupancy chart with codes `B = Block, R = Repair, C = Call, X = Future Reservation`,
plus arriving-guest totals at the bottom. **Ignore all of Block B.** Blocks, repairs, and the
`X`/`B` grid marks are not reservations and never become cards.

### Pulling fields from a Block A row

- **`external_id`** = `rx-<Res#>-<room>`. The room number is the leading integer in the
  **Rooms** column. Example: Res# `67342`, Rooms `26 ADA Double Room: ...` → `rx-67342-26`.
- **`guest_name`** = the **Guest** column, cleaned:
  - Strip a trailing privacy mask `, ***` → `Tyler Sauer, ***` becomes `Tyler Sauer`.
  - Strip a parenthetical rate note `($55 a night)` → `Tamzid Bin Mafiz, *** ($55 a night)`
    becomes `Tamzid Bin Mafiz`, and the note goes into `special_requests` (see below).
  - Keep the raw original in `raw_payload.guest_raw`.
- **`room_number`** = the leading integer from **Rooms** (text, e.g. `'26'`).
- **`arrival_date` / `departure_date`** = the **Arrives** / **Departs** columns
  (`M/D/YYYY` → `YYYY-MM-DD`). These are authoritative. **Do not** use the date range inside
  the Rooms column — that shows room-nights (last night occupied), not the checkout day.
- **`arrival_time`** = the **Est. Arrival** column if present (`5:00 PM` → `time '17:00'`),
  else `null`.
- **`special_requests`** (a text array): the rate note if any (`array['$55 a night']`),
  otherwise the **Preferences** column if it reads like a request (`Plain oatmeal`), else
  `null::text[]`.
- **`guest_notes`** = **Preferences** or **Notes** free text when it's a note rather than a
  list (e.g. `Plain oatmeal`, or `Do not charge if cancel - injured`), else `null`.
- **`raw_payload`** (jsonb): keep the original signal —
  `{"res": "<Res#>", "channel": "<Source>", "guest_raw": "<original Guest cell>",
  "rooms": "<original Rooms cell>", "total": "<Total>"}`, plus `"rate_note"`, `"preferences"`,
  or `"note"` keys when they apply. **The `rooms` string is load-bearing** — the card builder
  extracts the room type from it with a regex, so copy it verbatim from the CSV.

---

## The four SQL sections (mirror `daily_batch_2026-05-22.sql`)

### Section 1 — Upsert today's reservations
One `insert ... select from (values ...) on conflict (external_id) do update set ...`, one
VALUES row per Block A reservation. `status` is computed:
`case when arrival_date <= current_date then 'arrived' else 'confirmed' end`. The `on conflict`
updates every column, so changed bookings (new dates, room moves) correct themselves in place.

### Section 2 — Retire reservations that dropped out of the file
Any `rx-%` row that is **not** in today's file gets retired: kept on the backend for history,
but moved out of card-generation.

```sql
update public.reservations
set status = case when departure_date < current_date then 'departed' else 'cancelled' end
where external_id like 'rx-%'
  and status in ('confirmed', 'arrived')
  and external_id not in ( <-- every external_id from Section 1, comma-separated --> );
```

The keep-list is exactly the set of `external_id`s you built in Section 1. Reservations still
in the file keep their `external_id` and stay active — that covers Bryan's "same guest who
should still be pushed" case (including a guest who extends: the upsert just updates their
dates and they re-bucket on their own). Only genuinely-absent bookings are retired —
`departed` if they had already checked out, `cancelled` if they were still in the future.

### Section 3 — Rebuild today's cards (source='pms')
First delete the channel-manager cards, **sparing any with an open maintenance issue** so
Angie's reports never vanish, and never touching manually-added cards (`source='manual'`):

```sql
delete from public.tasks
where source = 'pms'
  and id not in (select task_id from public.maintenance_issues where resolved_at is null);
```

Then insert the day's cards with three date-relative `select`s `union all`'d together:

| Bucket       | card_type           | context bucket | Which reservations                              |
|--------------|---------------------|----------------|--------------------------------------------------|
| Departures   | `housekeeping_turn` | `departures`   | `departure_date = current_date`                  |
| Arrivals     | `arrival`           | `arrivals`     | `arrival_date = current_date`                    |
| Stayovers    | `stayover`          | `stayovers`    | `arrival_date < current_date < departure_date`   |

Each filters on `external_id like 'rx-%' and status in ('confirmed','arrived')`. Title is
`'Room ' || room_number || ' - ' || guest_name`. The `context` jsonb carries the bucket plus a
guest block (`outgoing_guest` / `incoming_guest` / `current_guest`) with `name`, a `room_type`
pulled from the rooms string via `substring(r.raw_payload->>'rooms' from '^[0-9]+\s+(.+?)\s*:')`,
and bucket extras (`clean_type:'Standard'` for departures; `checkin_time` for arrivals;
`night_n` = `current_date - arrival_date` and `total_nights` for stayovers). Copy these blocks
verbatim from the example file.

### Section 4 — Standing daily cards
Re-seed the three fixed cards with `on conflict (id) do nothing` so they're idempotent even if
one was spared in Section 3, then seed the Property Round checklist with a `not exists` guard.
These IDs are fixed and must not change:

- Start of Day — `5da17000-0000-4000-8000-000000000001` (`start_of_day`)
- Wrap Shift — `e0d17000-0000-4000-8000-000000000001` (`eod`)
- Property Round — `da11ca5e-0000-4000-8000-000000000001` (`dailys`) + 6 checklist items:
  Restock Cart, Public Restrooms, Dust Pictures, Trash Pickup, Wash Windows, Vacuum Hallways.

---

## Fixed constants (always use these exact values)

- Housekeeper (Angie) `staff_id` / `assignee_name`: `a0c1e000-0000-4000-8000-000000000001` / `'Angie'`
- `created_by_user_id` (Bryan, admin): `380edc3d-ab42-4aed-aff7-940d9d6f8c2a`
- All generated cards: `source = 'pms'`, `priority = 'medium'`, `status = 'open'`,
  `is_staff_report = false` (so the per-card checklist auto-seeds).

---

## Worked mini-example

If the CSV had just these two Block A rows on the morning of 2026-05-22:

```
Res#,Guest,...,Arrives,Departs,Est. Arrival,...,Rooms,...,Preferences,...
67342,"Albert Bengtson",...,5/22/2026,5/25/2026,,...,26 ADA Double Room: 5/22/2026-5/24/2026,...,,...
67158,"Cheryl Moskal",...,5/21/2026,5/26/2026,,...,29 Queen: 5/21/2026-5/25/2026,...,Plain oatmeal,...
```

Section 1 produces two upsert rows (`rx-67342-26` arriving today → an **arrival** card;
`rx-67158-29` arrived 5/21, departs 5/26 → a **stayover** card at night 1 of 5). Section 2's
keep-list is `('rx-67342-26','rx-67158-29')`, so every other `rx-%` row in the table gets
retired. Sections 3-4 rebuild the cards. Verification would show arrivals 1, stayovers 1, plus
the three standing cards.

---

## Verification (always include this)

After I run the batch, I paste:

```sql
select context->>'staff_home_bucket' as bucket, count(*)
from public.tasks where source='pms' group by 1 order by 1;
```

Tell me the expected counts: departures = rows departing today, arrivals = rows arriving
today, stayovers = rows mid-stay, and start_of_day / dailys / eod = 1 each. Then I open
Angie's staff view and confirm her buckets match.

---

## Safety notes (so a fresh chat doesn't get nervous)

- **Manual cards are safe.** The delete only touches `source='pms'`. Anything an admin or
  manager added by hand (`source='manual'`) is never deleted.
- **Open maintenance reports are safe.** The delete spares any card that still has an
  unresolved maintenance issue, so a reported problem never disappears mid-rebuild.
- **Deep Clean is safe.** Its history table detaches (`on delete set null`) rather than
  deleting, so rebuilding cards never resets the monthly rotation. Departure cards read the
  rotation live; nothing about it belongs in this batch.
- **Known beta trade-off:** the rebuild does not preserve the click-by-click history of
  *completed* cards, and in the rare case a room turns over (checkout + check-in same day)
  while carrying an open maintenance issue you may briefly see a stray completed card. Both
  are acceptable for beta and clear on the next morning's run.

---

## Quick checklist for the morning upload

1. Assistant reads this file.
2. I upload the day's channel-manager CSV.
3. Assistant returns one SQL batch (Sections 1-4), mirroring `daily_batch_2026-05-22.sql`.
4. I run it in the Supabase SQL editor **before Angie clocks in**.
5. Assistant gives the verification query + expected counts; I confirm on Angie's phone.
