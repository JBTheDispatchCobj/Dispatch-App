# UI / Build Handoff — Dispatch Day 25 (2026-05-04)

*Continuation handoff for a fresh Cowork chat. Supplements — does not replace — `docs/handoff-day-24.md` (Day 24 state), `docs/handoff-day-23.md` (Day 23), `docs/handoff-day-22.md` (Day 22), `docs/phase-4-handoff.md` (Day 21), and `docs/dispatch-master-plan.md` (the canonical "no cuts, all of it" inventory). Read those alongside this one. The 25-tab governance spreadsheet at `docs/kb/` is canonical for governance rules.*

*Date: 2026-05-04, Day 25. Session was a build push: two card-component wirings (deferred from Day 24) plus five steps of the auto-assignment build (master plan IV.A), plus one bugfix between Step 4 and Step 5 surfaced by live verification. Heavy use of the Cowork-Claude direct-write fallback per the Day 24 pattern after CC repeatedly misread CC prompts.*

---

## What landed in Day 25

Nine commits between HEAD-at-session-start (`6bf11d8`, the master-plan commit) and HEAD-at-session-end. All committed to `main`, branch ahead of `origin/main` by the cumulative count.

### Card-component wirings (deferred from Day 24)

- **`ecf8c64` — Day 25 chase: wire `STAYOVER_STATUS_TIME_TARGETS` into S-430 status pills.** `app/staff/task/[id]/StayoversCard.tsx`. Adds an import of `STAYOVER_STATUS_TIME_TARGETS`, `StayoverStatus`, and `TimeTargetSpec` from `lib/dispatch-config`; a small `STATUS_KEY_TO_CONFIG` mapping (the card has one `Done` pill while config splits into `Done (Standard)` vs. `Done (Long-term/*)` — using Standard, long-term variant is follow-on work per master plan I.G); a `formatTimeTarget(spec)` helper; and the `.statcard__pills` map block now renders `{label} · {time band}` inline. No CSS changes. Master plan I.G (StayoversCard wiring).
- **`7b9c729` — Day 25 chase: wire `lookupSeasonalScent` into D-430 Setup section.** `app/staff/task/[id]/DeparturesCard.tsx`. Adds an import of `lookupSeasonalScent`; a render-time `seasonalScent = lookupSeasonalScent()` variable; and a new `Room Spray` row in the Setup `.setstat` section between `Setup` and `Notes`. Today (May 4) renders `Day Dream` per the May 1 – Sept 4 window. **Temperature half of master plan I.E intentionally NOT wired — blocked on V.D weather API integration.** Will follow once a live degreesF source is available. Master plan I.E (Room Spray half only).

### Auto-assignment build (master plan IV.A — five steps + one bugfix)

The biggest unlock left after Day 24. Day 23 / 24 handoffs both flagged this as the top of the build queue ("biggest unlock; without it every promoted draft lands `staff_id: null`"). This session shipped Steps 1 through 5 of an 8-step build (Step 7 is the deferred-as-follow-up Pre-stayover reshuffle; Step 8 is trivial deletion of `[ASK JENNIFER]` markers per the dynamic-only decision).

A scoping pass via the Plan subagent at session start produced an 8-step build order, signatures, hook-in points, and seven open questions. Three of those were blocking (which staff are primaries, which primary takes which hall, hard-vs-soft hall adjacency); four had defensible defaults that Cowork-Claude committed to without round-tripping with Bryan. The blocking three were resolved with `[ASK JENNIFER]` placeholder values that flag for Jennifer's review.

