# Migration Guidelines

**See also:** `/docs/MIGRATION_WORKFLOW.md` for the complete workflow.

## Critical: Never Edit Production Directly

- **NEVER** create tables/policies in Supabase Studio
- **ALWAYS** create a migration file first
- **ALWAYS** test locally with `supabase db reset --local`
- **ALWAYS** push migrations with `supabase db push`

## Migration Pattern

```sql
-- Migration: 20250131_description.sql
-- Description: What this migration does

-- Create table with RLS
CREATE TABLE IF NOT EXISTS feature (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feature ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_feature_user_id ON feature(user_id);

CREATE POLICY "Users manage own" ON feature
  FOR ALL
  USING (auth.uid() = user_id);

-- Rollback:
-- DROP POLICY IF EXISTS "Users manage own" ON feature;
-- DROP TABLE IF EXISTS feature;
```

## Key Rules

1. Enable RLS on every new table
2. Use `IF NOT EXISTS` / `IF EXISTS`
3. Include rollback commands as comments
4. Run `npm run test:rls` after applying

## RLS Gotchas

### Recursion Trap
```sql
-- Wrong: queries same table in policy
CREATE POLICY "x" ON users USING (
  EXISTS (SELECT 1 FROM users WHERE role='admin')
);

-- Correct: use SECURITY DEFINER function
CREATE FUNCTION is_admin(uid uuid) RETURNS boolean
AS $$ ... $$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Null auth.uid()
```sql
-- Handle anonymous users
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
```

## Testing

```bash
supabase db reset   # Fresh start
supabase db push    # Apply migrations
npm run test:rls    # Verify policies
```

## Common Errors

| Error | Fix |
|-------|-----|
| infinite recursion | Use SECURITY DEFINER function |
| permission denied | Add GRANT statements |
| column already exists | Use IF NOT EXISTS |
| migration history mismatch | `supabase migration repair` (see workflow doc) |

## Pushing to Production

```bash
# 1. Verify what will be pushed
supabase db push --dry-run

# 2. Push migrations
supabase db push --include-all

# 3. Verify success
supabase migration list
```

## Current State (as of 2025-11-30)

- **Baseline:** `20251001_production_baseline_snapshot.sql`
- **Latest:** `20251129_teacher_review_access_policy.sql`
- **Production project:** `jxlxtzkmicfhchkhiojz`
