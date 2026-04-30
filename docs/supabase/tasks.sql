-- Open tasks for single-property MVP (card model).
-- Requires public.staff to exist first. Run staff.sql before this on fresh DB.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'blocked', 'done')),
  due_date date,
  due_time time without time zone,
  assignee_name text not null default '',
  staff_id uuid references public.staff (id) on delete set null,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  created_by_user_id uuid references auth.users (id) on delete set null,
  is_staff_report boolean not null default false,
  report_category text,
  report_queue_status text not null default 'none'
    check (report_queue_status in ('none', 'pending', 'reviewed')),
  report_image_url text,
  attachment_url text,
  created_at timestamptz not null default now()
);

comment on table public.tasks is 'Operational tasks / cards; list active items on home.';

create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_staff_id_idx on public.tasks (staff_id);
create index if not exists tasks_report_queue_idx
  on public.tasks (report_queue_status) where is_staff_report = true;

alter table public.tasks enable row level security;

-- Policies tightened by docs/supabase/cards_mvp.sql (run after auth + profiles).
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
