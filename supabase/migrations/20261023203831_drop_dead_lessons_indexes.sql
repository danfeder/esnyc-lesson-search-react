-- =====================================================
-- Migration: 20261023203831_drop_dead_lessons_indexes.sql
-- =====================================================
-- Description: Drop four indexes on public.lessons that the planner never uses
--   (refactor-audit Tier 5 item 3).
--
--   1) idx_lessons_summary / idx_lessons_title are byte-identical twins of
--      idx_lessons_summary_trgm / idx_lessons_title_trgm (flagged in the 2025 baseline
--      docs, never removed). Either twin is redundant; the _trgm pair is the one the
--      planner currently picks. PROD pg_stat_user_indexes 2026-10-21: the _trgm pair
--      carries every scan (3,254 / 3,323); the base-named pair has 0 scans (TEST:
--      4,565 / 4,636 vs 0 / 0). So the base-named pair goes — NOT the _trgm pair the old
--      ARCHITECTURE.md text proposed dropping.
--   2) idx_lessons_academic and idx_lessons_sel index metadata JSON paths that no live
--      predicate touches (search_lessons is column-based; smart-search's applyFilters
--      has no academic/SEL branch). 0 scans on PROD and TEST.
--
--   Saves ~6.6 MB of 70 MB lessons index space and four index maintenance ops per
--   lessons write. Behavior-neutral: the planner already uses the kept twins.
--
-- BEGIN/COMMIT so the guard can abort the file (supabase db push autocommits per
-- statement). Plain DROP INDEX (not CONCURRENTLY — incompatible with the transaction
-- wrapper) takes a brief ACCESS EXCLUSIVE lock on lessons; on an 852-row table that is
-- milliseconds. No explicit LOCK TABLE: no row data is mutated.
--
-- Rollback (comments at the bottom): CREATE INDEX for each dropped index.

BEGIN;

DO $$
DECLARE
  v_pairs int;
  v_bad   text;
BEGIN
  -- (1) the twins must still be byte-identical modulo their names
  SELECT count(*) INTO v_pairs
    FROM pg_indexes keep
    JOIN pg_indexes dropme
      ON keep.schemaname = dropme.schemaname AND keep.tablename = dropme.tablename
     AND replace(keep.indexdef, keep.indexname, '?') = replace(dropme.indexdef, dropme.indexname, '?')
   WHERE keep.schemaname = 'public' AND keep.tablename = 'lessons'
     AND (keep.indexname, dropme.indexname) IN (('idx_lessons_summary_trgm', 'idx_lessons_summary'),
                                                ('idx_lessons_title_trgm',   'idx_lessons_title'));
  IF v_pairs <> 2 THEN
    RAISE EXCEPTION 'drop_dead_lessons_indexes: expected 2 identical twin pairs, found %', v_pairs;
  END IF;

  -- (2) the JSON-path indexes must still have the definitions this migration targets
  SELECT string_agg(want.indexname, ', ') INTO v_bad
    FROM (VALUES
      ('idx_lessons_academic', 'USING gin ((((metadata -> ''academicIntegration''::text) -> ''selected''::text)))'),
      ('idx_lessons_sel',      'USING gin (((metadata -> ''socialEmotionalLearning''::text)))')
    ) AS want(indexname, fragment)
   WHERE NOT EXISTS (
     SELECT 1 FROM pg_indexes i
      WHERE i.schemaname = 'public' AND i.tablename = 'lessons'
        AND i.indexname = want.indexname
        AND position(want.fragment IN i.indexdef) > 0);
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'drop_dead_lessons_indexes: missing index or definition drift: %', v_bad;
  END IF;
END $$;

DROP INDEX IF EXISTS public.idx_lessons_summary;   -- 0 scans; twin idx_lessons_summary_trgm kept
DROP INDEX IF EXISTS public.idx_lessons_title;     -- 0 scans; twin idx_lessons_title_trgm kept
DROP INDEX IF EXISTS public.idx_lessons_academic;  -- 0 scans; no predicate on metadata->'academicIntegration'->'selected'
DROP INDEX IF EXISTS public.idx_lessons_sel;       -- 0 scans; no predicate on metadata->'socialEmotionalLearning'

DO $$
DECLARE
  v_left int;
  v_kept int;
BEGIN
  SELECT count(*) INTO v_left FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'lessons'
     AND indexname IN ('idx_lessons_summary', 'idx_lessons_title', 'idx_lessons_academic', 'idx_lessons_sel');
  SELECT count(*) INTO v_kept FROM pg_indexes
   WHERE schemaname = 'public' AND tablename = 'lessons'
     AND indexname IN ('idx_lessons_summary_trgm', 'idx_lessons_title_trgm');
  IF v_left <> 0 OR v_kept <> 2 THEN
    RAISE EXCEPTION 'drop_dead_lessons_indexes: post-check failed (dropped-still-present=%, kept=%)', v_left, v_kept;
  END IF;
END $$;

COMMIT;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- CREATE INDEX IF NOT EXISTS idx_lessons_summary  ON public.lessons USING gin (summary gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_lessons_title    ON public.lessons USING gin (title gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_lessons_academic ON public.lessons USING gin (((metadata -> 'academicIntegration') -> 'selected'));
-- CREATE INDEX IF NOT EXISTS idx_lessons_sel      ON public.lessons USING gin ((metadata -> 'socialEmotionalLearning'));
