# Database Migrations Guide

## 🎯 Current State (As of October 1, 2025)

This project uses a **production baseline snapshot** approach.

**Active Migration**: `20251001_production_baseline_snapshot.sql` (3,403 lines)

**All pre-snapshot migrations archived to**: `archive/pre-snapshot/` (19 files)

---

## Why We Snapshotted

### The Problem

We discovered severe drift between committed migrations and production database:

| Issue | Impact |
|-------|--------|
| **Missing tables** | 9 tables existed in production but not in migration files |
| **Schema evolution** | Production had TEXT[] normalized columns; migrations had JSONB |
| **Function differences** | Production `search_lessons` included synonym expansion; migrations didn't |
| **RLS policy drift** | Completely different policies between prod and migrations |
| **Timeline gap** | ~6 months of production changes not captured in Git |

**Root cause**: Schema changes were applied directly to production without committing migration files.

### The Solution

**Accept production as the source of truth** and snapshot it:

```bash
# How we created the snapshot (2025-10-01):
supabase db diff --linked --schema public > production-diff.sql
# Added header comments explaining the snapshot
# Created: 20251001_production_baseline_snapshot.sql
```

---

## What's in the Snapshot

### Tables (18 total)

**Created from Production**:
- `bookmarks` - User lesson bookmarks
- `saved_searches` - User saved search filters
- `canonical_lessons` - Duplicate resolution tracking
- `lesson_archive` - Deleted lesson audit trail (127 archived lessons)
- `cultural_heritage_hierarchy` - Parent-child culture relationships (6 entries)
- `search_synonyms` - Search expansion (60 synonym mappings)
- `lesson_collections` - User-created collections
- `lesson_versions` - Version history
- `submission_similarities` - Duplicate detection scores

