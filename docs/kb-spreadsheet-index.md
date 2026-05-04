# KB Spreadsheet Index — `Dispatch — Rules Table for Card and Section Governance.xlsx`

*Authored: Day 23 (2026-05-04) Cowork session, by Cowork-Claude.*
*Source file: [`docs/kb/Dispatch — Rules Table for Card and Section Governance.xlsx`](kb/Dispatch%20%E2%80%94%20Rules%20Table%20for%20Card%20and%20Section%20Governance.xlsx) — committed to repo.*
*Companion handoff: [`docs/kb/Dispatch — Rules Table Handoff.md`](kb/Dispatch%20%E2%80%94%20Rules%20Table%20Handoff.md) — read first if you haven't.*
*KB folder README: [`docs/kb/README.md`](kb/README.md) — read for the update funnel + how-to-use.*

---

## What this index is

A one-page navigator for the 25-tab spreadsheet. For each tab: scope, row count, columns, what the tab actually governs, what it cross-references, and where it feeds in the codebase.

Read this **alongside** the source file. The index does NOT replace the spreadsheet — it tells you where to look in the spreadsheet and where to write the result in the repo.

## What the spreadsheet actually is (correction on Day 22 framing)

The Day 22 handoff framed this artifact as "Jennifer's 25-tab KB spreadsheet … containing rules and guidance across the KB." That's partially right and partially wrong. After reading every tab:

