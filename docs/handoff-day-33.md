# UI / Build Handoff — Dispatch Day 33 (2026-05-06)

*Continuation handoff for a fresh Cowork chat. Supplements — does not replace — `docs/handoff-day-32.md` (Day 32 — I.C Phase 4 closed end-to-end via 3 Postgres views + admin staff profile segment block), `docs/handoff-day-31.md` (Day 31 — I.C Phase 3 closed; Phase 4 fully scoped), `docs/handoff-day-30.md` (Day 30 — I.A + I.B closed, I.C 75%), `docs/handoff-day-29.md` (Day 29 — III.D Activity feed closed end-to-end), `docs/handoff-day-28.md` (Day 28 — master-plan audit), `docs/handoff-day-{27,26,25,24,23,22}.md`, `docs/phase-4-handoff.md` (Day 21), and `docs/dispatch-master-plan.md`. The 25-tab governance spreadsheet at `docs/kb/` is canonical for governance.*

*Date: 2026-05-06, Day 33. The build day after Day 32's I.C Phase 4 close. **Master plan III.B closed end-to-end at the staff side** via 4 commits walking Phase 1 (schema) → Phase 2 (data layer) → Phase 3 (compose form component) → Phase 4 (wire into 5 host cards). Plus an honest discovery: Day 25's outstanding I.G sub-item (S-430 status pill time-target display) was found already shipped — carry-forward entry was stale.*

---

## Day 33 in one sentence

**Master plan III.B Maintenance compose drawer is fully wired at the staff side.** New `public.maintenance_issues` table + `lib/maintenance.ts` data layer + `MaintenanceComposeForm` component + integration into D-430, A-430, S-430, Da-430, and SOD-430 cards (E-430 intentionally untouched per master plan I.I). Four commits land cleanly; build clean every time. Section I gains an unblock: I.D / I.E / I.F / I.G all flagged Maintenance compose as a blocker — that gate is gone.

---

## What landed in Day 33

Four commits between HEAD-at-session-start (`d77d8b5`, the Day 32 handoff doc) and HEAD-at-session-end (`28d6e9c`). All pushed to `origin/main`.

### Commit 1 — III.B Phase 1: maintenance_issues table

- **`363724b` — Day 33 III.B Phase 1: maintenance_issues table.** One new SQL migration file. ~165 lines, applied via Supabase dashboard with embedded verification SELECT.
  - **NEW** `docs/supabase/maintenance_issues_table.sql`. Mirrors `notes_table.sql` shape exactly. Columns: `id`, `task_id` (FK tasks ON DELETE CASCADE), `author_user_id` (FK auth.users), `author_display_name`, `body` (nullable — issue can be photo-only), `image_url` (V.G stub), `location` / `item` / `type` / `severity` (FKs into the four Day 24 maintenance taxonomies; severity defaults `'Normal'`), `room_number` + `card_type` (denormalized from parent task on insert), `created_at`, `resolved_at`, `resolved_by_user_id`. Seven indexes covering the 3-sink query path: `(task_id, created_at)`, `(author_user_id, created_at desc)`, `(location, created_at desc)`, `(type, created_at desc)`, `(room_number, created_at desc) where room_number is not null`, partial `(created_at desc) where severity = 'High'`, partial `(created_at desc) where resolved_at is null`. RLS mirrors `public.notes` — staff insert-self-only, admin/manager full CRUD, select gated by `can_read_task` or self-author. Idempotent. Verification SELECT returned `1, 3, 21, 11, 10, 1, 4` in one paste — table + 4 taxonomies seeded + denormalize trigger + 4 RLS policies.

### Commit 2 — III.B Phase 1+2: lib/maintenance.ts

- **`56fe1ed` — Day 33 III.B Phase 1+2: maintenance_issues table + lib/maintenance.ts.** **Commit-message-vs-content cosmetic mismatch:** the SQL file already shipped in `363724b`; this commit only contains the `lib/maintenance.ts` file. Message reads "Phase 1+2" because the original combined-commit prompt was issued before CC discovered the SQL was already staged separately. No functional impact — just history reads slightly funny if anyone audits later.
  - **NEW** `lib/maintenance.ts` (~245 lines). Mirrors `lib/notes.ts` API shape exactly. Exports `MaintenanceIssueRow` type (with `user_id` aliased to `author_user_id` for thread-renderer compatibility), `MaintenanceIssueInsert` type (required: `taskId` + `authorUserId` + `authorDisplayName` + `location` + `item` + `type`; optional: `body`, `severity` defaults `'Normal'`, `imageUrl` defaults null), `addMaintenanceIssue(client, input): Promise<MaintenanceResult>`, `listMaintenanceIssuesForTask(client, taskId)` (uses the supabase-js `as unknown as` cast — same workaround as `lib/notes.ts:138` and Day 32 Phase 4d). Static taxonomy exports `MAINTENANCE_LOCATIONS` (21), `MAINTENANCE_ITEMS` (11), `MAINTENANCE_TYPES` (10), `MAINTENANCE_SEVERITIES` (3) — string-literal arrays in `display_order` mirroring the Day 24 taxonomy seeds (no runtime fetch — beta-only convenience matching `NOTE_TYPES` pattern). `MAINTENANCE_DEFAULTS = { severity: 'Normal' }`. Body normalized: empty/whitespace body becomes `null` on insert so admin queries can rely on `body IS NULL` meaning "no description provided."

