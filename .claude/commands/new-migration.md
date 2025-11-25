Create a new Supabase migration. The migration name should be provided: /new-migration add_feature_name

Create the migration file following these requirements:
1. Name format: `YYYYMMDD_<description>.sql` in `supabase/migrations/`
2. Include header comment with description, author, and date
3. For new tables:
   - Add `ENABLE ROW LEVEL SECURITY`
   - Create appropriate RLS policies
   - Add indexes for foreign keys and commonly queried columns
4. Include rollback commands as comments at the bottom
5. Use `IF NOT EXISTS` / `IF EXISTS` for safety

After creation:
1. Run `supabase db push` to apply
2. Run `npm run test:rls` to verify policies

RLS Policy Gotchas to avoid:
- Never query the same table inside a policy (causes infinite recursion)
- Use `SECURITY DEFINER` functions for role checks
- Handle `auth.uid() IS NULL` for anonymous users