- **What it is.** A row-per-field **governance table** for every card surface and admin surface in Dispatch. Synthesized in a prior Cowork-Claude chat session from canonical sources (Day 20 UI Handoff, Profile surfaces handoff, dispatch-ui-rules, Rules.md, Jennifer's KB docs, Note Types, Maintenance Dropdowns). Bryan reviewed and vetted; Jennifer's docs are the upstream authorities for actual checklist content.
- **What it isn't.** Not a checklist content KB. It does NOT contain the Detail prose for `Detail: Text to come` placeholders in `lib/checklists/variants/*.ts` — that prose still lives in Jennifer's KB docs (Stayover Standard, Arrival Standard, Knowledge Build Standard Departure, Start of Day, Alternatives) and gets authored by her per the Phase 4 plan.
- **What it unblocks.** Auto-assignment policy authoring, per-card time targets, Departure Status priority stack, Note Type / Maintenance taxonomies, dual-sink logging contracts, Updates panel cascade rules, Hallway adjacency rules, no-orphan-cards enforcement, and the full admin surface spec (post-beta).

In other words: this is the doc that lets us write `lib/orchestration/rules/*.ts` and the assignment policies layer with confidence; it is NOT the doc that fills the variant checklist trees.

## Source-doc precedence (transcribed verbatim from the README tab)

When source docs disagree, the rules-table doc resolves in this order. The dev chat (here) and CC should treat this ladder as canonical:

1. **Day 20 UI Handoff** — canonical visual + structural lock.
2. **Profile surfaces handoff** — admin profile-adjacent surfaces.
3. **dispatch-ui-rules** — product model invariants.
4. **Rules.md** — operational behavior.
5. **KB docs** (Stayover Standard / Arrival Standard / Knowledge Build Standard Departure / Start of Day / Alternatives) — checklist content.
6. **Note Types / Maintenance Dropdowns / Alternatives / Start of Day** — taxonomies.
7. **Status Handoff (Day 21)** — current build state, used for STUB labeling only.

If the dev chat finds a contradiction, escalate to Bryan rather than resolving silently.

## Standard 12-column schema

Every data tab (Schema Reference, Global Rules, Hallway + Assignment, Pre-Clock-In, Staff Home, the six X-430 tabs, the eight admin tabs) uses the same 12 columns:

`Section | Field | Source | Default state | Locked from | Admin override (scope) | Automation trigger | Staff vis. | Admin vis. | Empty / error state | Logs to feed | Notes`

`Source` codes: `RES` reservations table · `KB` knowledge base · `RULES` derived from Rules.md logic · `SYS` system-computed · `ADMIN` admin-authored · `STAFF` staff-authored at runtime · `STUB` not yet wired.

Three tabs break this schema: README (4 cols, prose), Post-Beta BR Queue (4 cols: BR / Source / Surface / Description), Open Assumptions (2 cols: # / flag), Update Cadence (2 cols, prose).

## Tab quick-reference

| # | Tab | Rows | Scope | Primary integration target |
|---|---|---|---|---|
| 1 | README | 48 | Preamble, source-doc precedence, column key, conventions. | Read once; not code. |
| 2 | Schema Reference | 14 | `tasks` shape, `tasks.context` JSONB subkeys, merge-safe save contract, `inbound_events`, `task_drafts`, reservations (post-beta), Auth, Storage, Cron, Routes. | `docs/supabase/*.sql`; `lib/supabase.ts`; existing `lib/orchestration/interpret.ts` context-build logic. |
| 3 | Global Rules | 29 | Cross-surface rules: identity/auth, time tracking (dual sink), Note model + taxonomies, Maintenance model, Updates panel, Activity feed, Reservations, Archive, Photo media, Card lifecycle (reassignment dual-logging, intra-bucket rotation), KB system entity, Repeated-instance meta-trigger. | Schema additions (Wave 4D); `lib/activity-log.ts`; new `lib/notes.ts` (post-beta); `lib/checklists/*` for KB rules. |
| 4 | Hallway + Assignment | 16 | Room→hall mapping, hall sequence, two-cart constraint, primary-housekeeper lane, departure priority stack, cross-cutting bumps, hallway adjacency rule, context-load adjustment, no-orphan rule, timing windows, pre-stayover reshuffle. | **Auto-assignment build (item C in Day 22 queue).** Drives `lib/orchestration/rules/{arrivals,departures,stayovers,dailys}.ts` `assignment.*` and a new `lib/orchestration/assignment-policies.ts`. |
| 5 | Pre-Clock-In | 6 | Pre-shift `/staff` surface: greeting, profile link, "Start your day" CTA. | `app/staff/page.tsx` clock-in branch. |
| 6 | Staff Home | 15 | Post-clock-in `/staff` surface: header, daily brief, bucket stack, sequential gating, "Next up" inset, footer. | `app/staff/page.tsx` (already wired in Day 21 BR3). |
| 7 | SOD-430 Start of Day | 23 | Daily brief contents (notes/at-a-glance/team/weather/events/notes), Updates panel, Notes, Tasks (KB), Maintenance, Need Help, Pause/Resume, Start Shift. | `app/staff/task/[id]/StartOfDayCard.tsx`; `lib/orchestration/rules/start_of_day.ts` (does not exist yet — empty file under different name?). |
| 8 | D-430 Departures | 41 | Card creation/order/exec gate, Outgoing/Incoming guest blocks, Departure Status, Updates panel, Setup (Temp/Spray/Other/Guest-Based), Arrival Status, Checklist (room-class + clean-type variants), Notes, Deep Clean tray, Maintenance, footers. | `app/staff/task/[id]/DeparturesCard.tsx`; `lib/orchestration/rules/departures.ts`; `lib/checklists/variants/*`. |
| 9 | S-430 Stayovers | 25 | Card creation/assignment/start time, Status card (DND/Guest OK/Desk OK/Sheet Change/Done) + time targets, Guest Details, Updates, Checklist (Standard/Sheet Change/* guest), Notes, Maintenance, footers. | `app/staff/task/[id]/StayoversCard.tsx`; `lib/orchestration/rules/stayovers.ts`. |
| 10 | A-430 Arrivals | 27 | Card creation/assignment, 2pm hard deadline, Header + Guest Details, Updates, Setup, Checklist (Standard/Long-term/* guest), Notes, Maintenance, footers. | `app/staff/task/[id]/ArrivalsCard.tsx`; `lib/orchestration/rules/arrivals.ts`. |
| 11 | Da-430 Dailys | 18 | Card creation, realtime task reassignment, Team Update (STUB), Updates panel, Notes, Tasks (KB-driven), Maintenance, Distribution rule, footers. | `app/staff/task/[id]/DailysCard.tsx`; `lib/orchestration/rules/dailys.ts` (currently empty array). |
| 12 | E-430 End of Day | 14 | Card creation + activation gate, Day summary + affirmation, Incomplete roll-up, Note Review + Reassignment, Supply Needs (STUB), What's Next (STUB), Wrap Shift. | `app/staff/task/[id]/EODCard.tsx`; `lib/orchestration/rules/eod.ts` (currently empty array). |
| 13 | Admin Home | 14 | `/admin` cream surface: header, daily brief, 2×2 mini-status grid (Watchlist / Scheduling / Critical Issues / Notes), Activity feed, Staff/Tasks/Maintenance lanes. | `app/admin/page.tsx` (post-beta UI build, not yet rebuilt). |
| 14 | Admin Staff Roster | 12 | `/admin/staff` sky-blue 2×2 grid: 4 staff cards (Courtney/Lizzie/Angie/Mark), avatars, names, role, metrics trio, drill-in. | `app/admin/staff/page.tsx` (post-beta UI build, Track 1a). |
| 15 | Admin Staff Profile | 13 | `/admin/staff/[id]` sky-blue: header, stats trio, Daily summary, Running shift summary (lifetime), 14-day segment, Stand-out instances, Notes by user, Pause log, Maintenance authored, Activity feed (per-staff). | `app/admin/staff/[id]/page.tsx` (post-beta UI build, Track 1a). |
| 16 | Admin Tasks Dashboard | 7 | Tasks lane: master task list, filters, time-by-location, tap → modal. | `app/admin/tasks/page.tsx` (post-beta). |
| 17 | Admin Task View Modal | 7 | Read-only mirror of staff card with admin actions: Reassign, Override / force-complete, Edit guest fields. Dulled bucket-color shell. | `app/admin/tasks/[id]/page.tsx` or modal component (post-beta). |
| 18 | Admin Maintenance | 7 | `/admin/maintenance/[id]` sage-green: master tables (by location, by type), per-issue card with severity + photo + reporter + room, resolution actions. | Existing maintenance-table direction; admin UI not built. |
| 19 | Admin Weekly Recap | 4 | Single-row STUB. Post-beta cream-inset reading surface. | Out of beta scope. |
| 20 | Admin Calendar | 10 | Post-beta surface: scheduling, pre-shift card assignment, coverage detection, 14-day segment indication, payroll tracking, staff-shortage alerts. | `app/admin/calendar/*` (post-beta, path TBD). |
| 21 | Admin Category Cards | 8 | Post-beta stub: one card per Note Type. Maintenance category partially built today (3-sink pattern); 10 others post-beta. | Pattern target: copy Maintenance 3-sink pattern for the other 10 Note Types post-beta. |
| 22 | Admin KB Editing Tool | 8 | Post-beta stub: tree-view editor with add/remove/relocate/adjust per branch; triggers Updates panel cascade on save. | `app/admin/kb/*` (post-beta, path TBD). |
| 23 | Post-Beta BR Queue | 38 | Snapshot of ~35 BRs accumulated across Day 16-20 handoffs. **Reference, not authoritative** — current Day 22 queue lives in `docs/handoff-day-22.md` and `docs/phase-4-handoff.md`. | Cross-check at next BR triage; do not treat as primary. |
| 24 | Open Assumptions | 26 | 22 numbered flags for transcription assumptions, source-doc contradictions, deferred questions. | Bryan double-check before treating any related row as load-bearing. |
| 25 | Update Cadence | 9 | When to re-pass the doc (handoffs > Day 20, Rules.md revisions, Reservations BR ships, auto-assignment ships, STUB sections wire). | Process — read on each major delivery. |

---

## Per-tab detail

### 1. README · 48 rows · prose

Preamble + source-doc precedence + column key + conventions. Captures: visibility model (staff = execution-only; admin = everything), no card-exclusive logging, time-tracking dual sink (staff profile + location table), notes routing dual sink (individual log + category card), no orphan cards, KB authority, internal vs. display copy, time-arc order lock, sequential gating (staff hard, admin none), `tasks.card_type` enum has 8 values (six visible buckets + `housekeeping_turn` legacy alias + `generic` catch-all + `maintenance` admin-side).

### 2. Schema Reference · 14 rows · 12-col

Tabs: `tasks` columns, `tasks.card_type` enum, `tasks.context` JSONB, **merge-safe write contract** (`{ ...(currentTask.context ?? {}), <subkey>: { ...(currentTask.context?.<subkey> ?? {}), <new fields> } }`), `inbound_events`, `task_drafts`, Reservations (post-beta), Auth (Supabase magic-link), Storage (post-beta photo pipeline), Cron (GH Actions during beta → pg_cron post-beta), Routes summary (no `/staff/[bucket]` route — drill is direct from home → task UUID).

**Cross-references:** `lib/supabase.ts`, `lib/orchestration/interpret.ts` context-build logic, `docs/TASK_EVENTS_CONTRACT.md`, `docs/supabase/milestone1_architecture_lock.sql`.

### 3. Global Rules · 29 rows · 12-col

Cross-surface rules grouped into 11 Section buckets:

- **Identity & auth** — User role, Active shift (clock-in state).
- **Time tracking** — Card open duration (dual sink), Time between cards (1 min standard; 2× 5-min and 1× 15-min breaks; threshold breaches → admin note), 14-day segment bucket (Wed-anchored, 2-week window).
- **Note model** — Note Type (11 types), Note Status (5: Urgent/Today/This week/Upcoming/Just Noting), Note Assigned-to (5: Employee/Guest/Desk/Admin/Room), Note routing on close-out, Note routing — category cards (dual sink: individual log + category card).
- **Maintenance model** — Location, Item/Sub-location, Type, Severity (Low/Normal/High; High → live admin push), Photo attachment, Routing (3 sinks: location table + type table + admin task card).
- **Updates panel** — Two paths (admin schedule + KB edit auto-populate for next 2 shifts of related users); first shift highlight red, second green; unclicked over 2 shifts → admin notified.
- **Activity feed (admin)** — Live event stream; pulls from Rules.md Triggers/Logs catalog.
- **Reservations** — Post-beta wiring; today inbound_events only.
- **Audit / archival** — Closed card archive; searchable by date/guest/type/location/user; never editable.
- **Photo / media** — Upload from compose drawer; post-beta endpoint.
- **Card lifecycle** — Reassignment dual-logging (both prior + new staff get individual log entries), Card order rotation within a bucket (intra-bucket — distinct from cross-bucket Pre-stayover reshuffle).
- **Knowledge Base** — KB system entity (read-only for staff always; admin writes via KB editing tool only), Detail viewing out of order (gating is on complete action, not view action).
- **Triggers / logs** — Repeated-instance meta-trigger (when per-instance trigger fires above threshold, additional admin log + note).

**Integration target:** several Wave 4D schema additions (`done_at`, `context.notes`, etc.); future `lib/notes.ts`; `lib/activity-log.ts`; `lib/checklists/types.ts` (KB metadata fields: Tools / Chemicals / Photo).

### 4. Hallway + Assignment · 16 rows · 12-col

The most operationally dense tab. Sections: **Hallway model** (room→hall mapping; hall sequence — note Room 43 lives in 20s hall; two-cart property-wide cap), **Assignment policy** (primary-housekeeper lane: up to 2 primaries handle stayovers + arrivals, one to 30s, other to 20s, lighter-load primary takes 40s; non-primary load = more departures + dailys; departure within-hall priority stack: Has Sheets > Odobanned > Stripped > Open > Checked Out; cross-cutting bumps in stated order; hallway adjacency rule with override audit; housekeeper context load adjustment for 5+ consecutive days + past performance flags; no-orphan-cards rule; standard load 5 dep / 10 stay / 15 daily per housekeeper), **Timing windows** (Stayover/Arrival start 11am weekdays / 12pm weekends + holidays; Arrival hard deadline 2pm; Pre-stayover reshuffle near window).

**Integration target:** This tab IS the spec for **item C in the Day 22 queue (auto-assignment).** Drives:
- `lib/orchestration/rules/{arrivals,departures,stayovers,dailys}.ts` — `assignment.specific_member_id` policies and `priority_boost_if` strings.
- A new `lib/orchestration/assignment-policies.ts` (or similar) for hall-balanced, primary-only-when-3+, standard load, hallway adjacency, no-orphan rules.
- Departure priority stack consumed by `interpret()` or downstream sort.
- Pre-stayover reshuffle as a new phase in the orchestrator.

### 5. Pre-Clock-In · 6 rows · 12-col

Three rows of content: Greeting, Profile link (note: **staff-side** profile carries non-log content only; all log/audit/aggregate data lives on `/admin/staff/[id]`), "Start your day" CTA (triggers shift timer + 14-day segment write).

**Integration target:** `app/staff/page.tsx` pre-clock-in branch (already exists in some form).

### 6. Staff Home · 15 rows · 12-col

Sections: Header (greeting / date / Plus quick-add — currently visual placeholder), Daily Brief card (Arrivals/Departures/Stayovers count — wired live in Day 21 BR3), Bucket stack (card order = time-arc locked; active card = first non-done; bucket count badge derived; "Next up" inset; done state visual), Footer.

**Integration target:** `app/staff/page.tsx` (already wired). Confirms existing implementation matches spec.

### 7. SOD-430 Start of Day · 23 rows · 12-col

Sections: card creation/header (auto-created daily for every clocked-in housekeeper), Daily Brief (notes from admin / At a Glance counts / Team list / Weather Google API / Events admin+Google / guest-context Notes), Updates panel, Notes compose, Tasks (KB-driven from Start of Day doc — Front Desk → Supply Room → Laundry Room sections; assignment uses `*` primary / `+` secondary symbols; section-gated), Maintenance, Need Help, Pause/Resume, Start Shift (target 5–15 min, ±thresholds → admin note).

**Integration target:** `app/staff/task/[id]/StartOfDayCard.tsx`; this tab is the missing spec for the **`start_of_day` rule file** (does not exist yet under that name — there's an empty `dailys.ts` and `eod.ts`, and `start_of_day` rules generation may currently sit elsewhere — confirm with CC).

### 8. D-430 Departures · 41 rows · 12-col (largest data tab)

Sections: card creation/order/execution gate (locked until Departure Status ≥ "Open"), Header `Departure · {Room#} · {RoomType} · {GuestName}`, **Outgoing** (guest name / count / nights / extras), **Incoming** (guest name / count / arrival time / nights / history / guest notes / extras — only renders if room has same-day arrival), Departure Status (Checked Out / Open / Stripped / Odobanned / Has Sheets — admin-set, staff display-only, drives priority order), Updates panel, **Setup** (Temperature 5 weather bands; Room Spray seasonal — Apple Orchard / Fir Tree / The One / Day Dream; Other admin notes; Guest-Based notes — Longterm Prep, modified discounted), Arrival Status (display-only, fourth state TBD), Checklist (clean type Standard/Deep/Pet — Wed-occupancy rule for Deep; room-type variant — Queen/Double/ADA Double/Jacuzzi/ADA Jacuzzi/Suite; sections from KB tree ~14 top-level), Notes, Deep Clean tray (Task / Completed On / By / Details, 30-day rolling history per room), Maintenance, Need Help, Pause/Resume, I'm Done.

**Integration target:** `app/staff/task/[id]/DeparturesCard.tsx`; `lib/orchestration/rules/departures.ts`; `lib/checklists/variants/*.ts` (room-class deltas via `withAdditions`); `docs/supabase/*.sql` for Departure Status table + Deep Clean schema.

### 9. S-430 Stayovers · 25 rows · 12-col

Sections: card creation (one per stayover guest per day, "stayover" = checked in before today, checks out after today), assignment (matching hallway as their departures), 11am/12pm start, Header `Stayover · {Room#} · {RoomType} · {Guest} · Night # of #`, **Status card** (DND / Guest OK / Desk OK / Sheet Change / Done — staff-set default unselected; admin can pre-select; pre-selection of DND/Desk OK/Guest OK auto-completes + auto-archives; Sheet Change/Done are standard admin override; **staff-tracked percentages key off STAFF selections only — admin pre-selections do NOT count**), Status time targets (DND=1min ±50%; Guest OK=≤5min ±30%; Desk OK=1min ±30%; Sheet Change=15–25min ±25%; Done standard=8–15min ±30%; Done long-term/*=3–8min ±40%), Guest Details (incl. Last Stayover Status with exact phrasing rules), Updates panel, Checklist (Standard / Sheet Change weekly for stays >7 nights / * guest variant — section list per Stayover KB doc: Status, Open Room, Remove, Replace, Bed, Clean, Close), Notes, Maintenance, Need Help, Pause/Resume, I'm Done.

**Integration target:** `app/staff/task/[id]/StayoversCard.tsx`; `lib/orchestration/rules/stayovers.ts`; status pill is shipped display-only as of Phase 3.

### 10. A-430 Arrivals · 27 rows · 12-col

Sections: card creation, assignment (primaries, matching hallway), 2pm hard deadline, Header `Arrival · {Room#} · {RoomType} · {Guest}` (note: Open Assumption #1 — Rules.md says "Stayover · ..."; assumed typo), Guest Details (name / count / arrival time / nights / history / notes / extras), Updates panel, Setup (Temperature / Room Spray / Other / Guest-Based — same model as D-430 Setup), Checklist (Standard / Long-term / * guest — sections per Arrival KB doc: Open Room, Arrival Notes, Prep, Double Check, Close), Notes, Need Help, Pause/Resume, I'm Done (target ≤5 min per room ±20%).

**Integration target:** `app/staff/task/[id]/ArrivalsCard.tsx`; `lib/orchestration/rules/arrivals.ts`.

### 11. Da-430 Dailys · 18 rows · 12-col

Sections: card creation (one per shift per assigned housekeeper — **rules file currently empty**), realtime task reassignment (other staff completion → unassigned dailys redistribute toward the goal of all staff hitting EOD around the same time), Header, Team Update (STUB — show where each on-shift staff member is + which task), Updates panel, Notes, Tasks (KB-driven daily/weekly/monthly; bundled by location; section-gated), Per-task time estimate (sum + 5-min card overhead = card target; ±20% triggers admin note; 3 instances in 30 days → log + note), Distribution rule (primaries get fewer dailys when assigned stayovers/arrivals; ≥80% or ≤20% of team dailys → admin note), Maintenance, Need Help, Pause/Resume, I'm Done.

**Integration target:** `app/staff/task/[id]/DailysCard.tsx`; `lib/orchestration/rules/dailys.ts` (must be authored from scratch — content lives in this tab + Jennifer's daily-tasks input).

### 12. E-430 End of Day · 14 rows · 12-col

Sections: card creation (always created; locked until all other cards complete), card activation gate (last non-EOD card on shift completes → unlocks), Status (Day summary computed: # departures, # stayovers, # arrivals, # daily tasks, total hours; Affirmation line from preset KB list), Incomplete (per-task / per-checklist roll-up; each instance prompts staff to revisit + add explanation note), Note Review (all-notes index for shift), Note Assignments (reassignment checkbox per note → admin category card), Supply Needs (STUB — populates admin card), What's Next (STUB — tomorrow's preview), Need Help, Wrap Shift (target 10 min ±15%; cannot wrap until all on-shift housekeepers are in their EOD card unless modified shift or admin override).

**Integration target:** `app/staff/task/[id]/EODCard.tsx`; `lib/orchestration/rules/eod.ts` (currently empty); EOD derived queries are Wave 4E real data verticals.

### 13. Admin Home · 14 rows · 12-col

`/admin` cream surface. Sections: Header (greeting / date), Daily Brief card (same Arrivals/Departures/Stayovers count model as staff home), 2×2 mini-status grid (Watchlist / Scheduling / Critical Issues / Notes), Activity feed (Rules.md Triggers/Logs catalog), Staff lane (sky-blue not used — cream shell only on admin home; sky-blue lives only on staff drill-in), Tasks lane, Maintenance lane (sage green `#BACBA0` / `#8A9B75` / `#2C3A1D` per Profile surfaces handoff).

**Integration target:** `app/admin/page.tsx` rebuild (Track 1d post-beta UI work).

### 14. Admin Staff Roster · 12 rows · 12-col

`/admin/staff` sky-blue 2×2 grid. Sections: 4 staff cards (Courtney/Lizzie/Angie/Mark), Per card (Avatar with locked per-staff gradient — CM peach, LL sky, AL coral, MP sage; Name 2-line stacked; Role/subtitle; Metric: rooms assigned; Metric: open; Metric: done today; Action button drill-in to `/admin/staff/[id]`; Highlighted state for "currently on shift").

**Integration target:** `app/admin/staff/page.tsx` rebuild (Track 1a post-beta UI work).

### 15. Admin Staff Profile · 13 rows · 12-col

`/admin/staff/[id]` sky-blue. Sections: Header greeting hero, Stats trio (rooms assigned / open / done today), **Daily summary** (today's cards + per-card durations + totals), **Running shift summary** (lifetime — every shift this staff member has worked), 14-day segment (current segment time logs), Stand-out instances (rule violations from Triggers catalog), Notes by user, Pause log (reason note required on unpause), Maintenance authored, Activity feed (per-staff subset of global feed).

**Integration target:** `app/admin/staff/[id]/page.tsx` rebuild (Track 1a post-beta).

### 16. Admin Tasks Dashboard · 7 rows · 12-col

Sections: Tasks lane (master task list across all staff and buckets), Filters (bucket / staff / status / time), Time-by-location running list (location-time + user-time both surfaced), Tap → Admin Task View modal.

**Integration target:** `app/admin/tasks/page.tsx` (post-beta).

### 17. Admin Task View Modal · 7 rows · 12-col

Read-only mirror of staff card with admin actions. Bucket-color **dulled variant** (`--arrivals-dull-*`; tokens for stayovers/dailys/eod still TODO per BR — see Post-Beta BR Queue row 27). Actions: Reassign (logs both staff records), Override / force-complete (note required), Edit guest fields (mirrors RES editable fields).

**Integration target:** Modal component (post-beta); also depends on Admin Task View save-and-deploy merge-safe write (Open Assumption #20 / BR snapshot row 18).

### 18. Admin Maintenance · 7 rows · 12-col

`/admin/maintenance/[id]` sage green. Master tables (open issues by location; open issues by type), Per-issue card (severity + photo + reporter + room), Resolution actions (admin marks resolved with note).

**Integration target:** Existing maintenance schema + admin UI build (post-beta UI). The Maintenance category is the canonical 3-sink pattern referenced in Admin Category Cards.

### 19. Admin Weekly Recap · 4 rows · 12-col

Single STUB row. Out of beta scope. Cream-inset reading surface candidate per Visual Design Lock Final.

### 20. Admin Calendar · 10 rows · 12-col

Post-beta surface. Sections: surface stub; Scheduling (shift entry — date, staff, role, hours, primary/non-primary; Pre-shift card assignment — system pre-assigns based on scheduled staff + reservation forecast; replaces today's manual pre-assignment); Coverage detection (compares projected workload against scheduled staff per shift); Segments (14-day Wed-anchored windows); Payroll tracking (clock-in / Wrap Shift events surface on calendar); Notifications (staff-shortage alert with reminder fire daily until enough staff scheduled).

**Integration target:** `app/admin/calendar/*` (post-beta, path TBD). Drives the eventual auto-assign that today is item C in Day 22 queue (manual).

### 21. Admin Category Cards · 8 rows · 12-col

Post-beta stub. One card per Note Type (11 types). **Maintenance category is partly built today** (3 sinks: location table, type table, admin task card — treat as canonical pattern for the other 10 categories' eventual build). Other categories pending: Guest Needs, Guest Profile, Guest Damage, Guest Update, Supply, Admin, Team, Change/Update, Employee, Needed.

### 22. Admin KB Editing Tool · 8 rows · 12-col

Post-beta stub. Tree-view editor over the KB scaffolding. Edit operations: add / remove / relocate / adjust branch (one branch per session). Editing scope: Title / Detail / Tools / Chemicals / Photo metadata. Save → triggers Updates panel cascade (next 2 shifts of relevant staff: red 1st shift, green 2nd, admin notified after 2 unclicked). Open questions (Open Assumption #19): versioning + change history; branch-move semantics on existing checklist refs / queued Updates / archived cards; intra-KB cross-references; variant lists; taxonomy editing.

### 23. Post-Beta BR Queue · 38 rows · 4-col (BR / Source / Surface / Description)

Snapshot of ~35 BRs from Day 16-20 handoffs. **Reference, not authoritative** — current Day 22 queue lives in `docs/handoff-day-22.md` open items (A through J) and `docs/phase-4-handoff.md`. Useful when cross-checking whether a granular BR (e.g., "Welcome-specific checklist forks for Arrivals / Stayovers", "Photo upload pipeline", "@mention autocomplete") has been folded into a current queue item or dropped.

Sample BRs to be aware of:
- Reservations BR1-BR5 (BR1-BR3 shipped Day 21; BR4 + BR5 still queued).
- Departures schema additions (`Nights Stayed`, `Clean Type`, `Extras` on `context.departures_guest`).
- Incoming guest schema (`context.incoming_guest`).
- Deep Clean structured form (separate table or subkey).
- Photo upload pipeline (Supabase Storage bucket + RLS).
- `@mention` autocomplete inside notes.

### 24. Open Assumptions · 26 rows · 2-col (# / flag)

22 numbered flags. Highlights worth knowing before treating any rule as load-bearing:

1. **A-430 header copy** — Rules.md says "Stayover · ..."; assumed typo, transcribed as "Arrival · ...".
2. **Arrival Status fourth state** — Rules.md leaves blank (`__________`).
3. **Plus quick-add button** — visual placeholder only.
4. **Staff completion metric** — gentle pace-keeper vs. admin-only; treated as Admin-only.
5. **Auto-assignment** — currently manual; all "RULES auto-assign" rows are target behavior.
6. **Reservations table** — doesn't exist as of doc authoring; BR1 shipped Day 21 since.
7. **Dailys / EOD / Maintenance rule files** — empty per Day 21 status.
11. **Maintenance section across all cards** — Rules.md says every housekeeping card has a Maintenance section; Day 19's per-card composition only put it on some.
12. **Pause / Resume affordance placement** — Day 19's locked CTA bar is Need Help + I'm Done / Start Shift / Wrap Shift only; pause must live somewhere specific.
14. **Visibility model** — RESOLVED end of Day 21 by Bryan.
15. **Stayover Status** — RESOLVED with explicit pre-selection rules.
16. **`tasks.card_type` enum extras** — `housekeeping_turn` (legacy?), `generic` (catch-all?), `maintenance` (admin-side?) — Bryan should confirm against live schema.
17. **KB Standard Departure section list expansion** — Rules.md summarizes 7 sections; KB tree has ~14 top-level. KB tree wins.
19. **KB editing tool detail questions Bryan is taking.**
20. **Admin Task View modal save-and-deploy write path** — BR-listed but not wired.
22. **Welcome-specific checklist forks** for A-430 / S-430 — currently aliased to Departures canonical 7-item.

### 25. Update Cadence · 9 rows · 2-col (prose)

Re-pass the doc when: a handoff doc > Day 20 lands; Rules.md gets revised for Dailys/EOD/Maintenance; Reservations BR pack ships (graduates RES rows); auto-assignment ships (drops "currently manual"); any STUB section receives real wiring.

---

## Integration mapping — where each tab feeds in the codebase

Grouped by integration target, ordered by likely build sequence.

### A. Rule engine + assignment policies (high leverage — unblocks Day 22 item C)

| Tab | Feeds into |
|---|---|
| **Hallway + Assignment** | `lib/orchestration/rules/{arrivals,departures,stayovers,dailys}.ts` (`assignment.specific_member_id`, `priority_boost_if`). New `lib/orchestration/assignment-policies.ts` for hall-balanced / primary-only / standard load / hallway adjacency / no-orphan logic. |
| **Global Rules → Card lifecycle** | Reassignment dual-logging in `lib/orchestration/interpret.ts` post-promote step + `lib/activity-log.ts`. |
| **Global Rules → Time tracking** | `task_events` schema_version: 1 already supports card duration; dual-sink writes need `lib/staff-profile-log.ts` + `lib/location-log.ts` (post-beta or Wave 4D). |
| **Global Rules → Triggers/Logs catalog references** | Rules.md Triggers catalog drives `lib/activity-log.ts` events; this tab indexes which triggers exist but doesn't enumerate them — read Rules.md for the full catalog. |
| **D-430 Departures → Departure Status** | Status pill display-only on staff side (already shipped Phase 3); admin write-side via master Departures table (post-beta UI). Priority stack drives sort in interpret() or downstream. |
| **S-430 → Status time targets** | Add to `lib/orchestration/rules/stayovers.ts` deadline derivation; per-status time band metadata. |
| **A-430 → 2pm hard deadline** | Already in `lib/orchestration/rules/arrivals.ts` deadline field (verify). |

### B. Per-card UI alignment (verify Phase 3 cards match spec)

| Tab | Feeds into |
|---|---|
| **Staff Home** | `app/staff/page.tsx` — verify all 15 rows match shipped UI. |
| **SOD-430** | `app/staff/task/[id]/StartOfDayCard.tsx` — verify all 23 rows match. |
| **D-430** | `app/staff/task/[id]/DeparturesCard.tsx` — verify all 41 rows match Phase 3 shipped. |
| **S-430** | `app/staff/task/[id]/StayoversCard.tsx` — verify status pill + time targets. |
| **A-430** | `app/staff/task/[id]/ArrivalsCard.tsx` — verify 2pm deadline display + header copy (note Open Assumption #1). |
| **Da-430** | `app/staff/task/[id]/DailysCard.tsx` — verify; also drives `lib/orchestration/rules/dailys.ts` authoring. |
| **E-430** | `app/staff/task/[id]/EODCard.tsx` — verify; also drives `lib/orchestration/rules/eod.ts` authoring. |
| **Pre-Clock-In** | `app/staff/page.tsx` clock-in branch. |

### C. Schema additions (Wave 4D + adjacent)

| Tab | Feeds into |
|---|---|
| **Schema Reference** | `docs/supabase/*.sql` — confirms tasks.context subkey conventions, merge-safe write contract, inbound_events shape. |
| **Global Rules → Note model** | Future `notes` table + 11 Note Types enum + Note Status / Note Assigned-to taxonomies. |
| **Global Rules → Maintenance model** | Existing maintenance scaffolding (location + type tables) + add Severity column if not present. |
| **D-430 → Deep Clean tray** | New `deep_clean_history` table or `tasks.context.deep_clean[]` subkey (BR snapshot row 10). |
| **Various → context subkeys** | `context.incoming_guest`, `context.outgoing_guest`, `context.current_guest`, `context.notes`, `context.incoming_guest.extras`, `context.current_guest.service_type` (Wave 4D from Day 22 queue item H). |

### D. KB content (NOT this spreadsheet)

The variant checklist trees in `lib/checklists/variants/*.ts` — `Detail: Text to come` placeholders — are NOT filled by this spreadsheet. They are filled from Jennifer's KB docs:
- `Stayover Standard KB Doc.docx.md` → S-430 checklist sections.
- `Arrival Standard KB Doc (1).docx.md` → A-430 checklist sections.
- `Knowledge Build Standard Departure.docx.md` → D-430 checklist sections (~14 top-level).
- `Start of Day.docx.md` → SOD-430 task list.
- `Alternatives to the standard lists.docx.md` → room-class deltas (already encoded in Day 21 variant files).

This spreadsheet governs *whether and how* these checklists render and gate; Jennifer's docs govern *what* they say.

### E. Admin surfaces (post-beta UI build)

| Tab | Feeds into (post-beta) |
|---|---|
| Admin Home | `app/admin/page.tsx` rebuild (Track 1d). |
| Admin Staff Roster | `app/admin/staff/page.tsx` rebuild (Track 1a). |
| Admin Staff Profile | `app/admin/staff/[id]/page.tsx` rebuild (Track 1a). |
| Admin Tasks Dashboard | `app/admin/tasks/page.tsx`. |
| Admin Task View Modal | Modal component + merge-safe write. |
| Admin Maintenance | `/admin/maintenance/[id]`. |
| Admin Calendar | `app/admin/calendar/*` — drives auto-assign post-beta. |
| Admin Category Cards | One card per Note Type — Maintenance pattern × 11. |
| Admin KB Editing Tool | `app/admin/kb/*` — tree editor + Updates cascade. |
| Admin Weekly Recap | Post-beta cream-inset reading surface. |

---

## What to chase first (recommendation, not commitment)

After Bryan reviews this index, three plausible first integrations:

1. **Auto-assignment policies (Day 22 item C).** Hallway + Assignment tab is the spec. Highest unlock — every promoted draft today lands `staff_id: null`. Authoring `lib/orchestration/assignment-policies.ts` from this tab plus filling in `assignment.specific_member_id` per Jennifer's policy ends the unassigned-task gap and makes the demo end-to-end.
2. **Author empty rule files: `dailys.ts`, `eod.ts`.** Da-430 Dailys + E-430 End of Day tabs give the spec; fold in Jennifer's task lists for actual content. Currently empty arrays.
3. **Verify Phase 3 cards match spec.** A-D pass through the six X-430 tabs against the shipped cards in `app/staff/task/[id]/*Card.tsx`. May catch drift between Day 19/20 design and Phase 3 build.

---

## Operating notes

- **This is a synthesized index, not an authority.** The spreadsheet itself is the authority. When in doubt, open the source file.
- **Source-doc precedence (above) overrides the spreadsheet** when the spreadsheet contradicts a higher-priority source.
- **22 Open Assumptions** are flagged for Bryan to confirm; treat any related row as soft until confirmed.
- **All file edits route through CC** per Day 22 operating pattern. This index is a brand-new doc, so authoring it directly is in-bounds.
- **Re-pass cadence** per the Update Cadence tab — re-anchor after handoffs > Day 22, after Rules.md revisions, after major BR ships.

---

*End of index.*
