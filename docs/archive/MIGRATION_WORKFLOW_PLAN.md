# Database Migration Automation Plan

## Overview

This plan outlines the implementation of automated database migrations for the ESYNYC Lesson Search application with appropriate safeguards.

## Current State

| Component | Status |
|-----------|--------|
| Local Supabase | ✅ Working (`supabase start`) |
| Test Supabase | ✅ Configured (`rxgajgmphciuaqzvwmox`) |
| Production Supabase | ✅ Configured (`jxlxtzkmicfhchkhiojz`) |
| E2E Tests | ✅ Running against test DB via Netlify previews |
| Claude Database Review | ✅ Reviews migration files in PRs |
| Automated Migrations | ❌ Not implemented |

## Target State

### PR Workflow (Test Database)

```
PR Created/Updated
       │
       ▼
┌─────────────────────────────────────┐
│  Check if migrations changed        │
│  (supabase/migrations/**/*.sql)     │
└─────────────────────────────────────┘
       │
       ▼ (only if changed)
┌─────────────────────────────────────┐
│  Dry-run: Show pending migrations   │
│  (`supabase db push --dry-run`)     │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Apply migrations to TEST database  │
│  (`supabase db push`)               │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Wait for Netlify deploy preview    │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Run E2E tests                      │
└─────────────────────────────────────┘
```

### Merge Workflow (Production Database)

```
PR Merged to main
       │
       ▼
┌─────────────────────────────────────┐
│  Check if migrations changed        │
│  (supabase/migrations/**/*.sql)     │
└─────────────────────────────────────┘
       │
       ▼ (only if changed)
┌─────────────────────────────────────┐
│  All CI tests must pass             │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Dry-run: Show pending migrations   │
│  (`supabase db push --dry-run`)     │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  ⏸️  WAIT for manual approval       │
│  (GitHub Environment protection)    │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Apply migrations to PRODUCTION     │
│  (`supabase db push`)               │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Post summary to workflow run       │
└─────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Update E2E Workflow (Test DB Migrations)

**File:** `.github/workflows/e2e.yml`

**Changes:**
1. Add path filter to only run migration steps when SQL files change
2. Install Supabase CLI
3. Run dry-run and display output
4. Apply migrations to test database
5. Continue with existing E2E test flow

**New Steps to Add:**
```yaml
- name: Check for migration changes
  id: migration-check
  uses: dorny/paths-filter@v2
  with:
    filters: |
      migrations:
        - 'supabase/migrations/**/*.sql'

- name: Setup Supabase CLI
  if: steps.migration-check.outputs.migrations == 'true'
  uses: supabase/setup-cli@v1
  with:
    version: latest

- name: Show pending migrations (dry-run)
  if: steps.migration-check.outputs.migrations == 'true'
  run: |
    supabase link --project-ref rxgajgmphciuaqzvwmox
    echo "## Pending Migrations for TEST Database" >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
    supabase db push --dry-run 2>&1 | tee -a $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

- name: Apply migrations to TEST database
  if: steps.migration-check.outputs.migrations == 'true'
  run: supabase db push
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

**Dependencies:**
- `dorny/paths-filter@v2` - Detect file changes
- `supabase/setup-cli@v1` - Install Supabase CLI

---

### Phase 2: Create Production Migration Workflow

**File:** `.github/workflows/migrate-production.yml` (NEW)

**Trigger:** Push to `main` branch

**Key Features:**
- Only runs when migration files are changed
- Requires all CI checks to pass first
- Shows dry-run output
- Requires manual approval via GitHub Environment
- Applies migrations after approval

