-- Task priority. Run in Supabase SQL Editor on existing projects.

alter table public.tasks
  add column if not exists priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high'));

comment on column public.tasks.priority is 'low | medium | high; default medium.';
