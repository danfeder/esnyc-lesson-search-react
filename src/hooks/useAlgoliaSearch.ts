import { useState, useEffect, useCallback, useMemo } from 'react';
import { algoliaClient } from '../lib/algolia';
import type { SearchFilters, Lesson } from '../types';
import type { LessonSearchParams, AlgoliaLessonHit } from '../types/algolia';
import { debounce } from '../utils/debounce';

// Sanitize error messages to be user-friendly
const sanitizeError = (error: unknown): string => {
  if (error instanceof Error) {
    // Map known errors to user-friendly messages
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Unable to connect to search service. Please check your internet connection and try again.';
    }
    if (error.message.includes('timeout')) {
      return 'Search request timed out. Please try again.';
    }
    if (error.message.includes('quota') || error.message.includes('rate')) {
      return 'Search service is temporarily unavailable. Please try again in a few moments.';
    }
    if (error.message.includes('index') || error.message.includes('404')) {
      return 'Search configuration error. Please contact support.';
    }
    // Log the actual error for debugging but return generic message
    console.error('Search error details:', error);
  }
  return 'An error occurred while searching. Please try again.';
};

interface AlgoliaSearchResult {
  lessons: Lesson[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  facets?: Record<string, Record<string, number>>;
}

export function useAlgoliaSearch(
  filters: SearchFilters,
  page: number = 1,
  limit: number = 20
): AlgoliaSearchResult {
  const [results, setResults] = useState<Lesson[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<Record<string, Record<string, number>>>({});

  // Memoize individual filter builders for better performance
  const gradeFilter = useMemo(() => {
    if (!filters.gradeLevels?.length) return '';
    return filters.gradeLevels.map((grade) => `gradeLevels:"${grade}"`).join(' OR ');
  }, [filters.gradeLevels]);

  const themeFilter = useMemo(() => {
    if (!filters.thematicCategories?.length) return '';
    return filters.thematicCategories
      .map((cat) => `metadata.thematicCategories:"${cat}"`)
      .join(' OR ');
  }, [filters.thematicCategories]);

  const seasonFilter = useMemo(() => {
    if (!filters.seasons?.length) return '';
    return filters.seasons.map((season) => `metadata.seasonTiming:"${season}"`).join(' OR ');
  }, [filters.seasons]);

  const competencyFilter = useMemo(() => {
    if (!filters.coreCompetencies?.length) return '';
    return filters.coreCompetencies
      .map((comp) => `metadata.coreCompetencies:"${comp}"`)
      .join(' OR ');
  }, [filters.coreCompetencies]);

  const cultureFilter = useMemo(() => {
    if (!filters.culturalHeritage?.length) return '';
    return filters.culturalHeritage
      .map((culture) => `metadata.culturalHeritage:"${culture}"`)
      .join(' OR ');
  }, [filters.culturalHeritage]);

  const locationFilter = useMemo(() => {
    if (!filters.location?.length) return '';
    return filters.location.map((loc) => `metadata.locationRequirements:"${loc}"`).join(' OR ');
  }, [filters.location]);

  const activityFilter = useMemo(() => {
    if (!filters.activityType?.length) return '';
    return filters.activityType.map((type) => `metadata.activityType:"${type}"`).join(' OR ');
  }, [filters.activityType]);

  const formatFilter = useMemo(() => {
    if (!filters.lessonFormat?.length) return '';
    return filters.lessonFormat.map((format) => `metadata.lessonFormat:"${format}"`).join(' OR ');
  }, [filters.lessonFormat]);

  const academicFilter = useMemo(() => {
    if (!filters.academicIntegration?.length) return '';
    return filters.academicIntegration
      .map((subject) => `metadata.academicIntegration.selected:"${subject}"`)
      .join(' OR ');
  }, [filters.academicIntegration]);

  const selFilter = useMemo(() => {
    if (!filters.socialEmotionalLearning?.length) return '';
    return filters.socialEmotionalLearning
      .map((sel) => `metadata.socialEmotionalLearning:"${sel}"`)
      .join(' OR ');
  }, [filters.socialEmotionalLearning]);

  const cookingMethodsFilter = useMemo(() => {
    if (!filters.cookingMethods) return '';
    return `metadata.cookingMethods:"${filters.cookingMethods}"`;
  }, [filters.cookingMethods]);

  // Combine all filters into final Algolia filter string
  const algoliaFilterString = useMemo(() => {
    const parts = [
      gradeFilter,
      themeFilter,
      seasonFilter,
      competencyFilter,
      cultureFilter,
      locationFilter,
      activityFilter,
      formatFilter,
      academicFilter,
      selFilter,
      cookingMethodsFilter,
    ].filter(Boolean);

    return parts.map((part) => `(${part})`).join(' AND ');
  }, [
    gradeFilter,
    themeFilter,
    seasonFilter,
    competencyFilter,
    cultureFilter,
    locationFilter,
    activityFilter,
    formatFilter,
    academicFilter,
    selFilter,
    cookingMethodsFilter,
  ]);

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (query: string, filterString: string, currentPage: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const searchParams: LessonSearchParams = {
          query,
          filters: filterString,
          page: currentPage - 1, // Algolia uses 0-based pages
          hitsPerPage: limit,
          // Get facet counts
          facets: [
            'gradeLevels',
            'metadata.thematicCategories',
            'metadata.seasonTiming',
            'metadata.culturalHeritage',
            'metadata.activityType',
            'metadata.locationRequirements',
            'metadata.coreCompetencies',
            'metadata.lessonFormat',
            'metadata.academicIntegration.selected',
            'metadata.socialEmotionalLearning',
            'metadata.cookingMethods',
          ],
        };

        // Debug logging
        // console.log('Algolia search params:', searchParams);

        // Use v5 searchSingleIndex method
        const searchResults = await algoliaClient.searchSingleIndex({
          indexName: 'lessons',
          searchParams,
        });

        // Debug logging
        // console.log('Algolia search results:', {
        //   hits: searchResults.hits.length,
        //   nbHits: searchResults.nbHits,
        //   query: searchResults.query,
        // });

        // Transform Algolia results to match our Lesson type
        const transformedLessons: Lesson[] = searchResults.hits.map((hit) => {
          const algoliaHit = hit as unknown as AlgoliaLessonHit;
          return {
            lessonId: algoliaHit.lessonId,
            title: algoliaHit.title,
            summary: algoliaHit.summary,
            fileLink: algoliaHit.fileLink,
            metadata: algoliaHit.metadata,
            gradeLevels: algoliaHit.gradeLevels,
            confidence: {
              overall: algoliaHit.confidence.overall,
              title: algoliaHit.confidence.byCategory?.title || 0,
              summary: algoliaHit.confidence.byCategory?.summary || 0,
              gradeLevels: algoliaHit.confidence.byCategory?.gradeLevels || 0,
            },
          };
        });

        setResults(transformedLessons);
        setTotalCount(searchResults.nbHits || 0);

        // Set facet counts if available
        if (searchResults.facets) {
          setFacets(searchResults.facets);
        }
      } catch (err) {
        setError(sanitizeError(err));
        setResults([]);
        setTotalCount(0);
        setFacets({});
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [limit]
  );

  // Trigger search when filters or page changes
  useEffect(() => {
    const query = filters.query || '';
    performSearch(query, algoliaFilterString, page);
  }, [filters.query, algoliaFilterString, page, performSearch]);

  return {
    lessons: results,
    totalCount,
    isLoading,
    error,
    facets,
  };
}
