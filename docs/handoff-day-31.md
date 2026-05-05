# UI / Build Handoff — Dispatch Day 31 (2026-05-05)

*Continuation handoff for a fresh Cowork chat. Supplements — does not replace — `docs/handoff-day-30.md` (Day 30 — I.A + I.B closed, I.C Phases 1 + 2a + 2b closed), `docs/handoff-day-29.md` (Day 29 — III.D Activity feed closed end-to-end), `docs/handoff-day-28.md` (Day 28 — master-plan audit), `docs/handoff-day-{27,26,25,24,23,22}.md`, `docs/phase-4-handoff.md` (Day 21), and `docs/dispatch-master-plan.md`. Read those alongside this one. The 25-tab governance spreadsheet at `docs/kb/` is canonical for governance.*

*Date: 2026-05-05, Day 31. The build day after Day 30's three-phase Section I push. Single-commit session focused on closing I.C Phase 3 (orchestrator swap from synthesized `daily_shift` events to real `shift_start` events written by a Postgres trigger on `public.staff`). End-to-end validated against Lizzie Larson via SQL — clock-in fires the trigger, orchestrator picks up the event, two tasks (dailys + eod) inserted with correct shape. I.C is now 87.5% closed (3 of 4 phases). Phase 4 scoped in full inside this doc — execute next session.*

---

## Day 31 in one sentence

**Master plan I.C Phase 3 closed.** A SECURITY DEFINER Postgres trigger on `public.staff` now writes real `shift_start` and `shift_end` events to `inbound_events` whenever `clocked_in_at` flips, replacing the day-of fan-out synthesizer in `lib/orchestration/run.ts`. Browser-side `clockIn` / `clockOut` stay as thin column flippers — no new RLS surface, no new API endpoint. One commit (`1d6dbe3`), 5 files (1 new SQL migration + 4 modified), end-to-end validated, build clean.

---

## What landed in Day 31

One commit between HEAD-at-session-start (`a091264`, Day 30 handoff doc) and HEAD-at-session-end (`1d6dbe3`). Pushed to `origin/main`.

### Commit — I.C Phase 3: clockIn shift_start trigger; orchestrator synthesizer dropped

- **`1d6dbe3` — Day 31 I.C Phase 3: clockIn shift_start trigger; orchestrator synthesizer dropped.** Five files: 1 new SQL migration + 4 modified. 174 insertions / 141 deletions.

  - **NEW** `docs/supabase/staff_clock_in_event_trigger.sql` (~95 lines). Creates `public.staff_clock_in_event()` (SECURITY DEFINER, search_path locked to `public, pg_temp`) and `staff_clock_in_event_trigger` (AFTER UPDATE OF `clocked_in_at` ON `public.staff` FOR EACH ROW WHEN value IS DISTINCT FROM old). On null→ts: inserts `event_type='shift_start'` row to `inbound_events` with `source='clock_in'`, `external_id='shift-start-{staffId}'`, `event_date=(now() AT TIME ZONE 'America/Chicago')::date`, `raw_payload={staff_id, staff_name}`. On ts→null: inserts `event_type='shift_end'` with `external_id='shift-end-{staffId}'` and `raw_payload={staff_id, staff_name, shift_start_at}` carrying `OLD.clocked_in_at` for Phase 4's segment-duration math. Idempotent via existing `inbound_events_dedup` constraint + `ON CONFLICT DO NOTHING`. Verification SELECT confirmed function + trigger both exist.

  - **EDIT** `lib/orchestration/rules/dailys.ts` — trigger swap `event_type: 'daily_shift'` → `'shift_start'`. Header comment refreshed to describe the trigger-driven path. String literal — no shared-module import, sidesteps the Day 29 runtime caveat.

  - **EDIT** `lib/orchestration/rules/eod.ts` — same trigger swap + comment refresh. Internal comment about staff_id flow updated from "synthesized event" to "shift_start event."

  - **EDIT** `lib/orchestration/run.ts` — deleted `synthesizeDailyShiftEvents` function (~65 lines), `todayInPropertyTz` helper (~14 lines), call site within `run()` (~12 lines), unused `SupabaseClient` type import, unused `RosterMember` type import, unused `PROPERTY_TIMEZONE` import. File: 323 → 237 lines. `loadRoster` import + roster-load step retained — `assignDrafts` still consumes it for lane logic on arrivals/departures/stayovers.

  - **EDIT** `lib/clock-in.ts` — header comment refresh describing the trigger-driven path. No code change. The clockIn / clockOut helpers remain thin column flippers; the atomic shift_start / shift_end event writes happen via the Postgres trigger.

