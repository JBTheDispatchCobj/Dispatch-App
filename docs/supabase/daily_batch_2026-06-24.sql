-- docs/supabase/daily_batch_2026-06-24.sql
--
-- DAILY MORNING BATCH — run top-to-bottom in the Supabase SQL editor, once each
-- morning BEFORE Angie clocks in. Idempotent: re-running lands the same state.
-- Date-relative: keys off the database current_date, so run it ON 2026-06-24.
--
-- What it does:
--   1. Upserts today's channel-manager reservations (6-24 export). One row per
--      room per stay, keyed on external_id = 'rx-<Res#>-<room>'. Multi-room
--      reservations split per room (Sheri Hubbard #68413 -> rooms 33/31/29;
--      several future bookings split too). Mary Charmoli #67345 moved from
--      room 21 (departed 6/17) into room 35 -> her old room-keyed rows retire
--      in Section 2 and room 35 upserts fresh.
--   2. Retires any reservation that DROPPED OUT of today's file (incl. the whole
--      6-04 batch set, all long since departed). Keeps the row for history but
--      moves status out of (confirmed, arrived) so it can no longer push a card.
--   3. Rebuilds today's channel-manager cards (source='pms') from current_date.
--      SPARES any card with an OPEN maintenance issue; never touches manual cards.
--   4. Re-seeds the standing SOD / Dailys / EOD cards fresh for the day.
--
--   NOTE: guests who already checked out yesterday (6/23 departures: Faye Brown,
--   Naomi Moulton, Timothy Gasper, Kathy Berreth, Jay Fitzgerld, Robert Nimmo)
--   are intentionally NOT loaded — they generate no card today and were never in
--   the table (last batch run was 6-04).
--
-- SAFE-DELETE NOTE: task_events / notes cascade-delete with a card, so the daily
-- rebuild does not preserve execution history of *completed* cards (fine for
-- beta). Open maintenance issues are preserved by sparing their card. Deep Clean
-- history is on-delete-set-null, so the monthly rotation is never reset.

