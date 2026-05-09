-- Day 51 chase #5 — clean up legacy 3-item checklist seed rows.
--
-- The pre-Day-49-hotfix tasks_seed_default_checklist() trigger inserted 3
-- non-canonical items ('Remove used linens' / 'Replace sheets and pillowcases'
-- / 'Set up rollaway') on housekeeping_turn tasks. Day 49 hotfix replaced
-- the trigger with the 7-item canonical seed list (see
-- checklist_seed_canonical_alignment.sql), but the legacy rows remain in
-- task_checklist_items on tasks created before the hotfix.
--
-- These rows don't render in the staff card UI (lib/staff-task-execution-checklist.ts
-- buildDisplayChecklist matches by canonical title; legacy titles never
-- match any canonical row), but they slightly bloat task_checklist_items
-- row count and could confuse future audit queries.
--
-- DESTRUCTIVE — deletes rows whose lowercased title is in the legacy set.
-- The match is case-insensitive but the legacy seed inserted exact-case
-- strings, so the lower() comparison is defensive against any manual edits.
--
-- Verification: count rows before + after to confirm the delete landed.
-- Run order doesn't matter; not tied to other migrations.
--
-- Idempotent (DELETE WHERE matches). Safe to re-run — second run is a no-op.

BEGIN;

-- Pre-delete count for visibility.
SELECT COUNT(*) AS legacy_rows_before_delete
FROM public.task_checklist_items
WHERE lower(title) IN (
  'remove used linens',
  'replace sheets and pillowcases',
  'set up rollaway (if on ticket)'
);

DELETE FROM public.task_checklist_items
WHERE lower(title) IN (
  'remove used linens',
  'replace sheets and pillowcases',
  'set up rollaway (if on ticket)'
);

-- Post-delete count — should be 0.
SELECT COUNT(*) AS legacy_rows_after_delete
FROM public.task_checklist_items
WHERE lower(title) IN (
  'remove used linens',
  'replace sheets and pillowcases',
  'set up rollaway (if on ticket)'
);

COMMIT;
