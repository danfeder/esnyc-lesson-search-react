-- Add activity_type column and populate it for existing lessons
-- This column stores the activity type as an array for consistency with other filter fields

-- Step 1: Add the activity_type column if it doesn't exist
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS activity_type TEXT[];

-- Step 2: Populate activity_type field for existing lessons based on skills
-- This derives the activity type from garden and cooking skills in metadata or dedicated columns
UPDATE lessons
SET activity_type = 
  CASE 
    -- First check dedicated columns (if they exist and have data)
    WHEN (cooking_skills IS NOT NULL AND array_length(cooking_skills, 1) > 0) 
     AND (garden_skills IS NOT NULL AND array_length(garden_skills, 1) > 0)
    THEN ARRAY['both']
    
    WHEN (cooking_skills IS NOT NULL AND array_length(cooking_skills, 1) > 0)
    THEN ARRAY['cooking']
    
    WHEN (garden_skills IS NOT NULL AND array_length(garden_skills, 1) > 0)
    THEN ARRAY['garden']
    
    -- Fall back to checking metadata if columns are empty
    WHEN (metadata->'cookingSkills' IS NOT NULL AND jsonb_array_length(metadata->'cookingSkills') > 0) 
     AND (metadata->'gardenSkills' IS NOT NULL AND jsonb_array_length(metadata->'gardenSkills') > 0)
    THEN ARRAY['both']
    
    WHEN (metadata->'cookingSkills' IS NOT NULL AND jsonb_array_length(metadata->'cookingSkills') > 0)
    THEN ARRAY['cooking']
    
    WHEN (metadata->'gardenSkills' IS NOT NULL AND jsonb_array_length(metadata->'gardenSkills') > 0)
    THEN ARRAY['garden']
    
    -- Has neither - academic only
    ELSE ARRAY['academic']
  END
WHERE activity_type IS NULL OR array_length(activity_type, 1) IS NULL;

-- Step 3: Add comment to document this
COMMENT ON COLUMN lessons.activity_type IS 'Activity type of the lesson: cooking, garden, both, or academic. Stored as array for consistency with other filter fields.';

-- Step 4: Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_lessons_activity_type ON lessons USING GIN(activity_type);