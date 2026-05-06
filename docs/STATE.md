# Dispatch — Product State (current as of Day 35, 2026-05-06)

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
- Six bucket cards on staff home (SOD / Departures / Stayovers / Arrivals / Dailys / EOD), hard-locked sequential gating (non-active = blurred + pointer-events-none).
- All six X-430 staff card execution screens (D-430, A-430, S-430, Da-430, E-430, SOD-430), with Notes compose drawer, Maintenance compose drawer, status pills, checklists, pause/resume, need-help, image attachment.
- Wrap Shift on E-430 clocks staff out + cross-staff EOD activation gate (locked until other on-shift staff are in their EOD).

**Admin side:**
- `/admin` home with live Activity Feed (filterable by severity + kind, dismissable per-browser via localStorage).
- `/admin/staff/[id]` with sky-blue hero card + 14-day segment block + per-shift summary + lifetime hours.
- `AddTaskModal` mounted on `/admin`, `/admin/tasks`, `/admin/staff/[id]`. All six buckets selectable, priority chips, assignee chips, room field, notes panel, pre-selected-staff lock mode.
- `/tasks/[id]` manager card view with editable assignee dropdown → fires reassignTask helper on save (Day 34).
- `/admin/tasks` dashboard (mostly mocked — LANES + STAT_* hardcoded; carry-forward chase #1 below).
- `/admin/maintenance/[id]` (mostly mocked — depends on II.H wiring; carry-forward chase #5).
- `/admin/tasks/[id]` (II.G admin task view modal — Reassign action is live post-Day-35; the rest is mocked, bundled into chase #1).

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
- `tasks` — `card_type` ∈ {`housekeeping_turn`, `arrival`, `stayover`, `eod`, `dailys`, `start_of_day`, `maintenance`, `generic`}; `status` ∈ {`open`, `in_progress`, `paused`, `blocked`, `done`}; `source` ∈ {`manual`, `staff_report`, `pms`, `system`}; `priority` ∈ {`low`, `medium`, `high`} default `medium`. `context` JSONB carries per-card metadata; required subkey `staff_home_bucket`; conventional subkeys `incoming_guest` / `current_guest` / `outgoing_guest` (object-shaped per `wave_4d_context.sql` — each has `name`/`party_size`/`extras`/etc. depending on guest direction) + `notes` (card-level free text, distinct from `public.notes` table). Always merge-safe write: `{ ...current, <subkey>: { ...current?.<subkey>, <new> } }`. `assignee_name` text mirrors `staff_id` for display fallback.
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

## Closure ledger — master plan items closed (Days 27-35)

The master plan at `docs/dispatch-master-plan.md` was authored Day 24 with State labels (BUILT / PARTIAL / UNBUILT / AUTHORING). Items below have closed since; the master plan inline labels haven't been re-annotated. This ledger overrides.

- ✓ **I.A** — Hard-lock sequential gating + drop staff-side quick-add (Day 30).
- ✓ **I.B** — Pre-Clock-In screen (Day 30).
- ✓ **I.C** — Clock-In + Wrap Shift end-to-end (4 phases, Days 30-32). Staff clocks in → `clocked_in_at` flips → trigger writes `shift_start` → orchestrator picks up → tasks generate. Wrap Shift on E-430 nulls `clocked_in_at` → trigger writes `shift_end`. Cross-staff EOD activation gate locks Wrap Shift until other on-shift housekeepers are in their EOD card.
- ✓ **III.A** — Notes compose drawer + 3-sink routing + dual-sink read pattern (Day 27).
- ✓ **III.B** — Maintenance compose drawer at staff side (4 of 4 listed phases, Day 33). Phase 5 (`maintenance_issues` source swap in activity feed) is a small remaining slice — see chase #3 below.
- ✓ **III.D** — Activity feed (admin), 7 phases end-to-end (Day 29). Three new audit event types (`assignment_cross_hall_override`, `assignment_above_standard_load`, `reshuffle_tier_changed`) + severity classification + day-grouped UI + filters + dismiss persistence.
- ✓ **III.H** — Reassignment closed end-to-end (Days 34-35). Scope A (Day 34): `reassignTask()` helper at `lib/orchestration/index.ts`. Scope B (Day 35): discrete `ReassignPanel` at `components/admin/ReassignPanel.tsx` (chip-row staff picker + required reason textarea + Reassign button). Mounted on BOTH `/tasks/[id]` (replacing the dropdown + inline reassign-on-save flow — dropdown fully removed) AND `/admin/tasks/[id]` (II.G admin task view, between Activity and CTA pair, backed by a small live assignee fetch). Single component, two surfaces. **II.G partial credit**: the Reassign admin action is wired; the rest of II.G's surface (priority chips, admin notes, activity feed, Save & Deploy) remains chase #1 territory.
- ✓ **III.J** — 14-day segment infrastructure via three views (Day 32). View-for-beta lean honored; no new tables.
- ✓ **VII.D** — Segments table-vs-view question (resolved as views, Day 32).

**Section IV:** the three Step-follow audit-event TODOs (Steps 5/6/7-follow) closed Day 29 as a side effect of III.D Phase 1.

**Section II:** II.A (`AddTaskModal`) is ~95% built per Day 28 audit; confirmation pass pending. II.B / II.E / II.F / II.G / II.H are PARTIAL — mostly built shells, live-data wiring is the remaining work (chase #1 below).

---

## Recommended next chases (priority-ordered)

When you start a session, pick the highest-priority chase that's unblocked. Update this list when items close — move closed items to the closure ledger above.

1. **Section II live-data wirings cluster** (~2 hours). Replace `LANES` + `STAT_OPEN/DONE/OVERDUE` hardcoded in `app/admin/tasks/page.tsx` with Supabase queries (~45 min). Replace `WATCHLIST_ITEMS / SCHEDULING_ITEMS / CRITICAL_ITEMS / NOTES_ITEMS` hardcoded in `app/admin/page.tsx` with derived queries (~1 hr). Replace `PROFILES` const lookup in `app/admin/staff/[id]/page.tsx` with live `public.staff` fetch (~30 min — the segment block is already live data; this swaps the static profile metadata around it). The II.G admin task view (`app/admin/tasks/[id]/page.tsx`) is partially live post-Day-35 (Reassign panel + assignee fetch); the rest of its surface (priority/admin-notes/activity/Save & Deploy) lives in this chase too. Skip `/admin/maintenance/[id]` for now — covered by chase #5. **Biggest visible payoff in the queue.**

2. **V.A BR4 X-430 brief reservation fallback** (1-2 hours). Per-card edits to fall back to `getCurrentReservationForRoom()` / `getNextIncomingReservationForRoom()` (in `lib/reservations.ts`) when `task.context.{incoming_guest, current_guest, outgoing_guest}` is missing. Unblocks I.E + I.F live guest data wirings AND I.G Last Stayover Status lookup.

3. **III.B Phase 5 — `maintenance_issues` source swap in activity feed** (~30 min). Replace placeholder `notes WHERE note_type='Maintenance'` source in `lib/activity-feed.ts:12` with a real `maintenance_issues` query branch. Day 34's `reassigned`-as-warn classification + the existing severity-boost ordering means High-severity maintenance items will surface above info entries via the same path once the source swap lands.

4. **III.E + V.G photo pipeline wiring** (1-2 hours). `uploadTaskFile` helper exists at `lib/task-events.ts:45`. Wire into `NoteComposeForm` + `MaintenanceComposeForm`: file input + call `uploadTaskFile` + pass `imageUrl` to `addNote` / `addMaintenanceIssue`. Storage RLS policies need verification (master plan VII.F PARTIAL).

5. **II.H Admin Maintenance live-data wiring** (~1-2 hours). Schema unblocked by Day 33's `maintenance_issues` table. Wire `app/admin/maintenance/[id]/page.tsx` to query `public.maintenance_issues` filtered by location / by type, plus per-issue card view. Replace `ORDER` mock const.

6. **IV.H Wed-occupancy Deep Clean trigger** (~1 hour). Constants exist in `dispatch-config.ts` Section 12. Unblocked by III.D's audit-event sink (Day 29). All four conditions: <5 departures + 40%+ occupancy in last 45 days + no deep clean in 45 days + ≤3 deep items completed in 45 days. Auto-elevates Standard → Deep on Wednesdays.

7. **II.A `AddTaskModal` confirmation pass** (~30 min). Verify the modal matches master plan II.A spec end-to-end. Possible bucket-model tweak — maintenance currently routes to `staff_home_bucket: "start_of_day"` since maintenance has no staff bucket; confirm or surface as own bucket.

8. **I.G remaining sub-items.** Last Stayover Status lookup (blocks on chase #2 V.A BR4), checklist variants for Sheet Change weekly + * guest (pending Jennifer's KB authoring), status-driven auto-complete (DND/Desk OK/Guest OK pre-selection auto-completes + auto-archives), Sheet Change skip semantics. Bundled or split as makes sense.

9. **Item I — Vercel deploy** (~30 min). Bryan's parallel lane via `docs/deployment/vercel-checklist.md`. GitHub push → Vercel CLI → first deploy → env vars (incl. `AGENT_KILL=true` and `AGENT_DRY_RUN=true` for safety) → Supabase magic-link redirect URL config → smoke test in incognito.

10. **V.C Cloudbeds.** Bryan's separate thread, outside engineering critical path. Pending sales quote.

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
- Surface map: `/admin/tasks` links to a partially-mocked II.G page (`/admin/tasks/[id]`) vs. live II.B page (`/tasks/[id]`). II.G's Reassign action is wired post-Day-35; the rest of II.G's data wiring is bundled into chase #1.
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

The master plan footer (Day 24) estimated 6-10 weeks of focused engineering. Day 28 audit revised to ~4-6 weeks. Days 29-35 closures (III.A + III.B-staff + III.D + III.H both scopes + I.A + I.B + I.C + III.J + II.G Reassign action) trim further. Practical path remains: chase the 10 items above back-to-back across ~2-3 focused weeks, then Vercel deploy + smoke test, then post-beta items (II.J KB Editor, II.K Calendar, II.L Recap, VII.H KB versioning, VIII.F-G ops) push off the critical path. Section II.J + II.K are post-beta per the spreadsheet's own marking — formal `[DEFER]` to a v2 lane satisfies "no cuts" without violating the promise.

Three multipliers held throughout: (1) batching cross-cutters that unblock multiple Section I items at once (III.B closure unblocked I.D / I.E / I.F / I.G simultaneously), (2) Section VI Jennifer authoring as a parallel non-blocking lane, (3) hour density — single focused 4-5 hour sessions can close multiple items.

---

## Last session close (Day 35, 2026-05-06)

Two pieces back-to-back: STATE.md gap audit, then III.H Scope B + II.G admin task view modal wiring (carry-forward chase #2 from Day 34).

**Piece 1 — STATE.md gap audit (commit `41bf4f4`):** read all 26 migrations in `docs/supabase/` + master plan front-to-back side-by-side with STATE.md to surface load-bearing facts that didn't make the Day 34 cut. Landed inline: Tables block expanded from 1 paragraph to 12 per-table entries with full enums + constraints + JSONB context subkey contract; `reservations` / `task_drafts` / `inbound_events` / `deep_clean_history` schema details; Views block adds segment math formula + is_current/effective_end_at; Triggers block expanded 3 → 8 (added `task_checklist_staff_guard`, `tasks_seed_default_checklist` gotcha, `task_checklist_set_done_at`, `handle_new_user_profile`, `reservations_set_updated_at`); new "Orchestrator dry-run pipeline" subsection (`AGENT_DRY_RUN` / `AGENT_KILL` / `promote_draft_to_task()` workflow); RLS block corrected (staff CAN update `context`); migration files list rewritten 12 → 26; Locked design tokens new block; 4 Architecture-rules gotchas added. 325 → 364 lines. Markdown-only.

**Piece 2 — III.H Scope B + II.G ReassignPanel (commit `b1530b2`):** new `components/admin/ReassignPanel.tsx` + `.module.css` — chip-row staff picker + required reason textarea + Reassign button, routes through `reassignTask()` so the staff_id mutation + `reassigned` task_events row stay atomic. Mounted on `/tasks/[id]` (manager card view — replaces the Assign-to-staff dropdown + the inline reassign-on-save flow; both fully removed) and `/admin/tasks/[id]` (II.G admin task view — between Activity panel and CTA pair, backed by a small live `staff_id` + `assignee_name` + embedded staff name fetch). Single component, two surfaces. Closes master plan III.H Scope B end-to-end + Day 28 audit's II.G "Reassign" UNBUILT admin action. Build clean; 4 files changed (2 new, 2 modified), 390 insertions / 59 deletions. No schema change.

Net for Day 35: STATE.md is durable bedrock for substantive product knowledge AND the chase #2 closure trims the queue from 11 items to 10. The "Reassignment as side-effect of Save card" standing-tabled entry retired; "Surface map" entry updated; III.H closure-ledger entry expanded to cover both scopes; chase queue renumbered (II live-data wirings still #1; old #3 V.A BR4 is now #2; etc.).

Followups for next session: pick from the chase queue. Default lean is still chase #1 (Section II live-data wirings cluster, ~2 hours, biggest visible payoff, now also includes II.G's non-Reassign surface). Alternative: chase #2 (V.A BR4 reservation fallback) which unblocks I.E + I.F + I.G Last-Stayover-Status simultaneously.
