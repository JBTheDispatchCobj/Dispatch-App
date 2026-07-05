-- docs/supabase/daily_batch_2026-05-25.sql
--
-- DAILY MORNING BATCH — run top-to-bottom in the Supabase SQL editor, once each
-- morning BEFORE Angie clocks in. Idempotent: re-running lands the same state.
-- *** THIS IS THE BATCH TO RUN ON 2026-05-25 (today). ***
--
-- What it does (the reservation reconciliation, mirrors daily_batch_2026-05-22.sql):
--   1. Upserts today's channel-manager reservations (the 5-25 export). 26 Block A
--      guest rows; Dina Bukachek books two rooms (22 + 24) so she is split into
--      two reservation rows => 27 room-rows total. Changed/extended bookings
--      (Kathie + Sandra both pushed their checkout to 5/25) update in place.
--   2. Retires any reservation that DROPPED OUT of today's file — keeps the guest
--      row on the backend but flips status so it can no longer push a card.
--      departed if it already checked out (e.g. Doug Chickering, Daryl Stuhr who
--      left 5/24), cancelled if it was a future booking that disappeared.
--   3. Rebuilds the channel-manager cards for TODAY from current_date.
--      SPARES any card with an OPEN maintenance issue; never touches manual cards.
--   4. Resets the standing SOD / Dailys / EOD cards fresh for the day.
--
-- SAFE-DELETE NOTE: task_events / notes / comments cascade-delete with a card,
-- so the daily rebuild does NOT preserve the execution history of *completed*
-- cards (acceptable for beta). It DOES preserve open maintenance issues by
-- sparing their card. Deep Clean history is on-delete-set-null, so the monthly
-- rotation is never reset by a rebuild.

-- =========================================================================
-- 1. Upsert today's reservations (5-25 channel-manager export — 27 room-rows).
--    Keyed on external_id = 'rx-<Res#>-<room>'. status computed from today.
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
  ('rx-67342-26', 'Albert Bengtson',       '26', date '2026-05-22', date '2026-05-25', null::time,   null::text,                                                               null::text[],          '{"res":"67342","channel":"Phone","guest_raw":"Albert Bengtson","rooms":"26 ADA Double Room: 5/22/2026-5/24/2026","total":"$221.00"}'::jsonb),
  ('rx-67712-23', 'Dave Newton',           '23', date '2026-05-24', date '2026-05-25', null::time,   null::text,                                                               null::text[],          '{"res":"67712","channel":"Phone","guest_raw":"Dave Newton","rooms":"23 Queen: 5/24/2026","total":"$149.18"}'::jsonb),
  ('rx-66972-27', 'Larry & Marge Calvert', '27', date '2026-05-24', date '2026-05-28', null::time,   null::text,                                                               null::text[],          '{"res":"66972","channel":"Phone","guest_raw":"Larry & Marge Calvert","rooms":"27 Queen: 5/24/2026-5/27/2026","total":"$596.72"}'::jsonb),
  ('rx-67714-34', 'Sarah Mohr',            '34', date '2026-05-24', date '2026-05-25', null::time,   null::text,                                                               null::text[],          '{"res":"67714","channel":"Phone","guest_raw":"Sarah Mohr","rooms":"34 Double: 5/24/2026","total":"$160.23"}'::jsonb),
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
  ('rx-67660-27', 'Rebecca Peters',        '27', date '2026-05-30', date '2026-06-01', null::time,   null::text,                                                               null::text[],          '{"res":"67660","channel":"Phone","guest_raw":"Rebecca Peters","rooms":"27 Queen: 5/30/2026-5/31/2026","total":"$298.36"}'::jsonb),
  ('rx-66710-38', 'Troy Benson',           '38', date '2026-05-30', date '2026-05-31', null::time,   null::text,                                                               null::text[],          '{"res":"66710","channel":"Phone","guest_raw":"Troy Benson","rooms":"38 King Jacuzzi Room: 5/30/2026","total":"$182.33"}'::jsonb),
  ('rx-66939-39', 'Fong Ly',               '39', date '2026-05-30', date '2026-06-01', null::time,   'Booking.com #5813493213; arrival approx 20:00-21:00; breakfast included', null::text[],          '{"res":"66939","channel":"Direct Connect","guest_raw":"Fong Ly","rooms":"39 Queen: 5/30/2026-5/31/2026","total":"$343.10"}'::jsonb),
  ('rx-67057-22', 'Dina Bukachek',         '22', date '2026-05-30', date '2026-05-31', null::time,   null::text,                                                               array['Military Discount'],'{"res":"67057","channel":"Phone","guest_raw":"Dina Bukachek (Military Discount)","rooms":"22 Double: 5/30/2026","total":"$288.40","rate_note":"Military Discount"}'::jsonb),
  ('rx-67057-24', 'Dina Bukachek',         '24', date '2026-05-30', date '2026-05-31', null::time,   null::text,                                                               array['Military Discount'],'{"res":"67057","channel":"Phone","guest_raw":"Dina Bukachek (Military Discount)","rooms":"24 Double: 5/30/2026","total":"$288.40","rate_note":"Military Discount"}'::jsonb),
  ('rx-66853-38', 'Douglas Schulte',       '38', date '2026-05-31', date '2026-06-06', null::time,   null::text,                                                               null::text[],          '{"res":"66853","channel":"Phone","guest_raw":"Douglas Schulte","rooms":"38 King Jacuzzi Room: 5/31/2026-6/5/2026","total":"$663.00"}'::jsonb),
  ('rx-67309-41', 'Tamzid Bin Mafiz',      '41', date '2026-05-31', date '2026-06-04', null::time,   null::text,                                                               array['$55 a night'],  '{"res":"67309","channel":"Phone","guest_raw":"Tamzid Bin Mafiz, *** ($55 a night)","rooms":"41 Queen: 5/31/2026-6/3/2026","total":"$563.57","rate_note":"$55 a night"}'::jsonb)
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
-- 2. Retire reservations that DROPPED OUT of today's file. Keeps the guest
--    row (history) but moves status out of (confirmed, arrived) so it can no
--    longer generate a card. departed = it already checked out; cancelled =
--    it was still future and disappeared. Rows still present in the file are
--    in the list below and are left active (the "same guest" case).
-- =========================================================================
update public.reservations
set status = case when departure_date < current_date then 'departed' else 'cancelled' end
where external_id like 'rx-%'
  and status in ('confirmed', 'arrived')
  and external_id not in (
    'rx-67158-29','rx-67343-22','rx-67687-41','rx-67342-26','rx-67712-23',
    'rx-66972-27','rx-67714-34','rx-67172-28','rx-67609-39','rx-67308-38',
    'rx-67610-37','rx-67690-43','rx-67599-33','rx-67670-42','rx-66850-41',
    'rx-66851-36','rx-67602-32','rx-67668-28','rx-67650-23','rx-66607-21',
    'rx-67660-27','rx-66710-38','rx-66939-39','rx-67057-22','rx-67057-24',
    'rx-66853-38','rx-67309-41'
  );

