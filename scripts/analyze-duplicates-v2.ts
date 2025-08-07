#!/usr/bin/env npx tsx
/**
 * Improved Duplicate Analysis Script v2
 *
 * This version:
 * 1. Assumes exact duplicates have been resolved
 * 2. Groups all related lessons together (no overlapping groups)
 * 3. Uses transitive closure to merge connected components
 *
 * Usage:
 *   npm run analyze-duplicates-v2
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
// @ts-ignore
import { analyzeContentQuality } from './analyze-content-quality.mjs';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

// Configuration
const CONFIG = {
  thresholds: {
    exactMatch: 1.0,
    nearDuplicate: 0.85, // Cosine similarity threshold for embeddings
    titleMatch: 0.8, // Title similarity threshold
  },
  weights: {
    recency: 0.15,
    completeness: 0.2,
    quality: 0.35,
    notes: 0.1,
    naming: 0.05,
    aiQuality: 0.15,
  },
};

interface Lesson {
  lesson_id: string;
  title: string;
  content_hash?: string;
  content_embedding?: number[];
  last_modified?: string;
  created_at: string;
  metadata?: any;
  confidence?: any;
  processing_notes?: string;
  summary?: string;
  objectives?: string;
  content_text?: string;
  raw_text?: string;
  grade_levels?: string[];
  thematic_categories?: string[];
  main_ingredients?: string[];
  // Scoring fields (added during analysis)
  canonicalScore?: number;
  metadataCompleteness?: number;
  scoreBreakdown?: any;
  [key: string]: any;
}

interface DuplicateGroup {
  groupId: string;
  type: 'exact' | 'near' | 'title' | 'mixed';
  lessons: Lesson[];
  similarityScores: Map<string, Map<string, number>>; // lesson1 -> lesson2 -> score
  recommendedCanonical?: string;
  mergedFromGroups?: string[]; // Track which groups were merged
}

// Calculate text similarity using Levenshtein distance
function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;

  const s1 = text1.toLowerCase().trim();
  const s2 = text2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1;

  const editDistance = levenshteinDistance(shorter, longer);
  return (longer.length - editDistance) / longer.length;
}

// Levenshtein distance implementation
function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// Calculate cosine similarity between embeddings
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// Find all similar pairs (content, embedding, and title)
async function findAllSimilarPairs(lessons: Lesson[]): Promise<Map<string, Map<string, number>>> {
  const similarities = new Map<string, Map<string, number>>();

  console.log('🔍 Finding similar lesson pairs...');

  // Initialize the map
  for (const lesson of lessons) {
    similarities.set(lesson.lesson_id, new Map());
  }

  let comparisons = 0;
  const totalComparisons = (lessons.length * (lessons.length - 1)) / 2;

  for (let i = 0; i < lessons.length; i++) {
    for (let j = i + 1; j < lessons.length; j++) {
      const lesson1 = lessons[i];
      const lesson2 = lessons[j];

      comparisons++;
      if (comparisons % 1000 === 0) {
        const progress = ((comparisons / totalComparisons) * 100).toFixed(1);
        console.log(`   Progress: ${progress}% (${comparisons}/${totalComparisons} comparisons)`);
      }

      let maxSimilarity = 0;
      let similarityType = '';

      // 1. Check exact content match
      if (
        lesson1.content_hash &&
        lesson2.content_hash &&
        lesson1.content_hash === lesson2.content_hash
      ) {
        maxSimilarity = 1.0;
        similarityType = 'exact';
      }

      // 2. Check embedding similarity
      if (lesson1.content_embedding && lesson2.content_embedding) {
        const embeddingSim = cosineSimilarity(lesson1.content_embedding, lesson2.content_embedding);
        if (embeddingSim > maxSimilarity) {
          maxSimilarity = embeddingSim;
          similarityType = 'embedding';
        }
      }

      // 3. Check title similarity
      const titleSim = calculateTextSimilarity(lesson1.title, lesson2.title);
      if (titleSim >= CONFIG.thresholds.titleMatch && titleSim > maxSimilarity) {
        maxSimilarity = titleSim;
        similarityType = 'title';
      }

      // Store similarity if above threshold
      if (maxSimilarity >= CONFIG.thresholds.titleMatch) {
        similarities.get(lesson1.lesson_id)!.set(lesson2.lesson_id, maxSimilarity);
        similarities.get(lesson2.lesson_id)!.set(lesson1.lesson_id, maxSimilarity);
      }
    }
  }

  console.log(`   ✅ Completed ${comparisons} comparisons`);
  return similarities;
}

// Use Union-Find to group connected components
class UnionFind {
  private parent: Map<string, string>;
  private rank: Map<string, number>;

  constructor() {
    this.parent = new Map();
    this.rank = new Map();
  }

  makeSet(x: string) {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
  }

  find(x: string): string {
    this.makeSet(x);
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }

  union(x: string, y: string) {
    this.makeSet(x);
    this.makeSet(y);

    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) return;

    const rankX = this.rank.get(rootX)!;
    const rankY = this.rank.get(rootY)!;

    if (rankX < rankY) {
      this.parent.set(rootX, rootY);
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX);
    } else {
      this.parent.set(rootY, rootX);
      this.rank.set(rootX, rankX + 1);
    }
  }

  getGroups(): Map<string, string[]> {
    const groups = new Map<string, string[]>();

    for (const [node] of this.parent) {
      const root = this.find(node);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root)!.push(node);
    }

    return groups;
  }
}

// Create groups using transitive closure
function createGroups(
  lessons: Lesson[],
  similarities: Map<string, Map<string, number>>
): DuplicateGroup[] {
  console.log('🔗 Creating connected component groups...');

  const uf = new UnionFind();

  // Add all lessons to union-find
  for (const lesson of lessons) {
    uf.makeSet(lesson.lesson_id);
  }

  // Union similar lessons
  for (const [lesson1, similarLessons] of similarities) {
    for (const [lesson2, similarity] of similarLessons) {
      if (similarity >= CONFIG.thresholds.titleMatch) {
        uf.union(lesson1, lesson2);
      }
    }
  }

  // Get groups
  const componentGroups = uf.getGroups();
  const groups: DuplicateGroup[] = [];

  // Create duplicate groups (only for groups with more than 1 lesson)
  let groupIndex = 0;
  for (const [, lessonIds] of componentGroups) {
    if (lessonIds.length > 1) {
      groupIndex++;

      // Determine group type based on similarities
      let hasExact = false;
      let hasNear = false;
      let hasTitle = false;

      for (let i = 0; i < lessonIds.length; i++) {
        for (let j = i + 1; j < lessonIds.length; j++) {
          const sim = similarities.get(lessonIds[i])?.get(lessonIds[j]) || 0;
          if (sim === 1.0) hasExact = true;
          else if (sim >= CONFIG.thresholds.nearDuplicate) hasNear = true;
          else if (sim >= CONFIG.thresholds.titleMatch) hasTitle = true;
        }
      }

      let groupType: DuplicateGroup['type'];
      if (hasExact && !hasNear && !hasTitle) groupType = 'exact';
      else if (hasNear && !hasExact && !hasTitle) groupType = 'near';
      else if (hasTitle && !hasExact && !hasNear) groupType = 'title';
      else groupType = 'mixed';

      const group: DuplicateGroup = {
        groupId: `${groupType}_${groupIndex}`,
        type: groupType,
        lessons: lessonIds.map((id) => lessons.find((l) => l.lesson_id === id)!),
        similarityScores: new Map(),
      };

      // Copy similarity scores for this group
      for (const id1 of lessonIds) {
        group.similarityScores.set(id1, new Map());
        for (const id2 of lessonIds) {
          if (id1 !== id2) {
            const score = similarities.get(id1)?.get(id2) || 0;
            group.similarityScores.get(id1)!.set(id2, score);
          }
        }
      }

      groups.push(group);
    }
  }

  console.log(`   ✅ Created ${groups.length} duplicate groups from ${lessons.length} lessons`);
  return groups;
}

// Calculate metadata completeness percentage
function calculateMetadataCompleteness(lesson: Lesson): number {
  const fields = [
    'title',
    'summary',
    'objectives',
    'thematicCategories',
    'seasonTiming',
    'coreCompetencies',
    'culturalHeritage',
    'locationRequirements',
    'activityType',
    'lessonFormat',
    'mainIngredients',
    'skills',
    'academicIntegration',
    'socialEmotionalLearning',
    'cookingMethods',
  ];

  const filledFields = fields.filter((field) => {
    const value =
      field === 'title' || field === 'summary' || field === 'objectives'
        ? lesson[field]
        : lesson.metadata?.[field];
    return value && (Array.isArray(value) ? value.length > 0 : value);
  }).length;

  return filledFields / fields.length;
}

// Calculate canonical score for a single lesson
function calculateCanonicalScore(lesson: Lesson): number {
  let score = 0;
  const scoreBreakdown: any = {};

  // Recency score (15%)
  const dateField = lesson.last_modified || lesson.created_at;
  let recencyScore = 0;
  if (dateField) {
    const date = new Date(dateField);
    const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);
    recencyScore = 1 - Math.min(age / 10, 1);
    score += CONFIG.weights.recency * recencyScore;
  }
  scoreBreakdown.recency = recencyScore;

  // Completeness score (20%)
  const metadataFields = [
    'thematicCategories',
    'seasonTiming',
    'coreCompetencies',
    'culturalHeritage',
    'locationRequirements',
    'activityType',
    'lessonFormat',
    'mainIngredients',
    'skills',
  ];

  const completeness =
    metadataFields.reduce((acc, field) => {
      const value = lesson.metadata?.[field];
      return acc + (value && (Array.isArray(value) ? value.length > 0 : value) ? 1 : 0);
    }, 0) / metadataFields.length;

  score += CONFIG.weights.completeness * completeness;
  scoreBreakdown.completeness = completeness;

  // Quality score (35%)
  const qualityScore = lesson.confidence?.overall || 0;
  score += CONFIG.weights.quality * qualityScore;
  scoreBreakdown.quality = qualityScore;

  // File naming score (5%)
  const hasCleanName =
    /^[A-Z]/.test(lesson.title) &&
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

  // AI quality score (15%)
  if (lesson.confidence?.lesson_plan_confidence) {
    const aiScore = lesson.confidence.lesson_plan_confidence / 100;
    score += CONFIG.weights.aiQuality * aiScore;
    scoreBreakdown.aiQuality = aiScore;
  }

  // Content quality score (if raw_text available)
  if (lesson.raw_text) {
    try {
      const contentAnalysis = analyzeContentQuality(lesson.raw_text);
      // Note: content weight was 35% in original, but we're using that for quality already
      // So we'll add this as a bonus
      scoreBreakdown.contentAnalysis = contentAnalysis;
    } catch (e) {
      // If content analysis fails, continue without it
    }
  }

  // Store breakdown on the lesson object
  lesson.scoreBreakdown = scoreBreakdown;
  lesson.canonicalScore = score;
  lesson.metadataCompleteness = calculateMetadataCompleteness(lesson);

  return score;
}

// Calculate canonical scores for all groups
function calculateCanonicalScores(groups: DuplicateGroup[]): DuplicateGroup[] {
  console.log('📊 Calculating canonical scores...');

  for (const group of groups) {
    // Calculate scores for all lessons in the group
    for (const lesson of group.lessons) {
      calculateCanonicalScore(lesson);
    }

    // Sort by canonical score descending
    group.lessons.sort((a, b) => {
      const scoreA = a.canonicalScore || 0;
      const scoreB = b.canonicalScore || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;

      // Tiebreaker: metadata completeness
      const compA = a.metadataCompleteness || 0;
      const compB = b.metadataCompleteness || 0;
      if (compA !== compB) return compB - compA;

      // Final tiebreaker: most recent
      const dateA = new Date(a.last_modified || a.created_at).getTime();
      const dateB = new Date(b.last_modified || b.created_at).getTime();
      return dateB - dateA;
    });

    // The first lesson after sorting is the recommended canonical
    if (group.lessons.length > 0) {
      group.recommendedCanonical = group.lessons[0].lesson_id;
    }
  }

  return groups;
}

// Generate report
function generateReport(groups: DuplicateGroup[], allLessons: Lesson[]) {
  const totalDuplicateLessons = groups.reduce((sum, g) => sum + g.lessons.length, 0);

  // Sort groups for consistent output
  const exactGroups = groups.filter((g) => g.type === 'exact');
  const nearGroups = groups.filter((g) => g.type === 'near');
  const titleGroups = groups.filter((g) => g.type === 'title');
  const mixedGroups = groups.filter((g) => g.type === 'mixed');

  return {
    analysisDate: new Date().toISOString(),
    totalLessons: allLessons.length,
    uniqueLessons: allLessons.length - totalDuplicateLessons + groups.length,
    duplicateGroups: {
      exact: exactGroups.length,
      near: nearGroups.length,
      title: titleGroups.length,
      mixed: mixedGroups.length,
      total: groups.length,
    },
    duplicateLessons: totalDuplicateLessons,
    groups: [...exactGroups, ...nearGroups, ...titleGroups, ...mixedGroups].map((group) => {
      // Calculate average similarity within group
      let totalSim = 0;
      let simCount = 0;
      for (const [, similarities] of group.similarityScores) {
        for (const [, score] of similarities) {
          totalSim += score;
          simCount++;
        }
      }
      const avgSimilarity = simCount > 0 ? totalSim / simCount : 0;

      return {
        groupId: group.groupId,
        type: group.type,
        averageSimilarity: avgSimilarity,
        lessonCount: group.lessons.length,
        recommendedCanonical: group.recommendedCanonical,
        lessons: group.lessons.map((lesson) => ({
          lessonId: lesson.lesson_id,
          title: lesson.title,
          lastModified: lesson.last_modified,
          createdAt: lesson.created_at,
          metadataCompleteness: lesson.metadataCompleteness,
          canonicalScore: lesson.canonicalScore,
          isRecommendedCanonical: lesson.lesson_id === group.recommendedCanonical,
          confidence: lesson.confidence,
          processingNotes: lesson.processing_notes,
          scoreBreakdown: lesson.scoreBreakdown,
        })),
        similarityMatrix: Object.fromEntries(
          Array.from(group.similarityScores.entries()).map(([id1, sims]) => [
            id1,
            Object.fromEntries(sims),
          ])
        ),
      };
    }),
  };
}

// Save report
async function saveReport(report: any) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `duplicate-analysis-v2-${timestamp}.json`;
  const filepath = path.join(__dirname, '..', 'public', 'reports', filename);

  // Ensure directory exists
  await fs.mkdir(path.dirname(filepath), { recursive: true });

  // Save JSON report
  await fs.writeFile(filepath, JSON.stringify(report, null, 2));

  console.log(`\n📄 Report saved: ${filename}`);

  // Also save a summary
  const summary = `
DUPLICATE ANALYSIS REPORT V2
Generated: ${new Date(report.analysisDate).toLocaleString()}
${'='.repeat(60)}

SUMMARY
-------
Total Lessons: ${report.totalLessons}
Unique Lessons: ${report.uniqueLessons}
Duplicate Lessons: ${report.duplicateLessons}

DUPLICATE GROUPS
----------------
Exact Matches: ${report.duplicateGroups.exact}
Near Duplicates: ${report.duplicateGroups.near}
Title Variations: ${report.duplicateGroups.title}
Mixed Groups: ${report.duplicateGroups.mixed}
TOTAL: ${report.duplicateGroups.total}

TOP GROUPS BY SIZE
------------------
${report.groups
  .sort((a: any, b: any) => b.lessonCount - a.lessonCount)
  .slice(0, 10)
  .map(
    (g: any, i: number) =>
      `${i + 1}. ${g.lessons[0].title} (${g.type}, ${g.lessonCount} lessons, ${(g.averageSimilarity * 100).toFixed(0)}% similar)`
  )
  .join('\n')}
`;

  const summaryPath = path.join(
    __dirname,
    '..',
    'public',
    'reports',
    `duplicate-summary-v2-${timestamp}.txt`
  );
  await fs.writeFile(summaryPath, summary);

  console.log(`📄 Summary saved: duplicate-summary-v2-${timestamp}.txt`);
}

// Main function
async function main() {
  console.log('🚀 Starting Improved Duplicate Analysis v2');
  console.log('=========================================\n');

  try {
    // 1. Fetch all lessons (exact duplicates should already be resolved)
    console.log('📚 Fetching lessons from database...');
    const { data: lessons, error } = await supabase.from('lessons').select('*').order('created_at');

    if (error) throw error;

    console.log(`   ✅ Fetched ${lessons.length} lessons\n`);

    // 2. Find all similar pairs
    const similarities = await findAllSimilarPairs(lessons);

    // 3. Create groups using transitive closure
    const groups = createGroups(lessons, similarities);

    // 4. Calculate canonical scores
    const groupsWithScores = calculateCanonicalScores(groups);

    // 5. Generate report
    console.log('\n📝 Generating report...');
    const report = generateReport(groupsWithScores, lessons);

    // 6. Save report
    await saveReport(report);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ ANALYSIS COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total Lessons: ${report.totalLessons}`);
    console.log(`Duplicate Groups: ${report.duplicateGroups.total}`);
    console.log(`  - Exact: ${report.duplicateGroups.exact}`);
    console.log(`  - Near: ${report.duplicateGroups.near}`);
    console.log(`  - Title: ${report.duplicateGroups.title}`);
    console.log(`  - Mixed: ${report.duplicateGroups.mixed}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
