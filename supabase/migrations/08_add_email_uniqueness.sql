-- =====================================================
-- 08. ADD EMAIL UNIQUENESS CONSTRAINT
-- =====================================================
-- This migration adds a unique constraint to the email
-- column in user_profiles table to ensure data integrity
-- at the database level.
-- Date: 2025-08-03

-- Add unique constraint on email column
-- Using a partial unique index to allow multiple NULL values
-- (since not all users may have email addresses initially)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_email_unique 
ON user_profiles(email) 
WHERE email IS NOT NULL;

-- Add comment for documentation
COMMENT ON INDEX idx_user_profiles_email_unique IS 
'Ensures email uniqueness in user_profiles table while allowing multiple NULL email values for users who haven''t provided email yet';

-- Verify the constraint was created successfully
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles' 
        AND indexname = 'idx_user_profiles_email_unique'
    ) THEN
        RAISE EXCEPTION 'Failed to create email uniqueness index';
    END IF;
END $$;

-- =====================================================
-- ROLLBACK COMMANDS (commented for safety)
-- =====================================================
-- To rollback this migration, run:
-- DROP INDEX IF EXISTS idx_user_profiles_email_unique;