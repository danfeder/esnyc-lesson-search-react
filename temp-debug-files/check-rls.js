// Run this in the browser console to check RLS
const { supabase } = await import('./src/lib/supabase');

// Get current user
const {
  data: { user },
} = await supabase.auth.getUser();
console.log('Current user:', user?.id, user?.email);

// Try to read the profile
const { data, error } = await supabase.from('user_profiles').select('*');

console.log('All profiles query:', { data, error });

// Try to read specific profile
const { data: myProfile, error: myError } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', user?.id);

console.log('My profile query:', { myProfile, myError });
