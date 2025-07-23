#!/usr/bin/env node

/**
 * Verify that we can map raw text from CSV to lessons in database
 */

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyMapping() {
  console.log('🔍 Verifying raw text mapping to database lessons...\n');

  // Initialize Supabase client (production)
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Load CSV data
    const csvPath = path.join(__dirname, '..', 'data', 'Lessn Plan Raw Text - HIGH Confidence Lessons.csv');
    const csvContent = await fs.readFile(csvPath, 'utf8');
    
    // Parse CSV
    const records = await new Promise((resolve, reject) => {
      parse(csvContent, {
        columns: true,
        skip_empty_lines: true
      }, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });

    console.log(`📊 Loaded ${records.length} records from CSV\n`);

    // Get all lessons from database
    const { data: dbLessons, error } = await supabase
      .from('lessons')
      .select('lesson_id, title');

    if (error) throw error;

    console.log(`📊 Found ${dbLessons.length} lessons in database\n`);

    // Create maps for quick lookup
    const csvMap = new Map(records.map(r => [r.FileID, r]));
    const dbMap = new Map(dbLessons.map(l => [l.lesson_id, l]));

    // Find matches and mismatches
    let matches = 0;
    let mismatches = [];
    let csvOnly = [];
    let dbOnly = [];

    // Check CSV records against database
    for (const record of records) {
      if (dbMap.has(record.FileID)) {
        matches++;
      } else {
        csvOnly.push({
          file_id: record.FileID,
          title: record.FileName
        });
      }
    }

    // Check database records against CSV
    for (const lesson of dbLessons) {
      if (!csvMap.has(lesson.lesson_id)) {
        dbOnly.push({
          lesson_id: lesson.lesson_id,
          title: lesson.title
        });
      }
    }

    // Display results
    console.log('='.repeat(60));
    console.log('📊 MAPPING VERIFICATION RESULTS:');
    console.log('='.repeat(60));
    console.log(`✅ Matched lessons: ${matches}`);
    console.log(`📄 CSV records: ${records.length}`);
    console.log(`💾 Database lessons: ${dbLessons.length}`);
    console.log(`❓ In CSV but not in DB: ${csvOnly.length}`);
    console.log(`❓ In DB but not in CSV: ${dbOnly.length}`);
    
    if (csvOnly.length > 0) {
      console.log('\n⚠️  Lessons in CSV but not in database:');
      csvOnly.slice(0, 5).forEach(l => {
        console.log(`   - ${l.file_id}: ${l.title}`);
      });
      if (csvOnly.length > 5) {
        console.log(`   ... and ${csvOnly.length - 5} more`);
      }
    }

    if (dbOnly.length > 0) {
      console.log('\n⚠️  Lessons in database but not in CSV:');
      dbOnly.slice(0, 5).forEach(l => {
        console.log(`   - ${l.lesson_id}: ${l.title}`);
      });
      if (dbOnly.length > 5) {
        console.log(`   ... and ${dbOnly.length - 5} more`);
      }
    }

    // Sample verification - show a few matches
    console.log('\n📋 Sample matches (first 3):');
    let sampleCount = 0;
    for (const record of records) {
      if (dbMap.has(record.FileID) && sampleCount < 3) {
        const dbLesson = dbMap.get(record.FileID);
        console.log(`\n   CSV: ${record.FileName}`);
        console.log(`   DB:  ${dbLesson.title}`);
        console.log(`   ID:  ${record.FileID}`);
        console.log(`   Text preview: ${record.RawTextContent.substring(0, 100)}...`);
        sampleCount++;
      }
    }

    const mappingPercentage = ((matches / dbLessons.length) * 100).toFixed(1);
    console.log(`\n✅ Mapping coverage: ${mappingPercentage}% of database lessons have raw text`);

    return {
      matches,
      csvOnly: csvOnly.length,
      dbOnly: dbOnly.length,
      percentage: mappingPercentage
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run verification
verifyMapping().catch(console.error);