# ESYNYC Lesson Search - System Architecture

**Last Updated**: October 1, 2025
**Production State** (Oct 2025 baseline — stale, see note below): 1,098 lessons, 6 users, 127 submissions processed
**Database Snapshot**: `20251001_production_baseline_snapshot.sql`

> **⚠️ Editor's note (Wave 3, 2026-06-21): the production metrics in this document are stale.** All counts below (lesson/user/submission totals — e.g. "1,098 lessons") reflect the **October 2025 baseline snapshot** and have since drifted; this file has not been re-baselined. For live figures, query the database (`SELECT COUNT(*) FROM lessons;`) or see `CLAUDE.md` (which notes the lesson row count drifts). The inline counts are retained as the Oct-2025 baseline for historical context, not as current state.

---

## 1. Executive Summary

### System Overview

ESYNYC Lesson Search is a full-stack web application for searching, filtering, and managing 1,000+ garden and cooking education lesson plans. Built with React 19 + Supabase, it serves NYC public school teachers with sophisticated search and filtering capabilities.

**Production Metrics** (October 2025 baseline — stale, see top note):
- **1,098 lessons** indexed and searchable
- **60 search synonyms** for query expansion
- **6 cultural heritage hierarchies** for inclusive search
- **127 submissions** processed through review workflow
- **133 reviews** completed by educators
- **86 duplicate resolutions** executed

### Key Architectural Decisions

1. **Normalized TEXT[] Columns**: All filter categories use typed PostgreSQL arrays (not JSONB) for performance
2. **Filter Categories**: Defined in `filterDefinitions.ts` - consult stakeholders before changes
3. **PostgreSQL Full-Text Search**: No external search service (Algolia removed) - all search is SQL-based
4. **Production Baseline Snapshot**: Accepted production as source of truth (Oct 2025) due to migration drift
5. **Zustand for UI, React Query for Server**: Clear separation of state concerns

### Technology Stack

**Frontend**:
- React 19 + TypeScript + Vite
- Tailwind CSS for styling
- Zustand for UI state (filters, view preferences)
- React Query for server state (lessons, submissions)
- React Router for navigation

**Backend**:
- Supabase (PostgreSQL 15+)
- Edge Functions (Deno) for complex operations
- Row Level Security (RLS) for all tables
- Extensions: vector (embeddings), pg_trgm (fuzzy search), unaccent

**Search**:
- PostgreSQL full-text search (tsvector + GIN indexes)
- Trigram similarity (fuzzy matching on title/summary)
- Vector embeddings (semantic similarity via OpenAI)
- Synonym expansion (60 terms in search_synonyms table)
- Cultural hierarchy expansion (6 parent-child mappings)

---

## 2. Quick Reference

### Common Tasks

**Search for lessons**:
```typescript
// Frontend hook
const { data, fetchNextPage } = useLessonSearch({ filters, pageSize: 20 });

// Direct RPC call
const { data } = await supabase.rpc('search_lessons', {
  search_query: 'garden',
  filter_grade_levels: ['5', '6'],
  filter_themes: ['Plant Growth'],
  page_size: 20,
  page_offset: 0
});
```

**Expand search with synonyms**:
```sql
SELECT expand_search_with_synonyms('garden');
-- Returns: 'garden | vegetable | planting | outdoor'
```

### Key Files

| Purpose | File Path | Description |
|---------|-----------|-------------|
| **Filter definitions** | `src/utils/filterDefinitions.ts` | **SINGLE SOURCE OF TRUTH** for filter categories |
| **Search hook** | `src/hooks/useLessonSearch.ts` | React Query infinite scroll integration |
| **Search function** | Database: `search_lessons()` | Main PostgreSQL search RPC |
| **Migration baseline** | `supabase/migrations/20251001_production_baseline_snapshot.sql` | Production schema (3,632 lines) |
| **Type definitions** | `src/types/index.ts` | Core TypeScript types (Lesson, SearchFilters, etc.) |
| **State store** | `src/stores/searchStore.ts` | Zustand store (UI state ONLY) |

### Database Quick Checks

```sql
-- Count lessons
SELECT COUNT(*) FROM lessons;  -- Oct 2025 baseline was ~1,098; query for the live count

-- Check normalized columns exist
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'lessons'
  AND column_name IN ('grade_levels', 'thematic_categories')
  AND data_type = 'ARRAY';

-- List search functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%search%';

-- View synonyms
SELECT * FROM search_synonyms LIMIT 10;

-- View cultural hierarchy
SELECT * FROM cultural_heritage_hierarchy;
```

---

## 3. Database Schema

### 3.1 Core Tables (18 total)

#### **Content Tables** (6 tables)

**lessons** (~1,098 rows as of Oct 2025 baseline — see top note) - Primary content table
- Stores lesson plans with normalized filter columns
- Has full-text search (search_vector tsvector)
- Has semantic search (content_embedding vector 1536)
- Has exact duplicate detection (content_hash SHA-256)
- Primary key: `id` (UUID), Unique: `lesson_id` (text)

**lesson_archive** (127 rows) - Deleted lesson audit trail
- Preserves archived lesson data for compliance
- Tracks: who archived, when, why (canonical_id reference)
- Includes all filter columns (same schema as lessons)
- Primary key: `lesson_id` (text)

**lesson_versions** (0 rows) - Version history
- Future-ready: Tracks lesson updates over time
- Links to: `archived_from_submission_id`
- Status: Schema exists, not yet used by UI

**lesson_collections** (0 rows) - User-curated sets
- Future-ready: Teachers can create custom collections
- Fields: name, description, lesson_ids[], is_public
- RLS: Users see own collections + public ones
- Status: Schema exists, not yet used by UI

**bookmarks** (0 rows) - User lesson bookmarks
- Future-ready: Quick-access favorite lessons
- Composite unique: (user_id, lesson_id)
- RLS: Users manage own bookmarks only
- Status: Schema exists, not yet used by UI

**saved_searches** (0 rows) - Saved filter combinations
- Future-ready: Save/reload search filters
- Stores: name, filters (JSONB)
- RLS: Users manage own saved searches
- Status: Schema exists, not yet used by UI

---

#### **Submission Workflow** (3 tables)

**lesson_submissions** (127 rows) - Teacher-submitted lessons
- Workflow: draft → submitted → in_review → approved
- Contains: google_doc_url, extracted_content, reviewer assignment
- Features: Content hash + embedding for duplicate detection
- Triggers: Google Docs extraction (extract-google-doc Edge Function)

**submission_reviews** (133 rows) - Review metadata & decisions
- Tracks: tagged_metadata, detected_duplicates, decision, time_spent
- Decisions: approve_new, approve_update, reject, needs_revision
- Links: submission_id → lesson_submissions, reviewer_id → user_profiles
- More reviews than submissions: Some have multiple review rounds

**submission_similarities** (127 rows) - Duplicate detection scores
- Stores: title_similarity, content_similarity, metadata_overlap_score
- Combined score: Weighted average of 3 similarity metrics
- Match types: exact (95%+), high (85%+), medium (70%+), low (<70%)
- Used by: AdminDuplicateDetailV3 page for side-by-side comparison

---

#### **Duplicate Resolution** (2 tables)

**canonical_lessons** (1 row) - Duplicate → canonical mappings
- Maps: duplicate_id → canonical_id
- Tracks: similarity_score, resolution_type, resolved_by, resolved_at
- Resolution types: exact, near, version, title
- Primary key: duplicate_id (ensures each duplicate maps to exactly one canonical)

**duplicate_resolutions** (86 rows) - Resolution audit log
- Tracks: group_id, duplicate_type, lessons_in_group, action_taken
- Resolution modes: single (one canonical), split (multiple), keep_all
- Stores: metadata_merged (JSONB), notes
- More resolutions than canonical_lessons: Group resolutions = 1 entry per group, not per duplicate

---

#### **User Management** (5 tables)

**user_profiles** (6 rows) - User accounts with roles
- Roles: teacher, reviewer, admin, super_admin (hierarchy)
- School info: school_name, school_borough, grades_taught, subjects_taught
- Account status: is_active, permissions (JSONB override)
- Primary key: id (references auth.users)

**user_invitations** (1 row) - Email-based onboarding
- Secure token-based invitation system
- Expires: 7 days default
- Pre-fills: school_name, school_borough, role
- Unique constraint: Only one pending invitation per email

**user_management_audit** (25 rows) - Action audit trail
- Tracks: invites, role changes, activations, profile updates
- Stores: actor_id, target_user_id, old_values, new_values
- Includes: ip_address, user_agent for security
- 10 action types: invite_sent, user_role_changed, permissions_changed, etc.

**schools** (6 rows) - School directory
- Tracks NYC schools (currently 6)
- Simple structure: id, name, timestamps
- RLS: Authenticated users read, admins write

**user_schools** (0 rows) - User-school many-to-many
- Tracks which users belong to which schools
- Composite primary key: (user_id, school_id)
- Status: Table exists, feature not fully utilized

---

#### **Search Configuration** (2 tables)

**search_synonyms** (60 rows in production, 0 locally) - Query expansion
```sql
-- Example entries (from production):
term: "garden"     → synonyms: ["vegetable garden", "planting", "outdoor"]
term: "butternut"  → synonyms: ["winter squash", "squash"]
term: "collards"   → synonyms: ["leafy greens", "greens"]
```
- Types: bidirectional, oneway, typo_correction
- Used by: `expand_search_with_synonyms()` function
- Public read, admin write

**cultural_heritage_hierarchy** (6 rows in production, 0 locally) - Parent-child mappings
```sql
-- Example entries (from production):
parent: "Asian"     → children: ["East Asian", "Southeast Asian", "South Asian", "Central Asian"]
parent: "Americas"  → children: ["Latin American", "Caribbean", "North American"]
parent: "African"   → children: ["West African", "Ethiopian", "Nigerian"]
```
- Used by: `expand_cultural_heritage()` function
- Enables: Selecting "Asian" finds all East Asian, Southeast Asian, etc. lessons
- Public read, admin write

---

### 3.2 Data Model Architecture

#### The Normalized Approach (Production Reality)

**All filter categories use typed TEXT[] columns:**

```sql
CREATE TABLE lessons (
  -- Multi-select filters (TEXT[] arrays)
  grade_levels TEXT[] NOT NULL DEFAULT '{}',
  thematic_categories TEXT[],
  cultural_heritage TEXT[],
  season_timing TEXT[],
  core_competencies TEXT[],
  academic_integration TEXT[],
  social_emotional_learning TEXT[],
  cooking_methods TEXT[],
  activity_type TEXT[],
  location_requirements TEXT[],

  -- Additional metadata (JSONB for flexibility)
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Search infrastructure
  search_vector tsvector,
  content_embedding vector(1536),
  content_hash VARCHAR(64)
);
```

