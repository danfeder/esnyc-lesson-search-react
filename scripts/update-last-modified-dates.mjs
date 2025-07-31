#!/usr/bin/env node

/**
 * Updates last_modified dates in the database from the original JSON file
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parse date in various formats (M/D/YYYY, MM/DD/YYYY, etc.)
function parseDate(dateStr) {
  if (!dateStr || dateStr === 'null' || dateStr === '') {
    return null;
  }

  // Handle M/D/YYYY or MM/DD/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
      // JavaScript months are 0-indexed
      return new Date(year, month - 1, day);
    }
  }

  // Try parsing as is
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

async function updateLastModifiedDates() {
  console.log('📅 Updating last_modified dates from JSON...\n');

  try {
    // Read the JSON file
    const jsonPath = './data/consolidated_lessons.json';
    
    if (!fs.existsSync(jsonPath)) {
      console.error('❌ JSON file not found at:', jsonPath);
      return;
    }

    console.log('Reading JSON file...');
    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const lessons = JSON.parse(fileContent);
    
    console.log(`Found ${lessons.length} lessons in JSON\n`);

    // Process lessons and build update map
    const updateMap = new Map();
    let validDates = 0;
    let invalidDates = 0;

    for (const lesson of lessons) {
      const lessonId = lesson.lessonId;
      const lastModified = lesson.lastModified;

      if (!lessonId) {
        continue;
      }

      const date = parseDate(lastModified);
      if (!date) {
        invalidDates++;
        continue;
      }

      updateMap.set(lessonId, date.toISOString());
      validDates++;
    }

    console.log(`✅ Valid dates: ${validDates}`);
    console.log(`❌ Invalid/missing dates: ${invalidDates}\n`);

    // Update lessons in batches
    const entries = Array.from(updateMap.entries());
    const batchSize = 100;
    let updated = 0;

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      
      // Update each lesson in the batch
      const promises = batch.map(async ([lessonId, lastModified]) => {
        const { data, error } = await supabase
          .from('lessons')
          .update({ last_modified: lastModified })
          .eq('lesson_id', lessonId);
        
        if (error) {
          console.error(`Error updating ${lessonId}:`, error.message);
          return { success: false, error };
        }
        return { success: true, data };
      });

      const results = await Promise.all(promises);
      
      // Count successful updates
      const successCount = results.filter(r => r.success).length;
      updated += successCount;

      console.log(`Progress: ${updated}/${validDates} lessons updated...`);
    }

    console.log(`\n✅ Successfully updated ${updated} lessons with last_modified dates`);

    // Verify the update
    const { data: sample } = await supabase
      .from('lessons')
      .select('lesson_id, title, last_modified')
      .not('last_modified', 'is', null)
      .limit(5);

    if (sample && sample.length > 0) {
      console.log('\nSample of updated records:');
      sample.forEach(lesson => {
        console.log(`- ${lesson.title}: ${new Date(lesson.last_modified).toLocaleDateString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error updating dates:', error);
  }
}

// Run the update
updateLastModifiedDates().catch(console.error);