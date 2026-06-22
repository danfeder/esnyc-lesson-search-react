-- =====================================================
-- Migration: 20260622000000_wave4_pr1_close_stuck_submissions_fix_season.sql
-- =====================================================
-- Description: Wave 4 (data/corpus cleanup) PR 1 — two reversible data cleanups.
--   Section C12: close the stale, never-reviewed submission backlog
--                (status='submitted' AND created_at < '2026-05-01').
--   Section C83: normalize string-typed submission_reviews.tagged_metadata->'season'
--                values to arrays by backfilling from each review's resolved
--                published lesson's metadata->'seasonTiming'.
--
-- Design doc: docs/plans/2026-06-22-wave4-data-corpus-cleanup-design.md (§4 Q1-Q5, §5 PR1, §6)
-- Implementation: docs/plans/2026-06-22-wave4-data-corpus-cleanup-implementation.md (Task 1.2)
--
-- DATA SAFETY (Wave 4 ethos): snapshot-before-mutate, guarded, idempotent.
--   Each section captures a dedicated rollback snapshot table BEFORE its UPDATE
--   and asserts an env-independent post-condition. The matching
--   .sql.rollback file restores exact prior values from those snapshots.
--
-- ENV-INDEPENDENT — DO NOT hardcode counts. TEST = 17 stuck (15 new + 2 update),
--   PROD = 14 stuck (14 new, 0 update); local = 0. The scope predicate + the
--   asserts self-adapt per database. Guards pass cleanly on zero rows (local).
--
-- Schema-conformance (verified against the production baseline snapshot + local DB):
--   - lesson_submissions: id uuid PK, status text, reviewer_notes text,
--     reviewed_at timestamptz, updated_at timestamptz, created_at timestamptz,
--     submission_type text. status CHECK includes 'rejected'
--     (20260428000000_phase_4_constraints.sql).
--   - updated_at BEFORE-UPDATE trigger = trigger_lesson_submissions_updated_at
--     (production baseline snapshot, line 2774) — handled in the .rollback.
--   - submission_reviews: id uuid PK, tagged_metadata jsonb,
--     canonical_lesson_id text, submission_id uuid.
--   - lessons: lesson_id text PK, metadata jsonb, original_submission_id uuid.
--   - C83 join keys are type-compatible: canonical_lesson_id(text)=lesson_id(text),
--     submission_id(uuid)=original_submission_id(uuid).

-- =====================================================
-- SECTION C12 — close stale, never-reviewed submissions
-- =====================================================

