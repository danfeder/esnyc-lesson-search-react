-- Create user_invitations table for managing invitation workflow
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'reviewer', 'admin')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  metadata JSONB DEFAULT '{}',
  school_name TEXT,
  school_borough TEXT CHECK (school_borough IN ('Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a partial unique index to ensure only one pending invitation per email
CREATE UNIQUE INDEX unique_pending_invitation_per_email 
ON user_invitations (email) 
WHERE accepted_at IS NULL;

-- Create indexes for performance
CREATE INDEX idx_invitations_email ON user_invitations(email);
CREATE INDEX idx_invitations_token ON user_invitations(token);
CREATE INDEX idx_invitations_expires_at ON user_invitations(expires_at) WHERE accepted_at IS NULL;
CREATE INDEX idx_invitations_invited_by ON user_invitations(invited_by);

-- Add comments for documentation
COMMENT ON TABLE user_invitations IS 'Stores user invitations with secure tokens and expiration';
COMMENT ON COLUMN user_invitations.email IS 'Email address of the invited user';
COMMENT ON COLUMN user_invitations.role IS 'Role to assign to the user upon acceptance';
COMMENT ON COLUMN user_invitations.invited_by IS 'UUID of the user who sent the invitation';
COMMENT ON COLUMN user_invitations.expires_at IS 'When the invitation expires (default 7 days)';
COMMENT ON COLUMN user_invitations.accepted_at IS 'When the invitation was accepted (null if pending)';
COMMENT ON COLUMN user_invitations.token IS 'Secure token for invitation acceptance';
COMMENT ON COLUMN user_invitations.metadata IS 'Additional data about the invitation';
COMMENT ON COLUMN user_invitations.school_name IS 'Pre-filled school name for the invitation';
COMMENT ON COLUMN user_invitations.school_borough IS 'Pre-filled school borough for the invitation';
COMMENT ON COLUMN user_invitations.message IS 'Custom message from the inviter';