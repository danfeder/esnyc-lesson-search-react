**Search Architecture — V2 Plan (Code + Database)**

Purpose
- Unify search into a single SQL pipeline, shift all filters to normalized columns, and standardize ranking and pagination for speed, stability, and maintainability.

Current State (v1)
- RPC: public.search_lessons(search_query, filters..., page_size, page_offset)
- Uses to_tsquery over lessons.search_vector + trigram similarity on title/summary.
- Many filters read from JSONB metadata (e.g., metadata->'thematicCategories').
- Helpers: expand_search_with_synonyms(text) builds OR’d tsquery string; expand_cultural_heritage(text[]) expands hierarchical regions using cultural_heritage_hierarchy.
- Triggers: three triggers update search_vector; two variants call update_lesson_search_vector()/update_search_vector().
- Extensions in use: public.pg_trgm, public.unaccent, public.vector.

Key DB Findings (from Supabase inspection)
- Table public.lessons includes normalized columns for all filters:
  - grade_levels text[], thematic_categories text[], season_timing text[], core_competencies text[], cultural_heritage text[], location_requirements text[], activity_type text[], lesson_format text, academic_integration text[], social_emotional_learning text[], cooking_methods text[]
  - content_text (full-text source) and search_vector tsvector present
- Functions: search_lessons (v1), expand_search_with_synonyms, expand_cultural_heritage, generate_lesson_search_vector
- Triggers (duplicates): trigger_update_lesson_search_vector, update_lesson_search_vector_trigger, update_lessons_search_vector

V2 Goals (what changes)
- One RPC: search_lessons_v2 that:
  - Filters exclusively on normalized columns (no JSONB array extraction)
  - Preserves current parameter names (API compatible) but reads from normalized columns
  - Uses synonyms/culture expansion via existing SQL helpers
  - Returns total_count with every row (unchanged) and a consistent rank
- One trigger function + one trigger to maintain search_vector, using generate_lesson_search_vector() with weighted inputs
- Suggestion path: keep Edge Function ‘smart-search’ or add SQL-only suggestions; frontend already isolates suggestions via useLessonSuggestions

V2 RPC Sketch
- Signature (compatible params; v2 implementation):
  search_lessons_v2(
    search_query text DEFAULT NULL,
    filter_grade_levels text[] DEFAULT NULL,
    filter_themes text[] DEFAULT NULL,
    filter_seasons text[] DEFAULT NULL,
    filter_competencies text[] DEFAULT NULL,
    filter_cultures text[] DEFAULT NULL,
    filter_location text[] DEFAULT NULL,
    filter_activity_type text[] DEFAULT NULL,
    filter_lesson_format text DEFAULT NULL,
    filter_academic text[] DEFAULT NULL,
    filter_sel text[] DEFAULT NULL,
    filter_cooking_methods text[] DEFAULT NULL,
    page_size int DEFAULT 20,
    page_offset int DEFAULT 0
  ) RETURNS TABLE (..., total_count bigint)

- WHERE conditions (normalized):
  - (search_query is null OR search_vector @@ to_tsquery('english', expand_search_with_synonyms(search_query)) OR title % search_query OR summary % search_query)
  - grade_levels && filter_grade_levels
  - thematic_categories && filter_themes
  - season_timing && filter_seasons
  - core_competencies && filter_competencies
  - cultural_heritage && expand_cultural_heritage(filter_cultures)
  - location_requirements && filter_location
  - activity_type && filter_activity_type
  - (lesson_format = filter_lesson_format) when provided
    - Note: lesson_format is a single-select field stored as text (not array) and should use equality, unlike other array-backed filters that use &&
  - academic_integration && filter_academic
  - social_emotional_learning && filter_sel
  - (filter_cooking_methods IS NULL OR array_length(filter_cooking_methods, 1) IS NULL OR cooking_methods && filter_cooking_methods)
    - Note: cookingMethods is a multi-select in the UI and DB; use array overlap (&&) with text[] params

