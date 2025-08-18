-- Migration: Convert Season & Timing to 4-season multi-select
-- This migration remaps existing season data to use only the 4 core seasons
-- and removes Year-round, Beginning of Year, and End of Year options

-- Step 1: Create a backup of current season_timing data
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS season_timing_backup TEXT[];
UPDATE lessons SET season_timing_backup = season_timing WHERE season_timing IS NOT NULL;

-- Step 2: Remap season data according to the new schema
UPDATE lessons
SET season_timing = 
  CASE
    -- Map "All Seasons" or "Year-round" to all 4 seasons
    WHEN 'All Seasons' = ANY(season_timing) OR 'Year-round' = ANY(season_timing) THEN
      ARRAY(
        SELECT DISTINCT elem FROM unnest(
          season_timing || ARRAY['Fall', 'Winter', 'Spring', 'Summer']
        ) AS elem
        WHERE elem NOT IN ('All Seasons', 'Year-round', 'Beginning of year', 'End of year')
      )
    
    -- Map "Beginning of year" to Fall (when it appears alone or with other seasons)
    WHEN 'Beginning of year' = ANY(season_timing) THEN
      ARRAY(
        SELECT DISTINCT elem FROM unnest(
          array_remove(array_remove(season_timing, 'Beginning of year'), 'All Seasons') || ARRAY['Fall']
        ) AS elem
        WHERE elem NOT IN ('Year-round', 'End of year')
      )
    
    -- Map "End of year" to Spring and Summer
    WHEN 'End of year' = ANY(season_timing) THEN
      ARRAY(
        SELECT DISTINCT elem FROM unnest(
          array_remove(array_remove(season_timing, 'End of year'), 'All Seasons') || ARRAY['Spring', 'Summer']
        ) AS elem
        WHERE elem NOT IN ('Year-round', 'Beginning of year')
      )
    
    -- Keep regular seasons as-is, just remove any non-season values
    ELSE
      ARRAY(
        SELECT DISTINCT elem FROM unnest(season_timing) AS elem
        WHERE elem IN ('Fall', 'Winter', 'Spring', 'Summer')
      )
  END
WHERE season_timing IS NOT NULL;

-- Step 3: Create index for better performance on the updated column
DROP INDEX IF EXISTS idx_lessons_season_timing;
CREATE INDEX idx_lessons_season_timing ON lessons USING GIN (season_timing);

-- Step 4: Add check constraint to ensure only valid seasons are stored
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
    -- If already an array, clean it up
    WHEN jsonb_typeof(tagged_metadata->'season') = 'array' THEN
      (
        SELECT jsonb_agg(value)
        FROM jsonb_array_elements_text(tagged_metadata->'season') AS value
        WHERE value IN ('Fall', 'Winter', 'Spring', 'Summer')
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