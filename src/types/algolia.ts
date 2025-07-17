import type { SearchResponse, SearchParams } from 'algoliasearch';
import type { LessonMetadata } from './index';

/**
 * Algolia search parameters with required facets
 */
export interface LessonSearchParams extends Omit<SearchParams, 'facets'> {
  query: string;
  filters: string;
  page: number;
  hitsPerPage: number;
  facets: string[];
}

/**
 * Algolia hit structure for lessons
 */
export interface AlgoliaLessonHit {
  objectID: string;
  lessonId: string;
  title: string;
  summary: string;
  fileLink: string;
  gradeLevels: string[];
  metadata: LessonMetadata;
  confidence: {
    overall: number;
    byCategory?: Record<string, number>;
  };
  mainIngredients?: string[];
  thematicCategories?: string[];
  culturalHeritage?: string[];
  skills?: string[];
}

/**
 * Algolia search response for lessons
 */
export type LessonSearchResponse = SearchResponse<AlgoliaLessonHit>;