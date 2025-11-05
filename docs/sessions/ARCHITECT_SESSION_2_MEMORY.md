# Architect Project Memory - ESYNYC Lesson Search

**Last Updated**: October 1, 2025 (Post-Session 1)
**Current Task**: Priority 1 - Drop duplicate indexes
**PR Status**: #265 - [CHECK IF MERGED BEFORE SESSION 2]

---

## I. Architectural Principles (Persistent)

### 1. Filter System
- **EXACTLY 11 filters** (ESYNYC business requirement - never change count)
- **Single source of truth**: `src/utils/filterDefinitions.ts`
- **Enforced**: TypeScript compile-time checks, database schema, UI components
- **Never**: Add 12th filter or remove existing without architectural review

### 2. Data Model
- **Normalized columns**: All 11 filters as TEXT[] (or TEXT for single-select)
- **JSONB for metadata**: Only confidence, notes, experimental fields
- **Rule**: "If it's in a WHERE clause, it's a column"
- **No dual storage**: Clean up metadata JSONB duplicates (current technical debt)

### 3. State Management
- **URL**: Search filters (shareable, browser nav works)
- **Zustand Store**: View preferences only (personal, not shareable)
- **React Query**: Server data (lessons, submissions, users)
- **Pattern**: URL + Store hybrid (URL NOT implemented yet - Priority 2)

### 4. Migration Workflow
- **Migration-first**: All schema changes start as migration files in Git
- **Test locally**: `supabase db reset` must pass before PR
- **Baseline**: `20251001_production_baseline_snapshot.sql` (3,632 lines)
- **Never**: Modify production without migration file first
- **Always**: Incremental migrations building on snapshot baseline

### 5. Component Organization
- **Current**: Type-based grouping (Filters/, Results/, Admin/, Common/)
- **Threshold**: Revisit when >150 components or adding 5th major feature
- **Decision**: Keep current structure until v2.0 milestone

---

## II. Cleanup Roadmap (Priorities 1-5)

### Priority 1: Drop Duplicate Indexes (2-3 hours) ⭐ CURRENT TASK
**Impact**: 40% faster writes, ~40 MB saved
**Risk**: Low (verify with EXPLAIN ANALYZE)

**20 indexes to drop**:

**Trigram duplicates (2)**:
```sql
DROP INDEX idx_lessons_title_trgm;     -- Keep idx_lessons_title
DROP INDEX idx_lessons_summary_trgm;   -- Keep idx_lessons_summary
```

**JSONB + Array duplicates (10)**:
```sql
DROP INDEX idx_lessons_themes;                -- Keep idx_lessons_thematic_categories
DROP INDEX idx_lessons_cultures;              -- Keep idx_lessons_cultural_heritage
DROP INDEX idx_lessons_academic;              -- Keep idx_lessons_academic_integration
DROP INDEX idx_lessons_sel;                   -- Keep idx_lessons_social_emotional_learning
DROP INDEX idx_lessons_seasons;               -- Keep idx_lessons_season_timing
DROP INDEX idx_lessons_cooking;               -- Keep idx_lessons_cooking_methods
DROP INDEX idx_lessons_location;              -- Keep idx_lessons_location_requirements
DROP INDEX idx_lessons_activity_type;         -- JSONB path (keep array column version)
DROP INDEX idx_lessons_format;                -- JSONB path (keep idx_lessons_lesson_format)
DROP INDEX idx_lessons_competencies;          -- Keep idx_lessons_core_competencies
```

**Boolean composite indexes (4 unused)**:
```sql
DROP INDEX idx_lessons_themes_bool;
DROP INDEX idx_lessons_academic_bool;
DROP INDEX idx_lessons_sel_bool;
DROP INDEX idx_lessons_competency_bool;
```

