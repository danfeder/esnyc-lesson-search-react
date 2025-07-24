/*
  # Lesson Submission Pipeline Schema

  This migration adds the complete schema for the lesson submission and review system.
  
  SAFETY NOTES:
  - All changes are ADDITIVE only (no drops or modifications)
  - All new columns are nullable or have defaults
  - New tables don't affect existing data
  - Transaction wrapped for atomic changes
*/

BEGIN;

-- ============================================
-- PART 1: Modify existing tables (SAFE - additive only)
-- ============================================

-- Add new columns to lessons table
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS content_text TEXT,
ADD COLUMN IF NOT EXISTS content_embedding vector(1536),
ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS canonical_id TEXT,
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS has_versions BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_submission_id UUID;

-- Add role to user_profiles for reviewer permissions
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('teacher', 'reviewer', 'admin')) DEFAULT 'teacher';

-- ============================================
-- PART 2: Create new tables
-- ============================================

-- Table for lesson submissions awaiting review
CREATE TABLE IF NOT EXISTS lesson_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) NOT NULL,
  google_doc_url TEXT NOT NULL,
  google_doc_id TEXT NOT NULL,
  extracted_content TEXT,
  content_hash VARCHAR(64),
  content_embedding vector(1536),
  
  -- Submission metadata
  submission_type TEXT CHECK (submission_type IN ('new', 'update')) NOT NULL DEFAULT 'new',
  original_lesson_id TEXT REFERENCES lessons(lesson_id),
  
  -- Status tracking
  status TEXT CHECK (status IN ('submitted', 'in_review', 'needs_revision', 'approved')) NOT NULL DEFAULT 'submitted',
  reviewer_id UUID REFERENCES auth.users(id),
  review_started_at TIMESTAMPTZ,
  review_completed_at TIMESTAMPTZ,
  
  -- Reviewer feedback
  reviewer_notes TEXT,
  revision_requested_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for tracking review process and tagging
CREATE TABLE IF NOT EXISTS submission_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES lesson_submissions(id) NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Tagged metadata (matches lesson metadata structure)
  tagged_metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Duplicate detection results
  detected_duplicates JSONB DEFAULT '[]', -- Array of {lesson_id, similarity_score, match_type}
  canonical_lesson_id TEXT, -- If marking as version of existing
  
  -- Review process
  review_started_at TIMESTAMPTZ DEFAULT NOW(),
  review_completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for archiving lesson versions
CREATE TABLE IF NOT EXISTS lesson_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  
  -- Snapshot of lesson data at this version
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  file_link TEXT NOT NULL,
  grade_levels TEXT[] NOT NULL,
  metadata JSONB NOT NULL,
  content_text TEXT,
  
  -- Version metadata
  archived_from_submission_id UUID REFERENCES lesson_submissions(id),
  archived_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archive_reason TEXT,
  
  UNIQUE(lesson_id, version_number)
);

-- Table for storing similarity calculations
CREATE TABLE IF NOT EXISTS submission_similarities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES lesson_submissions(id) NOT NULL,
  lesson_id TEXT NOT NULL,
  
  -- Similarity metrics
  title_similarity FLOAT CHECK (title_similarity >= 0 AND title_similarity <= 1),
  content_similarity FLOAT CHECK (content_similarity >= 0 AND content_similarity <= 1),
  metadata_overlap_score FLOAT CHECK (metadata_overlap_score >= 0 AND metadata_overlap_score <= 1),
  combined_score FLOAT CHECK (combined_score >= 0 AND combined_score <= 1),
  
  -- Match details
  match_type TEXT CHECK (match_type IN ('exact', 'high', 'medium', 'low')),
  match_details JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 3: Create indexes for performance
-- ============================================

-- Indexes for lesson_submissions
CREATE INDEX IF NOT EXISTS idx_submissions_status ON lesson_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_teacher ON lesson_submissions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_submissions_hash ON lesson_submissions(content_hash);
CREATE INDEX IF NOT EXISTS idx_submissions_google_doc_id ON lesson_submissions(google_doc_id);

-- Indexes for submission_reviews
CREATE INDEX IF NOT EXISTS idx_reviews_submission ON submission_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON submission_reviews(reviewer_id);

-- Indexes for lesson_versions
CREATE INDEX IF NOT EXISTS idx_versions_lesson_id ON lesson_versions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_versions_submission ON lesson_versions(archived_from_submission_id);

-- Indexes for submission_similarities
CREATE INDEX IF NOT EXISTS idx_similarities_submission ON submission_similarities(submission_id);
CREATE INDEX IF NOT EXISTS idx_similarities_score ON submission_similarities(combined_score DESC);

-- Indexes for new columns on lessons table
CREATE INDEX IF NOT EXISTS idx_lessons_canonical ON lessons(canonical_id) WHERE canonical_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_hash ON lessons(content_hash) WHERE content_hash IS NOT NULL;

