-- Create a view that combines user_profiles with auth.users email
-- This allows us to query user data with emails in a single request

CREATE OR REPLACE VIEW user_profiles_with_email AS
SELECT 
  p.*,
  u.email,
  u.created_at as auth_created_at,
  u.last_sign_in_at
FROM user_profiles p
LEFT JOIN auth.users u ON p.id = u.id;

-- Grant appropriate permissions
GRANT SELECT ON user_profiles_with_email TO authenticated;

-- Add RLS policies for the view
ALTER VIEW user_profiles_with_email SET (security_invoker = true);

-- Add comment
COMMENT ON VIEW user_profiles_with_email IS 'View combining user_profiles with auth.users email for easier querying';