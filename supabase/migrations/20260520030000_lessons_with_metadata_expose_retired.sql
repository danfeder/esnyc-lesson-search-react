-- =====================================================
-- Migration: 20260520030000_lessons_with_metadata_expose_retired.sql
-- =====================================================
-- Description:
--   PR 4 follow-up — recreate `public.lessons_with_metadata` view to expose
--   `retired_at` and `retired_reason` columns (added to the base `lessons`
--   table by sibling migration `20260520000000_corpus_cleanup_retire_imports.sql`).
--
--   Without this projection, the per-consumer `.is('retired_at', null)` filter
--   added by sibling migration `20260520020000_search_lessons_filter_retired.sql`
--   and the TS edits in commit `f522740` (smart-search edge fn / search-lessons
--   edge fn / useLessonStats hook) would fail with PostgREST 400
--   `column lessons_with_metadata.retired_at does not exist`. PostgreSQL views
--   defined with explicit column lists do NOT auto-include columns added to the
--   base table afterwards.
--
--   The 3 affected call sites are:
--     - src/hooks/useLessonStats.ts:25-28 (homepage stat counter)
--     - supabase/functions/smart-search/index.ts:154-161 (live front-end suggestions)
--     - supabase/functions/search-lessons/index.ts:61-68 (deployed-but-not-called-from-front-end)
--
--   The `search_lessons` RPC body (also added in `20260520020000`) queries the
--   underlying `lessons` table directly so it sees the new columns without any
--   view change. The fix here is exclusively to surface those columns through
--   the view for the `from('lessons_with_metadata').is(...)` chain shape.
--
-- Why CREATE OR REPLACE VIEW (not DROP+CREATE):
--   PostgreSQL's `CREATE OR REPLACE VIEW` permits **appending** new columns to
--   the end of an existing view's column list (existing column names / order /
--   types must remain unchanged). The 2 new columns slot in at the end.
--
--   No view dependents (RLS policies, triggers, other views) exist that would
--   require CASCADE; same as the precedent set in
--   `20260512000000_drop_lesson_format.sql` for the `lesson_format` compat
--   bridge change.
--
-- =====================================================
-- CREATE OR REPLACE lessons_with_metadata (append retired_at + retired_reason)
-- =====================================================
-- The body below is byte-identical to the version established in
-- `20260512000000_drop_lesson_format.sql:78-135` except for the 2 new
-- columns appended after `materials_array`.
CREATE OR REPLACE VIEW public.lessons_with_metadata AS
  SELECT
    l.id,
    l.lesson_id,
    l.title,
    l.summary,
    l.file_link,
    l.grade_levels,
    l.metadata,
    l.confidence,
    l.search_vector,
    l.created_at,
    l.updated_at,
    l.content_text,
    l.content_embedding,
    l.content_hash,
    l.canonical_id,
    l.version_number,
    l.has_versions,
    l.original_submission_id,
    l.last_modified,
    l.thematic_categories,
    l.cultural_heritage,
    l.observances_holidays,
    l.location_requirements,
    l.season_timing,
    l.academic_integration,
    l.social_emotional_learning,
    l.cooking_methods,
    l.main_ingredients,
    l.cultural_responsiveness_features,
    l.garden_skills,
    l.cooking_skills,
    l.core_competencies,
    NULL::text AS lesson_format,                       -- compat bridge; drops in Task 1.3a
    l.processing_notes,
    l.review_notes,
    l.flagged_for_review,
    l.tags,
    (l.metadata ->> 'activity_type'::text) AS activity_type_meta,
    (l.metadata ->> 'location'::text) AS location_meta,
    (l.metadata ->> 'season'::text) AS season_meta,
    (l.metadata ->> 'timing'::text) AS timing_meta,
    (l.metadata ->> 'group_size'::text) AS group_size_meta,
    (l.metadata ->> 'duration_minutes'::text) AS duration_minutes_meta,
    (l.metadata ->> 'prep_time_minutes'::text) AS prep_time_minutes_meta,
    ((l.metadata ->> 'grade_levels'::text))::jsonb AS grade_levels_array,
    ((l.metadata ->> 'themes'::text))::jsonb AS themes_array,
    ((l.metadata ->> 'core_competencies'::text))::jsonb AS core_competencies_array,
    ((l.metadata ->> 'cultural_heritage'::text))::jsonb AS cultural_heritage_array,
    ((l.metadata ->> 'academic_integration'::text))::jsonb AS academic_integration_array,
    ((l.metadata ->> 'sel_competencies'::text))::jsonb AS sel_competencies_array,
    ((l.metadata ->> 'observances'::text))::jsonb AS observances_array,
    ((l.metadata ->> 'main_ingredients'::text))::jsonb AS main_ingredients_array,
    ((l.metadata ->> 'garden_skills'::text))::jsonb AS garden_skills_array,
    ((l.metadata ->> 'cooking_skills'::text))::jsonb AS cooking_skills_array,
    ((l.metadata ->> 'materials'::text))::jsonb AS materials_array,
    -- NEW (PR 4): soft-delete columns. Live consumers filter `WHERE
    -- retired_at IS NULL` via PostgREST `.is('retired_at', null)`. The
    -- view itself does not bake a filter — detect-duplicates and the
    -- review queue's lesson-title lookup still need to see retired rows
    -- so future re-submissions are caught.
    l.retired_at,
    l.retired_reason
  FROM public.lessons l;

COMMENT ON VIEW public.lessons_with_metadata IS
  'View of lessons with metadata fields extracted. Uses INVOKER security (respects RLS). lesson_format projection is a NULL::text compat bridge as of 20260512000000_drop_lesson_format.sql; the bridge drops in the Task 1.3a follow-up migration. retired_at + retired_reason added by 20260520030000 (PR 4) — view stays unfiltered; consumers apply the filter at the query site so detect-duplicates + reviewer dup-flow can keep seeing retired rows.';


-- Force PostgREST to reload its schema cache so the new column names are
-- picked up immediately. Without this, PostgREST may continue to return 400
-- on `.is('retired_at', null)` until its periodic cache refresh fires.
NOTIFY pgrst, 'reload schema';


-- =====================================================
-- VERIFICATION (informational)
-- =====================================================
-- Expected post-apply behavior:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='lessons_with_metadata'
--      AND column_name IN ('retired_at','retired_reason')
--    ORDER BY column_name;
--   -- Returns 2 rows.
--
--   SELECT count(*) FROM lessons_with_metadata WHERE retired_at IS NULL;
--   -- Returns the live-corpus count (e.g., 767 on PROD post-PR-4).

-- =====================================================
-- ROLLBACK (kept as comments)
-- =====================================================
-- To revert: re-apply `20260512000000_drop_lesson_format.sql` view body verbatim
-- (without the 2 new columns at the end). The CREATE OR REPLACE preserves the
-- view identity; consumer queries that reference `retired_at` would then start
-- failing — only do this if also reverting the consumer edits.
--
--   -- Re-run the CREATE OR REPLACE VIEW block from `20260512000000`
--   -- minus the trailing `l.retired_at, l.retired_reason` lines.
--   NOTIFY pgrst, 'reload schema';
