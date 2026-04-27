-- =====================================================
-- Migration: 20260429000000_phase_5_b_new_publish.sql
-- =====================================================
-- Description: Phase 5 of the lesson-submission Tier-1 orphan recovery.
-- Publishes 5 approved orphan submissions whose Google Doc is NOT already
-- in the library (Category B-new — verified via doc-id collision check
-- and < 0.85 cosine similarity to any existing lesson).
--
-- Reasoning artifact: scripts/orphan-recovery/phase-5-b-new-publish.ts.
-- That script encodes the same 5 submission IDs, the embedding preflight
-- (NULL → hard-stop), and the post-write verification SELECT.
--
-- Each INSERT is a separate statement, ordered by extracted_content
-- length ascending (smallest blast radius first) and idempotent via
-- `WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE original_submission_id
-- = $1)`. Re-application is a 0-row no-op. If any single INSERT trips a
-- constraint, Postgres aborts the transaction so we land at "0
-- published" rather than partial — no per-row rollback needed.
--
-- Why this is NOT routed through complete_review_atomic:
--   - The Phase 4 status guard (...000008) refuses to run when status is
--     already 'approved' (ERRCODE 55000); these 5 submissions all are.
--   - Routing would UPSERT a second submission_reviews row, overwriting
--     the historical reviewer's review_completed_at timestamp.
--   - Phase 7c email triggers (when implemented) would fire on the RPC
--     path; we do not want to send 2026-dated approval emails to
--     teachers for lessons they submitted in 2025.
--
-- Metadata projection (React-state shape → legacy lessons.metadata shape)
-- mirrors complete_review_atomic's approve_new branch line-for-line. See
-- 20260428000007_phase_4_fix_metadata_shape.sql for the canonical
-- definition. Helper _phase4_jsonb_text_array(jsonb) is reused; it was
-- created by 20260428000001_*. Migrations run as the postgres role,
-- which has implicit EXECUTE on locked-down helpers it owns — the
-- REVOKE FROM PUBLIC/anon/authenticated does not affect this path.
--
-- Held out from Phase 5's batch (separate manual decisions; both still
-- present in PROD orphan set as of 2026-04-27):
--   - submission ea271d13-78db-437c-aa9f-594ce567f90c "Applesauce lesson
--     plan" (multi-doc-id-match — three plausible link targets)
--   - submission 16603243-0eed-4cc8-886f-f9c37d25276f "Green 'Acai' Bowls
--     (Mobile Education)" (matched lesson row 11oY-EaKF7FT… is broken)

-- =====================================================
-- CHANGES
-- =====================================================

