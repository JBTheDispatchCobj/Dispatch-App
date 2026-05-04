# UI / Build Handoff — Dispatch Day 23 (2026-05-04)

*Continuation handoff for a fresh Cowork chat. Supplements — does not replace — `docs/handoff-day-22.md` (Day 22 state) and `docs/phase-4-handoff.md` (Day 21 state). Read those alongside this one. The 25-tab governance spreadsheet that was the primary input this session now lives at `docs/kb/`.*

*Date: 2026-05-04, Day 23. Session was a KB ingest + repo setup pass. No code edits, no schema changes, no UI changes.*

---

## What landed in Day 23

### Spreadsheet ingested + committed

The 25-tab `Dispatch — Rules Table for Card and Section Governance.xlsx` was uploaded by Bryan and read tab-by-tab. All 25 row counts verified against the source. Files now committed at:

- `docs/kb/Dispatch — Rules Table for Card and Section Governance.xlsx` — the spreadsheet itself.
- `docs/kb/Dispatch — Rules Table Handoff.md` — the companion handoff that frames the spreadsheet (source-doc precedence ladder, decisions locked, items to double-check, deferred KB system questions).
- `docs/kb/README.md` — folder README explaining what's in `docs/kb/`, source-doc precedence, the update funnel, and what this doc set is/isn't.
- `docs/kb-spreadsheet-index.md` — one-page navigator over the spreadsheet. Per-tab purpose, columns, row count, key rules, and where each tab feeds in the codebase. Also contains the **integration mapping** grouped by destination (rule engine, per-card UI, schema additions, KB content, admin surfaces).
- `docs/handoff-day-23.md` — this file.

The spreadsheet is now the persistent input. Future fresh chats do NOT need to re-upload — they just mount the repo and read.

### Course-correction on the spreadsheet's framing

The Day 22 handoff framed it as "Jennifer's 25-tab KB spreadsheet … containing rules and guidance across the KB." Half right.

