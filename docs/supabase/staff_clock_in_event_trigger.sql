-- Master plan I.C Phase 3 — Orchestrator swap.
--
-- Replaces the daily_shift synthesizer in lib/orchestration/run.ts with a
-- real shift_start event written when staff actually clocks in. Browser-side
-- clockIn() updates public.staff.clocked_in_at; this trigger turns that
-- column flip into an inbound_events row that the orchestrator's existing
-- fetch loop picks up next cron cycle.
--
-- Why a SECURITY DEFINER trigger and not browser-side .from('inbound_events').insert()?
-- inbound_events RLS allows only service_role (see inbound_events_and_task_drafts.sql).
-- The browser anon-key client can't insert directly. Three options on the table:
--   (a) Add a tightly-scoped insert policy for authenticated staff.
--   (b) Add an /api/clock-in endpoint that runs server-side with service-role.
--   (c) Trigger fires server-side from a column flip the staff member is
--       already RLS-permitted to make.
-- (c) wins: atomic with the column flip (one transaction; if the event
-- insert fails, the column flip rolls back so staff isn't half-clocked-in),
-- no new RLS surface, no new API endpoint.
--
-- Symmetric: also writes shift_end on clocked_in_at flipping ts→NULL
-- (Wrap Shift on E-430). No rule consumes shift_end yet, so the orchestrator
-- marks them processed and moves on. Phase 4's 14-day segment view will
-- pair shift_start + shift_end events to compute per-segment hours.
--
-- Idempotency: the existing inbound_events_dedup constraint
--   UNIQUE (source, external_id, event_type, event_date)
-- handles same-day re-clocks. ON CONFLICT DO NOTHING. Caveat: if a staff
-- member clocks in, out, and in again on the same day, the second pair
-- silently dedupes — only the first pair is recorded. Acceptable for
-- single-property beta with typical shift patterns; Phase 4 may need to
-- revisit if shift summary accuracy demands per-segment uniqueness.
--
-- Multi-property TODO: PROPERTY_TIMEZONE is hardcoded 'America/Chicago' to
-- match lib/dispatch-config.ts. Master plan IX.C tracks moving to a
-- per-property column post-beta.
--
-- Idempotent. Safe to re-run.

BEGIN;

CREATE OR REPLACE FUNCTION public.staff_clock_in_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
-- search_path locked to defend against search_path hijacking on
-- SECURITY DEFINER functions.
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_date date;
BEGIN
  v_event_date := (now() AT TIME ZONE 'America/Chicago')::date;

  -- Clock-in: NULL → timestamp.
  IF (OLD.clocked_in_at IS NULL AND NEW.clocked_in_at IS NOT NULL) THEN
    INSERT INTO public.inbound_events (source, external_id, event_type, event_date, raw_payload)
    VALUES (
      'clock_in',
      'shift-start-' || NEW.id::text,
      'shift_start',
      v_event_date,
      jsonb_build_object('staff_id', NEW.id::text, 'staff_name', NEW.name)
    )
    ON CONFLICT (source, external_id, event_type, event_date) DO NOTHING;
  END IF;

  -- Clock-out (Wrap Shift): timestamp → NULL.
  IF (OLD.clocked_in_at IS NOT NULL AND NEW.clocked_in_at IS NULL) THEN
    INSERT INTO public.inbound_events (source, external_id, event_type, event_date, raw_payload)
    VALUES (
      'clock_in',
      'shift-end-' || OLD.id::text,
      'shift_end',
      v_event_date,
      jsonb_build_object(
        'staff_id', OLD.id::text,
        'staff_name', OLD.name,
        'shift_start_at', OLD.clocked_in_at
      )
    )
    ON CONFLICT (source, external_id, event_type, event_date) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.staff_clock_in_event() IS
  'Master plan I.C Phase 3: writes shift_start / shift_end inbound_events when '
  'public.staff.clocked_in_at flips. SECURITY DEFINER bypasses inbound_events '
  'service-role-only RLS; trigger context guarantees the column flip already '
  'passed staff RLS.';

DROP TRIGGER IF EXISTS staff_clock_in_event_trigger ON public.staff;

CREATE TRIGGER staff_clock_in_event_trigger
  AFTER UPDATE OF clocked_in_at
  ON public.staff
  FOR EACH ROW
  WHEN (OLD.clocked_in_at IS DISTINCT FROM NEW.clocked_in_at)
  EXECUTE FUNCTION public.staff_clock_in_event();

-- Verification — should return one row each for the function and trigger.
SELECT 'function' AS kind, proname AS name
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'staff_clock_in_event'
UNION ALL
SELECT 'trigger' AS kind, tgname AS name
FROM pg_trigger
WHERE tgrelid = 'public.staff'::regclass
  AND tgname = 'staff_clock_in_event_trigger';

COMMIT;
