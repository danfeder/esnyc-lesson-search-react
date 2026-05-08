-- =====================================================
-- Migration: 20260520010000_recover_archive_only_concepts.sql
-- =====================================================
-- Metadata-rebuild foundation phase, PR 4, Task 4.4:
-- Recover academicConcepts from `lesson_versions` archive into live
-- `lessons.metadata` for 7 lesson_ids whose live row lost the data
-- during Phase 6.2 corpus cleanup (2026-04-27 archive timestamp).
--
-- Discovered during foundation-phase walkthrough (memory:
-- `project_metadata_cleanup_candidates.md` — "16 concepts surviving only
-- in lesson_versions archive"). PROD MCP audit 2026-05-08 confirms 7
-- distinct lesson_ids with non-empty concepts in archive but
-- NULL/missing live `metadata.academicConcepts`. Concept count tally
-- 2026-05-08 is 19 across the 7 rows — a slight ~16-vs-19 drift from
-- the memory's tally, but the same population.
--
-- 7 affected lesson_ids (live titles + concept subjects):
--   1Dkx1Q--fGzGDCAu3kx5OTsuRa_lRY2agdiMqyfn2VpI — All About Compost (Science: 3)
--   1hwLrvv9CUTx2rw2UMTDhqmLXQTd0hEsxan3HvNpPwa8 — Applesauce (Health: 1, Science: 1)
--   1K1tlc3--Dv061Qi1A1AKOGW6_L19VXSTRtKHfe73bjY — Meet The Food System (Science: 1, Social Studies: 2)
--   1uwZRLYoxThlJxDq-vV3cePHmEMGMCpj5Opk0nHVvqqI — African American Food Traditions – Museum (Literacy/ELA: 2, Social Studies: 3)
--   1YX8Dv7UWeg1JG_ZsBPBTDCap5JOXpbhE — Ladybugs (Arts: 1, Science: 2)
--   1zrKohaoXxvEe86HLnOvjUED_Am_-ETNw — A Visit to Mashama Bailey's Restaurant (Social Studies: 2)
--   11oY-EaKF7FTeNxSE_xbsCmSytnBmjc9WPlyBF11Chz0 — Green "Acai" Bowls (Mobile Education) (Science: 1)
--     (archive title is "Unknown" but concept content is plausible — only the
--      concept blob is recovered; the title field is left untouched)
--
-- Source shape (lesson_versions.metadata.academicIntegration.concepts):
--   {"Subject": ["concept1", "concept2"], ...}
-- Target shape (lessons.metadata.academicConcepts):
--   {"Subject": ["concept1", "concept2"], ...}
-- Direct copy; same JSONB shape.
--
-- Why before Stage 2 re-tag (PR 6+): foundation-phase Stage 2 re-tags
-- the corpus via Opus on the post-cleanup state. Restoring the orphan
-- concepts now means Stage 2 has full pre-existing context as input
-- (and any Opus-rewritten concepts will land on a row with reviewer-
-- authored history rather than a NULL field). Recovery happens at the
-- substrate layer, not the Stage 2 layer.

-- =====================================================
-- DATA: recover concepts
-- =====================================================
-- Idempotent via `WHERE l.metadata->'academicConcepts' IS NULL OR ...`
-- guard. Re-running the migration is a no-op for rows where concepts are
-- already populated. Picks the most-recent archive version per lesson_id
-- (DISTINCT ON + ORDER BY version_number DESC) defensively, even though
-- the current corpus has 1 archive row per affected lesson_id.

UPDATE lessons l
SET metadata = jsonb_set(
  COALESCE(l.metadata, '{}'::jsonb),
  '{academicConcepts}',
  lv.concepts,
  true  -- create_missing
)
FROM (
  SELECT DISTINCT ON (lesson_id)
         lesson_id,
         metadata->'academicIntegration'->'concepts' AS concepts
  FROM lesson_versions
  WHERE metadata->'academicIntegration'->'concepts' IS NOT NULL
    AND jsonb_typeof(metadata->'academicIntegration'->'concepts') = 'object'
    AND metadata->'academicIntegration'->'concepts' <> '{}'::jsonb
  ORDER BY lesson_id, version_number DESC
) lv
WHERE l.lesson_id = lv.lesson_id
  -- Idempotency: only set if live row is missing concepts
  AND (
    l.metadata IS NULL
    OR l.metadata->'academicConcepts' IS NULL
    OR jsonb_typeof(l.metadata->'academicConcepts') = 'null'
    OR l.metadata->'academicConcepts' = '{}'::jsonb
  );

-- =====================================================
-- VERIFICATION (informational)
-- =====================================================
-- Expected post-apply state:
--   SELECT count(*) FROM lessons l
--   WHERE EXISTS (
--     SELECT 1 FROM lesson_versions lv
--     WHERE lv.lesson_id = l.lesson_id
--       AND jsonb_typeof(lv.metadata->'academicIntegration'->'concepts') = 'object'
--       AND lv.metadata->'academicIntegration'->'concepts' <> '{}'::jsonb
--   )
--   AND (l.metadata->'academicConcepts' IS NULL
--        OR l.metadata->'academicConcepts' = '{}'::jsonb);
--                                          -- 0 (no more orphan concepts)
-- And spot-check the 7 lesson_ids — academicConcepts populated with
-- the same JSONB shape as the archive.

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- -- Per-row revert is the safest path — this migration only touches
-- -- rows whose live `academicConcepts` was NULL/empty pre-recovery, so
-- -- removing the key blindly is correct for the targeted population:
-- UPDATE lessons l
-- SET metadata = l.metadata - 'academicConcepts'
-- WHERE l.lesson_id IN (
--   '1Dkx1Q--fGzGDCAu3kx5OTsuRa_lRY2agdiMqyfn2VpI',
--   '1hwLrvv9CUTx2rw2UMTDhqmLXQTd0hEsxan3HvNpPwa8',
--   '1K1tlc3--Dv061Qi1A1AKOGW6_L19VXSTRtKHfe73bjY',
--   '1uwZRLYoxThlJxDq-vV3cePHmEMGMCpj5Opk0nHVvqqI',
--   '1YX8Dv7UWeg1JG_ZsBPBTDCap5JOXpbhE',
--   '1zrKohaoXxvEe86HLnOvjUED_Am_-ETNw',
--   '11oY-EaKF7FTeNxSE_xbsCmSytnBmjc9WPlyBF11Chz0'
-- );
