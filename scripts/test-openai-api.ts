#!/usr/bin/env npx tsx
/**
 * Test script to verify OpenAI API key and embedding generation
 * Run with: npm run test:openai
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testOpenAIDirectly() {
  console.log('🔍 Testing OpenAI API directly...\n');

  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    console.log('   Please set OPENAI_API_KEY in .env.local or as an environment variable');
    return false;
  }

  console.log('✅ OPENAI_API_KEY found');
  console.log(`   Key starts with: ${OPENAI_API_KEY.substring(0, 10)}...`);

  try {
    console.log('\n📡 Calling OpenAI embeddings API...');
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: 'Test embedding for ESYNYC lesson search',
      }),
    });

    console.log(`   Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ OpenAI API error:');
      console.error(`   ${errorData}`);
      return false;
    }

    const data = await response.json();
    console.log('✅ Embedding generated successfully!');
    console.log(`   Model: ${data.model}`);
    console.log(`   Embedding dimensions: ${data.data[0].embedding.length}`);
    console.log(`   Usage: ${data.usage.total_tokens} tokens`);

    return true;
  } catch (error) {
    console.error('❌ Error calling OpenAI API:', error);
    return false;
  }
}

async function testSupabaseSecret() {
  console.log('\n🔍 Testing OpenAI key in Supabase secrets...\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Supabase credentials not found');
    console.log('   Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    return false;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Test by calling the process-submission function with a mock request
    console.log('📡 Testing process-submission edge function...');

    const { data, error } = await supabase.functions.invoke('process-submission', {
      body: {
        googleDocUrl: 'https://docs.google.com/document/d/test-doc-id/edit',
        submissionType: 'new',
      },
    });

    if (error) {
      console.error('❌ Edge function error:', error.message);
      return false;
    }

    console.log('✅ Edge function called successfully');

    // Note: This will fail because it's a test doc, but we can check if embedding was attempted
    if (data?.error?.includes('Invalid Google Doc URL') || data?.error?.includes('Unauthorized')) {
      console.log('   (Expected error for test document)');
    }

    return true;
  } catch (error) {
    console.error('❌ Error testing Supabase:', error);
    return false;
  }
}

async function checkExistingEmbeddings() {
  console.log('\n🔍 Checking existing embeddings in database...\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.log('⚠️  Skipping database check (no Supabase credentials)');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Check submissions
    const { data: submissionStats, error: subError } = await supabase
      .from('lesson_submissions')
      .select('id, content_embedding')
      .limit(100);

    if (!subError && submissionStats) {
      const withEmbeddings = submissionStats.filter((s) => s.content_embedding).length;
      console.log(`📊 Submissions: ${withEmbeddings}/${submissionStats.length} have embeddings`);
    }

    // Check lessons
    const { count: totalLessons } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    const { count: lessonsWithEmbeddings } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .not('content_embedding', 'is', null);

    console.log(`📊 Lessons: ${lessonsWithEmbeddings}/${totalLessons} have embeddings`);
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 OpenAI Embeddings Test Script');
  console.log('='.repeat(60));

  const directTest = await testOpenAIDirectly();

  if (directTest) {
    await testSupabaseSecret();
  }

  await checkExistingEmbeddings();

  console.log('\n' + '='.repeat(60));
  if (directTest) {
    console.log('✅ OpenAI API is working correctly');
    console.log('   The issue is likely in the edge function implementation');
  } else {
    console.log('❌ OpenAI API is not working');
    console.log('   Check your API key and OpenAI account status');
  }
  console.log('='.repeat(60));
}

main().catch(console.error);
