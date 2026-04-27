-- =====================================================
-- Migration: 20260502000000_phase_6_2_held_out_orphan_recovery.sql
-- =====================================================
-- Description: Phase 6.2 of the lesson-submission Tier-1 orphan recovery.
-- Resolves the 4 remaining held-out approved-but-unpublished submissions that
-- prior phases (Phase 2 doc-id auto-batch, Phase 5 B-new, Phase 6 B-update)
-- could not auto-resolve. Each held-out required Google Docs eyeball before
-- the right action could be picked. The 4 cases are deliberately bundled
-- here because together they take the PROD orphan count from 4 → 0 and
-- close out the orphan-recovery sub-initiative.
--
-- Decisions verified against the live Google Docs read 2026-04-27 via
-- mcp__google-workspace__get_doc_as_markdown by df@esynyc.org.
--
-- Operations (5 sections, all in one transaction):
--
--   1. Lunar New Year noodles → B-NEW (1 statement: INSERT)
--      Orphan dd355cf1 teaches hand-pulled noodles for Lunar New Year.
--      Audit had assumed it was a B-update of the existing
--      "Lunar New Year and Dumplings" lesson based on title trigram alone.
--      Doc eyeball confirms: orphan = noodles + Chinese Zodiac handout +
--      grade variations K-7th. Library has TWO dumpling-based Lunar New
--      Year lessons (1LIpgLeP… and 1uORjUwt…) and one fortune-cookie
--      lesson (1bSRT8MG…), but no hand-pulled-noodles lesson. The
--      cultural angle is also distinct: noodles signify length of life,
--      vs. dumplings as Lunar New Year tradition. Publish as a new
--      lesson (mirror Phase 5 INSERT pattern).
--
--   2. African American Food Traditions 25-26 → B-UPDATE (2 statements: archive + UPDATE)
--      Orphan 5c602604 = the 25-26 refresh of the existing 45-min
--      museum-tour-only lesson at lesson_id 1uwZRLYoxThlJxDq…
--      Doc eyeball: opening ritual is word-for-word identical to the
--      canonical row's content ("Show students the map of the world.
--      Explain that here in the United States…"), same museum-tour
--      worksheet activity, same closing ritual; only material diff is
--      "Share a tasting" vs canonical's "Optional tasting".
--      The taller "African American Food Traditions" library lesson
--      (1xwTiqaz… 9960 chars Double period with Hoppin' John burgers)
--      is a DIFFERENT lesson — the 90-min cooking + museum combo —
--      explicitly held out from Phase 6 because updating it with the
--      orphan would delete the cooking content. Phase 6 anchor row 2
--      already named 1uwZRLYo… as the likely correct target;
--      Phase 6.2 confirms and acts.
--      Title preservation: keep canonical
--      "African American Food Traditions – Museum (45 min)" — orphan's
--      "African American Food Traditions 25-26" suffix would degrade
--      discoverability (same Phase 6 convention).
--
--   3. Green "Acai" Bowls → B-UPDATE with title + summary overwrite (2 statements: archive + UPDATE)
--      Orphan 16603243 = the smoothie-bowl-without-acai mobile-education
--      lesson. Library row at 11oY-EaKF7FT… has the SAME google_doc_id
--      as the orphan but is BROKEN: title='Unknown',
--      summary='Error processing lesson', content_text describes
--      "Rainbow Smoothies" instead of acai-style green smoothie bowls.
--      Pre-existing extraction failure on the library row, separate
--      from this orphan recovery and noted in earlier sessions.
--      The orphan submission has the CORRECT doc content (read against
--      live Google Doc 2026-04-27, matches). B-UPDATE replaces the
--      broken row's title + summary + content + metadata in place. The
--      lesson_versions archive preserves the broken state for audit.
--      This is the ONLY section that overwrites title + summary —
--      justified because the canonical values are broken-state
--      sentinels, not real content. WHERE clause guards that overwrite
--      to a one-time event by requiring the broken-state values.
--      Reviewer-tagged metadata has questionable quality (gradeLevels=
--      all 11 grades for a stovetop smoothie lesson; lessonFormat=
--      "mobile-education" which is non-standard for the corpus). Per
--      Phase 6 convention, install reviewer's tagging as-is; reviewers
--      / admins can edit post-publish via the standard UI. Tracked as
--      a future-cleanup observation, not a Phase 6.2 blocker.
--
--   4. Applesauce → B-UPDATE + duplicate cleanup (4 statements: archive, UPDATE, repoint, DELETE)
--      Orphan ea271d13 google_doc_id is 1hwLrvv9… AND there is a
--      library row with that exact lesson_id (the canonical row,
--      content_hash 07c415ad… 2556 chars). The library ALSO has a
--      synthetic-IDed duplicate row (lesson_79f89def… 6796 chars
--      content_hash ce5c371320…) whose file_link points at the SAME
--      google_doc_id 1hwLrvv9…. The synth row was created by an older
--      import path that didn't reuse the doc-id-as-lesson-id
--      convention; it has near-identical content to the orphan
--      submission (cosine 0.9999 per submission_similarities row from
--      the original 2025-09-09 detect-duplicates run).
--      Operations:
--        4A. Archive canonical row (1hwLrvv9… OLD short content) into
--            lesson_versions for audit/rollback.
--        4B. UPDATE canonical row in-place with orphan's content +
--            metadata (mirror Phase 6 B-UPDATE pattern).
--        4C. Repoint the surviving submission_similarities row from
--            the about-to-be-deleted synthetic ID to the canonical ID.
--            Preserves the historical detect-duplicates audit trail
--            ("dedup correctly flagged this submission as a near-dupe
--            at submission time"). The row has no FK to lessons, so
--            we do this manually.
--        4D. DELETE the synthetic duplicate row (lesson_79f89def…).
--            Verified 0 hard-FK references and 0 array-soft references
--            on PROD before drafting this migration: bookmarks=0,
--            canonical_lessons.{canonical_id,duplicate_id}=0,
--            duplicate_resolutions.canonical_lesson_id=0,
--            lesson_archive.canonical_id=0,
--            lesson_submissions.original_lesson_id=0,
--            lesson_versions=0,
--            duplicate_group_dismissals.lesson_ids array=0,
--            lesson_collections.lesson_ids array=0,
--            submission_reviews{,_archive}.canonical_lesson_id=0.
--            Only soft reference was the one submission_similarities
--            row, which 4C repoints first.
--            DELETE is guarded by EXISTS check that the canonical row
--            has already received the orphan's content (i.e., 4B has
--            run successfully) so an aborted partial run can't leave
--            the synth row deleted while the canonical row still has
--            the OLD content.
--
--   5. Phase 5 lessonFormat shape backfill (1 statement: UPDATE).
--      The 5 Phase 5 B-new lessons (Bees, Food Justice Advocates,
--      Lanternflies, NEW Place Based, Puppet Pollinators) were
--      published with metadata.lessonFormat in ARRAY shape — same
--      facetCounts.ts:55 frontend bug Phase 6.1 fixed for the 4
--      Phase 6 targets. 3 of 5 (Food Justice Advocates, NEW Place
--      Based, Puppet Pollinators) currently drop out of the
--      lessonFormat filter; the other 2 have empty arrays so the
--      filter shows them as no-value (cosmetically wrong shape but
--      no user-visible miss). Section 5 normalizes all 5 to canonical
--      string-shape (or removes the key entirely when the column is
--      NULL — verified canonical pattern via PROD sample of
--      lesson_format-NULL rows: 8 of 8 sampled have the key absent
--      rather than null/empty-array).
--      Address by original_submission_id (deterministic across PROD
--      and TEST), NOT lesson_id — Phase 5's
--      'lesson_' || gen_random_uuid() pattern produces different
--      lesson_ids per environment when CI applies on TEST vs the
--      manual apply on PROD. Verified: TEST and PROD have different
--      lesson_ids for the same 5 original_submission_ids, but
--      original_submission_id is the same (it's the orphan UUID).
--      Bundling here (vs. separate migration) because: same exact
--      regression class as Phase 6.1, same fix pattern (jsonb_set/-
--      key remove), tiny scope (5 specific rows by deterministic
--      key), idempotent re-runs.
--      Out of scope (separate hygiene items, not in Phase 6.2):
--        - complete_review_atomic still emits ARRAY shape for
--          lessonFormat. Future submissions through the standard
--          review flow inherit the bug. CREATE OR REPLACE FUNCTION
--          fix belongs in its own migration / PR.
--        - facetCounts.ts:55 hardening to defensively handle
--          array-shape input belongs in a frontend PR.
--        - The other ~83 corpus rows with non-string lessonFormat
--          shape (predating the submission system) are a separate
--          data-quality cleanup and not addressed here.
--
-- Per-row idempotency: each statement is guarded so re-application is
-- a 0-row no-op. The Phase 6 pattern ("EXISTS lesson_versions row" as
-- the UPDATE guard, content_hash IS DISTINCT FROM as the change
-- detector) is reused for sections 2/3/4. Section 1 uses Phase 5's
-- "NOT EXISTS lessons row with original_submission_id" guard.
--
-- Why this is NOT routed through complete_review_atomic (same rationale
-- as Phase 5 + Phase 6):
--   - The Phase 4 status guard (...000008) refuses to run when status is
--     already 'approved' (ERRCODE 55000); these 4 submissions all are.
--   - Routing would UPSERT a second submission_reviews row, overwriting
--     the historical reviewer's review_completed_at timestamp.
--   - Phase 7c email triggers fire on the RPC path; we do not want to
--     send 2026-dated approval emails to teachers for lessons they
--     submitted in 2025.
--
-- Provenance model (B-UPDATE sections 2/3/4):
--   - lessons.original_submission_id is preserved unchanged (NULL on
--     these legacy targets). The new linkage is
--     lesson_versions.archived_from_submission_id = orphan.id with
--     archive_reason = 'historical_b_update_recovery_2026_04' (same
--     reason string as Phase 6, since this is the same recovery
--     wave just resolving the held-outs).
--
-- Section ordering: B-NEW first (smallest blast radius — pure INSERT,
-- no existing rows touched), then standard B-UPDATE (AAFT), then
-- B-UPDATE with title+summary overwrite (Acai), then B-UPDATE +
-- duplicate cleanup (Applesauce, most complex). All 4 sections execute
-- in one implicit transaction; if any single statement fails, Postgres
-- aborts the whole migration so we land at "0 of 4 applied" rather
-- than partial.
--
-- Metadata projection (React-state shape → legacy lessons.metadata
-- shape) mirrors complete_review_atomic's approve_new branch
-- line-for-line, same as Phase 5 / Phase 6. See
-- 20260428000007_phase_4_fix_metadata_shape.sql for the canonical
-- definition. Helper _phase4_jsonb_text_array(jsonb) is reused; it
-- was created by 20260428000001_*. Migrations run as the postgres
-- role, which has implicit EXECUTE on locked-down helpers it owns.

-- =====================================================
-- CHANGES
-- =====================================================

-- ===== Section 1 of 4: B-NEW — Lunar New Year (orphan dd355cf1) =====
-- Pattern: Phase 5 single-row INSERT.
-- New lesson_id is generated; idempotent on re-run via NOT EXISTS on
-- lessons.original_submission_id.

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
           -- lessonFormat: STRING shape (matches canonical 88% corpus shape).
           -- Diverges intentionally from Phase 5/6/complete_review_atomic
           -- (which emit ARRAY shape and trip the facetCounts.ts:55 filter
           -- bug). Phase 6.1 (20260501000000_*) corrected the 4 Phase 6
           -- targets array → string; Phase 6.2 writes correct shape from
           -- the start. Open follow-ups still on the table: backfill the
           -- 5 Phase 5 lessons + fix complete_review_atomic + harden
           -- facetCounts.ts:55 (tracked in MEMORY.md).
           'lessonFormat',
             CASE WHEN sr.tagged_metadata ? 'lessonFormat'
                       AND COALESCE(sr.tagged_metadata->>'lessonFormat', '') <> ''
                  THEN to_jsonb(sr.tagged_metadata->>'lessonFormat')
                  ELSE 'null'::jsonb END,
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
  WHERE s.id = 'dd355cf1-d60a-4ac1-8dd6-a2e274912dc1'::uuid
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
  -- tagged_metadata.summary is NULL on this orphan; use a hand-written summary
  -- derived from the live doc (read 2026-04-27) so the lesson is discoverable
  -- and presentable from day one. Reviewers can edit post-publish via UI.
  COALESCE(
    NULLIF(src.v_meta->>'summary', ''),
    'Students will learn how to make hand pulled noodles that signify the length of your life depending on how long the noodles are. Students will learn about the Lunar New Year and how it follows the Lunar calendar.'
  ),
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
  SELECT 1 FROM lessons WHERE original_submission_id = 'dd355cf1-d60a-4ac1-8dd6-a2e274912dc1'::uuid
);

-- ===== Section 2 of 4: B-UPDATE — African American Food Traditions =====
-- Orphan 5c602604 → target 1uwZRLYoxThlJxDq-vV3cePHmEMGMCpj5Opk0nHVvqqI.
-- Title preservation (canonical "African American Food Traditions –
-- Museum (45 min)" stays); summary may stay if orphan tagged_metadata
-- doesn't carry one.

-- 2A. Archive prior state into lesson_versions BEFORE the UPDATE.
INSERT INTO lesson_versions (
  lesson_id, title, summary, file_link, grade_levels, metadata, content_text,
  version_number, archived_from_submission_id, archive_reason
)
SELECT
  l.lesson_id, l.title, l.summary, l.file_link, l.grade_levels, l.metadata, l.content_text,
  COALESCE(l.version_number, 1),
  '5c602604-69f0-45b2-9745-6b8de097d45c'::uuid,
  'historical_b_update_recovery_2026_04'
FROM lessons l
WHERE l.lesson_id = '1uwZRLYoxThlJxDq-vV3cePHmEMGMCpj5Opk0nHVvqqI'
  AND NOT EXISTS (
    SELECT 1 FROM lesson_versions
    WHERE archived_from_submission_id = '5c602604-69f0-45b2-9745-6b8de097d45c'::uuid
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
           -- lessonFormat: STRING shape (see Section 1 for rationale).
           'lessonFormat',
             CASE WHEN sr.tagged_metadata ? 'lessonFormat'
                       AND COALESCE(sr.tagged_metadata->>'lessonFormat', '') <> ''
                  THEN to_jsonb(sr.tagged_metadata->>'lessonFormat')
                  ELSE 'null'::jsonb END,
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
  WHERE s.id = '5c602604-69f0-45b2-9745-6b8de097d45c'::uuid
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
WHERE l.lesson_id = '1uwZRLYoxThlJxDq-vV3cePHmEMGMCpj5Opk0nHVvqqI'
  AND l.content_hash IS DISTINCT FROM src.content_hash
  AND EXISTS (
    SELECT 1 FROM lesson_versions
    WHERE archived_from_submission_id = '5c602604-69f0-45b2-9745-6b8de097d45c'::uuid
      AND archive_reason = 'historical_b_update_recovery_2026_04'
  );

-- ===== Section 3 of 4: B-UPDATE with title+summary overwrite — Green "Acai" Bowls =====
-- Orphan 16603243 → broken target 11oY-EaKF7FTeNxSE_xbsCmSytnBmjc9WPlyBF11Chz0.
-- Unique to this section: title and summary ARE updated, because the
-- canonical values are the broken extraction sentinels
-- (title='Unknown', summary='Error processing lesson') rather than
-- real content. WHERE clause guards on those broken-state values to
-- make the title/summary overwrite a one-time event — once corrected,
-- a re-run will not match.

-- 3A. Archive prior (broken) state into lesson_versions BEFORE the UPDATE.
INSERT INTO lesson_versions (
  lesson_id, title, summary, file_link, grade_levels, metadata, content_text,
  version_number, archived_from_submission_id, archive_reason
)
SELECT
  l.lesson_id, l.title, l.summary, l.file_link, l.grade_levels, l.metadata, l.content_text,
  COALESCE(l.version_number, 1),
  '16603243-0eed-4cc8-886f-f9c37d25276f'::uuid,
  'historical_b_update_recovery_2026_04'
FROM lessons l
WHERE l.lesson_id = '11oY-EaKF7FTeNxSE_xbsCmSytnBmjc9WPlyBF11Chz0'
  AND NOT EXISTS (
    SELECT 1 FROM lesson_versions
    WHERE archived_from_submission_id = '16603243-0eed-4cc8-886f-f9c37d25276f'::uuid
      AND archive_reason = 'historical_b_update_recovery_2026_04'
  );

-- 3B. Apply orphan content + metadata + new title + new summary to the broken row.
WITH src AS (
  SELECT s.id                AS submission_id,
         s.created_at        AS submission_created_at,
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
           -- lessonFormat: STRING shape (see Section 1 for rationale).
           'lessonFormat',
             CASE WHEN sr.tagged_metadata ? 'lessonFormat'
                       AND COALESCE(sr.tagged_metadata->>'lessonFormat', '') <> ''
                  THEN to_jsonb(sr.tagged_metadata->>'lessonFormat')
                  ELSE 'null'::jsonb END,
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
  WHERE s.id = '16603243-0eed-4cc8-886f-f9c37d25276f'::uuid
    AND s.status = 'approved'
    AND sr.decision = 'approve_new'
    AND s.content_embedding IS NOT NULL
)
UPDATE lessons l
SET
  -- Overwrite broken title/summary sentinels. tagged_metadata.summary is NULL
  -- on this orphan, so use a hand-written summary derived from the live doc
  -- (read 2026-04-27) — same approach as Section 1's Lunar New Year.
  title            = COALESCE(NULLIF(src.extracted_title, ''), l.title),
  summary          = COALESCE(
                       NULLIF(src.v_meta->>'summary', ''),
                       'Students will learn how to make a healthy breakfast, snack, or dessert — a smoothie bowl in the style of an acai bowl, using blueberries instead of acai. They will learn about the Brazilian origins of acai.'
                     ),
  file_link        = src.google_doc_url,
  content_text     = src.extracted_content,
  content_hash     = src.content_hash,
  content_embedding= src.content_embedding,
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
WHERE l.lesson_id = '11oY-EaKF7FTeNxSE_xbsCmSytnBmjc9WPlyBF11Chz0'
  -- Broken-state guard: this overwrite is a one-time event keyed on the
  -- specific extraction-failure sentinel values. After the UPDATE, the
  -- title/summary are the orphan's real values, so re-run won't match.
  AND l.title = 'Unknown'
  AND l.summary = 'Error processing lesson'
  AND l.content_hash IS DISTINCT FROM src.content_hash
  AND EXISTS (
    SELECT 1 FROM lesson_versions
    WHERE archived_from_submission_id = '16603243-0eed-4cc8-886f-f9c37d25276f'::uuid
      AND archive_reason = 'historical_b_update_recovery_2026_04'
  );

-- ===== Section 4 of 4: B-UPDATE + duplicate cleanup — Applesauce =====
-- Orphan ea271d13 → canonical target 1hwLrvv9CUTx2rw2UMTDhqmLXQTd0hEsxan3HvNpPwa8
-- (lesson_id == google_doc_id, the established library convention).
-- Synthetic duplicate row lesson_79f89defede54a1e87632373e74486a5
-- (file_link points at the same google_doc_id) is removed — pre-existing
-- data quality issue this migration cleans up as a same-PR companion.

-- 4A. Archive canonical row's prior (OLD short) content into lesson_versions.
INSERT INTO lesson_versions (
  lesson_id, title, summary, file_link, grade_levels, metadata, content_text,
  version_number, archived_from_submission_id, archive_reason
)
SELECT
  l.lesson_id, l.title, l.summary, l.file_link, l.grade_levels, l.metadata, l.content_text,
  COALESCE(l.version_number, 1),
  'ea271d13-78db-437c-aa9f-594ce567f90c'::uuid,
  'historical_b_update_recovery_2026_04'
FROM lessons l
WHERE l.lesson_id = '1hwLrvv9CUTx2rw2UMTDhqmLXQTd0hEsxan3HvNpPwa8'
  AND NOT EXISTS (
    SELECT 1 FROM lesson_versions
    WHERE archived_from_submission_id = 'ea271d13-78db-437c-aa9f-594ce567f90c'::uuid
      AND archive_reason = 'historical_b_update_recovery_2026_04'
  );

-- 4B. Apply orphan content + metadata to the canonical Applesauce row.
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
           -- lessonFormat: STRING shape (see Section 1 for rationale).
           'lessonFormat',
             CASE WHEN sr.tagged_metadata ? 'lessonFormat'
                       AND COALESCE(sr.tagged_metadata->>'lessonFormat', '') <> ''
                  THEN to_jsonb(sr.tagged_metadata->>'lessonFormat')
                  ELSE 'null'::jsonb END,
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
  WHERE s.id = 'ea271d13-78db-437c-aa9f-594ce567f90c'::uuid
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
WHERE l.lesson_id = '1hwLrvv9CUTx2rw2UMTDhqmLXQTd0hEsxan3HvNpPwa8'
  AND l.content_hash IS DISTINCT FROM src.content_hash
  AND EXISTS (
    SELECT 1 FROM lesson_versions
    WHERE archived_from_submission_id = 'ea271d13-78db-437c-aa9f-594ce567f90c'::uuid
      AND archive_reason = 'historical_b_update_recovery_2026_04'
  );

-- 4C. Repoint the historical detect-duplicates audit row from the
-- about-to-be-deleted synthetic ID to the canonical ID. Idempotent:
-- after the first run, lesson_id no longer matches the OLD value, so
-- re-run is 0 rows. submission_similarities has no FK to lessons, so
-- this manual repoint is needed before the synthetic-row DELETE in 4D.
UPDATE submission_similarities
SET lesson_id = '1hwLrvv9CUTx2rw2UMTDhqmLXQTd0hEsxan3HvNpPwa8'
WHERE submission_id = 'ea271d13-78db-437c-aa9f-594ce567f90c'::uuid
  AND lesson_id = 'lesson_79f89defede54a1e87632373e74486a5';

-- 4D. Remove the synthetic duplicate row. Guard ensures we only delete
-- after 4B has installed the orphan's content on the canonical row, so
-- a partial-failure mid-migration cannot leave the synthetic row gone
-- while the canonical row still has the OLD content.
DELETE FROM lessons l_synth
WHERE l_synth.lesson_id = 'lesson_79f89defede54a1e87632373e74486a5'
  AND EXISTS (
    SELECT 1
    FROM lessons l_canon
    JOIN lesson_submissions s ON s.id = 'ea271d13-78db-437c-aa9f-594ce567f90c'::uuid
    WHERE l_canon.lesson_id = '1hwLrvv9CUTx2rw2UMTDhqmLXQTd0hEsxan3HvNpPwa8'
      -- Explicit non-null invariant: makes the "canonical received the
      -- orphan's content" check self-documenting. Without this, NULL =
      -- NULL would silently become false and leave the synthetic row
      -- in place. Source orphan was pre-verified to have non-null
      -- content_hash; this just locks the invariant into the SQL.
      AND s.content_hash IS NOT NULL
      AND l_canon.content_hash = s.content_hash
  );

-- ===== Section 5 of 5: Phase 5 lessonFormat shape backfill =====
-- Normalizes metadata.lessonFormat from ARRAY shape to canonical
-- corpus shape on the 5 Phase 5 B-new lessons:
--   - Empty array `[]` (Bees, Lanternflies) → key removed entirely
--     (matches canonical sample of lesson_format-NULL rows where the
--     key is absent rather than present-with-null/empty-array).
--   - Singleton array `["standalone"]` (Food Justice Advocates,
--     NEW Place Based, Puppet Pollinators) → key replaced with the
--     string `"standalone"` matching the lesson_format column.
-- Address by original_submission_id because Phase 5's random
-- 'lesson_' || gen_random_uuid() lesson_ids differ per environment.
-- WHERE jsonb_typeof = 'array' makes re-runs 0-row no-ops.
-- updated_at NOT bumped — matches Phase 6.1's metadata-only-fix
-- precedent (purely structural shape correction, no semantic content
-- change).
UPDATE lessons l
SET metadata = CASE
  WHEN COALESCE(jsonb_array_length(l.metadata->'lessonFormat'), 0) = 0
    THEN l.metadata - 'lessonFormat'
  ELSE jsonb_set(
    l.metadata,
    '{lessonFormat}',
    to_jsonb(l.metadata->'lessonFormat'->>0),
    true
  )
END
WHERE l.original_submission_id IN (
  '4e4f3ae3-4c51-4439-87ee-f20d2ec94921'::uuid,  -- Bees (empty array → remove key)
  '4c2bacdb-7018-4ff2-badb-3701c8c974c0'::uuid,  -- Food Justice Advocates: Food Scarcity ([standalone] → "standalone")
  '0369743c-8b6c-4037-a90e-790c2cbcef52'::uuid,  -- All About Lanternflies (empty array → remove key)
  'ae8f00b4-a4ea-4601-85f3-9b720d0ced89'::uuid,  -- NEW Place Based: Native Plants ([standalone] → "standalone")
  'dd2c3e79-6dbb-4863-b60b-6c37a1fcc2f7'::uuid   -- Puppet Pollinators ([standalone] → "standalone")
)
AND jsonb_typeof(l.metadata->'lessonFormat') = 'array';

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- Rollback strategy is per-section. The whole-migration rollback is
-- "run all four sections' rollbacks in reverse order", but each section
-- is independently rollback-able.
--
-- Section 1 (Lunar New Year B-NEW) — same shape as Phase 5 rollback:
--
--   DELETE FROM lessons
--   WHERE original_submission_id = 'dd355cf1-d60a-4ac1-8dd6-a2e274912dc1'::uuid;
--
-- Section 2 (AAFT B-UPDATE) — same shape as Phase 6 rollback:
--
--   BEGIN;
--     UPDATE lessons l SET
--       file_link    = lv.file_link,
--       summary      = lv.summary,
--       grade_levels = lv.grade_levels,
--       metadata     = lv.metadata,
--       content_text = lv.content_text,
--       version_number = lv.version_number,
--       has_versions = false,
--       updated_at   = now()
--     FROM lesson_versions lv
--     WHERE l.lesson_id = '1uwZRLYoxThlJxDq-vV3cePHmEMGMCpj5Opk0nHVvqqI'
--       AND lv.archived_from_submission_id = '5c602604-69f0-45b2-9745-6b8de097d45c'::uuid
--       AND lv.archive_reason = 'historical_b_update_recovery_2026_04';
--     -- Restore typed array fields + content_hash + content_embedding from
--     -- pre-migration snapshot (capture via mcp__supabase-remote__execute_sql
--     -- BEFORE running this migration; lesson_versions does not store these).
--     -- Then:
--     DELETE FROM lesson_versions
--     WHERE lesson_id = '1uwZRLYoxThlJxDq-vV3cePHmEMGMCpj5Opk0nHVvqqI'
--       AND archived_from_submission_id = '5c602604-69f0-45b2-9745-6b8de097d45c'::uuid
--       AND archive_reason = 'historical_b_update_recovery_2026_04';
--   COMMIT;
--
-- Section 3 (Acai B-UPDATE with title+summary overwrite) — same shape as
-- Section 2 rollback. The lesson_versions row preserves the broken-state
-- title='Unknown' and summary='Error processing lesson' so restoring
-- them resurrects the broken extraction sentinel. That's intentional —
-- rollback should restore the exact pre-migration row so a re-apply
-- still works.
--
-- Section 4 (Applesauce B-UPDATE + dup cleanup) — most complex rollback,
-- recreates the synthetic duplicate row. Requires a snapshot of the
-- synthetic row's full state captured BEFORE this migration runs:
--
--   BEGIN;
--     -- 1. Restore canonical row from lesson_versions (same shape as Sec 2)
--     UPDATE lessons l SET ... FROM lesson_versions lv WHERE
--       l.lesson_id = '1hwLrvv9CUTx2rw2UMTDhqmLXQTd0hEsxan3HvNpPwa8'
--       AND lv.archived_from_submission_id = 'ea271d13-78db-437c-aa9f-594ce567f90c'::uuid;
--
--     -- 2. Re-INSERT the synthetic duplicate row from snapshot. Hand-rebuild
--     --    every column from the pre-migration snapshot. content_embedding
--     --    must be re-generated via OpenAI text-embedding-3-small unless
--     --    the snapshot captured the vector.
--
--     -- 3. Repoint the submission_similarities row back to the synthetic ID:
--     UPDATE submission_similarities
--     SET lesson_id = 'lesson_79f89defede54a1e87632373e74486a5'
--     WHERE submission_id = 'ea271d13-78db-437c-aa9f-594ce567f90c'::uuid
--       AND lesson_id = '1hwLrvv9CUTx2rw2UMTDhqmLXQTd0hEsxan3HvNpPwa8';
--
--     -- 4. Delete the lesson_versions audit row:
--     DELETE FROM lesson_versions
--     WHERE lesson_id = '1hwLrvv9CUTx2rw2UMTDhqmLXQTd0hEsxan3HvNpPwa8'
--       AND archived_from_submission_id = 'ea271d13-78db-437c-aa9f-594ce567f90c'::uuid
--       AND archive_reason = 'historical_b_update_recovery_2026_04';
--   COMMIT;
--
-- Section 5 (Phase 5 lessonFormat backfill) — restore array shape:
--
--   BEGIN;
--     -- Bees + Lanternflies: re-add empty array (key was removed)
--     UPDATE lessons SET metadata = jsonb_set(metadata, '{lessonFormat}', '[]'::jsonb, true)
--     WHERE original_submission_id IN (
--       '4e4f3ae3-4c51-4439-87ee-f20d2ec94921'::uuid,
--       '0369743c-8b6c-4037-a90e-790c2cbcef52'::uuid
--     );
--
--     -- Food Justice Advocates + NEW Place Based + Puppet Pollinators:
--     -- restore singleton array (string was replaced)
--     UPDATE lessons SET metadata = jsonb_set(metadata, '{lessonFormat}',
--       jsonb_build_array(metadata->>'lessonFormat'), true)
--     WHERE original_submission_id IN (
--       '4c2bacdb-7018-4ff2-badb-3701c8c974c0'::uuid,
--       'ae8f00b4-a4ea-4601-85f3-9b720d0ced89'::uuid,
--       'dd2c3e79-6dbb-4863-b60b-6c37a1fcc2f7'::uuid
--     )
--     AND jsonb_typeof(metadata->'lessonFormat') = 'string';
--   COMMIT;
--
-- For ANY rollback path, the Phase 5/6 calibration takeaway holds: the
-- lesson_versions row preserves title/summary/file_link/grade_levels/
-- metadata/content_text but NOT typed array fields (thematic_categories,
-- season_timing, etc.) or system fields (content_hash, content_embedding,
-- version_number, has_versions, last_modified, updated_at). For full
-- rollback fidelity, capture a PROD snapshot via
-- mcp__supabase-remote__execute_sql BEFORE applying this migration.
