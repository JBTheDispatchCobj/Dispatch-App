-- Link tasks to staff. Run in Supabase SQL Editor after staff + tasks exist.

alter table public.tasks
  add column if not exists staff_id uuid references public.staff (id) on delete set null;

create index if not exists tasks_staff_id_idx on public.tasks (staff_id);

comment on column public.tasks.staff_id is 'Preferred assignee; assignee_name kept in sync for display fallback.';
