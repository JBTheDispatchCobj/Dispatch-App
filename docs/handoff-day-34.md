# UI / Build Handoff — Dispatch Day 34 (2026-05-06)

*Continuation handoff for a fresh Cowork chat. Supplements — does not replace — `docs/handoff-day-33.md` (Day 33 — III.B Maintenance compose closed at staff side via 4 phases / 4 commits), `docs/handoff-day-32.md` (Day 32 — I.C Phase 4 closed end-to-end via 3 Postgres views + admin staff profile segment block), `docs/handoff-day-31.md` (Day 31 — I.C Phase 3 closed; Phase 4 fully scoped), `docs/handoff-day-30.md` (Day 30 — I.A + I.B closed, I.C 75%), `docs/handoff-day-29.md` (Day 29 — III.D Activity feed closed end-to-end), `docs/handoff-day-28.md` (Day 28 — master-plan audit), `docs/handoff-day-{27,26,25,24,23,22}.md`, `docs/phase-4-handoff.md` (Day 21), and `docs/dispatch-master-plan.md`. The 25-tab governance spreadsheet at `docs/kb/` is canonical for governance.*

*Date: 2026-05-06, Day 34. The build day after Day 33's III.B Maintenance compose close. **Master plan III.H reassignment dual-logging clause closed at the helper layer** via Scope A: extract `reassignTask()` to `lib/orchestration/index.ts`, swap the existing inline log in `manager-card-detail.tsx` for a call to the helper, formalize event detail with `withTaskEventSchema` + staff names, document `reassigned` in `TASK_EVENTS_CONTRACT.md`, classify it as `warn` in the activity feed. One commit (`303fb32`), four files, end-to-end verified against Lizzie Larson → Courtney Manager swap.*

---

## Day 34 in one sentence

