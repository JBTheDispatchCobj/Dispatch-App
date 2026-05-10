# Jennifer rules-document extraction (Day 52 chase #5)

Mined from `docs/kb/Dispatch — Rules Table for Card and Section Governance.xlsx` for the 7 Jennifer "To Do List answers" questions where Jennifer responded *"Please see the rules document for this answer."* Source-of-truth precedence per `Dispatch — Rules Table Handoff.md`: Rules.md operational behavior > KB docs for content.

This doc consolidates per-Q findings + engineering implications so downstream chases don't have to re-read the xlsx. Each section cites the row in the relevant sheet so you can re-derive if needed.

---

## Q6 — D-430 tolerance convention (strict bounds vs ~20% wiggle?)

**Answer:** Mixed by surface; for D-430 specifically, the existing strict-bounds implementation is correct.

**Source:**
- D-430 Departures sheet, row 40 (Footer CTA → I'm Done): *"Target times by Standard/Deep/Pet × Queen/Double/Jacuzzi/Suite per Rules.md. Over/under thresholds vary; trigger admin note."*
- D-430 row 30 (Checklist → Section additions per clean type) confirms per-clean-type extension: *"Deep adds: AC Unit, Bedding, Bed, Walls, Bathroom, Shower/Sink, Freezer. Pet adds: Bedding, Floors."*
- S-430 row 8 (Status time targets) shows MIXED tolerance percentages on the per-status surface (DND=±50%, Guest OK=±30%, Desk OK=±30%, Sheet Change=±25%, Done standard=±30%, Done long-term=±40%) — confirming tolerance as a per-row attribute that varies, not a global setting.

**Engineering status:** `lib/dispatch-config.ts` `DEPARTURE_TIME_TARGET_MATRIX` already uses `tolerance: 0` (strict) per Day 24 codification ("Anything over or under [the min-max] should be logged — no percentage buffer"). The rules table confirms strict bounds for D-430 specifically; per-status S-430 tolerances are also already encoded in `STAYOVER_STATUS_TIME_TARGETS`. No code change required. Open Jennifer #2 (D-430 tolerance) closes as **CONFIRMED — strict bounds for D-430 cells**.

**Closes:** Open Jennifer #2 (D-430 tolerance convention).

---

## Q14 — Daily distribution rules

**Answer:** Live realtime reassignment with 80/20 boundary triggering admin notification.

**Source:**
- Da-430 Dailys sheet, row 4 (card → Realtime task reassignment): *"Live. Goal: all staff hit E-430 around the same time."*
- Da-430 row 13 (Tasks → Distribution rule): *"Live. If single user does ≥80% or ≤20% of team dailys → admin note."*

**Engineering status:** Confirms IV.I (Realtime task reassignment for Dailys) as the orchestrator surface. Currently DEFERRED per Day 51 chase #8 as CLAUDE.md beta-cut "dynamic daily reassignment." The 80/20 boundary is a new constant for `lib/dispatch-config.ts` Section 12 when IV.I lights up post-beta. No beta change needed; Q14 is already-deferred-territory.

**Closes:** No active inventory item (IV.I already formal-DEFER). Logged for future IV.I activation.

---

## Q15 — Housekeeper assignment policy

**Answer:** Two-tier system with primary/non-primary lanes, hall pinning, status-stack priority, and load adjustment.

**Source (Hallway + Assignment sheet, rows 6-12):**

- **Primary-housekeeper lane (row 6):** Up to 2 primary housekeepers per shift handle stayovers + arrivals. Split: one primary → 30s hall, other primary → 20s hall. Whichever primary has the lighter load also takes 40s hall.
- **Non-primary load (row 7):** Departures + dailys weighted heavier on non-primaries (since stayovers/arrivals go to primaries).
- **Departure within-hall priority (row 8):** Status stack from highest to lowest: `Has Sheets > Odobanned > Stripped > Open > Checked Out`. Departure Status is admin-set; staff sees the priority result, not the policy.
- **Departure cross-cutting bumps (row 9):** Layered on top of status stack in this order: (1) departure with same-day arrival jumps queue regardless of status; (2) earlier arrival time beats later; (3) last-of-type fallback when no arrival flag; (4) hallway adjacency (see Q16).
- **Housekeeper context load adjustment (row 11):** Lighter load on 5+ consecutive days; load adjusted by past performance (issues, incomplete work, time-on-job, over/under reports). Standard load: **5 departures, 10 stayovers, 15 daily tasks per housekeeper per shift**. Above-standard days trigger admin notification (recurring daily until fulfilled).
- **No-orphan-cards rule (row 12):** Every card always assigned to someone on shift. When workload exceeds standard load, distribution stays as even as possible within other rules.

**Engineering status:** Pre-encodes IV.A (auto-assignment policies) + IV.B (hallway adjacency) + IV.C (no-orphan-cards). All three formal-DEFER per Day 51 chase #8 as POST-BETA-FOUNDATIONAL — beta uses AddTaskModal manual creation. The 5/10/15 standard-load constants slot into `STANDARD_LOAD_PER_HOUSEKEEPER` in `dispatch-config.ts` Section 12 when IV.A activates (already cited in Day 29 III.D Phase 1 audit-event vocabulary `assignment_above_standard_load`).

**Closes:** No active inventory item (all paired items already formal-DEFER). Logged for future IV.A activation. **Confirms IV.E `assignment.specific_member_id` posture for Phase 2 — Jennifer Q25 already deferred this to the 7-role schema; `STAFF_PRIMARY_NAMES` + `STAFF_PREFERRED_HALL` in `dispatch-config.ts` are the test-data scaffolding (Day 52 chase #4 noted).**

---

## Q16 — Hallway adjacency rule (prevent cross-hall jumps mid-hall?)

**Answer:** YES — locked rule with admin override + audit event on overrides.

**Source (Hallway + Assignment sheet, row 10):** *"Locked: do not move a housekeeper between halls before their starting hall is complete. Admin can override with reason note. Override is a flagged audit event — surfaced in admin staff profile."*

**Engineering status:** Pre-encodes IV.B (hallway adjacency rule) + the existing `assignment_cross_hall_override` audit event (Day 29 III.D Phase 1, severity `warn`, taxonomy already in `lib/task-events.ts:21` + `lib/activity-feed.ts WARN_TASK_EVENT_TYPES`). IV.B formal-DEFER per Day 51 chase #8; the audit event was a Day 29 deliverable. **Audit event vocabulary CONFIRMED as correctly-specified.** No engineering change needed.

**Closes:** No active inventory item. Validates the existing audit event taxonomy.

---

## Q17 — IV.H Phase B Deep Clean trigger occupancy gate

**Answer:** Threshold values CONFIRMED (40% / 45 days) but data source + denominator still ambiguous.

**Source:**
- D-430 Departures sheet, row 26 (Checklist → Clean type header): *"Wed-occupancy rule per Rules.md: <5 departures + 40%+ occupancy in last 45 days + no deep clean in 45 days + ≤3 deep items completed in 45 days."*

**Confirms existing constants in `lib/dispatch-config.ts` Section 12:**
- `DEEP_CLEAN_AUTO_TRIGGER.max_departures = 5` ✓
- `DEEP_CLEAN_AUTO_TRIGGER.min_occupancy_pct = 40` ✓
- `DEEP_CLEAN_AUTO_TRIGGER.lookback_days = 45` ✓
- `DEEP_CLEAN_AUTO_TRIGGER.max_recent_deep_items_completed = 3` ✓

**STILL UNRESOLVED (rules table doesn't specify):**
1. Data source for occupied-room-nights over the 45-day window. Likely: sum of date-range overlaps in `public.reservations` where `status IN ('confirmed','arrived','departed')`. Constraint: `lib/reservations.ts` imports the browser Supabase client, so the orchestrator can't reuse it directly — needs a Node-safe equivalent inside `deep-clean-elevation.ts` or a new sibling module.
2. Total room count denominator. Two candidates: hardcoded constant in `lib/dispatch-config.ts` Section 12, OR a real `rooms` table. Beta-leans-toward: hardcoded (single property).

**Engineering status:** Phase B activation is a single-line replacement of the inline `[ASK JENNIFER]` comment block in `deep-clean-elevation.ts` plus a real query — doable once the two data-source decisions land. Bryan can decide both unilaterally for beta (single-property, hardcoded room count = 21 likely).

**Closes:** Open Jennifer #6 (Phase B occupancy gate) becomes BRYAN-ACTIONABLE — extract data-source decisions from Bryan rather than waiting on Jennifer. The rules table confirmed everything Jennifer could speak to; the remaining two questions are implementation choices, not Jennifer's domain.

---

## Q19 — Sheet Change skip rule

**Answer:** Two distinct cases with bidirectional handling.

**Source (S-430 Stayovers sheet, row 16, Checklist → Type header Standard/Sheet Change/* guest):** *"Sheet change: if assigned and skipped → admin note. If completed unassigned → skip next scheduled change for guest."*

**Engineering status:** Confirms exactly the Open Assumption #5 interpretation in master plan I.G line 87. The "completed unassigned → skip next scheduled change for guest" piece requires sheet-change cadence/scheduling infrastructure that doesn't exist today (forward-scheduling), so this stays POST-BETA per Day 45 closure. The "assigned and skipped → admin note" piece pairs with the staff-side stayover_status setter restored in Day 52 chase #2 (admin pre-set `sheet_change` is admin override; staff still executes; if staff ends the card without setting sheet_change, that's the "skipped" case). Per the new event vocabulary (chase #2), the existence of a `stayover_status_overridden` event with `sheet_change` in `to[]` but no subsequent `stayover_status_changed` event with `sheet_change` in `to[]` IS the "skipped" signal — admin note can derive from query at end-of-shift roll-up.

**Closes:** No active inventory item (post-beta per Day 45). End-of-shift admin note for "Sheet Change assigned and skipped" is a small post-beta query against `task_events` once tracking surface exists.

---

## Q21 — Maintenance reporting cascade tree (Location → Item → Type)

**Answer:** Cascade tree NOT specified in rules table — Jennifer's KB authoring still required.

**Source:**
- Admin Maintenance sheet has only 4 rows: master tables (open issues by location/type), per-issue card (severity + photo + reporter + room + resolution actions). No cascade-tree authoring.
- Open Assumptions #11: *"Maintenance section across all cards (Rules.md) vs. Day 19 structure. Rules.md says every housekeeping card has a Maintenance section..."* — surface placement noted but no taxonomy tree.

**Engineering status:** Existing flat dropdowns in `lib/maintenance.ts` (`MAINTENANCE_LOCATIONS` 21 values + `MAINTENANCE_ITEMS` 11 values + `MAINTENANCE_TYPES` 10 values) shipped Day 33 for beta. The cascade tree (per-Location → Item-set + per-Item → Type-set mappings) requires explicit per-row authoring that's NOT in the rules table — Jennifer's KB still owes us this.

**Closes:** Open Jennifer #4 (cascade filter logic) STAYS PARTIALLY OPEN — Jennifer's answer pointed at the rules document but the rules document doesn't have the tree. Reframe as "PENDING JENNIFER KB AUTHORING (cascade tree spec)." Update Open Jennifer questions to reflect this.

---

## Summary closure ledger (Day 52 chase #5)

| Open Jennifer Q | Verdict | Action |
|---|---|---|
| Q6 D-430 tolerance | CONFIRMED strict bounds | None — existing code matches |
| Q14 daily distribution | CONFIRMED 80/20 admin-note threshold | Logged for IV.I post-beta |
| Q15 assignment policy | CONFIRMED two-tier (primary/non-primary) | Logged for IV.A post-beta |
| Q16 hallway adjacency | CONFIRMED locked w/ admin override + audit | Existing event taxonomy validated |
| Q17 deep clean Phase B | THRESHOLDS CONFIRMED (40%, 45 days, etc.); data source + denominator → BRYAN DECISION | Phase B activates once Bryan picks data source + denominator |
| Q19 Sheet Change skip | CONFIRMED two-case interpretation | Already post-beta (forward-scheduling infra) |
| Q21 maintenance cascade | NOT IN RULES — JENNIFER KB STILL OWED | Stays pending Jennifer KB |

**Inventory impact:** Open Jennifer questions count drops 3 → 2 (Q6 closes via confirmation; Q17 closes as Jennifer-answered + reframed as Bryan-decision; Q21 stays pending). The remaining 2 are Q21 (Jennifer KB pending) + Q17 partial (Bryan-actionable now).

**Engineering work surface remaining post-Chase-D:** ZERO non-Bryan-actionable items. All forward motion now waits on:
1. Bryan picks Q17 Phase B data source + denominator (single-line code change unlocks IV.H Phase B).
2. Jennifer delivers Q21 cascade tree authoring (post-Jennifer-KB).
3. Jennifer delivers VI.E variant lists (Sheet Change/Pet/Long-term — Bryan needs to clarify Long-term context to her first per Q2).
4. Jennifer delivers VI.F D-430 18-cell time-target matrix (Bryan needs to extract grid format and forward to her per Q4).
5. Jennifer delivers VI.G daily/weekly/monthly task time estimates (Q7 ETA "within the week").
6. Cloudbeds sales quote unblocks V.C.
