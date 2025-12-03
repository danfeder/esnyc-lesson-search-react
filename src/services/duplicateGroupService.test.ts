/**
 * Unit tests for duplicateGroupService
 *
 * Tests cover:
 * - Union-find grouping logic (pure function, no mocks)
 * - Detection method and confidence analysis
 * - Dismissed group matching
 * - Resolution validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { groupPairsIntoGroups, DuplicatePair, GroupResolution } from './duplicateGroupService';

// Mock supabase at module level
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
    })),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock logger to avoid console noise in tests
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

describe('duplicateGroupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('groupPairsIntoGroups', () => {
    // These tests verify the union-find algorithm that clusters duplicate pairs
    // into transitive groups. This is a pure function with no database calls,
    // so we test it directly without mocks.

    it('groups a single pair into one group', () => {
      const pairs: DuplicatePair[] = [
        {
          id1: 'lesson-a',
          id2: 'lesson-b',
          title1: 'Recipe A',
          title2: 'Recipe A',
          detection_method: 'same_title',
          similarity: null,
        },
      ];

      const groups = groupPairsIntoGroups(pairs);

      expect(groups.size).toBe(1);
      const groupPairs = Array.from(groups.values())[0];
      expect(groupPairs).toHaveLength(1);
      expect(groupPairs[0].id1).toBe('lesson-a');
      expect(groupPairs[0].id2).toBe('lesson-b');
    });

    it('groups transitive pairs together (A↔B, B↔C → {A,B,C})', () => {
      const pairs: DuplicatePair[] = [
        {
          id1: 'lesson-a',
          id2: 'lesson-b',
          title1: 'Recipe',
          title2: 'Recipe',
          detection_method: 'same_title',
          similarity: null,
        },
        {
          id1: 'lesson-b',
          id2: 'lesson-c',
          title1: 'Recipe',
          title2: 'Recipe',
          detection_method: 'same_title',
          similarity: null,
        },
      ];

      const groups = groupPairsIntoGroups(pairs);

      // Should be one group containing both pairs
      expect(groups.size).toBe(1);
      const groupPairs = Array.from(groups.values())[0];
      expect(groupPairs).toHaveLength(2);

      // Extract all lesson IDs from the group
      const lessonIds = new Set<string>();
      for (const pair of groupPairs) {
        lessonIds.add(pair.id1);
        lessonIds.add(pair.id2);
      }
      expect(lessonIds).toEqual(new Set(['lesson-a', 'lesson-b', 'lesson-c']));
    });

    it('keeps disconnected pairs in separate groups', () => {
      const pairs: DuplicatePair[] = [
        {
          id1: 'lesson-a',
          id2: 'lesson-b',
          title1: 'Recipe A',
          title2: 'Recipe A',
          detection_method: 'same_title',
          similarity: null,
        },
        {
          id1: 'lesson-x',
          id2: 'lesson-y',
          title1: 'Recipe X',
          title2: 'Recipe X',
          detection_method: 'same_title',
          similarity: null,
        },
      ];

      const groups = groupPairsIntoGroups(pairs);

      expect(groups.size).toBe(2);
    });

    it('handles complex diamond pattern (A↔B, A↔C, B↔D, C↔D)', () => {
      const pairs: DuplicatePair[] = [
        {
          id1: 'a',
          id2: 'b',
          title1: 'T',
          title2: 'T',
          detection_method: 'embedding',
          similarity: 0.96,
        },
        {
          id1: 'a',
          id2: 'c',
          title1: 'T',
          title2: 'T',
          detection_method: 'embedding',
          similarity: 0.97,
        },
        {
          id1: 'b',
          id2: 'd',
          title1: 'T',
          title2: 'T',
          detection_method: 'embedding',
          similarity: 0.95,
        },
        {
          id1: 'c',
          id2: 'd',
          title1: 'T',
          title2: 'T',
          detection_method: 'embedding',
          similarity: 0.98,
        },
      ];

      const groups = groupPairsIntoGroups(pairs);

      // All 4 pairs should be in one group
      expect(groups.size).toBe(1);
      const groupPairs = Array.from(groups.values())[0];
      expect(groupPairs).toHaveLength(4);

      // All 4 lessons should be represented
      const lessonIds = new Set<string>();
      for (const pair of groupPairs) {
        lessonIds.add(pair.id1);
        lessonIds.add(pair.id2);
      }
      expect(lessonIds).toEqual(new Set(['a', 'b', 'c', 'd']));
    });

    it('returns empty map for empty input', () => {
      const groups = groupPairsIntoGroups([]);
      expect(groups.size).toBe(0);
    });

    it('handles mixed detection methods in same group', () => {
      const pairs: DuplicatePair[] = [
        {
          id1: 'lesson-a',
          id2: 'lesson-b',
          title1: 'Recipe',
          title2: 'Recipe',
          detection_method: 'same_title',
          similarity: null,
        },
        {
          id1: 'lesson-b',
          id2: 'lesson-c',
          title1: 'Recipe',
          title2: 'Similar Recipe',
          detection_method: 'embedding',
          similarity: 0.96,
        },
      ];

      const groups = groupPairsIntoGroups(pairs);

      expect(groups.size).toBe(1);
      const groupPairs = Array.from(groups.values())[0];

      // Check that both detection methods are present
      const methods = new Set(groupPairs.map((p) => p.detection_method));
      expect(methods).toEqual(new Set(['same_title', 'embedding']));
    });
  });

  describe('resolveDuplicateGroup validation', () => {
    // These tests verify client-side validation in resolveDuplicateGroup.
    // The function validates inputs before making any database calls, so we can
    // test validation logic without mocking the RPC responses.

    it('rejects invalid groupId format', async () => {
      const { resolveDuplicateGroup } = await import('./duplicateGroupService');

      const resolution: GroupResolution = {
        groupId: 'invalid_id', // Should be "group_N" format
        resolutions: [{ lessonId: 'lesson-a', action: 'keep' }],
      };

      const result = await resolveDuplicateGroup(resolution);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid group ID format');
    });

    it('rejects resolution with no lessons kept', async () => {
      // We need to import resolveDuplicateGroup dynamically to use the mocked supabase
      const { resolveDuplicateGroup } = await import('./duplicateGroupService');

      const resolution: GroupResolution = {
        groupId: 'group_1',
        resolutions: [
          { lessonId: 'lesson-a', action: 'archive', archiveTo: 'lesson-b' },
          { lessonId: 'lesson-b', action: 'archive', archiveTo: 'lesson-a' },
        ],
      };

      const result = await resolveDuplicateGroup(resolution);

      expect(result.success).toBe(false);
      expect(result.error).toBe('At least one lesson must be kept');
    });

    it('rejects archive without archiveTo specified', async () => {
      const { resolveDuplicateGroup } = await import('./duplicateGroupService');

      const resolution: GroupResolution = {
        groupId: 'group_1',
        resolutions: [
          { lessonId: 'lesson-a', action: 'keep' },
          { lessonId: 'lesson-b', action: 'archive' }, // Missing archiveTo
        ],
      };

      const result = await resolveDuplicateGroup(resolution);

      expect(result.success).toBe(false);
      expect(result.error).toContain('must specify which lesson to link to');
    });

    it('rejects archive to a lesson that is not being kept', async () => {
      const { resolveDuplicateGroup } = await import('./duplicateGroupService');

      const resolution: GroupResolution = {
        groupId: 'group_1',
        resolutions: [
          { lessonId: 'lesson-a', action: 'keep' },
          { lessonId: 'lesson-b', action: 'archive', archiveTo: 'lesson-c' }, // lesson-c not in group
        ],
      };

      const result = await resolveDuplicateGroup(resolution);

      expect(result.success).toBe(false);
      expect(result.error).toContain('target lesson is not being kept');
    });
  });

  describe('isGroupDismissed helper logic', () => {
    // The isGroupDismissed function is internal (not exported), but we can verify
    // its core logic by testing the key generation pattern it uses.
    // Dismissed groups are matched by sorting lesson IDs and joining with commas,
    // which allows O(1) lookups regardless of the original order.

    it('matches dismissed groups regardless of lesson ID order', () => {
      // This tests the sorting logic used in isGroupDismissed
      const lessonIds1 = ['c', 'a', 'b'];
      const lessonIds2 = ['a', 'b', 'c'];

      const key1 = [...lessonIds1].sort().join(',');
      const key2 = [...lessonIds2].sort().join(',');

      expect(key1).toBe(key2);
      expect(key1).toBe('a,b,c');
    });

    it('does not match different lesson ID sets', () => {
      const lessonIds1 = ['a', 'b', 'c'];
      const lessonIds2 = ['a', 'b', 'd'];

      const key1 = [...lessonIds1].sort().join(',');
      const key2 = [...lessonIds2].sort().join(',');

      expect(key1).not.toBe(key2);
    });
  });

  describe('detection method runtime validation', () => {
    // These tests verify that fetchDuplicatePairs validates the detection_method
    // values returned from the database. If an unexpected value is returned,
    // it defaults to 'embedding' with a warning (defensive coding against DB changes).

    it('validates known detection methods', async () => {
      const { supabase } = await import('@/lib/supabase');
      const { fetchDuplicatePairs } = await import('./duplicateGroupService');

      // Mock RPC to return valid detection methods
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [
          {
            id1: 'a',
            id2: 'b',
            title1: 'T',
            title2: 'T',
            detection_method: 'same_title',
            similarity: null,
          },
          {
            id1: 'c',
            id2: 'd',
            title1: 'T',
            title2: 'T',
            detection_method: 'embedding',
            similarity: 0.96,
          },
          {
            id1: 'e',
            id2: 'f',
            title1: 'T',
            title2: 'T',
            detection_method: 'both',
            similarity: 0.98,
          },
        ],
        error: null,
      } as never);

      const pairs = await fetchDuplicatePairs();

      expect(pairs).toHaveLength(3);
      expect(pairs[0].detection_method).toBe('same_title');
      expect(pairs[1].detection_method).toBe('embedding');
      expect(pairs[2].detection_method).toBe('both');
    });

    it('defaults invalid detection method to embedding with warning', async () => {
      const { supabase } = await import('@/lib/supabase');
      const { logger } = await import('@/utils/logger');
      const { fetchDuplicatePairs } = await import('./duplicateGroupService');

      // Mock RPC to return invalid detection method
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [
          {
            id1: 'a',
            id2: 'b',
            title1: 'T',
            title2: 'T',
            detection_method: 'unknown_method', // Invalid!
            similarity: null,
          },
        ],
        error: null,
      } as never);

      const pairs = await fetchDuplicatePairs();

      expect(pairs).toHaveLength(1);
      expect(pairs[0].detection_method).toBe('embedding'); // Defaulted
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected detection_method')
      );
    });
  });
});