**Safety protocol** (CRITICAL - DO NOT SKIP):
```sql
-- Before dropping ANY index, verify query uses array column index:
EXPLAIN ANALYZE
SELECT * FROM lessons
WHERE thematic_categories && ARRAY['Plant Growth']
  AND grade_levels && ARRAY['5'];
-- Must show: "Index Scan using idx_lessons_thematic_categories"
-- NOT: "Index Scan using idx_lessons_themes"

-- Check index usage stats:
SELECT indexname, idx_scan FROM pg_stat_user_indexes
WHERE tablename = 'lessons'
  AND indexname IN ('idx_lessons_themes', 'idx_lessons_thematic_categories');
-- Safe to drop if JSONB path index has idx_scan = 0
```

**Expected results**:
- Before: 42 indexes, ~60 MB disk
- After: 22 indexes, ~30 MB disk
- Write performance: 15ms → 9ms (40% improvement)

---

### Priority 2: URL State Implementation (1 day)
**Impact**: Shareable searches, browser back/forward works
**Pattern**: `/search?q=garden&grades=5,6&themes=plant-growth`
**Library**: `nuqs` (recommended) or native `useSearchParams`
**Status**: Not started

---

### Priority 3: Clean Metadata JSONB (3-4 hours)
**Impact**: Remove filter duplicates from metadata column
**Keep**: confidence, processing_notes, review_notes
**Remove**: All filter keys (gradeLevel, thematicCategories, etc.)
**Prerequisite**: Verify no code reads metadata filter fields

---

