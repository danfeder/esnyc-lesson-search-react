# Database Migration Guidelines for Claude

**IMPORTANT: Read this entire file before making ANY database changes.**

## The 3-Part Database Pipeline

This project uses a 3-environment database pipeline with automated CI/CD:

| Environment | Project Ref | Purpose | How Changes Are Applied |
|-------------|-------------|---------|------------------------|
| **Local** | Docker container | Development & testing | `supabase db reset` |
| **Test** | `rxgajgmphciuaqzvwmox` | CI validation | Automatic via GitHub Actions on PR |
| **Production** | `jxlxtzkmicfhchkhiojz` | Live user data | After merge + manual approval |

## Two Types of Database Changes

### Schema Changes (MUST use migrations)
These change the **structure** of the database:
- Creating/dropping tables
- Adding/removing columns
- Creating indexes
- Adding RLS policies
- Creating functions/triggers

**Rule: ALL schema changes MUST go through migration files.**

### Data Changes (Can use MCP tools)
These change the **content** inside tables:
- Adding/updating/deleting rows
- Importing lesson data
- Fixing incorrect data

**Rule: Data changes can use MCP tools directly, but be careful with production.**

## Workflow for Schema Changes

### Step 1: Create Migration File

```bash
# Create timestamped migration file
touch supabase/migrations/$(date +%Y%m%d)_description.sql
```

**Naming:** `YYYYMMDD_short_description.sql` where YYYYMMDD has no separators (e.g., `20251201_add_rating_column.sql` for Dec 1, 2025)

**Multiple migrations on same day:** Use timestamp format `YYYYMMDDHHMMSS_description.sql` to control ordering:
- `20251204140000_first_migration.sql` (runs first - 2:00 PM)
- `20251204160000_second_migration.sql` (runs second - 4:00 PM)

Supabase uses string sorting on the numeric prefix before the first underscore, so `20251204140000` < `20251204160000` < `20251204_` (underscore > digit in ASCII).

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

**Required elements:**
1. Description comment at top
2. Use `IF NOT EXISTS` / `IF EXISTS` for safety
3. Include rollback commands as comments
4. Enable RLS on any new tables

### Step 3: Test Locally

```bash
# Reset local DB and apply all migrations
supabase db reset

# Verify RLS policies work
npm run test:rls
```

### Step 4: Create PR with Migration

```bash
git checkout -b feat/add-rating-column
git add supabase/migrations/
git commit -m "feat(db): add rating column to lessons"
git push origin feat/add-rating-column
# Create PR via gh or GitHub UI
```

### Step 5: CI Automatically Tests on TEST Database

When the PR is created:
1. GitHub Actions detects migration files changed
2. Migrations are applied to TEST database automatically
3. RLS tests run
4. E2E tests run against Netlify preview

### Step 6: MANDATORY - Verify on TEST Database with Real Data

**Before merging, you MUST test the changes on TEST DB using MCP tools:**

```sql
-- Use mcp__supabase-test__execute_sql to verify changes
-- Example: Test a new function
SELECT * FROM your_new_function() LIMIT 5;

-- Example: Verify new table/column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'your_table';

-- Example: Test RLS policy
SELECT * FROM your_table LIMIT 5;
```

**Why this is mandatory:**
- Local DB has minimal seed data (5 lessons)
- TEST DB has production-like data (~800 lessons)
- Only TEST DB reveals issues with real data patterns
- CI passes ≠ changes work correctly with real data

### Step 7: After Merge - Approve Production Deployment

After PR is merged to main:
1. `migrate-production.yml` workflow triggers
2. Dry-run shows what will change
3. **User must manually approve** in GitHub Actions
4. Migrations apply to production

## Migration Iteration Best Practices

### The Problem: Migrations Only Run Once

Once a migration is applied to TEST DB (via CI), it won't re-run even if you edit the file. This creates a challenge when code review feedback requires changes to a migration.

### Solution: Local-First Development

**BEFORE pushing a PR with migrations:**

1. **Iterate locally until confident**
   ```bash
   # Make changes to migration file
   # Reset and test
   supabase db reset
   npm run test:rls

   # Test the function/table works
   # Use mcp__supabase__execute_sql for verification

   # Repeat until satisfied
   ```

2. **Test with realistic scenarios locally**
   - Test edge cases (NULL values, empty arrays, special characters)
   - Test permission checks work correctly
   - Test error handling paths

3. **Only push when migration is "final"**
   - The first push to PR triggers TEST DB migration
   - After that, the migration is locked on TEST DB

### When Fixes Are Needed After TEST DB Apply

If code review or TEST DB verification reveals issues:

