import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useEnhancedAuth } from '../hooks/useEnhancedAuth';
import { supabase } from '../lib/supabase';
import { CheckCircle } from 'lucide-react';
import { logger } from '../utils/logger';

interface DuplicateGroup {
  groupId: string;
  type: 'exact' | 'near' | 'title';
  similarityScore: number;
  lessonCount: number;
  status?: 'pending' | 'resolved';
  recommendedCanonical?: string;
  lessons: Array<{
    lessonId: string;
    title: string;
    isRecommendedCanonical?: boolean;
  }>;
}

export const AdminDuplicates: React.FC = () => {
  const { user } = useEnhancedAuth();
  const location = useLocation();
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDuplicateGroups();
  }, []);

  useEffect(() => {
    // Check for success message from navigation state
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message after 5 seconds
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  const loadDuplicateGroups = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, load from the JSON file we just generated
      // In production, this would come from a database or API
      const response = await fetch('/reports/duplicate-analysis-v2-2025-08-07.json');
      if (!response.ok) {
        throw new Error('Failed to load duplicate analysis');
      }

      const report = await response.json();

      // Get list of resolved groups from database
      const { data: resolvedGroups, error: resolutionsError } = await supabase
        .from('duplicate_resolutions')
        .select('group_id');

      if (resolutionsError) {
        logger.warn('Could not fetch resolved groups:', resolutionsError);
        // Continue without marking any as resolved
      }

      const resolvedGroupIds = new Set(resolvedGroups?.map((r) => r.group_id) || []);

      // Transform the report groups into our component format
      // Note: new report uses 'averageSimilarity' instead of 'similarityScore'
      const transformedGroups = report.groups.map(
        (group: {
          groupId: string;
          type: 'exact' | 'near' | 'title' | 'mixed';
          similarityScore?: number; // Old format
          averageSimilarity?: number; // New format
          lessonCount: number;
          recommendedCanonical?: string;
          lessons: Array<{
            lessonId: string;
            title: string;
            isRecommendedCanonical?: boolean;
          }>;
        }): DuplicateGroup => ({
          groupId: group.groupId,
          type: group.type === 'mixed' ? 'near' : group.type, // Map 'mixed' to 'near' for now
          similarityScore: group.similarityScore ?? group.averageSimilarity ?? 0,
          lessonCount: group.lessonCount,
          recommendedCanonical: group.recommendedCanonical,
          status: resolvedGroupIds.has(group.groupId) ? 'resolved' : 'pending',
          lessons: group.lessons.map((lesson) => ({
            lessonId: lesson.lessonId,
            title: lesson.title,
            isRecommendedCanonical: lesson.isRecommendedCanonical,
          })),
        })
      );

      setGroups(transformedGroups);
    } catch (err) {
      logger.error('Error loading duplicates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load duplicates');
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter((group) => filter === 'all' || group.status === filter);

  // Check if user has admin privileges
  const isAdmin = user?.role === 'admin' || user?.role === 'reviewer';

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
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={loadDuplicateGroups}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Duplicate Resolution</h1>
        <p className="text-gray-600">
          Review and resolve duplicate lessons in the library. {groups.length} duplicate groups
          found.
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total Groups</p>
          <p className="text-2xl font-bold text-gray-900">{groups.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Exact Matches</p>
          <p className="text-2xl font-bold text-gray-900">
            {groups.filter((g) => g.type === 'exact').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Near Duplicates</p>
          <p className="text-2xl font-bold text-gray-900">
            {groups.filter((g) => g.type === 'near').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Title Variations</p>
          <p className="text-2xl font-bold text-gray-900">
            {groups.filter((g) => g.type === 'title').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All ({groups.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Pending ({groups.filter((g) => g.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'resolved'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Resolved ({groups.filter((g) => g.status === 'resolved').length})
        </button>
      </div>

      {/* Duplicate Groups */}
      <div className="space-y-4">
        {filteredGroups.map((group) => {
          const primaryLesson =
            group.lessons.find((l) => l.isRecommendedCanonical) || group.lessons[0];

          return (
            <div
              key={group.groupId}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{primaryLesson?.title}</h3>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        group.type === 'exact'
                          ? 'bg-red-100 text-red-800'
                          : group.type === 'near'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {group.type === 'exact'
                        ? 'Exact Match'
                        : group.type === 'near'
                          ? 'Near Duplicate'
                          : 'Title Variation'}
                    </span>
                    <span>{group.lessonCount} lessons</span>
                    <span>{(group.similarityScore * 100).toFixed(0)}% similar</span>
                    {group.status === 'resolved' && (
                      <span className="text-green-600 font-medium">
                        <span className="sr-only">Status: </span>✓ Resolved
                      </span>
                    )}
                  </div>
                  {group.lessonCount > 1 && (
                    <p className="mt-2 text-sm text-gray-500">
                      {group.lessonCount} total variations of this lesson
                    </p>
                  )}
                </div>
                <Link
                  to={`/admin/duplicates/${group.groupId}`}
                  className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  aria-label={`Review duplicate group: ${primaryLesson?.title || 'Untitled'} (${group.lessons.length} lessons)`}
                >
                  Review
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {filteredGroups.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No {filter} duplicate groups found.</p>
        </div>
      )}
    </div>
  );
};
