-- Add email column to user_profiles as a fallback
-- This ensures we can always display an email even if auth.users is out of sync

-- Add email column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create an index on email for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Update the get_user_emails function to check both auth.users and user_profiles
CREATE OR REPLACE FUNCTION get_user_emails(user_ids uuid[])
RETURNS TABLE (
  id uuid,
  email varchar(255)
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only admins can access this function
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Return emails from auth.users first, then fallback to user_profiles
  RETURN QUERY
  SELECT DISTINCT ON (combined.id)
    combined.id,
    combined.email::varchar(255)
  FROM (
    -- Get emails from auth.users
    SELECT 
      u.id,
      u.email
    FROM auth.users u
    WHERE u.id = ANY(user_ids)
    
    UNION ALL
    
    -- Get emails from user_profiles as fallback
    SELECT 
      p.id,
      p.email
    FROM user_profiles p
    WHERE p.id = ANY(user_ids) AND p.email IS NOT NULL
  ) AS combined
  ORDER BY combined.id, 
    CASE 
      WHEN combined.email IS NOT NULL THEN 0 
      ELSE 1 
    END;
END;
$$;

-- Comment on the new column
COMMENT ON COLUMN user_profiles.email IS 'User email - fallback when auth.users email is not accessible';