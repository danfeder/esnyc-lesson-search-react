-- Create table to track embedding generation failures for monitoring
CREATE TABLE IF NOT EXISTS embedding_generation_failures (
  id BIGSERIAL PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  error_message TEXT,
  error_code TEXT,
  attempt_number INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  -- Foreign key to lessons table
  CONSTRAINT fk_lesson
    FOREIGN KEY (lesson_id) 
    REFERENCES lessons(lesson_id)
    ON DELETE CASCADE
);

-- Add index for querying unresolved failures
CREATE INDEX idx_embedding_failures_unresolved 
ON embedding_generation_failures(lesson_id) 
WHERE resolved_at IS NULL;

-- Add index for time-based queries
CREATE INDEX idx_embedding_failures_created 
ON embedding_generation_failures(created_at DESC);

-- Enable RLS
ALTER TABLE embedding_generation_failures ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - only admins can view/manage
CREATE POLICY "Admins can view embedding failures" 
ON embedding_generation_failures FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "System can insert embedding failures" 
ON embedding_generation_failures FOR INSERT 
TO service_role
WITH CHECK (true);

CREATE POLICY "System can update embedding failures" 
ON embedding_generation_failures FOR UPDATE 
TO service_role
USING (true) 
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE embedding_generation_failures IS 'Tracks failures in embedding generation for monitoring and retry purposes';

-- ROLLBACK COMMANDS:
-- DROP TABLE IF EXISTS embedding_generation_failures CASCADE;