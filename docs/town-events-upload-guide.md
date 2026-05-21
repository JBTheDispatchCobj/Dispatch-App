# Town Events — Weekly Upload Guide

**What this file is for:** Bryan hands this to a fresh chat. It explains why he uploads
town events, how the data is shaped, and exactly what he wants the assistant to do —
read this, ask him for the events, then hand back ready-to-paste Supabase SQL.

---

## Why I'm uploading this

Dispatch's admin home has a **Daily Brief**, and one tile in it is **Events**. It shows
what's happening in town *today* — local happenings plus holidays — so managers and staff
have context that affects the hotel: busier check-ins, occupancy spikes, and guest
questions like "what's going on this weekend?"

There is **no live events feed**. Google has no clean first-party events API, and paid
scrapers aren't worth the cost or the added dependency. Instead **I curate it myself**: I
load upcoming events into the database ahead of time — usually at the start of each week,
plus holidays and big events that are known months out — and the product automatically
surfaces whatever applies to the current day.

---

## How it works

- A Supabase table, `public.town_events`, holds the schedule.
- The product reads that table and shows today's relevant entry on its own.
- **The weekly job is data only.** I paste a few rows into the Supabase SQL editor and the
  live site reflects them — no code change, no deploy. (Same pattern as the reservations
  import.)
- Holidays are seeded once and repeat every year automatically.

---

## What I want you (the assistant) to do

1. Read this file.
2. **Ask me for the events** I want to load — this week's town happenings, plus any new
   holidays or far-out events. For each one, get: the name, the place (optional), and the
   date or date range.
3. **Give me a ready-to-paste SQL `INSERT`** into `public.town_events`, following the
   schema and rules below. I run it in the Supabase SQL editor myself.

For a normal weekly upload you do **not** need to change any code — just produce the SQL.

---

## The table: `public.town_events`

| Column            | Type              | What it's for                                                              |
|-------------------|-------------------|----------------------------------------------------------------------------|
| `title`           | text (required)   | The event name. This is the headline shown on the tile.                    |
| `venue`           | text (optional)   | The place, e.g. `Balsam`. Shown as the location. Leave out if not relevant. |
| `start_date`      | date (required)   | First day of the event, format `YYYY-MM-DD`.                               |
| `end_date`        | date (optional)   | Last day. For a one-day event, repeat `start_date` or leave it out.        |
| `recurs_annually` | boolean           | `true` only for holidays that repeat every year on the same calendar date. Default `false`. |
| `is_holiday`      | boolean           | `true` to mark it a holiday (vs. a regular town event). Default `false`.   |

There's also an automatic `id` and `created_at` — never set those.

---

## Rules / conventions

- **Dates** are always `YYYY-MM-DD`.
- **One-day event:** put the same date in `start_date` and `end_date` (or leave `end_date` out).
- **Multi-day event:** a `start_date` … `end_date` range.
- **Town events:** leave `recurs_annually` and `is_holiday` at their defaults (false). Just
  title + venue + dates.
- **Holidays that repeat on a fixed date** (New Year's, Valentine's, July 4th, Halloween,
  Veterans Day, Christmas, etc.): set `recurs_annually = true` and `is_holiday = true`. The
  *year* in the date doesn't matter — they match on month + day, so they fire every year.
  **These are already seeded once** (see one-time setup below), so you normally don't
  re-add them.
- **Holidays that move each year** (Memorial Day, Labor Day, Thanksgiving): these can't
  auto-repeat by date, so add them as normal dated entries with `is_holiday = true` for the
  specific year.
- If a day has nothing scheduled, the Events tile simply shows nothing that day. That's fine.

---

## Example

If I say:

> "This week — Dueling Pianos at Balsam on Friday the 22nd, and the Northwoods Art Fair on
> Main Street Saturday and Sunday."

You give me back:

```sql
insert into public.town_events (title, venue, start_date, end_date) values
  ('Dueling Pianos',      'Balsam',      '2026-05-22', '2026-05-22'),  -- one day
  ('Northwoods Art Fair', 'Main Street', '2026-05-23', '2026-05-24');  -- a weekend
```

I paste that into the Supabase SQL editor, run it, done.

---

## One-time setup (must exist before the first upload works)

These two steps happen **once**, not weekly. If a fresh chat is unsure whether they're
done, check: if `getTownEventsToday()` in `lib/admin-brief.ts` still returns a hardcoded
value (e.g. "Dueling Pianos / Balsam") instead of reading `public.town_events`, the wiring
has not been done yet — do it first.

**1. Create the table + seed the fixed-date holidays** (run in Supabase once):

```sql
create table if not exists public.town_events (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  venue           text,
  start_date      date not null,
  end_date        date,
  recurs_annually boolean not null default false,
  is_holiday      boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table public.town_events enable row level security;

drop policy if exists town_events_read on public.town_events;
create policy town_events_read on public.town_events
  for select to authenticated using (true);

-- Fixed-date major holidays. The 2026 year is irrelevant; they match on month+day.
insert into public.town_events (title, start_date, recurs_annually, is_holiday) values
  ('New Year''s Day',    '2026-01-01', true, true),
  ('Valentine''s Day',   '2026-02-14', true, true),
  ('St. Patrick''s Day', '2026-03-17', true, true),
  ('Independence Day',   '2026-07-04', true, true),
  ('Halloween',          '2026-10-31', true, true),
  ('Veterans Day',       '2026-11-11', true, true),
  ('Christmas Eve',      '2026-12-24', true, true),
  ('Christmas Day',      '2026-12-25', true, true),
  ('New Year''s Eve',    '2026-12-31', true, true);
```

**2. Wire the product to read the table** (one-time code change, then push to deploy):
`getTownEventsToday()` in `lib/admin-brief.ts` should accept the Supabase client and query
`public.town_events` for today — a dated row whose range covers the current date, OR an
annual holiday whose month+day matches today (holidays take priority) — and return
`{ headline: title, venue }` or `null`. The call site in `app/admin/page.tsx` passes the
client in. No new dependencies.

---

## Quick checklist for the weekly upload

1. Assistant reads this file.
2. I list the week's events (name, place, dates).
3. Assistant returns one `INSERT` block.
4. I run it in the Supabase SQL editor.
5. The Daily Brief shows each event on its day automatically.
