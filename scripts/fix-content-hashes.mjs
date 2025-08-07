#!/usr/bin/env node

/**
 * Fix content hash generation
 * Regenerates hashes based on actual content_text instead of metadata
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isTestMode = args.includes('--test');
const limit = isTestMode ? 10 : null;

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

/**
 * Generate a content-based hash from lesson content
 * @param {string} content - The lesson content text
 * @param {object} metadata - Optional metadata for fallback
 * @returns {string} The generated hash with optional prefix
 */
function generateProperContentHash(content, metadata = {}) {
  if (content && content.trim().length > 0) {
    // Normalize content: lowercase, single spaces, trim
    const normalizedContent = content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    
    return crypto.createHash('sha256')
      .update(normalizedContent)
      .digest('hex');
  } else {
    // Fallback to metadata hash with prefix
    const metadataParts = [
      metadata.title?.toLowerCase().trim() || '',
      metadata.summary?.toLowerCase().trim() || '',
      (metadata.grade_levels || []).sort().join(','),
      // Include other metadata fields as needed
    ];
    
    const metadataString = metadataParts.join('|');
    const hash = crypto.createHash('sha256')
      .update(metadataString)
      .digest('hex');
    
    // Prefix to indicate this is metadata-only
    return 'META_' + hash;
  }
}

/**
 * Validate new hashes against embeddings
 * @param {Array} lessons - Lessons with old and new hashes
 * @returns {Object} Validation report
 */
async function validateHashes(lessons) {
  const validation = {
    totalLessons: lessons.length,
    contentHashes: 0,
    metadataHashes: 0,
    resolvedFalsePositives: [],
    newDuplicatesFound: [],
    suspiciousCases: []
  };

  // Group by old hash and new hash
  const oldHashGroups = {};
  const newHashGroups = {};
  
  for (const lesson of lessons) {
    // Track hash types
    if (lesson.newHash.startsWith('META_')) {
      validation.metadataHashes++;
    } else {
      validation.contentHashes++;
    }
    
    // Group by old hash
    if (!oldHashGroups[lesson.oldHash]) {
      oldHashGroups[lesson.oldHash] = [];
    }
    oldHashGroups[lesson.oldHash].push(lesson);
    
    // Group by new hash
    if (!newHashGroups[lesson.newHash]) {
      newHashGroups[lesson.newHash] = [];
    }
    newHashGroups[lesson.newHash].push(lesson);
  }

  // Find resolved false positives (same old hash, different new hash)
  for (const [oldHash, group] of Object.entries(oldHashGroups)) {
    if (group.length > 1) {
      const uniqueNewHashes = new Set(group.map(l => l.newHash));
      if (uniqueNewHashes.size > 1) {
        validation.resolvedFalsePositives.push({
          oldHash: oldHash.substring(0, 16) + '...',
          lessonCount: group.length,
          newHashCount: uniqueNewHashes.size,
          lessons: group.map(l => ({
            id: l.lesson_id,
            title: l.title,
            contentLength: l.content_text?.length || 0
          }))
        });
      }
    }
  }

  // Find new duplicates (different old hash, same new hash)
  for (const [newHash, group] of Object.entries(newHashGroups)) {
    if (group.length > 1 && !newHash.startsWith('META_')) {
      const uniqueOldHashes = new Set(group.map(l => l.oldHash));
      if (uniqueOldHashes.size > 1) {
        // Check embedding similarity
        const embedSimilarities = [];
        for (let i = 0; i < group.length - 1; i++) {
          for (let j = i + 1; j < group.length; j++) {
            if (group[i].content_embedding && group[j].content_embedding) {
              // Calculate cosine similarity (simplified)
              const similarity = calculateCosineSimilarity(
                group[i].content_embedding,
                group[j].content_embedding
              );
              embedSimilarities.push(similarity);
            }
          }
        }
        
        const avgSimilarity = embedSimilarities.length > 0 
          ? embedSimilarities.reduce((a, b) => a + b, 0) / embedSimilarities.length 
          : null;
        
        validation.newDuplicatesFound.push({
          newHash: newHash.substring(0, 16) + '...',
          lessonCount: group.length,
          oldHashCount: uniqueOldHashes.size,
          avgEmbeddingSimilarity: avgSimilarity,
          lessons: group.map(l => ({
            id: l.lesson_id,
            title: l.title
          }))
        });
      }
    }
  }

  return validation;
}

/**
 * Simple cosine similarity calculation for embeddings
 */
function calculateCosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

