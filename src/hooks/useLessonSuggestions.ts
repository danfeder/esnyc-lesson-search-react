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

export function useLessonSuggestions({
  filters,
  enabled = true,
}: UseLessonSuggestionsOptions) {
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
      const { data, error } = await supabase.functions.invoke('smart-search', {
        body: {
          query,
          filters: {
            gradeLevels: filters.gradeLevels,
            thematicCategories: filters.thematicCategories,
            seasonTiming: filters.seasonTiming,
            coreCompetencies: filters.coreCompetencies,
            culturalHeritage: filters.culturalHeritage,
            location: filters.location,
            activityType: filters.activityType,
            lessonFormat: filters.lessonFormat,
          },
          // no need for paging here; we only need suggestions
          limit: 0,
        },
      });

      if (error) {
        // Hide suggestions on error; keep UI quiet
        return { suggestions: [] };
      }

      return {
        suggestions: Array.isArray((data as any)?.suggestions)
          ? ((data as any).suggestions as string[])
          : [],
        expandedQuery: (data as any)?.expandedQuery,
      };
    },
  });
}

