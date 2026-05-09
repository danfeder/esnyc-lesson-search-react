-- =====================================================
-- Migration: 20260520120000_season_timing_drift_repair_2.sql
-- =====================================================
-- Description: PR 3a round 1 fix-up — strip non-canonical metadata.seasonTiming
-- key from rows that would cause 20260521000000_search_vector_with_concepts.sql's
-- bare UPDATE (line 121) to fail valid_seasons CHECK via lessons_normalize_write
-- section (G) deriving column from drifted metadata.
--
-- Issue: PR #479 round 1 E2E migration apply failed at 20260521000000
-- statement 8 with "ERROR: new row for relation \"lessons\" violates check
-- constraint \"valid_seasons\" (SQLSTATE 23514)". Confirmed identical 1-row
-- drift on both TEST and PROD pre-merge via mcp__supabase-test and
-- mcp__supabase-remote audits:
--   - lesson_2d43fc766fa14401b48065f167003ded (The Apple Story):
--     metadata.seasonTiming=["end-of-year"]  (kebab-lowercase, not in valid_seasons)
-- Row has empty season_timing column. The bare UPDATE (`SET metadata = metadata`)
-- fires the lessons_normalize_write trigger; trigger section (G) sees
-- column-empty + metadata-array-with-content and derives
-- `NEW.season_timing := ARRAY['end-of-year']`, which violates the baseline
-- `valid_seasons` CHECK (`<@ ARRAY['Fall','Winter','Spring','Summer']`).
--
-- This is the same failure shape as PR #475 round 2 (precedent migration
-- 20260511120000_season_timing_drift_repair.sql). The 2 rows that the prior
-- repair fixed both had `metadata ? 'lessonFormat'`, which is why the prior
-- migration's WHERE clause included that predicate. Apple Story did not have
-- lessonFormat at audit time on 2026-05-11 (or has accumulated drift since
-- via a downstream write); the prior pattern-based repair did not match it.
-- This round 2 repair drops the `lessonFormat` predicate (lessonFormat key
-- no longer exists on any row post-20260512000000 column drop) so the
-- pattern-based filter catches any row with the column-empty + non-canonical
-- shape regardless of other key membership.
--
-- Approach: SR-B (defensive WHERE-clause), same as the round-1 precedent.
-- Strip seasonTiming key from any row matching the failure pattern
-- (column-empty + non-canonical metadata.seasonTiming). Idempotent (re-run
-- matches 0 rows). Pattern-based, so the same migration body works on
-- whatever drift TEST and PROD have at the time of CI/PROD apply (audited
-- equal: 1 row each at 2026-05-08).
--
-- Filename: 20260520120000_* sorts BETWEEN 20260520030000 (last applied
-- migration on TEST) and 20260521000000 (failed mid-apply on TEST, rolled
-- back cleanly per supabase_migrations.schema_migrations probe). When CI
-- re-runs `supabase db push` after this migration is pushed, the new file
-- becomes the next pending migration and runs BEFORE the search-vector
-- bare UPDATE.
--
-- Forward-only: original drift values ('end-of-year') are not reconstructible
-- after the key strip. Net data loss = 1 row × 1 metadata key. Stage 2
-- corpus re-tag will re-derive seasonTiming for the row. (lesson_versions
-- archive does not contain prior versions of this row at audit time.)
--
-- See:
--   docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status.md
--     (Session 56 — PR 3a ritual round 1)
--   docs/plans/2026-05-03-metadata-rebuild-foundation-design.md §4 (schema)
--   supabase/migrations/20260511120000_season_timing_drift_repair.sql (round 1 precedent)
--   supabase/migrations/20260521000000_search_vector_with_concepts.sql:121 (the bare UPDATE)
--   supabase/migrations/20260512000000_drop_lesson_format.sql:857-876 (trigger §G)
-- =====================================================


-- =====================================================
-- (1) Strip non-canonical seasonTiming key from rows that would otherwise
--     cause the bare UPDATE in 20260521000000 to fail.
-- =====================================================

UPDATE public.lessons
SET metadata = metadata - 'seasonTiming'
WHERE COALESCE(array_length(season_timing, 1), 0) = 0
  AND metadata ? 'seasonTiming'
  AND jsonb_typeof(metadata->'seasonTiming') IN ('string', 'array')
  AND (
    (jsonb_typeof(metadata->'seasonTiming') = 'string'
      AND (metadata->>'seasonTiming') NOT IN ('Fall', 'Winter', 'Spring', 'Summer'))
    OR (
      jsonb_typeof(metadata->'seasonTiming') = 'array'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(metadata->'seasonTiming') AS v(value)
        WHERE v.value NOT IN ('Fall', 'Winter', 'Spring', 'Summer')
      )
    )
  );


-- =====================================================
-- ROLLBACK (kept as comments — forward-only migration)
-- =====================================================
-- The seasonTiming key strip is forward-only — original drift values
-- ('end-of-year') cannot be reconstructed from the schema. If a future
-- reviewer or Stage 2 worksheet needs the original values, the historical
-- record lives in:
--   - this migration's Description block (lesson_id + value pairs above),
--   - the round-1 PR #479 conversation,
--   - the corresponding execution-status doc Session 56 entry.
--
-- To roll back the schema effect (re-add the seasonTiming key), see
-- 20260515000000_metadata_value_validation.sql.rollback for the inert
-- placeholder convention.
