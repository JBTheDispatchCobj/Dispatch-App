-- Master plan I.C Phase 4b — staff_segments_v view.
--
-- Wed-anchored 14-day buckets aggregating shifts per staff. Each row =
-- one (staff_id, segment_start, segment_end) tuple. segment_start is
-- always a Wednesday; segment_end is the 2nd-following Tuesday (start + 13).
--
-- Segment-grid math: pick a known reference Wednesday. For any shift on
-- date D, segment_start = reference_wed + FLOOR((D - reference_wed) / 14) * 14.
-- Result lands on a Wednesday by construction (14-day stride from a
-- Wednesday is always a Wednesday).
--
-- Reference Wednesday: 2026-01-07. Verified Wednesday. Any Wednesday
-- works as long as the choice is consistent — different reference = same
-- 14-day cadence but offset boundaries. [ASK JENNIFER] post-beta whether
-- she wants a specific anchor (e.g., the Wednesday her business cycle
-- aligns to). Multi-property post-beta will need per-property anchor +
-- per-property TZ (master plan IX.C).
--
-- Excludes currently-clocked-in shifts (duration_minutes IS NULL) — they
-- appear in the segment once they end.
--
-- Master plan I.C exception clauses NOT implemented:
-- - "Admin can roll new-hire hours into the next full segment": admin
--   override UI is post-beta. View as-is includes their partial segment.
-- - "If clock-in straddles segment boundary: log to whichever segment
--   shift opened in": handled correctly here — segment_start is computed
--   from shift_start, so a shift that opens late Tuesday and closes early
--   Wednesday lands in the Tuesday-side segment, not the new one.
--
-- Idempotent. Safe to re-run. Depends on staff_shifts_v (Phase 4a).

BEGIN;

CREATE OR REPLACE VIEW public.staff_segments_v AS
WITH params AS (
  SELECT DATE '2026-01-07' AS reference_wed
),
shifts_with_segments AS (
  SELECT
    s.staff_id,
    s.staff_name,
    s.duration_minutes,
    p.reference_wed
      + (FLOOR((s.shift_date - p.reference_wed) / 14.0) * 14)::int
      AS segment_start
  FROM public.staff_shifts_v s
  CROSS JOIN params p
  WHERE s.duration_minutes IS NOT NULL
)
SELECT
  staff_id,
  staff_name,
  segment_start,
  segment_start + 13                       AS segment_end,
  COUNT(*)::int                            AS shift_count,
  COALESCE(SUM(duration_minutes), 0)::int  AS total_minutes
FROM shifts_with_segments
GROUP BY staff_id, staff_name, segment_start;

COMMENT ON VIEW public.staff_segments_v IS
  'Master plan I.C Phase 4b: Wed-anchored 14-day segment aggregation over '
  'staff_shifts_v. Reference Wednesday 2026-01-07 (post-beta override per '
  'master plan III.J).';

-- Verification — Lizzie's Phase 3 test shift (May 5) should land in the
-- segment Apr 29 – May 12 with the Jan 7 reference Wed.
SELECT staff_name, segment_start, segment_end, shift_count, total_minutes
FROM public.staff_segments_v
WHERE staff_name = 'Lizzie Larson'
ORDER BY segment_start DESC;

COMMIT;
