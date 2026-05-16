-- ============================================================================
-- Day 54 demo seed — Lizzie's staff home + matching reservations
-- ============================================================================
-- 18 tasks across all six buckets + 6 Dailys checklist items + 15 reservations
-- (4 arrivals / 6 departures / 5 stayovers — matches the Daily Brief counts).
--
-- Demonstrates every bucket render mode + state combination:
--   SOD:        1 task DONE             → direct-link, done-state badge
--   Departures: 6 tasks (2 done,
--               1 in_progress, 3 open)  → mixed expand view, all clean_types
--                                         (Standard / Pet / Deep)
--   Stayovers:  5 tasks all OPEN        → expand view, varied night counts
--                                         including long-term (Night 8/14)
--                                         and a Sheet Change variant
--   Arrivals:   4 tasks all OPEN        → expand view, varied ETAs
--   Dailys:     1 task + 6 checklist    → preview-expand mode
--               items
--   EOD:        1 task OPEN             → LOCKED (other buckets have opens)
--
-- The AFTER-INSERT trigger `tasks_seed_default_checklist()` auto-seeds the
-- canonical checklist for housekeeping_turn / arrival / stayover. SOD /
-- Dailys / EOD do NOT auto-seed; Dailys items are inserted explicitly below.
-- For the 2 DONE Departures, all their auto-seeded checklist items are
-- marked done so the X-430 detail card reads as fully-checked.
--
-- Idempotent — deletes existing Lizzie tasks + demo54-* reservations before
-- re-inserting. Apply via Supabase dashboard SQL editor.
--
-- Used for demos. Re-run anytime to refresh the canvas.
-- ============================================================================

DO $$
DECLARE
  v_lizzie_id uuid;
  v_dailys_id uuid := gen_random_uuid();
  v_today     date := CURRENT_DATE;
