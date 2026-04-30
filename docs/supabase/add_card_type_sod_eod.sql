-- Migration: extend tasks_card_type_check to include start_of_day and eod
-- Run in Supabase dashboard SQL editor.
-- Safe to re-run: DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT.

alter table public.tasks
  drop constraint if exists tasks_card_type_check;

alter table public.tasks
  add constraint tasks_card_type_check
  check (card_type in (
    'housekeeping_turn',
    'arrival',
    'stayover',
    'eod',
    'dailys',
    'start_of_day',
    'maintenance',
    'generic'
  ));

-- Verify: should show the new constraint with all 8 values
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.tasks'::regclass
  and conname = 'tasks_card_type_check';

-- Preview: SOD tasks that will be updated (eyeball before committing)
select id, title, card_type, context->>'staff_home_bucket' as bucket
from public.tasks
where context->>'staff_home_bucket' = 'start_of_day'
  and card_type <> 'start_of_day';

-- Backfill SOD: fix any task in the start_of_day bucket with wrong card_type
update public.tasks
set card_type = 'start_of_day'
where context->>'staff_home_bucket' = 'start_of_day'
  and card_type <> 'start_of_day';

-- Preview: EOD tasks that will be updated
select id, title, card_type, context->>'staff_home_bucket' as bucket
from public.tasks
where context->>'staff_home_bucket' = 'eod'
  and card_type <> 'eod';

-- Backfill EOD: fix any task in the eod bucket with wrong card_type
update public.tasks
set card_type = 'eod'
where context->>'staff_home_bucket' = 'eod'
  and card_type <> 'eod';

-- Spot-check: confirm task 980f6e43 picked up card_type = 'start_of_day'
select id, card_type, context->>'staff_home_bucket' as bucket
from public.tasks
where id = '980f6e43-e30c-49e7-b9b7-ce9190b0729a';
