-- Backup current content hashes before regeneration
-- This preserves the old metadata-based hashes for rollback if needed

-- Create backup table with timestamp
CREATE TABLE IF NOT EXISTS content_hash_backup_20250807 (
  lesson_id TEXT PRIMARY KEY,
  old_content_hash TEXT NOT NULL,
  backed_up_at TIMESTAMPTZ DEFAULT NOW()
);

-- Copy current hashes to backup table
INSERT INTO content_hash_backup_20250807 (lesson_id, old_content_hash)
SELECT lesson_id, content_hash
FROM lessons
WHERE content_hash IS NOT NULL
ON CONFLICT (lesson_id) DO NOTHING;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_hash_backup_lesson_id 
ON content_hash_backup_20250807(lesson_id);

-- Verify backup was successful
DO $$
DECLARE
  original_count INTEGER;
  backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO original_count FROM lessons WHERE content_hash IS NOT NULL;
  SELECT COUNT(*) INTO backup_count FROM content_hash_backup_20250807;
  
  IF original_count != backup_count THEN
    RAISE EXCEPTION 'Backup verification failed. Original: %, Backup: %', 
      original_count, backup_count;
  END IF;
  
  RAISE NOTICE 'Successfully backed up % content hashes', backup_count;
END $$;

-- Add comment for documentation
COMMENT ON TABLE content_hash_backup_20250807 IS 
  'Backup of content_hash values before fixing hash generation bug. 
   Original hashes were based on metadata only, not actual content.
   Created as part of fix/content-hash-generation branch.';