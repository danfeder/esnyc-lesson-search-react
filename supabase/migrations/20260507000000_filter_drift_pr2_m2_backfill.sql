-- =====================================================
-- Migration: 20260507000000_filter_drift_pr2_m2_backfill.sql
-- =====================================================
-- Description: Filter-drift PR-2 Migration 2 — backfill historical
-- drift rows. Four idempotent UPDATEs that take the corpus from mixed
-- shapes/casings to canonical shape:
--
--   (1) Long-form key promotion: themes/season/location →
--       thematicCategories/seasonTiming/locationRequirements with
--       scalar→array coercion. Affects ~81 PROD rows. Verbatim from
--       design doc §5 Migration 2.
--
--   (2) academicIntegration object-shape unwrap WITH concepts rescue
--       (REVISED — supersedes design doc snippet):
--       {selected: [...], concepts: {...}} → flat array (canonical) +
--       sibling top-level key `academicConcepts` for the per-subject
--       concept content. 693 PROD rows are object-shape; 690 of them
--       have non-empty concepts that get rescued. The bare design-doc
--       §5 unwrap snippet would have destroyed those 690 — see Task 2.4
--       step 2 for the rescue rationale. 3 of 693 have empty `{}`
--       concepts and intentionally do NOT get an academicConcepts key
--       (matches M1 writer-fix "key present iff data present" semantic).
--
--   (3) lessonFormat array unwrap to scalar: ["x"] → "x" for the 1
--       PROD outlier. Verbatim from design doc §5 Migration 2.
--
--   (4) location_requirements casing canonicalization (column AND
--       metadata): 95 PROD rows have lowercase indoor/outdoor/both
--       (46+27+22) that the UI's Title-Case Indoor/Outdoor/Both filter
--       silently misses. Canonicalize in both surfaces. Extension
--       beyond design doc §5 — added per Session 3 OOS finding (status
--       doc 2026-04-29).
--
-- Order matters: (1) creates locationRequirements for the short-key
-- rows; (4) catches lowercase values both pre-existing and any newly
-- promoted by (1).
--
-- All four UPDATEs are idempotent — WHERE clauses guard on the input
-- shape, which becomes empty after first apply.
--
-- Pre-flight probe (PROD 2026-04-29) confirmed:
--   - 693 object-shape AI rows; 690 with non-empty concepts; 3 with
--     empty {} concepts; 0 with unknown inner keys (only 'selected'
--     and 'concepts' exist).
--   - 0 rows with existing top-level `academicConcepts` key (no
--     collision with the new sibling).
--   - 81 short-key rows; 1 array-shape lessonFormat.
--   - 95 lowercase location values (column).
--   - 1284 concept subject pairs across 690 rows; 0 null subject
--     values (jsonb_strip_nulls recursion is safe).
--
-- After this lands:
--   - All metadata in canonical SHAPE: lessonFormat scalar,
--     academicIntegration flat array, no short-form keys.
--   - location_requirements column AND metadata uniformly Title-Case.
--   - 690 rows preserve per-subject concept content at
--     metadata.academicConcepts.
--   - PR-2 M3 then covers column-data hygiene (activity_type leaks +
--     academic_integration column derivation).
--   - PR-2 M4 trigger arrives last to a fully-canonical table.
--
-- See:
--   - design doc §5 Migration 2 (filter-drift-repair-design.md)
--   - impl plan Task 2.4 (filter-drift-repair-implementation.md)
--   - status doc Session 3 OOS items (location_requirements casing,
--     empty-{} concepts) — both folded into this migration's scope

-- =====================================================
-- CHANGES
-- =====================================================

-- (1) Long-form key promotion: themes/season/location →
--     thematicCategories/seasonTiming/locationRequirements.
--     Scalar string → single-element array via jsonb_build_array.
--     COALESCE preserves any existing long-form key (no clobber on
--     re-run or partial corpus).
UPDATE lessons
SET metadata = metadata
  - 'themes' - 'season' - 'location'
  || jsonb_build_object(
       'thematicCategories', COALESCE(
         metadata->'thematicCategories',
         CASE jsonb_typeof(metadata->'themes')
           WHEN 'array'  THEN metadata->'themes'
           WHEN 'string' THEN jsonb_build_array(metadata->>'themes')
           ELSE '[]'::jsonb
         END
       ),
       'seasonTiming', COALESCE(
         metadata->'seasonTiming',
         CASE jsonb_typeof(metadata->'season')
           WHEN 'array'  THEN metadata->'season'
           WHEN 'string' THEN jsonb_build_array(metadata->>'season')
           ELSE '[]'::jsonb
         END
       ),
       'locationRequirements', COALESCE(
         metadata->'locationRequirements',
         CASE jsonb_typeof(metadata->'location')
           WHEN 'array'  THEN metadata->'location'
           WHEN 'string' THEN jsonb_build_array(metadata->>'location')
           ELSE '[]'::jsonb
         END
       )
     )
