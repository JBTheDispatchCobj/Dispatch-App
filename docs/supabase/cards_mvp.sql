-- Cards MVP: profiles, task extensions, comments, checklist, events, storage, RLS.
-- Run in Supabase SQL Editor after staff.sql + existing tasks migrations.
-- 1) Backfill profiles for existing auth users (run once):
--    insert into public.profiles (id, role, display_name)
--    select u.id, 'manager', coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
--    from auth.users u
--    where not exists (select 1 from public.profiles p where p.id = u.id);

-- ---------------------------------------------------------------------------
-- Profiles (auth role + optional link to staff directory row)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'manager'
    check (role in ('admin', 'manager', 'staff')),
  staff_id uuid references public.staff (id) on delete set null,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'App role + optional staff directory link for staff UX.';

alter table public.profiles enable row level security;

-- Current user's role without recursive profiles RLS (peer/mention policies must not self-scan profiles).
create or replace function public.auth_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role::text from public.profiles p where p.id = auth.uid();
$$;

comment on function public.auth_profile_role() is
  'Current user role from profiles; definer bypasses RLS for policy checks (avoids recursion).';

revoke all on function public.auth_profile_role() from public;
grant execute on function public.auth_profile_role() to authenticated;
grant execute on function public.auth_profile_role() to service_role;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- Staff can read manager/admin rows (display names for @mentions in comments)
create policy "profiles_select_managers_for_mentions"
  on public.profiles for select to authenticated
  using (
    public.auth_profile_role() = 'staff'
    and role in ('admin', 'manager')
  );

-- Managers can read other admin/manager profiles (shared @mentions)
create policy "profiles_select_manager_peers"
  on public.profiles for select to authenticated
  using (
    public.auth_profile_role() in ('admin', 'manager')
    and role in ('admin', 'manager')
  );

-- New signups get a profile (default manager; change role/staff_id in SQL as needed)
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    'manager',
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- ---------------------------------------------------------------------------
-- Tasks: new statuses, scheduling, reports, attachment
-- ---------------------------------------------------------------------------
alter table public.tasks drop constraint if exists tasks_status_check;

update public.tasks set status = 'done' where status = 'complete';

alter table public.tasks
  add column if not exists due_time time without time zone,
  add column if not exists created_by_user_id uuid references auth.users (id) on delete set null,
  add column if not exists is_staff_report boolean not null default false,
  add column if not exists report_category text,
  add column if not exists report_queue_status text not null default 'none'
    check (report_queue_status in ('none', 'pending', 'reviewed')),
  add column if not exists report_image_url text,
  add column if not exists attachment_url text;

alter table public.tasks
  add constraint tasks_status_check
  check (status in ('open', 'in_progress', 'blocked', 'done'));

comment on column public.tasks.is_staff_report is 'True when created from staff note/report flow.';
comment on column public.tasks.report_queue_status is 'pending = awaiting manager review for staff reports.';

create index if not exists tasks_report_queue_idx
  on public.tasks (report_queue_status) where is_staff_report = true;

-- ---------------------------------------------------------------------------
-- Visibility helper (security definer)
-- ---------------------------------------------------------------------------
create or replace function public.can_read_task(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'manager')
    )
    or exists (
      select 1
      from public.tasks t
      join public.profiles p on p.id = auth.uid()
      where t.id = p_task_id
        and p.role = 'staff'
        and (
          (p.staff_id is not null and t.staff_id = p.staff_id)
          or t.created_by_user_id = auth.uid()
        )
    );
$$;

-- Staff cannot change protected columns on tasks
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
    then
      raise exception 'staff may only change status on this card';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_staff_guard_trg on public.tasks;
create trigger tasks_staff_guard_trg
  before update on public.tasks
  for each row execute function public.tasks_staff_field_guard();

-- Replace tasks RLS
drop policy if exists "tasks_select_authenticated" on public.tasks;
drop policy if exists "tasks_insert_authenticated" on public.tasks;
drop policy if exists "tasks_update_authenticated" on public.tasks;

create policy "tasks_select_role"
  on public.tasks for select to authenticated
  using (public.can_read_task(id));

