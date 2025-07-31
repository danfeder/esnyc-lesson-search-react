-- Create a function to get user emails for admins only
-- This bypasses the cross-schema join limitation

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

  RETURN QUERY
  SELECT 
    u.id,
    u.email
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
END;
$$;

-- Grant execute permission to authenticated users (function will check for admin)
GRANT EXECUTE ON FUNCTION get_user_emails(uuid[]) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_user_emails(uuid[]) IS 'Returns emails for given user IDs - admin only';