-- docs/supabase/drop_activity_events_table.sql
--
-- Day 29 III.D Phase 6 — drops the dead public.activity_events table.
--
-- BACKGROUND
-- The table was created in docs/supabase/activity.sql as a "lightweight
-- event log" for an early activity-feed iteration. The schema is
-- structurally inadequate for the master plan III.D feed (no FK to tasks,
-- no user_id, no detail jsonb, no severity column).
--
-- docs/TASK_EVENTS_CONTRACT.md line 21 documents the architectural
-- intent: "activity_events is NOT governed by this contract. Prefer
-- deriving admin narratives from task_events over time." The Day 28 audit
-- confirmed nothing reads from this table — only writes via lib/activity-log.ts
-- (which is also being deleted in this Phase 6 cleanup).
--
-- The Day 29 III.D Phase 1-3 work landed the canonical activity feed
-- via task_events (vocabulary additions) + notes (Day 27) + the new
-- lib/activity-feed.ts query helper + the <ActivityFeed/> component on
-- /admin. With those in place this table is fully obsolete.
--
-- CODE-SIDE CLEANUP (committed in same commit as this migration)
-- - Deleted lib/activity-log.ts (the writer module).
-- - Removed all 8 logActivity() call sites across 4 production files
--   (app/tasks-section.tsx x2, app/staff-section.tsx x2,
--    app/staff/[id]/page.tsx x2, app/dispatch-section.tsx x1).
--   The window-level "activity:refresh" event each call site emitted
--   in its .then() continuation is preserved for any consumer still
--   listening on that event.
-- - Deleted app/activity-section.tsx (Phase 5 — orphan reader, zero
--   importers, replaced functionally by components/admin/ActivityFeed.tsx).
--
-- ROW DATA
-- Existing rows in activity_events are pre-beta dev noise. No production
-- consumer ever read from this table; dropping it loses no operational
-- data. If you want to archive the rows for posterity, run the SELECT
-- below before the DROP and save the output. Otherwise just run DROP.
--
-- Optional pre-DROP archival snapshot (uncomment to capture):
-- COPY (SELECT id, type, message, created_at FROM public.activity_events
--       ORDER BY created_at DESC) TO STDOUT WITH CSV HEADER;
--
-- IDEMPOTENT
-- IF EXISTS so re-running this migration is safe. CASCADE dropped because
-- nothing else in the schema references this table (verified via grep).
--
-- HOW TO APPLY
-- Paste this entire file into the Supabase dashboard SQL editor and run.
-- Verify with the post-run query block at the bottom — should return
-- zero rows.

DROP TABLE IF EXISTS public.activity_events;

-- =============================================================================
-- Verification — should return zero rows after the drop succeeds
-- =============================================================================

SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'activity_events';