-- =========================================================================
-- 3. Rebuild today's channel-manager cards (source='pms') for current_date.
--    SPARE any card that still has an open maintenance issue so the report
--    survives. Manual admin/manager cards (source='manual') are never touched.
-- =========================================================================
delete from public.tasks
where source = 'pms'
  and id not in (
    select task_id from public.maintenance_issues where resolved_at is null
  );

-- Reservation-derived cards, one per room in today's buckets, assigned to
-- Angie. is_staff_report=false + staff_id set => auto checklist per card.
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
--    Fixed ids + on conflict do nothing so they're idempotent even if one was
--    spared in Section 3 (e.g. it carried an open maintenance issue).
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

-- Property Round checklist — only seed if missing (the card_type 'dailys' does
-- not auto-seed). NOT EXISTS guard keeps it idempotent across re-runs.
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
-- Verification (run after applying — expect the counts below on 2026-05-25):
-- =========================================================================
-- select context->>'staff_home_bucket' as bucket, count(*)
--   from public.tasks where source='pms' group by 1 order by 1;
--   -- expect: arrivals 3, departures 6, stayovers 2, dailys 1, eod 1, start_of_day 1
--   --   departures: rooms 22 Kathie, 41 Sandra, 26 Albert, 23 Dave Newton, 34 Sarah Mohr, 28 Mary Hauschen
--   --   arrivals:   rooms 39 Tyler Sauer, 38 Tamzid Bin Mafiz, 37 Jerrett Haag
--   --   stayovers:  room 29 Cheryl Moskal (night 4 of 5), room 27 Larry & Marge Calvert (night 1 of 4)
-- select count(*) from public.reservations where external_id like 'rx-%';      -- total kept (incl. retired)
-- select status, count(*) from public.reservations group by 1 order by 1;      -- see departed/cancelled retirements