**Why TEXT[] instead of JSONB?**

| Aspect | TEXT[] (CURRENT) | JSONB (OLD) |
|--------|-----------------|-------------|
| **Query speed** | ✅ Fast (GIN indexes on arrays) | ❌ Slower (JSON path extraction) |
| **Type safety** | ✅ PostgreSQL validates array type | ❌ Can store anything |
| **Index efficiency** | ✅ One GIN per column | ❌ One GIN per JSON path |
| **Schema clarity** | ✅ `\d lessons` shows all filters | ❌ Hidden in JSONB |
| **Flexibility** | ❌ Adding filter = migration | ✅ Just use new key |

**Decision**: Performance + type safety outweighed flexibility for our stable multi-select filters.

---

#### Dual Storage Pattern (Current State + Technical Debt)

**Production currently stores data in BOTH places:**

```sql
-- Normalized columns (used for filtering):
grade_levels: ["5", "6", "7"]
thematic_categories: ["Plant Growth", "Garden Basics"]

-- metadata JSONB (redundant copy):
metadata: {
  "gradeLevel": ["5", "6", "7"],           -- ❌ Duplicate
  "thematicCategories": ["Plant Growth", "Garden Basics"],  -- ❌ Duplicate
  "confidence": { "overall": 85 },         -- ✅ Unique (keep)
  "processingNotes": "..."                 -- ✅ Unique (keep)
}
```

**Why this exists**:
- Historical: Original schema used JSONB for everything
- Migration: Normalized columns were added 6+ months ago
- Incomplete cleanup: Data still written to both places

**Impact**:
- Double writes on every lesson update
- ~20 duplicate indexes (GIN on both array columns AND JSONB paths)
- Confusing for developers ("which is the source of truth?")

**Cleanup plan** (Section 10.1):
- Keep normalized columns (source of truth)
- Remove filter data from metadata JSONB
- Drop unused JSONB path indexes
- Keep metadata for: confidence, processing_notes, review_notes only

---

#### When to Use Columns vs JSONB

**Use normalized columns for**:
- ✅ Filterable fields (grade_levels, themes, etc.)
- ✅ Sortable fields (created_at, updated_at)
- ✅ Fields with constraints (season_timing CHECK constraint)
- ✅ Fields queried frequently (80%+ of queries)

**Use metadata JSONB for**:
- ✅ Variable structure (confidence scores with sub-fields)
- ✅ Infrequently queried (processing_notes, review_notes)
- ✅ Experimental fields (not yet stable schema)
- ✅ Complex nested data (academicIntegration.concepts)

**Current split** (production):
- Normalized: filters + search fields + core metadata
- JSONB: Confidence scores, processing/review notes, legacy duplicate filter data (to clean)

---

## 3. The Filter System

### 3.1 Filter Categories

**Current filter categories** (defined in `filterDefinitions.ts` - consult stakeholders before changes):

1. **grade_levels** (TEXT[] multi-select)
   - Values: 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
   - Groups: Early Childhood (3K-PK), Lower Elementary (K-2), Upper Elementary (3-5), Middle (6-8)
   - Database: `grade_levels TEXT[] NOT NULL DEFAULT '{}'`

2. **thematic_categories** (TEXT[] multi-select)
   - Values: Garden Basics, Plant Growth, Garden Communities, Ecosystems, Seed to Table, Food Systems, Food Justice
   - Database: `thematic_categories TEXT[]`
   - Note: Exactly 7 themes (ESYNYC core curriculum categories)

3. **season_timing** (TEXT[] multi-select)
   - Values: Fall, Winter, Spring, Summer (EXACTLY 4 - enforced by CHECK constraint)
   - Database: `season_timing TEXT[]` with `CHECK (season_timing <@ ARRAY['Fall', 'Winter', 'Spring', 'Summer'])`
   - Note: Removed "Year-round", "Beginning of year", "End of year" in migration 20250118

4. **core_competencies** (TEXT[] multi-select)
   - Values: 6 ESYNYC educational priorities
   - Environmental and Community Stewardship, Social Justice, Social-Emotional Intelligence, Garden Skills + Academic, Kitchen Skills + Academic, Culturally Responsive Education
   - Database: `core_competencies TEXT[]`

5. **cultural_heritage** (TEXT[] multi-select + hierarchical)
   - Hierarchical: Selecting "Asian" includes all "East Asian", "Southeast Asian", etc.
   - Expansion: Via `expand_cultural_heritage()` function + cultural_heritage_hierarchy table
   - Database: `cultural_heritage TEXT[]`

6. **location_requirements** (TEXT[] multi-select)
   - Values: Indoor, Outdoor, Both
   - Database: `location_requirements TEXT[]`

7. **activity_type** (TEXT[] multi-select)
   - Values: cooking, garden, both, academic
   - Derived from: garden_skills + cooking_skills presence
   - Database: `activity_type TEXT[]`

8. **academic_integration** (TEXT[] multi-select)
   - Values: Math, Science, Literacy/ELA, Social Studies, Health, Arts
   - Database: `academic_integration TEXT[]`

9. **social_emotional_learning** (TEXT[] multi-select)
    - Values: 5 SEL competencies
    - Relationship skills, Self-awareness, Responsible decision-making, Self-management, Social awareness
    - Database: `social_emotional_learning TEXT[]`

10. **cooking_methods** (TEXT[] multi-select)
    - Values: basic-prep, stovetop, oven
    - Note: Consolidated from "no-cook" + "Basic prep only" → just "basic-prep" (migration 20250204)
    - Database: `cooking_methods TEXT[]`

---

### 3.2 Modifying Filters

**Consult stakeholders before adding or removing filter categories.**

**Adding a new filter requires**:
1. Database migration (add column)
2. TypeScript type update (`SearchFilters` interface)
3. UI component update (FilterModal, FilterSidebar)
4. Search RPC function signature change
5. Update `filterDefinitions.ts`

**Historical context**:
- Original design had 11 filters as a fixed constraint
- This restriction was lifted in late 2025 to allow optimization
- Filter changes now require stakeholder consultation rather than being prohibited

---

### 3.3 Filter Storage Strategy

**Database**: Normalized TEXT[] columns
```sql
grade_levels TEXT[] NOT NULL DEFAULT '{}'  -- Performance, type safety
```

**Frontend**: TypeScript interface
```typescript
interface SearchFilters {
  gradeLevels: string[];      // Multi-select → array
  cookingMethods: string[];   // Multi-select → array
  // ... additional filters
}
```

**State Management**: Zustand (UI state ONLY)
```typescript
const useSearchStore = create<SearchState>()(devtools((set) => ({
  filters: { query: '', gradeLevels: [], ... },  // UI state
  // Results are owned by React Query, not store!
})));
```

**URL State**: implemented (W1c) — `src/hooks/useUrlSync.ts` + `src/utils/urlParams.ts`, see Section 5.2

---

## 4. Search System Architecture

### 4.1 Search Pipeline

```
┌─────────────┐
│ User Input  │ → query: "garden", gradeLevels: ['5','6']
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Frontend: useLessonSearch hook      │
│ - Builds RPC params from filters    │
│ - Uses React Query useInfiniteQuery │
└──────┬──────────────────────────────┘
       │
       ▼ RPC Call
┌─────────────────────────────────────────────────────────┐
│ Database: search_lessons(query, filters, page, size)    │
│                                                          │
│  1. Expand query with synonyms                          │
│     expand_search_with_synonyms("garden")               │
│     → "garden | vegetable | planting | outdoor"         │
│                                                          │
│  2. Expand cultural heritage                            │
│     expand_cultural_heritage(["Asian"])                 │
│     → ["Asian", "East Asian", "Southeast Asian", ...]   │
│                                                          │
│  3. Filter on normalized columns                        │
│     WHERE grade_levels && ['5','6']  (array overlap)    │
│       AND thematic_categories && filter_themes          │
│       AND cultural_heritage && expanded_cultures        │
│       AND ...  (filter conditions)                      │
│                                                          │
│  4. Text search on search_vector                        │
│     search_vector @@ to_tsquery('expanded_query')       │
│     OR title % 'garden'  (trigram similarity)           │
│     OR summary % 'garden'                               │
│                                                          │
│  5. Rank results                                        │
│     GREATEST(ts_rank, similarity(title), 0.8*similarity(summary))
│                                                          │
│  6. Count total results                                 │
│     SELECT COUNT(*) ... (for pagination)                │
│                                                          │
│  7. Apply pagination                                    │
│     LIMIT page_size OFFSET page_offset                  │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼ Returns
┌──────────────────────────────────────┐
│ Results: {                           │
│   lessons: Lesson[],                 │
│   total_count: 1098,                 │
│   rank: 0.95                         │
│ }                                    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────┐
│ UI: ResultsGrid      │
│ - Render lessons     │
│ - Infinite scroll    │
└──────────────────────┘
```

---

### 4.2 Full-Text Search

**search_vector Generation**:

```sql
CREATE OR REPLACE FUNCTION generate_lesson_search_vector(
  p_title TEXT,
  p_summary TEXT,
  p_main_ingredients TEXT[],
  p_garden_skills TEXT[],
  p_cooking_skills TEXT[],
  p_thematic_categories TEXT[],
  p_cultural_heritage TEXT[],
  p_observances_holidays TEXT[],
  p_tags TEXT[],
  p_content_text TEXT
) RETURNS tsvector AS $$
  -- Weight: A = highest, D = lowest
  setweight(to_tsvector('english', p_title), 'A') ||             -- Title most important
  setweight(to_tsvector('english', p_summary), 'B') ||           -- Summary second
  setweight(to_tsvector('english', array_to_string(p_main_ingredients, ' ')), 'B') ||
  setweight(to_tsvector('english', array_to_string(p_garden_skills, ' ')), 'C') ||
  setweight(to_tsvector('english', array_to_string(p_cooking_skills, ' ')), 'C') ||
  setweight(to_tsvector('english', array_to_string(p_thematic_categories, ' ')), 'C') ||
  setweight(to_tsvector('english', array_to_string(p_cultural_heritage, ' ')), 'C') ||
  setweight(to_tsvector('english', p_content_text), 'D')         -- Full text lowest weight
$$;
```

**Trigger**: Auto-updates on INSERT or UPDATE of relevant columns

**Indexed**: GIN index on search_vector (fast tsvector queries)

**Query**: `search_vector @@ to_tsquery('english', expanded_query)`

---

### 4.3 Search Expansion

#### Synonym Expansion (60 terms in production)

**Function**: `expand_search_with_synonyms(query_text TEXT) RETURNS TEXT`

**How it works**:
```sql
-- Input: "garden"
-- Looks up in search_synonyms table
-- Returns: "garden | vegetable | planting | outdoor"
-- Used in: to_tsquery('english', expanded_query)
```

