# UI / Build Handoff — Dispatch Phase 4 (Day 21)

*Continuation handoff for a fresh Cowork chat. Supplements — does not replace — the Phase 3 handoff (`docs/phase-3-handoff.md`), the six per-card audits (`docs/phase-3-{slug}-mapping.md`), the visual handoffs (Day 12 → Day 20), the Profile surfaces handoff, and `dispatch-ui-rules.md`. Upload those alongside this one if context allows; if running tight, see the trim option below.*

*Date: end of session, 2026-05-02. The session prior was Day 20 (staff home rebuild + Track 2 Phase 2 task wiring). This session was Day 21 — Phase 4 build push, no UI work.*

---

## What this doc is

Continuation handoff capturing the state at end of Day 21. This session was a **build / data layer / automation push** — no visual design work. The previous Cowork chat (Day 20) shipped the staff home stack and queued Track 2 Phase 2 (real task data wiring) for CC. This session picked up after Phase 2 had landed and pushed forward across multiple tracks in parallel.

Core ship target: Jennifer's Wisconsin boutique hotel, beta-as-MVP, ~next week.

---

## Session scope — build + data, not visual

Bryan and Cowork-Claude pair-engineered through CC (Claude Code in Cursor terminal). Cowork-Claude had direct file access to `/Users/bryanstauder/dispatch-app/` and authored most code edits directly via the Edit / Write tools, while CC handled verification builds, the cross-card P4-001 → P4-004 mechanical edits, and any work that required terminal context.

The pattern that held: Cowork-Claude reads the codebase + audit docs, drafts CC prompts or authors files directly, Bryan pastes prompts to CC and runs SQL in Supabase, CC reports back, Cowork-Claude triages and continues.

---

## What landed in Day 21

### Wave 4A — shared formatters + cleanup (CC, mostly)

