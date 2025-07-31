-- Fix user_management_audit foreign key to reference user_profiles instead of auth.users
-- This ensures we can track actions even for users that exist only in user_profiles

-- Drop the existing foreign key constraints
ALTER TABLE user_management_audit 
DROP CONSTRAINT IF EXISTS user_management_audit_target_user_id_fkey;

ALTER TABLE user_management_audit 
DROP CONSTRAINT IF EXISTS user_management_audit_actor_id_fkey;

-- Add new foreign key constraint for target_user_id
ALTER TABLE user_management_audit
ADD CONSTRAINT user_management_audit_target_user_id_fkey 
FOREIGN KEY (target_user_id) 
REFERENCES user_profiles(id) 
ON DELETE CASCADE;

-- Add new foreign key constraint for actor_id
-- We keep this referencing auth.users since the actor must be authenticated
ALTER TABLE user_management_audit
ADD CONSTRAINT user_management_audit_actor_id_fkey 
FOREIGN KEY (actor_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Add comment explaining the change
COMMENT ON CONSTRAINT user_management_audit_target_user_id_fkey ON user_management_audit IS 
'References user_profiles table instead of auth.users to maintain consistency with our user management system';