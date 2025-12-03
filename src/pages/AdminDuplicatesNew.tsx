import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { logger } from '@/utils/logger';
import {
  fetchDuplicateGroups,
  type DuplicateGroupForReview,
} from '@/services/duplicateGroupService';
import { DuplicateGroupCard } from '@/components/Admin/DuplicatesNew';

type FilterStatus = 'pending' | 'resolved' | 'all';

const RESOLVED_GROUPS_KEY = 'duplicates-resolved-groups';

// Helper to get resolved groups from sessionStorage
function getStoredResolvedGroups(): DuplicateGroupForReview[] {
  try {
    const stored = sessionStorage.getItem(RESOLVED_GROUPS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Helper to save resolved groups to sessionStorage
function saveResolvedGroups(groups: DuplicateGroupForReview[]) {
  try {
    sessionStorage.setItem(RESOLVED_GROUPS_KEY, JSON.stringify(groups));
  } catch (err) {
    logger.warn('Failed to save resolved groups to sessionStorage:', err);
  }
}

/**
 * Admin page for reviewing and resolving duplicate lessons.
 * Uses the new duplicateGroupService backend.
 */
export function AdminDuplicatesNew() {
  const { user } = useEnhancedAuth();
  const location = useLocation();

  const [groups, setGroups] = useState<DuplicateGroupForReview[]>([]);
  // Initialize from sessionStorage to persist across navigations
  const [resolvedGroups, setResolvedGroups] = useState<DuplicateGroupForReview[]>(
    getStoredResolvedGroups
  );
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Helper to create stable group key from lesson IDs
  const getGroupKey = useCallback(
    (lessonIds: string[]) => [...lessonIds].sort().join(','),
    []
  );

  // Add a resolved group (checks for duplicates by lessonIds)
  const addResolvedGroup = useCallback(
    (group: DuplicateGroupForReview) => {
      setResolvedGroups((prev) => {
        const groupKey = getGroupKey(group.lessonIds);
        // Avoid duplicates by comparing lessonIds
        if (prev.some((g) => getGroupKey(g.lessonIds) === groupKey)) {
          return prev;
        }
        const updated = [...prev, group];
        saveResolvedGroups(updated);
        return updated;
      });
    },
    [getGroupKey]
  );

  // Load groups on mount
  useEffect(() => {
    loadGroups();
  }, []);

  // Handle success messages from navigation state
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Also add resolved group if present (full group data from detail page)
      if (location.state.resolvedGroup) {
        addResolvedGroup(location.state.resolvedGroup);
      }
      // Clear after 5 seconds
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state, addResolvedGroup]);

  async function loadGroups() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDuplicateGroups({ includeResolved: false });
      setGroups(data);
    } catch (err) {
      logger.error('Error loading duplicate groups:', err);
      setError(err instanceof Error ? err.message : 'Failed to load duplicate groups');
    } finally {
      setLoading(false);
    }
  }

  // Check user permissions
  const isAdmin =
    user?.role === 'admin' || user?.role === 'reviewer' || user?.role === 'super_admin';

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600">Loading duplicate groups...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800">Error: {error}</p>
          </div>
          <button
            onClick={loadGroups}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Use lesson IDs for comparison since groupIds are dynamically generated and not stable
  const resolvedGroupKeys = new Set(resolvedGroups.map((g) => getGroupKey(g.lessonIds)));

  // Filter out resolved groups from the pending list (API may still return them)
  const pendingGroups = groups.filter((g) => !resolvedGroupKeys.has(getGroupKey(g.lessonIds)));

  // Combine pending and resolved for "All" tab
  const allGroups = [...pendingGroups, ...resolvedGroups];

  // Filter groups based on selected tab
  const filteredGroups = (() => {
    if (filter === 'pending') return pendingGroups;
    if (filter === 'resolved') return resolvedGroups;
    return allGroups;
  })();

  const pendingCount = pendingGroups.length;
  const resolvedCount = resolvedGroups.length;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Duplicate Resolution</h1>
        <p className="text-gray-600">
          Review and resolve duplicate lessons in the library. {pendingGroups.length} duplicate
          groups found.
        </p>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total Groups</p>
          <p className="text-2xl font-bold text-gray-900">{allGroups.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Resolved (this session)</p>
          <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2">
        <FilterButton
          active={filter === 'pending'}
          onClick={() => setFilter('pending')}
          count={pendingCount}
        >
          Pending
        </FilterButton>
        <FilterButton
          active={filter === 'resolved'}
          onClick={() => setFilter('resolved')}
          count={resolvedCount}
        >
          Resolved
        </FilterButton>
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          count={allGroups.length}
        >
          All
        </FilterButton>
      </div>

      {/* Group list */}
      <div className="space-y-3">
        {filteredGroups.map((group) => (
          <DuplicateGroupCard
            key={group.groupId}
            group={group}
            isResolved={resolvedGroupKeys.has(getGroupKey(group.lessonIds))}
          />
        ))}
      </div>

      {/* Empty state */}
      {filteredGroups.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {filter === 'pending'
              ? 'No pending duplicate groups. Great work!'
              : filter === 'resolved'
                ? 'No resolved groups in this session.'
                : 'No duplicate groups found.'}
          </p>
        </div>
      )}
    </div>
  );
}

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}

function FilterButton({ active, onClick, count, children }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        active ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children} ({count})
    </button>
  );
}