async function fixContentHashes() {
  console.log('🔧 Fixing Content Hash Generation\n');
  console.log('=' .repeat(60));
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  if (isTestMode) {
    console.log('🧪 TEST MODE - Processing only 10 lessons\n');
  }

  try {
    // 1. Fetch lessons
    console.log('📋 Fetching lessons...');
    let query = supabase
      .from('lessons')
      .select('*')
      .not('content_text', 'is', null)
      .order('lesson_id');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data: lessons, error: fetchError } = await query;
    
    if (fetchError) throw fetchError;
    
    console.log(`✅ Fetched ${lessons.length} lessons\n`);

    // 2. Generate new hashes
    console.log('🔄 Generating new content-based hashes...');
    const updatedLessons = lessons.map(lesson => {
      const oldHash = lesson.content_hash;
      const newHash = generateProperContentHash(lesson.content_text, {
        title: lesson.title,
        summary: lesson.summary,
        grade_levels: lesson.grade_levels
      });
      
      return {
        ...lesson,
        oldHash,
        newHash,
        hashChanged: oldHash !== newHash
      };
    });

    const changedCount = updatedLessons.filter(l => l.hashChanged).length;
    console.log(`✅ Generated new hashes: ${changedCount} changed, ${lessons.length - changedCount} unchanged\n`);

    // 3. Validate new hashes
    console.log('🔍 Validating new hashes against embeddings...');
    const validation = await validateHashes(updatedLessons);
    
    console.log('\n📊 Validation Results:');
    console.log(`  - Content-based hashes: ${validation.contentHashes}`);
    console.log(`  - Metadata-only hashes: ${validation.metadataHashes}`);
    console.log(`  - Resolved false positives: ${validation.resolvedFalsePositives.length}`);
    console.log(`  - New duplicates found: ${validation.newDuplicatesFound.length}`);

    // 4. Show examples of changes
    if (validation.resolvedFalsePositives.length > 0) {
      console.log('\n✅ Examples of Resolved False Positives:');
      validation.resolvedFalsePositives.slice(0, 3).forEach(group => {
        console.log(`  Old hash ${group.oldHash} split into ${group.newHashCount} different hashes`);
        group.lessons.slice(0, 2).forEach(l => {
          console.log(`    - "${l.title}" (${l.contentLength} chars)`);
        });
      });
    }

    if (validation.newDuplicatesFound.length > 0) {
      console.log('\n🔍 New Duplicates Found:');
      validation.newDuplicatesFound.slice(0, 3).forEach(group => {
        console.log(`  ${group.lessonCount} lessons now have same hash`);
        if (group.avgEmbeddingSimilarity !== null) {
          console.log(`  Embedding similarity: ${(group.avgEmbeddingSimilarity * 100).toFixed(1)}%`);
        }
        group.lessons.slice(0, 2).forEach(l => {
          console.log(`    - "${l.title}"`);
        });
      });
    }

    // 5. Update database (if not dry run)
    if (!isDryRun) {
      console.log('\n💾 Updating database...');
      
      const batchSize = 50;
      let updated = 0;
      
      for (let i = 0; i < updatedLessons.length; i += batchSize) {
        const batch = updatedLessons.slice(i, i + batchSize);
        
        // Update each lesson
        const updates = await Promise.all(
          batch.map(lesson => 
            supabase
              .from('lessons')
              .update({ content_hash: lesson.newHash })
              .eq('lesson_id', lesson.lesson_id)
          )
        );
        
        // Check for errors
        const errors = updates.filter(({ error }) => error);
        if (errors.length > 0) {
          console.error('❌ Error updating batch:', errors[0].error);
          throw errors[0].error;
        }
        
        updated += batch.length;
        console.log(`  Updated ${updated}/${updatedLessons.length} lessons...`);
      }
      
      console.log('✅ Database updated successfully!');
    }

    // 6. Generate report
    const report = {
      timestamp: new Date().toISOString(),
      mode: isDryRun ? 'dry-run' : (isTestMode ? 'test' : 'production'),
      summary: {
        totalProcessed: lessons.length,
        hashesChanged: changedCount,
        contentBasedHashes: validation.contentHashes,
        metadataOnlyHashes: validation.metadataHashes
      },
      improvements: {
        resolvedFalsePositives: validation.resolvedFalsePositives.length,
        newDuplicatesFound: validation.newDuplicatesFound.length
      },
      validation: validation,
      applied: !isDryRun
    };

    // Save report
    const reportPath = join(
      __dirname, 
      '..', 
      'reports', 
      `hash-fix-${isDryRun ? 'dryrun' : 'applied'}-${new Date().toISOString().split('T')[0]}.json`
    );
    await fs.mkdir(join(__dirname, '..', 'reports'), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('📋 HASH FIX COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n✅ Report saved to: ${reportPath}`);
    
    if (isDryRun) {
      console.log('\n💡 This was a DRY RUN. To apply changes, run without --dry-run flag');
    } else {
      console.log('\n✅ Content hashes have been successfully regenerated!');
      console.log('   Next steps:');
      console.log('   1. Update edge functions to use new hash generation');
      console.log('   2. Test duplicate detection with new hashes');
      console.log('   3. Deploy changes to production');
    }

  } catch (error) {
    console.error('❌ Error fixing content hashes:', error.message);
    process.exit(1);
  }
}

// Show usage
if (args.includes('--help')) {
  console.log('Usage: node fix-content-hashes.mjs [options]');
  console.log('Options:');
  console.log('  --dry-run   Preview changes without updating database');
  console.log('  --test      Process only 10 lessons for testing');
  console.log('  --help      Show this help message');
  process.exit(0);
}

// Run the fix
fixContentHashes().catch(console.error);