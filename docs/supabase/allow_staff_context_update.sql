-- Allow staff to update tasks.context (required for departure_status chip)
--
-- The tasks_staff_field_guard trigger (added in milestone1_architecture_lock.sql)
-- currently blocks staff from changing the context column at all. The departure
-- status chip on the Departures card writes context.departure_status, so this
-- guard must be relaxed to permit that write.
--
-- This version removes `context` from the blocked-field list while keeping
-- every other protected column locked for staff users.
--
-- Run once in Supabase Dashboard → SQL Editor.

create or replace function public.tasks_staff_field_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
begin
  select role into r from public.profiles where id = auth.uid();
  if r is null or r in ('admin', 'manager') then
    return new;
  end if;
  if r = 'staff' then
    if new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.priority is distinct from old.priority
      or new.staff_id is distinct from old.staff_id
      or new.assignee_name is distinct from old.assignee_name
      or new.due_date is distinct from old.due_date
      or new.due_time is distinct from old.due_time
      or new.attachment_url is distinct from old.attachment_url
      or new.is_staff_report is distinct from old.is_staff_report
      or new.report_category is distinct from old.report_category
      or new.report_queue_status is distinct from old.report_queue_status
      or new.report_image_url is distinct from old.report_image_url
      or new.created_by_user_id is distinct from old.created_by_user_id
      or new.card_type is distinct from old.card_type
      or new.source is distinct from old.source
      or new.template_id is distinct from old.template_id
      or new.template_version is distinct from old.template_version
      or new.room_number is distinct from old.room_number
      or new.room_id is distinct from old.room_id
      or new.location_label is distinct from old.location_label
      or new.expected_duration_minutes is distinct from old.expected_duration_minutes
      or new.require_checklist_complete is distinct from old.require_checklist_complete
    then
      raise exception 'staff may only change status, timing, and workflow context fields on this card';
    end if;
  end if;
  return new;
end;
$$;