### Commit 3 — III.B Phase 3: MaintenanceComposeForm component + CSS

- **`085bed7` — Day 33 III.B Phase 3: MaintenanceComposeForm component + CSS.** Two files. ~310 lines added.
  - **NEW** `app/staff/task/[id]/MaintenanceComposeForm.tsx` (~190 lines). Pure presentational compose form mirroring `NoteComposeForm.tsx` 1:1. Props: `body`/`setBody`, `location`/`setLocation`, `item`/`setItem`, `type`/`setType`, `severity`/`setSeverity`, `onSubmit`, `busy`, `disabled?`, `label?`, `placeholder?`, `rows?`, `className?`. Three required dropdowns (Location / Item / Type) sit in a wrap row; Severity dropdown sits beneath in its own row at 50% width. Body textarea is **OPTIONAL** — schema allows null body. `submitDisabled = busy || disabled || !location || !item || !type` (NOT body). Post button reads "Post issue" / "Sending…". **Cascading filter logic deferred** per `taxonomy_tables.sql:83` ("sub-location split deferred to post-beta"); flat dropdowns ship for beta with `[ASK JENNIFER]` flag in the file header.
  - **EDIT** `app/globals.css` (~125 lines added). New `.maint-compose` block mirroring `.note-compose` 1:1 with the addition of `.maint-compose__severity-row` + `.maint-compose__field--severity` (Severity sits in its own row at 50% width). Uses identical CSS variables (`--ink`, `--ink-muted`, `--hairline`, `--accent`) so the form drops into any per-card shell without color-token conflicts.

### Commit 4 — III.B Phase 4: wire into all five host cards

- **`28d6e9c` — Day 33 III.B Phase 4: wire MaintenanceComposeForm into all five host cards.** Seven files. 801 insertions / 25 deletions. Largest single commit of the chase but mechanically straightforward.
  - **EDIT** `app/staff/task/[id]/page.tsx`. Imports `addMaintenanceIssue`, `listMaintenanceIssuesForTask`, `MAINTENANCE_DEFAULTS`, `type MaintenanceIssueRow` from `@/lib/maintenance`; imports `MaintenanceComposeForm`. New state: `maintenanceItems` (issue list), `maintBody` / `maintLocation` / `maintItem` / `maintType` / `maintSeverity` / `maintBusy` (compose state). Extends `load()`'s `Promise.all` with `listMaintenanceIssuesForTask(supabase, id)`. New `onPostMaintenance` callback mirroring `onPostNote` — defensive guard on the three required taxonomy fields, `addMaintenanceIssue` call, fail-on-error surface via `setInlineError`, sticky-filter body clear on success (Location/Item/Type/Severity stay sticky between submits, mirroring NoteComposeForm). Threads the new prop block (13 fields) down to all five host card components in their respective render branches. Adds a Maintenance section to the legacy fallback render parallel to the existing Notes section.
  - **EDIT** `app/staff/task/[id]/DeparturesCard.tsx`. Adds prop block to `DeparturesCardProps` + destructures the new props. Replaces the locked MX exrow placeholder with a full `<section className="section">` Maintenance block. Pulls Maintenance out of "Per-room work" — that section now contains only the Deep Clean placeholder (DC remains locked per master plan IV.H + I.E).
  - **EDIT** `app/staff/task/[id]/StayoversCard.tsx`. Same prop block additions. Replaces the locked Maintenance placeholder section (was "Coming soon") with the live live `<section>` Maintenance block.
  - **EDIT** `app/staff/task/[id]/StartOfDayCard.tsx`. Same prop block additions. New Maintenance section inserted right after the existing Notes section.
  - **EDIT** `app/staff/task/[id]/ArrivalsCard.tsx`. Same prop block additions. New Maintenance section after Notes section, before Checklist section.
  - **EDIT** `app/staff/task/[id]/DailysCard.tsx`. Same prop block additions. New Maintenance section after Notes section, before Property Round section.
  - **EDIT** `app/globals.css` (~80 lines added). New `.maint-list` + `.maint-row` + `.maint-row__head` + `.maint-row__author` + `.maint-row__time` + `.maint-row__chips` + `.maint-row__chip` + `.maint-row__chip--severity-high` (red `#B91C1C` background for High-severity emphasis) + `.maint-row__body` block. Plus `.staff-task-exec-note-chip--severity-high` for the legacy fallback render's chip. Scoped via `.maint-list` parent so it works inside any per-card shell (`.preview-d-430`, `.preview-s-430`, etc.) without color-token conflicts.

