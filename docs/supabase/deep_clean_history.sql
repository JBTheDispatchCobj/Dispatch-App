-- docs/supabase/deep_clean_history.sql
--
-- Deep Clean tray history — per-room rolling history of completed
-- deep-clean items. Surfaces in any future D-430 card for the same room
-- for 30 days post-completion. Rolls up to admin Deep Clean view.
--
-- Spec: docs/kb/...xlsx D-430 tab R34-R36.
-- Append-only by staff; admin/manager can correct.
--
-- Run order: independent of the other three files; apply third for clarity.
-- Idempotent.

create table if not exists public.deep_clean_history (
  id                          uuid primary key default gen_random_uuid(),

  room_number                 text not null,
  room_id                     uuid,

  task_name                   text not null,
  details                     text,

  source_task_id              uuid references public.tasks(id) on delete set null,

  completed_by_user_id        uuid references auth.users(id) on delete set null,
  completed_by_display_name   text not null default '',

  completed_on                date not null default current_date,
  created_at                  timestamptz not null default now()
);

comment on table public.deep_clean_history is
  'Per-room rolling history of completed deep-clean items. Spec: D-430 R34-R36. Append-only by staff; admin can correct.';
comment on column public.deep_clean_history.task_name is
  'Name of the deep-clean tray item (e.g., AC Unit, Bedding, Bed, Walls, Bathroom, Shower/Sink, Freezer).';
comment on column public.deep_clean_history.completed_on is
  'Date the deep-clean item was completed. Surfaces in future D-430 cards for the same room within 30 days.';

create index if not exists deep_clean_history_room_date_idx
  on public.deep_clean_history (room_number, completed_on desc);

create index if not exists deep_clean_history_source_task_idx
  on public.deep_clean_history (source_task_id)
  where source_task_id is not null;

create index if not exists deep_clean_history_completed_by_idx
  on public.deep_clean_history (completed_by_user_id, completed_on desc)
  where completed_by_user_id is not null;

alter table public.deep_clean_history enable row level security;

drop policy if exists deep_clean_history_insert on public.deep_clean_history;
create policy deep_clean_history_insert on public.deep_clean_history
  for insert to authenticated
  with check (
    auth_profile_role() in ('admin','manager')
    or (
      auth_profile_role() = 'staff'
      and completed_by_user_id = auth.uid()
      and source_task_id is not null
      and public.can_read_task(source_task_id)
    )
  );

drop policy if exists deep_clean_history_select on public.deep_clean_history;
create policy deep_clean_history_select on public.deep_clean_history
  for select to authenticated using (true);

drop policy if exists deep_clean_history_update on public.deep_clean_history;
create policy deep_clean_history_update on public.deep_clean_history
  for update to authenticated
  using (auth_profile_role() in ('admin','manager'))
  with check (auth_profile_role() in ('admin','manager'));

drop policy if exists deep_clean_history_delete on public.deep_clean_history;
create policy deep_clean_history_delete on public.deep_clean_history
  for delete to authenticated
  using (auth_profile_role() in ('admin','manager'));

-- Verification:
-- select count(*) from public.deep_clean_history;
-- select indexname from pg_indexes where tablename = 'deep_clean_history';
-- select policyname from pg_policies where tablename = 'deep_clean_history';