-- Row 1 of 5: 4e4f3ae3-4c51-4439-87ee-f20d2ec94921 — Bees (4277 chars; smallest)
WITH src AS (
  SELECT s.id                AS submission_id,
         s.extracted_title   AS extracted_title,
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
  WHERE s.id = '4e4f3ae3-4c51-4439-87ee-f20d2ec94921'::uuid
    AND s.status = 'approved'
    AND sr.decision = 'approve_new'
    AND s.content_embedding IS NOT NULL
)
INSERT INTO lessons (
  lesson_id, title, summary, file_link,
  grade_levels, activity_type, thematic_categories, season_timing,
  core_competencies, cultural_heritage, location_requirements, lesson_format,
  academic_integration, social_emotional_learning, cooking_methods,
  main_ingredients, garden_skills, cooking_skills, observances_holidays,
  cultural_responsiveness_features,
  metadata, content_text, content_hash, content_embedding,
  original_submission_id, processing_notes, created_at, updated_at
)
SELECT
  'lesson_' || replace(gen_random_uuid()::text, '-', ''),
  COALESCE(NULLIF(src.extracted_title, ''), NULLIF(src.v_meta->>'title', ''), 'Untitled Lesson'),
  COALESCE(src.v_meta->>'summary', ''),
  src.google_doc_url,
  public._phase4_jsonb_text_array(src.v_meta->'gradeLevels'),
  CASE WHEN src.v_meta ? 'activityType' AND COALESCE(src.v_meta->>'activityType', '') <> ''
       THEN ARRAY[src.v_meta->>'activityType']
       ELSE ARRAY[]::text[] END,
  public._phase4_jsonb_text_array(src.v_meta->'themes'),
  public._phase4_jsonb_text_array(src.v_meta->'season'),
  public._phase4_jsonb_text_array(src.v_meta->'coreCompetencies'),
  public._phase4_jsonb_text_array(src.v_meta->'culturalHeritage'),
  CASE WHEN src.v_meta ? 'location' AND COALESCE(src.v_meta->>'location', '') <> ''
       THEN ARRAY[src.v_meta->>'location']
       ELSE ARRAY[]::text[] END,
  NULLIF(src.v_meta->>'lessonFormat', ''),
  public._phase4_jsonb_text_array(src.v_meta->'academicIntegration'),
  public._phase4_jsonb_text_array(src.v_meta->'socialEmotionalLearning'),
  public._phase4_jsonb_text_array(src.v_meta->'cookingMethods'),
  public._phase4_jsonb_text_array(src.v_meta->'mainIngredients'),
  public._phase4_jsonb_text_array(src.v_meta->'gardenSkills'),
  public._phase4_jsonb_text_array(src.v_meta->'cookingSkills'),
  public._phase4_jsonb_text_array(src.v_meta->'observancesHolidays'),
  public._phase4_jsonb_text_array(src.v_meta->'culturalResponsivenessFeatures'),
  src.v_legacy_meta,
  COALESCE(src.extracted_content, ''),
  src.content_hash,
  src.content_embedding,
  src.submission_id,
  COALESCE(src.v_meta->>'processingNotes', ''),
  now(),
  now()
FROM src
WHERE NOT EXISTS (
  SELECT 1 FROM lessons WHERE original_submission_id = '4e4f3ae3-4c51-4439-87ee-f20d2ec94921'::uuid
);

-- Row 2 of 5: 4c2bacdb-7018-4ff2-badb-3701c8c974c0 — Food Justice Advocates: Food Scarcity (4504 chars)
WITH src AS (
  SELECT s.id                AS submission_id,
         s.extracted_title   AS extracted_title,
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
  WHERE s.id = '4c2bacdb-7018-4ff2-badb-3701c8c974c0'::uuid
    AND s.status = 'approved'
    AND sr.decision = 'approve_new'
    AND s.content_embedding IS NOT NULL
)
INSERT INTO lessons (
  lesson_id, title, summary, file_link,
  grade_levels, activity_type, thematic_categories, season_timing,
  core_competencies, cultural_heritage, location_requirements, lesson_format,
  academic_integration, social_emotional_learning, cooking_methods,
  main_ingredients, garden_skills, cooking_skills, observances_holidays,
  cultural_responsiveness_features,
  metadata, content_text, content_hash, content_embedding,
  original_submission_id, processing_notes, created_at, updated_at
)
SELECT
  'lesson_' || replace(gen_random_uuid()::text, '-', ''),
  COALESCE(NULLIF(src.extracted_title, ''), NULLIF(src.v_meta->>'title', ''), 'Untitled Lesson'),
  COALESCE(src.v_meta->>'summary', ''),
  src.google_doc_url,
  public._phase4_jsonb_text_array(src.v_meta->'gradeLevels'),
  CASE WHEN src.v_meta ? 'activityType' AND COALESCE(src.v_meta->>'activityType', '') <> ''
       THEN ARRAY[src.v_meta->>'activityType']
       ELSE ARRAY[]::text[] END,
  public._phase4_jsonb_text_array(src.v_meta->'themes'),
  public._phase4_jsonb_text_array(src.v_meta->'season'),
  public._phase4_jsonb_text_array(src.v_meta->'coreCompetencies'),
  public._phase4_jsonb_text_array(src.v_meta->'culturalHeritage'),
  CASE WHEN src.v_meta ? 'location' AND COALESCE(src.v_meta->>'location', '') <> ''
       THEN ARRAY[src.v_meta->>'location']
       ELSE ARRAY[]::text[] END,
  NULLIF(src.v_meta->>'lessonFormat', ''),
  public._phase4_jsonb_text_array(src.v_meta->'academicIntegration'),
  public._phase4_jsonb_text_array(src.v_meta->'socialEmotionalLearning'),
  public._phase4_jsonb_text_array(src.v_meta->'cookingMethods'),
  public._phase4_jsonb_text_array(src.v_meta->'mainIngredients'),
  public._phase4_jsonb_text_array(src.v_meta->'gardenSkills'),
  public._phase4_jsonb_text_array(src.v_meta->'cookingSkills'),
  public._phase4_jsonb_text_array(src.v_meta->'observancesHolidays'),
  public._phase4_jsonb_text_array(src.v_meta->'culturalResponsivenessFeatures'),
  src.v_legacy_meta,
  COALESCE(src.extracted_content, ''),
  src.content_hash,
  src.content_embedding,
  src.submission_id,
  COALESCE(src.v_meta->>'processingNotes', ''),
  now(),
  now()
