# Dispatch — Handoff to a fresh chat (Day 54 close, 2026-05-21)

> **You are picking up a live product mid-flight. Read this whole doc first, then `docs/STATE.md`, then `CLAUDE.md`.** This file is the bridge between the chat that did the Day 54 UI redesign work and the new chat that has to finish it. It is deliberately self-contained — you should not need the prior thread.

---

## 0. First actions for the new chat

1. Read this file top to bottom.
2. Read `docs/STATE.md` (canonical product state — note its "next chases" section is stale at Day 52; the UI redesign queue in **Section 3 below** is the live one).
3. Read `CLAUDE.md` (operating manual — RLS rules, two-commit pattern, working style with Bryan).
4. Confirm today's date with `date` in bash. Beta launch was targeted for ~2026-05-19; Bryan will tell you the real go date. **Treat beta as imminent — prioritize accordingly.**
5. Do NOT start cutting code until you've confirmed with Bryan which item from Section 3 he wants next.

---

## 1. Where things stand in one paragraph

The Day 54 work is a UI redesign pass across the staff home and the admin home, plus beta launch prep. Three UI surfaces are **done, committed, and pushed** to `origin/main`. A fourth (admin Notification Center) is **designed and locked as an HTML mockup but NOT yet ported to product code**. There is **one known beta-blocking bug**: staff users logging in on mobile land on the admin home instead of `/staff`. Beta setup (4 users, custom SMTP, rate limits, JWT expiry, ResNexus data seed) is partially done. The remaining UI items (Bryan's "10-item list", ~3–4 done) need to be confirmed with him — see Section 3.

---

## 2. Git state (verified 2026-05-21)

- **Branch:** `main`. All code commits through Day 54 chase #6 are **already pushed** — `origin/main..HEAD` is empty.
- **Uncommitted (written to disk, NOT yet committed — a stuck `.git/index.lock` blocked the commit in the prior sandbox session; commit these as a first action):**
  - `design/admin-home-locked.html`
  - `design/admin-notification-center-v2.html`
  - `design/admin-notification-center.html`
  - `docs/HANDOFF.md` (this file)
  - `docs/STATE.md` (added the handoff pointer near the top)
  - **To recover if the lock is still present:** `rm -f .git/index.lock` then `git add` + `git commit` + `git push origin main`. If `rm` fails with "Operation not permitted", the sandbox is holding the lock — a fresh session clears it.
- **Last 6 commits (Day 54):** each chase shipped with the **two-commit pattern** — a work commit, then a `STATE.md SHA backfill` commit recording the work commit's SHA. Recent SHAs: `7db9d26` (chase #6 work), `d7e7b66` (chase #5), `447b1a3` (chase #3), `21020e3` (chase #2), `d042307` (chase #1).

**The two-commit pattern (follow it):** commit the actual change first, then make a second commit that writes that first commit's SHA into STATE.md's closure ledger. Bryan confirms each ship with a bash block. Never `git push --force` to main.

---

## 3. UI redesign chase queue — the "10-item list"

### DONE — committed and pushed
1. **Staff home stacked-deck redesign** (chases #1–3). Rewrote `app/staff/page.tsx` into a six-bucket card deck in time-arc order (SOD → Departures → Stayovers → Arrivals → Dailys → EOD). Swapped the bucket palette in `app/globals.css` (six neon palettes). Three render modes: direct-link buckets (`sod`, `e`), preview-expand bucket (`da` = Dailys, expands to show checklist but does not open a full card), multi-task buckets. Added an all-buckets-done clock-out gate in `lib/clock-in.ts` (`canWrapShift` + `selfOpenCount`) with gate UI in `app/staff/task/[id]/EODCard.tsx`.
2. **Admin Activity Feed redesign** (chases #4–5). Rebuilt `components/admin/ActivityFeed.tsx` with category grouping (Management / Housekeeping / Maintenance), per-staff sub-rows, severity-boost ordering. Mockup: `design/admin-activity-redesign.html`. **Note:** the first attempt used a from-scratch design; Bryan rejected it ("Get rid of your design") and the locked visual vocabulary is the **D-430 maintenance pill-box style**. Match that, not anything invented.
3. **Admin Daily Brief 2×3 grid** (chase #6). `app/admin/page.tsx` renders a six-tile brief; data helpers stubbed in `lib/admin-brief.ts` (`getOnShiftCount`, `getCurrentWeather`, `getTownEventsToday`). Added placeholder route `app/admin/table/page.tsx`. Mockup: `design/admin-daily-brief-redesign.html`.

### LOCKED but NOT shipped — next code chase
4. **Admin Notification Center.** Design is final and locked in `design/admin-notification-center-v2.html`. **No code exists yet** — there is no `NotificationCenter` component in `app/`, `components/`, or `lib/` (verified by grep). This is the highest-priority remaining UI port. Locked spec from the mockup:
   - **4 master tiles**, each opening to sub-tiles:
     - **Incoming (3 sub-tiles):** Admin · Guest · Supply
     - **System (3):** Employee · Schedule · Today
     - **Outgoing (2):** History · Scheduled
     - **Maintenance (2):** Outgoing · Incoming
   - Expanded item view uses the **D-430 maintenance pill-box visual style**.
   - Sub-category labels (Admin / Guest / Supply) are **white, not muted** (explicit Bryan call).
   - Item headers (e.g. "Pet allergy — Incoming R28") are the **larger header size**, not body text.
   - `design/admin-home-locked.html` is the composite that combines the Daily Brief + Notification Center as they should sit together on the admin home.

### REMAINING — NEEDS BRYAN TO CONFIRM
Bryan referenced a ~10-item UI list and estimated ~3 done. Items 1–3 above are the confirmed-done surfaces; #4 is locked-not-shipped. **Items 5–10 are not yet captured in writing.** New chat: ask Bryan to enumerate the rest before planning, and record them here so this doc stays the single source of truth. Likely candidates to probe (admin surfaces that exist but may be slated for the same redesign pass): `/admin/tasks`, `/admin/staff`, `/admin/maintenance`, `/admin/reports`, manager card view `/tasks/[id]`. **Do not assume — confirm.**

---

## 4. Live artifacts (locked HTML mockups) — inventory

All in `design/`. These are the "live artifacts" Bryan reviews and locks before any code is written. Status = whether the design has been ported into product code.

| File | Surface | Status |
|---|---|---|
| `staff-home-stacked-buckets.html` | Staff home six-bucket deck | PORTED (chases #1–3) |
| `admin-activity-redesign.html` | Admin activity feed | PORTED (chase #5) |
| `admin-daily-brief-redesign.html` | Admin Daily Brief 2×3 grid | PORTED (chase #6) |
| `admin-notification-center.html` | Notification Center (earlier option) | superseded by v2 |
| `admin-notification-center-v2.html` | Notification Center (LOCKED design) | **NOT ported — next chase** |
| `admin-home-locked.html` | Admin home composite (Brief + Notification Center) | reference for assembly |

**Workflow reminder:** Bryan locks a mockup ("Stamp it" / "love it"), then you port it to product code, then ship via the two-commit pattern. Build the mockup with plain HTML/CSS only (no frameworks) — it must mirror the real `globals.css` design tokens.

---

## 5. Known bug — mobile staff login lands on admin home (BETA BLOCKER)

**Symptom:** Bryan submits `bjstauder@gmail.com` (his "Lizzie" staff test account) on the login form on iOS (Safari and Chrome). The magic link arrives; clicking it opens the **admin** home, not `/staff`. Admin login on the same devices works fine.

**Routing logic (verified):**
- `app/auth/callback/route.ts` exchanges the magic-link code for a session, then redirects to `/`.
- `app/page.tsx` (root) then runs: `const dest = result.profile.role === "admin" ? "/admin" : "/staff";` — so `staff` and `manager` both go to `/staff`; only `admin` goes to `/admin`.
- `app/admin/page.tsx` redirects any non-admin role from `/admin` back to `/`.
- `app/login/page.tsx` uses `shouldUseManagerHome(profile)` (true for admin/manager) to route — **inconsistent with `app/page.tsx`'s simpler `role === "admin"` check.**

**Most likely root cause:** the `profiles.role` for `bjstauder@gmail.com` is `'admin'` (or was set wrong), not `'staff'`. The `profiles.role` default is `'manager'` — and a manager would route to `/staff`, NOT `/admin` — so landing on `/admin` means the row is explicitly `admin`. This is almost certainly a **data problem, not a code problem.**

**Diagnostic SQL (run in Supabase SQL editor, paste the output):**
```sql
SELECT u.email, u.id AS auth_user_id, p.role, p.staff_id, p.display_name, s.name AS staff_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.staff s ON s.id = p.staff_id
WHERE u.email IN (
  'bryan@auricworks.dev', 'bjstauder@gmail.com',
  'jennifer@auricworks.dev', 'forrestinnmotel@gmail.com', 'forrestinnlogins@gmail.com'
)
ORDER BY u.email;
```

**Fix paths by outcome:**
- If `bjstauder@gmail.com` role is `admin`/`manager` → `UPDATE public.profiles SET role='staff', staff_id='<lizzie-staff-uuid>' WHERE id='<auth_user_id>';` Done, no code change.
- If role is already `staff` → real iOS session/cookie bug. Ship a `/whoami` debug page (dump `auth.getSession()` user + fetched profile.role) so Bryan can verify on the phone what session the browser carries, then chase from there. Also harmonize `app/page.tsx` to use `shouldUseManagerHome()` like `app/login/page.tsx` does, for consistency.
- If no profile row → insert one with the correct id/role/staff_id.

**Status:** diagnosis complete; waiting on Bryan to run the SQL. This was paused at his request to handle the demo-diligence questions and this handoff.

---

## 6. Beta launch checklist

Four users for the Forrest Inn beta:
- Bryan — admin — `bryan@auricworks.dev`
- Jennifer — admin — `jennifer@auricworks.dev`
- Courtney — admin — `forrestinnmotel@gmail.com`
- Angie — **staff** (the single beta staffer) — `forrestinnlogins@gmail.com`
- (Bryan's `bjstauder@gmail.com` = "Lizzie" staff test account, used to dodge magic-link rate limits during testing.)

Setup state (confirm each with Bryan — some done in the prior thread):
- **Custom SMTP** via Resend on `thedispatchco.com` domain — DNS configured at Namecheap. *(An API key was leaked in chat and has been revoked + regenerated — do not echo secrets.)*
- **Supabase auth rate limits** — bumped (confirm values).
- **JWT expiry** — set to 7 days.
- **Demo data seed:** `docs/supabase/seed_lizzie_demo_tasks.sql` — 18 tasks across all six buckets + 6 Dailys checklist items + 15 reservations. Idempotent. Apply via Supabase dashboard SQL editor.
- **ResNexus data:** daily CSV export → SQL seed pipeline is manual today. Group bookings (same reservation ID across multiple rooms, e.g. a wedding block) are the non-trivial shape — each room is treated as its own card even when the booking name is identical. Notes are priority IF present but uncommon. There is one staffer (Angie) so the split rule resolves to her. Schema reference: `docs/kb/channel-manager-data-shape.csv`.

---

## 7. Operating conventions the new chat MUST follow (from CLAUDE.md)

- **Bryan is not a developer.** Explain in plain English: what changed, which files, how to verify from the UI (click here → expect this). Never make him read diffs or stack traces.
- **Beta scope is locked** — create/assign/execute tasks across six buckets, magic-link auth, `task_events` append-only audit (`schema_version: 1`), deployed mobile-first. Don't add anything outside this for beta.
- **Plain CSS only** (no Tailwind/shadcn/MUI). **No new dependencies** without asking. **TypeScript strict, no `any`.** **No tests/CI/linting** unless asked. **No emojis** in code or UI.
- **RLS:** never query `profiles` inside a `profiles` policy directly — go through `auth_profile_role()`. Staff-editable task fields are guarded by both RLS and the `tasks_staff_field_guard()` trigger; if you add a manager-only field, update both.
- **Two-commit pattern** for every chase (work commit → STATE.md SHA backfill). Update STATE.md's closure ledger inline; don't recreate daily handoff narrative. Don't delete anything in `docs/` without asking.

---

## 8. Demo-diligence Q&A (advisor review)

An advisor ("demo guy") sent 15 diligence questions covering environments, source control, multi-tenant data model, security audit, test coverage, docs, OKRs, pricing, beta duration, onboarding, and vendor data automation. Full verbatim Q&A was answered in the prior thread. **The single biggest takeaway: the schema is single-tenant today (no `organization_id`/`hotel_id` anywhere) — the multi-tenant migration is the architectural chase that gates expansion past hotel #1.** If Bryan wants this formalized, write it to `docs/demo-diligence-2026-05.md` (offered, not yet created).

---

## 9. Immediate next actions, prioritized

1. **Unblock beta login (Section 5).** Get the diagnostic SQL output from Bryan; fix the role or ship `/whoami`. Highest priority — beta can't onboard staff until this works.
2. **Confirm the remaining UI list (Section 3, items 5–10) with Bryan** and record it here.
3. **Port the Admin Notification Center** (`admin-notification-center-v2.html` → product code). Largest unshipped UI surface.
4. **Verify beta setup** (Section 6) end-to-end: all four users can log in on mobile to the correct home, demo seed applied, SMTP delivering.
5. Work the rest of the UI list, two-commit pattern per item.

---

## 10. Exact message to paste into the new chat

> Read `docs/HANDOFF.md` first, then `docs/STATE.md` and `CLAUDE.md`. We're at Day 54 close, beta is imminent. Top priority is the mobile staff login bug (Section 5) — I'll paste the diagnostic SQL output. Then we finish the UI redesign list and port the Notification Center.
