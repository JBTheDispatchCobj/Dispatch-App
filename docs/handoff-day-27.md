# UI / Build Handoff — Dispatch Day 27 (2026-05-05)

*Continuation handoff for a fresh Cowork chat. Supplements — does not replace — `docs/handoff-day-26.md` (Day 26 state), `docs/handoff-day-{25,24,23,22}.md`, `docs/phase-4-handoff.md` (Day 21), and `docs/dispatch-master-plan.md` (the canonical "no cuts, all of it" inventory). Read those alongside this one. The 25-tab governance spreadsheet at `docs/kb/` is canonical for governance rules.*

*Date: 2026-05-05, Day 27. Heavy build session — three substantive commits closing three master-plan items. Continued the Cowork-Claude direct-write pattern from Day 25-26: every code change in this session was direct-written by the chat; CC handled only build verification + git operations + commits + the final pushes to origin.*

---

## What landed in Day 27

Three commits between HEAD-at-session-start (`e7a4c3e`, the Day 26 handoff doc commit) and HEAD-at-session-end (`ba8ed9c`). All three pushed to `origin/main` at end of session.

### Commit 1 — IV.F: dailys.ts + eod.ts rule files via daily fan-out (option-2 path)

- **`e6dac75` — Day 27 IV.F: dailys.ts + eod.ts rule files + daily fan-out synthesizer.** Five files, +274 / -13.
  - `lib/orchestration/rules/dailys.ts` — `dailys.standard` rule, triggers on `event_type: 'daily_shift'`, produces one Da-430 draft per matching event.
  - `lib/orchestration/rules/eod.ts` — `eod.standard` rule, same trigger, produces one E-430 draft per matching event. Activation gating (E-430 R04) lives in the EODCard UI; this rule just guarantees the card exists.
  - `lib/orchestration/interpret.ts` — new `deriveStaffId` / `deriveStaffName` / `deriveAssigneeName` helpers pull `staff_id` + `staff_name` from `raw_payload` for dailys/eod card types. `deriveTitle` leads with staff name for these cards (`"Property round — Angie Lopez"` / `"End of day — Angie Lopez"` pattern).
  - `lib/orchestration/assignment-policies.ts` — preserve pre-assigned drafts in `assignDrafts`. Skip lane logic when `draft.staff_id` is already set; still increment load tracker so per-type counts stay accurate across mixed pre-assigned + lane-assigned batches.
  - `lib/orchestration/run.ts` — new `synthesizeDailyShiftEvents` pre-pass. Upserts one `inbound_event` per active staff row, idempotent via `inbound_events_dedup` constraint `(source, external_id, event_type, event_date)`. Live-only — skipped on dry-run for the same reason `reshuffle` is.

**Master plan IV.F option-2 path closed.** Per master plan I.C, the clock-in flow is partial — there's no `shift_start` event source today. Option 2 bypasses that by treating any active staff row as proxy for "scheduled today," synthesizing one `daily_shift` event per active staff row at the top of every live orchestrator run. Future: when I.C clock-in flow ships and writes its own `shift_start` event per housekeeper, swap the `event_type` in dailys.ts/eod.ts and drop the synthesizer.

