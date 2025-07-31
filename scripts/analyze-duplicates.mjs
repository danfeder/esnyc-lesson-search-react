#!/usr/bin/env node

/**
 * Comprehensive duplicate analysis for ESNYC Lesson Library
 * Identifies exact duplicates, near-duplicates, and title variations
 * Generates a detailed report with canonical recommendations
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeContentQuality } from './analyze-content-quality.mjs';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration
const CONFIG = {
  thresholds: {
    exact: 1.0,
    nearDuplicate: 0.85,
    similar: 0.70,
    titleMatch: 0.70
  },
  weights: {
    recency: 0.15,      // Reduced from 0.20
    completeness: 0.20, // Reduced from 0.30
    quality: 0.15,      // Reduced from 0.20
    naming: 0.05,       // Reduced from 0.10
    notes: 0.10,        // Reduced from 0.20
    content: 0.35       // NEW: 35% weight for content quality
  }
};

// Generate content hash (same as Edge Function)
function generateContentHash(content, metadata = {}) {
  const contentParts = [
    content.toLowerCase().trim(),
    JSON.stringify(metadata)
  ];
  const contentString = contentParts.join('|');
  return crypto.createHash('sha256').update(contentString).digest('hex');
}

// Calculate title similarity using Jaccard coefficient
function calculateTitleSimilarity(title1, title2) {
  const words1 = new Set(title1.toLowerCase().split(/\s+/));
  const words2 = new Set(title2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

// Find exact duplicates by content hash
function findExactDuplicates(lessons) {
  const hashGroups = {};
  
  lessons.forEach(lesson => {
    if (lesson.content_hash) {
      if (!hashGroups[lesson.content_hash]) {
        hashGroups[lesson.content_hash] = [];
      }
      hashGroups[lesson.content_hash].push(lesson);
    }
  });
  
  return Object.values(hashGroups)
    .filter(group => group.length > 1)
    .map((group, idx) => ({
      groupId: `exact_${idx + 1}`,
      type: 'exact',
      similarityScore: 1.0,
      lessons: group
    }));
}

// Find near duplicates using pgvector
async function findNearDuplicates(lessons) {
  console.log('Finding near-duplicates using embeddings...');
  const nearDuplicates = [];
  const processed = new Set();

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    
    if (!lesson.content_embedding || processed.has(lesson.lesson_id)) {
      continue;
    }

    // Show progress
    if (i % 50 === 0) {
      console.log(`  Processing lesson ${i + 1}/${lessons.length}...`);
    }

    // Find similar lessons using pgvector
    const { data: similar, error } = await supabase.rpc(
      'find_similar_lessons_by_embedding',
      {
        query_embedding: lesson.content_embedding,
        similarity_threshold: CONFIG.thresholds.nearDuplicate,
        max_results: 10
      }
    );

    if (error) {
      console.error(`Error finding similar lessons for ${lesson.lesson_id}:`, error);
      continue;
    }

    // Filter out already processed lessons and the query lesson itself
    const unprocessedSimilar = similar?.filter(s => 
      s.lesson_id !== lesson.lesson_id && !processed.has(s.lesson_id)
    ) || [];

    if (unprocessedSimilar.length > 0) {
      const group = {
        groupId: `near_${nearDuplicates.length + 1}`,
        type: 'near',
        similarityScore: unprocessedSimilar[0].similarity_score,
        lessons: [lesson, ...unprocessedSimilar.map(s => 
          lessons.find(l => l.lesson_id === s.lesson_id)
        )].filter(Boolean)
      };
      
      nearDuplicates.push(group);
      
      // Mark all lessons in this group as processed
      group.lessons.forEach(l => processed.add(l.lesson_id));
    }
  }

  return nearDuplicates;
}

// Find title variations
function findTitleVariations(lessons) {
  const titleGroups = [];
  const processed = new Set();

  for (let i = 0; i < lessons.length; i++) {
    const lesson1 = lessons[i];
    
    if (processed.has(lesson1.lesson_id)) continue;

    const similarTitles = [];
    
    for (let j = i + 1; j < lessons.length; j++) {
      const lesson2 = lessons[j];
      
      if (processed.has(lesson2.lesson_id)) continue;

      const similarity = calculateTitleSimilarity(lesson1.title, lesson2.title);
      
      if (similarity >= CONFIG.thresholds.titleMatch && similarity < 1.0) {
        similarTitles.push({ lesson: lesson2, similarity });
      }
    }

    if (similarTitles.length > 0) {
      const group = {
        groupId: `title_${titleGroups.length + 1}`,
        type: 'title',
        similarityScore: Math.max(...similarTitles.map(s => s.similarity)),
        lessons: [lesson1, ...similarTitles.map(s => s.lesson)]
      };
      
      titleGroups.push(group);
      group.lessons.forEach(l => processed.add(l.lesson_id));
    }
  }

  return titleGroups;
}

// Calculate canonical score for a lesson
function calculateCanonicalScore(lesson, group) {
  let score = 0;
  const scoreBreakdown = {};
  
  // Recency score (15%)
  const dateField = lesson.last_modified || lesson.updated_at || lesson.created_at;
  let recencyScore = 0;
  if (dateField) {
    const date = new Date(dateField);
    const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);
    recencyScore = (1 - Math.min(age / 10, 1));
    score += CONFIG.weights.recency * recencyScore;
  }
  scoreBreakdown.recency = recencyScore;
  
  // Completeness score (20%)
  const metadataFields = [
    'thematicCategories', 'seasonTiming', 'coreCompetencies',
    'culturalHeritage', 'locationRequirements', 'activityType',
    'lessonFormat', 'mainIngredients', 'skills'
  ];
  
  const completeness = metadataFields.reduce((acc, field) => {
    const value = lesson.metadata?.[field];
    return acc + (value && (Array.isArray(value) ? value.length > 0 : value) ? 1 : 0);
  }, 0) / metadataFields.length;
  
  score += CONFIG.weights.completeness * completeness;
  scoreBreakdown.completeness = completeness;
  
  // Quality score (15%)
  const qualityScore = lesson.confidence?.overall || 0;
  score += CONFIG.weights.quality * qualityScore;
  scoreBreakdown.quality = qualityScore;
  
  // File naming score (5%)
  const hasCleanName = /^[A-Z]/.test(lesson.title) && 
                      !lesson.title.includes('Copy') &&
                      !lesson.title.includes('_v2') &&
                      !lesson.title.includes('(Updated)');
  const namingScore = hasCleanName ? 1 : 0;
  score += CONFIG.weights.naming * namingScore;
  scoreBreakdown.naming = namingScore;
  
  // Processing notes score (10%)
  const hasDuplicateNote = lesson.processing_notes?.toLowerCase().includes('duplicate');
  const notesScore = hasDuplicateNote ? 0 : 1;
  score += CONFIG.weights.notes * notesScore;
  scoreBreakdown.notes = notesScore;
  
  // Content quality score (35%)
  const contentAnalysis = analyzeContentQuality(lesson.raw_text || '');
  score += CONFIG.weights.content * contentAnalysis.totalScore;
  scoreBreakdown.content = contentAnalysis.totalScore;
  scoreBreakdown.contentDetails = contentAnalysis;
  
  // Store breakdown on the lesson object
  lesson.scoreBreakdown = scoreBreakdown;
  
  return score;
}

// Calculate scores for all lessons in duplicate groups
function calculateCanonicalScores(groups) {
  return groups.map(group => {
    const lessonsWithScores = group.lessons.map(lesson => ({
      ...lesson,
      canonicalScore: calculateCanonicalScore(lesson, group),
      metadataCompleteness: calculateMetadataCompleteness(lesson)
    }));

    // Sort by canonical score descending
    lessonsWithScores.sort((a, b) => b.canonicalScore - a.canonicalScore);

    return {
      ...group,
      lessons: lessonsWithScores,
      recommendedCanonical: lessonsWithScores[0]?.lesson_id
    };
  });
}

// Calculate metadata completeness percentage
function calculateMetadataCompleteness(lesson) {
  const fields = [
    'title', 'summary', 'objectives', 
    'thematicCategories', 'seasonTiming', 'coreCompetencies',
    'culturalHeritage', 'locationRequirements', 'activityType',
    'lessonFormat', 'mainIngredients', 'skills',
    'academicIntegration', 'socialEmotionalLearning', 'cookingMethods'
  ];

  const filledFields = fields.filter(field => {
    const value = field === 'title' || field === 'summary' || field === 'objectives' 
      ? lesson[field] 
      : lesson.metadata?.[field];
    return value && (Array.isArray(value) ? value.length > 0 : value);
  }).length;

  return filledFields / fields.length;
}

// Generate comprehensive report
function generateReport(groupsWithScores, lessons) {
  const exactGroups = groupsWithScores.filter(g => g.type === 'exact');
  const nearGroups = groupsWithScores.filter(g => g.type === 'near');
  const titleGroups = groupsWithScores.filter(g => g.type === 'title');

  const totalDuplicateLessons = groupsWithScores.reduce((sum, group) => 
    sum + group.lessons.length, 0
  );

  const report = {
    analysisDate: new Date().toISOString(),
    totalLessons: lessons.length,
    uniqueLessons: lessons.length - totalDuplicateLessons + groupsWithScores.length,
    duplicateGroups: {
      exact: exactGroups.length,
      nearDuplicate: nearGroups.length,
      titleVariations: titleGroups.length,
      total: groupsWithScores.length
    },
    duplicateLessons: totalDuplicateLessons,
    groups: groupsWithScores.map(group => ({
      groupId: group.groupId,
      type: group.type,
      similarityScore: group.similarityScore,
      recommendedCanonical: group.recommendedCanonical,
      lessonCount: group.lessons.length,
      lessons: group.lessons.map(lesson => ({
        lessonId: lesson.lesson_id,
        title: lesson.title,
        lastModified: lesson.last_modified || lesson.updated_at || lesson.created_at,
        createdAt: lesson.created_at,
        metadataCompleteness: lesson.metadataCompleteness,
        canonicalScore: lesson.canonicalScore,
        isRecommendedCanonical: lesson.lesson_id === group.recommendedCanonical,
        confidence: lesson.confidence,
        processingNotes: lesson.processing_notes,
        scoreBreakdown: lesson.scoreBreakdown
      }))
    }))
  };

  return report;
}

// Save report to file
async function saveReport(report) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `duplicate-analysis-${timestamp}.json`;
  const filepath = path.join(__dirname, '..', 'reports', filename);

  // Ensure reports directory exists
  await fs.mkdir(path.dirname(filepath), { recursive: true });

  // Save JSON report
  await fs.writeFile(filepath, JSON.stringify(report, null, 2));

  // Also save a summary report
  const summaryFilename = `duplicate-analysis-summary-${timestamp}.txt`;
  const summaryPath = path.join(__dirname, '..', 'reports', summaryFilename);
  
  const summary = generateTextSummary(report);
  await fs.writeFile(summaryPath, summary);

  console.log(`\n📄 Reports saved:`);
  console.log(`   - Full report: ${filename}`);
  console.log(`   - Summary: ${summaryFilename}`);
}

// Generate text summary
function generateTextSummary(report) {
  let summary = `ESNYC Lesson Library - Duplicate Analysis Report
Generated: ${new Date(report.analysisDate).toLocaleString()}
${'='.repeat(60)}

OVERVIEW
--------
Total Lessons: ${report.totalLessons}
Unique Lessons: ${report.uniqueLessons}
Duplicate Lessons: ${report.duplicateLessons}

DUPLICATE GROUPS
----------------
Exact Matches: ${report.duplicateGroups.exact} groups
Near Duplicates: ${report.duplicateGroups.nearDuplicate} groups
Title Variations: ${report.duplicateGroups.titleVariations} groups
Total Groups: ${report.duplicateGroups.total}

TOP DUPLICATE GROUPS BY SIZE
----------------------------\n`;

  // Sort groups by lesson count
  const topGroups = [...report.groups]
    .sort((a, b) => b.lessonCount - a.lessonCount)
    .slice(0, 10);

  topGroups.forEach((group, idx) => {
    summary += `\n${idx + 1}. ${group.lessons[0].title}`;
    summary += `\n   Type: ${group.type} | Lessons: ${group.lessonCount} | Similarity: ${(group.similarityScore * 100).toFixed(0)}%`;
    summary += `\n   Recommended: ${group.lessons.find(l => l.isRecommendedCanonical)?.title || 'Unknown'}`;
  });

  summary += `\n\n${'='.repeat(60)}`;
  summary += `\nFull details available in the JSON report.`;

  return summary;
}

// Main analysis function
async function analyzeDuplicates() {
  console.log('🔍 Starting comprehensive duplicate analysis...\n');

  try {
    // 1. Fetch all lessons
    console.log('Fetching all lessons from database...');
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .order('created_at');

    if (error) throw error;

    console.log(`✅ Fetched ${lessons.length} lessons\n`);

    // 2. Find exact duplicates by content_hash
    console.log('Finding exact duplicates by content hash...');
    const exactDuplicates = findExactDuplicates(lessons);
    console.log(`✅ Found ${exactDuplicates.length} exact duplicate groups\n`);

    // 3. Find near duplicates using embeddings
    const nearDuplicates = await findNearDuplicates(lessons);
    console.log(`✅ Found ${nearDuplicates.length} near-duplicate groups\n`);

    // 4. Find title variations
    console.log('Finding title variations...');
    const titleVariations = findTitleVariations(lessons);
    console.log(`✅ Found ${titleVariations.length} title variation groups\n`);

    // 5. Merge and deduplicate groups
    const allGroups = [...exactDuplicates, ...nearDuplicates, ...titleVariations];
    
    // 6. Calculate canonical scores
    console.log('Calculating canonical scores...');
    const groupsWithScores = calculateCanonicalScores(allGroups);

    // 7. Generate report
    console.log('Generating comprehensive report...');
    const report = generateReport(groupsWithScores, lessons);

    // 8. Save report
    await saveReport(report);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 ANALYSIS COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total Lessons: ${report.totalLessons}`);
    console.log(`Duplicate Groups Found: ${report.duplicateGroups.total}`);
    console.log(`  - Exact matches: ${report.duplicateGroups.exact}`);
    console.log(`  - Near duplicates: ${report.duplicateGroups.nearDuplicate}`);
    console.log(`  - Title variations: ${report.duplicateGroups.titleVariations}`);
    console.log(`\nEstimated unique lessons after deduplication: ${report.uniqueLessons}`);
    
    return report;
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

// Run the analysis
analyzeDuplicates().catch(console.error);