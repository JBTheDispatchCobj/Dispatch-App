-- ============================================================================
-- Day 54 chase #3 follow-up — populate Lizzie's staff home with demo tasks
-- ============================================================================
-- 15 tasks + 6 Dailys checklist items so the new stacked-deck UI demos
-- every bucket render mode end-to-end.
--
-- Bucket render modes (Day 54 chase #2 / #3):
--   SOD:        direct-link, no expansion. One task per shift.
--   Departures: multi-task expand. One task per departing room.
--   Stayovers:  multi-task expand. One task per stayover room.
--   Arrivals:   multi-task expand. One task per arriving room.
--   Dailys:     preview-expand. Header is a <Link> to Da-430; chevron
--               toggles inline preview of task_checklist_items
--               (display-only — taps don't navigate or toggle done).
--   EOD:        direct-link, but LOCKED until every non-EOD bucket has
--               zero open tasks. When locked, header is inert + shows
--               a "Locked" chip.
--
-- Bucket states demonstrated:
--   SOD:        1 task DONE       → bucket flips to done state, direct-link
--   Departures: 5 tasks, 1 DONE   → mixed-row expanded view
--   Stayovers:  4 tasks, all OPEN → standard active state, stack visual
--   Arrivals:   3 tasks, all OPEN → ETA chips render
--   Dailys:     1 task OPEN + 6 checklist items → preview-expand
--   EOD:        1 task OPEN, but LOCKED (Departures has 4 open)
--
-- The AFTER-INSERT trigger `tasks_seed_default_checklist()` auto-seeds
-- the canonical checklist items for housekeeping_turn / arrival /
-- stayover. SOD / Dailys / EOD do NOT auto-seed — Dailys items are
-- inserted explicitly below.
--
-- Idempotent — deletes all existing tasks for Lizzie before inserting.
-- task_checklist_items rows cascade with tasks on delete.
--
-- Apply via Supabase dashboard SQL editor → New query → paste → Run.
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
      'Could not find a staff row with name like Lizzie.';
  END IF;

  DELETE FROM tasks WHERE staff_id = v_lizzie_id;

  -- ── SOD — 1 task, DONE ──────────────────────────────────────────
  INSERT INTO tasks
    (title, status, card_type, source, priority, staff_id, due_date, completed_at, context)
  VALUES
    ('Start of Day', 'done', 'start_of_day', 'manual', 'medium', v_lizzie_id, v_today, now(),
     '{"staff_home_bucket":"start_of_day"}'::jsonb);

  -- ── Departures — 5 tasks, 1 DONE ────────────────────────────────
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

  -- ── Stayovers — 4 tasks, all OPEN ────────────────────────────────
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

  -- ── Arrivals — 3 tasks, all OPEN ─────────────────────────────────
  INSERT INTO tasks
    (title, status, card_type, source, priority, staff_id, room_number, due_date, context)
  VALUES
    ('Prep Room 23', 'open', 'arrival', 'manual', 'medium', v_lizzie_id, '23', v_today,
     '{"staff_home_bucket":"arrivals","incoming_guest":{"name":"Katie Wilkins","room_type":"King Suite","checkin_time":"16:00"}}'::jsonb),
    ('Prep Room 31', 'open', 'arrival', 'manual', 'medium', v_lizzie_id, '31', v_today,
     '{"staff_home_bucket":"arrivals","incoming_guest":{"name":"Marcus Webb","room_type":"Double Queen","checkin_time":"14:00"}}'::jsonb),
    ('Prep Room 42', 'open', 'arrival', 'manual', 'medium', v_lizzie_id, '42', v_today,
     '{"staff_home_bucket":"arrivals","incoming_guest":{"name":"Linda Park","room_type":"ADA Single","checkin_time":"14:00"}}'::jsonb);

  -- ── Dailys — 1 task, OPEN, with 6 checklist items ─────────────────
  INSERT INTO tasks
    (id, title, status, card_type, source, priority, staff_id, due_date, context)
  VALUES
    (v_dailys_id, 'Property Round', 'open', 'dailys', 'manual', 'medium', v_lizzie_id, v_today,
     '{"staff_home_bucket":"dailys"}'::jsonb);

  INSERT INTO task_checklist_items (task_id, title, sort_order, done)
  VALUES
    (v_dailys_id, 'Restock Cart',     1, false),
    (v_dailys_id, 'Public Restrooms', 2, false),
    (v_dailys_id, 'Dust Pictures',    3, false),
    (v_dailys_id, 'Trash Pickup',     4, false),
    (v_dailys_id, 'Wash Windows',     5, false),
    (v_dailys_id, 'Vacuum Hallways',  6, false);

  -- ── EOD — 1 task, OPEN (locked until others clear) ──────────────────
  INSERT INTO tasks
    (title, status, card_type, source, priority, staff_id, due_date, context)
  VALUES
    ('Wrap Shift', 'open', 'eod', 'manual', 'medium', v_lizzie_id, v_today,
     '{"staff_home_bucket":"eod"}'::jsonb);

  RAISE NOTICE 'Seeded 15 tasks + 6 Dailys checklist items for Lizzie (staff_id %).', v_lizzie_id;
END $$;
