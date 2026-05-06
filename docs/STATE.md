# Dispatch — Product State (current as of Day 34, 2026-05-06)

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
- `/admin/maintenance/[id]` (mostly mocked — depends on II.H wiring; carry-forward chase #6).
- `/admin/tasks/[id]` (II.G admin task view modal — mostly mocked; carry-forward chase #2).

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

---

## Schema in place

**Tables:** `tasks`, `task_events`, `task_checklist_items`, `task_comments` (legacy — pre-beta dev data only), `task_drafts`, `profiles`, `staff` (with `clocked_in_at` column), `reservations`, `inbound_events`, `notes` + 4 taxonomies, `maintenance_issues` + 4 taxonomies.

**Views:** `staff_shifts_v`, `staff_segments_v`, `shift_summary_v`.

**Triggers:**
- `staff_clock_in_event_trigger` — `staff.clocked_in_at` flip → `inbound_events` row (SECURITY DEFINER).
- `tasks_staff_field_guard()` — defense-in-depth alongside RLS for staff-write-blocked task fields.
- Denormalize triggers on `notes` + `maintenance_issues` (fill `room_number` + `card_type` from parent task).

**Storage:** `task-files` bucket (compose-drawer wiring still pending — III.E PARTIAL).

**RLS:** `auth_profile_role()` SECURITY DEFINER function avoids `profiles` policy recursion. Staff cannot update reassigned/priority/due/context fields. Notes + maintenance_issues policies mirror — staff insert-self-only, admin/manager full CRUD, select gated by `can_read_task` or self-author.

**Migration files in `docs/supabase/`:** `cards_mvp.sql`, `milestone1_architecture_lock.sql`, `fix_rls_profiles_recursion_manager_path.sql`, `taxonomy_tables.sql`, `notes_table.sql`, `maintenance_issues_table.sql`, `staff_clocked_in_at.sql`, `staff_clock_in_event_trigger.sql`, `staff_shifts_view.sql`, `staff_segments_view.sql`, `shift_summary_view.sql`, `drop_activity_events_table.sql`. Apply via Supabase dashboard SQL editor; idempotent.

---

## Closure ledger — master plan items closed (Days 27-34)

The master plan at `docs/dispatch-master-plan.md` was authored Day 24 with State labels (BUILT / PARTIAL / UNBUILT / AUTHORING). Items below have closed since; the master plan inline labels haven't been re-annotated. This ledger overrides.

- ✓ **I.A** — Hard-lock sequential gating + drop staff-side quick-add (Day 30).
- ✓ **I.B** — Pre-Clock-In screen (Day 30).
- ✓ **I.C** — Clock-In + Wrap Shift end-to-end (4 phases, Days 30-32). Staff clocks in → `clocked_in_at` flips → trigger writes `shift_start` → orchestrator picks up → tasks generate. Wrap Shift on E-430 nulls `clocked_in_at` → trigger writes `shift_end`. Cross-staff EOD activation gate locks Wrap Shift until other on-shift housekeepers are in their EOD card.
- ✓ **III.A** — Notes compose drawer + 3-sink routing + dual-sink read pattern (Day 27).
- ✓ **III.B** — Maintenance compose drawer at staff side (4 of 4 listed phases, Day 33). Phase 5 (`maintenance_issues` source swap in activity feed) is a small remaining slice — see chase #4 below.
- ✓ **III.D** — Activity feed (admin), 7 phases end-to-end (Day 29). Three new audit event types (`assignment_cross_hall_override`, `assignment_above_standard_load`, `reshuffle_tier_changed`) + severity classification + day-grouped UI + filters + dismiss persistence.
- ✓ **III.H** — Reassignment dual-logging at the data/helper layer (Day 34, Scope A). `reassignTask()` in `lib/orchestration/index.ts` mutates `tasks.staff_id` + `assignee_name` and emits a single `task_events` row with `from_staff_id` + `to_staff_id` + `from_staff_name` + `to_staff_name` + optional `reason`. Surface side: existing dropdown on `manager-card-detail.tsx` consumes the helper. Scope B (discrete reassign panel with required reason note) + II.G admin task view modal wiring are carry-forward.
- ✓ **III.J** — 14-day segment infrastructure via three views (Day 32). View-for-beta lean honored; no new tables.
- ✓ **VII.D** — Segments table-vs-view question (resolved as views, Day 32).

**Section IV:** the three Step-follow audit-event TODOs (Steps 5/6/7-follow) closed Day 29 as a side effect of III.D Phase 1.

**Section II:** II.A (`AddTaskModal`) is ~95% built per Day 28 audit; confirmation pass pending. II.B / II.E / II.F / II.G / II.H are PARTIAL — mostly built shells, live-data wiring is the remaining work (chase #1 below).

---

## Recommended next chases (priority-ordered)

When you start a session, pick the highest-priority chase that's unblocked. Update this list when items close — move closed items to the closure ledger above.

1. **Section II live-data wirings cluster** (~2 hours). Replace `LANES` + `STAT_OPEN/DONE/OVERDUE` hardcoded in `app/admin/tasks/page.tsx` with Supabase queries (~45 min). Replace `WATCHLIST_ITEMS / SCHEDULING_ITEMS / CRITICAL_ITEMS / NOTES_ITEMS` hardcoded in `app/admin/page.tsx` with derived queries (~1 hr). Replace `PROFILES` const lookup in `app/admin/staff/[id]/page.tsx` with live `public.staff` fetch (~30 min — the segment block is already live data; this swaps the static profile metadata around it). Skip `/admin/maintenance/[id]` for now — covered by chase #6. **Biggest visible payoff in the queue.**

2. **III.H Scope B + II.G admin task view modal wiring** (~1 hr combined). Build a discrete reassign panel component: assignee chip row reusing `fetchAssignableStaffOptions` from `AddTaskModal` + required reason textarea + "Reassign" button calling `reassignTask({reason})`. Drop into `app/tasks/[id]/manager-card-detail.tsx` (replacing or augmenting the dropdown-on-save flow) AND into `app/admin/tasks/[id]/page.tsx` (currently mocked II.G — wire the assignee block to the new panel). Single component, two surfaces. Closes the III.H surface side and the Day 28 audit's II.G "Reassign" UNBUILT admin action in one chase.

3. **V.A BR4 X-430 brief reservation fallback** (1-2 hours). Per-card edits to fall back to `getCurrentReservationForRoom()` / `getNextIncomingReservationForRoom()` (in `lib/reservations.ts`) when `task.context.{incoming_guest, current_guest, outgoing_guest}` is missing. Unblocks I.E + I.F live guest data wirings AND I.G Last Stayover Status lookup.

4. **III.B Phase 5 — `maintenance_issues` source swap in activity feed** (~30 min). Replace placeholder `notes WHERE note_type='Maintenance'` source in `lib/activity-feed.ts:12` with a real `maintenance_issues` query branch. Day 34's `reassigned`-as-warn classification + the existing severity-boost ordering means High-severity maintenance items will surface above info entries via the same path once the source swap lands.

5. **III.E + V.G photo pipeline wiring** (1-2 hours). `uploadTaskFile` helper exists at `lib/task-events.ts:45`. Wire into `NoteComposeForm` + `MaintenanceComposeForm`: file input + call `uploadTaskFile` + pass `imageUrl` to `addNote` / `addMaintenanceIssue`. Storage RLS policies need verification (master plan VII.F PARTIAL).

6. **II.H Admin Maintenance live-data wiring** (~1-2 hours). Schema unblocked by Day 33's `maintenance_issues` table. Wire `app/admin/maintenance/[id]/page.tsx` to query `public.maintenance_issues` filtered by location / by type, plus per-issue card view. Replace `ORDER` mock const.

7. **IV.H Wed-occupancy Deep Clean trigger** (~1 hour). Constants exist in `dispatch-config.ts` Section 12. Unblocked by III.D's audit-event sink (Day 29). All four conditions: <5 departures + 40%+ occupancy in last 45 days + no deep clean in 45 days + ≤3 deep items completed in 45 days. Auto-elevates Standard → Deep on Wednesdays.

8. **II.A `AddTaskModal` confirmation pass** (~30 min). Verify the modal matches master plan II.A spec end-to-end. Possible bucket-model tweak — maintenance currently routes to `staff_home_bucket: "start_of_day"` since maintenance has no staff bucket; confirm or surface as own bucket.

9. **I.G remaining sub-items.** Last Stayover Status lookup (blocks on chase #3 V.A BR4), checklist variants for Sheet Change weekly + * guest (pending Jennifer's KB authoring), status-driven auto-complete (DND/Desk OK/Guest OK pre-selection auto-completes + auto-archives), Sheet Change skip semantics. Bundled or split as makes sense.

10. **Item I — Vercel deploy** (~30 min). Bryan's parallel lane via `docs/deployment/vercel-checklist.md`. GitHub push → Vercel CLI → first deploy → env vars (incl. `AGENT_KILL=true` and `AGENT_DRY_RUN=true` for safety) → Supabase magic-link redirect URL config → smoke test in incognito.

11. **V.C Cloudbeds.** Bryan's separate thread, outside engineering critical path. Pending sales quote.

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
- **Staff cannot update certain task fields** (assignee, priority, due date, context). Defense-in-depth: RLS + Postgres trigger `tasks_staff_field_guard()`. If you add a field that only managers should edit, update both.
- **`task_events` is append-only.** No updates, no deletes. Schema is versioned at `schema_version: 1`. Don't mutate v1; bump to v2 if you need to evolve.
- **`tasks.context` is JSONB.** The one field that absolutely must be set for staff UX is `context.staff_home_bucket`. Enforce in UI; DB default is sloppy.
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
- Surface map decision: `/admin/tasks` links to mocked II.G page (`/admin/tasks/[id]`) vs. live II.B page (`/tasks/[id]`). Lean: wire II.G to the helper (covered by chase #2 above).
- Same-day re-clock loses pair accuracy in `staff_clock_in_event_trigger`. Acceptable for beta single-property typical-shift.
- `PROPERTY_TIMEZONE` hardcoded `'America/Chicago'` in trigger + `dispatch-config.ts`. Master plan IX.C tracks moving to per-property column post-beta.
- 24h `created_at` window for cross-staff EOD activation gate (Day 30). For multi-shift / overnight scenarios may need adjustment; for typical 7-3 / 3-11 shifts at the beta hotel, generous enough.
- `onImDone` `clockOut` is fire-and-forget on failure. If `completeCard` succeeds and `clockOut` fails, staff stays clocked in despite EOD card done. Recovery: admin SQL `UPDATE public.staff SET clocked_in_at = NULL WHERE name = '<name>'`.
- High-severity push notification for maintenance issues deferred to Phase 5 of III.B. Beta surfaces High at the top of the activity feed via sort boost only; true live push is post-beta.
- E-430 (EOD) intentionally NOT a Maintenance host per master plan I.I. Threading is defensive — if Jennifer wants Maintenance on EOD later, the prop block is one paste away.
- `imageUrl=null` pre-pipeline for both Notes + Maintenance. V.G photo pipeline still PARTIAL (chase #5).
- No automatic `tasks` row creation on maintenance issue insert. The `maintenance_issues` row presented as a card view IS the third "admin task card" sink (KISS).
- No same-day-shift dedup on maintenance. Staff can file the same issue twice; admin resolves duplicates manually.
- Reassignment as side-effect of "Save card" retained in `manager-card-detail.tsx`. Helper fires before the main update. Scope B (chase #2) introduces a discrete reassign panel; the dropdown can become read-only at that point.
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

The master plan footer (Day 24) estimated 6-10 weeks of focused engineering. Day 28 audit revised to ~4-6 weeks. Days 29-34 closures (III.A + III.B-staff + III.D + III.H + I.A + I.B + I.C + III.J) trim further. Practical path remains: chase the 11 items above back-to-back across ~2-3 focused weeks, then Vercel deploy + smoke test, then post-beta items (II.J KB Editor, II.K Calendar, II.L Recap, VII.H KB versioning, VIII.F-G ops) push off the critical path. Section II.J + II.K are post-beta per the spreadsheet's own marking — formal `[DEFER]` to a v2 lane satisfies "no cuts" without violating the promise.

Three multipliers held throughout: (1) batching cross-cutters that unblock multiple Section I items at once (III.B closure unblocked I.D / I.E / I.F / I.G simultaneously), (2) Section VI Jennifer authoring as a parallel non-blocking lane, (3) hour density — single focused 4-5 hour sessions can close multiple items.

---

## Last session close (Day 34, 2026-05-06)

Master plan III.H closed at the helper layer via Scope A: extracted `reassignTask()` to `lib/orchestration/index.ts` (next to `openCard` / `pauseCard` / `completeCard`); swapped the existing inline log at `manager-card-detail.tsx:380-387` for a call to the helper; formalized event detail with `withTaskEventSchema` + `from_staff_name` / `to_staff_name`; documented `reassigned` in `TASK_EVENTS_CONTRACT.md`; classified `reassigned` as `warn` in `lib/activity-feed.ts`. End-to-end verified: Lizzie Larson → Courtney Manager swap on task `57744497-b061-48dc-8d67-01e827266670` produced exactly one task_events row at `2026-05-06 15:41:36.819+00` with all expected detail fields + row update landed.

Commit `303fb32` on origin/main. Build clean. No schema change. 4 files touched (`lib/orchestration/index.ts`, `app/tasks/[id]/manager-card-detail.tsx`, `lib/activity-feed.ts`, `docs/TASK_EVENTS_CONTRACT.md`), 116 insertions / 12 deletions.

Side discovery: `/admin/tasks` dashboard links to `/admin/tasks/[id]` (master plan II.G admin task view modal — mostly mocked, no live reassign UI), not to `/tasks/[id]` (master plan II.B — `manager-card-detail.tsx`, the live form with the reassign UI). Two separate pages; pre-existing per Day 28 audit. Carry-forward chase #2.

Documentation cleanup landed alongside: this `docs/STATE.md` created as the new canonical entry point; 14 obsolete daily handoff docs deleted (`handoff-day-22.md` through `handoff-day-34.md` + `phase-4-handoff.md`); `CLAUDE.md` updated to point new sessions at `STATE.md` first. ~50K-token-per-session tax on Cowork onboarding eliminated.
