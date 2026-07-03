import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { mapRowToLesson, type RpcRow } from '@/hooks/useLessonSearch';
import type { Lesson } from '@/types';

interface UseLessonByIdOptions {
  enabled?: boolean;
}

/**
 * D2 (lesson permalinks): fetch a single lesson by its `lesson_id` — the
 * deep-link fallback for `/lesson/:lessonId` when the routed lesson is not in
 * the already-loaded search pages. Anon-readable per RLS ("Lessons are viewable
 * by everyone"), so shared permalinks work logged-out.
 *
 * `.is('retired_at', null)` mirrors the search RPC's public-visibility rule —
 * WITHOUT it, permalinks would resurrect the retired (T4c-deduped) lessons that
 * search deliberately hides. Pinned by useLessonById.test.tsx.
 *
 * `maybeSingle()` (not `single()`) so an unknown id resolves to a clean `null`
 * ("not found") instead of a thrown PGRST116.
 */
export function useLessonById(lessonId: string | null, options: UseLessonByIdOptions = {}) {
  return useQuery<Lesson | null, Error>({
    queryKey: ['lesson', lessonId],
    enabled: (options.enabled ?? true) && !!lessonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('lesson_id, title, summary, file_link, grade_levels, metadata')
        .eq('lesson_id', lessonId!)
        .is('retired_at', null)
        .maybeSingle();
      if (error) throw error;
      return data ? mapRowToLesson(data as unknown as RpcRow) : null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
