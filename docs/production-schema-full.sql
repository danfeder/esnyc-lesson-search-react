

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."check_security_definer_views"() RETURNS TABLE("view_name" "text", "view_owner" "text", "has_security_definer" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT 
    schemaname || '.' || viewname as view_name,
    viewowner as view_owner,
    false as has_security_definer -- PostgreSQL doesn't easily expose this, would need pg_get_viewdef parsing
  FROM pg_views
  WHERE schemaname = 'public';
$$;


ALTER FUNCTION "public"."check_security_definer_views"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_user_email"("user_id" "uuid") RETURNS TABLE("source" "text", "id" "uuid", "email" "text", "details" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check auth.users
  RETURN QUERY
  SELECT 
    'auth.users'::text as source,
    u.id,
    u.email::text,
    jsonb_build_object(
      'created_at', u.created_at,
      'email_confirmed_at', u.email_confirmed_at,
      'raw_user_meta_data', u.raw_user_meta_data
    ) as details
  FROM auth.users u
  WHERE u.id = user_id;

  -- Check user_profiles
  RETURN QUERY
  SELECT 
    'user_profiles'::text as source,
    p.id,
    p.email::text,
    jsonb_build_object(
      'full_name', p.full_name,
      'role', p.role,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    ) as details
  FROM user_profiles p
  WHERE p.id = user_id;
END;
$$;


ALTER FUNCTION "public"."debug_user_email"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."debug_user_email"("user_id" "uuid") IS 'Debug function to check user email presence in both tables';



CREATE OR REPLACE FUNCTION "public"."expand_cultural_heritage"("cultures" "text"[]) RETURNS "text"[]
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    expanded TEXT[] := cultures;
    hierarchy_record RECORD;
BEGIN
    -- Add child cultures for any parent cultures selected
    FOR hierarchy_record IN 
        SELECT * FROM cultural_heritage_hierarchy 
        WHERE parent = ANY(cultures)
    LOOP
        expanded := expanded || hierarchy_record.children;
    END LOOP;
    
    -- Remove duplicates
    RETURN ARRAY(SELECT DISTINCT unnest(expanded));
END;
$$;


ALTER FUNCTION "public"."expand_cultural_heritage"("cultures" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expand_search_with_synonyms"("query_text" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    words TEXT[];
    expanded_words TEXT[] := '{}';
    word TEXT;
    synonym_record RECORD;
    final_query TEXT;
BEGIN
    -- Handle empty query
    IF query_text IS NULL OR query_text = '' THEN
        RETURN NULL;
    END IF;
    
    -- Split query into words
    words := string_to_array(lower(trim(query_text)), ' ');
    
    FOREACH word IN ARRAY words LOOP
        -- Skip empty words
        CONTINUE WHEN word = '';
        
        -- Add original word
        expanded_words := array_append(expanded_words, word);
        
        -- Find synonyms
        FOR synonym_record IN 
            SELECT * FROM search_synonyms 
            WHERE (lower(term) = word AND synonym_type IN ('bidirectional', 'oneway', 'typo_correction'))
               OR (word = ANY(array(SELECT lower(unnest(synonyms)))) AND synonym_type = 'bidirectional')
        LOOP
            IF synonym_record.synonym_type = 'bidirectional' THEN
                -- Add all synonyms and the term
                expanded_words := expanded_words || array(SELECT lower(unnest(synonym_record.synonyms)));
                IF lower(synonym_record.term) != word THEN
                    expanded_words := array_append(expanded_words, lower(synonym_record.term));
                END IF;
            ELSIF synonym_record.synonym_type IN ('oneway', 'typo_correction') THEN
                -- Only add synonyms if term matches
                IF lower(synonym_record.term) = word THEN
                    expanded_words := expanded_words || array(SELECT lower(unnest(synonym_record.synonyms)));
                END IF;
            END IF;
        END LOOP;
    END LOOP;
    
    -- Remove duplicates and create OR query
    SELECT string_agg(DISTINCT unnest, ' | ') INTO final_query FROM unnest(expanded_words);
    
    RETURN final_query;
END;
$$;


ALTER FUNCTION "public"."expand_search_with_synonyms"("query_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_lessons_by_hash"("hash_value" character varying) RETURNS TABLE("lesson_id" "text", "title" "text", "match_type" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.lesson_id,
    l.title,
    'exact'::TEXT as match_type
  FROM lessons l
  WHERE l.content_hash = hash_value;
END;
$$;


ALTER FUNCTION "public"."find_lessons_by_hash"("hash_value" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_similar_lessons_by_embedding"("query_embedding" "public"."vector", "similarity_threshold" double precision DEFAULT 0.5, "max_results" integer DEFAULT 10) RETURNS TABLE("lesson_id" "text", "title" "text", "similarity_score" double precision, "match_type" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.lesson_id,
    l.title,
    1 - (l.content_embedding <=> query_embedding) as similarity_score,
    CASE 
      WHEN 1 - (l.content_embedding <=> query_embedding) >= 0.95 THEN 'exact'
      WHEN 1 - (l.content_embedding <=> query_embedding) >= 0.85 THEN 'high'
      WHEN 1 - (l.content_embedding <=> query_embedding) >= 0.70 THEN 'medium'
      ELSE 'low'
    END as match_type
  FROM lessons l
  WHERE l.content_embedding IS NOT NULL
    AND 1 - (l.content_embedding <=> query_embedding) >= similarity_threshold
  ORDER BY l.content_embedding <=> query_embedding
  LIMIT max_results;
END;
$$;


ALTER FUNCTION "public"."find_similar_lessons_by_embedding"("query_embedding" "public"."vector", "similarity_threshold" double precision, "max_results" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_lesson_search_vector"("p_title" "text", "p_summary" "text", "p_main_ingredients" "text"[], "p_garden_skills" "text"[], "p_cooking_skills" "text"[], "p_thematic_categories" "text"[], "p_cultural_heritage" "text"[], "p_observances_holidays" "text"[], "p_tags" "text"[], "p_content_text" "text") RETURNS "tsvector"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  RETURN 
    setweight(to_tsvector('english', COALESCE(p_title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(p_summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(p_main_ingredients, ' '), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(p_observances_holidays, ' '), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(p_tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', 
      COALESCE(array_to_string(p_garden_skills, ' '), '') || ' ' ||
      COALESCE(array_to_string(p_cooking_skills, ' '), '') || ' ' ||
      COALESCE(array_to_string(p_thematic_categories, ' '), '') || ' ' ||
      COALESCE(array_to_string(p_cultural_heritage, ' '), '')
    ), 'C') ||
    setweight(to_tsvector('english', COALESCE(p_content_text, '')), 'D');
END;
$$;


ALTER FUNCTION "public"."generate_lesson_search_vector"("p_title" "text", "p_summary" "text", "p_main_ingredients" "text"[], "p_garden_skills" "text"[], "p_cooking_skills" "text"[], "p_thematic_categories" "text"[], "p_cultural_heritage" "text"[], "p_observances_holidays" "text"[], "p_tags" "text"[], "p_content_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_canonical_lesson_id"("p_lesson_id" "text") RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_canonical_id TEXT;
BEGIN
  -- Check if this lesson is marked as a duplicate
  SELECT canonical_id INTO v_canonical_id
  FROM canonical_lessons
  WHERE duplicate_id = p_lesson_id;
  
  -- If found, return the canonical ID
  IF v_canonical_id IS NOT NULL THEN
    RETURN v_canonical_id;
  END IF;
  
  -- Otherwise, the lesson itself is canonical
  RETURN p_lesson_id;
END;
$$;


ALTER FUNCTION "public"."get_canonical_lesson_id"("p_lesson_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_embedding_as_text"("lesson_id_param" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT content_embedding::text INTO result
  FROM lessons
  WHERE lesson_id = lesson_id_param;
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_embedding_as_text"("lesson_id_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_activity_metrics"("p_user_id" "uuid", "p_days" integer DEFAULT 30) RETURNS TABLE("login_count" integer, "last_login" timestamp with time zone, "submission_count" integer, "review_count" integer, "last_activity" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Login count in the period
    (SELECT COUNT(*)::INTEGER 
     FROM user_management_audit 
     WHERE actor_id = p_user_id 
     AND action = 'login' 
     AND created_at >= NOW() - INTERVAL '1 day' * p_days) AS login_count,
    
    -- Last login time
    (SELECT MAX(created_at) 
     FROM user_management_audit 
     WHERE actor_id = p_user_id 
     AND action = 'login') AS last_login,
    
    -- Submission count
    (SELECT COUNT(*)::INTEGER 
     FROM lesson_submissions 
     WHERE teacher_id = p_user_id 
     AND created_at >= NOW() - INTERVAL '1 day' * p_days) AS submission_count,
    
    -- Review count
    (SELECT COUNT(*)::INTEGER 
     FROM lesson_reviews 
     WHERE reviewer_id = p_user_id 
     AND created_at >= NOW() - INTERVAL '1 day' * p_days) AS review_count,
    
    -- Last activity (most recent of any action)
    GREATEST(
      (SELECT MAX(created_at) FROM user_management_audit WHERE actor_id = p_user_id),
      (SELECT MAX(created_at) FROM lesson_submissions WHERE teacher_id = p_user_id),
      (SELECT MAX(created_at) FROM lesson_reviews WHERE reviewer_id = p_user_id)
    ) AS last_activity;
END;
$$;


ALTER FUNCTION "public"."get_user_activity_metrics"("p_user_id" "uuid", "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_emails"("user_ids" "uuid"[]) RETURNS TABLE("id" "uuid", "email" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only admins can access this function
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Return emails from auth.users first, then fallback to user_profiles
  RETURN QUERY
  SELECT DISTINCT ON (combined.id)
    combined.id,
    combined.email::varchar(255)
  FROM (
    -- Get emails from auth.users
    SELECT 
      u.id,
      u.email
    FROM auth.users u
    WHERE u.id = ANY(user_ids)
    
    UNION ALL
    
    -- Get emails from user_profiles as fallback
    SELECT 
      p.id,
      p.email
    FROM user_profiles p
    WHERE p.id = ANY(user_ids) AND p.email IS NOT NULL
  ) AS combined
  ORDER BY combined.id, 
    CASE 
      WHEN combined.email IS NOT NULL THEN 0 
      ELSE 1 
    END;
END;
$$;


ALTER FUNCTION "public"."get_user_emails"("user_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_emails"("user_ids" "uuid"[]) IS 'Returns emails for given user IDs - admin only';



CREATE OR REPLACE FUNCTION "public"."get_user_profiles_with_email"() RETURNS TABLE("id" "uuid", "user_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "email" "text", "full_name" "text", "role" "text", "school_id" "uuid", "school_name" "text", "grades_taught" "text"[], "subjects" "text"[], "is_active" boolean, "invited_by" "uuid", "invitation_accepted_at" timestamp with time zone, "last_login_at" timestamp with time zone, "login_count" integer, "auth_email" "text", "auth_created_at" timestamp with time zone, "last_sign_in_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only admins can access this function
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    up.created_at,
    up.updated_at,
    up.email,
    up.full_name,
    up.role,
    up.school_id,
    up.school_name,
    up.grades_taught,
    up.subjects,
    up.is_active,
    up.invited_by,
    up.invitation_accepted_at,
    up.last_login_at,
    up.login_count,
    au.email as auth_email,
    au.created_at as auth_created_at,
    au.last_sign_in_at
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.id = au.id;
END;
$$;


ALTER FUNCTION "public"."get_user_profiles_with_email"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_profiles_with_email"() IS 'Admin-only function to get user profiles with auth email information.';



CREATE OR REPLACE FUNCTION "public"."handle_lessons_metadata_write"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO lessons (
      lesson_id, title, summary, file_link, grade_levels,
      metadata, confidence, 
      thematic_categories, season_timing, core_competencies,
      cultural_heritage, location_requirements, lesson_format,
      main_ingredients, garden_skills, cooking_skills,
      cooking_methods, observances_holidays, academic_integration,
      social_emotional_learning, cultural_responsiveness_features,
      processing_notes, review_notes, flagged_for_review, tags
    ) VALUES (
      NEW.lesson_id, NEW.title, NEW.summary, NEW.file_link, NEW.grade_levels,
      NEW.metadata, NEW.confidence,
      -- Extract from metadata if provided
      COALESCE((NEW.metadata->>'thematicCategories')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'seasonTiming')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'coreCompetencies')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'culturalHeritage')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'locationRequirements')::text[], ARRAY[]::text[]),
      NEW.metadata->>'lessonFormat',
      COALESCE((NEW.metadata->>'mainIngredients')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'gardenSkills')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'cookingSkills')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'cookingMethods')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'observancesHolidays')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'academicIntegration')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'socialEmotionalLearning')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'culturalResponsivenessFeatures')::text[], ARRAY[]::text[]),
      NEW.processing_notes, NEW.review_notes, NEW.flagged_for_review, NEW.tags
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE lessons SET
      title = NEW.title,
      summary = NEW.summary,
      file_link = NEW.file_link,
      grade_levels = NEW.grade_levels,
      metadata = NEW.metadata,
      confidence = NEW.confidence,
      -- Update granular columns from metadata
      thematic_categories = COALESCE((NEW.metadata->>'thematicCategories')::text[], thematic_categories),
      season_timing = COALESCE((NEW.metadata->>'seasonTiming')::text[], season_timing),
      core_competencies = COALESCE((NEW.metadata->>'coreCompetencies')::text[], core_competencies),
      cultural_heritage = COALESCE((NEW.metadata->>'culturalHeritage')::text[], cultural_heritage),
      location_requirements = COALESCE((NEW.metadata->>'locationRequirements')::text[], location_requirements),
      lesson_format = COALESCE(NEW.metadata->>'lessonFormat', lesson_format),
      main_ingredients = COALESCE((NEW.metadata->>'mainIngredients')::text[], main_ingredients),
      garden_skills = COALESCE((NEW.metadata->>'gardenSkills')::text[], garden_skills),
      cooking_skills = COALESCE((NEW.metadata->>'cookingSkills')::text[], cooking_skills),
      cooking_methods = COALESCE((NEW.metadata->>'cookingMethods')::text[], cooking_methods),
      observances_holidays = COALESCE((NEW.metadata->>'observancesHolidays')::text[], observances_holidays),
      academic_integration = COALESCE((NEW.metadata->>'academicIntegration')::text[], academic_integration),
      social_emotional_learning = COALESCE((NEW.metadata->>'socialEmotionalLearning')::text[], social_emotional_learning),
      cultural_responsiveness_features = COALESCE((NEW.metadata->>'culturalResponsivenessFeatures')::text[], cultural_responsiveness_features),
      processing_notes = NEW.processing_notes,
      review_notes = NEW.review_notes,
      flagged_for_review = NEW.flagged_for_review,
      tags = NEW.tags,
      updated_at = NOW()
    WHERE lesson_id = NEW.lesson_id;
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION "public"."handle_lessons_metadata_write"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("p_user_id" "uuid", "required_role" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = p_user_id AND is_active = true;  -- Now using p_user_id to avoid ambiguity
  
  -- Role hierarchy: super_admin > admin > reviewer > teacher
  RETURN CASE
    WHEN required_role = 'teacher' THEN user_role IS NOT NULL
    WHEN required_role = 'reviewer' THEN user_role IN ('reviewer', 'admin', 'super_admin')
    WHEN required_role = 'admin' THEN user_role IN ('admin', 'super_admin')
    WHEN required_role = 'super_admin' THEN user_role = 'super_admin'
    ELSE false
  END;
END;
$$;


ALTER FUNCTION "public"."has_role"("p_user_id" "uuid", "required_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role TEXT;
  user_active BOOLEAN;
BEGIN
  -- Get role directly without triggering RLS
  SELECT role, is_active INTO user_role, user_active
  FROM user_profiles
  WHERE id = auth.uid();
  
  RETURN user_role IN ('admin', 'super_admin') AND COALESCE(user_active, true);
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id
    AND role IN ('admin', 'super_admin')
    AND is_active = true
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_duplicate_lesson"("p_lesson_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM canonical_lessons 
    WHERE duplicate_id = p_lesson_id
  );
END;
$$;


ALTER FUNCTION "public"."is_duplicate_lesson"("p_lesson_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_lesson_archived"("p_lesson_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM lesson_archive 
    WHERE lesson_id = p_lesson_id
  );
END;
$$;


ALTER FUNCTION "public"."is_lesson_archived"("p_lesson_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_reviewer_or_above"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role TEXT;
  user_active BOOLEAN;
BEGIN
  SELECT role, is_active INTO user_role, user_active
  FROM user_profiles
  WHERE id = auth.uid();
  
  RETURN user_role IN ('reviewer', 'admin', 'super_admin') AND COALESCE(user_active, true);
END;
$$;


ALTER FUNCTION "public"."is_reviewer_or_above"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_user_profile_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Only log if there are actual changes
  IF OLD IS DISTINCT FROM NEW THEN
    INSERT INTO user_management_audit (
      actor_id,
      action,
      target_user_id,
      old_values,
      new_values,
      created_at
    ) VALUES (
      COALESCE(auth.uid(), NEW.id), -- Use the authenticated user or the user being created
      'user_profile_updated',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_user_profile_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."publish_approved_submissions"("p_limit" integer DEFAULT NULL::integer) RETURNS TABLE("published_lesson_id" "text", "published_submission_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."publish_approved_submissions"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_duplicate_group"("p_group_id" "text", "p_canonical_id" "text", "p_duplicate_ids" "text"[], "p_duplicate_type" "text" DEFAULT 'near'::"text", "p_similarity_score" numeric DEFAULT 0.85, "p_merge_metadata" boolean DEFAULT false, "p_resolution_notes" "text" DEFAULT NULL::"text", "p_resolution_mode" "text" DEFAULT 'single'::"text", "p_sub_group_name" "text" DEFAULT NULL::"text", "p_parent_group_id" "text" DEFAULT NULL::"text", "p_title_updates" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id uuid;
  v_resolution_id uuid;
  v_archived_count integer := 0;
  v_lesson_count integer;
  v_action_taken text;
  v_lesson_record record;
  v_archive_id uuid;
  v_title_update_key text;
  v_new_title text;
  v_old_title text;
  v_updated_titles jsonb := '[]'::jsonb;
  v_title_update_record jsonb;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  -- Verify user has permission
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = v_user_id 
    AND role IN ('admin', 'reviewer', 'super_admin')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions'
    );
  END IF;

  -- Validate canonical lesson exists
  IF NOT EXISTS (SELECT 1 FROM lessons WHERE lesson_id = p_canonical_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Canonical lesson not found: ' || p_canonical_id
    );
  END IF;

  -- Validate all duplicate lessons exist
  IF p_duplicate_ids IS NOT NULL THEN
    FOR i IN 1..array_length(p_duplicate_ids, 1) LOOP
      IF NOT EXISTS (SELECT 1 FROM lessons WHERE lesson_id = p_duplicate_ids[i]) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Duplicate lesson not found: ' || p_duplicate_ids[i]
        );
      END IF;
    END LOOP;
  END IF;
  
  -- Apply title updates if provided
  IF p_title_updates IS NOT NULL THEN
    FOR v_title_update_key IN SELECT jsonb_object_keys(p_title_updates)
    LOOP
      v_new_title := p_title_updates ->> v_title_update_key;
      
      -- Validate title is not empty and within reasonable length
      IF v_new_title IS NULL OR length(trim(v_new_title)) = 0 THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Invalid title for lesson ' || v_title_update_key || ': Title cannot be empty'
        );
      END IF;
      
      IF length(v_new_title) > 500 THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Invalid title for lesson ' || v_title_update_key || ': Title exceeds 500 characters'
        );
      END IF;
      
      -- Get the old title first
      SELECT title INTO v_old_title 
      FROM lessons 
      WHERE lesson_id = v_title_update_key;
      
      -- Update the title in the lessons table
      UPDATE lessons 
      SET 
        title = v_new_title,
        updated_at = now(),
        processing_notes = COALESCE(processing_notes, '') || 
          E'\n[' || now()::text || '] Title updated during duplicate resolution by user ' || v_user_id::text ||
          '. Original title: "' || COALESCE(v_old_title, 'unknown') || '"'
      WHERE lesson_id = v_title_update_key;
      
      -- Track the title update
      v_title_update_record := jsonb_build_object(
        'lesson_id', v_title_update_key,
        'old_title', v_old_title,
        'new_title', v_new_title
      );
      v_updated_titles := v_updated_titles || v_title_update_record;
    END LOOP;
  END IF;
  
  -- Calculate lessons in group
  v_lesson_count := 1;
  IF p_duplicate_ids IS NOT NULL THEN
    v_lesson_count := v_lesson_count + array_length(p_duplicate_ids, 1);
  END IF;

  -- Determine action taken
  v_action_taken := CASE
    WHEN p_resolution_mode = 'keep_all' THEN 'keep_all'
    WHEN p_resolution_mode = 'split' THEN 'split_group'
    WHEN p_merge_metadata THEN 'merge_and_archive'
    ELSE 'archive_only'
  END;
  
  -- Create resolution record with title updates tracked
  INSERT INTO duplicate_resolutions (
    group_id,
    canonical_lesson_id,
    duplicate_type,
    similarity_score,
    lessons_in_group,
    action_taken,
    notes,
    resolved_by,
    resolution_mode,
    sub_group_name,
    parent_group_id,
    metadata_merged
  ) VALUES (
    p_group_id,
    p_canonical_id,
    p_duplicate_type,
    p_similarity_score::double precision,
    v_lesson_count,
    v_action_taken,
    COALESCE(p_resolution_notes, '') || 
      CASE 
        WHEN jsonb_array_length(v_updated_titles) > 0 
        THEN E'\nTitle updates: ' || v_updated_titles::text
        ELSE ''
      END,
    v_user_id,
    COALESCE(p_resolution_mode, 'single'),
    p_sub_group_name,
    p_parent_group_id,
    NULL
  )
  RETURNING id INTO v_resolution_id;
  
  -- Process duplicates if not keeping all
  IF p_resolution_mode != 'keep_all' AND p_duplicate_ids IS NOT NULL AND array_length(p_duplicate_ids, 1) > 0 THEN
    
    -- Handle metadata merging
    IF p_merge_metadata THEN
      -- Merge array fields from all duplicates into canonical
      WITH merged_arrays AS (
        SELECT 
          array_agg(DISTINCT elem) FILTER (WHERE elem IS NOT NULL) as merged
        FROM (
          SELECT unnest(grade_levels) as elem FROM lessons WHERE lesson_id = p_canonical_id
          UNION
          SELECT unnest(grade_levels) FROM lessons WHERE lesson_id = ANY(p_duplicate_ids)
        ) t
      )
      UPDATE lessons 
      SET grade_levels = COALESCE((SELECT merged FROM merged_arrays), ARRAY[]::text[])
      WHERE lesson_id = p_canonical_id;

      -- Repeat for other array fields
      WITH merged_arrays AS (
        SELECT 
          array_agg(DISTINCT elem) FILTER (WHERE elem IS NOT NULL) as merged
        FROM (
          SELECT unnest(thematic_categories) as elem FROM lessons WHERE lesson_id = p_canonical_id
          UNION
          SELECT unnest(thematic_categories) FROM lessons WHERE lesson_id = ANY(p_duplicate_ids)
        ) t
      )
      UPDATE lessons 
      SET thematic_categories = COALESCE((SELECT merged FROM merged_arrays), ARRAY[]::text[])
      WHERE lesson_id = p_canonical_id;

      -- Continue for other arrays as needed...
    END IF;

    -- Archive each duplicate lesson
    FOR v_lesson_record IN 
      SELECT * FROM lessons WHERE lesson_id = ANY(p_duplicate_ids)
    LOOP
      -- Generate a new UUID for the archive record
      v_archive_id := gen_random_uuid();
      
      -- Insert into lesson_archive with ALL required fields
      INSERT INTO lesson_archive (
        id,
        lesson_id,
        title,
        summary,
        file_link,
        grade_levels,
        metadata,
        confidence,
        search_vector,
        content_text,
        content_embedding,
        content_hash,
        last_modified,
        created_at,
        updated_at,
        thematic_categories,
        cultural_heritage,
        observances_holidays,
        location_requirements,
        season_timing,
        academic_integration,
        social_emotional_learning,
        cooking_methods,
        main_ingredients,
        cultural_responsiveness_features,
        garden_skills,
        cooking_skills,
        core_competencies,
        lesson_format,
        processing_notes,
        review_notes,
        flagged_for_review,
        tags,
        archived_at,
        archived_by,
        archive_reason,
        canonical_id,
        activity_type
      ) VALUES (
        v_archive_id,
        v_lesson_record.lesson_id,
        v_lesson_record.title,  -- Original title preserved in archive
        COALESCE(v_lesson_record.summary, ''),
        COALESCE(v_lesson_record.file_link, ''),
        COALESCE(v_lesson_record.grade_levels, ARRAY[]::text[]),
        COALESCE(v_lesson_record.metadata, '{}'::jsonb),
        COALESCE(v_lesson_record.confidence, '{}'::jsonb),
        v_lesson_record.search_vector,
        v_lesson_record.content_text,
        v_lesson_record.content_embedding,
        v_lesson_record.content_hash,
        v_lesson_record.last_modified,
        COALESCE(v_lesson_record.created_at, now()),
        v_lesson_record.updated_at,
        v_lesson_record.thematic_categories,
        v_lesson_record.cultural_heritage,
        v_lesson_record.observances_holidays,
        v_lesson_record.location_requirements,
        v_lesson_record.season_timing,
        v_lesson_record.academic_integration,
        v_lesson_record.social_emotional_learning,
        v_lesson_record.cooking_methods,
        v_lesson_record.main_ingredients,
        v_lesson_record.cultural_responsiveness_features,
        v_lesson_record.garden_skills,
        v_lesson_record.cooking_skills,
        v_lesson_record.core_competencies,
        v_lesson_record.lesson_format,
        v_lesson_record.processing_notes,
        v_lesson_record.review_notes,
        v_lesson_record.flagged_for_review,
        v_lesson_record.tags,
        now(),
        v_user_id,
        'Duplicate resolution: ' || p_duplicate_type || ' duplicate of ' || p_canonical_id || 
          ' (group: ' || p_group_id || ')',
        p_canonical_id,
        v_lesson_record.activity_type
      );
      
      v_archived_count := v_archived_count + 1;
    END LOOP;
    
    -- Delete the duplicate lessons from main table
    -- Note: We don't insert into canonical_lessons because the foreign key constraint
    -- would prevent inserting references to lessons we're about to delete.
    -- The canonical_lessons table is meant for tracking already-deleted duplicates.
    DELETE FROM lessons WHERE lesson_id = ANY(p_duplicate_ids);
  END IF;
  
  -- Return success with details
  RETURN jsonb_build_object(
    'success', true,
    'resolution_id', v_resolution_id,
    'archived_count', v_archived_count,
    'canonical_id', p_canonical_id,
    'action_taken', v_action_taken,
    'title_updates', v_updated_titles
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;


ALTER FUNCTION "public"."resolve_duplicate_group"("p_group_id" "text", "p_canonical_id" "text", "p_duplicate_ids" "text"[], "p_duplicate_type" "text", "p_similarity_score" numeric, "p_merge_metadata" boolean, "p_resolution_notes" "text", "p_resolution_mode" "text", "p_sub_group_name" "text", "p_parent_group_id" "text", "p_title_updates" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resolve_duplicate_group"("p_group_id" "text", "p_canonical_id" "text", "p_duplicate_ids" "text"[], "p_duplicate_type" "text", "p_similarity_score" numeric, "p_merge_metadata" boolean, "p_resolution_notes" "text", "p_resolution_mode" "text", "p_sub_group_name" "text", "p_parent_group_id" "text", "p_title_updates" "jsonb") IS 'Resolves a group of duplicate lessons by selecting a canonical version, optionally editing titles, and archiving duplicates. Supports multiple resolution modes including single canonical, split groups, and keep all. Added support for title editing during resolution.';



CREATE OR REPLACE FUNCTION "public"."search_lessons"("search_query" "text" DEFAULT NULL::"text", "filter_grade_levels" "text"[] DEFAULT NULL::"text"[], "filter_themes" "text"[] DEFAULT NULL::"text"[], "filter_seasons" "text"[] DEFAULT NULL::"text"[], "filter_competencies" "text"[] DEFAULT NULL::"text"[], "filter_cultures" "text"[] DEFAULT NULL::"text"[], "filter_location" "text"[] DEFAULT NULL::"text"[], "filter_activity_type" "text"[] DEFAULT NULL::"text"[], "filter_lesson_format" "text" DEFAULT NULL::"text", "filter_academic" "text"[] DEFAULT NULL::"text"[], "filter_sel" "text"[] DEFAULT NULL::"text"[], "filter_cooking_method" "text" DEFAULT NULL::"text", "page_size" integer DEFAULT 20, "page_offset" integer DEFAULT 0) RETURNS TABLE("lesson_id" "text", "title" "text", "summary" "text", "file_link" "text", "grade_levels" "text"[], "metadata" "jsonb", "confidence" "jsonb", "rank" double precision, "total_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    expanded_query TEXT;
    expanded_cultures TEXT[];
    total_results BIGINT;
BEGIN
    -- Expand query with synonyms
    IF search_query IS NOT NULL AND search_query != '' THEN
        expanded_query := expand_search_with_synonyms(search_query);
    ELSE
        expanded_query := NULL;
    END IF;
    
    -- Expand cultural heritage if needed
    IF filter_cultures IS NOT NULL AND array_length(filter_cultures, 1) > 0 THEN
        expanded_cultures := expand_cultural_heritage(filter_cultures);
    ELSE
        expanded_cultures := NULL;
    END IF;
    
    -- Count total results first
    SELECT COUNT(*) INTO total_results
    FROM lessons l
    WHERE 
        -- Text search: only apply if search_query is provided
        (search_query IS NULL OR search_query = '' OR (
            l.search_vector @@ to_tsquery('english', expanded_query) OR
            l.title % search_query OR 
            l.summary % search_query
        ))
        -- Grade levels filter: only apply if filter is provided
        AND (filter_grade_levels IS NULL OR array_length(filter_grade_levels, 1) IS NULL OR 
             l.grade_levels && filter_grade_levels)
        -- Thematic categories filter
        AND (filter_themes IS NULL OR array_length(filter_themes, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'thematicCategories') t 
                     WHERE t = ANY(filter_themes)))
        -- Season filter
        AND (filter_seasons IS NULL OR array_length(filter_seasons, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'seasonTiming') s 
                     WHERE s = ANY(filter_seasons)))
        -- Core competencies filter
        AND (filter_competencies IS NULL OR array_length(filter_competencies, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'coreCompetencies') c 
                     WHERE c = ANY(filter_competencies)))
        -- Cultural heritage filter (with hierarchy expansion)
        AND (expanded_cultures IS NULL OR array_length(expanded_cultures, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'culturalHeritage') c 
                     WHERE c = ANY(expanded_cultures)))
        -- Location filter - FIX: Handle location stored as JSON array string
        AND (filter_location IS NULL OR array_length(filter_location, 1) IS NULL OR
             EXISTS (
                 SELECT 1 
                 FROM jsonb_array_elements_text(
                     CASE 
                         WHEN jsonb_typeof(l.metadata->'locationRequirements') = 'string' 
                         THEN (l.metadata->>'locationRequirements')::jsonb
                         ELSE l.metadata->'locationRequirements'
                     END
                 ) loc 
                 WHERE loc = ANY(filter_location)
             ))
        -- Activity type filter
        AND (filter_activity_type IS NULL OR array_length(filter_activity_type, 1) IS NULL OR
             l.metadata->>'activityType' = ANY(filter_activity_type))
        -- Lesson format filter
        AND (filter_lesson_format IS NULL OR filter_lesson_format = '' OR
             l.metadata->>'lessonFormat' = filter_lesson_format)
        -- Academic integration filter
        AND (filter_academic IS NULL OR array_length(filter_academic, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'academicIntegration'->'selected') a 
                     WHERE a = ANY(filter_academic)))
        -- SEL filter
        AND (filter_sel IS NULL OR array_length(filter_sel, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'socialEmotionalLearning') s 
                     WHERE s = ANY(filter_sel)))
        -- Cooking method filter
        AND (filter_cooking_method IS NULL OR filter_cooking_method = '' OR
             l.metadata->>'cookingMethods' = filter_cooking_method);
    
    -- Return results with pagination
    RETURN QUERY
    SELECT 
        l.lesson_id,
        l.title,
        l.summary,
        l.file_link,
        l.grade_levels,
        l.metadata,
        l.confidence,
        CASE 
            WHEN search_query IS NOT NULL AND search_query != '' THEN
                GREATEST(
                    COALESCE(ts_rank(l.search_vector, to_tsquery('english', expanded_query)), 0),
                    COALESCE(similarity(l.title, search_query), 0),
                    COALESCE(similarity(l.summary, search_query), 0) * 0.8
                )::double precision
            ELSE 0::double precision
        END as rank,
        total_results
    FROM lessons l
    WHERE 
        -- Same WHERE conditions as count query
        (search_query IS NULL OR search_query = '' OR (
            l.search_vector @@ to_tsquery('english', expanded_query) OR
            l.title % search_query OR 
            l.summary % search_query
        ))
        AND (filter_grade_levels IS NULL OR array_length(filter_grade_levels, 1) IS NULL OR 
             l.grade_levels && filter_grade_levels)
        AND (filter_themes IS NULL OR array_length(filter_themes, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'thematicCategories') t 
                     WHERE t = ANY(filter_themes)))
        AND (filter_seasons IS NULL OR array_length(filter_seasons, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'seasonTiming') s 
                     WHERE s = ANY(filter_seasons)))
        AND (filter_competencies IS NULL OR array_length(filter_competencies, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'coreCompetencies') c 
                     WHERE c = ANY(filter_competencies)))
        AND (expanded_cultures IS NULL OR array_length(expanded_cultures, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'culturalHeritage') c 
                     WHERE c = ANY(expanded_cultures)))
        -- Location filter - FIX: Handle location stored as JSON array string
        AND (filter_location IS NULL OR array_length(filter_location, 1) IS NULL OR
             EXISTS (
                 SELECT 1 
                 FROM jsonb_array_elements_text(
                     CASE 
                         WHEN jsonb_typeof(l.metadata->'locationRequirements') = 'string' 
                         THEN (l.metadata->>'locationRequirements')::jsonb
                         ELSE l.metadata->'locationRequirements'
                     END
                 ) loc 
                 WHERE loc = ANY(filter_location)
             ))
        AND (filter_activity_type IS NULL OR array_length(filter_activity_type, 1) IS NULL OR
             l.metadata->>'activityType' = ANY(filter_activity_type))
        AND (filter_lesson_format IS NULL OR filter_lesson_format = '' OR
             l.metadata->>'lessonFormat' = filter_lesson_format)
        AND (filter_academic IS NULL OR array_length(filter_academic, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'academicIntegration'->'selected') a 
                     WHERE a = ANY(filter_academic)))
        AND (filter_sel IS NULL OR array_length(filter_sel, 1) IS NULL OR
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'socialEmotionalLearning') s 
                     WHERE s = ANY(filter_sel)))
        AND (filter_cooking_method IS NULL OR filter_cooking_method = '' OR
             l.metadata->>'cookingMethods' = filter_cooking_method)
    ORDER BY 
        rank DESC,
        COALESCE((l.confidence->>'overall')::float, 0) DESC,
        l.title ASC
    LIMIT page_size
    OFFSET page_offset;
