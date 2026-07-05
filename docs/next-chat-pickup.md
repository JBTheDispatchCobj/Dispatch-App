# Next-chat pickup — 2026-05-28

What this is: a short bridge so a fresh chat can step into Bryan's daily-batch
routine without re-deriving anything. Read `docs/STATE.md` and
`docs/reservation-batch-upload-guide.md` first; this file just calls out what's
open as of 2026-05-28. (This is a single rotating file, not a series — it gets
overwritten each time it's refreshed. Do NOT recreate the deleted Day-X handoff
history.)

## Where things stand

The daily reservation batch is now a **standing operational routine**, not a
feature being built. Each morning Bryan exports the channel-manager CSV from
ResNexus and a fresh chat turns it into one paste-ready Supabase SQL batch that
reconciles the day's reservations and rebuilds Angie's housekeeping cards. The
pattern is fully documented in `docs/reservation-batch-upload-guide.md`, and
the gold-standard worked example is `docs/supabase/daily_batch_2026-05-22.sql`.
Mirror its structure exactly — only Section 1 VALUES and Section 2 keep-list
change between days; Sections 3 and 4 are date-relative and verbatim.

Runs to date (all verified, all live in production):

- `daily_batch_2026-05-22.sql` — ran clean on 5-22.
- `daily_batch_2026-05-25.sql` — ran clean on 5-25. Verification: arrivals 3,
  departures 6, stayovers 2, plus the three standing cards.
- `daily_batch_2026-05-26.sql` — ran clean on 5-26. Verification: arrivals 3,
  departures 1, stayovers 4, plus the three standing cards.

`daily_batch_2026-05-24.sql` exists in the series but was **not run** — the
5-25 batch superseded it because the SQL is date-relative to `current_date`.

## Open items for the next chat

**(1) Catch up on 5-27 and 5-28.** Bryan asked for the SQL for two days he
hadn't fed in yet — 5-27 and 5-28 — but the CSVs weren't attached before this
chat closed. First move: ask him to upload both files. Produce both batches.
Only the 5-28 one should be run today; the 5-27 one is for the file series but
running it today would build today's cards against yesterday's reservation list
(wrong) before 5-28 would overwrite it. The 5-28 batch already contains every
5-27 reservation plus that day's changes, so nothing is lost.

**(2) Mary Charmoli (Res# 67345) — verify before June 1.** A $2,800 two-month
booking that changes rooms mid-stay: room 21 from 6/1 (with a 6/19→6/21 gap),
then room 23 from 7/6 to 7/30. The 5-26 batch stored her as two reservation
rows (`rx-67345-21` and `rx-67345-23`) so she is preserved on the backend and
arrives correctly into room 21 on 6/1. The full original rooms string is in
`raw_payload.rooms_full` for both rows. She generates no card before June, but
the room change + gap is unusual enough that Bryan should eye it. If it needs
adjusting, ask him before 6/1.

**(3) Channel-manager "block" rows.** Two `$0.00` multi-room block rows have
shown up in exports so far — Res# `67676` "Rolled Over From Yesterday" on 5-24
(8 rooms blocked because Angie was out), and Res# `67730` on 5-26 (5 rooms
rolled because Mylie was off). Standing rule: these are blocks, not guest
stays, and are **excluded entirely** from the reservations upsert. The upload
guide covers this implicitly ("blocks never become cards"); if the pattern
recurs, consider adding a one-liner formalizing the heuristic ("$0 totals +
'Rolled Over' or generic guest name = block, skip it").

**(4) Multi-room single-reservation rows.** Dina Bukachek's two-room booking
(rooms 22 + 24, Res# 67057) is consistently split into two reservation rows
(`rx-67057-22`, `rx-67057-24`) so each room can card independently. Same
approach used for Mary Charmoli. The upload guide could codify this if it
hasn't already.

**(5) Uncommitted/unpushed work on Bryan's Mac.** As of 2026-05-28, the
following are uncommitted in `dispatch-app`: the four `daily_batch_*.sql` files
(5-22, 5-24, 5-25, 5-26), `docs/reservation-batch-upload-guide.md`, the Day-56
edits to `docs/STATE.md`, and this file. Bryan pushes from his Mac when
convenient — the sandbox can't push (403 proxy).

## How to do the morning batch (TL;DR for the next chat)

1. Read `docs/STATE.md` (per CLAUDE.md, always step 1).
2. Read `docs/reservation-batch-upload-guide.md`.
3. Ask Bryan to upload the day's CSV.
4. Mirror `docs/supabase/daily_batch_2026-05-22.sql` exactly. Only Section 1's
   VALUES rows and Section 2's keep-list change.
5. Verify programmatically before delivering: row count, no duplicate
   `external_id`s, keep-list set == Section 1 set, balanced parens, and predict
   the bucket counts via date math on `current_date`.
6. Save the file to `docs/supabase/daily_batch_<YYYY-MM-DD>.sql`, present it,
   AND give Bryan the SQL in a copy code box in chat (he prefers copy boxes).
7. State expected verification counts; Bryan pastes them back to confirm.

## Standing facts the next chat should know

- Hotel today is single-housekeeper beta (Angie). Other staff exist (Courtney,
  Mylie) but cards always assign to Angie.
- Fixed constants: Angie `staff_id` `a0c1e000-0000-4000-8000-000000000001`,
  Bryan admin `created_by_user_id` `380edc3d-ab42-4aed-aff7-940d9d6f8c2a`.
  Standing card ids — SOD `5da17000-0000-4000-8000-000000000001`, EOD
  `e0d17000-0000-4000-8000-000000000001`, Property Round
  `da11ca5e-0000-4000-8000-000000000001`. All generated cards: `source='pms'`,
  `priority='medium'`, `status='open'`, `is_staff_report=false`.
- Sandbox cannot push to git (proxy 403). Bryan pushes from his Mac.
- Bryan is non-developer. Plain English summaries, copy code boxes when asked,
  no diffs or stack traces.
- Safety the batch already guarantees: manual cards (`source='manual'`) are
  never deleted; cards carrying open maintenance issues are spared from the
  daily rebuild; Deep Clean history uses `on delete set null` so the monthly
  rotation survives card rebuilds.
