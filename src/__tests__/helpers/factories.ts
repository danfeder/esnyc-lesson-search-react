// Test data factories for search-related tests
// These mirror server row shapes and app types to keep tests consistent.

export interface RpcRowLike {
  lesson_id: string;
  title: string;
  summary: string;
  file_link: string;
  grade_levels: string[];
  metadata: Record<string, any> | null;
  confidence?: Record<string, any>;
  total_count?: number;
}

export function makeRpcRow(overrides: Partial<RpcRowLike> = {}): RpcRowLike {
  return {
    lesson_id: overrides.lesson_id ?? 'L-DEFAULT',
    title: overrides.title ?? 'Untitled',
    summary: overrides.summary ?? '',
    file_link: overrides.file_link ?? '#',
    grade_levels: overrides.grade_levels ?? [],
    metadata: overrides.metadata ?? {
      thematicCategories: [],
      seasonTiming: [],
      coreCompetencies: [],
      culturalHeritage: [],
      locationRequirements: [],
      activityType: [],
      lessonFormat: [],
      mainIngredients: [],
      skills: [],
      equipment: [],
      gradeLevel: [],
      gardenSkills: [],
      cookingSkills: [],
      cookingMethods: [],
      observancesHolidays: [],
      academicIntegration: [],
      socialEmotionalLearning: [],
      culturalResponsivenessFeatures: [],
    },
    confidence: overrides.confidence ?? { overall: 0.9 },
    total_count: overrides.total_count ?? 0,
  };
}

export function makeSmartSearchPayload(overrides: any = {}) {
  // Mimics the payload returned by the smart-search edge function
  return {
    lessons: overrides.lessons ?? [],
    totalCount: overrides.totalCount ?? 0,
    suggestions: overrides.suggestions ?? [],
    expandedQuery: overrides.expandedQuery ?? undefined,
  };
}
