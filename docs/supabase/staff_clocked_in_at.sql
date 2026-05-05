-- Master plan I.C — Clock-In + Wrap Shift end-to-end flow.
--
-- Adds a single nullable timestamptz column to public.staff that records
-- the moment a staff member clocks in. Wrap Shift on E-430 nulls it
-- (Phase 2). Used to gate /staff between the Pre-Clock-In screen (I.B)
-- and the bucket deck.
--
-- Atomic flip; no separate shift_id table for beta. Master plan VII.D
-- (14-day segments table-or-view) is deferred to Phase 4 — segments will
-- be a computed view over clock-in/out events post-beta.
--
-- Idempotent. Safe to re-run.

BEGIN;

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS clocked_in_at timestamptz NULL;

COMMENT ON COLUMN public.staff.clocked_in_at IS
  'Master plan I.C: when set, the staff member is currently clocked in. '
  'Wrap Shift on E-430 nulls it. Used to gate /staff Pre-Clock-In screen.';

-- Verification — should return one row showing the new column.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'staff'
  AND column_name = 'clocked_in_at';

COMMIT;
