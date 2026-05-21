# Dispatch — Handoff to a fresh chat (Day 55 close, 2026-05-21)

> **You are picking up a live product mid-flight. Read this whole doc first, then `docs/STATE.md`, then `CLAUDE.md`.** This file is the bridge between the chat that did the Day 55 work (login fix + Notification Center port + Deep Clean + beta data load) and the new chat that takes beta over the finish line. It is deliberately self-contained — you should not need the prior thread.

---

## 0. First actions for the new chat

1. Read this file top to bottom.
2. Read `docs/STATE.md` (canonical product state — its "next chases" section is stale at Day 52; the live remaining work is **Section 3 below** and the Day 55 close entry in STATE.md).
3. Read `CLAUDE.md` (operating manual — RLS rules, two-commit pattern, working style with Bryan).
4. Confirm today's date with `date` in bash. **Beta is live/imminent — treat it as the priority.**
5. Do NOT start cutting code until you've confirmed with Bryan which remaining item he wants next.

---

## 1. Where things stand in one paragraph

Day 54 was a UI redesign pass; Day 55 closed the three beta blockers that were still open at that handoff. **(1) The mobile staff-login bug is fixed** — login was switched from magic-link to email OTP code (`app/login/page.tsx`). **(2) The Admin Notification Center is fully ported** to product code — it replaced the old Watchlist / Scheduling / Critical / Notes / Activity-Feed lanes on the admin home (the Daily Brief stays). **(3) Deep Clean** got its per-departures-card tray with a rolling 30-day clock, check/uncheck toggle, RLS, and a system push of overdue items into the NC. On the data side, the real Forrest Inn beta state is loaded: 21 ResNexus reservations imported, the 4 demo staff + demo cards wiped, the real roster set, and today's 12 reservation cards + fixed daily cards generated and assigned to Angie. **What remains is operational, not code:** Bryan runs one data-only SQL in Supabase, pushes the committed code from his Mac, the three new users log in once, and then an iPad UI check.

---

## 2. Git state (verified 2026-05-21, Day 55 close)

- **Branch:** `main`.
- **Local HEAD:** the docs/handoff commit, sitting on top of the latest work commit `d921d32` (beta_reset guest context + CSV rules doc).
- **PUSH STILL PENDING FROM BRYAN'S MAC.** The sandbox cannot push (proxy 403), so Bryan pushes. **First-action check for the new chat:** run `git log --oneline origin/main..HEAD` — anything listed has NOT reached Vercel yet. Ask Bryan to `git push origin main` from his Mac if so. Vercel auto-deploys on push.
- **Two-commit pattern (follow it):** commit the actual change first, then a second commit that writes that first commit's SHA into STATE.md's closure ledger. Never `git push --force` to main.
- **SQL files are NOT deployed via git.** Everything under `docs/supabase/*.sql` is applied by Bryan in the Supabase dashboard SQL editor. Committing them only versions them; it does not change the live DB.

---

## 3. Remaining work — beta finish line

