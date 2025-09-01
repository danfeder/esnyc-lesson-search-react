import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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
  const query = (filters.query || '').trim();
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
      filters.lessonFormat,
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
            lessonFormat: filters.lessonFormat,
            academicIntegration: filters.academicIntegration,
            socialEmotionalLearning: filters.socialEmotionalLearning,
            cookingMethods: filters.cookingMethods,
          },
          // no need for paging here; we only need suggestions
          limit: 0,
        },
      });

      if (error) {
        // Hide suggestions on error; keep UI quiet
        return { suggestions: [] };
      }

      const payload = (data as SmartSearchResponse) || {};
      return {
        suggestions: Array.isArray(payload.suggestions) ? payload.suggestions! : [],
        expandedQuery: payload.expandedQuery,
      };
    },
  });
}