-- Vector similarity index (requires pgvector extension)
-- Note: Only create if pgvector is installed
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    -- Index for lesson embeddings
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_lessons_embedding') THEN
      CREATE INDEX idx_lessons_embedding ON lessons 
      USING ivfflat (content_embedding vector_cosine_ops)
      WITH (lists = 100);
    END IF;
    
    -- Index for submission embeddings
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_submissions_embedding') THEN
      CREATE INDEX idx_submissions_embedding ON lesson_submissions 
      USING ivfflat (content_embedding vector_cosine_ops)
      WITH (lists = 50);
    END IF;
  END IF;
END $$;

-- ============================================
-- PART 4: Update triggers for timestamps
-- ============================================

-- Trigger for lesson_submissions updated_at
CREATE OR REPLACE FUNCTION update_lesson_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lesson_submissions_updated_at ON lesson_submissions;
CREATE TRIGGER trigger_lesson_submissions_updated_at
  BEFORE UPDATE ON lesson_submissions
  FOR EACH ROW EXECUTE FUNCTION update_lesson_submissions_updated_at();

-- ============================================
-- PART 5: Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE lesson_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_similarities ENABLE ROW LEVEL SECURITY;

-- Policies for lesson_submissions
CREATE POLICY "Teachers can view own submissions"
  ON lesson_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Reviewers can view all submissions"
  ON lesson_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('reviewer', 'admin')
    )
  );

CREATE POLICY "Teachers can create submissions"
  ON lesson_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Reviewers can update submissions"
  ON lesson_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('reviewer', 'admin')
    )
  );

-- Policies for submission_reviews
CREATE POLICY "Reviewers can manage reviews"
  ON submission_reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('reviewer', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('reviewer', 'admin')
    )
  );

-- Policies for lesson_versions (public read, admin write)
CREATE POLICY "Everyone can view lesson versions"
  ON lesson_versions FOR SELECT
  USING (true);

CREATE POLICY "Only admins can create versions"
  ON lesson_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policies for submission_similarities
CREATE POLICY "Reviewers can view similarities"
  ON submission_similarities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('reviewer', 'admin')
    )
  );

CREATE POLICY "System can manage similarities"
  ON submission_similarities FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- PART 6: Helper functions
-- ============================================

-- Function to find similar lessons by content hash
CREATE OR REPLACE FUNCTION find_lessons_by_hash(hash_value VARCHAR(64))
RETURNS TABLE (
  lesson_id TEXT,
  title TEXT,
  match_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.lesson_id,
    l.title,
    'exact'::TEXT as match_type
  FROM lessons l
  WHERE l.content_hash = hash_value;
END;
$$ LANGUAGE plpgsql;

-- Function to find similar lessons by embedding (requires pgvector)
CREATE OR REPLACE FUNCTION find_similar_lessons_by_embedding(
  query_embedding vector(1536),
  similarity_threshold FLOAT DEFAULT 0.5,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  lesson_id TEXT,
  title TEXT,
  similarity_score FLOAT,
  match_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.lesson_id,
    l.title,
    1 - (l.content_embedding <=> query_embedding) as similarity_score,
    CASE 
      WHEN 1 - (l.content_embedding <=> query_embedding) >= 0.95 THEN 'exact'
      WHEN 1 - (l.content_embedding <=> query_embedding) >= 0.85 THEN 'high'
      WHEN 1 - (l.content_embedding <=> query_embedding) >= 0.70 THEN 'medium'
      ELSE 'low'
    END as match_type
  FROM lessons l
  WHERE l.content_embedding IS NOT NULL
    AND 1 - (l.content_embedding <=> query_embedding) >= similarity_threshold
  ORDER BY l.content_embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 7: Verification queries (commented out)
-- ============================================

/*
-- Run these after migration to verify success:

-- Check new columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lessons' 
AND column_name IN ('content_text', 'content_embedding', 'content_hash');

-- Check new tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('lesson_submissions', 'submission_reviews', 'lesson_versions', 'submission_similarities');

-- Check indexes were created
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('lessons', 'lesson_submissions', 'submission_reviews');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('lesson_submissions', 'submission_reviews', 'lesson_versions');
*/

COMMIT;

-- ============================================
-- ROLLBACK SCRIPT (save separately)
-- ============================================
/*
-- In case we need to rollback:

BEGIN;

-- Drop new columns from lessons
ALTER TABLE lessons 
DROP COLUMN IF EXISTS content_text,
DROP COLUMN IF EXISTS content_embedding,
DROP COLUMN IF EXISTS content_hash,
DROP COLUMN IF EXISTS canonical_id,
DROP COLUMN IF EXISTS version_number,
DROP COLUMN IF EXISTS has_versions,
DROP COLUMN IF EXISTS original_submission_id;

-- Drop role column from user_profiles
ALTER TABLE user_profiles DROP COLUMN IF EXISTS role;

-- Drop new tables
DROP TABLE IF EXISTS submission_similarities CASCADE;
DROP TABLE IF EXISTS lesson_versions CASCADE;
DROP TABLE IF EXISTS submission_reviews CASCADE;
DROP TABLE IF EXISTS lesson_submissions CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS find_lessons_by_hash(VARCHAR);
DROP FUNCTION IF EXISTS find_similar_lessons_by_embedding(vector, FLOAT, INTEGER);
DROP FUNCTION IF EXISTS update_lesson_submissions_updated_at();

COMMIT;
*/