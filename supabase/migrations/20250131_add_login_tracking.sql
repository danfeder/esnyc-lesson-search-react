-- Add login tracking to user_management_audit table
-- The table already exists with the necessary columns, we just need to add a function to track logins

-- Create function to log user login activity
CREATE OR REPLACE FUNCTION log_user_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log for auth.users updates where last_sign_in_at is changed
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    INSERT INTO user_management_audit (
      actor_id,
      action,
      target_user_id,
      metadata
    ) VALUES (
      NEW.id,
      'login',
      NEW.id,
      jsonb_build_object(
        'login_at', NEW.last_sign_in_at,
        'ip_address', NEW.raw_user_meta_data->>'ip_address',
        'user_agent', NEW.raw_user_meta_data->>'user_agent'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to log logins
DROP TRIGGER IF EXISTS on_user_login ON auth.users;
CREATE TRIGGER on_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_login();

-- Add index for faster login analytics queries
CREATE INDEX IF NOT EXISTS idx_audit_login_actions 
ON user_management_audit(action, created_at) 
WHERE action = 'login';

-- Create a function to get user activity metrics
CREATE OR REPLACE FUNCTION get_user_activity_metrics(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  login_count INTEGER,
  last_login TIMESTAMPTZ,
  submission_count INTEGER,
  review_count INTEGER,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Login count in the period
    (SELECT COUNT(*)::INTEGER 
     FROM user_management_audit 
     WHERE actor_id = p_user_id 
     AND action = 'login' 
     AND created_at >= NOW() - INTERVAL '1 day' * p_days) AS login_count,
    
    -- Last login time
    (SELECT MAX(created_at) 
     FROM user_management_audit 
     WHERE actor_id = p_user_id 
     AND action = 'login') AS last_login,
    
    -- Submission count
    (SELECT COUNT(*)::INTEGER 
     FROM lesson_submissions 
     WHERE teacher_id = p_user_id 
     AND created_at >= NOW() - INTERVAL '1 day' * p_days) AS submission_count,
    
    -- Review count
    (SELECT COUNT(*)::INTEGER 
     FROM submission_reviews 
     WHERE reviewer_id = p_user_id 
     AND created_at >= NOW() - INTERVAL '1 day' * p_days) AS review_count,
    
    -- Last activity (most recent of any action)
    GREATEST(
      (SELECT MAX(created_at) FROM user_management_audit WHERE actor_id = p_user_id),
      (SELECT MAX(created_at) FROM lesson_submissions WHERE teacher_id = p_user_id),
      (SELECT MAX(created_at) FROM submission_reviews WHERE reviewer_id = p_user_id)
    ) AS last_activity;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_activity_metrics TO authenticated;