BEGIN
  SELECT id INTO v_lizzie_id
  FROM public.staff
  WHERE name ILIKE '%lizzie%'
  LIMIT 1;

  IF v_lizzie_id IS NULL THEN
    RAISE EXCEPTION
      'Could not find a staff row with name like Lizzie. '
      'Run: SELECT id, name FROM public.staff; '
      'then adjust the ILIKE filter to match your test user.';
  END IF;

  -- Clean slate for re-runs
  DELETE FROM tasks WHERE staff_id = v_lizzie_id;
  DELETE FROM public.reservations WHERE external_id LIKE 'demo54-%';

  -- ── SOD — 1 task, DONE ───────────────────────────────────────────
  INSERT INTO tasks
    (title, status, card_type, source, priority, staff_id, due_date, completed_at, context)
  VALUES
    ('Start of Day', 'done', 'start_of_day', 'manual', 'medium', v_lizzie_id, v_today, now(),
     '{"staff_home_bucket":"start_of_day"}'::jsonb);

  -- ── Departures — 6 rooms (2 DONE · 1 IN_PROGRESS · 3 OPEN) ───────
  INSERT INTO tasks
    (title, status, card_type, source, priority, staff_id, room_number, due_date, completed_at, context)
  VALUES
    ('Turnover Room 21', 'done',        'housekeeping_turn', 'manual', 'high',   v_lizzie_id, '21', v_today, now(),
     '{"staff_home_bucket":"departures","outgoing_guest":{"name":"Sarah Patel","room_type":"Single Queen","clean_type":"Standard"}}'::jsonb),
    ('Turnover Room 25', 'done',        'housekeeping_turn', 'manual', 'medium', v_lizzie_id, '25', v_today, now(),
     '{"staff_home_bucket":"departures","outgoing_guest":{"name":"Michael Brennan","room_type":"Double Queen","clean_type":"Standard"}}'::jsonb),
    ('Turnover Room 34', 'in_progress', 'housekeeping_turn', 'manual', 'high',   v_lizzie_id, '34', v_today, NULL,
     '{"staff_home_bucket":"departures","outgoing_guest":{"name":"Rachel Kim","room_type":"King Suite","clean_type":"Deep"}}'::jsonb),
    ('Turnover Room 38', 'open',        'housekeeping_turn', 'manual', 'medium', v_lizzie_id, '38', v_today, NULL,
     '{"staff_home_bucket":"departures","outgoing_guest":{"name":"Thomas Johnson","room_type":"ADA Single","clean_type":"Standard"}}'::jsonb),
    ('Turnover Room 42', 'open',        'housekeeping_turn', 'manual', 'medium', v_lizzie_id, '42', v_today, NULL,
     '{"staff_home_bucket":"departures","outgoing_guest":{"name":"Jennifer Foster","room_type":"Double King","clean_type":"Pet"}}'::jsonb),
    ('Turnover Room 46', 'open',        'housekeeping_turn', 'manual', 'high',   v_lizzie_id, '46', v_today, NULL,
     '{"staff_home_bucket":"departures","outgoing_guest":{"name":"Robert Vasquez","room_type":"King Jacuzzi","clean_type":"Standard"}}'::jsonb);

  -- ── Stayovers — 5 rooms, all OPEN, varied nights ──────────────────
  INSERT INTO tasks
    (title, status, card_type, source, priority, staff_id, room_number, due_date, context)
  VALUES
    ('Service Room 26', 'open', 'stayover', 'manual', 'medium', v_lizzie_id, '26', v_today,
     '{"staff_home_bucket":"stayovers","current_guest":{"name":"Maria Gonzalez","room_type":"King Suite","night_n":2,"total_nights":3}}'::jsonb),
    ('Service Room 30', 'open', 'stayover', 'manual', 'medium', v_lizzie_id, '30', v_today,
     '{"staff_home_bucket":"stayovers","current_guest":{"name":"David Park","room_type":"Double Queen","night_n":1,"total_nights":4}}'::jsonb),
    ('Service Room 33', 'open', 'stayover', 'manual', 'medium', v_lizzie_id, '33', v_today,
     '{"staff_home_bucket":"stayovers","current_guest":{"name":"Olivia Stewart","room_type":"Single Queen","night_n":5,"total_nights":7}}'::jsonb),
    ('Service Room 39', 'open', 'stayover', 'manual', 'medium', v_lizzie_id, '39', v_today,
     '{"staff_home_bucket":"stayovers","current_guest":{"name":"Brandon Lee","room_type":"King Jacuzzi","clean_type":"Sheet Change","night_n":3,"total_nights":5}}'::jsonb),
    ('Service Room 44', 'open', 'stayover', 'manual', 'medium', v_lizzie_id, '44', v_today,
     '{"staff_home_bucket":"stayovers","current_guest":{"name":"Amanda Kowalski","room_type":"Double King","night_n":8,"total_nights":14}}'::jsonb);

  -- ── Arrivals — 4 rooms, all OPEN, varied ETAs ─────────────────────
  INSERT INTO tasks
    (title, status, card_type, source, priority, staff_id, room_number, due_date, context)
  VALUES
    ('Prep Room 22', 'open', 'arrival', 'manual', 'medium', v_lizzie_id, '22', v_today,
     '{"staff_home_bucket":"arrivals","incoming_guest":{"name":"Christopher Reid","room_type":"King Suite","checkin_time":"16:00"}}'::jsonb),
    ('Prep Room 28', 'open', 'arrival', 'manual', 'medium', v_lizzie_id, '28', v_today,
     '{"staff_home_bucket":"arrivals","incoming_guest":{"name":"Natalie Tran","room_type":"Double Queen","checkin_time":"14:00"}}'::jsonb),
    ('Prep Room 36', 'open', 'arrival', 'manual', 'medium', v_lizzie_id, '36', v_today,
     '{"staff_home_bucket":"arrivals","incoming_guest":{"name":"William Davis","room_type":"ADA Double","checkin_time":"15:30"}}'::jsonb),
    ('Prep Room 40', 'open', 'arrival', 'manual', 'medium', v_lizzie_id, '40', v_today,
     '{"staff_home_bucket":"arrivals","incoming_guest":{"name":"Sophia Morales","room_type":"Single Queen","checkin_time":"17:00"}}'::jsonb);

  -- ── Dailys — 1 task, OPEN, 6 checklist items ──────────────────────
  INSERT INTO tasks
    (id, title, status, card_type, source, priority, staff_id, due_date, context)
  VALUES
    (v_dailys_id, 'Property Round', 'open', 'dailys', 'manual', 'medium', v_lizzie_id, v_today,
     '{"staff_home_bucket":"dailys"}'::jsonb);

  INSERT INTO task_checklist_items (task_id, title, sort_order, done) VALUES
    (v_dailys_id, 'Restock Cart',     1, false),
    (v_dailys_id, 'Public Restrooms', 2, false),
    (v_dailys_id, 'Dust Pictures',    3, false),
    (v_dailys_id, 'Trash Pickup',     4, false),
    (v_dailys_id, 'Wash Windows',     5, false),
    (v_dailys_id, 'Vacuum Hallways',  6, false);

  -- ── EOD — 1 task, OPEN (locked until everything else done) ────────
  INSERT INTO tasks
    (title, status, card_type, source, priority, staff_id, due_date, context)
  VALUES
    ('Wrap Shift', 'open', 'eod', 'manual', 'medium', v_lizzie_id, v_today,
     '{"staff_home_bucket":"eod"}'::jsonb);

  -- ── Mark auto-seeded checklist items DONE for the 2 done Departures
  --    so the X-430 detail cards demo as fully-checked. ─────────────
  UPDATE task_checklist_items SET done = true, done_at = now()
  WHERE task_id IN (
    SELECT id FROM tasks
    WHERE staff_id = v_lizzie_id AND status = 'done' AND card_type = 'housekeeping_turn'
  );

  -- ══════════════════════════════════════════════════════════════════
  -- RESERVATIONS — populates Daily Brief: 4 arr / 6 dep / 5 sta
  -- (LIVE_STATUSES = {confirmed, arrived} per lib/reservations.ts)
  -- ══════════════════════════════════════════════════════════════════

  INSERT INTO public.reservations
    (external_id, source, status, guest_name, room_number, arrival_date, departure_date, arrival_time)
  VALUES
    ('demo54-arr-1', 'manual', 'confirmed', 'Christopher Reid', '22', v_today, v_today + 3, '16:00'),
    ('demo54-arr-2', 'manual', 'confirmed', 'Natalie Tran',     '28', v_today, v_today + 2, '14:00'),
    ('demo54-arr-3', 'manual', 'confirmed', 'William Davis',    '36', v_today, v_today + 1, '15:30'),
    ('demo54-arr-4', 'manual', 'confirmed', 'Sophia Morales',   '40', v_today, v_today + 4, '17:00');

  INSERT INTO public.reservations
    (external_id, source, status, guest_name, room_number, arrival_date, departure_date)
  VALUES
    ('demo54-dep-1', 'manual', 'arrived', 'Sarah Patel',      '21', v_today - 3, v_today),
    ('demo54-dep-2', 'manual', 'arrived', 'Michael Brennan',  '25', v_today - 2, v_today),
    ('demo54-dep-3', 'manual', 'arrived', 'Rachel Kim',       '34', v_today - 5, v_today),
    ('demo54-dep-4', 'manual', 'arrived', 'Thomas Johnson',   '38', v_today - 1, v_today),
    ('demo54-dep-5', 'manual', 'arrived', 'Jennifer Foster',  '42', v_today - 4, v_today),
    ('demo54-dep-6', 'manual', 'arrived', 'Robert Vasquez',   '46', v_today - 2, v_today);

  INSERT INTO public.reservations
    (external_id, source, status, guest_name, room_number, arrival_date, departure_date)
  VALUES
    ('demo54-sta-1', 'manual', 'arrived', 'Maria Gonzalez',   '26', v_today - 1, v_today + 1),
    ('demo54-sta-2', 'manual', 'arrived', 'David Park',       '30', v_today - 1, v_today + 3),
    ('demo54-sta-3', 'manual', 'arrived', 'Olivia Stewart',   '33', v_today - 4, v_today + 2),
    ('demo54-sta-4', 'manual', 'arrived', 'Brandon Lee',      '39', v_today - 2, v_today + 2),
    ('demo54-sta-5', 'manual', 'arrived', 'Amanda Kowalski',  '44', v_today - 7, v_today + 6);

  RAISE NOTICE 'Seeded 18 tasks + 6 Dailys checklist items + 15 reservations for Lizzie (staff_id %).', v_lizzie_id;
END $$;
