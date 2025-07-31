#!/usr/bin/env node

/**
 * Migrate metadata from JSONB to granular columns
 * This script extracts data from the metadata JSONB column and populates
 * the new granular columns added by the migration
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateMetadata() {
  console.log('🔄 Starting metadata migration...\n');

  try {
    // First, let's get a count of lessons to migrate
    const { count } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Found ${count} lessons to process\n`);

    // Process in batches to avoid memory issues
    const batchSize = 100;
    let processed = 0;
    
    for (let offset = 0; offset < count; offset += batchSize) {
      console.log(`Processing batch ${Math.floor(offset / batchSize) + 1}...`);
      
      // Fetch batch of lessons
      const { data: lessons, error: fetchError } = await supabase
        .from('lessons')
        .select('lesson_id, metadata, confidence, flagged_for_review, review_notes, processing_notes')
        .range(offset, offset + batchSize - 1);

      if (fetchError) {
        console.error('Error fetching lessons:', fetchError);
        continue;
      }

      // Process each lesson in the batch
      for (const lesson of lessons) {
        try {
          const metadata = lesson.metadata || {};
          
          // Prepare update data
          const updateData = {
            // Array fields - ensure they're arrays
            thematic_categories: Array.isArray(metadata.thematicCategories) ? metadata.thematicCategories : [],
            cultural_heritage: Array.isArray(metadata.culturalHeritage) ? metadata.culturalHeritage : [],
            observances_holidays: Array.isArray(metadata.observancesHolidays) ? metadata.observancesHolidays : [],
            location_requirements: Array.isArray(metadata.locationRequirements) ? metadata.locationRequirements : [],
            season_timing: Array.isArray(metadata.seasonTiming) ? metadata.seasonTiming : [],
            social_emotional_learning: Array.isArray(metadata.socialEmotionalLearning) ? metadata.socialEmotionalLearning : [],
            cooking_methods: Array.isArray(metadata.cookingMethods) ? metadata.cookingMethods : [],
            main_ingredients: Array.isArray(metadata.mainIngredients) ? metadata.mainIngredients : [],
            cultural_responsiveness_features: Array.isArray(metadata.culturalResponsivenessFeatures) ? metadata.culturalResponsivenessFeatures : [],
            garden_skills: Array.isArray(metadata.gardenSkills) ? metadata.gardenSkills : [],
            cooking_skills: Array.isArray(metadata.cookingSkills) ? metadata.cookingSkills : [],
            core_competencies: Array.isArray(metadata.coreCompetencies) ? metadata.coreCompetencies : [],
            
            // For academic integration, flatten the selected array
            academic_integration: Array.isArray(metadata.academicIntegration?.selected) 
              ? metadata.academicIntegration.selected 
              : [],
            
            // Single value fields
            lesson_format: metadata.lessonFormat || null,
            
            // Fields from top-level lesson object (if passed)
            flagged_for_review: lesson.flagged_for_review || false,
            review_notes: lesson.review_notes || null,
            processing_notes: lesson.processing_notes || null
          };

          // Update the lesson
          const { error: updateError } = await supabase
            .from('lessons')
            .update(updateData)
            .eq('lesson_id', lesson.lesson_id);

          if (updateError) {
            console.error(`Error updating lesson ${lesson.lesson_id}:`, updateError);
          } else {
            processed++;
          }
        } catch (err) {
          console.error(`Error processing lesson ${lesson.lesson_id}:`, err);
        }
      }
      
      console.log(`  ✅ Processed ${processed} lessons so far`);
    }

    console.log(`\n✅ Migration complete! Processed ${processed} out of ${count} lessons.`);

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    
    // Check a sample lesson
    const { data: sample } = await supabase
      .from('lessons')
      .select('lesson_id, title, thematic_categories, main_ingredients, lesson_format')
      .limit(1)
      .single();

    if (sample) {
      console.log('\nSample migrated lesson:');
      console.log(`  Title: ${sample.title}`);
      console.log(`  Thematic Categories: ${sample.thematic_categories?.join(', ') || 'None'}`);
      console.log(`  Main Ingredients: ${sample.main_ingredients?.join(', ') || 'None'}`);
      console.log(`  Lesson Format: ${sample.lesson_format || 'None'}`);
    }

    // Count lessons with populated new columns
    const { count: populatedCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .not('thematic_categories', 'is', null);

    console.log(`\n📊 ${populatedCount} lessons have thematic_categories populated`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateMetadata().catch(console.error);