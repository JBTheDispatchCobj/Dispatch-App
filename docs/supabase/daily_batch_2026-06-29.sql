-- docs/supabase/daily_batch_2026-06-29.sql
--
-- DAILY MORNING BATCH — run top-to-bottom in the Supabase SQL editor, once each
-- morning BEFORE Angie clocks in. Idempotent. Date-relative: run it ON 2026-06-29.
--
-- Today: 2 departures / 3 arrivals / 5 stayovers. Room 37 turns over (Rick
-- Brimacomb out, Steve Beckett in). Last batch run was 6-25; this 6-29 export is
-- the current photo, so everything since reconciles in this one run.
--
-- TO REUSE NEXT MORNING: replace Section 1 VALUES + Section 2 keep-list with the
-- new export's set; Sections 3-4 are date-relative and need no edits.

-- =========================================================================
-- 1. Upsert today's reservations (6-29 export — 38 room-rows: 10 active today
--    + 28 future). status computed from today.
-- =========================================================================
insert into public.reservations
  (external_id, source, status, guest_name, room_number,
   arrival_date, departure_date, arrival_time,
   guest_notes, special_requests, raw_payload)
select
  v.external_id,
  'resnexus',
  case when v.arrival_date <= current_date then 'arrived' else 'confirmed' end,
  v.guest_name, v.room_number, v.arrival_date, v.departure_date, v.arrival_time,
  v.guest_notes, v.special_requests, v.raw_payload
