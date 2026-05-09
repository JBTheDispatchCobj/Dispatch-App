-- Master plan VII.G — team_roster_v view.
--
-- One row per public.staff member (active + inactive both — consumer filters
-- as needed). Surfaces who's on shift now, what they're currently doing, and
-- whether they've crossed into their EOD card. Pre-positions:
--
--   - I.H Da-430 Team Update section (name + role + current activity).
--   - I.I E-430 Team Updates section (same shape, EOD context).
--   - I.I cross-staff EOD activation gate (is_in_eod boolean replaces the
--     two-step staff + tasks fetch in lib/clock-in.ts:canWrapShift).
--
-- Optional future consumer: app/admin/page.tsx Scheduling lane
-- (fetchSchedulingItems) — currently queries public.staff directly with
-- on-shift sort. Could migrate to this view post-VII.G if convenient; not
-- in scope here.
--
-- Column conventions follow the Day-32 trio (staff_shifts_v / staff_segments_v
-- / shift_summary_v). View naming `<entity>_<aspect>_v` matches the trio.
--
-- Definitions / edge cases:
--
--   - "Current task" = most recent task with status='in_progress' for this
--     staff_id, ordered by COALESCE(started_at, created_at) DESC LIMIT 1.
--     A staff with multiple in-flight tasks (e.g., paused stayover + active
--     EOD) surfaces only the most recently started one. NULL across all
--     current_* columns when nothing is in_progress.
--
--   - "is_in_eod" matches lib/clock-in.ts:canWrapShift exactly: at least
--     one task with card_type='eod' AND status != 'open' created in the
--     last 24h. The 24h window keeps stale EOD rows from previous shifts
--     out of the check (acceptable for typical 7-3 / 3-11 shifts at the
--     beta hotel; multi-shift / overnight needs adjustment per STATE.md
--     standing-tabled item).
--
--   - "is_on_shift" = clocked_in_at IS NOT NULL. Mirrors the existing
--     /admin Scheduling lane semantics.
--
--   - Inactive staff (status='inactive') are NOT filtered out of the view.
--     Consumers that only want active staff filter at query time. Mirrors
--     staff_shifts_v (no status filter) and gives /admin Scheduling lane
--     a path to render its inactive-tier rows from this view if it ever
--     migrates.
--
--   - tasks.staff_id is uuid; public.staff.id is uuid. No text cast needed
--     (unlike shift_summary_v which joins against the inbound_events
--     text-typed staff_id).
--
-- Idempotent. Safe to re-run. Depends on public.staff (always present
-- post-Day-25) and public.tasks (always present).

BEGIN;

CREATE OR REPLACE VIEW public.team_roster_v AS
SELECT
  s.id                                  AS staff_id,
  s.name                                AS staff_name,
  s.role,
  s.status,
  s.clocked_in_at,
  (s.clocked_in_at IS NOT NULL)         AS is_on_shift,
  curr.task_id                          AS current_task_id,
  curr.card_type                        AS current_card_type,
  curr.title                            AS current_task_title,
  curr.room_number                      AS current_task_room,
  curr.started_at                       AS current_task_started_at,
  EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.staff_id    = s.id
      AND t.card_type   = 'eod'
      AND t.status     != 'open'
      AND t.created_at >= now() - interval '24 hours'
  )                                     AS is_in_eod
FROM public.staff s
LEFT JOIN LATERAL (
  SELECT
    t.id           AS task_id,
    t.card_type,
    t.title,
    t.room_number,
    t.started_at
  FROM public.tasks t
  WHERE t.staff_id = s.id
    AND t.status   = 'in_progress'
  ORDER BY COALESCE(t.started_at, t.created_at) DESC
  LIMIT 1
) curr ON true;

COMMENT ON VIEW public.team_roster_v IS
  'Master plan VII.G: per-staff current-state snapshot (on-shift flag, '
  'current in_progress task, in-EOD flag matching canWrapShift). '
  'Pre-positions I.H + I.I team displays and I.I cross-staff EOD gate.';

-- Verification — should return one row per public.staff row, with
-- current_* columns NULL unless a task is actively in_progress for that
-- staff. Lizzie Larson rows are the established test data.
SELECT
  staff_name,
  role,
  status,
  is_on_shift,
  current_card_type,
  current_task_room,
  is_in_eod
FROM public.team_roster_v
ORDER BY is_on_shift DESC, staff_name ASC;

COMMIT;
