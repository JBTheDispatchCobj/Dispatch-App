# UI / Build Handoff — Dispatch Day 26 (2026-05-05)

*Continuation handoff for a fresh Cowork chat. Supplements — does not replace — `docs/handoff-day-25.md` (Day 25 state), `docs/handoff-day-{24,23,22}.md`, `docs/phase-4-handoff.md` (Day 21), and `docs/dispatch-master-plan.md` (the canonical "no cuts, all of it" inventory). Read those alongside this one. The 25-tab governance spreadsheet at `docs/kb/` is canonical for governance rules.*

*Date: 2026-05-05, Day 26. Session straddled the Day 25 → Day 26 date rollover; commits are tagged Day 26 since the substantive code work landed after the date change. Continued the Cowork-Claude direct-write pattern from Day 25 — every code change in this session was direct-written by the chat; CC handled only build + git verification + commits + the final push to origin.*

---

## What landed in Day 26

Four commits between HEAD-at-session-start (`817306d`, the Day 25 Step 5 commit) and HEAD-at-session-end (`3924070`). Pushed to `origin/main` at end of session — `git rev-list --count origin/main..HEAD` is now 0.

### Commit 1 — Day 25 handoff doc commit (deferred housekeeping)

- **`78cb6eb` — Day 25: handoff doc.** The Day 25 handoff was authored at end of Day 25 but never committed before the session closed. Day 26 opened with the file untracked. Committed as the first action so the working tree was clean before any Day 26 code work began.

### Commit 2 — Step 6 (master plan IV.C / R11 — no-orphan distribution)

- **`6041778` — Day 26 IV.A Step 6: no-orphan distribution (per-type load tracker + above-standard warn).** `lib/orchestration/assignment-policies.ts` (+122 / -21, file now 497 lines). Refines the per-batch load tracker from total-per-member to per-type-per-member so each member can be evaluated against `STANDARD_LOAD_PER_HOUSEKEEPER` thresholds (5 dep / 10 stay / 15 daily). New `LoadCounts` type, `LoadKey` alias, `cardTypeToLoadKey`, `zeroLoadCounts`, `getTotalLoad`, `incrementLoadAndWarn` helpers. Picker logic itself unchanged — `pickLighterFromUnfiltered` keeps comparing lighter-loaded by total drafts (now via the `getTotalLoad` helper to avoid drift between an explicit total field and per-type counters). What's new is per-pick instrumentation: after a pick increments the relevant type bucket, if `count > threshold`, emit `console.warn` flagging the above-standard pick. `arrival` / `eod` / `maintenance` / `general_report` drafts land in `"other"`, which has no threshold and never warns. Per-pick warn semantics matches Step 5's cross-hall override pattern. Imports `STANDARD_LOAD_PER_HOUSEKEEPER` from dispatch-config.

### Commit 3 — Step 8 (master plan IV.E — dynamic-only assignment cleanup)

- **`8007081` — Day 26 IV.A Step 8: drop specific_member_id [ASK JENNIFER] markers.** `lib/orchestration/rules/{arrivals,departures,stayovers}.ts` (3 deletions across 3 files). One `// specific_member_id: [ASK JENNIFER]` comment line removed from each rule file's `assignment` block. Per the dynamic-only decision (Q5 default during Day 25's IV.A Step 1 planning pass): the assignment-policies layer fully owns assignment, so static `specific_member_id` markers are obsolete. The OTHER 14 `[ASK JENNIFER]` markers in those files (timing windows, priority boost wording, room scope, context attachment, DND/late-checkout notes) are unrelated open questions for Jennifer — those stay. `specific_member_id` no longer appears anywhere in the three rule files post-commit.

### Commit 4 — Step 7 (master plan IV.D + R09 unified — priority_tier reshuffle)

This was the most product-load-bearing step of the eight in IV.A and the largest deviation from the original Day 25 framing. Day 25's handoff queued Step 7 as "deferred-as-follow-up; not blocking demo end-to-end" with the original spec being a one-time 11am pass to push stayovers + arrivals over remaining departures. Day 26 reframed it after Bryan supplied the operational rule.

