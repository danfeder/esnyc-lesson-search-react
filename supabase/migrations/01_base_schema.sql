-- =====================================================
-- 01. BASE SCHEMA - Core Tables and Initial Setup
-- =====================================================
-- This migration consolidates all base table definitions
-- from multiple migration files into a single, organized structure

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =====================================================
-- LESSONS TABLE - Core lesson data
-- =====================================================
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Basic Information
  title TEXT NOT NULL,
  summary TEXT,
  duration_in_minutes INTEGER,
  group_size TEXT,
  location TEXT,
  
  -- Content
  big_idea TEXT,
  essential_question TEXT,
  materials TEXT,
  directions JSONB,
  student_thinking JSONB,
  
  -- Skills and Categories
  skills JSONB,
  themes_and_topics JSONB,
  activity_type JSONB,
  
  -- Additional Fields
  season TEXT,
  grade_level JSONB,
  ingredients JSONB,
  garden_skills JSONB,
  cooking_skills JSONB,
  core_competencies JSONB,
  academic_integration JSONB,
  social_emotional_learning JSONB,
  observances_and_holidays JSONB,
  lesson_format TEXT,
  cooking_method TEXT,
  cultural_heritage JSONB,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  gdoc_url TEXT,
  content_hash TEXT,
  review_status TEXT DEFAULT 'pending',
  notes TEXT,
  
  -- Search and Duplicate Detection
  search_vector tsvector,
  content_embedding vector(1536),
  
  -- Granular metadata columns for performance
  theme_garden_basics BOOLEAN DEFAULT false,
  theme_plant_growth BOOLEAN DEFAULT false,
  theme_garden_communities BOOLEAN DEFAULT false,
  theme_ecosystems BOOLEAN DEFAULT false,
  theme_seed_to_table BOOLEAN DEFAULT false,
  theme_food_systems BOOLEAN DEFAULT false,
  theme_food_justice BOOLEAN DEFAULT false,
  
  -- Academic integration columns
  academic_math BOOLEAN DEFAULT false,
  academic_science BOOLEAN DEFAULT false,
  academic_literacy_ela BOOLEAN DEFAULT false,
  academic_social_studies BOOLEAN DEFAULT false,
  academic_health BOOLEAN DEFAULT false,
  academic_arts BOOLEAN DEFAULT false,
  
  -- SEL columns
  sel_self_awareness BOOLEAN DEFAULT false,
  sel_self_management BOOLEAN DEFAULT false,
  sel_social_awareness BOOLEAN DEFAULT false,
  sel_relationship_skills BOOLEAN DEFAULT false,
  sel_responsible_decision_making BOOLEAN DEFAULT false,
  
  -- Core competency columns
  competency_growing_food BOOLEAN DEFAULT false,
  competency_preparing_food BOOLEAN DEFAULT false,
  competency_healthy_choices BOOLEAN DEFAULT false,
  competency_nature_exploration BOOLEAN DEFAULT false,
  competency_community_building BOOLEAN DEFAULT false,
  competency_cultural_connections BOOLEAN DEFAULT false,
  
  -- Tracking
  last_modified TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- USER PROFILES TABLE - Enhanced user management
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- User Information
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'teacher' CHECK (role IN ('teacher', 'reviewer', 'admin', 'super_admin')),
  
  -- School Information
  school_name TEXT,
  school_borough TEXT,
  grades_taught JSONB,
  subjects_taught JSONB,
  
  -- Account Status
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  notes TEXT,
  
  -- Invitation Tracking
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  
  UNIQUE(email)
);

-- =====================================================
-- LESSON SUBMISSIONS TABLE - User-submitted lessons
-- =====================================================
CREATE TABLE IF NOT EXISTS lesson_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Submission Info
  teacher_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected')),
  
  -- Lesson Data (mirrors lessons table structure)
  title TEXT NOT NULL,
  summary TEXT,
  duration_in_minutes INTEGER,
  group_size TEXT,
  location TEXT,
  big_idea TEXT,
  essential_question TEXT,
  materials TEXT,
  directions JSONB,
  student_thinking JSONB,
  skills JSONB,
  themes_and_topics JSONB,
  activity_type JSONB,
  season TEXT,
  grade_level JSONB,
  ingredients JSONB,
  garden_skills JSONB,
  cooking_skills JSONB,
  core_competencies JSONB,
  academic_integration JSONB,
  social_emotional_learning JSONB,
  observances_and_holidays JSONB,
  lesson_format TEXT,
  cooking_method TEXT,
  cultural_heritage JSONB,
  
  -- Review Process
  submitted_at TIMESTAMPTZ,
  review_started_at TIMESTAMPTZ,
  review_completed_at TIMESTAMPTZ,
  approved_lesson_id UUID REFERENCES lessons(id),
  
  -- AI Processing
  ai_review_status TEXT DEFAULT 'pending',
  ai_feedback JSONB,
  ai_score NUMERIC(3,2),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- SUBMISSION REVIEWS TABLE - Review tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS submission_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  submission_id UUID REFERENCES lesson_submissions(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id),
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  feedback TEXT,
  internal_notes TEXT,
  
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- Create update timestamp trigger function
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to all tables with updated_at
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_submissions_updated_at BEFORE UPDATE ON lesson_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Performance Indexes
-- =====================================================

-- Index for efficient submission queries by status and teacher
CREATE INDEX IF NOT EXISTS idx_submissions_status_teacher 
ON lesson_submissions(status, teacher_id);