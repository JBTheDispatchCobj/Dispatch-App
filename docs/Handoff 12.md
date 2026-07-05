# Dispatch (Hospitality) — Handoff 12

Scope: the **core Dispatch hospitality product** (the live beta at Forrest Inn,
single housekeeper Angie). Dispatch OS is a separate project handled in another
session — out of scope here.

Session date: 2026-07-05 (Day 57).

Read order for a fresh session: `docs/STATE.md` → `CLAUDE.md` →
`docs/qa-status-2026-06-24.md` (live punchlist status tracker, also an `.xlsx`
for Jennifer) → `docs/qa-triage-2026-06-04.md` (underlying triage) →
`docs/Handoff 11.md` → this file.

---

## What this session did (hospitality)

All code is **typecheck-clean** (`npx tsc --noEmit` → exit 0). **No SQL
migrations, no new dependencies, plain CSS only.** The two new context keys and
two new task_event types are additive (they live in the existing `tasks.context`
jsonb + the append-only `task_events` v1 contract — nothing to migrate). Nothing
is live until Bryan commits + pushes `dispatch-app` to `main` from his Mac.

### 0. Push reality check (important)
At the START of this session, last session's work (the dead-button fixes + the
quick-win batch + auto-pause-on-exit + the comment-thread repointing) was **still
uncommitted in the working tree** — the push had NOT happened. Flagged to Bryan.
This session's work ships in the SAME push, so one commit covers Days 56–57.

### 1. Departures status model (qa-triage §3 #27-31) — BUILT
Bryan signed off on two forks: **multi-select** chips (not a single-select
progression) and **Rollover as an admin-home quick action**.

- `app/staff/task/[id]/DeparturesCard.tsx`: the status block moved to a
  `.statcard` at the **TOP of the card, above the guest brief**. Five chips —
  **Open / Stripped / Odobanned / Has Sheets / Done** — multi-select, **no
  auto-default** (a fresh card has nothing selected). Pills are now `<button>`s
  that write `context.departure_status` as a **string[]** (merge-safe, mirrors
  the StayoversCard staff-toggle pattern) and emit the new
  **`departure_status_changed`** task_event (`{ from, to }`, schema_version 1).
  `parseDepartureStatuses` tolerates a legacy single-string value and maps the
  retired `sheets` key → `has_sheets`.
- **"Room Spray" folded under a new "Setup" group** caption in `.setstat`; the
  old status row was removed from `.setstat`.
