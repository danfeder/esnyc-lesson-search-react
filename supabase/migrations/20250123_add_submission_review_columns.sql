-- Add missing columns to lesson_submissions table for tracking review status
ALTER TABLE lesson_submissions 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);