-- Consolidate cooking methods: merge 'no-cook' into 'basic-prep' and convert to array
-- This migration:
-- 1. Ensures cooking_methods column exists and is TEXT[] type
-- 2. Converts existing single values to arrays
-- 3. Replaces 'no-cook' with 'basic-prep'

-- Step 1: Ensure cooking_methods column exists as TEXT[] 
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS cooking_methods TEXT[];

-- Step 2: Migrate existing data from metadata if column is empty
UPDATE lessons
SET cooking_methods = 
  CASE 
    -- If metadata contains cookingMethods as a string
    WHEN metadata->'cookingMethods' IS NOT NULL AND jsonb_typeof(metadata->'cookingMethods') = 'string' THEN
      ARRAY[metadata->>'cookingMethods']::TEXT[]
    
    -- If metadata contains cookingMethods as an array
    WHEN metadata->'cookingMethods' IS NOT NULL AND jsonb_typeof(metadata->'cookingMethods') = 'array' THEN
      ARRAY(SELECT jsonb_array_elements_text(metadata->'cookingMethods'))
    
    -- No cooking methods in metadata
    ELSE NULL
  END
WHERE cooking_methods IS NULL OR array_length(cooking_methods, 1) IS NULL;

-- Step 3: Replace 'no-cook' with 'basic-prep' in the cooking_methods array
UPDATE lessons
SET cooking_methods = 
  CASE
    WHEN 'no-cook' = ANY(cooking_methods) THEN
      -- Remove 'no-cook' and add 'basic-prep' if not already present
      CASE
        WHEN 'basic-prep' = ANY(cooking_methods) THEN
          -- Already has basic-prep, just remove no-cook
          array_remove(cooking_methods, 'no-cook')
        ELSE
          -- Replace no-cook with basic-prep
          array_replace(cooking_methods, 'no-cook', 'basic-prep')
      END
    ELSE
      cooking_methods
  END
WHERE cooking_methods IS NOT NULL;

-- Step 4: Also update the metadata JSONB to reflect the change
UPDATE lessons
SET metadata = 
  CASE
    -- Handle string values
    WHEN metadata->'cookingMethods' = '"no-cook"' THEN
      jsonb_set(metadata, '{cookingMethods}', '["basic-prep"]'::jsonb)
    
    -- Handle array values containing no-cook
    WHEN metadata->'cookingMethods' IS NOT NULL AND jsonb_typeof(metadata->'cookingMethods') = 'array' THEN
      jsonb_set(
        metadata, 
        '{cookingMethods}',
        (
          SELECT jsonb_agg(
            CASE 
              WHEN elem::text = '"no-cook"' THEN '"basic-prep"'::jsonb
              ELSE elem
            END
          )
          FROM jsonb_array_elements(metadata->'cookingMethods') AS elem
          WHERE elem::text != '"no-cook"' OR elem::text = '"no-cook"' -- Include all, replacing no-cook
        )
      )
    
    ELSE metadata
  END
WHERE metadata->'cookingMethods' IS NOT NULL;

-- Step 5: Add comment to document this change
COMMENT ON COLUMN lessons.cooking_methods IS 'Cooking methods required for the lesson (multiple allowed): basic-prep, stovetop, oven. Consolidated from no-cook and basic-prep into just basic-prep.';

-- Step 6: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_lessons_cooking_methods ON lessons USING GIN(cooking_methods);

-- Verify the migration
DO $$
DECLARE
  no_cook_count INTEGER;
  basic_prep_count INTEGER;
BEGIN
  -- Check if any no-cook values remain
  SELECT COUNT(*) INTO no_cook_count
  FROM lessons
  WHERE 'no-cook' = ANY(cooking_methods);
  
  -- Count basic-prep entries
  SELECT COUNT(*) INTO basic_prep_count
  FROM lessons
  WHERE 'basic-prep' = ANY(cooking_methods);
  
  RAISE NOTICE 'Migration complete. Remaining no-cook entries: %, Basic-prep entries: %', 
    no_cook_count, basic_prep_count;
END $$;