END;
$$;


ALTER FUNCTION "public"."search_lessons"("search_query" "text", "filter_grade_levels" "text"[], "filter_themes" "text"[], "filter_seasons" "text"[], "filter_competencies" "text"[], "filter_cultures" "text"[], "filter_location" "text"[], "filter_activity_type" "text"[], "filter_lesson_format" "text", "filter_academic" "text"[], "filter_sel" "text"[], "filter_cooking_method" "text", "page_size" integer, "page_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_user_login"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO user_management_audit (
    actor_id,
    action,
    target_user_id,
    metadata
  ) VALUES (
    p_user_id,
    'login',
    p_user_id,
    jsonb_build_object(
      'login_at', NOW(),
      'source', 'manual_tracking'
    )
  );
END;
$$;


ALTER FUNCTION "public"."track_user_login"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lesson_search_vector"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.search_vector := generate_lesson_search_vector(
    NEW.title,
    NEW.summary,
    NEW.main_ingredients,
    NEW.garden_skills,
    NEW.cooking_skills,
    NEW.thematic_categories,
    NEW.cultural_heritage,
    NEW.observances_holidays,
    NEW.tags,
    NEW.content_text
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lesson_search_vector"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lesson_submissions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lesson_submissions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_search_vector"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.summary, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.metadata->>'mainIngredients', '') || ' ' || 
                                         COALESCE(NEW.metadata->>'skills', '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.metadata->>'thematicCategories', '') || ' ' || 
                                         COALESCE(NEW.metadata->>'culturalHeritage', '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.content_text, '')), 'D');
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_search_vector"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_invitation_token"("invite_token" "text") RETURNS TABLE("id" "uuid", "email" "text", "role" "text", "school_name" "text", "school_borough" "text", "metadata" "jsonb", "is_valid" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.email,
    i.role,
    i.school_name,
    i.school_borough,
    i.metadata,
    (i.accepted_at IS NULL AND i.expires_at > NOW()) AS is_valid
  FROM user_invitations i
  WHERE i.token = invite_token;
END;
$$;


ALTER FUNCTION "public"."validate_invitation_token"("invite_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_rls_enabled"() RETURNS TABLE("table_name" "text", "rls_enabled" boolean, "policy_count" integer, "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH table_policies AS (
    SELECT 
      t.schemaname,
      t.tablename,
      t.rowsecurity,
      COUNT(pol.polname) as pol_count
    FROM pg_tables t
    LEFT JOIN pg_policies pol ON pol.schemaname = t.schemaname AND pol.tablename = t.tablename
    WHERE t.schemaname = 'public'
      AND t.tablename NOT IN ('schema_migrations', 'spatial_ref_sys')
    GROUP BY t.schemaname, t.tablename, t.rowsecurity
  )
  SELECT 
    schemaname || '.' || tablename,
    rowsecurity,
    pol_count::INTEGER,
    CASE 
      WHEN NOT rowsecurity THEN 'ERROR: RLS DISABLED'
      WHEN pol_count = 0 THEN 'WARNING: No policies'
      ELSE 'OK'
    END as status
  FROM table_policies
  ORDER BY 
    CASE 
      WHEN NOT rowsecurity THEN 1
      WHEN pol_count = 0 THEN 2
      ELSE 3
    END,
    tablename;
END;
$$;


ALTER FUNCTION "public"."verify_rls_enabled"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bookmarks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "lesson_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bookmarks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."canonical_lessons" (
    "duplicate_id" "text" NOT NULL,
    "canonical_id" "text" NOT NULL,
    "similarity_score" double precision NOT NULL,
    "resolution_type" "text" NOT NULL,
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone DEFAULT "now"(),
    "resolution_notes" "text",
    CONSTRAINT "canonical_lessons_resolution_type_check" CHECK (("resolution_type" = ANY (ARRAY['exact'::"text", 'near'::"text", 'version'::"text", 'title'::"text"]))),
    CONSTRAINT "canonical_lessons_similarity_score_check" CHECK ((("similarity_score" >= (0)::double precision) AND ("similarity_score" <= (1)::double precision))),
    CONSTRAINT "no_self_reference" CHECK (("duplicate_id" <> "canonical_id"))
);


ALTER TABLE "public"."canonical_lessons" OWNER TO "postgres";


COMMENT ON TABLE "public"."canonical_lessons" IS 'Canonical version of lessons after duplicate resolution';



CREATE TABLE IF NOT EXISTS "public"."cultural_heritage_hierarchy" (
    "id" integer NOT NULL,
    "parent" "text" NOT NULL,
    "children" "text"[] NOT NULL
);


ALTER TABLE "public"."cultural_heritage_hierarchy" OWNER TO "postgres";


COMMENT ON TABLE "public"."cultural_heritage_hierarchy" IS 'Hierarchical structure of cultural heritage categories';



CREATE SEQUENCE IF NOT EXISTS "public"."cultural_heritage_hierarchy_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."cultural_heritage_hierarchy_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."cultural_heritage_hierarchy_id_seq" OWNED BY "public"."cultural_heritage_hierarchy"."id";



CREATE TABLE IF NOT EXISTS "public"."duplicate_resolutions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "text" NOT NULL,
    "duplicate_type" "text" NOT NULL,
    "similarity_score" double precision NOT NULL,
    "lessons_in_group" integer NOT NULL,
    "canonical_lesson_id" "text" NOT NULL,
    "action_taken" "text" NOT NULL,
    "metadata_merged" "jsonb",
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "resolution_mode" "text" DEFAULT 'single'::"text",
    "sub_group_name" "text",
    "parent_group_id" "text",
    CONSTRAINT "duplicate_resolutions_action_taken_check" CHECK (("action_taken" = ANY (ARRAY['merge_metadata'::"text", 'archive_only'::"text", 'merge_and_archive'::"text"]))),
    CONSTRAINT "duplicate_resolutions_duplicate_type_check" CHECK (("duplicate_type" = ANY (ARRAY['exact'::"text", 'near'::"text", 'version'::"text", 'title'::"text", 'unknown'::"text"]))),
    CONSTRAINT "duplicate_resolutions_lessons_in_group_check" CHECK (("lessons_in_group" >= 2)),
    CONSTRAINT "duplicate_resolutions_resolution_mode_check" CHECK (("resolution_mode" = ANY (ARRAY['single'::"text", 'split'::"text", 'keep_all'::"text"])))
);


ALTER TABLE "public"."duplicate_resolutions" OWNER TO "postgres";


COMMENT ON TABLE "public"."duplicate_resolutions" IS 'Record of duplicate resolution decisions';



COMMENT ON COLUMN "public"."duplicate_resolutions"."resolution_mode" IS 'Resolution mode: single (one canonical), split (multiple canonicals), or keep_all (preserve all)';



COMMENT ON COLUMN "public"."duplicate_resolutions"."sub_group_name" IS 'Name of the sub-group when using split resolution mode';



COMMENT ON COLUMN "public"."duplicate_resolutions"."parent_group_id" IS 'Original group ID when this resolution is part of a split';



CREATE TABLE IF NOT EXISTS "public"."lesson_archive" (
    "id" "uuid" NOT NULL,
    "lesson_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "file_link" "text" NOT NULL,
    "grade_levels" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "confidence" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "search_vector" "tsvector",
    "content_text" "text",
    "content_embedding" "public"."vector"(1536),
    "content_hash" character varying(64),
    "last_modified" timestamp with time zone,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone,
    "thematic_categories" "text"[],
    "cultural_heritage" "text"[],
    "observances_holidays" "text"[],
    "location_requirements" "text"[],
    "season_timing" "text"[],
    "academic_integration" "text"[],
    "social_emotional_learning" "text"[],
    "cooking_methods" "text"[],
    "main_ingredients" "text"[],
    "cultural_responsiveness_features" "text"[],
    "garden_skills" "text"[],
    "cooking_skills" "text"[],
    "core_competencies" "text"[],
    "lesson_format" "text",
    "processing_notes" "text",
    "review_notes" "text",
    "flagged_for_review" boolean DEFAULT false,
    "tags" "text"[],
    "archived_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "archived_by" "uuid",
    "archive_reason" "text" NOT NULL,
    "canonical_id" "text",
    "version_number" integer DEFAULT 1,
    "has_versions" boolean DEFAULT false,
    "original_submission_id" "uuid",
    "activity_type" "text",
    "archived_by_system" "text"
);


ALTER TABLE "public"."lesson_archive" OWNER TO "postgres";


COMMENT ON TABLE "public"."lesson_archive" IS 'Archive of deleted or replaced lessons for audit trail';



COMMENT ON COLUMN "public"."lesson_archive"."version_number" IS 'Version number of the lesson if it has multiple versions';



COMMENT ON COLUMN "public"."lesson_archive"."has_versions" IS 'Whether this lesson has multiple versions';



COMMENT ON COLUMN "public"."lesson_archive"."original_submission_id" IS 'ID of the original submission this lesson came from';



COMMENT ON COLUMN "public"."lesson_archive"."activity_type" IS 'Type of activity (e.g., garden, cooking, classroom)';



COMMENT ON COLUMN "public"."lesson_archive"."archived_by_system" IS 'System or script that performed the archival (e.g., auto-resolution-script)';



CREATE TABLE IF NOT EXISTS "public"."lesson_collections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "lesson_ids" "text"[] DEFAULT '{}'::"text"[],
    "is_public" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lesson_collections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "google_doc_url" "text" NOT NULL,
    "google_doc_id" "text" NOT NULL,
    "extracted_content" "text",
    "content_hash" character varying(64),
    "content_embedding" "public"."vector"(1536),
    "submission_type" "text" DEFAULT 'new'::"text" NOT NULL,
    "original_lesson_id" "text",
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "reviewer_id" "uuid",
    "review_started_at" timestamp with time zone,
    "review_completed_at" timestamp with time zone,
    "reviewer_notes" "text",
    "revision_requested_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "extracted_title" "text",
    CONSTRAINT "lesson_submissions_status_check" CHECK (("status" = ANY (ARRAY['submitted'::"text", 'in_review'::"text", 'needs_revision'::"text", 'approved'::"text"]))),
    CONSTRAINT "lesson_submissions_submission_type_check" CHECK (("submission_type" = ANY (ARRAY['new'::"text", 'update'::"text"])))
);


ALTER TABLE "public"."lesson_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "text" NOT NULL,
    "version_number" integer NOT NULL,
    "title" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "file_link" "text" NOT NULL,
    "grade_levels" "text"[] NOT NULL,
    "metadata" "jsonb" NOT NULL,
    "content_text" "text",
    "archived_from_submission_id" "uuid",
    "archived_by" "uuid",
    "archived_at" timestamp with time zone DEFAULT "now"(),
    "archive_reason" "text"
);


