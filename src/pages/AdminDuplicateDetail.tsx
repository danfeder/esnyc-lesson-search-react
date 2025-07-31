import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ChevronLeft, Check, X } from 'lucide-react';

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
  const { user } = useAuth();
  const [group, setGroup] = useState<DuplicateGroup | null>(null);
  const [selectedCanonical, setSelectedCanonical] = useState<string>('');
  const [mergeMetadata, setMergeMetadata] = useState(true);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonDetails, setLessonDetails] = useState<Record<string, any>>({});

  useEffect(() => {
    if (groupId) {
      loadGroupDetails();
    }
  }, [groupId]);

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
        .from('lessons')
        .select('*')
        .in('lesson_id', lessonIds);

      if (dbError) throw dbError;

      const detailsMap: Record<string, any> = {};
      lessons?.forEach((lesson) => {
        detailsMap[lesson.lesson_id] = lesson;
      });
      setLessonDetails(detailsMap);
    } catch (err) {
      console.error('Error loading group details:', err);
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

      // TODO: Implement actual resolution logic
      // For now, just simulate the process
      console.log('Resolving duplicates:', {
        groupId,
        canonicalId: selectedCanonical,
        mergeMetadata,
        duplicateIds: group.lessons
          .filter((l) => l.lessonId !== selectedCanonical)
          .map((l) => l.lessonId),
      });

      // In production, this would:
      // 1. Create canonical_lessons entries
      // 2. Optionally merge metadata
      // 3. Archive duplicates
      // 4. Update references
      // 5. Log resolution

      // Simulate success
      setTimeout(() => {
        navigate('/admin/duplicates');
      }, 1000);
    } catch (err) {
      console.error('Error resolving duplicates:', err);
      setError(err instanceof Error ? err.message : 'Failed to resolve duplicates');
    } finally {
      setResolving(false);
    }
  };

  // Check if user has admin privileges
  const isAdmin = user?.role === 'admin' || user?.role === 'reviewer' || true; // TODO: Remove || true after setting up roles

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
            onClick={handleResolve}
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
                            .filter(([_, has]) => has)
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
                      {fullLesson.metadata.gradeLevels?.length > 0 && (
                        <div>
                          <span className="text-gray-500">Grades:</span>
                          <span className="ml-1 text-gray-600">
                            {fullLesson.metadata.gradeLevels.join(', ')}
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
    </div>
  );
};
