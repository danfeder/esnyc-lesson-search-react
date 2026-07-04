import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { computeTrueFacetCounts, type FacetCounts, type FacetLesson } from '@/utils/facetCounts';
import type { SearchFilters } from '@/types';

/**
 * The eleven facet-relevant `text[]` columns — and nothing else (no lesson_id,
 * no metadata JSONB, no summary). The search RPC filters on exactly these raw
 * columns (never the JSONB), so counting from them is the definition of
 * click-truth. ~700 rows × ~0.5 KB ≈ 350 KB raw / ~40-70 KB gzipped, once per
 * session.
 */
export const FACET_COLUMNS =
  'grade_levels, activity_type, location_requirements, main_ingredients, ' +
  'thematic_categories, season_timing, core_competencies, cultural_heritage, ' +
  'academic_integration, social_emotional_learning, cooking_methods';

/**
 * Explicit fetch cap (PostgREST's hosted default max-rows is 1000; the live
 * corpus is ~700). This is a truncation tripwire, not a pagination scheme —
 * if the library ever approaches 1000 lessons, revisit.
 */
export const FACET_CORPUS_MAX = 1000;

interface FacetCorpusRow {
  grade_levels: string[] | null;
  activity_type: string[] | null;
  location_requirements: string[] | null;
  main_ingredients: string[] | null;
  thematic_categories: string[] | null;
  season_timing: string[] | null;
  core_competencies: string[] | null;
  cultural_heritage: string[] | null;
  academic_integration: string[] | null;
  social_emotional_learning: string[] | null;
  cooking_methods: string[] | null;
}

function rowToFacetLesson(row: FacetCorpusRow): FacetLesson {
  return {
    gradeLevels: row.grade_levels ?? [],
    metadata: {
      activityType: row.activity_type ?? [],
      locationRequirements: row.location_requirements ?? [],
      mainIngredients: row.main_ingredients ?? [],
      thematicCategories: row.thematic_categories ?? [],
      seasonTiming: row.season_timing ?? [],
      coreCompetencies: row.core_competencies ?? [],
      culturalHeritage: row.cultural_heritage ?? [],
      academicIntegration: row.academic_integration ?? [],
      socialEmotionalLearning: row.social_emotional_learning ?? [],
      cookingMethods: row.cooking_methods ?? [],
    },
  };
}

async function fetchFacetCorpus(): Promise<FacetLesson[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select(FACET_COLUMNS)
    // Load-bearing: the lessons SELECT RLS policy is `USING (true)` for
    // everyone, so retired rows ARE anon-visible via direct select. This
    // clause mirrors `search_lessons`' ONLY liveness gate — `AND l.retired_at
    // IS NULL` (20260629010000_c41_pr_d_two_pass_relax.sql:268/311-312/401-402)
    // — nothing more, nothing less.
    .is('retired_at', null)
    .limit(FACET_CORPUS_MAX);

  if (error) {
    logger.error('facet corpus fetch failed:', error);
    throw error;
  }

  // The typed client can't parse the concatenated column-list literal, so it
  // falls back to an error sentinel type — the runtime rows ARE the 11 columns
  // above (all `string[] | null` on the lessons Row).
  const rows = (data ?? []) as unknown as FacetCorpusRow[];
  if (rows.length === FACET_CORPUS_MAX) {
    logger.warn('facet corpus hit fetch cap — counts may be truncated');
  }
  return rows.map(rowToFacetLesson);
}

/**
 * TRUE facet-count badges (FP-01b): fetches a slim 11-column select of every
 * non-retired lesson ONCE per tab session and computes, per rendered filter
 * option, how many lessons in the whole library match it under the server's
 * matching rules AND every OTHER active filter category (see facetCounts.ts
 * for the badge contract, incl. why the free-text query is ignored).
 *
 * Returns `undefined` until the corpus has loaded (or if the fetch failed) —
 * badges render blank in that window, never fake zeros. Filter toggles
 * recompute purely client-side (zero network).
 */
export function useFacetCounts(filters: SearchFilters): FacetCounts | undefined {
  // staleTime/gcTime Infinity: the corpus changes at most a few times a week;
  // a newly approved lesson shows up in badges on the next full page load.
  // If same-session freshness is ever wanted, flip staleTime to e.g.
  // 10 * 60 * 1000 — one line. (App default already has
  // refetchOnWindowFocus: false.)
  const { data: corpus } = useQuery({
    queryKey: ['facet-corpus'],
    queryFn: fetchFacetCorpus,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Pure recompute on filter toggles over the session-cached corpus. The
  // rows→FacetLesson mapping already happened once, inside queryFn, so this
  // memo's only work is the counting pass (low-single-digit ms at ~700 rows).
  return useMemo(
    () => (corpus ? computeTrueFacetCounts(corpus, filters) : undefined),
    [corpus, filters]
  );
}