**Bryan's product clarification (the rule, in three priority tiers):**
- **Tier 1 (turnover required):** Departure tasks (`card_type === "housekeeping_turn"`) whose room has a same-day arrival booking. Highest priority — surfaces at the top of the Departures bucket. Same-day-arrival rooms must be cleaned and ready.
- **Tier 2 (standard):** Stayover and arrival tasks. Standard priority. Internal order within these buckets is unchanged (still by `due_date`).
- **Tier 3 (whenever):** Departure tasks WITHOUT a same-day arrival. Lowest priority — "done whenever" per Bryan: housekeeper is expected to defer these until after stayovers and arrivals, picked back up before the dailys / EOD lane. Sorts to the bottom of the Departures bucket.
- **null:** Every other card_type (`start_of_day`, `dailys`, `eod`, `maintenance`, `general_report`). NULLS LAST in the staff home sort.

This unified two governance rows that had previously been scoped as separate steps: **R09 (departure cross-cutting bumps)** and **R15 (pre-stayover reshuffle)**. R09's first cross-cutting bump was already "same_day_arrival jumps queue regardless of status" — Bryan's clarification connects R09 (assignment-time order) and R15 (within-housekeeper queue order) under a single same-day-arrival check.

**"Ever-changing" semantics:** the reshuffle phase runs after `assignDrafts()` on every orchestrator run. The orchestrator runs on every relevant inbound_event plus a periodic schedule, so `context.priority_tier` always reflects current bookings. **Deferred-but-noted future improvement** (Bryan opted to keep a note rather than build it now): a polling refresh on the staff home itself that re-reads priority_tier between orchestrator runs, for live freshness on lower-frequency event types. Captured in the reshuffle.ts header comment.

**Cross-bucket flow encoded via Arrivals-done re-activation:** the visual bucket order on the staff home stays time-arc-locked per `dispatch-ui-rules.md`. The FLOW order — which bucket the active state cycles through — gets the new shape (Tier 1 deps → Stayovers → Arrivals → Tier 3 deps → Dailys → EOD). This is encoded in `handleActionClick`: when the housekeeper marks Arrivals done, if Departures still has incomplete tasks, re-activate Departures (clear `"d"` from the `done` Set, set active to `"d"`). Otherwise normal advance per `BUCKET_ORDER`.

- **`3924070` — Day 26 IV.A Step 7: priority_tier reshuffle (R09 + R15) + Arrivals-done re-activation.** Three files, +285 insertions.
  - **`lib/orchestration/reshuffle.ts`** (new file, ~190 lines). Exports `reshuffle(client)` and `computePriorityTier(task, rooms)`. One pass over every active task on shift; computes Tier 1/2/3/null per the rule; writes `context.priority_tier` only when it differs from current (minimizes round-trips). Loads same-day arrival rooms via a service-role query against `reservations` (status in confirmed/arrived; arrival_date = today in property tz). Inlined `todayInPropertyTz` + same-day-arrival query rather than calling `lib/reservations.ts` helpers because that module imports the browser Supabase client; orchestrator runs with the service-role client.
  - **`lib/orchestration/run.ts`** (+20 lines). Imports `reshuffle`. Calls `reshuffle(client)` after the bulk-insert, only when `dryRun=false` (dry-run inserts go to `task_drafts`, but reshuffle reads `tasks`; mixing the signals would confuse dry-run preview). Logs tier counts + tasks_updated.
  - **`app/staff/page.tsx`** (+26 lines). `loadTasks` order clause now sorts by `context->priority_tier` ASC NULLS LAST, then `due_date` ASC. `handleActionClick` checks the Arrivals-done case: when `key === "a" && bucketData.d.count > 0`, clear `"d"` from `done` and set active to `"d"`.

**Step 6-follow / Step 7-follow / Step 5-follow** — all three carry the same TODO: replace the per-pick `console.warn` lines (no-orphan above-standard, cross-hall override) with structured audit events once the III.D activity feed is online. Captured in each helper's JSDoc.

### Operating-model — CC misread surfaced once

Same character-drop pattern from Day 24/25. After the Step 6 edit on `assignment-policies.ts`, CC's first commit prompt run reported "Working tree: clean — no other files staged or modified" while its own `git status` output (truncated in the chat by CC's UI summarization) clearly showed `lib/orchestration/assignment-policies.ts` as modified-and-unstaged. Cowork-Claude direct-verified via bash, found 122 insertions / 21 deletions on disk, 10 "Step 6" markers in the file. Re-ran a tighter CC prompt that separated build verification from commit; that landed cleanly. The Day 25 pattern (Cowork-Claude direct-writes + reads + self-verifies; CC handles only build + git + commits) continues to hold. Bash output is ground truth; CC's editorial commentary stays unreliable.

