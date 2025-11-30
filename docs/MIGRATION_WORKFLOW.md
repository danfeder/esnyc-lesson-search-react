# Database Migration Workflow

## Overview

This document defines the safe workflow for database migrations. Following this process ensures local, staging, and production databases stay synchronized.

## Environments

| Environment | Purpose | Project ID |
|-------------|---------|------------|
| **Local** | Development & testing | N/A (Docker) |
| **Staging** | Pre-production testing | `epedjebjemztzdyhqace` (paused) |
| **Production** | Live application | `jxlxtzkmicfhchkhiojz` |

### Local Development Setup

```bash
# Start local Supabase (includes DB, Auth, Storage, Edge Functions)
supabase start

# Reset database with migrations + seed data
npm run db:reset

# Regenerate TypeScript types after schema changes
npm run db:types

# View local Studio
open http://localhost:54323
```

### Using the Staging Environment

The `dev_staging` project exists but is currently paused to save resources.

**To activate staging:**
1. Go to https://supabase.com/dashboard/project/epedjebjemztzdyhqace
2. Click "Restore project" to unpause
3. Link locally: `supabase link --project-ref epedjebjemztzdyhqace`
4. Push migrations: `supabase db push`

**When to use staging:**
- Testing migrations with production-like data
- Validating Edge Function changes before production
- Load testing or performance validation

**To switch between environments:**
```bash
# Link to staging
supabase link --project-ref epedjebjemztzdyhqace

# Link back to production
supabase link --project-ref jxlxtzkmicfhchkhiojz
```

## Golden Rules

1. **NEVER** make direct edits in Supabase Studio on production
2. **ALWAYS** create a migration file first
3. **ALWAYS** test locally before pushing to production
4. **ALWAYS** run `npm run test:rls` after any RLS changes
5. **NEVER** mark a migration as "applied" unless it actually is

## Standard Workflow

### Step 1: Create Migration File

```bash
# Create a new migration file with timestamp
touch supabase/migrations/$(date +%Y%m%d)_description.sql
```

**Naming convention:** `YYYYMMDD_short_description.sql`
- Example: `20251129_add_teacher_review_policy.sql`

### Step 2: Write Migration SQL

```sql
-- Migration: 20251129_add_teacher_review_policy.sql
-- Description: Add RLS policy for teachers to view their own reviews
-- Issue: #122

CREATE POLICY "Policy name" ON "public"."table_name"
  FOR SELECT
  TO "authenticated"
  USING (your_condition);

-- Rollback:
-- DROP POLICY IF EXISTS "Policy name" ON "public"."table_name";
```

### Step 3: Test Locally

```bash
# Ensure local Supabase is running
supabase status

# Reset local DB and apply all migrations
supabase db reset --local

# Run RLS tests
npm run test:rls

# Test the specific functionality manually
```

### Step 4: Verify Before Push

```bash
# Check what will be pushed
supabase db push --dry-run

# Verify migration history matches
supabase migration list
```

### Step 5: Push to Production

```bash
# Push the migration (will prompt for confirmation)
supabase db push --include-all

# Verify it was applied
supabase db dump --linked --schema public | grep "Your policy name"
```

### Step 6: Commit and PR

```bash
git add supabase/migrations/20251129_description.sql
git commit -m "feat(db): add description

Closes #XXX"
```

## Troubleshooting

### Migration History Mismatch

If `supabase db push` fails with "Remote migration versions not found in local":

```bash
# Check current state
supabase migration list

# Repair history (metadata only - doesn't change schema)
supabase migration repair --status reverted <old_version>
supabase migration repair --status applied <current_version>
```

**CAUTION:** Only use `--status applied` if the migration content IS actually on the remote database.

### Connection Issues

If you see SCRAM authentication errors:

```bash
# Re-link to project
supabase link --project-ref <project_id>

# Try with --include-all flag
supabase db push --include-all
```

### Verifying Remote State

```bash
# Dump and search for specific objects
supabase db dump --linked --schema public | grep "your_search_term"

# Check table sizes (quick health check)
supabase inspect db table-stats
```

## Migration File Template

```sql
-- =====================================================
-- Migration: YYYYMMDD_description.sql
-- =====================================================
-- Description: What this migration does
-- Issue: #XXX (if applicable)
-- Author: Your name
-- Date: YYYY-MM-DD

-- =====================================================
-- CHANGES
-- =====================================================

-- Your SQL here

-- =====================================================
-- ROLLBACK (keep as comments for emergency use)
-- =====================================================
-- DROP POLICY IF EXISTS "..." ON "...";
-- DROP TABLE IF EXISTS ...;
```

## What NOT to Do

### Direct Studio Edits
- Creating tables in Supabase Studio
- Adding policies via the Dashboard
- Running SQL in the SQL Editor without a migration file

All of these bypass the migration tracking and cause drift.

### Skipping Local Testing
- Pushing untested migrations
- Assuming "it's just a small change"
- Not running `npm run test:rls` after RLS changes

### Manual Migration Repair Without Verification
```bash
# DANGEROUS - Don't do this without checking!
supabase migration repair --status applied 20251129  # <- Only if ACTUALLY applied!
```

## Emergency Rollback

If a migration breaks production:

```bash
# 1. Check what's wrong
supabase db dump --linked --schema public > emergency-dump.sql

# 2. Apply rollback SQL (from migration comments)
# Run the rollback commands from your migration file

# 3. Mark migration as reverted
supabase migration repair --status reverted <version>

# 4. Fix the migration locally, then re-push
```

## NPM Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run db:types` | Regenerate types from local database |
| `npm run db:types:remote` | Regenerate types from production database |
| `npm run db:reset` | Reset local database (migrations + seed) |
| `npm run db:push` | Push migrations to linked remote |
| `npm run test:rls` | Test RLS policies locally |

## History

- **2025-11-30:** Documented after fixing migration drift between local (baseline snapshot) and remote (old individual migrations).
- **Problem solved:** Remote had `20250709015027`, `20250710003355`; Local had consolidated `20251001` baseline.
- **Solution:** Used `migration repair` to synchronize history, then pushed pending migrations.
