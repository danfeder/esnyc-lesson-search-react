-- Debug function to check what's happening with user emails
CREATE OR REPLACE FUNCTION debug_user_email(user_id uuid)
RETURNS TABLE (
  source text,
  id uuid,
  email text,
  details jsonb
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check auth.users
  RETURN QUERY
  SELECT 
    'auth.users'::text as source,
    u.id,
    u.email::text,
    jsonb_build_object(
      'created_at', u.created_at,
      'email_confirmed_at', u.email_confirmed_at,
      'raw_user_meta_data', u.raw_user_meta_data
    ) as details
  FROM auth.users u
  WHERE u.id = user_id;

  -- Check user_profiles
  RETURN QUERY
  SELECT 
    'user_profiles'::text as source,
    p.id,
    p.email::text,
    jsonb_build_object(
      'full_name', p.full_name,
      'role', p.role,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    ) as details
  FROM user_profiles p
  WHERE p.id = user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION debug_user_email(uuid) TO authenticated;

COMMENT ON FUNCTION debug_user_email(uuid) IS 'Debug function to check user email presence in both tables';