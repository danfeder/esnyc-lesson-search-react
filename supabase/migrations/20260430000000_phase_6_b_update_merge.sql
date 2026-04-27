-- =====================================================
-- Migration: 20260430000000_phase_6_b_update_merge.sql
-- =====================================================
-- Description: Phase 6 of the lesson-submission Tier-1 orphan recovery.
-- Merges 4 approved orphan submissions into existing public library lessons
-- (Category B-update — verified via title trigram + content snippet eyeball).
-- Each merge UPDATEs an existing lessons row in place AND archives the
-- prior row state into lesson_versions for audit / rollback.
--
-- B-update candidates verified via PROD MCP query 2026-04-27:
--   - The audit's nominal "7 B-update" was 6, then dropped to 4 after content
--     eyeball: Lunar New Year (different lesson — noodles vs dumplings) and
--     African American Food Traditions 25-26 (different scope — orphan is the
--     45-min museum-only standalone, target is the 90-min cooking + museum
--     lesson) are NOT B-updates and are held out.
--   - Verification methodology used title trigram + Google Docs eyeball on
--     content snippets. Cosine on content_embedding was unreliable for
--     orphan-vs-target comparison; submission embeddings appear to live in a
--     different vector space than lessons embeddings (tracked separately in
--     ~/.claude/projects/.../memory/project_embedding_pipeline_mismatch.md).
--
-- Provenance model (per plan §8 lines 749-764):
--   - lessons.original_submission_id is preserved unchanged on update merges.
--     If NULL on the target, it stays NULL — these 4 targets are legacy
--     library rows that pre-date the submission system.
--   - lesson_versions.archived_from_submission_id = orphan.id captures the
--     historical link teachers and reviewers can trace later.
--   - Verification queries for B-update orphans use
--     archived_from_submission_id, NOT original_submission_id.
--
-- Why this is NOT routed through complete_review_atomic (same as Phase 5):
--   - The Phase 4 status guard (...000008) refuses to run when status is
--     already 'approved' (ERRCODE 55000); these 4 submissions all are.
--   - Routing would UPSERT a second submission_reviews row, overwriting
--     the historical reviewer's review_completed_at timestamp.
--   - Phase 7c email triggers (when implemented) would fire on the RPC
--     path; we do not want to send 2026-dated approval emails to teachers
--     for lessons they submitted in 2025.
--
-- Per-row idempotency (re-application is a 0-row no-op):
--   - lesson_versions INSERT gated by NOT EXISTS row with the same
--     archived_from_submission_id + archive_reason.
--   - lessons UPDATE gated by content_hash IS DISTINCT FROM the orphan's
--     content_hash AND EXISTS the lesson_versions archive row. The
--     EXISTS check guarantees we never UPDATE without a preserved BEFORE
--     state, even if statements somehow run out of order.
--
-- Title preservation: lessons.title is NOT updated. Orphans have year-tagged
--   titles ("All About Compost 25-26", "1. Meet The Food System--D22") that
--   would degrade discoverability if applied. The canonical library title is
--   preserved; the orphan title appears only in lesson_versions.title for
--   audit context (we archive the OLD title which equals the canonical one).
--   If a future B-update needs to rename, do it via a separate migration.
--
-- last_modified is updated to the orphan submission's created_at (the date
-- the teacher authored the 25-26 update). Semantically: "this lesson was
-- last modified when the year-tagged update was submitted."
--
-- Order: ascending target content_text length — smallest blast radius first
-- (Compost 2312 chars → Ladybugs 3051 → Mashama Bailey 3922 → Meet Food
-- System 4752). If any single statement fails, Postgres aborts the
-- transaction so we land at "0 merged" rather than partial.
--
-- Metadata projection (React-state shape → legacy lessons.metadata shape)
-- mirrors complete_review_atomic's approve_new branch line-for-line, same
-- as Phase 5. See 20260428000007_phase_4_fix_metadata_shape.sql for the
-- canonical definition. Helper _phase4_jsonb_text_array(jsonb) is reused;
-- it was created by 20260428000001_*. Migrations run as the postgres role,
-- which has implicit EXECUTE on locked-down helpers it owns.
--
-- Held out from Phase 6's batch (2 separate manual decisions — distinct
-- from the 2 pre-existing held-outs from Phase 2):
--   - submission dd355cf1-d60a-4ac1-8dd6-a2e274912dc1 "Lunar New Year Lesson
--     25-26": orphan teaches hand-pulled noodles for Lunar New Year; target
--     "Lunar New Year and Dumplings" teaches dumplings — different lessons.
--     Likely B-new candidate.
--   - submission 5c602604-69f0-45b2-9745-6b8de097d45c "African American Food
--     Traditions 25-26": 45-min museum-only standalone; target is 90-min
--     cooking + museum lesson — different scope. Updating would delete the
--     cooking content from the public library (content damage). The orphan
--     may actually be an update to "African American Food Traditions –
--     Museum (45 min)" lesson (1uwZRLYoxThlJxDq...), separate decision.
-- Plus the pre-existing 2 from Phase 2:
--   - submission ea271d13-78db-437c-aa9f-594ce567f90c "Applesauce lesson
--     plan" (multi-doc-id-match — three plausible link targets)
--   - submission 16603243-0eed-4cc8-886f-f9c37d25276f "Green 'Acai' Bowls
--     (Mobile Education)" (matched lesson row 11oY-EaKF7FT… is broken)

