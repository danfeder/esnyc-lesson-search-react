/*
  # Create ESNYC Lesson Library Database Schema

  1. New Tables
    - `lessons`
      - `id` (uuid, primary key)
      - `lesson_id` (text, unique identifier from original data)
      - `title` (text, lesson title)
      - `summary` (text, lesson description)
      - `file_link` (text, link to lesson plan document)
      - `grade_levels` (text array, supported grade levels)
      - `metadata` (jsonb, all lesson metadata)
      - `confidence` (jsonb, confidence scores for data quality)
      - `search_vector` (tsvector, for full-text search)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `user_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `full_name` (text)
      - `school` (text, optional)
      - `grades_taught` (text array)
      - `subjects` (text array)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `saved_searches`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text, user-defined name for search)
      - `filters` (jsonb, saved filter configuration)
      - `created_at` (timestamptz)

    - `lesson_collections`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text, collection name)
      - `description` (text, optional)
      - `lesson_ids` (text array, references lessons.lesson_id)
      - `is_public` (boolean, whether collection is shareable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `bookmarks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `lesson_id` (text, references lessons.lesson_id)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Public read access for lessons
    - User-specific access for profiles, searches, collections, bookmarks

  3. Search & Performance
    - Full-text search using PostgreSQL tsvector
    - Indexes on commonly queried fields
    - GIN indexes for array and JSONB columns
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id text UNIQUE NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  file_link text NOT NULL,
  grade_levels text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}',
  confidence jsonb NOT NULL DEFAULT '{}',
  search_vector tsvector,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  school text,
  grades_taught text[] DEFAULT '{}',
  subjects text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create lesson collections table
CREATE TABLE IF NOT EXISTS lesson_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  lesson_ids text[] DEFAULT '{}',
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id text NOT NULL REFERENCES lessons(lesson_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lessons_grade_levels ON lessons USING GIN (grade_levels);
CREATE INDEX IF NOT EXISTS idx_lessons_metadata ON lessons USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_lessons_search_vector ON lessons USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_lessons_title ON lessons USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lessons_summary ON lessons USING GIN (summary gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches (user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_collections_user_id ON lesson_collections (user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks (user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_lesson_id ON bookmarks (lesson_id);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_lesson_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.metadata->>'ingredients', '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.metadata->>'skills', '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.metadata->>'thematicCategory', '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW.metadata->>'culturalHeritage', '')), 'D');
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search vector updates
DROP TRIGGER IF EXISTS trigger_update_lesson_search_vector ON lessons;
CREATE TRIGGER trigger_update_lesson_search_vector
  BEFORE INSERT OR UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_lesson_search_vector();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_lesson_collections_updated_at
  BEFORE UPDATE ON lesson_collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lessons (public read access)
CREATE POLICY "Lessons are viewable by everyone"
  ON lessons
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert lessons"
  ON lessons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND (metadata->>'role' = 'admin' OR metadata->>'role' = 'editor')
    )
  );

CREATE POLICY "Only admins can update lessons"
  ON lessons
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND (metadata->>'role' = 'admin' OR metadata->>'role' = 'editor')
    )
  );

-- RLS Policies for user profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for saved searches
CREATE POLICY "Users can manage own saved searches"
  ON saved_searches
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for lesson collections
CREATE POLICY "Users can view own collections and public collections"
  ON lesson_collections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can manage own collections"
  ON lesson_collections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON lesson_collections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON lesson_collections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for bookmarks
CREATE POLICY "Users can manage own bookmarks"
  ON bookmarks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);