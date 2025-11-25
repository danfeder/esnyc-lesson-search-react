Run RLS policy tests for this Supabase project:

1. Run `npm run test:rls`
2. If tests fail, analyze the output and suggest fixes
3. Check for common RLS issues:
   - Missing `ENABLE ROW LEVEL SECURITY` on new tables
   - Infinite recursion in policies (policies that query the same table)
   - Missing `auth.uid() IS NOT NULL` checks for anonymous access

Report the results with specific recommendations if issues are found.
