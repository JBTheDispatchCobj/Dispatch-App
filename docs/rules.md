# Repository rules

## Source of truth

- Product intent lives in **AGENTS.md** and **docs/mvp.md**.
- Implementation stays aligned with those files; do not rely on copies outside this repository.

## Engineering

- Next.js App Router, TypeScript, React client components where browser APIs or Supabase client are required.
- Use the shared Supabase client from `lib/supabase.ts` only; avoid ad hoc client construction.
- Keep auth flows explicit: login, callback, protected home, sign-out—no hidden middleware unless the team adds it deliberately.
- Prefer small diffs: fix what is broken, avoid drive-by refactors and new features.

## UX

- Mobile-first spacing, readable type, minimal chrome.
- Calm copy; errors should be short and actionable.

## Secrets and config

- Supabase URL and anon key belong in `.env.local` as `NEXT_PUBLIC_SUPABASE_*` (never commit real secrets).
- Redirect URLs for magic links must match routes under this app (for example `/auth/callback`).
