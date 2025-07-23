#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testDetectDuplicates() {
  console.log('🧪 Testing Edge Function Duplicate Detection\n');

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // First, let's find some lessons with known titles
  console.log('1️⃣ Finding lessons with "Herbs" in title...');
  const { data: herbLessons } = await supabase
    .from('lessons')
    .select('lesson_id, title, content_hash')
    .ilike('title', '%herbs%')
    .limit(5);

  console.log('Found lessons:');
  herbLessons?.forEach(l => {
    console.log(`  - "${l.title}" (${l.lesson_id})`);
  });

  // Test 1: Without embedding (title-based only)
  console.log('\n2️⃣ Testing without embedding (title-based search)...');
  
  const response1 = await fetch(`${SUPABASE_URL}/functions/v1/detect-duplicates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({
      submissionId: 'test-without-embedding',
      content: 'Teaching about herbs and their medicinal properties',
      title: 'Herbs as Medicine',
      metadata: { gradeLevels: ['5', '6'] }
    })
  });

  const result1 = await response1.json();
  console.log('Result:', {
    success: result1.success,
    duplicatesFound: result1.data?.duplicatesFound,
    duplicates: result1.data?.duplicates?.map(d => ({
      title: d.title,
      score: d.similarityScore,
      type: d.matchType
    }))
  });

  // Test 2: Generate embedding first, then test with it
  console.log('\n3️⃣ Testing with embedding (semantic search)...');
  
  // Get embedding for a known lesson
  const { data: lessonWithEmbedding } = await supabase
    .from('lessons')
    .select('title, content_embedding')
    .eq('title', 'Herbs as Medicine')
    .limit(1)
    .single();

  if (lessonWithEmbedding?.content_embedding) {
    console.log(`Using embedding from "${lessonWithEmbedding.title}"`);
    
    // Parse the embedding
    const embedding = JSON.parse(lessonWithEmbedding.content_embedding);
    
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/detect-duplicates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        submissionId: 'test-with-embedding',
        content: 'Teaching about herbs and their medicinal properties',
        title: 'Herbs as Medicine',
        metadata: { gradeLevels: ['5', '6'] },
        embedding: embedding
      })
    });

    const result2 = await response2.json();
    console.log('Result with embedding:', {
      success: result2.success,
      duplicatesFound: result2.data?.duplicatesFound,
      topDuplicates: result2.data?.duplicates?.slice(0, 5).map(d => ({
        title: d.title,
        score: (d.similarityScore * 100).toFixed(1) + '%',
        type: d.matchType,
        details: d.matchDetails
      }))
    });
  }

  // Test 3: Check the fallback title search
  console.log('\n4️⃣ Checking title similarity fallback...');
  
  const { data: allLessons } = await supabase
    .from('lessons')
    .select('lesson_id, title')
    .ilike('title', '%herb%')
    .limit(10);

  console.log(`Found ${allLessons?.length || 0} lessons with "herb" in title`);
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY:');
  console.log('- Title-based search is limited to 100 lessons');
  console.log('- Semantic search requires embedding (1536 dimensions)');
  console.log('- Hash matching works for exact duplicates');
  console.log('- For best results, generate embedding for new submissions');
}

testDetectDuplicates().catch(console.error);