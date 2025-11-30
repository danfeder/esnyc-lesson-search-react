-- Test migration to verify the approval workflow
-- This adds a harmless comment to the lessons table

COMMENT ON TABLE lessons IS 'Core lesson content table - stores all lesson plans with metadata and search indexes';