**Master plan III.H reassignment helper extracted, formalized, and end-to-end verified.** The pre-existing inline `reassigned` log at `app/tasks/[id]/manager-card-detail.tsx:380-387` (Day 28 audit's "ONE-FUNCTION-AWAY" finding) is now replaced by a proper `reassignTask()` lifecycle helper that mutates `tasks.staff_id` + `assignee_name` atomically and emits a single `task_events` row with `schema_version: 1` + `from_staff_name` / `to_staff_name` / optional `reason`. Activity feed surfaces reassignments at warn-severity with a "From → To" composer line. Day 28's "ONE-FUNCTION-AWAY" framing was directionally right but slightly imprecise — the actual shape was extract + formalize, not green-field.

---

## What landed in Day 34

One commit between HEAD-at-session-start (`fecd0dd`, the Day 33 handoff doc) and HEAD-at-session-end (`303fb32`). Pushed to `origin/main`.

### Commit — III.H Scope A: extract reassignTask + formalize event detail

- **`303fb32` — Day 34 III.H Scope A: extract reassignTask + formalize event detail.** Four files. 116 insertions / 12 deletions. No schema change.

  - **EDIT** `lib/orchestration/index.ts` (~+85 lines net). New `reassignTask(client, {taskId, fromStaffId, toStaffId, fromStaffName, toStaffName, userId, reason?})` async function appended after `addTaskComment`. Mirrors the existing per-task lifecycle helper pattern (`openCard` / `pauseCard` / `resumeCard` / `completeCard` / `requestHelp` / `addTaskComment` / `toggleChecklistItem`). Returns `OrchestrationResult`. Operations: (1) no-op short-circuit if `fromStaffId === toStaffId`; (2) `tasks.update({staff_id: toStaffId, assignee_name: toStaffName ?? ""})` keyed on `taskId`; (3) `await logTaskEvent(taskId, taskEventType.reassigned, withTaskEventSchema({from_staff_id, to_staff_id, from_staff_name, to_staff_name, ...(reason ? {reason} : {})}), userId)`. Detail keys match the new `TASK_EVENTS_CONTRACT.md` row (see below). Reassignment "logs to both staff profiles" semantics is delivered automatically by Day 29's `getActivityForUser` per-staff feed — the detail carries both staff_ids so a future per-target-staff query can filter on `detail->>from_staff_id` / `detail->>to_staff_id` without re-joining.

  - **EDIT** `app/tasks/[id]/manager-card-detail.tsx` (+19 / −7). Three edits: (1) added `import { reassignTask } from "@/lib/orchestration"`; (2) `onManagerSave` refactored — when `prev.staff_id !== staffIdParsed`, call `reassignTask` BEFORE the main `tasks.update` (which now omits `staff_id` + `assignee_name` from the spread, since the helper already wrote them atomically); (3) removed the inline `reassigned` `logTaskEvent` block at lines 380-387 (replaced by a comment marker pointing to the helper). The reassign is fail-aborting — if the helper returns `{ok: false}`, `setMgrSaving(false)` + `setError(message)` + `return` before the main update fires. From-side staff name pulled from `prev.assignee_name?.trim() || null` (loaded as a column on the TaskCard via `TASK_CARD_SELECT_FIELDS`). To-side name pulled from the existing `assigneeName` lookup variable.

  - **EDIT** `lib/activity-feed.ts` (+15 / −2). Two slices: (1) `WARN_TASK_EVENT_TYPES` set extended to include `taskEventType.reassigned` — admin reassignment is a significant action and now surfaces alongside cross-hall override / above-standard-load on the property activity feed. (2) `composeTaskEventMessage` gains a special-case branch for `reassigned` events: renders `"${actorName} reassigned: ${fromName} → ${toName}${titleSuffix}"`, with both names falling back to `"Unassigned"` when null. Mirrors the existing pattern used for `status_changed` / `reshuffle_tier_changed` / `assignment_cross_hall_override` / `assignment_above_standard_load`.

  - **EDIT** `docs/TASK_EVENTS_CONTRACT.md` (+5 / −3). New `reassigned` row added to the events table at the bottom of the contract, documenting the 6-7 detail keys (`schema_version` + `from_staff_id` + `to_staff_id` + `from_staff_name` + `to_staff_name` + optional `reason`). Severity classification block updated to add `reassigned` under the `warn` severity bucket alongside the two assignment audits and `status_changed → blocked`. Severity classification block heading bumped from "Day 29 III.D" to "Day 29 III.D, updated Day 34" for traceability.

### Verification kit (SQL + UI smoke test, runtime-validated)

Three-block kit ran end-to-end:

- **Block 1** — pre-flight `SELECT id, title, assignee_name, staff_id, status, card_type, context->>'staff_home_bucket' FROM public.tasks WHERE staff_id IS NOT NULL AND status IN ('open','in_progress') ORDER BY created_at DESC LIMIT 1`. Surfaced `57744497-b061-48dc-8d67-01e827266670` — Lizzie Larson's "Property round" dailys task left over from Day 31's verification kit. Per the Day 31 caveat the orchestrator-generated test tasks persist as real-looking data.
- **Block 2** — UI test. Navigated to `/tasks/57744497-b061-48dc-8d67-01e827266670`. **Side discovery**: navigation gap. The admin tasks dashboard at `/admin/tasks` links to `/admin/tasks/[id]/page.tsx` (master plan II.G admin task view modal — flagged PARTIAL by Day 28 audit, mostly mocked, no live reassign UI). The page where `manager-card-detail.tsx` lives is `/tasks/[id]` (master plan II.B). These are two different admin task view surfaces. Bryan reached the right one by direct URL paste. Changed the "Assign to staff" dropdown from Lizzie Larson to Courtney Manager. Clicked Save card. No error banner.
- **Block 3** — verify `SELECT te.created_at, te.event_type, te.detail->>'schema_version', te.detail->>'from_staff_name', te.detail->>'to_staff_name', te.detail->>'from_staff_id', te.detail->>'to_staff_id', te.detail->>'reason', t.title, t.staff_id, t.assignee_name FROM public.task_events te JOIN public.tasks t ON t.id = te.task_id WHERE te.event_type = 'reassigned' ORDER BY te.created_at DESC LIMIT 5`. Newest row matched expectation exactly:
  - `created_at = 2026-05-06 15:41:36.819+00`
  - `event_type = reassigned`
  - `schema_version = 1` ✓ (was missing pre-Day-34)
  - `from_staff_name = Lizzie Larson` ✓ (was missing pre-Day-34)
  - `to_staff_name = Courtney Manager` ✓ (was missing pre-Day-34)
  - `from_staff_id = 8fb2f515-4df3-4835-b2e9-e01f2eff993d` (Lizzie's UUID)
  - `to_staff_id = 097ede2c-a094-4c38-9ade-af081ff64c37` (Courtney's UUID)
  - `reason = null` ✓ (Scope A defers to Scope B)
  - `task_current_staff_id` matched `to_staff_id` ✓ (row update landed)
  - `task_current_assignee_name = Courtney Manager` ✓ (matches `to_staff_name`)

### Side discovery — `/admin/tasks/[id]` (master plan II.G) is not wired to the helper

The admin tasks dashboard `/admin/tasks` links to `/admin/tasks/[id]` (master plan II.G admin task view modal). Per the Day 28 audit, that page is mostly mocked: hardcoded data, "Save & Deploy" placeholder button, no editable assignee dropdown, "Reassign / Override / Edit guest fields" listed as UNBUILT admin actions. The III.H reassign helper is now ready for that page to consume — wiring is one of the new Day 34 carry-forward items.

The live reassign UI lives at `/tasks/[id]` (master plan II.B, `manager-card-detail.tsx`). It's accessible by direct URL but not from `/admin/tasks` navigation. Two pages, two purposes; not a Day 34 bug, just a pre-existing surface map that the III.H verification surfaced.

---

## State of the build at end of Day 34

**Working tree clean. Branch matches origin/main exactly.** One Day 34 commit pushed: `303fb32`. (Plus this handoff doc commit on top after Day 34 wraps.)

**Build clean across the entire session.** `npm run build` ran 1 time. 21 routes, zero errors, zero warnings. CC build-verify chain pattern held without the `tail` pipe (Day 32 process learning still standing).

**Master plan III.H — fully closed at the helper layer.** Three sub-clauses per the spec:
- ✓ **Reassignment dual-logging** — closed Day 34 via `reassignTask()` helper. The "logs to both staff profiles" requirement is delivered automatically by Day 29's `getActivityForUser` per-staff feed query (detail carries both staff_ids).
- ✓ **Card order rotation within a bucket** — Day 26 IV.A Step 7 (per Day 28 audit).
- ✓ **Pre-stayover reshuffle** — Day 25 reshuffle pass + Day 29 audit events.

**What's still PARTIAL on the III.H surface side (not the spec):**
- Discrete reassign UI with required reason note (Scope B carry-forward — ~30 min).
- `/admin/tasks/[id]` (II.G) admin task view modal wiring to use the helper (~30-45 min).

**Section III summary post-Day-34:**
- III.A ✓ closed Day 27.
- III.B closed Day 33 at the staff side; Phase 5 (activity-feed sort boost for High severity) functionally absorbed by Day 34's `reassigned`-as-warn classification — the `mergeAndRank` pass already orders criticals → warns → info in `lib/activity-feed.ts:443-476`. III.B High-severity maintenance items will surface above info entries via the same path. Phase 5 dedicated wiring (`maintenance_issues` source replacing the `notes WHERE note_type='Maintenance'` placeholder) is the remaining slice.
- III.C UNBUILT (Updates panel — admin authoring + KB cascade).
- III.D ✓ closed Day 29.
- III.E PARTIAL (photo pipeline — `uploadTaskFile` exists, NoteCompose + MaintenanceCompose wiring pending).
- III.F PARTIAL (time tracking dual sink — data side mostly done; location-table sink unbuilt).
- III.G PARTIAL (sequential gating — bucket level done; section-level within card unclear).
- III.H ✓ closed at the helper layer Day 34. Surface gaps tracked above.
- III.I UNBUILT (repeated-instance meta-trigger).
- III.J ✓ closed Day 32 (14-day segments via three views).
- III.K UNBUILT (audit / archive search).

**Schema changes — none this session.** No SQL migrations; no DDL edits. Only markdown contract updates.

**No new dependencies.** Current deps unchanged: `@supabase/supabase-js`, `@supabase/ssr`, `next`, `react`, `react-dom`.

**Untouched documentation** — `docs/dispatch-master-plan.md`, `docs/handoff-day-{22,23,24,25,26,27,28,29,30,31,32,33}.md`, `docs/phase-4-handoff.md`, `docs/kb/...`, `docs/supabase/*.sql` all unchanged. `docs/TASK_EVENTS_CONTRACT.md` got the new `reassigned` row + severity update. `docs/handoff-day-34.md` (this file) is the only new doc.

---

## Process learnings — Day 34

### 1. Day 28 audit "ONE-FUNCTION-AWAY" framing was directionally right but slightly imprecise

The Day 28 audit said `reassignTask` is "genuinely a 30-line add — call `tasks.update({staff_id: toStaffId})`, log `taskEventType.reassigned` with `{from_staff_id, to_staff_id, reason}` in detail." Reading manager-card-detail.tsx today surfaced that the inline log call ALREADY existed at `onManagerSave` lines 380-387 — Day 28 didn't read that file in the audit, so the audit framing implied green-field. Actual Day 34 chase shape: extract + formalize the existing log + remove the staff_id from the monolithic save update, NOT green-field. The 30-line scope still held; just the work was different.

**Carry-forward rule:** when a Day 28 audit item is "ONE-FUNCTION-AWAY," grep for the relevant `taskEventType.X` literal first to find existing call sites before assuming green-field. Day 33's stale-carry-forward pattern (sanity-check carry-forward sub-items older than 5 days against actual code) extends to audit-derived items too.

### 2. Two admin task view pages exist and `/admin/tasks` links to the mocked one

`/admin/tasks/[id]` (master plan II.G — mostly mocked per Day 28 audit) and `/tasks/[id]` (master plan II.B — `manager-card-detail.tsx`, live form with the reassign UI) are separate pages. The admin tasks dashboard `/admin/tasks` links to II.G, not II.B. Bryan reached II.B by direct URL paste during the verification kit. This is pre-existing per the Day 28 audit; Day 34 didn't introduce it. Worth flagging for a future surface-map cleanup decision: (a) wire II.G to the helper, (b) reroute `/admin/tasks` links to II.B, or (c) merge the two pages.

### 3. CC build-verify chain pattern held cleanly

Day 32 process learning (drop the `tail` pipe so build failures actually break the `&&` chain) honored across the Day 34 prompt. Pattern: `cd ~/dispatch-app && git add . && git status && npm run build && git commit -m "..." && git push origin main && git log --oneline -N`. Build clean; no chain breaks.

---

## Open queue (Day 34 carry-forward)

### Top of build queue

With III.H closed at the helper layer, the open queue carries forward from Day 33's list (minus III.H) plus two new Day 34 items.

- **A. Section II live-data wirings cluster** (~2 hours). **TOP RECOMMENDED NEXT CHASE.** Phase 4d (Day 32) closed the `/admin/staff/[id]` segment block. Still pending: replace `LANES` + `STAT_*` hardcoded in `app/admin/tasks/page.tsx`; replace `WATCHLIST_ITEMS / SCHEDULING_ITEMS / CRITICAL_ITEMS / NOTES_ITEMS` hardcoded in `app/admin/page.tsx`; replace `PROFILES` const lookup in `/admin/staff/[id]` with a live `public.staff` fetch (~30 min — segment block is already live-data; this swaps the static profile metadata around it). Skip `/admin/maintenance/[id]` — depends on II.H queries which are now schema-unblocked by Day 33.

- **B. III.B Phase 5 — activity-feed sort boost for High severity** (~30 min, partial). Functionally absorbed by Day 34's `reassigned`-as-warn classification — the `mergeAndRank` pass already orders criticals → warns → info. Dedicated wiring for `maintenance_issues` as a feed source (replacing the `notes WHERE note_type='Maintenance'` placeholder per `lib/activity-feed.ts:12`) is the remaining slice. Closes the master plan III.B "live notification to on-shift admin" clause for beta.

- **C. III.H Scope B — discrete reassign UI with required reason note** (~30 min). **NEW Day 34 carry-forward.** Helper now exists; Scope A used the existing dropdown-on-save flow as the affordance. Spec calls for a discrete reassign action with a reason note. Pattern: small inline panel in `manager-card-detail.tsx` (or II.G when wired) — assignee chips reusing `fetchAssignableStaffOptions` from `AddTaskModal` + required reason textarea + "Reassign" button calling `reassignTask({reason})`. On success: toast + reload. Existing dropdown stays for backwards compat (or becomes read-only, routing reassign through the new panel).

- **D. /admin/tasks/[id] (II.G) reassign-wiring** (~30-45 min). **NEW Day 34 carry-forward.** The admin task view modal is mostly mocked per Day 28 audit. Wire the assignee block to a live dropdown that calls `reassignTask`. Naturally clusters with Item C (Scope B) — same component pattern works on either surface. Could combine into a single ~1 hr chase: build the discrete reassign panel once, drop into both `/tasks/[id]` and `/admin/tasks/[id]`.

- **E. V.A BR4 X-430 brief reservation fallback** (1-2 hours). Helpers exist in `lib/reservations.ts`. Unblocks I.E / I.F live guest data wirings AND I.G Last Stayover Status lookup.

- **F. IV.H Wed-occupancy Deep Clean trigger** (~1 hour). Constants exist in `dispatch-config.ts` Section 12. Unblocked by Day 29's audit-event sink.

- **G. III.E + V.G photo pipeline wiring into NoteComposeForm + MaintenanceComposeForm** (1-2 hours). `uploadTaskFile` helper already exists in `lib/task-events.ts:45`. Once wired, Maintenance issues can attach photos (high priority for damage types per master plan III.B).

- **H. II.A confirmation pass** (~30 min). Verify `AddTaskModal` matches the master plan II.A spec end-to-end. Possible bucket-model tweak.

- **I. II.H Admin Maintenance live-data wiring** (~1-2 hours). Now schema-unblocked by Day 33 — `maintenance_issues` table exists. Wire `app/admin/maintenance/[id]/page.tsx` to query `public.maintenance_issues` filtered by location / by type, plus per-issue card view.

- **J. I.G remaining sub-items.** Last Stayover Status lookup (blocks on V.A BR4), checklist variants for Sheet Change weekly + * guest (pending Jennifer's KB), status-driven auto-complete + Sheet Change skip semantics. Bundled or split as makes sense.

- **K. Item I — Vercel deploy.** Bryan's parallel lane, ~30 min via `docs/deployment/vercel-checklist.md`.

- **L. V.C Cloudbeds.** Bryan's separate thread, outside engineering critical path.

### Recommended next chase: Item A (Section II live-data wirings cluster)

Day 33 + Day 34 both flagged this as the biggest visible payoff in the queue, ~2 hours of focused mechanical work that flips multiple master plan II items from PARTIAL toward BUILT. Cluster batch: `LANES` + `STAT_*` swap in `app/admin/tasks/page.tsx` + `WATCHLIST/SCHEDULING/CRITICAL/NOTES` swap in `app/admin/page.tsx` + `PROFILES` const swap in `/admin/staff/[id]` — three files, three queries, all browser-side.

Alternative: Item C + Item D back-to-back (~1 hr combined) — fully closes III.H surface-side, creates a clean discrete-reassign-with-reason pattern reusable across `/tasks/[id]` + `/admin/tasks/[id]`. Worth doing if Bryan wants the III.H surface fully wrapped before pivoting to Section II.

### Tabled

- **`MODULE_TYPELESS_PACKAGE_JSON` Node warning.** Same harmless one-line follow-up.
- **`[ASK JENNIFER]` flags** — same set carrying forward. Six `[ASSUMED]` ADA cells in Section 9 (D-430 matrix). D-430 tolerance convention question. AddTaskModal maintenance-routing decision. Maintenance compose drawer cascading filter logic (Day 33 carry-forward) — flat dropdowns for beta until Jennifer authors the Location → Item → Type tree.
- **Re-key `dispatch-config.ts` Section 14 maps from full names to UUIDs.**
- **Legacy `task_comments` table cleanup.**
- **`lib/task-event-types.ts` extraction** (post-beta polish).
- **Stray `Lizzie` row in public.staff** (id `fc2c4280-2be4-4ef8-a1ea-3a0b3dfbe3bc`, no surname) — Day 31 tabled item still pending.
- **"Courtney Manager" name format** — Day 31 tabled item, pending Jennifer clarification. Surfaced again in Day 34 verification result (`to_staff_name = "Courtney Manager"`). The "Manager" being a surname vs. role marker is still ambiguous; helper passes through whatever is in `tasks.assignee_name` faithfully.
- **Reference Wednesday `2026-01-07` for `staff_segments_v`** — Day 32 tabled, pending Jennifer.
- **PROFILES const swap on `/admin/staff/[id]`** — Day 32 tabled, addressed by Item A in next session.
- **Surface map decision: `/admin/tasks` linking to mocked II.G page vs. live II.B page** — Day 34 surfaced. Three options on the table: (a) wire II.G to the helper (Item D path), (b) reroute `/admin/tasks` links to `/tasks/[id]`, (c) merge the two pages. Lean on (a) per master plan spec.

### `[DEFER]` notes new in Day 34

- **`reason` field optional on `reassignTask` signature.** Scope A doesn't surface `reason` to UI. Scope B (Item C carry-forward) adds the discrete reassign panel with a required reason textarea. Helper signature already accepts `reason?` — the field is null in the contract row when Scope A flow fires; populated when Scope B is in place.
- **Reassignment as side-effect of Save card retained.** The existing `manager-card-detail.tsx` flow still allows reassigning by changing the "Assign to staff" dropdown and clicking Save card. Helper now fires before the main update. No surface change for users; they don't need to learn anything. Once Scope B lands, the discrete panel becomes the primary affordance and the dropdown can become read-only.
- **No handling of "from null" edge case in the activity feed message composer.** When `from_staff_name` is null (task previously unassigned), the composer renders "Unassigned → ToName." Verified visually clean. Same for the reverse "to null" case. No special-case styling needed; the line reads naturally.
- **Activity feed `getActivityForUser` per-staff filter is by `task_events.user_id`, not by reassign target.** A reassignment from Lizzie to Courtney emits a single `task_events` row with `user_id = <admin who fired it>` (the actor). That row surfaces under the admin's per-staff activity feed, NOT directly under Lizzie's or Courtney's. Master plan III.H "logs to both staff profiles" semantics is delivered by future per-target-staff queries that filter on `detail->>from_staff_id` / `detail->>to_staff_id` (post-beta, per the contract row note). For beta the property-wide feed at `/admin` carries the entry plenty visibly.

---

## Critical state to verify in next session's first minutes

1. **Run `npm run build`** — confirm clean. Last known-good is `303fb32`.
2. **`git status`** — working tree clean. Branch `0 ahead, 0 behind` of `origin/main`.
3. **`git log --oneline -3`** — should show in order (newest first): `<Day 34 handoff doc SHA>`, `303fb32` (III.H Scope A), `fecd0dd` (Day 33 handoff doc).
4. **Confirm `lib/orchestration/index.ts` has `reassignTask`** — `grep -n 'export async function reassignTask' lib/orchestration/index.ts` should return one match.
5. **Confirm `app/tasks/[id]/manager-card-detail.tsx` imports `reassignTask`** — `grep -n 'reassignTask' app/tasks/[id]/manager-card-detail.tsx` should return 2-3 matches (import + at least one call site).
6. **Confirm `lib/activity-feed.ts` has `taskEventType.reassigned` in `WARN_TASK_EVENT_TYPES`** — `grep -n 'taskEventType.reassigned' lib/activity-feed.ts` should return 2 matches (the warn-set membership + the message composer special case).
7. **Confirm `docs/TASK_EVENTS_CONTRACT.md` has the `reassigned` row** — `grep -n '| \`reassigned\`' docs/TASK_EVENTS_CONTRACT.md` should return one match.
8. **(Optional) Re-test reassignment.** SQL: pick any task with non-null `staff_id`, copy id; navigate to `/tasks/<id>`; change "Assign to staff" dropdown; click Save card; verify a fresh `reassigned` row in `task_events`. Same kit as Day 34 Block 3.
9. **Decide what to chase first** per Open Queue. Recommended: **Item A — Section II live-data wirings cluster** (~2 hours, biggest visible payoff). Alternative: **Item C + Item D back-to-back** (~1 hr combined) for III.H surface-side full wrap.

---

## Files to load in next Cowork chat

**Required:** Mount `/Users/bryanstauder/dispatch-app/`. Read in this order:

1. `docs/handoff-day-34.md` (this file — most recent, read first).
2. `docs/handoff-day-33.md` (Day 33 — III.B Maintenance compose).
3. `docs/handoff-day-32.md` (Day 32 — I.C Phase 4 + segment block).
4. `docs/handoff-day-31.md` (Day 31 — I.C Phase 3).
5. `docs/handoff-day-30.md` (Day 30 — I.A + I.B + I.C 75%).
6. `docs/handoff-day-29.md` (Day 29 — III.D Activity feed close).
7. `docs/handoff-day-28.md` (Day 28 — master-plan audit).
8. `docs/dispatch-master-plan.md` (canonical inventory with Day 28-34 closure overlay).
9. `docs/handoff-day-{27,26,25,24,23,22}.md` (foundation).
10. `docs/phase-4-handoff.md` (Day 21 — OLD phase-4 for rule engine; not related to I.C Phase 4 or III.H).
11. `docs/kb-spreadsheet-index.md` + `docs/kb/README.md` + `docs/kb/Dispatch — Rules Table Handoff.md`.
12. `docs/TASK_EVENTS_CONTRACT.md` (Day 34 — `reassigned` row + severity classification update).
13. `docs/supabase/maintenance_issues_table.sql` (Day 33).
14. `docs/supabase/staff_clock_in_event_trigger.sql` + `docs/supabase/staff_shifts_view.sql` + `docs/supabase/staff_segments_view.sql` + `docs/supabase/shift_summary_view.sql` (Day 31 + 32).
15. `docs/supabase/taxonomy_tables.sql` + `docs/supabase/notes_table.sql` (Day 24 + Day 27).
16. `lib/orchestration/index.ts` (Day 34 — III.H reassignTask helper landed here next to openCard / pauseCard / completeCard).
17. `lib/activity-feed.ts` (Day 29 + Day 34 — reassigned-as-warn + composer special case).
18. `lib/task-events.ts` (event vocabulary).
19. `lib/orchestration/audit-events.ts` (Day 29 — service-role pattern for orchestrator-side audit events; III.H is browser-side and uses lib/orchestration/index.ts instead).
20. `lib/orchestration/{assignment-policies,reshuffle,run,interpret}.ts`.
21. `lib/orchestration/rules/{dailys,eod,arrivals,departures,stayovers,maintenance}.ts`.
22. `lib/notes.ts` + `lib/maintenance.ts` (Day 27 + Day 33 — separate-table CRUD pattern; III.H deliberately did NOT mirror these because reassignment is per-task lifecycle, not separate-table).
23. `lib/clock-in.ts` (Day 30 + 31).
24. `app/tasks/[id]/manager-card-detail.tsx` (Day 34 — reassignTask call site).
25. `app/tasks/[id]/{card-detail,staff-card-detail,task-card-shared}.tsx` (the manager / staff routing pair).
26. `app/admin/tasks/[id]/page.tsx` (Item D target — mocked II.G admin task view modal).
27. `app/staff/page.tsx` + `app/staff/task/[id]/page.tsx` + `EODCard.tsx` + `NoteComposeForm.tsx` + `MaintenanceComposeForm.tsx` (Day 33).
28. `app/staff/task/[id]/{DeparturesCard,StayoversCard,StartOfDayCard,ArrivalsCard,DailysCard}.tsx` (Day 33).
29. `lib/dispatch-config.ts` (Sections 9 + 12 + 14).
30. `app/admin/page.tsx` + `components/admin/ActivityFeed.tsx` (Day 29 III.D — Item A target).
31. `app/admin/staff/[id]/page.tsx` + `page.module.css` (Day 32 — Item A PROFILES const swap target).
32. `app/admin/tasks/page.tsx` (Item A target — LANES + STAT_*).
33. `app/admin/maintenance/[id]/page.tsx` (Item I target — schema-unblocked by Day 33).
34. `components/admin/AddTaskModal.tsx` (II.A + III.H Scope B reassignment surface inspiration — has the assignee chip pattern).
35. Skim `CLAUDE.md`, `AGENTS.md`, `dispatch-ui-rules.md`.

The 25-tab governance spreadsheet is committed at `docs/kb/`. Do NOT re-ingest tab-by-tab — the index doc is sufficient orientation.

---

## Operating reminders for the next chat

- **Bryan is non-developer.** Plain English, exact copy-paste prompts in fenced blocks. No placeholders unless explicitly called out.
- **Default workflow: Cowork-Claude direct-writes ALL code; CC handles only build verification + git operations + commits.** Pattern held cleanly through Day 34.
- **Single fenced code block per CC prompt + per SQL block.** Bryan's standing preference.
- **CC build-verify chain — NO `tail` pipe.** Day 32 process learning. Use `npm run build && git commit ...` for full output OR `set -o pipefail && npm run build 2>&1 | tail -25 && git commit ...` if tail truncation is desired.
- **Cowork-Claude burns context faster than CC.** Direct-writing all code + drafting handoffs + multi-phase plans accumulates rapidly. Practical implication: 70-85% handoff drafting window kicks in meaningfully on Cowork side. Draft at 70%, push to 80-85%.
- **Bash output is ground truth.** CC editorial commentary stays unreliable. Use `git log -3` + `git status` for ground-truth checks.
- **Internal imports under `lib/orchestration/`** must use `.ts` extensions for the Node orchestrator script (`--experimental-strip-types`). Imports from outside that folder use plain extensionless. **Day 29 caveat:** anything in `lib/orchestration/` importing from a browser-coupled module (one that imports `lib/supabase`) will compile but fail at orchestrator runtime. **Day 34 affirmation:** `lib/orchestration/index.ts` IS browser-coupled (imports `lib/task-events` extensionless, which transitively imports `lib/supabase`); that's why it's the right home for browser-side per-task lifecycle helpers like `reassignTask`. The orchestrator-cron-side modules are `run.ts` / `assignment-policies.ts` / `reshuffle.ts` / `interpret.ts` / `rules/*` / `audit-events.ts` — those use `.ts` extensions and inline string literals to be Node-safe.
- **No new dependencies** without asking Bryan.
- **Boring code.** No clever abstractions.
- **Migrations** live in `docs/supabase/*.sql`, applied manually via Supabase dashboard SQL editor. None this session.
- **The spreadsheet at `docs/kb/` is canonical for governance.**
- **The master plan at `docs/dispatch-master-plan.md` is THE PLAN — but Day 28 audit + Day 29-34 closures override the PARTIAL/UNBUILT labels.** "No cuts, all of it" by default.
- **`[ASK JENNIFER]` is the convention for static config Jennifer needs to confirm.**
- **Channel manager:** Cloudbeds, pending sales quote. Bryan's separate thread.
- **Q4 (Jennifer's KB authoring) is "an ongoing battle."** Engineering doesn't block on it.
- **"Live and die by the master plan"** (Bryan, Day 30): walk top-down. Section I has only PARTIAL items remaining, all blocked on cross-cutters or AUTHORING. Section III has III.A / III.B-staff / III.D / III.H / III.J closed; III.C / III.E / III.F / III.G / III.I / III.K still open. Section II is the next-best-leverage chase per Item A.
- **Audit-derived items merit a grep-first sanity check.** Day 34 process learning #1 — when Day 28 says "ONE-FUNCTION-AWAY," grep the relevant `taskEventType.X` literal first to find existing call sites before assuming green-field. Saves discovery time.
- **Day 34 reassignment verification convention** (carries forward): `SELECT te.created_at, te.detail->>'schema_version', te.detail->>'from_staff_name', te.detail->>'to_staff_name', t.staff_id, t.assignee_name FROM public.task_events te JOIN public.tasks t ON t.id = te.task_id WHERE te.event_type = 'reassigned' ORDER BY te.created_at DESC LIMIT 5;` smoke-tests any new reassign UI surface end-to-end against the helper.

---

## Items intentionally NOT done in Day 34

- **III.H Scope B — discrete reassign UI with required reason note.** Carry forward as Item C (~30 min).
- **`/admin/tasks/[id]` (II.G) reassign-wiring.** Carry forward as Item D (~30-45 min).
- **Section II live-data wirings cluster.** Carry forward as Item A (~2 hours). Top recommended next chase.
- **III.B Phase 5 — `maintenance_issues` source swap in activity feed.** Carry forward as Item B (~30 min).
- **V.A BR4 reservation fallback.** Carry forward.
- **IV.H Wed-occupancy Deep Clean trigger.** Carry forward.
- **III.E + V.G photo pipeline wiring.** Carry forward.
- **II.A confirmation pass.** Carry forward.
- **II.H Admin Maintenance live-data wiring.** Carry forward.
- **I.G remaining sub-items.** Last Stayover Status, checklist variants, status auto-complete, Sheet Change skip semantics.
- **Stray Lizzie row + Courtney Manager name confirmation.** Standing tabled, surfaced again in Day 34 verification result.
- **Vercel deploy.** Bryan's lane.
- **Per-target-staff activity feed query** (filter on `detail->>from_staff_id` / `detail->>to_staff_id`). Detail shape now supports it; query-side wiring deferred to post-beta. Master plan III.H spec calls "logs to both staff profiles" — for beta, the property-wide feed surfaces reassignments visibly enough.

---

## Day 34 in numbers

- **1 commit** on origin (`303fb32`, plus this handoff doc commit on top).
- **116 lines of code** added.
- **12 lines of code** deleted (mostly the inline `reassigned` log call site and the `staff_id` / `assignee_name` keys from the monolithic save spread).
- **Net: +104 lines.**
- **0 schema changes**.
- **0 new SQL migrations**.
- **0 new files**.
- **0 new dependencies**.
- **1 master plan clause closed at the helper layer**: III.H reassignment dual-logging.
- **2 new Day 34 carry-forward items**: III.H Scope B (discrete reassign UI with reason note) + II.G admin task view modal reassign-wiring.
- **1 surface-map decision surfaced**: `/admin/tasks` links to mocked II.G page vs. live II.B page.
- **1 standing tabled item re-surfaced**: "Courtney Manager" name format.
- **Day 34 master plan progress**: III.H went UNBUILT-as-listed → fully closed at the data/helper layer (3 of 3 sub-clauses); two surface-side items move into carry-forward.

---

## Path to "well below 3-5 weeks"

Bryan's Day 31 directive: trim the 3-5 week estimate without skipping any items. Day 34 contributes via:

1. **Single-chase cross-cutter close.** III.H was a Section II.G dependency (the Day 28 audit listed reassign as a III.H + II.G blocker). Closing it at the helper layer in one focused session makes II.G a one-import-away-from-helper-call wiring, not a green-field interpreter build.

2. **Helper extraction unlocks future surfaces.** `reassignTask` is now a stable lib boundary. Any future admin or staff surface that wants to reassign a card calls it the same way. Scope B's discrete reassign UI + II.G's admin task view modal wiring + a hypothetical drag-and-drop reassignment in `/admin/tasks` all consume the same helper. Pattern matches `pauseCard` / `resumeCard` / `completeCard` — battle-tested per-task lifecycle convention.

3. **Activity feed warn-classification carries III.B Phase 5 mostly for free.** Day 34's `reassigned`-as-warn classification + the existing `mergeAndRank` severity-boost ordering means High-severity maintenance issues will surface above info entries via the same path once the source swap lands. The dedicated `maintenance_issues` source swap is now a smaller chase (~30 min) instead of a full Phase 5 wiring.

Practical path remains: chase Item A + Item C + Item D + Item E + Item F + Item G + Item I back-to-back in one focused week, then Vercel deploy + smoke test, then post-beta items push off the critical path. Section II.J (KB Editor) and II.K (Calendar) remain post-beta per the spreadsheet's own marking — formal `[DEFER]` to a v2 lane satisfies "no cuts" without violating the promise.

---

*Handoff complete. Ready for Day 35. Master plan III.H closed at the data/helper layer (3 of 3 sub-clauses). Two surface-side carry-forward items (Scope B + II.G wiring) clean up the III.H surface map cluster. Recommended next chase: Item A — Section II live-data wirings cluster (~2 hours) for the biggest visible payoff. Alternative: Item C + Item D back-to-back (~1 hr combined) to fully wrap the III.H surface side first.*
