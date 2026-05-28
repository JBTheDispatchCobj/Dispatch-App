-- docs/supabase/reservations_import_2026-05-28.sql
--
-- ResNexus channel-manager import — snapshot 2026-05-28 (daily push). Subsumes 5-27 where rows changed.
-- Source: uploaded "channel manager 05-28 - Sheet1.csv" (Block A — Reservation details).
-- Rules: docs/csv-import-interpretation.md.
--
-- Idempotent: upsert on external_id = 'rx-<Res#>-<room>'. Multi-segment reservations
-- (group bookings, split stays) get one row per (room, contiguous date range); the
-- 21 Queen split-stay for res 67345 uses the 'a' / 'b' suffix to disambiguate.
-- Re-running this file (or a refreshed export) updates in place, never duplicates.
--
-- status is computed at run time from current_date: arrived if arrival_date has
-- passed, else confirmed (brief queries filter on confirmed/arrived).

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
  ('rx-66972-27', 'Larry & Marge Calvert', '27', date '2026-05-24', date '2026-05-28', null::time, null::text, null::text[], '{"res": "66972", "channel": "Phone", "guest_raw": "Larry & Marge Calvert", "rooms": "27 Queen: 5/24/2026-5/27/2026", "total": "$596.72", "paid": "$596.72", "reserved_on": "4/15/2026", "phone": "405.596.8087", "email": "marge_calvert@hotmail.com"}'::jsonb),
  ('rx-67609-39', 'Tyler Sauer', '39', date '2026-05-25', date '2026-05-29', null::time, null::text, null::text[], '{"res": "67609", "channel": "Phone", "guest_raw": "Tyler Sauer, ***", "rooms": "39 Queen: 5/25/2026-5/28/2026", "total": "$288.43", "paid": "$287.32", "reserved_on": "5/18/2026", "phone": "507.450.9866"}'::jsonb),
  ('rx-67308-38', 'Tamzid Bin Mafiz', '38', date '2026-05-25', date '2026-05-28', null::time, null::text, array['$55 a night']::text[], '{"res": "67308", "channel": "Phone", "guest_raw": "Tamzid Bin Mafiz, *** ($55 a night)", "rooms": "38 King Jacuzzi Room: 5/25/2026-5/27/2026", "total": "$182.31", "paid": "$182.31", "rate_note": "$55 a night", "reserved_on": "5/5/2026", "phone": "651.307.6676", "email": "tamzidm@gmail.com"}'::jsonb),
  ('rx-67610-37', 'Jerrett Haag', '37', date '2026-05-25', date '2026-05-29', null::time, null::text, null::text[], '{"res": "67610", "channel": "Phone", "guest_raw": "Jerrett Haag, ***", "rooms": "37 Queen: 5/25/2026-5/28/2026", "total": "$287.32", "paid": "$287.32", "reserved_on": "5/18/2026", "phone": "608.799.2280"}'::jsonb),
  ('rx-67690-43', 'Michael Gray', '43', date '2026-05-26', date '2026-05-29', null::time, null::text, null::text[], '{"res": "67690", "channel": "Phone", "guest_raw": "Michael Gray, ***", "rooms": "43 Two Bedroom Suite with Kitchen: 5/26/2026-5/28/2026", "total": "$497.25", "paid": "$497.25", "reserved_on": "5/22/2026", "phone": "440.339.9232", "email": "mgray@process-technology.com"}'::jsonb),
  ('rx-67748-41', 'Sandra Rohwer', '41', date '2026-05-26', date '2026-05-28', null::time, null::text, null::text[], '{"res": "67748", "channel": "Phone", "guest_raw": "Sandra Rohwer", "rooms": "41 Queen: 5/26/2026-5/27/2026", "total": "$276.26", "paid": "$276.26", "reserved_on": "5/26/2026", "phone": "218.929.0773"}'::jsonb),
  ('rx-67599-25', 'Travis Campton', '25', date '2026-05-26', date '2026-05-29', null::time, null::text, null::text[], '{"res": "67599", "channel": "Phone", "guest_raw": "Travis Campton, ***", "rooms": "25 Queen: 5/26/2026-5/28/2026", "total": "$215.49", "paid": "$215.49", "reserved_on": "5/18/2026", "phone": "608.343.8835"}'::jsonb),
  ('rx-67670-42', 'Lisa Glaus', '42', date '2026-05-26', date '2026-05-29', null::time, null::text, null::text[], '{"res": "67670", "channel": "Phone", "guest_raw": "Lisa Glaus", "rooms": "42 ADA King Jacuzzi Room: 5/26/2026-5/28/2026", "total": "$497.25", "paid": "$497.25", "reserved_on": "5/21/2026", "phone": "440.812.6462, ?", "email": "lglaus@process-technology.com"}'::jsonb),
  ('rx-67764-22', 'Troy Elmer', '22', date '2026-05-27', date '2026-05-28', null::time, 'Here for father-in-law''s funeral - wife booked - Angela', null::text[], '{"res": "67764", "channel": "Phone", "guest_raw": "Troy Elmer", "rooms": "22 Double: 5/27/2026", "total": "$149.18", "paid": "$149.18", "reserved_on": "5/27/2026", "phone": "715.557.0419", "email": "angie708892@gmail.com", "notes": "Here for father-in-law''s funeral - wife booked - Angela"}'::jsonb),
  ('rx-66850-33', 'Susan Meade', '33', date '2026-05-27', date '2026-05-31', null::time, null::text, null::text[], '{"res": "66850", "channel": "Phone", "guest_raw": "Susan Meade", "rooms": "33 Queen: 5/27/2026-5/30/2026", "total": "$517.14", "paid": "$517.14", "reserved_on": "4/7/2026", "phone": "720.308.9505"}'::jsonb),
  ('rx-66851-36', 'Shari Koelzer', '36', date '2026-05-28', date '2026-05-31', null::time, 'Do not charge if cancel - injured', null::text[], '{"res": "66851", "channel": "Phone", "guest_raw": "Shari Koelzer", "rooms": "36 Double: 5/28/2026-5/30/2026", "total": "$448.63", "paid": "$100.00", "reserved_on": "4/7/2026", "phone": "402.770.2061", "notes": "Do not charge if cancel - injured"}'::jsonb),
  ('rx-67602-32', 'Robert Hall', '32', date '2026-05-28', date '2026-05-29', time '17:00', null::text, null::text[], '{"res": "67602", "channel": "Direct Connect", "guest_raw": "Robert Hall", "rooms": "32 Double: 5/28/2026", "total": "$149.18", "paid": "$0.00", "reserved_on": "5/19/2026", "phone": ", 3193103331", "email": "rhally4@hotmail.com"}'::jsonb),
  ('rx-67668-28', 'Timothy Johnson', '28', date '2026-05-29', date '2026-05-30', null::time, null::text, null::text[], '{"res": "67668", "channel": "Phone", "guest_raw": "Timothy Johnson", "rooms": "28 Double : 5/29/2026", "total": "$160.23", "paid": "$0.00", "reserved_on": "5/21/2026", "phone": "715.268.8080, 715.553.2714", "email": "tdmm@amerytel.net"}'::jsonb),
  ('rx-67650-23', 'Mike Then', '23', date '2026-05-29', date '2026-05-30', null::time, null::text, null::text[], '{"res": "67650", "channel": "Phone", "guest_raw": "Mike Then", "rooms": "23 Queen: 5/29/2026", "total": "$149.18", "paid": "$0.00", "reserved_on": "5/20/2026", "phone": "715.892.2643", "email": "Michaelthen65@gmail.com"}'::jsonb),
  ('rx-66607-21', 'Matt Nelles', '21', date '2026-05-29', date '2026-05-31', time '19:00', null::text, null::text[], '{"res": "66607", "channel": "Direct Connect", "guest_raw": "Matt Nelles", "rooms": "21 Queen: 5/29/2026-5/30/2026", "total": "$298.36", "paid": "$0.00", "reserved_on": "3/24/2026", "phone": "17154702504", "email": "matt.nelles@gmail.com"}'::jsonb),
  ('rx-67660-27', 'Rebecca Peters', '27', date '2026-05-30', date '2026-06-01', null::time, null::text, null::text[], '{"res": "67660", "channel": "Phone", "guest_raw": "Rebecca Peters", "rooms": "27 Queen: 5/30/2026-5/31/2026", "total": "$298.36", "paid": "$0.00", "reserved_on": "5/21/2026", "phone": "651.717.8654", "email": "Rebeccajpeters@gmail.com"}'::jsonb),
  ('rx-66939-37', 'Fong Ly', '37', date '2026-05-30', date '2026-06-01', null::time, 'Approximate arrival 20:00–21:00; Booking.com; non-smoking.', null::text[], '{"res": "66939", "channel": "Direct Connect", "guest_raw": "Fong Ly", "rooms": "37 Queen: 5/30/2026-5/31/2026", "total": "$343.10", "paid": "$0.00", "reserved_on": "4/12/2026", "email": "fly.710534@guest.booking.com", "notes_summary": "Approximate arrival 20:00–21:00; Booking.com; non-smoking.", "notes_raw": "--4/12/2026-- Channel Manager Booking ID #5813493213 Booking Agent: Booking.com RatePlanCode: 63442852 Approximate time of arrival: between 20:00 and 21:00 Adults: 1 Channel Commission: 46.58 USD Breakfast is included in the room rate. Children and Extra Bed Policy: Children of all ages are allowed. You haven''t added any cribs. You haven''t added any extra beds. The maximum number of guests is 4. Deposit Policy: No prepayment is needed. Cancellation Policy: The guest can cancel free of charge until 2 days before arrival. The guest will be charged the total price of the reservation if they cancel in the 2 days before arrival. Non-Smoking The channel over charged taxes by $12.42 (4/12/2026) This is for your information only. Small discrepancies usually occur because the channels round tax rates to two decimal places. They may also occur if your taxes recently changed and have not been updated on the channel. Large discrepancies are reported to the ResNexus team for review."}'::jsonb),
  ('rx-66710-38', 'Troy Benson', '38', date '2026-05-30', date '2026-05-31', null::time, null::text, null::text[], '{"res": "66710", "channel": "Phone", "guest_raw": "Troy Benson", "rooms": "38 King Jacuzzi Room: 5/30/2026", "total": "$182.33", "paid": "$0.00", "reserved_on": "3/30/2026", "phone": "248.763.7078", "email": "tb_2008@hotmail.com"}'::jsonb),
  ('rx-67057-22', 'Dina Bukachek (Military Discount)', '22', date '2026-05-30', date '2026-05-31', null::time, null::text, array['Military Discount']::text[], '{"res": "67057", "channel": "Phone", "guest_raw": "Dina Bukachek (Military Discount)", "rooms": "22 Double: 5/30/2026, 24 Double: 5/30/2026", "this_segment": "22 Double: 5/30/2026", "total": "$288.40", "paid": "$0.00", "rate_note": "Military Discount", "reserved_on": "4/21/2026", "phone": "715.518.3103", "email": "Bukachekdina@yahoo.com"}'::jsonb),
  ('rx-67057-24', 'Dina Bukachek (Military Discount)', '24', date '2026-05-30', date '2026-05-31', null::time, null::text, array['Military Discount']::text[], '{"res": "67057", "channel": "Phone", "guest_raw": "Dina Bukachek (Military Discount)", "rooms": "22 Double: 5/30/2026, 24 Double: 5/30/2026", "this_segment": "24 Double: 5/30/2026", "total": "$288.40", "paid": "$0.00", "rate_note": "Military Discount", "reserved_on": "4/21/2026", "phone": "715.518.3103", "email": "Bukachekdina@yahoo.com"}'::jsonb),
  ('rx-66853-38', 'Douglas Schulte', '38', date '2026-05-31', date '2026-06-06', time '18:30', null::text, null::text[], '{"res": "66853", "channel": "Phone", "guest_raw": "Douglas Schulte", "rooms": "38 King Jacuzzi Room: 5/31/2026-6/5/2026", "total": "$663.00", "paid": "$0.00", "reserved_on": "4/7/2026", "phone": "480.215.7561", "email": "foxschulte@live.com", "est_arrival": "6:30 PM"}'::jsonb),
  ('rx-67309-41', 'Tamzid Bin Mafiz', '41', date '2026-05-31', date '2026-06-03', null::time, null::text, array['$55 a night']::text[], '{"res": "67309", "channel": "Phone", "guest_raw": "Tamzid Bin Mafiz, *** ($55 a night)", "rooms": "41 Queen: 5/31/2026-6/2/2026", "total": "$182.34", "paid": "$0.00", "rate_note": "$55 a night", "reserved_on": "5/5/2026", "phone": "651.307.6676", "email": "tamzidm@gmail.com"}'::jsonb),
  ('rx-67749-25', 'Travis Campton', '25', date '2026-06-01', date '2026-06-05', null::time, 'He may not need this week; held in case he does', null::text[], '{"res": "67749", "channel": "Phone", "guest_raw": "Travis Campton, ***", "rooms": "25 Queen: 6/1/2026-6/4/2026", "total": "$287.32", "paid": "$0.00", "reserved_on": "5/26/2026", "phone": "608.343.8835", "notes": "he may not need this week. but i wanted to make sure he had room if he did"}'::jsonb),
  ('rx-67345-23', 'Mary Charmoli', '23', date '2026-07-06', date '2026-07-31', null::time, null::text, null::text[], '{"res": "67345", "channel": "Phone", "guest_raw": "Mary Charmoli", "rooms": "23 Queen: 7/6/2026-7/30/2026, 21 Queen: 6/1/2026-6/19/2026, 6/21/2026-7/2/2026", "this_segment": "23 Queen: 7/6/2026-7/30/2026", "reservation_arrives": "6/1/2026", "reservation_departs": "7/31/2026", "total": "$2,800.00", "paid": "$0.00", "reserved_on": "5/8/2026", "phone": "715.222.9779, 715.349.8388", "email": "marycharmoli@gmail.com"}'::jsonb),
  ('rx-67345-21a', 'Mary Charmoli', '21', date '2026-06-01', date '2026-06-20', null::time, null::text, null::text[], '{"res": "67345", "channel": "Phone", "guest_raw": "Mary Charmoli", "rooms": "23 Queen: 7/6/2026-7/30/2026, 21 Queen: 6/1/2026-6/19/2026, 6/21/2026-7/2/2026", "this_segment": "21 Queen: 6/1/2026-6/19/2026", "reservation_arrives": "6/1/2026", "reservation_departs": "7/31/2026", "total": "$2,800.00", "paid": "$0.00", "reserved_on": "5/8/2026", "phone": "715.222.9779, 715.349.8388", "email": "marycharmoli@gmail.com"}'::jsonb),
  ('rx-67345-21b', 'Mary Charmoli', '21', date '2026-06-21', date '2026-07-03', null::time, null::text, null::text[], '{"res": "67345", "channel": "Phone", "guest_raw": "Mary Charmoli", "rooms": "23 Queen: 7/6/2026-7/30/2026, 21 Queen: 6/1/2026-6/19/2026, 6/21/2026-7/2/2026", "this_segment": "21 Queen: 6/21/2026-7/2/2026 (split-stay)", "reservation_arrives": "6/1/2026", "reservation_departs": "7/31/2026", "total": "$2,800.00", "paid": "$0.00", "reserved_on": "5/8/2026", "phone": "715.222.9779, 715.349.8388", "email": "marycharmoli@gmail.com"}'::jsonb),
  ('rx-67329-29', 'Tim Moore', '29', date '2026-06-01', date '2026-06-04', time '17:00', null::text, null::text[], '{"res": "67329", "channel": "Online", "guest_raw": "Tim Moore", "rooms": "29 Queen: 6/1/2026-6/3/2026", "total": "$414.39", "paid": "$0.00", "reserved_on": "5/7/2026", "phone": ", 920-573-3616", "email": "tim.moore@nisc.coop"}'::jsonb),
  ('rx-67776-39', 'Greg Jaroch', '39', date '2026-06-02', date '2026-06-03', time '17:00', null::text, null::text[], '{"res": "67776", "channel": "Online", "guest_raw": "Greg Jaroch", "rooms": "39 Queen: 6/2/2026", "total": "$138.13", "paid": "$0.00", "reserved_on": "5/27/2026", "phone": ", 6164432540", "email": "gjaroch@ameritech.net"}'::jsonb)
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

-- Verification (snapshot 2026-05-28):
-- select count(*) from public.reservations where external_id like 'rx-%';   -- expect >= 28 (cumulative across snapshots)
