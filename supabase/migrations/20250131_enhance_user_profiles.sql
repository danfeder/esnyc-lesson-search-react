-- Enhance user_profiles table with additional fields for user management
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS school_name TEXT,
ADD COLUMN IF NOT EXISTS school_borough TEXT CHECK (school_borough IN ('Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island')),
ADD COLUMN IF NOT EXISTS grades_taught TEXT[],
ADD COLUMN IF NOT EXISTS subjects_taught TEXT[],
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_school_borough ON user_profiles(school_borough);

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.invited_by IS 'UUID of the user who invited this user';
COMMENT ON COLUMN user_profiles.invited_at IS 'Timestamp when the invitation was sent';
COMMENT ON COLUMN user_profiles.accepted_at IS 'Timestamp when the user accepted the invitation';
COMMENT ON COLUMN user_profiles.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN user_profiles.school_name IS 'Name of the school where the user teaches';
COMMENT ON COLUMN user_profiles.school_borough IS 'NYC borough where the school is located';
COMMENT ON COLUMN user_profiles.grades_taught IS 'Array of grade levels the user teaches';
COMMENT ON COLUMN user_profiles.subjects_taught IS 'Array of subjects the user teaches';
COMMENT ON COLUMN user_profiles.notes IS 'Admin notes about the user';
COMMENT ON COLUMN user_profiles.permissions IS 'Custom permissions override (JSON object)';