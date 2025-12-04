---
name: database-migrations
description: Use when creating, editing, or fixing any database migration file. MANDATORY before touching any file in supabase/migrations/. Prevents the critical mistake of editing already-pushed migrations.
---

# Database Migrations Skill

## When This Skill Applies

Use this skill **BEFORE** any of these actions:
- Creating a new migration file
- Editing an existing migration file
- Fixing a bug found in a migration
- Responding to code review feedback on migrations

## Critical Rule

**NEVER edit a migration file that has been pushed to a remote branch.**

```
Once pushed → CI applies to TEST DB → Editing does NOTHING on TEST
                                    → Creates TEST/PROD inconsistency
```

## Mandatory Decision Tree

Before ANY migration file work, follow this decision tree:

### Step 1: What are you doing?

**A) Creating a NEW migration?**
→ Go to "Creating New Migration" section

**B) Editing an EXISTING migration?**
→ Continue to Step 2

### Step 2: Has this migration been pushed to remote?

Run this check:
```bash
git log --oneline origin/main..HEAD -- supabase/migrations/
git log origin/<branch> -- <migration-file>
```

**Answer: NO, it's local only**
→ You may edit, but verify again before pushing

**Answer: YES, it has been pushed**
→ **STOP!** Go to "Fixing a Pushed Migration" section

**Answer: UNSURE**
→ Assume YES. Go to "Fixing a Pushed Migration" section

## Creating New Migration

1. **Create the file:**
   ```bash
   touch supabase/migrations/$(date +%Y%m%d)_<description>.sql
   ```

   For multiple migrations same day, use timestamp:
   ```bash
   touch supabase/migrations/$(date +%Y%m%d%H%M%S)_<description>.sql
   ```

2. **Use the template** from REFERENCE.md

3. **Test locally:**
   ```bash
   supabase db reset
   npm run test:rls
   ```

4. **Verify with local MCP:**
   ```
   mcp__supabase__execute_sql
   ```

5. **Push to PR** - CI will apply to TEST DB

6. **Verify on TEST DB** before merging:
   ```
   mcp__supabase-test__execute_sql
   ```

## Fixing a Pushed Migration

When you find a bug in an already-pushed migration:

1. **DO NOT edit the original migration file**

2. **Create a NEW fix migration:**
   ```bash
   touch supabase/migrations/$(date +%Y%m%d%H%M%S)_fix_<original_name>.sql
   ```

3. **Write the fix** using idempotent patterns:
   - `CREATE OR REPLACE FUNCTION` for functions
   - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for columns
   - `DROP ... IF EXISTS` for removals

4. **Apply fix to TEST DB directly** (since new migration won't auto-run there):
   ```
   mcp__supabase-test__execute_sql
   ```

5. **Push the NEW migration file**

6. **Verify on TEST DB** that fix works

## Checklist (Create TodoWrite items for each)

Before completing migration work:
- [ ] Confirmed no pushed migration files were edited
- [ ] New migrations tested locally with `supabase db reset`
- [ ] RLS policies tested with `npm run test:rls` (if applicable)
- [ ] Changes verified on TEST DB with `mcp__supabase-test__execute_sql`
- [ ] Ready for merge

## Why This Matters

```
LOCAL ──push──► TEST DB (CI auto-applies) ──merge+approve──► PRODUCTION
                     │
                     └── Migration already applied here!
                         Editing the file does NOTHING.
                         PRODUCTION gets different code than TEST ran.
```

This creates:
- Inconsistent environments
- Bugs that work on TEST but fail on PROD (or vice versa)
- Difficult-to-debug issues

## Common Mistakes to Avoid

1. **"It's just a small fix"** → Still create a new migration
2. **"CREATE OR REPLACE is idempotent"** → True, but migration tracking isn't
3. **"I'll just push the edit"** → TEST won't re-run it
4. **"Code review asked for changes"** → Create new migration for the fix

## Reference

See REFERENCE.md for:
- Migration file template
- Common SQL patterns
- RLS policy examples