### CODE — done this session, committed locally (confirm pushed)
1. **Staff login → email OTP code** (`app/login/page.tsx`). Two-step: enter email → `signInWithOtp`, then enter the code → `verifyOtp({ type: 'email' })`. Supabase emails an 8-digit code (the template/length is configurable in the Supabase dashboard); the input is length-flexible so a 6- or 8-digit code both work. This replaced the magic-link flow that was bouncing staff to the admin home on iOS.
2. **Admin Notification Center** — ported in five regions. Component `components/admin/NotificationCenter.tsx` (+ `.module.css`); data in `lib/notification-center.ts`; searchable activity archive in `lib/notification-archive.ts` + route `app/admin/notifications/page.tsx`; `lib/activity-feed.ts` gained `related_card_type`. Mounted on the admin home under the Daily Brief; the old five lanes are retired. Masters: **Incoming / System / Outgoing / Maintenance.** **System = exceptions only** (orchestration hiccups needing admin intervention — `getActivityFeed` filtered to critical/warn task_events — NOT a raw firehose). **Outgoing = Scheduled only** (not a combined history+scheduled). The full activity log folds into the searchable View-all route.
3. **Deep Clean** — `lib/deep-clean.ts` (7 items + KB text, `DEEP_CLEAN_CYCLE_DAYS = 30`, get/log/unlog/overdue). UI is a collapsible tray on every Departures card (`app/staff/task/[id]/DeparturesCard.tsx`) matching the D-430 artifact (collapsible exrow + "Log New Issue" drawer that reuses the note-modal chrome). Check is a check/uncheck toggle, no "Due" badge. Overdue items push into the NC System tile. Needs the `deep_clean_history` table + its 4 RLS policies (already applied in Supabase per Bryan's confirmation: `deep_clean_history_select/insert/update/delete`).

### DATA — Bryan must run one SQL in Supabase (data-only, no deploy)
4. **Regenerate the 12 reservation cards WITH guest context.** The seeded cards originally carried only `{"staff_home_bucket":"..."}`, so the staff-home expansion rows showed "Room N / —" (no guest). `buildRowContent` in `app/staff/page.tsx` reads the guest from `context.outgoing_guest.name` (departures), `context.current_guest.name` (stayovers), `context.incoming_guest.name` (arrivals) — NOT from `task.title`. The committed `docs/supabase/beta_reset_2026-05-21.sql` (section 4) now builds that context via `jsonb_build_object`, pulling `name`, `room_type` (parsed from `raw_payload->>'rooms'` with `substring(... from '^[0-9]+\s+(.+?)\s*:')`), and bucket extras (clean_type / checkin_time / night_n+total_nights). **A standalone regenerate block that only touches the 12 reservation cards (leaving SOD/EOD/Dailys intact) was given to Bryan in chat** — if he hasn't run it, re-derive it from beta_reset section 4 (delete `where source='pms' and card_type in ('housekeeping_turn','arrival','stayover')`, then the section-4 INSERT...SELECT). Verify: expand Stayovers on staff home → rows read "Room 33 · Queen / Jerrett Haag / Night N / M".

### OPERATIONAL — onboarding the 3 new users
5. **Jennifer / Courtney / Angie first login.** A magic-link/OTP login creates their `auth.users` row + a default `'manager'` profile. **After each logs in once, re-run section 5 of `beta_reset_2026-05-21.sql`** to set roles: Jennifer + Courtney → `admin`; Angie → `staff` with `staff_id = a0c1e000-0000-4000-8000-000000000001` (the single beta housekeeper row). Safe to run anytime (0 rows until they exist).
6. **iPad UI check (Jennifer).** She'll log in from an iPad. Verify the admin home (Daily Brief + Notification Center) renders correctly at tablet width — the app is mobile-first (~390px) so the wider viewport is worth a pass.

---

## 4. Beta roster + key IDs (source of truth)

From `docs/supabase/beta_reset_2026-05-21.sql`:
- **Bryan** — master admin — `bryan@auricworks.dev` — profile id `380edc3d-ab42-4aed-aff7-940d9d6f8c2a`
- **Bryan** — master staff (tests the staff view as Angie) — `bjstauder@gmail.com` — profile id `0ea88f3c-f25b-4147-b2ad-a7e113bd7cc1`, `staff_id` → Angie
- **Jennifer** — admin — `jennifer@auricworks.dev`
- **Courtney** — admin — `forrestinnmotel@gmail.com`
- **Angie** — **staff** (single beta housekeeper) — `forrestinnlogins@gmail.com` — `staff_id a0c1e000-0000-4000-8000-000000000001`

Today's buckets (2026-05-21): **1 arrival · 4 departures · 7 stayovers = 12 reservation cards**, plus fixed daily cards (Start of Day, Wrap Shift, Property Round with a 6-item checklist). All assigned to Angie.

The two SQL files that build beta state, in run order:
1. `docs/supabase/reservations_br1.sql` (table) → `reservations_import_2026-05-21.sql` (21 ResNexus rows, idempotent upsert on `external_id = rx-<Res#>-<room>`).
2. `docs/supabase/beta_reset_2026-05-21.sql` (one idempotent script: Angie staff row → wipe 4 demo staff → Bryan profiles → 12 reservation cards + fixed daily cards → post-login roles for Jennifer/Courtney/Angie).

CSV interpretation rules (authoritative, encodes Bryan's business decisions): `docs/csv-import-interpretation.md`.

---

## 5. Operating conventions the new chat MUST follow (from CLAUDE.md)

- **Bryan is not a developer.** Explain in plain English: what changed, which files, how to verify from the UI (click here → expect this). Never make him read diffs or stack traces. When he needs to run SQL, give it in a copy-paste code block.
- **Beta scope is locked** — create/assign/execute tasks across six buckets, OTP auth, `task_events` append-only audit (`schema_version: 1`), deployed mobile-first. Nothing outside this for beta.
- **Plain CSS only** (no Tailwind/shadcn/MUI). **No new dependencies** without asking. **TypeScript strict, no `any`.** **No tests/CI/linting** unless asked. **No emojis** in code or UI.
- **RLS:** never query `profiles` inside a `profiles` policy directly — go through `auth_profile_role()`. Staff-editable task fields are guarded by both RLS and the `tasks_staff_field_guard()` trigger; if you add a manager-only field, update both.
- **Two-commit pattern** for every chase (work commit → STATE.md SHA backfill). Update STATE.md's closure ledger inline; don't recreate the deleted daily handoff narrative. Don't delete anything in `docs/` without asking.
- **Cadence:** Bryan likes work shipped in coherent "regions" of related changes, then a push — not 100 things at once, not one thing at a time.

---

## 6. Carry-forward / still-pending Bryan KB items (not beta blockers)

These are content-pending, authored by Jennifer, not engineering blockers (full detail in STATE.md "Recommended next chases"):
- **VI.E variant checklists** (Sheet Change / Pet / VIP / Long-term).
- **VI.G per-task time estimates.**
- **Q21 maintenance cascade tree** (per-Location → Item-set → Type-set).

Multi-tenancy: the schema is single-tenant today (no `organization_id`/`hotel_id`). That's the architectural chase that gates expansion past hotel #1 — out of beta scope, tracked for later.

---

## 7. Exact message to paste into the new chat

> Read `docs/HANDOFF.md` first, then `docs/STATE.md` and `CLAUDE.md`. We're at Day 55 close — beta data is loaded and the login/Notification-Center/Deep-Clean blockers are done. First: tell me if anything is unpushed (`git log origin/main..HEAD`) so I can push from my Mac. Remaining is mostly operational — the guest-context card SQL, the three new-user logins + re-run of beta_reset section 5, and an iPad UI check.
