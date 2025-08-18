-- Migration: Update "Sensory exploration" to "Garden exploration" in garden skills
-- Date: 2025-01-18
-- Purpose: Rename the garden skill from "Sensory exploration" to "Garden exploration" for clarity

-- First, count how many records will be affected
DO $$
DECLARE
  v_metadata_count INTEGER;
  v_array_count INTEGER;
BEGIN
  -- Count lessons with "Sensory exploration" in metadata
  SELECT COUNT(*) INTO v_metadata_count
  FROM lessons
  WHERE metadata->'gardenSkills' @> '["Sensory exploration"]'::jsonb;
  
  -- Count lessons with "Sensory exploration" in array column
  SELECT COUNT(*) INTO v_array_count
  FROM lessons
  WHERE 'Sensory exploration' = ANY(garden_skills)
     OR 'sensory exploration' = ANY(garden_skills);
  
  RAISE NOTICE 'Found % lessons with "Sensory exploration" in metadata', v_metadata_count;
  RAISE NOTICE 'Found % lessons with "Sensory exploration" in array column', v_array_count;
END $$;

-- Update lessons with "Sensory exploration" in metadata.gardenSkills
UPDATE lessons
SET metadata = jsonb_set(
  metadata,
  '{gardenSkills}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN elem = 'Sensory exploration' THEN 'Garden exploration'
        ELSE elem
      END
    )
    FROM jsonb_array_elements_text(metadata->'gardenSkills') AS elem
  )
)
WHERE metadata->'gardenSkills' IS NOT NULL
  AND metadata->'gardenSkills' @> '["Sensory exploration"]'::jsonb;

-- Update if stored in the garden_skills array column
-- This handles both proper case and lowercase versions
UPDATE lessons
SET garden_skills = (
  SELECT array_agg(
    CASE 
      WHEN skill = 'Sensory exploration' THEN 'Garden exploration'
      WHEN skill = 'sensory exploration' THEN 'garden exploration'
      ELSE skill
    END
  )
  FROM unnest(garden_skills) AS skill
)
WHERE 'Sensory exploration' = ANY(garden_skills)
   OR 'sensory exploration' = ANY(garden_skills);

-- Final count of updated records
DO $$
DECLARE
  v_final_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_final_count
  FROM lessons
  WHERE metadata->'gardenSkills' @> '["Garden exploration"]'::jsonb
     OR 'Garden exploration' = ANY(garden_skills)
     OR 'garden exploration' = ANY(garden_skills);
  
  RAISE NOTICE 'Successfully updated % lessons to use "Garden exploration"', v_final_count;
END $$;