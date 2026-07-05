# Dispatch (Hospitality) — Next Session Kickoff 12

How to start the next Cowork session for the **core Dispatch hospitality
product** (the live beta at Forrest Inn, single housekeeper Angie). Dispatch OS
is a different project/session — don't touch it here.

---

## A. Access setup

1. Connect the folder **`~/dispatch-app`** (the live hotel beta). This is the
   only repo this session works in.
2. Have ready to upload: **the morning channel-manager CSV** (for that day's
   reservation batch). Nothing else is required to start.

## B. What's already in the repo to read (in order)

- `docs/STATE.md` — canonical product state (always read first; the Day 57
  "Last session close" entry is the most recent).
- `CLAUDE.md` — operating manual / guardrails.
- `docs/Handoff 12.md` — where the last session left off (read this).
- `docs/qa-status-2026-06-24.md` (+ `.xlsx`) — live QA punchlist status tracker.
  `docs/qa-triage-2026-06-04.md` is the underlying triage. NOTE: the tracker
  predates Day 57 — since it was written, **#27-31 (Departures status model) are
  DONE** and **#48 (Deep Clean wrong staff name) is FIXED**.
- `docs/reservation-batch-upload-guide.md` + the latest
  `docs/supabase/daily_batch_2026-07-03.sql` — the morning batch routine +
  most-recent worked example to mirror.

## C. Rules / guardrails (do not violate)

Plain CSS only (no Tailwind/UI frameworks); no new dependencies without asking
Bryan; mobile-first (390px viewport); show raw Supabase errors in a visible
`.error`; no emojis in UI or code; `context.staff_home_bucket` is required on
task creation; `task_events` is append-only with `schema_version: 1`; never
touch ResNexus code paths; **the sandbox can't push — Bryan pushes from his
Mac**; Bryan is a non-developer, so use plain-English summaries and copy-code
boxes, never diffs; propose a short plan before cutting code when a task touches
more than one file.

## D. First prompt to paste

> You're picking up the core Dispatch hospitality product. I've connected
> `~/dispatch-app` (the live beta — this is the only repo; ignore any Dispatch OS
> work). Read in order: `docs/STATE.md` (what the product is + the Day 57 close),
> `CLAUDE.md` (operating manual + guardrails), `docs/Handoff 12.md` (where the
> last session left off), and `docs/qa-status-2026-06-24.md` (the QA punchlist
> tracker — note #27-31 and #48 are now done/fixed per Handoff 12).
>
> Where we are: Day 57 built the Departures status model (multi-select chips at
> the top: Open → Stripped → Odobanned → Has Sheets → Done, no auto-default;
> Room Spray folded into a Setup group) + an admin-home Rollover quick action,
> and fixed the Deep Clean wrong-staff-name bug. All code-complete and
> typecheck-clean, shipping on my push to `main`.
>
> Where we're going: (1) confirm my push landed and Jennifer re-tested the loop
> incl. auto-pause-on-exit and the new Departures status + Rollover; (2) define
> the stayover-type → checklist rule and wire it (I'll bring the rule); (3) the
> small data pulls — hide "Incoming" on a Departures card when no arrival that
> day (#32), and add arrivals guest count / nights / return status (#34); (4)
> schedule the design "let's talk" pass (#36-43, incl. softening the status pill
> colors). Give me a short plan before cutting code.
>
> Guardrails: plain CSS only, no new deps, mobile-first, show raw Supabase
> errors, no emojis, `task_events` append-only with schema_version 1, you can't
> push (I push from my Mac), I'm non-technical so use plain English and
> copy-code boxes. At ~70% session capacity draft an updated handoff; tell me at
> ~80%.
>
> I'll also upload a fresh channel-manager CSV each morning — when I do, produce
> that day's reservation batch SQL by mirroring the latest
> `docs/supabase/daily_batch_*.sql` (confirm the run-date matches the export
> date, since the batch is date-relative).

## E. Reminders
- The Day 56 + Day 57 code only reaches Jennifer once `dispatch-app` is pushed
  to `main`. Do that first, then have her re-test — specifically the new
  Departures status chips, the admin Rollover, and (from Day 56) auto-pause on
  exit (open a card, leave without finishing, reopen → it should resume and be
  completable).
- Run the daily batch **before Angie clocks in**, and only on the day the export
  is for (it's date-relative).
