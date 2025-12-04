# Periodic Database Baselining Workflow

## Overview

This document describes the process for periodically consolidating database migrations into a fresh baseline snapshot. The goal is to improve onboarding (easier to understand schema) and reduce risk (fewer migration files to replay).

## When to Baseline

### Triggers

- **Primary**: After a major feature has been stable in production for 1-2 weeks
- **Backstop**: When migration count exceeds 15 files after the current baseline

### Decision Criteria

1. Feature work is complete and merged to main
2. Production has been running stable for 1-2 weeks (no hotfixes needed)
3. Check migration count: `ls supabase/migrations/*.sql | wc -l`
4. If stable + (major feature complete OR count > 15) → proceed with baseline

### What "Stable" Means

- No pending fix migrations in progress
- No known bugs requiring schema changes
- No active PRs with migration files

## The Baselining Process

### Pre-Baseline Checklist

- [ ] Major feature stable in production 1-2 weeks, OR migration count > 15
- [ ] No pending PRs with migration files
- [ ] No known bugs requiring schema changes

### Step 1: Prepare

```bash
# Ensure you're on main and up to date
git checkout main && git pull

# Verify local matches production schema
supabase db reset
npm run test:rls  # Should pass
```

### Step 2: Generate Baseline from Production

```bash
# Create timestamped baseline file
supabase db dump --schema-only \
  --db-url "postgresql://postgres.[project-ref]:[password]@..." \
  > supabase/migrations/YYYYMMDD_baseline_snapshot.sql
```

### Step 3: Archive Old Migrations

```bash
# Move all migrations EXCEPT the new baseline to archive
mv supabase/migrations/20251001_*.sql supabase/migrations/archive/
mv supabase/migrations/202511*.sql supabase/migrations/archive/
mv supabase/migrations/202512*.sql supabase/migrations/archive/
# Keep only the new baseline
```

### Step 4: Clean Up Archive Metadata Files

```bash
# Keep .bak and .skip files in archive too
mv supabase/migrations/*.bak supabase/migrations/archive/ 2>/dev/null || true
mv supabase/migrations/*.skip supabase/migrations/archive/ 2>/dev/null || true
```

### Step 5: Verify Locally

```bash
# Reset local DB with ONLY the new baseline
supabase db reset

# Run RLS tests
npm run test:rls

# Start app and smoke test manually
npm run dev
# → Verify: search works, filters work, can view lessons
```

### Step 6: Commit and Push

```bash
git add supabase/migrations/
git commit -m "chore(db): baseline snapshot YYYY-MM-DD

Consolidates migrations from [old baseline date] through [today].
Archived migrations moved to supabase/migrations/archive/"

git push origin main
```

### Step 7: Reset TEST Database

```bash
# Trigger the reset workflow in GitHub Actions
gh workflow run reset-test-db.yml -f reset_type=migrations -f confirm=RESET
```

### Step 8: Verify TEST Environment

```bash
# After reset completes, verify with MCP tools
mcp__supabase-test__execute_sql "SELECT COUNT(*) FROM lessons;"
# → Should return ~800
```

### Post-Baseline Checklist

- [ ] `supabase db reset` with new baseline passes
- [ ] `npm run test:rls` passes
- [ ] `npm run dev` → manual smoke test passes
- [ ] Commit pushed to main
- [ ] TEST database reset workflow completed
- [ ] TEST environment verified
- [ ] Note the baseline date in migrations README

## Edge Cases & Recovery

### What if Local Verification Fails?

- Don't panic — you haven't pushed anything yet
- The issue is likely a dump problem (missing grants, extension dependencies)
- Fix the baseline SQL manually, re-run `supabase db reset`, repeat verification

### What if TEST Reset Fails?

- Check GitHub Actions logs for the specific error
- Most common: migration syntax error in baseline file
- Fix locally, push amendment, re-run reset workflow

### What if Production and Baseline Drift?

- This shouldn't happen if you dump directly from production
- If it does: `supabase db diff` to see what's different, add a fix migration after the baseline

### What About the Production `supabase_migrations` Table?

- Production doesn't need any changes — it already has the schema
- The baseline is only "applied" to fresh environments (local, new TEST)
- Production continues forward with new migrations after the baseline

### What if Someone Has a Local Environment Mid-Baseline?

- They run `supabase db reset` — the new baseline applies cleanly
- No coordination needed; it just works

## History

- **2025-10-01**: Initial baseline created (`20251001_production_baseline_snapshot.sql`)
- **2025-12-04**: This workflow documented
