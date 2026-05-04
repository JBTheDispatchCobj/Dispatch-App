-- docs/supabase/promote_drafts_to_tasks.sql
--
-- Workflow helper: promote agent-generated task_drafts into real tasks the
-- staff home will see. Run after reviewing the dry-run output of the
-- orchestrator.
--
-- The agent writes drafts when AGENT_DRY_RUN=true (the default). Drafts are
-- inspectable in the task_drafts table but never appear on staff home — only
-- rows in `tasks` do. This helper closes the loop.

-- ---------------------------------------------------------------------------
-- Helper function: promote one draft by id
-- ---------------------------------------------------------------------------

create or replace function public.promote_draft_to_task(p_draft_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_task_id uuid;
begin
  insert into public.tasks (
    title,
    description,
    status,
    due_date,
    due_time,
    assignee_name,
    staff_id,
    priority,
    created_by_user_id,
    is_staff_report,
    report_category,
    report_queue_status,
    report_image_url,
    attachment_url,
    card_type,
    source,
    template_id,
    template_version,
    room_number,
    room_id,
    location_label,
    started_at,
    paused_at,
    completed_at,
    expected_duration_minutes,
    require_checklist_complete,
    context
  )
  select
    title,
    description,
    status,
    due_date,
    due_time,
    assignee_name,
    staff_id,
    priority,
    created_by_user_id,
    is_staff_report,
    report_category,
    report_queue_status,
    report_image_url,
    attachment_url,
    card_type,
    source,
    template_id,
    template_version,
    room_number,
    room_id,
    location_label,
    started_at,
    paused_at,
    completed_at,
    expected_duration_minutes,
    require_checklist_complete,
    context
  from public.task_drafts
  where id = p_draft_id
  returning id into v_task_id;

  if v_task_id is null then
    raise exception 'Draft % not found', p_draft_id;
  end if;

  -- Drop the draft now that it's been promoted to a real task.
  delete from public.task_drafts where id = p_draft_id;

  return v_task_id;
end;
$$;

comment on function public.promote_draft_to_task(uuid) is
  'Copies a task_drafts row into tasks, then deletes the draft. Returns the new task id. Run as: select promote_draft_to_task(''uuid-here'');';

-- ---------------------------------------------------------------------------
-- Bulk promote helper: all unpromoted drafts from a given source
-- ---------------------------------------------------------------------------

create or replace function public.promote_all_drafts_from_source(p_event_source text)
returns int
language plpgsql
security definer
as $$
declare
  v_count int := 0;
  r record;
begin
  for r in
    select td.id
    from public.task_drafts td
    join public.inbound_events ie on ie.id = td.source_event_id
    where ie.source = p_event_source
  loop
    perform public.promote_draft_to_task(r.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

comment on function public.promote_all_drafts_from_source(text) is
  'Promotes every draft whose source_event_id points to an inbound_event with the given source. Useful for: select promote_all_drafts_from_source(''test''); — clears all test-seeded drafts into tasks at once.';

-- ---------------------------------------------------------------------------
-- Usage examples
-- ---------------------------------------------------------------------------

-- Inspect drafts before promoting:
-- select id, title, card_type, room_number, source from public.task_drafts;

-- Promote one specific draft:
-- select promote_draft_to_task('paste-uuid-here');

-- Promote all drafts originating from the test seed:
-- select promote_all_drafts_from_source('test');

-- Promote all agent-generated drafts (any source):
-- do $$
--   declare r record;
--   begin
--     for r in select id from public.task_drafts loop
--       perform promote_draft_to_task(r.id);
--     end loop;
--   end;
-- $$;
