-- Milestone 1: Architecture lock — runtime fields, paused status, checklist seed trigger, staff guard.
-- Apply in Supabase SQL Editor after cards_mvp.sql (or merge into fresh env).
-- Safe to re-run fragments with IF NOT EXISTS / DROP IF EXISTS where noted.

-- ---------------------------------------------------------------------------
-- 1) tasks: new columns (architecture lock §6)
-- ---------------------------------------------------------------------------
alter table public.tasks
  add column if not exists card_type text not null default 'housekeeping_turn',
  add column if not exists source text not null default 'manual',
  add column if not exists template_id uuid,
  add column if not exists template_version int,
  add column if not exists room_number text,
  add column if not exists room_id uuid,
  add column if not exists location_label text,
  add column if not exists started_at timestamptz,
  add column if not exists paused_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists expected_duration_minutes int,
  add column if not exists require_checklist_complete boolean not null default false,
  add column if not exists context jsonb not null default '{}'::jsonb;

comment on column public.tasks.card_type is 'Housekeeping MVP: housekeeping_turn, general_report, etc.';
comment on column public.tasks.source is 'manual | staff_report | pms | system';
comment on column public.tasks.template_id is 'Future FK to card_templates; nullable UUID.';
comment on column public.tasks.context is 'Instance-only JSON; document keys in TASK_EVENTS_CONTRACT / architecture doc.';

-- ---------------------------------------------------------------------------
-- 2) Status enum: add paused
-- ---------------------------------------------------------------------------
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check
  check (status in ('open', 'in_progress', 'paused', 'blocked', 'done'));

-- ---------------------------------------------------------------------------
-- 3) Staff field guard: protect new identity / config columns
-- ---------------------------------------------------------------------------
create or replace function public.tasks_staff_field_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
begin
  select role into r from public.profiles where id = auth.uid();
  if r is null or r in ('admin', 'manager') then
    return new;
  end if;
  if r = 'staff' then
    if new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.priority is distinct from old.priority
      or new.staff_id is distinct from old.staff_id
      or new.assignee_name is distinct from old.assignee_name
      or new.due_date is distinct from old.due_date
      or new.due_time is distinct from old.due_time
      or new.attachment_url is distinct from old.attachment_url
      or new.is_staff_report is distinct from old.is_staff_report
      or new.report_category is distinct from old.report_category
      or new.report_queue_status is distinct from old.report_queue_status
      or new.report_image_url is distinct from old.report_image_url
      or new.created_by_user_id is distinct from old.created_by_user_id
      or new.card_type is distinct from old.card_type
      or new.source is distinct from old.source
      or new.template_id is distinct from old.template_id
      or new.template_version is distinct from old.template_version
      or new.room_number is distinct from old.room_number
      or new.room_id is distinct from old.room_id
      or new.location_label is distinct from old.location_label
      or new.expected_duration_minutes is distinct from old.expected_duration_minutes
      or new.require_checklist_complete is distinct from old.require_checklist_complete
      or new.context is distinct from old.context
    then
      raise exception 'staff may only change status and timing fields on this card';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Default checklist seed (INSERT only): assigned housekeeping cards
-- ---------------------------------------------------------------------------
create or replace function public.tasks_seed_default_checklist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_staff_report = true then
    return new;
  end if;
  if new.staff_id is null then
    return new;
  end if;
  if coalesce(new.card_type, 'housekeeping_turn') <> 'housekeeping_turn' then
    return new;
  end if;
  insert into public.task_checklist_items (task_id, title, sort_order, done)
  values
    (new.id, 'Remove used linens', 0, false),
    (new.id, 'Replace sheets and pillowcases', 1, false),
    (new.id, 'Set up rollaway (if on ticket)', 2, false);
  return new;
end;
$$;

drop trigger if exists tasks_seed_default_checklist_trg on public.tasks;
create trigger tasks_seed_default_checklist_trg
  after insert on public.tasks
  for each row execute function public.tasks_seed_default_checklist();

-- ---------------------------------------------------------------------------
-- 5) One-time backfill: existing assigned housekeeping tasks with no checklist
-- ---------------------------------------------------------------------------
insert into public.task_checklist_items (task_id, title, sort_order, done)
select t.id, v.title, v.sort_order, false
from public.tasks t
cross join (
  values
    (0, 'Remove used linens'),
    (1, 'Replace sheets and pillowcases'),
    (2, 'Set up rollaway (if on ticket)')
) as v(sort_order, title)
where t.is_staff_report = false
  and t.staff_id is not null
  and coalesce(t.card_type, 'housekeeping_turn') = 'housekeeping_turn'
  and not exists (
    select 1 from public.task_checklist_items c where c.task_id = t.id
  );

create index if not exists tasks_staff_status_idx
  on public.tasks (staff_id, status)
  where staff_id is not null;