**Example synonyms** (from production data):
- garden → vegetable garden, planting, outdoor
- butternut → winter squash, squash
- collards → leafy greens, greens
- salsa → sauce, dip

**Synonym types**:
- `bidirectional`: Both terms find each other (garden ↔ vegetable garden)
- `oneway`: Query term finds synonym, but not reverse
- `typo_correction`: Common misspellings (e.g., "parsely" → "parsley")

**Performance**: 60 entries currently, O(n) lookup, cached in function

---

#### Cultural Hierarchy Expansion (6 hierarchies in production)

**Function**: `expand_cultural_heritage(cultures TEXT[]) RETURNS TEXT[]`

**How it works**:
```sql
-- Input: ["Asian"]
-- Looks up in cultural_heritage_hierarchy table
-- Finds: parent="Asian" → children=["East Asian", "Southeast Asian", "South Asian", "Central Asian"]
-- Returns: ["Asian", "East Asian", "Southeast Asian", "South Asian", "Central Asian"]
-- Used in: WHERE cultural_heritage && expanded_cultures
```

**Hierarchy mappings** (from production):
```
Asian
  ├── East Asian (Chinese, Japanese, Korean, Taiwanese)
  ├── Southeast Asian (Vietnamese, Thai, Filipino, etc.)
  ├── South Asian (Indian, Bangladeshi, Pakistani, etc.)
  └── Central Asian

Americas
  ├── Latin American (Mexican, Dominican, Puerto Rican, etc.)
  ├── Caribbean
  └── North American

African
  ├── West African
  ├── Ethiopian
  └── Nigerian

European
  ├── Eastern European
  └── Mediterranean

Middle Eastern
  └── Levantine

Indigenous
  (no children currently, but structure allows it)
```

**Behavior**: Selecting a parent automatically includes all children in search results.

---

#### Fuzzy Matching (Trigram Similarity)

**Extension**: pg_trgm (trigram similarity)

**How it works**:
```sql
-- If full-text search has no results, fall back to fuzzy matching
WHERE title % 'gardne'        -- Finds "garden" (typo tolerant)
   OR summary % 'plantng'     -- Finds "planting"

-- Similarity function returns 0-1 score:
similarity('garden', 'gardne') → 0.85  (85% similar)
```

**Indexed**: GIN trigram indexes on title and summary
```sql
CREATE INDEX idx_lessons_title_trgm ON lessons USING GIN (title gin_trgm_ops);
CREATE INDEX idx_lessons_summary_trgm ON lessons USING GIN (summary gin_trgm_ops);
```

**Used in ranking**: Combined with ts_rank for final relevance score

---

### 4.4 Ranking Algorithm

```sql
-- Combine multiple ranking signals
rank = GREATEST(
  ts_rank_cd(search_vector, to_tsquery('english', expanded_query)),  -- Full-text relevance
  similarity(title, search_query),                                   -- Fuzzy title match
  0.8 * similarity(summary, search_query)                            -- Fuzzy summary match (weighted lower)
)

-- Final ordering
ORDER BY
  rank DESC,                                          -- Relevance first
  (confidence->>'overall')::float DESC NULLS LAST,    -- Then confidence
  title ASC                                           -- Then alphabetical
```

**Pagination**: `LIMIT page_size OFFSET page_offset` (20 per page default)

**Total count**: Calculated separately and returned with each row for UI pagination

---

### 4.5 Performance Characteristics

**Production metrics** (based on typical queries):

| Query Type | P95 Latency | Index Used |
|------------|-------------|------------|
| Filters only (no query) | ~200ms | GIN on TEXT[] columns |
| Full-text search + filters | ~350ms | GIN on search_vector + TEXT[] |
| Fuzzy matching (trigram) | ~400ms | GIN trigram on title/summary |
| Semantic (embedding) | ~500ms | IVFFlat on content_embedding |

**Bottlenecks**:
- Cultural heritage expansion (can expand to 20+ terms)
- Synonym expansion creates OR-heavy tsquery (60 terms max)
- OFFSET pagination (linear scan for high offsets)

**Optimizations to consider** (future):
- Keyset pagination instead of OFFSET
- Limit synonym expansion to top 10 most relevant
- Materialized view for facet counts

---

## 5. State Management

### 5.1 Current Architecture

Three places hold search state, each with one job:

- **Zustand** (`src/stores/searchStore.ts`) — what the user asked to see: filters, sort, and layout preferences.
- **React Query** (`src/hooks/useLessonSearch.ts`) — what the server returned: result pages, total count, loading/error state. Pagination lives here, as the infinite query's `pageParam`.
- **The URL** (`src/hooks/useUrlSync.ts` + `src/utils/urlParams.ts`) — the shareable projection of filters + sort, kept equal to the store in both directions.

**Zustand store** — UI state only, no results and no page number:
```typescript
// src/stores/searchStore.ts
interface SearchState {
  filters: SearchFilters;   // query + 11 facet arrays (src/types/index.ts)
  viewState: ViewState;

  setFilters: (filters: Partial<SearchFilters>) => void;  // merge
  clearFilters: () => void;           // FULL reset (query + sort too): tests/teardown, not the UI
  clearFilterSelections: () => void;  // Filters-panel "Clear all": facets only; query + sort survive (D-E)
  setViewState: (viewState: Partial<ViewState>) => void;
  // URL → store: fully REPLACES filters and applies sort in ONE write (W1c)
  hydrateUrlState: (urlFilters: Partial<SearchFilters>, sortBy: ViewState['sortBy']) => void;
  addFilter / removeFilter / toggleFilter: (key: keyof SearchFilters, value: string) => void;
}

// src/types/index.ts
interface ViewState {
  sortBy: 'title' | 'modified' | 'relevance';  // mirrors the search_lessons order_by whitelist
  view: 'list' | 'grid' | 'split';
  density: 'comfy' | 'compact' | 'ultra';
}
```

There is no page-number or page-size field in the store. A filter or sort change rebuilds the React Query key, which restarts the query at page 0 on its own; page size is an option of `useLessonSearch`, not state.

**Persistence**: the store is wrapped in Zustand `persist` (localStorage key `esy-search-ui`), but `partialize` writes only `viewState.view` and `viewState.density`. Filters, the typed query and the sort are never persisted — the URL is their persistence (shareable, refresh-safe, Back/Forward-safe), and a stale sort or filter quietly reappearing on the next visit was judged worse than starting clean. `merge` spreads the persisted slice over the defaults so fields added later start at their defaults.

**React Query** — the search hook signature and the parts of its config that shape behaviour:
```typescript
// src/hooks/useLessonSearch.ts
useLessonSearch({ filters, pageSize = 20, sortBy = 'relevance', enabled = true })
  → useInfiniteQuery({
      queryKey: ['lesson-search', 'search_lessons', filters, sortBy, pageSize],
      enabled,                           // SearchPage passes useUrlSync().hydrated
      initialPageParam: 0,               // pageParam is a PAGE INDEX, not an offset
      getNextPageParam: (lastPage, allPages) =>
        loadedSoFar < lastPage.totalCount ? allPages.length : undefined,
      queryFn: ({ pageParam }) =>
        supabase.rpc('search_lessons', {
          search_query, filter_* …,      // one filter_* param per facet, undefined when empty
          order_by: sortBy,
          page_size: pageSize,
          page_offset: pageParam * pageSize,
        }),
      placeholderData: keepPreviousData, // C59: prior results stay on screen during a refetch
      staleTime: 5 min, gcTime: 10 min,
    })
```
Before the RPC call, `parseSearchQuery` strips filler words from the typed query and routes a grade cue in the text ("3rd grade compost") into the grade filter — unless the user has set an explicit grade filter, which always wins.

**URL**: `urlParams.ts` is the pure serializer/parser — short param names (`q`, `grades`, `themes`, …, `sort`), empty arrays and the default `relevance` sort omitted, unknown params and out-of-vocabulary values dropped on the way in, and `canonicalSearchString` for every equality check. `useUrlSync` keeps URL and store equal in both directions and returns `{ hydrated, flush }`. Its header comment is the authoritative description of the loop guard and history-mode invariants, which several tests pin — read it before touching either file.

**Facet-count badges** (`src/hooks/useFacetCounts.ts` + `src/utils/facetCounts.ts`): one slim select of the facet columns for every non-retired lesson per tab session (React Query, `staleTime: Infinity`), then counts recomputed client-side on every filter toggle, with no network. The hook returns `undefined` until the corpus has loaded, so badges render blank, never fake zeros.

**Clear separation**:
- Zustand: what the user wants to see (filters, sort, view, density)
- React Query: what the server returned (lesson pages, total count, loading/error state) plus the facet corpus
- URL: the shareable projection of filters + sort, kept in step by `useUrlSync`

---

### 5.2 Data Flow

Three flows feed the same query key.

**(a) The user toggles a filter or changes the sort**
```
User clicks a filter checkbox (or picks a sort)
  ↓
Zustand: toggleFilter('gradeLevels', '5')   /  setViewState({ sortBy: 'title' })
  ↓
useUrlSync store→URL effect: canonical(store) ≠ canonical(URL)
  → 300 ms debounce → setSearchParams(buildSearchParams(filters, sortBy), { replace: true })
  (replace: Back leaves the search page, it does not undo one toggle)
  ↓
React Query: queryKey ['lesson-search', 'search_lessons', filters, sortBy, 20] changed
  → new query starts at pageParam 0; keepPreviousData keeps the old list on screen meanwhile
  ↓
RPC: search_lessons(filters…, order_by, page_size=20, page_offset=0)
  ↓
Results render; useFacetCounts recomputes the badges client-side (no network)
```

**(b) The URL changes from outside** (shared link, bookmark, refresh, Back/Forward)
```
URL changes (mount, Back/Forward, pasted link)
  ↓
useUrlSync URL→store effect: parseSearchParams → validated partial
  our own echo (one-use written token matches)?  → skip
  else hydrateUrlState(partial, sortBy): FULL replace of filters + sort in ONE write
  (fields absent from the URL reset to empty, so Back-to-unfiltered really clears)
  ↓
hydrated = true   (SearchPage passes this as `enabled`, so the first RPC never fires with
                   default filters before a shared link's filters have been applied)
  ↓
queryKey change → page 0, as in (a)
```

**(c) The user scrolls**
```
InfiniteScrollTrigger → fetchNextPage()
  ↓
getNextPageParam: loaded < totalCount ? allPages.length : undefined
  ↓
RPC: search_lessons(same filters, page_size=20, page_offset=pageIndex × 20)
  ↓
New page appended to data.pages
```

