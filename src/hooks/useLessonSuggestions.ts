import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { parseSearchQuery } from '@/utils/parseSearchQuery';
import type { SearchFilters } from '@/types';

interface SuggestionResponse {
  suggestions: string[];
  expandedQuery?: string;
}

interface UseLessonSuggestionsOptions {
  filters: SearchFilters;
  enabled?: boolean;
}

export function useLessonSuggestions({ filters, enabled = true }: UseLessonSuggestionsOptions) {
  // Expand the SAME cleaned query the results RPC actually searches
  // (useLessonSearch also runs parseSearchQuery). Sending the RAW query here let
  // smart-search's bidirectional reverse index fold in synonyms of stripped
  // FILLER words — e.g. the live `activity → [activities, lesson, lessons,
  // project, projects]` row means raw "compost lesson" expands to activity/project,
  // which the cleaned "compost" search never matched, making the FP-19 hint lie.
  const query = parseSearchQuery(filters.query ?? '').cleanedQuery;
  const isEnabled = enabled && query.length > 0;

  return useQuery<SuggestionResponse, Error>({
    queryKey: [
      'lesson-suggestions',
      query,
      // include relevant filters to avoid stale suggestions when filters impact suggestions later
      filters.gradeLevels,
      filters.thematicCategories,
      filters.seasonTiming,
      filters.coreCompetencies,
      filters.culturalHeritage,
      filters.location,
      filters.activityType,
      filters.academicIntegration,
      filters.socialEmotionalLearning,
      filters.cookingMethods,
    ],
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      interface SmartSearchResponse {
        suggestions?: string[];
        expandedQuery?: string;
      }

      const { data, error } = await supabase.functions.invoke('smart-search', {
        body: {
          query,
          filters: {
            gradeLevels: filters.gradeLevels,
            thematicCategories: filters.thematicCategories,
            // Edge Function expects `seasons`
            seasons: filters.seasonTiming,
            coreCompetencies: filters.coreCompetencies,
            culturalHeritage: filters.culturalHeritage,
            location: filters.location,
            activityType: filters.activityType,
            academicIntegration: filters.academicIntegration,
            socialEmotionalLearning: filters.socialEmotionalLearning,
            cookingMethods: filters.cookingMethods,
          },
          // We only need suggestions/expandedQuery, never the rows — but
          // smart-search coerces `limit: 0` up to 20 (rung8-hooks F1), so ask
          // for the smallest honest page instead. Semantics are identical: the
          // server only populates `suggestions` when its own search returns 0
          // rows, so 1 vs 20 rows never changes what we read — it just stops
          // serializing 19 discarded rows on the hottest interactive path.
          limit: 1,
        },
      });

      if (error) {
        // rung8-hooks F2: THROW (don't return an empty success). Returning here
        // cached a transient edge failure as a fresh 5-min success, so the
        // no-results recovery pills stayed gone even after the function healed,
        // with nothing logged. Throwing lets React Query retry (global retry:1)
        // and refetch normally; the sole consumer reads only `data`, so the UI
        // stays quiet on error either way. Log at debug for observability.
        logger.debug('smart-search suggestions request failed', error);
        throw error;
      }

      const payload = (data as SmartSearchResponse) || {};
      return {
        suggestions: Array.isArray(payload.suggestions) ? payload.suggestions! : [],
        expandedQuery: payload.expandedQuery,
      };
    },
  });
}
