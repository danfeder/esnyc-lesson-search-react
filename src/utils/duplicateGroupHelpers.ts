/**
 * Shared utilities for duplicate group operations.
 * Used by AdminDuplicates and AdminDuplicateReview pages.
 */

import type { DuplicateGroupForReview } from '@/services/duplicateGroupService';
import { logger } from '@/utils/logger';

/**
 * Generate a stable key for a duplicate group based on sorted lesson IDs.
 * This is used to track resolved groups across page navigations.
 */
export function getGroupKey(lessonIds: string[]): string {
  return [...lessonIds].sort().join(',');
}

/**
 * Session storage key for resolved groups
 */
export const RESOLVED_GROUPS_KEY = 'duplicates-resolved-groups';

/**
 * Type guard to validate that parsed sessionStorage data is a valid DuplicateGroupForReview array.
 * Ensures we don't crash on malformed or malicious sessionStorage data.
 */
export function isValidResolvedGroupsArray(data: unknown): data is DuplicateGroupForReview[] {
  if (!Array.isArray(data)) {
    return false;
  }

  return data.every((item) => {
    if (typeof item !== 'object' || item === null) {
      return false;
    }

    const group = item as Record<string, unknown>;

    // Check required fields exist and have correct types
    return (
      typeof group.groupId === 'string' &&
      Array.isArray(group.lessonIds) &&
      group.lessonIds.every((id) => typeof id === 'string') &&
      Array.isArray(group.lessons) &&
      typeof group.detectionMethod === 'string'
    );
  });
}

/**
 * Get resolved groups from sessionStorage with validation.
 * Returns empty array if storage is empty, invalid, or unavailable.
 */
export function getStoredResolvedGroups(): DuplicateGroupForReview[] {
  try {
    const stored = window.sessionStorage.getItem(RESOLVED_GROUPS_KEY);
    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!isValidResolvedGroupsArray(parsed)) {
      logger.warn('Invalid resolved groups data in sessionStorage, clearing');
      window.sessionStorage.removeItem(RESOLVED_GROUPS_KEY);
      return [];
    }

    return parsed;
  } catch (err) {
    logger.warn('Failed to read resolved groups from sessionStorage:', err);
    return [];
  }
}

/**
 * Save resolved groups to sessionStorage.
 * Handles errors gracefully without throwing.
 */
export function saveResolvedGroups(groups: DuplicateGroupForReview[]): void {
  try {
    window.sessionStorage.setItem(RESOLVED_GROUPS_KEY, JSON.stringify(groups));
  } catch (err) {
    logger.warn('Failed to save resolved groups to sessionStorage:', err);
  }
}

/**
 * Add a single resolved group to sessionStorage.
 * Deduplicates by comparing lesson IDs.
 */
export function addResolvedGroupToStorage(group: DuplicateGroupForReview): void {
  try {
    const existing = getStoredResolvedGroups();
    const groupKey = getGroupKey(group.lessonIds);

    // Avoid duplicates by comparing lessonIds
    if (existing.some((g) => getGroupKey(g.lessonIds) === groupKey)) {
      return;
    }

    existing.push(group);
    saveResolvedGroups(existing);
  } catch (err) {
    logger.warn('Failed to add resolved group to sessionStorage:', err);
  }
}
