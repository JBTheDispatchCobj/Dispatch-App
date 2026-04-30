# Milestone 0.2 / 1 — Smoke & testing plan (`/staff/task/[id]`)

## Live schema verification (Supabase SQL)

Run once after migration to confirm columns and constraint:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'tasks'
  and column_name in (
    'card_type', 'source', 'template_id', 'template_version',
    'room_number', 'room_id', 'location_label',
    'started_at', 'paused_at', 'completed_at',
    'expected_duration_minutes', 'require_checklist_complete', 'context'
  )
order by column_name;
```

Expect `context` = `jsonb` NOT NULL default `{}`, `require_checklist_complete` = `boolean` NOT NULL default `false`, and timestamptz columns nullable.

```sql
select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.tasks'::regclass and conname = 'tasks_status_check';
```

Expect check including `paused`.

## Prerequisites

0. If housekeeping **create** fails with RLS on `tasks` or profile reads log **infinite recursion** on `profiles`, run `docs/supabase/fix_rls_profiles_recursion_manager_path.sql` once in the Supabase SQL Editor (see file header for cause).
1. `docs/supabase/milestone1_architecture_lock.sql` applied (done).
2. Housekeeping tasks with `staff_id` have three checklist rows (trigger on insert + backfill) unless `card_type <> 'housekeeping_turn'` or `is_staff_report`. The **Assign to staff** list reads `public.staff` (`status = 'active'`); add directory rows if the dropdown is empty.

## Manual checks (staff)

- Open `/staff/task/<uuid>` as staff: task moves `open` → `in_progress` (if it was open); `task_events` contains `card_opened` (with `schema_version`) and `status_changed` when applicable.
- **Pause** / **Resume**: status `paused` ↔ `in_progress`; `paused_at` set/cleared; `card_paused` / `card_resumed` + `status_changed` events.
- **Checklist**: toggles persist after refresh; events `checklist_checked` / `checklist_unchecked` include `schema_version`.
- **Post note**: row in `task_comments`; `comment_added` event with `schema_version`.
- **NEED HELP**: status `blocked` (from non-terminal states); `needs_help` + `comment_added` (body “Needs help”).
- **I’M DONE**: status `done`, `completed_at` set; `marked_done` + `comment_added` (“Marked done”); redirect to `/staff`.
- With `require_checklist_complete = true` on a task (SQL update): **I’M DONE** blocked until all checklist items are done.

## Manual checks (manager / data)

- New task from manager home includes `card_type` / `source` and default checklist when assigned + housekeeping.
- Staff report creates task with `card_type = general_report`, `source = staff_report`, and **no** housekeeping checklist from trigger.

## Automated tests (follow-up)

- Add `@playwright/test` or Vitest + mocked Supabase client to assert orchestration modules call `insert`/`update` with expected shapes once a test harness exists.
