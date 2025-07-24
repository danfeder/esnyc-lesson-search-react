#!/usr/bin/env node

/**
 * Backup script for lessons data from remote Supabase
 * This script connects to Supabase and exports all data as JSON
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function backupRemoteData() {
  console.log('🔒 Creating backup of remote Supabase data...\n');

  // Check for required environment variables
  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env file');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  try {
    // Create backup directory
    const backupDir = path.join(__dirname, '..', 'database-backups');
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupSubDir = path.join(backupDir, `backup-${timestamp}`);
    await fs.mkdir(backupSubDir, { recursive: true });
    
    let totalRecords = 0;
    const backupSummary = {
      timestamp,
      tables: {}
    };

    // 1. Backup lessons table
    console.log('📋 Backing up lessons table...');
    const { data: lessons, error: lessonsError, count } = await supabase
      .from('lessons')
      .select('*', { count: 'exact' })
      .order('lesson_id');

    if (lessonsError) {
      console.error('❌ Error fetching lessons:', lessonsError.message);
      throw lessonsError;
    }

    const lessonsFile = path.join(backupSubDir, 'lessons.json');
    await fs.writeFile(
      lessonsFile,
      JSON.stringify(lessons || [], null, 2),
      'utf8'
    );
    console.log(`✅ Saved ${lessons?.length || 0} lessons`);
    backupSummary.tables.lessons = lessons?.length || 0;
    totalRecords += lessons?.length || 0;

    // 2. Try to backup other tables (they might be empty)
    const tables = [
      'user_profiles',
      'saved_searches', 
      'lesson_collections',
      'bookmarks'
    ];

    for (const table of tables) {
      console.log(`\n📋 Backing up ${table} table...`);
      const { data, error } = await supabase
        .from(table)
        .select('*');

      if (error && error.code !== 'PGRST116') { // Ignore "no rows" error
        console.error(`⚠️  Warning for ${table}:`, error.message);
        backupSummary.tables[table] = 'error';
      } else {
        const tableFile = path.join(backupSubDir, `${table}.json`);
        await fs.writeFile(
          tableFile,
          JSON.stringify(data || [], null, 2),
          'utf8'
        );
        const recordCount = data?.length || 0;
        console.log(`✅ Saved ${recordCount} records from ${table}`);
        backupSummary.tables[table] = recordCount;
        totalRecords += recordCount;
      }
    }

    // Create backup summary
    const summaryFile = path.join(backupSubDir, 'backup-summary.json');
    backupSummary.totalRecords = totalRecords;
    backupSummary.files = await fs.readdir(backupSubDir);
    
    await fs.writeFile(
      summaryFile,
      JSON.stringify(backupSummary, null, 2),
      'utf8'
    );

    console.log('\n' + '='.repeat(50));
    console.log('✅ BACKUP COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log(`📁 Backup location: ${backupSubDir}`);
    console.log(`📊 Total records backed up: ${totalRecords}`);
    console.log(`📄 Files created: ${backupSummary.files.length}`);
    console.log('\nBackup summary:');
    Object.entries(backupSummary.tables).forEach(([table, count]) => {
      console.log(`  - ${table}: ${count} records`);
    });

    // Create a simple restore guide
    const restoreGuide = `# Restore Guide for Backup ${timestamp}

This backup contains ${totalRecords} records from your Supabase database.

## Files in this backup:
${backupSummary.files.map(f => `- ${f}`).join('\n')}

## To restore this data:

1. **Manual restore via Supabase Dashboard:**
   - Go to your Supabase project
   - Use the SQL editor to truncate tables if needed
   - Use the Table editor to import JSON files

2. **Programmatic restore:**
   - Use the Supabase JS client to insert records
   - Be careful with foreign key constraints
   - Restore in order: lessons, user_profiles, then other tables

## Table record counts:
${Object.entries(backupSummary.tables).map(([t, c]) => `- ${t}: ${c}`).join('\n')}

⚠️  WARNING: Restoring will overwrite existing data!
`;

    const guideFile = path.join(backupSubDir, 'RESTORE_GUIDE.md');
    await fs.writeFile(guideFile, restoreGuide, 'utf8');

    console.log(`\n📖 Restore guide created: RESTORE_GUIDE.md`);

  } catch (error) {
    console.error('\n❌ Backup failed:', error.message);
    process.exit(1);
  }
}

// Run the backup
backupRemoteData().catch(console.error);