ALTER TABLE "public"."lesson_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lesson_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "file_link" "text" NOT NULL,
    "grade_levels" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "confidence" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "search_vector" "tsvector",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "content_text" "text",
    "content_embedding" "public"."vector"(1536),
    "content_hash" character varying(64),
    "canonical_id" "text",
    "version_number" integer DEFAULT 1,
    "has_versions" boolean DEFAULT false,
    "original_submission_id" "uuid",
    "last_modified" timestamp with time zone,
    "thematic_categories" "text"[],
    "cultural_heritage" "text"[],
    "observances_holidays" "text"[],
    "location_requirements" "text"[],
    "season_timing" "text"[],
    "academic_integration" "text"[],
    "social_emotional_learning" "text"[],
    "cooking_methods" "text"[],
    "main_ingredients" "text"[],
    "cultural_responsiveness_features" "text"[],
    "garden_skills" "text"[],
    "cooking_skills" "text"[],
    "core_competencies" "text"[],
    "lesson_format" "text",
    "processing_notes" "text",
    "review_notes" "text",
    "flagged_for_review" boolean DEFAULT false,
    "tags" "text"[],
    "activity_type" "text"[],
    "season_timing_backup" "text"[],
    CONSTRAINT "valid_seasons" CHECK ((("season_timing" IS NULL) OR ("season_timing" <@ ARRAY['Fall'::"text", 'Winter'::"text", 'Spring'::"text", 'Summer'::"text"])))
);


