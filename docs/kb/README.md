# `docs/kb/` — Dispatch governance KB

Canonical home for the rules-table governance artifacts. Source-of-truth for how every card and section in Dispatch behaves.

## What's in here

| File | What it is |
|---|---|
| `Dispatch — Rules Table for Card and Section Governance.xlsx` | 25-tab governance spreadsheet. Row-per-field rules for every card and admin surface. Synthesized in a prior Cowork-Claude session from Day 20 UI handoff + Profile surfaces handoff + dispatch-ui-rules + Rules.md + Jennifer's KB docs + Note Types + Maintenance Dropdowns. **Authoritative for governance.** |
| `Dispatch — Rules Table Handoff.md` | Handoff doc that frames the spreadsheet — source-doc precedence ladder, decisions locked, items Bryan should double-check, deferred KB system questions. **Read alongside the .xlsx.** |
| `../kb-spreadsheet-index.md` | One-page navigator for the .xlsx. Per-tab purpose, columns, key rules, and where each tab feeds in the codebase. **Read first if you've never seen the spreadsheet.** |

## How to use this doc set

**Building or modifying a card surface.** Open the per-card tab in the .xlsx (D-430, S-430, A-430, etc.) plus Global Rules. Cross-check against Hallway + Assignment for any assignment / timing / priority concerns. The 12-column schema is consistent across data tabs (`Section | Field | Source | Default state | Locked from | Admin override | Automation trigger | Staff vis. | Admin vis. | Empty / error state | Logs to feed | Notes`).

**Schema or data-model questions.** Schema Reference tab. Then `docs/supabase/*.sql` for what's actually applied.

**Assignment / timing / hallway-routing / load-balancing.** Hallway + Assignment tab. This is the spec for the auto-assignment build (Day 22 queue item C).

**Admin surface questions.** Admin Home / Admin Staff Roster / Admin Staff Profile / Admin Tasks Dashboard / Admin Task View Modal / Admin Maintenance / Admin Calendar / Admin Category Cards / Admin KB Editing Tool / Admin Weekly Recap.

**Anything ambiguous.** Open Assumptions tab (22 numbered flags). Then escalate to Bryan.

## Source-doc precedence

When source docs disagree, the rules-table resolves in this order:

1. Day 20 UI Handoff — canonical visual + structural lock.
2. Profile surfaces handoff — admin profile-adjacent surfaces.
3. dispatch-ui-rules — product model invariants.
4. Rules.md — operational behavior.
5. KB docs (Stayover Standard / Arrival Standard / Knowledge Build Standard Departure / Start of Day / Alternatives) — checklist content.
6. Note Types / Maintenance Dropdowns / Alternatives / Start of Day — taxonomies.
7. Status Handoff (current build state) — used for STUB labeling only.

## Update funnel

This spreadsheet evolves. The funnel for ingesting new versions:

1. Jennifer (or whoever) revises the .xlsx.
2. New version uploaded into a fresh Cowork chat, alongside this README.
3. Cowork-Claude diffs the new .xlsx against the committed copy, surfaces changes grouped by destination — taxonomy additions → SQL inserts; rule changes → TypeScript edits in `lib/orchestration/rules/*` or `lib/orchestration/assignment-policies.ts`; schema changes → SQL migrations in `docs/supabase/*.sql`; UI changes → React edits in `app/staff/task/[id]/*Card.tsx` or admin surfaces.
4. Bryan executes via CC + Supabase dashboard.
5. New .xlsx replaces old in `docs/kb/` as the canonical version.
6. Re-pass cadence per the Update Cadence tab — also re-anchor after handoffs > Day 22, Rules.md revisions, major BR ships, STUB section wirings.

## What this doc is NOT

- **Not a checklist content KB.** The `Detail: Text to come` placeholders in `lib/checklists/variants/*.ts` get filled from Jennifer's KB docs (Stayover Standard / Arrival Standard / Knowledge Build Standard Departure / Start of Day / Alternatives) — not from this spreadsheet.
- **Not implementation.** This doc says where data comes from, who can write it, who sees it, what triggers it, what logs. It does NOT specify React component shapes, CSS classes, or migration SQL.
- **Not the current build queue.** The Post-Beta BR Queue tab is a Day 16-20 snapshot. Current queue lives in `docs/handoff-day-22.md` and `docs/phase-4-handoff.md`.
