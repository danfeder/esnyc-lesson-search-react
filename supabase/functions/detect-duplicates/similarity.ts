// Pure similarity helpers for detect-duplicates. Kept free of Deno/Supabase
// imports so the vitest suite (similarity.test.ts) can import the LIVE code
// instead of a copy. index.ts imports calculateMetadataOverlap; the Jaccard
// helper is exported for the tests only.

// Calculate Jaccard similarity for array fields
export function calculateJaccardSimilarity(arr1: any[], arr2: any[]): number {
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

// Calculate metadata overlap across all 7 array fields
export function calculateMetadataOverlap(meta1: any, meta2: any): number {
  if (!meta1 || !meta2) return 0;

  const fieldWeights = {
    gradeLevels: 0.2, // Important for age appropriateness
    thematicCategories: 0.2, // Core content categorization
    activityType: 0.15, // Type of lesson activity
    culturalHeritage: 0.15, // Cultural context
    seasonTiming: 0.1, // When lesson is relevant
    mainIngredients: 0.1, // For cooking lessons
    cookingMethods: 0.1, // For cooking lessons
  };

  let weightedScore = 0;
  let totalWeight = 0;

  // Map submission fields to lesson fields
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

    // Skip if either field is missing
    if (subField && lessonField) {
      const similarity = calculateJaccardSimilarity(
        Array.isArray(subField) ? subField : [subField],
        Array.isArray(lessonField) ? lessonField : [lessonField]
      );

      weightedScore += similarity * mapping.weight;
      totalWeight += mapping.weight;
    }
  }

  // Normalize by actual weight used (in case some fields were missing)
  return totalWeight > 0 ? weightedScore / totalWeight : 0;
}
