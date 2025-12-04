# Database Migration Reference

## Migration File Template

```sql
-- =====================================================
-- Migration: YYYYMMDD_description.sql
-- =====================================================
-- Description: What this migration does
-- Issue: #XXX (if applicable)

-- =====================================================
-- CHANGES
-- =====================================================

-- Your SQL here
-- Use IF NOT EXISTS / IF EXISTS for safety

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- DROP POLICY IF EXISTS "..." ON "...";
-- DROP TABLE IF EXISTS ...;
```

## Fix Migration Template

```sql
-- =====================================================
-- Migration: YYYYMMDDHHMMSS_fix_<original_name>.sql
-- =====================================================
-- Description: Fix for <original migration>
-- Issue found: <describe the bug>
-- Original migration: YYYYMMDD_original.sql

-- =====================================================
-- FIX
-- =====================================================

-- Use idempotent patterns:
-- CREATE OR REPLACE FUNCTION ...
-- ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
-- DROP ... IF EXISTS ...

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- Restore previous version if needed
```

## Common SQL Patterns

### Creating Tables with RLS

```sql
CREATE TABLE IF NOT EXISTS my_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rows"
  ON my_table FOR SELECT
  USING (auth.uid() = user_id);
```

### Adding Columns Safely

```sql
ALTER TABLE my_table
ADD COLUMN IF NOT EXISTS new_column text;
```

### Creating/Updating Functions

```sql
CREATE OR REPLACE FUNCTION my_function(p_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- function body
  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;
```

### Checking Table Existence Before Operations

```sql
-- Use this when a table may not exist in all environments
IF EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'my_table'
) THEN
  DELETE FROM my_table WHERE condition;
END IF;
```

### Safe Index Creation

```sql
CREATE INDEX IF NOT EXISTS idx_table_column
ON my_table(column_name);
```

## RLS Policy Patterns

### Avoid Recursion (WRONG)

```sql
-- WRONG: queries same table in policy
CREATE POLICY "x" ON users USING (
  EXISTS (SELECT 1 FROM users WHERE role='admin')
);
```

### Use SECURITY DEFINER Functions (CORRECT)

```sql
-- CORRECT: use function to check roles
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = uid AND role IN ('admin', 'super_admin')
  );
END;
$$;

CREATE POLICY "Admins can do everything"
  ON my_table FOR ALL
  USING (is_admin(auth.uid()));
```

### Handle Anonymous Users

```sql
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
```

## MCP Tools Reference

### Local Development
```
mcp__supabase__execute_sql       # Query local DB
mcp__supabase__list_tables       # List local tables
```

### TEST Database (PR Verification)
```
mcp__supabase-test__execute_sql  # Verify with real data
mcp__supabase-test__list_tables  # List test tables
```

### Production (Use Carefully)
```
mcp__supabase-remote__execute_sql  # Query production
```

## Environment Reference

| Environment | Project Ref | Purpose |
|-------------|-------------|---------|
| Local | Docker | Development |
| Test | `rxgajgmphciuaqzvwmox` | CI validation |
| Production | `jxlxtzkmicfhchkhiojz` | Live data |