FROM src
WHERE NOT EXISTS (
  SELECT 1 FROM lessons WHERE original_submission_id = '4c2bacdb-7018-4ff2-badb-3701c8c974c0'::uuid
);

-- Row 3 of 5: 0369743c-8b6c-4037-a90e-790c2cbcef52 — All About Lanternflies lesson (4738 chars)
WITH src AS (
  SELECT s.id                AS submission_id,
         s.extracted_title   AS extracted_title,
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
  WHERE s.id = '0369743c-8b6c-4037-a90e-790c2cbcef52'::uuid
    AND s.status = 'approved'
    AND sr.decision = 'approve_new'
    AND s.content_embedding IS NOT NULL
)
INSERT INTO lessons (
  lesson_id, title, summary, file_link,
  grade_levels, activity_type, thematic_categories, season_timing,
  core_competencies, cultural_heritage, location_requirements, lesson_format,
  academic_integration, social_emotional_learning, cooking_methods,
  main_ingredients, garden_skills, cooking_skills, observances_holidays,
  cultural_responsiveness_features,
  metadata, content_text, content_hash, content_embedding,
  original_submission_id, processing_notes, created_at, updated_at
)
SELECT
  'lesson_' || replace(gen_random_uuid()::text, '-', ''),
  COALESCE(NULLIF(src.extracted_title, ''), NULLIF(src.v_meta->>'title', ''), 'Untitled Lesson'),
  COALESCE(src.v_meta->>'summary', ''),
  src.google_doc_url,
  public._phase4_jsonb_text_array(src.v_meta->'gradeLevels'),
  CASE WHEN src.v_meta ? 'activityType' AND COALESCE(src.v_meta->>'activityType', '') <> ''
       THEN ARRAY[src.v_meta->>'activityType']
       ELSE ARRAY[]::text[] END,
  public._phase4_jsonb_text_array(src.v_meta->'themes'),
  public._phase4_jsonb_text_array(src.v_meta->'season'),
  public._phase4_jsonb_text_array(src.v_meta->'coreCompetencies'),
  public._phase4_jsonb_text_array(src.v_meta->'culturalHeritage'),
  CASE WHEN src.v_meta ? 'location' AND COALESCE(src.v_meta->>'location', '') <> ''
       THEN ARRAY[src.v_meta->>'location']
       ELSE ARRAY[]::text[] END,
  NULLIF(src.v_meta->>'lessonFormat', ''),
  public._phase4_jsonb_text_array(src.v_meta->'academicIntegration'),
  public._phase4_jsonb_text_array(src.v_meta->'socialEmotionalLearning'),
  public._phase4_jsonb_text_array(src.v_meta->'cookingMethods'),
  public._phase4_jsonb_text_array(src.v_meta->'mainIngredients'),
  public._phase4_jsonb_text_array(src.v_meta->'gardenSkills'),
  public._phase4_jsonb_text_array(src.v_meta->'cookingSkills'),
  public._phase4_jsonb_text_array(src.v_meta->'observancesHolidays'),
  public._phase4_jsonb_text_array(src.v_meta->'culturalResponsivenessFeatures'),
  src.v_legacy_meta,
  COALESCE(src.extracted_content, ''),
  src.content_hash,
  src.content_embedding,
  src.submission_id,
  COALESCE(src.v_meta->>'processingNotes', ''),
  now(),
  now()
