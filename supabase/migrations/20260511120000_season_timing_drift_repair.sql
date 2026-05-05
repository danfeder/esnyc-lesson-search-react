-- =====================================================
-- Migration: 20260511120000_season_timing_drift_repair.sql
-- =====================================================
-- Description: PR 1 round 2 fix-up — strip non-canonical metadata.seasonTiming
-- key from rows that would cause 20260512000000_drop_lesson_format.sql's bare
-- UPDATE (line 986) to fail valid_seasons CHECK via lessons_normalize_write
-- section (G) deriving column from drifted metadata.
--
-- Issue: PR #475 round 1 E2E migration apply failed at 20260512000000 step
-- (5) with "ERROR: new row for relation \"lessons\" violates check
-- constraint \"valid_seasons\" (SQLSTATE 23514)". Confirmed identical 2-row
-- drift on both TEST and PROD pre-merge via mcp__supabase-test and
-- mcp__supabase-remote audits:
--   - lesson_f2466c648cb44ed597d5b49f2d51ffbd: metadata.seasonTiming=["end-of-year"]
--   - lesson_1753316245157_flurdiez2:         metadata.seasonTiming=["fall"]   (case-mixed)
-- Both rows have empty season_timing column AND lessonFormat key in metadata.
-- The bare UPDATE (`SET metadata = metadata - 'lessonFormat'`) fires the
-- lessons_normalize_write trigger; trigger section (G) sees column-empty +
-- metadata-array-with-content and derives
-- `NEW.season_timing := ARRAY[non-canonical-value]`, which violates the
-- baseline `valid_seasons` CHECK (`<@ ARRAY['Fall','Winter','Spring','Summer']`).
--
-- Approach: SR-B (defensive WHERE-clause). Strip seasonTiming key from any
-- row matching the failure pattern (column-empty + lessonFormat-key-present
-- + non-canonical metadata.seasonTiming). Idempotent (re-run matches 0
-- rows). Pattern-based, so the same migration body works on whatever drift
-- TEST and PROD have (audited equal: 2 rows each).
--
-- Decision rationale (PR #475 round 2 review):
--   - SR-A (hardcoded lesson_id list) rejected: TEST/PROD drift profiles
--     could diverge in future; pattern is portable.
--   - SR-C (canonicalize 'fall' → 'Fall') rejected: case canonicalization
--     for seasonTiming is deferred to Stage 1 worksheet round per
--     20260515000000_metadata_value_validation.sql NOT-IN-SCOPE note and
--     Session 12 Decision 2.
--
-- Filename: 20260511120000_* sorts BETWEEN 20260511000000 (additive schema,
-- already applied to TEST) and 20260512000000 (drop_lesson_format, failed
-- on TEST). When CI re-runs `supabase db push` after this migration is
-- pushed, the new file becomes the next pending migration and runs BEFORE
-- the drop_lesson_format bare UPDATE.
--
-- Forward-only: original drift values ('end-of-year', 'fall') are not
-- reconstructible after the key strip. Net data loss = 2 rows × 1 metadata
-- key. Stage 2 corpus re-tag will re-derive seasonTiming for both rows.
-- (lesson_versions archive does not contain prior versions of these rows
-- at audit time.)
--
-- See:
--   docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status.md
--     (Session 14 — PR 1 ritual round 2)
--   docs/plans/2026-05-03-metadata-rebuild-foundation-design.md §4 (schema)
--   supabase/migrations/20260512000000_drop_lesson_format.sql:986 (the bare UPDATE)
--   supabase/migrations/20260512000000_drop_lesson_format.sql:857-876 (trigger §G)
-- =====================================================


-- =====================================================
-- (1) Strip non-canonical seasonTiming key from rows that would otherwise
--     cause the bare UPDATE in 20260512000000 to fail.
-- =====================================================

UPDATE public.lessons
SET metadata = metadata - 'seasonTiming'
WHERE metadata ? 'lessonFormat'
  AND COALESCE(array_length(season_timing, 1), 0) = 0
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
-- ('end-of-year', 'fall' lowercase) cannot be reconstructed from the
-- schema. If a future reviewer or Stage 2 worksheet needs the original
-- values, the historical record lives in:
--   - this migration's Description block (lesson_id + value pairs above),
--   - the round-2 PR comment on PR #475,
--   - the corresponding execution-status doc Session 14 entry.
--
-- To roll back the schema effect (re-add the seasonTiming key), see
-- 20260515000000_metadata_value_validation.sql.rollback for the inert
-- placeholder convention.
