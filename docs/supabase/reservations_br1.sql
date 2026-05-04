-- docs/supabase/reservations_br1.sql
--
-- Reservations table — BR1 of the deferred BR pack from Day 20 handoff.
-- Powers the daily brief counts on staff home (3 arrivals · 2 departures · 4
-- stayovers — currently hardcoded) plus the guest-data fields on every X-430
-- detail card brief (D-430 outgoing/incoming, A-430 guest, S-430 current_guest,
-- E-430 What's Next next-shift preview).
--
-- Pre-beta, single-property scope. Multi-property and proper ResNexus webhook
-- sync land in BR5 / post-beta.
--
-- Run order: after milestone1_architecture_lock.sql, after
-- inbound_events_and_task_drafts.sql, after the profiles + auth_profile_role()
-- function exist.

-- =========================================================================
-- Table
-- =========================================================================

create extension if not exists "uuid-ossp";

create table if not exists public.reservations (
  id               uuid primary key default uuid_generate_v4(),

  -- Source / identity
  external_id      text unique,                  -- ResNexus reservation ID; null for manual / walk-in
  source           text not null default 'manual'
                   check (source in ('resnexus', 'manual', 'walk_in')),

  -- Lifecycle status
  status           text not null default 'confirmed'
                   check (status in ('confirmed', 'arrived', 'departed', 'cancelled', 'no_show')),

  -- Guest
  guest_name       text not null,
  party_size       int not null default 1,
  adults           int default 1,
  children         int default 0,
  pets             int default 0,
  vip              boolean default false,
  return_guest     boolean default false,
  guest_notes      text,
  special_requests text[],

  -- Stay
  room_number      text not null,                -- matches the catalog in lib/checklists/rooms.ts
  arrival_date     date not null,
  departure_date   date not null,
  arrival_time     time,                         -- e.g., '16:00' for 4 PM check-in
  nights           int generated always as (greatest(1, departure_date - arrival_date)) stored,

  -- Audit / debug
  raw_payload      jsonb,                        -- original ResNexus payload, kept for reconciliation
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  cancelled_at     timestamptz,

  -- Sanity
  check (departure_date >= arrival_date),
  check (party_size >= 1),
  check (adults >= 0 and children >= 0 and pets >= 0)
);

comment on table public.reservations is
  'Guest reservations for the property. Source of truth for daily brief counts on staff home + admin home, and for the guest fields rendered on X-430 staff detail cards.';

comment on column public.reservations.external_id is
  'ResNexus reservation ID. Null for manual / walk-in entries.';

comment on column public.reservations.nights is
  'Generated: max(1, departure_date - arrival_date). Same-day stays count as 1 night.';

comment on column public.reservations.status is
  'Lifecycle: confirmed (booked, not yet checked in) / arrived (checked in) / departed (checked out) / cancelled / no_show. Brief queries filter on (confirmed, arrived).';

-- =========================================================================
-- Indexes — tuned for the three brief queries
-- =========================================================================

create index if not exists reservations_arrival_date_idx
  on public.reservations (arrival_date)
  where status in ('confirmed', 'arrived');

create index if not exists reservations_departure_date_idx
  on public.reservations (departure_date)
  where status in ('confirmed', 'arrived');

create index if not exists reservations_stayover_window_idx
  on public.reservations (arrival_date, departure_date)
  where status in ('confirmed', 'arrived');

create index if not exists reservations_room_number_idx
  on public.reservations (room_number);

create index if not exists reservations_external_id_idx
  on public.reservations (external_id)
  where external_id is not null;

-- =========================================================================
-- Triggers — auto-bump updated_at; stamp cancelled_at on status flip
-- =========================================================================

create or replace function public.reservations_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.status = 'cancelled' and (old.status is distinct from 'cancelled') then
    new.cancelled_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_set_updated_at on public.reservations;
create trigger reservations_set_updated_at
  before update on public.reservations
  for each row
  execute function public.reservations_set_updated_at();

-- =========================================================================
-- RLS — managers/admins read+write; staff read-only
-- =========================================================================

alter table public.reservations enable row level security;

drop policy if exists reservations_manager_all on public.reservations;
create policy reservations_manager_all on public.reservations
  for all
  using (auth_profile_role() in ('admin', 'manager'))
  with check (auth_profile_role() in ('admin', 'manager'));

drop policy if exists reservations_staff_read on public.reservations;
create policy reservations_staff_read on public.reservations
  for select
  using (auth_profile_role() in ('admin', 'manager', 'staff'));

-- =========================================================================
-- Verification (run after applying — should return zero errors)
-- =========================================================================

-- select count(*) from public.reservations;
-- select indexname from pg_indexes where tablename = 'reservations';
-- select policyname from pg_policies where tablename = 'reservations';
