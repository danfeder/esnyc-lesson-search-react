#!/usr/bin/env node

/**
 * Import test data into the test Supabase database
 * This imports a subset of lessons for testing the submission pipeline
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test database configuration
const TEST_SUPABASE_URL = 'https://epedjebjemztzdyhqace.supabase.co';
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY;
const TEST_SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY;

async function importTestData() {
  console.log('🚀 Importing test data into test database...\n');

  // Try service key first (bypasses RLS), fallback to anon key
  const supabaseKey = TEST_SUPABASE_SERVICE_KEY || TEST_SUPABASE_ANON_KEY;
  
  if (!supabaseKey) {
    console.error('❌ Missing TEST_SUPABASE_SERVICE_KEY or TEST_SUPABASE_ANON_KEY in .env file');
    console.error('   Get the service role key from: https://supabase.com/dashboard/project/epedjebjemztzdyhqace/settings/api');
    console.error('   Look for "service_role (secret)" key');
    console.error('   Add it as TEST_SUPABASE_SERVICE_KEY in your .env file');
    process.exit(1);
  }

  // Initialize test database client
  const supabase = createClient(TEST_SUPABASE_URL, supabaseKey);
  
  if (TEST_SUPABASE_SERVICE_KEY) {
    console.log('✅ Using service role key (RLS bypassed for import)\n');
  } else {
    console.log('⚠️  Using anon key (may fail due to RLS policies)\n');
  }

  try {
    // Load the backup data
    const backupPath = path.join(__dirname, '..', 'database-backups', 'backup-2025-07-22T03-01-07', 'lessons.json');
    console.log('📂 Loading lessons from backup...');
    
    const lessonsData = JSON.parse(await fs.readFile(backupPath, 'utf8'));
    console.log(`✅ Loaded ${lessonsData.length} lessons from backup\n`);

    // Import a subset for testing (first 50 lessons + some with duplicates)
    const testLessons = [
      ...lessonsData.slice(0, 50), // First 50 lessons
      ...lessonsData.filter(l => 
        l.title.toLowerCase().includes('pizza') || 
        l.title.toLowerCase().includes('salad') ||
        l.title.toLowerCase().includes('soup')
      ).slice(0, 20) // Some specific lessons that might have duplicates
    ];

    // Remove duplicates
    const uniqueLessons = Array.from(
      new Map(testLessons.map(l => [l.lesson_id, l])).values()
    );

    console.log(`📊 Importing ${uniqueLessons.length} lessons for testing...`);

    // Import in batches of 10
    const batchSize = 10;
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < uniqueLessons.length; i += batchSize) {
      const batch = uniqueLessons.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('lessons')
        .upsert(batch, { onConflict: 'lesson_id' });

      if (error) {
        console.error(`❌ Error importing batch ${i / batchSize + 1}:`, error.message);
        errors += batch.length;
      } else {
        imported += batch.length;
        console.log(`✅ Imported batch ${i / batchSize + 1} (${imported}/${uniqueLessons.length})`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 IMPORT SUMMARY:');
    console.log('='.repeat(50));
    console.log(`✅ Successfully imported: ${imported} lessons`);
    console.log(`❌ Failed to import: ${errors} lessons`);
    console.log(`📁 Test database: ${TEST_SUPABASE_URL}`);

    // Verify the import
    console.log('\n🔍 Verifying import...');
    const { count } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ Total lessons in test database: ${count}`);

    // Create a test user profile for testing submissions
    console.log('\n👤 Creating test user profiles...');
    
    // Note: We'll need to create test users through Supabase Auth first
    console.log('⚠️  Note: To test the submission pipeline, you\'ll need to:');
    console.log('   1. Create test users in Supabase Auth');
    console.log('   2. Assign roles (teacher/reviewer/admin) in user_profiles');
    console.log('   3. Use the Auth tokens for API testing');

    // Create sample data info file
    const sampleDataInfo = {
      testDatabase: TEST_SUPABASE_URL,
      lessonsImported: imported,
      sampleLessons: uniqueLessons.slice(0, 5).map(l => ({
        lesson_id: l.lesson_id,
        title: l.title,
        grade_levels: l.grade_levels
      })),
      nextSteps: [
        'Create test users in Supabase Auth dashboard',
        'Run content hash generation script',
        'Test submission API endpoints',
        'Test duplicate detection'
      ]
    };

    const infoPath = path.join(__dirname, '..', 'database-backups', 'test-data-info.json');
    await fs.writeFile(infoPath, JSON.stringify(sampleDataInfo, null, 2));
    console.log(`\n📄 Test data info saved to: ${infoPath}`);

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
importTestData().catch(console.error);