### Per-card render shape (consistent across all 5)

```
<section className="section">
  <header>
    Maintenance
    {issueCount === 0 ? "Report an issue" : `${issueCount} issue${plural}`}
  </header>
  {issueCount > 0 ? <MaintenanceList /> : null}
  {!taskDone ? <MaintenanceComposeForm /> : null}
</section>
```

Issue row: author + timestamp + 4 chips (Location · Item · Type · Severity) + optional body. High-severity chip in red.

### Side discovery — I.G S-430 status pill time-target display

The Day 32 carry-forward listed "I.G S-430 status pill time-target display (~30 min — Day 25 outstanding chase)." During Day 33's planned quick-win pass, found that this work is **already shipped** at `app/staff/task/[id]/StayoversCard.tsx:419-435`. The mapping table `STATUS_KEY_TO_CONFIG` and the `formatTimeTarget()` helper were both in place; the pill rendering renders `{opt.label}` followed by ` · {targetLabel}` for each pill (e.g., "Do Not Disturb · ~1 min" / "Guest OK · ≤5 min" / "Sheet Change · 15-25 min"). Day 25 entry was stale — the work landed earlier and never got crossed off the carry-forward.

I.G's other sub-items remain PARTIAL: Last Stayover Status lookup (blocked on V.A BR4), checklist variants for Sheet Change weekly + * guest variant (pending Jennifer's KB authoring VI.B + VI.E), status-driven auto-complete (DND/Desk OK/Guest OK pre-selection auto-completes + auto-archives), Sheet Change skip semantics. Those are separate chases.

---

## State of the build at end of Day 33

**Working tree clean. Branch matches origin/main exactly.** Four Day 33 commits pushed: `363724b` → `56fe1ed` → `085bed7` → `28d6e9c`. (Plus this handoff doc commit on top after Day 33 wraps.)

**Build clean across the entire session.** `npm run build` ran 4 times (one per Phase commit). 21 routes, zero errors, zero warnings every time. Day 32's `tail`-pipe gotcha did not recur — every CC build-verify chain in Day 33 used the bare `npm run build && git commit ...` pattern with full output (no `tail` pipe), and the chain correctly broke on build error in zero cases (no errors fired).

**Master plan III.B — fully closed at the staff side. 4 of 4 listed phases:**
- ✓ Phase 1 — `maintenance_issues` table + 4 taxonomy FKs + RLS + denormalize trigger + 7 indexes (Day 33).
- ✓ Phase 2 — `lib/maintenance.ts` data layer with `addMaintenanceIssue` + `listMaintenanceIssuesForTask` + 4 static taxonomy exports (Day 33).
- ✓ Phase 3 — `MaintenanceComposeForm` component + `.maint-compose` CSS block (Day 33).
- ✓ Phase 4 — wire into all 5 host cards (D-430, A-430, S-430, Da-430, SOD-430) + legacy fallback render + `.maint-list`/`.maint-row` CSS block (Day 33).
- ⏳ **Phase 5 (deferred / optional)** — activity-feed sort boost for High severity. Beta-acceptable to defer; admin currently sees High issues alongside other entries via the existing Day 29 `lib/activity-feed.ts` reverse-chronological feed (`maintenance_issues` source needs wiring there — currently `notes WHERE note_type='Maintenance'` is the placeholder per `lib/activity-feed.ts:12`). Phase 5 is `~30-45 min` and folds naturally into Item B's live-data wiring cluster.

