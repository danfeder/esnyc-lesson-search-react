-- Drop existing view and function
DROP VIEW IF EXISTS user_profiles_with_email;
DROP FUNCTION IF EXISTS get_user_profiles_with_email();

-- Create a function that returns user profiles with emails
-- Using SECURITY DEFINER to bypass RLS on auth.users
CREATE OR REPLACE FUNCTION get_user_profiles_with_email()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  role text,
  permissions jsonb,
  is_active boolean,
  school_name text,
  school_borough text,
  grades_taught text[],
  subjects_taught text[],
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  email text,
  auth_created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone
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

  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.role,
    p.permissions,
    p.is_active,
    p.school_name,
    p.school_borough,
    p.grades_taught,
    p.subjects_taught,
    p.created_at,
    p.updated_at,
    u.email,
    u.created_at as auth_created_at,
    u.last_sign_in_at
  FROM user_profiles p
  LEFT JOIN auth.users u ON p.id = u.id;
END;
$$;

-- Create a view that uses the function
CREATE OR REPLACE VIEW user_profiles_with_email AS
SELECT * FROM get_user_profiles_with_email();

-- Grant access to authenticated users (the function will check for admin)
GRANT SELECT ON user_profiles_with_email TO authenticated;

-- Add comment
COMMENT ON VIEW user_profiles_with_email IS 'View combining user_profiles with auth.users email for admin access only';
COMMENT ON FUNCTION get_user_profiles_with_email() IS 'Returns user profiles with emails from auth.users - admin only';