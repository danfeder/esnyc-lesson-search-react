-- =====================================================
-- Migration: 20260521000000_search_vector_with_concepts.sql
-- =====================================================
-- Description: Add academicConcepts to FTS search_vector (PR 3a, Task 3a.2).
--
-- Why: D5 (decision journal lines 264-274) — concepts should be searchable.
-- search_vector currently includes title (A); summary, main_ingredients,
-- observances_holidays, tags (B); garden_skills, cooking_skills,
-- thematic_categories, cultural_heritage (C); content_text (D). Concepts
-- live in lessons.metadata.academicConcepts as a {Subject: [concept,...]}
-- object (663/751 active rows on TEST as of this migration). They are
-- absent from FTS today, so a search for "decomposition" or "photosynthesis"
-- only matches body content, not the structured concept tag.
--
-- Changes:
--   (1) Helper public._flatten_academic_concepts(jsonb) -> text. Flattens
--       the {Subject: [concept,...]} shape to a single space-separated
--       string of subject keys + concept values.
--   (2) Trigger function public.update_lesson_search_vector() rewritten to
--       inline the setweight chain (instead of delegating to the immutable
--       helper public.generate_lesson_search_vector). The new chain folds
--       concepts into the C-weight block alongside thematic_categories,
--       cultural_heritage, garden_skills, cooking_skills.
--   (3) Trigger update_lesson_search_vector_trigger recreated with `metadata`
--       added to its UPDATE OF column list, so concept-only metadata changes
--       (e.g., complete_review_atomic writing concepts but no column-shape
--       mirror exists for the academicConcepts key) propagate to FTS.
--   (4) One-time backfill: `UPDATE lessons SET metadata = metadata` fires
--       the trigger for every row, regenerating search_vector with the new
--       concepts content. Idempotent in the sense that any future re-run
--       of the migration is a no-op for rows already-up-to-date.
--
-- Notes:
--   - public.generate_lesson_search_vector() stays unchanged (still granted
--     to anon / authenticated / service_role); the trigger no longer calls
--     it. Avoids the DROP/recreate-with-grants dance for an external-callable
--     function. It becomes effectively dead code in the trigger path and
--     can be retired in a follow-up cleanup migration if desired.
--   - lessons_normalize_write_trg also fires on the backfill UPDATE (no
--     column filter); existing rows already conform to its enum validators
--     and column⇄metadata sync, so it's a no-op pass for clean rows.
--   - Concept names get tokenized via the standard 'english' configuration,
--     so multi-word concepts like "plant parts" or "cultural traditions"
--     produce individual searchable tokens.

-- =====================================================
-- (1) Helper: flatten {Subject: [concept,...]} JSONB to space-separated text
-- =====================================================

CREATE OR REPLACE FUNCTION public._flatten_academic_concepts(p_concepts jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(string_agg(part, ' '), '')
  FROM (
    -- Subject keys (e.g., "Science", "Social Studies")
    SELECT key AS part
    FROM jsonb_each(COALESCE(p_concepts, '{}'::jsonb))
    UNION ALL
    -- Concept values inside each subject's array
    SELECT jsonb_array_elements_text(value) AS part
    FROM jsonb_each(COALESCE(p_concepts, '{}'::jsonb))
    WHERE jsonb_typeof(value) = 'array'
  ) parts;
$$;

ALTER FUNCTION public._flatten_academic_concepts(jsonb) OWNER TO postgres;
GRANT ALL ON FUNCTION public._flatten_academic_concepts(jsonb) TO anon;
GRANT ALL ON FUNCTION public._flatten_academic_concepts(jsonb) TO authenticated;
GRANT ALL ON FUNCTION public._flatten_academic_concepts(jsonb) TO service_role;

-- =====================================================
-- (2) Rewrite trigger function: inline weighting + include concepts
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_lesson_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.main_ingredients, ' '), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.observances_holidays, ' '), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english',
      COALESCE(array_to_string(NEW.garden_skills, ' '), '') || ' ' ||
      COALESCE(array_to_string(NEW.cooking_skills, ' '), '') || ' ' ||
      COALESCE(array_to_string(NEW.thematic_categories, ' '), '') || ' ' ||
      COALESCE(array_to_string(NEW.cultural_heritage, ' '), '') || ' ' ||
      public._flatten_academic_concepts(NEW.metadata->'academicConcepts')
    ), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.content_text, '')), 'D');
  RETURN NEW;
END;
$$;

-- =====================================================
-- (3) Recreate trigger with `metadata` in the UPDATE OF list
-- =====================================================

DROP TRIGGER IF EXISTS update_lesson_search_vector_trigger ON public.lessons;

CREATE TRIGGER update_lesson_search_vector_trigger
  BEFORE INSERT OR UPDATE OF
    title, summary,
    main_ingredients, garden_skills, cooking_skills,
    thematic_categories, cultural_heritage, observances_holidays,
    tags, content_text, metadata
  ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lesson_search_vector();

-- =====================================================
-- (4) Backfill: regenerate search_vector for every existing row
--     (no-op metadata write fires the new trigger)
-- =====================================================

UPDATE public.lessons SET metadata = metadata;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- -- Restore prior trigger (UPDATE OF list without `metadata`)
-- DROP TRIGGER IF EXISTS update_lesson_search_vector_trigger ON public.lessons;
-- CREATE TRIGGER update_lesson_search_vector_trigger
--   BEFORE INSERT OR UPDATE OF
--     title, summary, main_ingredients, garden_skills, cooking_skills,
--     thematic_categories, cultural_heritage, observances_holidays, tags,
--     content_text
--   ON public.lessons
--   FOR EACH ROW EXECUTE FUNCTION public.update_lesson_search_vector();
--
-- -- Restore prior trigger fn (delegates to generate_lesson_search_vector)
-- CREATE OR REPLACE FUNCTION public.update_lesson_search_vector()
-- RETURNS trigger
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--   NEW.search_vector := public.generate_lesson_search_vector(
--     NEW.title, NEW.summary, NEW.main_ingredients, NEW.garden_skills,
--     NEW.cooking_skills, NEW.thematic_categories, NEW.cultural_heritage,
--     NEW.observances_holidays, NEW.tags, NEW.content_text
--   );
--   RETURN NEW;
-- END;
-- $$;
--
-- -- Drop the helper
-- DROP FUNCTION IF EXISTS public._flatten_academic_concepts(jsonb);
--
-- -- Backfill rollback (regenerates search_vector without concepts)
-- UPDATE public.lessons SET metadata = metadata;
