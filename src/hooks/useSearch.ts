import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { SearchFilters, Lesson } from '../types';
import {
  matchesCulturalHeritage,
  hasAnyMatch,
  matchesTextSearch,
  matchesActivityType,
  matchesSeasonFilter,
} from '../utils/filterHelpers';
import { logger } from '../utils/logger';

interface UseSearchOptions {
  filters: SearchFilters;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

interface SearchResponse {
  lessons: Lesson[];
  totalCount: number;
  suggestions?: string[];
  expandedQuery?: string;
}

const searchLessonsWithSmartSearch = async ({
  filters,
  page = 1,
  limit = 20,
}: Omit<UseSearchOptions, 'enabled'>): Promise<SearchResponse> => {
  // logger.log('🔍 Searching with filters:', filters);

  // Use the smart search edge function
  const { data, error } = await supabase.functions.invoke('smart-search', {
    body: {
      query: filters.query,
      filters: {
        gradeLevels: filters.gradeLevels,
        thematicCategories: filters.thematicCategories,
        seasons: filters.seasons,
        coreCompetencies: filters.coreCompetencies,
        culturalHeritage: filters.culturalHeritage,
        location: filters.location,
        activityType: filters.activityType,
        lessonFormat: filters.lessonFormat,
        includeAllSeasons: filters.includeAllSeasons,
      },
      page,
      limit,
      sortBy: 'relevance',
    },
  });

  if (error) {
    logger.error('Smart search error:', error);

    // Fallback to direct database search if edge function fails
    // logger.log('🔄 Falling back to direct database search...');
    return await fallbackSearch({ filters, page, limit });
  }

  // logger.log('✅ Smart search results:', data);
  return {
    lessons: data.lessons || [],
    totalCount: data.totalCount || 0,
    suggestions: data.suggestions,
    expandedQuery: data.expandedQuery,
  };
};

// Fallback search function that queries the database directly
const fallbackSearch = async ({
  filters,
  page = 1,
  limit = 20,
}: Omit<UseSearchOptions, 'enabled'>): Promise<SearchResponse> => {
  // logger.log('🔄 Using fallback search...');

  // Get all lessons first, then filter client-side for now
  // In production, this should be moved to a database function for performance
  let query = supabase.from('lessons_with_metadata').select('*', { count: 'exact' });

  const { data, error } = await query;

  if (error) {
    logger.error('Fallback search error:', error);
    throw new Error(`Search failed: ${error.message}`);
  }

  // Transform the data to match our Lesson type
  const allLessons = (data || []).map((row) => ({
    lessonId: row.lesson_id,
    title: row.title,
    summary: row.summary,
    fileLink: row.file_link,
    gradeLevels: row.grade_levels,
    metadata: row.metadata,
    confidence: row.confidence,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  // Apply client-side filtering using the sophisticated logic
  const filteredLessons = await applyAdvancedFiltering(allLessons, filters);

  // Apply pagination
  const offset = (page - 1) * limit;
  const paginatedLessons = filteredLessons.slice(offset, offset + limit);

  // logger.log(
  //   `✅ Fallback search found ${filteredLessons.length} lessons (showing ${paginatedLessons.length})`
  // );

  return {
    lessons: paginatedLessons,
    totalCount: filteredLessons.length,
  };
};

// Advanced filtering function that implements all the sophisticated logic from the original project
const applyAdvancedFiltering = async (
  lessons: Lesson[],
  filters: SearchFilters
): Promise<Lesson[]> => {
  return lessons.filter((lesson) => {
    // Text search with ingredient grouping and preprocessing
    if (filters.query.trim() && !matchesTextSearch(lesson, filters.query.trim())) {
      return false;
    }

    // Grade level filter
    if (filters.gradeLevels.length && !hasAnyMatch(lesson.gradeLevels, filters.gradeLevels)) {
      return false;
    }

    // Thematic categories filter
    if (
      filters.thematicCategories.length &&
      !hasAnyMatch(lesson.metadata.thematicCategories, filters.thematicCategories)
    ) {
      return false;
    }

    // Season filter with "All Seasons" logic
    if (
      filters.seasons.length &&
      !matchesSeasonFilter(lesson, filters.seasons, filters.includeAllSeasons)
    ) {
      return false;
    }

    // Core competencies filter
    if (
      filters.coreCompetencies.length &&
      !hasAnyMatch(lesson.metadata.coreCompetencies, filters.coreCompetencies)
    ) {
      return false;
    }

    // Cultural heritage filter with hierarchical matching
    if (
      filters.culturalHeritage.length &&
      !matchesCulturalHeritage(lesson.metadata.culturalHeritage, filters.culturalHeritage)
    ) {
      return false;
    }

    // Location filter
    if (
      filters.location.length &&
      !hasAnyMatch(lesson.metadata.locationRequirements, filters.location)
    ) {
      return false;
    }

    // Activity type filter based on cooking/garden skills
    if (filters.activityType.length && !matchesActivityType(lesson, filters.activityType)) {
      return false;
    }

    // Lesson format filter
    if (filters.lessonFormat && !lesson.metadata.lessonFormat?.includes(filters.lessonFormat)) {
      return false;
    }

    return true;
  });
};

export const useSearch = ({ filters, page = 1, limit = 20, enabled = true }: UseSearchOptions) => {
  return useQuery({
    queryKey: ['search', filters, page, limit],
    queryFn: () => searchLessonsWithSmartSearch({ filters, page, limit }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook for getting filter counts (facets)
export const useFilterCounts = (filters: SearchFilters) => {
  return useQuery({
    queryKey: ['filter-counts', filters],
    queryFn: async () => {
      // This would be implemented as a separate Supabase function
      // For now, return empty counts
      return {
        gradeLevels: [],
        thematicCategories: [],
        seasons: [],
        coreCompetencies: [],
        culturalHeritage: [],
        location: [],
        activityType: [],
        lessonFormat: [],
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
