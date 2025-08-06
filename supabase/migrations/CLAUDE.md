# Database Migrations

## ⚠️ CRITICAL RLS GOTCHAS

1. **RLS Must Be Enabled** - YOU MUST enable RLS on EVERY table
2. **Policy Order Matters** - Policies are evaluated in order of creation
3. **Service Role Bypasses** - Service role key bypasses ALL RLS policies
4. **Recursion Issues** - Policies calling functions that query same table = INFINITE LOOP
5. **Migration Numbers** - MUST be sequential or migrations will fail

## 🚨 RLS Policy Gotchas & Solutions

### The Recursion Trap
```sql
-- ❌ WRONG - Causes infinite recursion
CREATE POLICY "Check user role" ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles  -- RECURSIVE!
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ✅ CORRECT - Use function with SECURITY DEFINER
CREATE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admins can view" ON table_name
  FOR SELECT
  USING (is_admin(auth.uid()));
```

### The Missing RLS Enable
```sql
-- ❌ WRONG - Forgot to enable RLS
CREATE TABLE lessons (
  id uuid PRIMARY KEY,
  title text
);
-- Anyone can read/write everything!

-- ✅ CORRECT - ALWAYS enable RLS
CREATE TABLE lessons (
  id uuid PRIMARY KEY,
  title text
);
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;  -- CRITICAL!

-- Then add policies
CREATE POLICY "Public read" ON lessons
  FOR SELECT USING (true);
```

### The auth.uid() Null Trap
```sql
-- ❌ WRONG - Fails for anonymous users
CREATE POLICY "Users view own" ON table_name
  FOR SELECT
  USING (user_id = auth.uid());  -- NULL for anon!

-- ✅ CORRECT - Handle null auth
CREATE POLICY "Users view own" ON table_name
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND 
    user_id = auth.uid()
  );
```

## 📝 Migration File Pattern

```sql
-- Migration: 20250131_add_feature_name.sql
-- Description: Add feature X to support Y
-- Author: Your Name
-- Date: 2025-01-31

-- ============================================
-- FORWARD MIGRATION
-- ============================================

-- 1. Create table with RLS enabled
CREATE TABLE IF NOT EXISTS new_feature (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 2. CRITICAL: Enable RLS
ALTER TABLE new_feature ENABLE ROW LEVEL SECURITY;

-- 3. Create indexes
CREATE INDEX idx_new_feature_user_id ON new_feature(user_id);

-- 4. Add RLS policies
CREATE POLICY "Users manage own" ON new_feature
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ROLLBACK COMMANDS (as comments)
-- ============================================
-- DROP POLICY IF EXISTS "Users manage own" ON new_feature;
-- DROP INDEX IF EXISTS idx_new_feature_user_id;
-- DROP TABLE IF EXISTS new_feature;
```

## 🔧 Common Migration Patterns

### Adding Column with Default
```sql
-- Safe way to add NOT NULL column
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS status text;

UPDATE lessons SET status = 'published' WHERE status IS NULL;

ALTER TABLE lessons 
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN status SET DEFAULT 'draft';
```

### Creating Helper Functions
```sql
-- Function to check permissions
CREATE OR REPLACE FUNCTION has_role(check_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() 
    AND role = check_role
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION has_role TO authenticated;
```

### Complex RLS Policy
```sql
CREATE POLICY "Complex access control" ON lessons
  FOR SELECT
  USING (
    -- Public lessons
    is_published = true
    OR
    -- Own drafts
    (author_id = auth.uid() AND is_published = false)
    OR
    -- Reviewers see all
    has_role('reviewer')
    OR
    -- Admins see all
    has_role('admin')
  );
```

## 🐛 Common Migration Errors & Fixes

| Error | Cause | Solution |
|-------|-------|----------|
| "infinite recursion detected" | RLS policy queries same table | Use SECURITY DEFINER function |
| "permission denied for schema" | Missing grants | `GRANT USAGE ON SCHEMA public TO authenticated` |
| "violates foreign key constraint" | Wrong order of operations | Drop constraints, modify, recreate |
| "column already exists" | Re-running migration | Use `IF NOT EXISTS` clause |
| "cannot drop table because other objects depend on it" | Foreign keys reference table | Use `CASCADE` or drop FKs first |

## 🧪 Testing Migrations

```bash
# Test on local database
supabase db reset  # Start fresh
supabase db push   # Apply all migrations

# Test specific migration
psql $DATABASE_URL < migrations/20250131_feature.sql

# Test rollback
psql $DATABASE_URL < migrations/rollback_20250131.sql

# Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'lessons';
```

## ⚠️ Production Migration Checklist

- [ ] Test migration on local database
- [ ] Test migration on staging/branch
- [ ] Include rollback commands as comments
- [ ] Check for RLS policies on new tables
- [ ] Verify no infinite recursion in policies
- [ ] Test as different user roles
- [ ] Backup database before applying
- [ ] Have rollback script ready

## 📊 Performance Considerations

```sql
-- Add indexes for RLS policy conditions
CREATE INDEX idx_user_profiles_role 
ON user_profiles(role) 
WHERE is_active = true;

-- Partial indexes for common queries
CREATE INDEX idx_lessons_published 
ON lessons(created_at DESC) 
WHERE is_published = true;

-- Use EXPLAIN to verify policy performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM lessons WHERE title LIKE 'Garden%';
```

## 🔑 Current Migration Files

- `01-05`: Core schema and RLS setup
- `06-11`: User management and security fixes
- `20250201+`: Feature additions and fixes

NEVER modify existing numbered migrations - create new ones!