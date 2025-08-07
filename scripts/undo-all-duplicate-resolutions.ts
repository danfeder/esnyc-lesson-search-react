#!/usr/bin/env npx tsx
/**
 * Undo ALL duplicate resolutions and restore archived lessons
 *
 * This script will:
 * 1. Restore all archived lessons back to the main lessons table
 * 2. Remove all canonical_lessons mappings
 * 3. Remove all duplicate_resolutions records
 * 4. Verify the restoration
 *
 * Usage:
 *   npm run undo-resolutions -- --dry-run  # See what would be restored
 *   npm run undo-resolutions               # Actually restore everything
 */

import { createClient } from '@supabase/supabase-js';
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

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🔄 Undo All Duplicate Resolutions');
  console.log('==================================');
  console.log(
    `Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (will restore all archived lessons)'}`
  );
  console.log('');

  try {
    // 1. Get count of archived lessons to restore
    console.log('📊 Checking archived lessons...');
    const { data: archivedLessons, error: archiveError } = await supabase
      .from('lesson_archive')
      .select('*')
      .eq('archive_reason', 'duplicate_resolution');

    if (archiveError) throw archiveError;

    console.log(`   Found ${archivedLessons?.length || 0} archived lessons to restore`);

    // 2. Get count of resolution records
    const { data: resolutions, error: resError } = await supabase
      .from('duplicate_resolutions')
      .select('*');

    if (resError) throw resError;

    console.log(`   Found ${resolutions?.length || 0} resolution records to remove`);

    // 3. Get count of canonical mappings
    const { data: canonicalMappings, error: canonError } = await supabase
      .from('canonical_lessons')
      .select('*');

    if (canonError) throw canonError;

    console.log(`   Found ${canonicalMappings?.length || 0} canonical mappings to remove`);

    if (dryRun) {
      console.log('\n📋 DRY RUN Summary:');
      console.log(`   Would restore: ${archivedLessons?.length || 0} lessons`);
      console.log(`   Would remove: ${resolutions?.length || 0} resolution records`);
      console.log(`   Would remove: ${canonicalMappings?.length || 0} canonical mappings`);

      // Show sample of what would be restored
      if (archivedLessons && archivedLessons.length > 0) {
        console.log('\n   Sample lessons to restore:');
        archivedLessons.slice(0, 5).forEach((lesson) => {
          console.log(`     - ${lesson.title} (${lesson.lesson_id})`);
        });
        if (archivedLessons.length > 5) {
          console.log(`     ... and ${archivedLessons.length - 5} more`);
        }
      }
    } else {
      // Actually perform the restoration
      console.log('\n🔧 Starting restoration...');

      // Step 1: Restore archived lessons back to main table
      if (archivedLessons && archivedLessons.length > 0) {
        console.log('\n📥 Restoring archived lessons...');

        let restored = 0;
        let failed = 0;

        for (const archivedLesson of archivedLessons) {
          // Remove archive-specific fields before restoring
          const {
            archived_at,
            archived_by,
            archived_by_system,
            archive_reason,
            canonical_id,
            ...lessonData
          } = archivedLesson;

          // Check if lesson already exists in main table (shouldn't happen but be safe)
          const { data: existing } = await supabase
            .from('lessons')
            .select('lesson_id')
            .eq('lesson_id', lessonData.lesson_id)
            .single();

          if (existing) {
            console.log(
              `   ⚠️  Lesson already exists: ${lessonData.title} (${lessonData.lesson_id})`
            );
            continue;
          }

          // Restore to main table
          const { error: restoreError } = await supabase.from('lessons').insert(lessonData);

          if (restoreError) {
            console.error(`   ❌ Failed to restore: ${lessonData.title} - ${restoreError.message}`);
            failed++;
          } else {
            restored++;
            if (restored % 10 === 0) {
              console.log(`   ✓ Restored ${restored} lessons...`);
            }
          }
        }

        console.log(`   ✅ Restored ${restored} lessons (${failed} failed)`);

        // Step 2: Delete from archive
        console.log('\n🗑️  Removing from archive...');
        const { error: deleteArchiveError } = await supabase
          .from('lesson_archive')
          .delete()
          .eq('archive_reason', 'duplicate_resolution');

        if (deleteArchiveError) {
          console.error(`   ❌ Failed to clear archive: ${deleteArchiveError.message}`);
        } else {
          console.log(`   ✅ Cleared ${archivedLessons.length} archived records`);
        }
      }

      // Step 3: Clear canonical_lessons table
      if (canonicalMappings && canonicalMappings.length > 0) {
        console.log('\n🗑️  Removing canonical mappings...');
        const { error: deleteCanonicalError } = await supabase
          .from('canonical_lessons')
          .delete()
          .gte('created_at', '1900-01-01'); // Delete all records

        if (deleteCanonicalError) {
          console.error(
            `   ❌ Failed to clear canonical mappings: ${deleteCanonicalError.message}`
          );
        } else {
          console.log(`   ✅ Cleared ${canonicalMappings.length} canonical mappings`);
        }
      }

      // Step 4: Clear duplicate_resolutions table
      if (resolutions && resolutions.length > 0) {
        console.log('\n🗑️  Removing resolution records...');
        const { error: deleteResolutionError } = await supabase
          .from('duplicate_resolutions')
          .delete()
          .gte('resolved_at', '1900-01-01'); // Delete all records

        if (deleteResolutionError) {
          console.error(`   ❌ Failed to clear resolutions: ${deleteResolutionError.message}`);
        } else {
          console.log(`   ✅ Cleared ${resolutions.length} resolution records`);
        }
      }

      // Step 5: Verify restoration
      console.log('\n✔️  Verifying restoration...');

      const { count: lessonCount } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true });

      const { count: archiveCount } = await supabase
        .from('lesson_archive')
        .select('*', { count: 'exact', head: true })
        .eq('archive_reason', 'duplicate_resolution');

      const { count: resolutionCount } = await supabase
        .from('duplicate_resolutions')
        .select('*', { count: 'exact', head: true });

      console.log(`\n📊 Final Status:`);
      console.log(`   Total lessons in main table: ${lessonCount}`);
      console.log(`   Remaining archived (duplicate): ${archiveCount}`);
      console.log(`   Remaining resolutions: ${resolutionCount}`);
    }

    console.log('\n✅ Complete!');

    if (dryRun) {
      console.log('\n💡 To actually restore everything, run without --dry-run flag:');
      console.log('   npm run undo-resolutions');
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
