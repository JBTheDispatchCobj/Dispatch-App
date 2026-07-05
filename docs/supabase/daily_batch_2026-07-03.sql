-- docs/supabase/daily_batch_2026-07-03.sql
--
-- DAILY MORNING BATCH — run top-to-bottom in the Supabase SQL editor, once each
-- morning BEFORE Angie clocks in. Idempotent. Date-relative: run it ON 2026-07-03.
--
-- Today: 4 departures / 12 arrivals / 8 stayovers.
--   * Jim Wedde (#68569) checks out of a 4-room block today (43/28/24/33) — all
--     four turn over (new arrivals into 24, 28, 33, 43).
--   * Holiday-weekend arrival wave: the Madson party (22/24/26/28), Alan
--     Schwantz (29/27), Shane Ferrozzo (39/31), plus Pam Pertz (33), Donna
--     Zwiefel (32), Betty Smith (43), Kelly Lodermeier (25).
--   * Re-rooms since the 6-29 photo: Betty Smith 39+37 -> one suite (43);
--     Todd Madson 29 -> 22 (got his double); Carlene Lodermeier 35 -> 42.
--     Their old external_ids drop out of the keep-list and retire in Section 2.
--   * Mary Charmoli (#67345) room-35 segment is now continuous 6/22-8/31.
--
-- TO REUSE NEXT MORNING: replace Section 1 VALUES + Section 2 keep-list with the
-- new export's set; Sections 3-4 are date-relative and need no edits.

-- =========================================================================
-- 1. Upsert today's reservations (7-3 export — 39 room-rows: 24 active today
--    + 15 future). status computed from today.
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
  -- Departures today (departure_date = 2026-07-03) — Jim Wedde 4-room block
  ('rx-68569-43', 'Jim Wedde',              '43', date '2026-06-30', date '2026-07-03', time '17:00', null::text,                                                          null::text[],          '{"res":"68569","channel":"Online","guest_raw":"Jim Wedde","rooms":"43 Two Bedroom Suite with Kitchen: 6/30/2026-7/2/2026","rooms_full":"43 Two Bedroom Suite with Kitchen: 6/30/2026-7/2/2026, 28 Double : 6/30/2026-7/2/2026, 24 Double: 6/30/2026-7/2/2026, 33 Queen: 6/30/2026-7/2/2026","total":"$2,534.38"}'::jsonb),
  ('rx-68569-28', 'Jim Wedde',              '28', date '2026-06-30', date '2026-07-03', time '17:00', null::text,                                                          null::text[],          '{"res":"68569","channel":"Online","guest_raw":"Jim Wedde","rooms":"28 Double : 6/30/2026-7/2/2026","rooms_full":"43 Two Bedroom Suite with Kitchen: 6/30/2026-7/2/2026, 28 Double : 6/30/2026-7/2/2026, 24 Double: 6/30/2026-7/2/2026, 33 Queen: 6/30/2026-7/2/2026","total":"$2,534.38"}'::jsonb),
  ('rx-68569-24', 'Jim Wedde',              '24', date '2026-06-30', date '2026-07-03', time '17:00', null::text,                                                          null::text[],          '{"res":"68569","channel":"Online","guest_raw":"Jim Wedde","rooms":"24 Double: 6/30/2026-7/2/2026","rooms_full":"43 Two Bedroom Suite with Kitchen: 6/30/2026-7/2/2026, 28 Double : 6/30/2026-7/2/2026, 24 Double: 6/30/2026-7/2/2026, 33 Queen: 6/30/2026-7/2/2026","total":"$2,534.38"}'::jsonb),
  ('rx-68569-33', 'Jim Wedde',              '33', date '2026-06-30', date '2026-07-03', time '17:00', null::text,                                                          null::text[],          '{"res":"68569","channel":"Online","guest_raw":"Jim Wedde","rooms":"33 Queen: 6/30/2026-7/2/2026","rooms_full":"43 Two Bedroom Suite with Kitchen: 6/30/2026-7/2/2026, 28 Double : 6/30/2026-7/2/2026, 24 Double: 6/30/2026-7/2/2026, 33 Queen: 6/30/2026-7/2/2026","total":"$2,534.38"}'::jsonb),
  -- Arrivals today (arrival_date = 2026-07-03)
  ('rx-61386-22', 'Todd Madson',            '22', date '2026-07-03', date '2026-07-05', null::time,   'Would like a double if one opens up',                                null::text[],          '{"res":"61386","channel":"Phone","guest_raw":"Todd Madson","rooms":"22 Double: 7/3/2026-7/4/2026","total":"$442.00","note":"would like a double if one opens up"}'::jsonb),
  ('rx-61488-24', 'Matt Madson',            '24', date '2026-07-03', date '2026-07-05', null::time,   null::text,                                                          null::text[],          '{"res":"61488","channel":"Phone","guest_raw":"Matt Madson","rooms":"24 Double: 7/3/2026-7/4/2026","total":"$364.66"}'::jsonb),
  ('rx-61489-26', 'Scott Madson',           '26', date '2026-07-03', date '2026-07-05', null::time,   null::text,                                                          null::text[],          '{"res":"61489","channel":"Phone","guest_raw":"Scott Madson","rooms":"26 ADA Double Room: 7/3/2026-7/4/2026","total":"$364.66"}'::jsonb),
  ('rx-66701-29', 'Alan Schwantz',          '29', date '2026-07-03', date '2026-07-04', null::time,   null::text,                                                          null::text[],          '{"res":"66701","channel":"Phone","guest_raw":"Alan Schwantz","rooms":"29 Queen: 7/3/2026","rooms_full":"29 Queen: 7/3/2026, 27 Queen: 7/3/2026","total":"$442.00"}'::jsonb),
  ('rx-66701-27', 'Alan Schwantz',          '27', date '2026-07-03', date '2026-07-04', null::time,   null::text,                                                          null::text[],          '{"res":"66701","channel":"Phone","guest_raw":"Alan Schwantz","rooms":"27 Queen: 7/3/2026","rooms_full":"29 Queen: 7/3/2026, 27 Queen: 7/3/2026","total":"$442.00"}'::jsonb),
  ('rx-61490-28', 'Jessica Madson',         '28', date '2026-07-03', date '2026-07-05', null::time,   'Sharing room with Kelsey Madson; using Kelsey card',                 null::text[],          '{"res":"61490","channel":"Phone","guest_raw":"Jessica Madson","rooms":"28 Double : 7/3/2026-7/4/2026","total":"$364.66","note":"Kelsey Madson also on reservation; sharing room and using Kelsey card"}'::jsonb),
  ('rx-67117-33', 'Pam Pertz',              '33', date '2026-07-03', date '2026-07-04', null::time,   null::text,                                                          null::text[],          '{"res":"67117","channel":"Phone","guest_raw":"Pam Pertz","rooms":"33 Queen: 7/3/2026","total":"$276.25"}'::jsonb),
  ('rx-65550-32', 'Donna Zwiefel',          '32', date '2026-07-03', date '2026-07-06', null::time,   null::text,                                                          null::text[],          '{"res":"65550","channel":"Phone","guest_raw":"Donna Zwiefel","rooms":"32 Double: 7/3/2026-7/5/2026","total":"$447.54"}'::jsonb),
  ('rx-66513-43', 'Betty Smith',            '43', date '2026-07-03', date '2026-07-05', null::time,   'Waiting list; will call Friday to confirm; wants a double for the family', null::text[],   '{"res":"66513","channel":"Phone","guest_raw":"Betty Smith","rooms":"43 Two Bedroom Suite with Kitchen: 7/3/2026-7/4/2026","total":"$685.10","note":"waiting list - will call Friday to confirm","preferences":"parents and aunt coming for holiday weekend - need a double instead of two singles"}'::jsonb),
  ('rx-68616-39', 'Shane Ferrozzo',         '39', date '2026-07-03', date '2026-07-04', time '14:00', null::text,                                                          null::text[],          '{"res":"68616","channel":"Online","guest_raw":"Shane Ferrozzo","rooms":"39 Queen: 7/3/2026","rooms_full":"39 Queen: 7/3/2026, 31 Queen: 7/3/2026","total":"$386.75"}'::jsonb),
  ('rx-68616-31', 'Shane Ferrozzo',         '31', date '2026-07-03', date '2026-07-04', time '14:00', null::text,                                                          null::text[],          '{"res":"68616","channel":"Online","guest_raw":"Shane Ferrozzo","rooms":"31 Queen: 7/3/2026","rooms_full":"39 Queen: 7/3/2026, 31 Queen: 7/3/2026","total":"$386.75"}'::jsonb),
  ('rx-68219-25', 'Kelly Lodermeier',       '25', date '2026-07-03', date '2026-07-05', time '17:00', null::text,                                                          null::text[],          '{"res":"68219","channel":"Online","guest_raw":"Kelly Lodermeier","rooms":"25 Queen: 7/3/2026-7/4/2026","total":"$331.50"}'::jsonb),
  -- Stayovers today (arrival < 2026-07-03 < departure)
  ('rx-67345-35', 'Mary Charmoli',          '35', date '2026-06-22', date '2026-09-01', null::time,   'Long stay; room-35 segment 6/22-8/31',                               null::text[],          '{"res":"67345","channel":"Phone","guest_raw":"Mary Charmoli","rooms":"35 Queen: 6/22/2026-8/31/2026","rooms_full":"35 Queen: 6/22/2026-8/31/2026, 21 Queen: 6/1/2026-6/17/2026","total":"$4,400.00","note":"long stay; current room-35 segment 6/22-8/31"}'::jsonb),
  ('rx-67327-38', 'Wisconsin DNR',          '38', date '2026-06-28', date '2026-07-31', null::time,   'Jared Way',                                                          null::text[],          '{"res":"67327","channel":"Phone","guest_raw":"Wisconsin DNR","rooms":"38 King Jacuzzi Room: 6/28/2026-7/30/2026","total":"$2,475.00","note":"Jared Way"}'::jsonb),
  ('rx-67918-21', 'Sue Lodermeier',         '21', date '2026-07-02', date '2026-07-04', null::time,   'If the next day opens up they would like it',                        null::text[],          '{"res":"67918","channel":"Phone","guest_raw":"Sue Lodermeier","rooms":"21 Queen: 7/2/2026-7/3/2026","total":"$342.56","note":"if the next day opens up they would like it"}'::jsonb),
  ('rx-67133-41', 'Jim Hofstad',            '41', date '2026-07-02', date '2026-07-06', null::time,   null::text,                                                          null::text[],          '{"res":"67133","channel":"Phone","guest_raw":"Jim Hofstad, Eileen","rooms":"41 Queen: 7/2/2026-7/5/2026","total":"$663.00"}'::jsonb),
  ('rx-61487-23', 'Jonathan Dearmont',      '23', date '2026-07-02', date '2026-07-06', null::time,   null::text,                                                          null::text[],          '{"res":"61487","channel":"Phone","guest_raw":"Jonathan Dearmont","rooms":"23 Queen: 7/2/2026-7/5/2026","total":"$895.06"}'::jsonb),
  ('rx-59569-36', 'Ron Schultz',            '36', date '2026-07-02', date '2026-07-06', null::time,   null::text,                                                          null::text[],          '{"res":"59569","channel":"Phone","guest_raw":"Ron Schultz","rooms":"36 Double: 7/2/2026-7/5/2026","total":"$685.12"}'::jsonb),
  ('rx-65558-42', 'Carlene Lodermeier',     '42', date '2026-07-02', date '2026-07-06', null::time,   null::text,                                                          null::text[],          '{"res":"65558","channel":"Phone","guest_raw":"Carlene Lodermeier","rooms":"42 ADA King Jacuzzi Room: 7/2/2026-7/5/2026","rooms_full":"42 ADA King Jacuzzi Room: 7/2/2026-7/5/2026, 34 Double: 7/2/2026-7/5/2026","total":"$1,740.36"}'::jsonb),
  ('rx-65558-34', 'Carlene Lodermeier',     '34', date '2026-07-02', date '2026-07-06', null::time,   null::text,                                                          null::text[],          '{"res":"65558","channel":"Phone","guest_raw":"Carlene Lodermeier","rooms":"34 Double: 7/2/2026-7/5/2026","rooms_full":"42 ADA King Jacuzzi Room: 7/2/2026-7/5/2026, 34 Double: 7/2/2026-7/5/2026","total":"$1,740.36"}'::jsonb),
  -- Future bookings (arrive 7/4+) — no card today; kept active in the table
  ('rx-66882-29', 'Mary Tonsager',          '29', date '2026-07-04', date '2026-07-06', null::time,   null::text,                                                          null::text[],          '{"res":"66882","channel":"Phone","guest_raw":"Mary Tonsager","rooms":"29 Queen: 7/4/2026-7/5/2026","total":"$442.00"}'::jsonb),
  ('rx-62312-21', 'Jody Pederson',          '21', date '2026-07-04', date '2026-07-06', null::time,   'Gail Jambois is the guest for room 21; she may call to make changes', null::text[],         '{"res":"62312","channel":"Phone","guest_raw":"Jody Pederson","rooms":"21 Queen: 7/4/2026-7/5/2026","total":"$331.50","note":"Gail Jambois is the guest for room 21; may call to make changes"}'::jsonb),
  ('rx-68063-25', 'Tom Sontag',             '25', date '2026-07-05', date '2026-07-06', null::time,   'Card would not save; confirmed twice',                               null::text[],          '{"res":"68063","channel":"Phone","guest_raw":"Tom Sontag","rooms":"25 Queen: 7/5/2026","total":"$165.75","note":"card wont save - confirmed twice"}'::jsonb),
  ('rx-67908-39', 'Tamzid Bin Mafiz',       '39', date '2026-07-05', date '2026-07-09', null::time,   null::text,                                                          array['$55 a night'],  '{"res":"67908","channel":"Phone","guest_raw":"Tamzid Bin Mafiz, *** ($55 a night)","rooms":"39 Queen: 7/5/2026-7/8/2026","total":"$243.12","rate_note":"$55 a night"}'::jsonb),
  ('rx-68320-24', 'Tammy Oakes',            '24', date '2026-07-05', date '2026-07-06', time '15:00', null::text,                                                          null::text[],          '{"res":"68320","channel":"Direct Connect","guest_raw":"Tammy Oakes","rooms":"24 Double: 7/5/2026","rooms_full":"24 Double: 7/5/2026, 23 Queen: 7/9/2026-7/10/2026","total":"$591.19"}'::jsonb),
  ('rx-68320-23', 'Tammy Oakes',            '23', date '2026-07-09', date '2026-07-11', time '15:00', null::text,                                                          null::text[],          '{"res":"68320","channel":"Direct Connect","guest_raw":"Tammy Oakes","rooms":"23 Queen: 7/9/2026-7/10/2026","rooms_full":"24 Double: 7/5/2026, 23 Queen: 7/9/2026-7/10/2026","total":"$591.19"}'::jsonb),
  ('rx-68639-29', 'Randall Rosolowski',     '29', date '2026-07-06', date '2026-07-09', null::time,   null::text,                                                          null::text[],          '{"res":"68639","channel":"Phone","guest_raw":"Randall Rosolowski","rooms":"29 Queen: 7/6/2026-7/8/2026","total":"$414.39"}'::jsonb),
  ('rx-68655-27', 'Joe Koschak',            '27', date '2026-07-06', date '2026-07-09', null::time,   null::text,                                                          null::text[],          '{"res":"68655","channel":"Phone","guest_raw":"Joe Koschak","rooms":"27 Queen: 7/6/2026-7/8/2026","total":"$248.64"}'::jsonb),
  ('rx-67796-34', 'Ronald Tucci',           '34', date '2026-07-07', date '2026-07-09', null::time,   null::text,                                                          null::text[],          '{"res":"67796","channel":"Phone","guest_raw":"Ronald Tucci","rooms":"34 Double: 7/7/2026-7/8/2026","total":"$298.36"}'::jsonb),
  ('rx-65785-43', 'Teresa and Jim Schuh',   '43', date '2026-07-07', date '2026-07-13', null::time,   null::text,                                                          null::text[],          '{"res":"65785","channel":"Phone","guest_raw":"Teresa and Jim Schuh","rooms":"43 Two Bedroom Suite with Kitchen: 7/7/2026-7/12/2026","total":"$928.23"}'::jsonb),
  ('rx-68443-41', 'Eugene Bowers',          '41', date '2026-07-08', date '2026-07-11', null::time,   'Here for funeral',                                                   null::text[],          '{"res":"68443","channel":"Phone","guest_raw":"Eugene Bowers","rooms":"41 Queen: 7/8/2026-7/10/2026","total":"$402.78","note":"here for funeral"}'::jsonb),
  ('rx-67911-31', 'Jim & Julie Brodtmann',  '31', date '2026-07-08', date '2026-07-09', null::time,   'WIFES NAME IS JUILE',                                                array['$80 rate'],     '{"res":"67911","channel":"Phone","guest_raw":"Jim & Julie Brodtmann ($80 rate)","rooms":"31 Queen: 7/8/2026","total":"$88.40","rate_note":"$80 rate","preferences":"WIFES NAME IS JUILE","note":"booked jim out thinking he was back for the season"}'::jsonb),
  ('rx-68489-36', 'Jill Tetzlaff',          '36', date '2026-07-09', date '2026-07-10', time '17:00', null::text,                                                          null::text[],          '{"res":"68489","channel":"Online","guest_raw":"Jill Tetzlaff","rooms":"36 Double: 7/9/2026","rooms_full":"36 Double: 7/9/2026, 31 Queen: 7/9/2026","total":"$287.31"}'::jsonb),
  ('rx-68489-31', 'Jill Tetzlaff',          '31', date '2026-07-09', date '2026-07-10', time '17:00', null::text,                                                          null::text[],          '{"res":"68489","channel":"Online","guest_raw":"Jill Tetzlaff","rooms":"31 Queen: 7/9/2026","rooms_full":"36 Double: 7/9/2026, 31 Queen: 7/9/2026","total":"$287.31"}'::jsonb),
  ('rx-68486-33', 'Steven Bailey',          '33', date '2026-07-09', date '2026-07-11', time '17:00', null::text,                                                          null::text[],          '{"res":"68486","channel":"Online","guest_raw":"Steven Bailey","rooms":"33 Queen: 7/9/2026-7/10/2026","total":"$287.31"}'::jsonb)
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
-- 2. Retire reservations that DROPPED OUT of today's file (the 6-29 set + older,
--    plus the re-roomed old external_ids: rx-66513-39/-37, rx-61386-29,
--    rx-65558-35, etc.). Keeps the row for history; moves status out of
--    (confirmed, arrived).
-- =========================================================================
update public.reservations
set status = case when departure_date < current_date then 'departed' else 'cancelled' end
where external_id like 'rx-%'
  and status in ('confirmed', 'arrived')
  and external_id not in (
    'rx-68569-43','rx-68569-28','rx-68569-24','rx-68569-33',
    'rx-61386-22','rx-61488-24','rx-61489-26','rx-66701-29','rx-66701-27',
    'rx-61490-28','rx-67117-33','rx-65550-32','rx-66513-43','rx-68616-39',
    'rx-68616-31','rx-68219-25',
    'rx-67345-35','rx-67327-38','rx-67918-21','rx-67133-41','rx-61487-23',
    'rx-59569-36','rx-65558-42','rx-65558-34',
    'rx-66882-29','rx-62312-21','rx-68063-25','rx-67908-39','rx-68320-24',
    'rx-68320-23','rx-68639-29','rx-68655-27','rx-67796-34','rx-65785-43',
    'rx-68443-41','rx-67911-31','rx-68489-36','rx-68489-31','rx-68486-33'
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
-- Verification (run after applying — expect departures 4 / arrivals 12 /
-- stayovers 8 on 2026-07-03):
-- =========================================================================
-- select context->>'staff_home_bucket' as bucket, count(*)
--   from public.tasks where source='pms' group by 1 order by 1;
--   -- expect: arrivals 12, departures 4, dailys 1, eod 1, stayovers 8, start_of_day 1
-- select status, count(*) from public.reservations group by 1 order by 1;
