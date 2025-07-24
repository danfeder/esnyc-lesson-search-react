#!/usr/bin/env node

/**
 * Generate content hashes for lessons in the database
 * This helps with exact duplicate detection
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const IS_TEST_MODE = process.argv.includes('--test');
const SUPABASE_URL = IS_TEST_MODE 
  ? 'https://epedjebjemztzdyhqace.supabase.co'
  : process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = IS_TEST_MODE 
  ? process.env.TEST_SUPABASE_SERVICE_KEY 
  : process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Generate a SHA-256 hash from lesson content
 */
function generateContentHash(lesson) {
  // Create a normalized content string from key lesson fields
  const contentParts = [
    lesson.title?.toLowerCase().trim() || '',
    lesson.summary?.toLowerCase().trim() || '',
    // Sort grade levels for consistent hashing
    (lesson.grade_levels || []).sort().join(','),
    // Key metadata fields that define the lesson
    lesson.metadata?.activityType || '',
    lesson.metadata?.location || '',
    lesson.metadata?.season || '',
    lesson.metadata?.thematicCategory || '',
    lesson.metadata?.culturalHeritage || '',
    // Sort skills and ingredients for consistency
    (lesson.metadata?.skills || []).sort().join(','),
    (lesson.metadata?.ingredients || []).sort().join(','),
  ];

  const contentString = contentParts.join('|');
  return crypto.createHash('sha256').update(contentString).digest('hex');
}

async function generateHashes() {
  console.log(`🔐 Generating content hashes for ${IS_TEST_MODE ? 'TEST' : 'PRODUCTION'} database...\n`);

  if (!SUPABASE_KEY) {
    console.error(`❌ Missing ${IS_TEST_MODE ? 'TEST_SUPABASE_SERVICE_KEY' : 'SUPABASE_SERVICE_ROLE_KEY'} in .env file`);
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Fetch all lessons without content_hash
    console.log('📋 Fetching lessons without content hashes...');
    const { data: lessons, error: fetchError } = await supabase
      .from('lessons')
      .select('*')
      .is('content_hash', null);

    if (fetchError) {
      throw fetchError;
    }

    if (!lessons || lessons.length === 0) {
      console.log('✅ All lessons already have content hashes!');
      return;
    }

    console.log(`📊 Found ${lessons.length} lessons to process\n`);

    // Generate hashes and update in batches
    const batchSize = 10;
    let processed = 0;
    let duplicates = [];
    const hashMap = new Map();

    // First pass: generate all hashes and detect duplicates
    console.log('🔍 Generating hashes and detecting duplicates...');
    for (const lesson of lessons) {
      const hash = generateContentHash(lesson);
      
      if (hashMap.has(hash)) {
        duplicates.push({
          lesson1: hashMap.get(hash),
          lesson2: lesson,
          hash
        });
      } else {
        hashMap.set(hash, lesson);
      }
    }

    if (duplicates.length > 0) {
      console.log(`\n⚠️  Found ${duplicates.length} potential duplicates:`);
      duplicates.forEach(({ lesson1, lesson2, hash }) => {
        console.log(`   - "${lesson1.title}" (${lesson1.lesson_id})`);
        console.log(`     "${lesson2.title}" (${lesson2.lesson_id})`);
        console.log(`     Hash: ${hash.substring(0, 8)}...\n`);
      });
    }

    // Update lessons with hashes
    console.log('\n💾 Updating database with content hashes...');
    for (let i = 0; i < lessons.length; i += batchSize) {
      const batch = lessons.slice(i, i + batchSize);
      
      // Update each lesson with its hash
      const updates = await Promise.all(
        batch.map(lesson => {
          const hash = generateContentHash(lesson);
          return supabase
            .from('lessons')
            .update({ content_hash: hash })
            .eq('lesson_id', lesson.lesson_id);
        })
      );

      // Check for errors
      const errors = updates.filter(({ error }) => error);
      if (errors.length > 0) {
        console.error('❌ Errors updating batch:', errors[0].error);
      } else {
        processed += batch.length;
        console.log(`✅ Updated batch ${Math.floor(i / batchSize) + 1} (${processed}/${lessons.length})`);
      }
    }

    // Verify the update
    console.log('\n🔍 Verifying updates...');
    const { count: totalCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    const { count: hashedCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .not('content_hash', 'is', null);

    console.log('\n' + '='.repeat(50));
    console.log('📊 HASH GENERATION SUMMARY:');
    console.log('='.repeat(50));
    console.log(`✅ Total lessons: ${totalCount}`);
    console.log(`✅ Lessons with hashes: ${hashedCount}`);
    console.log(`⚠️  Potential duplicates found: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log('\n💡 Next steps for handling duplicates:');
      console.log('   1. Review the duplicate pairs');
      console.log('   2. Decide which should be the canonical version');
      console.log('   3. Update canonical_id fields to link versions');
    }

    // Save duplicate report
    if (duplicates.length > 0) {
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
      const reportPath = path.join(
        __dirname, 
        '..', 
        'database-backups', 
        `duplicate-report-${IS_TEST_MODE ? 'test' : 'prod'}-${new Date().toISOString().split('T')[0]}.json`
      );
      
      await fs.writeFile(
        reportPath,
        JSON.stringify({ 
          generatedAt: new Date().toISOString(),
          database: IS_TEST_MODE ? 'test' : 'production',
          totalLessons: totalCount,
          duplicatesFound: duplicates.length,
          duplicates: duplicates.map(({ lesson1, lesson2, hash }) => ({
            hash: hash.substring(0, 16) + '...',
            lessons: [
              { id: lesson1.lesson_id, title: lesson1.title },
              { id: lesson2.lesson_id, title: lesson2.title }
            ]
          }))
        }, null, 2)
      );
      
      console.log(`\n📄 Duplicate report saved to: ${reportPath}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Show usage
if (process.argv.includes('--help')) {
  console.log('Usage: node generate-content-hashes.mjs [--test]');
  console.log('  --test    Run on test database instead of production');
  process.exit(0);
}

// Run the hash generation
generateHashes().catch(console.error);