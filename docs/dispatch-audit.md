# Dispatch — Ruthless Audit & 2-Week Beta Plan

**Prepared for:** Bryan
**Date:** April 21, 2026
**Target:** Beta in co-founder's Wisconsin property in 14 days
**Source of truth reviewed:** `dispatch-app-codebase-full.zip`, 15 UI mockups, `CHATGPT BREAKDOWN OF PROJECT.md`, `Product layout (1).md`

---

## TL;DR (read this if nothing else)

1. **The backend is in better shape than you probably think.** The Supabase schema, RLS policies, and task-event contract are mature, defensive, and well-architected. Your previous work paid off.
2. **The frontend is in worse shape than the mockups imply.** The staff execution card (checklist / notes / help / done) works end-to-end. Everything else — the bucket UX, the per-card-type visual identity, Dailys, EOD, Maintenance, Stayovers quick-chips, the admin activity feed with action buttons — is either generic scaffolding or missing.
3. **ResNexus is zero code.** Not a single file mentions it. For the 2-week beta, fake it with seed data and a manual daily import. Real API integration is post-beta.
4. **The biggest product gap is not visible in code** — it's that staff can only see tasks with the right `context.staff_home_bucket` value set, and there's no manager UI to set it. Right now every task lands in "Start of Day" by default.
5. **For a 14-day beta, cut hard.** Ship staff-only, one bucket type (Departures), with checklist + notes + help + done. Everything else — admin dashboard polish, Dailys, EOD, Arrivals, Stayovers chips, activity feed, staff-side visual themes — is post-beta.

---

## 1. What the repo actually is

**Stack, unvarnished:**

- Next.js 16.2.2 + React 19.2.4 + TypeScript + `@supabase/supabase-js`. That is the entire dependency list for production. No Tailwind. No UI component library. No state manager. No form library. No testing framework. No linter config. `package.json` is 22 lines.
- Auth: Supabase magic-link (`signInWithOtp`). No passwords, no OAuth.
- Routing: Next.js App Router. Role-based homes: `/` for manager/admin, `/staff` for staff, login at `/login`, callback at `/auth/callback`.
- Styling: one `app/globals.css` file plus BEM-style class names scoped per component (`.staff-home-*`, `.card-*`, etc.). CSS custom properties for theming. Dark-mode media query. It's clean but every card-type visual you see in the mockups would be a new hand-written block here.
- Source control: git history is present in the zip (commits through April 6). No GitHub Actions, no Vercel config — deployment target is unchosen.

**Docs are a real asset.** `docs/` contains `mvp.md`, `rules.md`, `MILESTONE1_TESTING.md`, `TASK_EVENTS_CONTRACT.md`, `wireframes/`, and 9 SQL files. The schema SQL is the actual source of truth for the DB — there's no `supabase/migrations/` folder, which is a smell for traceability but fine for MVP.

---

## 2. What works end-to-end today (the good news)

I traced the full staff smoke path. Here's what actually runs:

**Auth → role resolution → route**
- `/login` sends a magic link via `signInWithOtp`.
- `/auth/callback` polls `getSession()` up to 12 times (3s) then redirects based on role.
- `app/page.tsx` and `app/staff/page.tsx` both guard on mount with `supabase.auth.getSession()` and `fetchProfile()`; staff-role users get kicked to `/staff`, managers stay on `/`.

**Manager creates a task**
- `app/tasks-section.tsx` / `manager-card-detail.tsx` supports title, description, priority, due date, due time, assignment to a staff row. All fields persist to `public.tasks` via Supabase client. Event logged via `logTaskEvent` with `schema_version: 1`.

**Staff sees the task and executes it**
- `/staff` lists assigned tasks grouped by bucket (see gap in §4).
- `/staff/task/[id]` opens the card, auto-transitions `open → in_progress`, logs `card_opened`.
- Checklist items load from `task_checklist_items`, toggle persists, logs `checklist_checked`/`checklist_unchecked`.
- Notes form writes to `task_comments`, logs `comment_added`.
- "Need Help" sets status `blocked`, logs `needs_help`.
- "I'm Done" sets status `done`, sets `completed_at`, logs `marked_done`, redirects to `/staff`.
- With `require_checklist_complete = true` on a task, Done is blocked until all items checked.

