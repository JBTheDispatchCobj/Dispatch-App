-- docs/supabase/beta_reset_2026-05-21.sql
--
-- Beta data setup before the Forrest Inn handoff — ONE idempotent script.
-- Run top-to-bottom in the Supabase SQL editor; re-running lands the same
-- state. Self-contained + order-safe (Angie's staff row is created before any
-- card references it). Reservations are handled by reservations_import_*.sql.
--
-- Real roster:
--   Admin   — Jennifer  jennifer@auricworks.dev
--   Admin   — Courtney  forrestinnmotel@gmail.com
--   Staff   — Angie     forrestinnlogins@gmail.com  (single beta housekeeper)
--   Master admin — Bryan  bryan@auricworks.dev
--   Master staff — Bryan  bjstauder@gmail.com  (tests the staff view as Angie)
--
-- NOTE: section 4 re-seeds the 12 import cards (source='pms'); it leaves any
-- hand-made cards (source<>'pms') alone. If you also want to clear leftover
-- demo cards, uncomment the marked line.

-- =========================================================================
-- 1. Angie staff row (the single beta housekeeper). Fixed id so cards + the
--    real Angie login (forrestinnlogins) and the bjstauder test both point here.
-- =========================================================================
insert into public.staff (id, name, role, status)
values ('a0c1e000-0000-4000-8000-000000000001', 'Angie', 'Housekeeping', 'active')
on conflict (id) do update
  set name = excluded.name, role = excluded.role, status = excluded.status;

-- =========================================================================
-- 2. Remove the 4 demo staff (profiles/tasks FKs are on-delete-set-null).
-- =========================================================================
delete from public.staff where id in (
  '097ede2c-a094-4c38-9ade-af081ff64c37',  -- Courtney Manager (demo)
  '4ba795ef-1590-48c6-b77c-6dc90a6388b2',  -- Angie Lopez (demo)
  'f836552c-75a9-4800-939a-82929fa09f68',  -- Mark Parry (demo)
  '8fb2f515-4df3-4835-b2e9-e01f2eff993d'   -- Lizzie Larson (demo)
);

-- =========================================================================
-- 3. Bryan's two master accounts (these auth.users already exist).
-- =========================================================================
update public.profiles set role = 'admin'
  where id = '380edc3d-ab42-4aed-aff7-940d9d6f8c2a';   -- bryan@auricworks.dev
update public.profiles set role = 'staff', staff_id = 'a0c1e000-0000-4000-8000-000000000001'
  where id = '0ea88f3c-f25b-4147-b2ad-a7e113bd7cc1';   -- bjstauder@gmail.com (tests as Angie)

-- =========================================================================
-- 4. Today's 12 staff cards from the channel-manager import, assigned to Angie.
--    Idempotent: clears prior import cards (source='pms') then re-inserts.
--    is_staff_report=false + staff_id set → auto 7-item checklist per card.
-- =========================================================================
delete from public.tasks where source = 'pms';
-- Reservation-derived cards, generated FROM the channel-manager reservations,
-- one per room in today's buckets, titled "Room <n> - <guest>". Future-proof:
-- re-run after any reservations import and titles/rooms follow the data.
insert into public.tasks
  (title, card_type, status, priority, source, room_number,
   assignee_name, staff_id, is_staff_report, created_by_user_id, context)
-- Departures (turnover) — Departs = today
select 'Room ' || r.room_number || ' - ' || r.guest_name, 'housekeeping_turn', 'open', 'medium', 'pms',
       r.room_number, 'Angie', 'a0c1e000-0000-4000-8000-000000000001', false,
       '380edc3d-ab42-4aed-aff7-940d9d6f8c2a', '{"staff_home_bucket":"departures"}'::jsonb
  from public.reservations r
  where r.external_id like 'rx-%' and r.status in ('confirmed','arrived')
    and r.departure_date = current_date
union all
-- Arrivals (prep) — Arrives = today
select 'Room ' || r.room_number || ' - ' || r.guest_name, 'arrival', 'open', 'medium', 'pms',
       r.room_number, 'Angie', 'a0c1e000-0000-4000-8000-000000000001', false,
       '380edc3d-ab42-4aed-aff7-940d9d6f8c2a', '{"staff_home_bucket":"arrivals"}'::jsonb
  from public.reservations r
  where r.external_id like 'rx-%' and r.status in ('confirmed','arrived')
    and r.arrival_date = current_date
union all
-- Stayovers (service) — arrival < today < departure
select 'Room ' || r.room_number || ' - ' || r.guest_name, 'stayover', 'open', 'medium', 'pms',
       r.room_number, 'Angie', 'a0c1e000-0000-4000-8000-000000000001', false,
       '380edc3d-ab42-4aed-aff7-940d9d6f8c2a', '{"staff_home_bucket":"stayovers"}'::jsonb
  from public.reservations r
  where r.external_id like 'rx-%' and r.status in ('confirmed','arrived')
    and r.arrival_date < current_date and r.departure_date > current_date;

-- Fixed standing daily cards (NOT reservation-derived): SOD, Dailys, EOD.
-- These don't change day-to-day except by manual override. card_type 'dailys'
-- does NOT auto-seed a checklist, so the Dailys items are inserted explicitly.
insert into public.tasks
  (title, card_type, status, priority, source, assignee_name, staff_id, is_staff_report, created_by_user_id, context)
values
  ('Start of Day','start_of_day','open','medium','pms','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"start_of_day"}'::jsonb),
  ('Wrap Shift','eod','open','medium','pms','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"eod"}'::jsonb);

insert into public.tasks
  (id, title, card_type, status, priority, source, assignee_name, staff_id, is_staff_report, created_by_user_id, context)
values
  ('da11ca5e-0000-4000-8000-000000000001','Property Round','dailys','open','medium','pms','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"dailys"}'::jsonb);

insert into public.task_checklist_items (task_id, title, sort_order, done) values
  ('da11ca5e-0000-4000-8000-000000000001','Restock Cart',     1, false),
  ('da11ca5e-0000-4000-8000-000000000001','Public Restrooms', 2, false),
  ('da11ca5e-0000-4000-8000-000000000001','Dust Pictures',    3, false),
  ('da11ca5e-0000-4000-8000-000000000001','Trash Pickup',     4, false),
  ('da11ca5e-0000-4000-8000-000000000001','Wash Windows',     5, false),
  ('da11ca5e-0000-4000-8000-000000000001','Vacuum Hallways',  6, false);

-- =========================================================================
-- 5. Jennifer / Courtney / Angie — RUN/RE-RUN AFTER each has logged in once
--    (login creates their auth.users + a default 'manager' profile). Safe to
--    run now (0 rows until they exist).
-- =========================================================================
update public.profiles set role = 'admin'
  where id = (select id from auth.users where email = 'jennifer@auricworks.dev');
update public.profiles set role = 'admin'
  where id = (select id from auth.users where email = 'forrestinnmotel@gmail.com');
update public.profiles set role = 'staff', staff_id = 'a0c1e000-0000-4000-8000-000000000001'
  where id = (select id from auth.users where email = 'forrestinnlogins@gmail.com');  -- Angie

-- Verification:
-- select context->>'staff_home_bucket' as bucket, count(*) from public.tasks group by 1 order by 1;
--   -- expect arrivals 1 / departures 4 / stayovers 7
-- select id, name, role, status from public.staff;            -- expect just Angie
