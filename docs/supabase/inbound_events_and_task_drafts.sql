-- Day 14: ResNexus manual import bridge — raw events queue + agent dry-run staging.

-- ---------------------------------------------------------------------------
-- inbound_events: append-only queue for raw reservation events from any source
-- ---------------------------------------------------------------------------
create table if not exists public.inbound_events (
  id           uuid        primary key default gen_random_uuid(),
  source       text        not null,
  external_id  text        not null,
  event_type   text        not null,
  event_date   date        not null,
  raw_payload  jsonb       not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at   timestamptz not null default now()
);

comment on table public.inbound_events is
  'Append-only raw event queue. source=resnexus_manual for paste imports. processed_at null = pending.';

-- Dedup: same reservation + same event type + same date is idempotent
alter table public.inbound_events
  drop constraint if exists inbound_events_dedup;

alter table public.inbound_events
  add constraint inbound_events_dedup
  unique (source, external_id, event_type, event_date);

-- Fast queue scan: only unprocessed rows
create index if not exists inbound_events_unprocessed_idx
  on public.inbound_events (created_at)
  where processed_at is null;

alter table public.inbound_events enable row level security;

-- Only the service role may read or write; no authenticated user policies
create policy "inbound_events_service_role_all"
  on public.inbound_events
  for all
  to service_role
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- task_drafts: mirror of tasks for agent dry-runs; FKs dropped, no cascades
-- ---------------------------------------------------------------------------
create table if not exists public.task_drafts (
  id                         uuid        primary key default gen_random_uuid(),
  source_event_id            uuid,                                         -- inbound_events.id, no FK (loose coupling)
  title                      text        not null,
  description                text,
  status                     text        not null default 'open'
    check (status in ('open', 'in_progress', 'paused', 'blocked', 'done')),
  due_date                   date,
  due_time                   time without time zone,
  assignee_name              text        not null default '',
  staff_id                   uuid,                                         -- no FK; staff row may not exist yet
  priority                   text        not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  created_by_user_id         uuid,                                         -- no FK
  is_staff_report            boolean     not null default false,
  report_category            text,
  report_queue_status        text        not null default 'none'
    check (report_queue_status in ('none', 'pending', 'reviewed')),
  report_image_url           text,
  attachment_url             text,
  card_type                  text        not null default 'housekeeping_turn',
  source                     text        not null default 'manual',
  template_id                uuid,
  template_version           int,
  room_number                text,
  room_id                    uuid,
  location_label             text,
  started_at                 timestamptz,
  paused_at                  timestamptz,
  completed_at               timestamptz,
  expected_duration_minutes  int,
  require_checklist_complete boolean     not null default false,
  context                    jsonb       not null default '{}'::jsonb,
  drafted_at                 timestamptz not null default now(),
  created_at                 timestamptz not null default now()
);

comment on table public.task_drafts is
  'Agent dry-run staging area. Mirrors tasks column shape; FKs dropped so drafts survive deletions. Promote to tasks manually after review.';
comment on column public.task_drafts.source_event_id is
  'Optional pointer to inbound_events.id; no FK — loose coupling by design.';

alter table public.task_drafts enable row level security;

-- Only the service role may read or write; manager promotion is manual SQL
create policy "task_drafts_service_role_all"
  on public.task_drafts
  for all
  to service_role
  using (true)
  with check (true);
