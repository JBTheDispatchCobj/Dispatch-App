-- Master plan I.C Phase 4c — shift_summary_v view.
--
-- Per-shift task counts by card_type. Master plan I.I (E-430) calls for
-- end-of-shift summary surfacing # departures + # stayovers + # arrivals
-- + # daily tasks + total hours. This view is the data source for that.
-- Per-shift granularity (not per-day) so multi-shift days surface clean.
--
-- Join logic: a task counts toward a shift if its completed_at falls in
-- the [shift_start_at, effective_end_at] window. effective_end_at is
-- shift_end_at when the shift has ended, or now() for currently-clocked-in
-- shifts (so admin can see the in-flight count on the staff profile).
--
-- Completion gate is `completed_at IS NOT NULL` rather than `status='done'`.
-- Defensive against edge-case writes where status flips without a timestamp
-- (shouldn't happen, but the data integrity cost of a missed task in the
-- summary outweighs the cost of catching one too many).
--
-- staff_id type cast: tasks.staff_id is uuid; raw_payload->>'staff_id' is
-- text. Cast tasks.staff_id::text to match. Phase 4a's choice to keep
-- staff_id as text in staff_shifts_v drives this — alternative is casting
-- raw_payload to uuid in 4a.
--
-- card_type → bucket nomenclature mapping (per interpret.ts):
-- - housekeeping_turn → "departures" (the bucket label)
-- - arrival           → "arrivals"
-- - stayover          → "stayovers"
-- - dailys            → "dailys"
-- - eod               → "eod"
-- - maintenance       → "departures" (per interpret.ts; pre-beta routing)
-- - general_report    → "start_of_day"
--
-- Idempotent. Safe to re-run. Depends on staff_shifts_v (Phase 4a) and
-- public.tasks (always present).

BEGIN;

CREATE OR REPLACE VIEW public.shift_summary_v AS
WITH shift_pairs AS (
  SELECT
    staff_id,
    staff_name,
    shift_start_at,
    shift_end_at,
    duration_minutes,
    is_current,
    COALESCE(shift_end_at, now()) AS effective_end_at
  FROM public.staff_shifts_v
)
SELECT
  sp.staff_id,
  sp.staff_name,
  sp.shift_start_at,
  sp.shift_end_at,
  sp.duration_minutes,
  sp.is_current,
  COUNT(t.id) FILTER (WHERE t.card_type = 'housekeeping_turn')::int AS departures_completed,
  COUNT(t.id) FILTER (WHERE t.card_type = 'arrival')::int           AS arrivals_completed,
  COUNT(t.id) FILTER (WHERE t.card_type = 'stayover')::int          AS stayovers_completed,
  COUNT(t.id) FILTER (WHERE t.card_type = 'dailys')::int            AS dailys_completed,
  COUNT(t.id) FILTER (WHERE t.card_type = 'eod')::int               AS eod_completed,
  COUNT(t.id) FILTER (WHERE t.card_type = 'maintenance')::int       AS maintenance_completed,
  COUNT(t.id)::int                                                  AS total_tasks_completed
FROM shift_pairs sp
LEFT JOIN public.tasks t
  ON  t.staff_id::text = sp.staff_id
  AND t.completed_at IS NOT NULL
  AND t.completed_at >= sp.shift_start_at
  AND t.completed_at <= sp.effective_end_at
GROUP BY
  sp.staff_id,
  sp.staff_name,
  sp.shift_start_at,
  sp.shift_end_at,
  sp.duration_minutes,
  sp.is_current;

COMMENT ON VIEW public.shift_summary_v IS
  'Master plan I.C Phase 4c + I.I E-430: per-shift task counts by card_type. '
  'Used by E-430 day summary and admin staff profile per-shift rendering.';

-- Verification — Lizzie's Phase 3 test shift had 0 completed tasks (the
-- 2 inserted tasks remain status=open). Should return one row with
-- total_tasks_completed=0 and all per-type columns zero.
SELECT
  staff_name,
  shift_start_at,
  duration_minutes,
  is_current,
  departures_completed,
  arrivals_completed,
  stayovers_completed,
  dailys_completed,
  eod_completed,
  total_tasks_completed
FROM public.shift_summary_v
WHERE staff_name = 'Lizzie Larson'
ORDER BY shift_start_at DESC;

COMMIT;
