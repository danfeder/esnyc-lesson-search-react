-- =====================================================
-- Migration: 20260501000000_phase_6_metadata_corrections.sql
-- =====================================================
-- Description: Post-Phase-6 metadata corrections for the 4 B-update merge
-- targets. Phase 6 (20260430000000) projected reviewer-tagged metadata into
-- the lessons row faithfully, but two regressions surfaced after merge:
--
--   1. metadata.lessonFormat shape regression on all 4 rows.
--      The orphan submissions store lessonFormat as a JSON ARRAY in
--      tagged_metadata (the multi-select shape used during review). Phase 6
--      projected that array into lessons.metadata.lessonFormat unchanged.
--      The frontend at src/utils/facetCounts.ts:55 treats meta.lessonFormat
--      as a STRING — when given an array it returns malformed values that
--      match no filter option. Result: these 4 lessons drop out of the
--      lessonFormat filter today. Canonical corpus shape (696 of 788 rows
--      = 88%): metadata.lessonFormat is a string. This migration normalizes
--      the shape on all 4 rows.
--
--   2. metadata.gradeLevel was dropped on all 4 rows (Phase 6 projection
--      didn't carry it). Not filter-visible (filters read the gradeLevels
--      column at facetCounts.ts:41), but breaks canonical shape. Restored
--      to an array mirroring the grade_levels column.
--
-- Per-row content corrections (verified against the merged Google Doc 2026-04-27):
--
--   - All About Compost (lesson_id 1Dkx1Q--…)
--     - grade_levels: ["3K","PK","K","1"] → ["3K","PK","K","1","2"]
--       Doc explicitly designs activities for "3K-PK (Peppa Pig), 1st-2nd
--       Grade (Compost Stew)" — orphan dropped 2nd which the doc covers.
--     - lesson_format: "standalone" → "Single period"
--       Doc structure is a single ~50-min class with two activity tracks
--       per grade band. Prior was "Single period"; restoring matches doc.
--
--   - Ladybugs (lesson_id 1YX8Dv7U…)
--     - grade_levels: unchanged (["3K","PK","K","1"] is doc-supported for
--       this read-aloud + crowns + scavenger-hunt early-childhood lesson).
--     - lesson_format: NULL → "Single period"
--       Orphan tagged_metadata.lessonFormat was an empty array, leaving the
--       column NULL after Phase 6. Doc is ~35-40min single class. Prior
--       was "Single period"; restoring.
--
--   - A Visit to Mashama Bailey's Restaurant (lesson_id 1zrKohao…)
--     - grade_levels: unchanged (["3K","PK","K","1","2","3","4","5","6","7","8"]).
--       Doc has explicit "Grade Level Variations" section per band:
--       3K-PK (cut collards w/ scissors), K-5 (teacher supervises grits
--       pot), 6-8 (students unsupervised). Reviewer's full-range tag is
--       supported by the doc.
--     - lesson_format: "standalone" → "Multi-session unit"
--       Doc background info: "This lesson is intended to follow the African
--       American Food Museum lesson. It is not intended to be a stand-alone
--       lesson." The merged restaurant + museum lessons form a 2-lesson
--       unit. Orphan-tagged "standalone" contradicts doc.
--
--   - Meet The Food System (lesson_id 1K1tlc3…)
--     - grade_levels: unchanged (["6","7"]).
--     - lesson_format: "standalone" → "Multi-session unit"
--       Doc summary: "This unit will introduce students to the food
--       system." Prior was "Multi-session unit"; orphan over-flattened to
--       standalone. Restoring the unit framing.
--
-- Per-row idempotency (re-application is a 0-row no-op):
--   Each UPDATE is guarded by a WHERE clause requiring the current
--   (post-Phase-6, broken) state. Once corrected, the WHERE clauses no
--   longer match and the migration becomes a no-op. Manual edits made
--   between Phase 6 apply and this migration are also preserved (the
--   guard fails, the row is left alone).
--
-- Why direct UPDATE without lesson_versions archiving:
--   These are corrections to the Phase-6 merged state, not new content
--   merges. The Phase-6 lesson_versions row already preserves the original
--   pre-merge state (archive_reason='historical_b_update_recovery_2026_04').
--   Adding a v=2 archive row for "we fixed our own metadata projection"
--   would be audit noise without semantic value. The merged content
--   (content_text, content_hash, embedding, file_link, summary, title) is
--   unchanged — only metadata fields are corrected.
--
-- Notes on the broader corpus (out of scope for this migration):
--   - lessonFormat case-mixing across the corpus ("Single period" 481x,
--     "Standalone" 151x, "standalone" 66x) is a pre-existing data quality
--     issue. We use the dominant casing for each value: "Single period"
--     and "Multi-session unit" (only spelling). Not normalizing other
--     rows.
--   - The frontend's lessonFormat filter conflates time-structure
--     (single/double/multi) with context-independence (standalone). A
--     lesson can plausibly be both "Single period" AND part of a
--     multi-session unit, but the data model forces one. Tracked at
--     ~/.claude/projects/.../memory/project_lesson_format_conflated.md.
--     Future redesign opportunity; out of scope here.
-- =====================================================

-- =====================================================
-- CHANGES
-- =====================================================

