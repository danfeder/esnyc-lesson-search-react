-- Migration: Convert Season & Timing to 4-season multi-select
-- This migration remaps existing season data to use only the 4 core seasons
-- and removes Year-round, Beginning of Year, and End of Year options

-- Step 1: Create a backup of current season_timing data
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS season_timing_backup TEXT[];
UPDATE lessons SET season_timing_backup = season_timing WHERE season_timing IS NOT NULL;

-- Step 2: Remap season data according to the new schema
-- This approach handles all mappings in a single pass to avoid missing combinations
UPDATE lessons
SET season_timing = (
  -- Build array, UNION already handles duplicates
  SELECT ARRAY(
    SELECT DISTINCT season FROM (
      -- Start with any existing core seasons
      SELECT elem AS season
      FROM unnest(season_timing) AS elem
      WHERE elem IN ('Fall', 'Winter', 'Spring', 'Summer')
      
      UNION
      
      -- Add all four seasons if 'All Seasons' or 'Year-round' is present
      SELECT unnest(ARRAY['Fall', 'Winter', 'Spring', 'Summer']) AS season
      WHERE 'All Seasons' = ANY(season_timing) OR 'Year-round' = ANY(season_timing)
      
      UNION
      
      -- Add Fall if 'Beginning of year' is present
      SELECT 'Fall' AS season
      WHERE 'Beginning of year' = ANY(season_timing)
      
      UNION
      
      -- Add Spring and Summer if 'End of year' is present  
      SELECT unnest(ARRAY['Spring', 'Summer']) AS season
      WHERE 'End of year' = ANY(season_timing)
    ) AS all_seasons
  )
)
WHERE season_timing IS NOT NULL;

-- Step 3: Create index for better performance on the updated column
DROP INDEX IF EXISTS idx_lessons_season_timing;
CREATE INDEX idx_lessons_season_timing ON lessons USING GIN (season_timing);

-- Step 4: Add check constraint to ensure only valid seasons are stored
-- Drop existing constraint if it exists (in case of re-running migration)
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS valid_seasons;
ALTER TABLE lessons 
ADD CONSTRAINT valid_seasons 
CHECK (
  season_timing IS NULL OR
  season_timing <@ ARRAY['Fall', 'Winter', 'Spring', 'Summer']::TEXT[]
);

-- Step 5: Update submission_reviews tagged_metadata to convert season from string to array
UPDATE submission_reviews
SET tagged_metadata = jsonb_set(
  tagged_metadata,
  '{season}',
  CASE
    -- If season is a string, convert to array
    WHEN jsonb_typeof(tagged_metadata->'season') = 'string' THEN
      CASE 
        WHEN tagged_metadata->>'season' IN ('All Seasons', 'Year-round') THEN
          '["Fall", "Winter", "Spring", "Summer"]'::jsonb
        WHEN tagged_metadata->>'season' = 'Beginning of year' THEN
          '["Fall"]'::jsonb
        WHEN tagged_metadata->>'season' = 'End of year' THEN
          '["Spring", "Summer"]'::jsonb
        WHEN tagged_metadata->>'season' IS NOT NULL AND tagged_metadata->>'season' != '' THEN
          jsonb_build_array(tagged_metadata->>'season')
        ELSE
          '[]'::jsonb
      END
    -- If already an array, remap deprecated values and clean it up
    WHEN jsonb_typeof(tagged_metadata->'season') = 'array' THEN
      (
        SELECT to_jsonb(ARRAY(
          SELECT DISTINCT season FROM (
            SELECT unnest(
              CASE value
                WHEN 'All Seasons' THEN ARRAY['Fall', 'Winter', 'Spring', 'Summer']
                WHEN 'Year-round' THEN ARRAY['Fall', 'Winter', 'Spring', 'Summer']
                WHEN 'Beginning of year' THEN ARRAY['Fall']
                WHEN 'End of year' THEN ARRAY['Spring', 'Summer']
                WHEN 'Fall' THEN ARRAY['Fall']
                WHEN 'Winter' THEN ARRAY['Winter']
                WHEN 'Spring' THEN ARRAY['Spring']
                WHEN 'Summer' THEN ARRAY['Summer']
                ELSE ARRAY[]::text[]
              END
            ) AS season
            FROM jsonb_array_elements_text(tagged_metadata->'season') AS value
          ) AS all_seasons
          WHERE season IS NOT NULL
        ))
      )
    ELSE
      '[]'::jsonb
  END
)
WHERE tagged_metadata ? 'season';

-- Note: To rollback this migration, run:
-- UPDATE lessons SET season_timing = season_timing_backup WHERE season_timing_backup IS NOT NULL;
-- ALTER TABLE lessons DROP COLUMN season_timing_backup;
-- ALTER TABLE lessons DROP CONSTRAINT IF EXISTS valid_seasons;
-- UPDATE submission_reviews SET tagged_metadata = jsonb_set(tagged_metadata, '{season}', to_jsonb(tagged_metadata->'season'->>0)) WHERE jsonb_typeof(tagged_metadata->'season') = 'array';