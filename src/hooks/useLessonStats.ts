import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface LessonStats {
  totalLessons: number;
  totalCategories: number;
  isLoading: boolean;
  error: string | null;
}

export function useLessonStats(): LessonStats {
  const [stats, setStats] = useState<LessonStats>({
    totalLessons: 0,
    totalCategories: 11, // Current filter count - see filterDefinitions.ts
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total lesson count
        const { count, error } = await supabase
          .from('lessons_with_metadata')
          .select('*', { count: 'exact', head: true });

        if (error) throw error;

        setStats({
          totalLessons: count || 0,
          totalCategories: 11,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        logger.error('Error fetching lesson stats:', err);
        setStats((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch stats',
        }));
      }
    };

    fetchStats();
  }, []);

  return stats;
}