-- =====================================================
-- CHANGES
-- =====================================================

-- ===== Row 1 of 4: All About Compost (orphan f625e179, target 1Dkx1Q--, 2312 chars) =====

-- 1A. Archive prior state into lesson_versions BEFORE the UPDATE.
INSERT INTO lesson_versions (
  lesson_id, title, summary, file_link, grade_levels, metadata, content_text,
  version_number, archived_from_submission_id, archive_reason
)
SELECT
  l.lesson_id, l.title, l.summary, l.file_link, l.grade_levels, l.metadata, l.content_text,
  COALESCE(l.version_number, 1),
  'f625e179-86ce-4d43-a59a-19f0bfd2e689'::uuid,
  'historical_b_update_recovery_2026_04'
FROM lessons l
WHERE l.lesson_id = '1Dkx1Q--fGzGDCAu3kx5OTsuRa_lRY2agdiMqyfn2VpI'
  AND NOT EXISTS (
    SELECT 1 FROM lesson_versions
    WHERE archived_from_submission_id = 'f625e179-86ce-4d43-a59a-19f0bfd2e689'::uuid
      AND archive_reason = 'historical_b_update_recovery_2026_04'
  );

-- 1B. Apply orphan content + metadata to the live lesson.
WITH src AS (
  SELECT s.id                AS submission_id,
         s.created_at        AS submission_created_at,
         s.extracted_content AS extracted_content,
         s.content_hash      AS content_hash,
         s.content_embedding AS content_embedding,
         s.google_doc_url    AS google_doc_url,
         sr.tagged_metadata  AS v_meta,
         jsonb_build_object(
           'thematicCategories',             COALESCE(sr.tagged_metadata->'themes', '[]'::jsonb),
           'seasonTiming',                   COALESCE(sr.tagged_metadata->'season', '[]'::jsonb),
           'coreCompetencies',               COALESCE(sr.tagged_metadata->'coreCompetencies', '[]'::jsonb),
           'culturalHeritage',               COALESCE(sr.tagged_metadata->'culturalHeritage', '[]'::jsonb),
           'locationRequirements',
             CASE WHEN sr.tagged_metadata ? 'location'
                       AND COALESCE(sr.tagged_metadata->>'location', '') <> ''
                  THEN jsonb_build_array(sr.tagged_metadata->>'location')
                  ELSE '[]'::jsonb END,
           'lessonFormat',
             CASE WHEN sr.tagged_metadata ? 'lessonFormat'
                       AND COALESCE(sr.tagged_metadata->>'lessonFormat', '') <> ''
                  THEN jsonb_build_array(sr.tagged_metadata->>'lessonFormat')
                  ELSE '[]'::jsonb END,
           'academicIntegration',            COALESCE(sr.tagged_metadata->'academicIntegration', '[]'::jsonb),
           'socialEmotionalLearning',        COALESCE(sr.tagged_metadata->'socialEmotionalLearning', '[]'::jsonb),
           'cookingMethods',                 COALESCE(sr.tagged_metadata->'cookingMethods', '[]'::jsonb),
           'mainIngredients',                COALESCE(sr.tagged_metadata->'mainIngredients', '[]'::jsonb),
           'gardenSkills',                   COALESCE(sr.tagged_metadata->'gardenSkills', '[]'::jsonb),
           'cookingSkills',                  COALESCE(sr.tagged_metadata->'cookingSkills', '[]'::jsonb),
           'observancesHolidays',            COALESCE(sr.tagged_metadata->'observancesHolidays', '[]'::jsonb),
           'culturalResponsivenessFeatures', COALESCE(sr.tagged_metadata->'culturalResponsivenessFeatures', '[]'::jsonb)
         ) AS v_legacy_meta
  FROM lesson_submissions s
  JOIN submission_reviews sr ON sr.submission_id = s.id
  WHERE s.id = 'f625e179-86ce-4d43-a59a-19f0bfd2e689'::uuid
    AND s.status = 'approved'
    AND sr.decision = 'approve_new'
    AND s.content_embedding IS NOT NULL
)
UPDATE lessons l
SET
  file_link        = src.google_doc_url,
  content_text     = src.extracted_content,
  content_hash     = src.content_hash,
  content_embedding= src.content_embedding,
  summary          = COALESCE(NULLIF(src.v_meta->>'summary', ''), l.summary),
  metadata         = src.v_legacy_meta,
  grade_levels     = public._phase4_jsonb_text_array(src.v_meta->'gradeLevels'),
  activity_type    = CASE WHEN src.v_meta ? 'activityType' AND COALESCE(src.v_meta->>'activityType', '') <> ''
                          THEN ARRAY[src.v_meta->>'activityType']
                          ELSE ARRAY[]::text[] END,
  thematic_categories       = public._phase4_jsonb_text_array(src.v_meta->'themes'),
  season_timing             = public._phase4_jsonb_text_array(src.v_meta->'season'),
  core_competencies         = public._phase4_jsonb_text_array(src.v_meta->'coreCompetencies'),
  cultural_heritage         = public._phase4_jsonb_text_array(src.v_meta->'culturalHeritage'),
  location_requirements     = CASE WHEN src.v_meta ? 'location' AND COALESCE(src.v_meta->>'location', '') <> ''
                                    THEN ARRAY[src.v_meta->>'location']
                                    ELSE ARRAY[]::text[] END,
  lesson_format             = NULLIF(src.v_meta->>'lessonFormat', ''),
  academic_integration      = public._phase4_jsonb_text_array(src.v_meta->'academicIntegration'),
  social_emotional_learning = public._phase4_jsonb_text_array(src.v_meta->'socialEmotionalLearning'),
  cooking_methods           = public._phase4_jsonb_text_array(src.v_meta->'cookingMethods'),
  main_ingredients          = public._phase4_jsonb_text_array(src.v_meta->'mainIngredients'),
  garden_skills             = public._phase4_jsonb_text_array(src.v_meta->'gardenSkills'),
  cooking_skills            = public._phase4_jsonb_text_array(src.v_meta->'cookingSkills'),
  observances_holidays      = public._phase4_jsonb_text_array(src.v_meta->'observancesHolidays'),
  cultural_responsiveness_features = public._phase4_jsonb_text_array(src.v_meta->'culturalResponsivenessFeatures'),
  version_number   = COALESCE(l.version_number, 1) + 1,
  has_versions     = true,
  last_modified    = src.submission_created_at,
  updated_at       = now()
