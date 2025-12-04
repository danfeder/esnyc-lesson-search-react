/**
 * Duplicate Group Service
 *
 * Handles fetching, grouping, and managing duplicate lesson groups.
 * Uses SQL functions for detection and TypeScript union-find for grouping.
 */

import { supabase } from '@/lib/supabase';
import { UnionFind } from '@/utils/duplicateDetection';
import { logger } from '@/utils/logger';

// Types for duplicate pairs from database
export interface DuplicatePair {
  id1: string;
  id2: string;
  title1: string;
  title2: string;
  detection_method: 'both' | 'same_title' | 'embedding';
  similarity: number | null;
}

// Types for lesson details
export interface LessonForReview {
  lesson_id: string;
  title: string;
  summary: string | null;
  content_length: number;
  grade_levels: string[] | null;
  has_table_format: boolean;
  has_summary: boolean;
  file_link: string | null;
  content_preview: string | null;
}

// Types for grouped duplicates (for review UI)
// Named distinctly from DuplicateGroup in admin.ts and duplicateDetection.ts
// which will be removed in Phase 4
export interface DuplicateGroupForReview {
  groupId: string;
  lessonIds: string[];
  lessons: LessonForReview[];
  detectionMethod: 'both' | 'same_title' | 'embedding' | 'mixed';
  confidence: 'high' | 'medium' | 'low';
  avgSimilarity: number | null;
  pairCount: number;
}

// Resolution types
export type ResolutionAction = 'keep' | 'archive';

export interface LessonResolution {
  lessonId: string;
  action: ResolutionAction;
  archiveTo?: string; // The lesson ID to link as canonical
}

export interface GroupResolution {
  groupId: string;
  resolutions: LessonResolution[];
  notes?: string;
}

/**
 * Fetch all duplicate pairs from the database using the SQL function.
 */
export async function fetchDuplicatePairs(): Promise<DuplicatePair[]> {
  const { data, error } = await supabase.rpc('find_duplicate_pairs');

  if (error) {
    logger.error('Error fetching duplicate pairs:', error);
    throw error;
  }

  // Validate and cast detection_method with runtime check
  const validMethods = ['both', 'same_title', 'embedding'] as const;

  return (data || []).map((pair) => {
    const method = pair.detection_method;
    if (!validMethods.includes(method as (typeof validMethods)[number])) {
      logger.warn(
        `Unexpected detection_method from database: ${method}, defaulting to 'embedding'`
      );
      return { ...pair, detection_method: 'embedding' as const };
    }
    return { ...pair, detection_method: method as DuplicatePair['detection_method'] };
  });
}

/**
 * Group duplicate pairs into transitive clusters using union-find.
 * A↔B and B↔C becomes {A, B, C}
 */
export function groupPairsIntoGroups(pairs: DuplicatePair[]): Map<string, DuplicatePair[]> {
  const uf = new UnionFind();

  // Add all pairs to union-find
  for (const pair of pairs) {
    uf.union(pair.id1, pair.id2);
  }

  // Get all unique lesson IDs
  const allLessonIds = new Set<string>();
  for (const pair of pairs) {
    allLessonIds.add(pair.id1);
    allLessonIds.add(pair.id2);
  }

  // Map pairs to their groups (using union-find root as key)
  const groupPairs = new Map<string, DuplicatePair[]>();

  for (const pair of pairs) {
    const root = uf.find(pair.id1);
    if (!groupPairs.has(root)) {
      groupPairs.set(root, []);
    }
    groupPairs.get(root)!.push(pair);
  }

  return groupPairs;
}

/**
 * Fetch lesson details for review.
 */
export async function fetchLessonDetails(lessonIds: string[]): Promise<LessonForReview[]> {
  const { data, error } = await supabase.rpc('get_lesson_details_for_review', {
    p_lesson_ids: lessonIds,
  });

  if (error) {
    logger.error('Error fetching lesson details:', error);
    throw error;
  }

  return data || [];
}

/**
 * Check if a group has already been resolved or dismissed.
 */
