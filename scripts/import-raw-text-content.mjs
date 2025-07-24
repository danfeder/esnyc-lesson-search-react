#!/usr/bin/env node

/**
 * Import raw text content from CSV into production database
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

async function importRawText() {
  console.log('📝 Importing raw text content into production database...\n');

  // Initialize Supabase client with service role key
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env file');
    process.exit(1);
  }

  try {
    // Load CSV data
    const csvPath = path.join(__dirname, '..', 'data', 'Lessn Plan Raw Text - HIGH Confidence Lessons.csv');
    const csvContent = await fs.readFile(csvPath, 'utf8');
    
    // Parse CSV
    console.log('📂 Loading CSV data...');
    const records = await new Promise((resolve, reject) => {
      parse(csvContent, {
        columns: true,
        skip_empty_lines: true
      }, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });

    console.log(`✅ Loaded ${records.length} records from CSV\n`);

    // Process in batches
    const batchSize = 10;
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    console.log('💾 Updating lessons with raw text content...');
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      // Process each record in the batch
      const updatePromises = batch.map(async (record) => {
        try {
          // Check if lesson exists
          const { data: existing, error: checkError } = await supabase
            .from('lessons')
            .select('lesson_id')
            .eq('lesson_id', record.FileID)
            .single();

          if (checkError || !existing) {
            skipped++;
            return { status: 'skipped', id: record.FileID };
          }

          // Update with raw text content
          const { error: updateError } = await supabase
            .from('lessons')
            .update({ 
              content_text: record.RawTextContent,
              // Also update metadata fields from CSV if available
              confidence: {
                level: record.ConfidenceLevel,
                lesson_plan_confidence: parseFloat(record.LessonPlanConfidence) || null,
                quality_markers: record.QualityMarkers,
                validation_status: record.ValidationStatus
              }
            })
            .eq('lesson_id', record.FileID);

          if (updateError) {
            errors++;
            return { status: 'error', id: record.FileID, error: updateError };
          }

          updated++;
          return { status: 'updated', id: record.FileID };
        } catch (err) {
          errors++;
          return { status: 'error', id: record.FileID, error: err };
        }
      });

      // Wait for batch to complete
      const results = await Promise.all(updatePromises);
      processed += batch.length;
      
      console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1} (${processed}/${records.length})`);
      
      // Log any errors from this batch
      const batchErrors = results.filter(r => r.status === 'error');
      if (batchErrors.length > 0) {
        batchErrors.forEach(e => {
          console.error(`   ❌ Error updating ${e.id}: ${e.error.message}`);
        });
      }
    }

    // Verify the import
    console.log('\n🔍 Verifying import...');
    const { count: totalCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    const { count: withTextCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .not('content_text', 'is', null);

    console.log('\n' + '='.repeat(60));
    console.log('📊 RAW TEXT IMPORT SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${updated} lessons`);
    console.log(`⏭️  Skipped (not in DB): ${skipped} records`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total lessons in DB: ${totalCount}`);
    console.log(`📝 Lessons with raw text: ${withTextCount}`);
    console.log(`📈 Coverage: ${((withTextCount / totalCount) * 100).toFixed(1)}%`);

    // List the skipped records
    if (skipped > 0) {
      console.log('\n⚠️  Records in CSV but not in database:');
      let skippedCount = 0;
      for (const record of records) {
        const { data } = await supabase
          .from('lessons')
          .select('lesson_id')
          .eq('lesson_id', record.FileID)
          .single();
        
        if (!data && skippedCount < 5) {
          console.log(`   - ${record.FileID}: ${record.FileName}`);
          skippedCount++;
        }
      }
      if (skipped > 5) {
        console.log(`   ... and ${skipped - 5} more`);
      }
    }

    console.log('\n✅ Raw text import completed!');
    console.log('\nNext steps:');
    console.log('1. Run: node scripts/generate-content-hashes.mjs');
    console.log('2. Generate embeddings for semantic search');

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
importRawText().catch(console.error);