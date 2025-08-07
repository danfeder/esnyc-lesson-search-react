#!/usr/bin/env node

/**
 * Regenerate embeddings for ALL lessons in the database
 * This ensures lessons with re-extracted content have accurate embeddings
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

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

/**
 * Call the generate-embeddings edge function
 */
async function generateEmbedding(lessonId, content) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        lessonId,
        content 
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge function error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`  ❌ Embedding generation failed: ${error.message}`);
    return null;
  }
}

async function regenerateAllEmbeddings() {
  console.log('🔄 Regenerating Embeddings for ALL Lessons\n');
  console.log('=' .repeat(60));

  try {
    // 1. Get all lessons
    console.log('📋 Fetching all lessons...');
    const { data: lessons, error: fetchError } = await supabase
      .from('lessons')
      .select('lesson_id, title, content_text, content_embedding')
      .order('created_at', { ascending: false });
    
    if (fetchError) throw fetchError;
    
    console.log(`✅ Found ${lessons.length} lessons\n`);
    
    // 2. Categorize lessons
    const withContent = lessons.filter(l => l.content_text && l.content_text.length > 100);
    const withoutContent = lessons.filter(l => !l.content_text || l.content_text.length <= 100);
    const withEmbedding = lessons.filter(l => l.content_embedding);
    const withoutEmbedding = lessons.filter(l => !l.content_embedding);
    
    console.log('📊 Current Status:');
    console.log(`  Lessons with content: ${withContent.length}`);
    console.log(`  Lessons without content: ${withoutContent.length}`);
    console.log(`  Lessons with embeddings: ${withEmbedding.length}`);
    console.log(`  Lessons without embeddings: ${withoutEmbedding.length}\n`);
    
    // 3. Focus on lessons that need embeddings (have content)
    const toProcess = withContent;
    console.log(`🎯 Will generate embeddings for ${toProcess.length} lessons with content\n`);
    
    // 4. Process in batches
    const BATCH_SIZE = 10;
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const batch = toProcess.slice(i, Math.min(i + BATCH_SIZE, toProcess.length));
      console.log(`\n📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(toProcess.length/BATCH_SIZE)}`);
      
      for (const lesson of batch) {
        process.stdout.write(`  ${lesson.title?.substring(0, 40).padEnd(40)} ... `);
        
        // Check if we should skip (for testing, you might want to only update certain ones)
        // For now, we'll regenerate ALL embeddings
        
        // Generate embedding
        const result = await generateEmbedding(lesson.lesson_id, lesson.content_text);
        
        if (result && result.success) {
          // Update in database
          const { error: updateError } = await supabase
            .from('lessons')
            .update({ 
              content_embedding: result.embedding,
              updated_at: new Date().toISOString()
            })
            .eq('lesson_id', lesson.lesson_id);
          
          if (!updateError) {
            console.log('✅');
            successCount++;
          } else {
            console.log(`❌ (update failed)`);
            failCount++;
          }
        } else {
          console.log('❌ (generation failed)');
          failCount++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`  Batch complete: ${successCount} succeeded so far`);
    }
    
    // 5. Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 EMBEDDING GENERATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n✅ Success: ${successCount} embeddings generated`);
    console.log(`❌ Failed: ${failCount} embeddings failed`);
    console.log(`⏭️  Skipped: ${skipCount} (no content)`);
    
    // 6. Verify
    const { data: finalCheck } = await supabase
      .from('lessons')
      .select('lesson_id')
      .is('content_embedding', null);
    
    if (finalCheck && finalCheck.length > 0) {
      console.log(`\n⚠️  ${finalCheck.length} lessons still missing embeddings`);
    } else {
      console.log('\n✨ All lessons with content now have embeddings!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// First check if the edge function exists
async function checkEdgeFunction() {
  console.log('🔍 Checking if generate-embeddings edge function exists...\n');
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
      }
    });
    
    if (response.status === 404) {
      console.log('⚠️  Edge function not found. Creating a simple version...\n');
      console.log('Note: This will use a mock embedding. Deploy the real edge function for production.\n');
      
      // For now, we'll create mock embeddings
      await createMockEmbeddings();
      return false;
    }
    
    console.log('✅ Edge function found\n');
    return true;
  } catch (error) {
    console.log('⚠️  Could not verify edge function. Will use mock embeddings.\n');
    return false;
  }
}

async function createMockEmbeddings() {
  console.log('🎭 Creating Mock Embeddings (for testing)\n');
  console.log('=' .repeat(60));
  
  try {
    // Get all lessons
    const { data: lessons } = await supabase
      .from('lessons')
      .select('lesson_id, title, content_text')
      .not('content_text', 'is', null);
    
    console.log(`Found ${lessons.length} lessons to process\n`);
    
    let count = 0;
    for (const lesson of lessons) {
      // Create a simple mock embedding based on content
      // OpenAI embeddings are 1536 dimensions
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => {
        // Create some variation based on content
        const seed = lesson.content_text?.length || 0;
        return Math.sin(seed * i * 0.001) * 0.1 + Math.random() * 0.01;
      });
      
      const { error } = await supabase
        .from('lessons')
        .update({ 
          embedding: mockEmbedding,
          updated_at: new Date().toISOString()
        })
        .eq('lesson_id', lesson.lesson_id);
      
      if (!error) {
        count++;
        if (count % 50 === 0) {
          console.log(`  Processed ${count}/${lessons.length} lessons...`);
        }
      }
    }
    
    console.log(`\n✅ Created mock embeddings for ${count} lessons`);
    console.log('\n⚠️  Note: These are mock embeddings for testing.');
    console.log('Deploy the generate-embeddings edge function for real embeddings.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Main execution
async function main() {
  const hasEdgeFunction = await checkEdgeFunction();
  
  if (hasEdgeFunction) {
    await regenerateAllEmbeddings();
  } else {
    console.log('📝 To create real embeddings, you need to:');
    console.log('1. Set up OpenAI API key in Supabase');
    console.log('2. Deploy the generate-embeddings edge function');
    console.log('3. Run this script again\n');
  }
}

main().catch(console.error);