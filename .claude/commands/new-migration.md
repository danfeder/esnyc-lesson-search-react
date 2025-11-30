Create a new Supabase migration. Usage: /new-migration add_feature_name

## Steps

1. Create the migration file:
   - Name format: `YYYYMMDD_<description>.sql` in `supabase/migrations/`
   - Include header comment with description
   - Use `IF NOT EXISTS` / `IF EXISTS` for safety
   - Include rollback commands as comments at the bottom

2. For new tables, always:
   - Add `ENABLE ROW LEVEL SECURITY`
   - Create appropriate RLS policies
   - Add indexes for foreign keys and commonly queried columns

3. Test locally:
   ```bash
   supabase db reset      # Apply all migrations
   npm run test:rls       # Verify RLS policies
   ```

4. Create a PR - DO NOT run `supabase db push` manually!
   - The CI pipeline will automatically apply migrations to TEST database
   - E2E tests will run
   - After merge, migrations require manual approval for production

## RLS Policy Gotchas

- Never query the same table inside a policy (causes infinite recursion)
- Use `SECURITY DEFINER` functions for role checks
- Handle `auth.uid() IS NULL` for anonymous users

## Important

This project uses a 3-part database pipeline:
- LOCAL: Test with `supabase db reset`
- TEST: Automatic via CI when PR is created
- PRODUCTION: Requires manual approval after merge

See `supabase/migrations/CLAUDE.md` for complete guidelines.
