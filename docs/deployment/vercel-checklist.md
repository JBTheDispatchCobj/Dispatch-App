# Vercel Deploy Checklist — Dispatch

*Step-by-step path to land Dispatch at a public URL Jennifer's staff can hit from their phones. ~30 minutes the first time.*

---

## Before you start

You need:

- A GitHub repo for the project (if not already pushed). The CLAUDE.md note implies the repo exists locally; confirm with `git remote -v` in your project root.
- A Vercel account (free tier works for the beta). Sign up at vercel.com using your GitHub account if you haven't.
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

If `git remote -v` shows a `github.com` URL, you're good.

If it shows nothing or a different host, you need a GitHub repo. The simplest path: in CC, paste:

```
Help me push this repo to a new private GitHub repo named "dispatch-app". Use the gh CLI if it's installed; otherwise walk me through creating the repo on github.com and pushing.
```

CC will guide you through. Do this before continuing.

---

## Step 2 — Install the Vercel CLI

In your terminal:

```
npm install -g vercel
```

Then log in:

```
vercel login
```

Follow the prompts (it'll open a browser to authenticate).

---

## Step 3 — First deploy (preview)

From the project root `/Users/bryanstauder/dispatch-app`:

```
vercel
```

Vercel will ask a few questions. Answers:

- **Set up and deploy?** Y
- **Which scope?** Your personal account
- **Link to existing project?** N
- **Project name?** `dispatch-app` (or whatever you want)
- **Which directory is your code in?** `./` (just hit enter)
- **Override settings?** N

It will deploy. The URL it spits out is a *preview* (e.g., `dispatch-app-abc123.vercel.app`). The app will fail to load right now because env vars aren't set yet — that's the next step.

---

## Step 4 — Set env vars in the Vercel dashboard

Go to https://vercel.com/dashboard → click into the `dispatch-app` project → Settings tab → Environment Variables.

Add these one at a time. For each: paste the variable name, paste the value from your local `.env.local`, leave "Production / Preview / Development" all checked, click "Save."

| Name | Value source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | from `.env.local` |
| `AGENT_KILL` | `true` (keep the orchestrator off in production until you flip it deliberately) |
| `AGENT_DRY_RUN` | `true` (writes to task_drafts, not tasks; flip to `false` only when ready) |

Note: The `NEXT_PUBLIC_*` values are baked into the client bundle — RLS is what actually protects data. The `SUPABASE_SERVICE_ROLE_KEY` is server-only; never include it in any `NEXT_PUBLIC_*` var.

---

## Step 5 — Promote to production

Back in your terminal:

```
vercel --prod
```

This redeploys with the env vars in place and gives you the production URL (e.g., `dispatch-app.vercel.app` or a custom domain you assign in the dashboard).

---

## Step 6 — Configure Supabase magic-link redirect

The Supabase magic-link flow won't work until Supabase knows the production URL. Without this step, login links go to the wrong place.

Go to https://app.supabase.com → your project → Authentication → URL Configuration.

Add these to the "Redirect URLs" allowlist:

```
https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback
https://YOUR-VERCEL-DOMAIN.vercel.app/**
```

(Replace `YOUR-VERCEL-DOMAIN` with the actual domain Vercel gave you.)

Set the "Site URL" to your Vercel production URL (`https://YOUR-VERCEL-DOMAIN.vercel.app`).

Save.

---

## Step 7 — Smoke test the deploy

1. Open the Vercel production URL in an **incognito** window (so you're not auth'd from `localhost`).
2. Go to `/login`. Enter your email. Click "Send magic link."
3. Check your email. Click the link.
4. You should land on `/` (manager home) or `/staff` (staff home), depending on your profile role.
5. Tap into a task card. Confirm the X-430 detail renders.

If anything fails, check:
- Vercel build logs (Vercel dashboard → Deployments → click the deployment → Build logs)
- Browser console (F12 / Cmd+Option+I) for client-side errors
- Supabase dashboard → Authentication → Users to confirm the user exists and has a profile row

---

## Step 8 — Hand the URL to Jennifer

Send her the Vercel URL and her login email. She uses the same magic-link flow. Her staff use the same flow with their own emails.

For mobile add-to-home-screen: on iOS Safari, share button → "Add to Home Screen." On Android Chrome, three-dot menu → "Install app" or "Add to Home Screen." Optional but improves the daily-use feel.

---

## Common gotchas

**"Cannot find module" build errors on Vercel.** Usually a TypeScript path-alias mismatch. We use `@/` for `lib/` and `app/` paths. Vercel's webpack should handle this from `tsconfig.json` — if it doesn't, paste the build log to CC.

**Magic link goes to localhost, not production.** Step 6 wasn't completed, or the Site URL in Supabase is still `http://localhost:3000`. Fix that, send a fresh magic link.

**Brief card shows fallback 3/2/4 in production.** The `reservations` table or RLS policies might not be applied to the production Supabase project yet. If your Supabase project is the same dev/prod one (single-environment beta), this is already done. If you're using a separate prod Supabase project, run the same SQL migrations there.

**Service role key warning.** If Vercel surfaces a "service role key in client bundle" warning, that means a `NEXT_PUBLIC_*` env var was accidentally given the service role value. Remove it; only the SERVER-side env var should hold it.

---

## After deploy

Once Jennifer's logged in and her staff is using the URL:

- Watch the Vercel "Deployments" tab for any error spikes
- Watch Supabase "Logs" tab for query errors during the first day
- Keep the kill switch (`AGENT_KILL=true`) on until we're confident the rule engine should fire automatically — then flip to `false` in Vercel env vars and re-deploy

Beta complete: hand-tested at scale by real staff in the actual property.
