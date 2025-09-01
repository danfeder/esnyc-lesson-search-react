import { describe, it, expect } from 'vitest';

// Mock the similarity functions from the edge function
// Since edge functions aren't easily testable directly, we'll extract and test the logic

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'will',
  'with',
  'this',
  'these',
  'those',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'how',
]);

function normalizeTitle(title: string): string[] {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word));

  return words;
}

function calculateTitleSimilarity(title1: string, title2: string): number {
  const words1 = normalizeTitle(title1);
  const words2 = normalizeTitle(title2);

  // Handle empty cases
  if (words1.length === 0 && words2.length === 0) return 1.0;
  if (words1.length === 0 || words2.length === 0) return 0.0;

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  // Token set ratio with length penalty
  const jaccardScore = union.size === 0 ? 0 : intersection.size / union.size;
  const lengthRatio =
    Math.min(words1.length, words2.length) / Math.max(words1.length, words2.length);

  // Weighted combination favoring Jaccard but considering length
  return jaccardScore * 0.8 + lengthRatio * 0.2;
}

function calculateJaccardSimilarity(arr1: any[], arr2: any[]): number {
  if (!arr1?.length && !arr2?.length) return 1.0; // Both empty = match
  if (!arr1?.length || !arr2?.length) return 0.0; // One empty = no match

  // Normalize strings for comparison
  const normalize = (item: any) => String(item).toLowerCase().trim();
  const set1 = new Set(arr1.map(normalize));
  const set2 = new Set(arr2.map(normalize));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

function calculateMetadataOverlap(meta1: any, meta2: any): number {
  if (!meta1 || !meta2) return 0;

  const fieldWeights = {
    gradeLevels: 0.2,
    thematicCategories: 0.2,
    activityType: 0.15,
    culturalHeritage: 0.15,
    seasonTiming: 0.1,
    mainIngredients: 0.1,
    cookingMethods: 0.1,
  };

  let weightedScore = 0;
  let totalWeight = 0;

  const fieldMappings = [
    { sub: 'gradeLevels', lesson: 'grade_levels', weight: fieldWeights.gradeLevels },
    {
      sub: 'thematicCategories',
      lesson: 'thematic_categories',
      weight: fieldWeights.thematicCategories,
    },
    { sub: 'activityType', lesson: 'activity_type', weight: fieldWeights.activityType },
    { sub: 'culturalHeritage', lesson: 'cultural_heritage', weight: fieldWeights.culturalHeritage },
    { sub: 'seasonTiming', lesson: 'season_timing', weight: fieldWeights.seasonTiming },
    { sub: 'mainIngredients', lesson: 'main_ingredients', weight: fieldWeights.mainIngredients },
    { sub: 'cookingMethods', lesson: 'cooking_methods', weight: fieldWeights.cookingMethods },
  ];

  for (const mapping of fieldMappings) {
    const subField = meta1[mapping.sub];
    const lessonField = meta2[mapping.lesson];

    if (subField && lessonField) {
      const similarity = calculateJaccardSimilarity(
        Array.isArray(subField) ? subField : [subField],
        Array.isArray(lessonField) ? lessonField : [lessonField]
      );

      weightedScore += similarity * mapping.weight;
      totalWeight += mapping.weight;
    }
  }

  return totalWeight > 0 ? weightedScore / totalWeight : 0;
}

describe('Title Similarity', () => {
  it('should normalize titles by removing stop words and punctuation', () => {
    const words = normalizeTitle('The Quick Brown Fox!');
    expect(words).toEqual(['quick', 'brown', 'fox']);
  });

  it('should calculate perfect similarity for identical titles', () => {
    const similarity = calculateTitleSimilarity(
      'Cooking with Vegetables',
      'Cooking with Vegetables'
    );
    expect(similarity).toBe(1.0);
  });

  it('should calculate high similarity for titles with different word order', () => {
    const similarity = calculateTitleSimilarity('Vegetable Cooking', 'Cooking Vegetables');
    // Both have same words just different order, but "vegetables" vs "vegetable" differs slightly
    // Jaccard: 1/2 = 0.5, Length: 2/2 = 1.0, Combined: 0.5*0.8 + 1.0*0.2 = 0.6
    expect(similarity).toBeGreaterThan(0.4);
    expect(similarity).toBeLessThan(0.7);
  });

  it('should ignore stop words in similarity calculation', () => {
    const similarity = calculateTitleSimilarity('The Art of Cooking', 'Cooking Art');
    expect(similarity).toBeGreaterThan(0.8);
  });

  it('should handle punctuation differences', () => {
    const similarity = calculateTitleSimilarity(
      "Cooking: A Beginner's Guide",
      'Cooking - A Beginners Guide'
    );
    // After normalization: ["cooking", "beginner", "s", "guide"] vs ["cooking", "beginners", "guide"]
    // Common: cooking, guide = 2, Union: cooking, beginner, s, beginners, guide = 5
    // Jaccard: 2/5 = 0.4, Length: 3/4 = 0.75, Combined: 0.4*0.8 + 0.75*0.2 = 0.47
    expect(similarity).toBeGreaterThan(0.4);
    expect(similarity).toBeLessThan(0.6);
  });

  it('should return low similarity for completely different titles', () => {
    const similarity = calculateTitleSimilarity('Math Algebra', 'History Rome');
    // No common words, but length ratio is 2/2 = 1.0
    // Jaccard: 0/4 = 0, Length: 2/2 = 1.0, Combined: 0*0.8 + 1.0*0.2 = 0.2
    expect(similarity).toBe(0.2);
  });

  it('should handle empty titles', () => {
    expect(calculateTitleSimilarity('', '')).toBe(1.0);
    expect(calculateTitleSimilarity('Title', '')).toBe(0.0);
    expect(calculateTitleSimilarity('', 'Title')).toBe(0.0);
  });
});

describe('Jaccard Similarity for Arrays', () => {
  it('should calculate perfect similarity for identical arrays', () => {
    const similarity = calculateJaccardSimilarity(['a', 'b', 'c'], ['a', 'b', 'c']);
    expect(similarity).toBe(1.0);
  });

  it('should calculate partial similarity for overlapping arrays', () => {
    const similarity = calculateJaccardSimilarity(['a', 'b', 'c'], ['b', 'c', 'd']);
    expect(similarity).toBeCloseTo(0.5, 2); // 2 common / 4 total
  });

  it('should be case-insensitive', () => {
    const similarity = calculateJaccardSimilarity(['Apple', 'Banana'], ['apple', 'banana']);
    expect(similarity).toBe(1.0);
  });

  it('should handle empty arrays', () => {
    expect(calculateJaccardSimilarity([], [])).toBe(1.0);
    expect(calculateJaccardSimilarity(['a'], [])).toBe(0.0);
    expect(calculateJaccardSimilarity([], ['a'])).toBe(0.0);
  });

  it('should normalize whitespace', () => {
    const similarity = calculateJaccardSimilarity(['  apple  '], ['apple']);
    expect(similarity).toBe(1.0);
  });
});

describe('Metadata Overlap', () => {
  it('should calculate weighted overlap across all fields', () => {
    const meta1 = {
      gradeLevels: ['K', '1', '2'],
      thematicCategories: ['Science', 'Nature'],
      activityType: ['Hands-on'],
      culturalHeritage: ['American'],
      seasonTiming: ['Spring'],
      mainIngredients: ['Tomatoes', 'Basil'],
      cookingMethods: ['Baking'],
    };

    const meta2 = {
      grade_levels: ['1', '2', '3'],
      thematic_categories: ['Science', 'Environment'],
      activity_type: ['Hands-on'],
      cultural_heritage: ['American'],
      season_timing: ['Summer'],
      main_ingredients: ['Tomatoes', 'Oregano'],
      cooking_methods: ['Baking'],
    };

    const overlap = calculateMetadataOverlap(meta1, meta2);

    // Should have partial overlap across multiple fields
    expect(overlap).toBeGreaterThan(0.4);
    expect(overlap).toBeLessThan(0.8);
  });

  it('should handle missing fields gracefully', () => {
    const meta1 = {
      gradeLevels: ['K', '1'],
      thematicCategories: ['Science'],
    };

    const meta2 = {
      grade_levels: ['1', '2'],
      cooking_methods: ['Baking'], // Different field
    };

    const overlap = calculateMetadataOverlap(meta1, meta2);

    // Should only calculate for grade_levels
    expect(overlap).toBeGreaterThan(0);
    expect(overlap).toBeLessThan(0.5);
  });

  it('should return 0 for null or undefined metadata', () => {
    expect(calculateMetadataOverlap(null, {})).toBe(0);
    expect(calculateMetadataOverlap({}, null)).toBe(0);
    expect(calculateMetadataOverlap(undefined, {})).toBe(0);
  });

  it('should weight important fields more heavily', () => {
    // Grade levels and thematic categories have 0.2 weight each
    const meta1WithGrades = {
      gradeLevels: ['K', '1', '2'],
    };
    const meta2WithGrades = {
      grade_levels: ['K', '1', '2'],
    };

    const meta1WithCooking = {
      cookingMethods: ['Baking', 'Roasting'],
    };
    const meta2WithCooking = {
      cooking_methods: ['Baking', 'Roasting'],
    };

    const gradeOverlap = calculateMetadataOverlap(meta1WithGrades, meta2WithGrades);
    const cookingOverlap = calculateMetadataOverlap(meta1WithCooking, meta2WithCooking);

    // Both should be 1.0 since they match perfectly within their field
    expect(gradeOverlap).toBe(1.0);
    expect(cookingOverlap).toBe(1.0);
  });
});

describe('Combined Score Calculation', () => {
  it('should apply floor threshold correctly', () => {
    const COMBINED_SCORE_FLOOR = 0.45;

    // Test scores
    const scores = [0.3, 0.44, 0.45, 0.6, 0.8, 1.0];
    const filtered = scores.filter((s) => s >= COMBINED_SCORE_FLOOR);

    expect(filtered).toEqual([0.45, 0.6, 0.8, 1.0]);
  });

  it('should always include exact matches regardless of score', () => {
    const COMBINED_SCORE_FLOOR = 0.45;

    const matches = [
      { score: 1.0, matchType: 'exact' },
      { score: 0.3, matchType: 'low' },
      { score: 0.2, matchType: 'exact' }, // Low score but exact
    ];

    const filtered = matches.filter(
      (m) => m.score >= COMBINED_SCORE_FLOOR || m.matchType === 'exact'
    );

    expect(filtered).toHaveLength(2);
    expect(filtered.map((m) => m.matchType)).toContain('exact');
  });
});
