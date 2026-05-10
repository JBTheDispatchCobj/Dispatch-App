# Dispatch — Backup + Restore Strategy (Beta)

*Master plan VIII.G — closed Day 51 chase #9.*

This document captures Dispatch's backup posture for the beta hotel deployment and the restore procedure if data loss occurs. Supabase auto-backup is the primary path; this doc documents what's covered, what's not, and how to recover.

---

## What Supabase auto-backs-up (Hobby plan, current)

- **Postgres database (full schema + data)** — daily backups retained 7 days on the Hobby plan. Includes every table in `public.*` (tasks, task_events, task_checklist_items, profiles, staff, notes, maintenance_issues, taxonomies, reservations, inbound_events, deep_clean_history, task_drafts) plus the views (staff_shifts_v / staff_segments_v / shift_summary_v / team_roster_v).
- **Auth tables** — `auth.users` and related tables backed up alongside the database.
- **RLS policies + functions + triggers** — all schema objects, including the SECURITY DEFINER functions (`auth_profile_role()`, `staff_clock_in_event()`, etc.) and the field-guard triggers (`tasks_staff_field_guard`, `task_checklist_staff_guard`, `tasks_seed_default_checklist`).
- **Migration history** — Supabase tracks applied migrations in `supabase_migrations.schema_migrations`, but Dispatch applies migrations manually via the dashboard SQL editor (not via the Supabase CLI), so this table reflects only Supabase-CLI-managed migrations and is empty for Dispatch. Source-of-truth for applied migrations is `docs/supabase/*.sql` files in the repo.

## What Supabase auto-backup does NOT cover

- **Storage bucket files (`task-files`)** — Storage objects (photos uploaded by staff via Day 40 III.E pipeline) are NOT included in the database auto-backup. Storage has its own retention/snapshot path on Pro plans; on Hobby, photos are durable but not point-in-time recoverable. **Beta posture:** acceptable. Photos are operational artifacts (broken TV, stained linen) — not sensitive PII; if a photo is lost, the maintenance_issues row's text + taxonomy fields still describe the issue.
- **Vercel deployment artifacts** — code lives on `main` branch in GitHub (`JBTheDispatchCobj/Dispatch-App`); Vercel auto-redeploys on push. Restoring code = restoring the GitHub repo, not Vercel.
- **Environment variables on Vercel** — set manually per-environment in Vercel dashboard. Document them externally if loss is a concern (see "Environment variables" below).

## Restore procedure (database)

If catastrophic data loss occurs (accidental DROP, bad migration, corrupted row set):

1. **Open Supabase dashboard → Project Settings → Database → Backups.**
2. **Identify the backup timestamp closest to the desired restore point** (max 7 days back on Hobby; immediately preceding the bad event is usually the right choice).
3. **Click "Restore" on that backup row.** Supabase performs an in-place restore of the entire database. **WARNING:** this is destructive — all data written after the backup timestamp is lost.
4. **Verify post-restore:**
   - `select count(*) from public.tasks` — should reflect the pre-incident task count.
   - `select count(*) from public.staff` — should show the 4 (or current) staff members.
   - Open `https://dispatch-app-iota.vercel.app/admin` — admin home should render with the expected lanes.
   - Open `/admin/maintenance` and `/admin/maintenance/resolved` — should reflect the restored maintenance_issues state.

## Test-restore procedure (no production impact)

Periodically verify the backup path works without touching production:

1. Clone the production project to a new Supabase project via dashboard → Project Settings → "Clone project."
2. Restore the most recent backup into the cloned project.
3. Run the same verification queries above against the clone's connection string.
4. Delete the clone when done.

**Beta cadence recommendation:** test-restore once before the Wisconsin hotel's first live week, then quarterly. Adjust if recovery confidence requires more frequent practice.

## Environment variables (manual restore lane)

These are NOT in any auto-backup. If Vercel project gets recreated:

- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase dashboard → Project Settings → API.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same place.
- `SUPABASE_SERVICE_ROLE_KEY` — same place. **Sensitive — do not commit.**
- `AGENT_KILL=true` — production safety; orchestrator off.
- `AGENT_DRY_RUN=true` — production safety; orchestrator writes to `task_drafts` only.

Per `docs/deployment/vercel-checklist.md` Step 4. Recommend documenting current values in a password manager (1Password / Bitwarden vault entry: "Dispatch Vercel env vars") so they're recoverable without round-tripping back through Supabase.

## What we don't auto-monitor

- Daily backup success/failure notifications (Supabase Hobby doesn't email on backup failure; Pro plan does).
- Storage bucket size growth (manual check via dashboard; if it crosses Hobby storage limits, photos start failing to upload — fail-loud per the Day 40 III.E design will surface to staff but won't email Bryan).

**Post-beta consideration:** upgrading to Supabase Pro buys longer backup retention (30 days), point-in-time recovery (PITR) within retention window, and email notifications on backup failures — worth revisiting when the hotel is hitting real load or when multi-property tenancy lands (master plan IX.C).

## Cross-references

- `docs/deployment/vercel-checklist.md` — initial Vercel deploy + env var setup.
- `docs/STATE.md` "Schema in place" — current schema inventory (29 migration files + 4 views).
- Supabase Hobby plan limits: https://supabase.com/pricing — verify current retention numbers if this doc ages.
