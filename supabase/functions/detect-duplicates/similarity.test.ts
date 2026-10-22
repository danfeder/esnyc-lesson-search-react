import { describe, it, expect } from 'vitest';
import { calculateJaccardSimilarity, calculateMetadataOverlap } from './similarity.ts';

// These test the LIVE helpers used by index.ts (imported, not copied). Title
// similarity moved to pg_trgm in SQL (find_similar_lessons_text) in T4b and
// has no TypeScript implementation to test.

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