ALTER TABLE "public"."lessons" OWNER TO "postgres";


COMMENT ON COLUMN "public"."lessons"."last_modified" IS 'Last modified date from the original Google Doc';



COMMENT ON COLUMN "public"."lessons"."thematic_categories" IS 'Thematic categories for the lesson';



COMMENT ON COLUMN "public"."lessons"."cultural_heritage" IS 'Cultural heritage regions or cuisines featured';



COMMENT ON COLUMN "public"."lessons"."observances_holidays" IS 'Holidays or observances the lesson relates to';



COMMENT ON COLUMN "public"."lessons"."location_requirements" IS 'Where the lesson can be conducted (Indoor/Outdoor/Both)';



COMMENT ON COLUMN "public"."lessons"."season_timing" IS 'Seasons when the lesson is appropriate';



COMMENT ON COLUMN "public"."lessons"."academic_integration" IS 'Academic subjects integrated into the lesson';



COMMENT ON COLUMN "public"."lessons"."social_emotional_learning" IS 'SEL competencies addressed';



COMMENT ON COLUMN "public"."lessons"."cooking_methods" IS 'Cooking methods required for the lesson (multiple allowed): basic-prep, stovetop, oven. Consolidated from no-cook and basic-prep into just basic-prep.';



COMMENT ON COLUMN "public"."lessons"."main_ingredients" IS 'Main ingredients used in the lesson';



