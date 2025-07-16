import { useState, useEffect, useCallback } from 'react';
import { algoliaClient } from '../lib/algolia';
import type { SearchFilters, Lesson } from '../types';
import { debounce } from '../utils/debounce';

interface AlgoliaSearchResult {
  lessons: Lesson[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
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

  // Build Algolia filters from our filter state
  const buildAlgoliaFilters = useCallback(() => {
    const algoliaFilters: string[] = [];

    // Grade levels
    if (filters.gradeLevels?.length) {
      const gradeFilter = filters.gradeLevels
        .map((grade) => `gradeLevels:"${grade}"`)
        .join(' OR ');
      algoliaFilters.push(`(${gradeFilter})`);
    }

    // Thematic categories
    if (filters.thematicCategories?.length) {
      const themeFilter = filters.thematicCategories
        .map((cat) => `metadata.thematicCategories:"${cat}"`)
        .join(' OR ');
      algoliaFilters.push(`(${themeFilter})`);
    }

    // Seasons
    if (filters.seasons?.length) {
      const seasonFilter = filters.seasons
        .map((season) => `metadata.seasonTiming:"${season}"`)
        .join(' OR ');
      algoliaFilters.push(`(${seasonFilter})`);
    }

    // Core competencies
    if (filters.coreCompetencies?.length) {
      const competencyFilter = filters.coreCompetencies
        .map((comp) => `metadata.coreCompetencies:"${comp}"`)
        .join(' OR ');
      algoliaFilters.push(`(${competencyFilter})`);
    }

    // Cultural heritage
    if (filters.culturalHeritage?.length) {
      const cultureFilter = filters.culturalHeritage
        .map((culture) => `metadata.culturalHeritage:"${culture}"`)
        .join(' OR ');
      algoliaFilters.push(`(${cultureFilter})`);
    }

    // Location
    if (filters.location?.length) {
      const locationFilter = filters.location
        .map((loc) => `metadata.locationRequirements:"${loc}"`)
        .join(' OR ');
      algoliaFilters.push(`(${locationFilter})`);
    }

    // Activity type
    if (filters.activityType?.length) {
      const activityFilter = filters.activityType
        .map((type) => `metadata.activityType:"${type}"`)
        .join(' OR ');
      algoliaFilters.push(`(${activityFilter})`);
    }

    // Lesson format
    if (filters.lessonFormat?.length) {
      const formatFilter = filters.lessonFormat
        .map((format) => `metadata.lessonFormat:"${format}"`)
        .join(' OR ');
      algoliaFilters.push(`(${formatFilter})`);
    }

    return algoliaFilters.join(' AND ');
  }, [filters]);

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (query: string, filterString: string, currentPage: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const searchParams = {
          query,
          filters: filterString,
          page: currentPage - 1, // Algolia uses 0-based pages
          hitsPerPage: limit,
          // Enable typo tolerance and synonyms
          typoTolerance: true,
          // Get facet counts
          facets: [
            'gradeLevels',
            'metadata.thematicCategories',
            'metadata.seasonTiming',
            'metadata.culturalHeritage',
          ],
        };

        // Use v5 searchSingleIndex method
        const searchResults = await algoliaClient.searchSingleIndex({
          indexName: 'lessons',
          searchParams: searchParams as any,
        });

        // Transform Algolia results to match our Lesson type
        const transformedLessons = searchResults.hits.map((hit: any) => ({
          lessonId: hit.lessonId,
          title: hit.title,
          summary: hit.summary,
          fileLink: hit.fileLink,
          metadata: hit.metadata,
          gradeLevels: hit.gradeLevels,
          confidence: hit.confidence,
        }));

        setResults(transformedLessons);
        setTotalCount(searchResults.nbHits);
      } catch (err) {
        console.error('Algolia search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [limit]
  );

  // Trigger search when filters or page changes
  useEffect(() => {
    const query = filters.query || '';
    const filterString = buildAlgoliaFilters();
    performSearch(query, filterString, page);
  }, [filters, page, buildAlgoliaFilters, performSearch]);

  return {
    lessons: results,
    totalCount,
    isLoading,
    error,
  };
}