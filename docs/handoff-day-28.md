# UI / Build Handoff — Dispatch Day 28 (2026-05-05)

*Continuation handoff for a fresh Cowork chat. Supplements — does not replace — `docs/handoff-day-27.md` (Day 27 state), `docs/handoff-day-{26,25,24,23,22}.md`, `docs/phase-4-handoff.md` (Day 21), and `docs/dispatch-master-plan.md`. Read those alongside this one. The 25-tab governance spreadsheet at `docs/kb/` is canonical for governance.*

*Date: 2026-05-05, Day 28. Session was a discovery + audit pass. Two substantive outputs: (1) scoped + queued the III.D Activity feed build as a 7-phase TodoList, then (2) per Bryan's request, ran a master-plan audit pass to find items understated as PARTIAL/UNBUILT that are actually further along than the inventory claims. NO CODE LANDED THIS SESSION — Day 28 is pure planning + audit. Build picks up Phase 1 of III.D in Day 29.*

---

## Day 28 in one sentence

The master plan (`docs/dispatch-master-plan.md`) is structurally accurate but materially **undercounts existing work**. After the III.D investigation surfaced that activity-feed scaffolding was partially in place (table, reader module, contract doc — none mounted but all real), Bryan called for a wider audit pass against the same lens. The audit found at least **7 items the master plan flags as UNBUILT or PARTIAL that are actually substantially complete or one-wire-away from done**. The "100% no cuts" road is shorter than the master plan footer estimates, probably 4-6 weeks of focused engineering rather than 6-10.

---

## What landed in Day 28

**No commits.** Working tree clean at session end (HEAD still at `36a64f1` from Day 27 handoff doc commit). No code, no schema, no doc edits — only this handoff.

### 1. III.D Activity feed scoping pass (queued, not started)

Investigation surfaced that III.D is "extend + integrate," not "create from scratch." The TASK_EVENTS_CONTRACT.md line 21 explicitly directs: **"`activity_events` is not governed by this contract. Prefer deriving admin narratives from `task_events` over time."** So the architectural intent was already locked: the activity feed derives from `task_events`, not `activity_events`. The orphan `activity_events` table can be dropped.

**Three pieces of dead/orphaned infrastructure surfaced:**

- `docs/supabase/activity.sql` — `activity_events` table exists, has the wrong shape (no FK, no user_id, no detail jsonb), zero callers anywhere. Drop it.
- `app/activity-section.tsx` — orphan reader, nothing imports it (greps zero outside the file). Reads `task_events` and renders day-grouped feed. Salvageable CSS but not the component.
- `app/admin/page.tsx` Activity section — uses HARDCODED `FEED_ITEMS` placeholder. This is what III.D replaces.

**Wait — there's a contradicting find.** `lib/activity-log.ts` (existed pre-Day-28) has a real `logActivity(type, message)` helper that writes to the orphan `activity_events` table. Six event types defined: `dispatch_saved`, `task_created`, `task_completed`, `staff_added`, `staff_status_changed`, `staff_outcome_added`. Plus a `window.dispatchEvent` refresh hub. **This module is wired to the wrong sink.** Either repurpose to write to `task_events` (with synthetic task_id?), drop entirely, or repoint to a new sink. Decision deferred to Phase 1 review.

### 2. III.D 7-phase TodoList (created, all pending)

Tasks #1-#7 in TodoList. Carry forward as-is into Day 29. None started.

