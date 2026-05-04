-- docs/supabase/wave_4d_context.sql
--
-- Wave 4D — small schema additions to unblock X-430 brief placeholders.
-- Spec: docs/kb/...xlsx + Day 22 handoff item H + per-card mappings
--       (docs/phase-3-d-430-mapping.md Gap 6, Gap 2).
--
-- Three things:
--   (a) done_at column on task_checklist_items + auto-set trigger
--   (b) Documented JSONB context subkey conventions (no DDL — context is
--       already JSONB and the staff field guard already permits writes
--       per allow_staff_context_update.sql)
--   (c) Refreshed comment on tasks.context for future devs
--
-- Run order: independent. Apply last for clarity. Idempotent.

alter table public.task_checklist_items
  add column if not exists done_at timestamptz;

comment on column public.task_checklist_items.done_at is
  'Timestamp when item was marked done. Auto-set by trigger when done flips false->true; cleared when true->false. Used by D-430 brow meta "Done · 1:18 PM".';

create or replace function public.task_checklist_set_done_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.done = true and new.done_at is null then
      new.done_at := now();
    end if;
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.done = true and old.done = false then
      new.done_at := now();
    elsif new.done = false then
      new.done_at := null;
    end if;
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists task_checklist_set_done_at_trg on public.task_checklist_items;
create trigger task_checklist_set_done_at_trg
  before insert or update on public.task_checklist_items
  for each row execute function public.task_checklist_set_done_at();

-- JSONB context subkey conventions (documented; no DDL).
--
-- tasks.context is JSONB and already exists. The staff field guard
-- (tasks_staff_field_guard, last edited by allow_staff_context_update.sql)
-- permits staff writes to context. These four new subkey conventions are
-- code-side (lib/orchestration/interpret.ts, manual task creation form,
-- eventual RES sync). Documenting here so future devs see the contract:
--
--   context.incoming_guest.extras: string[]
--     A-430 Extras briefrow + D-430 Incoming Extras. Hide if empty.
--
--   context.current_guest.service_type: string
--     S-430 Type briefrow (Standard / Long-term / * guest discount type).
--
--   context.outgoing_guest.extras: string[]
--     D-430 Outgoing Extras. Hide if empty.
--
--   context.notes: string
--     Card-level free-text note, distinct from rows in public.notes.
--     Persists with the card on archive.
--
-- Always write context with merge-safe pattern:
--   { ...(currentTask.context ?? {}),
--     <subkey>: { ...(currentTask.context?.<subkey> ?? {}), <new fields> } }

comment on column public.tasks.context is
  'Per-card JSONB metadata. Required: staff_home_bucket. '
  'Card-type subkeys: incoming_guest{name,party_size,nights,checkin_time,confirmation_number,special_requests,extras}; '
  'current_guest{name,party_size,nights_remaining,checkin_date,checkout_date,special_requests,service_type}; '
  'outgoing_guest{name,guests,nights,clean_type,extras}; '
  'notes (card-level free text, distinct from public.notes table). '
  'Always merge-safe write to preserve sibling keys.';

-- Verification:
-- select column_name, data_type from information_schema.columns
--   where table_schema='public' and table_name='task_checklist_items' and column_name='done_at';
-- select trigger_name from information_schema.triggers
--   where event_object_table = 'task_checklist_items';
-- select col_description('public.tasks'::regclass, attnum)
--   from pg_attribute
--   where attrelid = 'public.tasks'::regclass and attname = 'context';