**Schema discipline is real.** The `task_events` table is append-only and every write includes `schema_version: 1` via `withTaskEventSchema()` in `lib/task-events.ts`. That's actually good engineering — it means you can evolve the event payload without breaking historical reads. Keep this.

**RLS is non-trivial and correct.** The `profiles` table RLS recursion bug (where policies self-join on `profiles`, re-triggering the same policy, infinite loop) was solved with a `SECURITY DEFINER` helper function `auth_profile_role()`. Staff-side field guards are enforced by both RLS policies AND a `BEFORE UPDATE` trigger (`tasks_staff_field_guard`). Defense in depth. Keep this.

**Dev bypass is safely scoped.** `lib/dev-auth-bypass.ts` only flips to localhost (`localhost`, `127.0.0.1`, `host.docker.internal`). It never forges a user — the real Supabase JWT is always used for writes. `DevBypassBanner` and `DevRoleSwitcher` in the root layout are also gated. This is not a security hole, but it does mean the root layout includes dev UI in production bundles (tiny overhead, worth noting).

---

## 3. What doesn't work / is scaffolding / is missing (the bad news)

I'm ordering these by severity for the 2-week beta.

### 3a. CRITICAL: No manager UI for assigning tasks to a staff-home bucket
This is your #1 beta blocker and it's not a code bug — it's a missing form field.

