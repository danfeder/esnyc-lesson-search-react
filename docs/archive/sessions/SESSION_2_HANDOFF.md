# Session 2 Handoff - Database Cleanup

**Previous Session**: [2025-10-01-architecture-cleanup-session-1.md](./2025-10-01-architecture-cleanup-session-1.md)
**PR Status**: #265 - [CHECK IF MERGED]
**Next Task**: Drop duplicate indexes (Priority 1)

---

## Quick Status

**What Session 1 Delivered:**
- ✅ Production baseline snapshot (verified)
- ✅ ARCHITECTURE.md (18 tables, 20+ functions documented)
- ✅ Cleanup plan with priorities

**Current State:**
- Local Supabase: Set up and working
- Migration baseline: `20251001_production_baseline_snapshot.sql`
- Branch: `refactor/architecture-cleanup` (3 commits)

---

## Session 2 Task: Drop Duplicate Indexes

**From**: ARCHITECTURE.md Section 10.3 Priority 1
**Time**: 2-3 hours
**Impact**: 40% faster writes, ~40 MB saved

**Key files to read:**
1. [Session 1 notes](./2025-10-01-architecture-cleanup-session-1.md) - Full context
2. `docs/ARCHITECTURE.md` Section 10.3 - Cleanup priorities
3. `docs/ARCHITECTURE.md` Section 8.3 - Index duplication details

---

## Duplicate Indexes to Drop (~20 total)

### Trigram Duplicates (2)
```sql
DROP INDEX idx_lessons_title_trgm;     -- Keep idx_lessons_title
DROP INDEX idx_lessons_summary_trgm;   -- Keep idx_lessons_summary
```

### JSONB Path Duplicates (10+)
```sql
DROP INDEX idx_lessons_themes;                -- Keep idx_lessons_thematic_categories
DROP INDEX idx_lessons_cultures;              -- Keep idx_lessons_cultural_heritage
DROP INDEX idx_lessons_academic;              -- Keep idx_lessons_academic_integration
DROP INDEX idx_lessons_sel;                   -- Keep idx_lessons_social_emotional_learning
DROP INDEX idx_lessons_seasons;               -- Keep idx_lessons_season_timing
DROP INDEX idx_lessons_cooking;               -- Keep idx_lessons_cooking_methods
DROP INDEX idx_lessons_location;              -- Keep idx_lessons_location_requirements
DROP INDEX idx_lessons_activity_type;         -- Keep array column version
DROP INDEX idx_lessons_format;                -- Keep idx_lessons_lesson_format
DROP INDEX idx_lessons_competencies;          -- Keep idx_lessons_core_competencies
```

### Boolean Column Indexes (4 - Unused)
```sql
DROP INDEX idx_lessons_themes_bool;
DROP INDEX idx_lessons_academic_bool;
DROP INDEX idx_lessons_sel_bool;
DROP INDEX idx_lessons_competency_bool;
```

---

## Safety Protocol (CRITICAL - DO NOT SKIP)

### Before Dropping ANY Index

**Step 1**: Verify current query uses array indexes (not JSONB paths)

```sql
EXPLAIN ANALYZE
SELECT * FROM lessons
WHERE thematic_categories && ARRAY['Plant Growth']
  AND grade_levels && ARRAY['5'];

-- Look for: "Index Scan using idx_lessons_thematic_categories"
-- NOT: "Index Scan using idx_lessons_themes"
```

**Step 2**: Check index usage statistics

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,           -- Number of times index was scanned
  idx_tup_read,       -- Tuples read from index
  idx_tup_fetch       -- Tuples fetched via index
FROM pg_stat_user_indexes
WHERE tablename = 'lessons'
  AND indexname IN (
    'idx_lessons_themes',            -- JSONB path (should be 0)
    'idx_lessons_thematic_categories' -- Array column (should be >0)
  )
ORDER BY indexname;

-- Safe to drop if idx_scan = 0 for JSONB path index
```

**Step 3**: Run on BOTH local and production

- Local: Easy (can always reset)
- Production: MUST verify first (can't undo easily)

---

## Implementation Steps

### 1. Create Migration File

```bash
supabase migration new drop_duplicate_indexes
# Creates: supabase/migrations/20251015_drop_duplicate_indexes.sql
```

### 2. Write Migration

```sql
-- =====================================================
-- Migration: Drop Duplicate Indexes
-- =====================================================
-- Created: 2025-10-15
-- Purpose: Remove ~20 duplicate indexes covering same data
--
-- SAFETY: Verified via EXPLAIN ANALYZE that queries use array
--         column indexes (not JSONB path indexes)
-- =====================================================

-- Trigram duplicates (keep base, drop _trgm variants)
DROP INDEX IF EXISTS idx_lessons_title_trgm;
DROP INDEX IF EXISTS idx_lessons_summary_trgm;