**Section I summary post-Day-33:**
- I.A ✓ closed (Day 30).
- I.B ✓ closed (Day 30).
- I.C ✓ closed (Day 30 + Day 31 + Day 32).
- I.D PARTIAL — Maintenance compose blocker GONE (Day 33). Remaining blockers: weather V.D, Google Events V.E, Jennifer's KB content for SOD-430.
- I.E PARTIAL — Maintenance compose blocker GONE. Remaining: BR4 V.A, weather, admin Departure Status master table (II.F), D-430 matrix authoring (VI.F).
- I.F PARTIAL — Maintenance compose blocker GONE. Remaining: BR4, weather, A-430 KB authoring.
- I.G PARTIAL — Maintenance compose blocker GONE; status pill time-target display SHIPPED (Day 25 carry-forward stale). Remaining: BR4 for Last Stayover Status, checklist variants (Sheet Change weekly, * guest), status-driven auto-complete, Sheet Change skip semantics.
- I.H PARTIAL — Maintenance compose was never listed as a blocker. Remaining: `dailys.ts` rule file (IV.F empty), Jennifer's daily-tasks list (VI.G), team roster (VII.G).
- I.I PARTIAL — Maintenance compose was not a blocker. Remaining: `eod.ts` rule file, Affirmations (VI.C), supply_needs schema (VII.A), team roster, tomorrow's data joins.

**Section III summary:** III.B closed at the staff side (4 of 4 phases; Phase 5 admin-side surface optional). III.A closed Day 27. III.D closed Day 29. III.C / III.E / III.F / III.G / III.H / III.I / III.J / III.K still PARTIAL or UNBUILT per the master plan.

**Schema changes — only one this session:** `public.maintenance_issues` table + denormalize trigger + 4 RLS policies + 7 indexes via `docs/supabase/maintenance_issues_table.sql`. Idempotent. No table changes elsewhere. No RLS changes elsewhere.

**No new dependencies.** Current deps unchanged: `@supabase/supabase-js`, `@supabase/ssr`, `next`, `react`, `react-dom`.

**Untouched documentation** — `docs/dispatch-master-plan.md`, `docs/handoff-day-{22,23,24,25,26,27,28,29,30,31,32}.md`, `docs/phase-4-handoff.md`, `docs/kb/...`, `docs/TASK_EVENTS_CONTRACT.md` all unchanged. `docs/handoff-day-33.md` (this file) is the only new doc.

---

## Process learnings — Day 33

### 1. Phase 1 SQL committed separately from Phase 2 lib (cosmetic only)

The original Phase 1+2 combined-commit CC prompt assumed both files would land in one commit. CC discovered Phase 1 SQL had already been staged in an earlier separate commit (`363724b`) and only Phase 2 (`lib/maintenance.ts`) made it into the named "Phase 1+2" commit (`56fe1ed`). No functional impact — just history reads slightly funny. Future sessions: when issuing combined-commit prompts, ground-truth `git log --oneline -3` first to see what's already staged.

### 2. Carry-forward entries can go stale

The Day 25 / Day 32 carry-forward listed "I.G S-430 status pill time-target display" as outstanding. Found at session start that the work was already shipped — `STAYOVER_STATUS_TIME_TARGETS` import + `formatTimeTarget` helper + pill render at `StayoversCard.tsx:419-435` all in place. Master-plan-driven sessions should sanity-check carry-forward items against the actual code before committing to them as work. Costs ~30 sec to grep, saves ~30 min of re-doing already-done work.

### 3. CC build-verify chain pattern held cleanly

Day 32's process learning (drop the `tail` pipe so build failures actually break the `&&` chain) was honored across all four Day 33 CC prompts. Pattern was: `cd ~/dispatch-app && git add ... && git status && npm run build && git commit -m "..." && git push origin main && git log --oneline -N`. Build never broke; if it had, the chain would have stopped before commit.

---

## Open queue (Day 33 carry-forward)

### Top of build queue

With III.B closed at the staff side, the open queue is dominated by cross-cutters that unblock the I.D-I.I PARTIAL items + the live-data wirings cluster.

- **A. III.H reassignment helper** (~30 min). **NEXT-SESSION PRIORITY** per Bryan's Day 33 wrap signal. Quick win — event vocab already includes `'reassigned'`. Mostly an admin-side dual-logging shim: when admin reassigns a card, write `task_events` rows for both the prior-staff + new-staff + the card itself per Global Rules R23. Patterns to mirror: Day 29 `lib/orchestration/audit-events.ts` for the writeAuditEvent shape; existing reassignment code paths in `app/admin/tasks/page.tsx` or wherever admin reassign UI lives (TBD — might need to land the UI alongside the helper).

- **B. Section II live-data wirings cluster** (~2 hours). Phase 4d (Day 32) closed the `/admin/staff/[id]` segment block. Still pending: replace `LANES` + `STAT_*` hardcoded in `app/admin/tasks/page.tsx`; replace `WATCHLIST_ITEMS / SCHEDULING_ITEMS / CRITICAL_ITEMS / NOTES_ITEMS` hardcoded in `app/admin/page.tsx`; replace `PROFILES` const lookup in `/admin/staff/[id]` with a live `public.staff` fetch (~30 min — segment block is already live-data; this swaps the static profile metadata around it). Skip `/admin/maintenance/[id]` — depends on II.H queries which now have the `maintenance_issues` schema-side dependency unblocked.

