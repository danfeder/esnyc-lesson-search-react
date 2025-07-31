-- Make a user an admin by bypassing RLS
-- Replace the email with your actual email address

DO $$
DECLARE
  target_user_id UUID;
  target_email TEXT := 'df@esynyc.org'; -- CHANGE THIS TO YOUR EMAIL
BEGIN
  -- Get the user ID for the email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', target_email;
  END IF;
  
  -- Update the user's role to admin
  UPDATE user_profiles
  SET 
    role = 'admin',
    updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Log this action in the audit table
  INSERT INTO user_management_audit (
    actor_id,
    action,
    target_user_id,
    target_email,
    old_values,
    new_values,
    metadata,
    created_at
  ) VALUES (
    target_user_id, -- Self-promotion
    'user_role_changed',
    target_user_id,
    target_email,
    jsonb_build_object('role', 'teacher'),
    jsonb_build_object('role', 'admin'),
    jsonb_build_object('reason', 'Initial admin setup'),
    NOW()
  );
  
  RAISE NOTICE 'Successfully made % an admin', target_email;
END $$;

-- Verify the change
SELECT 
  u.email,
  p.role,
  p.is_active,
  p.updated_at
FROM auth.users u
JOIN user_profiles p ON u.id = p.id
WHERE u.email = 'df@esynyc.org'; -- CHANGE THIS TO YOUR EMAIL