export async function checkGroupResolved(
  lessonIds: string[]
): Promise<{ isResolved: boolean; resolutionType?: string; resolvedAt?: string }> {
  const { data, error } = await supabase.rpc('check_group_already_resolved', {
    p_lesson_ids: lessonIds,
  });

  if (error) {
    logger.error('Error checking group resolution:', error);
    // Don't throw - just return as not resolved
    return { isResolved: false };
  }

  if (data && data.length > 0 && data[0].is_resolved) {
    return {
      isResolved: true,
      resolutionType: data[0].resolution_type,
      resolvedAt: data[0].resolved_at,
    };
  }

  return { isResolved: false };
}

/**
 * Determine detection method and confidence for a group based on its pairs.
 */
function analyzeGroup(pairs: DuplicatePair[]): {
  detectionMethod: 'both' | 'same_title' | 'embedding' | 'mixed';
  confidence: 'high' | 'medium' | 'low';
  avgSimilarity: number | null;
} {
  const methods = new Set(pairs.map((p) => p.detection_method));

  // Determine detection method
  let detectionMethod: 'both' | 'same_title' | 'embedding' | 'mixed';
  if (methods.size === 1) {
    detectionMethod = pairs[0].detection_method;
  } else if (methods.has('both')) {
    detectionMethod = 'both';
  } else {
    detectionMethod = 'mixed';
  }

  // Determine confidence based on detection method
  let confidence: 'high' | 'medium' | 'low';
  if (methods.has('both') || (methods.has('same_title') && methods.has('embedding'))) {
    confidence = 'high';
  } else if (methods.has('same_title') || methods.has('embedding')) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  // Calculate average similarity
  const similarities = pairs.map((p) => p.similarity).filter((s): s is number => s !== null);
  const avgSimilarity =
    similarities.length > 0 ? similarities.reduce((a, b) => a + b, 0) / similarities.length : null;

  return { detectionMethod, confidence, avgSimilarity };
}

/**
 * Batch fetch all dismissed lesson ID sets from duplicate_group_dismissals.
 * Returns a set of sorted, comma-joined lesson ID strings for quick lookup.
 */
async function getDismissedGroupKeys(): Promise<Set<string>> {
  const { data, error } = await supabase.from('duplicate_group_dismissals').select('lesson_ids');

  if (error) {
    logger.warn('Could not fetch dismissed groups:', error);
    return new Set();
  }

  // Create lookup keys by sorting and joining lesson IDs
  const keys = new Set<string>();
  for (const row of data || []) {
    if (row.lesson_ids && row.lesson_ids.length > 0) {
      const key = [...row.lesson_ids].sort().join(',');
      keys.add(key);
    }
  }
  return keys;
}

/**
 * Check if a group's lesson IDs match any dismissed group.
 * Uses sorted, comma-joined string comparison for O(1) lookup.
 */
function isGroupDismissed(lessonIds: string[], dismissedKeys: Set<string>): boolean {
  const key = [...lessonIds].sort().join(',');
  return dismissedKeys.has(key);
}

/**
 * Fetch all duplicate groups with lesson details.
 * Main entry point for the admin duplicates page.
 */
export async function fetchDuplicateGroups(
  options: {
    includeResolved?: boolean;
  } = {}
): Promise<DuplicateGroupForReview[]> {
  const { includeResolved = false } = options;

  // Fetch all duplicate pairs
  const pairs = await fetchDuplicatePairs();

  if (pairs.length === 0) {
    return [];
  }

  // Group pairs using union-find
  const groupedPairs = groupPairsIntoGroups(pairs);

  // Get all unique lesson IDs across all groups
  const allLessonIds = new Set<string>();
  for (const pair of pairs) {
    allLessonIds.add(pair.id1);
    allLessonIds.add(pair.id2);
  }

  // Batch fetch: lesson details and dismissed groups (in parallel)
  const [lessonDetails, dismissedKeys] = await Promise.all([
    fetchLessonDetails(Array.from(allLessonIds)),
    includeResolved ? Promise.resolve(new Set<string>()) : getDismissedGroupKeys(),
  ]);

  const lessonMap = new Map(lessonDetails.map((l) => [l.lesson_id, l]));

  // Build groups
  const groups: DuplicateGroupForReview[] = [];
  let groupIndex = 1;

  for (const pairsInGroup of groupedPairs.values()) {
    // Get unique lesson IDs in this group
    const lessonIds = new Set<string>();
    for (const pair of pairsInGroup) {
      lessonIds.add(pair.id1);
      lessonIds.add(pair.id2);
    }

    const lessonIdArray = Array.from(lessonIds);

    // Check if already dismissed (in-memory check, no DB call)
    if (!includeResolved && isGroupDismissed(lessonIdArray, dismissedKeys)) {
      continue;
    }

    // Get lessons for this group
    const lessons = lessonIdArray
      .map((id) => lessonMap.get(id))
      .filter((l): l is LessonForReview => l !== undefined);

    // Analyze group
    const { detectionMethod, confidence, avgSimilarity } = analyzeGroup(pairsInGroup);

    groups.push({
      groupId: `group_${groupIndex}`,
      lessonIds: lessonIdArray,
      lessons,
      detectionMethod,
      confidence,
      avgSimilarity,
      pairCount: pairsInGroup.length,
    });

    groupIndex++;
  }

  // Sort groups: high confidence first, then by lesson count
  groups.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    if (confDiff !== 0) return confDiff;
    return b.lessons.length - a.lessons.length;
  });

  return groups;
}

