Debug an RLS policy error. Analyze the error message and help resolve it.

Steps:
1. Ask for the specific error message if not provided
2. Identify which table and operation is failing
3. Check the relevant RLS policies in `supabase/migrations/`
4. Common issues to check:
   - Is RLS enabled on the table?
   - Does the policy exist for the operation (SELECT/INSERT/UPDATE/DELETE)?
   - Is there infinite recursion (policy queries the same table)?
   - Is `auth.uid()` null for anonymous users?
   - Does the user have the required role?

Provide SQL queries to diagnose:
```sql
-- Check if user is authenticated
SELECT auth.uid();

-- Check user's role
SELECT * FROM user_profiles WHERE id = auth.uid();

-- Check if admin
SELECT is_admin(auth.uid());

-- List policies on a table
SELECT * FROM pg_policies WHERE tablename = 'TABLE_NAME';
```