- **What it is.** A row-per-field **governance table** for every card surface and admin surface in Dispatch. Synthesized in a prior Cowork-Claude chat session from canonical sources (Day 20 UI Handoff, Profile surfaces handoff, dispatch-ui-rules, Rules.md, Jennifer's KB docs, Note Types, Maintenance Dropdowns). Bryan reviewed and vetted; Jennifer's docs are the upstream authorities for actual checklist content.
- **What it isn't.** Not a checklist content KB. Does NOT contain the Detail prose for `Detail: Text to come` placeholders in `lib/checklists/variants/*.ts` — that prose still lives in Jennifer's KB docs and gets authored by her per the existing Phase 4 plan.
- **What it unblocks.** Auto-assignment policy authoring, per-card time targets, Departure Status priority stack, Note Type / Maintenance taxonomies, dual-sink logging contracts, Updates panel cascade rules, Hallway adjacency rules, no-orphan-cards enforcement, the full admin surface spec (post-beta).

The substantive consequence: this doc is the **spec for Day 22 queue item C (auto-assignment)** and the spec for the empty `dailys.ts` and `eod.ts` rule files. It also lists the schema additions needed to wire the spec end-to-end.

### Operating-pattern decision: split between Supabase tables vs. TypeScript code

Bryan and Cowork-Claude aligned on this split. NOT all rule content goes into Supabase tables. The clean division:

**Goes into Supabase tables (data).** Lookup tables Jennifer will keep extending + static reference data:

- Taxonomy tables — `note_types` (11 values), `note_statuses` (5), `note_assigned_to` (5), `maintenance_locations`, `maintenance_items`, `maintenance_types`, `maintenance_severities`. Each as a small lookup with `name`, `display_order`, `active` columns. Admin extends post-beta via the KB Editing Tool; pre-beta, Bryan extends via SQL.
- Reference data — Room→hall mapping, hall sequence, room-class definitions, standard load thresholds (5 dep / 10 stay / 15 daily), seasonal scent windows, time targets per S-430 status. Could be Supabase tables OR a single TypeScript config file. Decision: **TypeScript config file at `lib/dispatch-config.ts` for beta, promote to Supabase tables post-beta when admin needs UI editing.**
- Schema additions — new `notes` table, new `deep_clean_history` table, new `tasks.context.*` subkeys (`incoming_guest`, `outgoing_guest.extras`, `current_guest.service_type`, `notes`), `done_at` column on `task_checklist_items`.

**Goes into TypeScript code (logic).** Too complex for table rows:

- Assignment policies — `lib/orchestration/assignment-policies.ts` (new). Primary lane, hall-balanced distribution, hallway adjacency rule, no-orphan rule, departure priority stack, cross-cutting bumps in order, pre-stayover reshuffle.
- Rule engine fills — `lib/orchestration/rules/{arrivals,departures,stayovers,dailys,eod}.ts`. Authored from spec in the per-card tabs.
- Per-card UI — already lives in `app/staff/task/[id]/*Card.tsx`. Spreadsheet is verification spec.
- Repeated-instance meta-trigger, dual-sink note routing, intra-bucket card rotation. Code, not data.

**Goes into RLS / Postgres triggers (governance enforcement).**

- Extend `tasks_staff_field_guard()` for any new admin-only fields.
- New RLS policies on `notes`, `deep_clean_history`, taxonomy tables.
- Visibility model is partly RLS + partly client-side query scoping.

### Update funnel established

When Jennifer (or anyone) revises the spreadsheet:

1. New .xlsx uploaded into a fresh Cowork chat.
2. Cowork-Claude diffs new vs. committed `docs/kb/...xlsx`, surfaces changes grouped by destination (taxonomy / rules / schema / UI / admin).
3. Drafts CC prompts (TypeScript edits) and SQL (Supabase) for each change category.
4. Bryan executes via CC + Supabase dashboard.
5. New .xlsx replaces old in `docs/kb/` as canonical.

The funnel is documented at `docs/kb/README.md`.

---

## State of the build at end of Day 23

Unchanged from end of Day 22 except the four new docs above. No code, no schema, no UI changes. Day 22 verifications still hold (build clean, /staff brief reads live reservations, 3 agent-promoted tasks exist with `staff_id: null`).

---

## Open queue (unchanged from Day 22 except priority + spec)

The Day 22 open items now have a spec from the spreadsheet. Re-stated with that pointer.

### Highest leverage — items the spreadsheet now specs concretely

- **A. (Day 22 carry) Auto-assignment build (was item C).** Spec is the Hallway + Assignment tab in the spreadsheet. Build target: new `lib/orchestration/assignment-policies.ts` for primary lane / hall-balanced / hallway adjacency / no-orphan / standard load. Plus fill `assignment.specific_member_id` on rule files where Jennifer's policy locks a person. Ends the unassigned-task gap; makes the demo end-to-end. **Top of build queue.**
- **B. Schema additions.** Three SQL files needed before the rule engine can write the contexts the spec assumes. (1) `notes_table.sql` — `notes` table with Type/Status/Assigned-to/Body/etc.; (2) `taxonomy_tables.sql` — `note_types`, `note_statuses`, `note_assigned_to`, `maintenance_severities` lookup tables with seed inserts of the values from the spreadsheet; (3) `wave_4d_context.sql` — add the `tasks.context.*` subkeys not yet present (`incoming_guest`, `current_guest.service_type`, `outgoing_guest.extras`, card-level `notes`), plus `done_at` on `task_checklist_items`.
- **C. `lib/dispatch-config.ts`.** Single file holding the static reference data — room-class definitions, hall mapping, hall sequence, standard load thresholds (5 dep / 10 stay / 15 daily), seasonal scent windows, S-430 status time targets. Importable by rule engine + UI. Replaces magic numbers scattered through code.

### Carry-forward from Day 22 unchanged

- **D. (Day 22 carry) Vercel deploy.** ~30 min via `docs/deployment/vercel-checklist.md`. Bryan's action.
- **E. (Day 22 carry) Author empty rule files: `dailys.ts`, `eod.ts`.** Now have specs in Da-430 + E-430 tabs.
- **F. (Day 22 carry) BR4 — wire X-430 briefs to live reservation data.**
- **G. (Day 22 carry) BR5 — reservations cancellation/modification edge cases.**
- **H. (Day 22 carry) Wave 4D schema additions.** Now grouped under item B above.
- **I. (Day 22 carry) Wave 4E real data verticals.** Maintenance issues, supply needs, deep clean, team roster, rotating phrases, next-shift data on E-430.
- **J. (Day 22 carry) Track 1 UI:** Admin Staff Profile rebuild, drill-in middle layer, /admin home rebuild. Specs now exist in spreadsheet (Admin Home, Admin Staff Roster, Admin Staff Profile tabs).
- **K. Channel manager — Cloudbeds quote (Day 22 add).** Bryan's action, not a build item.

---

## Critical state to verify in next session's first minutes

1. **Run `npm run build`** to confirm nothing has drifted. Day 22 was clean; Day 23 made no code changes; expect clean.
2. **Confirm `docs/kb/` exists** with the four files (xlsx + handoff + README + index). If git diff shows them tracked and committed, the funnel is live.
3. **Confirm `/staff` brief still pulls live reservations.** Browser console at `/staff`; no `[staff-home] Reservation counts unavailable` warning.
4. **Decide what to chase first:** item A (auto-assignment build — biggest unlock), item B (schema additions — precondition for richer context), item C (`lib/dispatch-config.ts` — small, surgical, eliminates magic numbers).

Recommended first chase: **item B (schema additions)**, then item C (config file), then item A (auto-assignment build). Schema first because A and the rule engine generally write contexts that assume B; config second because A reads thresholds from C; A last because it's the biggest piece and now blocked on nothing.

---

## Files to load in next Cowork chat

**Required (minimal — almost everything is reachable from the repo once mounted):**

1. None to upload. Mount `/Users/bryanstauder/dispatch-app/`.
2. From repo, read in this order:
   - `docs/handoff-day-23.md` (this file — most recent, read first).
   - `docs/handoff-day-22.md` (Day 22 state).
   - `docs/phase-4-handoff.md` (Day 21 state).
   - `docs/kb-spreadsheet-index.md` (navigator over the rules-table spreadsheet).
   - `docs/kb/README.md` (KB folder + funnel).
   - `docs/kb/Dispatch — Rules Table Handoff.md` (rules-table companion handoff).
   - `CLAUDE.md`, `AGENTS.md`, `dispatch-ui-rules.md` (conventions).

**Open the .xlsx as needed** — `docs/kb/Dispatch — Rules Table for Card and Section Governance.xlsx`. Use the xlsx skill to read specific tabs on demand. Don't re-ingest unless the spreadsheet changes.

**Optional (only if working on a specific surface):**

- Day 20 UI handoff + the per-card phase-3 mapping docs (`docs/phase-3-{slug}-mapping.md`) — for visual / structural lock.
- Day 16-19 visual handoffs — for older context.
- Jennifer's KB docs (Stayover Standard / Arrival Standard / Knowledge Build Standard Departure / Start of Day / Alternatives) — only when filling `Detail: Text to come` placeholders in variant checklist trees.

---

## Opening prompt for fresh Cowork chat (Day 24)

Paste after mounting `/Users/bryanstauder/dispatch-app`:

> Continuing Dispatch in a fresh Cowork chat. Mount the repo at `/Users/bryanstauder/dispatch-app`. Then read in order: `docs/handoff-day-23.md` (most recent — read first), `docs/handoff-day-22.md` (Day 22), `docs/phase-4-handoff.md` (Day 21), `docs/kb-spreadsheet-index.md` (navigator over the 25-tab governance spreadsheet now committed at `docs/kb/`), `docs/kb/README.md` (KB folder + update funnel), `docs/kb/Dispatch — Rules Table Handoff.md` (companion handoff). Skim `CLAUDE.md` + `AGENTS.md` + `dispatch-ui-rules.md` for conventions.
>
> The 25-tab governance spreadsheet is now committed at `docs/kb/`. Do NOT re-ingest tab-by-tab unless changes have arrived — the index doc is sufficient orientation. Open specific tabs in the .xlsx via the xlsx skill on demand when you need a row's full detail.
>
> Recommended next chase: item B (schema additions — `notes_table.sql`, `taxonomy_tables.sql`, `wave_4d_context.sql`), then item C (`lib/dispatch-config.ts`), then item A (auto-assignment build per the Hallway + Assignment tab). Day 23 handoff §"Open queue" lists each.
>
> Bryan is non-developer; he pastes prompts to CC in Cursor terminal and SQL in Supabase dashboard. **All file edits route through CC prompts** — Cowork-Claude has read access for orientation, but writes go through CC. Exception: brand-new docs (handoffs, indexes, status files) which the chat can author directly.
>
> Operating preference: **every CC prompt and every SQL block must be presented in its entirety inside a single fenced code block** so Bryan can copy without breaking it.
>
> Ship target: Jennifer's Wisconsin boutique hotel beta-as-MVP, ~next week. "No cuts, all of it."
>
> Verification before any new work: `npm run build` clean (CC), `/staff` browser console clean (Bryan's eyes), `docs/kb/` populated (already committed Day 23). If anything fails, surface it before proposing new work.

---

## Operating reminders for the next chat

- **Bryan is non-developer.** Plain English, exact copy-paste prompts for CC and SQL in fenced code blocks. No placeholders unless explicitly called out.
- **Pattern:** Cowork-Claude reads code, drafts CC prompts, Bryan executes and reports back. CC handles all writes to the codebase, build verification, git ops. SQL goes via Supabase dashboard.
- **Exception:** Brand-new docs (handoffs, indexes, status files) can be authored directly by Cowork-Claude.
- **Single fenced code block per executable artifact.** Per Bryan's Day 23 preference. No interleaved prose inside the code block.
- **The spreadsheet at `docs/kb/` is canonical for governance.** Source-doc precedence ladder per `docs/kb/README.md`.
- **Update funnel:** new .xlsx → diff vs. committed → CC prompts + SQL by destination → execute → replace canonical. Documented at `docs/kb/README.md`.
- **No new dependencies** without asking Bryan. Current deps: `@supabase/supabase-js`, `@supabase/ssr`, `next`, `react`, `react-dom`.
- **Boring code.** No clever abstractions. One-file-per-feature unless clearly beneficial.
- **Migrations** live in `docs/supabase/*.sql`, applied manually via Supabase dashboard.
- **Channel manager:** ResNexus is dead. Cloudbeds is the leading replacement, pending sales quote.
- **When stuck, ask Bryan.** He knows the hotel operations reality better than any document.

---

## Flag for next session's first minutes

Before anything new:

1. **Verify build clean.** `npm run build` via CC.
2. **Verify `/staff` console clean** (no fallback warning). Bryan's eyes.
3. **Verify `docs/kb/` populated** (xlsx + handoff + README + index). Should be already committed.
4. **Get Bryan's pick** on what to build first: schema (item B) → config (item C) → auto-assignment (item A) is the recommended order.

If anything in build verification fails, surface it before proposing new work.

---

*Handoff complete. Ready for Day 24.*