from (values
  -- Departures today (departure_date = 2026-06-29)
  ('rx-68538-41', 'Nick Quinn',            '41', date '2026-06-27', date '2026-06-29', null::time,   null::text,                           null::text[],         '{"res":"68538","channel":"Phone","guest_raw":"Nick Quinn","rooms":"41 Queen: 6/27/2026-6/28/2026","total":"$331.80"}'::jsonb),
  ('rx-68558-37', 'Rick Brimacomb',        '37', date '2026-06-28', date '2026-06-29', null::time,   null::text,                           null::text[],         '{"res":"68558","channel":"Phone","guest_raw":"Rick Brimacomb","rooms":"37 Queen: 6/28/2026","total":"$149.18"}'::jsonb),
  -- Arrivals today (arrival_date = 2026-06-29)
  ('rx-68555-21', 'Joe Koschak',           '21', date '2026-06-29', date '2026-07-02', null::time,   null::text,                           null::text[],         '{"res":"68555","channel":"Phone","guest_raw":"Joe Koschak","rooms":"21 Queen: 6/29/2026-7/1/2026","total":"$232.05"}'::jsonb),
  ('rx-67997-37', 'Steve Beckett',         '37', date '2026-06-29', date '2026-07-02', null::time,   'use card ending in 2441',            null::text[],         '{"res":"67997","channel":"Phone","guest_raw":"Steve Beckett","rooms":"37 Queen: 6/29/2026-7/1/2026","total":"$298.35","note":"use card ending in 2441"}'::jsonb),
  ('rx-67937-27', 'William T. Boehm',      '27', date '2026-06-29', date '2026-07-01', time '14:00', null::text,                           null::text[],         '{"res":"67937","channel":"Online","guest_raw":"William T. Boehm","rooms":"27 Queen: 6/29/2026-6/30/2026","total":"$276.26"}'::jsonb),
  -- Stayovers today (arrival < 2026-06-29 < departure)
  ('rx-67345-35', 'Mary Charmoli',         '35', date '2026-06-22', date '2026-07-03', null::time,   'Long stay; room-35 segment 6/22-7/2', null::text[],        '{"res":"67345","channel":"Phone","guest_raw":"Mary Charmoli","rooms":"35 Queen: 6/22/2026-7/2/2026","rooms_full":"35 Queen: 6/22/2026-7/2/2026, 7/6/2026-8/31/2026, 21 Queen: 6/1/2026-6/17/2026","total":"$4,250.00","note":"long stay, current room-35 segment"}'::jsonb),
  ('rx-68560-32', 'Troy Benner',           '32', date '2026-06-28', date '2026-07-02', null::time,   'Bill at end of stay; send payment email at checkout', null::text[], '{"res":"68560","channel":"Phone","guest_raw":"Troy Benner, *** (TRB AUTO)","rooms":"32 Double: 6/28/2026-7/1/2026","total":"$607.77","note":"Bill at end of stay; ED 623.764.1564 / Mike 608.931.4120"}'::jsonb),
  ('rx-67267-33', 'Tom Mackey',            '33', date '2026-06-28', date '2026-06-30', null::time,   'Coach',                              null::text[],         '{"res":"67267","channel":"Phone","guest_raw":"Tom Mackey, *** (Coach!)","rooms":"33 Queen: 6/28/2026-6/29/2026","total":"$110.50","note":"Coach"}'::jsonb),
  ('rx-67327-38', 'Wisconsin DNR',         '38', date '2026-06-28', date '2026-07-31', null::time,   'Jared Way',                          null::text[],         '{"res":"67327","channel":"Phone","guest_raw":"Wisconsin DNR","rooms":"38 King Jacuzzi Room: 6/28/2026-7/30/2026","total":"$2,475.00","note":"Jared Way"}'::jsonb),
  ('rx-68531-29', 'J Kassebaum',           '29', date '2026-06-28', date '2026-06-30', time '17:00', null::text,                           null::text[],         '{"res":"68531","channel":"Online","guest_raw":"J Kassebaum","rooms":"29 Queen: 6/28/2026-6/29/2026","total":"$287.31"}'::jsonb),
  -- Future bookings (arrive 6/30+) — no card today; kept active in the table
  ('rx-68274-39', 'Tamzid Bin Mafiz',      '39', date '2026-06-30', date '2026-07-02', null::time,   null::text,                           array['$55 a night'], '{"res":"68274","channel":"Phone","guest_raw":"Tamzid Bin Mafiz, *** ($55 a night)","rooms":"39 Queen: 6/30/2026-7/1/2026","total":"$276.26","rate_note":"$55 a night"}'::jsonb),
  ('rx-67913-29', 'Jim & Julie Brodtmann', '29', date '2026-07-01', date '2026-07-02', null::time,   'WIFES NAME IS JUILE',                array['$80 rate'],    '{"res":"67913","channel":"Phone","guest_raw":"Jim & Julie Brodtmann ($80 rate)","rooms":"29 Queen: 7/1/2026","total":"$88.40","rate_note":"$80 rate","preferences":"WIFES NAME IS JUILE"}'::jsonb),
  ('rx-59569-36', 'Ron Schultz',           '36', date '2026-07-02', date '2026-07-06', null::time,   null::text,                           null::text[],         '{"res":"59569","channel":"Phone","guest_raw":"Ron Schultz","rooms":"36 Double: 7/2/2026-7/5/2026","total":"$685.12"}'::jsonb),
  ('rx-61487-23', 'Jonathan Dearmont',     '23', date '2026-07-02', date '2026-07-06', null::time,   null::text,                           null::text[],         '{"res":"61487","channel":"Phone","guest_raw":"Jonathan Dearmont","rooms":"23 Queen: 7/2/2026-7/5/2026","total":"$895.06"}'::jsonb),
  ('rx-67918-21', 'Sue Lodermeier',        '21', date '2026-07-02', date '2026-07-04', null::time,   'If the next day opens up they would like it', null::text[], '{"res":"67918","channel":"Phone","guest_raw":"Sue Lodermeier","rooms":"21 Queen: 7/2/2026-7/3/2026","total":"$342.56","note":"if the next day opens up they would like"}'::jsonb),
  ('rx-67133-41', 'Jim Hofstad',           '41', date '2026-07-02', date '2026-07-06', null::time,   null::text,                           null::text[],         '{"res":"67133","channel":"Phone","guest_raw":"Jim Hofstad, Eileen","rooms":"41 Queen: 7/2/2026-7/5/2026","total":"$663.00"}'::jsonb),
  ('rx-66513-39', 'Betty Smith',           '39', date '2026-07-03', date '2026-07-05', null::time,   'Waiting list; will call Friday to confirm; wants a double for the family', null::text[], '{"res":"66513","channel":"Phone","guest_raw":"Betty Smith","rooms":"39 Queen: 7/3/2026-7/4/2026","rooms_full":"39 Queen: 7/3/2026-7/4/2026, 37 Queen: 7/3/2026-7/4/2026","total":"$663.00","note":"waiting list - wants one double instead of two singles"}'::jsonb),
  ('rx-66513-37', 'Betty Smith',           '37', date '2026-07-03', date '2026-07-05', null::time,   'Waiting list; will call Friday to confirm; wants a double for the family', null::text[], '{"res":"66513","channel":"Phone","guest_raw":"Betty Smith","rooms":"37 Queen: 7/3/2026-7/4/2026","rooms_full":"39 Queen: 7/3/2026-7/4/2026, 37 Queen: 7/3/2026-7/4/2026","total":"$663.00","note":"waiting list - wants one double instead of two singles"}'::jsonb),
  ('rx-65550-32', 'Donna Zwiefel',         '32', date '2026-07-03', date '2026-07-06', null::time,   null::text,                           null::text[],         '{"res":"65550","channel":"Phone","guest_raw":"Donna Zwiefel","rooms":"32 Double: 7/3/2026-7/5/2026","total":"$447.54"}'::jsonb),
  ('rx-65558-34', 'Carlene Lodermeier',    '34', date '2026-07-03', date '2026-07-06', null::time,   null::text,                           null::text[],         '{"res":"65558","channel":"Phone","guest_raw":"Carlene Lodermeier","rooms":"34 Double: 7/3/2026-7/5/2026","rooms_full":"34 Double: 7/3/2026-7/5/2026, 35 Queen: 7/3/2026-7/5/2026","total":"$1,359.15"}'::jsonb),
  ('rx-65558-35', 'Carlene Lodermeier',    '35', date '2026-07-03', date '2026-07-06', null::time,   null::text,                           null::text[],         '{"res":"65558","channel":"Phone","guest_raw":"Carlene Lodermeier","rooms":"35 Queen: 7/3/2026-7/5/2026","rooms_full":"34 Double: 7/3/2026-7/5/2026, 35 Queen: 7/3/2026-7/5/2026","total":"$1,359.15"}'::jsonb),
  ('rx-61573-42', 'Jamie Reznicek',        '42', date '2026-07-03', date '2026-07-05', null::time,   'Randy',                              null::text[],         '{"res":"61573","channel":"Phone","guest_raw":"Jamie Reznicek","rooms":"42 ADA King Jacuzzi Room: 7/3/2026-7/4/2026","total":"$386.76","note":"Randy"}'::jsonb),
  ('rx-61386-29', 'Todd Madson',           '29', date '2026-07-03', date '2026-07-06', null::time,   'Would like a double if one opens up', null::text[],        '{"res":"61386","channel":"Phone","guest_raw":"Todd Madson","rooms":"29 Queen: 7/3/2026-7/5/2026","total":"$640.91","note":"would like a double if one opens up"}'::jsonb),
  ('rx-61490-28', 'Jessica Madson',        '28', date '2026-07-03', date '2026-07-05', null::time,   'Sharing room with Kelsey Madson; using Kelsey card', null::text[], '{"res":"61490","channel":"Phone","guest_raw":"Jessica Madson","rooms":"28 Double : 7/3/2026-7/4/2026","total":"$364.66","note":"Kelsey Madson also on reservation; sharing room"}'::jsonb),
  ('rx-66701-33', 'Alan Schwantz',         '33', date '2026-07-03', date '2026-07-04', null::time,   null::text,                           null::text[],         '{"res":"66701","channel":"Phone","guest_raw":"Alan Schwantz","rooms":"33 Queen: 7/3/2026","rooms_full":"33 Queen: 7/3/2026, 27 Queen: 7/3/2026","total":"$442.00"}'::jsonb),
  ('rx-66701-27', 'Alan Schwantz',         '27', date '2026-07-03', date '2026-07-04', null::time,   null::text,                           null::text[],         '{"res":"66701","channel":"Phone","guest_raw":"Alan Schwantz","rooms":"27 Queen: 7/3/2026","rooms_full":"33 Queen: 7/3/2026, 27 Queen: 7/3/2026","total":"$442.00"}'::jsonb),
  ('rx-61489-26', 'Scott Madson',          '26', date '2026-07-03', date '2026-07-05', null::time,   null::text,                           null::text[],         '{"res":"61489","channel":"Phone","guest_raw":"Scott Madson","rooms":"26 ADA Double Room: 7/3/2026-7/4/2026","total":"$364.66"}'::jsonb),
  ('rx-61488-24', 'Matt Madson',           '24', date '2026-07-03', date '2026-07-05', null::time,   null::text,                           null::text[],         '{"res":"61488","channel":"Phone","guest_raw":"Matt Madson","rooms":"24 Double: 7/3/2026-7/4/2026","total":"$364.66"}'::jsonb),
  ('rx-67117-31', 'Pam Pertz',             '31', date '2026-07-03', date '2026-07-04', null::time,   null::text,                           null::text[],         '{"res":"67117","channel":"Phone","guest_raw":"Pam Pertz","rooms":"31 Queen: 7/3/2026","total":"$276.25"}'::jsonb),
  ('rx-68219-25', 'Kelly Lodermeier',      '25', date '2026-07-03', date '2026-07-05', time '17:00', null::text,                           null::text[],         '{"res":"68219","channel":"Online","guest_raw":"Kelly Lodermeier","rooms":"25 Queen: 7/3/2026-7/4/2026","total":"$298.36"}'::jsonb),
  ('rx-66882-33', 'Mary Tonsager',         '33', date '2026-07-04', date '2026-07-06', null::time,   null::text,                           null::text[],         '{"res":"66882","channel":"Phone","guest_raw":"Mary Tonsager","rooms":"33 Queen: 7/4/2026-7/5/2026","total":"$442.00"}'::jsonb),
  ('rx-68267-27', 'Randy Twito',           '27', date '2026-07-04', date '2026-07-07', null::time,   'decon luke',                         null::text[],         '{"res":"68267","channel":"Phone","guest_raw":"Randy Twito","rooms":"27 Queen: 7/4/2026-7/6/2026","total":"$828.75","note":"decon luke"}'::jsonb),
  ('rx-62312-21', 'Jody Pederson',         '21', date '2026-07-04', date '2026-07-06', null::time,   'Gail Jambois is the guest for room 21; she may call to make changes', null::text[], '{"res":"62312","channel":"Phone","guest_raw":"Jody Pederson","rooms":"21 Queen: 7/4/2026-7/5/2026","total":"$331.50","note":"Gail Jambois is the guest for room 21"}'::jsonb),
  ('rx-68366-31', 'Richard Wilke',         '31', date '2026-07-04', date '2026-07-06', null::time,   '3rd also',                           null::text[],         '{"res":"68366","channel":"Phone","guest_raw":"Richard Wilke","rooms":"31 Queen: 7/4/2026-7/5/2026","total":"$298.36","note":"3rd also"}'::jsonb),
  ('rx-68063-25', 'Tom Sontag',            '25', date '2026-07-05', date '2026-07-06', null::time,   'Card would not save; confirmed twice', null::text[],       '{"res":"68063","channel":"Phone","guest_raw":"Tom Sontag","rooms":"25 Queen: 7/5/2026","total":"$165.75","note":"card wont save - confirmed twice"}'::jsonb),
  ('rx-67908-39', 'Tamzid Bin Mafiz',      '39', date '2026-07-05', date '2026-07-09', null::time,   null::text,                           array['$55 a night'], '{"res":"67908","channel":"Phone","guest_raw":"Tamzid Bin Mafiz, *** ($55 a night)","rooms":"39 Queen: 7/5/2026-7/8/2026","total":"$243.12","rate_note":"$55 a night"}'::jsonb),
  ('rx-68320-24', 'Tammy Oakes',           '24', date '2026-07-05', date '2026-07-06', time '15:00', null::text,                           null::text[],         '{"res":"68320","channel":"Direct Connect","guest_raw":"Tammy Oakes","rooms":"24 Double: 7/5/2026","rooms_full":"24 Double: 7/5/2026, 23 Queen: 7/9/2026-7/10/2026","total":"$591.19"}'::jsonb),
  ('rx-68320-23', 'Tammy Oakes',           '23', date '2026-07-09', date '2026-07-11', time '15:00', null::text,                           null::text[],         '{"res":"68320","channel":"Direct Connect","guest_raw":"Tammy Oakes","rooms":"23 Queen: 7/9/2026-7/10/2026","rooms_full":"24 Double: 7/5/2026, 23 Queen: 7/9/2026-7/10/2026","total":"$591.19"}'::jsonb)
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
-- 2. Retire reservations that DROPPED OUT of today's file (the 6-25 set + older).
--    Keeps the row for history; moves status out of (confirmed, arrived).
-- =========================================================================
update public.reservations
set status = case when departure_date < current_date then 'departed' else 'cancelled' end
where external_id like 'rx-%'
  and status in ('confirmed', 'arrived')
  and external_id not in (
    'rx-68538-41','rx-68558-37','rx-68555-21','rx-67997-37','rx-67937-27',
    'rx-67345-35','rx-68560-32','rx-67267-33','rx-67327-38','rx-68531-29',
    'rx-68274-39','rx-67913-29','rx-59569-36','rx-61487-23','rx-67918-21',
    'rx-67133-41','rx-66513-39','rx-66513-37','rx-65550-32','rx-65558-34',
    'rx-65558-35','rx-61573-42','rx-61386-29','rx-61490-28','rx-66701-33',
    'rx-66701-27','rx-61489-26','rx-61488-24','rx-67117-31','rx-68219-25',
    'rx-66882-33','rx-68267-27','rx-62312-21','rx-68366-31','rx-68063-25',
    'rx-67908-39','rx-68320-24','rx-68320-23'
  );

-- =========================================================================
-- 3. Rebuild today's channel-manager cards (source='pms') for current_date.
--    SPARE any card with an open maintenance issue; never touch manual cards.
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
       jsonb_build_object('staff_home_bucket','departures',
         'outgoing_guest', jsonb_build_object(
           'name', r.guest_name,
           'room_type', substring(r.raw_payload->>'rooms' from '^[0-9]+\s+(.+?)\s*:'),
           'clean_type','Standard'))
  from public.reservations r
  where r.external_id like 'rx-%' and r.status in ('confirmed','arrived')
    and r.departure_date = current_date
union all
-- Arrivals (prep) — Arrives = today
select 'Room ' || r.room_number || ' - ' || r.guest_name, 'arrival', 'open', 'medium', 'pms',
       r.room_number, 'Angie', 'a0c1e000-0000-4000-8000-000000000001'::uuid, false,
       '380edc3d-ab42-4aed-aff7-940d9d6f8c2a'::uuid,
       jsonb_build_object('staff_home_bucket','arrivals',
         'incoming_guest', jsonb_build_object(
           'name', r.guest_name,
           'room_type', substring(r.raw_payload->>'rooms' from '^[0-9]+\s+(.+?)\s*:'),
           'checkin_time', to_char(r.arrival_time,'HH24:MI')))
  from public.reservations r
  where r.external_id like 'rx-%' and r.status in ('confirmed','arrived')
    and r.arrival_date = current_date
union all
-- Stayovers (service) — arrival < today < departure
select 'Room ' || r.room_number || ' - ' || r.guest_name, 'stayover', 'open', 'medium', 'pms',
       r.room_number, 'Angie', 'a0c1e000-0000-4000-8000-000000000001'::uuid, false,
       '380edc3d-ab42-4aed-aff7-940d9d6f8c2a'::uuid,
       jsonb_build_object('staff_home_bucket','stayovers',
         'current_guest', jsonb_build_object(
           'name', r.guest_name,
           'room_type', substring(r.raw_payload->>'rooms' from '^[0-9]+\s+(.+?)\s*:'),
           'night_n', (current_date - r.arrival_date),
           'total_nights', greatest(1, r.departure_date - r.arrival_date)))
  from public.reservations r
  where r.external_id like 'rx-%' and r.status in ('confirmed','arrived')
    and r.arrival_date < current_date and r.departure_date > current_date;

-- =========================================================================
-- 4. Standing daily cards (SOD, Dailys, EOD) — fixed ids, idempotent.
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
  ('Restock Cart',1),('Public Restrooms',2),('Dust Pictures',3),
  ('Trash Pickup',4),('Wash Windows',5),('Vacuum Hallways',6)
) as v(title, sort_order)
where not exists (
  select 1 from public.task_checklist_items
  where task_id = 'da11ca5e-0000-4000-8000-000000000001'
);

-- =========================================================================
-- Verification (run after applying — expect departures 2 / arrivals 3 /
-- stayovers 5 on 2026-06-29):
-- =========================================================================
-- select context->>'staff_home_bucket' as bucket, count(*)
--   from public.tasks where source='pms' group by 1 order by 1;
--   -- expect: arrivals 3, departures 2, dailys 1, eod 1, stayovers 5, start_of_day 1
-- select status, count(*) from public.reservations group by 1 order by 1;
