/**
 * Duplicate Detection Utility Functions
 *
 * Core algorithms for detecting and categorizing duplicate lessons.
 * Extracted from analyze-duplicates-v3.ts for testability.
 */

// Configuration for duplicate detection thresholds and weights
export const DUPLICATE_CONFIG = {
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
} as const;

export type DuplicateCategory =
  (typeof DUPLICATE_CONFIG.categories)[keyof typeof DUPLICATE_CONFIG.categories];

export interface LessonForDuplicateCheck {
  lesson_id: string;
  title: string;
  content_hash?: string;
  content_embedding?: number[];
  last_modified?: string;
  created_at: string;
  processing_notes?: string;
  summary?: string;
  grade_levels?: string[];
  thematic_categories?: string[];
  cultural_heritage?: string[];
  season_timing?: string[];
  main_ingredients?: string[];
  activity_type?: string[];
  canonicalScore?: number;
  metadataCompleteness?: number;
  scoreBreakdown?: ScoreBreakdown;
}

export interface ScoreBreakdown {
  recency: number;
  completeness: number;
  gradeCoverage: number;
  totalScore: number;
  qualityNotes: string[];
}

export interface GroupInsights {
  keyDifferences: string[];
  commonElements: string[];
  qualityIssues: string[];
  pedagogicalNotes: string[];
}

export interface SubGroup {
  groupName: string;
  lessonIds: string[];
  rationale: string;
}

export interface DuplicateGroup {
  groupId: string;
  category: DuplicateCategory | '';
  confidence: 'high' | 'medium' | 'low';
  lessons: LessonForDuplicateCheck[];
  similarityScores: Map<string, Map<string, number>>;
  recommendedAction: 'auto_merge' | 'manual_review' | 'keep_all' | 'split_group';
  recommendedCanonical?: string | string[];
  insights: GroupInsights;
  subGroups?: SubGroup[];
}

/**
 * Serialized format for duplicate group reports (used in UI/JSON files).
 * This is distinct from DuplicateGroup which uses Map for similarity scores
 * and full LessonForDuplicateCheck objects.
 */
export interface DuplicateGroupReport {
  groupId: string;
  type: 'exact' | 'near' | 'title';
  category?: string;
  recommendedAction?: 'auto_merge' | 'manual_review' | 'keep_all' | 'split_group';
  confidence?: 'high' | 'medium' | 'low';
  similarityScore: number;
  lessonCount: number;
  status?: 'pending' | 'resolved';
  recommendedCanonical?: string | string[];
  lessons: Array<{
    lessonId: string;
    title: string;
    isRecommendedCanonical?: boolean;
  }>;
}

/**
 * Calculate Levenshtein distance between two strings.
 * Returns the minimum number of single-character edits (insertions, deletions, or substitutions)
 * required to change one string into the other.
 */
export function levenshteinDistance(s1: string, s2: string): number {
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

/**
 * Calculate text similarity using Levenshtein distance.
 * Returns a value between 0 and 1, where 1 means identical strings.
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
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

/**
 * Calculate cosine similarity between two vectors.
 * Returns a value between -1 and 1, where 1 means identical vectors.
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
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

/**
 * Calculate canonical score for a lesson.
 * Higher scores indicate better candidates for the "canonical" version.
 * Score is based on recency, metadata completeness, and grade coverage.
 */
export function calculateCanonicalScore(
  lesson: LessonForDuplicateCheck,
  config = DUPLICATE_CONFIG
): number {
  let score = 0;
  const scoreBreakdown: ScoreBreakdown = {
    recency: 0,
    completeness: 0,
    gradeCoverage: 0,
    totalScore: 0,
    qualityNotes: [],
  };

  // Recency score (10%)
  const dateField = lesson.last_modified || lesson.created_at;
  let recencyScore = 0;
  if (dateField) {
    const date = new Date(dateField);
    const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);
    recencyScore = Math.max(0, 1 - age / 10); // Linear decay over 10 years
  }
  score += config.weights.recency * recencyScore;
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
    const value = lesson[field as keyof LessonForDuplicateCheck];
    if (value && Array.isArray(value) && value.length > 0) {
      filledCount++;
    }
  });

  const completeness = filledCount / metadataFields.length;
  score += config.weights.completeness * completeness;
  scoreBreakdown.completeness = completeness;

  // Grade coverage score (5%)
  const gradeCoverage = (lesson.grade_levels?.length || 0) / 11; // Max 11 grades
  score += config.weights.gradesCovered * gradeCoverage;
  scoreBreakdown.gradeCoverage = gradeCoverage;

  // Note any quality issues
  if (lesson.processing_notes?.toLowerCase().includes('duplicate')) {
    scoreBreakdown.qualityNotes.push('Already flagged as duplicate');
  }
  if (
    lesson.title.includes('Copy') ||
    lesson.title.includes('_v2') ||
    lesson.title.includes('(Updated)')
  ) {
    scoreBreakdown.qualityNotes.push("Title suggests it's a copy");
  }

  scoreBreakdown.totalScore = score;

  // Store on lesson object
  lesson.scoreBreakdown = scoreBreakdown;
  lesson.canonicalScore = score;
  lesson.metadataCompleteness = completeness;

  return score;
}

