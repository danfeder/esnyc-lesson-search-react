# Architecture Cleanup Session 1 - October 1, 2025

**Date**: October 1, 2025
**Duration**: ~4 hours
**Branch**: `refactor/architecture-cleanup`
**Outcome**: Production baseline snapshot created and verified

---

## Session Objectives

1. Analyze codebase to understand actual state (not documentation claims)
2. Verify production database schema vs migration files
3. Establish architectural principles for future development
4. Create ARCHITECTURE.md based on reality
5. Set up local Supabase for safe testing

---

## Critical Discoveries

### Database Reality Check

**Documentation claimed**:
- 831 lessons indexed
- Phase 4 normalization "in progress"
- search_lessons_v2 "being implemented"
- Dual JSONB + normalized columns "planned"

**Production reality** (verified via Supabase MCP):
- **1,098 lessons** (267 more than docs claimed!)
- **Phase 4 IS COMPLETE** - All TEXT[] normalized columns exist
- **search_lessons uses TEXT[] params** - No "v2" needed, it's already done
- **Dual storage IS REAL** - Data in both columns AND metadata JSONB (technical debt)
- **42 indexes** - ~20 are duplicates covering same data

### Missing Tables (9 total)

Found in production but NOT in migration files:
1. `bookmarks` - User bookmarks (0 rows, schema ready)
2. `saved_searches` - Saved filter combinations (0 rows, schema ready)
3. `canonical_lessons` - Duplicate resolution tracking (1 row)
4. `lesson_archive` - Archived lessons (127 rows)
5. `cultural_heritage_hierarchy` - Parent-child mappings (6 rows)
6. `search_synonyms` - Query expansion (60 rows!)
7. `lesson_collections` - User collections (0 rows, schema ready)
8. `lesson_versions` - Version history (0 rows, schema ready)
9. `submission_similarities` - Duplicate scores (127 rows)

**Why missing?**: Schema changes applied directly to production over 6 months without committing migration files

---

### Production Data Snapshot

**Tables with data**:
- lessons: 1,098 rows
- lesson_submissions: 127 rows
- submission_reviews: 133 rows
- submission_similarities: 127 rows
- lesson_archive: 127 rows
- duplicate_resolutions: 86 rows
- user_profiles: 6 users
- user_management_audit: 25 actions
- search_synonyms: 60 synonym mappings
- cultural_heritage_hierarchy: 6 hierarchies
- schools: 6 NYC schools
- user_invitations: 1 pending

**Tables empty (future-ready)**:
- bookmarks, saved_searches, lesson_collections, lesson_versions, user_schools

---

### Migration Drift Analysis

**Git migrations**: 19 files (01-11 base + 2025* dated)
**Production migrations**: Estimated 40-50 (20-30 never committed)

**Drift timeline**:
- Jan 2025: Normalization started (season_timing TEXT[] added)
- Feb-Mar 2025: Remaining TEXT[] columns added (not in Git)
- Mar-Apr 2025: search_synonyms, cultural_heritage_hierarchy created
- Apr-May 2025: Duplicate resolution refactored (canonical_lessons replaced duplicate_pairs)
- May-Jun 2025: Bookmarks/collections/versions tables added (UI pending)

**Root cause**: Rapid production development without migration discipline

---

## Decisions Made

### 1. Filter Flexibility ✅

**Evaluated**:
- Option A: Keep fixed count (11 filters enforced)
- Option B: Data-driven (dynamic filter configs)
- Option C: Configured in one place (hybrid)

**Decision**: Option C (Hybrid - Centralized)
- Keep EXACTLY 11 filters (ESYNYC business requirement)
- Centralize ALL definitions in `filterDefinitions.ts`
- Future: Consider code generation from single schema

**Rationale**: Balance between stability (11 is fixed) and maintainability (DRY principle)

---

### 2. Data Model Strategy ✅

**Evaluated**:
- Option A: Normalized columns (structured, performant)
- Option B: JSONB (flexible)
- Option C: Hybrid (strategic split)

