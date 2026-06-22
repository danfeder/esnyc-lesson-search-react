Create a new Supabase migration. Usage: /new-migration add_feature_name

**Before any migration file work, follow the `database-migrations` skill** — its decision tree
(`.claude/skills/database-migrations/SKILL.md`) is mandatory and covers the "has this migration
been pushed yet?" rule. Full guidance lives in `supabase/migrations/CLAUDE.md` (the canonical guide).

## Steps

1. Create the migration file:
   - Name format: `YYYYMMDD_<description>.sql` in `supabase/migrations/`
     (use `YYYYMMDDHHMMSS_` for multiple migrations the same day — digits sort before `_` in ASCII)
   - Include header comment with description
   - Use `IF NOT EXISTS` / `IF EXISTS` for safety
   - Include rollback commands as comments at the bottom

2. For new tables, always:
   - Add `ENABLE ROW LEVEL SECURITY`
   - Create appropriate RLS policies (see the skill / canonical guide for the recursion + anonymous-user gotchas)
   - Add indexes for foreign keys and commonly queried columns

3. Test locally:
   ```bash
   supabase db reset      # Apply all migrations
   npm run test:rls       # Verify RLS policies
   ```

4. Create a PR — DO NOT run `supabase db push` to production manually!
   - CI applies migrations to the TEST database and runs E2E tests
   - Verify on TEST DB with `mcp__supabase-test__execute_sql` **before merging**
   - After merge, the production migration requires manual approval

See `supabase/migrations/CLAUDE.md` for complete guidelines.
