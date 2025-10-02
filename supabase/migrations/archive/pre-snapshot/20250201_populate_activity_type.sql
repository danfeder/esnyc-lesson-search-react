-- Add activity_type column and populate it for existing lessons
-- This column stores the activity type as an array for consistency with other filter fields

-- Step 1: Convert activity_type from JSONB to TEXT[] if needed
-- Base schema has it as JSONB, but we need TEXT[] for consistency
DO $$
BEGIN
  -- Check if column is JSONB type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons'
      AND column_name = 'activity_type'
      AND data_type = 'jsonb'
  ) THEN
    -- Drop dependent view first
    DROP VIEW IF EXISTS lessons_with_metadata CASCADE;

    -- Drop and recreate as TEXT[]
    ALTER TABLE lessons DROP COLUMN activity_type;
    ALTER TABLE lessons ADD COLUMN activity_type TEXT[];

    -- Note: View will be recreated in migration 11_force_remove_security_definer.sql
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lessons' AND column_name = 'activity_type'
  ) THEN
    -- Column doesn't exist, add it
    ALTER TABLE lessons ADD COLUMN activity_type TEXT[];
  END IF;
END $$;

-- Step 2: Populate activity_type field for existing lessons based on skills
-- This derives the activity type from garden and cooking skills in metadata or dedicated columns
UPDATE lessons
SET activity_type =
  CASE
    -- Check metadata for skills (these are JSONB in base schema)
    -- Note: Simplified to only check metadata since dedicated columns are JSONB and may not have data
    WHEN (metadata->'cookingSkills' IS NOT NULL AND jsonb_array_length(metadata->'cookingSkills') > 0)
     AND (metadata->'gardenSkills' IS NOT NULL AND jsonb_array_length(metadata->'gardenSkills') > 0)
    THEN ARRAY['both']

    WHEN (metadata->'cookingSkills' IS NOT NULL AND jsonb_array_length(metadata->'cookingSkills') > 0)
    THEN ARRAY['cooking']

    WHEN (metadata->'gardenSkills' IS NOT NULL AND jsonb_array_length(metadata->'gardenSkills') > 0)
    THEN ARRAY['garden']

    -- Also check top-level JSONB columns (in case they have array data)
    WHEN (cooking_skills IS NOT NULL AND jsonb_typeof(cooking_skills) = 'array' AND jsonb_array_length(cooking_skills) > 0)
     AND (garden_skills IS NOT NULL AND jsonb_typeof(garden_skills) = 'array' AND jsonb_array_length(garden_skills) > 0)
    THEN ARRAY['both']

    WHEN (cooking_skills IS NOT NULL AND jsonb_typeof(cooking_skills) = 'array' AND jsonb_array_length(cooking_skills) > 0)
    THEN ARRAY['cooking']

    WHEN (garden_skills IS NOT NULL AND jsonb_typeof(garden_skills) = 'array' AND jsonb_array_length(garden_skills) > 0)
    THEN ARRAY['garden']

    -- Has neither - academic only
    ELSE ARRAY['academic']
  END
WHERE activity_type IS NULL;

-- Step 3: Add comment to document this
COMMENT ON COLUMN lessons.activity_type IS 'Activity type of the lesson: cooking, garden, both, or academic. Stored as array for consistency with other filter fields.';

-- Step 4: Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_lessons_activity_type ON lessons USING GIN(activity_type);