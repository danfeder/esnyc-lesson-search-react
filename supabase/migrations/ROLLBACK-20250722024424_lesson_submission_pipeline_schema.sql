/*
  # ROLLBACK SCRIPT for Lesson Submission Pipeline Schema
  
  EMERGENCY USE ONLY - This will undo all changes from the migration
  
  Instructions:
  1. Make sure you have a backup before running this
  2. Run this if the migration causes issues
  3. All new data in the new tables will be lost
*/

BEGIN;

-- ============================================
-- PART 1: Drop new columns from existing tables
-- ============================================

ALTER TABLE lessons 
DROP COLUMN IF EXISTS content_text,
DROP COLUMN IF EXISTS content_embedding,
DROP COLUMN IF EXISTS content_hash,
DROP COLUMN IF EXISTS canonical_id,
DROP COLUMN IF EXISTS version_number,
DROP COLUMN IF EXISTS has_versions,
DROP COLUMN IF EXISTS original_submission_id;

ALTER TABLE user_profiles 
DROP COLUMN IF EXISTS role;

-- ============================================
-- PART 2: Drop new tables (CASCADE to handle dependencies)
-- ============================================

DROP TABLE IF EXISTS submission_similarities CASCADE;
DROP TABLE IF EXISTS lesson_versions CASCADE;
DROP TABLE IF EXISTS submission_reviews CASCADE;
DROP TABLE IF EXISTS lesson_submissions CASCADE;

-- ============================================
-- PART 3: Drop functions
-- ============================================

DROP FUNCTION IF EXISTS find_lessons_by_hash(VARCHAR);
DROP FUNCTION IF EXISTS find_similar_lessons_by_embedding(vector, FLOAT, INTEGER);
DROP FUNCTION IF EXISTS update_lesson_submissions_updated_at();

-- ============================================
-- PART 4: Verify rollback
-- ============================================

DO $$
DECLARE
  new_column_count INTEGER;
  new_table_count INTEGER;
BEGIN
  -- Check if columns were removed
  SELECT COUNT(*) INTO new_column_count
  FROM information_schema.columns
  WHERE table_name = 'lessons' 
  AND column_name IN ('content_text', 'content_embedding', 'content_hash');
  
  -- Check if tables were removed
  SELECT COUNT(*) INTO new_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('lesson_submissions', 'submission_reviews', 'lesson_versions', 'submission_similarities');
  
  IF new_column_count > 0 THEN
    RAISE NOTICE 'WARNING: % new columns still exist in lessons table', new_column_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All new columns removed from lessons table';
  END IF;
  
  IF new_table_count > 0 THEN
    RAISE NOTICE 'WARNING: % new tables still exist', new_table_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All new tables removed';
  END IF;
END $$;

COMMIT;

-- ============================================
-- Post-rollback verification queries
-- ============================================

/*
-- Run these to confirm rollback success:

-- Should return 0 rows
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'lessons' 
AND column_name IN ('content_text', 'content_embedding', 'content_hash');

-- Should return 0 rows
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('lesson_submissions', 'submission_reviews', 'lesson_versions', 'submission_similarities');
*/