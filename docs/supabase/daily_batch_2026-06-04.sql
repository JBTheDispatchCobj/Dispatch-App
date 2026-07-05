-- docs/supabase/daily_batch_2026-06-04.sql
--
-- DAILY MORNING BATCH — run top-to-bottom in the Supabase SQL editor, once each
-- morning BEFORE Angie clocks in. Idempotent: re-running lands the same state.
--
-- What it does (the reservation reconciliation Bryan specced on Day 56):
--   1. Upserts today's channel-manager reservations (the 6-4 export — 28 Block A
--      rows -> 29 reservation rows; Mary Charmoli #67345 splits into rooms 21+23).
--      Changed reservations update in place (e.g. Angie Aviles #67831 total
--      corrected to $554.46; Thomas Updyke #67790 to $278.62).
--   2. Retires any reservation that DROPPED OUT of today's file — keeps the
--      guest row on the backend but flips status so it can no longer push a
--      card. departed if it already checked out, cancelled if it was a future
--      booking that disappeared. NOTE: two room changes since 6-2 retire their
--      old room-keyed rows here: Jim & Julie Brodtmann #67895 (rm31 -> rm33) and
--      Tamzid #66943 (rm39 -> rm38); the old rx-67895-31 / rx-66943-39 rows are
--      not in today's keep-list, so they retire while the new rooms upsert fresh.
--   3. Rebuilds the channel-manager cards for TODAY from current_date. SPARES any
--      card that still has an OPEN maintenance issue and leaves manual
--      (source='manual') cards untouched.
--   4. Resets the standing SOD / Dailys / EOD cards fresh for the day.
--
-- SAFE-DELETE NOTE: task_events / notes / comments cascade-delete with a card,
-- so the daily rebuild does NOT preserve the execution history of *completed*
-- cards (acceptable for beta). It DOES preserve open maintenance issues by
-- sparing their card. Deep Clean history is on-delete-set-null, so the monthly
-- rotation is never reset by a rebuild.
--
-- NOTE ON CATCH-UP DAYS: the last batch run was 5-26; everything since is
-- reconciled by this run because the SQL is date-relative to current_date and
-- this 6-4 export is the current photo of the books. The 6-2 batch in the
-- series is file-only; do NOT run it today.
--
-- TO REUSE NEXT MORNING: replace Section 1's VALUES with the new export and
-- replace Section 2's external_id list with that same set; Sections 3-4 are
-- date-relative and need no edits. Run on the day the file represents.

-- =========================================================================
-- 1. Upsert today's reservations (6-4 channel-manager export — 29 rows).
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
  ('rx-67836-23', 'Jerrett Haag',          '23', date '2026-05-31', date '2026-06-05', null::time,   'Dont charge yet - confused about the discount - talk to Courtney', null::text[], '{"res":"67836","channel":"Phone","guest_raw":"Jerrett Haag, ***","rooms":"23 Queen: 5/31/2026-6/4/2026","total":"$359.15","note":"Dont charge yet - confused about the discount - talk to Courtney"}'::jsonb),
  ('rx-67828-39', 'Tyler Sauer',           '39', date '2026-05-31', date '2026-06-05', null::time,   null::text,                                                    null::text[],           '{"res":"67828","channel":"Phone","guest_raw":"Tyler Sauer, ***","rooms":"39 Queen: 5/31/2026-6/4/2026","total":"$359.15"}'::jsonb),
  ('rx-66853-38', 'Douglas Schulte',       '38', date '2026-05-31', date '2026-06-06', time '18:30', null::text,                                                    null::text[],           '{"res":"66853","channel":"Phone","guest_raw":"Douglas Schulte","rooms":"38 King Jacuzzi Room: 5/31/2026-6/5/2026","total":"$663.00"}'::jsonb),
  ('rx-67345-21', 'Mary Charmoli',         '21', date '2026-06-01', date '2026-07-03', null::time,   null::text,                                                    null::text[],           '{"res":"67345","channel":"Phone","guest_raw":"Mary Charmoli","rooms":"21 Queen: 6/1/2026-6/19/2026, 6/21/2026-7/2/2026","rooms_full":"23 Queen: 7/6/2026-7/30/2026, 21 Queen: 6/1/2026-6/19/2026, 6/21/2026-7/2/2026","total":"$2,800.00","note":"long stay, room change 21->23 midway - verify"}'::jsonb),
  ('rx-67345-23', 'Mary Charmoli',         '23', date '2026-07-06', date '2026-07-31', null::time,   null::text,                                                    null::text[],           '{"res":"67345","channel":"Phone","guest_raw":"Mary Charmoli","rooms":"23 Queen: 7/6/2026-7/30/2026","rooms_full":"23 Queen: 7/6/2026-7/30/2026, 21 Queen: 6/1/2026-6/19/2026, 6/21/2026-7/2/2026","total":"$2,800.00","note":"long stay, room change 21->23 midway - verify"}'::jsonb),
  ('rx-67831-42', 'Angie Aviles',          '42', date '2026-06-01', date '2026-06-05', null::time,   null::text,                                                    null::text[],           '{"res":"67831","channel":"Phone","guest_raw":"Angie Aviles, ***","rooms":"42 ADA King Jacuzzi Room: 6/1/2026-6/4/2026","total":"$554.46"}'::jsonb),
  ('rx-67883-24', 'Tom Andres',            '24', date '2026-06-01', date '2026-06-04', null::time,   null::text,                                                    array['Commercial Rate'],'{"res":"67883","channel":"Phone","guest_raw":"Tom Andres (Commercial Rate)","rooms":"24 Double: 6/1/2026-6/3/2026","total":"$314.94","rate_note":"Commercial Rate"}'::jsonb),
  ('rx-67861-25', 'Jason Schneiderman',    '25', date '2026-06-01', date '2026-06-05', null::time,   'here with jerett',                                            null::text[],           '{"res":"67861","channel":"Phone","guest_raw":"Jason Schneiderman","rooms":"25 Queen: 6/1/2026-6/4/2026","total":"$287.32","note":"here with jerett"}'::jsonb),
  ('rx-67833-37', 'Kyle Sigman',           '37', date '2026-06-01', date '2026-06-05', null::time,   null::text,                                                    null::text[],           '{"res":"67833","channel":"Phone","guest_raw":"Kyle Sigman","rooms":"37 Queen: 6/1/2026-6/4/2026","total":"$552.52"}'::jsonb),
  ('rx-67832-35', 'Rhia Brothag',          '35', date '2026-06-01', date '2026-06-05', null::time,   null::text,                                                    null::text[],           '{"res":"67832","channel":"Phone","guest_raw":"Rhia Brothag, ***","rooms":"35 Queen: 6/1/2026-6/4/2026","total":"$552.52","preferences":"rbrothag@process-technology.com"}'::jsonb),
  ('rx-67329-29', 'Tim Moore',             '29', date '2026-06-01', date '2026-06-04', time '17:00', null::text,                                                    null::text[],           '{"res":"67329","channel":"Online","guest_raw":"Tim Moore","rooms":"29 Queen: 6/1/2026-6/3/2026","total":"$414.39"}'::jsonb),
  ('rx-67790-28', 'Thomas Updyke',         '28', date '2026-06-02', date '2026-06-04', null::time,   'May have dog, double check. Told them fee would be $15/day if they do. Referred them to https://www.blueruff.com/ for pet boarding otherwise. It is him and his mom.', null::text[], '{"res":"67790","channel":"Phone","guest_raw":"Thomas Updyke","rooms":"28 Double : 6/2/2026-6/3/2026","total":"$278.62","note":"May have dog, double check. Told them fee would be $15/day if they do. Referred them to https://www.blueruff.com/ for pet boarding otherwise. It is him and his mom."}'::jsonb),
  ('rx-67895-33', 'Jim & Julie Brodtmann', '33', date '2026-06-03', date '2026-06-04', null::time,   'WIFES NAME IS JUILE',                                         array['$80 rate'],      '{"res":"67895","channel":"Phone","guest_raw":"Jim & Julie Brodtmann ($80 rate)","rooms":"33 Queen: 6/3/2026","total":"$88.40","rate_note":"$80 rate","preferences":"WIFES NAME IS JUILE"}'::jsonb),
  ('rx-67941-33', 'Charles Kriett',        '33', date '2026-06-04', date '2026-06-06', null::time,   null::text,                                                    null::text[],           '{"res":"67941","channel":"Phone","guest_raw":"Charles Kriett","rooms":"33 Queen: 6/4/2026-6/5/2026","total":"$288.62"}'::jsonb),
  ('rx-67939-29', 'Rebecca Peters',        '29', date '2026-06-04', date '2026-06-05', null::time,   null::text,                                                    null::text[],           '{"res":"67939","channel":"Phone","guest_raw":"Rebecca Peters","rooms":"29 Queen: 6/4/2026","total":"$138.13"}'::jsonb),
  ('rx-67774-27', 'Clear lake Library',    '27', date '2026-06-04', date '2026-06-05', null::time,   'shauna peterson booked terry visger staying',                 null::text[],           '{"res":"67774","channel":"Phone","guest_raw":"Clear lake Library","rooms":"27 Queen: 6/4/2026","total":"$110.00","note":"shauna peterson booked terry visger staying","preferences":"Tax Exempt ID: 047745"}'::jsonb),
  ('rx-65583-41', 'Linda Charlet',         '41', date '2026-06-05', date '2026-06-06', null::time,   null::text,                                                    null::text[],           '{"res":"65583","channel":"Phone","guest_raw":"Linda Charlet","rooms":"41 Queen: 6/5/2026","total":"$149.18"}'::jsonb),
  ('rx-67524-32', 'Susan Szuster',         '32', date '2026-06-05', date '2026-06-06', null::time,   null::text,                                                    null::text[],           '{"res":"67524","channel":"Phone","guest_raw":"Susan Szuster","rooms":"32 Double: 6/5/2026","total":"$160.23"}'::jsonb),
  ('rx-67755-42', 'Dustin Johnson',        '42', date '2026-06-06', date '2026-06-07', null::time,   null::text,                                                    null::text[],           '{"res":"67755","channel":"Direct Connect","guest_raw":"Dustin Johnson","rooms":"42 ADA King Jacuzzi Room: 6/6/2026","total":"$209.68"}'::jsonb),
  ('rx-66825-24', 'Annie Anderson',        '24', date '2026-06-06', date '2026-06-07', null::time,   'Guest is Pastor Michael Brandt is the guest',                 null::text[],           '{"res":"66825","channel":"Phone","guest_raw":"Annie Anderson (Amery Free Lutheran church)","rooms":"24 Double: 6/6/2026","total":"$130.50","note":"Guest is Pastor Michael Brandt is the guest","preferences":"Annie is a representative of the church - she will book for other people - put the guest name in the notes - Tax exempt 008-0000056287-04"}'::jsonb),
  ('rx-67757-23', 'Kurowski Clifford',     '23', date '2026-06-06', date '2026-06-07', null::time,   null::text,                                                    null::text[],           '{"res":"67757","channel":"Direct Connect","guest_raw":"Kurowski Clifford","rooms":"23 Queen: 6/6/2026","total":"$171.55"}'::jsonb),
  ('rx-66943-38', 'Tamzid Bin Mafiz',     '38', date '2026-06-07', date '2026-06-11', null::time,   null::text,                                                    array['$55 a night'],   '{"res":"66943","channel":"Phone","guest_raw":"Tamzid Bin Mafiz, *** ($55 a night)","rooms":"38 King Jacuzzi Room: 6/7/2026-6/10/2026","total":"$243.12","rate_note":"$55 a night"}'::jsonb),
  ('rx-67264-23', 'Tom Mackey',            '23', date '2026-06-07', date '2026-06-09', null::time,   'Coach',                                                       null::text[],           '{"res":"67264","channel":"Phone","guest_raw":"Tom Mackey, *** (Coach!)","rooms":"23 Queen: 6/7/2026-6/8/2026","total":"$287.31","note":"Coach"}'::jsonb),
  ('rx-67482-41', 'Jerome CORRIGAN',       '41', date '2026-06-07', date '2026-06-10', null::time,   null::text,                                                    null::text[],           '{"res":"67482","channel":"Phone","guest_raw":"Jerome CORRIGAN","rooms":"41 Queen: 6/7/2026-6/9/2026","total":"$402.78"}'::jsonb),
  ('rx-67681-33', 'Samuel Lattin',         '33', date '2026-06-07', date '2026-06-10', time '16:00', null::text,                                                    null::text[],           '{"res":"67681","channel":"Direct Connect","guest_raw":"Samuel Lattin","rooms":"33 Queen: 6/7/2026-6/9/2026","total":"$425.44"}'::jsonb),
  ('rx-67944-35', 'Cody Scanlin',          '35', date '2026-06-07', date '2026-06-12', time '17:00', null::text,                                                    null::text[],           '{"res":"67944","channel":"Online","guest_raw":"Cody Scanlin","rooms":"35 Queen: 6/7/2026-6/11/2026","total":"$701.70"}'::jsonb),
  ('rx-67943-25', 'Shane Woods',           '25', date '2026-06-07', date '2026-06-12', time '17:00', null::text,                                                    null::text[],           '{"res":"67943","channel":"Online","guest_raw":"Shane Woods","rooms":"25 Queen: 6/7/2026-6/11/2026","total":"$701.70"}'::jsonb),
  ('rx-67472-31', 'Mike Wagner',           '31', date '2026-06-09', date '2026-06-15', null::time,   null::text,                                                    null::text[],           '{"res":"67472","channel":"Phone","guest_raw":"Mike Wagner, *** (TRB AUTO)","rooms":"31 Queen: 6/9/2026-6/14/2026","total":"$861.93"}'::jsonb),
  ('rx-67910-29', 'Jim & Julie Brodtmann', '29', date '2026-06-10', date '2026-06-11', null::time,   'WIFES NAME IS JUILE',                                         array['$80 rate'],      '{"res":"67910","channel":"Phone","guest_raw":"Jim & Julie Brodtmann ($80 rate)","rooms":"29 Queen: 6/10/2026","total":"$88.40","rate_note":"$80 rate","preferences":"WIFES NAME IS JUILE"}'::jsonb)
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
    'rx-67836-23','rx-67828-39','rx-66853-38','rx-67345-21','rx-67345-23',
    'rx-67831-42','rx-67883-24','rx-67861-25','rx-67833-37','rx-67832-35',
    'rx-67329-29','rx-67790-28','rx-67895-33','rx-67941-33','rx-67939-29',
    'rx-67774-27','rx-65583-41','rx-67524-32','rx-67755-42','rx-66825-24',
    'rx-67757-23','rx-66943-38','rx-67264-23','rx-67482-41','rx-67681-33',
    'rx-67944-35','rx-67943-25','rx-67472-31','rx-67910-29'
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
-- Verification (run after applying — expect departures 4 / arrivals 3 /
-- stayovers 8 on 2026-06-04):
-- =========================================================================
-- select context->>'staff_home_bucket' as bucket, count(*)
--   from public.tasks where source='pms' group by 1 order by 1;
--   -- expect: arrivals 3, departures 4, dailys 1, eod 1, stayovers 8, start_of_day 1
-- select count(*) from public.reservations where external_id like 'rx-%';      -- total kept (incl. retired)
-- select status, count(*) from public.reservations group by 1 order by 1;      -- see departed/cancelled retirements
