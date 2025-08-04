#!/usr/bin/env node

/**
 * Script to replace console.log/error/warn statements with logger utility
 * This helps migrate the codebase to use the centralized logging service
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files to skip
const SKIP_FILES = [
  'logger.ts',
  'sentry.ts',
  'replace-console-logs.js',
  'vite.config.ts',
  'tailwind.config.js',
  'eslint.config.js',
];

// Patterns to replace
const REPLACEMENTS = [
  // Simple console.log statements
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.log(',
    importNeeded: true,
  },
  // Simple console.error statements
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error(',
    importNeeded: true,
  },
  // Simple console.warn statements
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn(',
    importNeeded: true,
  },
  // Simple console.info statements
  {
    pattern: /console\.info\(/g,
    replacement: 'logger.info(',
    importNeeded: true,
  },
  // Console.log with specific patterns that should be tracked
  {
    pattern: /console\.log\(['"`](\[TRACK\]|Tracking:|Event:)/g,
    replacement: 'logger.track(',
    importNeeded: true,
  },
];

/**
 * Check if a file should be skipped
 */
function shouldSkipFile(filePath) {
  const fileName = path.basename(filePath);
  return SKIP_FILES.some((skip) => fileName.includes(skip));
}

/**
 * Add logger import if not present
 */
function addLoggerImport(content, filePath) {
  // Check if logger is already imported
  if (
    content.includes("from '../utils/logger'") ||
    content.includes("from '@/utils/logger'") ||
    content.includes("from '../../utils/logger'") ||
    content.includes("from './utils/logger'")
  ) {
    return content;
  }

  // Calculate relative path to logger
  const fileDir = path.dirname(filePath);
  const srcIndex = fileDir.indexOf('/src/');
  if (srcIndex === -1) return content;

  const relativeDir = fileDir.substring(srcIndex + 5); // Skip '/src/'
  const depth = relativeDir ? relativeDir.split('/').length : 0;
  const importPath = depth === 0 ? './utils/logger' : '../'.repeat(depth) + 'utils/logger';

  // Find the right place to add the import
  const importStatement = `import { logger } from '${importPath}';\n`;

  // Try to add after the last import statement
  const lastImportMatch = content.match(/^import[^;]+;$/gm);
  if (lastImportMatch && lastImportMatch.length > 0) {
    const lastImport = lastImportMatch[lastImportMatch.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    return (
      content.slice(0, lastImportIndex + lastImport.length) +
      '\n' +
      importStatement +
      content.slice(lastImportIndex + lastImport.length)
    );
  }

  // If no imports found, add at the beginning
  return importStatement + content;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return { skipped: true };
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let needsImport = false;
  let changeCount = 0;

  // Apply replacements
  REPLACEMENTS.forEach(({ pattern, replacement, importNeeded }) => {
    const matches = content.match(pattern);
    if (matches) {
      changeCount += matches.length;
      content = content.replace(pattern, replacement);
      if (importNeeded) {
        needsImport = true;
      }
    }
  });

  // Add import if needed
  if (needsImport && changeCount > 0) {
    content = addLoggerImport(content, filePath);
  }

  // Write back if changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return { changed: true, changeCount };
  }

  return { changed: false };
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Searching for TypeScript/JavaScript files...');

  const patterns = ['src/**/*.ts', 'src/**/*.tsx'];

  let totalFiles = 0;
  let changedFiles = 0;
  let totalChanges = 0;
  let skippedFiles = 0;

  patterns.forEach((pattern) => {
    const files = glob.sync(pattern, {
      cwd: path.resolve(__dirname, '..'),
      absolute: true,
    });

    files.forEach((file) => {
      totalFiles++;
      const result = processFile(file);

      if (result.skipped) {
        skippedFiles++;
      } else if (result.changed) {
        changedFiles++;
        totalChanges += result.changeCount || 0;
        console.log(
          `✅ Updated: ${path.relative(process.cwd(), file)} (${result.changeCount} changes)`
        );
      }
    });
  });

  console.log('\n📊 Summary:');
  console.log(`   Total files scanned: ${totalFiles}`);
  console.log(`   Files updated: ${changedFiles}`);
  console.log(`   Files skipped: ${skippedFiles}`);
  console.log(`   Total replacements: ${totalChanges}`);

  if (changedFiles > 0) {
    console.log('\n⚠️  Please review the changes and ensure:');
    console.log('   1. Import paths are correct');
    console.log('   2. No sensitive data is being logged');
    console.log('   3. Log levels are appropriate');
    console.log('\n💡 Run "npm run lint:fix" to fix any formatting issues');
  }
}

// Run the script
main();
