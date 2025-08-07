#!/usr/bin/env npx tsx
/**
 * Resume Gemini embeddings migration from a specific point
 * This script continues from where the previous run timed out
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Configuration
const START_FROM_INDEX = parseInt(process.argv[2] || '680');
const BATCH_LIMIT = parseInt(process.argv[3] || '200'); // Process limited batch to avoid timeout

// Initialize Supabase client with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Generate Gemini embeddings via edge function
async function generateGeminiEmbedding(text: string): Promise<number[] | null> {
  try {
    // Call the Supabase edge function to generate Gemini embeddings
    const { data, error } = await supabase.functions.invoke('generate-gemini-embeddings', {
      body: {
        text: text.slice(0, 2048), // Gemini supports 2048 tokens
        taskType: 'SEMANTIC_SIMILARITY', // Optimized for duplicate detection
      },
    });

    if (error) {
      console.error('Error generating Gemini embedding:', error);
      return null;
    }

    return data?.embedding || null;
  } catch (err) {
    console.error('Failed to generate Gemini embedding:', err);
    return null;
  }
}

async function resumeMigration() {
  console.log('🔄 Resuming Gemini Embeddings Migration');
  console.log(`   Starting from index: ${START_FROM_INDEX}`);
  console.log(`   Processing up to: ${BATCH_LIMIT} lessons`);
  console.log('====================================================\n');

  try {
    // Step 1: Fetch all lessons ordered consistently
    console.log('📚 Fetching all lessons (ordered by created_at)...');
    const { data: allLessons, error: allError } = await supabase
      .from('lessons')
      .select('lesson_id, title, content_text')
      .order('created_at');

    if (allError) throw allError;

    console.log(`   Found ${allLessons?.length || 0} total lessons`);

    if (!allLessons || allLessons.length === 0) {
      console.log('No lessons found');
      return;
    }

    // Step 2: Get the subset to process
    const endIndex = Math.min(START_FROM_INDEX + BATCH_LIMIT, allLessons.length);
    const lessonsToProcess = allLessons.slice(START_FROM_INDEX, endIndex);

    console.log(`   Will process lessons ${START_FROM_INDEX} to ${endIndex - 1}`);
    console.log(`   (${lessonsToProcess.length} lessons)\n`);

    // Step 3: Generate embeddings for the subset
    if (lessonsToProcess.length > 0) {
      console.log('🤖 Generating Gemini embeddings...');
      console.log('   Using model: gemini-embedding-001 (1536 dimensions)');
      console.log('   Task type: SEMANTIC_SIMILARITY\n');

      let processed = 0;
      let succeeded = 0;
      let failed = 0;
      const startTime = Date.now();

      for (let i = 0; i < lessonsToProcess.length; i++) {
        const lesson = lessonsToProcess[i];
        const globalIndex = START_FROM_INDEX + i;

        if (!lesson.content_text) {
          console.warn(`   ⚠️  [${globalIndex}] Skipping ${lesson.title} - no content_text`);
          failed++;
          continue;
        }

        // Show progress every 10 lessons
        if (i % 10 === 0 && i > 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = processed / elapsed;
          const remaining = (lessonsToProcess.length - i) / rate;
          console.log(
            `   ⏳ Progress: ${i}/${lessonsToProcess.length} (${Math.round(remaining)}s remaining)`
          );
        }

        const embedding = await generateGeminiEmbedding(lesson.content_text);

        if (embedding) {
          // Update the lesson with new embedding
          const { error: updateError } = await supabase
            .from('lessons')
            .update({ content_embedding: embedding })
            .eq('lesson_id', lesson.lesson_id);

          if (updateError) {
            console.error(
              `   ❌ [${globalIndex}] Failed to save embedding for ${lesson.title}: ${updateError.message}`
            );
            failed++;
          } else {
            succeeded++;
            processed++;

            // Show success for every 25th lesson
            if (processed % 25 === 0) {
              console.log(`   ✓ [${globalIndex}] ${lesson.title} - embedding saved`);
            }
          }
        } else {
          failed++;
          console.error(`   ❌ [${globalIndex}] Failed to generate embedding for: ${lesson.title}`);
        }

        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`\n   ✅ Generated ${succeeded} Gemini embeddings`);
      console.log(`   ⏱️  Time taken: ${Math.round(elapsed)}s`);
      if (failed > 0) {
        console.log(`   ⚠️  Failed to generate ${failed} embeddings`);
      }
    }

    // Step 4: Check overall progress
    console.log('\n🔍 Checking overall migration progress...');

    const { count: totalCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    const { count: withEmbeddings } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .not('content_embedding', 'is', null);

    console.log(`   Total lessons: ${totalCount}`);
    console.log(`   With embeddings: ${withEmbeddings}`);
    console.log(`   Without embeddings: ${(totalCount || 0) - (withEmbeddings || 0)}`);
    console.log(`   Coverage: ${Math.round(((withEmbeddings || 0) / (totalCount || 1)) * 100)}%`);

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Resume Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Processed lessons ${START_FROM_INDEX} to ${endIndex - 1}`);
    console.log(`Successfully migrated: ${succeeded}`);
    console.log(`Failed: ${failed}`);

    if (endIndex < allLessons.length) {
      console.log(`\n⚠️  Still ${allLessons.length - endIndex} lessons remaining`);
      console.log(`To continue, run: npm run resume-embeddings ${endIndex}`);
    } else {
      console.log('\n✅ All lessons have been processed!');
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
console.log('Starting resumed migration...');
resumeMigration().catch(console.error);