### Verification kit (SQL-only, runtime-validated)

Five-block kit ran end-to-end:

- **Block 0** — applied the new migration via Supabase dashboard. Function + trigger both confirmed via verification SELECT.
- **Block 1** — `SELECT id, name, clocked_in_at FROM public.staff` to confirm the actual roster shape. Surfaced 5 rows: Angie Lopez, Courtney Manager, Lizzie (stub — see "DEFER notes"), Lizzie Larson, Mark Parry. Earlier seed name `'Courtney'` didn't match any row — re-targeted to Lizzie Larson.
- **Block 2** — clock-in test against Lizzie Larson. `UPDATE public.staff SET clocked_in_at = NULL WHERE name = 'Lizzie Larson';` (no-op since already NULL); `UPDATE public.staff SET clocked_in_at = now() WHERE name = 'Lizzie Larson';` (trigger fired). Verify SELECT against `inbound_events` returned exactly one shift_start row with the right shape: `source='clock_in'`, `external_id='shift-start-{Lizzie's UUID}'`, `event_date='2026-05-05'`, `staff_name='Lizzie Larson'`, `processed_at=NULL`.
- **Block 3** — `AGENT_KILL=false AGENT_DRY_RUN=false npm run orchestrate`. Output: `Roster loaded: 5 member(s)`, `Found 1 unprocessed event(s)`, `Generated 2 draft(s) before assignment`, `After assignment: 2 of 2 draft(s) have staff_id populated; 0 pending audit event(s)`, `Reshuffle: examined 87 active task(s)... 0 updated`, `Done. events_processed=1 drafts_inserted=0 tasks_inserted=2`.
- **Block 4** — verify SELECT confirmed two tasks for Lizzie's `staff_id`: one `card_type='dailys'` titled "Property round — Lizzie Larson" with `bucket='dailys'` and `due_time='11:00:00'`; one `card_type='eod'` titled "End of day — Lizzie Larson" with `bucket='eod'` and `due_time='16:00:00'`. Both `status='open'`, both `staff_id` matching Lizzie's UUID.
- **Block 5** — clock-out test. `UPDATE public.staff SET clocked_in_at = NULL WHERE name = 'Lizzie Larson';` (trigger fired). Verify SELECT returned one shift_end row with `shift_start_at` carrying the original clock-in timestamp (`2026-05-05T20:57:28.63464+00:00`). `processed_at=NULL` — no rule consumes shift_end yet, will get marked processed on next orchestrator run.

---

## State of the build at end of Day 31

**Working tree clean. Branch matches origin/main exactly.** One Day 31 commit pushed: `1d6dbe3`.

**Build clean.** `npm run build` ran 1+ time. 21 routes, zero errors, zero warnings.

**Master plan I.C — three-of-four-phases closed:**
- ✓ Phase 1 — Pre-Clock-In screen + clock-in flow (Day 30).
- ✓ Phase 2a — Wrap Shift on E-430 clocks staff out (Day 30).
- ✓ Phase 2b — Cross-staff EOD activation gate (Day 30).
- ✓ Phase 3 — Orchestrator swap; daily_shift synthesizer dropped (Day 31).
- ⏳ Phase 4 — 14-day segment view + shift summary (full scope below; execute next session).

