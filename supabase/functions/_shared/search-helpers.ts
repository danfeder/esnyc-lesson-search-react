/**
 * Shared search helpers for the smart-search edge function (zero-result
 * suggestions).
 *
 * smart-search counts matching rows of `lessons_with_metadata` after
 * `applyFilters`; it no longer pages, sorts or returns rows — public search
 * uses the `search_lessons` RPC.
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
  tags?: string[];
  includeAllSeasons?: boolean;
}

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

  if (filters.tags?.length) {
    q = q.overlaps('tags', filters.tags);
  }

  return q;
}
