-- docs/supabase/maintenance_issues_table.sql
--
-- Maintenance issues table — staff-reported maintenance per master plan
-- III.B + Global Rules R12-R17. Replaces the interim path of routing
-- maintenance through public.notes with note_type='Maintenance'.
--
-- 3-sink rule (master plan III.B): every issue surfaces as
--   1. admin table by location  (query: where location = X)
--   2. admin table by type      (query: where type = X)
--   3. admin task card view     (query: where id = X — the per-issue card)
-- All three views are query-side over the same row. No fan-out write —
-- mirrors the dual-sink pattern shipped Day 24 for public.notes.
--
-- Severity escalation (Global Rules R15): High → live admin notification.
-- Beta surfaces High via the existing admin activity feed (lib/activity-feed.ts)
-- with a severity sort boost. True live push is post-beta.
--
-- Run order: AFTER taxonomy_tables.sql (FKs into the four maintenance
-- taxonomies). Idempotent — safe to re-run.
--
-- Mirrors notes_table.sql shape so the existing thread / RLS / denormalize
-- patterns carry over without surprise.

create table if not exists public.maintenance_issues (
  id                       uuid primary key default gen_random_uuid(),

  task_id                  uuid not null references public.tasks(id) on delete cascade,

  author_user_id           uuid not null references auth.users(id) on delete cascade,
  author_display_name      text not null default '',

  body                     text,
  image_url                text,

  location                 text not null references public.maintenance_locations(name),
  item                     text not null references public.maintenance_items(name),
  type                     text not null references public.maintenance_types(name),
  severity                 text not null default 'Normal'
                                       references public.maintenance_severities(name),

  room_number              text,
  card_type                text,

  created_at               timestamptz not null default now(),
  resolved_at              timestamptz,
  resolved_by_user_id      uuid references auth.users(id) on delete set null
);

comment on table public.maintenance_issues is
  'Staff-reported maintenance issues. Spec: master plan III.B + Global Rules R12-R17. 3-sink admin views (by location, by type, per-issue card) are all query-side over the same row.';
comment on column public.maintenance_issues.body is
  'Optional free-text description. Issue can be photo-only or taxonomy-only — taxonomy fields (location/item/type) carry the structured payload.';
comment on column public.maintenance_issues.severity is
  'One of Low / Normal / High. Default Normal. High severity surfaces with a sort boost on the admin activity feed (live-push is post-beta).';
comment on column public.maintenance_issues.room_number is
  'Denormalized from tasks.room_number on insert. Drives admin-by-room queries.';
comment on column public.maintenance_issues.card_type is
  'Denormalized from tasks.card_type on insert. May go stale if parent task is later edited (acceptable for beta — same trade-off as notes.card_type).';

create index if not exists maintenance_issues_task_idx
  on public.maintenance_issues (task_id, created_at);

create index if not exists maintenance_issues_author_idx
  on public.maintenance_issues (author_user_id, created_at desc);

create index if not exists maintenance_issues_location_idx
  on public.maintenance_issues (location, created_at desc);

create index if not exists maintenance_issues_type_idx
  on public.maintenance_issues (type, created_at desc);

create index if not exists maintenance_issues_severity_high_idx
  on public.maintenance_issues (created_at desc)
  where severity = 'High';

create index if not exists maintenance_issues_room_idx
  on public.maintenance_issues (room_number, created_at desc)
  where room_number is not null;

create index if not exists maintenance_issues_open_idx
  on public.maintenance_issues (created_at desc)
  where resolved_at is null;

-- =============================================================================
-- Denormalize trigger — pulls room_number + card_type from the parent task
-- on insert. Mirrors public.notes_denormalize.
-- =============================================================================

create or replace function public.maintenance_issues_denormalize()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.room_number is null or new.card_type is null then
    select t.room_number, t.card_type
      into new.room_number, new.card_type
      from public.tasks t
      where t.id = new.task_id;
  end if;
  return new;
end;
$$;

drop trigger if exists maintenance_issues_denormalize_trg on public.maintenance_issues;
create trigger maintenance_issues_denormalize_trg
  before insert on public.maintenance_issues
  for each row execute function public.maintenance_issues_denormalize();

-- =============================================================================
-- RLS — mirrors public.notes policies exactly.
-- =============================================================================

alter table public.maintenance_issues enable row level security;

drop policy if exists maintenance_issues_insert on public.maintenance_issues;
create policy maintenance_issues_insert on public.maintenance_issues
  for insert to authenticated
  with check (
    author_user_id = auth.uid()
    and public.can_read_task(task_id)
  );

drop policy if exists maintenance_issues_select on public.maintenance_issues;
create policy maintenance_issues_select on public.maintenance_issues
  for select to authenticated
  using (
    auth_profile_role() in ('admin','manager')
    or public.can_read_task(task_id)
    or author_user_id = auth.uid()
  );

drop policy if exists maintenance_issues_update on public.maintenance_issues;
create policy maintenance_issues_update on public.maintenance_issues
  for update to authenticated
  using (auth_profile_role() in ('admin','manager'))
  with check (auth_profile_role() in ('admin','manager'));

drop policy if exists maintenance_issues_delete on public.maintenance_issues;
create policy maintenance_issues_delete on public.maintenance_issues
  for delete to authenticated
  using (auth_profile_role() in ('admin','manager'));

-- =============================================================================
-- Verification — run this block as a single paste; expect:
--   maintenance_issues_table_exists = 1
--   severities_count                = 3
--   locations_count                 = 21
--   items_count                     = 11
--   types_count                     = 10
--   denormalize_trigger_exists      = 1
--   policies_count                  = 4
-- =============================================================================

select
  (select count(*) from information_schema.tables
    where table_schema='public' and table_name='maintenance_issues') as maintenance_issues_table_exists,
  (select count(*) from public.maintenance_severities) as severities_count,
  (select count(*) from public.maintenance_locations)  as locations_count,
  (select count(*) from public.maintenance_items)      as items_count,
  (select count(*) from public.maintenance_types)      as types_count,
  (select count(*) from pg_trigger
    where tgname='maintenance_issues_denormalize_trg') as denormalize_trigger_exists,
  (select count(*) from pg_policies
    where schemaname='public' and tablename='maintenance_issues') as policies_count;