/**
 * Find common pattern in a list of lesson titles.
 * Used to generate meaningful names for sub-groups.
 */
export function findCommonTitlePattern(lessons: LessonForDuplicateCheck[]): string {
  if (lessons.length === 0) return 'Unknown';
  if (lessons.length === 1) return lessons[0].title;

  // Find common words in all titles
  const titleWords = lessons.map((l) => l.title.toLowerCase().split(/\s+/));

  const commonWords = titleWords[0].filter((word) =>
    titleWords.every((words) => words.includes(word))
  );

  return commonWords.length > 0 ? commonWords.join(' ') : lessons[0].title.substring(0, 20) + '...';
}

/**
 * Detect grade variations in a list of lessons.
 * Returns a map of grade keys to lessons.
 */
export function detectGradeVariations(
  lessons: LessonForDuplicateCheck[]
): Map<string, LessonForDuplicateCheck[]> {
  const gradeGroups = new Map<string, LessonForDuplicateCheck[]>();

  lessons.forEach((lesson) => {
    const gradeKey = (lesson.grade_levels || []).sort().join(',');
    if (!gradeGroups.has(gradeKey)) {
      gradeGroups.set(gradeKey, []);
    }
    gradeGroups.get(gradeKey)!.push(lesson);
  });

  return gradeGroups;
}

/**
 * Detect cultural heritage variations in a list of lessons.
 * Returns a map of cultural keys to lessons.
 */
export function detectCulturalVariations(
  lessons: LessonForDuplicateCheck[]
): Map<string, LessonForDuplicateCheck[]> {
  const culturalGroups = new Map<string, LessonForDuplicateCheck[]>();

  lessons.forEach((lesson) => {
    const culturalKey = (lesson.cultural_heritage || []).sort().join(',');
    if (!culturalGroups.has(culturalKey)) {
      culturalGroups.set(culturalKey, []);
    }
    culturalGroups.get(culturalKey)!.push(lesson);
  });

  return culturalGroups;
}

/**
 * Detect seasonal variations in a list of lessons.
 * Returns a map of season keys to lessons.
 */
export function detectSeasonalVariations(
  lessons: LessonForDuplicateCheck[]
): Map<string, LessonForDuplicateCheck[]> {
  const seasonalGroups = new Map<string, LessonForDuplicateCheck[]>();

  lessons.forEach((lesson) => {
    const seasonKey = (lesson.season_timing || []).sort().join(',');
    if (!seasonalGroups.has(seasonKey)) {
      seasonalGroups.set(seasonKey, []);
    }
    seasonalGroups.get(seasonKey)!.push(lesson);
  });

  return seasonalGroups;
}

/**
 * Check for quality issues in a lesson.
 * Returns an array of quality issue messages.
 */
export function detectQualityIssues(lesson: LessonForDuplicateCheck): string[] {
  const issues: string[] = [];

  if (lesson.processing_notes?.toLowerCase().includes('duplicate')) {
    issues.push(`${lesson.lesson_id}: Already flagged as duplicate`);
  }
  if (lesson.title.includes('Copy') || lesson.title.includes('_v2')) {
    issues.push(`${lesson.lesson_id}: Title suggests it's a copy`);
  }

  return issues;
}

/**
 * Union-Find data structure for grouping similar lessons.
 */
export class UnionFind {
  private parent: Map<string, string> = new Map();
  private rank: Map<string, number> = new Map();

