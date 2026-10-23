-- Publish approved submissions → lessons (title-first using submissions.extracted_title)
-- Drops and recreates to prioritize extracted_title, then metadata title, then content-derived title.

DROP FUNCTION IF EXISTS public.publish_approved_submissions(integer);

CREATE OR REPLACE FUNCTION public.publish_approved_submissions(p_limit integer DEFAULT NULL)
RETURNS TABLE(published_lesson_id text, published_submission_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT 
      a.id AS submission_id,
      a.google_doc_url,
      a.extracted_content,
      a.extracted_title,
      a.content_hash,
      a.content_embedding,
      (
        SELECT sr.tagged_metadata
        FROM submission_reviews sr
        WHERE sr.submission_id = a.id
        ORDER BY sr.created_at DESC
        LIMIT 1
      ) AS meta
    FROM lesson_submissions a
    LEFT JOIN lessons l ON l.original_submission_id = a.id
    WHERE a.status='approved' AND l.lesson_id IS NULL
    ORDER BY a.created_at DESC
    LIMIT COALESCE(p_limit, 1000000)
  ), title_fallback AS (
    SELECT 
      c.*,
      COALESCE(
        NULLIF(c.extracted_title, ''),
        NULLIF(c.meta->>'title',''),
        (
          SELECT ln
          FROM (
            SELECT btrim(x) AS ln
            FROM regexp_split_to_table(c.extracted_content, E'\r?\n') AS x
          ) t
          WHERE ln <> ''
            AND ln <> '---'
            AND ln !~ '^\[.*\]'
            AND ln !~* '^summary\s*:'
          LIMIT 1
        )
      ) AS derived_title,
      COALESCE(c.meta->>'summary','') AS derived_summary
    FROM candidates c
  ), ins AS (
    INSERT INTO lessons (
      lesson_id,
      title,
      summary,
      file_link,
      grade_levels,
      activity_type,
      thematic_categories,
      season_timing,
      core_competencies,
      cultural_heritage,
      location_requirements,
      lesson_format,
      academic_integration,
      social_emotional_learning,
      cooking_methods,
      main_ingredients,
      garden_skills,
      cooking_skills,
      observances_holidays,
      cultural_responsiveness_features,
      metadata,
      content_text,
      content_hash,
      original_submission_id,
      content_embedding,
      created_at,
      updated_at
    )
    SELECT 
      'lesson_' || replace(gen_random_uuid()::text, '-', ''),
      COALESCE(tf.derived_title, 'Untitled Lesson'),
      tf.derived_summary,
      tf.google_doc_url,
      CASE 
        WHEN tf.meta ? 'gradeLevels' AND jsonb_typeof(tf.meta->'gradeLevels') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'gradeLevels'))
        WHEN tf.meta ? 'gradeLevels' THEN ARRAY[tf.meta->>'gradeLevels']
        ELSE ARRAY[]::text[]
      END,
      CASE WHEN tf.meta ? 'activityType' THEN ARRAY[tf.meta->>'activityType'] ELSE ARRAY[]::text[] END,
      CASE 
        WHEN tf.meta ? 'themes' AND jsonb_typeof(tf.meta->'themes') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'themes'))
        WHEN tf.meta ? 'themes' THEN ARRAY[tf.meta->>'themes']
        ELSE ARRAY[]::text[]
      END,
      CASE
        WHEN tf.meta ? 'season' AND jsonb_typeof(tf.meta->'season') = 'array' THEN
          CASE
            WHEN EXISTS (
              SELECT 1 FROM jsonb_array_elements_text(tf.meta->'season') el
              WHERE lower(trim(el)) IN ('year-round','all year','all-year')
            ) THEN ARRAY['Fall','Winter','Spring','Summer']::text[]
            ELSE ARRAY(
              SELECT DISTINCT
                CASE lower(trim(el2))
                  WHEN 'autumn' THEN 'Fall'
                  WHEN 'fall' THEN 'Fall'
                  WHEN 'winter' THEN 'Winter'
                  WHEN 'spring' THEN 'Spring'
                  WHEN 'summer' THEN 'Summer'
                END
              FROM jsonb_array_elements_text(tf.meta->'season') el2
              WHERE lower(trim(el2)) IN ('autumn','fall','winter','spring','summer')
            )
          END
        WHEN tf.meta ? 'season' THEN
          CASE lower(trim(tf.meta->>'season'))
            WHEN 'year-round' THEN ARRAY['Fall','Winter','Spring','Summer']::text[]
            WHEN 'all year'  THEN ARRAY['Fall','Winter','Spring','Summer']::text[]
            WHEN 'all-year'  THEN ARRAY['Fall','Winter','Spring','Summer']::text[]
            WHEN 'autumn'    THEN ARRAY['Fall']::text[]
            WHEN 'fall'      THEN ARRAY['Fall']::text[]
            WHEN 'winter'    THEN ARRAY['Winter']::text[]
            WHEN 'spring'    THEN ARRAY['Spring']::text[]
            WHEN 'summer'    THEN ARRAY['Summer']::text[]
            ELSE ARRAY[]::text[]
          END
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'coreCompetencies' AND jsonb_typeof(tf.meta->'coreCompetencies') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'coreCompetencies'))
        WHEN tf.meta ? 'coreCompetencies' THEN ARRAY[tf.meta->>'coreCompetencies']
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'culturalHeritage' AND jsonb_typeof(tf.meta->'culturalHeritage') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'culturalHeritage'))
        WHEN tf.meta ? 'culturalHeritage' THEN ARRAY[tf.meta->>'culturalHeritage']
        ELSE ARRAY[]::text[]
      END,
      CASE WHEN tf.meta ? 'location' THEN ARRAY[tf.meta->>'location'] ELSE ARRAY[]::text[] END,
      NULLIF(tf.meta->>'lessonFormat',''),
      CASE 
        WHEN tf.meta ? 'academicIntegration' AND jsonb_typeof(tf.meta->'academicIntegration') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'academicIntegration'))
        WHEN tf.meta ? 'academicIntegration' THEN ARRAY[tf.meta->>'academicIntegration']
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'socialEmotionalLearning' AND jsonb_typeof(tf.meta->'socialEmotionalLearning') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'socialEmotionalLearning'))
        WHEN tf.meta ? 'socialEmotionalLearning' THEN ARRAY[tf.meta->>'socialEmotionalLearning']
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'cookingMethods' AND jsonb_typeof(tf.meta->'cookingMethods') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'cookingMethods'))
        WHEN tf.meta ? 'cookingMethods' THEN ARRAY[tf.meta->>'cookingMethods']
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'mainIngredients' AND jsonb_typeof(tf.meta->'mainIngredients') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'mainIngredients'))
        WHEN tf.meta ? 'mainIngredients' THEN ARRAY[tf.meta->>'mainIngredients']
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'gardenSkills' AND jsonb_typeof(tf.meta->'gardenSkills') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'gardenSkills'))
        WHEN tf.meta ? 'gardenSkills' THEN ARRAY[tf.meta->>'gardenSkills']
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'cookingSkills' AND jsonb_typeof(tf.meta->'cookingSkills') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'cookingSkills'))
        WHEN tf.meta ? 'cookingSkills' THEN ARRAY[tf.meta->>'cookingSkills']
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'observancesHolidays' AND jsonb_typeof(tf.meta->'observancesHolidays') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'observancesHolidays'))
        WHEN tf.meta ? 'observancesHolidays' THEN ARRAY[tf.meta->>'observancesHolidays']
        ELSE ARRAY[]::text[]
      END,
      CASE 
        WHEN tf.meta ? 'culturalResponsivenessFeatures' AND jsonb_typeof(tf.meta->'culturalResponsivenessFeatures') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(tf.meta->'culturalResponsivenessFeatures'))
        WHEN tf.meta ? 'culturalResponsivenessFeatures' THEN ARRAY[tf.meta->>'culturalResponsivenessFeatures']
        ELSE ARRAY[]::text[]
      END,
      COALESCE(tf.meta, '{}'::jsonb),
      COALESCE(tf.extracted_content, ''),
      tf.content_hash,
      tf.submission_id,
      tf.content_embedding,
      NOW(),
      NOW()
    FROM title_fallback tf
    RETURNING lesson_id, original_submission_id
  )
  SELECT ins.lesson_id AS published_lesson_id, ins.original_submission_id::uuid AS published_submission_id
  FROM ins;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_approved_submissions(integer) TO anon, authenticated;