**Option 1: Create a new migration (Recommended)**
```bash
# Original migration already applied: 20251201_add_feature.sql
# Create fix migration:
touch supabase/migrations/$(date +%Y%m%d)_fix_feature_issue.sql
```

This is fine! Multiple small migrations are normal. Benefits:
- Clear audit trail of changes
- Each migration is atomic and tested
- No risk of TEST/PROD divergence

**Option 2: Reset TEST DB (only if appropriate)**
If TEST DB data isn't critical and changes are extensive:
- Contact project owner about resetting TEST DB
- After reset, original migration can be edited

### Avoiding Migration Proliferation

To minimize the need for fix migrations:

1. **Thorough local testing** - Catch issues before pushing
2. **Use `CREATE OR REPLACE`** - Functions can be updated idempotently
3. **Use `IF NOT EXISTS`** - Tables/columns are safe to re-run
4. **Review SQL carefully** - Check for:
   - String escaping (use `format()` with `%L` for user data)
   - NULL handling
   - Permission checks
   - Edge cases

### When to Squash Migrations

Consider squashing migrations:
- Before major releases
- When a feature has 3+ related migrations
- During scheduled maintenance windows

**How to squash** (for future reference):
1. Create a combined migration with all changes
2. Mark old migrations as applied in production
3. Replace old migrations with combined one for new environments

### Summary

| Situation | Action |
|-----------|--------|
| Writing new migration | Iterate locally, push when ready |
| Bug found in review | Create new fix migration |
| Major issue found | Consider TEST DB reset (coordinate with team) |
| Too many small migrations | Squash during maintenance |

## MCP Tools Usage

### For LOCAL Database (use freely)
```
mcp__supabase__execute_sql       # Query local DB
mcp__supabase__list_tables       # List local tables
mcp__supabase__apply_migration   # Apply migration locally
```

### For TEST Database (MANDATORY for PR verification)
```
mcp__supabase-test__execute_sql  # Verify migrations with real data
mcp__supabase-test__list_tables  # List test tables
```

**Use TEST DB to verify changes before merging PRs!**
This is the only way to test with production-like data.

### For PRODUCTION Database (use carefully)
```
mcp__supabase-remote__execute_sql       # Query production
mcp__supabase-remote__list_tables       # List production tables
```

**NEVER use `mcp__supabase-remote__apply_migration` for schema changes!**
Schema changes must go through migration files and the CI pipeline.

## Critical Rules

1. **NEVER** make schema changes directly in Supabase Studio
2. **NEVER** run DDL (CREATE, ALTER, DROP) directly on production
3. **ALWAYS** create a migration file for schema changes
4. **ALWAYS** test locally with `supabase db reset` first
5. **ALWAYS** include rollback commands in migrations
6. **ALWAYS** enable RLS on new tables
7. **ALWAYS** wait for E2E tests to pass before merging

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
-- Use IF NOT EXISTS for safety

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- DROP POLICY IF EXISTS "..." ON "...";
-- DROP TABLE IF EXISTS ...;
```

## RLS Best Practices

### Always Enable RLS
```sql
CREATE TABLE new_table (...);
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
```

### Avoid Recursion
```sql
-- WRONG: queries same table in policy
CREATE POLICY "x" ON users USING (
  EXISTS (SELECT 1 FROM users WHERE role='admin')
);

-- CORRECT: use SECURITY DEFINER function
CREATE OR REPLACE FUNCTION is_admin(uid uuid) RETURNS boolean
AS $$ ... $$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Handle Anonymous Users
```sql
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
```

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| infinite recursion | Use SECURITY DEFINER function |
| permission denied | Add GRANT statements |
| column already exists | Use IF NOT EXISTS |
| migration history mismatch | See troubleshooting below |

## Troubleshooting

### Migration History Mismatch
If `supabase db push` fails with version mismatch:

```bash
# Check current state
supabase migration list

# Repair history (metadata only)
supabase migration repair --status reverted <old_version>
supabase migration repair --status applied <current_version>
```

### Local Database Issues
```bash
# Complete reset
supabase db reset

# If that fails, restart Supabase
supabase stop
supabase start
supabase db reset
```

## Current State

- **Baseline:** `20251001_production_baseline_snapshot.sql`
- **Latest:** Check `supabase/migrations/` for most recent file
- **Test project:** `rxgajgmphciuaqzvwmox`
- **Production project:** `jxlxtzkmicfhchkhiojz`

## GitHub Secrets (for reference)

The CI pipeline uses these secrets:
- `SUPABASE_ACCESS_TOKEN` - API access
- `SUPABASE_DB_PASSWORD_TEST` - Test database password
- `SUPABASE_SERVICE_ROLE_KEY_TEST` - Test service role
- `VITE_SUPABASE_ANON_KEY_TEST` - Test anon key
