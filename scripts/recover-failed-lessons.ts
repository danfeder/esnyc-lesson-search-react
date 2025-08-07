#!/usr/bin/env npx tsx
/**
 * Recover lessons that failed to restore due to malformed activity_type data
 *
 * This script will:
 * 1. Check if we still have the data in the archive table
 * 2. Parse malformed array literals (stored as TEXT) into proper arrays
 * 3. Restore the lessons with corrected data
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

// List of lesson IDs that failed to restore
const failedLessonIds = [
  'lesson_1733337041065_1',
  'lesson_1733337041065_10',
  'lesson_1733337041065_100',
  'lesson_1733337041065_101',
  'lesson_1733337041065_102',
  'lesson_1733337041065_103',
  'lesson_1733337041065_104',
  'lesson_1733337041065_105',
  'lesson_1733337041065_106',
  'lesson_1733337041065_107',
  'lesson_1733337041065_108',
  'lesson_1733337041065_109',
  'lesson_1733337041065_11',
  'lesson_1733337041065_110',
  'lesson_1733337041065_112',
  'lesson_1733337041065_113',
  'lesson_1733337041065_114',
  'lesson_1733337041065_115',
  'lesson_1733337041065_116',
  'lesson_1733337041065_117',
  'lesson_1733337041065_118',
  'lesson_1733337041065_119',
  'lesson_1733337041065_12',
  'lesson_1733337041065_120',
  'lesson_1733337041065_122',
  'lesson_1733337041065_124',
  'lesson_1733337041065_125',
  'lesson_1733337041065_126',
  'lesson_1733337041065_128',
  'lesson_1733337041065_129',
  'lesson_1733337041065_130',
  'lesson_1733337041065_131',
  'lesson_1733337041065_132',
  'lesson_1733337041065_133',
  'lesson_1733337041065_134',
  'lesson_1733337041065_135',
  'lesson_1733337041065_136',
  'lesson_1733337041065_21',
  'lesson_1733337041065_22',
  'lesson_1733337041065_41',
  'lesson_1733337041065_42',
  'lesson_1733337041065_48',
  'lesson_1733337041065_49',
  'lesson_1733337041065_50',
  'lesson_1733337041065_51',
  'lesson_1733337041065_52',
  'lesson_1733337041065_76',
  'lesson_1733337041065_77',
  'lesson_1733337041065_79',
  'lesson_1733337041065_80',
  'lesson_1733337041065_82',
  'lesson_1733337041065_83',
  'lesson_1733337041065_99',
];

/**
 * Parse a malformed PostgreSQL array literal string into a proper JavaScript array
 * Examples:
 * '["garden"]' -> ['garden']
 * '["academic", "cooking"]' -> ['academic', 'cooking']
 * '{garden}' -> ['garden']
 * '{}' -> []
 * 'garden' -> ['garden']
 */
function parseArrayLiteral(value: any): string[] {
  if (!value) return [];

  // If already an array, return it
  if (Array.isArray(value)) return value;

  // Convert to string for processing
  const str = String(value).trim();

  // Handle empty cases
  if (!str || str === '{}' || str === '[]' || str === 'null') return [];

  // Handle PostgreSQL array format: {value1,value2}
  if (str.startsWith('{') && str.endsWith('}')) {
    const content = str.slice(1, -1);
    if (!content) return [];
    return content.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
  }

  // Handle JSON array format: ["value1","value2"]
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str);
      return Array.isArray(parsed) ? parsed : [str];
    } catch {
      // If JSON parse fails, try to extract values manually
      const content = str.slice(1, -1);
      if (!content) return [];
      // Split by comma and clean up quotes
      return content.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
    }
  }

  // Handle single value without brackets
  return [str];
}

async function recoverFromBackupFile() {
  console.log('📂 Attempting to recover from backup files...');

  // Check if we have the original duplicate analysis file with full lesson data
  const fs = await import('fs');
  const path = await import('path');

  const analysisPath = path.join(
    __dirname,
    '..',
    'public',
    'reports',
    'duplicate-analysis-v2-2025-08-07.json'
  );

  if (fs.existsSync(analysisPath)) {
    console.log('   Found duplicate analysis file, searching for failed lessons...');

    const analysisData = JSON.parse(fs.readFileSync(analysisPath, 'utf-8'));
    const allLessons = new Map<string, any>();

    // Extract all lessons from the analysis groups
    for (const group of analysisData.groups) {
      for (const lesson of group.lessons) {
        allLessons.set(lesson.lessonId, lesson);
      }
    }

    // Find our failed lessons
    const foundLessons = [];
    for (const lessonId of failedLessonIds) {
      if (allLessons.has(lessonId)) {
        foundLessons.push(allLessons.get(lessonId));
      }
    }

    console.log(
      `   Found ${foundLessons.length} of ${failedLessonIds.length} lessons in analysis file`
    );

    if (foundLessons.length === 0) {
      return null;
    }

    // Get full lesson data from database using the IDs we found
    const lessonIds = foundLessons.map((l) => l.lessonId);

    // First check if they're still in the archive
    const { data: archivedLessons, error: archiveError } = await supabase
      .from('lesson_archive')
      .select('*')
      .in('lesson_id', lessonIds);

    if (!archiveError && archivedLessons && archivedLessons.length > 0) {
      console.log(`   Found ${archivedLessons.length} lessons still in archive`);
      return archivedLessons;
    }

    console.log('   Lessons not found in archive, they may have been deleted');
  }

  return null;
}

