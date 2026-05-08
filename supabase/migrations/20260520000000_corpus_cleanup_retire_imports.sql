-- =====================================================
-- Migration: 20260520000000_corpus_cleanup_retire_imports.sql
-- =====================================================
-- Metadata-rebuild foundation phase, PR 4, Tasks 4.3 + 4.5:
-- Soft-retire 21 wholesale third-party-curriculum imports + FSA Pt 1 retitle.
--
-- Per project memory `project_imported_non_esynyc_drops.md`: 21 lessons
-- in the corpus are wholesale third-party curriculum imports in non-ESYNYC
-- format (5 PFLP 2003 vintage + 11 FoodCorps 2017 vintage + 5 one-offs).
-- All 21 created 2025-07-10 via batch import; all have NULL
-- original_submission_id (no submission-flow provenance); all have NULL
-- authored_by metadata. Foundation-phase corpus shrinks from 788 to 767
-- effective rows after retirement.
--
-- Note on count: prior tracking docs cited "23 lessons"; actual scan of
-- the locked drop list (memory + PROD/TEST audit 2026-05-08) is 21. The
-- "23" was a stale early estimate; not investigated further because the
-- structural-signature sweep against PROD found no obvious additional
-- candidates. If 2 more candidates are surfaced later, a follow-up
-- migration can extend the retirement set; the soft-delete mechanism
-- generalizes.
--
-- Approach: SOFT-DELETE via `retired_at timestamptz` + `retired_reason
-- text`. Cluster-key reasons enable forward audit ("show all FoodCorps
-- imports we retired"). Rows stay in lessons table; downstream search
-- RPCs + views filter `WHERE retired_at IS NULL` to hide them. This
-- preserves any FK references intact: 2 historical dup_resolutions + 2
-- lesson_archive rows reference Leaves We Eat / Stone Soup as canonical
-- winners of merge-and-archive resolutions on 2025-09-01 (per PROD MCP
-- audit 2026-05-08). Soft-delete keeps those FKs valid. Reversible
-- via `UPDATE lessons SET retired_at = NULL` (un-retirement).
--
-- N1 retitle (Task 4.5): "Food System Advocates (Part 1 & 2)" →
-- "Food System Advocates (Part 1)". Pt 2 was byte-identical to Pt 1
-- minus one worksheet-link change; "& 2" misled teachers into expecting
-- a second lesson that didn't really exist. Per N1 cross-cutting
-- decision (decision journal lines 558-572).
--
-- Filter surfaces (search RPCs / view / smart-search / facetCounts.ts /
-- embedding regen) ship in PR 4 follow-up commits this same branch.
-- detect-duplicates and process-submission content-hash dedup are
-- intentionally NOT filtered (cross-checking against retired imports is
-- useful at submission time).

-- =====================================================
-- SCHEMA: add soft-retirement columns
-- =====================================================

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS retired_at timestamptz DEFAULT NULL;

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS retired_reason text DEFAULT NULL;

COMMENT ON COLUMN lessons.retired_at IS
  'Soft-delete marker. NULL = live (default); non-NULL = retired (excluded from search/lookup queries). Foundation-phase PR 4 retired 21 wholesale third-party imports here. Reversible via UPDATE retired_at = NULL.';

COMMENT ON COLUMN lessons.retired_reason IS
  'Audit-trail key for retirement reason. Foundation-phase PR 4 uses "import:<source>" namespace (e.g., "import:pflp_2003", "import:foodcorps_2017"). Future retirement reasons can use other namespaces. NULL when retired_at IS NULL.';

-- =====================================================
-- DATA: retire 21 third-party-curriculum imports
-- =====================================================
-- Each UPDATE is idempotent via `AND retired_at IS NULL` guard — re-running
-- the migration is a no-op for already-retired rows.

-- PFLP (Project Food, Land & People), 2003 vintage — 5 lessons
UPDATE lessons SET retired_at = now(), retired_reason = 'import:pflp_2003'
WHERE lesson_id IN (
  '1uZ2Vdg-_jH_m9Vg6PljJVzMFrkOOTAbI', -- Breads Around the World
  '1m0vPeiqyk0SxMDN0hrRu14v4aZhiFb7X', -- What Piece of the Pie?
  '1--bRQYkbtZm3ojqd501cWL57PgcLWLVk', -- Amazing Grazing
  '1-De8P7-cEQ-rKyuKep2788ximpiKfh2Q', -- Seasons Through the Year
  '1FUwdpwK2fgb900qo2vSlsg6m-O2ybW7x'  -- The Plant and Me
)
AND retired_at IS NULL;

-- FoodCorps, 2017 vintage — 11 lessons (8 explicit copyright + 3 template-match)
UPDATE lessons SET retired_at = now(), retired_reason = 'import:foodcorps_2017'
WHERE lesson_id IN (
  '1uHYXPurqWPHRJQ4DjT46s7sjLoN09W61',                 -- Plant Part Mystery!
  '1Jbc2TvhQH-mzikeBiRoyCgR21EgQdbGq',                 -- Tortilla Time!
  '1thI8cD1bcZPG5VLzu4N5rlEBVYO4VedV',                 -- If Our Class Were a Soup...
  '1gOciyeX1nRaOL27Vkl_sCXnBFwHZMV5n',                 -- What the World Eats
  '1tKktUwEqYymTjYXXmVBOc2RR7tH5HHUy',                 -- Rainbow Grain Salad
  '1Y6tHYm3Hh2vLCBCDaM36_TO1EuM61ofd',                 -- Choose-Your-Own Flavor Popcorn
  '11QlN-din-a8-xf_lTOzkZt8O54P_Xt2T',                 -- Summer Sun Risin'
  '1o4Ru6FVLFcC766HrQNta0BiZ_1MNl1qlWf8dk362Skw',      -- Teas around the World (stub, 971 chars)
  '1kwWC4upXrmfxeOgu2OCwFOcKoowZZuwW',                 -- Green Sauce Around the World (template-match)
  '1syFNS-FUiVWUvkZRhfyxfXc0ukDrwnkO',                 -- Stone Soup (template-match; canonical of dedup group_82)
  '14_2kozPIy22gxK6I2Lu5vrbcwUfhu5ul'                  -- Our Food Traditions (template-match)
)
AND retired_at IS NULL;

-- One-off imports — 5 lessons
UPDATE lessons SET retired_at = now(), retired_reason = 'import:cas_food_justice'
WHERE lesson_id = '15T4wU94xT3r-dRx-WJq9XD2-ySg2HKaz' -- Children's Aid Society: Food Justice Program
  AND retired_at IS NULL;

UPDATE lessons SET retired_at = now(), retired_reason = 'import:nyc_doe_colonial_ny'
WHERE lesson_id = '0BzjqiKCWBLWeYVlta0lkVXJfajg' -- COLONIAL AND REVOLUTIONARY PERIOD NEW YORK
  AND retired_at IS NULL;

UPDATE lessons SET retired_at = now(), retired_reason = 'import:city_blossoms_botanical_artists'
WHERE lesson_id = '1c_1EanckKI1w98qNtO0JCp9fF35PdrSi' -- Botanical Artists
  AND retired_at IS NULL;

UPDATE lessons SET retired_at = now(), retired_reason = 'import:nyc_dep_watershed'
WHERE lesson_id = '1eO20OF8EOBOUwK1bXMY2AVAK9jN52F9h' -- What is a Watershed?
  AND retired_at IS NULL;

UPDATE lessons SET retired_at = now(), retired_reason = 'import:oregon_doe_leaves'
WHERE lesson_id = '0B1MDYcmyESHgWDIyelRWbHljZ1k' -- Leaves We Eat (canonical of dedup group_6)
  AND retired_at IS NULL;

-- =====================================================
-- DATA: N1 retitle — Food System Advocates
-- =====================================================
-- Idempotent via title equality guard.

UPDATE lessons
SET title = 'Food System Advocates (Part 1)'
WHERE lesson_id = '1iqGFHrQ0rWfyoLo4R4n8FO9N-S7LW1ZpalaLNF5_Tmk'
  AND title = 'Food System Advocates (Part 1 & 2)';

-- =====================================================
-- VERIFICATION (informational; not enforcement)
-- =====================================================
-- Expected post-apply state:
--   SELECT count(*) FROM lessons WHERE retired_at IS NOT NULL;             -- 21
--   SELECT count(DISTINCT retired_reason) FROM lessons WHERE retired_at IS NOT NULL;  -- 7
--   SELECT title FROM lessons WHERE lesson_id = '1iqGFHrQ0rWfyoLo4R4n8FO9N-S7LW1ZpalaLNF5_Tmk';
--                                                                          -- 'Food System Advocates (Part 1)'

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- -- Restore FSA title:
-- UPDATE lessons SET title = 'Food System Advocates (Part 1 & 2)'
-- WHERE lesson_id = '1iqGFHrQ0rWfyoLo4R4n8FO9N-S7LW1ZpalaLNF5_Tmk'
--   AND title = 'Food System Advocates (Part 1)';
-- -- Un-retire all 21 import drops:
-- UPDATE lessons SET retired_at = NULL, retired_reason = NULL
-- WHERE retired_reason LIKE 'import:%';
-- -- Drop columns (idempotent):
-- ALTER TABLE lessons DROP COLUMN IF EXISTS retired_reason;
-- ALTER TABLE lessons DROP COLUMN IF EXISTS retired_at;