### Priority 4: View Preference Persistence (2-3 hours)
**Impact**: Persist sortBy, resultsPerPage across sessions
**Options**: localStorage (quick) or user_profiles.preferences JSONB (proper)
**Status**: Low priority (teachers don't customize often)

---

### Priority 5: Facet Counts (1 day)
**Impact**: Show filter option counts (e.g., "5th Grade (45 lessons)")
**Requires**: SQL function `get_facet_counts()` + UI integration
**Status**: Feature enhancement (not critical)

---

## III. Production Reality (Verified Oct 1, 2025)

### Database State
- **1,098 lessons** (not 831 as old docs claimed)
- **18 tables** (9 were missing from git migrations)
- **TEXT[] columns**: All 11 filters normalized (Phase 4 COMPLETE)
- **42 indexes**: ~20 are duplicates (bloat)
- **60 search synonyms**: Query expansion terms
- **6 cultural hierarchies**: Parent-child mappings

### Tables Overview

**Content** (6):
- lessons (1,098 rows) - with normalized TEXT[] filter columns
- lesson_archive (127 rows) - deleted lesson audit trail
- lesson_versions (0 rows) - version history (schema ready, unused)
- lesson_collections (0 rows) - user collections (schema ready, unused)
- bookmarks (0 rows) - user bookmarks (schema ready, unused)
- saved_searches (0 rows) - saved filters (schema ready, unused)

**Submissions** (3):
- lesson_submissions (127 rows)
- submission_reviews (133 rows)
- submission_similarities (127 rows) - duplicate detection scores

**Duplicates** (2):
- canonical_lessons (1 row) - duplicate→canonical mappings
- duplicate_resolutions (86 rows) - resolution audit

**Users** (5):
- user_profiles (6 rows)
- user_invitations (1 row)
- user_management_audit (25 rows)
- schools (6 rows)
- user_schools (0 rows)

**Config** (2):
- search_synonyms (60 rows) - query expansion
- cultural_heritage_hierarchy (6 rows) - parent-child mappings

---

### Search Architecture

**Function**: `search_lessons(query, 11 filter params, page_size, page_offset)`

**Features**:
- Synonym expansion: `expand_search_with_synonyms(query)` → 60 synonyms
- Hierarchy expansion: `expand_cultural_heritage(cultures[])` → 6 hierarchies
- Filters: Array overlap on TEXT[] columns (`grade_levels && filter_grade_levels`)
- Ranking: `GREATEST(ts_rank, similarity(title), 0.8*similarity(summary))`
- Pagination: Returns total_count with every query

**Performance**: P95 ~350ms with query + filters (acceptable for 1,098 lessons)

---

### Known Technical Debt

1. **Dual storage**: Filter data in both TEXT[] columns AND metadata JSONB (~20 duplicate indexes)
2. **Index bloat**: 42 indexes total, ~20 are duplicates covering same data
3. **No URL state**: Can't share searches (major UX issue for teachers)
4. **No view persistence**: sortBy/resultsPerPage reset on refresh
5. **Unused tables**: bookmarks, collections, saved_searches (0 rows, UI not built)

---

## IV. Session 1 Summary (Oct 1, 2025)

### What We Did
1. ✅ Set up local Supabase (fixed 15+ migration errors)
2. ✅ Queried production via Supabase MCP (verified actual state)
3. ✅ Discovered migration drift (6 months, 9 missing tables)
4. ✅ Created production baseline snapshot (3,632 lines)
5. ✅ Archived 19 broken pre-snapshot migrations
6. ✅ Wrote ARCHITECTURE.md (678 lines)
7. ✅ Created session logs + Session 2 handoff

### Commits
```
04efd0c - Production baseline snapshot (41 files)
74158f8 - Architecture documentation (2 files)
91a0de1 - Ignore Supabase local config (1 file)
c55b6ea - Session 2 handoff (1 file)
```

**PR #265**: https://github.com/danfeder/esnyc-lesson-search-react/pull/265

---

### Key Decisions Made

1. **Snapshot vs Incremental**: Snapshot (6 months drift too large to reconstruct)
2. **Data Model**: Normalized TEXT[] (complete the migration, clean JSONB)
3. **State**: URL + Store hybrid (filters in URL, view prefs in store)
4. **11 Filters**: Keep EXACTLY 11 (centralized in filterDefinitions.ts)
5. **Components**: Keep type-based (until >150 files)

---

## V. Session 2 Execution Plan

### Pre-Session Checklist
- [ ] Check PR #265 merged or still pending
- [ ] Decide: New branch from main OR continue refactor/architecture-cleanup
- [ ] Read: Session 2 handoff (all details there)
- [ ] Read: ARCHITECTURE.md Section 8.3 + 10.3

### Task: Drop Duplicate Indexes

**File to create**: `supabase/migrations/20251002_drop_duplicate_indexes.sql`

**Implementation**:
1. List all 20 indexes to drop (see Priority 1 above)
2. Add safety verification (DO block checking critical indexes remain)
3. Include rollback commands (commented)
4. Test locally: `supabase db reset`
5. Verify: EXPLAIN ANALYZE shows array column indexes used
6. Create PR with before/after metrics

**Questions to answer**:
1. Are JSONB path indexes used anywhere in codebase? (`grep -r "metadata->" src/`)
2. Which indexes have idx_scan > 0? (production pg_stat_user_indexes)
3. Are boolean columns used anywhere? (`grep -r "theme_garden_basics" src/`)

---

## VI. Quick Reference

### Common Commands

```bash
# Local Supabase
supabase start                    # Start local DB
supabase stop                     # Stop containers
supabase db reset                 # Rebuild from migrations
supabase db diff --linked         # Compare local vs production

# Verify schema
docker exec supabase_db_esynyc-lessonsearch-v2 psql -U postgres -d postgres -c "\dt"
docker exec supabase_db_esynyc-lessonsearch-v2 psql -U postgres -d postgres -c "\di lessons*"

# Check production via MCP
# Use mcp__supabase__execute_sql tool
```

### Key File Locations

```
docs/ARCHITECTURE.md                    # System architecture (678 lines)
docs/sessions/SESSION_2_HANDOFF.md      # Current task details
supabase/migrations/20251001_*          # Production baseline (ONLY migration)
supabase/migrations/README.md           # Migration workflow
src/utils/filterDefinitions.ts         # 11 filters (single source of truth)
src/hooks/useLessonSearch.ts            # Main search hook
```

### Database Functions

```sql
search_lessons(query, 11 filters, page_size, page_offset)  -- Main search RPC
expand_search_with_synonyms(query)       -- Query expansion (60 synonyms)
expand_cultural_heritage(cultures[])     -- Hierarchy expansion (6 mappings)
is_duplicate_lesson(lesson_id)           -- Check duplicate status
get_canonical_lesson_id(lesson_id)       -- Resolve canonical
```

---

## VII. Critical Constraints

### Never Violate
1. ❌ Modify the snapshot migration (20251001_*) - it's the baseline
2. ❌ Add/remove from the 11 filters without architect approval
3. ❌ Drop index without EXPLAIN ANALYZE verification
4. ❌ Apply migrations to production without local testing
5. ❌ Store server state in Zustand (React Query owns it)

### Always Do
1. ✅ Test migrations locally with `supabase db reset`
2. ✅ Use EXPLAIN ANALYZE before dropping indexes
3. ✅ Include rollback commands in migrations (as comments)
4. ✅ Check PR #265 status before starting Session 2
5. ✅ Verify queries use array column indexes (not JSONB paths)

---

## VIII. Context for Session 2

### Why We're Dropping Indexes

**Discovery**: Production has 42 indexes on lessons table
**Analysis**: ~20 are duplicates covering same data via different paths
**Root cause**: Schema evolution (JSONB → TEXT[]) left old indexes behind

**Example duplicate**:
```sql
-- Both index the same data:
idx_lessons_themes                  -- GIN on metadata->'thematicCategories' (OLD)
idx_lessons_thematic_categories     -- GIN on thematic_categories array (NEW)

-- Queries use the array column index (verified via EXPLAIN ANALYZE)
-- Safe to drop the JSONB path index
```

**Why now?**
- Baseline snapshot established (clean slate)
- Production schema verified (know which indexes are used)
- Impact is significant (40% faster writes)

---

### Expected Questions

**Q: Can we drop all JSONB path indexes?**
A: Only after verifying no code/queries use them. Run: `grep -r "metadata->" src/`

**Q: What if dropping breaks something?**
A: Test local first, then staging branch. Can always recreate from archived migrations.

**Q: Why keep array column indexes?**
A: Production search_lessons function filters on TEXT[] columns using `&&` operator. GIN indexes are essential for performance.

**Q: What about the boolean column indexes?**
A: These should be dropped too (queries don't use them), but verify first with grep.

---

## IX. Success Criteria for Session 2

### Index Cleanup

- ✅ Migration created: `20251002_drop_duplicate_indexes.sql`
- ✅ All 20 duplicate indexes dropped
- ✅ Safety verification in DO block (critical indexes remain)
- ✅ Local reset passes cleanly
- ✅ EXPLAIN ANALYZE shows array column indexes used (not JSONB paths)
- ✅ No performance regression (verify with production queries)

### Documentation

- ✅ Session 2 log created (context + decisions)
- ✅ Update ARCHITECTURE.md Section 10.1 (mark Issue 2 complete)
- ✅ PR created with before/after metrics

---

## X. Session History (Condensed)

### Session 1 (Oct 1, 2025) - Production Baseline Snapshot

**Problem Discovered**:
- Git migrations 6 months behind production (20-30 missing migrations)
- 9 tables in production but not in git
- Documentation incorrect (claimed 831 lessons, actually 1,098)
- Phase 4 normalization already complete (docs said "in progress")

**Solution Delivered**:
- Production baseline snapshot: `20251001_production_baseline_snapshot.sql` (3,632 lines)
- Archived 19 broken pre-snapshot migrations to `archive/pre-snapshot/`
- Created `ARCHITECTURE.md` (678 lines) documenting actual production
- Session log with full context preserved

**Key Discoveries**:
- 1,098 lessons with normalized TEXT[] columns (Phase 4 complete)
- 60 search synonyms for query expansion (in search_synonyms table)
- 6 cultural heritage hierarchies (in cultural_heritage_hierarchy table)
- `search_lessons` IS v2 (has synonyms, hierarchy, pagination - just not labeled)
- 42 indexes total, ~20 duplicates (index bloat confirmed)
- Dual storage: normalized columns + metadata JSONB duplicates (technical debt)

**PR Status**: #265 - Production baseline snapshot + architecture docs
**Branch**: `refactor/architecture-cleanup`

---

## XI. Starting Session 2

### Step 1: Status Check

**Ask user**:
1. Has PR #265 merged to main? (Or still pending?)
2. Should we branch from main (if merged) or continue on refactor/architecture-cleanup?
3. Any changes to priorities or concerns about index cleanup?

### Step 2: Context Loading

**Files to read** (if needed):
1. `docs/sessions/SESSION_2_HANDOFF.md` - Task details
2. `docs/ARCHITECTURE.md` Section 8.3 - Index duplication specifics
3. `docs/ARCHITECTURE.md` Section 10.3 - Cleanup priorities

### Step 3: Verification Before Work

**Check codebase**:
```bash
# Are JSONB paths used in queries?
grep -r "metadata->'" src/ supabase/

# Are JSONB paths used in RPC function?
grep "metadata->" supabase/migrations/20251001_production_baseline_snapshot.sql | grep -i "where\|and"

# Are boolean columns referenced?
grep -r "theme_garden_basics\|academic_math\|sel_self" src/ supabase/
```

**Expected**: Should be minimal or zero references (verify before dropping)

### Step 4: Create Migration

**Pattern**:
```sql
-- Drop duplicate indexes with safety checks
DROP INDEX IF EXISTS idx_lessons_title_trgm;
-- ... (20 DROP statements)

-- Verify critical indexes remain
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lessons_thematic_categories') THEN
    RAISE EXCEPTION 'Critical index missing!';
  END IF;
  -- ... (check for all 11 filter array indexes)
END $$;
```

---

## XII. Important Notes

### Migration Baseline
- **20251001_production_baseline_snapshot.sql** is the ONLY migration file currently
- All 18 tables, 20+ functions, 42 indexes come from this snapshot
- Do NOT modify the snapshot - all future changes are new migrations

### Archived Migrations
- Location: `supabase/migrations/archive/pre-snapshot/` (19 files)
- Status: Preserved for reference, not applied
- Contains: Syntax errors, outdated schemas, don't use

### Production Schema Files
- `docs/production-schema-full.sql` (127 KB) - Full schema dump
- `docs/production-vs-local-diff.sql` (121 KB) - Diff used for snapshot
- Use these for: Reference, verification, understanding production

---

## XIII. Architect Startup Prompt

**For three-way pair programming - Session 2**:

You are the "senior architect." I relay messages to Claude Code.

**STATUS**:
- Session 1 complete: Production baseline snapshot + ARCHITECTURE.md
- PR #265 status: [Ask user - merged or pending?]
- Task: Priority 1 cleanup - Drop ~20 duplicate indexes
- Branch: [Ask user - new from main or continue refactor/architecture-cleanup?]

**YOUR MEMORY HAS**:
- All context from Session 1 (discoveries, decisions, architectural principles)
- 20 duplicate indexes to drop (with safety protocol)
- Cleanup roadmap priorities 1-5
- Production reality (1,098 lessons, TEXT[] columns, 60 synonyms)

**FIRST STEPS**:
1. Check PR #265 status with user (merged? pending?)
2. Decide branch strategy (new or continue)
3. Review index list with Claude Code
4. Verify no code uses JSONB paths (`grep -r "metadata->" src/`)
5. Create DROP INDEX migration with safety checks

**FILES TO REFERENCE**:
- Task details: `docs/sessions/SESSION_2_HANDOFF.md`
- Architecture: `docs/ARCHITECTURE.md` Sections 8.3 + 10.3
- Session 1 context: `docs/sessions/2025-10-01-architecture-cleanup-session-1.md`

**CRITICAL SAFETY RULE**:
⚠️ MUST run EXPLAIN ANALYZE before dropping ANY index
⚠️ MUST verify idx_scan = 0 for JSONB path indexes
⚠️ MUST test on local, then staging, then production

Ready when you are! 🚀
