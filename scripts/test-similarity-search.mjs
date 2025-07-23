#!/usr/bin/env node

/**
 * Test similarity search using embeddings
 * This demonstrates how the duplicate detection will work
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testSimilaritySearch() {
  console.log('🔍 Testing semantic similarity search...\n');

  // Initialize clients
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    // Get a sample lesson to search for similar ones
    const { data: sampleLesson, error: sampleError } = await supabase
      .from('lessons')
      .select('*')
      .eq('lesson_id', '0BxEc0RZeYtCib3ZfQmZPVkJYVUk') // "Herbs as Medicine" - we know this has duplicates
      .single();

    if (sampleError || !sampleLesson) {
      console.error('❌ Could not fetch sample lesson');
      return;
    }

    console.log(`📚 Searching for lessons similar to: "${sampleLesson.title}"\n`);

    // If the lesson already has an embedding, use it
    if (sampleLesson.content_embedding) {
      console.log('✅ Using existing embedding for search\n');
      
      // Use the SQL function we created
      const { data: similarLessons, error: searchError } = await supabase
        .rpc('find_similar_lessons_by_embedding', {
          query_embedding: sampleLesson.content_embedding,
          similarity_threshold: 0.5,
          max_results: 10
        });

      if (searchError) {
        console.error('❌ Search error:', searchError);
        return;
      }

      console.log('🎯 Similar lessons found:\n');
      similarLessons.forEach((lesson, index) => {
        console.log(`${index + 1}. "${lesson.title}"`);
        console.log(`   ID: ${lesson.lesson_id}`);
        console.log(`   Similarity: ${(lesson.similarity_score * 100).toFixed(1)}%`);
        console.log(`   Match type: ${lesson.match_type}`);
        console.log('');
      });

      // Also check hash-based duplicates
      console.log('\n🔍 Checking hash-based exact duplicates...\n');
      
      const { data: hashDuplicates } = await supabase
        .rpc('find_lessons_by_hash', {
          hash_value: sampleLesson.content_hash
        });

      if (hashDuplicates && hashDuplicates.length > 0) {
        console.log('📋 Exact duplicates (by content hash):');
        hashDuplicates.forEach(dup => {
          console.log(`   - "${dup.title}" (${dup.lesson_id})`);
        });
      } else {
        console.log('No exact hash matches found.');
      }

    } else {
      console.log('⚠️  Sample lesson has no embedding yet.');
      console.log('   Run: node generate-embeddings.mjs first');
    }

    // Demonstrate searching with a text query
    console.log('\n\n🔍 Testing text-based similarity search...\n');
    
    const searchQuery = "Teaching students about medicinal plants and herbal remedies in the garden";
    console.log(`Query: "${searchQuery}"\n`);

    // Generate embedding for the query
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: searchQuery
    });

    const queryEmbedding = `[${response.data[0].embedding.join(',')}]`;

    // Search for similar lessons
    const { data: queryResults, error: queryError } = await supabase
      .rpc('find_similar_lessons_by_embedding', {
        query_embedding: queryEmbedding,
        similarity_threshold: 0.3, // Lower threshold for text queries
        max_results: 5
      });

    if (queryError) {
      console.error('❌ Query error:', queryError);
      return;
    }

    console.log('🎯 Lessons matching your query:\n');
    queryResults.forEach((lesson, index) => {
      console.log(`${index + 1}. "${lesson.title}"`);
      console.log(`   Similarity: ${(lesson.similarity_score * 100).toFixed(1)}%`);
      console.log('');
    });

    // Show statistics
    console.log('\n📊 Similarity Search Statistics:');
    console.log('- Exact matches (95%+): Very likely duplicates');
    console.log('- High matches (85-95%): Probably variations of the same lesson');
    console.log('- Medium matches (70-85%): Related content, worth reviewing');
    console.log('- Low matches (<70%): Different lessons with some overlap');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testSimilaritySearch().catch(console.error);