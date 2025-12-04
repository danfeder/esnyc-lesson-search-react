import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getGroupKey,
  isValidResolvedGroupsArray,
  getStoredResolvedGroups,
  saveResolvedGroups,
  addResolvedGroupToStorage,
  RESOLVED_GROUPS_KEY,
} from './duplicateGroupHelpers';
import type { DuplicateGroupForReview } from '@/services/duplicateGroupService';

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    _getStore: () => store,
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

// Factory for creating test groups
function makeTestGroup(overrides: Partial<DuplicateGroupForReview> = {}): DuplicateGroupForReview {
  return {
    groupId: overrides.groupId ?? 'group-1',
    lessonIds: overrides.lessonIds ?? ['lesson-1', 'lesson-2'],
    lessons: overrides.lessons ?? [
      {
        lesson_id: 'lesson-1',
        title: 'Test Lesson 1',
        summary: 'Summary 1',
        content_length: 1000,
        content_preview: 'Preview 1',
        has_summary: true,
        has_table_format: false,
        grade_levels: ['3-5'],
        file_link: 'https://example.com/1',
      },
      {
        lesson_id: 'lesson-2',
        title: 'Test Lesson 2',
        summary: 'Summary 2',
        content_length: 1200,
        content_preview: 'Preview 2',
        has_summary: false,
        has_table_format: true,
        grade_levels: ['3-5'],
        file_link: 'https://example.com/2',
      },
    ],
    detectionMethod: overrides.detectionMethod ?? 'same_title',
    confidence: overrides.confidence ?? 'high',
    avgSimilarity: overrides.avgSimilarity ?? null,
    pairCount: overrides.pairCount ?? 1,
  };
}

