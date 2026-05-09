# Dispatch Master Plan — "All of It" (No Cuts)

*Authored 2026-05-04, end of Day 24. Living document. Bryan + Jennifer triage from this; cuts get marked, not deleted.*

*Source-of-truth references: `docs/kb/Dispatch — Rules Table for Card and Section Governance.xlsx` (governance), Jennifer's KB docs (checklist content), `lib/dispatch-config.ts` (static reference data), Day 23/24 handoffs (current state).*

---

## How to read this doc

Each item below has:
- **State**: BUILT (fully shipped per spec) · PARTIAL (shipped in some form, gaps remain) · UNBUILT (nothing yet) · AUTHORING (waiting on Jennifer's content) · INTEGRATION (waiting on external system)
- **Size**: S (≤4h) · M (0.5–1d) · L (1–3d) · XL (3+d)
- **Spec**: row reference in the governance spreadsheet, KB doc, or other source
- **Blocker** (where present): what gates this item

Anything already shipped is NOT in this doc — see Day 24 handoff for the foundation.

If Jennifer cuts an item, mark `[CUT]` next to it. If we deviate, mark `[DEFER]` or `[CHANGED — see X]` and note where the new spec lives. Never delete rows.

---

## Current state (Day 51) — what's actually left

*Added 2026-05-08 (Day 49); refreshed end of Day 51. The Day 24 inline State labels in this doc are the baseline at master plan authorship time and are STALE. Canonical override for closure status: `docs/STATE.md` "Closure ledger — master plan items closed (Days 27-51)." This section is the live filter on what remains post-beta as of end of Day 51.*

**Headline count: 89 items remaining** = 58 master plan items across Sections I–X + 22 STATE.md standing-tabled items + 9 STATE.md Open Jennifer questions. Many cluster under shared blockers (Jennifer's KB authoring lane + Cloudbeds sales quote + v2 task_events vocabulary widening), so the practical ship-ordering surface is smaller than 89 once dependencies collapse.

**Beta-scope boundary** (per CLAUDE.md — these 5 are IN beta and excluded from the inventory below):
1. Manager/admin can create + assign tasks with bucket → SHIPPED.
2. Staff sees 6 buckets in time-arc order → SHIPPED.
3. Staff can open card, pause, complete checklist, upload note/image, mark done → SHIPPED.
4. Every state change writes `task_events` (`schema_version: 1`) → SHIPPED.
5. Vercel deploy at https://dispatch-app-iota.vercel.app/ → SHIPPED.

### Section I — Staff cards (6 items)

- **I.D — SOD-430 Start of Day card data wirings.** Daily Brief notes/at-a-glance/team list/weather/events/guest-context wiring + KB-driven tasks section + compose drawers. Blocked on V.D weather, V.E Google Events.
- **I.E — D-430 Departures card full data layer.** Outgoing/incoming guest blocks, Departure Status master-table drive, Setup section temp/scent wiring, Arrival Status mirror, clean-type detection, Deep Clean tray with `deep_clean_history` per-task 30-day, I'm Done time matrix. Blocked on II.F admin Departure Status master, VI.F D-430 matrix from Jennifer, V.D weather.
- **I.F — A-430 Arrivals card full data layer.** Header copy fix (Open Assumption #1), live guest details, Setup section, checklist Type header + sections from Arrival KB doc. Blocked on V.D weather + V.A BR4 downstream wiring.
- **I.G — S-430 Stayovers full execution.** Status pill time-target display, full guest details wiring, Status-driven auto-complete + auto-archive, Sheet Change skip semantics. Sub-item 1 closed Day 45; sub-items 2/3 blocked on chase #1 (`stayover_status` orchestrator pre-set), sub-item 4 blocked on Jennifer KB.
- **I.H — Da-430 Dailys card.** Realtime task reassignment, Team Update live, KB-driven tasks, per-task time estimates, distribution rules. Blocked on IV.F `dailys.ts` rule file, VI.G Jennifer's daily-task list, VII.G team roster view.
- **I.I — E-430 End of Day card.** Day summary computed, incomplete roll-up, Note Review + assignments, Supply Needs sink, What's Next preview, Wrap Shift target/gating. Blocked on IV.F `eod.ts`, VI.C Affirmations, VII.A supply_needs schema, team roster, tomorrow's data joins.

### Section II — Admin surfaces (4 items)

- **II.I — Admin Category Cards (10 of 11 Note Types).** Maintenance built; copy 3-sink pattern for Guest Needs, Guest Profile, Guest Damage, Guest Update, Supply, Admin, Team, Change/Update, Employee, Needed. Post-beta polish, no blocker.
- **II.J — Admin KB Editing Tool (`/admin/kb/*`).** Tree-view editor with add/remove/relocate/branch operations + Updates panel cascade. XL. Explicitly post-beta; blocked on VII.H KB versioning + KB authoring stability.
- **II.K — Admin Calendar.** Scheduling, pre-shift assignment, coverage detection, 14-day visualization, payroll, staff-shortage alerts. Explicitly post-beta.
- **II.L — Admin Weekly Recap.** Cream-inset recap surface. Out of beta scope.

### Section III — Cross-cutters (6 items)

- **III.C — Updates panel** (admin authoring + staff display + KB cascade). Two-path Updates with red/green shift highlighting + 2-shift admin escalation. Blocked on II.J KB Editing Tool.
- **III.F — Time tracking dual-sink + between-cards.** Card-open dual-sink to staff profile + location table; 1-min standard + 2x5+1x15 break allowance with admin-flag "approved break"; threshold breaches trigger note. Pending III.I repeated-instance trigger.
- **III.G — Section-level sequential gating.** Bucket-level closed Day 30; within-card section gating still partial.
- **III.H — Card rotation + pre-stayover reshuffle.** Reassignment dual-logging closed Days 34-35; intra-bucket completed-card rotation + 11am/12pm pre-stayover reshuffle still UNBUILT (IV.D pairs).
- **III.I — Repeated-instance meta-trigger.** Fires additional admin log + note when per-instance triggers exceed thresholds over windows. Pairs with IV.J.
- **III.K — Audit / archive closed-card search.** Searchable by date/guest/type/location/user with exceptions filter. Read-only forever; schema strategy unresolved.

### Section IV — Rule engine (10 items)

- **IV.A — Auto-assignment policies.** New `lib/orchestration/assignment-policies.ts` consuming dispatch-config exports; primary/non-primary lanes, departure within-hall priority, cross-cutting bumps. XL, blocking — without it every promoted draft lands `staff_id: null`.
- **IV.B — Hallway adjacency rule.** Don't move housekeeper between halls before starting hall complete; admin-overridable.
- **IV.C — No-orphan-cards rule.** Every card always assigned to someone on shift; 0-housekeepers escalation.
- **IV.D — Pre-stayover reshuffle phase.** 11am weekday / 12pm weekend reshuffle (in-flight cards not interrupted).
- **IV.E — `assignment.specific_member_id` per Jennifer's policy.** Fill `[ASK JENNIFER]` markers in arrivals/departures/stayovers rule files. Blocked on Jennifer's standing assignment policy.
- **IV.F — `dailys.ts` + `eod.ts` rule files.** Currently empty arrays. Blocks I.H + I.I.
- **IV.G — D-430 time-target matrix fill.** 18 null cells in dispatch-config. AUTHORING; blocked on Jennifer's Rules for HouseKeeping doc. Pairs with VI.F.
- **IV.H Phase B — Wed-occupancy Deep Clean cond 3 occupancy gate.** Phase A closed Day 43; Phase B blocked on Open Jennifer question (data source for occupied-room-nights + total-rooms denominator).
- **IV.I — Realtime task reassignment for Dailys.** Unassigned dailys redistribute as staff complete cards.
- **IV.J — Repeated-instance meta-trigger interpreter.** Engine-side detection logic. Pairs with III.I.

### Section V — Data layer + integrations (6 items)

- **V.B — BR5 reservations cancellation/modification edge cases.** Webhook idempotency, modification cascades, soft-delete filtering edges.
- **V.C — Channel manager Cloudbeds (or fallback).** XL post-quote. Blocked on Bryan's Cloudbeds sales quote. Chase queue #3.
- **V.D — Weather API integration (D-430 Temperature).** 1pm-6pm avg, fallback to last known + flag.
- **V.E — Google Events / Holidays integration (SOD-430).** Admin events + Google holidays merged.
- **V.F — Holiday calendar (R13 weekend rule extension).** Saturday/Sunday/Holidays. Bryan leans toward deferring to admin override pre-beta.
- **V.H — ResNexus replacement payload mapping.** One-word `cloudbeds` source enum extension. Pairs with V.C.

### Section VI — Jennifer's KB authoring lane (8 items, parallel non-blocking)

- **VI.A — Detail prose for "Text to come" placeholders** in `lib/checklists/variants/*.ts`.
- **VI.B — Welcome-specific checklist forks (A-430, S-430).** Currently aliased to D-430 canonical 7-item.
- **VI.C — Affirmations preset list (E-430 Status section).**
- **VI.D — Rotating phrases libraries** (E-430 wrap headlines, SOD-430 date-context).
- **VI.E — Variant lists spec** (Sheet Change, Pet, Deep, *** guest, Long-term). Decision pending: separate sub-trees with `applies_when` vs full alternate trees.
- **VI.F — D-430 time-target matrix** (18 null cells). Cross-references IV.G.
- **VI.G — Per-Daily/Weekly/Monthly task time estimates (Da-430).**
- **VI.H — Note Type writing examples / templates per category.**

### Section VII — Schema + RLS (5 items)

- **VII.A — Supply needs table** (or derived view from `notes` where `note_type='Supply'`). Decision before adding.
- **VII.C — Audit / archive search index strategy.** Index existing tables + `archived_at` flag, vs dedicated audit_log.
- **VII.F — Photo storage RLS policies tighten path.** Audited Day 40, kept as-is for beta. Tighten requires switching to signed-URL async fetch with token rotation. Revisit when tenancy boundaries get real.
- **VII.H — KB versioning + change history.** Affects Updates panel highlighting, audit trail, rollback. Tied to II.J.
- **VII.I — Weather + holiday calendar tables.** Optional caching; can defer to live API calls pre-beta.

*VII.B CLOSED Day 51 — schema audit pass against Day 24 baseline; verified `docs/supabase/maintenance_issues_table.sql` complete and well-aligned with III.B + Global Rules R12-R17 (severity column FK to maintenance_severities, location/item/type FKs intact, 7 indexes including partial severity_high + open, denormalize trigger pulling room_number+card_type from parent task, 4 RLS policies mirroring notes). Day 33 + 39 + 41 + 42 consumers all shipped against this schema with zero friction. "+ extension" half deferred to post-beta (assignee column, parts table). See STATE.md closure ledger for detail.*

*VII.E CLOSED Day 51 — runtime fan-out helper at `lib/activity-feed.ts` formalized as the answer (neither table nor DB view). Reasons documented in STATE.md closure ledger: severity is DERIVED in TS per the contract, not a stored column; profile-name resolution joins through profiles RLS; three sources have asymmetric shapes; no profiling hot spot at beta scale. activity_events table dropped Day 29.*

*VII.G CLOSED Day 51 — `docs/supabase/team_roster_view.sql` defines `public.team_roster_v` (per-staff current-state snapshot: on-shift flag + current `in_progress` task via LATERAL + `is_in_eod` boolean matching `canWrapShift` definition). Pre-positions I.H Da-430 + I.I E-430 team displays + I.I cross-staff EOD activation gate. See STATE.md closure ledger for detail.*

### Section VIII — Deploy + ops (2 items)

- **VIII.F — pg_cron / Vercel cron migration.** Currently GitHub Actions; move post-beta.
- **VIII.G — Backup / restore strategy documentation.** Supabase auto-backup sufficient for beta; document restore.

### Section IX — Quality / non-functional (5 items)

- **IX.A — RLS hardening as new tables land.** Ongoing per table.
- **IX.B — Performance / index tuning as data scales.** Currently sized 21-room; multi-property requires re-tuning.
- **IX.C — Multi-property timezone support.** `PROPERTY_TIMEZONE` hardcoded `America/Chicago`; needs per-property column.
- **IX.D — Error reporting / monitoring SDK.** Currently disallowed per CLAUDE.md; post-beta reconsideration.
- **IX.E — Idempotency on all external integrations.** Reservations webhook idempotency keys, photo upload retries, cron retry semantics.

### Section X — Explicit post-beta deferred (master plan footer, 6 items)

- A. In-app KB-driven card generation agent.
- B. Multi-property support.
- F. Advanced photo pipeline (compression, multiple per note, captions).
- G. @mention autocomplete in notes.
- H. Multi-tenant / SaaS-mode.
- I. ResNexus integration (dead — Cloudbeds replaces; tracked under V.C/V.H).

### STATE.md standing-tabled (22 items, not tied to a master plan letter)

- `MODULE_TYPELESS_PACKAGE_JSON` Node warning (one-line follow-up).
- Re-key `dispatch-config.ts` Section 14 maps from full names to UUIDs.
- Legacy `task_comments` table cleanup (pre-beta dev data only).
- `lib/task-event-types.ts` extraction (post-beta polish — Day 29 Phase 7 duplicated 4 string literals + `TASK_EVENT_SCHEMA_VERSION` across 3 orchestration files).
- v1 → v2 `task_events` vocabulary widening (admin Save & Deploy `priority`/`admin_notes` edits surface in activity feed).
- II.G dulled-color tokens (`--sod-dull-*`, `--maintenance-dull-*`).
- Same-day re-clock loses pair accuracy in `staff_clock_in_event_trigger`.
- 24h `created_at` window for cross-staff EOD activation gate (multi-shift / overnight scenarios).
- `onImDone` `clockOut` is fire-and-forget on failure (admin SQL recovery only).
- High-severity push notification for maintenance issues (true live push deferred — beta uses sort-boost only).
- E-430 not a Maintenance host (defensive prop block stays).
- No automatic `tasks` row on maintenance issue insert (KISS — `maintenance_issues` row IS the third sink).
- No same-day-shift dedup on maintenance.
- Per-target-staff activity feed query (filter on `detail->>from_staff_id` / `to_staff_id` for III.H reassign rows).
- Verification kit data persistence (Lizzie test tasks left from Day 31/34).
- `/staff` page `now` set once at mount; late-Departures reshuffle won't fire mid-session without refresh.
- Explicit "re-open" / "un-complete" semantics post-Day-38 — `done` state is one-way; long-press undo post-beta.
- `/admin/maintenance/[id]` back-arrow always points to `/admin` (no context-aware return-to-list).
- Severity chip `severityBusy` indicator on `/admin/maintenance/[id]` invisible — no "Saving…" feedback.
- No "recently resolved" maintenance index (`/admin/maintenance/resolved` view).
- Admin-side photo thumbnail render not wired on `/admin/tasks/[id]` activity panel (audit trail only).
- Legacy 3-item checklist seed rows on pre-Day-49-hotfix `housekeeping_turn` tasks (cleanup SQL queued, destructive).

### STATE.md Open Jennifer questions (9 items)

- Six `[ASSUMED]` ADA cells in Section 9 D-430 matrix.
- D-430 tolerance convention — strict-bounds vs implicit ~20%?
- `AddTaskModal` maintenance-routing — confirm `staff_home_bucket: "start_of_day"` or surface as own bucket.
- Maintenance compose drawer cascading filter logic — swap flat dropdowns for runtime Location → Item → Type tree once authored.
- Reference Wednesday `2026-01-07` for `staff_segments_v`.
- "Courtney Manager" name format — surname or role marker leak?
- Stray `Lizzie` orphan row (id `fc2c4280-...`).
- Two `[ASK JENNIFER]` flags in `dispatch-config.ts` Section 14 (primary-staff identity + role-vs-spec drift).
- IV.H Phase B occupancy gate data source + total-room-count denominator.

---

# I. Staff execution surfaces

## I.A. Staff home — final polish
- **State**: PARTIAL (Day 20 rebuild shipped; gaps below)
- **Size**: S
- **Spec**: Staff Home tab (15 rows)
- Hard-lock sequential gating between buckets (non-active = blurred + pointer-events-none) needs verification across all six buckets.
- Plus quick-add button currently visual placeholder; needs wire-up to manager task creation flow OR removal from staff side per dispatch-ui-rules.

## I.B. Pre-Clock-In screen
- **State**: PARTIAL (some form exists; needs review against spec)
- **Size**: S
- **Spec**: Pre-Clock-In tab (6 rows)
- Greeting, profile link (staff-side profile carries non-log content only — all log/audit/aggregate data lives on `/admin/staff/[id]`), "Start your day" CTA. CTA triggers shift timer + 14-day segment write.

## I.C. Clock-In + Wrap Shift end-to-end flow
- **State**: PARTIAL (clock-in CTA exists; full timer + 14-day segment write + EOD activation gate unbuilt)
- **Size**: M
- **Spec**: Pre-Clock-In R05 + E-430 R03–R04 + R13
- Clock-In flips `clocked_out` → `clocked_in`, starts shift timer, writes 14-day segment row. Wrap Shift on E-430 closes timer, writes shift summary.
- EOD activation gate: locked until all other on-shift housekeepers are in their EOD card (exceptions: scheduled modified shift, admin override).

## I.D. SOD-430 Start of Day card
- **State**: PARTIAL (card shell shipped; data wirings missing)
- **Size**: L
- **Spec**: SOD-430 Start of Day tab (23 rows); Jennifer's "Start of Day.docx.md" for tasks content
- Daily Brief contents: notes from admin (pinned), at-a-glance counts (arrivals/departures/stayovers — wired Day 21 BR3), team list (first name + last initial + position), weather (Google API), events (admin-authored + Google holidays), guest-context notes.
- Tasks section: KB-driven Front Desk → Supply Room → Laundry Room. Section-gated. Per-task Detail link (KB nested-list pattern). Card target 5–15 min ±20% (assumed; pending Rules.md confirm).
- Notes compose drawer + Maintenance compose + Need Help + Pause/Resume + Start Shift footer all need wire-up.
- **Blocker**: Notes UI (Section III.A), Maintenance UI (III.B), weather integration (V.D), Google Events (V.E).

## I.E. D-430 Departures card
- **State**: PARTIAL (card shell shipped Phase 3; many sections placeholder)
- **Size**: XL
- **Spec**: D-430 Departures tab (41 rows — largest data tab)
- Outgoing guest block (name/count/nights/extras): live data wiring per BR4 + `context.outgoing_guest.extras`.
- Incoming guest block (only renders if same-day arrival): name/count/arrival time/nights/history/notes/extras live wiring.
- Departure Status indicator (Has Sheets / Odobanned / Stripped / Open / Checked Out): currently display-only `<span>` — needs admin master-table to drive it (admin write side unbuilt). Card execution gate (locked until ≥ Open).
- Setup section: Temperature wiring (`lookupTemperatureBand`), Room Spray wiring (`lookupSeasonalScent`), Other (admin one-shot or scheduled), Guest-Based notes (Longterm Prep / modified discounted arrival KB links).
- Arrival Status section (display mirror of Incoming Arrival Time + status pill; final state name TBD per Open Assumption #2).
- Checklist clean-type detection (Standard/Deep/Pet via Wed-occupancy rule), room-class variants (already encoded), section additions per clean type, item complete + section gating + Detail KB link.
- Notes compose, Deep Clean tray rendering (table + Completed-On checkbox + per-task 30-day history from new `deep_clean_history` table), Maintenance compose, Need Help, Pause/Resume, I'm Done.
- I'm Done time targets per Standard/Deep/Pet × Queen/Double/ADA Double/Jacuzzi/ADA Jacuzzi/Suite — 18-cell matrix in `lib/dispatch-config.ts` currently null.
- **Blocker**: Notes UI, Maintenance UI, Updates panel, weather integration, D-430 matrix from Jennifer (VI.F), admin Departure Status master table (II.F).

## I.F. A-430 Arrivals card
- **State**: PARTIAL (card shell shipped Phase 3; data wirings missing)
- **Size**: L
- **Spec**: A-430 Arrivals tab (27 rows); Jennifer's "Arrival Standard KB Doc (1).docx.md"
- Header copy fix — Open Assumption #1 says Rules.md says "Stayover · ..." but should read "Arrival · ..." Confirm with Bryan.
- Guest Details (live data via BR4): name / count / arrival time / nights / history / notes / extras.
- Setup section (same model as D-430): Temperature, Room Spray, Other, Guest-Based notes.
- Checklist Type header (Standard / Long-term / * guest variants), sections from Arrival KB doc (Open Room → Arrival Notes → Prep → Double Check → Close), section gating.
- Notes compose, Need Help, Pause/Resume, I'm Done. Target ≤5 min per room ±20%.
- **Blocker**: Same as D-430 (Notes UI, Updates panel, weather, BR4).

## I.G. S-430 Stayovers card
- **State**: PARTIAL (card shell shipped; status pill display-only locked Day 21; time targets not displayed)
- **Size**: L
- **Spec**: S-430 Stayovers tab (25 rows); Jennifer's "Stayover Standard KB Doc.docx.md"
- Status pill (DND / Guest OK / Desk OK / Sheet Change / Done): time-target display via `STAYOVER_STATUS_TIME_TARGETS` from dispatch-config — wire into UI (Day 25 first chase).
- Guest Details — name + count + nights total / Day # of # + Last Stayover Status (per phrasing rules in R12) + guest notes + extras — all live wiring.
- Checklist variants: Standard, Sheet Change weekly for stays >7 nights, * guest variant from KB. Sections per Stayover KB doc (Status → Open Room → Remove → Replace → Bed → Clean → Close).
- Status-driven auto-complete: pre-selection of DND/Desk OK/Guest OK auto-completes + auto-archives card off staff queue (admin owns close).
- Sheet Change skip semantics: if assigned and skipped → admin note. If completed unassigned → skip next scheduled change for guest. (Open Assumption #5 — confirm with Bryan whether removal of future scheduling entry vs. suppress next firing.)
- Notes compose, Maintenance compose, Need Help, Pause/Resume, I'm Done.
- **Blocker**: Notes UI, Maintenance UI, BR4 for Last Stayover Status lookup.

## I.H. Da-430 Dailys card
- **State**: PARTIAL (card shell exists; rule file empty; Team Update stubbed)
- **Size**: L
- **Spec**: Da-430 Dailys tab (18 rows); Jennifer's daily-tasks input (post-Spreadsheet authoring)
- Realtime task reassignment: as other staff complete, unassigned dailys redistribute toward goal of all staff hitting EOD around the same time.
- Team Update section (currently STUB): show where each on-shift staff member is + which task. Needs team roster derived view (VII.G).
- Tasks: KB-driven daily/weekly/monthly, bundled by location (hallway, lobby, breakfast). Section-gated.
- Per-task time estimate: sum + 5-min card overhead = card target. ±20% triggers admin note. 3 instances in 30 days → log + note.
- Distribution rule: if single user does ≥80% or ≤20% of team dailys → admin note.
- **Blocker**: `dailys.ts` rule file (IV.F), Jennifer's daily-tasks list (VI.G), team roster.

## I.I. E-430 End of Day card
- **State**: PARTIAL (card shell exists; rule file empty; multiple stubs)
- **Size**: L
- **Spec**: E-430 End of Day tab (14 rows)
- Card creation always; activation gated until all other cards complete on shift.
- Day summary (computed): # departures + # stayovers + # arrivals + # daily tasks + total hours. Affirmation line from preset KB list (rotating).
- Incomplete roll-up (per-task / per-checklist): each instance prompts staff to revisit + add explanation note. Note → admin card. Logged on profile.
- Note Review: all-notes index for shift. Note Assignments checkbox per note → routes to admin category card.
- Supply Needs (STUB): notes routed here populate admin supply card. Needs supply_needs table (VII.A).
- What's Next (STUB): tomorrow's preview — arrivals/departures/stayovers + scheduled events. Needs tomorrow's reservations + tomorrow's schedule join.
- Wrap Shift target 10 min ±15%. Cannot wrap until all on-shift housekeepers in EOD card (exceptions per spec).
- **Blocker**: `eod.ts` rule file (IV.F), Affirmations list (VI.C), supply_needs schema (VII.A), team roster, tomorrow's data joins.

# II. Manager + admin surfaces

## II.A. Manager task creation form
- **State**: UNBUILT (no UI route exists for creating a task fresh)
- **Size**: M
- **Spec**: Implied by CLAUDE.md beta scope lock #1 — "Manager/admin can create a task, assign it to a staff member, set its `context.staff_home_bucket`"
- Form fields: title, description, assignee (from staff list), priority, due_date/due_time, room, bucket picker (one of six), card_type, optional context blob fields.
- Required: `context.staff_home_bucket` enforced in UI (DB default is sloppy per CLAUDE.md).
- **Blocker**: None — directly buildable.

## II.B. Manager card view/edit (`/tasks/[id]`)
- **State**: PARTIAL (`manager-card-detail.tsx` exists)
- **Size**: S
- **Spec**: Admin Task View Modal tab (II.G) overlaps; Open Assumption #20
- Merge-safe context save (`{ ...current, <subkey>: { ...current?.<subkey>, <new> } }`) needs verification on every write path.

## II.C. Admin home rebuild (`/admin`)
- **State**: PARTIAL (route exists; not on Day 20 spec)
- **Size**: L
- **Spec**: Admin Home tab (14 rows)
- Cream surface (token set already in `app/globals.css`). Header greeting + date. Daily Brief card (same Arrivals/Departures/Stayovers count model as staff home). 2×2 mini-status grid (Watchlist / Scheduling / Critical Issues / Notes). Activity feed (Rules.md Triggers/Logs catalog). Three lanes (Staff / Tasks / Maintenance — sage green for maintenance per Profile surfaces handoff: `#BACBA0` / `#8A9B75` / `#2C3A1D`).
- **Blocker**: Activity feed source (III.D).

## II.D. Admin Staff Roster (`/admin/staff`)
- **State**: PARTIAL (route exists; not on Day 20 spec)
- **Size**: M
- **Spec**: Admin Staff Roster tab (12 rows)
- Sky-blue 2×2 grid. Four staff cards (Courtney/Lizzie/Angie/Mark). Per card: avatar with locked per-staff gradient (CM peach, LL sky, AL coral, MP sage), name 2-line stacked, role/subtitle, three metrics (rooms assigned / open / done today), action button drill-in, highlighted state for "currently on shift."

## II.E. Admin Staff Profile (`/admin/staff/[id]`)
- **State**: PARTIAL (route exists; not on Day 20 spec)
- **Size**: L
- **Spec**: Admin Staff Profile tab (13 rows); Profile surfaces handoff
- Sky-blue. Header greeting hero. Stats trio. Daily summary (today's cards + per-card durations + totals). Lifetime running shift summary. 14-day segment (current segment time logs). Stand-out instances (rule violations from Triggers catalog). Notes by user. Pause log (reason note required on unpause). Maintenance authored. Per-staff activity feed.

## II.F. Admin Tasks Dashboard (`/admin/tasks`)
- **State**: PARTIAL (route exists; not on spec)
- **Size**: M
- **Spec**: Admin Tasks Dashboard tab (7 rows)
- Master task list across all staff and buckets. Filters (bucket / staff / status / time). Time-by-location running list (location-time + user-time). Tap → Admin Task View modal.

## II.G. Admin Task View Modal (`/admin/tasks/[id]` or modal)
- **State**: PARTIAL
- **Size**: M
- **Spec**: Admin Task View Modal tab (7 rows)
- Read-only mirror of staff card with admin actions: Reassign (logs both staff records — III.H), Override / force-complete (note required), Edit guest fields (mirrors RES editable fields).
- Bucket-color **dulled variant** shell. Tokens for stayovers/dailys/eod still TODO per BR.
- **Blocker**: Reassignment dual-logging (III.H), dulled-color tokens.

## II.H. Admin Maintenance (`/admin/maintenance/[id]`)
- **State**: PARTIAL (route exists; not on full spec)
- **Size**: M
- **Spec**: Admin Maintenance tab (7 rows)
- Sage green. Master tables: open issues by location, open issues by type. Per-issue card (severity + photo + reporter + room). Resolution actions (admin marks resolved with note).
- **Blocker**: Maintenance issues table verification (VII.B), photo pipeline (III.E).

## II.I. Admin Category Cards (one per Note Type)
- **State**: PARTIAL (Maintenance category partly built — 3-sink pattern in Day 24 schema; 10 others UNBUILT)
- **Size**: XL (10 cards × M each)
- **Spec**: Admin Category Cards tab (8 rows)
- One card per Note Type (11 total): Maintenance, Guest Needs, Guest Profile, Guest Damage, Guest Update, Supply, Admin, Team, Change/Update, Employee, Needed.
- Pattern: copy Maintenance 3-sink pattern for the other 10 post-beta.

## II.J. Admin KB Editing Tool (`/admin/kb/*`)
- **State**: UNBUILT
- **Size**: XL
- **Spec**: Admin KB Editing Tool tab (8 rows)
- Tree-view editor over the KB scaffolding. Edit operations: add / remove / relocate / adjust branch (one branch per session). Edit scope: Title / Detail / Tools / Chemicals / Photo metadata. Save → triggers Updates panel cascade (next 2 shifts of relevant staff: red 1st shift, green 2nd, admin notified after 2 unclicked).
- Open questions (Open Assumption #19): versioning + change history; branch-move semantics on existing checklist refs / queued Updates / archived cards; intra-KB cross-references; variant lists; taxonomy editing.
- **Bryan flagged this as deferred KB system question. Likely post-beta in practice, but listed here under "no cuts" per Bryan's mantra.**

## II.K. Admin Calendar (`/admin/calendar/*`)
- **State**: UNBUILT
- **Size**: XL
- **Spec**: Admin Calendar tab (10 rows)
- Scheduling (shift entry — date, staff, role, hours, primary/non-primary). Pre-shift card assignment (system pre-assigns based on scheduled staff + reservation forecast — replaces today's manual pre-assignment). Coverage detection (compares projected workload against scheduled staff per shift). 14-day segments visualization. Payroll tracking (clock-in / Wrap Shift events surface). Staff-shortage alerts (daily fire until enough staff scheduled).
- **Listed under "no cuts" but spreadsheet itself flags this as post-beta.**

## II.L. Admin Weekly Recap
- **State**: UNBUILT (single STUB row in spreadsheet)
- **Size**: M
- **Spec**: Admin Weekly Recap tab (4 rows)
- Cream-inset reading surface candidate per Visual Design Lock Final.
- **Out of beta scope per spreadsheet; listed for completeness.**

# III. Cross-cutting features

## III.A. Notes — compose drawer + routing
- **State**: PARTIAL (Day 24 schema landed: `notes` table + 4 taxonomies + RLS + denormalize trigger; UI UNBUILT)
- **Size**: L
- **Spec**: Global Rules R08–R11 + R25
- Compose drawer: LinkedIn-mobile-comment style. Avatar + line input + image + @mention + Send. Required fields on submit: Note Type (11 dropdown), Note Status (5 dropdown, default Just Noting), Note Assigned-to (5 dropdown).
- Routing dual-sink (R25): individual log under the relevant staff member on `/admin/staff/[id]` + category card on admin grouped by Note Type. Both views are query-side.
- Archive persistence: notes persist on closed (archived) card forever.
- Tag = Guest currently fires admin task to update ResNexus (eventual ResNexus push — now Cloudbeds).
- @mention autocomplete deferred to post-beta per Open Assumption.

## III.B. Maintenance — compose drawer + cascading taxonomies
- **State**: PARTIAL (Day 24 schema landed: 3 maintenance taxonomies + severity; UI UNBUILT; existing maintenance scaffolding partial)
- **Size**: L
- **Spec**: Global Rules R12–R17
- Compose drawer with cascading dropdowns: Location → Item/Sub-location → Type. Severity (Low / Normal / High default Normal). Photo attachment (optional unless KB step marks "Photo: needed" — required on certain damage types per KB).
- Routing 3-sink: admin table by location + admin table by type + admin task card.
- Severity escalation: High → live notification to on-shift admin to seek support immediately.

## III.C. Updates panel — admin authoring + staff display + KB cascade
- **State**: UNBUILT
- **Size**: L
- **Spec**: Global Rules R18; per-card row in every staff card spec
- Two paths: admin input (scheduled to date or user) + KB edit auto-populate (next 2 shifts of related users).
- Staff display: first shift highlight red, second green. If staff doesn't click in 2 shifts → admin notified.
- Conditional scoping per card: room-type / clean-type filter on D-430 + S-430 + A-430.
- KB cascade: when admin saves an edit in KB Editing Tool (II.J), Updates panel auto-populates for the next 2 shifts of related staff.

## III.D. Activity feed (admin)
- **State**: UNBUILT
- **Size**: L
- **Spec**: Global Rules R19; Rules.md Triggers/Logs catalog
- Live event stream from all logged events (card timing, reassignments, maintenance, skipped items, pauses, notes, supply, unreviewed updates).
- Reverse-chronological with severity boost (assumed per Open Assumption — confirm).
- Admin can filter / dismiss.
- Sources existing `task_events` + new `notes` + future audit log + future maintenance issues.

## III.E. Photo / image attachment pipeline
- **State**: PARTIAL (Storage bucket exists per cards_mvp.sql; compose-drawer wiring incomplete)
- **Size**: M
- **Spec**: Global Rules R22
- Camera capture + upload from compose drawer. Supabase Storage bucket policies finalization. Photos persist on archived card forever.
- Optional unless KB step marks Photo: needed (e.g., TV screen broken).

## III.F. Time tracking — dual sink + between-cards
- **State**: PARTIAL (task_events captures card open/close; dual-sink writes UNBUILT)
- **Size**: L
- **Spec**: Global Rules R05–R06
- Card open duration: dual-sink to staff profile (admin view) + location table (admin view, under that location).
- Time between cards: 1 min standard. 2× 5-min and 1× 15-min breaks allowed per shift. Anything beyond → admin note. Admin can flag a between-cards segment as "approved break."
- Threshold breaches → admin note via repeated-instance trigger.

## III.G. Sequential gating (staff)
- **State**: PARTIAL (bucket-level may exist; section-level within card unclear)
- **Size**: M
- **Spec**: Global Rules R28; per-card spec ("Must be completed in order")
- Bucket-level: hard lock — non-active bucket cards are blurred + pointer-events-none. Admin has no gate.
- Section-level: within each X-430 card, sections must be completed in order. Detail viewing out-of-order is permitted (gating is on complete action, not view action).

## III.H. Card lifecycle — reassignment + rotation + reshuffle
- **State**: UNBUILT (reassign action exists in DB but dual-logging + rotation + reshuffle logic UNBUILT)
- **Size**: L
- **Spec**: Global Rules R23–R24; Hallway + Assignment R15
- Reassignment dual-logging: when admin reassigns, event logs to both staff profiles (prior + new) AND on the card itself.
- Card order rotation within a bucket: completed cards drop off the top so open cards stay on top. Intra-bucket only.
- Pre-stayover reshuffle: at the 11am weekday / 12pm weekend threshold, queue reshuffles to push stayovers + arrivals up. Cards in flight aren't interrupted mid-execution.

## III.I. Repeated-instance meta-trigger
- **State**: UNBUILT
- **Size**: M
- **Spec**: Global Rules R28
- When a per-instance trigger fires above its specified threshold over a window (X% over Y days or Z consecutive shifts), an additional admin log + note fires beyond the per-instance trigger.
- Specific thresholds live on per-card rows that own each rule (e.g., S-430 status >40% non-Done in shift; >30% non-Done over 30 days; Da-430 ±20% per-task time triggered 3× in 30 days).

## III.J. 14-day segment infrastructure
- **State**: UNBUILT
- **Size**: M
- **Spec**: Global Rules R07
- Wed-anchored 14-day window (begins Wed, runs through 2nd Tue). Per-staff aggregation. Surfaces on staff profile (admin view).
- New hire: admin can roll their hours into the next full segment.
- If clock-in straddles segment boundary: log to whichever segment shift opened in.
- Schema decision: dedicated `segments` table or computed view (VII.D).

## III.K. Audit / archive — closed-card search
- **State**: UNBUILT
- **Size**: L
- **Spec**: Global Rules R21
- Searchable by date / guest / type / location / user. Separate "exceptions" filter (time, task list, note, maintenance, reassignment exceptions).
- Never editable. Read-only forever.
- Schema strategy: rely on existing tasks/task_events/notes with an `archived_at` flag, or add a separate audit table.

# IV. Rule engine + automation

## IV.A. Auto-assignment policies
- **State**: UNBUILT (top of build queue per Day 23 / Day 24)
- **Size**: XL
- **Spec**: Hallway + Assignment tab (16 rows); `lib/dispatch-config.ts` exports
- New file `lib/orchestration/assignment-policies.ts` consuming dispatch-config exports (`HALL_SEQUENCES`, `ROOM_TO_HALL`, `STANDARD_LOAD_PER_HOUSEKEEPER`, etc.).
- Implements: primary-housekeeper lane (up to 2 primaries handle stayovers + arrivals; one to 30s, other to 20s, lighter takes 40s), non-primary load (more departures + dailys), departure within-hall priority stack execution, cross-cutting bumps.
- Plus filling `assignment.specific_member_id` in `lib/orchestration/rules/{arrivals,departures,stayovers}.ts` per Jennifer's policy.
- **Without this, every promoted draft lands `staff_id: null` and the demo isn't end-to-end.**

## IV.B. Hallway adjacency rule
- **State**: UNBUILT (logic; constants in dispatch-config)
- **Size**: M
- **Spec**: Hallway + Assignment R10
- Locked: do not move a housekeeper between halls before their starting hall is complete. Admin can override with reason note. Override is a flagged audit event surfaced in admin staff profile.

## IV.C. No-orphan-cards rule
- **State**: UNBUILT (logic)
- **Size**: M
- **Spec**: Hallway + Assignment R12
- Every card always assigned to someone on shift. When workload exceeds standard load, distribution stays as even as possible within other rules (primary/non-primary lane, hallway adjacency, context load adjustment). Admin notified ASAP (recurring daily until fulfilled).
- If 0 housekeepers on shift: surface as critical issue + admin alert; no card creation suppressed.

## IV.D. Pre-stayover reshuffle phase
- **State**: UNBUILT
- **Size**: M
- **Spec**: Hallway + Assignment R15
- New phase in orchestrator. At 11am weekday / 12pm weekend trigger: recompute order to prioritize stayovers + arrivals over remaining departures. Cards in flight not interrupted.

## IV.E. `assignment.specific_member_id` per Jennifer's policy
- **State**: UNBUILT (rule files have `[ASK JENNIFER]` markers)
- **Size**: S (data fill, not logic)
- **Spec**: Jennifer's standing assignment policy doc
- Fill comments → real values in `lib/orchestration/rules/arrivals.ts`, `departures.ts`, `stayovers.ts`.
- Alternative: rely on auto-assignment policies (IV.A) instead of static IDs.

## IV.F. `dailys.ts` + `eod.ts` rule files
- **State**: UNBUILT (currently empty arrays)
- **Size**: M each
- **Spec**: Da-430 tab (18 rows); E-430 tab (14 rows); Jennifer's daily-tasks input + EOD spec
- `dailys.ts`: rules trigger one card per shift per assigned housekeeper. Distribution per primary/non-primary lane.
- `eod.ts`: rules trigger one card per shift per housekeeper. Activation gated by other-cards-complete.

## IV.G. D-430 time-target matrix fill
- **State**: AUTHORING (dispatch-config has 18 null cells; pending Jennifer)
- **Size**: S (fill once received)
- **Spec**: Jennifer's "Rules for HouseKeeping.docx.md" (not in repo)
- 18 cells: 3 clean types (Standard/Deep/Pet) × 6 room classes (single_queen/double/ada_double/jacuzzi/ada_jacuzzi/suite). Each cell: target/min-max minutes + tolerance.

## IV.H. Wed-occupancy Deep Clean trigger
- **State**: UNBUILT (interpreter logic; constants in dispatch-config)
- **Size**: S
- **Spec**: D-430 R26
- All four conditions: <5 departures + 40%+ occupancy in last 45 days + no deep clean in 45 days + ≤3 deep items completed in 45 days. Auto-elevates Standard → Deep on Wednesdays.

## IV.I. Realtime task reassignment for Dailys
- **State**: UNBUILT
- **Size**: M
- **Spec**: Da-430 R04
- As other staff complete cards, unassigned dailys redistribute toward goal of all staff hitting EOD around the same time.

## IV.J. Repeated-instance meta-trigger interpreter logic
- **State**: UNBUILT (cross-references III.I)
- **Size**: M
- **Spec**: Global Rules R28
- Engine-side logic to detect when per-instance triggers fire above threshold and emit the additional log + note.

# V. Data layer + integrations

## V.A. BR4 — X-430 briefs fall back to live reservations
- **State**: UNBUILT
- **Size**: M
- **Spec**: Day 22 handoff item F; helpers exist in `lib/reservations.ts` (`getCurrentReservationForRoom`, `getNextIncomingReservationForRoom`)
- Per-card edits: when `task.context.{incoming_guest, current_guest, outgoing_guest}` is missing, fall back to reservations table lookup.

## V.B. BR5 — reservations cancellation/modification edge cases
- **State**: UNBUILT
- **Size**: M
- **Spec**: Day 22 handoff item G
- Webhook re-fires (idempotency). Modifications cascade. The `cancelled_at` trigger handles direct status flip but not all edge cases. Soft-delete via `status='cancelled'` filters from briefs.

## V.C. Channel manager — Cloudbeds (or fallback)
- **State**: INTEGRATION (Bryan's action: Cloudbeds sales quote pending)
- **Size**: XL (post-quote)
- **Spec**: Day 22 handoff §"Channel-manager pivot"; Cloudbeds API + webhooks
- ResNexus is dead. Cloudbeds leading: full PMS REST API + webhooks (`reservation_created`, `status_changed`, `dates_changed`, `accommodation_changed`, `deleted`). Bundles myAllocator channel manager. Pricing $200–$400/mo on Flex tier for ~21 rooms.
- Backup: Little Hotelier (SiteMinder) — built for 1–30 rooms, 450+ channels.
- Once chosen: webhook endpoint + payload mapping + integration with `inbound_events` table (already accepts `source` column; one-word change to add `cloudbeds`).

## V.D. Weather API integration (D-430 Temperature)
- **State**: UNBUILT
- **Size**: M
- **Spec**: D-430 R20
- Pull 1pm–6pm avg temperature on day-of via Google Weather (or alternative — no preference locked). On failure: hold last known + flag.

## V.E. Google Events / Holidays integration (SOD-430 Daily Brief)
- **State**: UNBUILT
- **Size**: M
- **Spec**: SOD-430 R10
- Two sources merged: admin-authored event/group notes + Google town events and holidays.

## V.F. Holiday calendar (R13 weekend rule extension)
- **State**: UNBUILT
- **Size**: S
- **Spec**: Hallway + Assignment R13
- Currently weekend rule = Sat/Sun. Spec says "Saturday, Sunday, Holidays." Hardcoded US federal holidays list, or admin override per R13 ("Admin can shift the day's window").
- **Bryan has lean toward (c) defer holidays to admin override pre-beta.**

## V.G. Photo upload pipeline wiring
- **State**: PARTIAL (Storage bucket exists; compose-drawer wiring UNBUILT)
- **Size**: M
- **Spec**: Global Rules R22
- Bucket policies finalization. Compose-drawer integration. RLS bucket policies still TBD.

## V.H. ResNexus replacement payload mapping
- **State**: PARTIAL (`reservations.source` accepts `resnexus | manual | walk_in`; needs `cloudbeds` add)
- **Size**: S
- Once channel manager chosen (V.C), one-word source enum extension + payload mapping per their schema.

# VI. Knowledge Base content (Jennifer's authoring)

## VI.A. Detail prose for "Text to come" placeholders
- **State**: AUTHORING (variant trees in `lib/checklists/variants/*.ts` have placeholders pending)
- **Size**: XL (Jennifer's pass — many entries)
- **Spec**: Jennifer's KB docs (Stayover Standard / Arrival Standard / Knowledge Build Standard Departure / Start of Day / Alternatives)
- Most placeholders are detail prose for individual checklist items. Some entries already have real content (seasonal scent dates, 3-pump room-spray instructions).

## VI.B. Welcome-specific checklist forks (A-430, S-430)
- **State**: AUTHORING (currently aliased to Departures canonical 7-item)
- **Size**: M
- **Spec**: Open Assumption #22; per-card spec
- Welcome-specific forks for Arrivals + Stayovers — currently just point to D-430 canonical. Need Jennifer to spec the divergent items.

## VI.C. Affirmations preset list (E-430 Status section)
- **State**: AUTHORING
- **Size**: S
- **Spec**: E-430 R06
- Rotating phrases for end-of-shift summary line. Source from KB editing tool (II.J) or separate config.

## VI.D. Rotating phrases libraries
- **State**: AUTHORING
- **Size**: S
- **Spec**: E-430 wrap headlines, SOD-430 date-context lines (Day 21 phase-4 handoff item I)
- Small libraries of phrase variants for greeting / wrap text.

## VI.E. Variant lists spec — Sheet Change, Pet, Deep, *** guest, Long-term
- **State**: PARTIAL (Deep + Pet additions encoded in single_queen variant; others UNBUILT)
- **Size**: M
- **Spec**: Open Assumption — variant lists stored as separate sub-trees with `applies_when` metadata, OR full alternate trees that fully replace?
- Decision pending. Affects selection logic in `lib/checklists/resolve.ts` and editing surfaces in II.J.

## VI.F. D-430 time-target matrix
- **State**: AUTHORING (dispatch-config has 18 null cells)
- **Size**: S (data fill)
- **Spec**: Jennifer's Rules for HouseKeeping.docx.md
- Cross-reference with IV.G.

## VI.G. Per-Daily/Weekly/Monthly task time estimates (Da-430)
- **State**: AUTHORING
- **Size**: M
- **Spec**: Da-430 R10
- Each daily/weekly/monthly task gets a time estimate. Sums + 5-min overhead = card target.

## VI.H. Note Type writing examples / templates per category
- **State**: UNBUILT
- **Size**: M
- **Spec**: Out of beta scope per spreadsheet; listed under "no cuts"
- Per-category guidance for staff (e.g., what makes a good Guest Damage note vs. Maintenance).

# VII. Schema + RLS additions still needed

## VII.A. Supply needs table
- **State**: UNBUILT
- **Size**: S
- **Spec**: E-430 R10
- Notes routed to "Supply" Note Type populate a card on admin side. Could be derived view from `notes` (where `note_type = 'Supply'`) — confirm before adding a table.

## VII.B. Maintenance issues table verification + extension
- **State**: PARTIAL (existing maintenance scaffolding referenced; current schema unverified)
- **Size**: M
- **Spec**: Global Rules R12–R17; Admin Maintenance tab
- Verify what's there. Add severity column if missing (covered by Day 24 `maintenance_severities` lookup table). Verify location/type FK relationships.

## VII.C. Audit / archive search index strategy
- **State**: UNBUILT
- **Size**: M
- **Spec**: Global Rules R21
- Decision: index on existing tables vs. dedicated audit_log table. Likely: index existing + add `archived_at` flag to tasks.

## VII.D. 14-day segments — table or view?
- **State**: UNBUILT (decision pending)
- **Size**: S (decision) → M (implementation)
- **Spec**: Global Rules R07
- Computed view from `task_events` + clock-in/out events vs. dedicated `segments` table. View probably wins for beta.

## VII.E. Activity feed events — table or view?
- **State**: UNBUILT (decision pending)
- **Size**: S → M
- Source from existing `task_events` + `notes` + future audit log. View wins for beta.

## VII.F. Photo storage RLS policies finalization
- **State**: PARTIAL
- **Size**: S
- **Spec**: Global Rules R22; existing storage bucket policies in cards_mvp.sql
- Tighten policies for note-attached photos vs. card-attached photos vs. maintenance-attached photos.

## VII.G. Team roster derived view
- **State**: UNBUILT
- **Size**: S
- **Spec**: Da-430 Team Update; SOD-430 Team list
- Derived from existing `staff` table + clock-in events (who's on shift today).

## VII.H. KB versioning + change history
- **State**: UNBUILT
- **Size**: L
- **Spec**: Open Assumption #19 (Bryan taking on)
- Affects Updates panel highlighting, audit trail, rollback behavior. Tied to KB Editing Tool (II.J).
- **Listed under "no cuts" but practically post-beta.**

## VII.I. Weather + holiday calendar tables (post-beta)
- **State**: UNBUILT
- **Size**: S each
- **Spec**: D-430 R20; R13
- Tables to cache pulls from external APIs. Can defer to live API calls pre-beta.

# VIII. Deployment + operations

## VIII.A. Vercel deploy
- **State**: UNBUILT (checklist exists at `docs/deployment/vercel-checklist.md`)
- **Size**: S (~30 min)
- **Spec**: Day 21 / Day 22 handoff item D
- GitHub push → Vercel CLI install + login → first deploy (preview) → env vars (incl. `AGENT_KILL=true` and `AGENT_DRY_RUN=true` for safety) → `vercel --prod` → Supabase magic-link redirect URL config → smoke test in incognito → URL to Jennifer.

## VIII.B. Magic-link redirect URL configuration
- **State**: UNBUILT (depends on VIII.A)
- **Size**: S
- **Spec**: Vercel checklist
- Supabase auth dashboard → URL Configuration → Site URL + redirect URLs (production + preview).

## VIII.C. Smoke test pass on phones
- **State**: UNBUILT
- **Size**: S
- **Spec**: Vercel checklist common-gotchas section
- Real-phone test: magic-link delivery, login, staff home, X-430 card render, complete a task, verify task_events row.

## VIII.D. URL hand-off to Jennifer
- **State**: UNBUILT
- **Size**: S
- Once VIII.C passes, share URL via existing channel.

## VIII.E. AGENT_KILL + AGENT_DRY_RUN env var setup
- **State**: PARTIAL (env vars exist locally)
- **Size**: S
- Verify both are set in Vercel production env. Both should default to `true` for first deploy (safety).

## VIII.F. pg_cron / Vercel cron migration
- **State**: UNBUILT (currently GitHub Actions)
- **Size**: M
- **Spec**: Schema Reference R12
- Move scheduled orchestrator runs from GH Actions to pg_cron OR Vercel cron post-beta.

## VIII.G. Backup / restore strategy
- **State**: UNBUILT
- **Size**: M (post-beta)
- Supabase auto-backup is sufficient for beta. Document restore procedure.

# IX. Quality / non-functional

## IX.A. RLS hardening as new tables land
- **State**: ONGOING
- **Size**: S per table
- Audit each new table's RLS policies against the staff/admin/manager visibility model from Global Rules.

## IX.B. Performance / index tuning as data scales
- **State**: ONGOING
- **Size**: variable
- Currently sized for 21-room property. Multi-property (post-beta) requires re-tuning.

## IX.C. Multi-property timezone support (post-beta)
- **State**: UNBUILT
- **Size**: M
- `PROPERTY_TIMEZONE` is hardcoded `America/Chicago` in `lib/dispatch-config.ts`. Multi-property needs per-property column on a properties table.

## IX.D. Error reporting / monitoring SDK (post-beta)
- **State**: UNBUILT
- **Size**: S (when permitted)
- Currently disallowed per CLAUDE.md ("Do not add analytics, feature flags, or error reporting SDKs"). Post-beta consideration.

## IX.E. Idempotency on all external integrations
- **State**: PARTIAL
- **Size**: M
- Reservations webhook handlers (V.C) need idempotency keys. Photo upload retries. Cron retry semantics.

# X. Post-beta items explicitly deferred (listed for completeness, not for beta scope)

- A. In-app KB-driven card generation agent
- B. Multi-property support
- C. Admin Calendar surface (II.K)
- D. Admin Weekly Recap surface (II.L)
- E. Admin KB Editing Tool advanced features (versioning, branch-move, cross-references, taxonomy editing) (II.J details)
- F. Advanced photo pipeline (compression, multiple per note, captions)
- G. @mention autocomplete in notes
- H. Multi-tenant / SaaS-mode
- I. ResNexus integration (dead — Cloudbeds replaces)
- J. Welcome-specific checklist forks for cards (currently aliased; may move to in-beta if Jennifer says so)
- K. Reverse-chronological activity feed with severity boost (admin) — partial cover in III.D
- L. Note Type writing templates per category (VI.H)
- M. Variant list editing semantics (VI.E)
- N. KB versioning + change history (VII.H)
- O. Weather + holiday calendar tables (VII.I)
- P. pg_cron / Vercel cron migration (VIII.F)
- Q. Backup / restore documentation (VIII.G)
- R. Multi-property timezone (IX.C)
- S. Error reporting SDK (IX.D)

---

## Summary by size + state

- **XL items**: 6 (D-430 card, Admin Category Cards × 11, Admin KB Editing Tool, Admin Calendar, Auto-assignment, Cloudbeds integration, KB Detail prose authoring)
- **L items**: ~22
- **M items**: ~30
- **S items**: ~15

Rough total work remaining if "no cuts" honored: 6–10 weeks of focused engineering + 2–4 weeks of Jennifer's KB authoring (parallel-izable).

For comparison: the **CLAUDE.md beta scope lock** (5 items) is roughly 4–5 days of focused work. The gap between "narrow beta" and "all of it" is real.

---

*End of plan. Update as Jennifer triages. Mark cuts inline; never delete rows.*
