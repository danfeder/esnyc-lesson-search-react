#!/usr/bin/env npx tsx
/**
 * Verify if Gemini embeddings migration completed successfully
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

async function main() {
  console.log('🔍 Verifying Gemini Embeddings Migration');
  console.log('========================================\n');

  try {
    // Load the latest backup to compare
    const backupDir = join(__dirname, '..', 'backups');
    const backupFiles = await fs.readdir(backupDir);
    const latestBackup = backupFiles.sort().reverse()[0];
    const backupPath = join(backupDir, latestBackup);

    console.log(`📁 Loading backup from: ${latestBackup}`);
    const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));

    // Get a sample lesson from backup
    const sampleBackup = backupData[0];
    const backupEmbedding = sampleBackup.content_embedding;

    // Parse the string representation of the array
    const backupValues = JSON.parse(backupEmbedding);

    console.log(`\n📊 Backup Embedding Sample (${sampleBackup.title}):`);
    console.log(`   - Dimensions: ${backupValues.length}`);
    console.log(`   - First 3 values: [${backupValues.slice(0, 3).join(', ')}]`);

    // Get the same lesson from current database
    const { data: currentLesson, error: fetchError } = await supabase
      .from('lessons')
      .select('lesson_id, title, content_embedding')
      .eq('lesson_id', sampleBackup.lesson_id)
      .single();

    if (fetchError) throw fetchError;

    // Since content_embedding is a vector type, we need to get it as text
    const { data: vectorData, error: vectorError } = await supabase.rpc('get_embedding_as_text', {
      lesson_id_param: sampleBackup.lesson_id,
    });

    if (!vectorError && vectorData) {
      // Parse the vector data
      const currentValues = JSON.parse(vectorData);

      console.log(`\n📊 Current Embedding (${currentLesson.title}):`);
      console.log(`   - Has embedding: ${currentLesson.content_embedding !== null}`);
      console.log(`   - Dimensions: ${currentValues.length}`);
      console.log(`   - First 3 values: [${currentValues.slice(0, 3).join(', ')}]`);

      // Compare values
      const valuesChanged =
        backupValues[0] !== currentValues[0] ||
        backupValues[1] !== currentValues[1] ||
        backupValues[2] !== currentValues[2];

      if (valuesChanged) {
        console.log(`\n   ✅ Embeddings HAVE CHANGED (migration likely succeeded)`);
        console.log(`   - OpenAI first 3: [${backupValues.slice(0, 3).join(', ')}]`);
        console.log(`   - Gemini first 3: [${currentValues.slice(0, 3).join(', ')}]`);
      } else {
        console.log(`\n   ⚠️  Embeddings appear UNCHANGED (migration may have failed)`);
        console.log(`   - Both have same first 3 values`);
      }
    } else {
      // Function doesn't exist or other error
      if (vectorError) {
        console.log(`\n⚠️  Could not fetch embedding as text: ${vectorError.message}`);

        // Manual check - count lessons with embeddings
        const { count: totalCount } = await supabase
          .from('lessons')
          .select('*', { count: 'exact', head: true });

        const { count: withEmbeddings } = await supabase
          .from('lessons')
          .select('*', { count: 'exact', head: true })
          .not('content_embedding', 'is', null);

        console.log(`\n📈 Embedding Statistics:`);
        console.log(`   - Total lessons: ${totalCount}`);
        console.log(`   - With embeddings: ${withEmbeddings}`);
        console.log(`   - Coverage: ${((withEmbeddings! / totalCount!) * 100).toFixed(1)}%`);
      }
    }

    // Check if edge function is working
    console.log('\n🔧 Testing Gemini Edge Function...');
    const testResponse = await supabase.functions.invoke('generate-gemini-embeddings', {
      body: {
        text: 'Test embedding generation',
        taskType: 'SEMANTIC_SIMILARITY',
      },
    });

    if (testResponse.error) {
      console.log(`   ❌ Edge function error: ${testResponse.error.message}`);
    } else if (testResponse.data?.embedding) {
      console.log(`   ✅ Edge function working!`);
      console.log(`   - Returns ${testResponse.data.dimensions} dimensions`);
    } else {
      console.log(`   ⚠️  Edge function returned unexpected response`);
    }

    // Summary statistics
    const { data: stats } = await supabase
      .from('lessons')
      .select('lesson_id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (stats) {
      const recentUpdates = stats.filter((s) => {
        const updated = new Date(s.updated_at);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return updated > hourAgo;
      });

      console.log(`\n📊 Recent Activity:`);
      console.log(`   - Lessons updated in last hour: ${recentUpdates.length}`);

      if (recentUpdates.length > 0) {
        console.log(`   - Most recent update: ${new Date(stats[0].updated_at).toLocaleString()}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎯 Migration Verification Complete');
    console.log('='.repeat(60));
    console.log('\nNext Steps:');
    console.log('1. If embeddings unchanged, check edge function logs');
    console.log('2. If edge function failing, check Gemini API key');
    console.log('3. Consider re-running migration with better error handling');
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
