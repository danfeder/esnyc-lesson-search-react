#!/usr/bin/env npx tsx
/**
 * Migrate from OpenAI embeddings to Gemini embeddings
 *
 * This script will:
 * 1. Back up existing OpenAI embeddings
 * 2. Generate new Gemini embeddings for all lessons
 * 3. Update the database with new embeddings
 *
 * Gemini embedding advantages:
 * - Better performance on semantic similarity tasks
 * - Using 1536 dimensions for optimal quality (MTEB score: 68.17)
 * - Task-specific optimization (SEMANTIC_SIMILARITY for duplicate detection)
 * - Matryoshka technique allows future dimension reduction if needed
 * - No database schema changes required
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

// Configuration constants
const EMBEDDING_RATE_LIMIT_DELAY_MS = 100; // Delay between API calls to avoid rate limiting
const GEMINI_TOKEN_LIMIT = 2048; // Maximum tokens supported by Gemini
const EMBEDDING_DIMENSIONS = 1536; // Target embedding dimensions

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
        text: text.slice(0, GEMINI_TOKEN_LIMIT),
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

async function main() {
  console.log('🔄 Migrating to Gemini Embeddings (gemini-embedding-001)');
  console.log('====================================================\n');

  try {
    // Step 1: Check if Gemini API key is configured
    console.log('🔑 Checking Gemini API configuration...');

    // Test the edge function
    const testResponse = await supabase.functions.invoke('generate-gemini-embeddings', {
      body: { text: 'test', taskType: 'SEMANTIC_SIMILARITY' },
    });

    if (testResponse.error?.message?.includes('API key')) {
      console.error('\n❌ Gemini API key not configured!');
      console.log('\nTo set up Gemini API key:');
      console.log('1. Get your API key from: https://makersuite.google.com/app/apikey');
      console.log('2. Set it as a Supabase secret:');
      console.log('   supabase secrets set GEMINI_API_KEY=your-api-key-here');
      console.log('\nThen re-run this script.\n');
      process.exit(1);
    }

    if (testResponse.data?.embedding) {
      console.log(
        `   ✅ Gemini API configured (returns ${testResponse.data.dimensions} dimensions)\n`
      );
    }

    // Step 2: Back up existing embeddings
    console.log('💾 Backing up existing OpenAI embeddings...');

    const backupDir = join(__dirname, '..', 'backups');
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = join(backupDir, `openai-embeddings-backup-${timestamp}.json`);

    // Fetch all lessons with embeddings
    const { data: lessons, error: fetchError } = await supabase
      .from('lessons')
      .select('lesson_id, title, content_embedding')
      .not('content_embedding', 'is', null);

    if (fetchError) throw fetchError;

    // Save backup
    await fs.writeFile(backupFile, JSON.stringify(lessons, null, 2));
    console.log(`   ✅ Backed up ${lessons?.length || 0} embeddings to ${backupFile}\n`);

    // Step 3: Fetch all lessons for re-embedding
    console.log('📚 Fetching all lessons...');
    const { data: allLessons, error: allError } = await supabase
      .from('lessons')
      .select('lesson_id, title, content_text')
      .order('created_at');

    if (allError) throw allError;

    console.log(`   Found ${allLessons?.length || 0} lessons to process\n`);

    // Step 4: Generate new Gemini embeddings
    if (allLessons && allLessons.length > 0) {
      console.log('🤖 Generating Gemini embeddings...');
      console.log(`   Using model: gemini-embedding-001 (${EMBEDDING_DIMENSIONS} dimensions)`);
      console.log('   Task type: SEMANTIC_SIMILARITY (optimized for duplicate detection)');
      console.log('   This may take several minutes...\n');

      let processed = 0;
      let succeeded = 0;
      let failed = 0;

      for (const lesson of allLessons) {
        if (!lesson.content_text) {
          console.warn(`   ⚠️  Skipping ${lesson.title} - no content_text`);
          failed++;
          continue;
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
              `   ❌ Failed to save embedding for ${lesson.title}: ${updateError.message}`
            );
            failed++;
          } else {
            succeeded++;
            processed++;

            // Progress indicator
            if (processed % 10 === 0) {
              const percent = Math.round((processed / allLessons.length) * 100);
              console.log(`   ✓ Progress: ${processed}/${allLessons.length} (${percent}%)...`);
            }
          }
        } else {
          failed++;
          console.error(`   ❌ Failed to generate embedding for: ${lesson.title}`);
        }

        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, EMBEDDING_RATE_LIMIT_DELAY_MS));
      }

      console.log(`\n   ✅ Generated ${succeeded} Gemini embeddings`);
      if (failed > 0) {
        console.log(`   ⚠️  Failed to generate ${failed} embeddings`);
      }
    }

    // Step 5: Verify migration
    console.log('\n🔍 Verifying migration...');

    const { data: verifyData, error: verifyError } = await supabase
      .from('lessons')
      .select('lesson_id, content_embedding')
      .limit(5);

    if (verifyError) throw verifyError;

    if (verifyData && verifyData[0]?.content_embedding) {
      const embeddingLength = (verifyData[0].content_embedding as any[]).length;
      console.log(`   ✅ Embeddings now have ${embeddingLength} dimensions`);

      if (embeddingLength === EMBEDDING_DIMENSIONS) {
        console.log(
          `   ✅ Successfully migrated to Gemini embeddings (${EMBEDDING_DIMENSIONS} dimensions)!`
        );
      } else if (embeddingLength === 768) {
        console.log('   ⚠️  Showing 768 dimensions. Check outputDimensionality setting.');
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total Lessons: ${allLessons?.length || 0}`);
    console.log(`Successfully Migrated: ${succeeded}`);
    console.log(`Failed: ${failed}`);
    console.log(`Backup Location: ${backupFile}`);
    console.log('\nNext Steps:');
    console.log('1. Re-run duplicate analysis with new embeddings');
    console.log('2. Compare results with OpenAI embeddings');
    console.log(
      '3. Adjust similarity thresholds if needed (Gemini may have different similarity ranges)'
    );
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
main().catch(console.error);
