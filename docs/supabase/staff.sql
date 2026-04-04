-- docs/supabase/staff.sql
-- Staff directory + per-staff notes and outcome log (single-property MVP).
-- Run this script as a whole in the Supabase SQL Editor.

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default '',
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.staff is 'Team members; inactive = soft-removed from active ops.';

create table if not exists public.staff_outcomes (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

comment on table public.staff_outcomes is 'Short outcome / activity lines for a staff member.';

create index if not exists staff_outcomes_staff_created_idx
  on public.staff_outcomes (staff_id, created_at desc);

alter table public.staff enable row level security;
alter table public.staff_outcomes enable row level security;

create policy "staff_select_authenticated"
  on public.staff for select to authenticated using (true);

create policy "staff_insert_authenticated"
  on public.staff for insert to authenticated with check (true);

create policy "staff_update_authenticated"
  on public.staff for update to authenticated using (true) with check (true);

create policy "staff_outcomes_select_authenticated"
  on public.staff_outcomes for select to authenticated using (true);

create policy "staff_outcomes_insert_authenticated"
  on public.staff_outcomes for insert to authenticated with check (true);
