-- docs/supabase/reservations_seed.sql
--
-- Test seed for the BR1 reservations table. Creates exactly:
--   3 arrivals today
--   2 departures today
--   4 stayovers today
--   1 cancelled (sanity — should NOT appear in any brief query)
--
-- Matches the pre-BR1 hardcoded brief counts (3 / 2 / 4) so a successful
-- live read should render the staff home brief identically to the fallback.
--
-- All room numbers are taken from Jennifer's actual catalog
-- (lib/checklists/rooms.ts). Run this AFTER reservations_br1.sql.
--
-- Re-running: this is NOT idempotent. Truncate first if you want to reset:
--   truncate public.reservations;

-- ---------------------------------------------------------------------------
-- 3 arrivals today
-- ---------------------------------------------------------------------------
insert into public.reservations
  (guest_name, party_size, adults, room_number, arrival_date, departure_date, arrival_time, source, special_requests)
values
  ('Katie Wilkins', 2, 2, '23', current_date, current_date + 3, '16:00', 'manual', array['Quiet floor', 'Extra pillows']),
  ('Smith Family',  4, 2, '33', current_date, current_date + 2, '15:00', 'manual', array['VIP', 'Allergies']),
  ('David Chen',    1, 1, '41', current_date, current_date + 1, '17:00', 'manual', null);

-- ---------------------------------------------------------------------------
-- 2 departures today (already arrived earlier in stay; checking out today)
-- ---------------------------------------------------------------------------
insert into public.reservations
  (guest_name, party_size, adults, room_number, arrival_date, departure_date, source, status)
values
  ('Jane Roberts',    2, 2, '25', current_date - 3, current_date, 'manual', 'arrived'),
  ('The Hendersons',  3, 2, '38', current_date - 2, current_date, 'manual', 'arrived');

-- ---------------------------------------------------------------------------
-- 4 stayovers today (mid-stay)
-- ---------------------------------------------------------------------------
insert into public.reservations
  (guest_name, party_size, adults, room_number, arrival_date, departure_date, source, status, special_requests)
values
  ('David Adams',  1, 1, '27', current_date - 1, current_date + 2, 'manual', 'arrived', array['Extra towels']),
  ('Maria Garcia', 2, 2, '32', current_date - 2, current_date + 1, 'manual', 'arrived', null),
  ('Tom Wilson',   1, 1, '36', current_date - 1, current_date + 1, 'manual', 'arrived', null),
  ('The Lees',     4, 2, '43', current_date - 4, current_date + 3, 'manual', 'arrived', array['Crib', 'Welcome basket']);

-- ---------------------------------------------------------------------------
-- 1 cancelled — should NOT appear in any brief query
-- ---------------------------------------------------------------------------
insert into public.reservations
  (guest_name, party_size, room_number, arrival_date, departure_date, status, source)
values
  ('Cancelled Test', 1, '24', current_date, current_date + 1, 'cancelled', 'manual');

-- ---------------------------------------------------------------------------
-- Verification — should return arrivals=3, departures=2, stayovers=4
-- ---------------------------------------------------------------------------
-- select
--   (select count(*) from reservations where arrival_date = current_date and status in ('confirmed','arrived')) as arrivals,
--   (select count(*) from reservations where departure_date = current_date and status in ('confirmed','arrived')) as departures,
--   (select count(*) from reservations where arrival_date < current_date and departure_date > current_date and status in ('confirmed','arrived')) as stayovers;