COMMENT ON COLUMN "public"."lessons"."cultural_responsiveness_features" IS 'Culturally responsive teaching features';



COMMENT ON COLUMN "public"."lessons"."garden_skills" IS 'Garden skills taught or practiced';



COMMENT ON COLUMN "public"."lessons"."cooking_skills" IS 'Cooking skills taught or practiced';



COMMENT ON COLUMN "public"."lessons"."core_competencies" IS 'ESNYC core competencies addressed';



COMMENT ON COLUMN "public"."lessons"."lesson_format" IS 'Format of the lesson (single period, multi-session, etc.)';



COMMENT ON COLUMN "public"."lessons"."processing_notes" IS 'Notes from data import/processing';



COMMENT ON COLUMN "public"."lessons"."review_notes" IS 'Notes from content review';



COMMENT ON COLUMN "public"."lessons"."flagged_for_review" IS 'Whether the lesson needs review';



COMMENT ON COLUMN "public"."lessons"."tags" IS 'Additional tags for categorization';



COMMENT ON COLUMN "public"."lessons"."activity_type" IS 'Activity type of the lesson: cooking, garden, both, or academic. Stored as array for consistency with other filter fields.';



CREATE OR REPLACE VIEW "public"."lessons_with_metadata" AS
 SELECT "id",
    "lesson_id",
    "title",
    "summary",
    "file_link",
    "grade_levels",
    "metadata",
    "confidence",
    "search_vector",
    "created_at",
    "updated_at",
    "content_text",
    "content_embedding",
    "content_hash",
    "canonical_id",
    "version_number",
    "has_versions",
    "original_submission_id",
    "last_modified",
    "thematic_categories",
    "cultural_heritage",
    "observances_holidays",
    "location_requirements",
    "season_timing",
    "academic_integration",
    "social_emotional_learning",
    "cooking_methods",
    "main_ingredients",
    "cultural_responsiveness_features",
    "garden_skills",
    "cooking_skills",
    "core_competencies",
    "lesson_format",
    "processing_notes",
    "review_notes",
    "flagged_for_review",
    "tags",
    ("metadata" ->> 'activity_type'::"text") AS "activity_type_meta",
    ("metadata" ->> 'location'::"text") AS "location_meta",
    ("metadata" ->> 'season'::"text") AS "season_meta",
    ("metadata" ->> 'timing'::"text") AS "timing_meta",
    ("metadata" ->> 'group_size'::"text") AS "group_size_meta",
    ("metadata" ->> 'duration_minutes'::"text") AS "duration_minutes_meta",
    ("metadata" ->> 'prep_time_minutes'::"text") AS "prep_time_minutes_meta",
    (("metadata" ->> 'grade_levels'::"text"))::"jsonb" AS "grade_levels_array",
    (("metadata" ->> 'themes'::"text"))::"jsonb" AS "themes_array",
    (("metadata" ->> 'core_competencies'::"text"))::"jsonb" AS "core_competencies_array",
    (("metadata" ->> 'cultural_heritage'::"text"))::"jsonb" AS "cultural_heritage_array",
    (("metadata" ->> 'academic_integration'::"text"))::"jsonb" AS "academic_integration_array",
    (("metadata" ->> 'sel_competencies'::"text"))::"jsonb" AS "sel_competencies_array",
    (("metadata" ->> 'observances'::"text"))::"jsonb" AS "observances_array",
    (("metadata" ->> 'main_ingredients'::"text"))::"jsonb" AS "main_ingredients_array",
    (("metadata" ->> 'garden_skills'::"text"))::"jsonb" AS "garden_skills_array",
    (("metadata" ->> 'cooking_skills'::"text"))::"jsonb" AS "cooking_skills_array",
    (("metadata" ->> 'materials'::"text"))::"jsonb" AS "materials_array"
   FROM "public"."lessons" "l";


ALTER VIEW "public"."lessons_with_metadata" OWNER TO "postgres";


COMMENT ON VIEW "public"."lessons_with_metadata" IS 'View of lessons with metadata fields extracted. Uses INVOKER security (respects RLS).';



CREATE TABLE IF NOT EXISTS "public"."saved_searches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "filters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."saved_searches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."search_synonyms" (
    "id" integer NOT NULL,
    "term" "text" NOT NULL,
    "synonyms" "text"[] NOT NULL,
    "synonym_type" "text",
    CONSTRAINT "search_synonyms_synonym_type_check" CHECK (("synonym_type" = ANY (ARRAY['bidirectional'::"text", 'oneway'::"text", 'typo_correction'::"text"])))
);


ALTER TABLE "public"."search_synonyms" OWNER TO "postgres";


COMMENT ON TABLE "public"."search_synonyms" IS 'Search synonym configuration for improving search results';



CREATE SEQUENCE IF NOT EXISTS "public"."search_synonyms_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."search_synonyms_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."search_synonyms_id_seq" OWNED BY "public"."search_synonyms"."id";



CREATE TABLE IF NOT EXISTS "public"."submission_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "reviewer_id" "uuid" NOT NULL,
    "tagged_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "detected_duplicates" "jsonb" DEFAULT '[]'::"jsonb",
    "canonical_lesson_id" "text",
    "review_started_at" timestamp with time zone DEFAULT "now"(),
    "review_completed_at" timestamp with time zone,
    "time_spent_seconds" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "decision" "text",
    "notes" "text",
    CONSTRAINT "submission_reviews_decision_check" CHECK (("decision" = ANY (ARRAY['approve_new'::"text", 'approve_update'::"text", 'reject'::"text", 'needs_revision'::"text"])))
);


ALTER TABLE "public"."submission_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."submission_similarities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "lesson_id" "text" NOT NULL,
    "title_similarity" double precision,
    "content_similarity" double precision,
    "metadata_overlap_score" double precision,
    "combined_score" double precision,
    "match_type" "text",
    "match_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "submission_similarities_combined_score_check" CHECK ((("combined_score" >= (0)::double precision) AND ("combined_score" <= (1)::double precision))),
    CONSTRAINT "submission_similarities_content_similarity_check" CHECK ((("content_similarity" >= (0)::double precision) AND ("content_similarity" <= (1)::double precision))),
    CONSTRAINT "submission_similarities_match_type_check" CHECK (("match_type" = ANY (ARRAY['exact'::"text", 'high'::"text", 'medium'::"text", 'low'::"text"]))),
    CONSTRAINT "submission_similarities_metadata_overlap_score_check" CHECK ((("metadata_overlap_score" >= (0)::double precision) AND ("metadata_overlap_score" <= (1)::double precision))),
    CONSTRAINT "submission_similarities_title_similarity_check" CHECK ((("title_similarity" >= (0)::double precision) AND ("title_similarity" <= (1)::double precision)))
);


ALTER TABLE "public"."submission_similarities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "invited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "accepted_at" timestamp with time zone,
    "token" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "school_name" "text",
    "school_borough" "text",
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_invitations_role_check" CHECK (("role" = ANY (ARRAY['teacher'::"text", 'reviewer'::"text", 'admin'::"text"]))),
    CONSTRAINT "user_invitations_school_borough_check" CHECK (("school_borough" = ANY (ARRAY['Manhattan'::"text", 'Brooklyn'::"text", 'Queens'::"text", 'Bronx'::"text", 'Staten Island'::"text"])))
);


ALTER TABLE "public"."user_invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_invitations" IS 'Stores user invitations with secure tokens and expiration';



COMMENT ON COLUMN "public"."user_invitations"."email" IS 'Email address of the invited user';



COMMENT ON COLUMN "public"."user_invitations"."role" IS 'Role to assign to the user upon acceptance';



COMMENT ON COLUMN "public"."user_invitations"."invited_by" IS 'UUID of the user who sent the invitation';



COMMENT ON COLUMN "public"."user_invitations"."expires_at" IS 'When the invitation expires (default 7 days)';



COMMENT ON COLUMN "public"."user_invitations"."accepted_at" IS 'When the invitation was accepted (null if pending)';



COMMENT ON COLUMN "public"."user_invitations"."token" IS 'Secure token for invitation acceptance';



COMMENT ON COLUMN "public"."user_invitations"."metadata" IS 'Additional data about the invitation';



COMMENT ON COLUMN "public"."user_invitations"."school_name" IS 'Pre-filled school name for the invitation';



COMMENT ON COLUMN "public"."user_invitations"."school_borough" IS 'Pre-filled school borough for the invitation';



COMMENT ON COLUMN "public"."user_invitations"."message" IS 'Custom message from the inviter';



CREATE TABLE IF NOT EXISTS "public"."user_management_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target_user_id" "uuid",
    "target_email" "text",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_management_audit_action_check" CHECK (("action" = ANY (ARRAY['invite_sent'::"text", 'invite_accepted'::"text", 'invite_cancelled'::"text", 'invite_resent'::"text", 'user_role_changed'::"text", 'user_activated'::"text", 'user_deactivated'::"text", 'user_deleted'::"text", 'user_profile_updated'::"text", 'permissions_changed'::"text"])))
);


ALTER TABLE "public"."user_management_audit" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_management_audit" IS 'Audit table for user management actions. Login tracking is now done manually via track_user_login() function instead of auth.users trigger to avoid authentication errors.';



COMMENT ON COLUMN "public"."user_management_audit"."actor_id" IS 'User who performed the action';



COMMENT ON COLUMN "public"."user_management_audit"."action" IS 'Type of action performed';



COMMENT ON COLUMN "public"."user_management_audit"."target_user_id" IS 'User affected by the action (if applicable)';



COMMENT ON COLUMN "public"."user_management_audit"."target_email" IS 'Email of target user (useful for invitations)';



COMMENT ON COLUMN "public"."user_management_audit"."old_values" IS 'Previous values before the change';



COMMENT ON COLUMN "public"."user_management_audit"."new_values" IS 'New values after the change';



