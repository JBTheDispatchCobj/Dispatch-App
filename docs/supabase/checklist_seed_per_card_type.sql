-- *** SUPERSEDED Day 53 chase #2 ***
-- *** This file is preserved for history but should NOT be applied. ***
-- *** Apply `docs/supabase/checklist_seed_per_card_type_with_deep.sql` instead. ***
-- *** That file includes everything below PLUS the Day 53 chase #2 (Chase E) ***
-- *** Deep Clean +1 conditional clause and backfill. ***
--
-- Day 52 chase #3 (VI.B) — per-card_type checklist seed alignment
--
-- Replaces the Day-49 hotfix `tasks_seed_default_checklist()` trigger
-- (which seeded the same 7 D-430 canonical items for housekeeping_turn /
-- arrival / stayover tasks) with a per-card_type fork matching Jennifer's
-- actual KB lists from her "To Do List answers" Q3 delivery.
--
-- Per-card_type canonical lists (must stay in lockstep with
-- lib/staff-task-execution-checklist.ts — Day 49 codification):
--
--   housekeeping_turn (departures) — UNCHANGED 7 items per Jennifer Q1
--     ("That is the appropriate placeholder. This is not relevant to the
--     product working." — D-430 step names accepted as final for beta):
--       Open/Strip, Bed, Report/Doc, Prep, Clean, Close Out, Restock
--
--   arrival — NEW 3 items per Jennifer Q3:
--       Open Room, Arrival Notes, Prep
--
--   stayover — NEW 8 items per Jennifer Q3 (Status row asks staff to set
--     the status pill; pill cluster is rendered separately in S-430
--     statcard; DND / Guest Notes / What Each Status Means are KB
--     sub-detail under Status):
--       Status, Open Room, Remove, Replace, Bed, Clean, Close, Card in App
--
-- Destructive cleanup: this migration DELETEs the wrong-shape D-430 items
-- that the Day-49 hotfix seeded onto existing arrival + stayover tasks
-- (housekeeping_turn rows are NOT touched). Safe per Jennifer Q22 + Q23
-- ("Currently none of the real employees are in your system, these are
-- all test users") — all current data is test data.
--
-- Idempotent: function uses `create or replace`; backfill uses
-- `not exists` guard against case-insensitive title match.

create or replace function public.tasks_seed_default_checklist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.staff_id is null or new.is_staff_report = true then
    return new;
  end if;

  -- D-430 (departures) — UNCHANGED 7 items. Jennifer Q1 accepted as final.
  if new.card_type = 'housekeeping_turn' then
    insert into public.task_checklist_items (task_id, title, sort_order, done) values
      (new.id, 'Open/Strip', 0, false),
      (new.id, 'Bed',        1, false),
      (new.id, 'Report/Doc', 2, false),
      (new.id, 'Prep',       3, false),
      (new.id, 'Clean',      4, false),
      (new.id, 'Close Out',  5, false),
      (new.id, 'Restock',    6, false);

  -- A-430 (arrivals) — NEW 3 items per Jennifer Q3.
  elsif new.card_type = 'arrival' then
    insert into public.task_checklist_items (task_id, title, sort_order, done) values
      (new.id, 'Open Room',     0, false),
      (new.id, 'Arrival Notes', 1, false),
      (new.id, 'Prep',          2, false);

  -- S-430 (stayovers) — NEW 8 items per Jennifer Q3.
  elsif new.card_type = 'stayover' then
    insert into public.task_checklist_items (task_id, title, sort_order, done) values
      (new.id, 'Status',      0, false),
      (new.id, 'Open Room',   1, false),
      (new.id, 'Remove',      2, false),
      (new.id, 'Replace',     3, false),
      (new.id, 'Bed',         4, false),
      (new.id, 'Clean',       5, false),
      (new.id, 'Close',       6, false),
      (new.id, 'Card in App', 7, false);
  end if;

  return new;
end;
$$;

-- Destructive cleanup — DELETE the 7 D-430 canonical titles from existing
-- arrival + stayover tasks (Day-49 hotfix wrong-shape cleanup). Safe
-- because all current data is test-user data per Jennifer Q22+Q23. Not
-- touching housekeeping_turn rows — those keep the D-430 7-item list.
delete from public.task_checklist_items
where task_id in (
  select id from public.tasks
  where card_type in ('arrival', 'stayover')
)
and lower(title) in (
  'open/strip', 'bed', 'report/doc', 'prep', 'clean', 'close out', 'restock'
);

-- Backfill: for every existing open arrival task, insert the 3 new canonical
-- items if missing (case-insensitive title match against existing rows).
with arrival_canonical(title, sort_order) as (
  values
    ('Open Room',     0),
    ('Arrival Notes', 1),
    ('Prep',          2)
)
insert into public.task_checklist_items (task_id, title, sort_order, done)
select t.id, c.title, c.sort_order, false
from public.tasks t
cross join arrival_canonical c
where t.card_type = 'arrival'
  and t.staff_id is not null
  and t.is_staff_report = false
  and t.status <> 'done'
  and not exists (
    select 1
    from public.task_checklist_items existing
    where existing.task_id = t.id
      and lower(existing.title) = lower(c.title)
  );

-- Backfill: same pattern for stayover tasks with the 8 new canonical items.
with stayover_canonical(title, sort_order) as (
  values
    ('Status',      0),
    ('Open Room',   1),
    ('Remove',      2),
    ('Replace',     3),
    ('Bed',         4),
    ('Clean',       5),
    ('Close',       6),
    ('Card in App', 7)
)
insert into public.task_checklist_items (task_id, title, sort_order, done)
select t.id, c.title, c.sort_order, false
from public.tasks t
cross join stayover_canonical c
where t.card_type = 'stayover'
  and t.staff_id is not null
  and t.is_staff_report = false
  and t.status <> 'done'
  and not exists (
    select 1
    from public.task_checklist_items existing
    where existing.task_id = t.id
      and lower(existing.title) = lower(c.title)
  );

-- Verification queries (run separately in Supabase dashboard SQL editor
-- to confirm clean state). Expected outputs:
--
--   -- 1. No D-430 rows on arrival/stayover tasks (should return 0):
--   select count(*) as wrong_shape_rows
--   from public.task_checklist_items i
--   join public.tasks t on t.id = i.task_id
--   where t.card_type in ('arrival', 'stayover')
--     and lower(i.title) in (
--       'open/strip', 'bed', 'report/doc', 'prep', 'clean', 'close out', 'restock'
--     );
--
--   -- 2. Per-card_type row counts (housekeeping_turn=7, arrival=3, stayover=8):
--   select t.card_type, count(*) as items_per_task, t.id
--   from public.tasks t
--   join public.task_checklist_items i on i.task_id = t.id
--   where t.card_type in ('housekeeping_turn', 'arrival', 'stayover')
--     and t.staff_id is not null
--     and t.is_staff_report = false
--     and t.status <> 'done'
--   group by t.card_type, t.id
--   order by t.card_type, t.id;