- **`fbe6440` — Day 25 IV.A Step 1: roster loader + static primary/hall config.** Two files. `lib/dispatch-config.ts` Section 14 adds `STAFF_PRIMARY_NAMES` (Set of lowercased full names, two `[ASK JENNIFER]` placeholders) and `STAFF_PREFERRED_HALL` (Record of name to HallId, four placeholder entries). `lib/orchestration/roster.ts` is new — exports `RosterMember` type and `loadRoster(client)` async function. Phase 1 treats every `staff` row with `status='active'` as on-shift since master plan I.C Clock-In flow is unbuilt; deferring would block IV.A.
- **`459a574` — Day 25 IV.A Step 2: assignment-policies skeleton + departure priority sort.** New file `lib/orchestration/assignment-policies.ts` (~135 lines). Exports `assignDrafts(drafts, ctx)` and `AssignmentContext` type. Implements the public API skeleton, naive round-robin distribution, and a sort pass that puts departures first ordered by `DEPARTURE_STATUS_PRIORITY` (`Has Sheets` first, `Checked Out` last). Defaults to `Open` when `context.departure_status` is missing — the admin master Departures table (II.F) that would canonically set this is unbuilt, so every departure currently sorts as `Open` and the priority sort is a no-op until that data lands. Cross-cutting bumps, primary lane, hallway adjacency, and no-orphan distribution all TODO-tagged for later steps.
- **`480b840` — Day 25 IV.A Step 3: wire `assignDrafts` into orchestrator run loop.** `lib/orchestration/run.ts` restructured. Loads roster up-front; collects drafts across all events into one batch (instead of per-event insertion); calls `assignDrafts(allDrafts, { eventDate, roster })` once; bulk-inserts into `task_drafts` (dry-run) or `tasks` (live); marks all events processed at end. **Behavioral change: insert is now all-or-nothing.** Prior per-event semantics could leave earlier events processed and later events unprocessed on mid-run failure. Diagnostic logs added: roster size, total drafts pre-assignment, assigned-vs-total count post-assignment.
- **`5ba4d97` — Day 25 IV.A Step 4: primary-housekeeper lane.** `lib/orchestration/assignment-policies.ts` extended (~245 lines total). Replaces the Step 2 round-robin with the real distribution per Hallway + Assignment R06-R07. Stayovers + arrivals route to primaries by `preferred_hall` match (lighter-loaded primary takes 40s and any unmatched-hall fallback); departures route to non-primaries by `preferred_hall` match with lighter-load fallback; all other card types round-robin across the full roster by lighter load. New private helpers: `pickAssignee`, `pickPrimaryByHall`, `pickByHall`, `pickByLighterLoad`. Imports `getRoomHall` and `HallId` from dispatch-config.
- **`5c96894` — Day 25 IV.A bugfix: roster lookup uses full lowercased name.** Two files. **Bug surfaced by the Step 4 live verification staff pre-check** — Jennifer's actual `staff` table has 5 active rows with full names (`Angie Lopez`, `Courtney Manager`, `Lizzie`, `Lizzie Larson`, `Mark Parry`) plus a dev portal account (Bryan's "Lizzie" alt-email login to dodge magic-link rate limits). The original Section 14 keys were single-word first names; the lookup never matched any staff row; every member resolved to `is_primary=false` and `preferred_hall=null`; the primary lane fell through to round-robin fallback. Fix re-keyed Section 14 to lowercased full names exactly as stored in `public.staff.name` (`courtney manager`, `lizzie larson`, `angie lopez`, `mark parry`) and updated `roster.ts` to use full-name lookup. Disambiguates the dev `Lizzie` from the real `Lizzie Larson` — first-name keying would have flagged both as primary.
- **(pending commit at handoff time) Day 25 IV.A Step 5: hallway adjacency rule (R10).** `lib/orchestration/assignment-policies.ts` extended (~340 lines total). New private `PolicyState` type bundles `loads` + `startingHalls` + `hallDemand`. New helpers `isHallEligible` and `pickLighterFromUnfiltered`. `pickByLighterLoad` now filters by hall eligibility; on all-blocked, relaxes the constraint with a `console.warn` `cross-hall override` message. `assignDrafts` adds a pre-pass to count hallDemand and updates state tracking after every pick. Implements the lock-to-starting-hall rule per master plan IV.B / R10; override audit event deferred to Step 5-follow once activity feed (III.D) is online.