FROM src
WHERE l.lesson_id = '1Dkx1Q--fGzGDCAu3kx5OTsuRa_lRY2agdiMqyfn2VpI'
  AND l.content_hash IS DISTINCT FROM src.content_hash
  AND EXISTS (
    SELECT 1 FROM lesson_versions
    WHERE archived_from_submission_id = 'f625e179-86ce-4d43-a59a-19f0bfd2e689'::uuid
      AND archive_reason = 'historical_b_update_recovery_2026_04'
  );

-- ===== Row 2 of 4: Ladybugs (orphan dba7d09d, target 1YX8Dv7U, 3051 chars) =====

-- 2A. Archive prior state into lesson_versions BEFORE the UPDATE.
INSERT INTO lesson_versions (
  lesson_id, title, summary, file_link, grade_levels, metadata, content_text,
  version_number, archived_from_submission_id, archive_reason
)
SELECT
  l.lesson_id, l.title, l.summary, l.file_link, l.grade_levels, l.metadata, l.content_text,
  COALESCE(l.version_number, 1),
  'dba7d09d-69e2-4450-baab-03e62e2810f6'::uuid,
  'historical_b_update_recovery_2026_04'
FROM lessons l
WHERE l.lesson_id = '1YX8Dv7UWeg1JG_ZsBPBTDCap5JOXpbhE'
  AND NOT EXISTS (
    SELECT 1 FROM lesson_versions
    WHERE archived_from_submission_id = 'dba7d09d-69e2-4450-baab-03e62e2810f6'::uuid
      AND archive_reason = 'historical_b_update_recovery_2026_04'
  );