**Section I summary post-Day-31:**
- I.A ✓ closed (Day 30).
- I.B ✓ closed (Day 30).
- I.C 87.5% closed (3 of 4 phases).
- I.D-I.I unchanged from Day 30 — all PARTIAL with various blockers (III.B Maintenance compose, V.A reservation fallback, V.D weather, Jennifer's KB content).

**Section IV update:** IV.F dailys/eod rule files now wired to real shift events instead of synthesized ones. The trigger architecture means dailys + eod cards appear within one orchestrator cron interval of clock-in (latency-bounded, acceptable for beta).

**Schema change — only one this session:** `staff_clock_in_event_trigger` + `staff_clock_in_event()` function on `public.staff` via `docs/supabase/staff_clock_in_event_trigger.sql`. SECURITY DEFINER. Idempotent.

**No new dependencies.** Current deps unchanged: `@supabase/supabase-js`, `@supabase/ssr`, `next`, `react`, `react-dom`.

**Untouched documentation** — `docs/dispatch-master-plan.md`, `docs/handoff-day-{22,23,24,25,26,27,28,29,30}.md`, `docs/phase-4-handoff.md`, `docs/kb/...`, `docs/TASK_EVENTS_CONTRACT.md` all unchanged. `docs/handoff-day-31.md` (this file) is the only new doc.

---

## I.C Phase 4 — full scope (execute next session)

Master plan I.C remaining clauses: "starts shift timer, writes 14-day segment row" + "writes shift summary." Master plan III.J + VII.D refine: Wed-anchored 14-day window, view-vs-table decision pending. Day 28 + Day 30 + this scope all converge on **view-for-beta** — derive everything from the `inbound_events` shift_start/shift_end pairs (now flowing post-Phase-3) plus `task_events` durations, no new tables.

### Phase 4a — `public.staff_shifts_v` view (foundational)

**Purpose:** pair each shift_start event with the next shift_end event for the same staff. Each row = one shift.

**Schema:**
```sql
CREATE OR REPLACE VIEW public.staff_shifts_v AS
WITH starts AS (
  SELECT
    raw_payload->>'staff_id'   AS staff_id,
    raw_payload->>'staff_name' AS staff_name,
    created_at                 AS shift_start_at,
    event_date,
    id                         AS start_event_id
  FROM public.inbound_events
  WHERE event_type = 'shift_start'
    AND source     = 'clock_in'
),
ends AS (
  SELECT
    raw_payload->>'staff_id' AS staff_id,
    created_at               AS shift_end_at,
    id                       AS end_event_id
  FROM public.inbound_events
  WHERE event_type = 'shift_end'
    AND source     = 'clock_in'
)
SELECT
  s.staff_id,
  s.staff_name,
  s.shift_start_at,
  e.shift_end_at,
  CASE
    WHEN e.shift_end_at IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (e.shift_end_at - s.shift_start_at))::int / 60
  END                       AS duration_minutes,
  (e.shift_end_at IS NULL)  AS is_current,
  s.event_date              AS shift_date,
  s.start_event_id,
  e.end_event_id
FROM starts s
LEFT JOIN LATERAL (
  SELECT shift_end_at, end_event_id
  FROM ends
  WHERE staff_id = s.staff_id
    AND shift_end_at > s.shift_start_at
  ORDER BY shift_end_at ASC
  LIMIT 1
) e ON true;
```

**Edge cases addressed:**
- Currently clocked-in staff: `shift_end_at IS NULL`, `is_current = true`, `duration_minutes = NULL`. Phase 4c handles by treating effective-end as `now()`.
- Shifts that cross midnight: shift_start has Tuesday's event_date, shift_end has Wednesday's event_date. LATERAL pairing uses timestamp ordering, not event_date — correctly pairs across days.
- Orphan shift_end (admin manually nulled clocked_in_at without a prior clock-in): not surfaced — view is start-driven. Acceptable.
- Multiple clock-ins same day: blocked by inbound_events_dedup constraint, can't happen for same `(staff_id, event_date)` pair.

**Migration file:** `docs/supabase/staff_shifts_view.sql`. Idempotent (`CREATE OR REPLACE VIEW`). Safe to re-run.

**Estimate:** ~30 min (write + verification SELECT against existing Lizzie Larson test data).

### Phase 4b — `public.staff_segments_v` view (Wed-anchored 14-day buckets)

**Purpose:** aggregate shifts into Wed-anchored 14-day segments per staff. Each row = one (staff_id, segment_start, segment_end) tuple.

**Math approach:** pick a known reference Wednesday (`2026-01-07` works — verifiable Wednesday). For any shift on date D, segment_start = `reference_wed + FLOOR((D - reference_wed) / 14) * 14`. Result lands on a Wednesday by construction. segment_end = segment_start + 13 days (ends Tuesday).

**Schema:**
```sql
CREATE OR REPLACE VIEW public.staff_segments_v AS
WITH params AS (
  -- Reference Wednesday: 2026-01-07 (verified). Multi-property post-beta will
  -- need per-property reference + per-property TZ (master plan IX.C).
  SELECT DATE '2026-01-07' AS reference_wed
),
shifts_with_segments AS (
  SELECT
    s.staff_id,
    s.staff_name,
    s.duration_minutes,
    p.reference_wed
      + (FLOOR((s.shift_date - p.reference_wed) / 14.0) * 14)::int
      AS segment_start
  FROM public.staff_shifts_v s
  CROSS JOIN params p
  WHERE s.duration_minutes IS NOT NULL  -- exclude currently-clocked-in shifts
)
SELECT
  staff_id,
  staff_name,
  segment_start,
  segment_start + 13                       AS segment_end,
  COUNT(*)::int                            AS shift_count,
  COALESCE(SUM(duration_minutes), 0)::int  AS total_minutes
FROM shifts_with_segments
GROUP BY staff_id, staff_name, segment_start;
```

**Edge cases:**
- Currently clocked-in shifts excluded (`duration_minutes IS NULL`). They appear in the current segment once they end.
- New hire whose first shift is mid-segment: master plan I.C exception clause says "admin can roll their hours into the next full segment." Not implemented in the view — admin override is post-beta. View as-is includes their partial segment.
- Cross-segment shifts: shifts can't span segments because shifts are bounded by clock-in/out events on the same calendar day in property TZ (segments boundaries are also Wed→Tue in property TZ, so a shift staying within one calendar day stays within one segment).

**Migration file:** `docs/supabase/staff_segments_view.sql`. Idempotent. Depends on Phase 4a view existing.

**Estimate:** ~30 min.

### Phase 4c — `public.shift_summary_v` view (per-shift task counts + duration)

**Purpose:** for each shift, count tasks completed during it by card_type. Master plan I.I (E-430) says shift summary surfaces: # departures + # stayovers + # arrivals + # daily tasks + total hours.

**Schema:**
```sql
CREATE OR REPLACE VIEW public.shift_summary_v AS
WITH shift_pairs AS (
  SELECT
    staff_id,
    staff_name,
    shift_start_at,
    shift_end_at,
    duration_minutes,
    is_current,
    -- Treat current shifts as ending now() for in-progress task accounting.
    COALESCE(shift_end_at, now()) AS effective_end_at
  FROM public.staff_shifts_v
)
SELECT
  sp.staff_id,
  sp.staff_name,
  sp.shift_start_at,
  sp.shift_end_at,
  sp.duration_minutes,
  sp.is_current,
  COUNT(t.id) FILTER (WHERE t.card_type = 'housekeeping_turn')::int AS departures_completed,
  COUNT(t.id) FILTER (WHERE t.card_type = 'arrival')::int           AS arrivals_completed,
  COUNT(t.id) FILTER (WHERE t.card_type = 'stayover')::int          AS stayovers_completed,
  COUNT(t.id) FILTER (WHERE t.card_type = 'dailys')::int            AS dailys_completed,
  COUNT(t.id) FILTER (WHERE t.card_type = 'eod')::int               AS eod_completed,
  COUNT(t.id)::int                                                  AS total_tasks_completed
FROM shift_pairs sp
LEFT JOIN public.tasks t
  ON t.staff_id::text   = sp.staff_id
  AND t.completed_at   >= sp.shift_start_at
  AND t.completed_at   <= sp.effective_end_at
  AND t.completed_at IS NOT NULL
GROUP BY sp.staff_id, sp.staff_name, sp.shift_start_at, sp.shift_end_at, sp.duration_minutes, sp.is_current;
```

**Notes:**
- `t.staff_id::text = sp.staff_id` cast required because `tasks.staff_id` is uuid and `inbound_events.raw_payload->>'staff_id'` is text. Cleaner alternative: cast both to uuid explicitly. Either works.
- Uses `completed_at IS NOT NULL` as the completion gate rather than `status='done'` — defensive against status-flip-without-timestamp edge cases.
- Tasks completed during a paused interval still count (they weren't paused-then-completed; they were resumed-then-completed).

**Migration file:** `docs/supabase/shift_summary_view.sql`. Idempotent. Depends on Phase 4a view.

**Estimate:** ~30-45 min (more join math + verification).

### Phase 4d — UI surface on `/admin/staff/[id]`

**Purpose:** wire the three views into the admin staff profile so the segment block + lifetime summary + per-shift summary cards render live data instead of `PROFILES` const.

**Files affected:**
- `app/admin/staff/[id]/page.tsx` (~462 lines per Day 28 audit) — drop the `PROFILES[slug]` lookup, fetch the staff row from `public.staff` by id (or by slug→name), then fetch:
  - Current segment from `staff_segments_v` (where `segment_start <= today AND segment_end >= today AND staff_id = X`).
  - All historical segments from same view (same staff_id, ordered by segment_start desc, limit 5 or so).
  - Current segment shifts from `staff_shifts_v` (where `shift_date >= segment_start AND shift_date <= segment_end AND staff_id = X`).
  - Per-shift summaries from `shift_summary_v` (joined via shift_start_at).
- `app/globals.css` — add styles for the segment block (table or list rendering of per-shift rows: date, hours, # cards completed by type).

**Render layout (added to existing profile page):**
- New "Current segment" block above the existing nav rows. Header: `{segment_start} – {segment_end}` (e.g., "Apr 22 – May 5") + total hours for the segment.
- Per-shift rows underneath: shift date + duration + count of departures/arrivals/stayovers/dailys completed.
- Lifetime running total (sum across all segments). Single line summary near top of page.

**Estimate:** ~2 hours. Mostly query wiring; the hero card + stats trio + nav rows are already built per Day 28 audit. Care needed on the staff_id-as-slug mapping (the existing page bridges slug → staff UUID via `public.staff.name`).

**Overlap with Item C:** the live-data wiring of Section II surfaces (Day 30 carry-forward) includes replacing `PROFILES` hardcoded data with `public.staff` fetch (~30 min). Phase 4d does that as a side effect. After Phase 4d lands, Item C's remaining work shrinks to: `LANES` + `STAT_*` in `app/admin/tasks/page.tsx`, `WATCHLIST/SCHEDULING/CRITICAL/NOTES` in `app/admin/page.tsx`, and `ORDER` in `app/admin/maintenance/[id]/page.tsx` (the last is gated on VII.B issues table).

### Phase 4 — total estimate

- 4a: ~30 min
- 4b: ~30 min
- 4c: ~45 min
- 4d: ~2 hours
- Verification kit (cross-cutting): ~30 min
- Build + commit + handoff: ~30 min

**Total: ~4-5 hours.** Doable in a single focused session. After Phase 4 lands, **I.C is fully closed (4 of 4 phases) and Section I has only I.D-I.I PARTIAL items remaining, all blocked on cross-cutters (III.B Maintenance compose + V.A reservation fallback + V.D weather).**

### Phase 4 verification kit (run after 4a-4c land, before 4d)

```sql
-- Phase 4 verification — run after the three view migrations land.

-- Check 1: staff_shifts_v finds the Lizzie Larson shift from Phase 3.
-- Should return one row, is_current=false, duration_minutes ≈ 2 (the test
-- clock-in lasted ~2 minutes between the SQL UPDATEs).
SELECT staff_name, shift_start_at, shift_end_at, duration_minutes, is_current
FROM public.staff_shifts_v
WHERE staff_id = '8fb2f515-4df3-4835-b2e9-e01f2eff993d'
ORDER BY shift_start_at DESC
LIMIT 5;

-- Check 2: staff_segments_v returns Lizzie's current segment.
-- segment_start should be a Wednesday on or before today.
SELECT staff_name, segment_start, segment_end, shift_count, total_minutes
FROM public.staff_segments_v
WHERE staff_id = '8fb2f515-4df3-4835-b2e9-e01f2eff993d';

-- Check 3: shift_summary_v returns the dailys + eod task counts (none
-- completed yet — both still status='open' from Phase 3 test). Should
-- return one row with total_tasks_completed=0.
SELECT staff_name, shift_start_at, duration_minutes, dailys_completed, eod_completed, total_tasks_completed
FROM public.shift_summary_v
WHERE staff_id = '8fb2f515-4df3-4835-b2e9-e01f2eff993d';

-- Check 4: cross-staff segment counts. Should return 0-1 rows per staff
-- depending on how many have ever clocked in.
SELECT staff_name, COUNT(*) AS segment_count, SUM(total_minutes) AS lifetime_minutes
FROM public.staff_segments_v
GROUP BY staff_name
ORDER BY lifetime_minutes DESC NULLS LAST;
```

---

## Open queue (Day 31 carry-forward)

### I.C Phase 4 — full scope above. Top of next session's queue.

### Day 30 carry-forward (still on the queue, unchanged from Day 30 list)

- **C. Live-data wirings cluster on Section II surfaces.** ~3 hours; partially absorbed by Phase 4d (the `/admin/staff/[id]` portion). After Phase 4d, Item C's remaining work is admin tasks dashboard + admin home + admin maintenance index.
- **D. III.B Maintenance compose drawer.** 1-2 hours; CRITICAL UNBLOCK for I.D / I.E / I.F / I.G. Mirrors III.A NoteComposeForm pattern.
- **E. V.A BR4 X-430 brief reservation fallback.** 1-2 hours.
- **F. IV.H Wed-occupancy Deep Clean trigger.** ~1 hour.
- **G. III.E + V.G photo pipeline wiring into NoteComposeForm.** 1-2 hours.
- **H. III.H reassignment helper.** ~30 min.
- **I. II.A confirmation pass.** ~30 min.
- **J. I.G S-430 status pill time-target display.** Day 25 outstanding chase; ~30 min.
- **K. Item I — Vercel deploy.** Bryan's parallel lane, ~30 min.
- **L. V.C Cloudbeds.** Bryan's separate thread, outside engineering critical path.

### Tabled

- **`MODULE_TYPELESS_PACKAGE_JSON` Node warning.**
- **`[ASK JENNIFER]` flags** — same set carrying forward.
- **Re-key `dispatch-config.ts` Section 14 maps from full names to UUIDs.**
- **Legacy `task_comments` table cleanup.**
- **`lib/task-event-types.ts` extraction** (post-beta polish from Day 29 finding).
- **NEW Day 31:** stray `Lizzie` row in `public.staff` (id `fc2c4280-2be4-4ef8-a1ea-3a0b3dfbe3bc`, no surname). Looks like a pre-rename stub before "Lizzie Larson" replaced her. Verify no FK references and `DELETE FROM public.staff WHERE id = 'fc2c4280-2be4-4ef8-a1ea-3a0b3dfbe3bc';` if orphaned. ~5 min.
- **NEW Day 31:** "Courtney Manager" name format flagged for clarity — confirm with Jennifer whether "Manager" is her surname or a role marker that leaked into the name field.

### `[DEFER]` notes new in Day 31

- **Same-day re-clock loses pair accuracy.** If a staff member clocks in, out, and in again on the same day, the second `(shift_start, staff_id, today)` tuple silently dedupes — only the first pair is recorded. Acceptable for single-property typical-shift beta. Phase 4 segment math can revisit if shift summary accuracy demands per-segment uniqueness.
- **PROPERTY_TIMEZONE hardcoded `'America/Chicago'`** in the trigger. Master plan IX.C tracks moving to a per-property column post-beta; for now, single Wisconsin property is fine.
- **Test data persistence.** The Phase 3 verification left two real-looking tasks in `public.tasks` for Lizzie Larson (a dailys card + an eod card) plus the inbound_events shift_start/shift_end rows. They're representative of what Phase 3 actually does in production — not garbage data. Leaving in place. Phase 4 verification will run against this data.

---

## Critical state to verify in next session's first minutes

1. **Run `npm run build`** — confirm clean. Last known-good was end-of-Day-31 Phase 3.
2. **`git status`** — working tree should be clean. Branch should be `0 ahead, 0 behind` of `origin/main`.
3. **`git log --oneline -3`** — should show in order (newest first): `<Day 31 handoff doc SHA>`, `1d6dbe3` (I.C Phase 3), `a091264` (Day 30 handoff doc).
4. **Confirm Supabase trigger live** — `SELECT proname FROM pg_proc WHERE proname = 'staff_clock_in_event';` should return one row. `SELECT tgname FROM pg_trigger WHERE tgname = 'staff_clock_in_event_trigger';` should also return one row.
5. **Confirm inbound_events has Lizzie's two events** — `SELECT event_type, raw_payload->>'staff_name' FROM public.inbound_events WHERE raw_payload->>'staff_name' = 'Lizzie Larson' AND event_date = (now() AT TIME ZONE 'America/Chicago')::date;` should return two rows: one shift_start + one shift_end. Phase 4 verification depends on these existing.
6. **Decide Phase 4 sub-scope.** Recommended: start at 4a, walk to 4d in order. Each is independently committable so partial progress doesn't block. If energy budget runs short, 4a + 4b + 4c (backend views) is a clean stop point — UI surface (4d) can fold into the next session's Item C pass.

---

## Files to load in next Cowork chat

**Required:** Mount `/Users/bryanstauder/dispatch-app/`. Read in this order:

1. `docs/handoff-day-31.md` (this file — most recent, read first).
2. `docs/handoff-day-30.md` (Day 30 — I.A + I.B + I.C 75% closed).
3. `docs/handoff-day-29.md` (Day 29 — III.D Activity feed close).
4. `docs/handoff-day-28.md` (Day 28 — master-plan audit findings).
5. `docs/dispatch-master-plan.md` (canonical inventory with Day 28 + 29 + 30 + 31 closure overlay).
6. `docs/handoff-day-{27,26,25,24,23,22}.md` (foundation).
7. `docs/phase-4-handoff.md` (Day 21 — note: this is the OLD phase-4 handoff for the rule engine; not related to I.C Phase 4).
8. `docs/kb-spreadsheet-index.md` + `docs/kb/README.md` + `docs/kb/Dispatch — Rules Table Handoff.md`.
9. `docs/TASK_EVENTS_CONTRACT.md` (vocabulary + severity classification).
10. `docs/supabase/staff_clock_in_event_trigger.sql` (Day 31 — trigger source of truth for shift_start/shift_end).
11. `lib/clock-in.ts` (Day 30 + Day 31 comment refresh — clockIn / clockOut / fetchClockedInAt / canWrapShift).
12. `lib/task-events.ts` (event vocabulary + `uploadTaskFile` helper).
13. `lib/orchestration/audit-events.ts` (Day 29).
14. `lib/orchestration/{assignment-policies,reshuffle,run,interpret}.ts` — `run.ts` materially smaller post-Day-31.
15. `lib/orchestration/rules/{dailys,eod,arrivals,departures,stayovers,maintenance}.ts` — dailys/eod now trigger on `shift_start`.
16. `lib/notes.ts` + `lib/activity-feed.ts`.
17. `app/staff/page.tsx` (Day 30).
18. `app/staff/task/[id]/page.tsx` + `EODCard.tsx` + `NoteComposeForm.tsx`.
19. `lib/dispatch-config.ts` (Sections 9 + 12 + 14).
20. `app/admin/page.tsx` + `components/admin/ActivityFeed.tsx`.
21. `app/admin/staff/[id]/page.tsx` (Phase 4d primary target — replace `PROFILES` const + add segment block).
22. `app/admin/tasks/page.tsx` + `app/admin/maintenance/[id]/page.tsx` (Item C downstream targets).
23. `components/admin/AddTaskModal.tsx`.
24. Skim `CLAUDE.md`, `AGENTS.md`, `dispatch-ui-rules.md`.

---

## Operating reminders for the next chat

- **Bryan is non-developer.** Plain English, exact copy-paste prompts in fenced blocks. No placeholders unless explicitly called out.
- **Default workflow: Cowork-Claude direct-writes ALL code; CC handles only build verification + git operations + commits.** Pattern held cleanly through Day 31.
- **Single fenced code block per CC prompt + per SQL block.** Bryan's standing preference.
- **CC misread pattern is alive.** Bash output is ground truth.
- **Internal imports under `lib/orchestration/`** must use `.ts` extensions. Imports from outside that folder use plain extensionless. **Day 29 caveat carries forward**: anything in `lib/orchestration/` importing from a browser-coupled module (one that imports `lib/supabase`) will compile but fail at orchestrator runtime.
- **No new dependencies** without asking Bryan.
- **Boring code.** No clever abstractions.
- **Migrations** live in `docs/supabase/*.sql`, applied manually via Supabase dashboard SQL editor.
- **The spreadsheet at `docs/kb/` is canonical for governance.**
- **The master plan at `docs/dispatch-master-plan.md` is THE PLAN — but Day 28 audit + Day 29 + Day 30 + Day 31 closures override the PARTIAL/UNBUILT labels.** "No cuts, all of it" by default.
- **`[ASK JENNIFER]` is the convention for static config Jennifer needs to confirm.**
- **Channel manager:** Cloudbeds, pending sales quote. Bryan's separate thread.
- **Q4 (Jennifer's KB authoring) is "an ongoing battle."** Engineering doesn't block on it.
- **Context-capacity rule:** draft handoff at 70%, push to 80-85%. This handoff drafted at the 90% mark per Bryan's session-budget signal — Bryan is wrapping the session early to revisit tonight on a fresh window.
- **"Live and die by the master plan"** (Bryan, Day 30): walk the master plan top-down. Phase 4 finishes I.C; after that, Section I has only PARTIAL items blocked on cross-cutters.
- **Day 31 verification convention** (carries forward Day 30): to re-test the trigger end-to-end, run `UPDATE public.staff SET clocked_in_at = NULL WHERE name = '<staff-name>';` then `UPDATE public.staff SET clocked_in_at = now() WHERE name = '<staff-name>';` in Supabase SQL editor. Verify against `inbound_events` directly.

---

## Items intentionally NOT done in Day 31

- **I.C Phase 4 — 14-day segment view + shift summary.** Full scope laid out above. Deferred to next session per Bryan's session-budget signal.
- **Section II live-data wirings cluster.** Carry forward; partially absorbed by Phase 4d.
- **III.B Maintenance compose drawer.** Carry forward.
- **V.A BR4 reservation fallback.** Carry forward.
- **IV.H Wed-occupancy Deep Clean trigger.** Carry forward.
- **III.E + V.G photo pipeline wiring.** Carry forward.
- **III.H reassignment helper.** Carry forward.
- **II.A confirmation pass.** Carry forward.
- **I.G S-430 status pill time-target display.** Day 25 outstanding — still on queue.
- **Stray `Lizzie` row cleanup** (Day 31 new tabled item).
- **Vercel deploy.** Bryan's lane.

---

## Day 31 in numbers

- **1 commit** on origin (`1d6dbe3`, plus this handoff doc commit on top).
- **174 lines of code** added.
- **141 lines of code** deleted (mostly `synthesizeDailyShiftEvents` + `todayInPropertyTz` from `run.ts`).
- **Net: +33 lines.**
- **1 schema change**: `staff_clock_in_event_trigger` + `staff_clock_in_event()` function on `public.staff`.
- **1 new file**: `docs/supabase/staff_clock_in_event_trigger.sql`.
- **1 new SQL migration**: same file.
- **0 new dependencies**.
- **1 master plan phase closed**: I.C Phase 3.
- **Day 31 master plan progress**: I.C closure jumped from "75%" to "87.5%" (3 of 4 phases). Section IV's IV.F dailys/eod rule files now wired to real shift events.

---

## Path to "well below 3-5 weeks"

Bryan's Day 31 directive: trim the 3-5 week estimate without skipping any items. Three multipliers available:

1. **Batching.** Phase 4d overlaps with Item C's `/admin/staff/[id]` portion — execute together. III.B Maintenance compose unblocks four Section I items in one 1-2hr chase. III.H reassignment is ~30 min once III.B's compose pattern is established. Run them as a cluster, not as one-offs.

2. **Authoring lane parallelism.** Section VI (Jennifer's KB content) is non-blocking on engineering. Make sure she's unblocked on the 25-tab spreadsheet authoring while engineering chases the cross-cutters. Authoring + engineering ship as parallel lanes.

3. **Hour density.** Day 30 was four phases in one session. Day 31 was one phase + scoping. Comparable productivity in a single focused 5-6 hour block could close Phase 4 + III.B + III.H in one chase. Three days of focused 4-hour sessions could close Section I entirely + the live-data wirings cluster.

Practical path to ~2 weeks instead of 3-5: chase Phase 4 + Item C + III.B + III.H + V.A + IV.H back-to-back in one focused week, then Vercel deploy + smoke test, then three of the post-beta items get pushed off the critical path. Section II.J (KB Editor) and II.K (Calendar) remain post-beta per the spreadsheet's own marking — they're "no cuts" per the master plan but Bryan + Jennifer can formally defer them to a v2 lane without violating the "no cuts" promise (deferring is not skipping; the items remain on the master list).

---

*Handoff complete. Ready for Day 32. Master plan I.C Phase 3 closed (3 of 4 phases). Phase 4 fully scoped — 4a (`staff_shifts_v`) + 4b (`staff_segments_v`) + 4c (`shift_summary_v`) + 4d (UI surface on `/admin/staff/[id]`), ~4-5 hours total. After Phase 4 lands, I.C is fully closed and Section I has only PARTIAL items remaining, all blocked on cross-cutters.*
