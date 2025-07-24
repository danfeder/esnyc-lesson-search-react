// Debug the dashboard query
const { supabase } = await import('./src/lib/supabase');

// Try the exact query the dashboard uses
const { data, error } = await supabase
  .from('lesson_submissions')
  .select('*')
  .order('created_at', { ascending: false });

console.log('Dashboard query result:', { data, error });

// If we get data, let's check the teacher profiles
if (data && data.length > 0) {
  const teacherIds = [...new Set(data.map((s) => s.teacher_id))];
  console.log('Teacher IDs:', teacherIds);

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .in('id', teacherIds);

  console.log('Teacher profiles:', profiles);
}
