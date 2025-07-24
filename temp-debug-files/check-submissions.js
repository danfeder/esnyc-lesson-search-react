// Run this in the browser console to check submissions
const { supabase } = await import('./src/lib/supabase');

// Check if any submissions exist
const { data: allSubmissions, error: allError } = await supabase
  .from('lesson_submissions')
  .select('*')
  .order('created_at', { ascending: false });

console.log('All submissions:', { allSubmissions, allError });

// Check specific submission we created
const { data: testSubmission, error: testError } = await supabase
  .from('lesson_submissions')
  .select('*')
  .eq('id', '32b9d5a9-cfef-4c97-af01-66a592d428ca');

console.log('Test submission:', { testSubmission, testError });

// Check RLS on lesson_submissions
const { data: currentUser } = await supabase.auth.getUser();
console.log('Current user:', currentUser.user?.id, currentUser.user?.email);
