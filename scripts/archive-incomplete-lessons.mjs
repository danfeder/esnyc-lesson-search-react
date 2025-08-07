#!/usr/bin/env node

/**
 * Archive incomplete lesson templates to lesson_archive table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function archiveIncompleteLessons() {
  console.log('📦 Archiving Incomplete Lesson Templates\n');
  console.log('=' .repeat(60));

  const lessonsToArchive = [
    { id: '1z9G_-c4PT0GKpC9wJkU9WseLecYEf5q1VX5dHJQeoUw', title: 'Three Sisters Enchiladas' },
    { id: '1_uY_JrUrSpMW7MS1gj8-1JMNjLYutFeYY0tMkgXdDrY', title: 'New Years Food Traditions' },
    { id: '1SoQbHNgCbeLGDDsQPySO9q25IJnF18GFFkl9bNvqmws', title: 'Garden on a Cracker' },
    { id: '1l-64JFBYyZWXj0tXWfPZ_wr0msmGzj_8', title: 'Plant Parts' }
  ];

  console.log('Lessons to archive:');
  lessonsToArchive.forEach(l => console.log(`  - ${l.title}`));
  console.log();

  try {
    // Step 1: Fetch the lessons
    console.log('📋 Fetching lessons from main table...');
    const { data: lessons, error: fetchError } = await supabase
      .from('lessons')
      .select('*')
      .in('lesson_id', lessonsToArchive.map(l => l.id));
    
    if (fetchError) throw fetchError;
    console.log(`✅ Found ${lessons.length} lessons\n`);

    // Step 2: Insert into archive
    console.log('📥 Copying to lesson_archive table...');
    
    for (const lesson of lessons) {
      // Prepare data for archive table
      const archiveData = {
        lesson_id: lesson.lesson_id,
        title: lesson.title,
        summary: lesson.summary,
        file_link: lesson.file_link,
        grade_levels: lesson.grade_levels,
        metadata: lesson.metadata,
        confidence: lesson.confidence,
        content_text: lesson.content_text,
        content_hash: lesson.content_hash,
        created_at: lesson.created_at,
        updated_at: lesson.updated_at,
        archive_reason: 'Incomplete lesson template - not actual content',
        archived_at: new Date().toISOString(),
        archived_by_system: true
      };

      const { error: insertError } = await supabase
        .from('lesson_archive')
        .insert(archiveData);
      
      if (insertError) {
        // Try upsert if it already exists
        const { error: upsertError } = await supabase
          .from('lesson_archive')
          .upsert(archiveData, { onConflict: 'lesson_id' });
        
        if (upsertError) {
          console.log(`  ❌ Failed to archive ${lesson.title}: ${upsertError.message}`);
        } else {
          console.log(`  ✅ Archived: ${lesson.title}`);
        }
      } else {
        console.log(`  ✅ Archived: ${lesson.title}`);
      }
    }

    // Step 3: Delete from main table
    console.log('\n🗑️  Removing from main lessons table...');
    const { error: deleteError } = await supabase
      .from('lessons')
      .delete()
      .in('lesson_id', lessonsToArchive.map(l => l.id));
    
    if (deleteError) {
      console.log(`❌ Failed to delete: ${deleteError.message}`);
      console.log('Note: Lessons are copied to archive but still exist in main table');
    } else {
      console.log('✅ Removed from main table');
    }

    // Step 4: Verify
    console.log('\n📊 Verification:');
    
    const { data: remainingInMain } = await supabase
      .from('lessons')
      .select('lesson_id')
      .in('lesson_id', lessonsToArchive.map(l => l.id));
    
    const { data: inArchive } = await supabase
      .from('lesson_archive')
      .select('lesson_id')
      .in('lesson_id', lessonsToArchive.map(l => l.id));
    
    console.log(`  Remaining in main table: ${remainingInMain?.length || 0}`);
    console.log(`  In archive table: ${inArchive?.length || 0}`);
    
    if (remainingInMain && remainingInMain.length > 0) {
      console.log('\n⚠️  Manual deletion may be required for:');
      remainingInMain.forEach(l => {
        const lesson = lessonsToArchive.find(la => la.id === l.lesson_id);
        console.log(`  - ${lesson?.title || l.lesson_id}`);
      });
    }

    console.log('\n✨ Archive process complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

archiveIncompleteLessons().catch(console.error);