- `lib/staff-home-bucket.ts` determines which bucket a task shows up in by reading `context.staff_home_bucket` (a key in the task's JSONB `context` column) or falling back to a string match on `card_type`. If neither resolves, **default is `start_of_day`**.
- There is **no manager-side form field** for setting `context.staff_home_bucket`. So in practice every task a manager creates lands in the staff's "Start of Day" bucket. Departures, Arrivals, Stayovers will be empty unless you write SQL directly.
- **Fix:** Add a dropdown to the manager task create/edit form: `Bucket: Start of Day | Departures | Arrivals | Stayovers`. Persist it to `context.staff_home_bucket`. ~2-3 hours of work. This unblocks the entire staff bucket UX.

### 3b. CRITICAL: Three `card-detail.tsx` files that don't match the mockups
- `app/tasks/[id]/card-detail.tsx` is a role-based router that picks manager vs. staff view. Fine.
- `app/tasks/[id]/manager-card-detail.tsx` and `app/tasks/[id]/staff-card-detail.tsx` are each ~600 lines of a **single generic layout** with title / description / status / checklist / notes.
- The mockups show **six distinct card types** with totally different layouts: Departures (Outgoing/Incoming columns + Deep Clean table), Arrivals (Guest header + Daily Setup + checklist), Stayovers (DND/Guest OK/Desk OK/Sheet Change chips at top + sheet-change detail), Dailys (2-col grid of mini task cards), EOD (4-quadrant summary), Maintenance (Objective + Materials + Notes).
- **None of these are in the code today.** The code has one generic card that works. The 5 other card types are 100% new UI.
- **Cut for beta:** ship the Departures card type only. Skip Arrivals / Stayovers / Dailys / EOD / Maintenance visual treatments. The generic card will still function for those.

### 3c. HIGH: Admin Activity feed is probably a placeholder
- `app/activity-section.tsx` imports `logActivity()` and `activityType`, has CSS scaffolding, but the exploration didn't confirm a real `.select()` against `activity_events` or `task_events`.
- Mockups show a rich feed with user avatars, inline action buttons ("OPEN NOTE", "SEND REMINDER"), and color-coded status pips (green/yellow/red).
- **Cut for beta:** a plain chronological list of `activity_events` rows is fine. No buttons, no pips. Ship a working feed, not a pretty one.

### 3d. HIGH: No inline "Start of Day" see-act-done on staff home
- The mockups show Start-of-Day mini tasks with an inline Done toggle directly on the staff home — no click-through.
- Current code renders SOD tasks as links to the full card page. Functional, but violates the "fast, low-friction" pattern from `AGENTS.md`.
- **Cut or keep for beta:** keep the click-through for v1. Inline toggle is ~4 hours but not worth it pre-beta.

### 3e. MEDIUM: Staff home progressive disclosure (preview → Start → full card)
- Mockup #15 shows a middle state: tap a Departure row → get a mini preview card with Open/Stripped/Sheets chips and a "Start" button → then open the full card.
- Current code goes row → full card. Skips the preview.
- **Cut for beta.** Ship row → full card. Progressive disclosure is a v1.1 polish item.

### 3f. MEDIUM: Dailys, EOD, Maintenance views — not implemented
- Dailys mockup is a 2-column grid of mini cards with Complete buttons and Details links. Current code has no such view.
- EOD mockup is a 4-quadrant summary (Team Status / Open Still / Review / What's Next + Supply Needs). Not implemented.
- Maintenance mockup is a cleaner 3-section card. Not implemented.
- **Cut for beta.** These are all v1.1. Departures + Arrivals only, through the generic card shell.

### 3g. LOW: No tests, no CI, no deployment config
- Zero `.test.*` or `.spec.*` files. `MILESTONE1_TESTING.md` is a manual QA script.
- No `.github/workflows/`, no Vercel config, no CI.
- For a 2-week beta with a co-founder doing the testing, this is tolerable. Long-term it's debt.
- **Cut for beta.** Add Vercel deployment (~30 min) but skip tests and CI until after first staff use.

---

## 4. Security and deployment reality

I looked specifically for the stuff that burns startups:

- **No `service_role` key anywhere in client code.** Good. If it's ever needed (webhooks, scheduled jobs, ResNexus pull), put it in a server-only Next.js route handler or Supabase Edge Function, never in anything `NEXT_PUBLIC_*`.
- **Anon key in `.env.local` is baked into the client bundle** — that's by design and safe. RLS policies are what actually protect data.
- **Client-only auth guards** are a known soft spot. A user with a broken profile can briefly flash the manager shell before the redirect fires. For beta, acceptable. Post-beta, add a Next.js middleware or a server-side `getSession()` check. ~2 hours.
- **No rate limiting** on magic-link signups / task creation. For a closed beta (you + GM + staff), not an issue. Post-beta, Supabase has built-in rate limits and you can harden from there.
- **No audit of storage bucket policies.** `task-files` bucket is public-read, authenticated-insert with a per-user folder path. Looks fine. Don't change it without thinking about guest photos.
- **Deployment:** nothing is set up. Recommended path is **Vercel + your existing Supabase**. Push to GitHub, `vercel --prod`, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel env, done. Free tier will cover the beta. ~30 minutes the first time.

---

## 5. The mockups vs. the code — where the work actually lives

You've designed a **color-coded, card-type-specific UI system** in Figma. The code has a **single generic card**. Here's the gap mapped to the mockups:

| Mockup | Theme color | Status in code | Effort to match |
|---|---|---|---|
| Start of Day | yellow | Structure exists, visual treatment doesn't | 1 day |
| Departures (Outgoing / Incoming / Deep Clean table) | rose/peach | Not implemented — generic card only | 2 days |
| Arrivals (Guest header + Daily Setup) | teal | Not implemented | 1.5 days |
| Stayovers (DND/Guest OK/Desk OK/Sheet chips) | yellow/orange | Not implemented; chips don't exist in schema | 2 days (incl. schema) |
| Dailys (2-col grid of mini cards + Complete button) | coral | Not implemented | 1.5 days |
| EOD (4-quadrant summary) | purple | Not implemented; needs aggregation queries | 2 days |
| Maintenance (Objective / Materials / Notes) | purple | Not implemented; schema has no `materials` field | 1.5 days |
| Manager home sections (Dispatch/Activity/Tasks/Staff/Account) | neutral | Sections exist, visual polish doesn't | 1 day |
| Admin activity feed with action buttons | neutral | Probably placeholder — needs confirmation | 1 day |
| Daily Brief at top of both homes | neutral | `dispatch_day` table exists, UI probably partial | 0.5 day |
| Staff profile hub (Details / Tasks / Activity / Reports) | blue | `/staff/[id]` is a basic profile, not the hub | 1 day |
| Staff home greeting ("Hi Angie!") + bucket counts | neutral | Not implemented | 0.5 day |

**Total to fully match all mockups: ~14-16 days of focused work** for someone who knows the codebase. You do not have that time before beta. You need to pick.

---

## 6. ResNexus — the aspirational integration

Zero code. Not in `package.json`, not in `lib/`, not in `app/`, not in any SQL. Nothing.

**For the 2-week beta, my recommendation:**
- **Fake the data.** Seed `tasks` with realistic test rows — departures for today's check-outs, arrivals for today's check-ins, stayovers for in-house guests. Use your co-founder's actual property data once to populate a day.
- **Run beta off seed data for one week.** See what breaks in the workflow, not in the integration.
- **Add ResNexus integration in week 3.** Build a Supabase Edge Function that runs every 15 minutes: pulls today's reservations from ResNexus, upserts into a `reservations` table, then a trigger auto-creates `tasks` with `source = 'pms'` and the right `context.staff_home_bucket` per reservation state.

This keeps you from getting stuck on auth/schema/pagination/rate-limiting issues with a third-party API you haven't touched while you also need to ship a working product.

You'll also need ResNexus sandbox credentials. Get your co-founder to request those from the channel manager ASAP — that's often 1-3 business days.

---

## 7. The 14-day beta punch list

Structured as day-by-day so you can see what's realistic. Each day is ~4-6 hours of actual build time, assuming I'm doing the work and you're testing + giving feedback.

**Day 1 (Tuesday) — Unblock the bucket UX**
- Add `Bucket` dropdown to manager task create/edit form (writes to `context.staff_home_bucket`).
- Backfill existing test tasks in DB with correct bucket values.
- Confirm staff home renders 4 buckets with correct counts.

**Day 2 — Departures card visual**
- Take the existing generic `staff-card-detail.tsx`, fork into `DeparturesCard.tsx`.
- Add Outgoing / Incoming two-column layout. Fields come from `context` JSON (we'll stuff guest data there).
- Add STATUS radio row (Open / Sheets / Stripped / Done).
- Match rose/peach color theme.
- Keep existing checklist + notes + help + done wiring.

**Day 3 — Daily Brief + staff home greeting**
- Wire `dispatch_day` table into both manager home top and staff home top.
- Add "Hi {firstname}!" greeting on staff home pulled from profile `display_name`.
- Display bucket counts ("Departure (2)", "Arrivals (1)").

**Day 4 — Deploy to Vercel + invite your co-founder**
- Push to GitHub if not already pushed.
- `vercel --prod`, set env vars.
- Configure Supabase magic-link redirect URL to the production domain.
- Send your co-founder a login link.
- **Milestone: app is live.**

**Day 5-6 — Arrivals card + seed data script**
- ArrivalsCard.tsx — similar pattern to Departures.
- Write a Node script that seeds 1 day of realistic tasks (5-10 rooms, mix of D/A/S).
- Document how to re-seed for a new day.

**Day 7-8 — Bug hunt pass + admin dashboard polish**
- Activity feed: confirm it reads `activity_events` or switch to `task_events`. Simple list, no action buttons.
- Task creation form: add "quick assign to Angie" style presets.
- Fix any issues from co-founder's first login.

**Day 9-10 — Real data from co-founder**
- Manually export yesterday's reservations from ResNexus (CSV or screenshot — doesn't matter).
- Load as seed data for tomorrow's tasks.
- Co-founder runs a full day on Dispatch with real tasks.

**Day 11-12 — Stabilize from co-founder feedback**
- Triage their observations. Fix the biggest three. Ignore everything else.
- Write a simple one-pager for their staff: how to log in, what to expect.

**Day 13 — Soft beta with one staff member**
- Have the co-founder pick one housekeeping staff member (ideally Angie if that's the real name from the mockup).
- They log in, do their day on Dispatch.
- You watch for panic moments. Fix nothing today unless it's catastrophic.

**Day 14 — Full beta**
- Whole property on Dispatch for one day.
- You're on call, fixing and deploying.
- Collect feedback. That's v1.

**What is NOT on the list:** Stayovers quick chips, Dailys grid, EOD summary, Maintenance card, Admin Task View, staff profile hub with Reports tab, activity feed with action buttons, progressive disclosure preview, ResNexus API integration, AI agent card creator. All of these are v1.1 or later.

---

## 8. Ruthless cuts

Things you've designed, documented, or told your AI tools you want — that I am telling you to cut for the 14-day beta:

- **AI agent layer.** Not needed for beta. You already acknowledged this is "later."
- **Knowledge base integration.** Same.
- **All six distinct card-type visual treatments except Departures and Arrivals.** The mockups are beautiful but you can ship operations without them.
- **Admin Task View** (blue card from the mockups). The manager already has `/tasks/[id]` which works. Ship that.
- **Staff profile hub with four tabs** (Details / Tasks / Activity / Reports). Ship the plain staff profile.
- **Dailys grid + EOD summary + Maintenance card.** All v1.1.
- **Activity feed action buttons + status pips.** Plain list.
- **Dark mode polish.** Works by default; don't fight it.
- **Tests.** Add after beta.
- **ResNexus API.** Post-beta.
- **Mobile app shell (PWA / native).** The responsive web is the beta. If staff need it on home screen, they Add-to-Home-Screen. That's it.

---

## 9. What I need from you to keep moving

1. **GitHub access or continued zip workflow.** I can keep working off zips, but real commits require either a fresh repo URL or you handling the git push on your end from what I produce.
2. **Your co-founder's email** (so when we deploy, they can log in with a magic link). Also confirm their GM role name.
3. **Room / staff / shift reality for the property.** How many rooms? How many housekeepers per shift? Is there one manager (her) or multiple admins? I can seed data sensibly but guessing wastes our time.
4. **ResNexus sandbox credentials request kicked off today.** Even if we fake data for beta, get the real ones queued up.
5. **A go/no-go on the day-by-day plan in §7.** If you want a different order (e.g., Arrivals before Departures because your co-founder's property has more check-ins than check-outs in beta week), say so now.

---

## 10. Appendix: key file pointers

For reference when you're working with me or other tools:

- Product intent: `AGENTS.md`, `docs/mvp.md`, `docs/rules.md`
- Event contract: `docs/TASK_EVENTS_CONTRACT.md`, `lib/task-events.ts`
- Schema source of truth: `docs/supabase/*.sql` (apply in order: `staff.sql` → `tasks.sql` → `tasks_staff_id.sql` → `tasks_priority.sql` → `activity.sql` → `dispatch.sql` → `cards_mvp.sql` → `milestone1_architecture_lock.sql` → `fix_rls_profiles_recursion_manager_path.sql`)
- Manager home shell: `app/page.tsx` + `app/{dispatch,activity,tasks,staff,reports-queue}-section.tsx`
- Staff home: `app/staff/page.tsx` + `lib/staff-home-bucket.ts`
- Card execution: `app/staff/task/[id]/page.tsx` + `lib/orchestration/index.ts`
- Role router for `/tasks/[id]`: `app/tasks/[id]/card-detail.tsx` + `manager-card-detail.tsx` + `staff-card-detail.tsx`
- Supabase client: `lib/supabase.ts`
- Auth profile resolution: `lib/profile.ts` + `lib/dev-auth-bypass.ts`
- Smoke-path QA script: `docs/MILESTONE1_TESTING.md`

---

*Report complete. Ready to execute Day 1 on your go.*
