-- Fix ambiguous column reference in has_role function
-- The issue: user_profiles table has both 'id' and 'user_id' columns
-- The function parameter 'user_id' conflicts with the table column 'user_id'

-- We need to drop the function first (CASCADE will handle dependent policies)
DROP FUNCTION IF EXISTS public.has_role(uuid, text) CASCADE;

-- Recreate the has_role function with proper parameter qualification
CREATE OR REPLACE FUNCTION public.has_role(p_user_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = p_user_id AND is_active = true;  -- Now using p_user_id to avoid ambiguity
  
  -- Role hierarchy: super_admin > admin > reviewer > teacher
  RETURN CASE
    WHEN required_role = 'teacher' THEN user_role IS NOT NULL
    WHEN required_role = 'reviewer' THEN user_role IN ('reviewer', 'admin', 'super_admin')
    WHEN required_role = 'admin' THEN user_role IN ('admin', 'super_admin')
    WHEN required_role = 'super_admin' THEN user_role = 'super_admin'
    ELSE false
  END;
END;
$function$;

-- Recreate the RLS policy that was dropped
CREATE POLICY "Reviewers can view duplicate resolutions"
ON duplicate_resolutions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'reviewer'));