One unrelated git index lock recovery happened during the Step 7 commit phase (a stale `.git/index.lock` from a prior CC process). CC removed it via `rm .git/index.lock` and the commit proceeded. Routine recovery, no data lost.

---

## State of the build at end of Day 26

**Working tree clean. Branch matches origin/main exactly (0 ahead, 0 behind).** Day 26 closed by pushing all four commits to origin: Day 25 handoff doc + Step 6 + Step 8 + Step 7. The push verbatim: `fa834a1..3924070  main -> main`.

**Build clean across the session.** `npm run build` ran four times (post-Step 6, post-Step 8, post-Step 7, plus a build-only verification before Step 7's commit). 21 routes, zero errors, zero warnings every time.

**IV.A is now complete (Steps 1-8).** The auto-assignment chain is functionally end-to-end: `interpret()` → `dispatch()` → `assignDrafts()` → bulk insert into `tasks` (or `task_drafts` on dry-run) → `reshuffle()` writes priority_tier. The staff home reads `context->priority_tier` as the primary in-bucket sort and uses the Arrivals-done re-activation to encode the cross-bucket flow.

**No schema changes this session.** `priority_tier` lives in the existing `tasks.context` JSONB blob — no migration needed.

**Untouched documentation** — `docs/dispatch-master-plan.md`, `docs/handoff-day-{22,23,24,25}.md`, `docs/phase-4-handoff.md`, `docs/kb/...` are all unchanged from Day 25. `docs/handoff-day-26.md` (this file) is the only new doc this session.

---

## Open queue (Day 26 carry-forward)

### Master-plan items still on the build queue

- **A. Item E — author empty `dailys.ts` + `eod.ts` rule files (master plan IV.F).** Both are currently empty arrays; the orchestrator can't generate Da-430 or E-430 cards. Specs are in the Da-430 (18 rows) and E-430 (14 rows) governance tabs (read via xlsx skill on demand). **PARTIALLY BLOCKED.** Both card creation rules trigger on shift open / clock-in (per Da-430 R03 "One per shift per assigned housekeeping" + E-430 R03 "One per shift per clocked-in housekeeper, on clock-in"). Per master plan I.C, the clock-in flow is PARTIAL — the CTA exists but the event-write that the orchestrator would consume doesn't. Two unblocking paths exist: (1) wire clock-in to write an `inbound_event` of `event_type: 'shift_start'` per housekeeper per shift; (2) bypass clock-in entirely and generate dailys+eod cards on a daily orchestrator run for every active staff row, treating "active staff row" as proxy for "scheduled today." Option 2 is the simpler beta path. Even with option 2, the Dailys card renders as "Section pending — rules being authored" until Jennifer authors the daily/weekly/monthly task content (master plan VI.G); E-430's Affirmation line needs a preset list (VI.C). So Item E ships rule scaffolding now; rendering gets richer as KB content lands.

- **B. Item I — Vercel deploy (master plan VIII.A).** Bryan's action, ~30 min via `docs/deployment/vercel-checklist.md`. GitHub push complete (Day 26 pushed today's four commits to origin). Next: Vercel CLI install + login → first preview deploy → env vars (incl. `AGENT_KILL=true` + `AGENT_DRY_RUN=true` for safety) → `vercel --prod` → Supabase magic-link redirect URL config → smoke test in incognito → URL to Jennifer. Doesn't require any code changes from a fresh chat. Can run in parallel with Item E.

- **C. D-430 18-cell time-target matrix fill (master plan IV.G + VI.F).** Still pending Bryan's pull from Jennifer's `Rules for HouseKeeping.docx.md`. ~10-minute surgical edit when the matrix arrives.

- **D. Wave 4D Notes UI (master plan III.A).** Schema landed Day 24; UI is unbuilt. LinkedIn-mobile-comment style compose drawer + 11 Note Type dropdown + dual-sink routing.

- **E. BR4 — wire X-430 briefs to live reservation data (master plan V.A).** Per-card edits to fall back to `getCurrentReservationForRoom()` / `getNextIncomingReservationForRoom()` when `task.context.{incoming_guest, current_guest, outgoing_guest}` is missing.

