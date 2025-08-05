/**
 * @description Create test user profiles for development
 * @requires Environment variables: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * @example
 * node scripts/create-test-profiles.js
 *
 * @notes
 * - Creates test users with different roles (teacher, reviewer, admin)
 * - Uses service role key to bypass RLS
 * - Useful for testing authentication and permissions
 * - DO NOT run in production
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createProfiles() {
  console.log('Creating test profiles...');

  // Create reviewer profile
  const reviewerProfile = {
    id: '2b49cb8d-2ddb-4e8c-ae48-f7fb2cb7df5e',
    full_name: 'Test Reviewer',
    role: 'reviewer',
    school: 'Test School',
    grades_taught: ['3rd', '4th', '5th'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: reviewer, error: reviewerError } = await supabase
    .from('user_profiles')
    .upsert(reviewerProfile, { onConflict: 'id' })
    .select();

  if (reviewerError) {
    console.error('Error creating reviewer profile:', reviewerError);
  } else {
    console.log('Reviewer profile created:', reviewer);
  }

  // Create teacher profile
  const teacherProfile = {
    id: '957e2ca9-a366-42eb-aef0-e5b79f74babe',
    full_name: 'Test Teacher',
    role: 'teacher',
    school: 'Test School',
    grades_taught: ['K', '1st', '2nd'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: teacher, error: teacherError } = await supabase
    .from('user_profiles')
    .upsert(teacherProfile, { onConflict: 'id' })
    .select();

  if (teacherError) {
    console.error('Error creating teacher profile:', teacherError);
  } else {
    console.log('Teacher profile created:', teacher);
  }

  // Verify all profiles
  const { data: profiles, error: listError } = await supabase.from('user_profiles').select('*');

  if (listError) {
    console.error('Error listing profiles:', listError);
  } else {
    console.log('\nAll profiles:');
    profiles.forEach((profile) => {
      console.log(`- ${profile.full_name} (${profile.role}): ${profile.id}`);
    });
  }
}

createProfiles().catch(console.error);
