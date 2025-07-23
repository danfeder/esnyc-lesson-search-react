#!/usr/bin/env node

/**
 * Generate embeddings for lesson content using OpenAI's text-embedding-3-small model
 * This enables semantic similarity search for duplicate detection
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { encoding_for_model } from 'tiktoken';

// Load environment variables
dotenv.config();

// Configuration
const IS_TEST_MODE = process.argv.includes('--test');
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 5; // Process 5 lessons at a time (reduced to avoid token limit)
const MAX_TOKENS_PER_LESSON = 7500; // More conservative limit to avoid errors

// Model configuration
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536; // Matches our pgvector column

// Initialize tokenizer - use cl100k_base for text-embedding-3-small
let tokenizer;
try {
  // For embedding models, we need to use cl100k_base encoding
  const { get_encoding } = await import('tiktoken');
  tokenizer = get_encoding('cl100k_base');
} catch (error) {
  console.error('Failed to load tiktoken:', error);
  process.exit(1);
}

// Database configuration
const SUPABASE_URL = IS_TEST_MODE 
  ? 'https://epedjebjemztzdyhqace.supabase.co'
  : process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = IS_TEST_MODE 
  ? process.env.TEST_SUPABASE_SERVICE_KEY 
  : process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Truncate text to fit within token limit
 */
function truncateToTokenLimit(text, maxTokens) {
  const tokens = tokenizer.encode(text);
  if (tokens.length <= maxTokens) {
    return text;
  }
  
  // Truncate tokens and decode back to text
  const truncatedTokens = tokens.slice(0, maxTokens - 10); // Leave room for ellipsis
  const truncatedText = tokenizer.decode(truncatedTokens);
  return truncatedText + '...';
}

/**
 * Prepare lesson text for embedding
 */
function prepareLessonText(lesson) {
  // Combine relevant fields for embedding
  const parts = [
    `Title: ${lesson.title}`,
    `Summary: ${lesson.summary}`,
    `Grade Levels: ${(lesson.grade_levels || []).join(', ')}`,
  ];

  // Add key metadata
  if (lesson.metadata) {
    if (lesson.metadata.thematicCategory) {
      parts.push(`Theme: ${lesson.metadata.thematicCategory}`);
    }
    if (lesson.metadata.culturalHeritage) {
      parts.push(`Culture: ${lesson.metadata.culturalHeritage}`);
    }
    if (lesson.metadata.skills?.length > 0) {
      parts.push(`Skills: ${lesson.metadata.skills.join(', ')}`);
    }
    if (lesson.metadata.ingredients?.length > 0) {
      parts.push(`Ingredients: ${lesson.metadata.ingredients.join(', ')}`);
    }
  }

  // Add the main content
  if (lesson.content_text) {
    parts.push('\nContent:');
    parts.push(lesson.content_text);
  }

  const fullText = parts.join('\n');
  return truncateToTokenLimit(fullText, MAX_TOKENS_PER_LESSON);
}

