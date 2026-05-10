-- Day 53 chase #2 (Chase E) — Deep Clean +1 conditional checklist seed
--
-- SUPERSEDES `docs/supabase/checklist_seed_per_card_type.sql` (Day 52 chase #3).
-- Bryan: apply ONLY this file. The Day 52 chase #3 file is now annotated as
-- superseded; do not apply it separately.
--
-- Extends the Day 52 chase #3 per-card_type checklist seed trigger with a
-- single conditional clause: when card_type='housekeeping_turn' AND
-- context.outgoing_guest.clean_type='Deep', append the "Deep Clean" 8th item
-- per Jennifer Q2 + the substrate at `docs/kb/Departure_DeepClean_variant.md`.
-- Pairs with `lib/staff-task-execution-checklist.ts`'s
-- DEPARTURES_DEEP_CANONICAL_CHECKLIST (must stay in lockstep — Day 49
-- codification).
--
-- Per-card_type canonical lists (must stay in lockstep with
-- lib/staff-task-execution-checklist.ts):
--
--   housekeeping_turn (departures) — UNCHANGED 7 items per Jennifer Q1 PLUS
--     conditional 8th "Deep Clean" line per Jennifer Q2 when
--     context.outgoing_guest.clean_type='Deep':
--       Open/Strip, Bed, Report/Doc, Prep, Clean, Close Out, Restock,
--       [Deep Clean]   ← only when clean_type='Deep'
--
--   arrival — UNCHANGED 3 items per Jennifer Q3:
--       Open Room, Arrival Notes, Prep
--
--   stayover — UNCHANGED 8 items per Jennifer Q3:
--       Status, Open Room, Remove, Replace, Bed, Clean, Close, Card in App
--
-- Pet variant (clean_type='Pet') currently follows Standard. Pet substrate is
-- partial — Day 53 chase #1 landed +2 item names (Bedding, Floors) at
-- `docs/kb/Departure_PetClean_variant.md`; per-item how-to text pending
-- Jennifer Day 53 ask Q3. Pet wiring is a separate follow-up chase once
-- Jennifer's how-to text lands.
--
-- Destructive cleanup: NONE in this migration. (The Day 52 chase #3 wrong-shape
-- DELETE was a one-time hotfix cleanup; this migration is purely additive.)
--
-- Idempotent: function uses `create or replace`; backfill uses `not exists`
-- guard against case-insensitive title match.

create or replace function public.tasks_seed_default_checklist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean_type text;
begin
  if new.staff_id is null or new.is_staff_report = true then
    return new;
  end if;

  -- D-430 (departures) — standard 7 items per Jennifer Q1.
  if new.card_type = 'housekeeping_turn' then
    insert into public.task_checklist_items (task_id, title, sort_order, done) values
      (new.id, 'Open/Strip', 0, false),
      (new.id, 'Bed',        1, false),
      (new.id, 'Report/Doc', 2, false),
      (new.id, 'Prep',       3, false),
      (new.id, 'Clean',      4, false),
      (new.id, 'Close Out',  5, false),
      (new.id, 'Restock',    6, false);

    -- Day 53 chase #2 (Chase E): Deep Clean variant +1 item per Jennifer Q2.
    -- Reads clean_type from task.context.outgoing_guest.clean_type set at
    -- draft promotion (lib/orchestration/interpret.ts initializes 'Standard',
    -- lib/orchestration/deep-clean-elevation.ts mutates to 'Deep' on
    -- Wed-occupancy elevation).
    v_clean_type := new.context #>> '{outgoing_guest,clean_type}';
    if v_clean_type = 'Deep' then
      insert into public.task_checklist_items (task_id, title, sort_order, done) values
        (new.id, 'Deep Clean', 7, false);
    end if;

  -- A-430 (arrivals) — UNCHANGED 3 items per Jennifer Q3.
  elsif new.card_type = 'arrival' then
    insert into public.task_checklist_items (task_id, title, sort_order, done) values
      (new.id, 'Open Room',     0, false),
      (new.id, 'Arrival Notes', 1, false),
      (new.id, 'Prep',          2, false);

  -- S-430 (stayovers) — UNCHANGED 8 items per Jennifer Q3.
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

-- Day 52 chase #3 cleanup — DELETE wrong-shape D-430 titles from existing
-- arrival + stayover tasks. Re-run for safety in case Day 52 chase #3 SQL
-- was never applied (this file supersedes it). Idempotent — safely deletes
-- nothing if rows are already clean. Safe per Jennifer Q22+Q23 (test data only).
delete from public.task_checklist_items
where task_id in (
  select id from public.tasks
  where card_type in ('arrival', 'stayover')
)
and lower(title) in (
  'open/strip', 'bed', 'report/doc', 'prep', 'clean', 'close out', 'restock'
);

-- Day 52 chase #3 backfill — for every existing open arrival task, insert
-- the 3 new canonical items if missing. Re-run for safety. Idempotent.
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

-- Day 52 chase #3 backfill — same pattern for stayover tasks (8 items).
-- Re-run for safety. Idempotent.
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

-- Day 53 chase #2 backfill — for every existing housekeeping_turn task with
-- clean_type='Deep' that doesn't have the "Deep Clean" item, insert it.
-- Idempotent via not-exists guard.
insert into public.task_checklist_items (task_id, title, sort_order, done)
select t.id, 'Deep Clean', 7, false
from public.tasks t
where t.card_type = 'housekeeping_turn'
  and t.staff_id is not null
  and t.is_staff_report = false
  and t.status <> 'done'
  and t.context #>> '{outgoing_guest,clean_type}' = 'Deep'
  and not exists (
    select 1
    from public.task_checklist_items existing
    where existing.task_id = t.id
      and lower(existing.title) = 'deep clean'
  );

-- Verification queries (run separately in Supabase dashboard SQL editor
-- to confirm clean state). Expected outputs:
--
--   -- 1. No D-430 wrong-shape rows on arrival/stayover tasks (should return 0):
--   select count(*) as wrong_shape_rows
--   from public.task_checklist_items i
--   join public.tasks t on t.id = i.task_id
--   where t.card_type in ('arrival', 'stayover')
--     and lower(i.title) in (
--       'open/strip', 'bed', 'report/doc', 'prep', 'clean', 'close out', 'restock'
--     );
--
--   -- 2. Per-card_type row counts. Expected counts per task:
--   --   housekeeping_turn standard (clean_type != 'Deep'): 7
--   --   housekeeping_turn deep (clean_type = 'Deep'):       8
--   --   arrival:                                             3
--   --   stayover:                                            8
--   select
--     t.card_type,
--     coalesce(t.context #>> '{outgoing_guest,clean_type}', 'NULL') as clean_type,
--     count(*) as items_per_task,
--     t.id
--   from public.tasks t
--   join public.task_checklist_items i on i.task_id = t.id
--   where t.card_type in ('housekeeping_turn', 'arrival', 'stayover')
--     and t.staff_id is not null
--     and t.is_staff_report = false
--     and t.status <> 'done'
--   group by t.card_type, clean_type, t.id
--   order by t.card_type, clean_type, t.id;
--
--   -- 3. Sanity check — non-Deep housekeeping_turn tasks should NOT have the
--   -- "Deep Clean" item (should return 0):
--   select count(*) as standard_with_deep_item
--   from public.tasks t
--   join public.task_checklist_items i on i.task_id = t.id
--   where t.card_type = 'housekeeping_turn'
--     and (t.context #>> '{outgoing_guest,clean_type}' is null
--          or t.context #>> '{outgoing_guest,clean_type}' <> 'Deep')
--     and lower(i.title) = 'deep clean';
