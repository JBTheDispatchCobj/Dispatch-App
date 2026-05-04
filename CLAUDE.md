# Dispatch — Claude Code operating manual

Read this every session. Re-read `docs/dispatch-audit.md` if you have not in the current session.

## What this is

Dispatch is a mobile-primary web app for boutique/independent hotels. It deploys task cards (housekeeping, front-desk, maintenance) to staff phones. Managers/admins create, assign, and review cards. Staff execute them.

Owner: Bryan Stauder (non-developer, startup veteran). Co-founder: Wisconsin boutique hotel operator. Beta target: that hotel, 2-week ship window from 2026-04-21.

Future (post-beta): in-app agent that generates and deploys cards from a knowledge base, and ResNexus channel-manager integration for real room/reservation data. **Not beta scope.**

## Stack

- Next.js 16 App Router, React 19, TypeScript (strict)
- Supabase: Postgres + Auth (magic-link OTP) + RLS + Storage
- Mobile-first responsive web. No native app, no PWA, no service worker.
- No Tailwind. Single `app/globals.css` with hand-written CSS classes.
- No test suite yet. Do not add one unless explicitly asked.
- No middleware. All auth guarding is client-side in page components.

## Beta scope lock (ruthless)

Ship these. Nothing else.

1. Manager/admin can create a task, assign it to a staff member, set its `context.staff_home_bucket` to one of: `start_of_day`, `departures`, `stayovers`, `arrivals`, `dailys`, `eod`.
2. Staff opens the app, sees their tasks partitioned into the six buckets above (time-arc order: SOD → Departures → Stayovers → Arrivals → Dailys → EOD).
3. Staff can open a task card, pause it, complete a checklist, upload a note/image, mark it done.
4. Every state change writes a `task_events` row with `schema_version: 1`.
5. Deployment to Vercel, linked to Supabase, accessible at a URL the hotel can hit from phones.

**Cut for beta, revisit week 3:** activity feed polish, staff profile pages, reports/metrics, team card, deep-clean table, dynamic daily reassignment, ResNexus, knowledge-base agent.

See `docs/dispatch-audit.md` section 8 for the day-by-day plan and section 9 for the full cut list.

## What shipped in Phase 3

- All six X-430 staff task detail cards (D-430, A-430, S-430, Da-430, E-430, SOD-430) under `app/staff/task/[id]/`
- Day 20 staff home rebuild — bucket card stack on cream surface — at `app/staff/page.tsx`
- Per-card audit docs at `docs/phase-3-{slug}-mapping.md` document every gap and decision
- Locked design system tokens in `app/globals.css` (six neon bucket palettes + Day 20 cream tokens)

## Architecture rules (do not violate)

### RLS and Postgres

- `profiles` RLS depends on `auth_profile_role()` — a `SECURITY DEFINER` function that reads the current user's role without recursing through the policies. **Never** query `profiles` inside a `profiles` policy body directly; always go through this function. See `docs/supabase/fix_rls_profiles_recursion_manager_path.sql`.
- Staff cannot update certain task fields (assignee, priority, due date, context). Defense-in-depth: RLS + a Postgres trigger `tasks_staff_field_guard()`. If you add a field that only managers should edit, update both policies and the trigger.
- `task_events` is **append-only**. No updates, no deletes. The schema is versioned — current contract is `schema_version: 1`. See `docs/TASK_EVENTS_CONTRACT.md`. If you need to evolve the event payload, bump the version, do not mutate v1.

### Auth and routing

- Supabase magic-link is the only auth path. No passwords. No social.
- `resolveAuthUser(session)` returns the real Supabase user — never a forged or dev user.
- Role-based routing: managers/admins land on `/`, staff land on `/staff`. The router logic lives in `lib/profile.ts` (`shouldUseManagerHome`, `mayAccessStaffRoutes`).
- `lib/dev-auth-bypass.ts` is a **localhost-only** role view switcher for testing as a different role without re-login. It does NOT bypass real auth, and it does NOT work on any deployed domain. Do not extend it to do so.

### Task cards