**Removed (Didn't Exist in Production)**:
- `duplicate_pairs` - Replaced by `canonical_lessons`
- `duplicate_resolution_archive` - Replaced by `lesson_archive`

### Normalized TEXT[] Columns (Production Reality)

```sql
-- ALL filter columns are TEXT[] (not JSONB):
grade_levels TEXT[] NOT NULL DEFAULT '{}'
thematic_categories TEXT[]
cultural_heritage TEXT[]
season_timing TEXT[]
academic_integration TEXT[]
social_emotional_learning TEXT[]
cooking_methods TEXT[]
core_competencies TEXT[]
garden_skills TEXT[]
cooking_skills TEXT[]
activity_type TEXT[]
location_requirements TEXT[]
main_ingredients TEXT[]
observances_holidays TEXT[]
tags TEXT[]

-- Single-select field:
lesson_format TEXT
```

### Search Functions

**Primary**: `search_lessons(search_query, filter params, page_size, page_offset)`
- Expands query with synonyms
- Expands cultural heritage hierarchically
- Filters on normalized TEXT[] columns
- Returns paginated results with total count
- Ranks by: ts_rank + trigram similarity

**Helpers**:
- `expand_search_with_synonyms(text)` - Query expansion using search_synonyms table
- `expand_cultural_heritage(text[])` - Hierarchy expansion using cultural_heritage_hierarchy table

### RLS Policies

Production uses **simpler, more permissive policies**:
- Public read on `lessons`, `search_synonyms`, `cultural_heritage_hierarchy`
- Authenticated users can manage own submissions/bookmarks/collections
- Reviewers can view all submissions
- Admins have full access to user management

(Our migrations had more restrictive/complex policies - production simplified them)

---

## Archived Migrations

Location: `supabase/migrations/archive/pre-snapshot/`

**What's there** (19 files):
- `01-11_*.sql` - Original "consolidated" base migrations
- `2025*_*.sql` - Dated feature additions and fixes

**Why archived**:
- They don't match production (outdated)
- Contain syntax errors (fixed during local Supabase setup)
- Missing ~20-30 migrations that were run in production but never committed

**Preserved for**:
- Historical reference
- Understanding schema evolution
- Forensic analysis if needed

---

## How to Use

### For New Developers (Fresh Start)

```bash
# 1. Start Docker Desktop
# 2. Initialize Supabase
supabase start

# That's it! Snapshot applies automatically.
```

You now have a local database matching production (structure, not data).

---

### For Existing Developers (Migrating from Old Approach)

If you have a local Supabase from before October 1, 2025:

```bash
# Reset to production baseline
supabase stop
supabase db reset
supabase start
```

This drops your old local DB and builds from the snapshot.

---

### Syncing with Production

To pull latest production changes:

```bash
# Check for differences
supabase db diff --linked --schema public

# If differences exist, create migration
supabase db diff --linked --schema public -f supabase/migrations/20251015_sync_production.sql
```

---

## Creating Future Migrations

### Naming Convention

```
20251015_descriptive_name.sql
```

Where:
- `20251015` = Date (YYYYMMDD format)
- `descriptive_name` = What it does (snake_case)

**Examples**:
```
✅ Good: 20251015_add_lesson_difficulty_rating.sql
✅ Good: 20251020_create_user_activity_feed.sql
✅ Good: 20251101_index_optimization_for_search.sql
❌ Bad:  20251015_fix.sql
❌ Bad:  20251015_update.sql
❌ Bad:  20251015_misc_changes.sql
```

### Migration Template

```sql
-- =====================================================
-- Migration: [Brief description]
-- =====================================================
-- Created: YYYY-MM-DD
-- Author: [Your name]
-- Purpose: [Why this change is needed]
--
-- Changes:
-- - [Specific change 1]
-- - [Specific change 2]
-- =====================================================

-- Step 1: [Description]
CREATE TABLE IF NOT EXISTS new_feature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
);

-- Step 2: Enable RLS
ALTER TABLE new_feature ENABLE ROW LEVEL SECURITY;

-- Step 3: Add policies
CREATE POLICY "policy_name" ON new_feature
  FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- ROLLBACK (commented)
-- =====================================================
-- DROP POLICY IF EXISTS "policy_name" ON new_feature;
-- DROP TABLE IF EXISTS new_feature CASCADE;
```

### Testing Locally

```bash
# 1. Create migration
supabase migration new add_feature_name

# 2. Edit the .sql file

# 3. Test it
supabase db reset  # Applies all migrations from scratch

# 4. If errors, fix and reset again

# 5. Verify schema
supabase db diff --linked
```

### Deployment Workflow

```bash
# 1. Test locally (db reset passes)
# 2. Commit migration file
# 3. Create PR
# 4. After approval, push to production:
supabase db push --linked
```

---

## Migration Rules

1. ✅ **Idempotent**: Use `IF EXISTS`, `IF NOT EXISTS`
2. ✅ **Rollback**: Include commented DROP statements
3. ✅ **RLS**: Enable on ALL new tables
4. ✅ **Test**: Reset local DB before committing
5. ❌ **NEVER**: Modify existing migration files
6. ❌ **NEVER**: Use numbered prefixes (01, 02) - use dates
7. ❌ **NEVER**: Apply to production without PR review

---

## Current Schema Overview

### Lessons Table (1,098 rows in production)

**Filter Columns** (consult stakeholders before changes):
1. `grade_levels` TEXT[]
2. `thematic_categories` TEXT[]
3. `season_timing` TEXT[]
4. `core_competencies` TEXT[]
5. `cultural_heritage` TEXT[]
6. `location_requirements` TEXT[]
7. `activity_type` TEXT[]
8. `lesson_format` TEXT (single-select)
9. `academic_integration` TEXT[]
10. `social_emotional_learning` TEXT[]
11. `cooking_methods` TEXT[]

**Additional Metadata**:
- `metadata` JSONB - Confidence scores, processing notes
- `search_vector` tsvector - Full-text search
- `content_embedding` vector(1536) - Semantic search
- `content_hash` - Exact duplicate detection

### Search Configuration Tables

**search_synonyms** (60 rows):
```
term          | synonyms[]
--------------|-----------
garden        | [vegetable garden, planting, outdoor]
butternut     | [winter squash, squash]
...
```

**cultural_heritage_hierarchy** (6 rows):
```
parent        | children[]
--------------|-----------
Asian         | [East Asian, Southeast Asian, South Asian]
Americas      | [Latin American, Caribbean, North American]
...
```

---

## Troubleshooting

### Common Errors

| Error | Solution |
|-------|----------|
| "Migration failed" | Check Docker is running: `docker ps` |
| "Schema drift detected" | Run `supabase db diff --linked` to see changes |
| "RLS policy violation" | Check user role in production user_profiles table |
| "Function doesn't exist" | Verify snapshot was fully applied: `supabase db reset` |
| "Syntax error in migration" | Check for inline index/constraint issues (see pre-snapshot archives for examples) |

### Verifying Snapshot Applied

```sql
-- Check for key production tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('search_synonyms', 'canonical_lessons', 'lesson_archive', 'bookmarks');
-- Should return 4 rows

-- Check normalized columns exist
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'lessons'
  AND column_name IN ('grade_levels', 'thematic_categories', 'cultural_heritage')
  AND data_type = 'ARRAY';
-- Should return 3 rows with data_type = 'ARRAY'
```

---

## Related Documentation

**Schema References**:
- `docs/production-schema-full.sql` - Complete production schema dump (127 KB)
- `docs/production-vs-local-diff.sql` - Diff used to create snapshot (121 KB)

**Architecture**:
- `docs/architecture-decisions.md` - Why we made key decisions
- `docs/search-architecture-v2.md` - Search system design (COMPLETED in production!)
- `docs/archive/architecture-cleanup-guide.md` - Cleanup progress tracker (archived)

**Safety**:
- `docs/DATABASE_SAFETY_CHECKLIST.md` - Pre-migration checklist
- `docs/RLS_SECURITY.md` - RLS policy patterns
- `supabase/migrations/CLAUDE.md` - Migration guidelines for Claude Code

---

## Migration History

| Date | File | Description |
|------|------|-------------|
| 2025-10-01 | `20251001_production_baseline_snapshot.sql` | **Production baseline snapshot** - Full sync with production state. Includes 9 missing tables, normalized TEXT[] columns, search expansion functions, and production RLS policies. Replaces 19 pre-snapshot migrations. |

Future migrations will be added here as they're created.

---

## Questions?

- **Why snapshot instead of incremental migrations?** - 6 months of production changes were never committed. Reconstructing would take weeks and risk errors.
- **Can we rollback?** - Yes, archived migrations are in `archive/pre-snapshot/` but they don't match production (known drift).
- **What about production data?** - This snapshot is schema-only. Data remains in production. Use `supabase db dump --linked --data-only` to export data if needed.
- **When to snapshot again?** - Only if drift accumulates again (should be rare now with proper workflow).

---

## Workflow Going Forward

```
Code Change → Create Migration → Test Locally → PR → Merge → Push to Production
```

**No more production-first changes!** All schema changes must:
1. Start as migration files in Git
2. Be tested locally (`supabase db reset`)
3. Get PR review
4. Then pushed to production