async function restoreLessonsWithFixedData(lessons: any[]) {
  console.log(`\n📥 Restoring ${lessons.length} lessons with fixed data...`);

  let restored = 0;
  let failed = 0;
  const failures: { lessonId: string; error: string }[] = [];

  for (const lesson of lessons) {
    try {
      // Remove archive-specific fields
      const {
        archived_at,
        archived_by,
        archived_by_system,
        archive_reason,
        canonical_id,
        ...lessonData
      } = lesson;

      // Fix the activity_type field
      if (lessonData.activity_type) {
        lessonData.activity_type = parseArrayLiteral(lessonData.activity_type);
      }

      // Fix any other array fields that might be malformed
      const arrayFields = [
        'grade_levels',
        'core_competencies',
        'thematic_categories',
        'core_competencies',
        'season_or_themes',
        'cultural_heritage',
        'lesson_format',
        'academic_integration',
        'social_emotional_learning',
        'cooking_methods',
      ];

      for (const field of arrayFields) {
        if (lessonData[field]) {
          lessonData[field] = parseArrayLiteral(lessonData[field]);
        }
      }

      // Check if lesson already exists in main table
      const { data: existing } = await supabase
        .from('lessons')
        .select('lesson_id')
        .eq('lesson_id', lessonData.lesson_id)
        .single();

      if (existing) {
        console.log(`   ⚠️  Lesson already exists: ${lessonData.title} (${lessonData.lesson_id})`);
        continue;
      }

      // Insert into main lessons table
      const { error: insertError } = await supabase.from('lessons').insert(lessonData);

      if (insertError) {
        failed++;
        failures.push({ lessonId: lessonData.lesson_id, error: insertError.message });
        console.error(`   ❌ Failed to restore ${lessonData.lesson_id}: ${insertError.message}`);
      } else {
        restored++;
        console.log(`   ✅ Restored: ${lessonData.title} (${lessonData.lesson_id})`);

        // Remove from archive if it exists there
        await supabase.from('lesson_archive').delete().eq('lesson_id', lessonData.lesson_id);
      }
    } catch (error: any) {
      failed++;
      failures.push({ lessonId: lesson.lesson_id, error: error.message });
      console.error(`   ❌ Error processing ${lesson.lesson_id}: ${error.message}`);
    }
  }

  console.log(`\n📊 Restoration Results:`);
  console.log(`   Successfully restored: ${restored}`);
  console.log(`   Failed: ${failed}`);

  if (failures.length > 0) {
    console.log(`\n❌ Failed lessons:`);
    for (const failure of failures) {
      console.log(`   - ${failure.lessonId}: ${failure.error}`);
    }
  }

  return { restored, failed };
}

async function main() {
  console.log('🔧 Recovering Failed Lessons');
  console.log('=============================');
  console.log(
    `Attempting to recover ${failedLessonIds.length} lessons that failed due to malformed data\n`
  );

  try {
    // First check if any of these lessons are still in the archive
    console.log('📊 Checking lesson_archive table...');
    const { data: archivedLessons, error: archiveError } = await supabase
      .from('lesson_archive')
      .select('*')
      .in('lesson_id', failedLessonIds);

    if (archiveError) {
      console.error(`   ❌ Error checking archive: ${archiveError.message}`);
    } else if (archivedLessons && archivedLessons.length > 0) {
      console.log(`   Found ${archivedLessons.length} lessons still in archive`);

      // Restore these lessons with fixed data
      const result = await restoreLessonsWithFixedData(archivedLessons);

      // Check if we got all of them
      if (result.restored < failedLessonIds.length) {
        const missingCount = failedLessonIds.length - result.restored;
        console.log(`\n⚠️  Still missing ${missingCount} lessons, checking backup sources...`);

        // Try to recover from backup file
        const backupLessons = await recoverFromBackupFile();
        if (backupLessons && backupLessons.length > 0) {
          const remainingLessons = backupLessons.filter(
            (l) => !archivedLessons.some((a) => a.lesson_id === l.lesson_id)
          );
          if (remainingLessons.length > 0) {
            console.log(`\n📥 Found ${remainingLessons.length} additional lessons in backup`);
            await restoreLessonsWithFixedData(remainingLessons);
          }
        }
      }
    } else {
      console.log('   No lessons found in archive, they were already deleted');
      console.log('   Attempting recovery from backup files...\n');

      // Try to recover from backup file
      const backupLessons = await recoverFromBackupFile();
      if (backupLessons && backupLessons.length > 0) {
        await restoreLessonsWithFixedData(backupLessons);
      } else {
        console.log('   ❌ Could not find lessons in backup sources');
        console.log('\nNote: The lessons may need to be recovered from a database backup.');
      }
    }

    // Final verification
    console.log('\n✔️  Verifying recovery...');
    const { count: lessonCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    const { data: checkRestored } = await supabase
      .from('lessons')
      .select('lesson_id')
      .in('lesson_id', failedLessonIds);

    console.log(`\n📊 Final Status:`);
    console.log(`   Total lessons in main table: ${lessonCount}`);
    console.log(
      `   Successfully recovered: ${checkRestored?.length || 0} of ${failedLessonIds.length}`
    );

    if (checkRestored && checkRestored.length === failedLessonIds.length) {
      console.log('\n✅ All failed lessons have been successfully recovered!');
    } else if (checkRestored && checkRestored.length > 0) {
      console.log(
        `\n⚠️  Partially recovered. Still missing ${failedLessonIds.length - checkRestored.length} lessons`
      );

      const recovered = new Set(checkRestored.map((l) => l.lesson_id));
      const stillMissing = failedLessonIds.filter((id) => !recovered.has(id));
      console.log('\nStill missing:');
      for (const id of stillMissing.slice(0, 10)) {
        console.log(`   - ${id}`);
      }
      if (stillMissing.length > 10) {
        console.log(`   ... and ${stillMissing.length - 10} more`);
      }
    } else {
      console.log(
        '\n❌ Could not recover any lessons. They may need to be restored from a database backup.'
      );
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