- Ranking (stable and explainable):
  - rank := GREATEST(
      ts_rank_cd(search_vector, to_tsquery('english', expand_search_with_synonyms(search_query))),
      similarity(title, search_query),
      0.8 * similarity(summary, search_query)
    )
  - ORDER BY rank DESC, COALESCE((confidence->>'overall')::float, 0) DESC, title ASC
  - Pagination via LIMIT page_size OFFSET page_offset (unchanged; may consider keyset later)

Indexes & Performance
- Keep GIN on lessons.search_vector for to_tsquery
- Keep one pg_trgm GIN/GIST on lessons.title and one on lessons.summary (drop duplicates)
- Add/confirm GIN on array columns queried with &&: thematic_categories, season_timing, core_competencies, cultural_heritage, location_requirements, activity_type, academic_integration, social_emotional_learning, cooking_methods
- Add BTREE on lesson_format (text) and updated_at (for sort=modified)
- Consider unaccent dictionary usage in search_vector pipeline if accent-insensitive search is desired
- Drop unused JSON-path indexes after v2 adoption

Triggers Cleanup
- Replace the three search_vector triggers with one:
  - BEFORE INSERT OR UPDATE OF title, summary, main_ingredients, garden_skills, cooking_skills, thematic_categories, cultural_heritage, observances_holidays, tags, content_text ON public.lessons FOR EACH ROW EXECUTE FUNCTION update_lesson_search_vector()
- Ensure only generate_lesson_search_vector path remains (drop update_search_vector once unused)

Frontend Integration
- Feature flag: VITE_ENABLE_SEARCH_V2 (already wired). Update getSearchRpcName() to route to 'search_lessons_v2' when ready
- Hooks: useLessonSearch already centralizes the RPC + pagination; only needs rpcName switch
- Params: Season filter name must remain filter_seasons (already corrected). Keep cookingMethods single-select (string) and check membership in cooking_methods[]
- Suggestions: keep useLessonSuggestions with Edge Function for now; optional future SQL-only suggestions via synonyms table

Security & RLS
- Keep RLS enforced on lessons; the RPC should not bypass policies
- The function should be STABLE and not SECURITY DEFINER; rely on caller privileges
- If materialized views or helper views are introduced, ensure they respect RLS as needed

Observability
- Use pg_stat_statements to monitor query performance
- Use index_advisor to suggest missing indexes during rollout
- Capture search timings and cache hit ratio (React Query) in frontend telemetry if desired

Rollout Plan
- Phase A (DB): Create search_lessons_v2 using normalized columns; add/validate indexes; consolidate to one trigger
- Phase B (FE): Flip feature flag on staging; validate parity and performance; regenerate Supabase types so RPC appears in TS
- Phase C: Switch default to v2 in getSearchRpcName(); leave flag for fallback for one release
- Phase D: Drop JSON-path indexes and old trigger function after confidence is high

Testing Plan
- DB: EXPLAIN ANALYZE representative queries with combinations of filters; verify index usage; compare v1 vs v2 latency
  - Success thresholds (staging):
    - P95 latency without search_query (filters-only): ≤ 200ms
    - P95 latency with search_query (tsquery + rank): ≤ 350ms
    - No sequential scan on lessons for typical queries; GIN/GIN-trgm indexes used
  - Result parity: v2 returns equivalent or narrower result sets vs v1; any differences should stem from normalized filter semantics (document cases)
- FE: Existing integration tests should pass unchanged; add a small suite to assert v2 routing via flag and param mapping

Risks & Mitigations
- Synonym expansion producing overly broad tsquery: handle with sane OR limits or rank thresholds
- Array filters growing large: ensure GIN indexes exist; consider partial indexes for hot values if needed
- Trigram similarity false positives: use GREATEST with ts_rank_cd to stabilize ranking