FROM src
WHERE NOT EXISTS (
  SELECT 1 FROM lessons WHERE original_submission_id = '0369743c-8b6c-4037-a90e-790c2cbcef52'::uuid
);

-- Row 4 of 5: ae8f00b4-a4ea-4601-85f3-9b720d0ced89 — NEW Place Based: Native Plants in Our Garden (5328 chars)
WITH src AS (
  SELECT s.id                AS submission_id,
         s.extracted_title   AS extracted_title,
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
  WHERE s.id = 'ae8f00b4-a4ea-4601-85f3-9b720d0ced89'::uuid
    AND s.status = 'approved'
    AND sr.decision = 'approve_new'
    AND s.content_embedding IS NOT NULL
)
INSERT INTO lessons (
  lesson_id, title, summary, file_link,
  grade_levels, activity_type, thematic_categories, season_timing,
  core_competencies, cultural_heritage, location_requirements, lesson_format,
  academic_integration, social_emotional_learning, cooking_methods,
  main_ingredients, garden_skills, cooking_skills, observances_holidays,
  cultural_responsiveness_features,
  metadata, content_text, content_hash, content_embedding,
  original_submission_id, processing_notes, created_at, updated_at
)
SELECT
  'lesson_' || replace(gen_random_uuid()::text, '-', ''),
  COALESCE(NULLIF(src.extracted_title, ''), NULLIF(src.v_meta->>'title', ''), 'Untitled Lesson'),
  COALESCE(src.v_meta->>'summary', ''),
  src.google_doc_url,
  public._phase4_jsonb_text_array(src.v_meta->'gradeLevels'),
  CASE WHEN src.v_meta ? 'activityType' AND COALESCE(src.v_meta->>'activityType', '') <> ''
       THEN ARRAY[src.v_meta->>'activityType']
       ELSE ARRAY[]::text[] END,
  public._phase4_jsonb_text_array(src.v_meta->'themes'),
  public._phase4_jsonb_text_array(src.v_meta->'season'),
  public._phase4_jsonb_text_array(src.v_meta->'coreCompetencies'),
  public._phase4_jsonb_text_array(src.v_meta->'culturalHeritage'),
  CASE WHEN src.v_meta ? 'location' AND COALESCE(src.v_meta->>'location', '') <> ''
       THEN ARRAY[src.v_meta->>'location']
       ELSE ARRAY[]::text[] END,
  NULLIF(src.v_meta->>'lessonFormat', ''),
  public._phase4_jsonb_text_array(src.v_meta->'academicIntegration'),
  public._phase4_jsonb_text_array(src.v_meta->'socialEmotionalLearning'),
  public._phase4_jsonb_text_array(src.v_meta->'cookingMethods'),
  public._phase4_jsonb_text_array(src.v_meta->'mainIngredients'),
  public._phase4_jsonb_text_array(src.v_meta->'gardenSkills'),
  public._phase4_jsonb_text_array(src.v_meta->'cookingSkills'),
  public._phase4_jsonb_text_array(src.v_meta->'observancesHolidays'),
  public._phase4_jsonb_text_array(src.v_meta->'culturalResponsivenessFeatures'),
  src.v_legacy_meta,
  COALESCE(src.extracted_content, ''),
  src.content_hash,
  src.content_embedding,
  src.submission_id,
  COALESCE(src.v_meta->>'processingNotes', ''),
  now(),
  now()
FROM src
WHERE NOT EXISTS (
  SELECT 1 FROM lessons WHERE original_submission_id = 'ae8f00b4-a4ea-4601-85f3-9b720d0ced89'::uuid
);