-- Snapshot BEFORE mutate (Constraint 2). Capture each affected row's exact prior
-- state, including updated_at (Codex C12-MED) so the rollback can restore it
-- without the BEFORE-UPDATE trigger re-stamping it.
-- Service-role-only: RLS enabled, NO policies (mirrors pr6_retag_rollback precedent).
CREATE TABLE IF NOT EXISTS public.wave4_c12_submissions_rollback (
  id uuid PRIMARY KEY,
  status text NOT NULL,
  reviewer_notes text,
  reviewed_at timestamptz,
  updated_at timestamptz,
  snapshotted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wave4_c12_submissions_rollback ENABLE ROW LEVEL SECURITY;

INSERT INTO public.wave4_c12_submissions_rollback (id, status, reviewer_notes, reviewed_at, updated_at)
SELECT id, status, reviewer_notes, reviewed_at, updated_at
FROM public.lesson_submissions
WHERE status = 'submitted' AND created_at < '2026-05-01'
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  n_new  int;
  n_upd  int;
  n_left int;
BEGIN
  -- Snapshot-driven mutation (GATE-2 Codex C1): drive both UPDATEs FROM the rollback
  -- snapshot so the mutation set can NEVER exceed the snapshotted set (closes the
  -- snapshot/UPDATE TOCTOU window — a row that became eligible after the snapshot
  -- INSERT cannot be mutated without rollback coverage). The status='submitted' guard
  -- keeps it idempotent (a re-run flips 0 rows); created_at is read from the live row
  -- (immutable) for the note text.
  -- 'new' rows: stale, never-reviewed teacher submissions.
  UPDATE public.lesson_submissions ls
    SET status = 'rejected',
        reviewed_at = now(),
        reviewer_notes = 'Auto-closed during Wave 4 corpus cleanup (2026-06-22): stale submission, never reviewed (submitted '
                         || to_char(ls.created_at, 'YYYY-MM-DD')
                         || '). Closing to clear the review queue.'
    FROM public.wave4_c12_submissions_rollback s
    WHERE ls.id = s.id
      AND ls.status = 'submitted'
      AND ls.submission_type = 'new';
  GET DIAGNOSTICS n_new = ROW_COUNT;

  -- 'update' rows: orphan-recovery artifacts (TEST only; PROD has 0). Self-adapts
  -- via the submission_type predicate (2 rows TEST / 0 rows PROD/local).
  UPDATE public.lesson_submissions ls
    SET status = 'rejected',
        reviewed_at = now(),
        reviewer_notes = 'Auto-closed during Wave 4 corpus cleanup (2026-06-22): orphan-recovery artifact from the 2026-04-28 submission reconciliation; never a real teacher-driven update. Closing to clear the review queue.'
    FROM public.wave4_c12_submissions_rollback s
    WHERE ls.id = s.id
      AND ls.status = 'submitted'
      AND ls.submission_type = 'update';
  GET DIAGNOSTICS n_upd = ROW_COUNT;

  -- Env-independent post-condition: no stale submitted rows remain.
  SELECT count(*) INTO n_left
  FROM public.lesson_submissions
  WHERE status = 'submitted' AND created_at < '2026-05-01';

  IF n_left <> 0 THEN
    RAISE EXCEPTION 'C12 post-condition failed: % stale submitted rows remain', n_left;
  END IF;

  RAISE NOTICE 'C12: closed % new + % update stale submissions', n_new, n_upd;
END $$;

-- =====================================================
-- SECTION C83 — normalize string-typed review season values to arrays
-- =====================================================

-- Snapshot BEFORE mutate (Constraint 2). The original string values are
-- unrecoverable once they become arrays.
-- Service-role-only: RLS enabled, NO policies.
CREATE TABLE IF NOT EXISTS public.wave4_c83_season_rollback (
  review_id uuid PRIMARY KEY,
  original_season jsonb NOT NULL,
  snapshotted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wave4_c83_season_rollback ENABLE ROW LEVEL SECURITY;

INSERT INTO public.wave4_c83_season_rollback (review_id, original_season)
SELECT id, tagged_metadata->'season'
FROM public.submission_reviews
WHERE jsonb_typeof(tagged_metadata->'season') = 'string'
ON CONFLICT (review_id) DO NOTHING;

-- PRE-UPDATE guard (Codex C83-MED): every failing row must resolve to exactly
-- ONE lesson whose metadata->'seasonTiming' is a JSON array (length 0 allowed).
-- Fail loud on null / non-array / unresolved — NEVER let the UPDATE silently
-- coerce an unresolved row to [] (so [] is written ONLY from a genuinely
-- empty-source lesson). The scalar OUT-ref subqueries below ERROR on
-- >1 resolution, so multi-resolution fails loud automatically; this guard
-- adds the 0-resolution and non-array cases.
DO $$
DECLARE n_bad int;
BEGIN
  SELECT count(*) INTO n_bad
  FROM (
    SELECT COALESCE(
             (SELECT lc.metadata->'seasonTiming' FROM public.lessons lc WHERE lc.lesson_id = f.canonical_lesson_id),
             (SELECT lo.metadata->'seasonTiming' FROM public.lessons lo WHERE lo.original_submission_id = f.submission_id)
           ) AS lesson_season
    FROM (
      -- Snapshot-driven (GATE-2 Codex C1): same target set as the UPDATE below.
      SELECT sr.id, sr.canonical_lesson_id, sr.submission_id
      FROM public.wave4_c83_season_rollback rb
      JOIN public.submission_reviews sr ON sr.id = rb.review_id
      WHERE jsonb_typeof(sr.tagged_metadata->'season') = 'string'
    ) f
  ) q
  WHERE q.lesson_season IS NULL OR jsonb_typeof(q.lesson_season) <> 'array';

  IF n_bad <> 0 THEN
    RAISE EXCEPTION 'C83 pre-condition failed: % failing review(s) do not resolve to a single lesson with an array seasonTiming', n_bad;
  END IF;
END $$;

-- UPDATE: write the resolved published-lesson seasonTiming array directly.
-- jsonb_set with a jsonb array value guarantees the result is an array, never
-- a coerced string. CTE-driven (no hardcoded review IDs) — self-adapts per DB.
WITH failing AS (
  -- Snapshot-driven (GATE-2 Codex C1): only ever mutate the snapshotted target rows
  -- that are still string-typed (idempotent on re-run).
  SELECT sr.id, sr.canonical_lesson_id, sr.submission_id
  FROM public.wave4_c83_season_rollback rb
  JOIN public.submission_reviews sr ON sr.id = rb.review_id
  WHERE jsonb_typeof(sr.tagged_metadata->'season') = 'string'
),
resolved AS (
  SELECT f.id,
    COALESCE(
      (SELECT lc.metadata->'seasonTiming' FROM public.lessons lc WHERE lc.lesson_id = f.canonical_lesson_id),
      (SELECT lo.metadata->'seasonTiming' FROM public.lessons lo WHERE lo.original_submission_id = f.submission_id)
    ) AS lesson_season
  FROM failing f
)
UPDATE public.submission_reviews sr
SET tagged_metadata = jsonb_set(sr.tagged_metadata, '{season}', r.lesson_season)
FROM resolved r
WHERE sr.id = r.id;

-- POST-condition (env-independent).
DO $$
DECLARE
  n_string    int;
  n_not_array int;
  n_fixed     int;
BEGIN
  -- Target-scoped (GATE-2/3 Codex C2): every snapshotted target row still exists AND
  -- is now an array. LEFT JOIN + null-safe predicate so a missing row (sr.id IS NULL)
  -- or a null/missing season (IS DISTINCT FROM 'array') is COUNTED, not silently
  -- dropped by an inner join — proves completeness, not just "no string remains".
  SELECT count(*) INTO n_not_array
  FROM public.wave4_c83_season_rollback rb
  LEFT JOIN public.submission_reviews sr ON sr.id = rb.review_id
  WHERE sr.id IS NULL
     OR jsonb_typeof(sr.tagged_metadata->'season') IS DISTINCT FROM 'array';

  IF n_not_array <> 0 THEN
    RAISE EXCEPTION 'C83 post-condition failed: % snapshotted target row(s) missing or not normalized to an array', n_not_array;
  END IF;

  -- Belt-and-braces: no string-typed season value remains anywhere (catches a
  -- surprise row that appeared outside the snapshotted set).
  SELECT count(*) INTO n_string
  FROM public.submission_reviews
  WHERE jsonb_typeof(tagged_metadata->'season') = 'string';

  IF n_string <> 0 THEN
    RAISE EXCEPTION 'C83 post-condition failed: % string-typed season values remain', n_string;
  END IF;

  SELECT count(*) INTO n_fixed FROM public.wave4_c83_season_rollback;
  RAISE NOTICE 'C83: normalized % review season value(s) to arrays', n_fixed;
END $$;

-- =====================================================
-- ROLLBACK (keep as comments — full executable restore is in the sibling
-- 20260622000000_wave4_pr1_close_stuck_submissions_fix_season.sql.rollback)
-- =====================================================
-- C12: restore lesson_submissions(status, reviewer_notes, reviewed_at, updated_at)
--      from public.wave4_c12_submissions_rollback (with the updated_at trigger
--      temporarily disabled so updated_at is not re-stamped).
-- C83: restore submission_reviews.tagged_metadata->'season' from
--      public.wave4_c83_season_rollback via jsonb_set.
-- Snapshot tables are left in place as the recovery artifact.