describe('duplicateGroupHelpers', () => {
  beforeEach(() => {
    mockSessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockSessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('getGroupKey', () => {
    it('should create a stable key from sorted lesson IDs', () => {
      const key1 = getGroupKey(['b', 'a', 'c']);
      const key2 = getGroupKey(['c', 'a', 'b']);
      expect(key1).toBe('a,b,c');
      expect(key2).toBe('a,b,c');
      expect(key1).toBe(key2);
    });

    it('should handle single lesson ID', () => {
      expect(getGroupKey(['only-one'])).toBe('only-one');
    });

    it('should handle empty array', () => {
      expect(getGroupKey([])).toBe('');
    });

    it('should not mutate the original array', () => {
      const original = ['z', 'a', 'm'];
      getGroupKey(original);
      expect(original).toEqual(['z', 'a', 'm']);
    });
  });

  describe('isValidResolvedGroupsArray', () => {
    it('should return true for valid array of groups', () => {
      const validData = [makeTestGroup()];
      expect(isValidResolvedGroupsArray(validData)).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(isValidResolvedGroupsArray([])).toBe(true);
    });

    it('should return false for non-array', () => {
      expect(isValidResolvedGroupsArray('string')).toBe(false);
      expect(isValidResolvedGroupsArray(123)).toBe(false);
      expect(isValidResolvedGroupsArray(null)).toBe(false);
      expect(isValidResolvedGroupsArray(undefined)).toBe(false);
      expect(isValidResolvedGroupsArray({})).toBe(false);
    });

    it('should return false if groupId is missing or not string', () => {
      expect(
        isValidResolvedGroupsArray([{ lessonIds: [], lessons: [], detectionMethod: 'same_title' }])
      ).toBe(false);
      expect(
        isValidResolvedGroupsArray([
          { groupId: 123, lessonIds: [], lessons: [], detectionMethod: 'same_title' },
        ])
      ).toBe(false);
    });

    it('should return false if lessonIds is missing or not array', () => {
      expect(
        isValidResolvedGroupsArray([{ groupId: 'g1', lessons: [], detectionMethod: 'same_title' }])
      ).toBe(false);
      expect(
        isValidResolvedGroupsArray([
          { groupId: 'g1', lessonIds: 'not-array', lessons: [], detectionMethod: 'same_title' },
        ])
      ).toBe(false);
    });

    it('should return false if lessonIds contains non-strings', () => {
      expect(
        isValidResolvedGroupsArray([
          { groupId: 'g1', lessonIds: [1, 2], lessons: [], detectionMethod: 'same_title' },
        ])
      ).toBe(false);
    });

    it('should return false if lessons is missing or not array', () => {
      expect(
        isValidResolvedGroupsArray([
          { groupId: 'g1', lessonIds: [], detectionMethod: 'same_title' },
        ])
      ).toBe(false);
    });

    it('should return false if detectionMethod is missing or not string', () => {
      expect(isValidResolvedGroupsArray([{ groupId: 'g1', lessonIds: [], lessons: [] }])).toBe(
        false
      );
      expect(
        isValidResolvedGroupsArray([
          { groupId: 'g1', lessonIds: [], lessons: [], detectionMethod: 123 },
        ])
      ).toBe(false);
    });
  });

  describe('getStoredResolvedGroups', () => {
    it('should return empty array when sessionStorage is empty', () => {
      expect(getStoredResolvedGroups()).toEqual([]);
    });

    it('should return parsed groups from sessionStorage', () => {
      const groups = [makeTestGroup()];
      mockSessionStorage.setItem(RESOLVED_GROUPS_KEY, JSON.stringify(groups));

      const result = getStoredResolvedGroups();
      expect(result).toHaveLength(1);
      expect(result[0].groupId).toBe('group-1');
    });

    it('should return empty array and clear storage for invalid JSON', () => {
      mockSessionStorage.setItem(RESOLVED_GROUPS_KEY, 'invalid-json');

      const result = getStoredResolvedGroups();
      expect(result).toEqual([]);
    });

    it('should return empty array and clear storage for invalid data structure', () => {
      mockSessionStorage.setItem(RESOLVED_GROUPS_KEY, JSON.stringify({ notAnArray: true }));

      const result = getStoredResolvedGroups();
      expect(result).toEqual([]);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(RESOLVED_GROUPS_KEY);
    });
  });

  describe('saveResolvedGroups', () => {
    it('should save groups to sessionStorage', () => {
      const groups = [makeTestGroup()];
      saveResolvedGroups(groups);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        RESOLVED_GROUPS_KEY,
        JSON.stringify(groups)
      );
    });

    it('should handle empty array', () => {
      saveResolvedGroups([]);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(RESOLVED_GROUPS_KEY, '[]');
    });
  });

  describe('addResolvedGroupToStorage', () => {
    it('should add a new group to storage', () => {
      const group = makeTestGroup();
      addResolvedGroupToStorage(group);

      const stored = JSON.parse(mockSessionStorage._getStore()[RESOLVED_GROUPS_KEY]);
      expect(stored).toHaveLength(1);
      expect(stored[0].groupId).toBe('group-1');
    });

    it('should not add duplicate groups (by lesson IDs)', () => {
      const group1 = makeTestGroup({ groupId: 'group-1', lessonIds: ['a', 'b'] });
      const group2 = makeTestGroup({ groupId: 'group-2', lessonIds: ['b', 'a'] }); // Same lessons, different order

      addResolvedGroupToStorage(group1);
      addResolvedGroupToStorage(group2);

      const stored = JSON.parse(mockSessionStorage._getStore()[RESOLVED_GROUPS_KEY]);
      expect(stored).toHaveLength(1);
    });

    it('should add groups with different lesson IDs', () => {
      const group1 = makeTestGroup({ groupId: 'group-1', lessonIds: ['a', 'b'] });
      const group2 = makeTestGroup({ groupId: 'group-2', lessonIds: ['c', 'd'] });

      addResolvedGroupToStorage(group1);
      addResolvedGroupToStorage(group2);

      const stored = JSON.parse(mockSessionStorage._getStore()[RESOLVED_GROUPS_KEY]);
      expect(stored).toHaveLength(2);
    });
  });
});
