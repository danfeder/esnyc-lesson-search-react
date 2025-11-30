# Database Migration Workflow

## Overview

This project uses a **3-part database pipeline** with automated CI/CD for safe database migrations:

```
LOCAL (Docker)  →  TEST (CI)  →  PRODUCTION (Approved)
```

## Environments

| Environment | Project ID | Purpose |
|-------------|------------|---------|
| **Local** | Docker container | Development & experimentation |
| **Test** | `rxgajgmphciuaqzvwmox` | Automated CI testing |
| **Production** | `jxlxtzkmicfhchkhiojz` | Live application |

## The CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIGRATION PIPELINE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. LOCAL DEVELOPMENT                                           │
│     ├─ Create migration file                                    │
│     ├─ Test with: supabase db reset                            │
│     └─ Verify with: npm run test:rls                           │
│                          │                                      │
│                          ▼                                      │
│  2. PULL REQUEST CREATED                                        │
│     ├─ GitHub detects migration files changed                   │
│     ├─ E2E workflow auto-applies to TEST database              │
│     ├─ RLS tests run against TEST database                     │
│     └─ E2E tests run against Netlify preview                   │
│                          │                                      │
│                          ▼                                      │
│  3. PR MERGED TO MAIN                                          │
│     ├─ migrate-production.yml triggers                         │
│     ├─ Dry-run shows pending changes                           │
│     ├─ ⏸️  WAITS FOR MANUAL APPROVAL                           │
│     └─ After approval: applies to PRODUCTION                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Golden Rules

1. **NEVER** make direct edits in Supabase Studio on production
2. **ALWAYS** create a migration file for schema changes
3. **ALWAYS** test locally before creating a PR
4. **ALWAYS** run `npm run test:rls` after any RLS changes
5. **ALWAYS** wait for E2E tests to pass before merging

## Standard Workflow

### Step 1: Create Migration File

```bash
# Create a new migration file with timestamp
touch supabase/migrations/$(date +%Y%m%d)_description.sql
```

**Naming convention:** `YYYYMMDD_short_description.sql`
- Example: `20251201_add_rating_column.sql`

### Step 2: Write Migration SQL

```sql
-- Migration: 20251201_add_rating_column.sql
-- Description: Add rating column to lessons table

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS rating integer;

CREATE INDEX IF NOT EXISTS idx_lessons_rating ON lessons(rating);

-- Rollback:
-- DROP INDEX IF EXISTS idx_lessons_rating;
-- ALTER TABLE lessons DROP COLUMN IF EXISTS rating;
```

### Step 3: Test Locally

```bash
# Ensure local Supabase is running
supabase status

# Reset local DB and apply all migrations
supabase db reset

# Run RLS tests
npm run test:rls

# Test the specific functionality manually
```

### Step 4: Create PR

```bash
git checkout -b feat/add-rating-column
git add supabase/migrations/
git commit -m "feat(db): add rating column to lessons"
git push origin feat/add-rating-column
gh pr create --title "feat(db): add rating column"
```

### Step 5: CI Tests Automatically

When you create the PR:
1. GitHub Actions detects migration files in the PR
2. Migrations are automatically applied to the TEST database
3. RLS tests verify policies work correctly
4. E2E tests run against the Netlify deploy preview

### Step 6: Approve Production Deployment

After the PR is merged to main:
1. Go to **Actions** tab in GitHub
2. Find the "Production Database Migration" workflow
3. The "Apply to Production" job will be **waiting for approval**
4. Click "Review deployments" → Select "production" → "Approve and deploy"
5. Migrations are applied to production

## Local Development Setup

```bash
# Start local Supabase (includes DB, Auth, Storage, Edge Functions)
supabase start

# Reset database with migrations
supabase db reset

# View local Studio
open http://localhost:54323

# Stop when done
supabase stop
```

## Migration File Template

```sql
-- =====================================================
-- Migration: YYYYMMDD_description.sql
-- =====================================================
-- Description: What this migration does
-- Issue: #XXX (if applicable)

-- =====================================================
-- CHANGES
-- =====================================================

-- Your SQL here
-- Use IF NOT EXISTS / IF EXISTS for safety

-- =====================================================
-- ROLLBACK (keep as comments for emergency use)
-- =====================================================
-- DROP POLICY IF EXISTS "..." ON "...";
-- DROP TABLE IF EXISTS ...;
```

## Two Types of Changes

### Schema Changes → Migration Files
- Creating/dropping tables
- Adding/removing columns
- Creating indexes
- Adding RLS policies
- Creating functions

**Must use migration files and go through CI pipeline.**

### Data Changes → Direct Queries
- Adding/updating/deleting rows
- Importing data
- Fixing incorrect data

**Can use MCP tools or scripts directly (be careful with production).**

## Troubleshooting

### Migration History Mismatch

If migrations get out of sync:

```bash
# Check current state
supabase migration list

# Repair history (metadata only - doesn't change schema)
supabase migration repair --status reverted <old_version>
supabase migration repair --status applied <current_version>
```

**CAUTION:** Only mark as "applied" if the migration IS actually on the database.

### E2E Tests Failing

If migration tests fail in CI:
1. Check the GitHub Actions logs for the error
2. Fix the migration locally
3. Test with `supabase db reset && npm run test:rls`
4. Push the fix to the PR

### Production Migration Failed

If a migration breaks production:

```bash
# 1. Check what's wrong
# (Use Supabase Dashboard or MCP tools to investigate)

# 2. Create a NEW migration that reverses the changes
# (Don't edit the broken migration - always move forward)
```

Example rollback migration:
```sql
-- 20251202_rollback_rating_column.sql
-- Description: Rollback the rating column added in 20251201

DROP INDEX IF EXISTS idx_lessons_rating;
ALTER TABLE lessons DROP COLUMN IF EXISTS rating;
```

Then push the rollback migration through the normal CI pipeline.

## NPM Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run test:rls` | Test RLS policies |
| `supabase db reset` | Reset local database |
| `supabase migration list` | Show migration status |

## GitHub Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `e2e.yml` | PR to main | Test migrations on TEST db |
| `migrate-production.yml` | Push to main | Apply to PRODUCTION (requires approval) |
| `reset-test-db.yml` | Manual | Reset TEST database if corrupted |

## History

- **2025-11-30:** Implemented 3-part pipeline with TEST database and GitHub Environment approvals
- **Previous:** Used manual `supabase db push` to production