Opening a lesson is route state: `/lesson/:lessonId` renders the same SearchPage element as `/search`. Before pushing that route, SearchPage calls `flush()` so a filter toggle still inside the 300 ms debounce window is written to the list history entry rather than the lesson one — Back keeps the toggle.

---

### 5.3 Known Limitations

1. **Saved Searches Table Unused**
   - `saved_searches` exists with RLS but has no UI
   - Deferred by owner ruling (2026-10-21); not scheduled. Today the URL is the way to keep or share a filter combination.

2. **Sort and filters are intentionally not persisted across sessions**
   - `persist` keeps only view + density (Section 5.1)
   - A returning visitor starts from an empty search unless they come back through a URL — the URL is the persistence

---

## 6. Key Database Functions

### 6.1 Search Functions

**search_lessons** - Main search RPC with pagination

```sql
CREATE FUNCTION search_lessons(
  search_query TEXT DEFAULT NULL,
  filter_grade_levels TEXT[] DEFAULT NULL,
  filter_themes TEXT[] DEFAULT NULL,
  filter_seasons TEXT[] DEFAULT NULL,
  filter_competencies TEXT[] DEFAULT NULL,
  filter_cultures TEXT[] DEFAULT NULL,
  filter_location TEXT[] DEFAULT NULL,
  filter_activity_type TEXT[] DEFAULT NULL,
  filter_academic TEXT[] DEFAULT NULL,
  filter_sel TEXT[] DEFAULT NULL,
  filter_cooking_method TEXT DEFAULT NULL,
  page_size INT DEFAULT 20,
  page_offset INT DEFAULT 0
)
RETURNS TABLE (
  lesson_id TEXT,
  title TEXT,
  summary TEXT,
  file_link TEXT,
  grade_levels TEXT[],
  metadata JSONB,
  confidence JSONB,
  rank DOUBLE PRECISION,
  total_count BIGINT
)
```

**expand_search_with_synonyms** - Query expansion

```sql
CREATE FUNCTION expand_search_with_synonyms(query_text TEXT) RETURNS TEXT
-- Input: "garden"
-- Output: "garden | vegetable | planting | outdoor"
-- Uses: search_synonyms table (60 entries)
```

**expand_cultural_heritage** - Hierarchy expansion

```sql
CREATE FUNCTION expand_cultural_heritage(cultures TEXT[]) RETURNS TEXT[]
-- Input: ["Asian"]
-- Output: ["Asian", "East Asian", "Southeast Asian", "South Asian", "Central Asian"]
-- Uses: cultural_heritage_hierarchy table (6 entries)
```

**generate_lesson_search_vector** - tsvector builder

```sql
CREATE FUNCTION generate_lesson_search_vector(
  p_title TEXT,
  p_summary TEXT,
  p_main_ingredients TEXT[],
  -- ... 7 more TEXT[] params
) RETURNS tsvector
-- Generates weighted tsvector for full-text search
-- Weights: A (title), B (summary/ingredients), C (skills/tags), D (content)
```

**find_similar_lessons_by_embedding** - Semantic search

```sql
CREATE FUNCTION find_similar_lessons_by_embedding(
  query_embedding vector,
  similarity_threshold DOUBLE PRECISION DEFAULT 0.5,
  max_results INT DEFAULT 10
) RETURNS TABLE (lesson_id TEXT, title TEXT, similarity_score DOUBLE PRECISION, match_type TEXT)
-- Uses: content_embedding column (vector 1536)
-- Distance: Cosine similarity (1 - embedding <=> query_embedding)
-- Index: IVFFlat on content_embedding
```

---

### 6.2 Duplicate Detection Functions

**resolve_duplicate_group** - Merge/archive duplicates

```sql
CREATE FUNCTION resolve_duplicate_group(
  p_group_id TEXT,
  p_canonical_id TEXT,
  p_duplicate_ids TEXT[],
  p_duplicate_type TEXT DEFAULT 'near',
  p_similarity_score NUMERIC DEFAULT 0.85,
  p_merge_metadata BOOLEAN DEFAULT false,
  p_resolution_notes TEXT DEFAULT NULL,
  p_resolution_mode TEXT DEFAULT 'single',
  p_sub_group_name TEXT DEFAULT NULL,
  p_parent_group_id TEXT DEFAULT NULL,
  p_title_updates JSONB DEFAULT NULL
) RETURNS JSONB
-- Modes: 'single' (one canonical), 'split' (multiple canonicals), 'keep_all'
-- Actions: Archives duplicates to lesson_archive, creates canonical_lessons entry, logs to duplicate_resolutions
```

---

### 6.3 User/Auth Helper Functions

**is_admin** - Check admin role

```sql
CREATE FUNCTION is_admin() RETURNS BOOLEAN
-- Uses: auth.uid() → lookup in user_profiles
-- Returns: true if role IN ('admin', 'super_admin') AND is_active = true
-- Usage: RLS policies, function access control
```

**is_reviewer_or_above** - Check reviewer+ role

```sql
CREATE FUNCTION is_reviewer_or_above() RETURNS BOOLEAN
-- Returns: true if role IN ('reviewer', 'admin', 'super_admin')
-- Hierarchy: super_admin > admin > reviewer > teacher
```

---

### 6.4 Submission Workflow Functions

**validate_invitation_token** - Token verification

```sql
CREATE FUNCTION validate_invitation_token(invite_token TEXT)
RETURNS TABLE (...)
-- Checks: Token exists, not expired, not already accepted
-- Returns: Invitation details for acceptance flow
```

---

## 7. Duplicate Resolution System

### 7.1 Detection Algorithm

**Three-layer approach**:

#### Layer 1: Exact Match (content_hash)
```sql
content_hash = SHA-256(title + summary + content_text)
-- Matches: Identical lessons (100% duplicate)
-- Fast: Indexed btree lookup
-- Used first: Cheapest check
```

#### Layer 2: Semantic Similarity (content_embedding)
```sql
similarity = 1 - (embedding1 <=> embedding2)  -- Cosine distance
-- Thresholds:
--   >= 0.95: exact (same lesson, minor edits)
--   >= 0.85: high (very similar, likely duplicate)
--   >= 0.70: medium (related, review needed)
--   <  0.70: low (different lessons)
-- Expensive: IVFFlat index scan
-- Used second: Catches paraphrased duplicates
```

#### Layer 3: Metadata Overlap
```sql
overlap_score = (shared_grade_levels + shared_themes + shared_competencies + ...) / total_metadata_fields
-- Checks: How many filter values match
-- Used third: Context for reviewer decision
```

**Combined score**: Weighted average (content: 50%, embedding: 30%, metadata: 20%)

---

### 7.2 Resolution Workflow

```
┌──────────────────────┐
│ Teacher Submission   │
└──────┬───────────────┘
       │
       ▼ Edge Function: detect-duplicates
┌──────────────────────────────────┐
│ Find Similar Lessons             │
│ - Check content_hash (exact)     │
│ - Check embedding (semantic)     │
│ - Check metadata (overlap)       │
└──────┬───────────────────────────┘
       │
       ▼ Stores in submission_similarities
┌──────────────────────────────────┐
│ Reviewer: AdminDuplicateDetailV3 │
│ - Side-by-side comparison        │
│ - Similarity scores displayed    │
│ - Metadata overlap highlighted   │
└──────┬───────────────────────────┘
       │
       ▼ Decision
┌──────────────────────────────────────────┐
│ resolve_duplicate_group()                │
│                                          │
│ IF keep_canonical:                       │
│   - Archive duplicates → lesson_archive  │
│   - Create canonical_lessons mapping     │
│   - Log to duplicate_resolutions         │
│                                          │
│ IF merge_metadata:                       │
│   - Union arrays (grade_levels, themes)  │
│   - Update canonical with merged data    │
│   - Store merge details in resolution    │
│                                          │
│ IF split_group:                          │
│   - Create sub-groups                    │
│   - Multiple canonical lessons           │
│   - Link via parent_group_id             │
└──────────────────────────────────────────┘
```

---

### 7.3 Tables in Detail

**canonical_lessons** (1 row in production)
```sql
duplicate_id   | canonical_id  | similarity_score | resolution_type | resolved_by | resolved_at
---------------|---------------|------------------|-----------------|-------------|------------
lesson-123     | lesson-456    | 0.92             | near            | user-uuid   | 2025-08-15
```
- Primary key: `duplicate_id` (each duplicate maps to exactly one canonical)
- Foreign keys: Both IDs reference `lessons.lesson_id`
- Query pattern: `SELECT canonical_id FROM canonical_lessons WHERE duplicate_id = 'xyz'`

**lesson_archive** (127 rows in production)
- Full snapshot: All columns from lessons table (title, summary, all filters, etc.)
- Tracks: `archived_by` (user), `archived_at` (timestamp), `archive_reason` (text)
- Links: `canonical_id` (if archived due to duplicate resolution)
- Immutable: No UPDATE policy, only INSERT
- Use case: Compliance, rollback, audit trail

**duplicate_resolutions** (86 rows in production)
- Group tracking: `group_id` (e.g., "group-789"), `lessons_in_group` (count)
- Decision: `action_taken` (merge_metadata, archive_only, merge_and_archive)
- Modes: `resolution_mode` (single, split, keep_all)
- Metadata: `metadata_merged` (JSONB snapshot of merged data)

**Why 86 resolutions but 1 canonical_lessons entry?**
- Group resolutions: One resolution can handle 5 duplicates → 1 entry in duplicate_resolutions
- Canonical mappings: Each duplicate gets its own mapping → 5 entries in canonical_lessons
- Low canonical count: Most duplicates fully archived (removed from lessons table)

---

## 8. Index Strategy

### 8.1 Search Indexes

**Full-text search**:
```sql
CREATE INDEX idx_lessons_search_vector ON lessons USING GIN (search_vector);
-- Size: ~15 MB for 1,098 lessons (Oct 2025 baseline — see top note)
-- Usage: Every text search query
-- Critical: Cannot be dropped
```

**Fuzzy matching (trigram)**:
```sql
CREATE INDEX idx_lessons_title_trgm ON lessons USING GIN (title gin_trgm_ops);
CREATE INDEX idx_lessons_summary_trgm ON lessons USING GIN (summary gin_trgm_ops);
-- Usage: Fallback when full-text has no results
-- Enables: similarity(title, 'query') fast lookup
```

**Semantic search (vector)**:
```sql
CREATE INDEX idx_lessons_embedding ON lessons
  USING ivfflat (content_embedding vector_cosine_ops)
  WITH (lists = 100);
-- Type: IVFFlat (approximate nearest neighbor)
-- Usage: find_similar_lessons_by_embedding()
-- Note: Requires VACUUM ANALYZE for optimal performance
```

---

### 8.2 Filter Indexes

