-- docs/supabase/taxonomy_tables.sql
--
-- Lookup tables for Notes + Maintenance taxonomies.
-- Spec: docs/kb/Dispatch — Rules Table for Card and Section Governance.xlsx,
--       Global Rules tab rows R08-R17.
--
-- Seven tables, same shape: name PK, display_order, active, created_at.
-- All authenticated users can read; admin/manager can write.
--
-- Run order: BEFORE notes_table.sql (notes FKs into the four note taxonomies).
-- Idempotent — safe to re-run.

create table if not exists public.note_types (
  name text primary key,
  display_order int not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.note_types is 'Note Type taxonomy. Spec: Global Rules R08. 11 seed values.';
insert into public.note_types (name, display_order) values
  ('Maintenance',    10),
  ('Guest Needs',    20),
  ('Guest Profile',  30),
  ('Guest Damage',   40),
  ('Guest Update',   50),
  ('Supply',         60),
  ('Admin',          70),
  ('Team',           80),
  ('Change/Update',  90),
  ('Employee',      100),
  ('Needed',        110)
on conflict (name) do nothing;

create table if not exists public.note_statuses (
  name text primary key,
  display_order int not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.note_statuses is 'Note Status taxonomy. Spec: Global Rules R09. 5 seed values; display_order drives admin sort.';
insert into public.note_statuses (name, display_order) values
  ('Urgent',      10),
  ('Today',       20),
  ('This week',   30),
  ('Upcoming',    40),
  ('Just Noting', 50)
on conflict (name) do nothing;

create table if not exists public.note_assigned_to (
  name text primary key,
  display_order int not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.note_assigned_to is 'Note Assigned-to taxonomy. Spec: Global Rules R10. 5 seed values.';
insert into public.note_assigned_to (name, display_order) values
  ('Employee', 10),
  ('Guest',    20),
  ('Desk',     30),
  ('Admin',    40),
  ('Room',     50)
on conflict (name) do nothing;

create table if not exists public.maintenance_severities (
  name text primary key,
  display_order int not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.maintenance_severities is 'Maintenance severity. Spec: Global Rules R15. High → live admin notification.';
insert into public.maintenance_severities (name, display_order) values
  ('Low',    10),
  ('Normal', 20),
  ('High',   30)
on conflict (name) do nothing;

create table if not exists public.maintenance_locations (
  name text primary key,
  display_order int not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.maintenance_locations is 'Maintenance location dropdown. Spec: Global Rules R12 (Maintenance Dropdowns doc). Flat seed; sub-location split deferred to post-beta.';
insert into public.maintenance_locations (name, display_order) values
  ('Rooms',                10),
  ('Lobby',                20),
  ('Supply Room',          30),
  ('Laundry Room',         40),
  ('Breakfast Room',       50),
  ('Hallway - 20s',        60),
  ('Hallway - 30s',        70),
  ('Hallway - 40s',        80),
  ('Hallway - Laundry',    90),
  ('Hallway - Breakfast', 100),
  ('Front Office',        110),
  ('Public Restroom',     120),
  ('Outside - Front',     130),
  ('Outside - East',      140),
  ('Outside - West',      150),
  ('Outside - Back',      160),
  ('Outside - Garage',    170),
  ('Entry',               180),
  ('Breakfast Area',      190),
  ('Apartment',           200),
  ('Back Office',         210)
on conflict (name) do nothing;

create table if not exists public.maintenance_items (
  name text primary key,
  display_order int not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.maintenance_items is 'Maintenance item / sub-location categories. Spec: Global Rules R13.';
insert into public.maintenance_items (name, display_order) values
  ('Furniture',    10),
  ('Appliances',   20),
  ('Plumbing',     30),
  ('Walls',        40),
  ('Electrical',   50),
  ('Decor',        60),
  ('Linens',       70),
  ('Tools',        80),
  ('Floors',       90),
  ('Built-In',    100),
  ('Small Items', 110)
on conflict (name) do nothing;

create table if not exists public.maintenance_types (
  name text primary key,
  display_order int not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table public.maintenance_types is 'Maintenance damage types. Spec: Global Rules R14.';
insert into public.maintenance_types (name, display_order) values
  ('Broken',     10),
  ('Chipped',    20),
  ('Missing',    30),
  ('Hole',       40),
  ('Loose',      50),
  ('Faded',      60),
  ('Scratched',  70),
  ('Cut',        80),
  ('Stained',    90),
  ('Other',     100)
on conflict (name) do nothing;

alter table public.note_types enable row level security;
drop policy if exists note_types_select on public.note_types;
create policy note_types_select on public.note_types for select to authenticated using (true);
drop policy if exists note_types_admin_all on public.note_types;
create policy note_types_admin_all on public.note_types for all to authenticated
  using (auth_profile_role() in ('admin','manager'))
  with check (auth_profile_role() in ('admin','manager'));

alter table public.note_statuses enable row level security;
drop policy if exists note_statuses_select on public.note_statuses;
create policy note_statuses_select on public.note_statuses for select to authenticated using (true);
drop policy if exists note_statuses_admin_all on public.note_statuses;
create policy note_statuses_admin_all on public.note_statuses for all to authenticated
  using (auth_profile_role() in ('admin','manager'))
  with check (auth_profile_role() in ('admin','manager'));

alter table public.note_assigned_to enable row level security;
drop policy if exists note_assigned_to_select on public.note_assigned_to;
create policy note_assigned_to_select on public.note_assigned_to for select to authenticated using (true);
drop policy if exists note_assigned_to_admin_all on public.note_assigned_to;
create policy note_assigned_to_admin_all on public.note_assigned_to for all to authenticated
  using (auth_profile_role() in ('admin','manager'))
  with check (auth_profile_role() in ('admin','manager'));

alter table public.maintenance_severities enable row level security;
drop policy if exists maintenance_severities_select on public.maintenance_severities;
create policy maintenance_severities_select on public.maintenance_severities for select to authenticated using (true);
drop policy if exists maintenance_severities_admin_all on public.maintenance_severities;
create policy maintenance_severities_admin_all on public.maintenance_severities for all to authenticated
  using (auth_profile_role() in ('admin','manager'))
  with check (auth_profile_role() in ('admin','manager'));

alter table public.maintenance_locations enable row level security;
drop policy if exists maintenance_locations_select on public.maintenance_locations;
create policy maintenance_locations_select on public.maintenance_locations for select to authenticated using (true);
drop policy if exists maintenance_locations_admin_all on public.maintenance_locations;
create policy maintenance_locations_admin_all on public.maintenance_locations for all to authenticated
  using (auth_profile_role() in ('admin','manager'))
  with check (auth_profile_role() in ('admin','manager'));

alter table public.maintenance_items enable row level security;
drop policy if exists maintenance_items_select on public.maintenance_items;
create policy maintenance_items_select on public.maintenance_items for select to authenticated using (true);
drop policy if exists maintenance_items_admin_all on public.maintenance_items;
create policy maintenance_items_admin_all on public.maintenance_items for all to authenticated
  using (auth_profile_role() in ('admin','manager'))
  with check (auth_profile_role() in ('admin','manager'));

alter table public.maintenance_types enable row level security;
drop policy if exists maintenance_types_select on public.maintenance_types;
create policy maintenance_types_select on public.maintenance_types for select to authenticated using (true);
drop policy if exists maintenance_types_admin_all on public.maintenance_types;
create policy maintenance_types_admin_all on public.maintenance_types for all to authenticated
  using (auth_profile_role() in ('admin','manager'))
  with check (auth_profile_role() in ('admin','manager'));

-- Verification:
-- select count(*) from public.note_types;            -- expect 11
-- select count(*) from public.note_statuses;          -- expect 5
-- select count(*) from public.note_assigned_to;       -- expect 5
-- select count(*) from public.maintenance_severities; -- expect 3
-- select count(*) from public.maintenance_locations;  -- expect 21
-- select count(*) from public.maintenance_items;      -- expect 11
-- select count(*) from public.maintenance_types;      -- expect 10
