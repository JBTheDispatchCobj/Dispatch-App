-- docs/supabase/activity.sql
-- Append-only activity feed for the home screen.

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  message text not null,
  created_at timestamptz not null default now()
);

comment on table public.activity_events is 'Lightweight event log; type is a short machine key, message is human-readable.';

create index if not exists activity_events_created_idx
  on public.activity_events (created_at desc);

alter table public.activity_events enable row level security;

create policy "activity_events_select_authenticated"
  on public.activity_events
  for select
  to authenticated
  using (true);

create policy "activity_events_insert_authenticated"
  on public.activity_events
  for insert
  to authenticated
  with check (true);