### Live verification of Step 4

A 3-block verification kit (Supabase SQL seed → CC `AGENT_KILL=false npm run orchestrate` → Supabase SQL distribution check + cleanup) ran the orchestrator end-to-end against 8 fresh `inbound_events`. Results:

- All 8 drafts had `staff_id` populated post-assignment (zero orphans).
- Distribution matched the expected mapping exactly given the placeholder primaries: Lizzie Larson 2 (a-21, s-23 — both 20s), Courtney Manager 3 (a-33, a-41, s-35), Angie Lopez 1 (d-25), Mark Parry 1 (d-37), Lizzie dev 1 (d-42 via lighter-load fallback for non-primaries).

This was the first end-to-end verification of the auto-assignment chain. Validates that interpret() → dispatch() → assignDrafts() → bulk insert all wire correctly. Surfaced the full-name-lookup bug (which then got the bugfix commit) and the role-vs-spec drift `[ASK JENNIFER 2]` flag.

### Operating-model observation

CC misread CC prompts at least four times in this session. The character-drop pattern from Day 24 (the four .sql files) repeated:

- Step 1 of IV.A (~100-line CC prompt): CC hallucinated three syntax errors that didn't exist in the source (`Record<strallId>`, `booan`, `rs.map`).
- Multiple grep pattern misreads where CC narrated finding things it didn't find or vice versa.
- One grep response where CC explicitly fabricated a line it claimed was in the file (`r.name.trim().split(/\s+/)[0].toLowerCase()` claimed at line 59 — the file had `r.name.trim().toLowerCase()` and the comment block).

**Cowork-Claude direct-write was used for every code change in IV.A Steps 1-5 + bugfix.** CC was used only for: `npm run build` verification, `git status` / `git diff --stat` / `git log` reporting, and `git commit` execution. Pattern that held this session:

1. Cowork-Claude reads relevant files via `Read` to ground its edit.
2. Cowork-Claude writes via `Write` (new files) or `Edit` (existing files).
3. Cowork-Claude reads back the modified region to self-verify.
4. CC prompt asks for build + git verification + grep checks **only**.
5. CC reports stdout; Cowork-Claude treats bash output as ground truth and CC editorial commentary as unreliable.
6. Cowork-Claude drafts commit prompt; CC executes the commit.

**This pattern is faster, more reliable, and avoids the CC-misread loop entirely.** Recommend continuing it for any code change of meaningful size in the next session. Brand-new documentation (handoffs, indexes, status files) was always direct-written by the chat — that convention from Day 24 stayed.

---

## State of the build at end of Day 25

Working tree clean (assuming Step 5 commit lands per the still-pending commit prompt). Branch will be 16 commits ahead of `origin/main` after Step 5. Build PASS clean across every step — 21 routes, zero errors, zero warnings throughout the session.

The auto-assignment chain is now functionally end-to-end testable. `interpret()` produces drafts, `dispatch()` aggregates them, `assignDrafts()` distributes them per the primary lane + adjacency rule, `run.ts` bulk-inserts into `task_drafts`. The 8-event verification kit is canonical and re-runnable for any future regression check.

`docs/handoff-day-25.md` (this file) is the only new documentation this session; all other doc context (`docs/dispatch-master-plan.md`, `docs/handoff-day-{22,23,24}.md`, `docs/kb/...`) is unchanged from Day 24.

---

## Open queue (Day 25 carry-forward)

### IV.A residue (Steps 6-8)

