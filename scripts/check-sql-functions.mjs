import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFunctions() {
  console.log('Checking SQL functions...\n');

  // Check if find_lessons_by_hash exists
  const { data: hashFunc, error: hashError } = await supabase
    .rpc('find_lessons_by_hash', { hash_value: 'test' });

  if (hashError) {
    console.log('❌ find_lessons_by_hash error:', hashError.message);
  } else {
    console.log('✅ find_lessons_by_hash exists');
  }

  // Check if find_similar_lessons_by_embedding exists
  const { data: embedFunc, error: embedError } = await supabase
    .rpc('find_similar_lessons_by_embedding', { 
      query_embedding: '[1,2,3]',
      similarity_threshold: 0.5,
      max_results: 5
    });

  if (embedError) {
    console.log('❌ find_similar_lessons_by_embedding error:', embedError.message);
  } else {
    console.log('✅ find_similar_lessons_by_embedding exists');
  }

  // Test with a known duplicate hash
  const { data: herbs } = await supabase
    .from('lessons')
    .select('content_hash')
    .eq('title', 'Herbs as Medicine')
    .limit(1)
    .single();

  if (herbs?.content_hash) {
    console.log('\nTesting with known hash:', herbs.content_hash);
    const { data: matches } = await supabase
      .rpc('find_lessons_by_hash', { hash_value: herbs.content_hash });
    console.log('Hash matches found:', matches?.length || 0);
  }
}

checkFunctions().catch(console.error);
