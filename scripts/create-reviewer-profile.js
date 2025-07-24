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

async function createReviewerProfile() {
  console.log('Creating reviewer profile for new user...');

  // Create reviewer profile for the newly signed up user
  const reviewerProfile = {
    id: '1a297e3c-a906-4340-a0d2-a8b26728b6d5',
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

  // Verify the profile exists
  const { data: profile, error: checkError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', '1a297e3c-a906-4340-a0d2-a8b26728b6d5')
    .single();

  if (checkError) {
    console.error('Error checking profile:', checkError);
  } else {
    console.log('\nProfile verified:', profile);
  }
}

createReviewerProfile().catch(console.error);