create policy "tasks_insert_role"
  on public.tasks for insert to authenticated
  with check (
    public.auth_profile_role() in ('admin', 'manager')
    or (
      public.auth_profile_role() = 'staff'
      and is_staff_report is true
      and created_by_user_id = auth.uid()
    )
  );

create policy "tasks_update_role"
  on public.tasks for update to authenticated
  using (public.can_read_task(id))
  with check (public.can_read_task(id));

-- ---------------------------------------------------------------------------
-- Task comments
-- ---------------------------------------------------------------------------
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_display_name text not null default '',
  body text not null default '',
  image_url text,
  checklist_item_id uuid,
  created_at timestamptz not null default now()
);

comment on table public.task_comments is 'Chronological card thread (not home Activity).';

create index if not exists task_comments_task_created_idx
  on public.task_comments (task_id, created_at);

alter table public.task_comments enable row level security;

create policy "task_comments_select"
  on public.task_comments for select to authenticated
  using (public.can_read_task(task_id));

create policy "task_comments_insert"
  on public.task_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.can_read_task(task_id)
  );

-- Optional FK to checklist (added after table exists)
alter table public.task_comments
  drop constraint if exists task_comments_checklist_item_id_fkey;

-- ---------------------------------------------------------------------------
-- Checklist
-- ---------------------------------------------------------------------------
create table if not exists public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists task_checklist_task_idx
  on public.task_checklist_items (task_id, sort_order);

alter table public.task_checklist_items enable row level security;

alter table public.task_comments
  add constraint task_comments_checklist_item_id_fkey
  foreign key (checklist_item_id) references public.task_checklist_items (id) on delete set null;

-- Managers: full CRUD
create policy "task_checklist_manager_all"
  on public.task_checklist_items for all to authenticated
  using (public.auth_profile_role() in ('admin', 'manager'))
  with check (public.auth_profile_role() in ('admin', 'manager'));

-- Staff: read + toggle done only (enforced by trigger)
create policy "task_checklist_staff_select"
  on public.task_checklist_items for select to authenticated
  using (
    public.auth_profile_role() = 'staff'
    and public.can_read_task(task_id)
  );

create policy "task_checklist_staff_update"
  on public.task_checklist_items for update to authenticated
  using (
    public.auth_profile_role() = 'staff'
    and public.can_read_task(task_id)
  )
  with check (
    public.auth_profile_role() = 'staff'
    and public.can_read_task(task_id)
  );

create or replace function public.task_checklist_staff_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
begin
  select role into r from public.profiles where id = auth.uid();
  if tg_op = 'DELETE' then
    if r = 'staff' then
      raise exception 'staff cannot add or remove checklist items';
    end if;
    return old;
  end if;
  if r is null or r in ('admin', 'manager') then
    return new;
  end if;
  if r = 'staff' and tg_op = 'INSERT' then
    raise exception 'staff cannot add or remove checklist items';
  end if;
  if r = 'staff' and tg_op = 'UPDATE' then
    if new.task_id is distinct from old.task_id
      or new.title is distinct from old.title
      or new.sort_order is distinct from old.sort_order
    then
      raise exception 'staff can only check or uncheck items';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists task_checklist_staff_guard_trg on public.task_checklist_items;
create trigger task_checklist_staff_guard_trg
  before insert or update or delete on public.task_checklist_items
  for each row execute function public.task_checklist_staff_guard();

-- ---------------------------------------------------------------------------
-- Task events (monitoring foundation; managers read, writers must access card)
-- ---------------------------------------------------------------------------
create table if not exists public.task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists task_events_task_created_idx
  on public.task_events (task_id, created_at desc);

alter table public.task_events enable row level security;

create policy "task_events_insert"
  on public.task_events for insert to authenticated
  with check (
    public.can_read_task(task_id)
    and (user_id is null or user_id = auth.uid())
  );

create policy "task_events_select_managers"
  on public.task_events for select to authenticated
  using (public.auth_profile_role() in ('admin', 'manager'));

-- ---------------------------------------------------------------------------
-- Storage bucket for uploads (comments + reports)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('task-files', 'task-files', true)
on conflict (id) do nothing;

create policy "task_files_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'task-files');

create policy "task_files_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'task-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
