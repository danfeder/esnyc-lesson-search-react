import { describe, it, expect, beforeEach } from 'vitest';
import {
  levenshteinDistance,
  calculateTextSimilarity,
  cosineSimilarity,
  calculateCanonicalScore,
  findCommonTitlePattern,
  detectGradeVariations,
  detectCulturalVariations,
  detectSeasonalVariations,
  detectQualityIssues,
  UnionFind,
  identifySubGroups,
  calculateSimilarityStats,
  categorizeGroup,
  DUPLICATE_CONFIG,
  type LessonForDuplicateCheck,
  type DuplicateGroup,
} from './duplicateDetection';

describe('duplicateDetection', () => {
  describe('levenshteinDistance', () => {
    it('returns 0 for identical strings', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    it('returns string length for empty vs non-empty strings', () => {
      expect(levenshteinDistance('', 'hello')).toBe(5);
      expect(levenshteinDistance('hello', '')).toBe(5);
    });

    it('returns 0 for two empty strings', () => {
      expect(levenshteinDistance('', '')).toBe(0);
    });

    it('calculates correct distance for single character changes', () => {
      expect(levenshteinDistance('cat', 'hat')).toBe(1); // substitution
      expect(levenshteinDistance('cat', 'cats')).toBe(1); // insertion
      expect(levenshteinDistance('cats', 'cat')).toBe(1); // deletion
    });

    it('calculates correct distance for multiple changes', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('saturday', 'sunday')).toBe(3);
    });

    it('handles completely different strings', () => {
      expect(levenshteinDistance('abc', 'xyz')).toBe(3);
    });
  });

  describe('calculateTextSimilarity', () => {
    it('returns 1 for identical strings', () => {
      expect(calculateTextSimilarity('Hello World', 'Hello World')).toBe(1);
    });

    it('returns 1 for identical strings with different case', () => {
      expect(calculateTextSimilarity('HELLO', 'hello')).toBe(1);
    });

    it('returns 1 for identical strings with extra whitespace', () => {
      expect(calculateTextSimilarity('  hello  ', 'hello')).toBe(1);
    });

    it('returns 0 for null or undefined input', () => {
      expect(calculateTextSimilarity('', 'hello')).toBe(0);
      expect(calculateTextSimilarity('hello', '')).toBe(0);
      expect(calculateTextSimilarity(null as unknown as string, 'hello')).toBe(0);
    });

    it('returns high similarity for similar strings', () => {
      const similarity = calculateTextSimilarity('Garden to Table', 'Garden to Tables');
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('returns low similarity for very different strings', () => {
      const similarity = calculateTextSimilarity('Apple Pie Recipe', 'Quantum Physics');
      expect(similarity).toBeLessThan(0.3);
    });

    it('handles single character strings', () => {
      expect(calculateTextSimilarity('a', 'a')).toBe(1);
      expect(calculateTextSimilarity('a', 'b')).toBe(0);
    });
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      const vec = [1, 2, 3];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 10);
    });

    it('returns -1 for opposite vectors', () => {
      expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 10);
    });

    it('returns 0 for orthogonal vectors', () => {
      expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
    });

    it('returns 0 for null or undefined vectors', () => {
      expect(cosineSimilarity(null as unknown as number[], [1, 2])).toBe(0);
      expect(cosineSimilarity([1, 2], null as unknown as number[])).toBe(0);
    });

    it('returns 0 for vectors of different lengths', () => {
      expect(cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
    });

    it('returns 0 for zero vectors', () => {
      expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
      expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0);
    });

    it('calculates correct similarity for normalized vectors', () => {
      // These vectors have cosine similarity of 0.5
      const vec1 = [1, 0];
      const vec2 = [0.5, Math.sqrt(3) / 2]; // 60 degree angle
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0.5, 5);
    });

    it('returns same result regardless of magnitude', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [2, 4, 6]; // Same direction, different magnitude
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(1, 10);
    });
  });

  describe('calculateCanonicalScore', () => {
    const createBasicLesson = (
      overrides: Partial<LessonForDuplicateCheck> = {}
    ): LessonForDuplicateCheck => ({
      lesson_id: 'test-001',
      title: 'Test Lesson',
      created_at: new Date().toISOString(),
      ...overrides,
    });

    it('returns a score between 0 and 1', () => {
      const lesson = createBasicLesson();
      const score = calculateCanonicalScore(lesson);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('gives higher scores to more recent lessons', () => {
      const recentLesson = createBasicLesson({
        created_at: new Date().toISOString(),
      });
      const oldLesson = createBasicLesson({
        created_at: new Date('2015-01-01').toISOString(),
      });

      const recentScore = calculateCanonicalScore(recentLesson);
      const oldScore = calculateCanonicalScore(oldLesson);

      expect(recentScore).toBeGreaterThan(oldScore);
    });

    it('gives higher scores to lessons with more metadata', () => {
      const completeLesson = createBasicLesson({
        thematic_categories: ['Science'],
        season_timing: ['Fall'],
        cultural_heritage: ['Italian'],
        activity_type: ['Cooking'],
        main_ingredients: ['Tomato'],
        grade_levels: ['3', '4', '5'],
      });
      const sparseLesson = createBasicLesson();

      const completeScore = calculateCanonicalScore(completeLesson);
      const sparseScore = calculateCanonicalScore(sparseLesson);

      expect(completeScore).toBeGreaterThan(sparseScore);
    });

    it('gives higher scores to lessons with more grade coverage', () => {
      const wideGradeLesson = createBasicLesson({
        grade_levels: ['K', '1', '2', '3', '4', '5', '6', '7', '8'],
      });
      const narrowGradeLesson = createBasicLesson({
        grade_levels: ['3'],
      });

      const wideScore = calculateCanonicalScore(wideGradeLesson);
      const narrowScore = calculateCanonicalScore(narrowGradeLesson);

      expect(wideScore).toBeGreaterThan(narrowScore);
    });

    it('detects quality issues in title', () => {
      const copyLesson = createBasicLesson({ title: 'Lesson Copy' });
      const v2Lesson = createBasicLesson({ title: 'Lesson_v2' });
      const updatedLesson = createBasicLesson({ title: 'Lesson (Updated)' });

      calculateCanonicalScore(copyLesson);
      calculateCanonicalScore(v2Lesson);
      calculateCanonicalScore(updatedLesson);

      expect(copyLesson.scoreBreakdown?.qualityNotes).toContain("Title suggests it's a copy");
      expect(v2Lesson.scoreBreakdown?.qualityNotes).toContain("Title suggests it's a copy");
      expect(updatedLesson.scoreBreakdown?.qualityNotes).toContain("Title suggests it's a copy");
    });

    it('detects duplicate flag in processing notes', () => {
      const flaggedLesson = createBasicLesson({
        processing_notes: 'This is a known duplicate',
      });

      calculateCanonicalScore(flaggedLesson);

      expect(flaggedLesson.scoreBreakdown?.qualityNotes).toContain('Already flagged as duplicate');
    });

    it('stores score breakdown on lesson object', () => {
      const lesson = createBasicLesson({
        grade_levels: ['3', '4'],
        thematic_categories: ['Science'],
      });

      calculateCanonicalScore(lesson);

      expect(lesson.canonicalScore).toBeDefined();
      expect(lesson.metadataCompleteness).toBeDefined();
      expect(lesson.scoreBreakdown).toBeDefined();
      expect(lesson.scoreBreakdown?.recency).toBeDefined();
      expect(lesson.scoreBreakdown?.completeness).toBeDefined();
      expect(lesson.scoreBreakdown?.gradeCoverage).toBeDefined();
    });
  });

  describe('findCommonTitlePattern', () => {
    const createLesson = (title: string): LessonForDuplicateCheck => ({
      lesson_id: `lesson-${title.replace(/\s/g, '-')}`,
      title,
      created_at: new Date().toISOString(),
    });

    it('returns "Unknown" for empty array', () => {
      expect(findCommonTitlePattern([])).toBe('Unknown');
    });

    it('returns full title for single lesson', () => {
      const lessons = [createLesson('Garden to Table')];
      expect(findCommonTitlePattern(lessons)).toBe('Garden to Table');
    });

    it('finds common words across titles', () => {
      const lessons = [
        createLesson('Garden to Table: Tomatoes'),
        createLesson('Garden to Table: Peppers'),
        createLesson('Garden to Table: Squash'),
      ];
      const pattern = findCommonTitlePattern(lessons);
      expect(pattern).toContain('garden');
      expect(pattern).toContain('table');
      expect(pattern).toContain('to');
    });

    it('returns truncated first title when no common words', () => {
      const lessons = [
        createLesson('Apple Pie Recipe'),
        createLesson('Bread Making Basics'),
        createLesson('Cooking with Herbs'),
      ];
      const pattern = findCommonTitlePattern(lessons);
      expect(pattern.endsWith('...')).toBe(true);
    });
  });

  describe('detectGradeVariations', () => {
    const createLesson = (id: string, grades: string[]): LessonForDuplicateCheck => ({
      lesson_id: id,
      title: `Lesson ${id}`,
      created_at: new Date().toISOString(),
      grade_levels: grades,
    });

    it('groups lessons by grade levels', () => {
      const lessons = [
        createLesson('a', ['K', '1']),
        createLesson('b', ['K', '1']),
        createLesson('c', ['3', '4', '5']),
      ];

      const groups = detectGradeVariations(lessons);

      expect(groups.size).toBe(2);
      expect(groups.get('1,K')?.length).toBe(2);
      expect(groups.get('3,4,5')?.length).toBe(1);
    });

    it('handles lessons without grade levels', () => {
      const lessons = [createLesson('a', []), createLesson('b', undefined as unknown as string[])];

      const groups = detectGradeVariations(lessons);

      expect(groups.size).toBe(1);
      expect(groups.get('')?.length).toBe(2);
    });

    it('sorts grade keys consistently', () => {
      const lessons = [createLesson('a', ['3', '1', '2']), createLesson('b', ['1', '2', '3'])];

      const groups = detectGradeVariations(lessons);

      expect(groups.size).toBe(1);
      expect(groups.get('1,2,3')?.length).toBe(2);
    });
  });

  describe('detectCulturalVariations', () => {
    const createLesson = (id: string, cultures: string[]): LessonForDuplicateCheck => ({
      lesson_id: id,
      title: `Lesson ${id}`,
      created_at: new Date().toISOString(),
      cultural_heritage: cultures,
    });

    it('groups lessons by cultural heritage', () => {
      const lessons = [
        createLesson('a', ['Italian']),
        createLesson('b', ['Italian']),
        createLesson('c', ['Mexican', 'Spanish']),
      ];

      const groups = detectCulturalVariations(lessons);

      expect(groups.size).toBe(2);
      expect(groups.get('Italian')?.length).toBe(2);
    });
  });

  describe('detectSeasonalVariations', () => {
    const createLesson = (id: string, seasons: string[]): LessonForDuplicateCheck => ({
      lesson_id: id,
      title: `Lesson ${id}`,
      created_at: new Date().toISOString(),
      season_timing: seasons,
    });

    it('groups lessons by season timing', () => {
      const lessons = [
        createLesson('a', ['Fall']),
        createLesson('b', ['Fall']),
        createLesson('c', ['Spring', 'Summer']),
      ];

      const groups = detectSeasonalVariations(lessons);

      expect(groups.size).toBe(2);
      expect(groups.get('Fall')?.length).toBe(2);
    });
  });

  describe('detectQualityIssues', () => {
    const createLesson = (
      overrides: Partial<LessonForDuplicateCheck> = {}
    ): LessonForDuplicateCheck => ({
      lesson_id: 'test-001',
      title: 'Test Lesson',
      created_at: new Date().toISOString(),
      ...overrides,
    });

    it('detects duplicate flag in processing notes', () => {
      const lesson = createLesson({
        processing_notes: 'This lesson is a duplicate of another',
      });
      const issues = detectQualityIssues(lesson);
      expect(issues).toContain('test-001: Already flagged as duplicate');
    });

    it('detects Copy in title', () => {
      const lesson = createLesson({ title: 'Lesson Copy' });
      const issues = detectQualityIssues(lesson);
      expect(issues).toContain("test-001: Title suggests it's a copy");
    });

    it('detects _v2 in title', () => {
      const lesson = createLesson({ title: 'Lesson_v2' });
      const issues = detectQualityIssues(lesson);
      expect(issues).toContain("test-001: Title suggests it's a copy");
    });

    it('returns empty array for clean lesson', () => {
      const lesson = createLesson();
      const issues = detectQualityIssues(lesson);
      expect(issues).toHaveLength(0);
    });
  });

  describe('UnionFind', () => {
    let uf: UnionFind;

    beforeEach(() => {
      uf = new UnionFind();
    });

    it('finds element returns itself initially', () => {
      expect(uf.find('a')).toBe('a');
    });

    it('unions two elements correctly', () => {
      uf.union('a', 'b');
      expect(uf.find('a')).toBe(uf.find('b'));
    });

    it('handles chained unions', () => {
      uf.union('a', 'b');
      uf.union('b', 'c');
      uf.union('c', 'd');

      expect(uf.find('a')).toBe(uf.find('d'));
    });

    it('keeps separate sets separate', () => {
      uf.union('a', 'b');
      uf.union('c', 'd');

      expect(uf.find('a')).toBe(uf.find('b'));
      expect(uf.find('c')).toBe(uf.find('d'));
      expect(uf.find('a')).not.toBe(uf.find('c'));
    });

    it('gets groups correctly', () => {
      uf.union('a', 'b');
      uf.union('c', 'd');
      uf.union('a', 'c');

      const groups = uf.getGroups(['a', 'b', 'c', 'd', 'e']);

      expect(groups.size).toBe(2);
      // One group has a, b, c, d
      // One group has just e
      const sizes = Array.from(groups.values()).map((g) => g.length);
      expect(sizes).toContain(4);
      expect(sizes).toContain(1);
    });
  });

  describe('identifySubGroups', () => {
    const createLesson = (id: string): LessonForDuplicateCheck => ({
      lesson_id: id,
      title: `Lesson ${id}`,
      created_at: new Date().toISOString(),
    });

    it('returns empty array when all lessons are similar', () => {
      const lessons = [createLesson('a'), createLesson('b'), createLesson('c')];

      const similarities = new Map<string, Map<string, number>>();
      similarities.set(
        'a',
        new Map([
          ['b', 0.98],
          ['c', 0.97],
        ])
      );
      similarities.set(
        'b',
        new Map([
          ['a', 0.98],
          ['c', 0.99],
        ])
      );
      similarities.set(
        'c',
        new Map([
          ['a', 0.97],
          ['b', 0.99],
        ])
      );

      const subGroups = identifySubGroups(lessons, similarities);

      expect(subGroups).toHaveLength(0);
    });

    it('identifies distinct sub-groups below threshold', () => {
      const lessons = [createLesson('a'), createLesson('b'), createLesson('c'), createLesson('d')];

      // a-b are similar (0.98), c-d are similar (0.97), but a/b to c/d are below threshold
      const similarities = new Map<string, Map<string, number>>();
      similarities.set(
        'a',
        new Map([
          ['b', 0.98],
          ['c', 0.9],
          ['d', 0.89],
        ])
      );
      similarities.set(
        'b',
        new Map([
          ['a', 0.98],
          ['c', 0.91],
          ['d', 0.88],
        ])
      );
      similarities.set(
        'c',
        new Map([
          ['a', 0.9],
          ['b', 0.91],
          ['d', 0.97],
        ])
      );
      similarities.set(
        'd',
        new Map([
          ['a', 0.89],
          ['b', 0.88],
          ['c', 0.97],
        ])
      );

      const subGroups = identifySubGroups(lessons, similarities);

      expect(subGroups).toHaveLength(2);
      expect(subGroups[0].lessonIds).toHaveLength(2);
      expect(subGroups[1].lessonIds).toHaveLength(2);
    });
  });

  describe('calculateSimilarityStats', () => {
    it('calculates stats correctly', () => {
      const similarities = new Map<string, Map<string, number>>();
      similarities.set(
        'a',
        new Map([
          ['b', 0.9],
          ['c', 0.8],
        ])
      );
      similarities.set(
        'b',
        new Map([
          ['a', 0.9],
          ['c', 0.85],
        ])
      );
      similarities.set(
        'c',
        new Map([
          ['a', 0.8],
          ['b', 0.85],
        ])
      );

      const stats = calculateSimilarityStats(similarities);

      expect(stats.min).toBe(0.8);
      expect(stats.max).toBe(0.9);
      expect(stats.count).toBe(6);
      expect(stats.avg).toBeCloseTo(0.85, 2);
    });

    it('handles empty similarities', () => {
      const stats = calculateSimilarityStats(new Map());

      expect(stats.avg).toBe(0);
      expect(stats.count).toBe(0);
    });
  });

  describe('categorizeGroup', () => {
    const createGroup = (
      lessons: LessonForDuplicateCheck[],
      avgSimilarity: number
    ): DuplicateGroup => {
      const similarities = new Map<string, Map<string, number>>();

      // Create full similarity matrix with the given average
      for (const lesson1 of lessons) {
        similarities.set(lesson1.lesson_id, new Map());
        for (const lesson2 of lessons) {
          if (lesson1.lesson_id !== lesson2.lesson_id) {
            similarities.get(lesson1.lesson_id)!.set(lesson2.lesson_id, avgSimilarity);
          }
        }
      }

      return {
        groupId: 'test-group',
        category: '',
        confidence: 'low',
        lessons,
        similarityScores: similarities,
        recommendedAction: 'manual_review',
        insights: {
          keyDifferences: [],
          commonElements: [],
          qualityIssues: [],
          pedagogicalNotes: [],
        },
      };
    };

    const createLesson = (
      id: string,
      overrides: Partial<LessonForDuplicateCheck> = {}
    ): LessonForDuplicateCheck => ({
      lesson_id: id,
      title: `Lesson ${id}`,
      created_at: new Date().toISOString(),
      ...overrides,
    });

    it('categorizes exact matches as EXACT_CONTENT', () => {
      const lessons = [
        createLesson('a', { content_hash: 'hash1' }),
        createLesson('b', { content_hash: 'hash1' }),
      ];
      const group = createGroup(lessons, 1.0);

      categorizeGroup(group);

      expect(group.category).toBe(DUPLICATE_CONFIG.categories.B);
      expect(group.recommendedAction).toBe('auto_merge');
      expect(group.confidence).toBe('high');
    });

    it('categorizes perfect similarity as FORMATTING_ONLY', () => {
      const lessons = [createLesson('a'), createLesson('b')];
      const group = createGroup(lessons, 1.0);

      categorizeGroup(group);

      expect(group.category).toBe(DUPLICATE_CONFIG.categories.A);
      expect(group.recommendedAction).toBe('auto_merge');
    });

    it('categorizes near-perfect as FORMATTING_ONLY with manual review', () => {
      const lessons = [createLesson('a'), createLesson('b')];
      const group = createGroup(lessons, 0.9995);

      categorizeGroup(group);

      expect(group.category).toBe(DUPLICATE_CONFIG.categories.A);
      expect(group.recommendedAction).toBe('manual_review');
      expect(group.confidence).toBe('medium');
    });

    it('categorizes grade variations as GRADE_ADAPTATIONS', () => {
      const lessons = [
        createLesson('a', { grade_levels: ['K', '1'] }),
        createLesson('b', { grade_levels: ['3', '4', '5'] }),
      ];
      const group = createGroup(lessons, 0.96);

      categorizeGroup(group);

      expect(group.category).toBe(DUPLICATE_CONFIG.categories.C);
      expect(group.recommendedAction).toBe('keep_all');
      expect(group.confidence).toBe('high');
    });

    it('categorizes cultural variations as CULTURAL_VARIATIONS', () => {
      const lessons = [
        createLesson('a', { cultural_heritage: ['Italian'] }),
        createLesson('b', { cultural_heritage: ['Mexican'] }),
      ];
      const group = createGroup(lessons, 0.92);

      categorizeGroup(group);

      expect(group.category).toBe(DUPLICATE_CONFIG.categories.E);
      expect(group.recommendedAction).toBe('manual_review');
    });

    it('categorizes seasonal variations as SEASONAL_VARIATIONS', () => {
      const lessons = [
        createLesson('a', { season_timing: ['Fall'] }),
        createLesson('b', { season_timing: ['Spring'] }),
      ];
      const group = createGroup(lessons, 0.92);

      categorizeGroup(group);

      expect(group.category).toBe(DUPLICATE_CONFIG.categories.F);
      expect(group.recommendedAction).toBe('manual_review');
    });

    it('categorizes pedagogical variations as PEDAGOGICAL_VARIATIONS with split', () => {
      const lessons = [createLesson('a'), createLesson('b'), createLesson('c')];
      const group = createGroup(lessons, 0.92);

      categorizeGroup(group);

      expect(group.category).toBe(DUPLICATE_CONFIG.categories.G);
      expect(group.recommendedAction).toBe('split_group');
      expect(group.confidence).toBe('low');
    });

    it('populates insights with common themes', () => {
      const lessons = [
        createLesson('a', { thematic_categories: ['Science', 'Math'] }),
        createLesson('b', { thematic_categories: ['Science', 'Art'] }),
      ];
      const group = createGroup(lessons, 0.95);

      categorizeGroup(group);

      expect(group.insights.commonElements).toContain('Themes: Science');
    });

    it('detects quality issues across lessons', () => {
      const lessons = [
        createLesson('a', { title: 'Lesson Copy' }),
        createLesson('b', { processing_notes: 'duplicate detected' }),
      ];
      const group = createGroup(lessons, 0.95);

      categorizeGroup(group);

      expect(group.insights.qualityIssues.length).toBeGreaterThan(0);
    });
  });

  describe('DUPLICATE_CONFIG', () => {
    it('has all required threshold values', () => {
      expect(DUPLICATE_CONFIG.thresholds.exactMatch).toBe(1.0);
      expect(DUPLICATE_CONFIG.thresholds.autoConsolidate).toBe(1.0);
      expect(DUPLICATE_CONFIG.thresholds.manualReview).toBe(0.995);
      expect(DUPLICATE_CONFIG.thresholds.carefulComparison).toBe(0.99);
      expect(DUPLICATE_CONFIG.thresholds.significantVariation).toBe(0.9);
      expect(DUPLICATE_CONFIG.thresholds.relatedButDistinct).toBe(0.85);
    });

    it('has weights that sum to 0.3', () => {
      const totalWeight =
        DUPLICATE_CONFIG.weights.recency +
        DUPLICATE_CONFIG.weights.completeness +
        DUPLICATE_CONFIG.weights.gradesCovered;
      expect(totalWeight).toBe(0.3);
    });

    it('has all category values', () => {
      expect(Object.keys(DUPLICATE_CONFIG.categories)).toHaveLength(7);
      expect(DUPLICATE_CONFIG.categories.A).toBe('FORMATTING_ONLY');
      expect(DUPLICATE_CONFIG.categories.B).toBe('EXACT_CONTENT');
      expect(DUPLICATE_CONFIG.categories.C).toBe('GRADE_ADAPTATIONS');
      expect(DUPLICATE_CONFIG.categories.D).toBe('TITLE_INCONSISTENCIES');
      expect(DUPLICATE_CONFIG.categories.E).toBe('CULTURAL_VARIATIONS');
      expect(DUPLICATE_CONFIG.categories.F).toBe('SEASONAL_VARIATIONS');
      expect(DUPLICATE_CONFIG.categories.G).toBe('PEDAGOGICAL_VARIATIONS');
    });
  });
});
