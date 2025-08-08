#!/usr/bin/env npx tsx
/**
 * Duplicate Analysis Script v3 - Human-Centric Approach
 *
 * Major changes from v2:
 * - Adjusted similarity thresholds based on pedagogical analysis
 * - Removed AI confidence scoring (was 50% of weight)
 * - Added content-aware categorization (A-E categories)
 * - Focus on human judgment with better information
 * - Support for splitting groups into multiple canonical lessons
 *
 * Usage:
 *   npm run analyze-duplicates-v3
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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

// Updated configuration based on analysis findings
const CONFIG = {
  thresholds: {
    exactMatch: 1.0, // Exact match - auto-consolidate ONLY at 1.0
    autoConsolidate: 1.0, // Only auto-consolidate perfect matches (1.0)
    manualReview: 0.995, // Requires manual review
    carefulComparison: 0.99, // Needs careful comparison
    significantVariation: 0.9, // Significant variations - likely preserve both
    relatedButDistinct: 0.85, // Related but distinct lessons
  },
  // Simplified scoring - only objective metrics, leaving room for human judgment
  weights: {
    recency: 0.1, // Recent is slightly better
    completeness: 0.15, // More complete metadata is better
    gradesCovered: 0.05, // More grade coverage is better
    // Total: 30% - leaving 70% for human judgment
  },
  // Categories for duplicate types
  categories: {
    A: 'FORMATTING_ONLY', // Only auto-consolidate at 1.0 similarity
    B: 'EXACT_CONTENT', // Identical content - auto-consolidate
    C: 'GRADE_ADAPTATIONS', // Keep all
    D: 'TITLE_INCONSISTENCIES', // Standardize & consolidate
    E: 'CULTURAL_VARIATIONS', // Review individually
    F: 'SEASONAL_VARIATIONS', // Review for consolidation
    G: 'PEDAGOGICAL_VARIATIONS', // Keep both approaches
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
  processing_notes?: string;
  summary?: string;
  content_text?: string;
  grade_levels?: string[];
  thematic_categories?: string[];
  cultural_heritage?: string[];
  season_timing?: string[];
  main_ingredients?: string[];
  activity_type?: string[];
  canonicalScore?: number;
  metadataCompleteness?: number;
  scoreBreakdown?: any;
  [key: string]: any;
}

interface DuplicateGroup {
  groupId: string;
  category: string; // New: A-G categorization
  confidence: 'high' | 'medium' | 'low'; // How confident we are in the categorization
  lessons: Lesson[];
  similarityScores: Map<string, Map<string, number>>;

  // Recommendations
  recommendedAction: 'auto_merge' | 'manual_review' | 'keep_all' | 'split_group';
  recommendedCanonical?: string | string[]; // Can now be multiple

  // Analysis insights
  insights: {
    keyDifferences: string[];
    commonElements: string[];
    qualityIssues: string[];
    pedagogicalNotes: string[];
  };

  // For split groups
  subGroups?: {
    groupName: string;
    lessonIds: string[];
    rationale: string;
  }[];
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

// Analyze group to determine category and recommendations
function categorizeGroup(group: DuplicateGroup): void {
  const lessons = group.lessons;
  const similarities = group.similarityScores;

  // Calculate average and min similarity
  let totalSim = 0;
  let minSim = 1.0;
  let maxSim = 0;
  let count = 0;

  for (const [id1, sims] of similarities) {
    for (const [id2, score] of sims) {
      totalSim += score;
      minSim = Math.min(minSim, score);
      maxSim = Math.max(maxSim, score);
      count++;
    }
  }

  const avgSim = count > 0 ? totalSim / count : 0;

  // Initialize insights
  group.insights = {
    keyDifferences: [],
    commonElements: [],
    qualityIssues: [],
    pedagogicalNotes: [],
  };

  // Check for exact content matches
  const contentHashes = new Set(lessons.map((l) => l.content_hash).filter((h) => h));
  const hasExactMatches = contentHashes.size < lessons.length && contentHashes.size > 0;

  // Check for grade variations
  const gradeGroups = new Map<string, Lesson[]>();
  lessons.forEach((lesson) => {
    const gradeKey = (lesson.grade_levels || []).sort().join(',');
    if (!gradeGroups.has(gradeKey)) {
      gradeGroups.set(gradeKey, []);
    }
    gradeGroups.get(gradeKey)!.push(lesson);
  });

  const hasGradeVariations = gradeGroups.size > 1;

  // Check for cultural variations
  const culturalGroups = new Map<string, Lesson[]>();
  lessons.forEach((lesson) => {
    const culturalKey = (lesson.cultural_heritage || []).sort().join(',');
    if (!culturalGroups.has(culturalKey)) {
      culturalGroups.set(culturalKey, []);
    }
    culturalGroups.get(culturalKey)!.push(lesson);
  });

  const hasCulturalVariations =
    culturalGroups.size > 1 && Array.from(culturalGroups.keys()).some((k) => k.length > 0);

  // Check for seasonal variations
  const seasonalGroups = new Map<string, Lesson[]>();
  lessons.forEach((lesson) => {
    const seasonKey = (lesson.season_timing || []).sort().join(',');
    if (!seasonalGroups.has(seasonKey)) {
      seasonalGroups.set(seasonKey, []);
    }
    seasonalGroups.get(seasonKey)!.push(lesson);
  });

  const hasSeasonalVariations =
    seasonalGroups.size > 1 && Array.from(seasonalGroups.keys()).some((k) => k.length > 0);

  // Check for title inconsistencies
  const titleWords = lessons.map((l) =>
    l.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .sort()
      .join(' ')
  );
  const uniqueTitlePatterns = new Set(titleWords);
  const hasTitleInconsistencies = uniqueTitlePatterns.size > 1 && avgSim > 0.99;

  // Categorize based on analysis
  if (hasExactMatches && avgSim === 1.0) {
    group.category = CONFIG.categories.B; // EXACT_CONTENT
    group.recommendedAction = 'auto_merge';
    group.confidence = 'high';
    group.insights.keyDifferences.push('Exact content with different IDs');
  } else if (avgSim === 1.0) {
    group.category = CONFIG.categories.A; // FORMATTING_ONLY
    group.recommendedAction = 'auto_merge';
    group.confidence = 'high';
    group.insights.keyDifferences.push('Identical content - safe to consolidate');
  } else if (avgSim > 0.999) {
    // Near-perfect match but not quite 1.0 - needs human review
    group.category = CONFIG.categories.A; // FORMATTING_ONLY
    group.recommendedAction = 'manual_review';
    group.confidence = 'medium';
    group.insights.keyDifferences.push('Very minor differences - likely formatting or typos');
  } else if (hasGradeVariations && avgSim > 0.95) {
    group.category = CONFIG.categories.C; // GRADE_ADAPTATIONS
    group.recommendedAction = 'keep_all';
    group.confidence = 'high';
    group.insights.pedagogicalNotes.push('Grade-specific adaptations detected');

    // Document grade variations
    gradeGroups.forEach((lessons, grades) => {
      group.insights.keyDifferences.push(
        `Grade ${grades || 'unspecified'}: ${lessons.length} lesson(s)`
      );
    });
  } else if (hasCulturalVariations && avgSim > 0.9) {
    group.category = CONFIG.categories.E; // CULTURAL_VARIATIONS
    group.recommendedAction = 'manual_review';
    group.confidence = 'medium';
    group.insights.pedagogicalNotes.push('Cultural variations detected - preserve diversity');

    // Document cultural variations
    culturalGroups.forEach((lessons, culture) => {
      if (culture) {
        group.insights.keyDifferences.push(`Cultural focus: ${culture}`);
      }
    });
  } else if (hasSeasonalVariations && avgSim > 0.9) {
    group.category = CONFIG.categories.F; // SEASONAL_VARIATIONS
    group.recommendedAction = 'manual_review';
    group.confidence = 'medium';
    group.insights.keyDifferences.push('Seasonal adaptations present');
  } else if (hasTitleInconsistencies) {
    group.category = CONFIG.categories.D; // TITLE_INCONSISTENCIES
    group.recommendedAction = 'manual_review';
    group.confidence = 'medium';
    group.insights.qualityIssues.push('Title variations for similar content');
  } else if (avgSim < 0.95 && avgSim >= 0.9) {
    group.category = CONFIG.categories.G; // PEDAGOGICAL_VARIATIONS
    group.recommendedAction = 'split_group';
    group.confidence = 'low';
    group.insights.pedagogicalNotes.push(
      'Significant pedagogical differences - may be distinct approaches'
    );

    // Attempt to identify sub-groups
    identifySubGroups(group);
  } else {
    // Default to manual review
    group.category = CONFIG.categories.G;
    group.recommendedAction = 'manual_review';
    group.confidence = 'low';
  }

  // Add common elements
  if (lessons.length > 0) {
    const firstLesson = lessons[0];
    const commonThemes = firstLesson.thematic_categories?.filter((theme) =>
      lessons.every((l) => l.thematic_categories?.includes(theme))
    );
    if (commonThemes?.length) {
      group.insights.commonElements.push(`Themes: ${commonThemes.join(', ')}`);
    }
  }

  // Check for quality issues
  lessons.forEach((lesson) => {
    if (lesson.processing_notes?.toLowerCase().includes('duplicate')) {
      group.insights.qualityIssues.push(`${lesson.lesson_id}: Already flagged as duplicate`);
    }
    if (lesson.title.includes('Copy') || lesson.title.includes('_v2')) {
      group.insights.qualityIssues.push(`${lesson.lesson_id}: Title suggests it's a copy`);
    }
  });
}

// Identify sub-groups within a larger group
function identifySubGroups(group: DuplicateGroup): void {
  const lessons = group.lessons;
  const similarities = group.similarityScores;

  // Use higher threshold for sub-grouping
  const subGroupThreshold = 0.96;

  // Create sub-groups using Union-Find
  const parent = new Map<string, string>();
  const rank = new Map<string, number>();

  function find(x: string): string {
    if (!parent.has(x)) {
      parent.set(x, x);
      rank.set(x, 0);
    }
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)!));
    }
    return parent.get(x)!;
  }

  function union(x: string, y: string) {
    const rootX = find(x);
    const rootY = find(y);

    if (rootX === rootY) return;

    const rankX = rank.get(rootX)!;
    const rankY = rank.get(rootY)!;

    if (rankX < rankY) {
      parent.set(rootX, rootY);
    } else if (rankX > rankY) {
      parent.set(rootY, rootX);
    } else {
      parent.set(rootY, rootX);
      rank.set(rootX, rankX + 1);
    }
  }

  // Group highly similar lessons
  for (const [id1, sims] of similarities) {
    for (const [id2, score] of sims) {
      if (score >= subGroupThreshold) {
        union(id1, id2);
      }
    }
  }

  // Collect sub-groups
  const subGroupMap = new Map<string, string[]>();
  lessons.forEach((lesson) => {
    const root = find(lesson.lesson_id);
    if (!subGroupMap.has(root)) {
      subGroupMap.set(root, []);
    }
    subGroupMap.get(root)!.push(lesson.lesson_id);
  });

  // Create sub-group definitions
  if (subGroupMap.size > 1) {
    group.subGroups = [];
    let subGroupIndex = 1;

    subGroupMap.forEach((lessonIds, root) => {
      const subGroupLessons = lessons.filter((l) => lessonIds.includes(l.lesson_id));
      const commonTitle = findCommonTitlePattern(subGroupLessons);

      group.subGroups!.push({
        groupName: `Approach ${String.fromCharCode(64 + subGroupIndex)}: ${commonTitle}`,
        lessonIds: lessonIds,
        rationale: `${lessonIds.length} lessons with high similarity (>=${subGroupThreshold})`,
      });
      subGroupIndex++;
    });

    group.insights.pedagogicalNotes.push(
      `Group can be split into ${group.subGroups.length} distinct approaches`
    );
  }
}

// Find common pattern in titles
function findCommonTitlePattern(lessons: Lesson[]): string {
  if (lessons.length === 0) return 'Unknown';
  if (lessons.length === 1) return lessons[0].title;

  // Find common words in all titles
  const titleWords = lessons.map((l) => l.title.toLowerCase().split(/\s+/));

  const commonWords = titleWords[0].filter((word) =>
    titleWords.every((words) => words.includes(word))
  );

  return commonWords.length > 0 ? commonWords.join(' ') : lessons[0].title.substring(0, 20) + '...';
}

// Calculate simplified canonical score
function calculateCanonicalScore(lesson: Lesson): number {
  let score = 0;
  const scoreBreakdown: any = {};

  // Recency score (10%)
  const dateField = lesson.last_modified || lesson.created_at;
  let recencyScore = 0;
  if (dateField) {
    const date = new Date(dateField);
    const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);
    recencyScore = Math.max(0, 1 - age / 10); // Linear decay over 10 years
  }
  score += CONFIG.weights.recency * recencyScore;
  scoreBreakdown.recency = recencyScore;

  // Completeness score (15%)
  const metadataFields = [
    'thematic_categories',
    'season_timing',
    'cultural_heritage',
    'activity_type',
    'main_ingredients',
    'grade_levels',
  ];

  let filledCount = 0;
  metadataFields.forEach((field) => {
    const value = lesson[field];
    if (value && Array.isArray(value) && value.length > 0) {
      filledCount++;
    }
  });

  const completeness = filledCount / metadataFields.length;
  score += CONFIG.weights.completeness * completeness;
  scoreBreakdown.completeness = completeness;

  // Grade coverage score (5%)
  const gradeCoverage = (lesson.grade_levels?.length || 0) / 11; // Max 11 grades
  score += CONFIG.weights.gradesCovered * gradeCoverage;
  scoreBreakdown.gradeCoverage = gradeCoverage;

  // Note any quality issues
  const qualityNotes: string[] = [];
  if (lesson.processing_notes?.toLowerCase().includes('duplicate')) {
    qualityNotes.push('Already flagged as duplicate');
  }
  if (
    lesson.title.includes('Copy') ||
    lesson.title.includes('_v2') ||
    lesson.title.includes('(Updated)')
  ) {
    qualityNotes.push("Title suggests it's a copy");
  }

  scoreBreakdown.qualityNotes = qualityNotes;
  scoreBreakdown.totalScore = score;

  // Store on lesson object
  lesson.scoreBreakdown = scoreBreakdown;
  lesson.canonicalScore = score;
  lesson.metadataCompleteness = completeness;

  return score;
}

// Find all similar pairs with nuanced thresholds
async function findAllSimilarPairs(lessons: Lesson[]): Promise<Map<string, Map<string, number>>> {
  const similarities = new Map<string, Map<string, number>>();

  console.log('🔍 Finding similar lesson pairs with nuanced thresholds...');

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

      // 1. Check exact content match
      if (
        lesson1.content_hash &&
        lesson2.content_hash &&
        lesson1.content_hash === lesson2.content_hash
      ) {
        maxSimilarity = 1.0;
      }

      // 2. Check embedding similarity (using Gemini embeddings)
      if (lesson1.content_embedding && lesson2.content_embedding) {
        const embeddingSim = cosineSimilarity(lesson1.content_embedding, lesson2.content_embedding);
        if (embeddingSim > maxSimilarity) {
          maxSimilarity = embeddingSim;
        }
      }

      // 3. Check title similarity (lower threshold for initial grouping)
      const titleSim = calculateTextSimilarity(lesson1.title, lesson2.title);
      if (titleSim >= 0.7 && titleSim > maxSimilarity) {
        maxSimilarity = titleSim * 0.9; // Slightly discount pure title matches
      }

      // Store similarity if above the related threshold
      if (maxSimilarity >= CONFIG.thresholds.relatedButDistinct) {
        similarities.get(lesson1.lesson_id)!.set(lesson2.lesson_id, maxSimilarity);
        similarities.get(lesson2.lesson_id)!.set(lesson1.lesson_id, maxSimilarity);
      }
    }
  }

  console.log(`   ✅ Completed ${comparisons} comparisons`);
  return similarities;
}

// Create groups using Union-Find with nuanced thresholds
function createGroups(
  lessons: Lesson[],
  similarities: Map<string, Map<string, number>>
): DuplicateGroup[] {
  console.log('🔗 Creating groups with pedagogical awareness...');

  // Union-Find implementation
  const parent = new Map<string, string>();
  const rank = new Map<string, number>();

  function makeSet(x: string) {
    if (!parent.has(x)) {
      parent.set(x, x);
      rank.set(x, 0);
    }
  }

  function find(x: string): string {
    makeSet(x);
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)!));
    }
    return parent.get(x)!;
  }

  function union(x: string, y: string) {
    makeSet(x);
    makeSet(y);

    const rootX = find(x);
    const rootY = find(y);

    if (rootX === rootY) return;

    const rankX = rank.get(rootX)!;
    const rankY = rank.get(rootY)!;

    if (rankX < rankY) {
      parent.set(rootX, rootY);
    } else if (rankX > rankY) {
      parent.set(rootY, rootX);
    } else {
      parent.set(rootY, rootX);
      rank.set(rootX, rankX + 1);
    }
  }

  // Add all lessons to union-find
  for (const lesson of lessons) {
    makeSet(lesson.lesson_id);
  }

  // Union similar lessons (using lower threshold for initial grouping)
  for (const [lesson1, similarLessons] of similarities) {
    for (const [lesson2, similarity] of similarLessons) {
      if (similarity >= CONFIG.thresholds.relatedButDistinct) {
        union(lesson1, lesson2);
      }
    }
  }

  // Get groups
  const componentGroups = new Map<string, string[]>();
  for (const lesson of lessons) {
    const root = find(lesson.lesson_id);
    if (!componentGroups.has(root)) {
      componentGroups.set(root, []);
    }
    componentGroups.get(root)!.push(lesson.lesson_id);
  }

  const groups: DuplicateGroup[] = [];

  // Create duplicate groups (only for groups with more than 1 lesson)
  let groupIndex = 0;
  for (const [, lessonIds] of componentGroups) {
    if (lessonIds.length > 1) {
      groupIndex++;

      const group: DuplicateGroup = {
        groupId: `group_${groupIndex}`,
        category: '', // Will be set by categorizeGroup
        confidence: 'low',
        lessons: lessonIds.map((id) => lessons.find((l) => l.lesson_id === id)!),
        similarityScores: new Map(),
        recommendedAction: 'manual_review',
        insights: {
          keyDifferences: [],
          commonElements: [],
          qualityIssues: [],
          pedagogicalNotes: [],
        },
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

      // Categorize and analyze the group
      categorizeGroup(group);

      // Calculate canonical scores for lessons
      for (const lesson of group.lessons) {
        calculateCanonicalScore(lesson);
      }

      // Sort by canonical score
      group.lessons.sort((a, b) => {
        const scoreA = a.canonicalScore || 0;
        const scoreB = b.canonicalScore || 0;
        return scoreB - scoreA;
      });

      // Set recommended canonical based on category
      if (group.recommendedAction === 'keep_all') {
        // For grade adaptations, keep all as canonical
        group.recommendedCanonical = group.lessons.map((l) => l.lesson_id);
      } else if (group.recommendedAction === 'split_group' && group.subGroups) {
        // For split groups, recommend one canonical per sub-group
        group.recommendedCanonical = group.subGroups.map((sg) => {
          const subGroupLessons = group.lessons.filter((l) => sg.lessonIds.includes(l.lesson_id));
          return subGroupLessons.sort(
            (a, b) => (b.canonicalScore || 0) - (a.canonicalScore || 0)
          )[0].lesson_id;
        });
      } else {
        // Single canonical recommendation
        group.recommendedCanonical = group.lessons[0].lesson_id;
      }

      groups.push(group);
    }
  }

  console.log(`   ✅ Created ${groups.length} duplicate groups from ${lessons.length} lessons`);
  return groups;
}

// Generate comprehensive report
function generateReport(groups: DuplicateGroup[], allLessons: Lesson[]) {
  const totalDuplicateLessons = groups.reduce((sum, g) => sum + g.lessons.length, 0);

  // Sort and categorize groups
  const categoryGroups = new Map<string, DuplicateGroup[]>();
  Object.values(CONFIG.categories).forEach((cat) => {
    categoryGroups.set(cat, []);
  });

  groups.forEach((group) => {
    const category = group.category || 'UNCATEGORIZED';
    if (!categoryGroups.has(category)) {
      categoryGroups.set(category, []);
    }
    categoryGroups.get(category)!.push(group);
  });

  // Count recommended actions
  const actionCounts = {
    auto_merge: 0,
    manual_review: 0,
    keep_all: 0,
    split_group: 0,
  };

  groups.forEach((group) => {
    actionCounts[group.recommendedAction]++;
  });

  return {
    analysisDate: new Date().toISOString(),
    version: '3.0',
    approach: 'Human-centric with pedagogical awareness',
    totalLessons: allLessons.length,
    uniqueLessons: allLessons.length - totalDuplicateLessons + groups.length,
    duplicateGroups: {
      total: groups.length,
      byCategory: Object.fromEntries(
        Array.from(categoryGroups.entries()).map(([cat, grps]) => [cat, grps.length])
      ),
      byAction: actionCounts,
    },
    duplicateLessons: totalDuplicateLessons,

    // Categories with their groups
    categorizedGroups: Object.fromEntries(
      Array.from(categoryGroups.entries()).map(([category, grps]) => [
        category,
        grps.map((group) => ({
          groupId: group.groupId,
          confidence: group.confidence,
          lessonCount: group.lessons.length,
          recommendedAction: group.recommendedAction,
          recommendedCanonical: group.recommendedCanonical,
          insights: group.insights,
          subGroups: group.subGroups,
          lessons: group.lessons.map((lesson) => ({
            lessonId: lesson.lesson_id,
            title: lesson.title,
            lastModified: lesson.last_modified,
            createdAt: lesson.created_at,
            gradelevels: lesson.grade_levels,
            culturalHeritage: lesson.cultural_heritage,
            seasonTiming: lesson.season_timing,
            metadataCompleteness: lesson.metadataCompleteness,
            canonicalScore: lesson.canonicalScore,
            scoreBreakdown: lesson.scoreBreakdown,
            contentHash: lesson.content_hash,
          })),
          similarityMatrix: Object.fromEntries(
            Array.from(group.similarityScores.entries()).map(([id1, sims]) => [
              id1,
              Object.fromEntries(sims),
            ])
          ),
        })),
      ])
    ),

    // Summary statistics
    statistics: {
      autoMergeCandidates: groups.filter((g) => g.recommendedAction === 'auto_merge').length,
      manualReviewNeeded: groups.filter((g) => g.recommendedAction === 'manual_review').length,
      gradeAdaptationsFound: categoryGroups.get(CONFIG.categories.C)?.length || 0,
      culturalVariationsFound: categoryGroups.get(CONFIG.categories.E)?.length || 0,
      splitGroupsIdentified: groups.filter((g) => g.recommendedAction === 'split_group').length,

      // Similarity distribution
      similarityRanges: {
        'exact_1.0': groups.filter((g) => {
          const sims = Array.from(g.similarityScores.values()).flatMap((m) =>
            Array.from(m.values())
          );
          return sims.some((s) => s === 1.0);
        }).length,
        'auto_0.999+': groups.filter((g) => {
          const sims = Array.from(g.similarityScores.values()).flatMap((m) =>
            Array.from(m.values())
          );
          return sims.some((s) => s >= 0.999 && s < 1.0);
        }).length,
        'review_0.995-0.999': groups.filter((g) => {
          const sims = Array.from(g.similarityScores.values()).flatMap((m) =>
            Array.from(m.values())
          );
          return sims.some((s) => s >= 0.995 && s < 0.999);
        }).length,
        'careful_0.99-0.995': groups.filter((g) => {
          const sims = Array.from(g.similarityScores.values()).flatMap((m) =>
            Array.from(m.values())
          );
          return sims.some((s) => s >= 0.99 && s < 0.995);
        }).length,
        'variations_0.90-0.99': groups.filter((g) => {
          const sims = Array.from(g.similarityScores.values()).flatMap((m) =>
            Array.from(m.values())
          );
          return sims.some((s) => s >= 0.9 && s < 0.99);
        }).length,
      },
    },
  };
}

// Save report with multiple formats
async function saveReport(report: any) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `duplicate-analysis-v3-${timestamp}.json`;
  const filepath = path.join(__dirname, '..', 'public', 'reports', filename);

  // Ensure directory exists
  await fs.mkdir(path.dirname(filepath), { recursive: true });

  // Save JSON report
  await fs.writeFile(filepath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved: ${filename}`);

  // Generate human-readable summary
  const summary = `
DUPLICATE ANALYSIS REPORT V3 - HUMAN-CENTRIC APPROACH
Generated: ${new Date(report.analysisDate).toLocaleString()}
${'='.repeat(60)}

OVERVIEW
--------
Total Lessons: ${report.totalLessons}
Unique Lessons: ${report.uniqueLessons}
Duplicate Groups: ${report.duplicateGroups.total}
Lessons in Groups: ${report.duplicateLessons}

CATEGORIZATION BREAKDOWN
------------------------
${Object.entries(report.duplicateGroups.byCategory)
  .filter(([, count]) => count > 0)
  .map(([cat, count]) => `${cat}: ${count} groups`)
  .join('\n')}

RECOMMENDED ACTIONS
-------------------
Auto-merge Safe: ${report.duplicateGroups.byAction.auto_merge} groups
Manual Review Needed: ${report.duplicateGroups.byAction.manual_review} groups
Keep All (Grade/Cultural): ${report.duplicateGroups.byAction.keep_all} groups
Split into Sub-groups: ${report.duplicateGroups.byAction.split_group} groups

KEY FINDINGS
------------
• Grade Adaptations Found: ${report.statistics.gradeAdaptationsFound} groups
• Cultural Variations Found: ${report.statistics.culturalVariationsFound} groups
• Groups Needing Split: ${report.statistics.splitGroupsIdentified}

SIMILARITY DISTRIBUTION
-----------------------
Exact Matches (1.0): ${report.statistics.similarityRanges['exact_1.0']} groups
Auto-consolidate (0.999+): ${report.statistics.similarityRanges['auto_0.999+']} groups
Manual Review (0.995-0.999): ${report.statistics.similarityRanges['review_0.995-0.999']} groups
Careful Review (0.99-0.995): ${report.statistics.similarityRanges['careful_0.99-0.995']} groups
Significant Variations (0.90-0.99): ${report.statistics.similarityRanges['variations_0.90-0.99']} groups

ACTION ITEMS
------------
1. Review and auto-merge ${report.statistics.autoMergeCandidates} formatting-only groups
2. Manually review ${report.statistics.manualReviewNeeded} groups for consolidation
3. Preserve ${report.statistics.gradeAdaptationsFound} grade adaptation groups
4. Carefully review ${report.statistics.culturalVariationsFound} cultural variation groups
5. Consider splitting ${report.statistics.splitGroupsIdentified} mixed groups

Note: This analysis prioritizes pedagogical value over pure similarity scores.
Groups marked "keep_all" contain valuable variations that should be preserved.
`;

  const summaryPath = path.join(
    __dirname,
    '..',
    'public',
    'reports',
    `duplicate-summary-v3-${timestamp}.txt`
  );
  await fs.writeFile(summaryPath, summary);
  console.log(`📄 Summary saved: duplicate-summary-v3-${timestamp}.txt`);

  // Generate actionable CSV for easy review
  const csvLines = ['GroupID,Category,Action,LessonCount,Confidence,KeyInsight'];

  Object.entries(report.categorizedGroups).forEach(([category, groups]: [string, any]) => {
    groups.forEach((group: any) => {
      const keyInsight =
        group.insights.pedagogicalNotes[0] ||
        group.insights.keyDifferences[0] ||
        group.insights.qualityIssues[0] ||
        'Review needed';
      csvLines.push(
        `${group.groupId},"${category}","${group.recommendedAction}",${group.lessonCount},"${group.confidence}","${keyInsight}"`
      );
    });
  });

  const csvPath = path.join(
    __dirname,
    '..',
    'public',
    'reports',
    `duplicate-actions-v3-${timestamp}.csv`
  );
  await fs.writeFile(csvPath, csvLines.join('\n'));
  console.log(`📄 Actions CSV saved: duplicate-actions-v3-${timestamp}.csv`);
}

// Main function
async function main() {
  console.log('🚀 Starting Duplicate Analysis v3 - Human-Centric Approach');
  console.log('=========================================\n');

  try {
    // 1. Fetch all lessons
    console.log('📚 Fetching lessons from database...');
    const { data: lessons, error } = await supabase.from('lessons').select('*').order('lesson_id');

    if (error) throw error;
    if (!lessons || lessons.length === 0) {
      throw new Error('No lessons found in database');
    }

    console.log(`   ✅ Loaded ${lessons.length} lessons\n`);

    // 2. Find similar pairs with nuanced thresholds
    const similarities = await findAllSimilarPairs(lessons);

    // 3. Create groups with pedagogical awareness
    const groups = createGroups(lessons, similarities);

    // 4. Generate comprehensive report
    console.log('\n📊 Generating report...');
    const report = generateReport(groups, lessons);

    // 5. Save report in multiple formats
    await saveReport(report);

    console.log('\n✅ Analysis complete!');
    console.log(`Found ${groups.length} duplicate groups requiring attention`);
    console.log(`${report.statistics.autoMergeCandidates} groups can be safely auto-merged`);
    console.log(`${report.statistics.manualReviewNeeded} groups need manual review`);
    console.log(
      `${report.statistics.gradeAdaptationsFound + report.statistics.culturalVariationsFound} groups contain valuable variations to preserve`
    );
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run the analysis
main();
