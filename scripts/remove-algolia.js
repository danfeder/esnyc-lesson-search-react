#!/usr/bin/env node

/**
 * Script to remove Algolia dependencies and clean up after migration
 * Run this AFTER confirming PostgreSQL search is working
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function removeAlgolia() {
  console.log('🧹 Removing Algolia dependencies and cleaning up...\n');

  try {
    // 1. List files to be removed
    const filesToRemove = [
      'src/lib/algolia.ts',
      'src/hooks/useAlgoliaSearch.ts',
      'scripts/sync-to-algolia.js',
      'scripts/configure-synonyms.js',
      'algolia-synonyms.json',
    ];

    console.log('📋 Files to remove:');
    filesToRemove.forEach((file) => console.log(`   - ${file}`));
    console.log('');

    // 2. Check which files exist
    const existingFiles = [];
    for (const file of filesToRemove) {
      const filePath = path.join(projectRoot, file);
      try {
        await fs.access(filePath);
        existingFiles.push(file);
      } catch {
        // File doesn't exist
      }
    }

    if (existingFiles.length === 0) {
      console.log('✅ No Algolia files found. Already cleaned up!');
      return;
    }

    // 3. Backup files before removing
    console.log('💾 Creating backup of Algolia files...');
    const backupDir = path.join(projectRoot, 'algolia-backup');
    await fs.mkdir(backupDir, { recursive: true });

    for (const file of existingFiles) {
      const sourcePath = path.join(projectRoot, file);
      const destPath = path.join(backupDir, file);
      const destDir = path.dirname(destPath);

      await fs.mkdir(destDir, { recursive: true });
      await fs.copyFile(sourcePath, destPath);
      console.log(`   ✓ Backed up ${file}`);
    }

    console.log(`\n📁 Backup created at: ${backupDir}\n`);

    // 4. Remove files
    console.log('🗑️  Removing Algolia files...');
    for (const file of existingFiles) {
      const filePath = path.join(projectRoot, file);
      await fs.unlink(filePath);
      console.log(`   ✓ Removed ${file}`);
    }

    // 5. Update package.json
    console.log('\n📦 Updating package.json...');
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    const algoliaDeps = ['algoliasearch', 'react-instantsearch'];
    let removed = false;

    algoliaDeps.forEach((dep) => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        delete packageJson.dependencies[dep];
        removed = true;
        console.log(`   ✓ Removed ${dep}`);
      }
    });

    if (removed) {
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log('\n📦 Run "npm install" to update node_modules');
    }

    // 6. Check for remaining Algolia references
    console.log('\n🔍 Checking for remaining Algolia references...');
    const {
      default: { globby },
    } = await import('globby');

    const sourceFiles = await globby(
      ['src/**/*.{ts,tsx,js,jsx}', '!src/**/*.test.*', '!node_modules/**'],
      { cwd: projectRoot }
    );

    const algoliaReferences = [];
    for (const file of sourceFiles) {
      const content = await fs.readFile(path.join(projectRoot, file), 'utf8');
      if (content.includes('algolia') || content.includes('Algolia')) {
        algoliaReferences.push(file);
      }
    }

    if (algoliaReferences.length > 0) {
      console.log('\n⚠️  Found Algolia references in:');
      algoliaReferences.forEach((file) => console.log(`   - ${file}`));
      console.log('\n   Please review these files manually.');
    } else {
      console.log('   ✅ No Algolia references found in source code!');
    }

    // 7. Environment variables reminder
    console.log('\n🔐 Environment variables to remove from .env:');
    console.log('   - VITE_ALGOLIA_APP_ID');
    console.log('   - VITE_ALGOLIA_SEARCH_API_KEY');
    console.log('   - ALGOLIA_ADMIN_API_KEY');

    console.log('\n✨ Algolia removal complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run "npm install" to update dependencies');
    console.log('   2. Remove Algolia environment variables from .env');
    console.log('   3. Test that search is working with PostgreSQL');
    console.log('   4. Delete the algolia-backup folder when confident');
  } catch (error) {
    console.error('❌ Error removing Algolia:', error);
    process.exit(1);
  }
}

// Run the removal
removeAlgolia();
