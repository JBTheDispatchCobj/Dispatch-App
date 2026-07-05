# QA Punchlist — Status 10

## What this spreadsheet is
`Dispatch QA (1).xlsx` is Jennifer's QA pass on the staff-facing Dispatch app at
Forrest Inn — ~100 issues she logged while testing as the housekeeper. Columns:
Priority (Top / Would Be Nice / Not Urgent), Location (which card), Section, and
the Issue.

**Note:** this file is identical to the earlier `Dispatch QA.xlsx` — same 103
items, zero added, zero removed. It is the same punchlist already triaged into
`docs/qa-triage-2026-06-04.md`. So "the giant gaps spreadsheet" and the punchlist
are one and the same; this doc is the current status against it.

## Why it matters
This is the beta gate. Jennifer (co-founder/operator) is the real-world tester;
until her staff can run a full shift cleanly, the hotel can't rely on the app.
Her single most important finding — "I cannot complete anything because of
current errors" — was blocking her from even validating most of the rest.

## The numbers
- **103 items total**: Top **68**, Would Be Nice **23**, Not Urgent **12**.
- By card: Stayovers 24, Departures 21, Start of Day 18, Arrivals 18, Dashboard
  14, Dailys 7, End of Day 1.

## Where we are

### ✅ Fixed this session (code complete — needs deploy)
The single root-cause bug behind the whole "nothing works" cluster: the dropped
`task_comments` table was still being written by `lib/orchestration/index.ts`
(`completeCard` + `requestHelp`), so every primary/help button aborted before
changing status. Removed the dead writes; typecheck clean.

This directly clears these punchlist items once `dispatch-app` is pushed to
`main` and Jennifer re-tests:
- Start of Day · Start Shift — "Button does not work"
- Start of Day · Need Help — "Button does not work"
- Departures · I'm Done / Need Help — "does not work"
- Stayovers · I'm Done / Need Help — "does not work"
- Arrivals · I'm Done / Need Help — "does not work"
- Dashboard · Clock-in/out — the **clock-OUT** half (EOD wrap)
- End of Day · All — was unreachable because cards couldn't complete; now reachable
- Dashboard · View — "completed section moves to bottom" — now testable

That's ~10 Top items resolved by one fix.

### ◻ Open, grouped (full detail in `docs/qa-triage-2026-06-04.md`)
- **Quick code wins (batchable):** hide empty sections (Notes/Updates/Last
  status), remove Pause/Resume (auto-pause on exit), rename "I'm Done" →
  "Complete", drop the "1 left for you"/"1 active" counters, remove
  time-next-to-status, section-header cleanups, count fixes.
- **Needs your decision, then code:** the Departures status model (Open →
  Stripped → Odobanned → Has Sheets → Done; no auto-default; status above guest
  details; fold room spray into "Setup"; add admin "Rollover").
- **Data / logic:** guest details / room type / nights not pulling on
  Departures/Stayovers/Arrivals (partly addressed by today's batch context —
  re-test); and the biggest logic gap — **stayover type not populating → wrong
  checklist** (needs the stayover-type rule defined).
- **Design — "let's talk":** note display redesign, combining Notes + Maintenance
  into one quick-add, maintenance tied to each task, card title hierarchy, colors
  ("circus"), font/glow inconsistencies.
- **Bigger / post-beta:** staff profiles, schedule + HK-level → primary/secondary
  assignment, building-placement assignment, admin departure-status table. (Deep
  Clean "wrong staff name" is a small bug worth doing early.)

### ⚠️ Not yet fixed (carry-over)
- The **same dropped-`task_comments` bug** still lives in
  `app/tasks/[id]/staff-card-detail.tsx` and `manager-card-detail.tsx`
  (admin/manager comment threads). Clean up in the same pass.
- **Clock-IN** itself (separate from the fixed clock-out): code looks correct; if
  it still fails for Angie, verify her `profiles.staff_id` links to the Angie
  `staff` row.

## Immediate next move
Push `dispatch-app` to `main` → Jennifer re-tests the full loop → that confirms
the ~10 fixed items and unblocks her to validate the rest. Then run the quick-win
batch and get your sign-off on the departure status model.