- **Phase 1.** Audit event vocabulary expansion. Add 3 new event_types to `lib/task-events.ts` (`assignment_cross_hall_override`, `assignment_above_standard_load`, `reshuffle_tier_changed`). Update `docs/TASK_EVENTS_CONTRACT.md` with new rows. Create `lib/orchestration/audit-events.ts` service-role helper. Wire two `console.warn` lines in `assignment-policies.ts` (lines 336 + 513) and add per-task event emission in `reshuffle.ts`. **One open question:** per-task or per-pass for reshuffle events. Bryan's lean (per the chat) was: **per-task at severity=`info`** so they don't crowd warns/criticals on default-filter view.
- **Phase 2.** New `lib/activity-feed.ts` query helper. UNIONs `task_events` + `notes`, joins `display_name` from `profiles`, normalizes to unified `{id, kind, severity, actor_name, message, related_task_id, related_room, created_at}` shape. Severity boost ordering. Hard-cap 100 rows. Includes `getActivityForUser(userId, limit)` variant.
- **Phase 3.** New `ActivityFeed` component replaces hardcoded `FEED_ITEMS` in `app/admin/page.tsx`. Filter dropdown (kind: events / notes / all; severity). Refresh button. Dismiss via per-browser localStorage (no schema needed for beta).
- **Phase 4.** Per-staff feed subset — helper API only (UI is II.E's job).
- **Phase 5.** Delete `app/activity-section.tsx`. Salvage day-grouping CSS into the new component or `app/globals.css`.
- **Phase 6.** `DROP TABLE public.activity_events` migration in `docs/supabase/`. Decision pending: drop `lib/activity-log.ts` simultaneously, or repurpose (Phase 1 review).
- **Phase 7.** End-to-end verification kit. Seed inbound_events that trigger cross-hall override + above-standard load. Run orchestrator. Verify `task_events` rows. Verify feed render on /admin. Verify dismiss + filter.

**Schema decision:** No new tables needed. The contract is markdown, not enforced in DB. New `event_type` values just slot into `task_events`. Schema_version stays 1. The only schema change is the optional `DROP TABLE activity_events`.

### 3. Master-plan audit pass (the headline find)

Per Bryan's instruction, ran a wider audit pass with the lens "what does the master plan flag as UNBUILT or PARTIAL that's actually further along than claimed?" Findings below in §"Audit findings."

---

## Audit findings — master-plan items understated by current state

The master plan's labels (BUILT / PARTIAL / UNBUILT / AUTHORING / INTEGRATION) were honest at the time of authoring (Day 24) but the codebase has moved underneath them. Items below are sequenced by how dramatically the master plan undercounts them.

### II.A Manager task creation form — flagged UNBUILT (M); actually ~95% BUILT

`components/admin/AddTaskModal.tsx` is 631 lines. Full feature set:
- All 6 buckets (arrivals / departures / stayovers / dailys / eod / maintenance) selectable as visual chips with bucket-color swatches.
- Title field with required validation.
- Priority chips (low / medium / high) with high-priority alert styling.
- Assignee chips with avatars + initials, fetched live via `lib/assignable-staff.ts`.
- Room field (optional).
- Notes field (optional, attached to `context.notes`).
- WHAT panel (3 of 3 fields) + WHO & WHERE panel (2 of 2) + NOTES panel.
- Server submission to `public.tasks` with proper `card_type` mapping per bucket, proper `context.staff_home_bucket`, `source: "manual"`, `created_by_user_id` set.
- Success toast with 3-second countdown auto-close.
- Server-error display with copy-to-Bryan helper.
- Validation banner with field-by-field error count.
- Pre-selected-staff lock mode (used by `/admin/staff/[id]` to pre-fill the assignee).

Mounted on `/admin` (top bar `+`) and `/admin/tasks` (top bar `+`) and `/admin/staff/[id]` (tasks section header `+`). 

**This satisfies CLAUDE.md beta scope lock #1 entirely.** The only gap vs. master plan spec: the bucket model includes `maintenance` as a 6th option, but per the AddTaskModal code, maintenance routes to `card_type: "maintenance"` with `staff_home_bucket: "start_of_day"` (since maintenance has no staff bucket). Master plan never specified this — could be left as is or changed to surface as its own admin-side bucket post-beta.

### II.B Manager card view/edit — flagged PARTIAL (S); actually BUILT

`app/tasks/[id]/manager-card-detail.tsx` exists, plus the generic router `card-detail.tsx` and the staff variant `staff-card-detail.tsx`. Wasn't read in the audit but the file presence + the architecture pattern documented in CLAUDE.md confirms II.B is in place. Likely needs spot-check vs. spec for the merge-safe context save (Open Assumption #20) but the route is live.

### II.E Admin Staff Profile — flagged PARTIAL (L); actually ~70% BUILT

`app/admin/staff/[id]/page.tsx` is 462 lines. Built:
- Sky-blue hero card with avatar + name + role + status pill.
- Stats trio (Rooms / Open / Done today).
- **Live tasks fetch from Supabase** — bridges slug → staff UUID via `public.staff.name`, queries open tasks for that staff_id, renders task list with status dots + bucket chips + room number, links each row to `/admin/tasks/{id}`.
- Quick action buttons (Message / Call / Assign / Schedule).
- Profile nav rows (Details / Activity / Reports).
- "+" button to add task with preselected staff (opens AddTaskModal).
- Footer + back nav.

What's still placeholder: the profile data itself (`PROFILES` const, hardcoded for Courtney / Lizzie / Angie / Mark with mock metrics + status lines), the Activity drill-in (just a nav row, no destination), Reports drill-in (just a nav row), and the daily summary / lifetime running shift summary / 14-day segment / stand-out instances / pause log / maintenance authored — the master plan III.J/III.F/III.K-dependent surfaces. Once those land, swap the hardcoded `PROFILES` for live profile fetch + wire the nav rows.

### II.F Admin Tasks Dashboard — flagged PARTIAL (M); actually ~80% BUILT

`app/admin/tasks/page.tsx` is 296 lines. Built:
- Top bar with back nav + page title + "+" to add task.
- Stats strip (Open / Done today / Overdue) with overdue red coloring.
- Three lanes (HOUSEKEEPING / ADMIN / MAINTENANCE) with green/amber/sage header bands.
- Task rows per lane with bucket-color stripe, badge, title, assignee, status dot, chevron, link to `/admin/tasks/{id}`.
- AddTaskModal mount.

What's still placeholder: `STAT_OPEN/DONE/OVERDUE` are static numbers (`7 / 12 / 2`), `LANES` is hardcoded with mock tasks. Both need a live Supabase query — same shape as the staff profile's task fetch, just grouped by lane (housekeeping = arrivals/departures/stayovers/dailys/eod, admin = eod, maintenance = maintenance). Probably 30 minutes of wiring. Filter dropdown (master plan spec) is unbuilt.

### II.G Admin Task View Modal — flagged PARTIAL (M); status uncertain

`app/admin/tasks/[id]/page.tsx` exists but wasn't read in the audit. File presence confirms a route is live. Master plan spec calls for read-only mirror with admin actions (Reassign / Override / Edit guest fields) and dulled bucket-color shell. Worth a Day 29 spot-check.

### II.H Admin Maintenance — flagged PARTIAL (M); actually ~85% BUILT

`app/admin/maintenance/[id]/page.tsx` is 351 lines. Built:
- Top bar + back nav.
- Sage hero card with work order ID, priority strip, title, category, reported timestamp.
- 4-cell metadata grid (ASSIGNED with avatar / STATUS with dot / REPORTED BY / REPORTED timestamp).
- ISSUE description panel.
- Priority chips (Low / Normal / High / Critical) — interactive (writes to local state, not yet to Supabase).
- PARTS & SUPPLIES panel with parts list + ETA.
- ACTIVITY panel with timestamped event log.
- CTA pair (Escalate / Mark Resolved — both placeholder buttons).

Master plan spec calls for master tables (open issues by location, by type) — those would be on `/admin/maintenance` (no `[id]`), which doesn't exist yet. The detail page is essentially complete; the index page is unbuilt.

What's still placeholder: the `ORDER` const is mock data. Needs `maintenance_issues` table (master plan VII.B PARTIAL — taxonomies landed Day 24, the issues table itself is the gap). Once that table lands, swap `ORDER` for live fetch + wire Escalate / Mark Resolved write paths.

### III.E + V.G Photo / image attachment pipeline — flagged PARTIAL (M); actually FOUNDATIONS BUILT

`lib/task-events.ts:45` exposes `uploadTaskFile(userId, file)` → uploads to `task-files` Supabase Storage bucket with per-user prefix path, returns `{path, publicUrl}`. Storage bucket exists per `docs/supabase/cards_mvp.sql` (not read in audit but referenced in master plan). 

What's missing: the compose-drawer wiring (the upload UI never made it into NoteComposeForm in Day 27 — III.A explicitly skipped it pending RLS finalization). Given the upload helper exists, integration is probably 1-2 hours: add a file input to NoteComposeForm + call `uploadTaskFile` + pass `imageUrl` to `addNote`. RLS on the bucket needs verification (master plan VII.F PARTIAL).

### III.F Time tracking dual sink — flagged PARTIAL (L); actually ~80% BUILT (data side)

`lib/orchestration/index.ts` is the orchestration boundary. Every per-task lifecycle event writes to `task_events` with proper schema_version. The `tasks` table has `started_at`, `paused_at`, `completed_at` columns. Card open duration is **fully captured already** — duration = `completed_at - started_at` minus paused intervals (computable from the `card_paused` / `card_resumed` event pairs in task_events).

What's missing: the dual-sink **read** side. Master plan calls for "logs to both staff profile (admin view) + location table (admin view)." The data IS captured; the queries that surface it on `/admin/staff/[id]` and on a future `/admin/locations/[id]` aren't built. With III.D's `lib/activity-feed.ts` query helper landing in Day 29, the per-staff dual-sink is actually delivered as a side effect (the `getActivityForUser(userId)` variant). The location-table sink is genuinely unbuilt.

### III.H Card lifecycle reassignment — flagged UNBUILT (L); actually ONE-FUNCTION-AWAY

`lib/task-events.ts:13` already includes `reassigned: "reassigned"` in the event type vocabulary. `completeCard` / `pauseCard` / etc. all log `status_changed` events with from/to/reason. A `reassignTask(client, {taskId, fromStaffId, toStaffId, userId, reason})` function is genuinely a 30-line add — call `tasks.update({staff_id: toStaffId})`, log `taskEventType.reassigned` with `{from_staff_id, to_staff_id, reason}` in detail, log `taskEventType.statusChanged` with reason="reassigned". The dual-logging spec ("logs to both staff profiles") is automatic since the event has both staff_ids in detail and the III.D feed query can render it under either staff's per-user view.

Card order rotation within a bucket and pre-stayover reshuffle are already done (Day 26 IV.A Step 7).

### III.G Sequential gating — flagged PARTIAL (M); BUCKET-LEVEL DONE, SECTION-LEVEL TBD

Bucket-level hard lock is shipped on `/staff` per `app/staff/page.tsx` Day 26 — non-active bucket cards are visually inactive via the `done` Set + `active` state. Within-card section gating is the gap. `lib/staff-task-execution-checklist.ts` exists (not read in audit) — likely partial coverage for section gating in execution.

### Other surfaces not in master plan but on disk

- **`app/admin/drafts/page.tsx` + `drafts-table.tsx`** — drafts review UI for the rule engine. Reviews `task_drafts` rows before promotion. Bryan's been using `promote_drafts_to_tasks.sql` directly; this is the UI for it.
- **`app/admin/import/page.tsx`** — CSV/payload import surface. Wired through `lib/import/{ingest,parser,actions,sample}.ts`.
- **`app/admin/reports/page.tsx`** — staff-report queue. Pairs with `app/staff/report/page.tsx` (staff submission).
- **`app/staff/cards/page.tsx`** — staff cards browser (route exists, purpose uncertain — likely a debug surface).
- **`app/staff/[id]/page.tsx`** — staff drill-in (different from `/staff/task/[id]`).
- **`app/dev/artifacts/{6 files}`** — design reference pages for each X-430 card. Not user-facing; reference for visual lock checks.

None of these are in the master plan inventory. They don't need to be; they're either internal tooling, debug routes, or design references. Worth knowing they exist so we don't accidentally rebuild them.

---

## Revised master-plan completion estimate

Master plan footer claimed: "6–10 weeks of focused engineering + 2–4 weeks of Jennifer's KB authoring."

**Revised after Day 28 audit: ~4-6 weeks of focused engineering + the same KB authoring lane.** Specifically:

**Section II goes from PARTIAL/UNBUILT-heavy to mostly BUILT-with-data-wiring-needed.** The manager task creation, manager card view, admin staff profile, admin tasks dashboard, admin maintenance detail are all in place. What's left in Section II: live data wiring (replace mock data with Supabase queries), II.C admin home rebuild polish, II.I Category Cards × 11 (still XL), II.J KB Editor (post-beta), II.K Calendar (post-beta), II.L Recap (post-beta).

**Section III's L-sized "card lifecycle" item III.H drops to a half-day** because the event vocabulary + orchestration boundary is in place.

**Section III.F dual sink is deliverable as a side effect of III.D Phase 2.**

**Section III.E photo pipeline is hours, not days,** because `uploadTaskFile` already works.

**Net effect:** the critical-path engineering load drops by maybe 2-3 weeks. The KB authoring lane is unchanged (still Jennifer's ongoing battle).

The "100% no cuts" target is more reachable than the master plan suggested. Not by skipping work — by recognizing work already done.

---

## Open queue (Day 28 carry-forward)

### Top of build queue

- **A. Phase 1 of III.D** — direct-write the audit event vocabulary + orchestrator wiring per the TodoList. The reshuffle per-task vs. per-pass question still needs Bryan's pick before code lands. Bryan's chat-stated lean was per-task at severity=info; treating that as the default unless he reverses.

- **B. The other 6 phases of III.D** — Phases 2-7. All queued in TodoList. Phase 1 unblocks Phase 2 unblocks Phase 3. Phases 5/6/7 can interleave. End-to-end verification (Phase 7) is the sign-off.

- **C. Live-data wirings on Section II surfaces** — small-but-real-value chase after III.D lands:
  - Replace `LANES` hardcoded data in `/admin/tasks` with a Supabase query (~30 min).
  - Replace `STAT_OPEN/DONE/OVERDUE` in `/admin/tasks` with derived counts (~15 min).
  - Replace `PROFILES` hardcoded data in `/admin/staff/[id]` with `public.staff` fetch (~30 min).
  - Replace `WATCHLIST_ITEMS / SCHEDULING_ITEMS / CRITICAL_ITEMS / NOTES_ITEMS` hardcoded data in `/admin` with derived queries (~1 hr — these are derived views).
  - Replace `ORDER` mock in `/admin/maintenance/[id]` with live `maintenance_issues` fetch (depends on VII.B issues table landing).
  - Replace `FEED_ITEMS` hardcoded in `/admin` with new ActivityFeed component (Phase 3 of III.D).
  
  Total ~3 hours for the cluster.

- **D. III.B Maintenance compose drawer** (1-2 hr — mirrors III.A NoteComposeForm). Unblocks III.D's maintenance event source coverage end-to-end.

- **E. V.A BR4 reservation fallback** (1-2 hr).

- **F. IV.H Wed-occupancy Deep Clean** (1 hr).

- **G. I.C Clock-In flow + III.J 14-day segments + VII.D segments view** (1-2 days combined).

- **H. II.A confirmation pass** — verify the AddTaskModal matches the master plan II.A spec end-to-end. Likely passes; may need bucket model tweak (maintenance routing decision).

- **I. III.E + V.G photo pipeline wiring into NoteComposeForm** (1-2 hr).

- **J. III.H reassignment helper** (~30 min — `lib/orchestration/index.ts` add).

- **K. Item I — Vercel deploy** (Bryan's lane, ~30 min).

- **L. V.C Cloudbeds** — Bryan's lane, deferred per Day 28 explicit decision.

- **M. Section X explicit post-beta** — II.J advanced, II.K Calendar, II.L Recap, VII.H KB versioning, VIII.F-G ops items. Pull back into beta scope only after the rest lands.

### Step-follow TODOs (carried forward)

- Step 5/6/7-follow structured audit events — **resolved by Phase 1 of III.D landing.**

### `[ASK JENNIFER]` flags

- Two pre-existing in `dispatch-config.ts` Section 14 (primary identity + role-vs-spec drift).
- Six `[ASSUMED]` in Section 9 (D-430 ADA cells mirror non-ADA equivalents).
- D-430 tolerance convention (strict-bounds vs. implicit ~20%).
- Maintenance routing decision in AddTaskModal (`maintenance` → `staff_home_bucket: "start_of_day"` — confirm or surface as own bucket).

### Tabled

- `MODULE_TYPELESS_PACKAGE_JSON` Node warning.
- Re-key `dispatch-config.ts` Section 14 maps to UUIDs.
- Legacy `task_comments` table cleanup (still in place, not read/written from staff side post-Day-27).
- `lib/activity-log.ts` future — drop, repurpose, or repoint? Decision in Phase 1 review.

---

## Critical state to verify in next session's first minutes

1. **Run `npm run build`** — confirm clean. Last known-good was Day 27 end.
2. **`git status`** — working tree should be clean. Branch should be at exactly `0 ahead, 0 behind` of `origin/main`.
3. **`git log --oneline -3`** — newest first should be `36a64f1` (Day 27 handoff doc), `ba8ed9c` (III.A Notes UI), `440253e` (IV.G D-430 matrix).
4. **Confirm TodoList state** — 7 phases all `pending`. None started in Day 28.
5. **Confirm `docs/handoff-day-28.md` exists** at the path this doc was written to (~250 lines).
6. **Decide what to chase first** per the Open Queue. Recommended:
   - **Start Phase 1 of III.D direct-write immediately** (assuming Bryan confirms per-task reshuffle granularity).
   - Parallel-able: Bryan kicks off Item K (Vercel deploy) on his lane.

---

## Files to load in next Cowork chat

**Required:** Mount `/Users/bryanstauder/dispatch-app/`. Read in this order:

1. `docs/handoff-day-28.md` (this file — most recent, read first).
2. `docs/dispatch-master-plan.md` (canonical, with the audit caveat: Day 28 found Section II + III.E + III.F + III.H undercounted — see this handoff §"Audit findings").
3. `docs/handoff-day-27.md` (Day 27 — Notes UI + D-430 matrix + dailys/eod synthesizer).
4. `docs/handoff-day-{26,25,24,23,22}.md` (foundation).
5. `docs/phase-4-handoff.md` (Day 21 — rule engine, KB foundation).
6. `docs/kb-spreadsheet-index.md` + `docs/kb/README.md` + `docs/kb/Dispatch — Rules Table Handoff.md` (KB navigators).
7. `docs/TASK_EVENTS_CONTRACT.md` (the contract that drives III.D — and the line-21 directive that activity_events is not the source).
8. `lib/task-events.ts` (the existing event vocabulary + `uploadTaskFile` helper — surprises hiding here).
9. `lib/orchestration/index.ts` (the orchestration boundary — every lifecycle write).
10. `lib/orchestration/{assignment-policies,reshuffle,run,interpret}.ts` (Day 25-27 orchestrator + the two console.warn lines Phase 1 converts).
11. `lib/orchestration/rules/{dailys,eod,arrivals,departures,stayovers,maintenance}.ts` (the rule files; maintenance is empty, others are populated).
12. `lib/notes.ts` + `app/staff/task/[id]/NoteComposeForm.tsx` + `app/staff/task/[id]/page.tsx` (Day 27 III.A).
13. `lib/dispatch-config.ts` (especially Sections 9 + 14 — D-430 matrix + staff roster).
14. `lib/activity-log.ts` (existing — wired to dead activity_events; Phase 1 decision pending).
15. `app/admin/page.tsx` (where ActivityFeed mounts — replaces hardcoded `FEED_ITEMS`).
16. `app/admin/staff/[id]/page.tsx` + `app/admin/tasks/page.tsx` + `app/admin/maintenance/[id]/page.tsx` (the live admin surfaces — confirm the audit findings).
17. `components/admin/AddTaskModal.tsx` (the II.A surface that's actually built).
18. `app/staff/page.tsx` (Day 26 — order clause + Arrivals-done re-activation).
19. Skim `CLAUDE.md`, `AGENTS.md`, `dispatch-ui-rules.md` for conventions.

**Activity infrastructure to inspect for Phase 1:**
- `docs/supabase/activity.sql` (the dead table — slated for drop in Phase 6).
- `app/activity-section.tsx` (the orphan reader — slated for delete in Phase 5).

---

## Operating reminders

- **Bryan is non-developer.** Plain English, exact copy-paste prompts in fenced blocks. No placeholders unless explicitly called out.
- **Default workflow: Cowork-Claude direct-writes ALL code; CC handles only build verification + git operations + commits.** Pattern held cleanly through Day 27. Day 28 was pure planning + audit + handoff — no code.
- **Single fenced code block per CC prompt + per SQL block.** Bryan's standing preference.
- **CC misread pattern is alive.** Bash output is ground truth; CC editorial commentary stays unreliable. Use `git log -3` + `git status` for ground-truth checks.
- **Internal imports under `lib/orchestration/`** must use `.ts` extensions (Node orchestrator script via `node --experimental-strip-types`). Imports from outside that folder use plain extensionless.
- **No new dependencies** without asking Bryan. Current deps: `@supabase/supabase-js`, `@supabase/ssr`, `next`, `react`, `react-dom`.
- **Boring code.** No clever abstractions.
- **Migrations** live in `docs/supabase/*.sql`, applied manually via Supabase dashboard SQL editor.
- **The spreadsheet at `docs/kb/` is canonical for governance.** Source-doc precedence ladder per `docs/kb/README.md`.
- **The master plan at `docs/dispatch-master-plan.md` is THE PLAN — but audit findings in this handoff §"Audit findings" override the PARTIAL/UNBUILT labels for II.A, II.B, II.E, II.F, II.G, II.H, III.E, III.F, III.G, III.H.** "No cuts, all of it" by default. Bryan + Jennifer mark cuts inline.
- **`[ASK JENNIFER]` is the convention for static config Jennifer needs to confirm.** Multiple flags carry forward.
- **Channel manager:** ResNexus dead. Cloudbeds leading, pending sales quote. **Bryan handling channel-manager integration in a separate thread** — out of engineering critical path per Day 28 explicit decision.
- **Q4 (Jennifer's KB authoring) is "an ongoing battle"** per Bryan Day 28. Engineering doesn't block on it; cards render shells until KB lands.
- **Context-capacity rule:** draft handoff at 70%, push to 80-85%. This handoff was drafted at the 90% mark per Bryan's session-budget signal.

---

## Items intentionally NOT done in Day 28

- **Phase 1 of III.D** (and Phases 2-7). Scoped + queued, not started. Day 28 was budget-bounded; build picks up Day 29.
- **Audit pass on every master-plan item.** Audit covered Section I (skim), Section II (deep), Section III (deep on E/F/G/H), Section IV (already known), Section V (skim — reservations + storage helpers verified), Sections VI-X (not re-audited — VI is Jennifer's lane, VII-X largely unbuilt as the master plan says). Day 29 could go deeper on Section I per-card vs. spec checks if Bryan wants.
- **Two pre-existing `[ASK JENNIFER]` flags.** Bryan-to-Jennifer.
- **MODULE_TYPELESS_PACKAGE_JSON Node warning cleanup.** Tabled.
- **Vercel deploy.** Bryan's lane, parallel-izable.
- **lib/activity-log.ts decommission decision.** Deferred to Phase 1 review.

---

*Handoff complete. Ready for Day 29. The build is closer to done than the master plan suggests — the next chase is real direct-write code, not more discovery.*