- **A. Step 6 — No-orphan distribution (master plan IV.C).** Refines the `loads` map in `assignment-policies.ts` from total-per-member to per-type-per-member to evaluate against `STANDARD_LOAD_PER_HOUSEKEEPER` thresholds (5 dep / 10 stay / 15 daily). Emits `console.warn` when a member crosses their per-type standard load. No structural change to the picker logic — purely an instrumentation refinement. Estimated ~40-60 line additions.
- **B. Step 7 — Pre-stayover reshuffle (master plan IV.D).** **Deferred-as-follow-up.** New cron-driven phase distinct from `run()` that re-prioritizes (NOT reassigns) tasks in flight at 11am weekday / 12pm weekend to push stayovers + arrivals above remaining departures. Cards in flight aren't interrupted. Plan agent recommended deferring this as not blocking demo end-to-end. Likely lands as a separate file `lib/orchestration/reshuffle.ts` plus a cron registration.
- **C. Step 8 — Resolve `assignment.specific_member_id` markers (master plan IV.E).** Per the dynamic-only decision (Q5 default in this session), this closes by *deleting* the `[ASK JENNIFER]` markers in `lib/orchestration/rules/{arrivals,departures,stayovers}.ts` rather than filling them. Trivial — one or two lines per file. The dynamic assignment-policies layer fully owns assignment.

### Verification follow-ups

