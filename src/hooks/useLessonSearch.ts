import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getSearchRpcName } from '@/lib/search';
import { parseSearchQuery } from '@/utils/parseSearchQuery';
import type { Lesson, LessonMetadata, SearchFilters, ViewState } from '@/types';

interface UseLessonSearchOptions {
  filters: SearchFilters;
  pageSize?: number;
  /**
   * C58: the active sort, passed straight through to the RPC's `order_by`
   * param. The RPC normalizes anything outside relevance/title/modified
   * (incl. a stale persisted 'grade'/'confidence') back to relevance, so no
   * client-side mapping is needed. Defaults to relevance.
   */
  sortBy?: ViewState['sortBy'];
  /**
   * W1c: SearchPage passes `hydrated` (from useUrlSync) so a shared/bookmarked
   * link doesn't fire a default empty-filter RPC before the URL has been applied
   * to the store (which would flash a false "No matches"). Defaults to `true`
   * for back-compat with every existing caller/test that doesn't pass it — those
   * behave exactly as before (always enabled).
   */
  enabled?: boolean;
}

interface ConfidenceScores {
  overall?: number;
  title?: number;
  summary?: number;
  gradeLevels?: number;
}

interface RpcRow {
  lesson_id: string;
  title: string;
  summary: string;
  file_link: string;
  grade_levels: string[];
  metadata: Record<string, unknown> | null;
  confidence?: ConfidenceScores;
  total_count?: number;
}

type SearchParamValue = string | string[] | number | undefined;

interface PageResult {
  lessons: Lesson[];
  totalCount: number;
}

export function normalizeMetadata(
  meta: Record<string, unknown> | null | undefined
): LessonMetadata {
  const m = meta || {};
  const asArray = (v: unknown): string[] => (Array.isArray(v) ? v : v ? [String(v)] : []);
  return {
    thematicCategories: asArray(m.thematicCategories),
    seasonTiming: asArray(m.seasonTiming),
    coreCompetencies: asArray(m.coreCompetencies),
    culturalHeritage: asArray(m.culturalHeritage),
    locationRequirements: asArray(m.locationRequirements),
    activityType: asArray(m.activityType),
    mainIngredients: asArray(m.mainIngredients),
    skills: asArray(m.skills),
    equipment: asArray(m.equipment),
    duration: typeof m.duration === 'string' ? m.duration : undefined,
    groupSize: typeof m.groupSize === 'string' ? m.groupSize : undefined,
    gradeLevel: asArray(m.gradeLevel),
    gardenSkills: asArray(m.gardenSkills),
    cookingSkills: asArray(m.cookingSkills),
    cookingMethods: asArray(m.cookingMethods),
    observancesHolidays: asArray(m.observancesHolidays),
    academicIntegration: (() => {
      const ai = m.academicIntegration;
      if (Array.isArray(ai)) return ai as string[];
      if (ai && typeof ai === 'object' && Array.isArray((ai as { selected?: unknown }).selected)) {
        return (ai as { selected: string[] }).selected;
      }
      return [];
    })(),
    socialEmotionalLearning: asArray(m.socialEmotionalLearning),
    culturalResponsivenessFeatures: asArray(m.culturalResponsivenessFeatures),
  } as LessonMetadata;
}

function mapRowToLesson(row: RpcRow): Lesson {
  return {
    lessonId: row.lesson_id,
    title: row.title,
    summary: row.summary || '',
    fileLink: row.file_link,
    gradeLevels: Array.isArray(row.grade_levels) ? row.grade_levels : [],
    metadata: normalizeMetadata(row.metadata),
    confidence: {
      overall: row.confidence?.overall ?? 0,
      title: row.confidence?.title ?? 0,
      summary: row.confidence?.summary ?? 0,
      gradeLevels: row.confidence?.gradeLevels ?? 0,
    },
  };
}

export function useLessonSearch({
  filters,
  pageSize = 20,
  sortBy = 'relevance',
  enabled = true,
}: UseLessonSearchOptions) {
  const rpcName = getSearchRpcName();

  // Preprocess the raw search box term: strip filler + route grade cues (S1.2).
  // Pure + deterministic from `filters`, so the existing queryKey still fully
  // determines the derived RPC call (caching stays correct).
  const { cleanedQuery, detectedGrades } = parseSearchQuery(filters.query ?? '');
  // Safety invariant (design §5): an explicit user grade filter ALWAYS wins over
  // a grade detected in the free-text query.
  const hasExplicitGradeFilter = (filters.gradeLevels?.length ?? 0) > 0;
  const effectiveGradeLevels = hasExplicitGradeFilter ? filters.gradeLevels : detectedGrades;

  return useInfiniteQuery<PageResult, Error>({
    queryKey: ['lesson-search', rpcName, filters, sortBy, pageSize],
    // W1c: when disabled (SearchPage's pre-hydration window) the query stays in
    // `status:'pending'` (TanStack v5) without fetching, so SearchPage's C59
    // skeleton branch wins over a false "No matches" until hydration enables it.
    enabled,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.lessons.length, 0);
      return loaded < lastPage.totalCount ? allPages.length : undefined;
    },
    queryFn: async ({ pageParam }) => {
      const currentPage = (pageParam as number) || 0;

      const searchParams: Record<string, SearchParamValue> = {
        search_query: cleanedQuery || undefined,
        filter_grade_levels: effectiveGradeLevels?.length ? effectiveGradeLevels : undefined,
        filter_themes: filters.thematicCategories?.length ? filters.thematicCategories : undefined,
        // Season filter: RPC expects `filter_seasons`
        filter_seasons: filters.seasonTiming?.length ? filters.seasonTiming : undefined,
        filter_competencies: filters.coreCompetencies?.length
          ? filters.coreCompetencies
          : undefined,
        filter_cultures: filters.culturalHeritage?.length ? filters.culturalHeritage : undefined,
        filter_location: filters.location?.length ? filters.location : undefined,
        filter_activity_type: filters.activityType?.length ? filters.activityType : undefined,
        filter_academic: filters.academicIntegration?.length
          ? filters.academicIntegration
          : undefined,
        filter_sel: filters.socialEmotionalLearning?.length
          ? filters.socialEmotionalLearning
          : undefined,
        filter_cooking_method: filters.cookingMethods?.length ? filters.cookingMethods : undefined,
        // C58: pass the active sort straight through; the RPC's ELSE→relevance
        // branch safely handles any stale value (e.g. a persisted 'grade').
        order_by: sortBy,
        page_size: pageSize,
        page_offset: currentPage * pageSize,
      };

      const { data, error } = await supabase.rpc(rpcName, searchParams);
      if (error) throw error;

      const rows = (data || []) as RpcRow[];
      const totalCount =
        rows.length > 0 && typeof rows[0].total_count === 'number' ? rows[0].total_count! : 0;
      const lessons = rows.map(mapRowToLesson);
      return { lessons, totalCount };
    },
    // C59: keep the prior results on screen while a queryKey change (debounced
    // keystroke / filter toggle) refetches, instead of blanking `data` and
    // flashing a false "No matches". `isPending` then stays true ONLY on cold
    // load (no cached or placeholder data), letting SearchPage cleanly tell a
    // cold load (show skeleton) apart from a refetch (keep prior results).
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
