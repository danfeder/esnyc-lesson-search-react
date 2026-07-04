-- =====================================================
-- SEED DATA FOR LOCAL DEVELOPMENT
-- =====================================================
-- This file populates the local database with sample data
-- Run: npm run db:reset (applies migrations + seeds)
-- =====================================================

-- =====================================================
-- TEST USERS (auth.users + auth.identities)
-- =====================================================
-- Note: These are for local development only
-- Passwords are 'password123' for all test users
--
-- GoTrue is fussy about the auth.users row shape. Inserting only the
-- "obvious" columns leaves password login broken with two cryptic
-- errors:
--   - "Invalid login credentials" if instance_id, raw_app_meta_data, or
--     auth.identities are missing
--   - 500 "Database error querying schema" if any of the *_token columns
--     are NULL (the Go scanner can't convert NULL to string)
-- So this seed sets the full row shape GoTrue expects.

INSERT INTO auth.users (
  instance_id, id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, aud, role,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, email_change, email_change_token_new, email_change_token_current,
  recovery_token, phone_change, phone_change_token, reauthentication_token
)
VALUES
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'admin@test.com',    crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'reviewer@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'teacher@test.com',  crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, '', '', '', '', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- One identity row per user — GoTrue's password lookup goes through here.
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
SELECT
  gen_random_uuid(),
  u.id,
  u.id::text,
  'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  NOW(),
  NOW(),
  NOW()
FROM auth.users u
WHERE u.email IN ('admin@test.com', 'reviewer@test.com', 'teacher@test.com')
ON CONFLICT DO NOTHING;

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
  activity_type, location_requirements, thematic_categories, season_timing,
  core_competencies, cultural_heritage,
  academic_integration, social_emotional_learning, cooking_methods
)
VALUES
  (
    'LESSON-001',
    'Garden to Table: Growing Tomatoes',
    'Students learn to plant, care for, and harvest tomatoes while exploring plant biology and nutrition.',
    'https://docs.google.com/document/d/sample1',
    ARRAY['3', '4', '5'],
    ARRAY['garden', 'cooking'],
    ARRAY['Garden', 'Kitchen'],
    -- Thematic categories must use the canonical vocabulary from
    -- src/utils/filterDefinitions.ts — the valid_thematic_categories CHECK
    -- (migration 20260703030000, FP-02) rejects anything else, and seed.sql
    -- runs AFTER migrations.
    ARRAY['Plant Growth', 'Seed to Table'],
    ARRAY['Spring', 'Summer'],
    ARRAY['Garden Skills and Related Academic Content', 'Kitchen Skills and Related Academic Content'],
    ARRAY['Italian', 'Mexican'],
    ARRAY['Science', 'Math'],
    ARRAY['Relationship skills', 'Responsible decision-making'],
    ARRAY['basic-prep']
  ),
  (
    'LESSON-002',
    'Bread Baking Basics',
    'An introduction to the science of bread making, covering yeast fermentation and measuring techniques.',
    'https://docs.google.com/document/d/sample2',
    ARRAY['4', '5', '6'],
    ARRAY['cooking'],
    ARRAY['Kitchen'],
    ARRAY['Food Systems'],
    ARRAY['Fall', 'Winter', 'Spring', 'Summer'],
    ARRAY['Kitchen Skills and Related Academic Content'],
    ARRAY['European'],
    ARRAY['Science', 'Math'],
    ARRAY['Self-management'],
    ARRAY['oven']
  ),
  (
    'LESSON-003',
    'Composting 101',
    'Learn the basics of composting and how decomposition creates nutrient-rich soil for gardens.',
    'https://docs.google.com/document/d/sample3',
    ARRAY['K', '1', '2'],
    ARRAY['garden'],
    ARRAY['Garden', 'Outdoor Classroom'],
    ARRAY['Ecosystems', 'Garden Basics'],
    ARRAY['Fall', 'Spring'],
    ARRAY['Environmental and Community Stewardship', 'Garden Skills and Related Academic Content'],
    ARRAY[]::text[],
    ARRAY['Science'],
    ARRAY['Social awareness'],
    ARRAY[]::text[]
  ),
  (
    'LESSON-004',
    'Salsa Fresca Workshop',
    'Students prepare fresh salsa while learning about Mexican culinary traditions and knife safety.',
    'https://docs.google.com/document/d/sample4',
    ARRAY['5', '6', '7', '8'],
    ARRAY['cooking'],
    ARRAY['Kitchen'],
    ARRAY['Food Systems'],
    ARRAY['Summer', 'Fall'],
    ARRAY['Kitchen Skills and Related Academic Content', 'Cultural Diversity'],
    ARRAY['Mexican', 'Latin American'],
    ARRAY['Social Studies', 'Health'],
    ARRAY['Social awareness'],
    ARRAY['basic-prep']
  ),
  (
    'LESSON-005',
    'Seed Starting in Spring',
    'A hands-on lesson about starting seeds indoors and understanding germination.',
    'https://docs.google.com/document/d/sample5',
    ARRAY['PK', 'K', '1'],
    ARRAY['garden'],
    ARRAY['Greenhouse', 'Indoor Classroom'],
    ARRAY['Plant Growth'],
    ARRAY['Spring'],
    ARRAY['Garden Skills and Related Academic Content'],
    ARRAY[]::text[],
    ARRAY['Science'],
    ARRAY['Self-awareness', 'Self-management'],
    ARRAY[]::text[]
  )
ON CONFLICT (lesson_id) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary;

-- =====================================================
-- SAMPLE SEARCH SYNONYMS
-- =====================================================

INSERT INTO search_synonyms (term, synonyms, synonym_type)
VALUES
  -- Multi-word synonyms are tokenized into individual words to satisfy the
  -- search_synonyms_lexemes_no_whitespace CHECK constraint added in
  -- 20260522000000_seed_search_synonyms_from_smart_search.sql.
  ('tomato', ARRAY['tomatoes', 'cherry', 'roma', 'heirloom'], 'bidirectional'),
  ('bread', ARRAY['loaf', 'dough', 'baking'], 'bidirectional'),
  ('salsa', ARRAY['sauce', 'dip', 'pico', 'gallo'], 'bidirectional'),
  ('garden', ARRAY['gardening', 'outdoor', 'growing'], 'bidirectional'),
  ('cook', ARRAY['cooking', 'prepare', 'make', 'chef'], 'bidirectional')
ON CONFLICT DO NOTHING;

-- =====================================================
-- CULTURAL HERITAGE HIERARCHY
-- =====================================================
-- The hierarchy table is now seeded authoritatively by migration
-- 20260616000000_heritage_recursive_expansion.sql with the full 71-row vocab
-- tree (key, label, parent_key) from data/vocab/cultural-heritage.vocab.json.
-- The old sample insert against the (parent, children) shape was removed when
-- the table shape changed (PR C1.2); no seed-time insert is needed here.

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
