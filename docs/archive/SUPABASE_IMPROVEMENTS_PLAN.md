# Supabase Infrastructure Improvements Plan

## Overview

This document outlines planned improvements to the Supabase development workflow, identified during the migration history cleanup on 2025-11-30.

## Completed (Quick Wins)

- [x] **Migration workflow documentation** - `docs/MIGRATION_WORKFLOW.md`
- [x] **NPM scripts for common operations** - `db:types`, `db:reset`, `db:push`
- [x] **Seed data for local development** - `supabase/seed.sql`
- [x] **Staging environment documentation** - How to activate/use `dev_staging`

---

## Phase 1: CI/CD Integration (Priority: High)

### 1.1 Auto-regenerate TypeScript Types on Migration Changes

**Problem:** Types can drift from actual schema when someone forgets to run `db:types`.

**Solution:** GitHub Action that regenerates types when migrations change.

```yaml
# .github/workflows/db-types.yml
name: Regenerate Database Types

on:
  push:
    paths:
      - 'supabase/migrations/**/*.sql'
    branches:
      - main

jobs:
  regenerate-types:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Start local Supabase
        run: supabase start

      - name: Generate types
        run: supabase gen types typescript --local > src/types/database.types.ts

      - name: Check for changes
        id: check
        run: |
          git diff --quiet src/types/database.types.ts || echo "changed=true" >> $GITHUB_OUTPUT

      - name: Commit updated types
        if: steps.check.outputs.changed == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add src/types/database.types.ts
          git commit -m "chore: regenerate database types"
          git push
```

**Effort:** 2-3 hours
**Files:** `.github/workflows/db-types.yml`

---

### 1.2 Migration Validation in CI

**Problem:** Migrations could have syntax errors or break RLS tests.

**Solution:** Run migration validation on PRs that touch SQL files.

```yaml
# Add to existing claude-database-review.yml or create new workflow
- name: Validate migrations
  run: |
    supabase start
    supabase db reset --local
    npm run test:rls
```

**Effort:** 1-2 hours
**Files:** `.github/workflows/ci.yml` (modify existing)

---

## Phase 2: Edge Function Deployment (Priority: Medium)

### 2.1 Edge Function CI/CD Pipeline

**Problem:** Edge Functions are deployed manually, risking inconsistency.

**Solution:** Automated deployment workflow.

```yaml
# .github/workflows/edge-functions.yml
name: Deploy Edge Functions

on:
  push:
    paths:
      - 'supabase/functions/**'
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1

      - name: Deploy all functions
        run: |
          supabase functions deploy detect-duplicates --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase functions deploy process-submission --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          # Add other functions as needed
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

**Effort:** 3-4 hours
**Files:**
- `.github/workflows/edge-functions.yml`
- Update GitHub secrets with `SUPABASE_ACCESS_TOKEN`

### 2.2 Edge Function Testing

**Problem:** No automated tests for Edge Functions.

**Solution:** Add local Edge Function tests using Deno test framework.

```typescript
// supabase/functions/detect-duplicates/index.test.ts
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

Deno.test("detect-duplicates handles empty input", async () => {
  // Test implementation
});
```

**Effort:** 4-6 hours per function
**Files:** `supabase/functions/*/index.test.ts`

---

## Phase 3: Development Experience (Priority: Medium)

### 3.1 Pre-commit Hook for Migration Validation

**Problem:** Developers might commit broken migrations.

**Solution:** Husky pre-commit hook that validates SQL syntax.

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check if any SQL files are staged
if git diff --cached --name-only | grep -q "supabase/migrations/.*\.sql$"; then
  echo "🔍 Validating migrations..."

  # Start Supabase if not running
  supabase status || supabase start

  # Try to apply migrations
  supabase db reset --local || {
    echo "❌ Migration validation failed!"
    exit 1
  }

  echo "✅ Migrations validated"
fi
```

**Effort:** 2-3 hours
**Dependencies:** husky package
**Files:**
- `.husky/pre-commit`
- `package.json` (add husky)

### 3.2 Database Branching for Feature Development

**Problem:** Testing migrations in isolation is difficult.

**Solution:** Use Supabase branching (requires Pro plan) or document manual branch workflow.

**For teams without Pro plan:**
```bash
# Create a feature-specific local database
supabase db reset --local
# Make changes, test, then push to staging before production
```

**Effort:** Documentation only (2 hours) or Pro plan upgrade
**Files:** `docs/MIGRATION_WORKFLOW.md` (update)

---

## Phase 4: Monitoring & Backup (Priority: Low)

### 4.1 Automated Backup Verification

**Problem:** No verification that backups are actually working.

**Solution:** Scheduled job to test backup restoration.

```yaml
# .github/workflows/backup-check.yml (monthly)
name: Verify Backups

on:
  schedule:
    - cron: '0 0 1 * *'  # First of each month

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Download latest backup
        run: supabase db dump --linked -f backup.sql

      - name: Verify backup can be restored
        run: |
          supabase start
          psql postgresql://postgres:postgres@localhost:54322/postgres < backup.sql

      - name: Notify on failure
        if: failure()
        run: # Send alert
```

**Effort:** 3-4 hours
**Files:** `.github/workflows/backup-check.yml`

### 4.2 Query Performance Monitoring

**Problem:** No visibility into slow queries in production.

**Solution:** Set up Supabase logging/monitoring dashboards.

**Steps:**
1. Enable detailed logging in Supabase Dashboard
2. Set up alerts for slow queries (>1s)
3. Create Grafana dashboard or use Supabase built-in tools

**Effort:** 4-6 hours
**Files:** None (dashboard configuration)

---

## Implementation Priority

| Phase | Item | Priority | Effort | Impact |
|-------|------|----------|--------|--------|
| 1.1 | Auto-regenerate types | High | 2-3h | Prevents type drift |
| 1.2 | Migration validation CI | High | 1-2h | Catches errors early |
| 2.1 | Edge Function deployment | Medium | 3-4h | Consistent deploys |
| 3.1 | Pre-commit hooks | Medium | 2-3h | Developer experience |
| 2.2 | Edge Function testing | Medium | 4-6h | Quality assurance |
| 3.2 | Database branching docs | Low | 2h | Documentation |
| 4.1 | Backup verification | Low | 3-4h | Disaster recovery |
| 4.2 | Query monitoring | Low | 4-6h | Performance visibility |

---

## Recommended Order of Implementation

1. **Phase 1.2** - Migration validation (quick, high impact)
2. **Phase 1.1** - Auto-regenerate types (prevents common issue)
3. **Phase 2.1** - Edge Function deployment (consistency)
4. **Phase 3.1** - Pre-commit hooks (developer experience)
5. Remaining items as time permits

---

## GitHub Issues to Create

When ready to implement, create issues for:

- [ ] `chore: add CI workflow for auto-regenerating database types`
- [ ] `chore: add migration validation to CI pipeline`
- [ ] `chore: add Edge Function deployment workflow`
- [ ] `chore: add pre-commit hooks for migration validation`
- [ ] `test: add Edge Function unit tests`