- **C. III.B Phase 5 — activity-feed sort boost for High severity** (~30-45 min). Optional. Wire `lib/activity-feed.ts` to read from `public.maintenance_issues` (currently uses `notes WHERE note_type='Maintenance'` as placeholder per `lib/activity-feed.ts:12`). Add a severity-driven sort boost so High-severity entries surface at the top of the admin reverse-chrono feed. Closes the master plan III.B "live notification to on-shift admin" clause for beta (true live push is post-beta).

- **D. V.A BR4 X-430 brief reservation fallback** (1-2 hours). Helpers exist in `lib/reservations.ts`. Unblocks I.E / I.F live guest data wirings AND I.G Last Stayover Status lookup.

- **E. IV.H Wed-occupancy Deep Clean trigger** (~1 hour). Constants exist in `dispatch-config.ts` Section 12. Unblocked by Day 29's audit-event sink.

- **F. III.E + V.G photo pipeline wiring into NoteComposeForm + MaintenanceComposeForm** (1-2 hours). `uploadTaskFile` helper already exists in `lib/task-events.ts:45`. Once wired, Maintenance issues can attach photos (high priority for damage types per master plan III.B).

- **G. II.A confirmation pass** (~30 min). Verify `AddTaskModal` matches the master plan II.A spec end-to-end. Possible bucket-model tweak.

- **H. II.H Admin Maintenance live-data wiring** (~1-2 hours). Now schema-unblocked — `maintenance_issues` table exists. Wire `app/admin/maintenance/[id]/page.tsx` to query `public.maintenance_issues` filtered by location / by type, plus per-issue card view. Master plan II.H 3-sink admin views are query-side over the same row.

