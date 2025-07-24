-- First, let's check the column type
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'id';

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read all profiles
CREATE POLICY "Users can read all profiles" ON user_profiles
    FOR SELECT 
    TO authenticated
    USING (true);

-- Allow users to update their own profile (handle both UUID and text comparisons)
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE 
    TO authenticated
    USING (id::text = auth.uid()::text)
    WITH CHECK (id::text = auth.uid()::text);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT 
    TO authenticated
    WITH CHECK (id::text = auth.uid()::text);

-- Service role can do everything (for admin operations)
CREATE POLICY "Service role can manage all profiles" ON user_profiles
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);