COMMENT ON COLUMN "public"."user_management_audit"."metadata" IS 'Additional context about the action';



COMMENT ON COLUMN "public"."user_management_audit"."ip_address" IS 'IP address of the actor';



COMMENT ON COLUMN "public"."user_management_audit"."user_agent" IS 'Browser user agent of the actor';



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "full_name" "text" NOT NULL,
    "school" "text",
    "grades_taught" "text"[] DEFAULT '{}'::"text"[],
    "subjects" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "role" "text" DEFAULT 'teacher'::"text",
    "invited_by" "uuid",
    "invited_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "school_name" "text",
    "school_borough" "text",
    "subjects_taught" "text"[],
    "notes" "text",
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "email" "text",
    CONSTRAINT "user_profiles_role_check" CHECK (("role" = ANY (ARRAY['teacher'::"text", 'reviewer'::"text", 'admin'::"text"]))),
    CONSTRAINT "user_profiles_school_borough_check" CHECK (("school_borough" = ANY (ARRAY['Manhattan'::"text", 'Brooklyn'::"text", 'Queens'::"text", 'Bronx'::"text", 'Staten Island'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_profiles"."grades_taught" IS 'Array of grade levels the user teaches';



COMMENT ON COLUMN "public"."user_profiles"."invited_by" IS 'UUID of the user who invited this user';



COMMENT ON COLUMN "public"."user_profiles"."invited_at" IS 'Timestamp when the invitation was sent';



COMMENT ON COLUMN "public"."user_profiles"."accepted_at" IS 'Timestamp when the user accepted the invitation';



COMMENT ON COLUMN "public"."user_profiles"."is_active" IS 'Whether the user account is active';



COMMENT ON COLUMN "public"."user_profiles"."school_name" IS 'Name of the school where the user teaches';



COMMENT ON COLUMN "public"."user_profiles"."school_borough" IS 'NYC borough where the school is located';



COMMENT ON COLUMN "public"."user_profiles"."subjects_taught" IS 'Array of subjects the user teaches';



COMMENT ON COLUMN "public"."user_profiles"."notes" IS 'Admin notes about the user';



COMMENT ON COLUMN "public"."user_profiles"."permissions" IS 'Custom permissions override (JSON object)';



COMMENT ON COLUMN "public"."user_profiles"."email" IS 'User email - fallback when auth.users email is not accessible';



CREATE OR REPLACE VIEW "public"."user_profiles_safe" AS
 SELECT "id",
    "full_name",
    "role",
    "school_name",
    "grades_taught",
    "subjects",
    "created_at"
   FROM "public"."user_profiles" "up"
  WHERE ("is_active" = true);


ALTER VIEW "public"."user_profiles_safe" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_profiles_safe" IS 'Safe view of active user profiles. Uses INVOKER security (respects RLS).';



CREATE TABLE IF NOT EXISTS "public"."user_schools" (
    "user_id" "uuid" NOT NULL,
    "school_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_schools" OWNER TO "postgres";


ALTER TABLE ONLY "public"."cultural_heritage_hierarchy" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."cultural_heritage_hierarchy_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."search_synonyms" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."search_synonyms_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_user_id_lesson_id_key" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."canonical_lessons"
    ADD CONSTRAINT "canonical_lessons_pkey" PRIMARY KEY ("duplicate_id");



ALTER TABLE ONLY "public"."cultural_heritage_hierarchy"
    ADD CONSTRAINT "cultural_heritage_hierarchy_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."duplicate_resolutions"
    ADD CONSTRAINT "duplicate_resolutions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_archive"
    ADD CONSTRAINT "lesson_archive_pkey" PRIMARY KEY ("lesson_id");



ALTER TABLE ONLY "public"."lesson_collections"
    ADD CONSTRAINT "lesson_collections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_submissions"
    ADD CONSTRAINT "lesson_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_versions"
    ADD CONSTRAINT "lesson_versions_lesson_id_version_number_key" UNIQUE ("lesson_id", "version_number");



ALTER TABLE ONLY "public"."lesson_versions"
    ADD CONSTRAINT "lesson_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_lesson_id_key" UNIQUE ("lesson_id");



ALTER TABLE ONLY "public"."lessons"
    ADD CONSTRAINT "lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_searches"
    ADD CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."search_synonyms"
    ADD CONSTRAINT "search_synonyms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."submission_reviews"
    ADD CONSTRAINT "submission_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."submission_similarities"
    ADD CONSTRAINT "submission_similarities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."user_management_audit"
    ADD CONSTRAINT "user_management_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_schools"
    ADD CONSTRAINT "user_schools_pkey" PRIMARY KEY ("user_id", "school_id");



CREATE INDEX "idx_archive_canonical" ON "public"."lesson_archive" USING "btree" ("canonical_id");



CREATE INDEX "idx_archive_date" ON "public"."lesson_archive" USING "btree" ("archived_at");



CREATE INDEX "idx_archive_reason" ON "public"."lesson_archive" USING "btree" ("archive_reason");



CREATE INDEX "idx_audit_action" ON "public"."user_management_audit" USING "btree" ("action");



CREATE INDEX "idx_audit_action_created" ON "public"."user_management_audit" USING "btree" ("action", "created_at" DESC);



CREATE INDEX "idx_audit_actor" ON "public"."user_management_audit" USING "btree" ("actor_id");



CREATE INDEX "idx_audit_actor_created" ON "public"."user_management_audit" USING "btree" ("actor_id", "created_at" DESC);



CREATE INDEX "idx_audit_created" ON "public"."user_management_audit" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_login_actions" ON "public"."user_management_audit" USING "btree" ("action", "created_at") WHERE ("action" = 'login'::"text");



CREATE INDEX "idx_audit_target" ON "public"."user_management_audit" USING "btree" ("target_user_id");



CREATE INDEX "idx_audit_target_created" ON "public"."user_management_audit" USING "btree" ("target_user_id", "created_at" DESC);



CREATE INDEX "idx_audit_target_email" ON "public"."user_management_audit" USING "btree" ("target_email");



CREATE INDEX "idx_bookmarks_lesson_id" ON "public"."bookmarks" USING "btree" ("lesson_id");



CREATE INDEX "idx_bookmarks_user_id" ON "public"."bookmarks" USING "btree" ("user_id");



CREATE INDEX "idx_canonical_id" ON "public"."canonical_lessons" USING "btree" ("canonical_id");



CREATE INDEX "idx_duplicate_resolutions_parent_group" ON "public"."duplicate_resolutions" USING "btree" ("parent_group_id") WHERE ("parent_group_id" IS NOT NULL);



CREATE INDEX "idx_invitations_email" ON "public"."user_invitations" USING "btree" ("email");



CREATE INDEX "idx_invitations_expires_at" ON "public"."user_invitations" USING "btree" ("expires_at") WHERE ("accepted_at" IS NULL);



CREATE INDEX "idx_invitations_invited_by" ON "public"."user_invitations" USING "btree" ("invited_by");



CREATE INDEX "idx_invitations_token" ON "public"."user_invitations" USING "btree" ("token");



CREATE INDEX "idx_lesson_collections_user_id" ON "public"."lesson_collections" USING "btree" ("user_id");



CREATE INDEX "idx_lessons_academic" ON "public"."lessons" USING "gin" (((("metadata" -> 'academicIntegration'::"text") -> 'selected'::"text")));



CREATE INDEX "idx_lessons_academic_integration" ON "public"."lessons" USING "gin" ("academic_integration");



CREATE INDEX "idx_lessons_activity_type" ON "public"."lessons" USING "btree" ((("metadata" ->> 'activityType'::"text")));



CREATE INDEX "idx_lessons_canonical" ON "public"."lessons" USING "btree" ("canonical_id") WHERE ("canonical_id" IS NOT NULL);



CREATE INDEX "idx_lessons_competencies" ON "public"."lessons" USING "gin" ((("metadata" -> 'coreCompetencies'::"text")));



CREATE INDEX "idx_lessons_confidence" ON "public"."lessons" USING "btree" (((("confidence" ->> 'overall'::"text"))::double precision));



CREATE INDEX "idx_lessons_cooking" ON "public"."lessons" USING "btree" ((("metadata" ->> 'cookingMethods'::"text")));



CREATE INDEX "idx_lessons_cooking_methods" ON "public"."lessons" USING "gin" ("cooking_methods");



CREATE INDEX "idx_lessons_cooking_skills" ON "public"."lessons" USING "gin" ("cooking_skills");



CREATE INDEX "idx_lessons_core_competencies" ON "public"."lessons" USING "gin" ("core_competencies");



CREATE INDEX "idx_lessons_cultural_heritage" ON "public"."lessons" USING "gin" ("cultural_heritage");



CREATE INDEX "idx_lessons_cultures" ON "public"."lessons" USING "gin" ((("metadata" -> 'culturalHeritage'::"text")));



CREATE INDEX "idx_lessons_embedding" ON "public"."lessons" USING "ivfflat" ("content_embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_lessons_flagged" ON "public"."lessons" USING "btree" ("flagged_for_review") WHERE ("flagged_for_review" = true);



CREATE INDEX "idx_lessons_format" ON "public"."lessons" USING "btree" ((("metadata" ->> 'lessonFormat'::"text")));



CREATE INDEX "idx_lessons_garden_skills" ON "public"."lessons" USING "gin" ("garden_skills");



CREATE INDEX "idx_lessons_grade_levels" ON "public"."lessons" USING "gin" ("grade_levels");



CREATE INDEX "idx_lessons_hash" ON "public"."lessons" USING "btree" ("content_hash") WHERE ("content_hash" IS NOT NULL);



CREATE INDEX "idx_lessons_hash_id" ON "public"."lessons" USING "btree" ("content_hash", "lesson_id") WHERE ("content_hash" IS NOT NULL);



CREATE INDEX "idx_lessons_last_modified" ON "public"."lessons" USING "btree" ("last_modified" DESC NULLS LAST);



CREATE INDEX "idx_lessons_lesson_format" ON "public"."lessons" USING "btree" ("lesson_format");



CREATE INDEX "idx_lessons_location" ON "public"."lessons" USING "btree" ((("metadata" ->> 'locationRequirements'::"text")));



CREATE INDEX "idx_lessons_location_requirements" ON "public"."lessons" USING "gin" ("location_requirements");



CREATE INDEX "idx_lessons_main_ingredients" ON "public"."lessons" USING "gin" ("main_ingredients");



CREATE INDEX "idx_lessons_metadata" ON "public"."lessons" USING "gin" ("metadata");



CREATE INDEX "idx_lessons_observances_holidays" ON "public"."lessons" USING "gin" ("observances_holidays");



CREATE INDEX "idx_lessons_processing_notes" ON "public"."lessons" USING "gin" ("to_tsvector"('"english"'::"regconfig", "processing_notes"));



CREATE INDEX "idx_lessons_search_vector" ON "public"."lessons" USING "gin" ("search_vector");



CREATE INDEX "idx_lessons_season_timing" ON "public"."lessons" USING "gin" ("season_timing");



CREATE INDEX "idx_lessons_seasons" ON "public"."lessons" USING "gin" ((("metadata" -> 'seasonTiming'::"text")));



CREATE INDEX "idx_lessons_sel" ON "public"."lessons" USING "gin" ((("metadata" -> 'socialEmotionalLearning'::"text")));



CREATE INDEX "idx_lessons_social_emotional_learning" ON "public"."lessons" USING "gin" ("social_emotional_learning");



CREATE INDEX "idx_lessons_summary" ON "public"."lessons" USING "gin" ("summary" "public"."gin_trgm_ops");



CREATE INDEX "idx_lessons_summary_trgm" ON "public"."lessons" USING "gin" ("summary" "public"."gin_trgm_ops");



CREATE INDEX "idx_lessons_tags" ON "public"."lessons" USING "gin" ("tags");



CREATE INDEX "idx_lessons_thematic_categories" ON "public"."lessons" USING "gin" ("thematic_categories");



CREATE INDEX "idx_lessons_themes" ON "public"."lessons" USING "gin" ((("metadata" -> 'thematicCategories'::"text")));



CREATE INDEX "idx_lessons_title" ON "public"."lessons" USING "gin" ("title" "public"."gin_trgm_ops");



CREATE INDEX "idx_lessons_title_trgm" ON "public"."lessons" USING "gin" ("title" "public"."gin_trgm_ops");



CREATE INDEX "idx_resolution_canonical" ON "public"."duplicate_resolutions" USING "btree" ("canonical_lesson_id");



CREATE INDEX "idx_resolution_date" ON "public"."duplicate_resolutions" USING "btree" ("resolved_at");



CREATE INDEX "idx_resolution_group" ON "public"."duplicate_resolutions" USING "btree" ("group_id");



CREATE INDEX "idx_reviews_reviewer" ON "public"."submission_reviews" USING "btree" ("reviewer_id");



CREATE INDEX "idx_reviews_submission" ON "public"."submission_reviews" USING "btree" ("submission_id");



CREATE INDEX "idx_saved_searches_user_id" ON "public"."saved_searches" USING "btree" ("user_id");



CREATE INDEX "idx_schools_name" ON "public"."schools" USING "btree" ("name");



CREATE INDEX "idx_similarities_score" ON "public"."submission_similarities" USING "btree" ("combined_score" DESC);



CREATE INDEX "idx_similarities_submission" ON "public"."submission_similarities" USING "btree" ("submission_id");



CREATE INDEX "idx_submissions_embedding" ON "public"."lesson_submissions" USING "ivfflat" ("content_embedding" "public"."vector_cosine_ops") WITH ("lists"='50');



CREATE INDEX "idx_submissions_google_doc_id" ON "public"."lesson_submissions" USING "btree" ("google_doc_id");



CREATE INDEX "idx_submissions_hash" ON "public"."lesson_submissions" USING "btree" ("content_hash");



CREATE INDEX "idx_submissions_status" ON "public"."lesson_submissions" USING "btree" ("status");



CREATE INDEX "idx_submissions_teacher" ON "public"."lesson_submissions" USING "btree" ("teacher_id");



CREATE INDEX "idx_synonyms_array" ON "public"."search_synonyms" USING "gin" ("synonyms");



CREATE INDEX "idx_synonyms_term" ON "public"."search_synonyms" USING "btree" ("lower"("term"));



CREATE INDEX "idx_user_profiles_email" ON "public"."user_profiles" USING "btree" ("email");



CREATE UNIQUE INDEX "idx_user_profiles_email_unique" ON "public"."user_profiles" USING "btree" ("email") WHERE ("email" IS NOT NULL);



COMMENT ON INDEX "public"."idx_user_profiles_email_unique" IS 'Ensures email uniqueness in user_profiles table while allowing multiple NULL email values for users who haven''t provided email yet';



CREATE INDEX "idx_user_profiles_is_active" ON "public"."user_profiles" USING "btree" ("is_active");



CREATE INDEX "idx_user_profiles_role" ON "public"."user_profiles" USING "btree" ("role");



CREATE INDEX "idx_user_profiles_school_borough" ON "public"."user_profiles" USING "btree" ("school_borough");



CREATE INDEX "idx_user_profiles_user_id" ON "public"."user_profiles" USING "btree" ("user_id");



CREATE INDEX "idx_user_schools_school_id" ON "public"."user_schools" USING "btree" ("school_id");



CREATE INDEX "idx_user_schools_user_id" ON "public"."user_schools" USING "btree" ("user_id");



CREATE INDEX "idx_versions_lesson_id" ON "public"."lesson_versions" USING "btree" ("lesson_id");



CREATE INDEX "idx_versions_submission" ON "public"."lesson_versions" USING "btree" ("archived_from_submission_id");



CREATE UNIQUE INDEX "unique_pending_invitation_per_email" ON "public"."user_invitations" USING "btree" ("email") WHERE ("accepted_at" IS NULL);



CREATE OR REPLACE TRIGGER "trigger_lesson_collections_updated_at" BEFORE UPDATE ON "public"."lesson_collections" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_lesson_submissions_updated_at" BEFORE UPDATE ON "public"."lesson_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_lesson_submissions_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_log_user_profile_changes" AFTER UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."log_user_profile_changes"();



CREATE OR REPLACE TRIGGER "trigger_update_lesson_search_vector" BEFORE INSERT OR UPDATE ON "public"."lessons" FOR EACH ROW EXECUTE FUNCTION "public"."update_lesson_search_vector"();



CREATE OR REPLACE TRIGGER "trigger_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_lesson_search_vector_trigger" BEFORE INSERT OR UPDATE OF "title", "summary", "main_ingredients", "garden_skills", "cooking_skills", "thematic_categories", "cultural_heritage", "observances_holidays", "tags", "content_text" ON "public"."lessons" FOR EACH ROW EXECUTE FUNCTION "public"."update_lesson_search_vector"();



CREATE OR REPLACE TRIGGER "update_lessons_search_vector" BEFORE INSERT OR UPDATE ON "public"."lessons" FOR EACH ROW EXECUTE FUNCTION "public"."update_search_vector"();



CREATE OR REPLACE TRIGGER "update_schools_updated_at" BEFORE UPDATE ON "public"."schools" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("lesson_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookmarks"
    ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."canonical_lessons"
    ADD CONSTRAINT "canonical_lessons_canonical_id_fkey" FOREIGN KEY ("canonical_id") REFERENCES "public"."lessons"("lesson_id");



ALTER TABLE ONLY "public"."canonical_lessons"
    ADD CONSTRAINT "canonical_lessons_duplicate_id_fkey" FOREIGN KEY ("duplicate_id") REFERENCES "public"."lessons"("lesson_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."canonical_lessons"
    ADD CONSTRAINT "canonical_lessons_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."duplicate_resolutions"
    ADD CONSTRAINT "duplicate_resolutions_canonical_lesson_id_fkey" FOREIGN KEY ("canonical_lesson_id") REFERENCES "public"."lessons"("lesson_id");



ALTER TABLE ONLY "public"."duplicate_resolutions"
    ADD CONSTRAINT "duplicate_resolutions_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lesson_archive"
    ADD CONSTRAINT "lesson_archive_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lesson_archive"
    ADD CONSTRAINT "lesson_archive_canonical_id_fkey" FOREIGN KEY ("canonical_id") REFERENCES "public"."lessons"("lesson_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lesson_collections"
    ADD CONSTRAINT "lesson_collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_submissions"
    ADD CONSTRAINT "lesson_submissions_original_lesson_id_fkey" FOREIGN KEY ("original_lesson_id") REFERENCES "public"."lessons"("lesson_id");



ALTER TABLE ONLY "public"."lesson_submissions"
    ADD CONSTRAINT "lesson_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lesson_submissions"
    ADD CONSTRAINT "lesson_submissions_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lesson_submissions"
    ADD CONSTRAINT "lesson_submissions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lesson_versions"
    ADD CONSTRAINT "lesson_versions_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lesson_versions"
    ADD CONSTRAINT "lesson_versions_archived_from_submission_id_fkey" FOREIGN KEY ("archived_from_submission_id") REFERENCES "public"."lesson_submissions"("id");



ALTER TABLE ONLY "public"."saved_searches"
    ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."submission_reviews"
    ADD CONSTRAINT "submission_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."submission_reviews"
    ADD CONSTRAINT "submission_reviews_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."lesson_submissions"("id");



ALTER TABLE ONLY "public"."submission_similarities"
    ADD CONSTRAINT "submission_similarities_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."lesson_submissions"("id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_management_audit"
    ADD CONSTRAINT "user_management_audit_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_management_audit"
    ADD CONSTRAINT "user_management_audit_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



COMMENT ON CONSTRAINT "user_management_audit_target_user_id_fkey" ON "public"."user_management_audit" IS 'References user_profiles table instead of auth.users to maintain consistency with our user management system';



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_schools"
    ADD CONSTRAINT "user_schools_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_schools"
    ADD CONSTRAINT "user_schools_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins and reviewers can create versions" ON "public"."lesson_versions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'reviewer'::"text"]))))));



CREATE POLICY "Admins and reviewers can insert lessons" ON "public"."lessons" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'reviewer'::"text"]))))));



CREATE POLICY "Admins and reviewers can update lessons" ON "public"."lessons" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'reviewer'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'reviewer'::"text"]))))));