**All TEXT[] filter columns have GIN indexes**:
```sql
CREATE INDEX idx_lessons_grade_levels ON lessons USING GIN (grade_levels);
CREATE INDEX idx_lessons_thematic_categories ON lessons USING GIN (thematic_categories);
CREATE INDEX idx_lessons_cultural_heritage ON lessons USING GIN (cultural_heritage);
CREATE INDEX idx_lessons_season_timing ON lessons USING GIN (season_timing);
CREATE INDEX idx_lessons_core_competencies ON lessons USING GIN (core_competencies);
CREATE INDEX idx_lessons_academic_integration ON lessons USING GIN (academic_integration);
CREATE INDEX idx_lessons_social_emotional_learning ON lessons USING GIN (social_emotional_learning);
CREATE INDEX idx_lessons_cooking_methods ON lessons USING GIN (cooking_methods);
CREATE INDEX idx_lessons_activity_type ON lessons USING GIN (activity_type);
CREATE INDEX idx_lessons_location_requirements ON lessons USING GIN (location_requirements);
CREATE INDEX idx_lessons_garden_skills ON lessons USING GIN (garden_skills);
CREATE INDEX idx_lessons_cooking_skills ON lessons USING GIN (cooking_skills);
CREATE INDEX idx_lessons_main_ingredients ON lessons USING GIN (main_ingredients);
CREATE INDEX idx_lessons_tags ON lessons USING GIN (tags);
```

**Why GIN for arrays?**
- Supports `&&` operator (array overlap): `grade_levels && ['5','6']`
- Faster than sequential scan for array containment
- Works with partial matches (any overlap, not exact match)

---

### 8.3 Known Duplication (Technical Debt)

**~20 duplicate indexes exist in production**:

#### Trigram Duplicates (2 pairs) — resolved 2026-10:
Resolved by migration `20261023203831_drop_dead_lessons_indexes.sql` (2026-10): dropped the
zero-scan `idx_lessons_title` / `idx_lessons_summary`; the `_trgm` pair
(`idx_lessons_title_trgm` / `idx_lessons_summary_trgm`) is the one the planner uses and stays.

#### JSONB Path + Array Column Duplicates (8+ pairs):
```sql
-- Themes:
idx_lessons_themes                  -- GIN on metadata->'thematicCategories'
idx_lessons_thematic_categories     -- GIN on thematic_categories array

-- Cultures:
idx_lessons_cultures                -- GIN on metadata->'culturalHeritage'
idx_lessons_cultural_heritage       -- GIN on cultural_heritage array

-- Academic:
idx_lessons_academic                -- GIN on metadata->'academicIntegration' (dropped by 20261023203831, 2026-10)
idx_lessons_academic_integration    -- GIN on academic_integration array

-- SEL:
idx_lessons_sel                            -- GIN on metadata->'socialEmotionalLearning' (dropped by 20261023203831, 2026-10)
idx_lessons_social_emotional_learning      -- GIN on social_emotional_learning array

-- Seasons:
idx_lessons_seasons         -- GIN on metadata->'seasonTiming'
idx_lessons_season_timing   -- GIN on season_timing array

-- ... (similar for location, activity_type, cooking_methods, competencies)
```

**Impact**:
- ~30-40 MB wasted disk space
- Slower writes (update 2 indexes for same data)
- Query planner confusion (which index to use?)

**Cleanup plan**:
1. ⚠️ **MUST verify query plans first** (use `EXPLAIN ANALYZE` on representative queries)
2. Confirm production queries use array column indexes (not JSONB path)
3. Drop JSONB path indexes: `idx_lessons_themes`, `idx_lessons_cultures`, etc.
4. Keep array column indexes: `idx_lessons_thematic_categories`, etc.
5. Monitor performance for 1 week post-cleanup

---

#### Boolean Column Indexes (Unused):
```sql
idx_lessons_academic_bool   -- Composite on (academic_math, academic_science, ...)
idx_lessons_sel_bool        -- Composite on (sel_self_awareness, sel_self_management, ...)
idx_lessons_themes_bool     -- Composite on (theme_garden_basics, theme_plant_growth, ...)
idx_lessons_competency_bool -- Composite on (competency_growing_food, ...)
```

**Status**: These boolean columns exist but queries don't use them (use TEXT[] instead)
**Impact**: Write overhead for unused indexes
**Cleanup**: Drop all `_bool` composite indexes after confirming not used

---

#### Missing Indexes (Supabase Advisor Flagged):
```sql
-- Foreign keys without indexes (performance hit on JOINs):
ALTER TABLE duplicate_resolutions ADD INDEX (resolved_by);
ALTER TABLE lesson_archive ADD INDEX (archived_by);
ALTER TABLE lesson_submissions ADD INDEX (reviewer_id);
ALTER TABLE canonical_lessons ADD INDEX (resolved_by);
```

**Impact**: Slower JOIN queries on admin pages
**Priority**: Medium (admin pages have low traffic)

---

### 8.4 Index Maintenance

**Current total**: 42 indexes on lessons table (excessive!)

**Optimal target**: ~25 indexes (after dropping duplicates)

**Monitoring**:
```sql
-- Check index usage (requires pg_stat_statements extension)
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'lessons'
ORDER BY idx_scan ASC;
-- Low idx_scan = candidate for removal
```

**Rebuild strategy**:
```sql
-- After major data changes or cleanup:
REINDEX TABLE lessons;  -- Rebuild all indexes
VACUUM ANALYZE lessons; -- Update statistics
```

---

## 9. Frontend Architecture

### 9.1 Component Organization

**Current structure** (type-based grouping):

```
src/components/
├── Admin/           # User management, analytics UI
│   ├── EditableTitle.tsx
│   └── index.ts
├── Auth/            # Login, signup, protected routes
│   ├── AuthModal.tsx
│   ├── ProtectedRoute.tsx
│   └── index.ts
├── Common/          # Shared UI utilities
│   ├── ErrorBoundary.tsx
│   ├── VirtualizedTable.tsx
│   ├── InfiniteScrollTrigger.tsx
│   └── ...
├── Filters/         # Filter UI components
│   ├── FilterModal.tsx          # All filters in tabs
│   ├── FilterSidebar.tsx        # Desktop filter panel
│   ├── FilterPills.tsx          # Active filter chips
│   ├── CulturalHeritageFilter.tsx  # Hierarchical filter
│   └── ...
├── Layout/          # App shell
│   └── Header.tsx
├── Results/         # Search results display
│   ├── ResultsGrid.tsx
│   ├── LessonCard.tsx
│   ├── AdaptiveResultsGrid.tsx  # Responsive layout
│   └── ...
├── Review/          # Submission review UI
│   └── ReviewMetadataForm.tsx
├── Schools/         # School selector
│   └── SchoolSelector.tsx
└── Search/          # Search bar + suggestions
    └── SearchBar.tsx
```

**Pattern**: Group by UI layer (what it IS), not feature domain

**Why this structure?**
- ✅ Easy to find: "Where are filters?" → `Filters/`
- ✅ Reuse obvious: All modals in one place (Common/)
- ✅ Small codebase: 87 source files (manageable)
- ❌ Feature coupling: Hard to extract "review" as separate module
- ❌ Unclear ownership: Who owns Common/?

**Future consideration** (when >150 components):
- Reorganize to feature-based: `features/search/`, `features/review/`, `features/admin/`
- Promote `Common/` → `ui/` (design system)
- Not urgent for current size

---

### 9.2 Search Integration

#### useLessonSearch Hook (Primary)

```typescript
// src/hooks/useLessonSearch.ts
interface UseLessonSearchOptions {
  filters: SearchFilters;
  pageSize?: number;             // default 20
  sortBy?: ViewState['sortBy'];  // default 'relevance'; passed straight through as order_by
  enabled?: boolean;             // default true; SearchPage passes useUrlSync().hydrated
}

export function useLessonSearch({ filters, pageSize = 20, sortBy = 'relevance', enabled = true }) {
  // Strip filler words and route grade cues from the typed query (an explicit grade filter wins)
  const { cleanedQuery, detectedGrades } = parseSearchQuery(filters.query ?? '');
  const effectiveGradeLevels = filters.gradeLevels?.length ? filters.gradeLevels : detectedGrades;

  return useInfiniteQuery<PageResult, Error>({
    queryKey: ['lesson-search', 'search_lessons', filters, sortBy, pageSize],
    enabled,
    initialPageParam: 0,                                  // page INDEX, not an offset
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.lessons.length, 0);
      return loaded < lastPage.totalCount ? allPages.length : undefined;
    },
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('search_lessons', {
        search_query: cleanedQuery || undefined,
        filter_grade_levels: effectiveGradeLevels?.length ? effectiveGradeLevels : undefined,
        filter_themes: filters.thematicCategories?.length ? filters.thematicCategories : undefined,
        // ... one filter_* param per facet, undefined when empty
        order_by: sortBy,
        page_size: pageSize,
        page_offset: (pageParam as number) * pageSize,
      });
      if (error) throw error;
      const rows = (data || []) as RpcRow[];
      return { lessons: rows.map(mapRowToLesson), totalCount: rows[0]?.total_count ?? 0 };
    },
    placeholderData: keepPreviousData,  // prior results stay on screen while a key change refetches
    staleTime: 5 * 60 * 1000,           // 5 minutes
    gcTime: 10 * 60 * 1000,             // 10 minutes
  });
}
```

**Features**:
- ✅ Infinite scroll pagination (page-index `pageParam`; a filter or sort change rebuilds the key and restarts at page 0)
- ✅ Automatic refetch on filter or sort change (cache key includes both)
- ✅ Debounced input — not in this hook: the header search box debounces typing 300 ms (`useDebounce`) before it reaches the store, and the URL writer in `useUrlSync` debounces its own writes 300 ms
- ✅ Previous results stay on screen during a refetch (`keepPreviousData`); `isPending` is true only on a cold load
- ✅ Total count from the RPC's `total_count` column
- ✅ First query gated on URL hydration (`enabled`), so a shared link never flashes a false "No matches"
- ✅ Error handling with retry: the app-wide QueryClient default in `src/App.tsx` (`retry: 1`), not a per-hook setting

---

#### useLessonSuggestions Hook

```typescript
// src/hooks/useLessonSuggestions.ts
export function useLessonSuggestions({ filters }: { filters: SearchFilters }) {
  return useQuery({
    queryKey: ['suggestions', filters.query],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('smart-search', {
        body: { query: filters.query, filters }
      });
      return data.suggestions || [];
    },
    enabled: !!filters.query?.trim(),
    staleTime: 5 * 60 * 1000
  });
}
```

**When shown**: Query returns 0 results
**Source**: Edge Function `smart-search` (synonym-based suggestions)
**UI location**: SearchPage results area (not SearchBar)

---

### 9.3 Filter Definitions (Single Source of Truth)