-- 2B. Apply orphan content + metadata to the live lesson.
WITH src AS (
  SELECT s.id                AS submission_id,
         s.created_at        AS submission_created_at,
         s.extracted_content AS extracted_content,
         s.content_hash      AS content_hash,
         s.content_embedding AS content_embedding,
         s.google_doc_url    AS google_doc_url,
         sr.tagged_metadata  AS v_meta,
         jsonb_build_object(
           'thematicCategories',             COALESCE(sr.tagged_metadata->'themes', '[]'::jsonb),
           'seasonTiming',                   COALESCE(sr.tagged_metadata->'season', '[]'::jsonb),
           'coreCompetencies',               COALESCE(sr.tagged_metadata->'coreCompetencies', '[]'::jsonb),
           'culturalHeritage',               COALESCE(sr.tagged_metadata->'culturalHeritage', '[]'::jsonb),
           'locationRequirements',
             CASE WHEN sr.tagged_metadata ? 'location'
                       AND COALESCE(sr.tagged_metadata->>'location', '') <> ''
                  THEN jsonb_build_array(sr.tagged_metadata->>'location')
                  ELSE '[]'::jsonb END,
           'lessonFormat',
             CASE WHEN sr.tagged_metadata ? 'lessonFormat'
                       AND COALESCE(sr.tagged_metadata->>'lessonFormat', '') <> ''
                  THEN jsonb_build_array(sr.tagged_metadata->>'lessonFormat')
                  ELSE '[]'::jsonb END,
           'academicIntegration',            COALESCE(sr.tagged_metadata->'academicIntegration', '[]'::jsonb),
           'socialEmotionalLearning',        COALESCE(sr.tagged_metadata->'socialEmotionalLearning', '[]'::jsonb),
           'cookingMethods',                 COALESCE(sr.tagged_metadata->'cookingMethods', '[]'::jsonb),
           'mainIngredients',                COALESCE(sr.tagged_metadata->'mainIngredients', '[]'::jsonb),
           'gardenSkills',                   COALESCE(sr.tagged_metadata->'gardenSkills', '[]'::jsonb),
           'cookingSkills',                  COALESCE(sr.tagged_metadata->'cookingSkills', '[]'::jsonb),
           'observancesHolidays',            COALESCE(sr.tagged_metadata->'observancesHolidays', '[]'::jsonb),
           'culturalResponsivenessFeatures', COALESCE(sr.tagged_metadata->'culturalResponsivenessFeatures', '[]'::jsonb)
         ) AS v_legacy_meta
  FROM lesson_submissions s
  JOIN submission_reviews sr ON sr.submission_id = s.id
  WHERE s.id = 'dba7d09d-69e2-4450-baab-03e62e2810f6'::uuid
    AND s.status = 'approved'
    AND sr.decision = 'approve_new'
    AND s.content_embedding IS NOT NULL
)
UPDATE lessons l
SET
  file_link        = src.google_doc_url,
  content_text     = src.extracted_content,
  content_hash     = src.content_hash,
  content_embedding= src.content_embedding,
  summary          = COALESCE(NULLIF(src.v_meta->>'summary', ''), l.summary),
  metadata         = src.v_legacy_meta,
  grade_levels     = public._phase4_jsonb_text_array(src.v_meta->'gradeLevels'),
  activity_type    = CASE WHEN src.v_meta ? 'activityType' AND COALESCE(src.v_meta->>'activityType', '') <> ''
                          THEN ARRAY[src.v_meta->>'activityType']
                          ELSE ARRAY[]::text[] END,
  thematic_categories       = public._phase4_jsonb_text_array(src.v_meta->'themes'),
  season_timing             = public._phase4_jsonb_text_array(src.v_meta->'season'),
  core_competencies         = public._phase4_jsonb_text_array(src.v_meta->'coreCompetencies'),
  cultural_heritage         = public._phase4_jsonb_text_array(src.v_meta->'culturalHeritage'),
  location_requirements     = CASE WHEN src.v_meta ? 'location' AND COALESCE(src.v_meta->>'location', '') <> ''
                                    THEN ARRAY[src.v_meta->>'location']
                                    ELSE ARRAY[]::text[] END,
  lesson_format             = NULLIF(src.v_meta->>'lessonFormat', ''),
  academic_integration      = public._phase4_jsonb_text_array(src.v_meta->'academicIntegration'),
  social_emotional_learning = public._phase4_jsonb_text_array(src.v_meta->'socialEmotionalLearning'),
  cooking_methods           = public._phase4_jsonb_text_array(src.v_meta->'cookingMethods'),
  main_ingredients          = public._phase4_jsonb_text_array(src.v_meta->'mainIngredients'),
  garden_skills             = public._phase4_jsonb_text_array(src.v_meta->'gardenSkills'),
  cooking_skills            = public._phase4_jsonb_text_array(src.v_meta->'cookingSkills'),
  observances_holidays      = public._phase4_jsonb_text_array(src.v_meta->'observancesHolidays'),
  cultural_responsiveness_features = public._phase4_jsonb_text_array(src.v_meta->'culturalResponsivenessFeatures'),
  version_number   = COALESCE(l.version_number, 1) + 1,
  has_versions     = true,
  last_modified    = src.submission_created_at,
  updated_at       = now()
