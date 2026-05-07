# Dispatch — Product State (current as of Day 39, 2026-05-07)

*Single canonical entry point for new Cowork chat sessions. Read this first; do NOT read the daily handoff history (it has been deleted — use git log if you need archaeology). Forward motion only.*

*Update this doc inline when items close. Add new entries to "Open Jennifer questions" and "Standing tabled" as discovered. Do not recreate the daily handoff narrative.*

---

## What the product is

Dispatch is a mobile-primary web app for boutique/independent hotels. Managers/admins create task cards (housekeeping turns, arrivals, stayovers, dailys, EOD, maintenance) and assign them to staff phones. Staff execute them.

Owner: Bryan Stauder. Co-founder: Wisconsin boutique hotel operator (Jennifer). Beta target: that hotel.

Stack: Next.js 16 App Router + React 19 + TypeScript strict + Supabase (Postgres + Auth + RLS + Storage). No Tailwind; plain CSS in `app/globals.css`. No tests. No middleware. Auth guarding is client-side in page components. Magic-link OTP only.

---

## What ships today

**Staff side:**
- Pre-Clock-In screen with greeting + "Start your day" CTA. Bucket deck takes over once clocked in.
- Six bucket cards on staff home (SOD / Departures / Stayovers / Arrivals / Dailys / EOD) with three-mode gating (Day 38): not-yet-reached blurred + hard-locked (pointer-events: none); already-done blurred + checkmark, clickable to view without un-completing (`.bcard.is-done`); current active sharp + clickable. Forward-unlock (`.bcard.is-unlockable`) on cards whose previous buckets are all in `done`. Late-Departures reshuffle: when past 11 AM Central weekday / 12 PM weekend AND Departures still has incomplete tasks, deck reorders to SOD → Stayovers → Arrivals → Departures → Dailys → EOD. Initial `active` advances past initially-done buckets so the deck doesn't render with a "completed but active" head bucket.
- All six X-430 staff card execution screens (D-430, A-430, S-430, Da-430, E-430, SOD-430), with Notes compose drawer, Maintenance compose drawer, status pills, checklists, pause/resume, need-help, image attachment. D-430 / A-430 / S-430 briefs fall back to live `reservations` table reads when `task.context.{outgoing,incoming,current}_guest` is missing (Day 37 V.A BR4).
- Wrap Shift on E-430 clocks staff out + cross-staff EOD activation gate (locked until other on-shift staff are in their EOD).

