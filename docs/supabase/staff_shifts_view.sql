-- Master plan I.C Phase 4a — staff_shifts_v view.
--
-- Pairs each shift_start event with the next shift_end event for the same
-- staff. Each row = one shift. Currently-clocked-in shifts have NULL
-- shift_end_at and is_current=true; their duration_minutes is also NULL
-- (Phase 4c shift_summary_v treats them as ending at now()).
--
-- Sources from public.inbound_events written by the staff_clock_in_event_trigger
-- on public.staff (Day 31). source='clock_in' filters to only those events;
-- other sources (manual, future Cloudbeds, etc.) don't follow the
-- shift_start/shift_end pattern.
--
-- Edge cases:
-- - Shifts that cross midnight: LATERAL pairs by timestamp ordering, not
--   event_date. shift_start with Tuesday's event_date pairs cleanly with
--   shift_end on Wednesday.
-- - Multiple clock-ins same day: blocked by inbound_events_dedup constraint
--   on (source, external_id, event_type, event_date) — can't happen for
--   same (staff_id, today) pair.
-- - Orphan shift_end (admin manually nulled clocked_in_at without a prior
--   clock-in): not surfaced — view is start-driven.
-- - Same-day re-clock: dedup blocks the second pair, so only the first
--   shift of the day is recorded. Acceptable for beta.
--
-- staff_id is text (sourced from raw_payload->>'staff_id') for join
-- compatibility downstream. Phase 4c casts tasks.staff_id::text to match.
--
-- Idempotent. Safe to re-run. Depends on public.inbound_events being
-- present (always is post-Day-14).

BEGIN;

CREATE OR REPLACE VIEW public.staff_shifts_v AS
WITH starts AS (
  SELECT
    raw_payload->>'staff_id'   AS staff_id,
    raw_payload->>'staff_name' AS staff_name,
    created_at                 AS shift_start_at,
    event_date                 AS shift_date,
    id                         AS start_event_id
  FROM public.inbound_events
  WHERE event_type = 'shift_start'
    AND source     = 'clock_in'
),
ends AS (
  SELECT
    raw_payload->>'staff_id' AS staff_id,
    created_at               AS shift_end_at,
    id                       AS end_event_id
  FROM public.inbound_events
  WHERE event_type = 'shift_end'
    AND source     = 'clock_in'
)
SELECT
  s.staff_id,
  s.staff_name,
  s.shift_start_at,
  e.shift_end_at,
  CASE
    WHEN e.shift_end_at IS NULL THEN NULL
    ELSE (EXTRACT(EPOCH FROM (e.shift_end_at - s.shift_start_at)) / 60)::int
  END                       AS duration_minutes,
  (e.shift_end_at IS NULL)  AS is_current,
  s.shift_date,
  s.start_event_id,
  e.end_event_id
FROM starts s
LEFT JOIN LATERAL (
  SELECT shift_end_at, end_event_id
  FROM ends
  WHERE ends.staff_id = s.staff_id
    AND ends.shift_end_at > s.shift_start_at
  ORDER BY ends.shift_end_at ASC
  LIMIT 1
) e ON true;

COMMENT ON VIEW public.staff_shifts_v IS
  'Master plan I.C Phase 4a: pairs shift_start / shift_end events from '
  'inbound_events into per-shift rows. Source for staff_segments_v + '
  'shift_summary_v.';

-- Verification — should return Lizzie Larson's Phase 3 test shift.
SELECT staff_name, shift_start_at, shift_end_at, duration_minutes, is_current, shift_date
FROM public.staff_shifts_v
WHERE staff_name = 'Lizzie Larson'
ORDER BY shift_start_at DESC
LIMIT 5;

COMMIT;