- **F. Cloudbeds quote (Bryan's action, not a build item).** Channel manager pending sales call.

### Step-follow TODOs (all blocked on III.D activity feed)

- **Step 5-follow:** replace the cross-hall console.warn in `pickByLighterLoad` with a structured audit event.
- **Step 6-follow:** replace the above-standard console.warn in `incrementLoadAndWarn` with a structured audit event.
- **Step 7-follow:** structured audit log entries per reshuffle pass (which tasks changed tier, when, why).

All three become straightforward once III.D lands. None blocks demo end-to-end.

### Deferred-but-noted

- **G. Polling refresh on staff home for live priority_tier freshness.** Bryan opted to keep a note rather than build it now. Captured in `lib/orchestration/reshuffle.ts` header comment. Useful if reservation events arrive at a lower frequency than the orchestrator schedule — the staff home would re-read tier between orchestrator runs.

### Tabled items

- **H. `MODULE_TYPELESS_PACKAGE_JSON` Node warning** on `npm run orchestrate` and Cowork-Claude's `node --experimental-strip-types` parse-checks. Harmless. One-line follow-up if you want to quiet it (add `"type": "module"` to package.json or rename script extensions).
- **I. Two `[ASK JENNIFER]` flags in `dispatch-config.ts` Section 14.** Carried over unchanged from Day 25:
  - Which two staff are primaries today, and which primary takes 30s vs. 20s. Defaults are placeholder.
  - Role-vs-spec drift. Staff table has 5 active rows with role mismatches vs. the spreadsheet's four-housekeeper model. Bryan-to-Jennifer question.
- **J. Re-key `dispatch-config.ts` Section 14 maps from full names to UUIDs.** Decision pending; full names work for beta.

---

## Critical state to verify in next session's first minutes

1. **Run `npm run build`** — confirm clean. Last known-good was Step 7's verification end-of-Day-26.
2. **`git status`** — working tree should be clean. Branch should be at exactly `0 ahead, 0 behind` of `origin/main`.
3. **`git log --oneline -5`** — should show in order (newest first): `3924070` (Step 7), `8007081` (Step 8), `6041778` (Step 6), `78cb6eb` (Day 25 handoff doc), `817306d` (Day 25 Step 5).
4. **Confirm `lib/orchestration/reshuffle.ts` exists at ~190 lines** with the priority-tier rule (Tier 1 / 2 / 3 / null) and the same-day-arrival lookup.
5. **Confirm `app/staff/page.tsx` order clause** is sorting by `context->priority_tier` ASC NULLS LAST then `due_date`, AND that `handleActionClick` has the Arrivals-done re-activation block.
6. **Decide what to chase first** per the Open Queue. Recommended order:
   - **Item I (Vercel deploy)** — Bryan's action, parallel-izable. Gets a real URL into Jennifer's hands.
   - **Item E (`dailys.ts` + `eod.ts` rule files)** — biggest remaining unlock. Use option 2 (bypass clock-in for beta) and treat active staff rows as proxy for scheduled.
   - **Item C (D-430 matrix fill)** — quick win if Bryan has Jennifer's Rules.md content.
   - **Items D / E** (Notes UI / BR4 reservation fallback) — meaningful surface-level polish for beta.

---

## Files to load in next Cowork chat

**Required:** Mount `/Users/bryanstauder/dispatch-app/`. From repo, read in this order:

1. `docs/handoff-day-26.md` (this file — most recent, read first).
2. `docs/dispatch-master-plan.md` (canonical "no cuts, all of it" inventory; updated only inline by Bryan/Jennifer for cuts and deferrals).
3. `docs/handoff-day-25.md` (Day 25 — IV.A Steps 1-5 + bugfix).
4. `docs/handoff-day-24.md` (Day 24 — schema migrations + dispatch-config landing).
5. `docs/handoff-day-23.md` (Day 23 — KB ingest).
6. `docs/handoff-day-22.md` (Day 22 — verification + channel-manager pivot).
7. `docs/phase-4-handoff.md` (Day 21 — rule-engine interpreter, KB foundation).
8. `docs/kb-spreadsheet-index.md` (navigator over the 25-tab governance spreadsheet at `docs/kb/`).
9. `docs/kb/README.md` (KB folder + source-doc precedence + update funnel).
10. `docs/kb/Dispatch — Rules Table Handoff.md` (companion handoff to the spreadsheet).
11. `lib/dispatch-config.ts` (especially Section 14 — staff roster maps with two `[ASK JENNIFER]` flags).
12. `lib/orchestration/assignment-policies.ts` (~497 lines — Steps 1-6 + 8).
13. `lib/orchestration/reshuffle.ts` (~190 lines — Step 7 priority-tier writer).
14. `lib/orchestration/roster.ts` (Day 25 Step 1 — roster loader).
15. `lib/orchestration/run.ts` (Day 25 Step 3 + Day 26 Step 7 — bulk-insert + reshuffle wiring).
16. `app/staff/page.tsx` (Day 26 Step 7 — order clause + Arrivals-done re-activation).
17. Skim `CLAUDE.md`, `AGENTS.md`, `dispatch-ui-rules.md` for conventions.

The 25-tab governance spreadsheet (`docs/kb/Dispatch — Rules Table for Card and Section Governance.xlsx`) stays committed; do NOT re-ingest tab-by-tab. Open specific tabs via the xlsx skill on demand.

---

## Operating reminders for the next chat

- **Bryan is non-developer.** Plain English, exact copy-paste prompts in fenced blocks. No placeholders unless explicitly called out.
- **Default workflow: Cowork-Claude direct-writes code; CC verifies and commits.** Day 25's pattern continued cleanly through Day 26. Brand-new docs (handoffs, indexes, status files) are direct-written by the chat. CC remains responsible for build verification and git operations.
- **Single fenced code block per executable artifact.** Per Bryan's standing preference. No interleaved prose inside the code block.
- **CC misread pattern is alive.** When CC's narration disagrees with its own bash stdout, trust bash. Day 26 saw one instance (Step 6 commit phase). Cowork-Claude's habit of direct-verifying via `mcp__workspace__bash` after CC reports caught it.
- **Internal imports under `lib/orchestration/`** must use `.ts` extensions (Node orchestrator script via `node --experimental-strip-types`). Imports from outside that folder use plain extensionless. Step 7's reshuffle.ts conforms.
- **No new dependencies** without asking Bryan. Current deps: `@supabase/supabase-js`, `@supabase/ssr`, `next`, `react`, `react-dom`.
- **Boring code.** No clever abstractions. One-file-per-feature unless clearly beneficial.
- **Migrations** live in `docs/supabase/*.sql`, applied manually via Supabase dashboard SQL editor. No new migrations this session.
- **The spreadsheet at `docs/kb/` is canonical for governance.** Source-doc precedence ladder per `docs/kb/README.md`.
- **The master plan at `docs/dispatch-master-plan.md` is THE PLAN.** "No cuts, all of it" by default. Bryan + Jennifer mark cuts inline as `[CUT]`, deviations as `[DEFER]` or `[CHANGED — see X]`, never delete rows.
- **`[ASK JENNIFER]` is the convention for static config that Jennifer needs to confirm.** Two flags carry forward in dispatch-config Section 14.
- **Channel manager:** ResNexus is dead. Cloudbeds is the leading replacement, pending sales quote.
- **Context-capacity rule (Bryan's standing preference):** draft handoff at 70%, push to 80-85%, then stop. This handoff was drafted right around the 70% mark per that rule.
- **When stuck, ask Bryan.** He knows the hotel operations reality better than any document.

---

## Items intentionally NOT done in Day 26

- **Item E — `dailys.ts` + `eod.ts` rule files.** Scoped during Day 26 but pivoted away from after the spec read showed partial blocking on master plan I.C (clock-in event source) + Jennifer's KB authoring. Recommended option-2 unblocking path (daily orchestrator fan-out per active staff row) is documented above for the next chat to execute.
- **Step 7 polling refresh on staff home.** Bryan explicitly opted to keep a note rather than build it now. Captured in reshuffle.ts header comment.
- **Step 5/6/7-follow structured audit events.** All three blocked on III.D activity feed.
- **D-430 18-cell time-target matrix fill.** Still pending Bryan's pull from Jennifer's `Rules for HouseKeeping.docx.md`.
- **Two `[ASK JENNIFER]` flags in Section 14 resolution.** Bryan-to-Jennifer.
- **MODULE_TYPELESS_PACKAGE_JSON Node warning cleanup.** Tabled as a one-line follow-up.
- **Re-key dispatch-config Section 14 maps from full names to UUIDs.** Decision pending; full names work for beta.
- **Vercel deploy.** Bryan's action; not a build item.

---

*Handoff complete. Ready for Day 27.*
