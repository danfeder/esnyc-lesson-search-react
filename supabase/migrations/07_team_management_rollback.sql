-- Rollback migration for 07_team_management.sql
-- This file contains the DOWN migration to safely rollback team management tables

-- Drop RLS policies first
DROP POLICY IF EXISTS "Schools are viewable by authenticated users" ON schools;
DROP POLICY IF EXISTS "Only admins can insert schools" ON schools;
DROP POLICY IF EXISTS "Only admins can update schools" ON schools;
DROP POLICY IF EXISTS "Only admins can delete schools" ON schools;

DROP POLICY IF EXISTS "User-school relationships are viewable by authenticated users" ON user_schools;
DROP POLICY IF EXISTS "Only admins can manage user-school relationships" ON user_schools;

-- Drop indexes
DROP INDEX IF EXISTS idx_schools_name;
DROP INDEX IF EXISTS idx_user_schools_user_id;
DROP INDEX IF EXISTS idx_user_schools_school_id;

-- Drop tables (cascade will handle foreign key constraints)
DROP TABLE IF EXISTS user_schools CASCADE;
DROP TABLE IF EXISTS schools CASCADE;

-- Note: This rollback will permanently delete all school data and user-school associations
-- Make sure to backup any important data before running this rollback