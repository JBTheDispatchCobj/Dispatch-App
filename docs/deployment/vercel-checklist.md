# Vercel Deploy Checklist — Dispatch

*Step-by-step path to land Dispatch at a public URL Jennifer's staff can hit from their phones. ~15–20 minutes the first time. Web UI flow recommended; CLI alternative noted at the bottom.*

---

## Before you start

You need:

- The GitHub repo at `github.com/JBTheDispatchCobj/Dispatch-App` already pushed. Confirm with `git remote -v` in your project root.
- A Vercel account (free Hobby tier is sufficient for the beta). Sign up at vercel.com using your GitHub account if you haven't.
- The three Supabase keys from your existing `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

You will NOT commit `.env.local` to git. Vercel reads env vars from its own dashboard, set per-project.

---

## Step 1 — Make sure the repo is on GitHub

In your terminal at `/Users/bryanstauder/dispatch-app`:

```
git status
git remote -v
```

If `git remote -v` shows `github.com/JBTheDispatchCobj/Dispatch-App`, you're good.

If it shows nothing or a different host, you need a GitHub repo. The simplest path: in CC, paste:

```
Help me push this repo to a new private GitHub repo named "dispatch-app". Use the gh CLI if it's installed; otherwise walk me through creating the repo on github.com and pushing.
```

CC will guide you through. Do this before continuing.

---

## Step 2 — Import the GitHub repo at vercel.com

1. Open https://vercel.com/dashboard in a regular browser tab (no incognito needed — Vercel logs you in via GitHub OAuth).
2. Click **Add New** → **Project**.
3. Under "Import Git Repository," find `JBTheDispatchCobj/Dispatch-App` and click **Import**. If the repo isn't listed, click **Adjust GitHub App Permissions** first to grant Vercel access to it, then come back.
4. On the configure page:
   - **Project name:** `dispatch-app`. Vercel may auto-append a suffix if the name is already taken on your account — the Day 45 deploy ended up at `dispatch-app-iota` and resolves to `https://dispatch-app-iota.vercel.app/`. Harmless; the suffix sticks for the lifetime of the project.
   - **Framework preset:** Next.js (auto-detected).
   - **Root directory:** `./` (default).
   - **Build / Output / Install commands:** all defaults.
5. When prompted to pick a plan, choose **Hobby** (free tier).
6. Do NOT click **Deploy** yet. Fill the env vars first (next step), then come back to this page and click Deploy.

---

## Step 3 — Set the 5 env vars before first deploy

Still on the same configure page, expand **Environment Variables**. Add these one at a time. For each: paste the variable name, paste the value, leave "Production / Preview / Development" all checked, click **Add**.

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from your `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from your `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | from your `.env.local` |
| `AGENT_KILL` | `true` (keeps the orchestrator off in production until you flip it deliberately) |
| `AGENT_DRY_RUN` | `true` (orchestrator writes to `task_drafts`, not `tasks`; flip to `false` only when ready) |

`NEXT_PUBLIC_DEV_BYPASS` is intentionally NOT set — it's a localhost-only role-view switcher and must never be enabled on a public domain.

Note: the `NEXT_PUBLIC_*` values are baked into the client bundle — RLS is what actually protects data. The `SUPABASE_SERVICE_ROLE_KEY` is server-only; never include it in any `NEXT_PUBLIC_*` var.

---

## Step 4 — Deploy

Click **Deploy** at the bottom of the configure page. Vercel runs `npm install` + `npm run build`, then ships. ~2–3 minutes.

When it finishes, Vercel shows the production URL. For Bryan's deploy that's `https://dispatch-app-iota.vercel.app/`. Copy it; you'll paste it into Supabase next.

The app will fail magic-link login at this point because Supabase doesn't yet know the production URL. That's the next step.

After this first deploy, **every push to the `main` branch on GitHub auto-redeploys.** No manual action needed — the Day 45 hotfix commit `a287792` confirmed this works end-to-end.

---

## Step 5 — Configure Supabase magic-link redirect

The Supabase magic-link flow won't work until Supabase knows the production URL. Without this step, login links go to the wrong place.

Go to https://app.supabase.com → your project → **Authentication** → **URL Configuration**.

Set the **Site URL** to:

```
https://dispatch-app-iota.vercel.app
```

The Site URL is a single value; prod is the right pick. Local development still works because the login page (`app/login/page.tsx`) sends a dynamic `emailRedirectTo` based on `window.location.origin` — Supabase honors any URL that matches the Redirect URLs allowlist below.

