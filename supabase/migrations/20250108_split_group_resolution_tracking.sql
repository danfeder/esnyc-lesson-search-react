-- Add support for split group resolutions in duplicate detection
-- This allows marking duplicate groups as containing multiple distinct approaches
-- that should be kept as separate canonical lessons

-- Add columns to track resolution mode and sub-groups
ALTER TABLE duplicate_resolutions 
ADD COLUMN IF NOT EXISTS resolution_mode text DEFAULT 'single',
ADD COLUMN IF NOT EXISTS sub_group_name text,
ADD COLUMN IF NOT EXISTS parent_group_id text;

-- Create an index for finding split resolutions
CREATE INDEX IF NOT EXISTS idx_duplicate_resolutions_mode 
ON duplicate_resolutions(resolution_mode) 
WHERE resolution_mode = 'split';

-- Add comment explaining the modes
COMMENT ON COLUMN duplicate_resolutions.resolution_mode IS 
'Resolution mode: single (one canonical), split (multiple canonicals), keep_all (no archiving)';

COMMENT ON COLUMN duplicate_resolutions.sub_group_name IS 
'For split resolutions, the name of the sub-group this resolution belongs to';

COMMENT ON COLUMN duplicate_resolutions.parent_group_id IS 
'For split resolutions, the original group_id that was split';

-- Note: The resolve_duplicate_group function is updated in 20250108_complete_resolution_fix.sql