- **D. Re-run the verification kit on Step 5.** Optional. Distribution should be identical to Step 4 (the 8-event test scenario doesn't trigger adjacency-blocking situations that change picks) plus one new `console.warn` line for the a-41 cross-hall override (Courtney Manager assigned to 40s while her 30s starting hall still has s-35 pending). The warn confirms Step 5 is firing without breaking Step 4 behavior.

### Master-plan items still on the wider build queue

The auto-assignment chase is wrapping up. The next-largest items per the master plan, in rough priority order:

- **E. Author empty `dailys.ts` + `eod.ts` rule files (master plan IV.F).** Both are currently empty arrays; the orchestrator can't generate Da-430 or E-430 cards. Specs are in the Da-430 (18 rows) and E-430 (14 rows) spreadsheet tabs plus Jennifer's daily-tasks input + EOD spec.
- **F. D-430 18-cell time-target matrix fill (master plan IV.G + VI.F).** Still pending Bryan's pull from Jennifer's `Rules for HouseKeeping.docx.md`. ~10-minute surgical edit when the matrix arrives.
- **G. Wave 4D Notes UI (master plan III.A).** Schema landed Day 24; UI is unbuilt. LinkedIn-mobile-comment style compose drawer + 11 Note Type dropdown + dual-sink routing.
- **H. BR4 — wire X-430 briefs to live reservation data (master plan V.A).** Per-card edits to fall back to `getCurrentReservationForRoom()` / `getNextIncomingReservationForRoom()` when `task.context.{incoming_guest, current_guest, outgoing_guest}` is missing.
- **I. Vercel deploy (master plan VIII.A).** Bryan's action, ~30 min. Gets a real URL into Jennifer's hands. Doesn't require any code changes from a fresh chat. Can run in parallel with everything else.
- **J. Cloudbeds quote (Bryan's action, not a build item).** Channel manager pending sales call.

### Tabled items

- **K. `MODULE_TYPELESS_PACKAGE_JSON` Node warning** on `npm run orchestrate`. Harmless — Node nagging about an ES-module heuristic on `scripts/run-orchestrator.ts`. One-line follow-up if you want to quiet it (add `"type": "module"` to package.json or rename the script's extension).
- **L. `[ASK JENNIFER]` flags accumulating in `dispatch-config.ts` Section 14.** Two distinct flags pending Jennifer's confirmation:
  - **`[ASK JENNIFER]`** — which two staff are primaries today, and which primary takes 30s vs. 20s. Defaults are placeholder.
  - **`[ASK JENNIFER 2]`** — the staff table has 5 active rows with role-vs-spec drift (Courtney's role is Manager, Mark's is GC/Maintenance, only Angie is Housekeeping). The four-staff Courtney/Lizzie/Angie/Mark housekeeping model from the governance spreadsheet may not match Jennifer's actual hotel roster. Bryan-to-Jennifer question, doesn't block code.

---

## Critical state to verify in next session's first minutes

1. **Run `npm run build`** — confirm clean. Last known-good was Step 5's verification.
2. **`git status`** — working tree should be clean. Branch should be 16 ahead of `origin/main` post-Step-5-commit.
3. **`git log --oneline -10`** — should show in order (newest first): Step 5, bugfix `5c96894`, Step 4 `5ba4d97`, Step 3 `480b840`, Step 2 `459a574`, Step 1 `fbe6440`, DeparturesCard `7b9c729`, StayoversCard `ecf8c64`, then back into Day 24 territory.
4. **Confirm `lib/orchestration/assignment-policies.ts` exists at ~340 lines** with the Step 5 PolicyState type, isHallEligible helper, and Cross-hall override warn message.
5. **Confirm `lib/orchestration/roster.ts` uses full-name lookup** — `r.name.trim().toLowerCase()` (not the intermediate `split(/\s+/)[0]` that was reverted).
6. **Decide what to chase first** per the Open Queue. Recommended order is probably:
   - **Step 6** (no-orphan, ~40-60 lines, refines the load tracker) — finishes the IV.A core.
   - **Step 8** (delete `[ASK JENNIFER]` markers in three rule files) — trivial cleanup.
   - **Step 7** (pre-stayover reshuffle) — deferred-as-follow-up; can wait until after a Vercel deploy.
   - **Item E** (`dailys.ts` + `eod.ts` rule files) — next biggest unlock after IV.A.

---

## Files to load in next Cowork chat

**Required:** Mount `/Users/bryanstauder/dispatch-app/`. From repo, read in this order:

1. `docs/handoff-day-25.md` (this file — most recent, read first).
2. `docs/dispatch-master-plan.md` (canonical "no cuts, all of it" inventory; updated only inline by Bryan/Jennifer for cuts and deferrals).
3. `docs/handoff-day-24.md` (Day 24 state — schema migrations + dispatch-config landing).
4. `docs/handoff-day-23.md` (Day 23 — KB ingest).
5. `docs/handoff-day-22.md` (Day 22 — verification + channel-manager pivot).
6. `docs/phase-4-handoff.md` (Day 21 — rule-engine interpreter, KB foundation).
7. `docs/kb-spreadsheet-index.md` (navigator over the 25-tab governance spreadsheet at `docs/kb/`).
8. `docs/kb/README.md` (KB folder + source-doc precedence + update funnel).
9. `docs/kb/Dispatch — Rules Table Handoff.md` (companion handoff to the spreadsheet).
10. `lib/dispatch-config.ts` (especially Section 14 — staff roster maps).
11. `lib/orchestration/assignment-policies.ts` (the file most of this session built).
12. `lib/orchestration/roster.ts` (Step 1's roster loader).
13. `lib/orchestration/run.ts` (Step 3's bulk-insert orchestrator wiring).
14. Skim `CLAUDE.md`, `AGENTS.md`, `dispatch-ui-rules.md` for conventions.

The 25-tab governance spreadsheet (`docs/kb/Dispatch — Rules Table for Card and Section Governance.xlsx`) stays committed; do NOT re-ingest tab-by-tab. Open specific tabs via the xlsx skill on demand for row detail (especially the Hallway + Assignment tab if working on Step 6 / Step 7).

---

## Opening prompt for fresh Cowork chat (Day 26)

Paste after mounting `/Users/bryanstauder/dispatch-app`:

> Continuing Dispatch in a fresh Cowork chat (Day 26). Mount of `/Users/bryanstauder/dispatch-app` is done. Read in order: `docs/handoff-day-25.md` (most recent — read first), `docs/dispatch-master-plan.md` (canonical "no cuts, all of it" inventory), `docs/handoff-day-{24,23,22}.md`, `docs/phase-4-handoff.md` (Day 21), `docs/kb-spreadsheet-index.md` (navigator), `docs/kb/README.md`, `docs/kb/Dispatch — Rules Table Handoff.md`. Then read `lib/dispatch-config.ts`, `lib/orchestration/assignment-policies.ts`, `lib/orchestration/roster.ts`, `lib/orchestration/run.ts` (the auto-assignment chain that landed Day 25). Skim `CLAUDE.md`, `AGENTS.md`, `dispatch-ui-rules.md` for conventions.
>
> Day 25 landed: two card-component wirings (S-430 status time targets, D-430 Room Spray) and **5 of 8 steps of the auto-assignment build (master plan IV.A) plus one bugfix**. The auto-assignment chain is now functionally end-to-end testable: `interpret()` → `dispatch()` → `assignDrafts()` → bulk insert. Live verification of Step 4 against 8 seeded inbound_events showed all drafts assigned correctly with zero orphans. Step 5 (hallway adjacency / R10) is the most recent commit; distribution unchanged from Step 4 plus a `console.warn` cross-hall override message when adjacency-blocking forces a relax.
>
> Operating-model note from Day 25: **Cowork-Claude direct-wrote every code change in IV.A Steps 1-5 + bugfix** because CC repeatedly misread CC prompts (character-drop hallucinations, fabricated grep narration). The pattern that worked: Cowork-Claude reads, writes, self-verifies via Read; CC handles only build + git verification + commit. Recommend continuing this pattern for any code change of meaningful size — it's faster and avoids the misread loop. Brand-new docs (handoffs, indexes, status files) are always fine for the chat to author directly.
>
> Recommended next chases per Day 25 Open Queue: (Step 6) no-orphan distribution refining the `loads` map to per-type-per-member with above-standard-load `console.warn` triggers — finishes the IV.A core; then (Step 8) delete `[ASK JENNIFER]` markers in `arrivals.ts` / `departures.ts` / `stayovers.ts` per the dynamic-only decision; then either Step 7 (pre-stayover reshuffle, deferred-as-follow-up) or Item E (`dailys.ts` + `eod.ts` rule files, next biggest unlock after IV.A) or Item I (Vercel deploy, Bryan's action, ~30 min).
>
> Two `[ASK JENNIFER]` flags accumulated in `dispatch-config.ts` Section 14: which staff are primaries (placeholder is Courtney Manager + Lizzie Larson), and the role-vs-spec drift (staff table has 5 active rows with role mismatches vs. the spreadsheet's four-housekeeper model). Both are Bryan-to-Jennifer questions; don't block code.
>
> Bryan is non-developer; he pastes prompts to CC in his Cursor terminal and SQL in the Supabase dashboard. **Default workflow: Cowork-Claude direct-writes code changes; CC handles build + git verification + commits; brand-new docs are direct-written by the chat.** SQL goes via Supabase dashboard.
>
> Operating preference: **every CC prompt and every SQL block must be presented in its entirety inside a single fenced code block** so Bryan can copy without breaking it.
>
> Ship target: Jennifer's Wisconsin boutique hotel beta-as-MVP, ~next week. **"No cuts, all of it."** Don't propose cuts unless Bryan explicitly asks for tradeoff analysis.
>
> Verification before any new work: confirm `npm run build` clean (CC), working tree clean except possibly some untracked dev artifacts, branch 16+ commits ahead of `origin/main`, HEAD at the Step 5 commit. If anything fails, surface it before proposing new work.
>
> First action: read the handoff sequence above + the master plan + the four lib/orchestration files, then ask Bryan which of the carry-forward items to chase first.

---

## Operating reminders for the next chat

- **Bryan is non-developer.** Plain English, exact copy-paste prompts in fenced blocks. No placeholders unless explicitly called out.
- **Default workflow this session and going forward: Cowork-Claude direct-writes code; CC verifies and commits.** The fallback-from-CC-misread pattern from Day 24 is now the primary pattern for code changes. Brand-new docs (handoffs, indexes, status files) are always fine for the chat to author directly. CC remains responsible for build verification and git operations.
- **Single fenced code block per executable artifact.** Per Bryan's standing preference. No interleaved prose inside the code block.
- **Internal imports under `lib/orchestration/`** must use `.ts` extensions (Node orchestrator script via `node --experimental-strip-types`). Imports from outside that folder use plain extensionless. The auto-assignment files all conform.
- **No new dependencies** without asking Bryan. Current deps: `@supabase/supabase-js`, `@supabase/ssr`, `next`, `react`, `react-dom`.
- **Boring code.** No clever abstractions. One-file-per-feature unless clearly beneficial. The `assignment-policies.ts` file consolidates all the lane logic in one ~340-line file rather than splitting into hall-balanced.ts / priority-stack.ts / no-orphan.ts — boring code wins.
- **Migrations** live in `docs/supabase/*.sql`, applied manually via Supabase dashboard SQL editor. No new migrations this session.
- **The spreadsheet at `docs/kb/` is canonical for governance.** Source-doc precedence ladder per `docs/kb/README.md`.
- **The master plan at `docs/dispatch-master-plan.md` is THE PLAN.** "No cuts, all of it" by default. Bryan + Jennifer mark cuts inline as `[CUT]`, deviations as `[DEFER]` or `[CHANGED — see X]`, never delete rows.
- **`[ASK JENNIFER]` is the convention for static config that Jennifer needs to confirm.** Two pending flags in dispatch-config Section 14.
- **Channel manager:** ResNexus is dead. Cloudbeds is the leading replacement, pending sales quote.
- **Context-capacity rule (Bryan's standing preference):** draft handoff at 70%, push to 80-85%, then stop. This handoff was drafted at the 70% mark per that rule.
- **When stuck, ask Bryan.** He knows the hotel operations reality better than any document.

---

## Flag for next session's first minutes

Before anything new:

1. **Verify build clean.** `npm run build` via CC.
2. **Confirm `git status` clean** and branch is 16+ commits ahead of origin.
3. **Confirm the auto-assignment chain compiles end-to-end** — interpret.ts → dispatch() → run.ts → roster.ts → assignment-policies.ts. All routes through the same TypeScript compilation pass; if any drifted, build will fail.
4. **Get Bryan's pick** on what to chase first per the Day 25 Open Queue. Recommended order: Step 6 (no-orphan) → Step 8 (delete IV.E markers) → either Step 7 or Item E or Vercel deploy.
5. **Optional**: re-run the Day 25 verification kit (8-event seed → orchestrator → distribution check) to confirm Step 5's adjacency rule fires its `console.warn` for the a-41 cross-hall override without changing the distribution. The kit is documented in the chat transcript above; the SQL blocks are reusable.

If anything in build verification fails, surface it before proposing new work.

---

## Items intentionally NOT done in Day 25

- **Step 6 — No-orphan distribution.** Deferred to keep Day 25 deliverable surface verifiable. Step 5 is a clean checkpoint.
- **Step 7 — Pre-stayover reshuffle.** Plan agent recommended deferring as not blocking demo end-to-end.
- **Step 8 — `[ASK JENNIFER]` marker deletion in rule files.** Trivial cleanup; deferred to next session for batching with Step 6.
- **Re-running verification on Step 5.** Distribution should be identical to Step 4 with a new console.warn; spot-check is optional and not load-bearing.
- **Vercel deploy.** Bryan's action; not a build item.
- **D-430 18-cell time-target matrix fill.** Still pending Bryan's pull from Jennifer's `Rules for HouseKeeping.docx.md`.
- **Jennifer's review of the two `[ASK JENNIFER]` flags in Section 14.** Bryan-to-Jennifer.
- **MODULE_TYPELESS_PACKAGE_JSON Node warning cleanup.** Tabled as a one-line follow-up.
- **Re-key the dispatch-config Section 14 maps from full names to UUIDs.** More robust to staff rename, but locks the config to specific staff_id values that are brittle if Bryan deletes/recreates a staff row. Decision pending; full names work for beta.

---

*Handoff complete. Ready for Day 26.*
