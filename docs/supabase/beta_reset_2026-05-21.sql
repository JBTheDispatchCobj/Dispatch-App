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
-- delete from public.tasks where source <> 'pms';   -- (optional) also clear leftover demo cards
delete from public.tasks where source = 'pms';
insert into public.tasks
  (title, card_type, status, priority, source, room_number,
   assignee_name, staff_id, is_staff_report, created_by_user_id, context)
values
  ('Turnover Room 41','housekeeping_turn','open','medium','pms','41','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"departures"}'::jsonb),
  ('Turnover Room 28','housekeeping_turn','open','medium','pms','28','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"departures"}'::jsonb),
  ('Turnover Room 22','housekeeping_turn','open','medium','pms','22','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"departures"}'::jsonb),
  ('Turnover Room 31','housekeeping_turn','open','medium','pms','31','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"departures"}'::jsonb),
  ('Prep Room 29','arrival','open','medium','pms','29','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"arrivals"}'::jsonb),
  ('Service Room 39','stayover','open','medium','pms','39','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"stayovers"}'::jsonb),
  ('Service Room 33','stayover','open','medium','pms','33','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"stayovers"}'::jsonb),
  ('Service Room 21','stayover','open','medium','pms','21','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"stayovers"}'::jsonb),
  ('Service Room 23','stayover','open','medium','pms','23','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"stayovers"}'::jsonb),
  ('Service Room 25','stayover','open','medium','pms','25','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"stayovers"}'::jsonb),
  ('Service Room 27','stayover','open','medium','pms','27','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"stayovers"}'::jsonb),
  ('Service Room 37','stayover','open','medium','pms','37','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"stayovers"}'::jsonb);

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