-- ===== Row 1 of 4: All About Compost =====
-- grade_levels: add 2nd back. lesson_format: restore "Single period".
-- metadata.lessonFormat: array → string. metadata.gradeLevel: NULL → array.
UPDATE lessons l
SET
  grade_levels = ARRAY['3K','PK','K','1','2'],
  lesson_format = 'Single period',
  metadata = jsonb_set(
    jsonb_set(
      l.metadata,
      '{lessonFormat}',
      '"Single period"'::jsonb,
      true
    ),
    '{gradeLevel}',
    '["3K","PK","K","1","2"]'::jsonb,
    true
  )
WHERE l.lesson_id = '1Dkx1Q--fGzGDCAu3kx5OTsuRa_lRY2agdiMqyfn2VpI'
  AND l.lesson_format = 'standalone'
  AND jsonb_typeof(l.metadata->'lessonFormat') = 'array';

-- ===== Row 2 of 4: Ladybugs =====
-- lesson_format: NULL → "Single period". metadata.lessonFormat: empty
-- array → "Single period" string. metadata.gradeLevel: NULL → array.
UPDATE lessons l
SET
  lesson_format = 'Single period',
  metadata = jsonb_set(
    jsonb_set(
      l.metadata,
      '{lessonFormat}',
      '"Single period"'::jsonb,
      true
    ),
    '{gradeLevel}',
    '["3K","PK","K","1"]'::jsonb,
    true
  )
WHERE l.lesson_id = '1YX8Dv7UWeg1JG_ZsBPBTDCap5JOXpbhE'
  AND l.lesson_format IS NULL
  AND jsonb_typeof(l.metadata->'lessonFormat') = 'array';

-- ===== Row 3 of 4: A Visit to Mashama Bailey's Restaurant =====
-- lesson_format: "standalone" → "Multi-session unit".
-- metadata.lessonFormat: array → string. metadata.gradeLevel: NULL → array.
UPDATE lessons l
SET
  lesson_format = 'Multi-session unit',
  metadata = jsonb_set(
    jsonb_set(
      l.metadata,
      '{lessonFormat}',
      '"Multi-session unit"'::jsonb,
      true
    ),
    '{gradeLevel}',
    '["3K","PK","K","1","2","3","4","5","6","7","8"]'::jsonb,
    true
  )
WHERE l.lesson_id = '1zrKohaoXxvEe86HLnOvjUED_Am_-ETNw'
  AND l.lesson_format = 'standalone'
  AND jsonb_typeof(l.metadata->'lessonFormat') = 'array';

-- ===== Row 4 of 4: Meet The Food System =====
-- lesson_format: "standalone" → "Multi-session unit".
-- metadata.lessonFormat: array → string. metadata.gradeLevel: NULL → array.
UPDATE lessons l
SET
  lesson_format = 'Multi-session unit',
  metadata = jsonb_set(
    jsonb_set(
      l.metadata,
      '{lessonFormat}',
      '"Multi-session unit"'::jsonb,
      true
    ),
    '{gradeLevel}',
    '["6","7"]'::jsonb,
    true
  )
WHERE l.lesson_id = '1K1tlc3--Dv061Qi1A1AKOGW6_L19VXSTRtKHfe73bjY'
  AND l.lesson_format = 'standalone'
  AND jsonb_typeof(l.metadata->'lessonFormat') = 'array';

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- Rollback restores the post-Phase-6, pre-correction state. Run inside a
-- transaction and verify with the same probes used for forward verification.
-- Note: rollback does NOT restore prior pre-Phase-6 state — that's still
-- preserved in lesson_versions v=1 with archive_reason
-- 'historical_b_update_recovery_2026_04' if a deeper rollback is needed.
--
-- BEGIN;
--
-- UPDATE lessons SET
--   grade_levels = ARRAY['3K','PK','K','1'],
--   lesson_format = 'standalone',
--   metadata = jsonb_set(
--     metadata #- '{gradeLevel}',
--     '{lessonFormat}',
--     '["standalone"]'::jsonb,
--     true
--   )
-- WHERE lesson_id = '1Dkx1Q--fGzGDCAu3kx5OTsuRa_lRY2agdiMqyfn2VpI'
--   AND lesson_format = 'Single period';
--
-- UPDATE lessons SET
--   lesson_format = NULL,
--   metadata = jsonb_set(
--     metadata #- '{gradeLevel}',
--     '{lessonFormat}',
--     '[]'::jsonb,
--     true
--   )
-- WHERE lesson_id = '1YX8Dv7UWeg1JG_ZsBPBTDCap5JOXpbhE'
--   AND lesson_format = 'Single period';
--
-- UPDATE lessons SET
--   lesson_format = 'standalone',
--   metadata = jsonb_set(
--     metadata #- '{gradeLevel}',
--     '{lessonFormat}',
--     '["standalone"]'::jsonb,
--     true
--   )
-- WHERE lesson_id = '1zrKohaoXxvEe86HLnOvjUED_Am_-ETNw'
--   AND lesson_format = 'Multi-session unit';
--
-- UPDATE lessons SET
--   lesson_format = 'standalone',
--   metadata = jsonb_set(
--     metadata #- '{gradeLevel}',
--     '{lessonFormat}',
--     '["standalone"]'::jsonb,
--     true
--   )
-- WHERE lesson_id = '1K1tlc3--Dv061Qi1A1AKOGW6_L19VXSTRtKHfe73bjY'
--   AND lesson_format = 'Multi-session unit';
--
-- COMMIT;