WHERE metadata ?| ARRAY['themes', 'season', 'location'];

-- (2) academicIntegration object-shape unwrap WITH concepts rescue.
--     The bare design-doc snippet `jsonb_set(... '{academicIntegration}',
--     ->'selected')` would silently destroy `concepts` on all 690 PROD
--     rows that have rich per-subject concept data. Rewrite uses
--     (metadata - 'academicIntegration') || jsonb_build_object(...)
--     so we unwrap the flat array AND optionally rescue concepts to a
--     sibling top-level key `academicConcepts`. jsonb_strip_nulls drops
--     the academicConcepts key when the source is missing/empty (so
--     the 3 empty-{} rows do NOT get an `academicConcepts: {}`
--     placeholder — matches M1 writer-fix semantic).
UPDATE lessons
SET metadata = (metadata - 'academicIntegration')
  || jsonb_strip_nulls(jsonb_build_object(
       'academicIntegration',
         COALESCE(metadata->'academicIntegration'->'selected', '[]'::jsonb),
       'academicConcepts',
         CASE
           WHEN jsonb_typeof(metadata->'academicIntegration'->'concepts') = 'object'
             AND metadata->'academicIntegration'->'concepts' <> '{}'::jsonb
           THEN metadata->'academicIntegration'->'concepts'
           -- ELSE NULL → jsonb_strip_nulls drops the key
         END
     ))
WHERE jsonb_typeof(metadata->'academicIntegration') = 'object';

-- (3) lessonFormat: unwrap any single-element array to scalar.
--     Affects the 1 PROD outlier (probably ["standalone"]).
UPDATE lessons
SET metadata = jsonb_set(
  metadata, '{lessonFormat}',
  to_jsonb(metadata->'lessonFormat'->>0)
)
WHERE jsonb_typeof(metadata->'lessonFormat') = 'array'
  AND jsonb_array_length(metadata->'lessonFormat') = 1;

-- (4) location_requirements casing canonicalization (both surfaces).
--     PROD has 95 rows (46 indoor + 27 outdoor + 22 both) with
--     lowercase values in the column. UI sends Title-Case from
--     filterDefinitions.ts:location, so these rows are silently
--     missed by the Indoor/Outdoor/Both filter. Canonicalize to
--     Title-Case in both column AND metadata so PR-2 M4 trigger
--     arrives to a uniformly-cased corpus.

-- (4a) Column: text[] casing canonicalization.
UPDATE lessons
SET location_requirements = ARRAY(
  SELECT CASE elem
    WHEN 'indoor'  THEN 'Indoor'
    WHEN 'outdoor' THEN 'Outdoor'
    WHEN 'both'    THEN 'Both'
    ELSE elem
  END
  FROM unnest(location_requirements) AS elem
)
WHERE EXISTS (
  SELECT 1 FROM unnest(location_requirements) AS elem
  WHERE elem IN ('indoor', 'outdoor', 'both')
);

-- (4b) metadata.locationRequirements: jsonb array casing canonicalization.
UPDATE lessons
SET metadata = jsonb_set(
  metadata, '{locationRequirements}',
  (SELECT jsonb_agg(
    CASE elem #>> '{}'
      WHEN 'indoor'  THEN to_jsonb('Indoor'::text)
      WHEN 'outdoor' THEN to_jsonb('Outdoor'::text)
      WHEN 'both'    THEN to_jsonb('Both'::text)
      ELSE elem
    END
  )
  FROM jsonb_array_elements(metadata->'locationRequirements') AS elem)
)
WHERE jsonb_typeof(metadata->'locationRequirements') = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(metadata->'locationRequirements') AS elem
    WHERE elem IN ('indoor', 'outdoor', 'both')
  );

-- =====================================================
-- ROLLBACK (one-way migration — kept as comments only)
-- =====================================================
-- Steps (1)-(4) are not cleanly reversible:
--   - (1) The original short-keys are gone after promotion; long-form
--     keys remain. Reconstructing the short-keys from long-form would
--     require a value-direction guess.
--   - (2) The original {selected, concepts} object shape is gone; flat
--     array `academicIntegration` + sibling `academicConcepts` remain.
--     Concepts data IS preserved at the new top-level key, so a future
--     consumer wanting the legacy shape can reconstruct cheaply:
--       UPDATE lessons SET metadata =
--         (metadata - 'academicIntegration' - 'academicConcepts')
--         || jsonb_build_object('academicIntegration', jsonb_build_object(
--             'selected', metadata->'academicIntegration',
--             'concepts', COALESCE(metadata->'academicConcepts', '{}'::jsonb)
--           ))
--       WHERE jsonb_typeof(metadata->'academicIntegration') = 'array';
--   - (3) Original [["x"]] shape is gone; scalar "x" remains.
--   - (4) Original lowercase values are gone; Title-Case remains.
--     Reversal would require knowing which rows were lowercase pre-M2
--     (no audit trail). If reversal needed, accept Title-Case as the
--     canonical post-M2 shape.
