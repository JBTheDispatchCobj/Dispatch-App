-- docs/supabase/daily_batch_2026-05-24.sql
--
-- DAILY MORNING BATCH for the 2026-05-24 export. Idempotent; mirrors
-- daily_batch_2026-05-22.sql.
--
-- *** DO NOT RUN THIS ON 2026-05-25 OR LATER. ***
-- Sections 3-4 are date-relative (they key off the database's current_date),
-- so this only produces correct cards if run ON 2026-05-24. Kept here for the
-- record / the docs/supabase series. To bring the live site current today, run
-- daily_batch_2026-05-25.sql instead — its Section 1 already contains every row
-- from this file plus that day's changes.
--
-- Notes on this day's data:
--   * 25 Block A rows. One of them, Res# 67676 "Rolled Over From Yesterday"
--     ($0.00, note "blocked as Angie is out"), is a multi-room BLOCK, not a
--     guest stay — it is intentionally EXCLUDED (blocks never become cards).
--   * Dina Bukachek books two rooms (22 + 24) so she is split into two
--     reservation rows. Net: 24 guest rows - 1 block + 1 extra Dina room = 25
--     room-rows below.
--   * Kathie Boniface and Sandra Rohwer each extended checkout to 5/25 (were
--     5/24 on the 5-22 export); the upsert corrects their dates in place.

-- =========================================================================
-- 1. Upsert the day's reservations (5-24 channel-manager export — 25 room-rows).
--    Keyed on external_id = 'rx-<Res#>-<room>'. status computed from current_date.
-- =========================================================================
insert into public.reservations
  (external_id, source, status, guest_name, room_number,
   arrival_date, departure_date, arrival_time,
   guest_notes, special_requests, raw_payload)
select
  v.external_id,
  'resnexus',
  case when v.arrival_date <= current_date then 'arrived' else 'confirmed' end,
  v.guest_name,
  v.room_number,
  v.arrival_date,
  v.departure_date,
  v.arrival_time,
  v.guest_notes,
  v.special_requests,
  v.raw_payload
from (values
  ('rx-67158-29', 'Cheryl Moskal',         '29', date '2026-05-21', date '2026-05-26', null::time,   'has 8 extra hangers',                                                    array['Plain oatmeal'],'{"res":"67158","channel":"Phone","guest_raw":"Cheryl Moskal","rooms":"29 Queen: 5/21/2026-5/25/2026","total":"$635.40","note":"has 8 extra hangers","preferences":"Plain oatmeal"}'::jsonb),
  ('rx-67343-22', 'Kathie Boniface',       '22', date '2026-05-22', date '2026-05-25', null::time,   null::text,                                                               null::text[],          '{"res":"67343","channel":"Phone","guest_raw":"Kathie Boniface","rooms":"22 Double: 5/22/2026-5/24/2026","total":"$403.33"}'::jsonb),
  ('rx-67687-41', 'Sandra Rohwer',         '41', date '2026-05-22', date '2026-05-25', null::time,   'here visiting sister in hospital she isnt doing best may extend',         null::text[],          '{"res":"67687","channel":"Phone","guest_raw":"Sandra Rohwer","rooms":"41 Queen: 5/22/2026-5/24/2026","total":"$447.54","note":"here visiting sister in hospital she isnt doing best may extend"}'::jsonb),
  ('rx-67342-26', 'Albert Bengtson',       '26', date '2026-05-22', date '2026-05-25', null::time,   null::text,                                                               null::text[],          '{"res":"67342","channel":"Phone","guest_raw":"Albert Bengtson","rooms":"26 ADA Double Room: 5/22/2026-5/24/2026","total":"$331.50"}'::jsonb),
  ('rx-67684-39', 'Doug & Karen Chickering','39', date '2026-05-23', date '2026-05-24', time '17:00', null::text,                                                              null::text[],          '{"res":"67684","channel":"Online","guest_raw":"Doug & Karen Chickering","rooms":"39 Queen: 5/23/2026","total":"$182.33"}'::jsonb),
  ('rx-67669-36', 'Daryl Stuhr',           '36', date '2026-05-23', date '2026-05-24', time '17:00', null::text,                                                               null::text[],          '{"res":"67669","channel":"Direct Connect","guest_raw":"Daryl Stuhr","rooms":"36 Double: 5/23/2026","total":"$160.23"}'::jsonb),
  ('rx-66972-27', 'Larry & Marge Calvert', '27', date '2026-05-24', date '2026-05-28', null::time,   null::text,                                                               null::text[],          '{"res":"66972","channel":"Phone","guest_raw":"Larry & Marge Calvert","rooms":"27 Queen: 5/24/2026-5/27/2026","total":"$596.72"}'::jsonb),
  ('rx-67172-28', 'Mary Hauschen',         '28', date '2026-05-24', date '2026-05-25', time '14:00', null::text,                                                               null::text[],          '{"res":"67172","channel":"Online","guest_raw":"Mary Hauschen","rooms":"28 Double : 5/24/2026","total":"$221.00"}'::jsonb),
  ('rx-67609-39', 'Tyler Sauer',           '39', date '2026-05-25', date '2026-05-29', null::time,   null::text,                                                               null::text[],          '{"res":"67609","channel":"Phone","guest_raw":"Tyler Sauer, ***","rooms":"39 Queen: 5/25/2026-5/28/2026","total":"$287.32"}'::jsonb),
  ('rx-67308-38', 'Tamzid Bin Mafiz',      '38', date '2026-05-25', date '2026-05-28', null::time,   null::text,                                                               array['$55 a night'],  '{"res":"67308","channel":"Phone","guest_raw":"Tamzid Bin Mafiz, *** ($55 a night)","rooms":"38 King Jacuzzi Room: 5/25/2026-5/27/2026","total":"$182.31","rate_note":"$55 a night"}'::jsonb),
  ('rx-67610-37', 'Jerrett Haag',          '37', date '2026-05-25', date '2026-05-29', null::time,   null::text,                                                               null::text[],          '{"res":"67610","channel":"Phone","guest_raw":"Jerrett Haag, ***","rooms":"37 Queen: 5/25/2026-5/28/2026","total":"$287.32"}'::jsonb),
  ('rx-67690-43', 'Michael Gray',          '43', date '2026-05-26', date '2026-05-29', null::time,   null::text,                                                               null::text[],          '{"res":"67690","channel":"Phone","guest_raw":"Michael Gray, ***","rooms":"43 Two Bedroom Suite with Kitchen: 5/26/2026-5/28/2026","total":"$646.44"}'::jsonb),
  ('rx-67599-33', 'Travis Campton',        '33', date '2026-05-26', date '2026-05-29', null::time,   null::text,                                                               null::text[],          '{"res":"67599","channel":"Phone","guest_raw":"Travis Campton, ***","rooms":"33 Queen: 5/26/2026-5/28/2026","total":"$215.49"}'::jsonb),
  ('rx-67670-42', 'Lisa Glaus',            '42', date '2026-05-26', date '2026-05-29', null::time,   null::text,                                                               null::text[],          '{"res":"67670","channel":"Phone","guest_raw":"Lisa Glaus","rooms":"42 ADA King Jacuzzi Room: 5/26/2026-5/28/2026","total":"$497.25"}'::jsonb),
  ('rx-66850-41', 'Susan Meade',           '41', date '2026-05-27', date '2026-05-31', null::time,   null::text,                                                               null::text[],          '{"res":"66850","channel":"Phone","guest_raw":"Susan Meade","rooms":"41 Queen: 5/27/2026-5/30/2026","total":"$517.14"}'::jsonb),
  ('rx-66851-36', 'Shari Koelzer',         '36', date '2026-05-28', date '2026-05-31', null::time,   'Do not charge if cancel - injured',                                      null::text[],          '{"res":"66851","channel":"Phone","guest_raw":"Shari Koelzer","rooms":"36 Double: 5/28/2026-5/30/2026","total":"$448.63","note":"Do not charge if cancel - injured"}'::jsonb),
  ('rx-67602-32', 'Robert Hall',           '32', date '2026-05-28', date '2026-05-29', time '17:00', null::text,                                                               null::text[],          '{"res":"67602","channel":"Direct Connect","guest_raw":"Robert Hall","rooms":"32 Double: 5/28/2026","total":"$149.18"}'::jsonb),
  ('rx-67668-28', 'Timothy Johnson',       '28', date '2026-05-29', date '2026-05-30', null::time,   null::text,                                                               null::text[],          '{"res":"67668","channel":"Phone","guest_raw":"Timothy Johnson","rooms":"28 Double : 5/29/2026","total":"$160.23"}'::jsonb),
  ('rx-67650-23', 'Mike Then',             '23', date '2026-05-29', date '2026-05-30', null::time,   null::text,                                                               null::text[],          '{"res":"67650","channel":"Phone","guest_raw":"Mike Then","rooms":"23 Queen: 5/29/2026","total":"$149.18"}'::jsonb),
  ('rx-66607-21', 'Matt Nelles',           '21', date '2026-05-29', date '2026-05-31', time '19:00', null::text,                                                               null::text[],          '{"res":"66607","channel":"Direct Connect","guest_raw":"Matt Nelles","rooms":"21 Queen: 5/29/2026-5/30/2026","total":"$298.36"}'::jsonb),
  ('rx-66710-38', 'Troy Benson',           '38', date '2026-05-30', date '2026-05-31', null::time,   null::text,                                                               null::text[],          '{"res":"66710","channel":"Phone","guest_raw":"Troy Benson","rooms":"38 King Jacuzzi Room: 5/30/2026","total":"$182.33"}'::jsonb),
  ('rx-67660-27', 'Rebecca Peters',        '27', date '2026-05-30', date '2026-06-01', null::time,   null::text,                                                               null::text[],          '{"res":"67660","channel":"Phone","guest_raw":"Rebecca Peters","rooms":"27 Queen: 5/30/2026-5/31/2026","total":"$298.36"}'::jsonb),
  ('rx-66939-39', 'Fong Ly',               '39', date '2026-05-30', date '2026-06-01', null::time,   'Booking.com #5813493213; arrival approx 20:00-21:00; breakfast included', null::text[],          '{"res":"66939","channel":"Direct Connect","guest_raw":"Fong Ly","rooms":"39 Queen: 5/30/2026-5/31/2026","total":"$343.10"}'::jsonb),
  ('rx-67057-22', 'Dina Bukachek',         '22', date '2026-05-30', date '2026-05-31', null::time,   null::text,                                                               array['Military Discount'],'{"res":"67057","channel":"Phone","guest_raw":"Dina Bukachek (Military Discount)","rooms":"22 Double: 5/30/2026","total":"$288.40","rate_note":"Military Discount"}'::jsonb),
  ('rx-67057-24', 'Dina Bukachek',         '24', date '2026-05-30', date '2026-05-31', null::time,   null::text,                                                               array['Military Discount'],'{"res":"67057","channel":"Phone","guest_raw":"Dina Bukachek (Military Discount)","rooms":"24 Double: 5/30/2026","total":"$288.40","rate_note":"Military Discount"}'::jsonb)
) as v(external_id, guest_name, room_number, arrival_date, departure_date,
       arrival_time, guest_notes, special_requests, raw_payload)
on conflict (external_id) do update set
  source           = excluded.source,
  status           = excluded.status,
  guest_name       = excluded.guest_name,
  room_number      = excluded.room_number,
  arrival_date     = excluded.arrival_date,
  departure_date   = excluded.departure_date,
  arrival_time     = excluded.arrival_time,
  guest_notes      = excluded.guest_notes,
  special_requests = excluded.special_requests,
  raw_payload      = excluded.raw_payload;

-- =========================================================================
-- 2. Retire reservations that DROPPED OUT of the day's file.
-- =========================================================================
update public.reservations
set status = case when departure_date < current_date then 'departed' else 'cancelled' end
where external_id like 'rx-%'
  and status in ('confirmed', 'arrived')
  and external_id not in (
    'rx-67158-29','rx-67343-22','rx-67687-41','rx-67342-26','rx-67684-39',
    'rx-67669-36','rx-66972-27','rx-67172-28','rx-67609-39','rx-67308-38',
    'rx-67610-37','rx-67690-43','rx-67599-33','rx-67670-42','rx-66850-41',
    'rx-66851-36','rx-67602-32','rx-67668-28','rx-67650-23','rx-66607-21',
    'rx-66710-38','rx-67660-27','rx-66939-39','rx-67057-22','rx-67057-24'
  );

-- =========================================================================
-- 3. Rebuild the day's channel-manager cards (source='pms') for current_date.
--    SPARE any card that still has an open maintenance issue. Manual cards
--    (source='manual') are never touched.
-- =========================================================================
delete from public.tasks
where source = 'pms'
  and id not in (
    select task_id from public.maintenance_issues where resolved_at is null
  );

insert into public.tasks
  (title, card_type, status, priority, source, room_number,
   assignee_name, staff_id, is_staff_report, created_by_user_id, context)
-- Departures (turnover) — Departs = today
select 'Room ' || r.room_number || ' - ' || r.guest_name, 'housekeeping_turn', 'open', 'medium', 'pms',
       r.room_number, 'Angie', 'a0c1e000-0000-4000-8000-000000000001'::uuid, false,
       '380edc3d-ab42-4aed-aff7-940d9d6f8c2a'::uuid,
       jsonb_build_object(
         'staff_home_bucket', 'departures',
         'outgoing_guest', jsonb_build_object(
           'name',       r.guest_name,
           'room_type',  substring(r.raw_payload->>'rooms' from '^[0-9]+\s+(.+?)\s*:'),
           'clean_type', 'Standard'
         )
       )
  from public.reservations r
  where r.external_id like 'rx-%' and r.status in ('confirmed','arrived')
    and r.departure_date = current_date
union all
-- Arrivals (prep) — Arrives = today
select 'Room ' || r.room_number || ' - ' || r.guest_name, 'arrival', 'open', 'medium', 'pms',
       r.room_number, 'Angie', 'a0c1e000-0000-4000-8000-000000000001'::uuid, false,
       '380edc3d-ab42-4aed-aff7-940d9d6f8c2a'::uuid,
       jsonb_build_object(
         'staff_home_bucket', 'arrivals',
         'incoming_guest', jsonb_build_object(
           'name',         r.guest_name,
           'room_type',    substring(r.raw_payload->>'rooms' from '^[0-9]+\s+(.+?)\s*:'),
           'checkin_time', to_char(r.arrival_time, 'HH24:MI')
         )
       )
  from public.reservations r
  where r.external_id like 'rx-%' and r.status in ('confirmed','arrived')
    and r.arrival_date = current_date
union all
-- Stayovers (service) — arrival < today < departure
select 'Room ' || r.room_number || ' - ' || r.guest_name, 'stayover', 'open', 'medium', 'pms',
       r.room_number, 'Angie', 'a0c1e000-0000-4000-8000-000000000001'::uuid, false,
       '380edc3d-ab42-4aed-aff7-940d9d6f8c2a'::uuid,
       jsonb_build_object(
         'staff_home_bucket', 'stayovers',
         'current_guest', jsonb_build_object(
           'name',         r.guest_name,
           'room_type',    substring(r.raw_payload->>'rooms' from '^[0-9]+\s+(.+?)\s*:'),
           'night_n',      (current_date - r.arrival_date),
           'total_nights', greatest(1, r.departure_date - r.arrival_date)
         )
       )
  from public.reservations r
  where r.external_id like 'rx-%' and r.status in ('confirmed','arrived')
    and r.arrival_date < current_date and r.departure_date > current_date;

-- =========================================================================
-- 4. Standing daily cards (NOT reservation-derived): SOD, Dailys, EOD.
-- =========================================================================
insert into public.tasks
  (id, title, card_type, status, priority, source, assignee_name, staff_id, is_staff_report, created_by_user_id, context)
values
  ('5da17000-0000-4000-8000-000000000001','Start of Day','start_of_day','open','medium','pms','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"start_of_day"}'::jsonb),
  ('e0d17000-0000-4000-8000-000000000001','Wrap Shift','eod','open','medium','pms','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"eod"}'::jsonb)
on conflict (id) do nothing;

insert into public.tasks
  (id, title, card_type, status, priority, source, assignee_name, staff_id, is_staff_report, created_by_user_id, context)
values
  ('da11ca5e-0000-4000-8000-000000000001','Property Round','dailys','open','medium','pms','Angie','a0c1e000-0000-4000-8000-000000000001',false,'380edc3d-ab42-4aed-aff7-940d9d6f8c2a','{"staff_home_bucket":"dailys"}'::jsonb)
on conflict (id) do nothing;

insert into public.task_checklist_items (task_id, title, sort_order, done)
select 'da11ca5e-0000-4000-8000-000000000001', v.title, v.sort_order, false
from (values
  ('Restock Cart',     1),
  ('Public Restrooms', 2),
  ('Dust Pictures',    3),
  ('Trash Pickup',     4),
  ('Wash Windows',     5),
  ('Vacuum Hallways',  6)
) as v(title, sort_order)
where not exists (
  select 1 from public.task_checklist_items
  where task_id = 'da11ca5e-0000-4000-8000-000000000001'
);

-- =========================================================================
-- Verification (only meaningful if this was run ON 2026-05-24):
-- =========================================================================
-- select context->>'staff_home_bucket' as bucket, count(*)
--   from public.tasks where source='pms' group by 1 order by 1;
--   -- expect: arrivals 2, departures 2, stayovers 4, dailys 1, eod 1, start_of_day 1
--   --   departures: rooms 39 Doug & Karen Chickering, 36 Daryl Stuhr
--   --   arrivals:   rooms 27 Larry & Marge Calvert, 28 Mary Hauschen
--   --   stayovers:  29 Cheryl (night 3 of 5), 22 Kathie (night 2 of 3),
--   --               41 Sandra (night 2 of 3), 26 Albert (night 2 of 3)
