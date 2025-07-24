// Run this in the browser console to check the reviewer profile
const { data, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', '2b49cb8d-2ddb-4e8c-ae48-f7fb2cb7df5e');

console.log('Profile check:', { data, error });