FROM src
WHERE l.lesson_id = '1YX8Dv7UWeg1JG_ZsBPBTDCap5JOXpbhE'
  AND l.content_hash IS DISTINCT FROM src.content_hash
  AND EXISTS (
    SELECT 1 FROM lesson_versions
    WHERE archived_from_submission_id = 'dba7d09d-69e2-4450-baab-03e62e2810f6'::uuid
      AND archive_reason = 'historical_b_update_recovery_2026_04'
  );

-- ===== Row 3 of 4: A Visit to Mashama Bailey's Restaurant (orphan 63118947, target 1zrKohao, 3922 chars) =====

-- 3A. Archive prior state into lesson_versions BEFORE the UPDATE.
INSERT INTO lesson_versions (
  lesson_id, title, summary, file_link, grade_levels, metadata, content_text,
  version_number, archived_from_submission_id, archive_reason
)
SELECT
  l.lesson_id, l.title, l.summary, l.file_link, l.grade_levels, l.metadata, l.content_text,
  COALESCE(l.version_number, 1),
  '63118947-6a84-4ef9-bcfd-a25ee185c66a'::uuid,
  'historical_b_update_recovery_2026_04'
FROM lessons l
WHERE l.lesson_id = '1zrKohaoXxvEe86HLnOvjUED_Am_-ETNw'
  AND NOT EXISTS (
    SELECT 1 FROM lesson_versions
    WHERE archived_from_submission_id = '63118947-6a84-4ef9-bcfd-a25ee185c66a'::uuid
      AND archive_reason = 'historical_b_update_recovery_2026_04'
  );