CREATE POLICY "Admins can create invitations" ON "public"."user_invitations" FOR INSERT WITH CHECK (("public"."is_admin"() AND ("invited_by" = "auth"."uid"())));



CREATE POLICY "Admins can create schools" ON "public"."schools" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "Admins can create user-school relationships" ON "public"."user_schools" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "Admins can delete canonical lessons" ON "public"."canonical_lessons" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can delete hierarchy" ON "public"."cultural_heritage_hierarchy" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can delete invitations" ON "public"."user_invitations" FOR DELETE USING (("public"."is_admin"() AND ("invited_by" = "auth"."uid"())));



CREATE POLICY "Admins can delete synonyms" ON "public"."search_synonyms" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can delete user-school relationships" ON "public"."user_schools" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "Admins can insert canonical lessons" ON "public"."canonical_lessons" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can insert hierarchy" ON "public"."cultural_heritage_hierarchy" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can insert resolutions" ON "public"."duplicate_resolutions" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can insert synonyms" ON "public"."search_synonyms" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can insert to archive" ON "public"."lesson_archive" FOR INSERT WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can update any profile" ON "public"."user_profiles" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update canonical lessons" ON "public"."canonical_lessons" FOR UPDATE USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can update hierarchy" ON "public"."cultural_heritage_hierarchy" FOR UPDATE USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can update invitations" ON "public"."user_invitations" FOR UPDATE USING (("public"."is_admin"() AND ("invited_by" = "auth"."uid"()))) WITH CHECK (("public"."is_admin"() AND ("invited_by" = "auth"."uid"())));



CREATE POLICY "Admins can update resolutions" ON "public"."duplicate_resolutions" FOR UPDATE USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can update schools" ON "public"."schools" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "Admins can update synonyms" ON "public"."search_synonyms" FOR UPDATE USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can view all audit logs" ON "public"."user_management_audit" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can view all invitations" ON "public"."user_invitations" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view lesson archive" ON "public"."lesson_archive" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins view audit logs" ON "public"."user_management_audit" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Anyone can view own profile" ON "public"."user_profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "Everyone can view lesson versions" ON "public"."lesson_versions" FOR SELECT USING (true);



CREATE POLICY "Lessons are viewable by everyone" ON "public"."lessons" FOR SELECT USING (true);



CREATE POLICY "Public can view by token" ON "public"."user_invitations" FOR SELECT USING (true);



CREATE POLICY "Public can view canonical lessons" ON "public"."canonical_lessons" FOR SELECT USING (true);



CREATE POLICY "Public can view cultural hierarchy" ON "public"."cultural_heritage_hierarchy" FOR SELECT USING (true);



CREATE POLICY "Public can view synonyms" ON "public"."search_synonyms" FOR SELECT USING (true);



CREATE POLICY "Public can view valid invitation by token" ON "public"."user_invitations" FOR SELECT USING ((("token" IS NOT NULL) AND ("expires_at" > "now"()) AND ("accepted_at" IS NULL)));



COMMENT ON POLICY "Public can view valid invitation by token" ON "public"."user_invitations" IS 'Allows public viewing of invitations only when they have a valid token, have not expired, and have not been accepted. This prevents enumeration attacks and ensures only valid invitations can be viewed.';



CREATE POLICY "Reviewers can manage reviews" ON "public"."submission_reviews" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['reviewer'::"text", 'admin'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['reviewer'::"text", 'admin'::"text"]))))));



