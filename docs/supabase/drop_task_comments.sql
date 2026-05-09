-- Day 51 chase #5 — drop legacy public.task_comments table.
--
-- Pre-beta dev data only. No readers post-Day-27 (notes + maintenance_issues
-- + task_events cover all comment-shaped writes). Standing-tabled cleanup
-- closed Day 51 chase #5.
--
-- DESTRUCTIVE — drops the table and all its rows. Run order doesn't matter
-- (no dependents). CASCADE included defensively in case any FK from a future
-- table accidentally references task_comments before this runs.
--
-- Idempotent (DROP IF EXISTS). Safe to re-run.

BEGIN;

DROP TABLE IF EXISTS public.task_comments CASCADE;

COMMIT;

-- Verification — should return zero rows after the drop succeeds.
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'task_comments';
