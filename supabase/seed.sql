-- =====================================================
-- SEED DATA FOR LOCAL DEVELOPMENT
-- =====================================================
-- This file populates the local database with sample data
-- Run: npm run db:reset (applies migrations + seeds)
-- =====================================================

-- =====================================================
-- TEST USERS (auth.users)
-- =====================================================
-- Note: These are for local development only
-- Passwords are 'password123' for all test users

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'reviewer@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'teacher@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- USER PROFILES
-- =====================================================

INSERT INTO user_profiles (id, user_id, email, role, full_name, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'admin@test.com', 'admin', 'Test Admin', true),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'reviewer@test.com', 'reviewer', 'Test Reviewer', true),
  ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'teacher@test.com', 'teacher', 'Test Teacher', true)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name;

-- =====================================================
-- SAMPLE LESSONS
-- =====================================================

INSERT INTO lessons (
  lesson_id, title, summary, file_link, grade_levels,
  activity_type, location, thematic_categories, season_timing,
  core_competencies, cultural_heritage, lesson_format,
  academic_integration, social_emotional_learning, cooking_methods,
  created_at, updated_at
)
VALUES
  (
    'LESSON-001',
    'Garden to Table: Growing Tomatoes',
    'Students learn to plant, care for, and harvest tomatoes while exploring plant biology and nutrition.',
    'https://docs.google.com/document/d/sample1',
    ARRAY['3', '4', '5'],
    ARRAY['Gardening', 'Cooking'],
    ARRAY['Garden', 'Kitchen'],
    ARRAY['Plant Science', 'Nutrition'],
    ARRAY['Spring', 'Summer'],
    ARRAY['Teamwork', 'Following Instructions'],
    ARRAY['Italian', 'Mexican'],
    ARRAY['Full Lesson'],
    ARRAY['Science', 'Math'],
    ARRAY['Patience', 'Responsibility'],
    ARRAY['Raw/No Cook']
  ),
  (
    'LESSON-002',
    'Bread Baking Basics',
    'An introduction to the science of bread making, covering yeast fermentation and measuring techniques.',
    'https://docs.google.com/document/d/sample2',
    ARRAY['4', '5', '6'],
    ARRAY['Cooking'],
    ARRAY['Kitchen'],
    ARRAY['Food Science', 'Chemistry'],
    ARRAY['Year-Round'],
    ARRAY['Measuring', 'Following Instructions'],
    ARRAY['European'],
    ARRAY['Full Lesson'],
    ARRAY['Science', 'Math'],
    ARRAY['Patience'],
    ARRAY['Baking']
  ),
  (
    'LESSON-003',
    'Composting 101',
    'Learn the basics of composting and how decomposition creates nutrient-rich soil for gardens.',
    'https://docs.google.com/document/d/sample3',
    ARRAY['K', '1', '2'],
    ARRAY['Gardening'],
    ARRAY['Garden', 'Outdoor Classroom'],
    ARRAY['Environmental Science', 'Ecology'],
    ARRAY['Fall', 'Spring'],
    ARRAY['Observation', 'Teamwork'],
    ARRAY[],
    ARRAY['Activity'],
    ARRAY['Science'],
    ARRAY['Environmental Awareness'],
    ARRAY[]
  ),
  (
    'LESSON-004',
    'Salsa Fresca Workshop',
    'Students prepare fresh salsa while learning about Mexican culinary traditions and knife safety.',
    'https://docs.google.com/document/d/sample4',
    ARRAY['5', '6', '7', '8'],
    ARRAY['Cooking'],
    ARRAY['Kitchen'],
    ARRAY['Cultural Heritage', 'Nutrition'],
    ARRAY['Summer', 'Fall'],
    ARRAY['Knife Skills', 'Following Recipes'],
    ARRAY['Mexican', 'Latin American'],
    ARRAY['Full Lesson'],
    ARRAY['Social Studies', 'Health'],
    ARRAY['Cultural Appreciation'],
    ARRAY['Raw/No Cook', 'Chopping/Mixing']
  ),
  (
    'LESSON-005',
    'Seed Starting in Spring',
    'A hands-on lesson about starting seeds indoors and understanding germination.',
    'https://docs.google.com/document/d/sample5',
    ARRAY['PK', 'K', '1'],
    ARRAY['Gardening'],
    ARRAY['Greenhouse', 'Indoor Classroom'],
    ARRAY['Plant Science'],
    ARRAY['Spring'],
    ARRAY['Fine Motor Skills', 'Observation'],
    ARRAY[],
    ARRAY['Activity'],
    ARRAY['Science'],
    ARRAY['Patience', 'Wonder'],
    ARRAY[]
  )
ON CONFLICT (lesson_id) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary;

-- =====================================================
-- SAMPLE SEARCH SYNONYMS
-- =====================================================

INSERT INTO search_synonyms (term, synonyms, is_active)
VALUES
  ('tomato', ARRAY['tomatoes', 'cherry tomato', 'roma', 'heirloom'], true),
  ('bread', ARRAY['loaf', 'dough', 'baking'], true),
  ('salsa', ARRAY['sauce', 'dip', 'pico de gallo'], true),
  ('garden', ARRAY['gardening', 'outdoor', 'growing'], true),
  ('cook', ARRAY['cooking', 'prepare', 'make', 'chef'], true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- SAMPLE CULTURAL HERITAGE HIERARCHY
-- =====================================================

INSERT INTO cultural_heritage_hierarchy (parent, child)
VALUES
  ('Latin American', 'Mexican'),
  ('Latin American', 'Caribbean'),
  ('European', 'Italian'),
  ('European', 'French'),
  ('Asian', 'Chinese'),
  ('Asian', 'Japanese'),
  ('Asian', 'Korean'),
  ('African', 'West African'),
  ('African', 'Ethiopian')
ON CONFLICT DO NOTHING;

-- =====================================================
-- SAMPLE SUBMISSION (for testing review workflow)
-- =====================================================

INSERT INTO lesson_submissions (
  id, teacher_id, google_doc_url, google_doc_id, status,
  extracted_title, extracted_content, created_at
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '33333333-3333-3333-3333-333333333333',
  'https://docs.google.com/document/d/test-submission',
  'test-submission-doc-id',
  'submitted',
  'Test Lesson: Herb Garden Basics',
  'This is a sample lesson about growing herbs in the garden. Students will learn to identify common herbs like basil, mint, and cilantro.',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  lesson_count INTEGER;
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO lesson_count FROM lessons;
  SELECT COUNT(*) INTO user_count FROM user_profiles;

  RAISE NOTICE 'Seed complete: % lessons, % users', lesson_count, user_count;
END $$;