- `tasks.context` is a JSONB blob for per-card metadata. The one field that absolutely must be set for staff UX to work is `context.staff_home_bucket`. When writing task creation forms, this field is required (enforce in the UI — the DB default is sloppy).
- `card_type` distinguishes visual treatment: `housekeeping_turn`, `arrival`, `stayover`, etc. See `docs/supabase/milestone1_architecture_lock.sql`.
- Card detail pages live under `app/staff/task/[id]` for staff and `app/tasks/[id]` for managers. A generic `card-detail.tsx` routes to a `manager-card-detail.tsx` or `staff-card-detail.tsx` based on role.

## Coding conventions

- **Boring code wins.** No cleverness. No abstractions we don't need. One-file-per-feature unless clearly beneficial.
- **Mobile-first CSS.** Assume 390px viewport. Desktop is a bonus, not a priority.
- **No new dependencies without asking Bryan.** Current deps: `@supabase/supabase-js`, `next`, `react`, `react-dom`. That's it.
- **TypeScript strict.** If you're tempted to `any`, stop and solve it.
- **Client components** for anything interactive (use `"use client"`). Server components for static layouts.
- **Supabase client** lives at `lib/supabase.ts`. Always import from there, never re-create.
- **Error handling:** show the raw Supabase error message in a visible `.error` element. Do not hide errors behind generic text — Bryan needs to see what failed.
- **No emojis in code or UI** unless explicitly requested.

## Working style with Bryan

Bryan is **not a developer.** Never assume he can read diffs or debug a stack trace. When you finish work:

1. In plain English, describe what changed and why (2-3 sentences max).
2. List the exact files touched.
3. Tell him how to verify it works from the UI — click here, expect this.
4. If anything needs a Supabase migration, tell him which SQL file to run in the Supabase dashboard SQL editor and warn him it's a schema change.

When you start work:

1. Read `docs/dispatch-audit.md` if you haven't this session.
2. Read any new mockups in `/design/` if the task involves UI.
3. Propose a plan before you cut code if the task touches more than one file.

## Project folder map

```
app/                    # Next.js App Router
  page.tsx              # Manager/admin home (role-gated)
  staff/
    page.tsx            # Staff home — six buckets, time-arc order (critical UX)
    task/[id]/          # Staff card execution screens
  tasks/[id]/           # Manager card view/edit
  login/                # Magic-link form
  auth/callback/        # OAuth callback
  layout.tsx            # Root layout, global CSS
  globals.css           # All styles

lib/
  supabase.ts           # Supabase client singleton
  profile.ts            # Role/profile fetching and gates
  dev-auth-bypass.ts    # Localhost role-view switcher (dev only)
  staff-home-bucket.ts  # Task → bucket partitioning

docs/
  dispatch-audit.md     # Ruthless audit + 14-day plan (READ THIS)
  TASK_EVENTS_CONTRACT.md
  supabase/             # SQL migrations, run in order
    cards_mvp.sql
    milestone1_architecture_lock.sql
    fix_rls_profiles_recursion_manager_path.sql

design/                 # UI mockup PNGs (Bryan adds these)

AGENTS.md               # Older direction doc — superseded by this file
dispatch-ui-rules.md    # UI conventions — merged into this file
```

## Phase 4 in flight

- Wave 4A: shared helpers + cleanup (drop topstrip ＋, drop debug footers, S-430 status pill fix)
- Wave 4B: KB ingestion — Jennifer's checklist trees into `lib/checklists/variants/{class}.ts`
- Reservations BR pack: hardcoded staff-home brief counts (3/2/4) stay until BR1-BR5 land
- Rule engine: `lib/orchestration/rules/*` are scaffolded but `dispatch()` returns `[]` — interpreter not yet built
- See `docs/phase-3-handoff.md` and `docs/phase-3-{slug}-mapping.md` for current Phase 4 ground truth

## What to never do

- Do not add tests, CI, linting configs, or tooling unless Bryan asks.
- Do not refactor working code for aesthetics.
- Do not introduce a UI framework (Tailwind, shadcn, MUI, etc.) — plain CSS only.
- Do not add analytics, feature flags, or error reporting SDKs.
- Do not touch ResNexus code paths (there are none; don't create them).
- Do not commit `.env.local` or any secret.
- Do not `git push --force` to main. If you need to rewrite history, ask.
- Do not delete anything in `docs/` without asking.

## When stuck

Ask Bryan. He knows the hotel operations reality better than any document. If he's unavailable and you must proceed, make the smallest reversible change, log your assumption clearly in the commit message, and surface it to him first thing in your response.