/**
 * Resolve a duplicate group by archiving selected lessons.
 */
export async function resolveDuplicateGroup(resolution: GroupResolution): Promise<{
  success: boolean;
  archivedCount: number;
  keptCount: number;
  error?: string;
}> {
  const { groupId, resolutions } = resolution;
  // Note: `notes` from resolution is no longer used after Phase 3 simplification

  // Validate groupId format (generated by fetchDuplicateGroups as "group_N")
  if (!/^group_\d+$/.test(groupId)) {
    return {
      success: false,
      archivedCount: 0,
      keptCount: 0,
      error: 'Invalid group ID format',
    };
  }

  const toKeep = resolutions.filter((r) => r.action === 'keep');
  const toArchive = resolutions.filter((r) => r.action === 'archive');

  if (toKeep.length === 0) {
    return {
      success: false,
      archivedCount: 0,
      keptCount: 0,
      error: 'At least one lesson must be kept',
    };
  }

  // Build set of lesson IDs being kept for validation
  const keptLessonIds = new Set(toKeep.map((r) => r.lessonId));

  try {
    // For each lesson to archive, call the existing resolve function
    for (const archiveRes of toArchive) {
      if (!archiveRes.archiveTo) {
        return {
          success: false,
          archivedCount: 0,
          keptCount: 0,
          error: `Lesson ${archiveRes.lessonId} to archive must specify which lesson to link to`,
        };
      }

      // Validate that archiveTo references a lesson being kept
      if (!keptLessonIds.has(archiveRes.archiveTo)) {
        return {
          success: false,
          archivedCount: 0,
          keptCount: 0,
          error: `Cannot archive ${archiveRes.lessonId} to ${archiveRes.archiveTo} - target lesson is not being kept`,
        };
      }

      // Call the simplified archive function (Phase 3)
      const { data, error } = await supabase.rpc('archive_duplicate_lesson', {
        p_lesson_id: archiveRes.lessonId,
        p_canonical_id: archiveRes.archiveTo,
      });

      if (error) {
        logger.error('Error archiving lesson:', error);
        throw error;
      }

      // Check the JSONB response for success
      // Type narrow the response from Json to our expected shape
      const result = data as { success: boolean; error?: string } | null;
      if (result && !result.success) {
        logger.error('Archive function returned error:', result.error);
        throw new Error(result.error || 'Archive function failed');
      }
    }

    return {
      success: true,
      archivedCount: toArchive.length,
      keptCount: toKeep.length,
    };
  } catch (error) {
    logger.error('Error resolving duplicate group:', error);
    return {
      success: false,
      archivedCount: 0,
      keptCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Dismiss a duplicate group (Keep All).
 * Records the decision so the group won't be flagged again.
 */
export async function dismissDuplicateGroup(
  lessonIds: string[],
  detectionMethod: 'same_title' | 'embedding' | 'both',
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('duplicate_group_dismissals').insert({
      lesson_ids: lessonIds,
      dismissed_by: user?.id,
      detection_method: detectionMethod,
      notes: notes || 'Dismissed via duplicate review interface',
    });

    if (error) {
      logger.error('Error dismissing duplicate group:', error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    logger.error('Error dismissing duplicate group:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