  makeSet(x: string): void {
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

  union(x: string, y: string): void {
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

  getGroups(items: string[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();

    for (const item of items) {
      const root = this.find(item);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root)!.push(item);
    }

    return groups;
  }
}

/**
 * Identify sub-groups within a larger duplicate group.
 * Uses Union-Find with a higher similarity threshold (0.96).
 */
export function identifySubGroups(
  lessons: LessonForDuplicateCheck[],
  similarities: Map<string, Map<string, number>>,
  threshold = 0.96
): SubGroup[] {
  const uf = new UnionFind();

  // Add all lessons
  for (const lesson of lessons) {
    uf.makeSet(lesson.lesson_id);
  }

  // Group highly similar lessons
  for (const [id1, sims] of similarities) {
    for (const [id2, score] of sims) {
      if (score >= threshold) {
        uf.union(id1, id2);
      }
    }
  }

  // Collect sub-groups
  const subGroupMap = uf.getGroups(lessons.map((l) => l.lesson_id));

  // Create sub-group definitions only if there are multiple groups
  if (subGroupMap.size <= 1) {
    return [];
  }

  const subGroups: SubGroup[] = [];
  let subGroupIndex = 1;

  subGroupMap.forEach((lessonIds) => {
    const subGroupLessons = lessons.filter((l) => lessonIds.includes(l.lesson_id));
    const commonTitle = findCommonTitlePattern(subGroupLessons);

    subGroups.push({
      groupName: `Approach ${String.fromCharCode(64 + subGroupIndex)}: ${commonTitle}`,
      lessonIds: lessonIds,
      rationale: `${lessonIds.length} lessons with high similarity (>=${threshold})`,
    });
    subGroupIndex++;
  });

  return subGroups;
}

/**
 * Calculate similarity statistics for a group.
 */
export function calculateSimilarityStats(similarities: Map<string, Map<string, number>>): {
  avg: number;
  min: number;
  max: number;
  count: number;
} {
  let totalSim = 0;
  let minSim = 1.0;
  let maxSim = 0;
  let count = 0;

  for (const [, sims] of similarities) {
    for (const [, score] of sims) {
      totalSim += score;
      minSim = Math.min(minSim, score);
      maxSim = Math.max(maxSim, score);
      count++;
    }
  }

  return {
    avg: count > 0 ? totalSim / count : 0,
    min: minSim,
    max: maxSim,
    count,
  };
}

/**
 * Categorize a duplicate group based on its characteristics.
 * Assigns a category (A-G), confidence level, and recommended action.
 */
export function categorizeGroup(group: DuplicateGroup): void {
  const lessons = group.lessons;
  const stats = calculateSimilarityStats(group.similarityScores);

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

  // Check for variations
  const gradeGroups = detectGradeVariations(lessons);
  const hasGradeVariations = gradeGroups.size > 1;

  const culturalGroups = detectCulturalVariations(lessons);
  const hasCulturalVariations =
    culturalGroups.size > 1 && Array.from(culturalGroups.keys()).some((k) => k.length > 0);

  const seasonalGroups = detectSeasonalVariations(lessons);
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
  const hasTitleInconsistencies = uniqueTitlePatterns.size > 1 && stats.avg > 0.99;

  // Categorize based on analysis
  if (hasExactMatches && stats.avg === 1.0) {
    group.category = DUPLICATE_CONFIG.categories.B; // EXACT_CONTENT
    group.recommendedAction = 'auto_merge';
    group.confidence = 'high';
    group.insights.keyDifferences.push('Exact content with different IDs');
  } else if (stats.avg === 1.0) {
    group.category = DUPLICATE_CONFIG.categories.A; // FORMATTING_ONLY
    group.recommendedAction = 'auto_merge';
    group.confidence = 'high';
    group.insights.keyDifferences.push('Identical content - safe to consolidate');
  } else if (stats.avg > 0.999) {
    // Near-perfect match but not quite 1.0 - needs human review
    group.category = DUPLICATE_CONFIG.categories.A; // FORMATTING_ONLY
    group.recommendedAction = 'manual_review';
    group.confidence = 'medium';
    group.insights.keyDifferences.push('Very minor differences - likely formatting or typos');
  } else if (hasGradeVariations && stats.avg > 0.95) {
    group.category = DUPLICATE_CONFIG.categories.C; // GRADE_ADAPTATIONS
    group.recommendedAction = 'keep_all';
    group.confidence = 'high';
    group.insights.pedagogicalNotes.push('Grade-specific adaptations detected');

    // Document grade variations
    gradeGroups.forEach((lessonsInGroup, grades) => {
      group.insights.keyDifferences.push(
        `Grade ${grades || 'unspecified'}: ${lessonsInGroup.length} lesson(s)`
      );
    });
  } else if (hasCulturalVariations && stats.avg > 0.9) {
    group.category = DUPLICATE_CONFIG.categories.E; // CULTURAL_VARIATIONS
    group.recommendedAction = 'manual_review';
    group.confidence = 'medium';
    group.insights.pedagogicalNotes.push('Cultural variations detected - preserve diversity');

    // Document cultural variations
    culturalGroups.forEach((_, culture) => {
      if (culture) {
        group.insights.keyDifferences.push(`Cultural focus: ${culture}`);
      }
    });
  } else if (hasSeasonalVariations && stats.avg > 0.9) {
    group.category = DUPLICATE_CONFIG.categories.F; // SEASONAL_VARIATIONS
    group.recommendedAction = 'manual_review';
    group.confidence = 'medium';
    group.insights.keyDifferences.push('Seasonal adaptations present');
  } else if (hasTitleInconsistencies) {
    group.category = DUPLICATE_CONFIG.categories.D; // TITLE_INCONSISTENCIES
    group.recommendedAction = 'manual_review';
    group.confidence = 'medium';
    group.insights.qualityIssues.push('Title variations for similar content');
  } else if (stats.avg < 0.95 && stats.avg >= 0.9) {
    group.category = DUPLICATE_CONFIG.categories.G; // PEDAGOGICAL_VARIATIONS
    group.recommendedAction = 'split_group';
    group.confidence = 'low';
    group.insights.pedagogicalNotes.push(
      'Significant pedagogical differences - may be distinct approaches'
    );

    // Attempt to identify sub-groups
    group.subGroups = identifySubGroups(lessons, group.similarityScores);
    if (group.subGroups.length > 1) {
      group.insights.pedagogicalNotes.push(
        `Group can be split into ${group.subGroups.length} distinct approaches`
      );
    }
  } else {
    // Default to manual review
    group.category = DUPLICATE_CONFIG.categories.G;
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
    const issues = detectQualityIssues(lesson);
    group.insights.qualityIssues.push(...issues);
  });
}