**File**: `src/utils/filterDefinitions.ts`

```typescript
export const FILTER_CONFIGS: Record<string, FilterConfig> = {
  activityType: {
    label: 'Activity Type',
    type: 'single',
    options: [
      { value: 'cooking-only', label: 'Cooking Only' },
      { value: 'garden-only', label: 'Garden Only' },
      { value: 'both', label: 'Cooking + Garden' },
      { value: 'academic-only', label: 'Academic Only' },
    ]
  },
  // ... additional filter configs
};

// Consult stakeholders before modifying filter categories
export const FILTER_KEYS = Object.keys(FILTER_CONFIGS) as Array<keyof typeof FILTER_CONFIGS>;
```

**Consumed by**:
- FilterModal.tsx (tabs for each filter)
- FilterSidebar.tsx (desktop filter panel)
- FilterPills.tsx (active filter display)
- SearchPage.tsx (builds RPC params)

**Consistency check**:
```typescript
// In filterDefinitions.test.ts
test('filters should be properly configured', () => {
  expect(FILTER_KEYS.length).toBeGreaterThan(0);
  // Validates each filter has required properties
});
```

---

### 9.4 Page Components

_(Inventory drifts as pages are added/removed — run `ls src/pages/*.tsx` for the
authoritative current list; see also `src/pages/CLAUDE.md`.)_

#### Public Pages (2)
- **SearchPage.tsx** - Main search interface (no auth required)
- **SubmissionPage.tsx** - Teacher lesson submission form

#### Auth Required (2)
- **UserProfile.tsx** - User account settings
- **AcceptInvitation.tsx** - Invitation acceptance flow

#### Reviewer Pages (2)
- **ReviewDashboard.tsx** - List of submissions awaiting review
- **ReviewDetail.tsx** - Individual submission review + metadata tagging

#### Admin Pages (5)
- **AdminDashboard.tsx** - Admin hub (links to all admin features)
- **AdminUsers.tsx** - User management list
- **AdminUserDetail.tsx** - Edit user profile + permissions
- **AdminInviteUser.tsx** - Create invitation form
- **AdminInvitations.tsx** - Pending invitations list

_(AdminAnalytics was retired in the frontend-polish phase (owner decision D3);
AdminDuplicates / AdminDuplicateDetailV3 were removed in T4b (D10) — duplicate
handling now lives in the reviewer flow on ReviewDetail. VerifySetup was a
temporary testing page, also removed. None of these files exist.)_

#### Auth Flow (2)
- **ResetPassword.tsx** - Password reset flow
- **AcceptInvitation.tsx** - Invitation acceptance

**Route protection**: All admin/reviewer pages wrapped in `<ProtectedRoute permissions={[...]}>` using RLS-backed permission checks.

---

## 10. Known Technical Debt

### 10.1 Database Layer (Critical Priority)

#### Issue 1: Dual Storage of Filter Data

**Problem**: Same filter data stored in BOTH normalized columns AND metadata JSONB

**Evidence**:
```sql
-- Normalized column (source of truth):
grade_levels = ["5", "6", "7"]

-- metadata JSONB (redundant):
metadata = {"gradeLevel": ["5", "6", "7"], ...}  -- ❌ Duplicate
```

**Impact**:
- Double writes on every lesson insert/update
- ~20 duplicate indexes (GIN on both array + JSONB path)
- Confusing for developers ("which is canonical?")
- Wasted disk space (~30-40 MB for 1,098 lessons — Oct 2025 baseline, see top note)

**Cleanup steps**:
1. ✅ Confirm all queries use normalized columns (not metadata JSONB paths)
2. Remove filter keys from metadata JSONB (keep only: confidence, processing_notes, review_notes)
3. Drop JSONB path indexes: `idx_lessons_themes`, `idx_lessons_cultures`, etc.
4. Keep array indexes: `idx_lessons_thematic_categories`, `idx_lessons_cultural_heritage`, etc.
5. Update any code still reading `metadata.gradeLevel` → use `grade_levels` column

**Risk**: Low if queries verified first
**Benefit**: ~40% reduction in index bloat, clearer schema

---

#### Issue 2: Duplicate Indexes

**Problem**: 20+ indexes covering the same data via different access paths

**Trigram duplicates**: resolved by migration `20261023203831_drop_dead_lessons_indexes.sql`
(2026-10) — dropped the zero-scan `idx_lessons_title` / `idx_lessons_summary`; the `_trgm` pair
is the one the planner uses and stays.

**JSONB path duplicates** (after metadata cleanup):
```sql
DROP INDEX idx_lessons_themes;      -- Replaced by idx_lessons_thematic_categories
DROP INDEX idx_lessons_cultures;    -- Replaced by idx_lessons_cultural_heritage
-- DROP INDEX idx_lessons_academic;    -- done: dropped by 20261023203831 (2026-10)
-- DROP INDEX idx_lessons_sel;         -- done: dropped by 20261023203831 (2026-10)
DROP INDEX idx_lessons_seasons;     -- Replaced by idx_lessons_season_timing
DROP INDEX idx_lessons_cooking;     -- Replaced by idx_lessons_cooking_methods
DROP INDEX idx_lessons_location;    -- Replaced by idx_lessons_location_requirements
DROP INDEX idx_lessons_activity_type;  -- On metadata path (keep the array column index)
```

**Boolean column indexes** (unused):
```sql
DROP INDEX idx_lessons_themes_bool;      -- Queries use thematic_categories array, not booleans
DROP INDEX idx_lessons_academic_bool;    -- Queries use academic_integration array
DROP INDEX idx_lessons_sel_bool;         -- Queries use social_emotional_learning array
DROP INDEX idx_lessons_competency_bool;  -- Queries use core_competencies array
```

**Safety protocol**:
```sql
-- BEFORE dropping ANY index:
EXPLAIN ANALYZE
SELECT * FROM lessons
WHERE thematic_categories && ARRAY['Plant Growth']
  AND grade_levels && ARRAY['5'];
-- Verify: Uses idx_lessons_thematic_categories (not idx_lessons_themes)
-- Verify: Uses idx_lessons_grade_levels

-- Check index usage statistics:
SELECT indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'lessons'
  AND indexname IN ('idx_lessons_themes', 'idx_lessons_thematic_categories');
-- If idx_scan = 0 for JSONB path index → safe to drop
```

**Estimated impact**:
- Disk: Save ~30-40 MB
- Writes: 40% faster (update 25 indexes instead of 42)
- Reads: No change (queries already use array indexes)

---

#### Issue 3: Missing Foreign Key Indexes

**Problem**: Several foreign keys lack indexes (flagged by Supabase advisor)

**Missing indexes**:
```sql
CREATE INDEX idx_duplicate_resolutions_resolved_by ON duplicate_resolutions(resolved_by);
CREATE INDEX idx_lesson_archive_archived_by ON lesson_archive(archived_by);
CREATE INDEX idx_lesson_submissions_reviewer_id ON lesson_submissions(reviewer_id);
CREATE INDEX idx_canonical_lessons_resolved_by ON canonical_lessons(resolved_by);
CREATE INDEX idx_user_invitations_invited_by ON user_invitations(invited_by);
```

**Impact**: Slow JOINs on admin pages (user lookup by reviewer_id, archived_by, etc.)
**Priority**: Medium (low traffic on admin pages)
**Risk**: None (adding indexes is safe)

---

#### Issue 4: Orphaned Tables and Columns

**Unused tables** (0 rows in production):
- `bookmarks` - Schema ready, UI not implemented
- `saved_searches` - Schema ready, UI not implemented
- `lesson_collections` - Schema ready, UI not implemented
- `lesson_versions` - Schema ready, workflow not implemented
- `user_schools` - Schema ready, team feature not utilized

