Use this command before ANY work involving database migration files.

## ⚠️ CRITICAL RULE

**NEVER edit a migration file that has been pushed to a remote branch.**

Once a migration is pushed:
- CI applies it to TEST DB automatically
- The migration will NOT re-run even if you edit the file
- Editing creates inconsistency between TEST and what will run on PRODUCTION

## Decision Tree (MANDATORY)

Before ANY migration file edit, answer these questions:

### Question 1: What are you doing?

**A) Creating a NEW migration** → Proceed to "Creating New Migration" below

**B) Editing an EXISTING migration** → Answer Question 2

### Question 2: Has this migration been pushed to remote?

Check with: `git log --oneline origin/main..HEAD -- supabase/migrations/` or `git log origin/<branch> -- <migration-file>`

**NO, it's local only** → You may edit, but verify again before pushing

**YES, it has been pushed** → **STOP! Create a NEW migration file instead:**
```bash
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_fix_<description>.sql
```

**UNSURE** → Assume YES and create a new migration

## Creating New Migration

1. Create file with timestamp:
   ```bash
   touch supabase/migrations/$(date +%Y%m%d)_<description>.sql
   ```

2. Use template from `supabase/migrations/CLAUDE.md`

3. Test locally:
   ```bash
   supabase db reset
   npm run test:rls
   ```

4. Push to PR - CI will apply to TEST DB

5. Verify on TEST DB with `mcp__supabase-test__execute_sql` before merging

## Fixing a Migration After Push

When you find a bug in an already-pushed migration:

1. **DO NOT** edit the original migration file
2. Create a NEW migration:
   ```bash
   touch supabase/migrations/$(date +%Y%m%d%H%M%S)_fix_<original_name>.sql
   ```
3. The fix migration should correct the issue (use CREATE OR REPLACE for functions, ALTER for tables)
4. Apply the fix directly to TEST DB using `mcp__supabase-test__execute_sql` since the new migration won't run there until next CI
5. Push the new migration file

## Checklist (Create TodoWrite items)

Before completing migration work, verify:
- [ ] No pushed migration files were edited
- [ ] New migrations tested locally with `supabase db reset`
- [ ] RLS policies tested with `npm run test:rls`
- [ ] Changes verified on TEST DB before merge

## Why This Matters

```
LOCAL  ──push──►  TEST DB (CI auto-applies)  ──merge+approve──►  PRODUCTION
                       │
                       └── Migration already applied here!
                           Editing the file does NOTHING.
```

See `supabase/migrations/CLAUDE.md` for complete guidelines.
