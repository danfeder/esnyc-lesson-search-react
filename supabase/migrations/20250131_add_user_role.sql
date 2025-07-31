-- Add role column to user_profiles if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('teacher', 'reviewer', 'admin')) DEFAULT 'teacher';

-- Update your user to be an admin for testing
-- Replace the email with your actual email
UPDATE user_profiles 
SET role = 'admin' 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email = 'dan@example.com'  -- Replace with your email
);

-- Comment on the column
COMMENT ON COLUMN user_profiles.role IS 'User role: teacher (default), reviewer, or admin';