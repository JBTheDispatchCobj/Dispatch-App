# UI / Build Handoff — Dispatch Day 22 (2026-05-04)

*Continuation handoff for a fresh Cowork chat. Supplements — does not replace — the Phase 3 per-card mappings (`docs/phase-3-{slug}-mapping.md`) and the Phase 4 handoff (`docs/phase-4-handoff.md`). Read those alongside this one.*

*Date: end of session, 2026-05-04 (~Day 22 in Bryan's count). Previous session was Day 21 (build push: rule-engine interpreter, KB foundation, reservations BR1-BR3, promote-drafts, Vercel checklist).*

---

## What this doc is

Continuation handoff capturing the state at end of Day 22. Day 22 was a **verification + course-correct session**, not a big build. The previous Day 21 doc covered the architectural moves; this one covers what's true now after a verification pass and a meaningful pivot on channel-manager strategy.

Core ship target unchanged: Jennifer's Wisconsin boutique hotel, beta-as-MVP, ~next week.

---

## What landed in Day 22

### Verification sweep — all four checks passed

The Phase 4 handoff flagged four "first-minutes" verifications. All four came back clean:

1. **`npm run build`** — clean. 21 routes, zero TypeScript errors, zero warnings.
2. **/staff browser console** — no `[staff-home] Reservation counts unavailable; using fallback` warning. Live reservations fetch is working; the brief card pulls counts from Supabase, not the hardcoded fallback.
3. **Promoted agent-generated tasks** — three rows exist in `public.tasks` with `source = 'agent'`, correct buckets (arrivals, departures, stayovers), and well-formed titles. **Caveat:** `staff_id` is null on all three — the manual `UPDATE` mentioned in the Day 21 handoff didn't persist (or these are post-update promotions that never got assigned). The pipeline produces valid tasks; assignment is the missing link before they render on a staff home. This is exactly the rule-engine assignment-policy gap that's already item #1 on the open queue.
4. **CLAUDE.md cleanup** — both stale lines fixed via CC. Line 96 now reads "six buckets, time-arc order"; the superseded `## Immediate priorities (Day 1)` section is removed.

### Jennifer stakeholder handoff doc

Created `docs/jennifer-handoff.md`. Self-contained status briefing for Jennifer to upload as the first message in her own Cowork desktop chat. Written for an operator, not an engineer — no code references, no internal jargon. Covers what's built, what's not, what she'll work on (filling KB placeholders, authoring missing rule files, reviewing card layouts), and the operating pattern (Bryan as engineering lead, her as operations source-of-truth, sync via Bryan).

She is now set up with her own chat. Out of scope for engineering chats from here.

### Channel-manager pivot — ResNexus dropped, Cloudbeds top of list

Bryan disclosed mid-session that **ResNexus does not have API access.** That kills the post-beta channel-manager pathway the codebase + docs had been planning around. Cloudbeds is now the leading candidate, with $200/mo as the soft budget cap.

**Cloudbeds validation (web research):**

- **API: yes, exact fit.** Cloudbeds publishes a full PMS REST API plus webhooks. Webhook event list (`reservation_created`, `status_changed`, `dates_changed`, `accommodation_changed`, `deleted`, etc.) reads like the rule engine's spec. Wire those into the existing `inbound_events` table and the auto-generation pipeline picks up real reservations the same way it picks up seeded test events today. Zero rearchitecture on our side.
- **Channel manager included.** Cloudbeds owns myAllocator (acquired years ago); it's bundled into the "One" plan and available under "Flex." 300+ OTA channels. No added commissions on Channel Manager bookings.
- **Pricing soft spot.** Public pricing is opaque. Entry tier ("Flex") is ~$99-108/mo for ≤9 rooms; for a ~21-room property, real-world expectation is **$200-$400/mo on Flex, more on One.** That straddles the $200 cap. Real number requires a sales quote.

**Backup: Little Hotelier (SiteMinder).** Built explicitly for 1-30 rooms (Jennifer's property fits dead-center). 450+ channels. Has API. Generally cheaper at this scale. If Cloudbeds quote comes in over $200, Little Hotelier is the obvious second look. Mews is too big (sweet spot 30-60 rooms). WebRezPro and Eviivo also worth glancing if Little Hotelier doesn't pencil.

**Bryan's next move on this thread:** call Cloudbeds sales for a real quote. If $300+, also quote Little Hotelier before signing.

**No build impact today.** The reservations table is channel-agnostic — `source` column already accepts `resnexus | manual | walk_in`, adding `cloudbeds` is a one-word change. Channel-manager integration was always post-beta. The build keeps moving on the queue.

**Docs are stale.** `CLAUDE.md`, `phase-4-handoff.md`, and the two retired synthesis docs (`Dispatch — Architecture & Build Plan.md` + `…Jennifer Friendly.md`) still reference ResNexus by name. Worth a sweep to swap to "channel manager TBD" or "Cloudbeds (target)" once the call is made — not urgent.

### Operating-pattern correction

The Phase 4 handoff said "Cowork-Claude had direct file access … and authored most code edits directly via the Edit / Write tools." **Bryan corrected this mid-session: all file edits now route through CC prompts.** Cowork-Claude's repo access is read-only-by-convention now — for orientation, audit, drafting prompts. Code changes get drafted as fenced CC prompts that Bryan pastes to CC in his Cursor terminal. Exception: brand-new docs like the Jennifer handoff and this file, where the convention loosened — but for any code touching `app/`, `lib/`, `docs/supabase/`, etc., go through CC.

---

## New artifact to integrate — Jennifer's 25-tab KB spreadsheet

Bryan flagged that he has a **25-tab spreadsheet authored by Jennifer (vetted by prior Cowork-Claude in an earlier chat session) containing rules and guidance across the KB.** It exists locally on Bryan's machine but is not yet in this repo and was not in any prior handoff doc. Single trace in this chat's uploads is `Deep Clean Admin List.xlsx - Sheet1.csv` — clearly one tab of the larger 25-tab artifact exported as CSV.

**This is the primary input for the next session.** Plan for the fresh chat:

1. Bryan uploads the .xlsx (or mounts the folder it lives in).
2. Fresh chat invokes the **xlsx skill**, reads all 25 tabs, builds a one-page index doc — tab name, row count, purpose summary, cross-references between tabs. Save to `docs/kb-spreadsheet-index.md`.
3. Index becomes the bootstrapping artifact for any future work touching this KB.
4. Then begin integrating: which tabs feed into existing rule files (`lib/orchestration/rules/{arrivals,departures,stayovers}.ts`), which feed into the variant checklist trees (`lib/checklists/variants/*.ts` to fill `Detail: Text to come` placeholders), which feed into the empty rule files (`dailys.ts`, `eod.ts`, `maintenance.ts`).

**Do not skip the index pass.** 25 tabs is too much to hold in working memory while editing code. The index lets the fresh chat (and every future fresh chat) navigate the KB cheaply.

---

## State of the build at end of Day 22

Unchanged from end of Day 21 except:

- CLAUDE.md cleaned up (line 96 + Immediate Priorities section removed).
- One new repo doc: `docs/jennifer-handoff.md`.
- One new repo doc: `docs/handoff-day-22.md` (this file).

All Day 21 architecture still holds: Wave 4A shared formatters, Wave 4B KB foundation (six room classes, variant tree extension via `withAdditions`), Reservations BR1+BR2+BR3, Wave 4F rule-engine interpreter, promote-drafts SQL helper. End-to-end pipeline verified working in Day 22.

---

## Open items (queue carried forward, with updates)

Items the Day 21 handoff queued, plus channel-manager and KB-spreadsheet items added in Day 22.

### New / urgent

- **A. Ingest the 25-tab KB spreadsheet.** Index pass + then integrate into rule files and variant checklist trees. Likely the single largest unlock for replacing `[ASK JENNIFER]` markers and `Detail: Text to come` placeholders.
- **B. Get Cloudbeds (and possibly Little Hotelier) sales quote.** Bryan's action, not a build item. Once decided, swap docs to reflect new channel-manager target.

### Highest-leverage remaining build items (carried forward)

- **C. Auto-assignment for rule engine.** Wire `assignment.specific_member_id` per Jennifer's policy, OR build the assignment_policies layer (hall-balanced, primary-only-when-3plus, standard load 5/10/15). Without this, every promoted draft lands unassigned and demo isn't end-to-end. Top of build queue.
- **D. Vercel deploy.** Checklist at `docs/deployment/vercel-checklist.md`. ~30 min. Gets a real URL into Jennifer's hands; unblocks her smoke testing on real phones.

### Carried forward unchanged

- **E. Author rule files for `dailys.ts`, `eod.ts`, `maintenance.ts`.** Currently empty arrays. Likely fed by the 25-tab spreadsheet ingest (item A).
- **F. BR4 — wire X-430 briefs to live reservation data.** Per-card edits to fall back to `getCurrentReservationForRoom()` when `task.context.{incoming_guest, etc}` is missing.
- **G. BR5 — reservations cancellation/modification edge cases.** Webhook re-fires, idempotency. Not blocking until real channel-manager payloads start flowing.
- **H. Wave 4D schema additions:** `done_at` on `task_checklist_items`, `context.notes`, `context.incoming_guest.extras`, `context.current_guest.service_type`. Each unblocks a specific X-430 placeholder.
- **I. Wave 4E real data verticals:** maintenance issues, supply needs, deep clean, team roster, rotating phrases, next-shift data on E-430. Each is its own table + UI wire-up.
- **J. Track 1 UI:** Admin Staff Profile rebuild (sky-blue), drill-in middle layer, /admin home rebuild (cream + lanes). Needs Day 16-20 visual handoffs uploaded.

---

## Critical state to verify in next session's first minutes

1. **Run `npm run build`** to confirm nothing has drifted since Day 22 PASS.
2. **Confirm `/staff` brief still pulls from live reservations** (browser console at `/staff`; no `[staff-home] Reservation counts unavailable` warning).
3. **Decide on the 25-tab spreadsheet path:** does Bryan upload the .xlsx, or mount the folder it lives in? Either works.
4. **Get Bryan's pick on which open item to chase** after the spreadsheet ingest. The index pass itself is the recommended first action; after that, item C (auto-assignment) is the natural follow-on.

---

## Files to upload to next Cowork chat

**Required (and minimal — if mounting the dispatch-app folder, almost everything else is reachable from the repo):**

1. The **25-tab KB spreadsheet (.xlsx)** — Bryan's local file, not in the repo. THIS IS THE PRIMARY INPUT.
2. **`docs/handoff-day-22.md`** (this doc) — most recent, read first.
3. **`docs/phase-4-handoff.md`** — read after this one for full Day 21 state.

**Reachable from the repo once mounted (no upload needed):**

- `CLAUDE.md`, `AGENTS.md`, `dispatch-ui-rules.md` — project conventions.
- `docs/phase-3-{d-430,a-430,s-430,da-430,e-430,sod-430}-mapping.md` — per-card audit specs.
- `docs/jennifer-handoff.md` — for reference if Jennifer's chat output references it.
- `docs/deployment/vercel-checklist.md` — for if/when deploy is on the agenda.
- `docs/dispatch-audit.md`, `docs/TASK_EVENTS_CONTRACT.md`, `docs/MILESTONE1_TESTING.md` — older reference docs.

**Add only if the next session will touch UI surfaces:**

- `dispatch-ui-rules.md` (separate copy if you want — it's also at the repo root)
- Day 12 / 16 / 17 / 18 / 19 / 20 visual handoffs
- Profile surfaces UI handoff

**Add only if the next session will touch Jennifer's KB authoring on top of the spreadsheet ingest** (these are reference, not primary — the spreadsheet supersedes most of them):

- `Dispatch — Architecture & Build Plan.md` + `…Jennifer Friendly.md` (RETIRED as plan, reference only)
- `Stayover Standard KB Doc.docx.md`, `Arrival Standard KB Doc (1).docx.md`, `Knowledge Build Standard Departure.docx.md`, `Start of Day.docx.md`, `Alternatives to the standard lists.docx.md`, `Note Types.md`, `Rules for HouseKeeping.docx.md`, `Maintenance Dropdowns (1) (2).docx`, `Deep Clean Admin List.xlsx - Sheet1.csv`

---

## Opening prompt for fresh Cowork chat (Day 23)

Paste after the dispatch-app folder is mounted via `request_cowork_directory` and the spreadsheet + handoff docs are uploaded:

> Continuing Dispatch in a fresh Cowork chat. Mount the repo at `/Users/bryanstauder/dispatch-app` first. Then read `docs/handoff-day-22.md` (most recent — read first), then `docs/phase-4-handoff.md` (Day 21 state), then skim `CLAUDE.md` + `AGENTS.md` + `dispatch-ui-rules.md` for conventions.
>
> Primary input for this session: a 25-tab KB spreadsheet authored by Jennifer (uploaded as a file in this chat, or attached to the next message). It contains rules and guidance across the KB.
>
> First action: invoke the xlsx skill, read every tab, and build an index doc at `docs/kb-spreadsheet-index.md` — tab name, row count, purpose summary, cross-references. Don't try to integrate yet — just digest.
>
> Second action: surface where each tab feeds — which rule files (`lib/orchestration/rules/*`), which checklist variants (`lib/checklists/variants/*`), or which placeholder it replaces. Then ask Bryan which integration he wants to chase first.
>
> Bryan is non-developer; he pastes prompts to CC in the Cursor terminal and SQL in the Supabase dashboard. **All file edits route through CC prompts** — Cowork-Claude has read access to the repo for orientation, but writes go through CC. Exception: brand-new docs (handoffs, indexes) which the chat can author directly.
>
> Ship target: Jennifer's Wisconsin boutique hotel beta-as-MVP, ~next week. Bryan's mantra is "no cuts, all of it." Don't propose cuts even when the timeline gets tight — surface trade-offs but execute.
>
> Verification before any new work: `npm run build` clean (CC), and `/staff` browser console clean (Bryan's eyes). If either fails, surface it before proposing new work.

---

## Operating reminders for the next chat

- **Bryan is non-developer.** Plain English, exact copy-paste prompts for CC in fenced code blocks, exact SQL for Supabase in fenced code blocks. No placeholders unless explicitly called out.
- **Pattern:** Cowork-Claude reads code directly via cowork directory access, drafts CC prompts, Bryan executes and reports back. CC handles all writes to the codebase, build verification, git ops, and any terminal-context work.
- **Exception:** Brand-new docs (handoffs, indexes, status files) can be authored directly by Cowork-Claude.
- **Tracks:** UI design lives in a parallel UI-only chat (per Day 19/20 docs — check status). Build / data / KB ingest work lives in the main Cowork chat.
- **No new dependencies** without asking Bryan. Current deps: `@supabase/supabase-js`, `@supabase/ssr`, `next`, `react`, `react-dom`.
- **Boring code.** No clever abstractions. One-file-per-feature unless clearly beneficial.
- **Internal imports under `lib/orchestration/`** must use `.ts` extensions (Node orchestrator script via `node --experimental-strip-types`).
- **Migrations** live in `docs/supabase/*.sql`, applied manually via Supabase dashboard SQL editor. Not Supabase CLI.
- **Channel manager:** ResNexus is dead. Cloudbeds is the leading replacement, pending sales quote. Don't add ResNexus references to new code or docs.
- **The 25-tab spreadsheet supersedes the synthesis docs** as the source of truth on rules and guidance. Treat the synthesis docs as historical reference only.
- **When stuck, ask Bryan.** He knows the hotel operations reality better than any document.

---

## Flag for next session's first minutes

Before anything new:

1. **Verify build clean.** `npm run build` via CC.
2. **Verify `/staff` console clean** (no fallback warning). Bryan's eyes.
3. **Get the 25-tab spreadsheet into the chat** — upload or folder mount.
4. **Run the index pass** — read all tabs, write `docs/kb-spreadsheet-index.md`.
5. **Surface integration mapping** — where each tab feeds.
6. **Get Bryan's pick** on what to integrate first, or whether to chase auto-assignment (item C) before doing more KB ingest work.

---

*Handoff complete. Ready for Day 23.*
