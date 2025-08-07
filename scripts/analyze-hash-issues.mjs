#!/usr/bin/env node

/**
 * Analyze current hash generation issues
 * Documents the problem with metadata-only hashing
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
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

async function analyzeHashIssues() {
  console.log('🔍 Analyzing Content Hash Issues\n');
  console.log('=' .repeat(60));

  try {
    // 1. Get all lessons to analyze
    console.log('\n📊 Finding lessons with same hash but different content...');
    const { data: allLessons, error: fetchError } = await supabase
      .from('lessons')
      .select('lesson_id, title, content_hash, content_text, content_embedding')
      .not('content_hash', 'is', null);
    
    if (fetchError) throw fetchError;

    // Group by hash and analyze
    const hashGroups = {};
    for (const lesson of allLessons) {
      if (!hashGroups[lesson.content_hash]) {
        hashGroups[lesson.content_hash] = [];
      }
      hashGroups[lesson.content_hash].push({
        ...lesson,
        contentLength: lesson.content_text?.length || 0
      });
    }

    // Find groups with significant content differences
    const problematicGroups = [];
    for (const [hash, group] of Object.entries(hashGroups)) {
      if (group.length > 1) {
        const lengths = group.map(l => l.contentLength);
        const minLength = Math.min(...lengths);
        const maxLength = Math.max(...lengths);
        const lengthDiff = maxLength - minLength;
        
        if (lengthDiff > 500) {
          problematicGroups.push({
            content_hash: hash,
            count: group.length,
            min_length: minLength,
            max_length: maxLength,
            length_diff: lengthDiff,
            lesson_ids: group.map(l => l.lesson_id),
            titles: group.map(l => l.title)
          });
        }
      }
    }

    // Sort by length difference
    problematicGroups.sort((a, b) => b.length_diff - a.length_diff);
    const hashGroupsTop = problematicGroups.slice(0, 10);

    console.log(`\n⚠️  Found ${hashGroupsTop.length} hash groups with significant content differences:`);
    
    const falsePositives = [];
    
    for (const group of hashGroupsTop) {
      console.log(`\n  Hash: ${group.content_hash.substring(0, 16)}...`);
      console.log(`  Lessons: ${group.count}`);
      console.log(`  Content length difference: ${group.length_diff} chars`);
      console.log(`  Min length: ${group.min_length}, Max length: ${group.max_length}`);
      
      falsePositives.push({
        hash: group.content_hash,
        lessonCount: group.count,
        lengthDiff: group.length_diff,
        lessonIds: group.lesson_ids,
        titles: group.titles
      });
    }

    // 2. Check embedding similarity for "identical" lessons
    console.log('\n📊 Checking embedding similarity for lessons with same hash...');
    
    // Calculate embedding similarities for problematic groups
    const embedComparison = [];
    for (const group of problematicGroups.slice(0, 5)) {
      const lessons = allLessons.filter(l => group.lesson_ids.includes(l.lesson_id));
      
      for (let i = 0; i < lessons.length - 1; i++) {
        for (let j = i + 1; j < lessons.length; j++) {
          const l1 = lessons[i];
          const l2 = lessons[j];
          
          if (l1.content_embedding && l2.content_embedding) {
            // Simple cosine similarity calculation
            let dotProduct = 0;
            let norm1 = 0;
            let norm2 = 0;
            
            for (let k = 0; k < l1.content_embedding.length; k++) {
              dotProduct += l1.content_embedding[k] * l2.content_embedding[k];
              norm1 += l1.content_embedding[k] * l1.content_embedding[k];
              norm2 += l2.content_embedding[k] * l2.content_embedding[k];
            }
            
            const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
            
            embedComparison.push({
              id1: l1.lesson_id,
              id2: l2.lesson_id,
              title: l1.title,
              len1: l1.content_text?.length || 0,
              len2: l2.content_text?.length || 0,
              len_diff: Math.abs((l1.content_text?.length || 0) - (l2.content_text?.length || 0)),
              embedding_similarity: similarity
            });
          }
        }
      }
    }
    
    // Sort by embedding similarity (ascending)
    embedComparison.sort((a, b) => a.embedding_similarity - b.embedding_similarity);

    console.log('\n🔴 Lessons with same hash but LOW embedding similarity:');
    let suspiciousCount = 0;
    
    for (const pair of embedComparison || []) {
      if (pair.embedding_similarity < 0.5) {
        suspiciousCount++;
        console.log(`\n  "${pair.title}"`);
        console.log(`  IDs: ${pair.id1} vs ${pair.id2}`);
        console.log(`  Lengths: ${pair.len1} vs ${pair.len2} (diff: ${pair.len_diff})`);
        console.log(`  Embedding similarity: ${(pair.embedding_similarity * 100).toFixed(2)}%`);
      }
    }

    // 3. Overall statistics
    console.log('\n📊 Overall Statistics:');
    
    // Calculate statistics from the data we already have
    const uniqueHashes = new Set(allLessons.map(l => l.content_hash));
    const duplicateHashGroups = Object.values(hashGroups).filter(g => g.length > 1);
    
    const stat = {
      total_lessons: allLessons.length,
      unique_hashes: uniqueHashes.size,
      potential_duplicates: allLessons.length - uniqueHashes.size,
      has_content: allLessons.filter(l => l.content_text && l.content_text.length > 0).length,
      has_embedding: allLessons.filter(l => l.content_embedding).length,
      duplicate_hash_count: duplicateHashGroups.length
    };
    console.log(`  Total lessons: ${stat.total_lessons}`);
    console.log(`  Unique hashes: ${stat.unique_hashes}`);
    console.log(`  Potential duplicates (by hash): ${stat.potential_duplicates}`);
    console.log(`  Lessons with content: ${stat.has_content}`);
    console.log(`  Lessons with embeddings: ${stat.has_embedding}`);

    // 4. Generate report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalLessons: stat.total_lessons,
        uniqueHashes: stat.unique_hashes,
        potentialDuplicates: stat.potential_duplicates,
        falsePositiveGroups: falsePositives.length,
        suspiciousPairs: suspiciousCount
      },
      problem: 'Content hashes are generated from metadata only (title, summary, grade_levels, etc.), not from actual lesson content',
      evidence: {
        falsePositives: falsePositives.slice(0, 5),
        lowSimilarityPairs: embedComparison?.slice(0, 5)
      },
      recommendation: 'Regenerate hashes using actual content_text field'
    };

    // Save report
    const reportPath = join(__dirname, '..', 'reports', `hash-analysis-${new Date().toISOString().split('T')[0]}.json`);
    await fs.mkdir(join(__dirname, '..', 'reports'), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('📋 ANALYSIS COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n✅ Report saved to: ${reportPath}`);
    console.log('\n🔴 KEY FINDING: Hashes are based on metadata only, not content!');
    console.log(`   - ${falsePositives.length} groups have same hash but different content`);
    console.log(`   - ${suspiciousCount} pairs have <50% embedding similarity despite same hash`);
    console.log('\n💡 NEXT STEP: Run fix-content-hashes.mjs to regenerate proper hashes');

  } catch (error) {
    console.error('❌ Error analyzing hash issues:', error.message);
    process.exit(1);
  }
}

// Run the analysis
analyzeHashIssues().catch(console.error);