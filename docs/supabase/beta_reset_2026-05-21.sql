-- docs/supabase/beta_reset_2026-05-21.sql
--
-- Beta data reset before the Forrest Inn handoff. Clears demo cards + the demo
-- staff directory and wires the real roster. Run in the Supabase SQL editor.
--
-- DESTRUCTIVE: wipes ALL task cards (all current cards are demo) and the 4 demo
-- staff rows. Reservations are NOT touched (handled by the channel-manager
-- import). One-time setup — re-running re-wipes tasks.
--
-- Real roster:
--   Admin   — Jennifer  jennifer@auricworks.dev
--   Admin   — Courtney  forrestinnmotel@gmail.com
--   Staff   — Angie     forrestinnlogins@gmail.com  (single beta housekeeper)
--   Master admin — Bryan  bryan@auricworks.dev
--   Master staff — Bryan  bjstauder@gmail.com  (tests the staff view as Angie)

-- =========================================================================
-- 1. Wipe all demo task cards (cascades to checklist items, events, notes,
--    maintenance issues; deep_clean_history.source_task_id is set null).
-- =========================================================================
delete from public.tasks;

-- =========================================================================
-- 2. Reset the staff directory — drop the 4 demo members, add real Angie.
--    (profiles.staff_id / tasks.staff_id FKs are on-delete-set-null, so this
--    is safe; the bjstauder repoint below restores the staff link.)
-- =========================================================================
delete from public.staff
where id in (
  '097ede2c-a094-4c38-9ade-af081ff64c37',  -- Courtney Manager (demo)
  '4ba795ef-1590-48c6-b77c-6dc90a6388b2',  -- Angie Lopez (demo)
  'f836552c-75a9-4800-939a-82929fa09f68',  -- Mark Parry (demo)
  '8fb2f515-4df3-4835-b2e9-e01f2eff993d'   -- Lizzie Larson (demo)
);

insert into public.staff (id, name, role, status)
values ('a0c1e000-0000-4000-8000-000000000001', 'Angie', 'Housekeeping', 'active')
on conflict (id) do update
  set name = excluded.name, role = excluded.role, status = excluded.status;

-- =========================================================================
-- 3. Bryan's two master accounts (these auth.users already exist).
-- =========================================================================
-- Master admin
update public.profiles
  set role = 'admin'
  where id = '380edc3d-ab42-4aed-aff7-940d9d6f8c2a';   -- bryan@auricworks.dev

-- Master staff — tests the staff view as Angie (repoint off the deleted Lizzie row)
update public.profiles
  set role = 'staff', staff_id = 'a0c1e000-0000-4000-8000-000000000001'
  where id = '0ea88f3c-f25b-4147-b2ad-a7e113bd7cc1';   -- bjstauder@gmail.com

-- =========================================================================
-- 4. Jennifer / Courtney / Angie — RUN THIS PART *AFTER* each has logged in
--    once (first magic-link login creates their auth.users + a default
--    'manager' profile; these updates set the correct role/staff_id).
--    Safe to run now too — it just affects 0 rows until they exist.
-- =========================================================================
update public.profiles set role = 'admin'
  where id = (select id from auth.users where email = 'jennifer@auricworks.dev');

update public.profiles set role = 'admin'
  where id = (select id from auth.users where email = 'forrestinnmotel@gmail.com');

update public.profiles set role = 'staff', staff_id = 'a0c1e000-0000-4000-8000-000000000001'
  where id = (select id from auth.users where email = 'forrestinnlogins@gmail.com');  -- Angie

-- Verification:
-- select count(*) from public.tasks;                                  -- expect 0
-- select id, name, role, status from public.staff;                    -- expect just Angie
-- select u.email, p.role, p.staff_id from public.profiles p
--   join auth.users u on u.id = p.id order by u.email;                -- roles correct
