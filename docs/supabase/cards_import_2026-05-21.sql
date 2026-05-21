-- docs/supabase/cards_import_2026-05-21.sql
--
-- Generates today's staff cards from the channel-manager reservations import
-- (2026-05-21), assigned to Angie. One card per room in today's buckets:
--   departures (4) -> card_type 'housekeeping_turn' -> bucket 'departures'
--   arrivals   (1) -> card_type 'arrival'           -> bucket 'arrivals'
--   stayovers  (7) -> card_type 'stayover'          -> bucket 'stayovers'
--
-- is_staff_report=false + staff_id set → the tasks_seed_default_checklist
-- trigger auto-inserts the 7 canonical checklist items per card. Guest data
-- renders on each card via the reservation fallback (matched by room).
--
-- RUN ORDER: after beta_reset_2026-05-21.sql (which creates Angie's staff row
-- a0c1e000-…0001) and after the reservations import.
--
-- Idempotent: clears prior import-generated cards (source='pms') then re-inserts.
-- Does NOT touch manually-created cards (source='manual').

delete from public.tasks where source = 'pms';

insert into public.tasks
  (title, card_type, status, priority, source, room_number,
   assignee_name, staff_id, is_staff_report, created_by_user_id, context)
values
  -- Departures (turnover) — Departs = 2026-05-21
  ('Turnover Room 41', 'housekeeping_turn', 'open', 'medium', 'pms', '41', 'Angie', 'a0c1e000-0000-4000-8000-000000000001', false, '380edc3d-ab42-4aed-aff7-940d9d6f8c2a', '{"staff_home_bucket":"departures"}'::jsonb),
  ('Turnover Room 28', 'housekeeping_turn', 'open', 'medium', 'pms', '28', 'Angie', 'a0c1e000-0000-4000-8000-000000000001', false, '380edc3d-ab42-4aed-aff7-940d9d6f8c2a', '{"staff_home_bucket":"departures"}'::jsonb),
  ('Turnover Room 22', 'housekeeping_turn', 'open', 'medium', 'pms', '22', 'Angie', 'a0c1e000-0000-4000-8000-000000000001', false, '380edc3d-ab42-4aed-aff7-940d9d6f8c2a', '{"staff_home_bucket":"departures"}'::jsonb),
  ('Turnover Room 31', 'housekeeping_turn', 'open', 'medium', 'pms', '31', 'Angie', 'a0c1e000-0000-4000-8000-000000000001', false, '380edc3d-ab42-4aed-aff7-940d9d6f8c2a', '{"staff_home_bucket":"departures"}'::jsonb),
  -- Arrival (prep) — Arrives = 2026-05-21 (Cheryl Moskal, "Plain oatmeal")
  ('Prep Room 29', 'arrival', 'open', 'medium', 'pms', '29', 'Angie', 'a0c1e000-0000-4000-8000-000000000001', false, '380edc3d-ab42-4aed-aff7-940d9d6f8c2a', '{"staff_home_bucket":"arrivals"}'::jsonb),
  -- Stayovers (service) — Arrives < 2026-05-21 < Departs
  ('Service Room 39', 'stayover', 'open', 'medium', 'pms', '39', 'Angie', 'a0c1e000-0000-4000-8000-000000000001', false, '380edc3d-ab42-4aed-aff7-940d9d6f8c2a', '{"staff_home_bucket":"stayovers"}'::jsonb),
  ('Service Room 33', 'stayover', 'open', 'medium', 'pms', '33', 'Angie', 'a0c1e000-0000-4000-8000-000000000001', false, '380edc3d-ab42-4aed-aff7-940d9d6f8c2a', '{"staff_home_bucket":"stayovers"}'::jsonb),
  ('Service Room 21', 'stayover', 'open', 'medium', 'pms', '21', 'Angie', 'a0c1e000-0000-4000-8000-000000000001', false, '380edc3d-ab42-4aed-aff7-940d9d6f8c2a', '{"staff_home_bucket":"stayovers"}'::jsonb),
  ('Service Room 23', 'stayover', 'open', 'medium', 'pms', '23', 'Angie', 'a0c1e000-0000-4000-8000-000000000001', false, '380edc3d-ab42-4aed-aff7-940d9d6f8c2a', '{"staff_home_bucket":"stayovers"}'::jsonb),
  ('Service Room 25', 'stayover', 'open', 'medium', 'pms', '25', 'Angie', 'a0c1e000-0000-4000-8000-000000000001', false, '380edc3d-ab42-4aed-aff7-940d9d6f8c2a', '{"staff_home_bucket":"stayovers"}'::jsonb),
  ('Service Room 27', 'stayover', 'open', 'medium', 'pms', '27', 'Angie', 'a0c1e000-0000-4000-8000-000000000001', false, '380edc3d-ab42-4aed-aff7-940d9d6f8c2a', '{"staff_home_bucket":"stayovers"}'::jsonb),
  ('Service Room 37', 'stayover', 'open', 'medium', 'pms', '37', 'Angie', 'a0c1e000-0000-4000-8000-000000000001', false, '380edc3d-ab42-4aed-aff7-940d9d6f8c2a', '{"staff_home_bucket":"stayovers"}'::jsonb);

-- Verification (expect departures 4, arrivals 1, stayovers 7, total 12):
-- select context->>'staff_home_bucket' as bucket, count(*)
--   from public.tasks where source = 'pms' group by 1 order by 1;
-- select count(*) from public.task_checklist_items;   -- expect 12 * 7 = 84