- **I. I.G remaining sub-items.** Last Stayover Status lookup (blocks on V.A BR4), checklist variants for Sheet Change weekly + * guest (pending Jennifer's KB), status-driven auto-complete + Sheet Change skip semantics. Bundled or split as makes sense.

- **J. Item I — Vercel deploy.** Bryan's parallel lane, ~30 min via `docs/deployment/vercel-checklist.md`.

- **K. V.C Cloudbeds.** Bryan's separate thread, outside engineering critical path.

### Recommended next chase: III.H reassignment helper

Bryan flagged III.H for next session at Day 33 wrap. Rationale: ~30 min, single-concern, mirrors the Day 29 audit-event writer pattern, closes a master plan III item that's been UNBUILT since the inventory landed. After III.H lands, the recommended chase is **Item B Section II live-data wirings cluster** — biggest visible payoff, touches multiple master plan items, ~2 hours of focused mechanical work.

### Tabled

- **`MODULE_TYPELESS_PACKAGE_JSON` Node warning.** Same harmless one-line follow-up.
- **`[ASK JENNIFER]` flags** — same set carrying forward. Six `[ASSUMED]` ADA cells in Section 9 (D-430 matrix). D-430 tolerance convention question. AddTaskModal maintenance-routing decision. **NEW Day 33:** Maintenance compose drawer cascading filter logic (Location → Item → Type) deferred — flat dropdowns for beta. Once Jennifer authors the Location → Item → Type tree, swap the static `MAINTENANCE_LOCATIONS` / `MAINTENANCE_ITEMS` / `MAINTENANCE_TYPES` exports for runtime filter logic. Reversible.
- **Re-key `dispatch-config.ts` Section 14 maps from full names to UUIDs.**
- **Legacy `task_comments` table cleanup.**
- **`lib/task-event-types.ts` extraction** (post-beta polish).
- **Stray `Lizzie` row in public.staff** (id `fc2c4280-2be4-4ef8-a1ea-3a0b3dfbe3bc`, no surname) — Day 31 tabled item still pending.
- **"Courtney Manager" name format** — Day 31 tabled item still pending Jennifer clarification.
- **Reference Wednesday `2026-01-07` for `staff_segments_v`** — Day 32 tabled item still pending Jennifer.
- **PROFILES const swap on `/admin/staff/[id]`** — Day 32 tabled, addressed by Item B in next session.

### `[DEFER]` notes new in Day 33

- **Cascading dropdown filter logic.** `taxonomy_tables.sql:83` already flags "sub-location split deferred to post-beta." Phase 3 ships flat dropdowns. `[ASK JENNIFER]` once she authors the tree.
- **`imageUrl=null` pre-pipeline.** V.G photo pipeline still PARTIAL. Same convention as Day 27 notes drawer. Phase F (III.E + V.G) unblocks both at once.
- **No automatic `tasks` row creation on maintenance issue insert.** The 3rd "admin task card" sink is the `maintenance_issues` row presented as a card view, not a separate task. Auto-task-creation is post-beta per KISS — admin-side workflow can spawn a follow-up task manually if needed.
- **No same-day-shift dedup on maintenance.** Staff can file the same maintenance issue twice. Acceptable for beta; admin can resolve duplicates manually.
- **High-severity push notification deferred to Phase 5.** Beta surfaces High at the top of the activity feed only via sort boost. True live push is post-beta.
- **EOD (E-430) intentionally not a Maintenance host** per master plan I.I. Threading is defensive — if Jennifer wants Maintenance on EOD later, the prop block is one block-paste away.
- **Phase 1 SQL + Phase 2 lib commit-message cosmetic mismatch.** `56fe1ed`'s message says "Phase 1+2" but only contains Phase 2. Phase 1 SQL shipped earlier in `363724b`. Logged in Process learnings above.

---

## Critical state to verify in next session's first minutes

1. **Run `npm run build`** — confirm clean. Last known-good is `28d6e9c`.
2. **`git status`** — working tree clean. Branch `0 ahead, 0 behind` of `origin/main`.
3. **`git log --oneline -7`** — should show in order (newest first): `<Day 33 handoff doc SHA>`, `28d6e9c` (Phase 4), `085bed7` (Phase 3), `56fe1ed` (Phase 2), `363724b` (Phase 1), `d77d8b5` (Day 32 handoff doc), `5afd022` (Day 32 Phase 4d fix).
4. **Confirm Supabase table live** — `SELECT count(*) FROM public.maintenance_issues;` should return `0` (table exists, no rows). `SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='maintenance_issues';` should return `4` (insert + select + update + delete).
5. **Confirm `lib/maintenance.ts` exists at ~245 lines** with `addMaintenanceIssue` / `listMaintenanceIssuesForTask` / 4 static taxonomy exports.
6. **Confirm `app/staff/task/[id]/MaintenanceComposeForm.tsx` exists** (~190 lines).
7. **Confirm wiring in `app/staff/task/[id]/page.tsx`** — should contain `addMaintenanceIssue`, `listMaintenanceIssuesForTask`, `MAINTENANCE_DEFAULTS`, `MaintenanceComposeForm` imports. State hooks `maintBody` / `maintLocation` / `maintItem` / `maintType` / `maintSeverity` / `maintBusy`. `onPostMaintenance` callback.
8. **Confirm 5 host cards updated** — `DeparturesCard.tsx`, `StayoversCard.tsx`, `StartOfDayCard.tsx`, `ArrivalsCard.tsx`, `DailysCard.tsx` should each contain the 13-field maintenance prop block in their props type + destructure + a `<section>` rendering MaintenanceComposeForm.
9. **Confirm `app/globals.css` has `.maint-compose` and `.maint-list` blocks** + the `.staff-task-exec-note-chip--severity-high` variant.
10. **Decide what to chase first** per Open Queue. Recommended: **Item A — III.H reassignment helper** (Bryan's wrap-signal flag for next session).

---

## Files to load in next Cowork chat

**Required:** Mount `/Users/bryanstauder/dispatch-app/`. Read in this order:

1. `docs/handoff-day-33.md` (this file — most recent, read first).
2. `docs/handoff-day-32.md` (Day 32 — I.C Phase 4 + segment block).
3. `docs/handoff-day-31.md` (Day 31 — I.C Phase 3).
4. `docs/handoff-day-30.md` (Day 30 — I.A + I.B + I.C 75%).
5. `docs/handoff-day-29.md` (Day 29 — III.D Activity feed close).
6. `docs/handoff-day-28.md` (Day 28 — master-plan audit).
7. `docs/dispatch-master-plan.md` (canonical inventory with Day 28-33 closure overlay).
8. `docs/handoff-day-{27,26,25,24,23,22}.md` (foundation).
9. `docs/phase-4-handoff.md` (Day 21 — OLD phase-4 for rule engine; not related to I.C Phase 4).
10. `docs/kb-spreadsheet-index.md` + `docs/kb/README.md` + `docs/kb/Dispatch — Rules Table Handoff.md`.
11. `docs/TASK_EVENTS_CONTRACT.md`.
12. `docs/supabase/maintenance_issues_table.sql` (Day 33 — new table source of truth).
13. `docs/supabase/staff_clock_in_event_trigger.sql` + `docs/supabase/staff_shifts_view.sql` + `docs/supabase/staff_segments_view.sql` + `docs/supabase/shift_summary_view.sql` (Day 31 + Day 32).
14. `docs/supabase/taxonomy_tables.sql` + `docs/supabase/notes_table.sql` (Day 24 + Day 27 — patterns III.B mirrors).
15. `lib/maintenance.ts` (Day 33 — III.B data layer; III.H reassignment helper next-session target may import from here).
16. `lib/notes.ts` + `lib/activity-feed.ts` (Day 27 + Day 29 — Phase 5 activity-feed wiring will edit `lib/activity-feed.ts`).
17. `lib/clock-in.ts` (Day 30 + Day 31).
18. `lib/task-events.ts` (event vocabulary — III.H reassignment helper will use `'reassigned'`).
19. `lib/orchestration/audit-events.ts` (Day 29 — pattern to mirror for III.H).
20. `lib/orchestration/{assignment-policies,reshuffle,run,interpret}.ts`.
21. `lib/orchestration/rules/{dailys,eod,arrivals,departures,stayovers,maintenance}.ts`.
22. `app/staff/page.tsx` + `app/staff/task/[id]/page.tsx` + `EODCard.tsx` + `NoteComposeForm.tsx` + `MaintenanceComposeForm.tsx` (Day 33).
23. `app/staff/task/[id]/{DeparturesCard,StayoversCard,StartOfDayCard,ArrivalsCard,DailysCard}.tsx` (Day 33 — all five updated with maintenance prop block).
24. `lib/dispatch-config.ts` (Sections 9 + 12 + 14).
25. `app/admin/page.tsx` + `components/admin/ActivityFeed.tsx` (Day 29 III.D — Phase 5 + Item B targets).
26. `app/admin/staff/[id]/page.tsx` + `page.module.css` (Day 32 segment block; Item B PROFILES swap target).
27. `app/admin/tasks/page.tsx` + `app/admin/maintenance/[id]/page.tsx` (Item B + II.H targets).
28. `components/admin/AddTaskModal.tsx` (II.A + III.H reassignment surface).
29. Skim `CLAUDE.md`, `AGENTS.md`, `dispatch-ui-rules.md`.

The 25-tab governance spreadsheet is committed at `docs/kb/`. Do NOT re-ingest tab-by-tab — the index doc is sufficient orientation.

---

## Operating reminders for the next chat

- **Bryan is non-developer.** Plain English, exact copy-paste prompts in fenced blocks. No placeholders unless explicitly called out.
- **Default workflow: Cowork-Claude direct-writes ALL code; CC handles only build verification + git operations + commits.** Pattern held cleanly through Day 33.
- **Single fenced code block per CC prompt + per SQL block.** Bryan's standing preference.
- **CC build-verify chain — NO `tail` pipe.** Day 32 process learning carries forward; Day 33 honored cleanly. Use `npm run build && git commit ...` for full output OR `set -o pipefail && npm run build 2>&1 | tail -25 && git commit ...` if tail truncation is desired.
- **Cowork-Claude burns context faster than CC.** Direct-writing all code + drafting handoffs + multi-phase plans accumulates rapidly in the Cowork session window. CC's session window stays sparse because it just runs shell commands and reports tiny outputs. Practical implication: the 70-85% handoff drafting window kicks in meaningfully on Cowork side; less so on CC side.
- **Bash output is ground truth.** CC editorial commentary stays unreliable. Use `git log -3` + `git status` for ground-truth checks.
- **Internal imports under `lib/orchestration/`** must use `.ts` extensions. Day 29 caveat about browser-coupled imports failing at orchestrator runtime carries forward.
- **No new dependencies** without asking Bryan.
- **Boring code.** No clever abstractions.
- **Migrations** live in `docs/supabase/*.sql`, applied manually via Supabase dashboard SQL editor.
- **The spreadsheet at `docs/kb/` is canonical for governance.**
- **The master plan at `docs/dispatch-master-plan.md` is THE PLAN — but Day 28 audit + Day 29-33 closures override the PARTIAL/UNBUILT labels.** "No cuts, all of it" by default.
- **`[ASK JENNIFER]` is the convention for static config Jennifer needs to confirm.**
- **Channel manager:** Cloudbeds, pending sales quote. Bryan's separate thread.
- **Q4 (Jennifer's KB authoring) is "an ongoing battle."** Engineering doesn't block on it.
- **"Live and die by the master plan"** (Bryan, Day 30): walk top-down. Section I has only PARTIAL items remaining, all blocked on cross-cutters or AUTHORING — III.B closure (Day 33) unblocks four of them on the Maintenance-compose dimension.
- **Sanity-check carry-forward against actual code before committing to it.** Day 33 process learning — saves time when entries have gone stale.
- **Day 33 maintenance verification convention:** to smoke-test the III.B end-to-end stack, open a staff X-430 card (any of the 5 host types), pick Location/Item/Type/Severity in the Maintenance section, optionally add a body, click Post issue. Verify against `public.maintenance_issues` in Supabase dashboard — one new row with the expected taxonomy fields, denormalized `room_number` + `card_type` populated by the trigger.

---

## Items intentionally NOT done in Day 33

- **III.B Phase 5 — activity-feed sort boost for High severity.** Optional; folded into next session's queue. ~30-45 min when chased.
- **III.H reassignment helper.** Bryan's flagged next-session priority. ~30 min.
- **Section II live-data wirings cluster.** Carry forward; ~2 hours.
- **V.A BR4 reservation fallback.** Carry forward.
- **IV.H Wed-occupancy Deep Clean trigger.** Carry forward.
- **III.E + V.G photo pipeline wiring** (into both NoteComposeForm + MaintenanceComposeForm). Carry forward.
- **II.A confirmation pass.** Carry forward.
- **II.H Admin Maintenance live-data wiring.** Schema now unblocked; wiring deferred to next-session sequence.
- **I.G remaining sub-items.** Last Stayover Status, checklist variants, status auto-complete, Sheet Change skip semantics.
- **Stray Lizzie row + Courtney Manager name confirmation.** Day 31 tabled, still pending.
- **Vercel deploy.** Bryan's lane.

---

## Day 33 in numbers

- **4 commits** on origin (`363724b` → `56fe1ed` → `085bed7` → `28d6e9c`, plus this handoff doc commit on top).
- **~1390 lines of code** added (Phase 1 ~165 SQL + Phase 2 ~245 TS + Phase 3 ~310 TSX/CSS + Phase 4 ~670 TSX/CSS).
- **25 lines of code** deleted (Phase 4 — the locked MX exrow placeholders in DeparturesCard + StayoversCard).
- **Net: +1365 lines.**
- **1 schema change**: `public.maintenance_issues` table + denormalize trigger + 4 RLS policies + 7 indexes.
- **1 new SQL migration**: `docs/supabase/maintenance_issues_table.sql`.
- **2 new TypeScript files**: `lib/maintenance.ts`, `app/staff/task/[id]/MaintenanceComposeForm.tsx`.
- **0 new dependencies**.
- **1 master plan item closed at staff side**: III.B (4 of 4 listed phases). Phase 5 admin-side surface optional and folded into next session's queue.
- **1 master plan sub-item rediscovered as already-shipped**: I.G S-430 status pill time-target display (Day 25 carry-forward stale).
- **4 master plan items unblocked on the Maintenance-compose dimension**: I.D, I.E, I.F, I.G.
- **Day 33 master plan progress**: III.B went UNBUILT-as-listed → 4-of-4-staff-phases-shipped. Section I gains a cross-cutting unblock for four PARTIAL items.

---

## Path to "well below 3-5 weeks"

Bryan's Day 31 directive: trim the 3-5 week estimate without skipping any items. Day 33 contributes via:

1. **Single-chase cross-cutter close.** III.B was a 4-Section-I-item blocker; closing it in one focused session unblocks I.D / I.E / I.F / I.G simultaneously. Highest leverage type of work in the queue.

2. **Stale-entry auditing.** I.G's "Day 25 outstanding chase" was already shipped — saved ~30 min by ground-truthing. Future sessions: grep before starting any carry-forward sub-item that's older than 5 days. Cheap insurance.

3. **Maintenance.ts mirrors notes.ts pattern almost perfectly.** Compose-drawer pattern is now established for the remaining 10 admin category cards (master plan II.I) — when those land post-beta, Maintenance + Notes serve as the dual reference implementation. Authoring lane (Jennifer's KB content) remains the standing parallel-track.

Practical path remains: chase III.H + Item B + V.A + IV.H + III.E/V.G + II.H back-to-back in one focused week, then Vercel deploy + smoke test, then post-beta items push off the critical path. Section II.J (KB Editor) and II.K (Calendar) remain post-beta per the spreadsheet's own marking — formal `[DEFER]` to a v2 lane satisfies "no cuts" without violating the promise.

---

*Handoff complete. Ready for Day 34. Master plan III.B closed at staff side (4 of 4 listed phases). Section I has only PARTIAL items remaining, all blocked on cross-cutters or AUTHORING. Recommended next chase: III.H reassignment helper (~30 min, Bryan's wrap-signal flag) followed by Item B Section II live-data wirings cluster (~2 hours) for the biggest visible payoff.*
