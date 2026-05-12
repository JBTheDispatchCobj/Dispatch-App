-- ============================================================================
-- Day 54 chase #1 + #2 follow-up — populate Lizzie's staff home with demo tasks
-- ============================================================================
-- 15 tasks across all six buckets so the new stacked-deck UI can be verified
-- end-to-end.
--
-- Day 54 chase #2 product call: SOD / Dailys / EOD are SINGLE-task buckets
-- (one X-430 detail card per shift with internal checklist tiles). On the
-- staff home they render as direct-link headers (no expansion). Departures,
-- Stayovers, and Arrivals are multi-task (one task per room) and keep the
-- expand-and-link-rows model.
--
-- Bucket states demonstrated:
--   SOD:        1 task, DONE       → bucket flips to done state, header
--                                     is a direct link to SOD-430
--   Departures: 5 tasks, 1 DONE    → mixed-row expanded view
--   Stayovers:  4 tasks, all OPEN  → standard active state
--   Arrivals:   3 tasks, all OPEN  → ETA chips render (4:00 PM / 2:00 PM x2)
--   Dailys:     1 task, OPEN       → header is a direct link to Da-430
--   EOD:        1 task, OPEN       → header is a direct link to E-430
--
-- The AFTER-INSERT trigger `tasks_seed_default_checklist()` will auto-seed
-- the canonical checklist items per card_type (Day 52 chase #3 / Day 53
-- chase #2): departures = 7 (or 8 for Deep), arrivals = 3, stayovers = 8.
-- SOD / Dailys / EOD do NOT get auto-checklist seeding — their X-430 detail
-- cards render whatever checklist rows exist (none, for now). If you want
-- to populate SOD-430 / Da-430 with checklist tiles, insert into
-- task_checklist_items manually keyed off the new task ids.
--
-- Idempotent — re-run safe. Deletes all existing tasks for Lizzie before
-- inserting the new set.
--
-- Apply via Supabase dashboard SQL editor → New query → paste → Run.
-- Then refresh https://dispatch-app-iota.vercel.app/staff to see the deck.
--
-- NOTE on Daily Brief counts: the brief at the top reads from the
-- `reservations` table, not from `tasks`. To populate the brief with
-- matching counts (3 / 5 / 4), run the companion reservations seed.
-- ============================================================================

DO $$
DECLARE
  v_lizzie_id uuid;
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

  DELETE FROM tasks WHERE staff_id = v_lizzie_id;

  -- ── SOD (Start of Day) — 1 task, DONE ──────────────────────────────────
  INSERT INTO tasks
    (title, status, card_type, source, priority, staff_id, due_date, completed_at, context)
  VALUES
    ('Start of Day', 'done', 'start_of_day', 'manual', 'medium', v_lizzie_id, v_today, now(),
     '{"staff_home_bucket":"start_of_day"}'::jsonb);

  -- ── Departures (housekeeping_turn) — 5 tasks, 1 DONE ───────────────────
  INSERT INTO tasks
    (title, status, card_type, source, priority, staff_id, room_number, due_date, completed_at, context)
  VALUES
    ('Turnover Room 29', 'done', 'housekeeping_turn', 'manual', 'high',   v_lizzie_id, '29', v_today, now(),
     '{"staff_home_bucket":"departures","outgoing_guest":{"name":"Tamzid Mafid","room_type":"Single Queen","clean_type":"Standard"}}'::jsonb),
    ('Turnover Room 32', 'open', 'housekeeping_turn', 'manual', 'medium', v_lizzie_id, '32', v_today, NULL,
     '{"staff_home_bucket":"departures","outgoing_guest":{"name":"Emma Russo","room_type":"Double King","clean_type":"Standard"}}'::jsonb),
    ('Turnover Room 18', 'open', 'housekeeping_turn', 'manual', 'medium', v_lizzie_id, '18', v_today, NULL,
     '{"staff_home_bucket":"departures","outgoing_guest":{"name":"Daniel Park","room_type":"King Suite","clean_type":"Pet"}}'::jsonb),
    ('Turnover Room 41', 'open', 'housekeeping_turn', 'manual', 'medium', v_lizzie_id, '41', v_today, NULL,
     '{"staff_home_bucket":"departures","outgoing_guest":{"name":"Marcus Lee","room_type":"ADA Double","clean_type":"Standard"}}'::jsonb),
    ('Turnover Room 24', 'open', 'housekeeping_turn', 'manual', 'high',   v_lizzie_id, '24', v_today, NULL,
     '{"staff_home_bucket":"departures","outgoing_guest":{"name":"Hannah Mills","room_type":"King Jacuzzi","clean_type":"Deep"}}'::jsonb);

  -- ── Stayovers (stayover card_type) — 4 tasks, all OPEN ─────────────────
  INSERT INTO tasks
    (title, status, card_type, source, priority, staff_id, room_number, due_date, context)
  VALUES
    ('Service Room 20', 'open', 'stayover', 'manual', 'medium', v_lizzie_id, '20', v_today,
     '{"staff_home_bucket":"stayovers","current_guest":{"name":"David Adams","room_type":"King Suite","night_n":2,"total_nights":3}}'::jsonb),
    ('Service Room 27', 'open', 'stayover', 'manual', 'medium', v_lizzie_id, '27', v_today,
     '{"staff_home_bucket":"stayovers","current_guest":{"name":"Sarah Chen","room_type":"Double Queen","night_n":2,"total_nights":4}}'::jsonb),
    ('Service Room 35', 'open', 'stayover', 'manual', 'medium', v_lizzie_id, '35', v_today,
     '{"staff_home_bucket":"stayovers","current_guest":{"name":"James Walker","room_type":"Single Queen","night_n":3,"total_nights":7}}'::jsonb),
    ('Service Room 12', 'open', 'stayover', 'manual', 'medium', v_lizzie_id, '12', v_today,
     '{"staff_home_bucket":"stayovers","current_guest":{"name":"Olivia Brennan","room_type":"King Jacuzzi","night_n":5,"total_nights":14}}'::jsonb);

  -- ── Arrivals (arrival card_type) — 3 tasks, all OPEN ───────────────────
  INSERT INTO tasks
    (title, status, card_type, source, priority, staff_id, room_number, due_date, context)
  VALUES
    ('Prep Room 23', 'open', 'arrival', 'manual', 'medium', v_lizzie_id, '23', v_today,
     '{"staff_home_bucket":"arrivals","incoming_guest":{"name":"Katie Wilkins","room_type":"King Suite","checkin_time":"16:00"}}'::jsonb),
    ('Prep Room 31', 'open', 'arrival', 'manual', 'medium', v_lizzie_id, '31', v_today,
     '{"staff_home_bucket":"arrivals","incoming_guest":{"name":"Marcus Webb","room_type":"Double Queen","checkin_time":"14:00"}}'::jsonb),
    ('Prep Room 42', 'open', 'arrival', 'manual', 'medium', v_lizzie_id, '42', v_today,
     '{"staff_home_bucket":"arrivals","incoming_guest":{"name":"Linda Park","room_type":"ADA Single","checkin_time":"14:00"}}'::jsonb);

  -- ── Dailys (dailys card_type) — 1 task, OPEN ───────────────────────────
  INSERT INTO tasks
    (title, status, card_type, source, priority, staff_id, due_date, context)
  VALUES
    ('Property Round', 'open', 'dailys', 'manual', 'medium', v_lizzie_id, v_today,
     '{"staff_home_bucket":"dailys"}'::jsonb);

  -- ── EOD (eod card_type) — 1 task, OPEN ─────────────────────────────────
  INSERT INTO tasks
    (title, status, card_type, source, priority, staff_id, due_date, context)
  VALUES
    ('Wrap Shift', 'open', 'eod', 'manual', 'medium', v_lizzie_id, v_today,
     '{"staff_home_bucket":"eod"}'::jsonb);

  RAISE NOTICE 'Seeded 15 demo tasks for Lizzie (staff_id %). SOD 1 done · Dep 1/5 done · Sta 4 open · Arr 3 open · Dly 1 open · EOD 1 open.', v_lizzie_id;
END $$;
