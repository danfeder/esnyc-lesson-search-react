#!/usr/bin/env npx tsx
/**
 * Backfill embeddings for existing submissions that don't have them
 * Run with: npx tsx scripts/backfill-embeddings.ts
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' }); // Also load .env for Supabase credentials

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function generateEmbeddingViaEdgeFunction(submissionId: string) {
  try {
    // Get submission details
    const { data: submission, error: fetchError } = await supabase
      .from('lesson_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      console.error(`❌ Failed to fetch submission ${submissionId}:`, fetchError);
      return false;
    }

    if (submission.content_embedding) {
      console.log(`⏭️  Submission ${submissionId} already has embedding`);
      return true;
    }

    console.log(`📡 Generating embedding for submission ${submissionId}...`);

    // Use Supabase client to invoke the function properly
    const { data: result, error: invokeError } = await supabase.functions.invoke(
      'process-submission',
      {
        body: {
          submissionId,
          regenerateEmbedding: true, // Flag to only regenerate embedding
        },
      }
    );

    if (invokeError) {
      console.error(`❌ Edge function error for ${submissionId}:`, invokeError.message);
      return false;
    }

    if (result?.success) {
      console.log(`✅ Embedding generated for submission ${submissionId}`);
      return true;
    } else {
      console.error(
        `❌ Failed to generate embedding for ${submissionId}:`,
        result?.error || 'Unknown error'
      );
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing submission ${submissionId}:`, error);
    return false;
  }
}

async function backfillAllEmbeddings() {
  console.log('='.repeat(60));
  console.log('🔄 Backfilling Embeddings for Submissions');
  console.log('='.repeat(60));

  // Get all submissions without embeddings
  const { data: submissions, error } = await supabase
    .from('lesson_submissions')
    .select('id, google_doc_url, created_at, status')
    .is('content_embedding', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch submissions:', error);
    process.exit(1);
  }

  if (!submissions || submissions.length === 0) {
    console.log('✅ All submissions already have embeddings!');
    return;
  }

  console.log(`\n📊 Found ${submissions.length} submissions without embeddings\n`);

  let successful = 0;
  let failed = 0;

  for (const submission of submissions) {
    console.log(
      `\n[${successful + failed + 1}/${submissions.length}] Processing submission ${submission.id}`
    );
    console.log(`   Status: ${submission.status}`);
    console.log(`   Created: ${submission.created_at}`);

    const success = await generateEmbeddingViaEdgeFunction(submission.id);
    if (success) {
      successful++;
    } else {
      failed++;
    }

    // Add a small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Backfill Complete');
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Total: ${submissions.length}`);
  console.log('='.repeat(60));
}

// Alternative: Direct OpenAI API approach for testing
async function testDirectOpenAI(content: string) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.log('⚠️  No local OPENAI_API_KEY, skipping direct test');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: content.substring(0, 8000), // Truncate to avoid token limits
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.data[0].embedding;
    } else {
      const error = await response.text();
      console.error('OpenAI error:', error);
      return null;
    }
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    return null;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--test')) {
    // Test mode: just test one submission
    const { data: submission } = await supabase
      .from('lesson_submissions')
      .select('*')
      .is('content_embedding', null)
      .limit(1)
      .single();

    if (submission) {
      console.log('🧪 Test mode: Processing one submission');
      await generateEmbeddingViaEdgeFunction(submission.id);
    } else {
      console.log('✅ No submissions need embeddings');
    }
  } else {
    // Full backfill
    await backfillAllEmbeddings();
  }
}

main().catch(console.error);