**Full Workflow:**
```yaml
name: Production Database Migration

on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**/*.sql'

jobs:
  check-migrations:
    name: Check Migration Changes
    runs-on: ubuntu-latest
    outputs:
      has_migrations: ${{ steps.check.outputs.has_migrations }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Check for new migrations
        id: check
        run: |
          if git diff --name-only HEAD~1 HEAD | grep -q "supabase/migrations/.*\.sql$"; then
            echo "has_migrations=true" >> $GITHUB_OUTPUT
            echo "New migrations detected"
          else
            echo "has_migrations=false" >> $GITHUB_OUTPUT
            echo "No new migrations"
          fi

  dry-run:
    name: Migration Dry Run
    needs: check-migrations
    if: needs.check-migrations.outputs.has_migrations == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Link to production project
        run: supabase link --project-ref jxlxtzkmicfhchkhiojz
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Show pending migrations (dry-run)
        run: |
          echo "## 🔍 Pending Migrations for PRODUCTION" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "The following migrations will be applied after approval:" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo '```sql' >> $GITHUB_STEP_SUMMARY
          supabase db push --dry-run 2>&1 | tee -a $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  apply-migrations:
    name: Apply to Production
    needs: [check-migrations, dry-run]
    if: needs.check-migrations.outputs.has_migrations == 'true'
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://supabase.com/dashboard/project/jxlxtzkmicfhchkhiojz
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Link to production project
        run: supabase link --project-ref jxlxtzkmicfhchkhiojz
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Apply migrations to PRODUCTION
        run: |
          echo "## ✅ Applying Migrations to PRODUCTION" >> $GITHUB_STEP_SUMMARY
          supabase db push 2>&1 | tee -a $GITHUB_STEP_SUMMARY
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Verify migration success
        run: |
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "## 📋 Current Migration Status" >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY
          supabase migration list 2>&1 | tee -a $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

### Phase 3: GitHub Environment Setup

**Requires manual configuration by user:**

1. Go to: `https://github.com/danfeder/esnyc-lesson-search-react/settings/environments`

2. Create environment named `production`:
   - Click "New environment"
   - Name: `production`
   - Click "Configure environment"

3. Configure protection rules:
   - ✅ Required reviewers: Add yourself
   - ✅ Wait timer: 0 minutes (or add delay if preferred)
   - Optional: Restrict to `main` branch only

4. No secrets needed (uses existing `SUPABASE_ACCESS_TOKEN`)

---

### Phase 4: Documentation Updates

**Update CLAUDE.md:**
- Add migration workflow section
- Document the approval process
- Add troubleshooting guide

**Update supabase/migrations/README.md:**
- Document naming conventions
- Explain the automated pipeline
- Add rollback procedures

---

## Safeguards Summary

| Safeguard | Test DB | Production |
|-----------|---------|------------|
| Only run if migrations changed | ✅ | ✅ |
| Dry-run displayed in workflow summary | ✅ | ✅ |
| Claude reviews migration files | ✅ (existing) | ✅ (existing) |
| E2E tests must pass | ✅ | N/A (after merge) |
| All CI tests must pass | ✅ | ✅ |
| Manual approval required | ❌ | ✅ |
| Migration output logged | ✅ | ✅ |

---

## Secrets Required

| Secret | Purpose | Status |
|--------|---------|--------|
| `SUPABASE_ACCESS_TOKEN` | CLI authentication | ✅ Added |

---

## Rollback Procedure

If a migration causes issues:

### For Test Database:
```bash
# Reset test database to match production
supabase db dump --data-only -f /tmp/prod_data.sql --project-ref jxlxtzkmicfhchkhiojz
psql <test-connection-string> -c "TRUNCATE ALL TABLES CASCADE"
psql <test-connection-string> -f /tmp/prod_data.sql
```

### For Production:
1. Create a rollback migration file that reverses the changes
2. Push the rollback migration through the normal PR process
3. Emergency: Use Supabase dashboard to manually fix

---

## Testing the Implementation

After implementing, test with:

1. Create a test migration:
```bash
# Create a harmless test migration
echo "-- Test migration $(date +%s)
SELECT 1;" > supabase/migrations/$(date +%Y%m%d%H%M%S)_test_migration.sql
```

2. Create a PR with this migration
3. Verify:
   - [ ] Dry-run output appears in workflow summary
   - [ ] Migration applied to test database
   - [ ] E2E tests pass
   - [ ] Claude reviews the migration

4. Merge the PR
5. Verify:
   - [ ] Production workflow triggers
   - [ ] Dry-run output appears
   - [ ] Approval request appears in GitHub
   - [ ] After approval, migration applies to production

6. Clean up:
   - Create another PR to remove the test migration
   - Or leave it (it's harmless)

---

## Timeline

| Phase | Task | Estimated Time |
|-------|------|----------------|
| 1 | Update E2E workflow | 15 min |
| 2 | Create production workflow | 20 min |
| 3 | User configures GitHub Environment | 5 min |
| 4 | Documentation updates | 10 min |
| 5 | Testing with sample migration | 15 min |
| **Total** | | **~1 hour** |

---

## Questions Before Implementation

1. **Test DB Reset Policy**: If a migration fails on test DB, should we auto-reset it from production? Or require manual intervention?

2. **Notification Preferences**: Want Slack/email notifications when migrations run? (Can add later)

3. **Branch Protection**: Should we require the migration workflow to pass before PRs can merge?
