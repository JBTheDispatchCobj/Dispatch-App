-- Fix: profiles RLS infinite recursion + manager task INSERT denied
-- Apply in Supabase SQL Editor once (safe to re-run).
--
-- Cause: policies "profiles_select_manager_peers" and
-- "profiles_select_managers_for_mentions" used EXISTS (SELECT ... FROM profiles me ...),
-- which re-evaluated ALL profiles SELECT policies on the inner scan → infinite recursion.
-- Any other policy that queried profiles as the invoker (e.g. tasks_insert_role WITH CHECK)
-- hit the same recursion or could not see a row → INSERT failed with RLS on tasks.
--
-- Fix: SECURITY DEFINER helper reads role with owner privileges (bypasses RLS).
-- Policies and tasks_insert use public.auth_profile_role() instead of self-joins on profiles.

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

-- Profiles: remove recursive EXISTS subqueries
drop policy if exists "profiles_select_managers_for_mentions" on public.profiles;
create policy "profiles_select_managers_for_mentions"
  on public.profiles for select to authenticated
  using (
    public.auth_profile_role() = 'staff'
    and role in ('admin', 'manager')
  );

drop policy if exists "profiles_select_manager_peers" on public.profiles;
create policy "profiles_select_manager_peers"
  on public.profiles for select to authenticated
  using (
    public.auth_profile_role() in ('admin', 'manager')
    and role in ('admin', 'manager')
  );

-- Tasks INSERT: same helper (WITH CHECK ran as invoker → profiles RLS recursion)
drop policy if exists "tasks_insert_role" on public.tasks;
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

-- Checklist policies (manager path + staff smoke)
drop policy if exists "task_checklist_manager_all" on public.task_checklist_items;
create policy "task_checklist_manager_all"
  on public.task_checklist_items for all to authenticated
  using (public.auth_profile_role() in ('admin', 'manager'))
  with check (public.auth_profile_role() in ('admin', 'manager'));

drop policy if exists "task_checklist_staff_select" on public.task_checklist_items;
create policy "task_checklist_staff_select"
  on public.task_checklist_items for select to authenticated
  using (
    public.auth_profile_role() = 'staff'
    and public.can_read_task(task_id)
  );

drop policy if exists "task_checklist_staff_update" on public.task_checklist_items;
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

-- Task events (manager read path)
drop policy if exists "task_events_select_managers" on public.task_events;
create policy "task_events_select_managers"
  on public.task_events for select to authenticated
  using (public.auth_profile_role() in ('admin', 'manager'));
