-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT schools_name_unique UNIQUE (name)
);

-- Create index on school name for performance
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name);

-- Create user_schools junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS user_schools (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, school_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_schools_user_id ON user_schools(user_id);
CREATE INDEX IF NOT EXISTS idx_user_schools_school_id ON user_schools(school_id);

-- Enable RLS on both tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_schools ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schools table
-- All authenticated users can view schools
CREATE POLICY "Users can view all schools" ON schools
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins and super_admins can insert schools
CREATE POLICY "Admins can create schools" ON schools
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Only admins and super_admins can update schools
CREATE POLICY "Admins can update schools" ON schools
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Only super_admins can delete schools
CREATE POLICY "Super admins can delete schools" ON schools
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- RLS Policies for user_schools table
-- All authenticated users can view all user-school relationships
CREATE POLICY "Users can view all user-school relationships" ON user_schools
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins and super_admins can manage user-school relationships
CREATE POLICY "Admins can create user-school relationships" ON user_schools
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete user-school relationships" ON user_schools
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on schools table
CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insert some initial schools (you can modify this list as needed)
-- Using EXISTS check instead of ON CONFLICT for better compatibility
INSERT INTO schools (name)
SELECT name FROM (VALUES 
  ('PS/MS 7'),
  ('BCCS'),
  ('PS 109'),
  ('PS 216')
) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM schools WHERE schools.name = v.name);

-- Grant necessary permissions
GRANT ALL ON schools TO authenticated;
GRANT ALL ON user_schools TO authenticated;