-- =========================================================================
-- 1. Upsert today's reservations (6-24 export — 39 room-rows: 12 active today
--    + 27 future bookings). status computed from today.
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
  -- Departures today (departure_date = 2026-06-24)
  ('rx-67266-27', 'Tom Mackey',            '27', date '2026-06-20', date '2026-06-24', null::time,   'Coach',                              null::text[],            '{"res":"67266","channel":"Phone","guest_raw":"Tom Mackey, *** (Coach!)","rooms":"27 Queen: 6/20/2026-6/23/2026","total":"$165.75","note":"Coach"}'::jsonb),
  ('rx-68413-33', 'Sheri Hubbard',         '33', date '2026-06-22', date '2026-06-24', null::time,   'Matt meyers Luke bolan Kane groom',  null::text[],            '{"res":"68413","channel":"Phone","guest_raw":"Sheri Hubbard (Astec)","rooms":"33 Queen: 6/22/2026-6/23/2026","rooms_full":"33 Queen: 6/22/2026-6/23/2026, 31 Queen: 6/22/2026-6/23/2026, 29 Queen: 6/23/2026","total":"$690.65","note":"Matt meyers Luke bolan Kane groom"}'::jsonb),
  ('rx-68413-31', 'Sheri Hubbard',         '31', date '2026-06-22', date '2026-06-24', null::time,   'Matt meyers Luke bolan Kane groom',  null::text[],            '{"res":"68413","channel":"Phone","guest_raw":"Sheri Hubbard (Astec)","rooms":"31 Queen: 6/22/2026-6/23/2026","rooms_full":"33 Queen: 6/22/2026-6/23/2026, 31 Queen: 6/22/2026-6/23/2026, 29 Queen: 6/23/2026","total":"$690.65","note":"Matt meyers Luke bolan Kane groom"}'::jsonb),
  ('rx-68413-29', 'Sheri Hubbard',         '29', date '2026-06-23', date '2026-06-24', null::time,   'Matt meyers Luke bolan Kane groom',  null::text[],            '{"res":"68413","channel":"Phone","guest_raw":"Sheri Hubbard (Astec)","rooms":"29 Queen: 6/23/2026","rooms_full":"33 Queen: 6/22/2026-6/23/2026, 31 Queen: 6/22/2026-6/23/2026, 29 Queen: 6/23/2026","total":"$690.65","note":"Matt meyers Luke bolan Kane groom"}'::jsonb),
  ('rx-68407-32', 'Owen Walters',          '32', date '2026-06-22', date '2026-06-24', null::time,   null::text,                           null::text[],            '{"res":"68407","channel":"Phone","guest_raw":"Owen Walters","rooms":"32 Double: 6/22/2026-6/23/2026","total":"$298.36"}'::jsonb),
  -- Arrivals today (arrival_date = 2026-06-24)
  ('rx-67912-29', 'Jim & Julie Brodtmann', '29', date '2026-06-24', date '2026-06-25', null::time,   'WIFES NAME IS JUILE',                array['$80 rate'],       '{"res":"67912","channel":"Phone","guest_raw":"Jim & Julie Brodtmann ($80 rate)","rooms":"29 Queen: 6/24/2026","total":"$88.40","rate_note":"$80 rate","preferences":"WIFES NAME IS JUILE"}'::jsonb),
  ('rx-68271-23', 'Michele Peterson',      '23', date '2026-06-24', date '2026-06-25', time '14:00', null::text,                           null::text[],            '{"res":"68271","channel":"Online","guest_raw":"Michele Peterson","rooms":"23 Queen: 6/24/2026","total":"$138.13"}'::jsonb),
  -- Stayovers today (arrival < 2026-06-24 < departure)
  ('rx-67345-35', 'Mary Charmoli',         '35', date '2026-06-22', date '2026-07-03', null::time,   'Long stay; moved from room 21 (departed 6/17); current room-35 segment 6/22-7/2', null::text[], '{"res":"67345","channel":"Phone","guest_raw":"Mary Charmoli","rooms":"35 Queen: 6/22/2026-7/2/2026","rooms_full":"35 Queen: 6/22/2026-7/2/2026, 7/6/2026-8/31/2026, 21 Queen: 6/1/2026-6/17/2026","total":"$4,250.00","note":"long stay, room change 21->35"}'::jsonb),
  ('rx-68368-28', 'Josh Coenen',           '28', date '2026-06-21', date '2026-06-25', null::time,   'get email again 7403 run this card', null::text[],            '{"res":"68368","channel":"Phone","guest_raw":"Josh Coenen","rooms":"28 Double : 6/21/2026-6/24/2026","total":"$419.92","preferences":"Folios@clclodging.com","note":"get email again 7403 run this card"}'::jsonb),
  ('rx-67903-39', 'Tamzid Bin Mafiz',      '39', date '2026-06-21', date '2026-06-25', null::time,   'dog in 42 please leave here',        array['$55 a night'],    '{"res":"67903","channel":"Phone","guest_raw":"Tamzid Bin Mafiz, *** ($55 a night)","rooms":"39 Queen: 6/21/2026-6/24/2026","total":"$243.12","rate_note":"$55 a night","note":"dog in 42 please leave here"}'::jsonb),
  ('rx-67996-37', 'Steve Beckett',         '37', date '2026-06-22', date '2026-06-26', null::time,   'use card ending is 9838',            null::text[],            '{"res":"67996","channel":"Phone","guest_raw":"Steve Beckett","rooms":"37 Queen: 6/22/2026-6/25/2026","total":"$397.80","note":"use card ending is 9838"}'::jsonb),
  ('rx-66209-43', 'John Harkness',         '43', date '2026-06-22', date '2026-06-25', null::time,   null::text,                           null::text[],            '{"res":"66209","channel":"Phone","guest_raw":"John (Jack) Harkness","rooms":"43 Two Bedroom Suite with Kitchen: 6/22/2026-6/24/2026","total":"$447.52"}'::jsonb),
  -- Future bookings (arrive 6/26-6/29) — no card today; kept active in the table
  ('rx-67229-38', 'Sherry Quaas',          '38', date '2026-06-26', date '2026-06-28', null::time,   null::text,                           null::text[],            '{"res":"67229","channel":"Phone","guest_raw":"Sherry Quaas","rooms":"38 King Jacuzzi Room: 6/26/2026-6/27/2026","rooms_full":"38 King Jacuzzi Room: 6/26/2026-6/27/2026, 36 Double: 6/27/2026","total":"$524.89"}'::jsonb),
  ('rx-67229-36', 'Sherry Quaas',          '36', date '2026-06-27', date '2026-06-28', null::time,   null::text,                           null::text[],            '{"res":"67229","channel":"Phone","guest_raw":"Sherry Quaas","rooms":"36 Double: 6/27/2026","rooms_full":"38 King Jacuzzi Room: 6/26/2026-6/27/2026, 36 Double: 6/27/2026","total":"$524.89"}'::jsonb),
  ('rx-67238-41', 'Diane Robertson',       '41', date '2026-06-26', date '2026-06-28', null::time,   null::text,                           null::text[],            '{"res":"67238","channel":"Phone","guest_raw":"Diane Robertson","rooms":"41 Queen: 6/26/2026-6/27/2026","total":"$298.36"}'::jsonb),
  ('rx-68288-42', 'Jessica Hackworthy',    '42', date '2026-06-26', date '2026-06-27', null::time,   'Booking.com #6914976822 - Adults 1, Children 1; breakfast included', null::text[], '{"res":"68288","channel":"Direct Connect","guest_raw":"Jessica Hackworthy","rooms":"42 ADA King Jacuzzi Room: 6/26/2026","total":"$209.68","note":"Booking.com booking ID 6914976822; Adults 1 Children 1"}'::jsonb),
  ('rx-65578-34', 'Paul Simonar',          '34', date '2026-06-26', date '2026-06-28', null::time,   null::text,                           null::text[],            '{"res":"65578","channel":"Phone","guest_raw":"Paul Simonar","rooms":"34 Double: 6/26/2026-6/27/2026","total":"$320.46"}'::jsonb),
  ('rx-68402-39', 'John Cejka',            '39', date '2026-06-26', date '2026-06-27', null::time,   null::text,                           null::text[],            '{"res":"68402","channel":"Phone","guest_raw":"John Cejka","rooms":"39 Queen: 6/26/2026","total":"$160.23"}'::jsonb),
  ('rx-67130-29', 'Robert Henderson',      '29', date '2026-06-26', date '2026-06-28', null::time,   null::text,                           null::text[],            '{"res":"67130","channel":"Phone","guest_raw":"Robert Henderson","rooms":"29 Queen: 6/26/2026-6/27/2026","total":"$298.36"}'::jsonb),
  ('rx-65972-31', 'Grace Dunkley',         '31', date '2026-06-26', date '2026-06-28', null::time,   null::text,                           null::text[],            '{"res":"65972","channel":"Phone","guest_raw":"Grace Dunkley","rooms":"31 Queen: 6/26/2026-6/27/2026","total":"$298.36"}'::jsonb),
  ('rx-67762-28', 'Michael Pace',          '28', date '2026-06-26', date '2026-06-28', null::time,   'Booking.com #5879940677 - Adults 2; breakfast included', null::text[],  '{"res":"67762","channel":"Direct Connect","guest_raw":"Michael Pace","rooms":"28 Double : 6/26/2026-6/27/2026","total":"$368.52","note":"Booking.com booking ID 5879940677; Adults 2"}'::jsonb),
  ('rx-65958-27', 'Paige Bates',           '27', date '2026-06-26', date '2026-06-28', null::time,   'Wedding party',                      null::text[],            '{"res":"65958","channel":"Phone","guest_raw":"Paige Bates","rooms":"27 Queen: 6/26/2026-6/27/2026","total":"$298.36","note":"Wedding party"}'::jsonb),
  ('rx-65765-26', 'Lois Rengel',           '26', date '2026-06-26', date '2026-06-28', null::time,   null::text,                           null::text[],            '{"res":"65765","channel":"Phone","guest_raw":"Lois Rengel","rooms":"26 ADA Double Room: 6/26/2026-6/27/2026","rooms_full":"26 ADA Double Room: 6/26/2026-6/27/2026, 32 Double: 6/26/2026-6/27/2026","total":"$640.92"}'::jsonb),
  ('rx-65765-32', 'Lois Rengel',           '32', date '2026-06-26', date '2026-06-28', null::time,   null::text,                           null::text[],            '{"res":"65765","channel":"Phone","guest_raw":"Lois Rengel","rooms":"32 Double: 6/26/2026-6/27/2026","rooms_full":"26 ADA Double Room: 6/26/2026-6/27/2026, 32 Double: 6/26/2026-6/27/2026","total":"$640.92"}'::jsonb),
  ('rx-65811-25', 'Madeline Stilwell',     '25', date '2026-06-26', date '2026-06-28', null::time,   null::text,                           null::text[],            '{"res":"65811","channel":"Phone","guest_raw":"Madeline Stilwell","rooms":"25 Queen: 6/26/2026-6/27/2026","total":"$298.36"}'::jsonb),
  ('rx-64350-43', 'Sonya Swanson',         '43', date '2026-06-26', date '2026-06-28', null::time,   'Wedding; if a double opens please give it to them; Mari Swanson is the bride (suite)', null::text[], '{"res":"64350","channel":"Phone","guest_raw":"Sonya Swanson","rooms":"43 Two Bedroom Suite with Kitchen: 6/26/2026-6/27/2026","rooms_full":"43 Two Bedroom Suite with Kitchen: 6/26/2026-6/27/2026, 22 Double: 6/26/2026-6/27/2026","total":"$716.04","note":"Rachel Feldt / Laura Gillispie may check in; Mari Swanson bride - suite"}'::jsonb),
  ('rx-64350-22', 'Sonya Swanson',         '22', date '2026-06-26', date '2026-06-28', null::time,   'Wedding; if a double opens please give it to them', null::text[], '{"res":"64350","channel":"Phone","guest_raw":"Sonya Swanson","rooms":"22 Double: 6/26/2026-6/27/2026","rooms_full":"43 Two Bedroom Suite with Kitchen: 6/26/2026-6/27/2026, 22 Double: 6/26/2026-6/27/2026","total":"$716.04"}'::jsonb),
  ('rx-65720-33', 'Jeffery Allen',         '33', date '2026-06-26', date '2026-06-28', null::time,   'Would like a double if one opens (wedding)', null::text[],      '{"res":"65720","channel":"Phone","guest_raw":"Jeffery Allen","rooms":"33 Queen: 6/26/2026-6/27/2026","total":"$298.36","note":"would like a double if one goes available here for wedding"}'::jsonb),
  ('rx-65898-37', 'Lindsey Dahl',          '37', date '2026-06-26', date '2026-06-28', null::time,   null::text,                           null::text[],            '{"res":"65898","channel":"Phone","guest_raw":"Lindsey Dahl","rooms":"37 Queen: 6/26/2026-6/27/2026","rooms_full":"37 Queen: 6/26/2026-6/27/2026, 21 Queen: 6/26/2026-6/27/2026","total":"$596.72"}'::jsonb),
  ('rx-65898-21', 'Lindsey Dahl',          '21', date '2026-06-26', date '2026-06-28', null::time,   null::text,                           null::text[],            '{"res":"65898","channel":"Phone","guest_raw":"Lindsey Dahl","rooms":"21 Queen: 6/26/2026-6/27/2026","rooms_full":"37 Queen: 6/26/2026-6/27/2026, 21 Queen: 6/26/2026-6/27/2026","total":"$596.72"}'::jsonb),
  ('rx-67733-24', 'Hillary Drake',         '24', date '2026-06-26', date '2026-06-28', time '17:00', null::text,                           null::text[],            '{"res":"67733","channel":"Direct Connect","guest_raw":"Hillary Drake","rooms":"24 Double: 6/26/2026-6/27/2026","rooms_full":"24 Double: 6/26/2026-6/27/2026, 23 Queen: 6/26/2026-6/27/2026","total":"$618.82"}'::jsonb),
  ('rx-67733-23', 'Hillary Drake',         '23', date '2026-06-26', date '2026-06-28', time '17:00', null::text,                           null::text[],            '{"res":"67733","channel":"Direct Connect","guest_raw":"Hillary Drake","rooms":"23 Queen: 6/26/2026-6/27/2026","rooms_full":"24 Double: 6/26/2026-6/27/2026, 23 Queen: 6/26/2026-6/27/2026","total":"$618.82"}'::jsonb),
  ('rx-65907-42', 'Mari Swanson',          '42', date '2026-06-27', date '2026-06-28', null::time,   'Bride',                              null::text[],            '{"res":"65907","channel":"Phone","guest_raw":"Mari Swanson","rooms":"42 ADA King Jacuzzi Room: 6/27/2026","total":"$193.38","note":"Bride"}'::jsonb),
  ('rx-67412-39', 'Sean Ferraro',          '39', date '2026-06-27', date '2026-06-28', time '14:00', null::text,                           null::text[],            '{"res":"67412","channel":"Online","guest_raw":"Sean Ferraro","rooms":"39 Queen: 6/27/2026","total":"$149.18"}'::jsonb),
  ('rx-67327-38', 'Wisconsin DNR',         '38', date '2026-06-28', date '2026-07-31', null::time,   'Jared Way; paying with a different card', null::text[],         '{"res":"67327","channel":"Phone","guest_raw":"Wisconsin DNR","rooms":"38 King Jacuzzi Room: 6/28/2026-7/30/2026","total":"$2,475.00","note":"Jared Way he will be paying with different card"}'::jsonb),
  ('rx-68369-24', 'Josh Coenen',           '24', date '2026-06-28', date '2026-07-02', null::time,   'run card 5553',                      null::text[],            '{"res":"68369","channel":"Phone","guest_raw":"Josh Coenen","rooms":"24 Double: 6/28/2026-7/1/2026","total":"$419.92","note":"run card 5553"}'::jsonb),
  ('rx-67267-23', 'Tom Mackey',            '23', date '2026-06-28', date '2026-06-30', null::time,   'Coach',                              null::text[],            '{"res":"67267","channel":"Phone","guest_raw":"Tom Mackey, *** (Coach!)","rooms":"23 Queen: 6/28/2026-6/29/2026","total":"$110.50","note":"Coach"}'::jsonb),
  ('rx-67997-37', 'Steve Beckett',         '37', date '2026-06-29', date '2026-07-02', null::time,   'use card ending in 2441',            null::text[],            '{"res":"67997","channel":"Phone","guest_raw":"Steve Beckett","rooms":"37 Queen: 6/29/2026-7/1/2026","total":"$298.35","note":"use card ending in 2441"}'::jsonb),
  ('rx-67937-27', 'William T. Boehm',      '27', date '2026-06-29', date '2026-07-01', time '14:00', null::text,                           null::text[],            '{"res":"67937","channel":"Online","guest_raw":"William T. Boehm","rooms":"27 Queen: 6/29/2026-6/30/2026","total":"$276.26"}'::jsonb)
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
-- 2. Retire reservations that DROPPED OUT of today's file (incl. the entire
--    6-04 set + Charmoli's old rooms 21/23). Keep the row for history; move
--    status out of (confirmed, arrived). departed = already checked out;
--    cancelled = was still future and disappeared.
-- =========================================================================
update public.reservations
set status = case when departure_date < current_date then 'departed' else 'cancelled' end
where external_id like 'rx-%'
  and status in ('confirmed', 'arrived')
  and external_id not in (
    'rx-67266-27','rx-68413-33','rx-68413-31','rx-68413-29','rx-68407-32',
    'rx-67912-29','rx-68271-23','rx-67345-35','rx-68368-28','rx-67903-39',
    'rx-67996-37','rx-66209-43','rx-67229-38','rx-67229-36','rx-67238-41',
    'rx-68288-42','rx-65578-34','rx-68402-39','rx-67130-29','rx-65972-31',
    'rx-67762-28','rx-65958-27','rx-65765-26','rx-65765-32','rx-65811-25',
    'rx-64350-43','rx-64350-22','rx-65720-33','rx-65898-37','rx-65898-21',
    'rx-67733-24','rx-67733-23','rx-65907-42','rx-67412-39','rx-67327-38',
    'rx-68369-24','rx-67267-23','rx-67997-37','rx-67937-27'
  );

-- =========================================================================
-- 3. Rebuild today's channel-manager cards (source='pms') for current_date.
--    SPARE any card that still has an open maintenance issue. Manual
--    (source='manual') cards are never touched.
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
-- Verification (run after applying — expect departures 5 / arrivals 2 /
-- stayovers 5 on 2026-06-24):
-- =========================================================================
-- select context->>'staff_home_bucket' as bucket, count(*)
--   from public.tasks where source='pms' group by 1 order by 1;
--   -- expect: arrivals 2, departures 5, dailys 1, eod 1, stayovers 5, start_of_day 1
-- select status, count(*) from public.reservations group by 1 order by 1;