**Verification kit ran clean against live orchestrator:**
- 5 active staff → 5 daily_shift events synthesized → 10 drafts (5 dailys + 5 eod) → 10 tasks inserted.
- Per-staff distribution: 1 dailys + 1 eod for each of Angie Lopez / Courtney Manager / Lizzie [dev] / Lizzie Larson / Mark Parry.
- Title shape verified: `"Property round — {name}"` / `"End of day — {name}"`.
- Bucket assignment correct: `staff_home_bucket` = `dailys` / `eod`. `priority_tier` = `null` (correct — these aren't tiered).
- Idempotency: second orchestrator run returned `0 newly inserted` and produced `0 drafts`.
- Cleanup SQL ran clean.

### Commit 2 — IV.G + VI.F: D-430 18-cell time-target matrix fill

- **`440253e` — Day 27 IV.G: D-430 time-target matrix fill + repeated-instance triggers.** One file, +56 / -23.
  - `lib/dispatch-config.ts` Section 9 — `DEPARTURE_TIME_TARGET_MATRIX` filled from Jennifer's `Rules for HouseKeeping.docx.md` (line 106). 12 cells direct from the doc, 6 ADA cells flagged `[ASSUMED]` as mirrors of their non-ADA equivalent (ada_double = double, ada_jacuzzi = jacuzzi). Bryan-to-Jennifer confirmation pending; reversible per-cell.
  - **Standard:** 30-45 (queen) / 35-50 (double + ada_double) / 45-60 (jacuzzi + ada_jacuzzi) / 45-65 (suite). Tolerance `0` — Jennifer's doc reads "anything over or under [the min-max] should be logged" with no percentage buffer (unlike Arrivals at 20% or EOD at 15%). Strict bounds.
  - **Deep:** 60-120 / 70-130 (incl. ada_double) / 75-150 (jacuzzi + ada_jacuzzi + suite). Same tolerance convention.
  - **Pet:** same shape as Deep.
  - `unknown` room class stays `null` — fallback per existing pattern.
  - New `DEPARTURE_REPEATED_INSTANCE_TRIGGERS` constant captures the three escalation conditions from Rules.md line 106 (`consecutive_shifts: 3`, `per_shift_pct: 0.25`, `per_month_pct: 0.15`). Per-cell `repeated_instance_threshold` couldn't represent the three-way trigger so it lives at module scope. Consumer logic deferred to III.D activity feed.

### Commit 3 — III.A: Notes UI compose drawer + public.notes wiring

- **`ba8ed9c` — Day 27 III.A: Notes UI compose drawer + public.notes wiring.** Ten files, +937 / -266.
  - `lib/notes.ts` (new, ~200 lines) — `addNote()` + `listNotesForTask()` + the 11/5/5 taxonomy constants (`NOTE_TYPES`, `NOTE_STATUSES`, `NOTE_ASSIGNED_TO`) + `NOTE_DEFAULTS`. `NoteRow` projects `author_user_id` as `user_id` so the legacy thread renderer in page.tsx needs no reshape.
  - `app/staff/task/[id]/NoteComposeForm.tsx` (new, ~140 lines) — shared compose component with three required `<select>`s above a textarea + Post button. `note_type` starts blank so Post is disabled until picked. Status defaults to `'Just Noting'`, assigned-to to `'Employee'`. Sticky filters: body clears on Post, dropdown selections persist (LinkedIn-comment pattern).
  - `app/staff/task/[id]/page.tsx` — state shape `comments` → `notes`, plus `noteType` / `noteStatus` / `noteAssignedTo`. `addTaskComment` swap → `addNote`. Legacy fallback section now renders Type / Status / Assigned chips on notes thread.
  - 6 X-430 cards (DeparturesCard / StayoversCard / ArrivalsCard / StartOfDayCard / EODCard / DailysCard) — prop interface `comments: CommentRow[]` → `notes: NoteRow[]`; six new dropdown props; inline `<form>` blocks replaced with `<NoteComposeForm />`. EODCard `reviewEntries` filter still matches self-authored-today on the new shape.
  - `app/globals.css` — ~145 lines new — `.note-compose__*` (mobile-first three-column wrap row of selects + textarea + Post) and `.staff-task-exec-note-chip` for the legacy fallback thread.
  - **Things deliberately not in this commit:** image attachment input (master plan III.E + V.G — Storage RLS still being finalized); `@mention` autocomplete (post-beta); migration of legacy `task_comments` rows (pre-beta dev/test data only; table stays but is effectively dead from the staff side); admin-side notes views (II.I category cards / staff profile log — separate post-beta builds).

**End-to-end verified live.** Bryan posted a note via the new compose UI; row landed in `public.notes` with all four taxonomy fields populated:
```
note_type='Guest Needs', note_status='Just Noting', note_assigned_to='Admin',
card_type='housekeeping_turn', room_number=null (parent task had no room_number)
```

**Build error caught by CC, surgical fix applied.** First build attempt failed on `lib/notes.ts:137` — supabase-js types `data` defensively as a union including `GenericStringError[]`, requiring an `as unknown as` cast through `unknown` to coerce to `Record<string,unknown>[]` safely. CC made a one-line fix and the second build went clean. The fix is now on disk in the committed version.

### Operating-model note

Cowork-Claude direct-wrote every code change in Day 27. Bryan-CC flow worked cleanly except for one paste mix-up mid-session (Bryan accidentally pasted the bash CC prompt into the Supabase SQL editor; quickly redirected). CC's terminal scrollback also caused one false-summary moment — Bryan pasted the prior Item C output and reported it as the Notes UI run; resolved by having CC dump `git log --oneline -3` + `git status` to confirm actual repo state. Bash output is ground truth; CC's editorial commentary remains unreliable. Pattern unchanged.

---

## State of the build at end of Day 27

**Working tree clean. Branch matches origin/main exactly (0 ahead, 0 behind).** Day 27 closed by pushing all three commits to origin sequentially: `e6dac75` → `440253e` → `ba8ed9c`.

**Build clean across the session.** `npm run build` ran four times (Item E pre-commit, Item C, Item D first attempt + fix). 21 routes, zero errors, zero warnings on every successful run.

**Section IV (rule engine + automation) is mostly closed:**
- IV.A (Steps 1-8) — ✓ Days 25-26
- IV.B (hallway adjacency) — ✓ Day 25 Step 5 (folded into IV.A)
- IV.C (no-orphan distribution) — ✓ Day 26 Step 6 (folded into IV.A)
- IV.D (pre-stayover reshuffle / priority_tier) — ✓ Day 26 Step 7
- IV.E (`specific_member_id` cleanup) — ✓ Day 26 Step 8
- IV.F (dailys.ts + eod.ts) — ✓ Day 27 (this session)
- IV.G (D-430 matrix) — ✓ Day 27 (this session)
- IV.H — Wed-occupancy Deep Clean trigger (constants exist via `DEEP_CLEAN_AUTO_TRIGGER` Section 12; interpreter logic unbuilt)
- IV.I — realtime task reassignment for Dailys (unbuilt)
- IV.J — repeated-instance meta-trigger interpreter logic (D-430 + Da-430 constants now exist; interpreter side missing)

IV.H/I/J all have constants defined but interpreter wiring deferred — partially blocked on III.D activity feed for the audit-event sink.

**Section III (cross-cutting features) — III.A (Notes UI) is now closed end-to-end staff-side.** III.B (Maintenance compose) is the next biggest III.* unlock. III.D (activity feed) is the foundational unlock for the audit/log work several IV.* items want to plug into.

**No schema changes this session.** All work consumed schema that landed in Day 24 + 26.

**Untouched documentation** — `docs/dispatch-master-plan.md`, `docs/handoff-day-{22,23,24,25,26}.md`, `docs/phase-4-handoff.md`, `docs/kb/...` all unchanged from Day 26. `docs/handoff-day-27.md` (this file) is the only new doc this session.

---

## Open queue (Day 27 carry-forward)

### Master-plan items still on the build queue

- **A. Item I — Vercel deploy (master plan VIII.A).** Bryan's action, ~30 min via `docs/deployment/vercel-checklist.md`. Carrying forward unchanged from Day 25 / Day 26. Parallel-izable; gets a real URL into Jennifer's hands.
- **B. III.B Maintenance compose drawer (master plan III.B).** Schema landed Day 24 (`maintenance_severities` + `maintenance_locations` + `maintenance_items` + `maintenance_types`). Compose drawer with cascading Location → Item/Sub-location → Type dropdowns + severity (Low/Normal/High; High → live admin notification) + photo attachment + 3-sink routing. Probably 1-2 hour build. Mirrors the Notes UI pattern.
- **C. V.A — BR4 X-430 brief reservation fallback.** Per-card edits to fall back to `getCurrentReservationForRoom()` / `getNextIncomingReservationForRoom()` when `task.context.{guest}` is missing. Helpers already exist in `lib/reservations.ts`. ~1-2 hours.
- **D. V.B — BR5 reservations cancellation/modification edge cases.** Webhook re-fires (idempotency), modifications cascade. Soft-delete via `status='cancelled'` filters from briefs. Not blocking until real channel-manager payloads start flowing.
- **E. IV.H — Wed-occupancy Deep Clean trigger** (master plan IV.H). All four conditions per D-430 R26: <5 departures + 40%+ occupancy in last 45 days + no deep clean in 45 days + ≤3 deep items completed in 45 days. Auto-elevates Standard → Deep on Wednesdays. Constants in `dispatch-config.ts` Section 12; interpreter logic unbuilt. ~1 hour for the rule logic; needs `deep_clean_history` queries.
- **F. III.D Activity feed (admin)** — UNBUILT. Gates several Step-follow audit-event TODOs from Days 25-26 (cross-hall override structured event, above-standard load structured event, reshuffle audit log) plus the future-IV.H/I/J interpreter logic. Larger lift — probably the foundational unlock for several smaller items.
- **G. Cloudbeds quote (Bryan's action, not a build item).** Channel manager pending sales call.

### Step-follow TODOs (all blocked on III.D activity feed)

Carry forward unchanged from Day 26:
- Step 5-follow: cross-hall console.warn → structured audit event.
- Step 6-follow: above-standard console.warn → structured audit event.
- Step 7-follow: structured audit log per reshuffle pass.

### Tabled items

- **H. `MODULE_TYPELESS_PACKAGE_JSON` Node warning.** Same harmless one-line follow-up.
- **I. Three `[ASK JENNIFER]` flags in `dispatch-config.ts`.** Two pre-existing in Section 14 (primary-staff identity + role-vs-spec drift), plus one new from Day 27 in Section 9 (D-430 ADA cells assumed mirror of non-ADA — `[ASSUMED]` flag, not `[ASK JENNIFER]`, but Bryan-to-Jennifer confirmation pending).
- **J. Re-key Section 14 maps from full names to UUIDs.** Decision pending; full names work for beta.
- **K. D-430 tolerance convention confirmation.** Currently strict-bounds (`tolerance: 0`) per Jennifer's doc. Worth confirming with her she meant strict and not an implicit ~20% like other cards.
- **L. Legacy `task_comments` table.** Still in place but no longer read or written from the staff side post-Day 27. Migration of historical rows into `public.notes` is a separate question if Bryan wants it; currently the rows are pre-beta dev data only.

---

## Critical state to verify in next session's first minutes

1. **Run `npm run build`** — confirm clean. Last known-good was Item D's verification end-of-Day-27.
2. **`git status`** — working tree should be clean. Branch should be `0 ahead, 0 behind` of `origin/main`.
3. **`git log --oneline -5`** — should show in order (newest first): `ba8ed9c` (III.A Notes UI), `440253e` (IV.G D-430 matrix), `e6dac75` (IV.F dailys/eod), `e7a4c3e` (Day 26 handoff doc), `3924070` (Day 26 IV.A Step 7).
4. **Confirm `lib/notes.ts` exists** at ~200 lines. Confirm `app/staff/task/[id]/NoteComposeForm.tsx` exists at ~140 lines.
5. **Confirm `lib/dispatch-config.ts` Section 9** has the 18-cell matrix filled (no remaining `[ASK JENNIFER]` markers in the cells; the `[ASSUMED]` flags on the 6 ADA cells stay).
6. **Confirm `lib/orchestration/rules/dailys.ts` and `eod.ts`** each contain a single rule with `trigger.event_type === 'daily_shift'`.
7. **Decide what to chase first** per the Open Queue. Recommended order:
   - **III.B Maintenance compose** — biggest cross-cutting feature unlock after Notes; mirrors Notes UI pattern.
   - **V.A BR4** — quick win, surface-level beta polish.
   - **IV.H Wed-occupancy Deep Clean** — small surgical interpreter add.
   - **Item I Vercel deploy** — Bryan's parallel lane.

---

## Files to load in next Cowork chat

**Required:** Mount `/Users/bryanstauder/dispatch-app/`. From repo, read in this order:

1. `docs/handoff-day-27.md` (this file — most recent, read first).
2. `docs/dispatch-master-plan.md` (canonical "no cuts, all of it" inventory).
3. `docs/handoff-day-26.md` (Day 26 — IV.A close + reshuffle).
4. `docs/handoff-day-25.md` (Day 25 — IV.A Steps 1-5 + bugfix).
5. `docs/handoff-day-{24,23,22}.md` (Day 22-24 foundation).
6. `docs/phase-4-handoff.md` (Day 21 — rule engine, KB foundation).
7. `docs/kb-spreadsheet-index.md` (navigator over the 25-tab governance spreadsheet).
8. `docs/kb/README.md`, `docs/kb/Dispatch — Rules Table Handoff.md` (KB folder + rules table companion).
9. `lib/notes.ts` (Day 27 III.A — notes data layer).
10. `app/staff/task/[id]/NoteComposeForm.tsx` (Day 27 III.A — shared compose component).
11. `app/staff/task/[id]/page.tsx` (Day 27 III.A — wiring + state).
12. `lib/dispatch-config.ts` (especially Section 9 — D-430 matrix; Section 14 — staff roster).
13. `lib/orchestration/assignment-policies.ts` (Day 26 + Day 27 pre-assigned guard).
14. `lib/orchestration/reshuffle.ts` (Day 26).
15. `lib/orchestration/roster.ts` + `run.ts` (Day 25-27).
16. `lib/orchestration/rules/{arrivals,departures,stayovers,dailys,eod}.ts` (Day 27 rule files).
17. `lib/orchestration/interpret.ts` (Day 27 dailys/eod staff_id passthrough).
18. `app/staff/page.tsx` (Day 26 — order clause + Arrivals-done re-activation).
19. Skim `CLAUDE.md`, `AGENTS.md`, `dispatch-ui-rules.md` for conventions.

The 25-tab governance spreadsheet (`docs/kb/Dispatch — Rules Table for Card and Section Governance.xlsx`) stays committed; do NOT re-ingest tab-by-tab. Open specific tabs via the xlsx skill on demand.

---

## Operating reminders for the next chat

- **Bryan is non-developer.** Plain English, exact copy-paste prompts in fenced blocks. No placeholders unless explicitly called out.
- **Default workflow: Cowork-Claude direct-writes code; CC verifies and commits.** Pattern held cleanly through Day 27. Brand-new docs (handoffs, indexes, status files) are direct-written by the chat. CC remains responsible for build verification and git operations.
- **Single fenced code block per executable artifact.** Per Bryan's standing preference. No interleaved prose inside the code block.
- **CC misread pattern is alive.** Day 27 saw one false-summary instance (Bryan pasted prior Item C output thinking it was the Notes UI run; resolved by `git log -3` + `git status` ground-truth check). Always verify against bash output, never against CC's editorial summary.
- **Internal imports under `lib/orchestration/`** must use `.ts` extensions (Node orchestrator script via `node --experimental-strip-types`). Imports from outside that folder use plain extensionless. Day 27's new files conform.
- **No new dependencies** without asking Bryan. Current deps: `@supabase/supabase-js`, `@supabase/ssr`, `next`, `react`, `react-dom`.
- **Boring code.** No clever abstractions. One-file-per-feature unless clearly beneficial. NoteComposeForm shared across 6 cards is the right level of DRY — explicit pattern that fights drift across X-430 surfaces.
- **Migrations** live in `docs/supabase/*.sql`, applied manually via Supabase dashboard. No new migrations this session.
- **The spreadsheet at `docs/kb/` is canonical for governance.** Source-doc precedence ladder per `docs/kb/README.md`.
- **The master plan at `docs/dispatch-master-plan.md` is THE PLAN.** "No cuts, all of it" by default. Bryan + Jennifer mark cuts inline as `[CUT]`, deviations as `[DEFER]` or `[CHANGED — see X]`, never delete rows.
- **`[ASK JENNIFER]` is the convention for static config that Jennifer needs to confirm.** Two flags carry forward in dispatch-config Section 14. Plus the new `[ASSUMED]` flags on 6 D-430 ADA cells in Section 9.
- **Channel manager:** ResNexus is dead. Cloudbeds is the leading replacement, pending sales quote.
- **Context-capacity rule (Bryan's standing preference):** draft handoff at 70%, push to 80-85%, then stop. This handoff was drafted right around the 80% mark per that rule.
- **When stuck, ask Bryan.** He knows the hotel operations reality better than any document.

---

## Items intentionally NOT done in Day 27

- **III.B Maintenance compose drawer.** Scoped as next session's chase since Notes UI was already a meaningful day's work.
- **V.A BR4 reservation fallback.** Quick win deferred to next session.
- **IV.H Wed-occupancy Deep Clean trigger.** Constants exist; interpreter logic deferred.
- **Card-level notes thread display on DeparturesCard.** Currently only shows count (`X notes`) — other cards render the full thread. Could add to D-430 in a follow-up but the shipped UX matches the existing pattern (D-430 was already count-only).
- **Image attachment in compose.** Master plan III.E + V.G — Storage RLS still being finalized. Pre-pipeline, the compose passes `image_url=null`.
- **@mention autocomplete.** Post-beta per Open Assumption.
- **Migration of legacy `task_comments` rows into `public.notes`.** Pre-beta dev data only; table stays but is dead from staff side.
- **Admin-side notes views (II.I).** Category cards × 11 + staff profile per-user log — separate post-beta builds.
- **Smoke-test on `/admin/staff/[id]`** (drill-in surface). Not part of III.A scope; admin views are post-beta.
- **Re-running orchestrator verification kit on Item D / Item C.** Item E verified end-to-end live; Items C and D are data-only / UI-only and don't change orchestrator behavior.
- **Two pre-existing `[ASK JENNIFER]` flags in Section 14 + one new `[ASSUMED]` flag set in Section 9.** Bryan-to-Jennifer.
- **MODULE_TYPELESS_PACKAGE_JSON Node warning cleanup.** Tabled.
- **Vercel deploy.** Bryan's action.

---

*Handoff complete. Ready for Day 28.*