- `lib/staff-card-formatters.ts` (new) — exports `formatCommentTime`, `formatTodayDate`, `formatSodDateShort`, `firstNameFromDisplayName`. Used across the X-430 card components.
- Wired into `ArrivalsCard.tsx`, `StayoversCard.tsx`, `DailysCard.tsx`, `EODCard.tsx`, `StartOfDayCard.tsx`. (DeparturesCard intentionally not wired — no comment/feed format needs.)
- Topstrip ＋ button **removed** from all six X-430 cards (per every audit's drop decision). Each file has a comment confirming the drop.
- Footer `.foot` debug labels (`"D-430 · Departures · Neon Teal"` etc.) **removed** from all six cards.
- `CLAUDE.md` updated: Beta scope lock now lists six buckets (was four); cut list no longer mentions `dailys`/`eod`; new sections "What shipped in Phase 3" and "Phase 4 in flight" added. Two stale lines remain (line 96 says "four buckets" in the folder map; the `## Immediate priorities (Day 1)` section is superseded). A small follow-up cleanup prompt was provided but may not have been pasted yet — see Open Items below.

### Wave 4B — KB foundation (Cowork-Claude direct edits)

- `lib/checklists/types.ts` — `RoomType` enum updated to Jennifer's six classes: `single_queen | double | ada_double | jacuzzi | ada_jacuzzi | suite | unknown`. Old `queen | king | suite | cabin` is gone.
- `lib/checklists/rooms.ts` — full room-number → class mapping per Jennifer's "Alternatives to the standard lists" doc:
  - single_queen: 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41
  - double: 22, 24, 28, 32, 34, 36
  - ada_double: 26
  - jacuzzi: 38
  - ada_jacuzzi: 42
  - suite: 43
- `lib/checklists/with-additions.ts` (new) — helper that takes a base `ChecklistNode` tree + a `Record<id, ChecklistNode[]>` map of additions, returns a deep-cloned tree with extras appended at matching IDs. Lets variant files express deltas on top of single_queen without re-stating the full tree.
- `lib/checklists/variants/single_queen.ts` (new, ~480 lines) — full structural trees for `housekeeping_turn`, `arrival`, `stayover` from Jennifer's KB docs. Section structure and item titles are canonical. `Tools` / `Chemicals` / `Photo` flags reflect what she's specified. Detail prose is `"Text to come"` placeholders pending her authoring pass — except the seasonal scent dates and the 3-pump room-spray instructions, which are real because she actually wrote those. `dailys` / `eod` / `maintenance` / `general_report` entries are placeholders (those card types aren't room-specific in her KB structure).
- `lib/checklists/variants/{double,ada_double,jacuzzi,ada_jacuzzi,suite}.ts` (new) — each extends single_queen via `withAdditions` per the Alternatives doc deltas (Second bed for Double, ADA Check section for ADA variants, Carpet/Jacuzzi tub/Robes for Jacuzzi, Kitchen/Living room/Dining/Sofa/Second bedroom for Suite).
- `lib/checklists/variants/queen.ts` — collapsed to a one-line backward-compat shim: `export { singleQueenChecklists as queenChecklists } from "./single_queen";`. Prevents any stale import path from breaking.
- `lib/checklists/resolve.ts` — routes by `RoomType` to the right variant. Unknown rooms fall back to single_queen so the drill-down isn't ever empty.

### S-430 + D-430 status pills locked to display-only (CC, with Bryan's call)

- Bryan locked: staff cannot toggle stayover statuses (DND / Guest OK / Desk OK / Sheet Change / Done) or departure statuses (Open / Sheets / Stripped / Done). Both are admin/system-set upstream.
- S-430 was already shipped as `<span>` (display-only) per Phase 3 — no change needed.
- D-430 had interactive `<button>` pills with `onSetDepartureStatus` callback that mutated `task.context.departure_status` via Supabase. CC removed: the `useCallback`, the `useState<DepartureStatus>` for the editable copy, the `useState<boolean>` for `statusBusy`, the `logTaskEvent` import (no longer used), and converted `<button>` → `<span>`. Active pill is now derived directly from `task.context.departure_status` via the existing `parseDepartureStatus` function. Build clean.
- Status sub-label still reads `"Status"`. Could swap to `"System set"` later when there's an admin path that mutates these — not blocking.

### Reservations BR1 + BR2 + BR3 (Cowork-Claude direct edits + Supabase SQL)

- `docs/supabase/reservations_br1.sql` (new) — applied successfully in Supabase. Creates `public.reservations` table with full lifecycle status (`confirmed | arrived | departed | cancelled | no_show`), guest fields (party_size, adults, children, pets, vip, return_guest, special_requests), stay fields (room_number, arrival/departure dates, arrival_time, generated `nights` column), source tracking (resnexus / manual / walk_in), audit (raw_payload, created_at, updated_at, cancelled_at). Indexes tuned for the three brief queries. Trigger auto-bumps `updated_at` and stamps `cancelled_at` on status flip. RLS: managers/admins all access; staff read-only.
- `docs/supabase/reservations_seed.sql` (new) — applied. Seeded 3 arrivals + 2 departures + 4 stayovers + 1 cancelled (the cancelled doesn't appear in brief queries, sanity check). Rooms used are all from Jennifer's actual catalog.
- `lib/reservations.ts` (new) — typed `Reservation` shape, `getTodaysArrivals` / `getTodaysDepartures` / `getTodaysStayovers`, plus `getTodaysReservationCounts` (used by staff home brief), `getCurrentReservationForRoom` and `getNextIncomingReservationForRoom` (intended for X-430 brief wiring — BR4, queued).
- Property timezone hardcoded to `America/Chicago` for Jennifer's Wisconsin hotel. Multi-property timezone is post-beta.
- `app/staff/page.tsx` — wired the daily brief card to `getTodaysReservationCounts()`. Initialized state to `{arrivals: 3, departures: 2, stayovers: 4}` as graceful fallback so the page works even if the reservations table doesn't exist or RLS errors. `console.warn` if the live fetch fails.

### Wave 4F core — rule engine interpreter (Cowork-Claude direct edits)

- `lib/orchestration/interpret.ts` (new) — the core: `interpret(rule: GenerationRule, event: InboundEvent): TaskDraft | null`. Matches event by `trigger.event_type`; applies room scope filter (currently a no-op since rules don't set `room_scope.numbers` yet); derives title (arrivals lead with guest name, departures/stayovers lead with room number); derives due_time (deadline takes precedence over weekday/weekend start; weekend detection by day-of-week from event_date); builds context block per card_type (`incoming_guest` for arrivals, `current_guest` for stayovers, `outgoing_guest` for housekeeping_turn) plus required `staff_home_bucket`. Internal imports use `.ts` extensions for the Node orchestrator script.
- `lib/orchestration/rules/index.ts` — `dispatch()` rewritten to use the declarative path. Reads `allRules`, filters by event_type via `getRulesForEvent`, runs each match through `interpret()`. The old stub functions (`arrivalsRule`, `departuresRule`, `stayoversRule`) remain exported as dead code; harmless, can clean up later.
- `report_queue_status` bug fixed — interpreter now sets `'none'` (matches the `task_drafts` CHECK constraint allowing `'none' | 'pending' | 'reviewed'`); was empty string and failed inserts on first run.

**Verified end-to-end:** Bryan seeded inbound_events with 3 test events (arrival/departure/stayover for rooms 23, 25, 27). Ran `AGENT_KILL=false npm run orchestrate`. The orchestrator produced 6 drafts (3 fresh + 3 left over from earlier seeds) into `public.task_drafts`. Spot-checked the rows — every draft has correct title, priority, weekend-aware due_time (today is Saturday so weekend_start fired), room_number, and a fully populated context block. Source = `'agent'`.

### Promote-drafts workflow (Cowork-Claude direct edits)

- `docs/supabase/promote_drafts_to_tasks.sql` (new) — defines two SECURITY DEFINER functions:
  - `promote_draft_to_task(p_draft_id uuid)` — copies one draft into `tasks`, deletes the draft, returns the new task id.
  - `promote_all_drafts_from_source(p_event_source text)` — bulk-promotes every draft whose source_event_id points to an inbound_event with the given source. Returns count.
- Bryan ran the helper and got `3` back from `promote_all_drafts_from_source('test')`. The 3 fresh drafts are now real `tasks` rows.

### Vercel deploy checklist (Cowork-Claude direct edits)

- `docs/deployment/vercel-checklist.md` (new) — step-by-step deploy walkthrough. GitHub push → Vercel CLI install + login → first deploy (preview) → env vars in Vercel dashboard (including `AGENT_KILL=true` and `AGENT_DRY_RUN=true` for safety) → `vercel --prod` → Supabase magic-link redirect URL configuration → smoke test in incognito → hand the URL to Jennifer. Includes common-gotcha section (path-alias errors, redirect URL pointing at localhost, service role key warning).

### Auxiliary edits

- `lib/checklists/types.ts` got the new `RoomType` (above).
- The CLAUDE.md edits (above).
- The D-430 cleanup (above).
- `app/staff/page.tsx` got 4 surgical edits (import / state / fetch in useEffect / replace literal numbers).

---

## Open items (queued, mid-flight, not blocking)

### To finish Wave 4A polish
- The CLAUDE.md cleanup follow-up prompt (line 96 "four buckets" in the folder map; the superseded "Immediate priorities (Day 1)" section). Tiny CC prompt was provided in the chat — Bryan can paste whenever.

### Rule engine assignments (`[ASK JENNIFER]` markers)
- The rule files (`arrivals.ts`, `departures.ts`, `stayovers.ts`) have `assignment.specific_member_id` commented out. Without it, the interpreter sets `staff_id: null` on every generated draft, which means promoted tasks don't appear on any staff home until someone assigns them. Bryan ran a manual SQL `update tasks set staff_id = '...' where source = 'agent'` to verify rendering.
- Real fix: fill in `specific_member_id` per Jennifer's policy, OR build assignment_policies (per the synthesis doc — hall-balanced, primary-only-when-3plus, etc.) and have the interpreter consult them. Synthesis doc has the policies; Jennifer's docs have the standard load (5 departures + 10 stayovers + 15 dailys per primary).
- `dailys.ts`, `eod.ts`, `maintenance.ts` rule files are empty arrays. Need rules authored from Jennifer's docs once she says what triggers them.
- `context_to_attach: []` is empty in every rule. The interpreter currently builds guest blocks via dedicated functions (`buildIncomingGuest` etc.) rather than relying on this field, so it works without — but if/when ResNexus payload shapes settle, populating `context_to_attach` is cleaner.

### BR4 — wire X-430 briefs to live reservation data
- Currently X-430 cards read `task.context.incoming_guest` etc. Tasks generated by the interpreter HAVE populated context (verified). Manual tasks might not — manager would need to fill in guest data by hand.
- BR4 would have each X-430 card fall back to `getCurrentReservationForRoom(task.room_number)` or `getNextIncomingReservationForRoom(task.room_number)` when `task.context` is missing the relevant block. Helpers already exist in `lib/reservations.ts`. Wiring is per-card edits.

### Track 1 — UI tracks queued from Day 20
- (a) Admin Staff Profile rebuild — sky-blue palette per Profile surfaces handoff
- (b) Drill-in middle layer — bucket-expanded tile-grid view between staff home and X-430 (Day 20 calls it "optional refinement, not a blocker")
- (d) Admin home rebuild — Courtney/Jennifer's `/admin` surface, cream + lanes

### BR5 — reservations cancellation / modification edge cases
- Soft-delete via `status='cancelled'` is in the schema. Briefs filter on `status in (confirmed, arrived)` so cancelled rows drop out automatically. BR5 would handle webhook re-fires, idempotency on modifications, and the trigger that currently stamps `cancelled_at` only on direct status flip — needs more care once real ResNexus payloads start flowing.

### Wave 4D — small schema additions (each unblocks a specific X-430 placeholder)
- `done_at` on `task_checklist_items` (so brow rows show "Done · 1:18 PM" instead of just "Done")
- `context.notes` (card-level free-text, distinct from comments feed; D-430 mapping Gap 2)
- `context.incoming_guest.extras: string[]` (A-430 Extras briefrow)
- `context.current_guest.service_type: string` (S-430 "Type" briefrow + date line)

### Wave 4E — real data verticals
- Maintenance issues (table + vocabularies + log-new-issue compose drawer wiring on D-430 / S-430)
- Supply needs (table + Wrap Shift handler on E-430)
- Deep clean tracking (table + D-430 DC tile rendering)
- Team roster (uses existing `staff` table + a "who's on shift" derived view; powers Da-430 / E-430 Team Updates rows + SOD-430 Team cell)
- Rotating phrases (small phrase libraries for E-430 wrap headlines and SOD-430 date-context lines)
- Next-shift data on E-430 (needs tomorrow's reservations + tomorrow's schedule)

### Vercel deploy
- `docs/deployment/vercel-checklist.md` walks through it. Bryan's action; ~30 min.
- After deploy: Supabase auth redirect URL configuration, smoke test, hand to Jennifer.

---

## Critical state to verify in next session's first minutes

1. **Run `npm run build`** at the start — confirm clean. The end of this session showed PASS, but verify nothing has drifted.

2. **Confirm the agent-generated tasks render on `/staff`** for whatever staff_id Bryan assigned them to. If yes, the rule engine → promote → render path works end-to-end.

3. **Confirm the staff home brief reads from live reservations**, not the hardcoded fallback. Open browser console at `/staff`; if you see `[staff-home] Reservation counts unavailable; using fallback`, the live fetch is failing — likely an RLS issue or the `reservations` table isn't applied in whichever Supabase project the deployed app points at.

4. **Check whether the CLAUDE.md cleanup prompt was run.** Two stale lines may still be there.

---

## Files to upload to the next Cowork chat

Required (oldest first, this doc last):

1. `dispatch-ui-rules.md`
2. `Day 12 Handoff.md`
3. `Artifact stuff.md`
4. `UI Handoff — Profile surfaces, reference + decisions.md`
5. `UI Handoff — Dispatch Visual Design, Day 16 Part 2.md`
6. `UI Handoff — Dispatch Visual Design, Day 16 Part 3.md`
7. `UI Handoff — Dispatch Visual Design, Day 17.md`
8. `UI Handoff — Dispatch Visual Design, Day 18.md`
9. `UI Handoff — Dispatch Visual Design, Day 19.md`
10. `UI Handoff — Dispatch Visual Design, Day 20.md`
11. `docs/phase-3-handoff.md` (if accessible)
12. `docs/phase-3-d-430-mapping.md` (and the other 5 phase-3-{slug}-mapping.md files)
13. **`docs/phase-4-handoff.md`** (this doc — most recent, read last)

Plus the synthesis docs from Bryan's earlier session if next chat will touch Jennifer's KB structure or rules:

14. `Dispatch — Architecture & Build Plan.md` (engineering reference — RETIRED as a build plan; reference only)
15. `Dispatch — Architecture & Build Plan Jennifer Friendly.md` (Jennifer-facing version of the same)

Plus Jennifer's KB docs if next chat will fill in `Detail: Text to come` placeholders:

16. `Stayover Standard KB Doc.docx.md`
17. `Arrival Standard KB Doc (1).docx.md`
18. `Knowledge Build Standard Departure.docx.md`
19. `Start of Day.docx.md`
20. `Alternatives to the standard lists.docx.md`
21. `Note Types.md`
22. `Maintenance Dropdowns (1) (2).docx`
23. `Rules for HouseKeeping.docx.md`

**Trim option for focused Day 22 sessions:** if the next session is purely build / data work, upload only:

1. `dispatch-ui-rules.md`
2. `UI Handoff — Dispatch Visual Design, Day 20.md`
3. **`docs/phase-4-handoff.md`** (this doc)
4. `docs/phase-3-handoff.md`

Plus whatever audit doc is most relevant if working on a specific X-430 card.

---

## Opening prompt for fresh Cowork chat (Day 22)

Paste after handoff docs are uploaded, AFTER granting the chat cowork directory access to `/Users/bryanstauder/dispatch-app`:

> Continuing Dispatch in a fresh Cowork chat. Handoff docs above through Day 21 (`docs/phase-4-handoff.md` is most recent — read it last; it captures the rule-engine interpreter, KB foundation for Jennifer's six room classes, reservations BR1-BR3, the promote-drafts workflow, and the Vercel deploy checklist).
>
> Production state at end of Day 21:
>
> - Wave 4A (shared formatters + drop ＋ + drop debug footers + S-430/D-430 status lock) shipped.
> - Wave 4B (KB foundation: RoomType taxonomy + rooms.ts mapping + 6 variant files + resolver) shipped via direct file edits from Cowork-Claude.
> - Reservations BR1+BR2+BR3 shipped — table, seed, helpers, staff home brief wired live. SQL applied in Supabase.
> - Wave 4F core shipped — rule-engine interpreter (`lib/orchestration/interpret.ts`), `dispatch()` rewritten to use `allRules`, end-to-end verified producing 6 valid drafts from 6 inbound events.
> - Promote-drafts SQL helper applied; verified by promoting 3 test drafts to real tasks.
>
> Bryan is non-developer; he pastes prompts to CC in the Cursor terminal and SQL in the Supabase dashboard. Cowork-Claude has direct file access to `/Users/bryanstauder/dispatch-app/` via the request_cowork_directory tool — use Read/Edit/Write directly for code; use CC for build verification, git operations, and any work needing terminal context.
>
> Ship target: Jennifer's Wisconsin boutique hotel beta-as-MVP, ~next week. Bryan's mantra is "no cuts, all of it." Don't propose cuts even when the timeline gets tight — surface trade-offs but execute.
>
> First minutes: confirm the open items in §"Critical state to verify" of the phase-4 handoff doc. Then ask Bryan which of the queued open items he wants to chase next.

---

## Operating reminders for the next chat

- **Bryan is non-developer.** Plain English, exact copy-paste prompts for CC in fenced code blocks, exact SQL for Supabase in fenced code blocks. No placeholders unless you call them out explicitly.
- **The pattern:** Cowork-Claude reads code directly via cowork directory access, drafts CC prompts or makes file edits directly, Bryan executes and reports back. CC handles verification builds, git ops, and any terminal-context work.
- **Tracks:** UI design lives in a parallel UI-only chat (per Day 19 / 20 docs — check whether that's still active). Build / data work lives in the Cowork chat. Don't bundle.
- **No new dependencies** without asking Bryan. Current deps: `@supabase/supabase-js`, `@supabase/ssr`, `next`, `react`, `react-dom`. That's it.
- **Boring code.** No clever abstractions. One-file-per-feature unless clearly beneficial.
- **Internal imports under `lib/orchestration/`** must use `.ts` extensions (the Node orchestrator script needs them — `node --experimental-strip-types`).
- **Migrations** live in `docs/supabase/*.sql`, applied manually via Supabase dashboard SQL editor. Not Supabase CLI. Don't try to convert.
- **Synthesis docs are reference, not plan.** The two `Dispatch — Architecture & Build Plan*` docs describe what Jennifer wants the system to be. They are NOT a build plan and should not drive ticket scope. Build plans come from the codebase + per-card audits + Jennifer's docs in that order.
- **Track context — flag at 70%, draft handoff at 80%.** This handoff was drafted at ~80% per Bryan's request; previous Day 20 doc warned about missing the 70% flag.
- **When stuck, ask Bryan.** He knows the hotel operations reality better than any document.

---

## Flag for next session's first minutes

Before anything new:

1. **Verify build clean.** `npm run build` via CC.
2. **Verify staff home renders the live reservations brief**, not the fallback. Browser console at `/staff`.
3. **Verify the agent-generated tasks render** on whatever staff member they were assigned to.
4. **Check the CLAUDE.md cleanup status.** Two stale lines may still be there from this session.
5. **Get Bryan's pick** from the Open Items queue: rule engine assignment polish? BR4 (X-430 → reservations)? Track 1 admin tracks? Wave 4D schema additions? Vercel deploy first?

If anything in the build verification fails, surface it before proposing new work.

---

*Handoff complete. Ready for Day 22.*