-- 3B. Apply orphan content + metadata to the live lesson.
WITH src AS (
  SELECT s.id                AS submission_id,
         s.created_at        AS submission_created_at,
         s.extracted_content AS extracted_content,
         s.content_hash      AS content_hash,
         s.content_embedding AS content_embedding,
         s.google_doc_url    AS google_doc_url,
         sr.tagged_metadata  AS v_meta,
         jsonb_build_object(
           'thematicCategories',             COALESCE(sr.tagged_metadata->'themes', '[]'::jsonb),
           'seasonTiming',                   COALESCE(sr.tagged_metadata->'season', '[]'::jsonb),
           'coreCompetencies',               COALESCE(sr.tagged_metadata->'coreCompetencies', '[]'::jsonb),
           'culturalHeritage',               COALESCE(sr.tagged_metadata->'culturalHeritage', '[]'::jsonb),
           'locationRequirements',
             CASE WHEN sr.tagged_metadata ? 'location'
                       AND COALESCE(sr.tagged_metadata->>'location', '') <> ''
                  THEN jsonb_build_array(sr.tagged_metadata->>'location')
                  ELSE '[]'::jsonb END,
           'lessonFormat',
             CASE WHEN sr.tagged_metadata ? 'lessonFormat'
                       AND COALESCE(sr.tagged_metadata->>'lessonFormat', '') <> ''
                  THEN jsonb_build_array(sr.tagged_metadata->>'lessonFormat')
                  ELSE '[]'::jsonb END,
           'academicIntegration',            COALESCE(sr.tagged_metadata->'academicIntegration', '[]'::jsonb),
           'socialEmotionalLearning',        COALESCE(sr.tagged_metadata->'socialEmotionalLearning', '[]'::jsonb),
           'cookingMethods',                 COALESCE(sr.tagged_metadata->'cookingMethods', '[]'::jsonb),
           'mainIngredients',                COALESCE(sr.tagged_metadata->'mainIngredients', '[]'::jsonb),
           'gardenSkills',                   COALESCE(sr.tagged_metadata->'gardenSkills', '[]'::jsonb),
           'cookingSkills',                  COALESCE(sr.tagged_metadata->'cookingSkills', '[]'::jsonb),
           'observancesHolidays',            COALESCE(sr.tagged_metadata->'observancesHolidays', '[]'::jsonb),
           'culturalResponsivenessFeatures', COALESCE(sr.tagged_metadata->'culturalResponsivenessFeatures', '[]'::jsonb)
         ) AS v_legacy_meta
  FROM lesson_submissions s
  JOIN submission_reviews sr ON sr.submission_id = s.id
  WHERE s.id = '63118947-6a84-4ef9-bcfd-a25ee185c66a'::uuid
    AND s.status = 'approved'
    AND sr.decision = 'approve_new'
    AND s.content_embedding IS NOT NULL
)
UPDATE lessons l
SET
  file_link        = src.google_doc_url,
  content_text     = src.extracted_content,
  content_hash     = src.content_hash,
  content_embedding= src.content_embedding,
  summary          = COALESCE(NULLIF(src.v_meta->>'summary', ''), l.summary),
  metadata         = src.v_legacy_meta,
  grade_levels     = public._phase4_jsonb_text_array(src.v_meta->'gradeLevels'),
  activity_type    = CASE WHEN src.v_meta ? 'activityType' AND COALESCE(src.v_meta->>'activityType', '') <> ''
                          THEN ARRAY[src.v_meta->>'activityType']
                          ELSE ARRAY[]::text[] END,
  thematic_categories       = public._phase4_jsonb_text_array(src.v_meta->'themes'),
  season_timing             = public._phase4_jsonb_text_array(src.v_meta->'season'),
  core_competencies         = public._phase4_jsonb_text_array(src.v_meta->'coreCompetencies'),
  cultural_heritage         = public._phase4_jsonb_text_array(src.v_meta->'culturalHeritage'),
  location_requirements     = CASE WHEN src.v_meta ? 'location' AND COALESCE(src.v_meta->>'location', '') <> ''
                                    THEN ARRAY[src.v_meta->>'location']
                                    ELSE ARRAY[]::text[] END,
  lesson_format             = NULLIF(src.v_meta->>'lessonFormat', ''),
  academic_integration      = public._phase4_jsonb_text_array(src.v_meta->'academicIntegration'),
  social_emotional_learning = public._phase4_jsonb_text_array(src.v_meta->'socialEmotionalLearning'),
  cooking_methods           = public._phase4_jsonb_text_array(src.v_meta->'cookingMethods'),
  main_ingredients          = public._phase4_jsonb_text_array(src.v_meta->'mainIngredients'),
  garden_skills             = public._phase4_jsonb_text_array(src.v_meta->'gardenSkills'),
  cooking_skills            = public._phase4_jsonb_text_array(src.v_meta->'cookingSkills'),
  observances_holidays      = public._phase4_jsonb_text_array(src.v_meta->'observancesHolidays'),
  cultural_responsiveness_features = public._phase4_jsonb_text_array(src.v_meta->'culturalResponsivenessFeatures'),
  version_number   = COALESCE(l.version_number, 1) + 1,
  has_versions     = true,
  last_modified    = src.submission_created_at,
  updated_at       = now()
FROM src
WHERE l.lesson_id = '1zrKohaoXxvEe86HLnOvjUED_Am_-ETNw'
  AND l.content_hash IS DISTINCT FROM src.content_hash
  AND EXISTS (
    SELECT 1 FROM lesson_versions
    WHERE archived_from_submission_id = '63118947-6a84-4ef9-bcfd-a25ee185c66a'::uuid
      AND archive_reason = 'historical_b_update_recovery_2026_04'
  );

-- ===== Row 4 of 4: Meet The Food System (orphan 0d57d53c, target 1K1tlc3--, 4752 chars) =====

-- 4A. Archive prior state into lesson_versions BEFORE the UPDATE.
INSERT INTO lesson_versions (
  lesson_id, title, summary, file_link, grade_levels, metadata, content_text,
  version_number, archived_from_submission_id, archive_reason
)
SELECT
  l.lesson_id, l.title, l.summary, l.file_link, l.grade_levels, l.metadata, l.content_text,
  COALESCE(l.version_number, 1),
  '0d57d53c-5889-4f1d-8e9a-ddd9a627778e'::uuid,
  'historical_b_update_recovery_2026_04'