Set the **Redirect URLs** allowlist to all four of these (prod is for Jennifer's staff hitting the URL from phones; localhost is for `npm run dev` on your machine):

```
http://localhost:3000/auth/callback
http://localhost:3000/**
https://dispatch-app-iota.vercel.app/auth/callback
https://dispatch-app-iota.vercel.app/**
```

If localhost is already in the allowlist from earlier dev setup, just add the two prod entries.

Click Save.

---

## Step 6 — Smoke test the deploy

1. Open https://dispatch-app-iota.vercel.app/ in an **incognito** window (so you're not auth'd from `localhost`).
2. Go to `/login`. Enter your admin email. Click "Send magic link."
3. Check your email. Click the link.
4. You should land on `/admin` (admin/manager) or `/staff` (staff), depending on your profile role.
5. Tap into a task card. Confirm the X-430 detail renders.

If anything fails, check:

- Vercel build logs (Vercel dashboard → Deployments → click the latest → Build logs)
- Browser console (F12 / Cmd+Option+I) for client-side errors
- Supabase dashboard → Authentication → Users to confirm the user exists and has a profile row

---

## Step 7 — Hand the URL to Jennifer + provision staff users

Send Jennifer https://dispatch-app-iota.vercel.app/ + her login email. She uses the magic-link flow. Her staff use the same flow with their own emails.

**Provisioning new staff users.** Every new `auth.users` row gets a default `role='manager'` profile via the `handle_new_user_profile()` trigger. To turn a manager-by-default user into a staff user, run this in the Supabase SQL editor after they've logged in once:

```sql
update public.profiles
set role = 'staff', staff_id = '<staff-uuid-from-public.staff>'
where id = '<auth-uid-from-auth.users>';
```

You can find the `auth.users.id` for a given email in the Supabase dashboard under Authentication → Users. The `staff_id` UUID lives in `public.staff` — match by name.

For mobile add-to-home-screen: on iOS Safari, share button → "Add to Home Screen." On Android Chrome, three-dot menu → "Install app" or "Add to Home Screen." Optional but improves the daily-use feel.

---

## Common gotchas

**"Cannot find module" build errors on Vercel.** Usually a TypeScript path-alias mismatch. We use `@/` for `lib/` and `app/` paths. Vercel's webpack should handle this from `tsconfig.json` — if it doesn't, paste the build log to CC.

**Magic link goes to localhost, not production.** Step 5 wasn't completed, or the Site URL in Supabase is still `http://localhost:3000`. Fix that, send a fresh magic link.

**Brief card shows fallback 3/2/4 in production.** The `reservations` table or RLS policies might not be applied to the production Supabase project yet. If your Supabase project is the same dev/prod one (single-environment beta), this is already done. If you're using a separate prod Supabase project, run the same SQL migrations there.

**Service role key warning.** If Vercel surfaces a "service role key in client bundle" warning, that means a `NEXT_PUBLIC_*` env var was accidentally given the service role value. Remove it; only the SERVER-side env var should hold it.

**Activity feed text invisible against cream background.** This was the Day 45 hotfix (`a287792`) — already fixed in the current codebase. If you ever see contrast issues recur, check that `app/globals.css` does NOT contain a `@media (prefers-color-scheme: dark)` block that swaps `--foreground`. Dispatch is explicitly cream-locked light-mode-only via `color-scheme: light` on `:root`.

---

## After deploy

Once Jennifer's logged in and her staff is using the URL:

- Watch the Vercel **Deployments** tab for any error spikes
- Watch Supabase **Logs** tab for query errors during the first day
- Keep the kill switch (`AGENT_KILL=true`) on until you're confident the rule engine should fire automatically — then flip to `false` in Vercel env vars and re-deploy

Beta complete: hand-tested at scale by real staff in the actual property.

---

## Advanced (CLI)

Vercel also has a CLI (`npm install -g vercel`, then `vercel` for previews or `vercel --prod` for production). Day 45 attempted this path first and bailed: the CLI's interactive `vercel login` OAuth flow tripped on Cursor's terminal — the browser handshake doesn't always cleanly hand control back to CC's terminal multiplexer. Web UI is the recommended path for that reason.

If you do want the CLI for future redeploys (faster for previews + ad-hoc deploys once auth is established), see https://vercel.com/docs/cli. It does everything Steps 2–4 above do, but from your terminal instead of the browser. Once `vercel login` succeeds the first time, subsequent `vercel --prod` calls don't need to re-authenticate.
