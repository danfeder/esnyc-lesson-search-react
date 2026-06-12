-- =====================================================
-- Migration: fold_urban_revitalization_concept
-- =====================================================
-- Description: Fold the concept literal 'urban revitalization' into the
-- canonical label 'Advocacy' (PR 5b follow-up).
--
-- Why a follow-up: the Stage 1 concepts worksheet census matched TEST,
-- which lacks some PROD rows. The PR 5b PROD before-census (2026-06-12)
-- found this one literal outside the worksheet's 208 — a single appearance
-- on PROD-only lesson "Seed Bursts"
-- (1NqjpqXV8soDQs2W9HonavtlxQT4MbFI0H7pUdnH-mEI, Social Studies array).
-- Verdict issued 2026-06-12 by the verdict authority: fold into `advocacy`,
-- per the worksheet precedent `community activism` → Advocacy (the lesson
-- is community-garden activism). Recorded in the vocab artifact's
-- provenance.addenda (data/vocab/academic-concepts.vocab.json, emitted by
-- scripts/emit-concepts-vocab.py POST_WORKSHEET_ADDENDA).
--
-- Mechanism: same shape as 20260612000000_pr5b_concepts_canonicalization
-- with a single-pair alias map and no drops. Live rows only
-- (retired_at IS NULL); per-subject in-place rewrite with first-occurrence
-- dedupe (if 'Advocacy' is already co-tagged in the same array, the fold
-- collapses); subject keys otherwise untouched. No drops → no array can
-- empty → no key/object removal branch needed, but the structure keeps the
-- 5b NULL-handling for safety. FTS refreshes via
-- update_lesson_search_vector_trigger (UPDATE OF metadata).
--
-- Idempotent: 'Advocacy' is not the alias literal, so re-running matches
-- zero rows; the snapshot INSERT is ON CONFLICT DO NOTHING (the affected
-- PROD row is already in pr5b_concepts_rollback with its pre-5b original,
-- which is the correct restore point).
--
-- Expected impact: PROD 1 row / 1 appearance; TEST 0 rows (the lesson is
-- PROD-only); local 0 rows (seed data carries no such literal).

-- =====================================================
-- (1) Rollback snapshot — reuses the PR 5b table; no-op for rows already
--     snapshotted by 20260612000000
-- =====================================================

INSERT INTO public.pr5b_concepts_rollback (lesson_id, metadata_academicconcepts)
SELECT l.lesson_id, l.metadata->'academicConcepts'
FROM public.lessons l
WHERE l.retired_at IS NULL
  AND jsonb_typeof(l.metadata->'academicConcepts') = 'object'
  AND EXISTS (
    SELECT 1
    FROM jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(s.arr) = 'array' THEN s.arr ELSE '[]'::jsonb END
    ) v(val)
    WHERE v.val = 'urban revitalization'
  )
ON CONFLICT (lesson_id) DO NOTHING;

-- =====================================================
-- (2) Rewrite: 'urban revitalization' → 'Advocacy', per-subject dedupe
-- =====================================================

WITH alias_map(alias, canonical) AS (
  VALUES
    ('urban revitalization', 'Advocacy')
)
UPDATE public.lessons l
SET metadata = (
  SELECT CASE
           WHEN agg.new_obj IS NULL THEN l.metadata - 'academicConcepts'
           ELSE jsonb_set(l.metadata, '{academicConcepts}', agg.new_obj)
         END
  FROM (
    SELECT jsonb_object_agg(per_subject.subj, per_subject.new_arr) AS new_obj
    FROM (
      SELECT s.subj,
             CASE
               WHEN jsonb_typeof(s.arr) <> 'array' THEN s.arr  -- passthrough (none in corpus)
               ELSE (
                 SELECT jsonb_agg(mapped.val ORDER BY mapped.first_ord)
                 FROM (
                   SELECT COALESCE(m.canonical, u.val) AS val, min(u.ord) AS first_ord
                   FROM jsonb_array_elements_text(s.arr) WITH ORDINALITY u(val, ord)
                   LEFT JOIN alias_map m ON m.alias = u.val
                   GROUP BY COALESCE(m.canonical, u.val)
                 ) mapped
               )
             END AS new_arr
      FROM jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
    ) per_subject
    WHERE per_subject.new_arr IS NOT NULL
  ) agg
)
WHERE l.retired_at IS NULL
  AND jsonb_typeof(l.metadata->'academicConcepts') = 'object'
  AND EXISTS (
    SELECT 1
    FROM jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(s.arr) = 'array' THEN s.arr ELSE '[]'::jsonb END
    ) v(val)
    WHERE v.val IN (SELECT alias FROM alias_map)
  );

-- =====================================================
-- (3) Post-verify: the literal is gone from live rows; no empty subject
--     array or empty academicConcepts object was produced
-- =====================================================

DO $$
DECLARE
  v_literal_rows integer;
  v_empty_array_rows integer;
  v_empty_object_rows integer;
BEGIN
  SELECT count(*) INTO v_literal_rows
  FROM public.lessons l
  WHERE l.retired_at IS NULL
    AND jsonb_typeof(l.metadata->'academicConcepts') = 'object'
    AND EXISTS (
      SELECT 1
      FROM jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
      CROSS JOIN LATERAL jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(s.arr) = 'array' THEN s.arr ELSE '[]'::jsonb END
      ) v(val)
      WHERE v.val = 'urban revitalization'
    );

  SELECT count(*) INTO v_empty_array_rows
  FROM public.lessons l
  WHERE l.retired_at IS NULL
    AND jsonb_typeof(l.metadata->'academicConcepts') = 'object'
    AND EXISTS (
      SELECT 1
      FROM jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
      WHERE s.arr = '[]'::jsonb
    );

  SELECT count(*) INTO v_empty_object_rows
  FROM public.lessons l
  WHERE l.retired_at IS NULL
    AND l.metadata->'academicConcepts' = '{}'::jsonb;

  IF v_literal_rows > 0 OR v_empty_array_rows > 0 OR v_empty_object_rows > 0 THEN
    RAISE EXCEPTION
      'urban revitalization fold failed post-verify: % live rows with the literal, % with empty subject array, % with empty academicConcepts object',
      v_literal_rows, v_empty_array_rows, v_empty_object_rows;
  END IF;
END $$;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- The affected row's pre-PR-5b original is in pr5b_concepts_rollback
-- (snapshotted by 20260612000000 on PROD; the INSERT above is a no-op
-- there). Restoring from it would revert BOTH PR 5b's canonicalization and
-- this fold for that row:
--
-- UPDATE public.lessons l
-- SET metadata = jsonb_set(l.metadata, '{academicConcepts}', r.metadata_academicconcepts)
-- FROM public.pr5b_concepts_rollback r
-- WHERE l.lesson_id = r.lesson_id
--   AND l.lesson_id = '1NqjpqXV8soDQs2W9HonavtlxQT4MbFI0H7pUdnH-mEI';
--
-- To revert ONLY this fold: replace 'Advocacy' with 'urban revitalization'
-- in the row's Social Studies array (forward migration, hand-written).