- `app/globals.css`: added `.preview-d-430 .statcard*`; made
  `.preview-d-430 .status-pill` interactive (was `pointer-events:none`); active
  pill now uses the departures accent (was `--alert` red); added
  `.setstat__caption`. **Final pill-color polish is deferred to the design
  "let's talk" session (qa §5 #42) — I intentionally did not repaint the palette.**
- **Admin Rollover:** new `components/admin/RolloverQuickAction.tsx` (+
  `.module.css`), mounted on `app/admin/page.tsx` under the Daily Brief. Lists
  today's open departures; "Roll over" sets `context.rolled_over = true` and
  emits **`departure_rolled_over`**. `lib/staff-home-bucket.ts` gained
  `isRolledOver()`; `app/staff/page.tsx` filters rolled rooms out of Angie's
  deck. The row is kept for history — only the staff rendering hides it.

### 2. Deep Clean wrong-staff-name (qa-triage §6 #48) — FIXED
`app/staff/task/[id]/page.tsx` `onToggleDeepClean` now stamps
`displayAssignee(task)` (the staff-directory name on the card) instead of the
logged-in account's `profile.display_name`. Root cause: the test/master-staff
accounts share Angie's `staff_id` but have different profile display names, so
the *logger's* name was showing instead of the housekeeper's. Now it always
reads the assigned housekeeper.

### 3. Daily reservation batch — 7-3 export processed
`docs/supabase/daily_batch_2026-07-03.sql` (also delivered in chat). 39
room-rows (24 active today + 15 future); expected buckets **departures 4 /
arrivals 12 / stayovers 8** plus the three standing cards. Big turnover day: Jim
Wedde's 4-room block (43/28/24/33) checks out and each room re-arrives.
Re-rooms handled: Betty Smith 39+37 → suite 43; Todd Madson 29 → 22; Carlene
Lodermeier 35 → 42 (old external_ids retire in Section 2).

> **DATE FLAG:** the CSV is the **7-3** export and the batch is written for a
> **7-3 run**, but the session wall-clock was **2026-07-05**. The batch is
> date-relative (keys off the DB `current_date`), so running the 7-3 file on a
> later day yields different buckets than the stated counts. If it's being run
> after 7-3, pull a fresh export for the actual run-day and mirror
> `daily_batch_2026-07-03.sql`.

**Files touched this session:**
`app/staff/task/[id]/DeparturesCard.tsx`, `app/staff/task/[id]/page.tsx`,
`app/staff/page.tsx`, `app/admin/page.tsx`, `lib/task-events.ts`,
`lib/staff-home-bucket.ts`, `app/globals.css`, `docs/STATE.md`, and NEW files
`components/admin/RolloverQuickAction.tsx`,
`components/admin/RolloverQuickAction.module.css`,
`docs/supabase/daily_batch_2026-07-03.sql`, `docs/Handoff 12.md`,
`docs/Next Session Kickoff 12.md`.

---

## How Bryan verifies (after pushing to `main`)

1. Push `dispatch-app` to `main` (Days 56 + 57 deploy together). Close the QA
   spreadsheet first so its temporary lock file isn't swept in:
   ```
   cd ~/dispatch-app
   git add -A
   git commit -m "Day 57 - Departures status model + admin Rollover; Deep Clean staff-name fix; (incl. Day 56 dead-button + quick-win batch)"
   git push origin main
   ```
2. **Departures card:** status chips are at the top; tap several → they stay lit,
   "Saving…" flashes. Setup + Room Spray are grouped lower down.
3. **Admin home:** a "ROLLOVER · DEPARTURES" card under the Daily Brief. Tap
   "Roll over" on a room → it leaves the list and no longer shows in Angie's
   buckets.
4. **Deep Clean:** complete a deep-clean item → "last done by" reads the assigned
   housekeeper, not the test account.
5. **Staff loop (from last session, still needs its live test):** open a card →
   button says **Complete** and completes → bounces to /staff; no Pause/Resume;
   open a card, hit ← back without finishing, reopen → still workable
   (auto-pause + resume-on-open).

---

## Open / immediate next steps

1. **Push to `main`** (still on Bryan — the sandbox can't push). Then Jennifer
   re-tests the loop incl. auto-pause-on-exit. Clears qa #1-12 + this session's
   #27-31 and #48.
2. **Stayover-type → checklist (qa §4 #35) — STILL BLOCKED.** Biggest logic gap.
   Needs the rule before code: what stayover types exist (light / full /
   linen-change / …), what selects one for a given room (night number? a cadence
   like every 3rd night? a reservation field?), and which checklist each type
   drives.
3. **Data pulls (qa §4 #32/#34) — small, actionable now.** #32: hide the
   "Incoming" column on a Departures card when no one arrives into that room
   today. #34: arrivals guest count / nights / return status aren't in the batch
   payload yet — add to the card context or the reservation payload.
4. **Dailys count (qa §2 #26) — needs a Jennifer clarification** on exactly
   what's wrong before changing the standard `done/length` math.
5. **Design "let's talk" (qa §5 #36-43)** — note-display redesign, combine
   Notes + Maintenance into one quick-add, maintenance-per-task, card-title
   hierarchy, and the color/"circus" softening (which includes the Departures
   status pill palette). Schedule a working session.
6. **Daily reservation batch — standing routine.** Hand a fresh chat
   `docs/reservation-batch-upload-guide.md` + the day's CSV; mirror the latest
   `docs/supabase/daily_batch_2026-07-03.sql`. Independent of the code work.

---

## Guardrails (from CLAUDE.md — do not violate)

Plain CSS only (no Tailwind/UI frameworks); no new dependencies without asking
Bryan; mobile-first (390px); show raw Supabase errors in a visible `.error`; no
emojis in UI/code; `context.staff_home_bucket` is required on task creation;
`task_events` is append-only with `schema_version: 1`; never touch ResNexus code
paths; the sandbox can't push (Bryan pushes from his Mac); Bryan is a
non-developer — plain-English summaries, copy-code boxes, no diffs.

## Fixed constants (daily batch)
Angie `staff_id` / `assignee_name`: `a0c1e000-0000-4000-8000-000000000001` /
`'Angie'`; Bryan admin `created_by_user_id`:
`380edc3d-ab42-4aed-aff7-940d9d6f8c2a`; standing card ids — SOD
`5da17000-0000-4000-8000-000000000001`, EOD
`e0d17000-0000-4000-8000-000000000001`, Property Round
`da11ca5e-0000-4000-8000-000000000001`. All generated cards: `source='pms'`,
`priority='medium'`, `status='open'`, `is_staff_report=false`.

## New this session (for the next chat's reference)
- task_event types: `departure_status_changed`, `departure_rolled_over`
  (additive; v1 payload unchanged).
- `tasks.context` keys on departure cards: `departure_status` (string[] of
  `open`/`stripped`/`odobanned`/`has_sheets`/`done`), `rolled_over` (bool).
