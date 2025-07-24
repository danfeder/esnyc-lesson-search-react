# Database Migration Safety Checklist

## Pre-Migration Safety Steps

### 1. Create Manual Backup (CRITICAL)
Before ANY migration that modifies existing tables:

```bash
# Export existing lessons data
supabase db dump --data-only -f backup-lessons-$(date +%Y%m%d-%H%M%S).sql

# Or backup specific tables
pg_dump --data-only -t lessons -t user_profiles > backup-$(date +%Y%m%d).sql
```

### 2. Test Migrations Locally First
```bash
# Start local Supabase
supabase start

# Apply migration locally
supabase db push

# Test with sample data
# Verify nothing breaks
```

### 3. Use Development Project
- Create a separate Supabase project for development
- Test migrations there before production
- Clone production data to dev for realistic testing

## Migration Best Practices

### 1. Safe Column Additions
```sql
-- SAFE: Adding nullable columns
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS content_text TEXT;

-- SAFE: With defaults that don't rewrite table
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;
```

### 2. Dangerous Operations to Avoid
```sql
-- DANGEROUS: Dropping columns
ALTER TABLE lessons DROP COLUMN title; -- NO!

-- DANGEROUS: Changing column types
ALTER TABLE lessons ALTER COLUMN grade_levels TYPE text; -- NO!

-- DANGEROUS: Adding NOT NULL without default
ALTER TABLE lessons ADD COLUMN required_field TEXT NOT NULL; -- NO!
```

### 3. Use Transactions
```sql
BEGIN;
-- All your changes here
-- If anything fails, everything rolls back
ALTER TABLE lessons ADD COLUMN content_text TEXT;
ALTER TABLE lessons ADD COLUMN content_hash VARCHAR(64);
COMMIT;
```

## Our Migration Strategy

### Phase 1: Additive Only (SAFE)
We're ONLY adding new columns and tables, never removing or modifying existing ones:

```sql
-- All our changes are SAFE additions
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_text TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_embedding vector(1536);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS canonical_id TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS has_versions BOOLEAN DEFAULT FALSE;
```

### Phase 2: New Tables (SAFE)
Creating new tables has zero risk to existing data:

```sql
CREATE TABLE IF NOT EXISTS lesson_submissions (...);
CREATE TABLE IF NOT EXISTS submission_reviews (...);
CREATE TABLE IF NOT EXISTS lesson_versions (...);
CREATE TABLE IF NOT EXISTS submission_similarities (...);
```

## Rollback Plan

### If Something Goes Wrong:

1. **Immediate Rollback**
```bash
# Supabase tracks migration history
supabase migration repair --status reverted <version>
```

2. **Manual Rollback**
```sql
-- We keep rollback scripts for each migration
-- Example: 
ALTER TABLE lessons DROP COLUMN IF EXISTS content_text;
ALTER TABLE lessons DROP COLUMN IF EXISTS content_embedding;
-- etc.
```

3. **Restore from Backup**
```bash
# Worst case - restore from backup
psql -d your_database < backup-20250122.sql
```

## Testing Checklist

Before applying to production:

- [ ] Migration tested locally with `supabase start`
- [ ] Migration tested on development Supabase project
- [ ] Backup created and download verified
- [ ] Rollback script prepared
- [ ] No breaking changes to existing columns
- [ ] All changes are additive only
- [ ] Team notified of migration window

## Monitoring After Migration

```sql
-- Verify data integrity
SELECT COUNT(*) FROM lessons;
SELECT COUNT(*) FROM lessons WHERE title IS NOT NULL;

-- Check for any errors
SELECT * FROM pg_stat_database WHERE datname = current_database();

-- Verify new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lessons' 
AND column_name IN ('content_text', 'content_embedding', 'content_hash');
```

## Emergency Contacts
- Supabase Support: support.supabase.com
- Database admin: [Your contact]
- Project lead: [Your contact]