FROM lessons l
WHERE l.lesson_id = '1K1tlc3--Dv061Qi1A1AKOGW6_L19VXSTRtKHfe73bjY'
  AND NOT EXISTS (
    SELECT 1 FROM lesson_versions
    WHERE archived_from_submission_id = '0d57d53c-5889-4f1d-8e9a-ddd9a627778e'::uuid
      AND archive_reason = 'historical_b_update_recovery_2026_04'
  );

-- 4B. Apply orphan content + metadata to the live lesson.
WITH src AS (
  SELECT s.id                AS submission_id,
         s.created_at        AS submission_created_at,
         s.extracted_content AS extracted_content,
         s.content_hash      AS content_hash,
         s.content_embedding AS content_embedding,
         s.google_doc_url    AS google_doc_url,
         sr.tagged_metadata  AS v_meta,
         jsonb_build_object(
           'thematicCategories',             COALESCE(sr.tagged_metadata->'themes', '[]'::jsonb),
           'seasonTiming',                   COALESCE(sr.tagged_metadata->'season', '[]'::jsonb),
           'coreCompetencies',               COALESCE(sr.tagged_metadata->'coreCompetencies', '[]'::jsonb),
           'culturalHeritage',               COALESCE(sr.tagged_metadata->'culturalHeritage', '[]'::jsonb),
           'locationRequirements',
             CASE WHEN sr.tagged_metadata ? 'location'
                       AND COALESCE(sr.tagged_metadata->>'location', '') <> ''
                  THEN jsonb_build_array(sr.tagged_metadata->>'location')
                  ELSE '[]'::jsonb END,
           'lessonFormat',
             CASE WHEN sr.tagged_metadata ? 'lessonFormat'
                       AND COALESCE(sr.tagged_metadata->>'lessonFormat', '') <> ''
                  THEN jsonb_build_array(sr.tagged_metadata->>'lessonFormat')
                  ELSE '[]'::jsonb END,
           'academicIntegration',            COALESCE(sr.tagged_metadata->'academicIntegration', '[]'::jsonb),
           'socialEmotionalLearning',        COALESCE(sr.tagged_metadata->'socialEmotionalLearning', '[]'::jsonb),
           'cookingMethods',                 COALESCE(sr.tagged_metadata->'cookingMethods', '[]'::jsonb),
           'mainIngredients',                COALESCE(sr.tagged_metadata->'mainIngredients', '[]'::jsonb),
           'gardenSkills',                   COALESCE(sr.tagged_metadata->'gardenSkills', '[]'::jsonb),
           'cookingSkills',                  COALESCE(sr.tagged_metadata->'cookingSkills', '[]'::jsonb),
           'observancesHolidays',            COALESCE(sr.tagged_metadata->'observancesHolidays', '[]'::jsonb),
           'culturalResponsivenessFeatures', COALESCE(sr.tagged_metadata->'culturalResponsivenessFeatures', '[]'::jsonb)
         ) AS v_legacy_meta
  FROM lesson_submissions s
  JOIN submission_reviews sr ON sr.submission_id = s.id
  WHERE s.id = '0d57d53c-5889-4f1d-8e9a-ddd9a627778e'::uuid
    AND s.status = 'approved'
    AND sr.decision = 'approve_new'
    AND s.content_embedding IS NOT NULL
)
UPDATE lessons l
SET
  file_link        = src.google_doc_url,
  content_text     = src.extracted_content,
  content_hash     = src.content_hash,
  content_embedding= src.content_embedding,
  summary          = COALESCE(NULLIF(src.v_meta->>'summary', ''), l.summary),
  metadata         = src.v_legacy_meta,
  grade_levels     = public._phase4_jsonb_text_array(src.v_meta->'gradeLevels'),
  activity_type    = CASE WHEN src.v_meta ? 'activityType' AND COALESCE(src.v_meta->>'activityType', '') <> ''
                          THEN ARRAY[src.v_meta->>'activityType']
                          ELSE ARRAY[]::text[] END,
  thematic_categories       = public._phase4_jsonb_text_array(src.v_meta->'themes'),
  season_timing             = public._phase4_jsonb_text_array(src.v_meta->'season'),
  core_competencies         = public._phase4_jsonb_text_array(src.v_meta->'coreCompetencies'),
  cultural_heritage         = public._phase4_jsonb_text_array(src.v_meta->'culturalHeritage'),
  location_requirements     = CASE WHEN src.v_meta ? 'location' AND COALESCE(src.v_meta->>'location', '') <> ''
                                    THEN ARRAY[src.v_meta->>'location']
                                    ELSE ARRAY[]::text[] END,
  lesson_format             = NULLIF(src.v_meta->>'lessonFormat', ''),
  academic_integration      = public._phase4_jsonb_text_array(src.v_meta->'academicIntegration'),
  social_emotional_learning = public._phase4_jsonb_text_array(src.v_meta->'socialEmotionalLearning'),
  cooking_methods           = public._phase4_jsonb_text_array(src.v_meta->'cookingMethods'),
  main_ingredients          = public._phase4_jsonb_text_array(src.v_meta->'mainIngredients'),
  garden_skills             = public._phase4_jsonb_text_array(src.v_meta->'gardenSkills'),
  cooking_skills            = public._phase4_jsonb_text_array(src.v_meta->'cookingSkills'),
  observances_holidays      = public._phase4_jsonb_text_array(src.v_meta->'observancesHolidays'),
  cultural_responsiveness_features = public._phase4_jsonb_text_array(src.v_meta->'culturalResponsivenessFeatures'),
  version_number   = COALESCE(l.version_number, 1) + 1,
  has_versions     = true,
  last_modified    = src.submission_created_at,
  updated_at       = now()