-- Row 5 of 5: dd2c3e79-6dbb-4863-b60b-6c37a1fcc2f7 — Puppet Pollinators (5794 chars; largest)
WITH src AS (
  SELECT s.id                AS submission_id,
         s.extracted_title   AS extracted_title,
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
  WHERE s.id = 'dd2c3e79-6dbb-4863-b60b-6c37a1fcc2f7'::uuid
    AND s.status = 'approved'
    AND sr.decision = 'approve_new'
    AND s.content_embedding IS NOT NULL
)
INSERT INTO lessons (
  lesson_id, title, summary, file_link,
  grade_levels, activity_type, thematic_categories, season_timing,
  core_competencies, cultural_heritage, location_requirements, lesson_format,
  academic_integration, social_emotional_learning, cooking_methods,
  main_ingredients, garden_skills, cooking_skills, observances_holidays,
  cultural_responsiveness_features,
  metadata, content_text, content_hash, content_embedding,
  original_submission_id, processing_notes, created_at, updated_at
)
SELECT
  'lesson_' || replace(gen_random_uuid()::text, '-', ''),
  COALESCE(NULLIF(src.extracted_title, ''), NULLIF(src.v_meta->>'title', ''), 'Untitled Lesson'),
  COALESCE(src.v_meta->>'summary', ''),
  src.google_doc_url,
  public._phase4_jsonb_text_array(src.v_meta->'gradeLevels'),
  CASE WHEN src.v_meta ? 'activityType' AND COALESCE(src.v_meta->>'activityType', '') <> ''
       THEN ARRAY[src.v_meta->>'activityType']
       ELSE ARRAY[]::text[] END,
  public._phase4_jsonb_text_array(src.v_meta->'themes'),
  public._phase4_jsonb_text_array(src.v_meta->'season'),
  public._phase4_jsonb_text_array(src.v_meta->'coreCompetencies'),
  public._phase4_jsonb_text_array(src.v_meta->'culturalHeritage'),
  CASE WHEN src.v_meta ? 'location' AND COALESCE(src.v_meta->>'location', '') <> ''
       THEN ARRAY[src.v_meta->>'location']
       ELSE ARRAY[]::text[] END,
  NULLIF(src.v_meta->>'lessonFormat', ''),
  public._phase4_jsonb_text_array(src.v_meta->'academicIntegration'),
  public._phase4_jsonb_text_array(src.v_meta->'socialEmotionalLearning'),
  public._phase4_jsonb_text_array(src.v_meta->'cookingMethods'),
  public._phase4_jsonb_text_array(src.v_meta->'mainIngredients'),
  public._phase4_jsonb_text_array(src.v_meta->'gardenSkills'),
  public._phase4_jsonb_text_array(src.v_meta->'cookingSkills'),
  public._phase4_jsonb_text_array(src.v_meta->'observancesHolidays'),
  public._phase4_jsonb_text_array(src.v_meta->'culturalResponsivenessFeatures'),
  src.v_legacy_meta,
  COALESCE(src.extracted_content, ''),
  src.content_hash,
  src.content_embedding,
  src.submission_id,
  COALESCE(src.v_meta->>'processingNotes', ''),
  now(),
  now()
FROM src
WHERE NOT EXISTS (
  SELECT 1 FROM lessons WHERE original_submission_id = 'dd2c3e79-6dbb-4863-b60b-6c37a1fcc2f7'::uuid
);

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- Each published lesson gets a fresh `lesson_<random>` id at INSERT time, so
-- the rollback selector is `original_submission_id IN (...the 5 source uuids)`.
-- These are all net-new lessons (no prior lesson_versions, no other tables
-- reference them yet at apply time), so DELETE is safe.
--
-- DELETE FROM lessons
-- WHERE original_submission_id IN (
--   '4e4f3ae3-4c51-4439-87ee-f20d2ec94921'::uuid,
--   '4c2bacdb-7018-4ff2-badb-3701c8c974c0'::uuid,
--   '0369743c-8b6c-4037-a90e-790c2cbcef52'::uuid,
--   'ae8f00b4-a4ea-4601-85f3-9b720d0ced89'::uuid,
--   'dd2c3e79-6dbb-4863-b60b-6c37a1fcc2f7'::uuid
-- );
