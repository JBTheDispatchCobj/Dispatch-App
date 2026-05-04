-- docs/supabase/notes_table.sql
--
-- Notes table — card-attached notes per Global Rules R08-R11 + R25.
-- Replaces ad-hoc note placeholders on D-430 / S-430 / SOD-430 / EOD.
--
-- Dual-sink rule (R25): every note hits both an individual log under the
-- relevant staff member on /admin/staff/[id] AND a category card grouped
-- by Note Type. Both views are query-side over the same row — no fan-out.
--
-- Run order: AFTER taxonomy_tables.sql. Idempotent.

create table if not exists public.notes (
  id                       uuid primary key default gen_random_uuid(),

  task_id                  uuid not null references public.tasks(id) on delete cascade,

  author_user_id           uuid not null references auth.users(id) on delete cascade,
  author_display_name      text not null default '',

  body                     text not null check (length(body) > 0),
  image_url                text,

  note_type                text not null references public.note_types(name),
  note_status              text not null default 'Just Noting'
                                       references public.note_statuses(name),
  note_assigned_to         text not null references public.note_assigned_to(name),

  assigned_user_id         uuid references auth.users(id) on delete set null,

  room_number              text,
  card_type                text,

  created_at               timestamptz not null default now(),
  resolved_at              timestamptz,
  resolved_by_user_id      uuid references auth.users(id) on delete set null
);

comment on table public.notes is
  'Card-attached notes. Spec: Global Rules R08-R11 + R25. Dual-sink admin views are query-side over the same row.';
comment on column public.notes.assigned_user_id is
  'Optional pin to a specific staff member (typically when note_assigned_to = Employee and a person is named).';
comment on column public.notes.room_number is
  'Denormalized from tasks.room_number on insert. Drives admin-by-room queries.';
comment on column public.notes.card_type is
  'Denormalized from tasks.card_type on insert. May go stale if parent task is later edited (acceptable for beta).';

create index if not exists notes_task_idx
  on public.notes (task_id, created_at);

create index if not exists notes_author_idx
  on public.notes (author_user_id, created_at desc);

create index if not exists notes_type_status_idx
  on public.notes (note_type, note_status, created_at desc);

create index if not exists notes_assigned_user_idx
  on public.notes (assigned_user_id)
  where assigned_user_id is not null;

create index if not exists notes_room_idx
  on public.notes (room_number, created_at desc)
  where room_number is not null;

create or replace function public.notes_denormalize()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.room_number is null or new.card_type is null then
    select t.room_number, t.card_type
      into new.room_number, new.card_type
      from public.tasks t
      where t.id = new.task_id;
  end if;
  return new;
end;
$$;

drop trigger if exists notes_denormalize_trg on public.notes;
create trigger notes_denormalize_trg
  before insert on public.notes
  for each row execute function public.notes_denormalize();

alter table public.notes enable row level security;

drop policy if exists notes_insert on public.notes;
create policy notes_insert on public.notes
  for insert to authenticated
  with check (
    author_user_id = auth.uid()
    and public.can_read_task(task_id)
  );

drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes
  for select to authenticated
  using (
    auth_profile_role() in ('admin','manager')
    or public.can_read_task(task_id)
    or author_user_id = auth.uid()
  );

drop policy if exists notes_update on public.notes;
create policy notes_update on public.notes
  for update to authenticated
  using (auth_profile_role() in ('admin','manager'))
  with check (auth_profile_role() in ('admin','manager'));

drop policy if exists notes_delete on public.notes;
create policy notes_delete on public.notes
  for delete to authenticated
  using (auth_profile_role() in ('admin','manager'));

-- Verification:
-- select count(*) from public.notes;
-- select indexname from pg_indexes where tablename = 'notes';
-- select policyname from pg_policies where tablename = 'notes';
