/**
 * Script to import lesson data from the existing JSON file to Supabase
 * Run with: node scripts/import-data.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importLessons() {
  try {
    console.log('🔄 Loading lesson data...');

    // Load the existing lesson data
    const dataPath = path.join(__dirname, '../data/consolidated_lessons.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const lessons = JSON.parse(rawData);

    console.log(`📚 Found ${lessons.length} lessons to import`);

    // Transform data to match database schema
    const transformedLessons = lessons
      .map((lesson) => ({
        lesson_id: lesson.lessonId,
        title: lesson.lessonTitle || 'Untitled Lesson',
        summary: lesson.lessonSummary || 'No summary available',
        file_link: lesson.fileLink,
        grade_levels: lesson.metadata?.gradeLevel || [],
        metadata: lesson.metadata || {},
        confidence: lesson.confidence || {
          overall: 0.5,
          title: 0.5,
          summary: 0.5,
          gradeLevels: 0.5,
        },
      }))
      .filter((lesson) => lesson.lesson_id && lesson.file_link); // Filter out lessons without essential data

    console.log(
      `📋 Filtered to ${transformedLessons.length} valid lessons (removed ${lessons.length - transformedLessons.length} incomplete entries)`
    );

    // Import in batches to avoid timeouts
    const batchSize = 50;
    let imported = 0;

    for (let i = 0; i < transformedLessons.length; i += batchSize) {
      const batch = transformedLessons.slice(i, i + batchSize);

      console.log(
        `📥 Importing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transformedLessons.length / batchSize)}...`
      );

      const { data, error } = await supabase.from('lessons').upsert(batch, {
        onConflict: 'lesson_id',
        ignoreDuplicates: false,
      });

      if (error) {
        console.error('❌ Import error:', error);
        throw error;
      }

      imported += batch.length;
      console.log(`✅ Imported ${imported}/${transformedLessons.length} lessons`);
    }

    console.log(`🎉 Successfully imported all ${imported} lessons!`);

    // Verify the import
    const { count, error: countError } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error verifying import:', countError);
    } else {
      console.log(`✅ Verification: ${count} lessons in database`);
    }
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the import
importLessons();
