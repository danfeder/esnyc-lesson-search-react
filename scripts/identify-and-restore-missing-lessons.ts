#!/usr/bin/env npx tsx
/**
 * Identify missing lessons by comparing consolidated_lessons.json with the database
 * and restore any missing lessons
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

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

// Convert consolidated lesson format to database format
function convertToDbFormat(lesson: any) {
  // Determine activity type based on location requirements
  let activityType: string[] = [];
  const locationReqs = lesson.metadata?.locationRequirements || [];
  if (locationReqs.includes('Both')) {
    activityType = ['both'];
  } else if (locationReqs.includes('Indoor')) {
    activityType = ['indoor'];
  } else if (locationReqs.includes('Outdoor')) {
    activityType = ['outdoor'];
  }

  // Normalize cooking methods to lowercase with hyphens
  const cookingMethods = (lesson.metadata?.cookingMethods || []).map((method: string) =>
    method.toLowerCase().replace(/\s+/g, '-')
  );

  // Map the consolidated format to database format
  const dbLesson: any = {
    lesson_id: lesson.lessonId,
    title: lesson.lessonTitle,
    summary: lesson.lessonSummary,
    file_link: lesson.fileLink,
    last_modified: lesson.lastModified ? new Date(lesson.lastModified).toISOString() : null,

    // Store full metadata as JSONB
    metadata: lesson.metadata || {},

    // Store confidence as JSONB
    confidence: lesson.confidence || {},

    // Map metadata fields to database columns (these are duplicated for faster querying)
    grade_levels: lesson.metadata?.gradeLevel || [],
    activity_type: activityType,
    location_requirements: lesson.metadata?.locationRequirements || [],
    thematic_categories: lesson.metadata?.thematicCategories || [],
    season_timing: lesson.metadata?.seasonTiming || [],
    core_competencies: lesson.metadata?.coreCompetencies || [],
    cultural_heritage: lesson.metadata?.culturalHeritage || [],
    lesson_format: lesson.metadata?.lessonFormat || null,
    academic_integration: lesson.metadata?.academicIntegration?.selected || [],
    social_emotional_learning: lesson.metadata?.socialEmotionalLearning || [],
    cooking_methods: cookingMethods,
    observances_holidays: lesson.metadata?.observancesHolidays || [],

    // Additional fields
    main_ingredients: lesson.metadata?.mainIngredients || [],
    garden_skills: lesson.metadata?.gardenSkills || [],
    cooking_skills: lesson.metadata?.cookingSkills || [],
    cultural_responsiveness_features: lesson.metadata?.culturalResponsivenessFeatures || [],

    // Review fields
    flagged_for_review: lesson.flaggedForReview || false,
    review_notes: lesson.reviewNotes || '',
    processing_notes: lesson.processingNotes || '',

    // Default values for fields not in consolidated data
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return dbLesson;
}

async function main() {
  console.log('🔍 Identifying and Restoring Missing Lessons');
  console.log('============================================\n');

  try {
    // Step 1: Load consolidated lessons
    console.log('📂 Loading consolidated lessons file...');
    const consolidatedPath = path.join(
      __dirname,
      '..',
      'archive',
      'data',
      'consolidated_lessons.json'
    );

    if (!fs.existsSync(consolidatedPath)) {
      console.error('❌ Consolidated lessons file not found');
      process.exit(1);
    }

    const consolidatedData = JSON.parse(fs.readFileSync(consolidatedPath, 'utf-8'));
    console.log(`   Found ${consolidatedData.length} lessons in consolidated file\n`);

    // Step 2: Get all lesson IDs currently in database
    console.log('📊 Fetching current lessons from database...');
    const { data: currentLessons, error: fetchError } = await supabase
      .from('lessons')
      .select('lesson_id');

    if (fetchError) throw fetchError;

    const currentLessonIds = new Set(currentLessons?.map((l) => l.lesson_id) || []);
    console.log(`   Found ${currentLessonIds.size} lessons in database\n`);

    // Step 3: Identify missing lessons
    console.log('🔎 Identifying missing lessons...');
    const missingLessons = [];

    for (const lesson of consolidatedData) {
      if (!currentLessonIds.has(lesson.lessonId)) {
        missingLessons.push(lesson);
      }
    }

    console.log(`   Found ${missingLessons.length} missing lessons\n`);

    if (missingLessons.length === 0) {
      console.log('✅ No missing lessons found! Database is complete.');
      return;
    }

    // Show first few missing lessons
    console.log('📋 Missing lessons:');
    for (const lesson of missingLessons.slice(0, 10)) {
      console.log(`   - ${lesson.lessonTitle} (${lesson.lessonId})`);
    }
    if (missingLessons.length > 10) {
      console.log(`   ... and ${missingLessons.length - 10} more\n`);
    }

    // Step 4: Restore missing lessons
    console.log('📥 Restoring missing lessons to database...');

    let restored = 0;
    let failed = 0;
    const failures: { lessonId: string; error: string }[] = [];

    // Process in batches to avoid overwhelming the database
    const BATCH_SIZE = 10;

    for (let i = 0; i < missingLessons.length; i += BATCH_SIZE) {
      const batch = missingLessons.slice(i, i + BATCH_SIZE);
      const dbBatch = batch.map(convertToDbFormat);

      console.log(
        `   Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(missingLessons.length / BATCH_SIZE)}...`
      );

      for (const dbLesson of dbBatch) {
        try {
          const { error: insertError } = await supabase.from('lessons').insert(dbLesson);

          if (insertError) {
            failed++;
            failures.push({ lessonId: dbLesson.lesson_id, error: insertError.message });
            console.error(`     ❌ Failed: ${dbLesson.title} - ${insertError.message}`);
          } else {
            restored++;
            if (restored % 10 === 0) {
              console.log(`     ✓ Restored ${restored} lessons...`);
            }
          }
        } catch (error: any) {
          failed++;
          failures.push({ lessonId: dbLesson.lesson_id, error: error.message });
          console.error(`     ❌ Error: ${dbLesson.lesson_id} - ${error.message}`);
        }
      }
    }

    console.log(`\n📊 Restoration Results:`);
    console.log(`   Successfully restored: ${restored}`);
    console.log(`   Failed: ${failed}`);

    if (failures.length > 0) {
      console.log(`\n❌ Failed lessons:`);
      for (const failure of failures.slice(0, 10)) {
        console.log(`   - ${failure.lessonId}: ${failure.error}`);
      }
      if (failures.length > 10) {
        console.log(`   ... and ${failures.length - 10} more failures`);
      }
    }

    // Step 5: Final verification
    console.log('\n✔️  Verifying restoration...');

    const { count: finalCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    const { data: checkMissing } = await supabase
      .from('lessons')
      .select('lesson_id')
      .in(
        'lesson_id',
        missingLessons.map((l) => l.lessonId)
      );

    console.log(`\n📊 Final Status:`);
    console.log(`   Total lessons in database: ${finalCount}`);
    console.log(`   Expected total: ${consolidatedData.length}`);
    console.log(
      `   Successfully restored: ${checkMissing?.length || 0} of ${missingLessons.length} missing`
    );

    if (finalCount === consolidatedData.length) {
      console.log('\n✅ Perfect! All lessons have been successfully restored!');
      console.log('   The database now contains all 831 lessons from the consolidated file.');
    } else if (checkMissing && checkMissing.length === missingLessons.length) {
      console.log('\n✅ All missing lessons have been successfully restored!');
      console.log(
        `   Note: Total count (${finalCount}) differs from consolidated (${consolidatedData.length})`
      );
      console.log('   This may be due to additional lessons added after the initial import.');
    } else {
      const stillMissing = consolidatedData.length - (finalCount || 0);
      console.log(`\n⚠️  Still missing ${stillMissing} lessons.`);
      console.log('   Some lessons may have failed to restore due to data issues.');
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