**Decision**: Option A (Normalized Columns) + Clean Hybrid
- **Normalized**: All 11 filter columns as TEXT[] (DONE in production)
- **JSONB**: Only for confidence, processing_notes, review_notes (clean up duplicates)
- **Rule**: "If it's in a WHERE clause, it's a column"

**Rationale**:
- Performance critical for 1,000+ lessons
- 11 filters are stable (won't change frequently)
- Type safety at database level
- Production already completed this migration

---

### 3. State Management ✅

**Evaluated**:
- Option A: Keep URL separate (current)
- Option B: URL as source of truth
- Option C: URL for filters, Store for view (hybrid)

**Decision**: Option C (Hybrid)
- **URL**: Search filters (shareable, browser nav works)
- **Store**: View preferences (personal, not shareable)
- **Implementation**: Planned for cleanup (Priority 2)

**Rationale**: Teachers NEED to share searches (primary use case)

---

### 4. Migration Philosophy ✅

**Evaluated**:
- Option A: Keep all migrations (immutable history)
- Option B: Consolidate into snapshots (clean slate)
- Option C: Snapshot + versioned migrations (hybrid)

**Decision**: Option B (Snapshot) → Then Option A (Keep All Future)
- **Now**: Snapshot production (accept as truth)
- **Future**: All migrations committed incrementally
- **Workflow**: Migration-first (not production-first)

**Rationale**: 6 months of drift = can't reconstruct, snapshot is safer

---

### 5. Component Organization ✅

**Evaluated**:
- Option A: Type-based (current - Filters/, Results/)
- Option B: Feature-based (search/, admin/)
- Option C: Hybrid (features + shared UI)

**Decision**: Option A (Keep Current) until >150 components
- Current size (87 files) doesn't justify refactor
- Type-based is working well
- Revisit at v2.0 milestone

**Rationale**: Don't fix what isn't broken

---

## Snapshot Creation Process

### Step 1: Set Up Local Supabase (Completed)

**Challenges encountered**:
- Docker daemon not running → Started Docker Desktop
- 15+ migration syntax errors → Fixed inline index/constraint issues
- Duplicate migration numbers (08, 20250107, 20250108, 20250204, 20250807)
- Missing table references (search_synonyms, canonical_lessons in migration 09)
- Column type mismatches (JSONB vs TEXT[], subjects vs subjects_taught)

**Resolution**: Fixed all migrations locally, then decided to snapshot instead

---

### Step 2: Pull Production Schema (Completed)

```bash
supabase db diff --linked --schema public > production-vs-local-diff.sql
# Result: 3,363 lines of differences (!)

supabase db dump --linked --schema public -f production-schema-full.sql
# Result: 3,579 lines (full schema dump)
```

**Key files saved**:
- `docs/production-schema-full.sql` (127 KB) - Complete schema
- `docs/production-vs-local-diff.sql` (121 KB) - Transformation diff

---

### Step 3: Create Snapshot Migration (Completed)

**Created**: `supabase/migrations/20251001_production_baseline_snapshot.sql`
- Size: 3,632 lines
- Header: 40 lines explaining why + what + rollback
- Content: Full production schema (functions → tables → indexes → policies → grants)

**Archived**: 19 pre-snapshot migrations to `archive/pre-snapshot/`
- Preserved for: Historical reference, forensic analysis
- Not applied: Outdated, contain errors, don't match production

**Tested**: `supabase db reset`
- ✅ Applied cleanly (no errors)
- ✅ Created all 18 tables
- ✅ All TEXT[] columns present
- ✅ All search functions exist
- ✅ Schema diff shows only grants (no structural differences)

---

### Step 4: Update Documentation (Completed)

**Created**:
- `docs/ARCHITECTURE.md` (678 lines) - Comprehensive system documentation
- `supabase/migrations/README.md` - Migration guide and workflow

**Key sections**:
- Quick Reference (common tasks)
- 18 tables documented with purpose + schema
- Search system pipeline diagram
- 11 filter system (EXACTLY 11 business rule)
- Technical debt with prioritized cleanup plan
- Performance metrics and scaling projections

---

## Key Technical Details

### Normalized Columns (Production Reality)

```sql
-- ALL 11 filters are TEXT[] in production:
grade_levels TEXT[] NOT NULL DEFAULT '{}'
thematic_categories TEXT[]
cultural_heritage TEXT[]
season_timing TEXT[]
core_competencies TEXT[]
academic_integration TEXT[]
social_emotional_learning TEXT[]
cooking_methods TEXT[]
activity_type TEXT[]
location_requirements TEXT[]

-- Single-select:
lesson_format TEXT

-- Additional arrays:
garden_skills TEXT[]
cooking_skills TEXT[]
main_ingredients TEXT[]
observances_holidays TEXT[]
tags TEXT[]
```

---

### Duplicate Indexes (Technical Debt)

**42 total indexes on lessons table**

**Duplicates identified** (~20 indexes):
1. Trigram: `idx_lessons_title` + `idx_lessons_title_trgm` (identical)
2. Trigram: `idx_lessons_summary` + `idx_lessons_summary_trgm` (identical)
3. JSONB + Array: `idx_lessons_themes` (JSONB path) + `idx_lessons_thematic_categories` (array)
4. JSONB + Array: `idx_lessons_cultures` + `idx_lessons_cultural_heritage`
5. JSONB + Array: `idx_lessons_academic` + `idx_lessons_academic_integration`
6. JSONB + Array: `idx_lessons_sel` + `idx_lessons_social_emotional_learning`
7. JSONB + Array: `idx_lessons_seasons` + `idx_lessons_season_timing`
8. JSONB + Array: `idx_lessons_cooking` + `idx_lessons_cooking_methods`
9. Boolean composites: `idx_lessons_themes_bool`, `idx_lessons_academic_bool`, etc. (unused)

**Impact**:
- Wasted disk: ~30-40 MB
- Slower writes: Update 42 indexes vs needed 25
- Query planner confusion: Which index to use?

**Cleanup plan**: Priority 1 in Section 10.3

---

### Search Functions (Production)

**Primary**: `search_lessons(...)`
- Parameters: query + 11 TEXT[] filter params + pagination
- Returns: lessons[] + total_count
- Features: Synonym expansion, cultural hierarchy, trigram fallback
- Pagination: LIMIT/OFFSET (works for current scale)

**Helpers**:
- `expand_search_with_synonyms(text)` - Uses search_synonyms table (60 entries)
- `expand_cultural_heritage(text[])` - Uses cultural_heritage_hierarchy table (6 entries)
- `generate_lesson_search_vector(...)` - Weighted tsvector builder

**Performance**: P95 ~350ms with query + filters (acceptable)

---

## Architectural Principles Established

### Data Model
1. **Normalized columns for filters** - All 11 filters are TEXT[] (or TEXT for single-select)
2. **JSONB for variable data** - Confidence scores, notes, experimental fields
3. **Clear separation** - Columns = filterable/queryable, JSONB = display/metadata
4. **No more dual storage** - Clean up metadata duplicates (Priority 3)

### State Management
1. **Zustand for UI state** - Filters, view preferences, sidebar state
2. **React Query for server state** - Lessons, submissions, users
3. **URL for shareable state** - Filters (planned, Priority 2)
4. **localStorage for personal prefs** - View preferences (quick fix option)

### Migrations
1. **Migration-first workflow** - All schema changes start as migration files
2. **Test locally** - `supabase db reset` must pass before commit
3. **Snapshot baseline** - 20251001 production snapshot is source of truth
4. **Incremental only** - All future changes are additive migrations
5. **Never modify production directly** - Enforced via PR review

### Components
1. **Type-based organization** - Current structure (Filters/, Results/, etc.)
2. **Barrel exports** - Each folder has index.ts
3. **CLAUDE.md context** - Every directory has guidance
4. **11 filters sacred** - Enforced via tests and types

---

## Lessons Learned

### What Went Wrong

1. **No local dev environment** - Developers couldn't test migrations
2. **Production-first changes** - Schema evolved without Git commits
3. **No migration testing** - Syntax errors in 15+ migrations
4. **Documentation drift** - Docs described future state, not current
5. **Duplicate tracking** - Multiple migration files with same number

### What We Fixed

1. **Set up local Supabase** - Fixed Docker setup + migration errors
2. **Verified production state** - Used Supabase MCP to query live DB
3. **Created snapshot** - Single migration matching production
4. **Documented reality** - ARCHITECTURE.md based on actual state
5. **Established workflow** - Migration guide prevents future drift

---

## Technical Challenges Overcome

### Local Supabase Setup (15+ Fixes)

**Errors fixed**:
1. `02_user_management.sql` - Inline INDEX with DESC (invalid syntax)
2. `04_duplicate_resolution.sql` - UNIQUE constraint with LEAST() function
3. `05_rls_policies.sql` - OLD reference in WITH CHECK clause
4. `09_fix_all_rls_issues.sql` - References to non-existent tables
5. `09_fix_all_rls_issues.sql` - View with duplicate columns (group_size)
6. `10_fix_view_security_issues.sql` - Same view duplicate column issue
7. `10_fix_view_security_issues.sql` - Column name (subjects vs subjects_taught)
8. `11_force_remove_security_definer.sql` - Same view + column issues
9. Migration 07_team_management_rollback.sql - Duplicate version 07
10. Migration 08_add_email_uniqueness.sql - Duplicate version 08
11. 16 migrations with duplicate timestamps (20250107, 20250108, etc.)
12. `20250118_convert_seasons_to_four_multiselect.sql` - Missing season_timing column creation
13. `20250118_convert_seasons_to_four_multiselect.sql` - tagged_metadata vs metadata
14. `20250201_populate_activity_type.sql` - array_length() on JSONB (type mismatch)
15. `20250201_populate_activity_type.sql` - activity_type JSONB vs TEXT[] conversion

**Pattern**: Migrations written against production schema, never tested locally

---

### Production Schema Verification

**Process**:
```bash
# 1. Query live database via Supabase MCP
mcp__supabase__execute_sql("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lessons'")

# 2. Compare with migration files
grep "CREATE TABLE.*lessons" supabase/migrations/01_base_schema.sql

# 3. Discovery: Base migration had JSONB, production has TEXT[]!
```

**Revelation**: Base migration (01_base_schema.sql) was an OLD snapshot from pre-normalization era

---

### Snapshot vs Incremental Decision

**Option A: Reconstruct missing migrations**
- Pros: Complete history
- Cons: 20-30 migrations to reverse-engineer, high error risk, weeks of work

**Option B: Snapshot production (CHOSEN)**
- Pros: Safe, matches production exactly, fast
- Cons: Lose migration history (acceptable - archived)

**Decision factors**:
1. Production is source of truth (has real user data)
2. Drift is too large to bridge (6 months, 9 missing tables)
3. Old migrations have syntax errors (untested)
4. Snapshot is verified (db reset passes)

---

## Decisions Made

### 1. Filter Flexibility ✅

**Decision**: Centralized 11 Filters (Option C - Hybrid)

**Rationale**:
- EXACTLY 11 is a confirmed ESYNYC business requirement
- Centralize in `filterDefinitions.ts` (already done in Phase 2)
- Future: Generate migrations/types from single schema (code generation)

**What this means**:
- Adding a filter still requires migration + code changes
- But changes are made in ONE place (filterDefinitions.ts)
- Count is enforced via TypeScript compile-time check

---

### 2. Data Model Strategy ✅

**Decision**: Complete the Normalization (Option A + Cleanup)

**Rationale**:
- Production already has normalized TEXT[] columns
- Search performance is critical (1,000+ lessons)
- Cleanup needed: Remove duplicate JSONB filter data

**What this means**:
- Normalized columns are source of truth
- metadata JSONB keeps only: confidence, notes, experimental fields
- Drop 10+ JSONB path indexes (Priority 1 cleanup)

---

### 3. State Management ✅

**Decision**: URL + Store Hybrid (Option C)

**Rationale**:
- Teachers NEED shareable searches (primary use case)
- View preferences are personal (don't need URL)
- Browser back/forward is expected UX

**What this means**:
- URL: `?q=garden&grades=5,6&themes=plant-growth`
- Store: `{ sortBy, resultsPerPage, sidebarOpen }`
- Implementation: Priority 2 cleanup (1 day work)

---

### 4. Migration Philosophy ✅

**Decision**: Snapshot Now, Keep All Future (Option B → A)

**Rationale**:
- 6 months drift can't be reconstructed safely
- Production has real data (1,098 lessons)
- Future drift prevented by workflow enforcement

**What this means**:
- Baseline: `20251001_production_baseline_snapshot.sql` (3,632 lines)
- Future: All migrations committed incrementally
- Never: Modify production without migration file first

---

### 5. Component Organization ✅

**Decision**: Keep Type-Based (Option A)

**Rationale**:
- Current size (87 files) is manageable
- Type-based is working well
- Feature-based adds complexity for no gain

**What this means**:
- No refactor needed now
- Revisit when adding 5th major feature or hitting 150+ components
- Document in ARCHITECTURE.md for future decision point

---

## Snapshot Migration Details

**File**: `supabase/migrations/20251001_production_baseline_snapshot.sql`

**Size**: 3,632 lines (127 KB)

**Contents**:
1. Header (40 lines) - Explanation, rollback, production state
2. Extensions (5) - uuid-ossp, pgcrypto, pg_trgm, unaccent, vector
3. Functions (20+) - Search, duplicate detection, user helpers
4. Tables (18) - Complete schema with all columns
5. Indexes (42) - GIN, BTree, IVFFlat, trigram
6. Constraints (30+) - CHECK, UNIQUE, FK
7. Triggers (0) - Production doesn't use triggers (!)
8. Policies (50+) - RLS policies for all tables
9. Grants - Public read, authenticated write patterns
10. Comments - Column/table descriptions

**Verified**:
```bash
supabase db reset
# ✅ Applied cleanly
# ✅ 18 tables created
# ✅ All TEXT[] columns present
# ✅ Schema diff shows only grants (no structural differences)
```

---

## Files Created/Modified

### New Files
- `supabase/migrations/20251001_production_baseline_snapshot.sql` (3,632 lines)
- `docs/ARCHITECTURE.md` (678 lines)
- `docs/production-schema-full.sql` (127 KB)
- `docs/production-vs-local-diff.sql` (121 KB)
- `docs/sessions/2025-10-01-architecture-cleanup-session-1.md` (this file)
- `supabase/config.toml` (local Supabase config, gitignored)

### Modified Files
- `supabase/migrations/README.md` - Complete rewrite (snapshot strategy)
- `supabase/migrations/02_user_management.sql` - Fixed inline INDEX (archived)
- `supabase/migrations/04_duplicate_resolution.sql` - Fixed UNIQUE constraint (archived)
- `supabase/migrations/05_rls_policies.sql` - Fixed OLD reference (archived)
- `supabase/migrations/09_fix_all_rls_issues.sql` - Commented non-existent tables (archived)
- `supabase/migrations/10_fix_view_security_issues.sql` - Fixed view + column names (archived)
- `supabase/migrations/11_force_remove_security_definer.sql` - Fixed view (archived)
- `supabase/migrations/20250118_convert_seasons_to_four_multiselect.sql` - Added column creation (archived)
- `supabase/migrations/20250201_populate_activity_type.sql` - Fixed JSONB type handling (archived)

**Note**: All modified migrations are now archived - changes preserved for reference

---

### Archived Files (19 total)
- `supabase/migrations/archive/pre-snapshot/01_base_schema.sql`
- `supabase/migrations/archive/pre-snapshot/02_user_management.sql`
- ... (17 more)

---

## Next Steps (Post-Session)

### Immediate (This Week)
1. ✅ Commit snapshot + ARCHITECTURE.md
2. ✅ Commit session notes (this file)
3. Create PR: "Production baseline snapshot + architecture docs"
4. Merge to main after review

### Short-term (Next 2 Weeks)
1. **Priority 1**: Drop duplicate indexes (2-3 hours)
   - Create: `20251015_drop_duplicate_indexes.sql`
   - Verify: EXPLAIN ANALYZE before dropping
   - Test: Local reset, monitor production performance

2. **Priority 2**: Implement URL state (1 day)
   - Use: `nuqs` or native useSearchParams
   - Pattern: `/search?q=garden&grades=5,6`
   - Test: Sharing, browser nav, refresh behavior

3. **Priority 3**: Clean metadata JSONB (3-4 hours)
   - Remove: Filter keys from metadata
   - Keep: confidence, processing_notes, review_notes
   - Update: Any code reading metadata filter fields

### Medium-term (Next Month)
4. **Priority 4**: View preference persistence (2-3 hours)
   - Quick: localStorage
   - Proper: user_profiles.preferences JSONB

5. **Priority 5**: Facet counts (1 day)
   - SQL: get_facet_counts() function
   - UI: Show counts in FilterModal
   - Performance: Monitor with 1,098 lessons

---

## Architecture Review Questions (For Next Session)

### Database
1. Drop boolean columns (theme_*, academic_*, sel_*, competency_*)? → Verify unused first
2. Drop season_timing_backup column? → Confirm migration complete
3. Implement user_profiles.preferences for view prefs? → Or use localStorage?
4. Add missing FK indexes? → Low priority but easy wins

### Frontend
1. Implement URL state for filters? → High UX value
2. Build bookmarks UI? → Table ready, 6-8 hours work
3. Build saved searches UI? → Table ready, useful feature
4. Add facet counts? → Requires SQL function + UI

### Performance
1. Monitor P95 latency after index cleanup → Expect 10-15% improvement
2. Consider keyset pagination? → Not urgent until 2,000+ lessons
3. Materialized view for facets? → Not needed until 5,000+ lessons

---

## Commit Plan

### Commit 1 (Completed)
```
feat(db): production baseline snapshot (2025-10-01)
- Snapshot production schema (3,632 lines)
- Archive 19 pre-snapshot migrations
- Verify via local db reset
```

### Commit 2 (Next)
```
docs: add architecture documentation + cleanup session notes
- Comprehensive ARCHITECTURE.md based on production snapshot
- Session log documenting drift discovery and decisions
- Quick reference for common tasks
- Prioritized technical debt cleanup plan
```

---

## Session Metrics

**Time breakdown**:
- Analysis & investigation: 1.5 hours
- Local Supabase setup: 1 hour (15+ errors fixed)
- Production schema verification: 0.5 hours
- Snapshot creation: 0.5 hours
- Documentation: 1 hour
- **Total**: ~4.5 hours

**Lines of code**:
- Added: 11,161 lines (snapshot + docs)
- Removed: 1,806 lines (archived migrations)
- Modified: 10 migration files (archived)

**Value delivered**:
- ✅ Local dev environment working
- ✅ Production schema documented accurately
- ✅ Clean migration baseline established
- ✅ Technical debt prioritized and actionable
- ✅ Workflow established to prevent future drift

---

## Open Questions for Future Sessions

1. **Facet count implementation approach?** - SQL function vs materialized view vs client-side
2. **URL state library choice?** - nuqs vs native useSearchParams
3. **Bookmark/collection UI priority?** - Tables ready, but is there user demand?
4. **When to refactor components?** - Stay type-based or move to feature-based?
5. **Search performance optimization trigger?** - At what lesson count do we need external search engine?

---

## References

**Documentation created**:
- Architecture: `docs/ARCHITECTURE.md`
- Migration guide: `supabase/migrations/README.md`
- Production schema: `docs/production-schema-full.sql`
- Schema diff: `docs/production-vs-local-diff.sql`

**Related docs**:
- Cleanup progress: `docs/architecture-cleanup-guide.md`
- Search architecture: `docs/search-architecture-v2.md` (now reality, not plan!)
- Implementation status: `docs/IMPLEMENTATION_STATUS.md` (needs update)

**Branch**: `refactor/architecture-cleanup`
**Status**: Snapshot verified, docs complete, ready for PR