FROM src
WHERE l.lesson_id = '1K1tlc3--Dv061Qi1A1AKOGW6_L19VXSTRtKHfe73bjY'
  AND l.content_hash IS DISTINCT FROM src.content_hash
  AND EXISTS (
    SELECT 1 FROM lesson_versions
    WHERE archived_from_submission_id = '0d57d53c-5889-4f1d-8e9a-ddd9a627778e'::uuid
      AND archive_reason = 'historical_b_update_recovery_2026_04'
  );

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- Per-row rollback restores BOTH the lesson content and removes the audit row.
-- The lesson_versions row preserves the BEFORE state (title, summary, file_link,
-- grade_levels, metadata, content_text, version_number) and is the canonical
-- recovery source. Local snapshot files in scripts/orphan-recovery/snapshots/
-- (LOCAL ONLY by user policy) capture the typed array fields and system fields
-- that are not in lesson_versions.
--
-- Rollback for one row (worked example for Compost):
--
-- BEGIN;
--   -- 1. Restore content + summary + file_link from lesson_versions
--   UPDATE lessons l
--   SET file_link    = lv.file_link,
--       summary      = lv.summary,
--       grade_levels = lv.grade_levels,
--       metadata     = lv.metadata,
--       content_text = lv.content_text,
--       version_number = lv.version_number,
--       has_versions = false,
--       updated_at   = now()
--   FROM lesson_versions lv
--   WHERE l.lesson_id = '1Dkx1Q--fGzGDCAu3kx5OTsuRa_lRY2agdiMqyfn2VpI'
--     AND lv.archived_from_submission_id = 'f625e179-86ce-4d43-a59a-19f0bfd2e689'::uuid
--     AND lv.archive_reason = 'historical_b_update_recovery_2026_04';
--
--   -- 2. Restore typed array fields + system fields from local snapshot
--   --    (scripts/orphan-recovery/snapshots/category-b-update-1Dkx1Q--*-pre.json)
--   --    Hand-rebuild the UPDATE setting every typed array field. Use the
--   --    snapshot's column list — don't hand-pick.
--
--   -- 3. Re-derive content_hash from restored content_text:
--   --    UPDATE lessons SET content_hash = encode(digest(content_text, 'sha256'), 'hex')
--   --    WHERE lesson_id = '...';
--
--   -- 4. Regenerate content_embedding via OpenAI text-embedding-3-small
--   --    (scripts/generate-embeddings.mjs or equivalent). Until regenerated,
--   --    the embedding will be the orphan's (mismatched-space, but functional
--   --    enough that the lesson is searchable by content text via FTS).
--
--   -- 5. Delete the audit row keyed by distinctive archive_reason:
--   DELETE FROM lesson_versions
--   WHERE lesson_id = '1Dkx1Q--fGzGDCAu3kx5OTsuRa_lRY2agdiMqyfn2VpI'
--     AND archived_from_submission_id = 'f625e179-86ce-4d43-a59a-19f0bfd2e689'::uuid
--     AND archive_reason = 'historical_b_update_recovery_2026_04';
-- COMMIT;
