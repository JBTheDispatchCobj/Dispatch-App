# Dispatch (Hospitality) — Handoff 10

Scope: the **core Dispatch hospitality product** (the live beta at Forrest Inn,
single housekeeper Angie). Dispatch OS is a separate project handled in another
session — out of scope here.

Read order for a fresh session: `docs/STATE.md` → `CLAUDE.md` →
`docs/qa-triage-2026-06-04.md` → this file.

---

## What this session did (hospitality)

**1. Daily reservation batch routine (ships Angie's cards each morning).**
- Built and verified `docs/supabase/daily_batch_2026-06-02.sql` (file-series
  only — superseded) and `docs/supabase/daily_batch_2026-06-04.sql` (**the one
  run live**). 6-4 verification: arrivals 3 / departures 4 / stayovers 8 + the
  three standing cards (SOD / Dailys / EOD).
- Pattern docs unchanged: `docs/reservation-batch-upload-guide.md`; gold-standard
  example `docs/supabase/daily_batch_2026-05-22.sql`. Mirror its structure; only
  Section 1 VALUES + Section 2 keep-list change per day. Run on the day the CSV
  represents (date-relative to `current_date`).

**2. Jennifer's QA punchlist triaged.** Her "Dispatch QA.xlsx" (~100 items) →
`docs/qa-triage-2026-06-04.md`, grouped into: the root-cause fix (below), quick
wins, the departure status-model change (needs her sign-off), data/stayover-type
gaps, design items flagged "let's talk," and bigger post-beta features.

**3. ROOT-CAUSE FIX — app-wide dead buttons.** The biggest cluster of "Top"
items (Start Shift / Need Help / I'm Done dead on every card, clock-out not
working, EOD unreachable) was ONE bug: `public.task_comments` was dropped Day 51,
but `lib/orchestration/index.ts` still inserted into it inside `completeCard()`
and `requestHelp()` — the insert errored and the button aborted before changing
status. **Fixed** by removing the dead breadcrumb writes (task_events already
record the action). Typecheck passes. **This is a code change, NOT SQL — it goes
live on the next push of `dispatch-app` to `main` (Bryan pushes from his Mac;
the sandbox can't push).** After deploy, Jennifer re-tests the full loop.

---

## Open / immediate next steps

1. **Push `dispatch-app` to `main`** so the button fix deploys; have Jennifer
   re-test: open card → primary button completes → bounces back; EOD wrap clocks
   her out.
2. **New "giant gaps spreadsheet" incoming** — Bryan is uploading an updated/
   larger gaps list. Triage it against `docs/qa-triage-2026-06-04.md` (some items
   may already be covered or fixed) and produce a merged, deduped status.
3. **Latent sibling bug (not yet fixed):** the same dropped-`task_comments` write
   still exists in `app/tasks/[id]/staff-card-detail.tsx` and
   `manager-card-detail.tsx` (admin/manager comment threads). Clean up in the
   same pass.
4. **Quick-win batch** (qa-triage §2): hide empty sections, remove Pause/Resume
   (auto-pause on exit), rename "I'm Done" → "Complete", drop the "1 left for
   you" counters, remove time-next-to-status, etc.
5. **Departure status model** (qa-triage §3): Open → Stripped → Odobanned → Has
   Sheets → Done, no auto-default, status above guest details, fold room spray
   into "Setup," add admin "Rollover." Needs Jennifer's confirmation, then build.
6. **Stayover-type → checklist** (qa-triage §4): the biggest logic gap — define
   the rule that sets stayover type, which drives the correct checklist.
7. **Clock-IN** (separate from the fixed clock-out): code looks correct; if it
   still misbehaves for Angie, check her `profiles.staff_id` links to the Angie
   `staff` row (`a0c1e000-0000-4000-8000-000000000001`).

---

## Guardrails (from CLAUDE.md — do not violate)

Plain CSS only (no Tailwind/UI frameworks); no new dependencies without asking
Bryan; mobile-first (390px); show raw Supabase errors in a visible `.error`; no
emojis in UI/code; `context.staff_home_bucket` is required on task creation;
`task_events` is append-only with `schema_version: 1`; never touch ResNexus code
paths; the sandbox can't push (Bryan pushes from his Mac); Bryan is a
non-developer — plain-English summaries, copy-code boxes when he asks, no diffs.

## Fixed constants (daily batch)
Angie `staff_id` `a0c1e000-0000-4000-8000-000000000001` / `'Angie'`; Bryan admin
`created_by_user_id` `380edc3d-ab42-4aed-aff7-940d9d6f8c2a`; standing card ids —
SOD `5da17000-…-0001`, EOD `e0d17000-…-0001`, Property Round `da11ca5e-…-0001`.
All generated cards: `source='pms'`, `priority='medium'`, `status='open'`,
`is_staff_report=false`.
