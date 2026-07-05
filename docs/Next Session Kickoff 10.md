# Dispatch (Hospitality) — Next Session Kickoff 10

How to start the next Cowork session for the **core Dispatch hospitality
product**. (Dispatch OS is a different project/session — don't touch it here.)

---

## A. Access setup

1. Connect the folder **`~/dispatch-app`** (the live hotel beta). This is the
   only repo this session works in.
2. Have ready to upload: **the new "giant gaps" spreadsheet** (and any morning
   channel-manager CSV if you want that day's batch).

## B. What's already in the repo for the session to read
- `docs/STATE.md` — canonical product state (always read first).
- `CLAUDE.md` — operating manual / guardrails.
- `docs/Handoff 10.md` — where this session left off (read this).
- `docs/qa-triage-2026-06-04.md` — Jennifer's QA punchlist, already triaged.
- `docs/reservation-batch-upload-guide.md` + `docs/supabase/daily_batch_2026-05-22.sql`
  — the morning batch routine + gold-standard example.

## C. First prompt to paste

> You're picking up the core Dispatch hospitality product. I've connected
> `~/dispatch-app` (the live beta — this is the only repo; ignore any Dispatch OS
> work). Read in order: `docs/STATE.md`, `CLAUDE.md`, `docs/Handoff 10.md`, and
> `docs/qa-triage-2026-06-04.md`.
>
> Context you need: last session found and fixed the app-wide dead-button bug
> (the dropped `task_comments` table was still being written by
> `lib/orchestration/index.ts`); that fix needs me to push `main` to deploy. The
> daily reservation batch routine is current through `daily_batch_2026-06-04.sql`.
>
> I'm uploading a large "gaps" spreadsheet. Please: (1) read it, (2) reconcile it
> against `docs/qa-triage-2026-06-04.md` — flag which gaps are already fixed,
> already triaged, or new — and (3) give me a single merged, deduped, priority-
> ordered status of where we are, separating quick code wins from items that need
> my decision (e.g., the departure status model) or design discussion. Don't
> start coding until we agree the plan.
>
> Guardrails: plain CSS only, no new deps, mobile-first, show raw Supabase
> errors, no emojis, `task_events` append-only with schema_version 1, you can't
> push (I push from my Mac), I'm non-technical so use plain English and copy-code
> boxes. At ~70% session capacity draft an updated handoff; tell me at ~80%.

## D. Reminder
The button fix from last session only reaches Jennifer once `dispatch-app` is
pushed to `main`. Do that before asking her to re-test.
