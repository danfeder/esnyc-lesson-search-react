import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEnhancedAuth } from '../hooks/useEnhancedAuth';
import { ChevronLeft, Check } from 'lucide-react';
import { logger } from '../utils/logger';

interface LessonDetail {
  lessonId: string;
  title: string;
  summary?: string;
  objectives?: string;
  lastModified?: string;
  createdAt?: string;
  metadataCompleteness: number;
  canonicalScore: number;
  isRecommendedCanonical: boolean;
  metadata?: any;
  confidence?: any;
  processingNotes?: string;
  scoreBreakdown?: {
    recency: number;
    completeness: number;
    quality: number;
    naming: number;
    notes: number;
    content: number;
    contentDetails?: any;
  };
}

interface DuplicateGroup {
  groupId: string;
  type: 'exact' | 'near' | 'title';
  similarityScore: number;
  recommendedCanonical: string;
  lessons: LessonDetail[];
}

export const AdminDuplicateDetail: React.FC = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useEnhancedAuth();
  const [group, setGroup] = useState<DuplicateGroup | null>(null);
  const [selectedCanonical, setSelectedCanonical] = useState<string>('');
  const [mergeMetadata, setMergeMetadata] = useState(true);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonDetails, setLessonDetails] = useState<Record<string, any>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const confirmButtonRef = useRef<React.ElementRef<'button'>>(null);

  useEffect(() => {
    if (groupId) {
      loadGroupDetails();
    }
  }, [groupId]);

  // Focus management for confirmation modal
  useEffect(() => {
    if (showConfirmation && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [showConfirmation]);

  const loadGroupDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load from the JSON report
      const response = await fetch('/reports/duplicate-analysis-2025-07-31.json');
      if (!response.ok) {
        throw new Error('Failed to load duplicate analysis');
      }

      const report = await response.json();
      const foundGroup = report.groups.find((g: any) => g.groupId === groupId);

      if (!foundGroup) {
        throw new Error('Duplicate group not found');
      }

      setGroup(foundGroup);
      setSelectedCanonical(foundGroup.recommendedCanonical);

      // Load full lesson details from database
      const lessonIds = foundGroup.lessons.map((l: any) => l.lessonId);
      const { data: lessons, error: dbError } = await supabase
        .from('lessons_with_metadata')
        .select('*')
        .in('lesson_id', lessonIds);

      if (dbError) throw dbError;

      const detailsMap: Record<string, any> = {};
      lessons?.forEach((lesson) => {
        detailsMap[lesson.lesson_id] = lesson;
      });
      setLessonDetails(detailsMap);
    } catch (err) {
      logger.error('Error loading group details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedCanonical || !group) return;

    try {
      setResolving(true);
      setError(null);

      // Get the duplicate IDs (all lessons except the canonical one)
      const duplicateIds = group.lessons
        .filter((l) => l.lessonId !== selectedCanonical)
        .map((l) => l.lessonId);

      // Call the SQL function to resolve the duplicate group
      const { data, error: resolveError } = await supabase.rpc('resolve_duplicate_group', {
        p_group_id: group.groupId,
        p_canonical_id: selectedCanonical,
        p_duplicate_ids: duplicateIds,
        p_duplicate_type: group.type,
        p_similarity_score: group.similarityScore,
        p_merge_metadata: mergeMetadata,
        p_resolution_notes: `Resolved ${group.type} duplicate group with ${group.lessons.length} lessons`,
      });

      if (resolveError) {
        throw new Error(resolveError.message || 'Failed to resolve duplicates');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Resolution failed');
      }

      // Show success message and navigate back
      logger.log('Successfully resolved duplicates:', data);

      // Navigate back to the duplicates list
      navigate('/admin/duplicates', {
        state: {
          message: `Successfully resolved ${data.archived_count} duplicate${data.archived_count > 1 ? 's' : ''}. Canonical lesson: ${selectedCanonical}`,
        },
      });
    } catch (err) {
      logger.error('Error resolving duplicates:', err);
      setError(err instanceof Error ? err.message : 'Failed to resolve duplicates');
    } finally {
      setResolving(false);
    }
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error || 'Group not found'}</p>
          <button
            onClick={() => navigate('/admin/duplicates')}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Back to Duplicates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/duplicates')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Back to Duplicates
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Duplicate Group</h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
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
          <span>{group.lessons.length} lessons</span>
          <span>{(group.similarityScore * 100).toFixed(0)}% similar</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-900">Resolution Options</h3>
            <div className="mt-2 space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={mergeMetadata}
                  onChange={(e) => setMergeMetadata(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-blue-800">
                  Merge metadata from duplicates into canonical lesson
                </span>
              </label>
            </div>
          </div>
          <button
            onClick={() => setShowConfirmation(true)}
            disabled={!selectedCanonical || resolving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {resolving ? 'Resolving...' : 'Resolve Duplicates'}
          </button>
        </div>
      </div>

      {/* Lessons Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {group.lessons.map((lesson) => {
          const fullLesson = lessonDetails[lesson.lessonId];
          const isSelected = selectedCanonical === lesson.lessonId;

          return (
            <div
              key={lesson.lessonId}
              className={`bg-white rounded-lg shadow-sm border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">{lesson.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">ID: {lesson.lessonId}</p>
                    {fullLesson?.file_link && (
                      <a
                        href={fullLesson.file_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
                      >
                        View Google Doc →
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedCanonical(lesson.lessonId)}
                    className={`ml-4 p-2 rounded-full transition-colors ${
                      isSelected
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={isSelected ? 'Selected as canonical' : 'Select as canonical'}
                  >
                    <Check className="h-5 w-5" />
                  </button>
                </div>

                {/* Scores */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Canonical Score:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {(lesson.canonicalScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Completeness:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {(lesson.metadataCompleteness * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Score Breakdown */}
                {lesson.scoreBreakdown && (
                  <details className="mt-3 text-xs">
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                      Score Details
                    </summary>
                    <div className="mt-2 space-y-1 pl-2 text-gray-600">
                      <div>
                        Content Quality: {(lesson.scoreBreakdown.content * 100).toFixed(0)}% (35%
                        weight)
                      </div>
                      <div>
                        Metadata: {(lesson.scoreBreakdown.completeness * 100).toFixed(0)}% (20%
                        weight)
                      </div>
                      <div>
                        Recency: {(lesson.scoreBreakdown.recency * 100).toFixed(0)}% (15% weight)
                      </div>
                      <div>
                        AI Quality: {(lesson.scoreBreakdown.quality * 100).toFixed(0)}% (15% weight)
                      </div>
                      <div>
                        Notes: {(lesson.scoreBreakdown.notes * 100).toFixed(0)}% (10% weight)
                      </div>
                      <div>
                        Naming: {(lesson.scoreBreakdown.naming * 100).toFixed(0)}% (5% weight)
                      </div>

                      {lesson.scoreBreakdown.contentDetails && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="font-medium">Content has:</div>
                          {Object.entries(lesson.scoreBreakdown.contentDetails.components || {})
                            .filter(([, has]) => has)
                            .map(([component]) => (
                              <div key={component} className="pl-2">
                                ✓ {component}
                              </div>
                            ))}
                          {lesson.scoreBreakdown.contentDetails.breakdown?.missingComponents
                            ?.length > 0 && (
                            <>
                              <div className="font-medium mt-1">Missing:</div>
                              {lesson.scoreBreakdown.contentDetails.breakdown.missingComponents.map(
                                (comp: string) => (
                                  <div key={comp} className="pl-2 text-red-600">
                                    ✗ {comp}
                                  </div>
                                )
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {lesson.isRecommendedCanonical && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Recommended
                    </span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3 text-sm">
                {/* Dates */}
                <div>
                  <span className="font-medium text-gray-700">Last Modified:</span>
                  <span className="ml-2 text-gray-600">
                    {lesson.lastModified
                      ? new Date(lesson.lastModified).toLocaleDateString()
                      : 'Unknown'}
                  </span>
                </div>

                {/* Summary */}
                {fullLesson?.summary && (
                  <div>
                    <span className="font-medium text-gray-700">Summary:</span>
                    <p className="mt-1 text-gray-600 line-clamp-3">{fullLesson.summary}</p>
                  </div>
                )}

                {/* Metadata */}
                {fullLesson?.metadata && (
                  <div>
                    <span className="font-medium text-gray-700">Metadata:</span>
                    <div className="mt-1 space-y-1">
                      {fullLesson.grade_levels?.length > 0 && (
                        <div>
                          <span className="text-gray-500">Grades:</span>
                          <span className="ml-1 text-gray-600">
                            {fullLesson.grade_levels.join(', ')}
                          </span>
                        </div>
                      )}
                      {fullLesson.metadata.thematicCategories?.length > 0 && (
                        <div>
                          <span className="text-gray-500">Themes:</span>
                          <span className="ml-1 text-gray-600">
                            {fullLesson.metadata.thematicCategories.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Processing Notes */}
                {lesson.processingNotes && (
                  <div className="pt-2 border-t border-gray-100">
                    <span className="font-medium text-gray-700">Notes:</span>
                    <p className="mt-1 text-sm text-gray-600 italic">{lesson.processingNotes}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setShowConfirmation(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowConfirmation(false);
            }
          }}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Duplicate Resolution
            </h3>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600">
                This action will permanently archive {group.lessons.length - 1} duplicate lesson
                {group.lessons.length - 1 > 1 ? 's' : ''}.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-900 font-medium">Canonical lesson to keep:</p>
                <p className="text-sm text-blue-700 mt-1">
                  {group.lessons.find((l) => l.lessonId === selectedCanonical)?.title}
                </p>
                <p className="text-xs text-blue-600 mt-1">ID: {selectedCanonical}</p>
              </div>

              {mergeMetadata && (
                <p className="text-sm text-gray-600">
                  ✓ Metadata from duplicates will be merged into the canonical lesson
                </p>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This action cannot be undone. Archived lessons will be
                  removed from the main library.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                ref={confirmButtonRef}
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  handleResolve();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirm & Archive Duplicates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