**Decision**: Keep tables (they're future-ready, low cost)

**Unused columns**:
- `lessons.season_timing_backup` - Leftover from migration 20250118
- Various boolean flags: `theme_garden_basics`, `academic_math`, etc. (replaced by arrays)

**Cleanup**:
```sql
ALTER TABLE lessons DROP COLUMN season_timing_backup;  -- Safe after migration confirmed
-- Consider: Drop boolean columns if truly unused (verify first)
```

---

### 10.2 Application Layer (Medium Priority)

#### Issue 1: No URL State for Filters — ✅ Resolved (W1c)

Filters, query and sort are serialized into the search URL by `src/utils/urlParams.ts` and kept in two-way sync with the store by `src/hooks/useUrlSync.ts` (native React Router `useSearchParams`, `replace` history mode, 300 ms debounced writes, atomic `hydrateUrlState` on the way in). Shared links, bookmarks, refresh and Back/Forward all work. The `useUrlSync.ts` header comment is the authoritative description of the loop guard; Section 5.2 shows the flows.

---

#### Issue 2: View Preferences Not Persisted — ✅ Resolved

`searchStore.ts` is wrapped in Zustand `persist` (localStorage key `esy-search-ui`), partialized to `viewState.view` and `viewState.density`. Sort and filters are deliberately NOT persisted — the URL carries them (Section 5.1) — and the `user_profiles.preferences` database option once proposed here was not taken.

---

#### Issue 3: Algolia Remnants Fully Removed; Facet Counts Re-implemented Client-side ✅

**Status**: All Algolia code removed in Phase 3 cleanup (September 2025)

**What was removed**:
- `src/hooks/useAlgoliaSearch.ts` ❌ Deleted
- `src/lib/algolia.ts` ❌ Deleted
- `src/types/algolia.ts` ❌ Deleted
- `src/utils/facetHelpers.ts` ❌ Deleted (Algolia-specific)
- npm packages: `algoliasearch`, `react-instantsearch` ❌ Uninstalled

**Facet counts**: Algolia's per-option counts went with it and came back client-side (FP-01b) in `src/hooks/useFacetCounts.ts` + `src/utils/facetCounts.ts`: one slim select of the facet columns for every non-retired lesson per tab session, then a per-option count under the RPC's matching rules and every OTHER active filter category. No SQL facet-count function exists or is planned; if a migration ever changes a filter predicate in `search_lessons`, the matching branch in `facetCounts.ts` must change with it (its header lists the SQL twins).

---

#### Issue 4: Type Definition Duplication

**Problem**: database.types.ts existed in TWO locations

**Status**: ✅ RESOLVED (PR #311)

```
src/types/database.types.ts      # ← Canonical location (kept)
src/lib/database.types.ts        # ❌ Deleted
```

All imports now use `@/types/database.types`.

---

### 10.3 Cleanup Action Plan (Prioritized)

#### Priority 1: Drop Duplicate Indexes (Performance)

**Impact**: High (faster writes, less disk usage)
**Risk**: Low (if verified)
**Time**: 2-3 hours

**Steps**:
1. Run EXPLAIN ANALYZE on 20 representative queries
2. Confirm array column indexes are used (not JSONB paths)
3. Create migration: `20251015_drop_duplicate_indexes.sql`
4. Test on local DB
5. Monitor production query performance for 1 week

**Migration**:
```sql
-- Trigram duplicates: resolved by 20261023203831_drop_dead_lessons_indexes.sql (2026-10) —
-- dropped idx_lessons_title / idx_lessons_summary, kept the _trgm pair the planner uses

-- Drop JSONB path indexes (after verifying)
DROP INDEX idx_lessons_themes;
DROP INDEX idx_lessons_cultures;
-- ... (8 more)

-- Drop boolean column indexes (unused)
DROP INDEX idx_lessons_themes_bool;
-- ... (3 more)
```

---

#### Priority 2: Clean Metadata JSONB Duplicates (Maintenance)

**Impact**: Medium (cleaner schema, less confusion)
**Risk**: Low (if migration tested)
**Time**: 3-4 hours

**Migration**:
```sql
-- Remove filter keys from metadata JSONB, keep only:
-- confidence, processingNotes, reviewNotes, academicIntegration.concepts

UPDATE lessons
SET metadata = metadata - 'gradeLevel'
                         - 'thematicCategories'
                         - 'seasonTiming'
                         - 'coreCompetencies'
                         - 'culturalHeritage'
                         - 'locationRequirements'
                         - 'activityType'
                         - 'academicIntegration'  -- Keep .concepts nested, remove .selected
                         - 'socialEmotionalLearning'
                         - 'cookingMethods';

-- Then drop JSONB path indexes (from Priority 1)
```

**Verification**:
```typescript
// Search codebase for metadata access:
grep -r "metadata\\.gradeLevel\|metadata->>'gradeLevel'" src/
// Should return 0 results (code uses grade_levels column)
```

---

#### Resolved since this plan was written

- **URL state for filters** (was Priority 2) — shipped in W1c; see Section 10.2 Issue 1.
- **User preference persistence** (was Priority 4) — shipped via Zustand `persist` (view + density only); see Section 10.2 Issue 2.
- **Facet counts** (was Priority 5) — shipped client-side (FP-01b); see Section 10.2 Issue 3. The SQL-function design once sketched here was not used.

---

### 10.4 Code Organization (Low Priority)

#### Issue: Type-Based vs Feature-Based Components

**Current**: Organized by UI layer (Filters/, Results/, Admin/)
**Alternative**: Organize by feature domain (search/, review/, admin/)

**Decision**: Keep current structure until >150 components

**Rationale**:
- Current size (87 files) is manageable
- Team is small (doesn't need strict boundaries)
- Type-based is familiar to most developers
- Feature-based adds complexity for little gain at this scale

**Trigger for refactor**: When adding 5th or 6th major feature (currently 4: search, review, admin, duplicates)

---

## 11. Security & Permissions

### 11.1 Role Hierarchy

```
super_admin  (1 user)
    ↓ can do everything admin can, plus:
    - Delete from lesson_archive
    - Modify role hierarchy rules

admin  (2 users)
    ↓ can do everything reviewer can, plus:
    - Manage users (invite, activate, deactivate)
    - View all analytics
    - Resolve duplicates
    - Modify any lesson

reviewer  (2 users)
    ↓ can do everything teacher can, plus:
    - Review submissions
    - Approve/reject lessons
    - View all submissions

teacher  (1 user)
    ↓ can:
    - Search lessons (public)
    - Submit lessons
    - View own submissions
    - Bookmark lessons (when feature enabled)
```

**Role checking**:
```sql
-- In database:
SELECT has_role(auth.uid(), 'reviewer');  -- Checks hierarchy

-- In RLS policies:
USING (is_reviewer_or_above())  -- Function caches lookup
```

---

### 11.2 RLS Policies (Production Simplified Approach)

**Lessons** (Public Read):
```sql
-- Production uses single permissive policy:
CREATE POLICY "Enable read access for all users" ON lessons
  FOR SELECT
  USING (true);  -- Public read (no auth required)

-- Admin write:
CREATE POLICY "Enable write for admins" ON lessons
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
```

**Submissions** (User-scoped):
```sql
-- Teachers see own:
CREATE POLICY "Users can view own submissions" ON lesson_submissions
  FOR SELECT
  USING (auth.uid() = teacher_id);

-- Reviewers see all:
CREATE POLICY "Reviewers can view all" ON lesson_submissions
  FOR SELECT
  USING (is_reviewer_or_above());
```

**User Profiles** (Tiered):
```sql
-- Users see own:
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Admins see all:
CREATE POLICY "Admins can view all" ON user_profiles
  FOR SELECT
  USING (is_admin());
```

**Bookmarks/Collections** (When implemented):
```sql
-- Users manage own:
CREATE POLICY "Users manage own bookmarks" ON bookmarks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### 11.3 Security Notes

**RLS enabled on ALL tables**:
```sql
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- ... (18 tables total)
```

**Service role bypasses RLS**:
- Used by: Edge Functions, admin scripts
- Never exposed to frontend
- Stored in: Supabase secrets (not in .env)

**Auth context**:
```sql
auth.uid()   -- Current user UUID (NULL if not authenticated)
auth.role()  -- 'anon' | 'authenticated' | 'service_role'
```

**Security best practices**:
1. All tables have RLS enabled
2. Policies use helper functions (is_admin, is_reviewer_or_above) to avoid per-row overhead
3. SECURITY DEFINER functions set search_path explicitly
4. No sensitive data in public read tables (lessons metadata is educational content)

**Known gaps**:
- User profile field-level protection (role, is_active) relies on app validation (not RLS)
- Could add trigger to prevent role self-elevation

---

## 12. Performance Characteristics

### 12.1 Search Performance (Production Observed)

**Typical queries** (from monitoring):

| Query Description | Filters | Results | Latency (P95) |
|-------------------|---------|---------|---------------|
| Browsing (no query) | 0-2 filters | 200-500 | ~150ms |
| Filtered search | 3-5 filters | 50-200 | ~200ms |
| Text search + filters | Query + 2-3 filters | 20-100 | ~350ms |
| Complex (many filters) | 6+ filters | 10-50 | ~400ms |
| Semantic (embedding) | Vector search | 10 | ~500ms |

**Index usage** (from EXPLAIN ANALYZE):
- Grade filter: Uses `idx_lessons_grade_levels` (GIN)
- Theme filter: Uses `idx_lessons_thematic_categories` (GIN)
- Text search: Uses `idx_lessons_search_vector` (GIN)
- Fuzzy title: Uses `idx_lessons_title_trgm` (GIN trigram)

**Cache hit rate** (React Query):
- 5-minute stale time → ~60% cache hits for repeat searches
- 10-minute gc time → No redundant fetches within session

---

### 12.2 Known Bottlenecks

#### Cultural Heritage Expansion

**Problem**: Selecting "Asian" expands to 20+ specific cultures

```sql
expanded_cultures = ["Asian", "Chinese", "Japanese", "Korean", "Vietnamese",
                     "Thai", "Filipino", "Indian", "Bangladeshi", ...]
-- WHERE cultural_heritage && expanded_cultures
-- Creates large array overlap check (20+ comparisons)
```

**Impact**: Queries with "Asian" are ~50ms slower than specific cultures
**Acceptable**: Still under 350ms threshold
**Optimization**: Limit expansion to top-level children only (not all descendants)

---

#### Synonym Expansion OR-Heavy Queries

**Problem**: Some terms have 5+ synonyms

```sql
expand_search_with_synonyms('garden')
→ 'garden | vegetable | planting | outdoor | cultivation'
-- Creates: to_tsquery('garden | vegetable | planting | outdoor | cultivation')
-- Query planner must check all 5 terms
```

**Impact**: Marginal (~20ms overhead)
**Acceptable**: Benefits (better recall) outweigh cost
**Optimization**: Limit to top 3 most common synonyms

---

#### OFFSET Pagination

**Problem**: High page offsets are slow (linear scan)

```sql
LIMIT 20 OFFSET 500  -- Skips 500 rows (scans them first)
```

**Impact**: Page 25+ loads in ~600ms (vs ~200ms for page 1)
**Acceptable**: Teachers rarely go past page 3
**Alternative**: Keyset pagination
```sql
-- Instead of OFFSET, use last lesson_id:
WHERE lesson_id > 'last-lesson-id-from-previous-page'
ORDER BY lesson_id
LIMIT 20
```

**Trade-off**: Can't jump to arbitrary pages (only next/prev)

---

### 12.3 Scaling Projections

**Current** (Oct 2025 baseline — stale): ~1,098 lessons
**Growth rate**: ~100-150 lessons/year (based on 127 submissions in ~1 year)
**Projected 2028**: ~1,500 lessons

**Performance at 1,500 lessons**:
- Search latency: +10-15% (still under 400ms P95)
- Index size: +30-40% (acceptable)
- Bottleneck: OFFSET pagination becomes noticeable at page 10+

**Performance at 5,000 lessons**:
- Search latency: +40-50% (approaching 500ms P95)
- Recommended: Implement keyset pagination
- Recommended: Materialized view for facet counts — Resolved: facet counts shipped client-side (`src/hooks/useFacetCounts.ts`), see §5.1
- Recommended: Partial indexes for hot filter combos

**Performance at 10,000 lessons**:
- Would need: Elasticsearch or Meilisearch (external search engine)
- Current PostgreSQL approach hits limits around 10k with complex filters

**Verdict**: Current architecture good through 2028 (~3 years)

---

## 13. Future Considerations

### 13.1 Planned Features (Schema Ready, UI Pending)

#### Bookmarks
**Status**: Table exists (0 rows), UI not implemented
**Frontend work needed**:
- BookmarkButton component (heart icon)
- BookmarkedLessons page
- Integration with LessonCard

**Backend ready**:
```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)  -- Prevent duplicate bookmarks
);
-- RLS: Users manage own bookmarks
```

**Time to implement**: 4-6 hours (UI + hooks)

---

#### Saved Searches
**Status**: Table exists (0 rows), UI not implemented
**Use case**: Save filter combinations for quick access

**Frontend work needed**:
- SaveSearchButton (in FilterModal)
- SavedSearchesDropdown (in SearchBar)
- Manage SavedSearches page

**Backend ready**:
```sql
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,  -- "5th Grade Garden Lessons"
  filters JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Example usage**:
```typescript
// Save current search:
await supabase.from('saved_searches').insert({
  user_id: user.id,
  name: '5th Grade Garden Lessons',
  filters: { gradeLevels: ['5'], activityType: ['garden'] }
});

// Load saved search:
const { data } = await supabase.from('saved_searches')
  .select('*')
  .eq('user_id', user.id);
setFilters(data[0].filters);
```

**Time to implement**: 6-8 hours

---

#### Lesson Collections
**Status**: Table exists (0 rows), UI not implemented
**Use case**: Teachers curate sets (e.g., "My Fall Curriculum", "6th Grade Unit")

**Frontend work needed**:
- CreateCollectionModal
- AddToCollectionButton (on LessonCard)
- MyCollections page
- Share collection (if is_public = true)

**Backend ready**:
```sql
CREATE TABLE lesson_collections (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  lesson_ids TEXT[] DEFAULT '{}',  -- Array of lesson IDs
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ
);
```

**Time to implement**: 2-3 days (more complex UX)

---

### 13.2 Potential Enhancements

#### Advanced Analytics (Admin Feature)
- Usage metrics: Searches per day, popular filters, top lessons
- Submission trends: Acceptance rate, review time
- User activity: Active reviewers, submissions per teacher
- Requires: Tracking tables or log aggregation
- Time: 1 week

#### Lesson Versioning (Future)
- Table exists: `lesson_versions` (0 rows)
- Use case: Track updates to lessons over time
- Workflow: When submission with type='update' approved
- Archive: Previous version to lesson_versions
- UI: Show version history on lesson detail page
- Time: 2-3 days

---

### 13.3 Performance Optimizations

#### 1. Keyset Pagination (vs OFFSET)
**When**: >2,000 lessons or users complain about slow page 10+
**Change**: `WHERE lesson_id > last_id ORDER BY lesson_id LIMIT 20`
**Benefit**: Constant time regardless of page number
**Trade-off**: Can't jump to arbitrary pages

#### 2. Materialized View for Facet Counts

> Resolved: facet counts shipped client-side (`src/hooks/useFacetCounts.ts`), see §5.1. The rest of this item is kept as history.
**When**: Facet count queries take >500ms
**Implementation**:
```sql
CREATE MATERIALIZED VIEW facet_counts_cache AS
SELECT
  unnest(grade_levels) as grade,
  COUNT(*) as count
FROM lessons
GROUP BY grade;
-- Refresh: Hourly via cron or after lesson publish
```

#### 3. Partial Indexes for Hot Filters
**When**: Specific filter combos are used 80%+ of the time
**Example**:
```sql
-- If "5th grade garden lessons" is 60% of searches:
CREATE INDEX idx_lessons_grade5_garden ON lessons (lesson_id)
WHERE '5' = ANY(grade_levels) AND 'garden' = ANY(activity_type);
-- Smaller index, faster for this specific query
```

#### 4. Connection Pooling (Supavisor)
**When**: Concurrent users >50
**Current**: Direct connections (Supabase default)
**Change**: Enable Supavisor (Supabase connection pooler)
**Benefit**: Handle 1,000+ concurrent connections

---

## 14. Edge Functions (Deno Runtime)

### 14.1 Active Edge Functions

**smart-search** (`supabase/functions/smart-search/`)
- Purpose: Generate search suggestions when query returns 0 results
- Input: `{ query, filters }`
- Output: `{ totalCount: number, suggestions: string[], expandedQuery: string | null }`
- Rows are never returned (count-only query)
- Used by: `useLessonSuggestions` hook
- Called when: Total results = 0

**process-submission** (`supabase/functions/process-submission/`)
- Purpose: AI review + duplicate detection for submissions
- Input: `{ submission_id }`
- Calls: OpenAI embeddings API, duplicate detection
- Output: `{ ai_feedback, detected_duplicates[], similarity_scores }`
- Triggered: After submission status changes to 'submitted'

**detect-duplicates** (`supabase/functions/detect-duplicates/`)
- Purpose: Find similar lessons for a submission
- Input: `{ submission_id, threshold }`
- Algorithm: Hash match, embedding similarity, metadata overlap
- Output: `{ matches: Array<{ lesson_id, scores, match_type }> }`
- Stores results in: `submission_similarities` table

**extract-google-doc** (`supabase/functions/extract-google-doc/`)
- Purpose: Extract lesson content from Google Docs URL
- Input: `{ google_doc_url }`
- Uses: Google Docs API (service account)
- Output: `{ title, summary, content_text }`
- Fallback: Mock data in dev (no credentials required)
- Status: Working in production with real API

**send-email** (`supabase/functions/send-email/`)
- Purpose: Send transactional emails (invitations, notifications)
- Provider: Resend (RESEND_API_KEY in secrets)
- Templates: Invitation (admin JWT), account-deactivated / account-reactivated (service role, from user-management)

**invitation-management** (`supabase/functions/invitation-management/`)
- Purpose: Accept an invitation (public, token-gated): creates the auth user + `user_profiles` row, marks `user_invitations.accepted_at`, writes the audit row. Admin create/list/resend/cancel happen in the admin pages directly (C128, 2026-10-21)
- Updates: user_invitations table
- Creates: user_profiles on acceptance

---

### 14.2 Edge Function Patterns

**All functions follow this pattern**:

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // 1. Parse request
    const { param1, param2 } = await req.json();

    // 2. Validate
    if (!param1) {
      return new Response(JSON.stringify({ error: 'Missing param1' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Create Supabase client (uses service role from env)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // Bypasses RLS
    );

    // 4. Business logic
    const result = await doWork(param1, param2, supabase);

    // 5. Return response
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

**Shared utilities**: `supabase/functions/_shared/` (logger, validators, etc.)

---

## Appendices

### A. Migration History

**Production Baseline Snapshot**: 2025-10-01

| Date | Migration | Description |
|------|-----------|-------------|
| 2025-10-01 | `20251001_production_baseline_snapshot.sql` | **Production baseline snapshot** - Full sync with production state. Includes 18 tables, 20+ functions, normalized TEXT[] columns, search expansion, production RLS policies. Replaces 19 pre-snapshot migrations due to 6 months of drift. Schema: 3,632 lines. |

**Pre-Snapshot Migrations**: Archived to `archive/pre-snapshot/`

| Date Range | Files | Status |
|------------|-------|--------|
| Aug 2024 - Aug 2025 | 01-11 (base) | Archived - Outdated, contained JSONB approach |
| Jan-Aug 2025 | 2025* (dated) | Archived - Contained syntax errors, incomplete normalization |

**Why snapshotted**: Production evolved 6 months beyond Git migrations (schema changes applied directly to production without commits).

**Future migrations**: All future changes build incrementally on the 20251001 baseline.

---

### B. Technology Stack

**Frontend**:
- React 19.0 + TypeScript 5.x
- Build: Vite 5.x (fast dev server, optimized builds)
- Styling: Tailwind CSS 3.x + Headless UI (accessible components)
- Routing: React Router 6.x (client-side routing)
- State: Zustand 4.x (lightweight, no boilerplate)
- Data fetching: TanStack Query (React Query) 5.x
- Icons: Lucide React (tree-shakeable)

**Backend**:
- Supabase (managed PostgreSQL + Auth + Storage)
- PostgreSQL 15.x
- Extensions: vector 0.5.x, pg_trgm, unaccent
- Edge Functions: Deno 1.x runtime

**Development**:
- Testing: Vitest + React Testing Library
- Linting: ESLint + TypeScript compiler
- Formatting: Prettier (enforced via pre-commit)
- Type generation: `supabase gen types typescript`

**Deployment**:
- Frontend: Vercel (preview + production)
- Backend: Supabase (managed, auto-scaling)
- CI/CD: GitHub Actions (type-check, lint, test, build)

---

### C. Key File Locations

**Configuration**:
- Filter definitions: `src/utils/filterDefinitions.ts` ⭐ SINGLE SOURCE OF TRUTH
- Environment variable templates: `.env*.example` (local `.env` files are gitignored)
- Supabase config: `supabase/config.toml` (committed since #626; settings and `env()` references only, no secrets)
- TypeScript config: `tsconfig.json`

**State Management**:
- Search store: `src/stores/searchStore.ts`
- URL ⇄ store sync: `src/hooks/useUrlSync.ts` + `src/utils/urlParams.ts`
- Facet-count badges (client-side): `src/hooks/useFacetCounts.ts` + `src/utils/facetCounts.ts`
- Auth context: `src/components/Auth/AuthProvider.tsx` (one provider at the App root) + `src/hooks/useAuth.ts` (consumer hook); pipeline in `src/hooks/useEnhancedAuth.ts`

**Search Implementation**:
- Infinite scroll hook: `src/hooks/useLessonSearch.ts`
- Suggestions hook: `src/hooks/useLessonSuggestions.ts`
- Search page: `src/pages/SearchPage.tsx`

**Types**:
- Core types: `src/types/index.ts` (Lesson, SearchFilters, User, etc.)
- Generated types: `src/types/database.types.ts` (from Supabase schema)
- Auth types: `src/types/auth.ts` (Permissions, Roles)

**Database**:
- Migration baseline: `supabase/migrations/20251001_production_baseline_snapshot.sql`
- Edge functions: `supabase/functions/*/index.ts`
- Migration guide: `supabase/migrations/README.md`

**Documentation**:
- Architecture (this file): `docs/ARCHITECTURE.md`
- Search system (2025 design plan, archived): `docs/archive/search-architecture-v2.md`
- Cleanup plan: `docs/archive/architecture-cleanup-guide.md` (archived)
- Testing: `docs/TESTING_GUIDE.md`
- RLS patterns: `docs/RLS_SECURITY.md`

---

### D. Glossary

**Terms**:
- **Canonical lesson**: The "official" version when duplicates exist (others archived)
- **Normalized columns**: Typed PostgreSQL columns (TEXT[], INT) vs flexible JSONB
- **RLS**: Row Level Security - PostgreSQL policies controlling data access
- **tsvector**: PostgreSQL full-text search data type (indexed words)
- **GIN index**: Generalized Inverted Index - fast for arrays, JSON, full-text
- **IVFFlat**: Inverted File Flat - approximate nearest neighbor for vectors
- **Snapshot migration**: Single migration file capturing entire schema state

**Acronyms**:
- **RLS**: Row Level Security
- **RPC**: Remote Procedure Call (Supabase function invocation)
- **FTS**: Full-Text Search
- **SEL**: Social-Emotional Learning
- **ESYNYC**: Edible Schoolyard NYC (client organization)
- **UUID**: Universally Unique Identifier
- **JSONB**: JSON Binary (PostgreSQL optimized JSON storage)

---

## Questions & Support

**For schema questions**: See `supabase/migrations/README.md`
**For RLS issues**: See `docs/RLS_SECURITY.md`
**For testing**: See `docs/TESTING_GUIDE.md`
**For cleanup roadmap**: See `docs/archive/architecture-cleanup-guide.md` (archived)

**Architecture decisions log**: `docs/architecture-decisions.md`

**Contact**: File issue in GitHub or check CLAUDE.md files in each directory for context-specific guidance.