**Admin side:**
- `/admin` home with live Activity Feed (filterable by severity + kind, dismissable per-browser via localStorage).
- `/admin/staff/[id]` with sky-blue hero card + 14-day segment block + per-shift summary + lifetime hours.
- `AddTaskModal` mounted on `/admin`, `/admin/tasks`, `/admin/staff/[id]`. All six buckets selectable, priority chips, assignee chips, room field, notes panel, pre-selected-staff lock mode.
- `/tasks/[id]` manager card view with editable assignee dropdown → fires reassignTask helper on save (Day 34).
- `/admin/tasks` dashboard live (Day 36 chase #1 — single tasks fetch derives OPEN/DONE-TODAY/OVERDUE stats + HOUSEKEEPING/ADMIN/MAINTENANCE lane partitions client-side).
- `/admin/maintenance/[id]` (mostly mocked — depends on II.H wiring; carry-forward chase #4).
- `/admin/tasks/[id]` admin task view modal fully live (Day 36 chase #1) — full task fetch, schema-aligned 3-chip priority, editable admin notes textarea persisting to `context.admin_notes`, per-task `task_events` activity panel, Save & Deploy writing priority + merge-safe context atomically. ReassignPanel from Day 35 unchanged.
- `/admin` home four lanes live (Day 36 chase #1) — Watchlist (unresolved `maintenance_issues` severity-sorted), Scheduling (`public.staff` clock-in snapshot until II.K Calendar lands), Critical (priority='high' open + status='blocked' merged), Notes (recent `public.notes`). `BRIEF_STATS` + STAFF roster intentionally still static (out of chase #1 scope).
- `/admin/staff/[id]` profile metadata live (Day 36 chase #1) — slug → live `public.staff` row → derived hero/role/status/role-line/status-line. AVATAR_* + slug→fullName map stays (locked design tokens per master plan II.D/II.E). Metrics trio derives from a per-staff tasks fetch (rooms/jobs label swaps by role). Segment block already live (Day 32) and unchanged.

**Data layer:**
- Real `shift_start` / `shift_end` events written to `inbound_events` via SECURITY DEFINER Postgres trigger on `staff.clocked_in_at` flips.
- Three views: `staff_shifts_v` (LATERAL pairing of starts to ends), `staff_segments_v` (Wed-anchored 14-day buckets, reference Wed = 2026-01-07), `shift_summary_v` (per-shift task counts by card_type).
- `notes` table + 4 taxonomies (note_types × 11, note_statuses × 5, note_assigned_to × 5) + RLS + denormalize trigger.
- `maintenance_issues` table + 4 taxonomies (locations × 21, items × 11, types × 10, severities × 3) + RLS + denormalize trigger + 7 indexes.
- `task_events` append-only with 16 event types. `schema_version: 1` required on all writes via `withTaskEventSchema` from `lib/task-events.ts`. See `docs/TASK_EVENTS_CONTRACT.md`.
- Activity feed query helper at `lib/activity-feed.ts` unifies `task_events` + `notes` with severity boost ordering (criticals → warns → info, then reverse-chrono within each bucket).

**Auth + routing:**
- Supabase magic-link only. No passwords, no social.
- Role-based routing in `lib/profile.ts` (`shouldUseManagerHome`, `mayAccessStaffRoutes`).
- Localhost-only dev role-view switcher in `lib/dev-auth-bypass.ts`.

**Locked design tokens** in `app/globals.css`: six neon bucket palettes (SOD / Departures / Stayovers / Arrivals / Dailys / EOD) + Day 20 cream-surface tokens + sage green admin maintenance lane (`#BACBA0` / `#8A9B75` / `#2C3A1D`, master plan II.C) + per-staff hero gradients (CM peach, LL sky, AL coral, MP sage — 4-name fixed palette per master plan II.D/II.E).

---

## Schema in place

**Tables:**
- `tasks` — `card_type` ∈ {`housekeeping_turn`, `arrival`, `stayover`, `eod`, `dailys`, `start_of_day`, `maintenance`, `generic`}; `status` ∈ {`open`, `in_progress`, `paused`, `blocked`, `done`}; `source` ∈ {`manual`, `staff_report`, `pms`, `system`}; `priority` ∈ {`low`, `medium`, `high`} default `medium`. `context` JSONB carries per-card metadata; required subkey `staff_home_bucket`; conventional subkeys `incoming_guest` / `current_guest` / `outgoing_guest` (object-shaped per `wave_4d_context.sql` — each has `name`/`party_size`/`extras`/etc. depending on guest direction) + `notes` (card-level free text, role-agnostic, distinct from `public.notes` table) + `admin_notes` (Day 36 chase #1 — string, written by admin via `/admin/tasks/[id]` Save & Deploy; surfaces as the editable Admin Notes panel; role-distinct from `notes` so admin and staff don't stomp each other's content). Always merge-safe write: `{ ...current, <subkey>: { ...current?.<subkey>, <new> } }` (or for string subkeys, `{ ...current, <subkey>: <new> }`). `assignee_name` text mirrors `staff_id` for display fallback.
- `task_events` — append-only; `schema_version: 1` required via `withTaskEventSchema` from `lib/task-events.ts`. 16 event types; see `docs/TASK_EVENTS_CONTRACT.md`.
- `task_checklist_items` — staff can only check/uncheck (toggle `done`); `done_at` timestamptz auto-set on done flip via trigger; powers D-430 brow "Done · 1:18 PM" meta.
- `task_comments` — legacy; pre-beta dev data only; no longer read/written from staff side post-Day-27.
- `task_drafts` — agent dry-run staging; mirrors `tasks` shape with FKs deliberately dropped (drafts survive deletion of referenced rows); RLS service-role-only. Written by orchestrator when `AGENT_DRY_RUN=true`; promoted via SQL helper (see Orchestrator dry-run pipeline below).
- `profiles` — `role` ∈ {`admin`, `manager`, `staff`} default `manager`; new `auth.users` get a default-`manager` profile via `handle_new_user_profile()` trigger. **Operational gotcha**: every new authed user starts as manager unless updated.
- `staff` — staff directory; `clocked_in_at` timestamptz column flips drive the clock-in/out lifecycle. Vestigial `staff_outcomes` companion table from early MVP.
- `reservations` — full schema in `reservations_br1.sql`. `status` ∈ {`confirmed`, `arrived`, `departed`, `cancelled`, `no_show`}; brief queries filter on `(confirmed, arrived)`. `source` ∈ {`resnexus`, `manual`, `walk_in`} (needs `cloudbeds` add per V.H — one-word change). `nights` is generated: `greatest(1, departure_date - arrival_date)`; same-day stays count as 1. 5 partial indexes tuned for the three brief queries. Powers daily brief counts on staff/admin home + X-430 guest fields. Day 14 ResNexus manual import bridge through `inbound_events` is the population path pre-Cloudbeds.
- `inbound_events` — append-only raw event queue; service-role-only RLS; `inbound_events_dedup` UNIQUE on `(source, external_id, event_type, event_date)`. Powers the orchestrator's read loop. `staff_clock_in_event_trigger` writes `shift_start` / `shift_end` here with `source='clock_in'`. Dedup constraint silently swallows same-day re-clocks (acceptable for beta single-property).
- `deep_clean_history` — per-room rolling history of completed deep-clean items; surfaces in future D-430 cards for the same room within 30 days. Spec D-430 R34-R36. Append-only by staff (must own `source_task_id`); admin/manager can correct.
- `notes` + 4 taxonomies (`note_types` × 11, `note_statuses` × 5, `note_assigned_to` × 5, plus the shared `maintenance_severities`).
- `maintenance_issues` + 4 taxonomies (`maintenance_locations` × 21, `maintenance_items` × 11, `maintenance_types` × 10, `maintenance_severities` × 3).

**Views:**
- `staff_shifts_v` — pairs `shift_start` + `shift_end` events from `inbound_events` (LATERAL by timestamp, not event_date — handles cross-midnight). `is_current = (shift_end_at IS NULL)`; `duration_minutes` is NULL for in-flight shifts.
- `staff_segments_v` — Wed-anchored 14-day buckets aggregated from `staff_shifts_v`. Reference Wednesday `2026-01-07`. Math: `segment_start = reference_wed + FLOOR((shift_date - reference_wed) / 14) * 14`. Excludes currently-clocked-in shifts (they appear once they end). Per-staff `shift_count` + `total_minutes` per (segment_start, segment_end = segment_start + 13).
- `shift_summary_v` — per-shift task counts by card_type. Six FILTER aggregates: `departures_completed` (housekeeping_turn) / `arrivals_completed` / `stayovers_completed` / `dailys_completed` / `eod_completed` / `maintenance_completed` + `total_tasks_completed`. Join window `[shift_start_at, effective_end_at]` where `effective_end_at = COALESCE(shift_end_at, now())` so in-flight shifts have a moving window. `staff_id::text` cast required (raw_payload field is text). Completion gate is `completed_at IS NOT NULL`, not `status='done'`.

**Triggers:**
- `staff_clock_in_event_trigger` — `staff.clocked_in_at` flip → `inbound_events` row, `event_type` ∈ {`shift_start`, `shift_end`}, `source='clock_in'` (SECURITY DEFINER, `search_path` locked).
- `tasks_staff_field_guard()` — defense-in-depth alongside RLS for staff-write-blocked task fields. Permits status, timing, and `context` writes only.
- `task_checklist_staff_guard()` — second staff guard; blocks staff INSERT/DELETE on checklist items and any UPDATE that changes `task_id`/`title`/`sort_order`. Staff can only toggle `done`.
- `tasks_seed_default_checklist()` — AFTER INSERT on `tasks`; auto-inserts 3 hard-coded items ("Remove used linens", "Replace sheets and pillowcases", "Set up rollaway") when `card_type='housekeeping_turn'` AND `staff_id` is set AND `is_staff_report=false`. **Operational gotcha**: AddTaskModal-created housekeeping tasks always get these 3.
- `task_checklist_set_done_at()` — sets `done_at = now()` on `done` flip false→true; clears on true→false.
- `handle_new_user_profile()` — AFTER INSERT on `auth.users`; creates default `role='manager'` profile.
- `reservations_set_updated_at()` — bumps `updated_at` on every write; stamps `cancelled_at` on status flip to `cancelled`.
- Denormalize triggers on `notes` + `maintenance_issues` — fill `room_number` + `card_type` from parent task on insert; may go stale if parent task is later edited (acceptable for beta).

**Storage:** `task-files` bucket — `public = true` (authenticated users can read by URL with no further auth check). Upload path convention: first folder must equal `auth.uid()::text` (enforced by `task_files_insert_own` policy). Compose-drawer wiring still pending — III.E PARTIAL; upload helper exists at `lib/task-events.ts:45` (`uploadTaskFile`).

**Orchestrator dry-run pipeline:** the orchestrator runs in dry-run mode by default (`AGENT_DRY_RUN=true`). In dry-run, generated tasks land in `task_drafts` (service-role-only RLS) instead of `tasks` — staff home only reads `tasks`, so drafts are invisible to the UI. Manual promotion via SECURITY DEFINER helpers in `promote_drafts_to_tasks.sql`: `select promote_draft_to_task('<uuid>')` (single) or `select promote_all_drafts_from_source('<source>')` (bulk). Promotion copies the row into `tasks` and deletes the source draft (destructive). `AGENT_KILL=true` shuts the orchestrator off entirely. Both env vars default to `true` for the first Vercel deploy as a safety net (master plan VIII.A + VIII.E).

**RLS:** `auth_profile_role()` SECURITY DEFINER function avoids `profiles` policy recursion. `can_read_task(p_task_id uuid)` (defined in `cards_mvp.sql`) is the single source of truth for staff task visibility — manager/admin pass unconditionally; staff pass if the task's `staff_id` matches their `profiles.staff_id` OR they're `created_by_user_id`. Staff cannot update most task fields (title, description, priority, due_date, due_time, staff_id, assignee_name, card_type, source, template, room, location_label, expected_duration_minutes, require_checklist_complete, attachment_url, report_*); they CAN update `status`, timing fields, and `context` (the latter post-`allow_staff_context_update.sql` — D-430's departure_status chip needs it). Notes + maintenance_issues policies mirror — staff insert-self-only, admin/manager full CRUD, select gated by `can_read_task` or self-author.

**Migration files in `docs/supabase/`:** 26 total, applied via Supabase dashboard SQL editor; all idempotent except `reservations_seed.sql` (truncate to reset).

Pre-Day-24 base / early-MVP files (already applied; listed for completeness): `dispatch.sql` (vestigial `dispatch_day` daily-brief table from earliest MVP), `staff.sql` (staff + staff_outcomes table creation), `activity.sql` (created `activity_events`, dropped Day 29 by `drop_activity_events_table.sql`), `tasks.sql`, `tasks_staff_id.sql`, `tasks_priority.sql`, `cards_mvp.sql` (profiles + `auth_profile_role()` + `can_read_task()` + `tasks_staff_field_guard()` + checklist + task_events + task-files storage bucket), `milestone1_architecture_lock.sql` (paused status + tasks new columns + staff field guard rev + default-checklist-seed trigger), `fix_rls_profiles_recursion_manager_path.sql`, `inbound_events_and_task_drafts.sql` (Day 14 ResNexus manual import bridge + dry-run staging), `reservations_br1.sql`, `reservations_seed.sql` (3 arrivals / 2 departures / 4 stayovers / 1 cancelled — matches pre-BR1 hardcoded brief counts so live read renders identically to fallback), `promote_drafts_to_tasks.sql` (`promote_draft_to_task(uuid)` + `promote_all_drafts_from_source(text)` SECURITY DEFINER helpers), `add_card_type_sod_eod.sql` (8-value `tasks_card_type_check`), `allow_staff_context_update.sql` (removes `context` from staff field guard's blocked-field list), `taxonomy_tables.sql`, `notes_table.sql`, `maintenance_issues_table.sql`, `deep_clean_history.sql`, `wave_4d_context.sql` (`task_checklist_items.done_at` + `done_at` auto-set trigger + JSONB context subkey conventions documented).

Day-25-and-later files (clock-in lifecycle + view trio): `staff_clocked_in_at.sql`, `staff_clock_in_event_trigger.sql`, `staff_shifts_view.sql`, `staff_segments_view.sql`, `shift_summary_view.sql`, `drop_activity_events_table.sql`.

Apply order matters in two places: `taxonomy_tables.sql` BEFORE `notes_table.sql` + `maintenance_issues_table.sql` (FKs); `reservations_br1.sql` AFTER `profiles` + `auth_profile_role()` exist.

---

## Closure ledger — master plan items closed (Days 27-39)

The master plan at `docs/dispatch-master-plan.md` was authored Day 24 with State labels (BUILT / PARTIAL / UNBUILT / AUTHORING). Items below have closed since; the master plan inline labels haven't been re-annotated. This ledger overrides.

- ✓ **I.A** — Hard-lock sequential gating + drop staff-side quick-add (Day 30).
- ✓ **I.B** — Pre-Clock-In screen (Day 30).
- ✓ **I.C** — Clock-In + Wrap Shift end-to-end (4 phases, Days 30-32). Staff clocks in → `clocked_in_at` flips → trigger writes `shift_start` → orchestrator picks up → tasks generate. Wrap Shift on E-430 nulls `clocked_in_at` → trigger writes `shift_end`. Cross-staff EOD activation gate locks Wrap Shift until other on-shift housekeepers are in their EOD card.
- ✓ **III.A** — Notes compose drawer + 3-sink routing + dual-sink read pattern (Day 27).
- ✓ **III.B** — Maintenance compose drawer at staff side (Day 33, 4 phases) + activity feed source swap (Day 39 Phase 5, commit `7281b8f`). All five listed phases closed end-to-end. Phase 5 added a third parallel source to `lib/activity-feed.ts` (`fetchMaintenanceIssueItems` + `normalizeMaintenanceIssueRow`) paralleling the notes fetch — same `{ limit, authorUserId? }` shape, same reverse-chron LIMIT, same graceful-error pattern. Severity classifier `classifyMaintenanceIssueSeverity`: High → warn (matches Day 34's reassigned-as-warn precedent — bumping Normal would dominate the feed since most issues land Normal), Normal + Low → info. Message format `composeMaintenanceIssueMessage` — `{actor} reported: {type} {item} in {location}` with optional ` — {excerpt}` suffix when body is present (100-char truncation). Both `getActivityFeed` + `getActivityForUser` fan out three sources via `Promise.all`; `ActivityKind` union extended to `"task_event" \| "note" \| "maintenance_issue"`. `components/admin/ActivityFeed.tsx` gained a Maintenance option in the Kind dropdown and the row meta-badge ternary swapped to a 3-way switch (NOTE / MAINT / EVENT). The Day-33-vintage placeholder `// Future: maintenance_issues` comment block in `lib/activity-feed.ts` retired. 2 files changed, 146 insertions / 19 deletions; build clean; no schema, no deps, no CSS. Per-user feed scope: `getActivityForUser` filters maintenance by `author_user_id` (issues *the staff reported*), parallel to notes-they-authored — alternative is parent-task-assignee scope, surfaceable if Bryan wants the other read.
- ✓ **III.D** — Activity feed (admin), 7 phases end-to-end (Day 29). Three new audit event types (`assignment_cross_hall_override`, `assignment_above_standard_load`, `reshuffle_tier_changed`) + severity classification + day-grouped UI + filters + dismiss persistence.
- ✓ **III.H** — Reassignment closed end-to-end (Days 34-35). Scope A (Day 34): `reassignTask()` helper at `lib/orchestration/index.ts`. Scope B (Day 35): discrete `ReassignPanel` at `components/admin/ReassignPanel.tsx` (chip-row staff picker + required reason textarea + Reassign button). Mounted on BOTH `/tasks/[id]` (replacing the dropdown + inline reassign-on-save flow — dropdown fully removed) AND `/admin/tasks/[id]` (II.G admin task view, between Activity and CTA pair, backed by a small live assignee fetch). Single component, two surfaces. **II.G partial credit**: the Reassign admin action is wired; the rest of II.G's surface (priority chips, admin notes, activity feed, Save & Deploy) remains chase #1 territory.
- ✓ **III.J** — 14-day segment infrastructure via three views (Day 32). View-for-beta lean honored; no new tables.
- ✓ **VII.D** — Segments table-vs-view question (resolved as views, Day 32).

**Section IV:** the three Step-follow audit-event TODOs (Steps 5/6/7-follow) closed Day 29 as a side effect of III.D Phase 1.

- ✓ **II.B + II.E + II.F + II.G (non-Reassign surface)** — Section II live-data wirings cluster (Day 36, chase #1, commit `659fcc9`). All four admin pages swap hardcoded mocks for live Supabase queries. `app/admin/tasks/page.tsx` derives OPEN/DONE-TODAY/OVERDUE stats and HOUSEKEEPING/ADMIN/MAINTENANCE lane partitions from a single tasks fetch (limit 200) + property-TZ today/now helpers. `app/admin/page.tsx` fans out four parallel lane fetchers — Watchlist (unresolved `maintenance_issues` severity-sorted High→Normal→Low), Scheduling (clock-in snapshot from `public.staff`, on-shift first → off → inactive; honest substrate until II.K Calendar lands), Critical (priority='high' open + status='blocked' merged), Notes (recent `public.notes`). All four degrade gracefully on error. `app/admin/staff/[id]/page.tsx` swaps PROFILES const for live `public.staff` row; AVATAR_* + slug→fullName map stays (locked design tokens per master plan II.D/II.E); hero role/status/role-line all derive from `staff.role` + `staff.clocked_in_at` + `staff.status`; metrics trio derives from a per-staff tasks fetch with rooms/jobs label swap by role. `app/admin/tasks/[id]/page.tsx` adds full live task fetch + `staff(name)` embed + `created_by_user_id` → profile lookup, schema-aligned 3-chip priority (was UI-only 4-value Low/Normal/High/Critical that never matched the DB enum), editable admin notes textarea persisting to new `context.admin_notes` JSONB subkey, per-task `task_events` activity panel joined to profiles for actor names, Save & Deploy writing priority + merge-safe context atomically. `BUCKET_THEME` extended with SOD (`--sod-accent-pale` / `--sod-accent` fallback) + maintenance (sage tokens) so all 7 buckets render themed; master plan II.G "dulled-color tokens" remaining as a follow-up. ReassignPanel from Day 35 unchanged. No schema changes; no new dependencies; no CSS module changes. Build clean; 4 files changed, 1181 insertions / 456 deletions.

- ✓ **Day 38 chase #1** — SOD initial-active advance + re-touch + late-Departures reshuffle (Day 38, commits `7f80ee7` → `0dc1fb4` → `b362102` → `7173062`). Day 37's "deck never unlocks past SOD" report was misdiagnosed at the clock-in layer; root cause was at the deck-state layer. Probe-1 (`7f80ee7`) added `.select()` zero-row guards on `clockIn` / `clockOut` in `lib/clock-in.ts` to surface silent UPDATE-no-op failures; UI test confirmed clock-in works end-to-end (UPDATE lands, trigger fires, `shift_start` written to `inbound_events`). Probe-2 (`0dc1fb4`) added a visible debug strip exposing `active`, `done`, `tasks.length`, per-bucket counts; pinned the actual bug — `done` correctly contained `"sod"` on initial load (both SOD tasks done) but `active` stayed at hardcoded `useState("sod")` default, leaving SOD as both is-active + is-done with no obvious next step. Bundle commit (`b362102`) shipped three pieces: (a) `loadTasks` walks the dynamic bucket order after computing `initialDone` and `setActive`'s to the first non-done key; (b) re-touch on completed cards via `.bcard.is-done { pointer-events: auto; cursor: pointer; }`; (c) late-Departures reshuffle — new pure helpers `isPastReshuffleTime(now)` + `computeBucketOrder(now, departuresIncomplete)` re-derive a dynamic `bucketOrder` via `useMemo`, reused in deck render + `handleActionClick` advancement loop + `loadTasks` initial-active advancement. Reshuffle reuses existing `dispatch-config.ts` constants (`PRE_STAYOVER_RESHUFFLE_AT` 11:00 weekday / 12:00 weekend, `PROPERTY_TIMEZONE`, `WEEKEND_DAY_NUMBERS`) — no new config. Follow-up commit (`7173062`) added two product-rule pieces from Bryan's mid-test clarification: (d) `handleCardClick` is non-destructive — clicking a checkmarked card focuses it without removing from `done`; (e) `is-unlockable` class on bucket cards whose previous buckets in the dynamic order are all in `done`, CSS `pointer-events: auto` so the user can click directly forward to the next eligible bucket. Trade-off: explicit "re-open" / "un-complete" semantics no longer accessible via UI (view ≠ re-open per Day 38 product call; post-beta enhancement if staff needs explicit undo). UI-verified Day 38: re-touch back to SOD (focus, keep checkmark) ✓; forward to Departures via SOD action button ✓; forward to Departures via direct click on Departures (is-unlockable) ✓; advance to Stayovers after Departures action click ✓; back to Departures from Stayovers ✓. Reshuffle UI verification deferred to post-11 AM Central runtime check (Bryan completes solo). 4 commits, 3 files touched cumulative (`app/staff/page.tsx`, `app/globals.css`, `lib/clock-in.ts`); no schema changes; no new dependencies.

- ✓ **V.A BR4** — X-430 brief reservation fallback (Day 37, commit `1657144`). Per-card fallback to live reservation row when `task.context.{outgoing,incoming,current}_guest` is missing/empty. `app/staff/task/[id]/page.tsx` kicks off parallel reservation fetches in the existing notes/maintenance/checklist `Promise.all` (only when `task.room_number` is set AND `card_type` is one of housekeeping_turn / arrival / stayover); results threaded as optional props into DeparturesCard / ArrivalsCard / StayoversCard. Each card builds a derived guest record from the reservation row only when its context guest subkey is missing — `isAllNull` check on the parsed `GuestRecord` for D-430, plain `parsedGuest ?? fromReservation(...)` for A-430 + S-430. Mappings: name←guest_name (trimmed), party/guests←`${party_size} guest(s)`, nights←`${nights} night(s)`, notes←guest_notes ?? special_requests joined, checkin_time←arrival_time (HH:MM:SS slices fine through formatDueTime's HH:MM regex), nights_remaining←computed from `departure_date - todayInPropertyTz()` parsed at noon-local to avoid DST/zone rounding. `clean_type` stays null on D-430 fallback (no reservation-side source — KB-driven per-turn cleaning tier). Failures degrade to null silently via `.catch()` warn-and-return-null wrappers (briefs stay at em-dash placeholders). Two new state slots in page.tsx (`currentReservation` shared between D-430 outgoing + S-430 current; `incomingReservation` shared between D-430 incoming + A-430 incoming) — single fetch, two consumers each. 4 files changed, 218 insertions / 12 deletions. Build clean; no schema, no deps, no CSS. Unblocks I.E + I.F live guest data wirings; I.G Last Stayover Status lookup remains its own work item (sources from `tasks` history, not from `reservations`).

**Section II:** II.A (`AddTaskModal`) is ~95% built per Day 28 audit; confirmation pass pending (now chase #4 below). II.B / II.E / II.F / II.G non-Reassign surface CLOSED Day 36. II.H Admin Maintenance still PARTIAL (chase #2 below).

---

## Recommended next chases (priority-ordered)

When you start a session, pick the highest-priority chase that's unblocked. Update this list when items close — move closed items to the closure ledger above.

1. **III.E + V.G photo pipeline wiring** (1-2 hours). `uploadTaskFile` helper exists at `lib/task-events.ts:45`. Wire into `NoteComposeForm` + `MaintenanceComposeForm`: file input + call `uploadTaskFile` + pass `imageUrl` to `addNote` / `addMaintenanceIssue`. Storage RLS policies need verification (master plan VII.F PARTIAL).

2. **II.H Admin Maintenance live-data wiring** (~1-2 hours). Schema unblocked by Day 33's `maintenance_issues` table. Wire `app/admin/maintenance/[id]/page.tsx` to query `public.maintenance_issues` filtered by location / by type, plus per-issue card view. Replace `ORDER` mock const.

3. **IV.H Wed-occupancy Deep Clean trigger** (~1 hour). Constants exist in `dispatch-config.ts` Section 12. Unblocked by III.D's audit-event sink (Day 29). All four conditions: <5 departures + 40%+ occupancy in last 45 days + no deep clean in 45 days + ≤3 deep items completed in 45 days. Auto-elevates Standard → Deep on Wednesdays.

4. **II.A `AddTaskModal` confirmation pass** (~30 min). Verify the modal matches master plan II.A spec end-to-end. Possible bucket-model tweak — maintenance currently routes to `staff_home_bucket: "start_of_day"` since maintenance has no staff bucket; confirm or surface as own bucket.

5. **I.G remaining sub-items.** Last Stayover Status lookup (was blocking on V.A BR4 — unblocked Day 37; sources from `tasks` history, not `reservations`), checklist variants for Sheet Change weekly + * guest (pending Jennifer's KB authoring), status-driven auto-complete (DND/Desk OK/Guest OK pre-selection auto-completes + auto-archives), Sheet Change skip semantics. Bundled or split as makes sense.

6. **Item I — Vercel deploy** (~30 min). Bryan's parallel lane via `docs/deployment/vercel-checklist.md`. GitHub push → Vercel CLI → first deploy → env vars (incl. `AGENT_KILL=true` and `AGENT_DRY_RUN=true` for safety) → Supabase magic-link redirect URL config → smoke test in incognito.

7. **V.C Cloudbeds.** Bryan's separate thread, outside engineering critical path. Pending sales quote.

---

## Reading paths by chase type

When picking up a chase, load only what you need. Total chase-specific load should fit in ~15-20K tokens — substantive product knowledge, not narrative redundancy. Tier 1 always; Tier 2 by chase type. If a chase doesn't fit cleanly, lean toward the LIGHTER load and surface the gap.

### Tier 1 — always load (every session)

- `docs/STATE.md` (this file — orientation, closure ledger, conventions)
- `CLAUDE.md` (operating manual)

That's it for orientation. Everything else is chase-specific.

### Tier 2 — load by chase type

**Section I staff card chase** (X-430 card UI, status pills, checklist variants, gating, time targets)
- `docs/dispatch-master-plan.md` §I.A-I.I (only the relevant item — skim, don't full-read)
- `app/staff/page.tsx` + `app/staff/task/[id]/page.tsx`
- The target card component: `app/staff/task/[id]/{Departures,Stayovers,StartOfDay,Arrivals,Dailys,EOD}Card.tsx`
- `lib/staff-task-execution-checklist.ts` if checklist-related
- `lib/dispatch-config.ts` Sections 9 + 12 for time targets / status time targets / triggers
- For KB-driven content: `docs/kb-spreadsheet-index.md` + the relevant tab

**Section II admin surfaces chase** (admin live-data wirings, AddTaskModal, manager card view, admin staff profile, admin tasks dashboard, admin maintenance)
- `docs/dispatch-master-plan.md` §II.A-II.I (only the relevant item — skim)
- The target page file under `app/admin/*` + any sibling `*.module.css`
- Live-data reference: `app/admin/staff/[id]/page.tsx` (already wired to the three Day 32 views — mirror this pattern for new live-data wirings)
- For data layer: `lib/notes.ts`, `lib/maintenance.ts`, `lib/activity-feed.ts`, or `lib/orchestration/index.ts` depending on what the page consumes
- For AddTaskModal: `components/admin/AddTaskModal.tsx` + `lib/assignable-staff.ts`
- Skip orchestrator code, KB docs, Section I card files — irrelevant to admin UI

**Section III cross-cutter chase** (notes, maintenance, activity feed, photo pipeline, reassignment, segments, audit/archive)
- `docs/dispatch-master-plan.md` §III item being chased
- `docs/TASK_EVENTS_CONTRACT.md` (event vocabulary contract)
- Lib pair for the cross-cutter:
  - Notes/maintenance → `lib/notes.ts` + `lib/maintenance.ts` + `lib/activity-feed.ts`
  - Per-task lifecycle (reassign, pause, complete) → `lib/orchestration/index.ts` + `lib/task-events.ts`
  - Photo → `lib/task-events.ts` (`uploadTaskFile` at line 45)
- Compose form if UI work: `app/staff/task/[id]/{NoteComposeForm,MaintenanceComposeForm}.tsx`
- Schema reference: `docs/supabase/{notes_table,maintenance_issues_table,taxonomy_tables}.sql`

**Section IV rule engine chase** (assignment policies, reshuffle, dailys/eod rule files, Wed-occupancy Deep Clean trigger, realtime dailys reassignment, repeated-instance meta-trigger)
- `docs/dispatch-master-plan.md` §IV item being chased
- `lib/orchestration/{run,interpret,assignment-policies,reshuffle,audit-events}.ts`
- The relevant rule file: `lib/orchestration/rules/{dailys,eod,arrivals,departures,stayovers,maintenance}.ts`
- `lib/dispatch-config.ts` (constants live here — Sections 9 + 12 + 14)
- `docs/TASK_EVENTS_CONTRACT.md` if adding new audit event types
- **WARNING:** orchestrator-side modules use `.ts` extensions and inline string literals to be Node-safe (Day 29 caveat). Anything in `lib/orchestration/` that imports a browser-coupled module (one that imports `lib/supabase`) compiles but fails at orchestrator runtime. Exception: `lib/orchestration/index.ts` is intentionally browser-side.

**Section V data-layer chase** (BR4 reservation fallbacks, BR5 cancellation edges, Cloudbeds payload, weather, Google events, holiday calendar)
- `docs/dispatch-master-plan.md` §V item being chased
- `lib/reservations.ts` (BR4/BR5 helpers exist here)
- `docs/supabase/cards_mvp.sql` for reservations + inbound_events schema
- The relevant card file under `app/staff/task/[id]/*Card.tsx` if wiring fallback to UI

**Section VI KB authoring chase** (Jennifer's content lane — checklist trees, affirmations, variant lists, time-target matrix, daily-task estimates)
- `docs/kb-spreadsheet-index.md`
- `docs/kb/README.md` + `docs/kb/Dispatch — Rules Table Handoff.md`
- The specific tab(s) in the governance spreadsheet at `docs/kb/Dispatch — Rules Table for Card and Section Governance.xlsx`
- `lib/checklists/variants/*.ts` if converting authored content to runtime config
- `lib/dispatch-config.ts` if updating constants from authored values
- Skip code unless converting authored content to runtime config

**Section VII schema chase** (new tables, RLS, derived views)
- `docs/dispatch-master-plan.md` §VII item being chased
- All existing migrations in `docs/supabase/*.sql` for naming conventions + RLS patterns
- `docs/supabase/fix_rls_profiles_recursion_manager_path.sql` for SECURITY DEFINER pattern reference
- `docs/supabase/notes_table.sql` or `maintenance_issues_table.sql` for the dual-sink + denormalize-trigger pattern
- The lib data-access file for the new table follows the `lib/notes.ts` / `lib/maintenance.ts` pattern

**Section VIII deploy chase** (Vercel deploy, magic-link redirect URL config, smoke test, env vars)
- `docs/deployment/vercel-checklist.md`
- Skip everything else

**Section IX quality / non-functional chase** (RLS hardening per new table, perf tuning, multi-property timezone, idempotency)
- `docs/dispatch-master-plan.md` §IX item being chased
- The specific table or module being hardened
- Reference patterns from existing RLS / idempotency in `docs/supabase/*.sql`

### When STATE.md is missing something

If you're orienting and find a load-bearing fact that's not in STATE.md (an architectural rule, Jennifer caveat, schema convention, gotcha), **add it inline before continuing the chase**. STATE.md is meant to be living, not a one-shot snapshot. Drift between STATE.md and the bedrock (master plan + schema migrations + code) is the failure mode to prevent — surfacing gaps and filling them is how that gets prevented.

If a specific question requires a back-reference into deleted handoff history, the 21 deleted handoff docs are preserved in git history. `git show HEAD~N:docs/handoff-day-X.md` retrieves any of them. Targeted retrieval, not blanket re-reading.

---

## Critical operating conventions

These are hard rules. Don't relearn them each session.

### Workflow

- **Cowork-Claude direct-writes ALL code.** CC handles only build verification + git operations + commits. This is the standing convention; do not deviate.
- **Bryan is non-developer.** Plain English, exact copy-paste prompts in fenced blocks. No placeholders unless explicitly called out.
- **Single fenced code block per CC prompt + per SQL block.** Bryan's standing preference.
- **CC build-verify chain: NO `tail` pipe.** It swallows the failure exit code and ships broken commits. Pattern: `cd ~/dispatch-app && git add . && git status && npm run build && git commit -m "..." && git push origin main && git log --oneline -3`. Use full output. If you must truncate, use `set -o pipefail && npm run build 2>&1 | tail -25 && ...`.
- **Markdown-only commits skip the build verify** — no code touched, build state inherits from prior commit.
- **Bash output is ground truth.** CC editorial commentary stays unreliable. Use `git log -3` + `git status` for ground-truth checks.
- **Migrations** live in `docs/supabase/*.sql`, applied manually via Supabase dashboard SQL editor. Idempotent.
- **When you finish work**: (1) plain English summary, (2) files touched, (3) how to verify from UI — click here, expect this, (4) any Supabase migration warning if applicable.

### Code conventions

- **Boring code wins.** No clever abstractions. No new dependencies without asking Bryan. Current deps: `@supabase/supabase-js`, `@supabase/ssr`, `next`, `react`, `react-dom`. That's it.
- **TypeScript strict.** No `any`. If tempted, stop and solve it.
- **Mobile-first CSS** at 390px viewport. Desktop is a bonus.
- **Client components** (`"use client"`) for anything interactive. Server components for static layouts.
- **Supabase client** lives at `lib/supabase.ts`. Always import from there.
- **Error handling:** show the raw Supabase error message in a `.error` element. Do not hide errors behind generic text.
- **No emojis** in code or UI unless explicitly requested.

### Module / import rules

- **Imports under `lib/orchestration/`** that target other `lib/orchestration/` modules use `.ts` extensions (Node `--experimental-strip-types` orchestrator). Imports from outside that folder use plain extensionless paths.
- **WARNING (Day 29 caveat):** anything in `lib/orchestration/` that imports a browser-coupled module (one that imports `lib/supabase`) compiles but fails at orchestrator runtime. Inline constants or extract to a Node-safe shared module. Pattern at `lib/orchestration/audit-events.ts` shows how (inlined `TASK_EVENT_SCHEMA_VERSION` + `AuditEventKind` string literals).
- **Exception:** `lib/orchestration/index.ts` IS browser-side intentionally. It's the per-task lifecycle boundary (`openCard` / `pauseCard` / `resumeCard` / `completeCard` / `requestHelp` / `addTaskComment` / `toggleChecklistItem` / `reassignTask`). It imports `lib/task-events` extensionless, which transitively imports `lib/supabase`. The orchestrator-cron-side modules (`run.ts` / `assignment-policies.ts` / `reshuffle.ts` / `interpret.ts` / `rules/*` / `audit-events.ts`) use `.ts` extensions and inline string literals to be Node-safe.

### Architecture rules (do not violate)

- **`profiles` RLS depends on `auth_profile_role()`** SECURITY DEFINER function. Never query `profiles` inside a `profiles` policy body directly.
- **Staff cannot update most task fields** (assignee, priority, due date, title, description, room, card_type, source, template, attachment, report_*). They CAN update `status`, timing fields, and `context` (the last permitted by `allow_staff_context_update.sql` — D-430's departure_status chip needs it). Defense-in-depth: RLS + Postgres triggers `tasks_staff_field_guard()` + `task_checklist_staff_guard()`. If you add a field that only managers should edit, update both the RLS policy and the relevant trigger.
- **`task_events` is append-only.** No updates, no deletes. Schema is versioned at `schema_version: 1`. Don't mutate v1; bump to v2 if you need to evolve.
- **`tasks.context` is JSONB.** The one field that absolutely must be set for staff UX is `context.staff_home_bucket`. Enforce in UI; DB default is sloppy. Conventional subkeys (`incoming_guest` / `current_guest` / `outgoing_guest` / `notes`) follow merge-safe write pattern; see `wave_4d_context.sql` comment block for the contract.
- **`tasks.card_type` constraint enumerates 8 values:** `housekeeping_turn`, `arrival`, `stayover`, `eod`, `dailys`, `start_of_day`, `maintenance`, `generic`. AddTaskModal + `lib/orchestration/interpret.ts` must respect this enum.
- **Default checklist seed** auto-inserts 3 hard-coded items on every new `housekeeping_turn` task with non-null `staff_id` and `is_staff_report=false` (`tasks_seed_default_checklist()` trigger). AddTaskModal-created housekeeping tasks always get these 3 — if you need a different starting set, delete + replace, don't expect a clean slate.
- **New `auth.users` default to `role='manager'`** via `handle_new_user_profile()` trigger. To add a staff user: insert auth user → trigger creates default-manager profile → manually `update public.profiles set role='staff', staff_id='<uuid>' where id='<auth_uid>'`.
- **`AGENT_KILL` + `AGENT_DRY_RUN` env vars** gate the orchestrator's live writes. Both default to `true` in production until explicitly flipped — the orchestrator writes to `task_drafts` (invisible to staff UI) until promoted via SQL helper. See "Orchestrator dry-run pipeline" under Schema in place.
- **`resolveAuthUser(session)`** returns the real Supabase user — never a forged or dev user.
- **Role-based routing** lives in `lib/profile.ts`. Managers/admins → `/`, staff → `/staff`.

### Process

- **Audit-derived items merit a grep-first sanity check.** When something is "ONE-FUNCTION-AWAY," grep the relevant `taskEventType.X` literal or function name first to find existing call sites before assuming green-field.
- **Carry-forward items can go stale.** Sanity-check carry-forward sub-items older than ~5 days against the actual code before chasing. Saves time when entries have shipped.
- **Plan-before-cut for multi-file tasks.** Propose a plan before cutting code if the task touches more than one file or is otherwise non-trivial.

### Documentation precedence

- **This `docs/STATE.md` is the canonical product state entry point.** New sessions read this first. Do NOT recreate the daily handoff series.
- **`docs/dispatch-master-plan.md`** is THE inventory ("no cuts, all of it"). State labels there are stale post-Day-24; this STATE.md's closure ledger overrides.
- **`docs/TASK_EVENTS_CONTRACT.md`** is the event vocabulary contract.
- **`docs/kb/`** is canonical for governance + Jennifer's KB authoring.
- **`docs/supabase/*.sql`** is the schema source of truth.
- **`CLAUDE.md`** is the operating manual for Cowork-Claude. `AGENTS.md` is older and superseded; `dispatch-ui-rules.md` is merged into CLAUDE.md.

---

## Open Jennifer questions

- Six `[ASSUMED]` ADA cells in Section 9 (D-430 matrix) — confirm they mirror non-ADA equivalents.
- D-430 tolerance convention — strict-bounds vs implicit ~20%?
- `AddTaskModal` maintenance-routing decision — currently routes to `staff_home_bucket: "start_of_day"` since maintenance has no staff bucket. Confirm or surface as own bucket.
- Maintenance compose drawer cascading filter logic — flat dropdowns shipped Day 33 for beta. Once Jennifer authors the Location → Item → Type tree, swap static `MAINTENANCE_LOCATIONS` / `MAINTENANCE_ITEMS` / `MAINTENANCE_TYPES` exports for runtime filter logic.
- Reference Wednesday `2026-01-07` for `staff_segments_v` — confirm or pick a different anchor aligned to her business cycle.
- "Courtney Manager" name format — is "Manager" a surname or a role marker that leaked into the name field?
- Stray `Lizzie` row in `public.staff` (id `fc2c4280-2be4-4ef8-a1ea-3a0b3dfbe3bc`, no surname) — likely pre-rename stub before "Lizzie Larson" replaced her. Verify orphan + delete if confirmed.
- Section VI authoring lane (Jennifer's KB content): Detail prose for "Text to come" placeholders in `lib/checklists/variants/*.ts`; Welcome-specific checklist forks (A-430, S-430); Affirmations preset list (E-430); Rotating phrases libraries (E-430 wrap, SOD-430 date-context); Variant lists spec (Sheet Change, Pet, Deep, *** guest, Long-term); D-430 time-target matrix (18 null cells in `dispatch-config.ts`); per-Daily/Weekly/Monthly task time estimates (Da-430); Note Type writing examples per category.
- Two pre-existing `[ASK JENNIFER]` flags in `dispatch-config.ts` Section 14 (primary-staff identity + role-vs-spec drift).

---

## Standing tabled (low priority, carry-forward)

- `MODULE_TYPELESS_PACKAGE_JSON` Node warning. Harmless one-line follow-up.
- Re-key `dispatch-config.ts` Section 14 maps from full names to UUIDs.
- Legacy `task_comments` table cleanup. Pre-beta dev data only; no longer read/written from staff side post-Day-27.
- `lib/task-event-types.ts` extraction (post-beta polish). Day 29 Phase 7 fix duplicated 4 string literals + `TASK_EVENT_SCHEMA_VERSION` constant across 3 orchestration files. Long-term cleanup is to extract a Node-safe shared module.
- Surface map: `/admin/tasks` and II.G page (`/admin/tasks/[id]`) both fully live post-Day-36. The two routes intentionally remain separate (II.B `/tasks/[id]` for manager card view, II.G `/admin/tasks/[id]` for admin task view modal) — different roles, different shells, both share `ReassignPanel` from Day 35.
- v1 → v2 `task_events` vocabulary widening (post-beta polish). Day 36 admin Save & Deploy writes `tasks.priority` + `context.admin_notes` silently — the v1 vocabulary doesn't include `priority_changed` or `admin_notes_changed` event types, so the activity feed doesn't show admin edits. Acceptable for beta (the change is visible in the next view of the card); v2 vocabulary widening would let admin edits surface alongside staff card events.
- `BUCKET_THEME` for `/admin/tasks/[id]` falls back to `--sod-accent-pale` / `--sod-accent` (SOD) and `--sage-body` / `--sage-header` (maintenance) since the master plan II.G dulled-color tokens (`--sod-dull-*`, `--maintenance-dull-*`) don't exist yet. Visual signature is recognizably SOD/maintenance; if Bryan + Jennifer want stricter dulled-color tokens, they're a single globals.css addition.
- Same-day re-clock loses pair accuracy in `staff_clock_in_event_trigger`. Acceptable for beta single-property typical-shift.
- `PROPERTY_TIMEZONE` hardcoded `'America/Chicago'` in trigger + `dispatch-config.ts`. Master plan IX.C tracks moving to per-property column post-beta.
- 24h `created_at` window for cross-staff EOD activation gate (Day 30). For multi-shift / overnight scenarios may need adjustment; for typical 7-3 / 3-11 shifts at the beta hotel, generous enough.
- `onImDone` `clockOut` is fire-and-forget on failure. If `completeCard` succeeds and `clockOut` fails, staff stays clocked in despite EOD card done. Recovery: admin SQL `UPDATE public.staff SET clocked_in_at = NULL WHERE name = '<name>'`.
- High-severity push notification for maintenance issues deferred to Phase 5 of III.B. Beta surfaces High at the top of the activity feed via sort boost only; true live push is post-beta.
- E-430 (EOD) intentionally NOT a Maintenance host per master plan I.I. Threading is defensive — if Jennifer wants Maintenance on EOD later, the prop block is one paste away.
- `imageUrl=null` pre-pipeline for both Notes + Maintenance. V.G photo pipeline still PARTIAL (chase #4).
- No automatic `tasks` row creation on maintenance issue insert. The `maintenance_issues` row presented as a card view IS the third "admin task card" sink (KISS).
- No same-day-shift dedup on maintenance. Staff can file the same issue twice; admin resolves duplicates manually.
- Per-target-staff activity feed query (filter on `detail->>from_staff_id` / `detail->>to_staff_id` for III.H reassign rows). Detail shape supports it; query-side wiring deferred to post-beta. Property-wide feed at `/admin` carries the entry visibly enough for beta.
- Verification kit data persistence: Lizzie Larson has real-looking test tasks left from Day 31 / Day 34 verifications (`task 57744497-b061-48dc-8d67-01e827266670` + similar). Acceptable; representative of production data.
- `/staff` page's `now` is set once at mount via `useState(() => new Date())`. Late-Departures reshuffle (Day 38) won't fire mid-session without a page refresh — staff with the page loaded at 10:30 AM won't see the deck reflow at 11:01 AM unless they reload. Acceptable for beta single-property single-shift; if continuous reflow is needed, set up a per-minute interval or move `now` to a state that updates over time.
- Explicit "re-open" / "un-complete" semantics no longer accessible via UI post-Day-38. The deck's `done` state is one-way (mark done via action button; can't un-mark via UI). Re-touching a done card focuses it but keeps checkmark. If staff needs to undo a wrongly-marked done state, post-beta enhancement (long-press, or "Mark not done" from card detail).

---

## Bryan working style

- Bryan pastes prompts to CC in Cursor terminal and SQL in Supabase dashboard.
- Bryan is non-developer — never assume he can read diffs or debug stack traces.
- Q4 (Jennifer's KB authoring) is "an ongoing battle." Engineering doesn't block on it; cards render shells until KB lands.
- Cloudbeds is the channel-manager direction (ResNexus dead). Bryan's separate thread.
- "Live and die by the master plan": walk it top-down per priority.
- "No cuts, all of it" by default. Items deferred go to a v2 lane; deferring is not skipping.
- Context-capacity rule: end work + write the rolling close at ~70-85% session capacity. Past that, output quality degrades.

---

## Path to "well below 3-5 weeks"

The master plan footer (Day 24) estimated 6-10 weeks of focused engineering. Day 28 audit revised to ~4-6 weeks. Days 29-39 closures (III.A + III.B all five phases + III.D + III.H both scopes + I.A + I.B + I.C + III.J + II.G Reassign + Day 36's II.B/E/F/G non-Reassign surface + Day 37's V.A BR4 + Day 38's deck-state cluster: SOD initial-active + re-touch + late-Departures reshuffle + forward-unlock + Day 39's III.B Phase 5 maintenance source swap) trim further. Practical path remains: chase the 7 items above back-to-back across ~1.5-2 focused weeks (queue dropped from 9 to 7 across Days 38-39 — chase #1 SOD/deck-advancement Day 38, chase #1 III.B Phase 5 Day 39), then Vercel deploy + smoke test, then post-beta items (II.J KB Editor, II.K Calendar, II.L Recap, VII.H KB versioning, VIII.F-G ops) push off the critical path. Section II.J + II.K are post-beta per the spreadsheet's own marking — formal `[DEFER]` to a v2 lane satisfies "no cuts" without violating the promise.

Three multipliers held throughout: (1) batching cross-cutters that unblock multiple Section I items at once (III.B closure unblocked I.D / I.E / I.F / I.G simultaneously), (2) Section VI Jennifer authoring as a parallel non-blocking lane, (3) hour density — single focused 4-5 hour sessions can close multiple items.

---

## Last session close (Day 39, 2026-05-07)

Chase #1 closed in a single commit. III.B Phase 5 — the `maintenance_issues` source swap in the activity feed — landed as `7281b8f`. The Day 33 closure ledger entry for III.B noted Phase 5 as a "small remaining slice"; today's chase confirms that read. Net work: ~30 min, additive parallel to the notes fetch.

**Diagnosis.** Read of `lib/activity-feed.ts` exposed the placeholder design: top comment claimed maintenance was "currently sourced via notes where note_type='Maintenance'", but the notes fetch never actually filtered on note_type — it pulled all notes regardless. Combined with the staff Maintenance compose drawer writing to `maintenance_issues` exclusively since Day 33 (verified via `app/staff/task/[id]/page.tsx:563` calling `addMaintenanceIssue`, no parallel write to notes), maintenance reports in fact never reached the activity feed. So the chase was additive (third parallel source), not substitutive — no notes-side filter to change, just a new fetch to add.

**Implementation (`7281b8f`).** Added `fetchMaintenanceIssueItems` paralleling `fetchNoteItems` — same `{ limit, authorUserId? }` options shape, same reverse-chron LIMIT, same graceful-error pattern (warn + empty array). Select projection: `id, task_id, author_user_id, author_display_name, body, location, item, type, severity, room_number, card_type, created_at, tasks(id, title, room_number)`. Added `normalizeMaintenanceIssueRow` projecting to `ActivityFeedItem` with `kind: "maintenance_issue"`, severity via `classifyMaintenanceIssueSeverity`, message via `composeMaintenanceIssueMessage`, detail carrying `{ location, item, type, severity, body }`. `event_type` / `note_type` / `note_status` set null per the discriminated-union convention. Both `getActivityFeed` + `getActivityForUser` fan out three sources via `Promise.all` and pass the merged array to `mergeAndRank`. `ActivityKind` union extended to `"task_event" | "note" | "maintenance_issue"`. Top comment block updated: dropped the stale "Future: maintenance_issues" caveat, added "Day 39 III.B Phase 5" line documenting the new source.

**Component update.** `components/admin/ActivityFeed.tsx` gained a Maintenance option (`<option value="maintenance_issue">Maintenance</option>`) in the Kind dropdown and the row meta-badge ternary swapped to a 3-way switch (NOTE / MAINT / EVENT). No CSS changes — the existing `.af3-sev--warn` / `.af3-sev--info` palette covers maintenance severity dots without modification.

**Severity mapping decision logged.** High → warn was Bryan's read in the Day 38 handoff: "the existing severity-boost ordering means High-severity maintenance items will surface above info entries via the same path." Normal + Low fall through to info. Bumping Normal to warn was rejected — would dominate the feed since most issues land Normal. If a future call wants High → critical (mirroring needs_help-class urgency for High-severity property infrastructure issues), it's a one-line change in `classifyMaintenanceIssueSeverity`.

**Per-user feed scope.** `getActivityForUser` filters maintenance by `author_user_id = userId` — staff's per-user feed shows issues *they reported*, parallel to notes-they-authored. Alternative would be parent-task-assignee scope; chose author parity for KISS. Surfaceable if Bryan wants the other read.

**Build clean.** 2 files changed (`lib/activity-feed.ts`, `components/admin/ActivityFeed.tsx`), 146 insertions / 19 deletions. No schema, no deps, no CSS. `7281b8f` on origin/main; working tree clean post-commit. Build verified pre-commit via the standard `&&`-chained CC prompt — no `tail` pipe per the standing convention.

**UI verification deferred to Bryan post-session.** From `/admin`: confirm Maintenance shows in the Kind filter dropdown (between Notes and the Refresh button). Filter to Maintenance → existing `maintenance_issues` rows surface with the MAINT badge in the row meta. Filter to All severity, sort visually: any High-severity maintenance rows should sit above Info-severity entries (via the existing severity-boost ordering, same as how `reassigned` events sit above info). If no maintenance_issues rows exist yet, the filter will show the standard "No recent activity" empty state — that's correct, not a regression.

**Day 39 friction surfaced (logged but not chased today):**
- **Day 38 process gap repeated at session start.** The CC `git status` output again collapsed under "+3 lines" pre-commit; in this case the +3 lines were the standard staged-file display so no harm done, but the pattern keeps surfacing. Future sessions should still expand explicitly before declaring "working tree clean" — the failure mode is a stale untracked file slipping in unnoticed (Day 38 lib/clock-in.ts patch). Standing tabled.

**Carry-forward from Day 38 still pending Bryan-solo:**
- **Reshuffle UI verification** post-11 AM Central runtime check. Day 38 SQL block 1 reset Lizzie's 2 incomplete Departures to status='open' for a clean test state; SQL block 2 cleared all 5 staff `clocked_in_at`. After 11:00 AM Central refresh, the deck should render in reshuffled order: SOD → Stayovers → Arrivals → Departures → Dailys → EOD, with first-non-done active = Stayovers (since SOD's `initialDone` and Departures has incomplete tasks). Paste anything that looks off.
- **Stray-Lizzie data hygiene** unresolved (orphan `fc2c4280-2be4-4ef8-a1ea-3a0b3dfbe3bc` 'Ops' vs. canonical Lizzie Larson `8fb2f515-4df3-4835-b2e9-e01f2eff993d` 'Front of House'). Open Jennifer question; not chased Day 39.

**Followups for next session:** chase queue dropped from 8 to 7. Highest-priority remaining is chase #1 (III.E + V.G photo pipeline wiring, ~1-2 hours) — `uploadTaskFile` helper already exists at `lib/task-events.ts:45`; wire into `NoteComposeForm` + `MaintenanceComposeForm` (file input + call `uploadTaskFile` + pass `imageUrl` to `addNote` / `addMaintenanceIssue`) plus verify Storage RLS policies (master plan VII.F PARTIAL). Substantial slice alternative is chase #2 (II.H Admin Maintenance live-data wiring, ~1-2 hours) — would close the last partial in Section II by wiring `app/admin/maintenance/[id]/page.tsx` to `public.maintenance_issues` filtered by location / by type, plus per-issue card view. Reading paths for chase #1: Tier 1 (STATE.md + CLAUDE.md) plus Tier 2 "Section III cross-cutter" — `lib/task-events.ts` (uploadTaskFile at line 45), `lib/notes.ts`, `lib/maintenance.ts`, both compose form components under `app/staff/task/[id]/`, plus `docs/supabase/cards_mvp.sql` for the `task-files` storage bucket policy.
