-- Dispatch: one row per calendar day (property-local date from the app).
-- Run in Supabase SQL Editor after creating the project.

create table if not exists public.dispatch_day (
  day date primary key,
  brief text not null default '',
  watchlist text[] not null default '{}'
);

comment on table public.dispatch_day is 'Daily brief and watchlist for a single-property MVP; one row per day.';

alter table public.dispatch_day enable row level security;

-- Any signed-in user can read and write (tighten with roles / property_id later).
create policy "dispatch_day_select_authenticated"
  on public.dispatch_day
  for select
  to authenticated
  using (true);

create policy "dispatch_day_insert_authenticated"
  on public.dispatch_day
  for insert
  to authenticated
  with check (true);

create policy "dispatch_day_update_authenticated"
  on public.dispatch_day
  for update
  to authenticated
  using (true)
  with check (true);
