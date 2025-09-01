import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getSearchRpcName } from '@/lib/search';
import type { Lesson, LessonMetadata, SearchFilters } from '@/types';

interface UseLessonSearchOptions {
  filters: SearchFilters;
  pageSize?: number;
}

interface RpcRow {
  lesson_id: string;
  title: string;
  summary: string;
  file_link: string;
  grade_levels: string[];
  metadata: Record<string, any> | null;
  confidence?: Record<string, any>;
  total_count?: number;
}

interface PageResult {
  lessons: Lesson[];
  totalCount: number;
}

function mapRowToLesson(row: RpcRow): Lesson {
  const meta = (row.metadata || {}) as Record<string, any>;
  return {
    lessonId: row.lesson_id,
    title: row.title,
    summary: row.summary || '',
    fileLink: row.file_link,
    gradeLevels: row.grade_levels || [],
    metadata: (meta as LessonMetadata) || ({} as LessonMetadata),
    confidence: {
      overall: (row.confidence as any)?.overall || 0,
      title: (row.confidence as any)?.title || 0,
      summary: (row.confidence as any)?.summary || 0,
      gradeLevels: (row.confidence as any)?.gradeLevels || 0,
    },
  };
}

export function useLessonSearch({ filters, pageSize = 20 }: UseLessonSearchOptions) {
  const rpcName = getSearchRpcName();

  return useInfiniteQuery<PageResult, Error>({
    queryKey: ['lesson-search', rpcName, filters, pageSize],
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.lessons.length, 0);
      return loaded < lastPage.totalCount ? allPages.length : undefined;
    },
    queryFn: async ({ pageParam }) => {
      const currentPage = (pageParam as number) || 0;

      const searchParams: Record<string, any> = {
        search_query: filters.query || undefined,
        filter_grade_levels: filters.gradeLevels?.length ? filters.gradeLevels : undefined,
        filter_themes: filters.thematicCategories?.length
          ? filters.thematicCategories
          : undefined,
        // Note: existing codebase passes `filter_seasonTiming`; preserve for compatibility
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
        page_size: pageSize,
        page_offset: currentPage * pageSize,
      };

      const { data, error } = await supabase.rpc(rpcName, searchParams);
      if (error) throw error;

      const rows = (data || []) as RpcRow[];
      const totalCount = rows.length > 0 && typeof rows[0].total_count === 'number' ? rows[0].total_count! : 0;
      const lessons = rows.map(mapRowToLesson);
      return { lessons, totalCount };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
