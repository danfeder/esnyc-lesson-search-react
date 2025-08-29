import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { SearchFilters, Lesson } from '../types';
import { debounce } from '../utils/debounce';
import { logger } from '../utils/logger';

interface SearchResult {
  lessons: Lesson[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  facets?: Record<string, Record<string, number>>;
}

export function useSupabaseSearch(
  filters: SearchFilters,
  page: number = 1,
  limit: number = 20
): SearchResult {
  const [results, setResults] = useState<Lesson[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(
    debounce(async () => {
      setIsLoading(true);
      setError(null);

      try {
        // IMPORTANT: We must pass ALL parameters to the RPC function
        // If we don't include a parameter, it won't use the DEFAULT value
        const searchParams = {
          search_query: filters.query || undefined,
          filter_grade_levels: filters.gradeLevels?.length ? filters.gradeLevels : undefined,
          filter_themes: filters.thematicCategories?.length
            ? filters.thematicCategories
            : undefined,
          filter_seasonTiming: filters.seasonTiming?.length ? filters.seasonTiming : undefined,
          filter_competencies: filters.coreCompetencies?.length
            ? filters.coreCompetencies
            : undefined,
          filter_cultures: filters.culturalHeritage?.length ? filters.culturalHeritage : undefined,
          filter_location: filters.location?.length ? filters.location : undefined,
          filter_activity_type: filters.activityType?.length ? filters.activityType : undefined,
          filter_lesson_format: filters.lessonFormat || undefined,
          filter_academic: filters.academicIntegration?.length
            ? filters.academicIntegration
            : undefined,
          filter_sel: filters.socialEmotionalLearning?.length
            ? filters.socialEmotionalLearning
            : undefined,
          filter_cooking_method: filters.cookingMethods || undefined,
          page_size: limit,
          page_offset: (page - 1) * limit,
        };

        // Call our PostgreSQL search function
        const { data, error: searchError } = await supabase.rpc('search_lessons', searchParams);

        if (searchError) throw searchError;

        // Transform the results to match our Lesson type
        const lessons: Lesson[] =
          data?.map((row: any) => ({
            lessonId: row.lesson_id,
            title: row.title,
            summary: row.summary,
            fileLink: row.file_link,
            gradeLevels: row.grade_levels,
            metadata: row.metadata,
            confidence: row.confidence || { overall: 0 },
          })) || [];

        // Get total count from first result (our function returns it with each row)
        const total = data?.[0]?.total_count || 0;

        setResults(lessons);
        setTotalCount(total);
      } catch (err) {
        logger.error('Search error details:', err);
        if (err && typeof err === 'object' && 'message' in err) {
          logger.error('Error message:', err.message);
        }
        if (err && typeof err === 'object' && 'details' in err) {
          logger.error('Error details:', err.details);
        }
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [filters, page, limit]
  );

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  return {
    lessons: results,
    totalCount,
    isLoading,
    error,
  };
}