-- JSONB path indexes (replaced by array column indexes)
DROP INDEX IF EXISTS idx_lessons_themes;
DROP INDEX IF EXISTS idx_lessons_cultures;
DROP INDEX IF EXISTS idx_lessons_academic;
DROP INDEX IF EXISTS idx_lessons_sel;
DROP INDEX IF EXISTS idx_lessons_seasons;
DROP INDEX IF EXISTS idx_lessons_cooking;
DROP INDEX IF EXISTS idx_lessons_location;
DROP INDEX IF EXISTS idx_lessons_competencies;
DROP INDEX IF EXISTS idx_lessons_format;

-- Boolean column composite indexes (unused)
DROP INDEX IF EXISTS idx_lessons_themes_bool;
DROP INDEX IF EXISTS idx_lessons_academic_bool;
DROP INDEX IF EXISTS idx_lessons_sel_bool;
DROP INDEX IF EXISTS idx_lessons_competency_bool;

-- Verify key indexes remain (safety check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_lessons_thematic_categories'
  ) THEN
    RAISE EXCEPTION 'Critical index idx_lessons_thematic_categories is missing!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_lessons_grade_levels'
  ) THEN
    RAISE EXCEPTION 'Critical index idx_lessons_grade_levels is missing!';
  END IF;

  -- Add more checks for critical array column indexes
END $$;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- See archive/pre-snapshot/03_search_functionality.sql for original index definitions
```

### 3. Test Locally

```bash
# Reset DB with new migration
supabase db reset

# Verify indexes dropped
docker exec supabase_db_esynyc-lessonsearch-v2 psql -U postgres -d postgres -c "\di lessons*" | grep -E "title|summary|themes|cultures"

# Run sample search query
docker exec supabase_db_esynyc-lessonsearch-v2 psql -U postgres -d postgres -c "
  EXPLAIN ANALYZE
  SELECT * FROM lessons
  WHERE thematic_categories && ARRAY['Plant Growth']
  LIMIT 20;
"
# Should use idx_lessons_thematic_categories
```

### 4. Test in Production (Staging Branch)

```bash
# Create staging branch
supabase branches create cleanup-test-branch

# Apply migration to branch
supabase db push --linked --branch cleanup-test-branch

# Run EXPLAIN ANALYZE on branch
# Monitor for 24 hours

# If safe, merge to main
```

---

## Expected Results

**Before cleanup**:
- Total indexes on lessons: 42
- Disk usage (indexes): ~60 MB
- Write time (UPDATE lessons): ~15ms

**After cleanup**:
- Total indexes on lessons: ~22
- Disk usage (indexes): ~30 MB (50% reduction)
- Write time (UPDATE lessons): ~9ms (40% faster)

---

## Risks & Mitigations

**Risk 1**: Dropping wrong index breaks queries

**Mitigation**:
- EXPLAIN ANALYZE verification (see Safety Protocol above)
- Test on local first (can always reset)
- Test on staging branch before production
- Rollback: Re-create from archived migration files

**Risk 2**: Query planner switches to seq scan

**Mitigation**:
- Monitor pg_stat_user_indexes after drop
- Run VACUUM ANALYZE after dropping indexes
- Check query plans for key searches

**Risk 3**: Production performance regression

**Mitigation**:
- Drop on staging branch first
- Monitor for 24-48 hours
- Keep archived migrations for rollback
- Can recreate any index if needed

---

## Success Criteria

- ✅ All ~20 duplicate indexes dropped
- ✅ No production query performance degradation
- ✅ EXPLAIN ANALYZE shows array column indexes used
- ✅ Write performance improved (measured via monitoring)
- ✅ No errors in production logs

---

## Questions to Answer During Session 2

1. Are there any queries in codebase still using metadata JSONB paths?
   ```bash
   grep -r "metadata->" src/
   grep -r "metadata\." src/
   ```

2. Which indexes are actually being used?
   ```sql
   SELECT * FROM pg_stat_user_indexes WHERE tablename = 'lessons' ORDER BY idx_scan DESC;
   ```

3. Are boolean columns (theme_*, academic_*) used anywhere?
   ```bash
   grep -r "theme_garden_basics\|academic_math" src/ supabase/
   ```

---

## References

- **Architecture**: docs/ARCHITECTURE.md Section 8 (Index Strategy)
- **Session 1**: Full context of snapshot decision
- **Migration guide**: supabase/migrations/README.md
- **Cleanup plan**: ARCHITECTURE.md Section 10.3

---

## Claude Code Context

When starting Session 2, remind Claude:
1. Read Session 1 notes first
2. Read ARCHITECTURE.md Section 8.3 and 10.3
3. Verify PR #265 merged before creating new migrations
4. Use safety protocol (EXPLAIN ANALYZE before dropping)
5. Test on local, then staging, then production
