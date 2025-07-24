#!/usr/bin/env node

/**
 * Generate embeddings for extra-long lessons that exceed normal token limits
 * Uses aggressive truncation to fit within model constraints
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_TOKENS = 6000; // Very conservative limit for long lessons

// Initialize tokenizer
let tokenizer;
try {
  const { get_encoding } = await import('tiktoken');
  tokenizer = get_encoding('cl100k_base');
} catch (error) {
  console.error('Failed to load tiktoken:', error);
  process.exit(1);
}

/**
 * Aggressively truncate text for very long lessons
 */
function prepareLongLessonText(lesson) {
  // Start with essential metadata only
  const parts = [
    `Title: ${lesson.title}`,
    `Summary: ${lesson.summary || ''}`,
    `Grades: ${(lesson.grade_levels || []).join(', ')}`
  ];

  // Add key metadata if available
  if (lesson.metadata) {
    if (lesson.metadata.thematicCategory) {
      parts.push(`Theme: ${lesson.metadata.thematicCategory}`);
    }
    if (lesson.metadata.skills?.length > 0) {
      parts.push(`Skills: ${lesson.metadata.skills.slice(0, 10).join(', ')}`);
    }
    if (lesson.metadata.ingredients?.length > 0) {
      parts.push(`Ingredients: ${lesson.metadata.ingredients.slice(0, 10).join(', ')}`);
    }
  }

  // Add truncated content
  if (lesson.content_text) {
    const contentPreview = lesson.content_text.substring(0, 10000); // Take first 10k chars
    parts.push('\nContent Preview:');
    parts.push(contentPreview);
  }

  const fullText = parts.join('\n');
  
  // Check token count and truncate if needed
  const tokens = tokenizer.encode(fullText);
  if (tokens.length > MAX_TOKENS) {
    const truncatedTokens = tokens.slice(0, MAX_TOKENS);
    return tokenizer.decode(truncatedTokens) + '...';
  }
  
  return fullText;
}

async function generateLongLessonEmbeddings() {
  console.log('🔍 Processing extra-long lessons...\n');

  // Initialize clients
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    // Fetch lessons without embeddings
    const { data: lessons, error: fetchError } = await supabase
      .from('lessons')
      .select('*')
      .not('content_text', 'is', null)
      .is('content_embedding', null)
      .order('lesson_id');

    if (fetchError) throw fetchError;

    if (!lessons || lessons.length === 0) {
      console.log('✅ All lessons have embeddings!');
      return;
    }

    console.log(`📊 Found ${lessons.length} lessons without embeddings\n`);

    // Process one by one for long lessons
    let processed = 0;
    let errors = 0;

    for (const lesson of lessons) {
      try {
        console.log(`Processing: ${lesson.title}`);
        
        const text = prepareLongLessonText(lesson);
        const tokenCount = tokenizer.encode(text).length;
        console.log(`  Token count: ${tokenCount}`);

        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text
        });

        const embedding = response.data[0].embedding;
        const vectorString = `[${embedding.join(',')}]`;

        const { error: updateError } = await supabase
          .from('lessons')
          .update({ content_embedding: vectorString })
          .eq('lesson_id', lesson.lesson_id);

        if (updateError) {
          console.error(`  ❌ Update error: ${updateError.message}`);
          errors++;
        } else {
          console.log(`  ✅ Successfully embedded`);
          processed++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        errors++;
      }
    }

    // Final verification
    const { count: totalCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    const { count: embeddedCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .not('content_embedding', 'is', null);

    console.log('\n' + '='.repeat(60));
    console.log('📊 LONG LESSON EMBEDDING SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully embedded: ${processed} lessons`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total lessons: ${totalCount}`);
    console.log(`🧮 Lessons with embeddings: ${embeddedCount}`);
    console.log(`📈 Coverage: ${((embeddedCount / totalCount) * 100).toFixed(1)}%`);

    if (embeddedCount === totalCount) {
      console.log('\n🎉 All lessons now have embeddings!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
generateLongLessonEmbeddings().catch(console.error);