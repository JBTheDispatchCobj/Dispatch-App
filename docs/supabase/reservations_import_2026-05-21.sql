-- docs/supabase/reservations_import_2026-05-21.sql
--
-- ResNexus channel-manager import — daily reservations push.
-- Source: uploaded "channel manager - Sheet1.csv" (Block A — Reservation details).
-- Rules: docs/kb (ResNexus CSV interpretation rules) — Block A is the
-- authoritative source; one reservation row per room per stay.
--
-- Idempotent: upsert on external_id = 'rx-<Res#>-<room>'. Re-running this file
-- (or a refreshed export) updates in place, never duplicates.
--
-- status is computed at run time from current_date: arrived if arrival_date has
-- passed, else confirmed (brief queries filter on confirmed/arrived).
--
-- NOT in this file (open items — see report to Bryan):
--   * Housekeeping task cards (departures/arrivals/stayovers assigned to Angie):
--     the rules scope this import to `reservations`; card generation is a
--     separate chase and needs Angie's staff_id confirmed.
--   * Reconciliation of stale demo reservations (older seeds) is NOT done here
--     (rules: confirm any cancel/delete path with Bryan first).
--   * Grid (Block B) codes: room 35 B (block 5/22–5/26), future X marks — not
--     reservations, intentionally omitted.
--
-- Run order: after reservations_br1.sql.

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
  ('rx-67306-39', 'Tyler Sauer',          '39', date '2026-05-17', date '2026-05-22', null::time,        null::text,        null::text[],            '{"res":"67306","channel":"Phone","guest_raw":"Tyler Sauer, ***","rooms":"39 Queen: 5/17/2026-5/21/2026","total":"$359.15"}'::jsonb),
  ('rx-67305-33', 'Jerrett Haag',         '33', date '2026-05-17', date '2026-05-22', null::time,        null::text,        null::text[],            '{"res":"67305","channel":"Phone","guest_raw":"Jerrett Haag, ***","rooms":"33 Queen: 5/17/2026-5/21/2026","total":"$255.35"}'::jsonb),
  ('rx-67112-41', 'Tamzid Bin Mafiz',     '41', date '2026-05-17', date '2026-05-21', null::time,        null::text,        array['$55 a night'],    '{"res":"67112","channel":"Phone","guest_raw":"Tamzid Bin Mafiz, *** ($55 a night)","rooms":"41 Queen: 5/17/2026-5/20/2026","total":"$243.12","rate_note":"$55 a night"}'::jsonb),
  ('rx-67290-21', 'Rhia Brothag',         '21', date '2026-05-18', date '2026-05-22', null::time,        null::text,        null::text[],            '{"res":"67290","channel":"Phone","guest_raw":"Rhia Brothag, ***","rooms":"21 Queen: 5/18/2026-5/21/2026","total":"$552.52"}'::jsonb),
  ('rx-67291-23', 'Angie Aviles',         '23', date '2026-05-18', date '2026-05-22', null::time,        null::text,        null::text[],            '{"res":"67291","channel":"Phone","guest_raw":"Angie Aviles, ***","rooms":"23 Queen: 5/18/2026-5/21/2026","total":"$552.52"}'::jsonb),
  ('rx-67292-25', 'Lena Gray',            '25', date '2026-05-18', date '2026-05-22', null::time,        null::text,        null::text[],            '{"res":"67292","channel":"Phone","guest_raw":"Lena Gray","rooms":"25 Queen: 5/18/2026-5/21/2026","total":"$552.52"}'::jsonb),
  ('rx-67307-27', 'Travis Campton',       '27', date '2026-05-18', date '2026-05-22', null::time,        null::text,        null::text[],            '{"res":"67307","channel":"Phone","guest_raw":"Travis Campton, ***","rooms":"27 Queen: 5/18/2026-5/21/2026","total":"$287.32"}'::jsonb),
  ('rx-67637-28', 'Clifford Roers',       '28', date '2026-05-19', date '2026-05-21', null::time,        null::text,        null::text[],            '{"res":"67637","channel":"Phone","guest_raw":"Clifford Roers","rooms":"28 Double : 5/19/2026-5/20/2026","total":"$275.99"}'::jsonb),
  ('rx-67646-22', 'Amanda Bergan',        '22', date '2026-05-20', date '2026-05-21', null::time,        null::text,        null::text[],            '{"res":"67646","channel":"Phone","guest_raw":"Amanda Bergan","rooms":"22 Double: 5/20/2026","total":"$138.13"}'::jsonb),
  ('rx-67600-37', 'Kanwar Chawla',        '37', date '2026-05-20', date '2026-05-22', time '17:00',      null::text,        null::text[],            '{"res":"67600","channel":"Direct Connect","guest_raw":"Kanwar Chawla","rooms":"37 Queen: 5/20/2026-5/21/2026","total":"$276.26"}'::jsonb),
  ('rx-67655-31', 'Karen Smith',          '31', date '2026-05-20', date '2026-05-21', time '17:00',      null::text,        null::text[],            '{"res":"67655","channel":"Online","guest_raw":"Karen Smith","rooms":"31 Queen: 5/20/2026","total":"$138.13"}'::jsonb),
  ('rx-67158-29', 'Cheryl Moskal',        '29', date '2026-05-21', date '2026-05-26', null::time,        'Plain oatmeal',   array['Plain oatmeal'],  '{"res":"67158","channel":"Phone","guest_raw":"Cheryl Moskal","rooms":"29 Queen: 5/21/2026-5/25/2026","total":"$635.40","preferences":"Plain oatmeal"}'::jsonb),
  ('rx-67342-26', 'Albert Bengtson',      '26', date '2026-05-22', date '2026-05-25', null::time,        null::text,        null::text[],            '{"res":"67342","channel":"Phone","guest_raw":"Albert Bengtson","rooms":"26 ADA Double Room: 5/22/2026-5/24/2026","total":"$331.50"}'::jsonb),
  ('rx-67343-22', 'Kathie Boniface',      '22', date '2026-05-22', date '2026-05-24', null::time,        null::text,        null::text[],            '{"res":"67343","channel":"Phone","guest_raw":"Kathie Boniface","rooms":"22 Double: 5/22/2026-5/23/2026","total":"$243.10"}'::jsonb),
  ('rx-66972-27', 'Larry & Marge Calvert','27', date '2026-05-24', date '2026-05-28', null::time,        null::text,        null::text[],            '{"res":"66972","channel":"Phone","guest_raw":"Larry & Marge Calvert","rooms":"27 Queen: 5/24/2026-5/27/2026","total":"$596.72"}'::jsonb),
  ('rx-67610-37', 'Jerrett Haag',         '37', date '2026-05-24', date '2026-05-28', null::time,        null::text,        null::text[],            '{"res":"67610","channel":"Phone","guest_raw":"Jerrett Haag, ***","rooms":"37 Queen: 5/24/2026-5/27/2026","total":"$287.32"}'::jsonb),
  ('rx-67172-28', 'Mary Hauschen',        '28', date '2026-05-24', date '2026-05-25', time '14:00',      null::text,        null::text[],            '{"res":"67172","channel":"Online","guest_raw":"Mary Hauschen","rooms":"28 Double : 5/24/2026","total":"$221.00"}'::jsonb),
  ('rx-67308-38', 'Tamzid Bin Mafiz',     '38', date '2026-05-25', date '2026-05-28', null::time,        null::text,        array['$55 a night'],    '{"res":"67308","channel":"Phone","guest_raw":"Tamzid Bin Mafiz, *** ($55 a night)","rooms":"38 King Jacuzzi Room: 5/25/2026-5/27/2026","total":"$182.31","rate_note":"$55 a night"}'::jsonb),
  ('rx-67609-39', 'Tyler Sauer',          '39', date '2026-05-25', date '2026-05-29', null::time,        null::text,        null::text[],            '{"res":"67609","channel":"Phone","guest_raw":"Tyler Sauer, ***","rooms":"39 Queen: 5/25/2026-5/28/2026","total":"$287.32"}'::jsonb),
  ('rx-67599-33', 'Travis Campton',       '33', date '2026-05-26', date '2026-05-29', null::time,        null::text,        null::text[],            '{"res":"67599","channel":"Phone","guest_raw":"Travis Campton, ***","rooms":"33 Queen: 5/26/2026-5/28/2026","total":"$215.49"}'::jsonb),
  ('rx-66850-41', 'Susan Meade',          '41', date '2026-05-27', date '2026-05-31', null::time,        null::text,        null::text[],            '{"res":"66850","channel":"Phone","guest_raw":"Susan Meade","rooms":"41 Queen: 5/27/2026-5/30/2026","total":"$517.14"}'::jsonb)
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

-- Verification (run after applying):
-- Expect 21 channel-manager rows:
--   select count(*) from public.reservations where external_id like 'rx-%';
-- Today's brief (run on 2026-05-21) — expect arrivals 1, departures 4, stayovers 7:
--   select count(*) from public.reservations
--     where status in ('confirmed','arrived') and arrival_date = current_date;          -- arrivals
--   select count(*) from public.reservations
--     where status in ('confirmed','arrived') and departure_date = current_date;        -- departures
--   select count(*) from public.reservations
--     where status in ('confirmed','arrived')
--       and arrival_date < current_date and departure_date > current_date;              -- stayovers
