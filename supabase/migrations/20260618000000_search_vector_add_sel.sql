-- =====================================================
-- Migration: 20260618000000_search_vector_add_sel.sql
-- =====================================================
-- Description: Add social_emotional_learning (SEL) to the FTS search_vector
--              (Search Modernization "Medium", task S2.1 / G3 field indexing).
--
-- Why: G3 — distinctive pedagogical metadata should be typed-searchable.
-- social_emotional_learning is a filterable text[] column (688 populated +
-- searchable rows on TEST as of this migration) carrying discriminating values
-- like "Self-management", "Responsible decision-making", "Social awareness".
-- Those phrases are absent from the FTS index today, so a teacher searching
-- "responsible decision-making" only matches lessons that happen to mention the
-- phrase in title/summary/body — never the lessons that carry the SEL TAG but
-- never spell it out. This folds the SEL array into the existing C-weight block
-- (peer of garden_skills / cooking_skills / thematic_categories /
-- cultural_heritage / academicConcepts), so tag-only lessons become reachable.
--
-- Scope note (design §6, locked): SEL only. core_competencies (788/788 rows =
-- a ranking stopword) and academic_integration (subjects already saturate
-- bodies) are EXCLUDED unless the S2.2 eval scorecard shows measured lift.
--
-- Changes:
--   (1) CREATE OR REPLACE public.update_lesson_search_vector() — clones the
--       current live definition (byte-identical to 20260521000000) and inserts
--       one line: COALESCE(array_to_string(NEW.social_emotional_learning,' '),'')
--       into the C-weight to_tsvector(), immediately before the academicConcepts
--       flatten call. No other weight/field changes.
--   (2) Recreate update_lesson_search_vector_trigger with
--       `social_emotional_learning` appended to its UPDATE OF column list
--       (currently ends at ...content_text, metadata). Without this, a future
--       reviewer edit that touches ONLY social_emotional_learning would not
--       re-fire the trigger and the row's vector would go stale.
--   (3) One-time full backfill: `UPDATE public.lessons SET metadata = metadata`
--       fires the new trigger for EVERY row, regenerating search_vector with the
--       SEL content. MANDATORY (not a delta): max(updated_at) is 2026-04-27,
--       BEFORE the June re-tag, so a delta backfill would miss the entire
--       re-tagged corpus.
--
-- Notes:
--   - public._flatten_academic_concepts(jsonb) is unchanged and still called.
--   - lessons_normalize_write_trg also fires on the backfill UPDATE (no column
--     filter); existing rows already conform to its validators / column⇄metadata
--     sync, so it is a no-op pass for clean rows (same as 20260521000000).
--   - SEL values get tokenized via the standard 'english' configuration, so
--     "Self-management" and "Responsible decision-making" produce individual
--     searchable tokens (self, management, responsible, decision, making).
--   - Idempotent: CREATE OR REPLACE + DROP TRIGGER IF EXISTS + recreate; the
--     backfill is a no-op for rows already up to date. Safe to re-run.

-- =====================================================
-- (1) Rewrite trigger function: add SEL to the C-weight block
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
      COALESCE(array_to_string(NEW.social_emotional_learning, ' '), '') || ' ' ||
      public._flatten_academic_concepts(NEW.metadata->'academicConcepts')
    ), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.content_text, '')), 'D');
  RETURN NEW;
END;
$$;

-- =====================================================
-- (2) Recreate trigger with `social_emotional_learning` in the UPDATE OF list
-- =====================================================

DROP TRIGGER IF EXISTS update_lesson_search_vector_trigger ON public.lessons;

CREATE TRIGGER update_lesson_search_vector_trigger
  BEFORE INSERT OR UPDATE OF
    title, summary,
    main_ingredients, garden_skills, cooking_skills,
    thematic_categories, cultural_heritage, observances_holidays,
    tags, content_text, metadata, social_emotional_learning
  ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lesson_search_vector();

-- =====================================================
-- (3) Backfill: regenerate search_vector for every existing row
--     (no-op metadata write fires the new trigger)
-- =====================================================

UPDATE public.lessons SET metadata = metadata;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- -- Restore prior trigger (UPDATE OF list WITHOUT social_emotional_learning)
-- DROP TRIGGER IF EXISTS update_lesson_search_vector_trigger ON public.lessons;
-- CREATE TRIGGER update_lesson_search_vector_trigger
--   BEFORE INSERT OR UPDATE OF
--     title, summary, main_ingredients, garden_skills, cooking_skills,
--     thematic_categories, cultural_heritage, observances_holidays, tags,
--     content_text, metadata
--   ON public.lessons
--   FOR EACH ROW EXECUTE FUNCTION public.update_lesson_search_vector();
--
-- -- Restore prior trigger fn (C-weight block WITHOUT the SEL line)
-- CREATE OR REPLACE FUNCTION public.update_lesson_search_vector()
-- RETURNS trigger
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--   NEW.search_vector :=
--     setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
--     setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
--     setweight(to_tsvector('english', COALESCE(array_to_string(NEW.main_ingredients, ' '), '')), 'B') ||
--     setweight(to_tsvector('english', COALESCE(array_to_string(NEW.observances_holidays, ' '), '')), 'B') ||
--     setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B') ||
--     setweight(to_tsvector('english',
--       COALESCE(array_to_string(NEW.garden_skills, ' '), '') || ' ' ||
--       COALESCE(array_to_string(NEW.cooking_skills, ' '), '') || ' ' ||
--       COALESCE(array_to_string(NEW.thematic_categories, ' '), '') || ' ' ||
--       COALESCE(array_to_string(NEW.cultural_heritage, ' '), '') || ' ' ||
--       public._flatten_academic_concepts(NEW.metadata->'academicConcepts')
--     ), 'C') ||
--     setweight(to_tsvector('english', COALESCE(NEW.content_text, '')), 'D');
--   RETURN NEW;
-- END;
-- $$;
--
-- -- Backfill rollback (regenerates search_vector without SEL)
-- UPDATE public.lessons SET metadata = metadata;
