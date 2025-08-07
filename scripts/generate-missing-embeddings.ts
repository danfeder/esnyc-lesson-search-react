#!/usr/bin/env npx tsx
/**
 * Generate missing content hashes and embeddings for lessons
 *
 * This script will:
 * 1. Generate content_text from metadata for lessons missing it
 * 2. Generate content_hash from content_text
 * 3. Generate embeddings using OpenAI API
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

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

// Generate content text from lesson metadata
function generateContentText(lesson: any): string {
  const parts: string[] = [];

  // Add basic fields
  if (lesson.title) parts.push(lesson.title);
  if (lesson.summary) parts.push(lesson.summary);

  // Add grade levels
  if (lesson.grade_levels?.length > 0) {
    parts.push(`Grade Levels: ${lesson.grade_levels.join(', ')}`);
  }

  // Add thematic categories
  if (lesson.thematic_categories?.length > 0) {
    parts.push(`Themes: ${lesson.thematic_categories.join(', ')}`);
  }

  // Add season/timing
  if (lesson.season_timing?.length > 0) {
    parts.push(`Season: ${lesson.season_timing.join(', ')}`);
  }

  // Add location requirements
  if (lesson.location_requirements?.length > 0) {
    parts.push(`Location: ${lesson.location_requirements.join(', ')}`);
  }

  // Add main ingredients
  if (lesson.main_ingredients?.length > 0) {
    parts.push(`Ingredients: ${lesson.main_ingredients.join(', ')}`);
  }

  // Add cooking methods
  if (lesson.cooking_methods?.length > 0) {
    parts.push(`Cooking Methods: ${lesson.cooking_methods.join(', ')}`);
  }

  // Add garden skills
  if (lesson.garden_skills?.length > 0) {
    parts.push(`Garden Skills: ${lesson.garden_skills.join(', ')}`);
  }

  // Add cooking skills
  if (lesson.cooking_skills?.length > 0) {
    parts.push(`Cooking Skills: ${lesson.cooking_skills.join(', ')}`);
  }

  // Add core competencies
  if (lesson.core_competencies?.length > 0) {
    parts.push(`Core Competencies: ${lesson.core_competencies.join(', ')}`);
  }

  // Add academic integration
  if (lesson.academic_integration?.length > 0) {
    parts.push(`Academic Integration: ${lesson.academic_integration.join(', ')}`);
  }

  // Add social emotional learning
  if (lesson.social_emotional_learning?.length > 0) {
    parts.push(`SEL: ${lesson.social_emotional_learning.join(', ')}`);
  }

  // Add cultural heritage
  if (lesson.cultural_heritage?.length > 0) {
    parts.push(`Cultural Heritage: ${lesson.cultural_heritage.join(', ')}`);
  }

  // Add processing notes if available
  if (lesson.processing_notes) {
    parts.push(`Notes: ${lesson.processing_notes}`);
  }

  return parts.join('\n\n');
}

// Generate SHA256 hash of content
function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

// Generate embeddings using OpenAI via Supabase Edge Function
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    // Call the Supabase edge function to generate embeddings
    const { data, error } = await supabase.functions.invoke('generate-embeddings', {
      body: { text: text.slice(0, 8000) }, // Limit text length for embedding
    });

    if (error) {
      console.error('Error generating embedding:', error);
      return null;
    }

    return data?.embedding || null;
  } catch (err) {
    console.error('Failed to generate embedding:', err);
    return null;
  }
}

async function main() {
  console.log('🔄 Generating Missing Content Hashes and Embeddings');
  console.log('==================================================\n');

  try {
    // Step 1: Get lessons missing content_text or content_hash
    console.log('📊 Fetching lessons with missing data...');
    const { data: lessonsNeedingContent, error: fetchError1 } = await supabase
      .from('lessons')
      .select('*')
      .or('content_text.is.null,content_hash.is.null')
      .order('created_at', { ascending: false });

    if (fetchError1) throw fetchError1;

    console.log(
      `   Found ${lessonsNeedingContent?.length || 0} lessons needing content generation\n`
    );

    // Step 2: Generate content_text and content_hash for these lessons
    if (lessonsNeedingContent && lessonsNeedingContent.length > 0) {
      console.log('📝 Generating content text and hashes...');

      let updated = 0;
      for (const lesson of lessonsNeedingContent) {
        const contentText = lesson.content_text || generateContentText(lesson);
        const contentHash = generateContentHash(contentText);

        const { error: updateError } = await supabase
          .from('lessons')
          .update({
            content_text: contentText,
            content_hash: contentHash,
          })
          .eq('lesson_id', lesson.lesson_id);

        if (updateError) {
          console.error(`   ❌ Failed to update ${lesson.title}: ${updateError.message}`);
        } else {
          updated++;
          if (updated % 10 === 0) {
            console.log(`   ✓ Updated ${updated}/${lessonsNeedingContent.length} lessons...`);
          }
        }
      }

      console.log(`   ✅ Generated content for ${updated} lessons\n`);
    }

    // Step 3: Get lessons missing embeddings
    console.log('🔍 Fetching lessons missing embeddings...');
    const { data: lessonsNeedingEmbeddings, error: fetchError2 } = await supabase
      .from('lessons')
      .select('lesson_id, title, content_text')
      .is('content_embedding', null)
      .not('content_text', 'is', null)
      .order('created_at', { ascending: false });

    if (fetchError2) throw fetchError2;

    console.log(`   Found ${lessonsNeedingEmbeddings?.length || 0} lessons needing embeddings\n`);

    // Step 4: Check if the edge function exists
    console.log('🔧 Checking for edge function...');

    // First, let's try a test call to see if the function exists
    const testResponse = await supabase.functions.invoke('generate-embeddings', {
      body: { text: 'test' },
    });

    if (testResponse.error?.message?.includes('not found')) {
      console.log('   ⚠️  Edge function not found. Creating it now...\n');

      // Create the edge function
      await createEmbeddingFunction();

      // Wait a moment for deployment
      console.log('   ⏳ Waiting for function deployment...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } else {
      console.log('   ✅ Edge function exists\n');
    }

    // Step 5: Generate embeddings
    if (lessonsNeedingEmbeddings && lessonsNeedingEmbeddings.length > 0) {
      console.log('🤖 Generating embeddings using OpenAI...');
      console.log('   This may take a few minutes...\n');

      let embeddingsGenerated = 0;
      let embeddingsFailed = 0;

      for (const lesson of lessonsNeedingEmbeddings) {
        if (!lesson.content_text) continue;

        const embedding = await generateEmbedding(lesson.content_text);

        if (embedding) {
          const { error: updateError } = await supabase
            .from('lessons')
            .update({ content_embedding: embedding })
            .eq('lesson_id', lesson.lesson_id);

          if (updateError) {
            console.error(
              `   ❌ Failed to save embedding for ${lesson.title}: ${updateError.message}`
            );
            embeddingsFailed++;
          } else {
            embeddingsGenerated++;
            if (embeddingsGenerated % 5 === 0) {
              console.log(
                `   ✓ Generated ${embeddingsGenerated}/${lessonsNeedingEmbeddings.length} embeddings...`
              );
            }
          }
        } else {
          embeddingsFailed++;
          console.error(`   ❌ Failed to generate embedding for ${lesson.title}`);
        }

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      console.log(`\n   ✅ Generated ${embeddingsGenerated} embeddings`);
      if (embeddingsFailed > 0) {
        console.log(`   ⚠️  Failed to generate ${embeddingsFailed} embeddings`);
      }
    }

    // Final status
    console.log('\n📊 Final Status:');
    const { data: finalStats } = await supabase
      .from('lessons')
      .select('lesson_id')
      .is('content_embedding', null);

    console.log(`   Lessons still missing embeddings: ${finalStats?.length || 0}`);

    const { data: hashStats } = await supabase
      .from('lessons')
      .select('lesson_id')
      .is('content_hash', null);

    console.log(`   Lessons still missing content hash: ${hashStats?.length || 0}`);

    console.log('\n✅ Complete! You can now re-run the duplicate analysis.');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Create the edge function if it doesn't exist
async function createEmbeddingFunction() {
  const functionCode = `
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text } = await req.json()
    
    if (!text) {
      throw new Error('No text provided')
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Call OpenAI API to generate embeddings
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${openaiApiKey}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000), // Limit input length
        dimensions: 1536,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(\`OpenAI API error: \${error}\`)
    }

    const data = await response.json()
    const embedding = data.data[0].embedding

    return new Response(
      JSON.stringify({ embedding }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
`;

  console.log('   📝 Writing edge function code...');

  // Note: In production, you would use Supabase CLI to deploy this
  // For now, we'll just log that it needs to be created
  console.log(`
   ⚠️  Please create the following edge function manually:
   
   1. Create file: supabase/functions/generate-embeddings/index.ts
   2. Add the function code (saved to generate-embeddings-function.ts)
   3. Deploy with: supabase functions deploy generate-embeddings
   4. Ensure OPENAI_API_KEY is set in Supabase secrets
  `);

  // Save the function code for reference
  const fs = await import('fs/promises');
  await fs.writeFile(join(__dirname, 'generate-embeddings-function.ts'), functionCode);
}

// Run the script
main().catch(console.error);
