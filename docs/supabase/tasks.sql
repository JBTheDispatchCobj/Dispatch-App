-- Open / complete tasks for single-property MVP.
-- Run in Supabase SQL Editor after dispatch_day (order does not matter).

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'complete')),
  due_date date,
  assignee_name text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.tasks is 'Operational tasks; list open items on home.';

create index if not exists tasks_status_idx on public.tasks (status);

alter table public.tasks enable row level security;

create policy "tasks_select_authenticated"
  on public.tasks
  for select
  to authenticated
  using (true);

create policy "tasks_insert_authenticated"
  on public.tasks
  for insert
  to authenticated
  with check (true);

create policy "tasks_update_authenticated"
  on public.tasks
  for update
  to authenticated
  using (true)
  with check (true);
