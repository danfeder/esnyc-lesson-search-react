-- =====================================================
-- Migration: 20260508000000_filter_drift_pr2_m3_column_hygiene.sql
-- =====================================================
-- Description: Filter-drift PR-2 Migration 3 — column-data hygiene.
-- Two cleanups that fix specific column-vs-metadata mismatches that
-- M2 backfill couldn't address:
--
--   (A) activity_type location-leak fix (17 rows). 14 'indoor' + 3
--       'outdoor' values in the activity_type column, copied from
--       location_requirements by a pre-Phase-4 import path. Fixed
--       per Session 7's investigation + user-approved mapping
--       (status doc 2026-04-29). Final mapping per the deterministic
--       cooking_methods + garden_skills classifier (97-99.7% precision
--       per ESYNYC convention; canonical UI labels in
--       filterDefinitions.ts:23-32):
--         - 7 rows → 'cooking'
--         - 4 rows → 'garden'
--         - 2 rows → 'both'
--         - 1 row → 'academic'
--         - 3 rows (Unknown / Error processing) → ARRAY[]::text[]
--           (column cleared; metadata.activityType key deleted)
--       Both surfaces written: column AND metadata.activityType
--       (canonical array shape per impl plan Task 2.6 step 2 (1) and
--       PR-1 reconstruction §3 contract). The 3 cleared rows MUST
--       have metadata.activityType key deleted so PR-1's reconstruction
--       (which falls back to original_metadata when column is empty)
--       doesn't leak the original 'indoor' value into search results.
--
--   (B) academic_integration column-vs-meta mismatches (post-M2
--       simulated; 6 rows total on PROD 2026-04-29):
--         - Pop A (2 rows): column NULL but post-M2 meta has
--           non-empty array → derive column from meta via array_agg.
--         - Pop B (4 rows): column populated but post-M2 meta
--           mismatches (in all 4 PROD cases column is a strict
--           superset of meta.selected, e.g. col=['Health','Math']
--           vs meta=['Math']) → force meta to match column
--           (column-wins, consistent with M4 trigger policy).
--           Concepts data on the meta-subset is preserved at
--           top-level academicConcepts (M2's rescue is untouched).
--
-- Sequencing: runs after M2 in the same merged PR, so by the time M3
-- runs, M2 has already canonicalized the 693 object-shape AI rows to
-- flat arrays. The B WHERE clauses operate on canonical-array meta
-- shape.
--
-- Idempotent:
--   (A)     WHERE limits to fixed 17 lesson_ids; second run sets to
--           same values (no-op data change).
--   (B PA)  WHERE requires column NULL; first run populates column
--           → second run finds 0 rows.
--   (B PB)  WHERE checks meta≠column; first run forces match →
--           second run finds 0 rows.
--
-- Pre-flight observations (PROD 2026-04-29, status doc Session 8):
--   - 17 leaked rows confirmed (lesson_ids match Session 7 mapping
--     exactly). 14 'indoor' + 3 'outdoor'.
--   - Pop A: 2 PROD rows (lower than design doc estimate of ~5).
--     Both are NULL-column rows with object-shape meta carrying
--     selected=['Science','Literacy/ELA'] + rich concepts.
--   - Pop B: 4 PROD rows (matches design doc estimate of ~4). All
--     4 have column ⊃ meta.selected; concepts preserved on subset.
--   - Spot-check on 5 canonical (non-leak) rows + corpus-wide count
--     showed metadata.activityType is mostly NULL (689 of 771
--     canonical rows) or scalar string (81 of 771); only 1 row has
--     the canonical-array shape at rest. M3 makes the 14 leak-fix
--     set rows the second cohort with at-rest array shape; the
--     remaining 689+81 non-leak rows stay non-canonical at rest
--     until the M4 trigger force-canonicalizes them on next touch.
--     PR-1 reconstruction masks this on read; this divergence is
--     benign per impl plan Task 2.6 step 1 cross-check.
--
-- See:
--   - design doc §5 Migration 3 (filter-drift-repair-design.md)
--   - impl plan Task 2.6 (filter-drift-repair-implementation.md)
--   - status doc Sessions 7 + 8 (filter-drift-repair-execution-status.md)

-- =====================================================
-- CHANGES
-- =====================================================

-- (A) activity_type location-leak fix.
--     CTE-driven mapping for the 17 leaked rows. Single UPDATE writes
--     both surfaces — column AND metadata.activityType. The CASE
--     handles cleared rows (NULL marker) by deleting the metadata
--     key entirely; set rows by writing the canonical array.
WITH leak_mapping(lesson_id, new_activity_type, new_metadata_value) AS (
  VALUES
    -- 7 cooking rows (cooking_methods populated, garden_skills empty)
    ('1aqSoaGDAVFvSWjZJeKAEIkHvPdrWKsxq',            ARRAY['cooking']::text[],  '["cooking"]'::jsonb),
    ('1iwA2l4QPsqXJqu5lP8Ix5BarlTjIhxTQ',            ARRAY['cooking']::text[],  '["cooking"]'::jsonb),
    ('1sHwSvaFaZC9wpHOqr-dQBMEl-paf6zZV',            ARRAY['cooking']::text[],  '["cooking"]'::jsonb),
    ('1V7feFPt6bZc0b695g_3Qe_U4AAE-xO5s',            ARRAY['cooking']::text[],  '["cooking"]'::jsonb),
    ('1vDebvrcoPdDcoooLnpF64P3ade4l8ZRqVkfSlEAyYts', ARRAY['cooking']::text[],  '["cooking"]'::jsonb),
    ('1xwTiqazvuLxwYiNB-y6xLaRRVFkDkvOgYroXPstQLjE', ARRAY['cooking']::text[],  '["cooking"]'::jsonb),
    ('1YeRlyncgM-gMS-Aica2Fk7wjBsRN9-K6',            ARRAY['cooking']::text[],  '["cooking"]'::jsonb),
    -- 4 garden rows (garden_skills populated, cooking_methods empty)
    ('1cCe0ugBM572aGRojx1RfR6wE5FuBA3CjFetD8NKffvs', ARRAY['garden']::text[],   '["garden"]'::jsonb),
    ('1lGcRDLkd7n5-CulckQb-rt1M5Q7SeA3K',            ARRAY['garden']::text[],   '["garden"]'::jsonb),
    ('1nzZC51049bxqfXYRxWX5Z-TwEL-8uS4H1nbWX7cgPFk', ARRAY['garden']::text[],   '["garden"]'::jsonb),
    ('1v7aPRuAM9q1jdffDr1IqgxZUKqTZ7By-',            ARRAY['garden']::text[],   '["garden"]'::jsonb),
    -- 2 both rows (BOTH cooking_methods AND garden_skills populated)
    ('1P8fqhHyo7FIzysTkrh628cbOfkpYAQw1',            ARRAY['both']::text[],     '["both"]'::jsonb),
    ('1sn_6veDzL8P0fyHIrGIRRpD5BPp86ZuOB2CR7wnDF6Q', ARRAY['both']::text[],     '["both"]'::jsonb),
    -- 1 academic row (NEITHER cooking_methods NOR garden_skills populated)
    ('1n8wS0X-dXAw9sfQuLFgsMg_kNvACph3cT4yd9p2i1eg', ARRAY['academic']::text[], '["academic"]'::jsonb),
    -- 3 cleared rows (Unknown / Error processing — title/summary failed
    -- to extract; cooking_methods + garden_skills both empty too).
    -- NULL marker for new_metadata_value triggers key deletion below.
    ('1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd',            ARRAY[]::text[],           NULL::jsonb),
    ('1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU', ARRAY[]::text[],           NULL::jsonb),
    ('1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8', ARRAY[]::text[],           NULL::jsonb)
)
UPDATE lessons l
SET
  activity_type = m.new_activity_type,
  metadata = CASE
    WHEN m.new_metadata_value IS NULL
      THEN COALESCE(l.metadata, '{}'::jsonb) - 'activityType'
    ELSE jsonb_set(
      COALESCE(l.metadata, '{}'::jsonb),
      '{activityType}',
      m.new_metadata_value
    )
  END
FROM leak_mapping m
WHERE l.lesson_id = m.lesson_id;

-- (B Pop A) academic_integration: column NULL but post-M2 metadata has
--     a non-empty canonical array → derive column from metadata via
--     array_agg over the unnested array. Affects 2 PROD rows on
--     2026-04-29 (both NULL-column rows with object-shape AI that M2
--     unwraps to ['Science','Literacy/ELA']).
UPDATE lessons
SET academic_integration = (
  SELECT array_agg(value)
  FROM jsonb_array_elements_text(metadata->'academicIntegration')
)
WHERE academic_integration IS NULL
  AND jsonb_typeof(metadata->'academicIntegration') = 'array'
  AND jsonb_array_length(metadata->'academicIntegration') > 0;

-- (B Pop B) academic_integration: column populated, post-M2 metadata
--     mismatches (different shape, missing key, or different element
--     set) → force metadata.academicIntegration to match column
--     (column-wins, consistent with M4 trigger policy). The
--     metadata.academicConcepts sibling key (set by M2's rescue) is
--     NOT touched; it preserves per-subject concept content on the
--     subjects that had it. Affects 4 PROD rows on 2026-04-29; in
--     all 4 cases the column is a strict superset of meta.selected.
--
--     Set-comparison uses ordered array_agg so two arrays with the
--     same elements but different orderings are considered equal
--     (avoids spurious "mismatch" updates).
UPDATE lessons
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{academicIntegration}',
  to_jsonb(academic_integration)
)
WHERE academic_integration IS NOT NULL
  AND COALESCE(array_length(academic_integration, 1), 0) > 0
  AND (
    metadata->'academicIntegration' IS NULL
    OR jsonb_typeof(metadata->'academicIntegration') <> 'array'
    OR (SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::text[])
        FROM jsonb_array_elements_text(metadata->'academicIntegration'))
       <> (SELECT COALESCE(array_agg(v ORDER BY v), ARRAY[]::text[])
           FROM unnest(academic_integration) v)
  );

-- =====================================================
-- ROLLBACK (one-way — kept as comments only)
-- =====================================================
-- (A) The original activity_type='indoor'/'outdoor' values are gone.
--     A reversal would just re-create the leak. Don't do this. The
--     activity_type metadata key for the 3 cleared rows was deleted;
--     a future approve_update via complete_review_atomic will populate
--     it correctly.
--
-- (B Pop A) Column was NULL pre-M3; reversal would NULL the 2 affected
--     columns, restoring the at-rest mismatch. Don't do this.
--
-- (B Pop B) The pre-M3 meta.academicIntegration was the smaller
--     meta.selected value (a strict subset of the column array). The
--     pre-M2 object-shape data is gone after M2. Reversible only via
--     DB backup restore.