async function generateEmbeddings() {
  console.log(`🤖 Generating embeddings for ${IS_TEST_MODE ? 'TEST' : 'PRODUCTION'} database...\n`);

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY in .env file');
    console.error('   Get your API key from: https://platform.openai.com/api-keys');
    process.exit(1);
  }

  if (!SUPABASE_KEY) {
    console.error(`❌ Missing ${IS_TEST_MODE ? 'TEST_SUPABASE_SERVICE_KEY' : 'SUPABASE_SERVICE_ROLE_KEY'} in .env file`);
    process.exit(1);
  }

  // Initialize clients
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    // Fetch lessons that need embeddings
    console.log('📋 Fetching lessons without embeddings...');
    const { data: lessons, error: fetchError } = await supabase
      .from('lessons')
      .select('*')
      .not('content_text', 'is', null)  // Must have content
      .is('content_embedding', null)     // But no embedding yet
      .order('lesson_id');

    if (fetchError) throw fetchError;

    if (!lessons || lessons.length === 0) {
      console.log('✅ All lessons already have embeddings!');
      return;
    }

    console.log(`📊 Found ${lessons.length} lessons to process\n`);

    // Calculate estimated cost
    let totalTokens = 0;
    const preparedTexts = lessons.map(lesson => {
      const text = prepareLessonText(lesson);
      const tokens = tokenizer.encode(text).length;
      totalTokens += tokens;
      return { lesson, text, tokens };
    });

    const estimatedCost = (totalTokens / 1000) * 0.00002;
    console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)} for ${totalTokens.toLocaleString()} tokens`);
    console.log(`   Average tokens per lesson: ${Math.round(totalTokens / lessons.length)}\n`);

    if (DRY_RUN) {
      console.log('🔍 DRY RUN - Showing sample prepared texts:\n');
      preparedTexts.slice(0, 3).forEach(({ lesson, text, tokens }) => {
        console.log(`Lesson: ${lesson.title}`);
        console.log(`Tokens: ${tokens}`);
        console.log(`Preview: ${text.substring(0, 200)}...\n`);
      });
      console.log('✅ Dry run complete. Add --dry-run=false to generate actual embeddings.');
      return;
    }

    // Confirm before proceeding
    console.log('⚠️  This will generate embeddings using OpenAI API');
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Process in batches
    let processed = 0;
    let errors = 0;
    const startTime = Date.now();

    for (let i = 0; i < preparedTexts.length; i += BATCH_SIZE) {
      const batch = preparedTexts.slice(i, i + BATCH_SIZE);
      
      try {
        // Generate embeddings for batch
        console.log(`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}...`);
        
        const response = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: batch.map(item => item.text),
        });

        // Update database with embeddings
        const updates = await Promise.all(
          batch.map(async (item, index) => {
            const embedding = response.data[index].embedding;
            
            // Convert to pgvector format
            const vectorString = `[${embedding.join(',')}]`;
            
            const { error } = await supabase
              .from('lessons')
              .update({ 
                content_embedding: vectorString 
              })
              .eq('lesson_id', item.lesson.lesson_id);

            if (error) {
              console.error(`   ❌ Error updating ${item.lesson.lesson_id}: ${error.message}`);
              errors++;
              return false;
            }
            
            return true;
          })
        );

        processed += updates.filter(Boolean).length;
        console.log(`   ✅ Updated ${updates.filter(Boolean).length}/${batch.length} lessons`);
        
        // Show progress
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = processed / elapsed;
        const remaining = (preparedTexts.length - processed) / rate;
        console.log(`   ⏱️  Progress: ${processed}/${preparedTexts.length} (${Math.round(remaining)}s remaining)\n`);

        // Rate limiting pause (3 requests per minute for free tier)
        if (i + BATCH_SIZE < preparedTexts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ Batch error: ${error.message}`);
        errors += batch.length;
        
        // Longer pause on error
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Verify results
    console.log('\n🔍 Verifying embeddings...');
    const { count: totalCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    const { count: embeddedCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .not('content_embedding', 'is', null);

    const totalTime = (Date.now() - startTime) / 1000;
    const actualCost = ((processed * (totalTokens / lessons.length)) / 1000) * 0.00002;

    console.log('\n' + '='.repeat(60));
    console.log('📊 EMBEDDING GENERATION SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully embedded: ${processed} lessons`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total lessons: ${totalCount}`);
    console.log(`🧮 Lessons with embeddings: ${embeddedCount}`);
    console.log(`💰 Actual cost: ~$${actualCost.toFixed(4)}`);
    console.log(`⏱️  Total time: ${Math.round(totalTime)}s (${(totalTime / processed).toFixed(1)}s per lesson)`);
    console.log(`📈 Coverage: ${((embeddedCount / totalCount) * 100).toFixed(1)}%`);

    if (embeddedCount === totalCount) {
      console.log('\n🎉 All lessons now have embeddings!');
      console.log('\nNext steps:');
      console.log('1. Test semantic similarity search');
      console.log('2. Build duplicate detection UI');
      console.log('3. Implement submission pipeline');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Show usage
if (process.argv.includes('--help')) {
  console.log('Usage: node generate-embeddings.mjs [options]');
  console.log('Options:');
  console.log('  --test      Run on test database instead of production');
  console.log('  --dry-run   Show what would be done without making API calls');
  console.log('  --help      Show this help message');
  process.exit(0);
}

// Run the embedding generation
generateEmbeddings().catch(console.error);