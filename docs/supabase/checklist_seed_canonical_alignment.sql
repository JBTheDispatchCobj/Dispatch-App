-- Day 49 hotfix — checklist seed canonical alignment
--
-- Aligns the tasks_seed_default_checklist() trigger with the 7-item canonical
-- list rendered on the .brow-shaped staff cards (D-430 / A-430 / S-430), and
-- expands trigger firing to all three of those card_types. Then backfills
-- existing open housekeeping/arrival/stayover tasks with any missing
-- canonical items.
--
-- Root cause this fixes: the trigger originally inserted 3 non-canonical
-- items ("Remove used linens" / "Replace sheets and pillowcases" / "Set up
-- rollaway") on housekeeping_turn tasks only. The staff cards' canonical
-- display list (DEPARTURES_CANONICAL_CHECKLIST in
-- lib/staff-task-execution-checklist.ts) is 7 items: Open/Strip, Bed,
-- Report/Doc, Prep, Clean, Close Out, Restock. None of those titles match
-- the trigger seeds, so every canonical row rendered with `dbItem === null`,
-- and the click handler at DeparturesCard.tsx:514 silently no-ops when
-- `item.dbItem` is null. Result: staff click rows and nothing happens, no
-- visual feedback. Arrivals + Stayovers tasks weren't seeded at all (trigger
-- only fired on housekeeping_turn), so 100% of those rows were unclickable.
--
-- Idempotent: function uses `create or replace`; backfill uses `not exists`
-- guard.
--
-- Legacy seed rows (Remove used linens / Replace sheets / Set up rollaway)
-- left in DB — they don't match any canonical title so they don't render in
-- the UI. Cleanup is post-beta polish.

create or replace function public.tasks_seed_default_checklist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.card_type in ('housekeeping_turn', 'arrival', 'stayover')
     and new.staff_id is not null
     and new.is_staff_report = false then
    insert into public.task_checklist_items (task_id, title, sort_order, done) values
      (new.id, 'Open/Strip', 0, false),
      (new.id, 'Bed',        1, false),
      (new.id, 'Report/Doc', 2, false),
      (new.id, 'Prep',       3, false),
      (new.id, 'Clean',      4, false),
      (new.id, 'Close Out',  5, false),
      (new.id, 'Restock',    6, false);
  end if;
  return new;
end;
$$;

-- Backfill: for every existing open task in the three card_types, insert
-- any canonical items that don't already exist on that task (case-insensitive
-- title match against existing rows).

with canonical(title, sort_order) as (
  values
    ('Open/Strip', 0),
    ('Bed',        1),
    ('Report/Doc', 2),
    ('Prep',       3),
    ('Clean',      4),
    ('Close Out',  5),
    ('Restock',    6)
)
insert into public.task_checklist_items (task_id, title, sort_order, done)
select t.id, c.title, c.sort_order, false
from public.tasks t
cross join canonical c
where t.card_type in ('housekeeping_turn', 'arrival', 'stayover')
  and t.staff_id is not null
  and t.is_staff_report = false
  and t.status <> 'done'
  and not exists (
    select 1
    from public.task_checklist_items existing
    where existing.task_id = t.id
      and lower(existing.title) = lower(c.title)
  );
