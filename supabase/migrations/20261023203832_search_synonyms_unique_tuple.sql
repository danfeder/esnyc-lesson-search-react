-- =====================================================
-- Migration: 20261023203832_search_synonyms_unique_tuple.sql
-- =====================================================
-- Description: Make the real uniqueness key of public.search_synonyms explicit
--   (refactor-audit Tier 5 item 4; the FP4-B2 deferral). Every seed so far has
--   guarded on the full (term, synonym_type, synonyms) tuple with WHERE NOT EXISTS
--   because no constraint enforced it. This adds the UNIQUE index and closes the
--   NULL hole by making synonym_type NOT NULL (0 NULL rows on PROD, TEST and local;
--   all live expansion functions already ignore NULL-typed rows).
--
--   Future seeds: INSERT ... ON CONFLICT (term, synonym_type, synonyms) DO NOTHING.
--   Existing pushed seed migrations are NOT edited (ledger rule).
--
-- BEGIN/COMMIT so the census guard can abort the file. Touches only search_synonyms.
-- Rollback in comments at the bottom.

BEGIN;

DO $$
DECLARE
  v_total    int;
  v_distinct int;
  v_nulls    int;
BEGIN
  SELECT count(*),
         count(DISTINCT (term, synonym_type, synonyms)),
         count(*) FILTER (WHERE synonym_type IS NULL)
    INTO v_total, v_distinct, v_nulls
    FROM public.search_synonyms;

  IF v_nulls <> 0 THEN
    RAISE EXCEPTION 'search_synonyms_unique_tuple: % row(s) have NULL synonym_type — resolve before SET NOT NULL', v_nulls;
  END IF;
  IF v_total <> v_distinct THEN
    RAISE EXCEPTION 'search_synonyms_unique_tuple: % duplicate (term, synonym_type, synonyms) row(s) (total=%, distinct=%)',
      v_total - v_distinct, v_total, v_distinct;
  END IF;
END $$;

ALTER TABLE public.search_synonyms
  ALTER COLUMN synonym_type SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS search_synonyms_term_type_synonyms_key
  ON public.search_synonyms (term, synonym_type, synonyms);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
     WHERE c.relname = 'search_synonyms_term_type_synonyms_key' AND i.indisunique AND i.indisvalid
  ) THEN
    RAISE EXCEPTION 'search_synonyms_unique_tuple: unique index missing or invalid';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_attribute
     WHERE attrelid = 'public.search_synonyms'::regclass AND attname = 'synonym_type' AND NOT attnotnull
  ) THEN
    RAISE EXCEPTION 'search_synonyms_unique_tuple: synonym_type still nullable';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- DROP INDEX IF EXISTS public.search_synonyms_term_type_synonyms_key;
-- ALTER TABLE public.search_synonyms ALTER COLUMN synonym_type DROP NOT NULL;