CREATE POLICY "Reviewers can update submissions" ON "public"."lesson_submissions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['reviewer'::"text", 'admin'::"text"]))))));



CREATE POLICY "Reviewers can view all profiles" ON "public"."user_profiles" FOR SELECT USING ("public"."is_reviewer_or_above"());



CREATE POLICY "Reviewers can view all submissions" ON "public"."lesson_submissions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['reviewer'::"text", 'admin'::"text"]))))));



CREATE POLICY "Reviewers can view duplicate resolutions" ON "public"."duplicate_resolutions" FOR SELECT TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'reviewer'::"text"));



CREATE POLICY "Reviewers can view similarities" ON "public"."submission_similarities" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['reviewer'::"text", 'admin'::"text"]))))));



CREATE POLICY "Super admins can delete from archive" ON "public"."lesson_archive" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can delete schools" ON "public"."schools" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"text")))));



CREATE POLICY "System can insert audit logs" ON "public"."user_management_audit" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "System can manage similarities" ON "public"."submission_similarities" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "System inserts audit logs" ON "public"."user_management_audit" FOR INSERT WITH CHECK (true);



CREATE POLICY "Teachers can create submissions" ON "public"."lesson_submissions" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can view own submissions" ON "public"."lesson_submissions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Users can create their own profile" ON "public"."user_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can delete own collections" ON "public"."lesson_collections" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own bookmarks" ON "public"."bookmarks" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own collections" ON "public"."lesson_collections" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own saved searches" ON "public"."saved_searches" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own basic info" ON "public"."user_profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK ((("id" = "auth"."uid"()) AND ("role" = ( SELECT "user_profiles_1"."role"
   FROM "public"."user_profiles" "user_profiles_1"
  WHERE ("user_profiles_1"."id" = "auth"."uid"()))) AND ("is_active" = ( SELECT "user_profiles_1"."is_active"
   FROM "public"."user_profiles" "user_profiles_1"
  WHERE ("user_profiles_1"."id" = "auth"."uid"()))) AND (("permissions" IS NULL) OR ("permissions" = ( SELECT "user_profiles_1"."permissions"
   FROM "public"."user_profiles" "user_profiles_1"
  WHERE ("user_profiles_1"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can update own collections" ON "public"."lesson_collections" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view all schools" ON "public"."schools" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can view all user-school relationships" ON "public"."user_schools" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can view own audit logs" ON "public"."user_management_audit" FOR SELECT USING ((("actor_id" = "auth"."uid"()) OR ("target_user_id" = "auth"."uid"())));



CREATE POLICY "Users can view own collections and public collections" ON "public"."lesson_collections" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR ("is_public" = true)));



CREATE POLICY "Users view own invitations" ON "public"."user_invitations" FOR SELECT USING (("invited_by" = "auth"."uid"()));



ALTER TABLE "public"."bookmarks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."canonical_lessons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cultural_heritage_hierarchy" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."duplicate_resolutions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lesson_archive" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lesson_collections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lesson_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lesson_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lessons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_searches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."search_synonyms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."submission_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."submission_similarities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_management_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_schools" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."check_security_definer_views"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_security_definer_views"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_security_definer_views"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_user_email"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_user_email"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_user_email"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."expand_cultural_heritage"("cultures" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."expand_cultural_heritage"("cultures" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."expand_cultural_heritage"("cultures" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."expand_search_with_synonyms"("query_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."expand_search_with_synonyms"("query_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."expand_search_with_synonyms"("query_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."find_lessons_by_hash"("hash_value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."find_lessons_by_hash"("hash_value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_lessons_by_hash"("hash_value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."find_similar_lessons_by_embedding"("query_embedding" "public"."vector", "similarity_threshold" double precision, "max_results" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."find_similar_lessons_by_embedding"("query_embedding" "public"."vector", "similarity_threshold" double precision, "max_results" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_similar_lessons_by_embedding"("query_embedding" "public"."vector", "similarity_threshold" double precision, "max_results" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_lesson_search_vector"("p_title" "text", "p_summary" "text", "p_main_ingredients" "text"[], "p_garden_skills" "text"[], "p_cooking_skills" "text"[], "p_thematic_categories" "text"[], "p_cultural_heritage" "text"[], "p_observances_holidays" "text"[], "p_tags" "text"[], "p_content_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_lesson_search_vector"("p_title" "text", "p_summary" "text", "p_main_ingredients" "text"[], "p_garden_skills" "text"[], "p_cooking_skills" "text"[], "p_thematic_categories" "text"[], "p_cultural_heritage" "text"[], "p_observances_holidays" "text"[], "p_tags" "text"[], "p_content_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_lesson_search_vector"("p_title" "text", "p_summary" "text", "p_main_ingredients" "text"[], "p_garden_skills" "text"[], "p_cooking_skills" "text"[], "p_thematic_categories" "text"[], "p_cultural_heritage" "text"[], "p_observances_holidays" "text"[], "p_tags" "text"[], "p_content_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_canonical_lesson_id"("p_lesson_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_canonical_lesson_id"("p_lesson_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_canonical_lesson_id"("p_lesson_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_embedding_as_text"("lesson_id_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_embedding_as_text"("lesson_id_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_embedding_as_text"("lesson_id_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_activity_metrics"("p_user_id" "uuid", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_activity_metrics"("p_user_id" "uuid", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_activity_metrics"("p_user_id" "uuid", "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_emails"("user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_emails"("user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_emails"("user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_profiles_with_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profiles_with_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profiles_with_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_lessons_metadata_write"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_lessons_metadata_write"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_lessons_metadata_write"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("p_user_id" "uuid", "required_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("p_user_id" "uuid", "required_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("p_user_id" "uuid", "required_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_duplicate_lesson"("p_lesson_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_duplicate_lesson"("p_lesson_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_duplicate_lesson"("p_lesson_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_lesson_archived"("p_lesson_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_lesson_archived"("p_lesson_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_lesson_archived"("p_lesson_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_reviewer_or_above"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_reviewer_or_above"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_reviewer_or_above"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_user_profile_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_user_profile_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_user_profile_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."publish_approved_submissions"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."publish_approved_submissions"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."publish_approved_submissions"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_duplicate_group"("p_group_id" "text", "p_canonical_id" "text", "p_duplicate_ids" "text"[], "p_duplicate_type" "text", "p_similarity_score" numeric, "p_merge_metadata" boolean, "p_resolution_notes" "text", "p_resolution_mode" "text", "p_sub_group_name" "text", "p_parent_group_id" "text", "p_title_updates" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_duplicate_group"("p_group_id" "text", "p_canonical_id" "text", "p_duplicate_ids" "text"[], "p_duplicate_type" "text", "p_similarity_score" numeric, "p_merge_metadata" boolean, "p_resolution_notes" "text", "p_resolution_mode" "text", "p_sub_group_name" "text", "p_parent_group_id" "text", "p_title_updates" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_duplicate_group"("p_group_id" "text", "p_canonical_id" "text", "p_duplicate_ids" "text"[], "p_duplicate_type" "text", "p_similarity_score" numeric, "p_merge_metadata" boolean, "p_resolution_notes" "text", "p_resolution_mode" "text", "p_sub_group_name" "text", "p_parent_group_id" "text", "p_title_updates" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_lessons"("search_query" "text", "filter_grade_levels" "text"[], "filter_themes" "text"[], "filter_seasons" "text"[], "filter_competencies" "text"[], "filter_cultures" "text"[], "filter_location" "text"[], "filter_activity_type" "text"[], "filter_lesson_format" "text", "filter_academic" "text"[], "filter_sel" "text"[], "filter_cooking_method" "text", "page_size" integer, "page_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_lessons"("search_query" "text", "filter_grade_levels" "text"[], "filter_themes" "text"[], "filter_seasons" "text"[], "filter_competencies" "text"[], "filter_cultures" "text"[], "filter_location" "text"[], "filter_activity_type" "text"[], "filter_lesson_format" "text", "filter_academic" "text"[], "filter_sel" "text"[], "filter_cooking_method" "text", "page_size" integer, "page_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_lessons"("search_query" "text", "filter_grade_levels" "text"[], "filter_themes" "text"[], "filter_seasons" "text"[], "filter_competencies" "text"[], "filter_cultures" "text"[], "filter_location" "text"[], "filter_activity_type" "text"[], "filter_lesson_format" "text", "filter_academic" "text"[], "filter_sel" "text"[], "filter_cooking_method" "text", "page_size" integer, "page_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."track_user_login"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."track_user_login"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_user_login"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lesson_search_vector"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lesson_search_vector"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lesson_search_vector"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lesson_submissions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lesson_submissions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lesson_submissions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_search_vector"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_search_vector"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_search_vector"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_invitation_token"("invite_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_invitation_token"("invite_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_invitation_token"("invite_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_rls_enabled"() TO "anon";
GRANT ALL ON FUNCTION "public"."verify_rls_enabled"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_rls_enabled"() TO "service_role";



GRANT ALL ON TABLE "public"."bookmarks" TO "anon";
GRANT ALL ON TABLE "public"."bookmarks" TO "authenticated";
GRANT ALL ON TABLE "public"."bookmarks" TO "service_role";



GRANT ALL ON TABLE "public"."canonical_lessons" TO "anon";
GRANT ALL ON TABLE "public"."canonical_lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."canonical_lessons" TO "service_role";



GRANT ALL ON TABLE "public"."cultural_heritage_hierarchy" TO "anon";
GRANT ALL ON TABLE "public"."cultural_heritage_hierarchy" TO "authenticated";
GRANT ALL ON TABLE "public"."cultural_heritage_hierarchy" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cultural_heritage_hierarchy_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cultural_heritage_hierarchy_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cultural_heritage_hierarchy_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."duplicate_resolutions" TO "anon";
GRANT ALL ON TABLE "public"."duplicate_resolutions" TO "authenticated";
GRANT ALL ON TABLE "public"."duplicate_resolutions" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_archive" TO "anon";
GRANT ALL ON TABLE "public"."lesson_archive" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_archive" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_collections" TO "anon";
GRANT ALL ON TABLE "public"."lesson_collections" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_collections" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_submissions" TO "anon";
GRANT ALL ON TABLE "public"."lesson_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_versions" TO "anon";
GRANT ALL ON TABLE "public"."lesson_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_versions" TO "service_role";



GRANT ALL ON TABLE "public"."lessons" TO "anon";
GRANT ALL ON TABLE "public"."lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."lessons" TO "service_role";



GRANT ALL ON TABLE "public"."lessons_with_metadata" TO "anon";
GRANT ALL ON TABLE "public"."lessons_with_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."lessons_with_metadata" TO "service_role";



GRANT ALL ON TABLE "public"."saved_searches" TO "anon";
GRANT ALL ON TABLE "public"."saved_searches" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_searches" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."search_synonyms" TO "anon";
GRANT ALL ON TABLE "public"."search_synonyms" TO "authenticated";
GRANT ALL ON TABLE "public"."search_synonyms" TO "service_role";



GRANT ALL ON SEQUENCE "public"."search_synonyms_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."search_synonyms_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."search_synonyms_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."submission_reviews" TO "anon";
GRANT ALL ON TABLE "public"."submission_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."submission_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."submission_similarities" TO "anon";
GRANT ALL ON TABLE "public"."submission_similarities" TO "authenticated";
GRANT ALL ON TABLE "public"."submission_similarities" TO "service_role";



GRANT ALL ON TABLE "public"."user_invitations" TO "anon";
GRANT ALL ON TABLE "public"."user_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."user_management_audit" TO "anon";
GRANT ALL ON TABLE "public"."user_management_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."user_management_audit" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles_safe" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles_safe" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles_safe" TO "service_role";



GRANT ALL ON TABLE "public"."user_schools" TO "anon";
GRANT ALL ON TABLE "public"."user_schools" TO "authenticated";
GRANT ALL ON TABLE "public"."user_schools" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
