/**
 * Shared search helpers for search-lessons and smart-search edge functions.
 *
 * Both functions query `lessons_with_metadata`, apply filters/sorting/pagination,
 * and transform rows to the frontend Lesson shape.  This module extracts the
 * duplicated logic so bug-fixes only need to happen once.
 */

// deno-lint-ignore-file no-explicit-any

/* ---------- types ---------- */

export interface SearchFilters {
  gradeLevels?: string[];
  thematicCategories?: string[];
  seasons?: string[];
  coreCompetencies?: string[];
  culturalHeritage?: string[];
  location?: string[];
  activityType?: string[];
  lessonFormat?: string;
  includeAllSeasons?: boolean;
}

export type SortBy = 'relevance' | 'title' | 'confidence' | 'grade' | 'modified';

/* ---------- helpers ---------- */

/**
 * Apply filter predicates to a Supabase query builder.
 * Uses the canonical metadata JSON-path names from `lessons_with_metadata`.
 */
export function applyFilters(
  query: any,
  filters: SearchFilters,
): any {
  let q = query;

  if (filters.gradeLevels?.length) {
    q = q.overlaps('grade_levels', filters.gradeLevels);
  }

  if (filters.thematicCategories?.length) {
    q = q.overlaps('metadata->thematicCategories', filters.thematicCategories);
  }

  if (filters.seasons?.length) {
    if (filters.includeAllSeasons) {
      q = q.or(
        `metadata->seasonTiming.ov.{${filters.seasons.join(',')}},metadata->seasonTiming.cs.{"All Seasons"}`,
      );
    } else {
      q = q.overlaps('metadata->seasonTiming', filters.seasons);
    }
  }

  if (filters.coreCompetencies?.length) {
    q = q.overlaps('metadata->coreCompetencies', filters.coreCompetencies);
  }

  if (filters.culturalHeritage?.length) {
    q = q.overlaps('metadata->culturalHeritage', filters.culturalHeritage);
  }

  if (filters.location?.length) {
    q = q.overlaps('location_requirements', filters.location);
  }

  if (filters.activityType?.length) {
    q = q.overlaps('metadata->activityType', filters.activityType);
  }

  if (filters.lessonFormat) {
    q = q.eq('metadata->>lessonFormat', filters.lessonFormat);
  }

  return q;
}

/**
 * Apply sort order to a Supabase query builder.
 */
export function applySorting(
  query: any,
  sortBy: SortBy,
): any {
  switch (sortBy) {
    case 'title':
      return query.order('title', { ascending: true });
    case 'confidence':
      return query.order('confidence->overall', { ascending: false });
    case 'grade':
      return query.order('grade_levels', { ascending: true });
    case 'modified':
      return query.order('updated_at', { ascending: false });
    default: // relevance — secondary sort by confidence
      return query.order('confidence->overall', { ascending: false });
  }
}

/**
 * Apply pagination (page, limit → range).
 */
export function applyPagination(
  query: any,
  page: number,
  limit: number,
): any {
  const offset = (page - 1) * limit;
  return query.range(offset, offset + limit - 1);
}

/**
 * Transform a raw `lessons_with_metadata` row into the frontend Lesson shape.
 */
export function transformRow(row: any) {
  return {
    lessonId: row.lesson_id,
    title: row.title,
    summary: row.summary,
    fileLink: row.file_link,
    gradeLevels: row.grade_levels || [],
    metadata: {
      thematicCategories: row.thematic_categories || row.metadata?.thematicCategories || [],
      seasonTiming: row.season_timing || row.metadata?.seasonTiming || [],
      coreCompetencies: row.core_competencies || row.metadata?.coreCompetencies || [],
      culturalHeritage: row.cultural_heritage || row.metadata?.culturalHeritage || [],
      locationRequirements: row.location_requirements || row.metadata?.locationRequirements || [],
      activityType: row.activity_type || row.metadata?.activityType || [],
      lessonFormat: row.lesson_format || row.metadata?.lessonFormat || '',
      mainIngredients: row.main_ingredients || row.metadata?.mainIngredients || [],
      skills: row.metadata?.skills || [],
      equipment: row.metadata?.equipment || [],
      duration: row.metadata?.duration,
      groupSize: row.metadata?.groupSize,
      gardenSkills: row.garden_skills || row.metadata?.gardenSkills || [],
      cookingSkills: row.cooking_skills || row.metadata?.cookingSkills || [],
      cookingMethods: row.cooking_methods || row.metadata?.cookingMethods || [],
      observancesHolidays: row.observances_holidays || row.metadata?.observancesHolidays || [],
      academicIntegration: row.academic_integration || row.metadata?.academicIntegration || [],
      socialEmotionalLearning:
        row.social_emotional_learning || row.metadata?.socialEmotionalLearning || [],
      culturalResponsivenessFeatures:
        row.cultural_responsiveness_features ||
        row.metadata?.culturalResponsivenessFeatures ||
        [],
    },
    confidence: row.confidence,
    last_modified: row.last_modified,
    processing_notes: row.processing_notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
