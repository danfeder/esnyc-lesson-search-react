-- Migration: Update "Sensory exploration" to "Garden exploration" in garden skills
-- Date: 2025-01-18
-- Purpose: Rename the garden skill from "Sensory exploration" to "Garden exploration" for clarity

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

-- Also update if stored in the garden_skills array column (if any exist)
UPDATE lessons
SET garden_skills = array_replace(garden_skills, 'Sensory exploration', 'Garden exploration')
WHERE 'Sensory exploration' = ANY(garden_skills);

-- Update lowercase versions if they exist
UPDATE lessons
SET garden_skills = array_replace(garden_skills, 'sensory exploration', 'garden exploration')
WHERE 'sensory exploration' = ANY(garden_skills);

-- Log the changes
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count affected rows
  SELECT COUNT(*) INTO v_count
  FROM lessons
  WHERE metadata->'gardenSkills' @> '["Garden exploration"]'::jsonb
     OR 'Garden exploration' = ANY(garden_skills)
     OR 'garden exploration' = ANY(garden_skills);
  
  RAISE NOTICE 'Updated % lessons from "Sensory exploration" to "Garden exploration"', v_count;
END $$;