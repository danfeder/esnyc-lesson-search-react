-- Create audit trail table for user management actions
CREATE TABLE IF NOT EXISTS user_management_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN (
    'invite_sent',
    'invite_accepted',
    'invite_cancelled',
    'invite_resent',
    'user_role_changed',
    'user_activated',
    'user_deactivated',
    'user_deleted',
    'user_profile_updated',
    'permissions_changed'
  )),
  target_user_id UUID REFERENCES auth.users(id),
  target_email TEXT,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_audit_actor ON user_management_audit(actor_id);
CREATE INDEX idx_audit_target ON user_management_audit(target_user_id);
CREATE INDEX idx_audit_action ON user_management_audit(action);
CREATE INDEX idx_audit_created ON user_management_audit(created_at DESC);
CREATE INDEX idx_audit_target_email ON user_management_audit(target_email);

-- Add comments for documentation
COMMENT ON TABLE user_management_audit IS 'Audit trail for all user management actions';
COMMENT ON COLUMN user_management_audit.actor_id IS 'User who performed the action';
COMMENT ON COLUMN user_management_audit.action IS 'Type of action performed';
COMMENT ON COLUMN user_management_audit.target_user_id IS 'User affected by the action (if applicable)';
COMMENT ON COLUMN user_management_audit.target_email IS 'Email of target user (useful for invitations)';
COMMENT ON COLUMN user_management_audit.old_values IS 'Previous values before the change';
COMMENT ON COLUMN user_management_audit.new_values IS 'New values after the change';
COMMENT ON COLUMN user_management_audit.metadata IS 'Additional context about the action';
COMMENT ON COLUMN user_management_audit.ip_address IS 'IP address of the actor';
COMMENT ON COLUMN user_management_audit.user_agent IS 'Browser user agent of the actor';

-- Create a function to automatically log profile changes
CREATE OR REPLACE FUNCTION log_user_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if there are actual changes
  IF OLD IS DISTINCT FROM NEW THEN
    INSERT INTO user_management_audit (
      actor_id,
      action,
      target_user_id,
      old_values,
      new_values,
      created_at
    ) VALUES (
      COALESCE(auth.uid(), NEW.id), -- Use the authenticated user or the user being created
      'user_profile_updated',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user profile changes
DROP TRIGGER IF EXISTS trigger_log_user_profile_changes ON user_profiles;
CREATE TRIGGER trigger_log_user_profile_changes
AFTER UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION log_user_profile_changes();