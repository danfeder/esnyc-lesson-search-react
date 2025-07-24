// Run this in the browser console to create the missing user profiles

const { supabase } = await import('./src/lib/supabase');

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

console.log('Reviewer profile:', { reviewer, reviewerError });

// Also ensure teacher profile exists
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

console.log('Teacher profile:', { teacher, teacherError });

// Verify the profiles exist
const { data: profiles, error: listError } = await supabase.from('user_profiles').select('*');

console.log('All profiles:', { profiles, listError });
