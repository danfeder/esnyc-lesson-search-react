// Debug the search function
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jxlxtzkmicfhchkhiojz.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSearch() {
  console.log('Testing search_lessons function...\n');

  // Test 1: Simple search without filters
  console.log('Test 1: No filters, just get first 20 lessons');
  const { data: test1, error: error1 } = await supabase.rpc('search_lessons', {
    search_query: null,
    filter_grade_levels: null,
    filter_themes: null,
    filter_seasons: null,
    filter_competencies: null,
    filter_cultures: null,
    filter_location: null,
    filter_activity_type: null,
    filter_lesson_format: null,
    filter_academic: null,
    filter_sel: null,
    filter_cooking_method: null,
    page_size: 20,
    page_offset: 0,
  });

  if (error1) {
    console.error('Error:', error1);
  } else {
    console.log(`Found ${test1?.length || 0} lessons`);
    if (test1?.[0]) {
      console.log('First lesson:', test1[0].title);
      console.log('Total count:', test1[0].total_count);
    }
  }

  // Test 2: Search with query
  console.log('\nTest 2: Search for "pizza"');
  const { data: test2, error: error2 } = await supabase.rpc('search_lessons', {
    search_query: 'pizza',
    page_size: 5,
    page_offset: 0,
  });

  if (error2) {
    console.error('Error:', error2);
  } else {
    console.log(`Found ${test2?.length || 0} lessons`);
    test2?.forEach((lesson) => console.log(`  - ${lesson.title}`));
  }

  // Test 3: Check if function exists
  console.log('\nTest 3: List all functions');
  const { data: functions, error: funcError } = await supabase.rpc('pg_catalog.pg_proc', {});

  if (funcError) {
    // Try a simpler query
    const { data, error } = await supabase
      .from('pg_catalog.pg_proc')
      .select('proname')
      .eq('proname', 'search_lessons');

    console.log('Function exists?', data);
  }
}

testSearch();
