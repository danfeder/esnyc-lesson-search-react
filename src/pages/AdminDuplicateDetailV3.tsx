import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEnhancedAuth } from '../hooks/useEnhancedAuth';
import { ChevronLeft, Check, AlertTriangle, Info, BookOpen, Users, Calendar } from 'lucide-react';
import { logger } from '../utils/logger';
import { EditableTitle } from '@/components/Admin';
import { prepareTitleUpdatesForRpc } from '@/utils/validation';

interface LessonDetail {
  lessonId: string;
  title: string;
  summary?: string;
  lastModified?: string;
  createdAt?: string;
  metadataCompleteness: number;
  canonicalScore: number;
  gradelevels?: string[];
  culturalHeritage?: string[];
  seasonTiming?: string[];
  scoreBreakdown?: {
    recency: number;
    completeness: number;
    gradeCoverage: number;
    totalScore: number;
    qualityNotes: string[];
  };
  contentHash?: string;
}

interface DuplicateGroup {
  groupId: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  recommendedAction: 'auto_merge' | 'manual_review' | 'keep_all' | 'split_group';
  recommendedCanonical: string | string[];
  lessonCount: number;
  lessons: LessonDetail[];
  insights: {
    keyDifferences: string[];
    commonElements: string[];
    qualityIssues: string[];
    pedagogicalNotes: string[];
  };
  subGroups?: {
    groupName: string;
    lessonIds: string[];
    rationale: string;
  }[];
  similarityMatrix?: Record<string, Record<string, number>>;
}

// Category explanations
const CATEGORY_INFO: Record<
  string,
  { label: string; description: string; icon: React.ReactNode; color: string }
> = {
  FORMATTING_ONLY: {
    label: 'Formatting Differences',
    description: 'Minor formatting or typo differences only - safe to auto-merge',
    icon: <Check className="w-5 h-5" />,
    color: 'green',
  },
  EXACT_CONTENT: {
    label: 'Exact Duplicates',
    description: 'Identical content with different IDs - delete redundant copies',
    icon: <Check className="w-5 h-5" />,
    color: 'green',
  },
  GRADE_ADAPTATIONS: {
    label: 'Grade-Level Adaptations',
    description: 'Same lesson adapted for different grades - keep all versions',
    icon: <Users className="w-5 h-5" />,
    color: 'blue',
  },
  TITLE_INCONSISTENCIES: {
    label: 'Title Variations',
    description: 'Similar content with different titles - needs standardization',
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'yellow',
  },
  CULTURAL_VARIATIONS: {
    label: 'Cultural Variations',
    description: 'Different cultural perspectives on same topic - preserve diversity',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'purple',
  },
  SEASONAL_VARIATIONS: {
    label: 'Seasonal Adaptations',
    description: 'Same lesson adapted for different seasons',
    icon: <Calendar className="w-5 h-5" />,
    color: 'orange',
  },
  PEDAGOGICAL_VARIATIONS: {
    label: 'Different Teaching Approaches',
    description: 'Distinct pedagogical methods - may warrant keeping multiple versions',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'indigo',
  },
};

// Action recommendations
const ACTION_INFO: Record<string, { label: string; description: string; color: string }> = {
  auto_merge: {
    label: 'Safe to Auto-Merge',
    description: 'These can be automatically consolidated without loss',
    color: 'green',
  },
  manual_review: {
    label: 'Manual Review Needed',
    description: 'Requires human judgment to decide on consolidation',
    color: 'yellow',
  },
  keep_all: {
    label: 'Keep All Versions',
    description: 'Each version has unique pedagogical value',
    color: 'blue',
  },
  split_group: {
    label: 'Split Into Sub-Groups',
    description: 'Contains distinct approaches that should be separated',
    color: 'purple',
  },
};

export const AdminDuplicateDetailV3: React.FC = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useEnhancedAuth();
  const [group, setGroup] = useState<DuplicateGroup | null>(null);
  const [selectedCanonical, setSelectedCanonical] = useState<string | string[]>('');
  const [mergeMetadata, setMergeMetadata] = useState(true);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonDetails, setLessonDetails] = useState<Record<string, any>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [resolutionMode, setResolutionMode] = useState<'single' | 'split' | 'keep_all'>('single');
  const [splitSelections, setSplitSelections] = useState<Record<string, string>>({});
  const [titleEdits, setTitleEdits] = useState<Record<string, string>>({});
  const [originalTitles, setOriginalTitles] = useState<Record<string, string>>({});
  const confirmButtonRef = useRef<React.ElementRef<'button'>>(null);

  useEffect(() => {
    if (groupId) {
      loadGroupDetails();
    }
  }, [groupId]);

  useEffect(() => {
    if (showConfirmation && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [showConfirmation]);

  const loadGroupDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to load v3 report first, fall back to v2
      let response = await fetch('/reports/duplicate-analysis-v3-2025-08-08.json');
      if (!response.ok) {
        response = await fetch('/reports/duplicate-analysis-v2-2025-08-07.json');
        if (!response.ok) {
          throw new Error('Failed to load duplicate analysis');
        }
      }

      const report = await response.json();
      let foundGroup;

      if (report.version === '3.0') {
        // v3 groups are organized by category
        for (const [categoryName, categoryGroups] of Object.entries(report.categorizedGroups)) {
          foundGroup = (categoryGroups as any[]).find((g: any) => g.groupId === groupId);
          if (foundGroup) {
            // Ensure the category is set from the parent category if not already set
            if (!foundGroup.category) {
              foundGroup.category = categoryName;
            }
            break;
          }
        }
      } else {
        // v2 report structure - convert to v3 format
        const v2Group = report.groups.find((g: any) => g.groupId === groupId);
        if (v2Group) {
          foundGroup = {
            ...v2Group,
            category: 'UNCATEGORIZED',
            confidence: 'low',
            recommendedAction: 'manual_review',
            insights: {
              keyDifferences: [],
              commonElements: [],
              qualityIssues: [],
              pedagogicalNotes: [],
            },
          };
        }
      }

      if (!foundGroup) {
        throw new Error('Duplicate group not found');
      }

      setGroup(foundGroup);

      // Store original titles for comparison
      const origTitles: Record<string, string> = {};
      foundGroup.lessons.forEach((lesson: LessonDetail) => {
        origTitles[lesson.lessonId] = lesson.title;
      });
      setOriginalTitles(origTitles);

      // Determine resolution mode based on recommended action
      if (foundGroup.recommendedAction === 'keep_all') {
        setResolutionMode('keep_all');
      } else if (foundGroup.recommendedAction === 'split_group' && foundGroup.subGroups) {
        setResolutionMode('split');
        // Initialize split selections
        const selections: Record<string, string> = {};
        foundGroup.subGroups.forEach((sg: any) => {
          const bestLesson = foundGroup.lessons
            .filter((l: LessonDetail) => sg.lessonIds.includes(l.lessonId))
            .sort(
              (a: LessonDetail, b: LessonDetail) =>
                (b.canonicalScore || 0) - (a.canonicalScore || 0)
            )[0];
          selections[sg.groupName] = bestLesson?.lessonId || sg.lessonIds[0];
        });
        setSplitSelections(selections);
      } else {
        setResolutionMode('single');
        setSelectedCanonical(
          Array.isArray(foundGroup.recommendedCanonical)
            ? foundGroup.recommendedCanonical[0]
            : foundGroup.recommendedCanonical || ''
        );
      }

      // Load full lesson details
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

  const handleTitleChange = (lessonId: string, newTitle: string) => {
    if (newTitle === originalTitles[lessonId]) {
      // If setting back to original, remove from edits
      const newEdits = { ...titleEdits };
      delete newEdits[lessonId];
      setTitleEdits(newEdits);
    } else {
      setTitleEdits((prev) => ({ ...prev, [lessonId]: newTitle }));
    }

    // Update the lesson in the group state
    if (group) {
      const updatedLessons = group.lessons.map((lesson) =>
        lesson.lessonId === lessonId ? { ...lesson, title: newTitle } : lesson
      );
      setGroup({ ...group, lessons: updatedLessons });
    }
  };

  const handleResolve = async () => {
    if (!group) return;

    try {
      setResolving(true);
      setError(null);

      if (resolutionMode === 'keep_all') {
        // Mark all lessons as canonical (no archiving)
        logger.log('Keeping all lessons as valuable variations');
        navigate('/admin/duplicates', {
          state: {
            message: `Preserved all ${group.lessons.length} lessons as valuable variations`,
          },
        });
      } else if (resolutionMode === 'split') {
        // Handle split group resolution
        if (group.subGroups && group.subGroups.length > 0) {
          // Use predefined subGroups
          for (const [subGroupName, canonicalId] of Object.entries(splitSelections)) {
            const subGroup = group.subGroups?.find((sg) => sg.groupName === subGroupName);
            if (!subGroup) continue;

            const duplicateIds = subGroup.lessonIds.filter((id) => id !== canonicalId);

            if (duplicateIds.length > 0) {
              const { data, error: resolveError } = await supabase.rpc('resolve_duplicate_group', {
                p_group_id: `${group.groupId}_${subGroupName}`,
                p_canonical_id: canonicalId,
                p_duplicate_ids: duplicateIds,
                p_duplicate_type: 'pedagogical',
                p_similarity_score: 0.95,
                p_merge_metadata: false,
                p_resolution_notes: `Split group resolution: ${subGroupName}`,
                p_title_updates: prepareTitleUpdatesForRpc(titleEdits),
              });

              if (resolveError) throw resolveError;
              if (!data?.success) throw new Error(data?.error || 'Resolution failed');
            }
          }

          navigate('/admin/duplicates', {
            state: {
              message: `Successfully split group into ${group.subGroups?.length} distinct approaches`,
            },
          });
        } else {
          // Manual selection - keep selected lessons, archive the rest
          const selectedLessonIds = Object.keys(splitSelections);
          const unselectedLessonIds = group.lessons
            .filter((l) => !selectedLessonIds.includes(l.lessonId))
            .map((l) => l.lessonId);

          if (selectedLessonIds.length === 0) {
            throw new Error('No lessons selected to keep');
          }

          if (selectedLessonIds.length === 1) {
            // If only one selected, treat as single canonical resolution
            const { data, error: resolveError } = await supabase.rpc('resolve_duplicate_group', {
              p_group_id: group.groupId,
              p_canonical_id: selectedLessonIds[0],
              p_duplicate_ids: unselectedLessonIds,
              p_duplicate_type: 'near',
              p_similarity_score: 0.95,
              p_merge_metadata: false,
              p_resolution_notes: `Manual split resolution: kept 1 canonical lesson`,
              p_title_updates: prepareTitleUpdatesForRpc(titleEdits),
            });

            if (resolveError) throw resolveError;
            if (!data?.success) throw new Error(data?.error || 'Resolution failed');
          } else {
            // Multiple selected - only archive the unselected ones
            // For multiple selections, we just need to update titles and archive unselected
            // We'll pass title updates through the RPC function instead of updating separately
            const titleUpdatesForRpc = prepareTitleUpdatesForRpc(titleEdits);

            // If there are unselected lessons, archive them
            if (unselectedLessonIds.length > 0) {
              // Use the first selected lesson as the "canonical" for archiving purposes
              const rpcParams = {
                p_group_id: group.groupId,
                p_canonical_id: selectedLessonIds[0],
                p_duplicate_ids: unselectedLessonIds,
                p_duplicate_type: 'pedagogical',
                p_similarity_score: 0.95,
                p_merge_metadata: false,
                p_resolution_notes: `Manual split resolution: kept ${selectedLessonIds.length} lessons as canonical, archived ${unselectedLessonIds.length}`,
                p_title_updates: titleUpdatesForRpc,
              };

              const { data, error: resolveError } = await supabase.rpc(
                'resolve_duplicate_group',
                rpcParams
              );

              if (resolveError) {
                logger.error('RPC error:', resolveError);
                throw resolveError;
              }

              if (!data?.success) throw new Error(data?.error || 'Resolution failed');
            } else {
              // No unselected lessons to archive, just update titles if needed
              if (titleUpdatesForRpc) {
                // Call the RPC with empty duplicate_ids just to update titles
                const rpcParams = {
                  p_group_id: group.groupId,
                  p_canonical_id: selectedLessonIds[0],
                  p_duplicate_ids: [],
<<<<<<< HEAD
                  p_duplicate_type: 'pedagogical',
=======
                  p_duplicate_type: 'near',
>>>>>>> origin/main
                  p_similarity_score: 0.95,
                  p_merge_metadata: false,
                  p_resolution_notes: `Manual split resolution: updated titles only`,
                  p_title_updates: titleUpdatesForRpc,
                };

                const { data, error: resolveError } = await supabase.rpc(
                  'resolve_duplicate_group',
                  rpcParams
                );

                if (resolveError) {
                  logger.error('RPC error:', resolveError);
                  throw resolveError;
                }

                if (!data?.success) throw new Error(data?.error || 'Resolution failed');
              }
            }
          }

          navigate('/admin/duplicates', {
            state: {
              message: `Successfully kept ${selectedLessonIds.length} lesson(s) as canonical`,
            },
          });
        }
      } else {
        // Single canonical resolution
        if (!selectedCanonical || typeof selectedCanonical !== 'string') return;

        const duplicateIds = group.lessons
          .filter((l) => l.lessonId !== selectedCanonical)
          .map((l) => l.lessonId);

        // Map category to duplicate type
        const duplicateType =
          group.category === 'EXACT_CONTENT'
            ? 'exact'
            : group.category === 'PEDAGOGICAL_VARIATIONS'
              ? 'near'
              : 'near';

        const { data, error: resolveError } = await supabase.rpc('resolve_duplicate_group', {
          p_group_id: group.groupId,
          p_canonical_id: selectedCanonical,
          p_duplicate_ids: duplicateIds,
          p_duplicate_type: duplicateType,
          p_similarity_score: 0.95,
          p_merge_metadata: mergeMetadata,
          p_resolution_notes: `Category: ${group.category}, Action: ${group.recommendedAction}`,
          p_resolution_mode: 'single',
          p_sub_group_name: null,
          p_parent_group_id: null,
          p_title_updates: prepareTitleUpdatesForRpc(titleEdits),
        });

        if (resolveError) {
          logger.error('Resolution error:', resolveError);
          throw resolveError;
        }

        if (!data?.success) {
          logger.error('Resolution failed with data:', data);
          throw new Error(data?.error || 'Resolution failed');
        }

        navigate('/admin/duplicates', {
          state: {
            message: `Successfully resolved ${duplicateIds.length} duplicate${duplicateIds.length > 1 ? 's' : ''}`,
          },
        });
      }
    } catch (err) {
      logger.error('Error resolving duplicates:', err);
      setError(err instanceof Error ? err.message : 'Failed to resolve duplicates');
    } finally {
      setResolving(false);
      setShowConfirmation(false);
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
          <div className="grid grid-cols-1 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
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

  const categoryInfo = CATEGORY_INFO[group.category] || CATEGORY_INFO['PEDAGOGICAL_VARIATIONS'];
  const actionInfo = ACTION_INFO[group.recommendedAction] || ACTION_INFO['manual_review'];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/duplicates')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Duplicates
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Duplicate Group: {group.groupId}</h1>
            <p className="text-gray-600 mt-1">{group.lessons.length} lessons in group</p>
          </div>

          {/* Category Badge */}
          <div
            className={`px-4 py-2 rounded-lg bg-${categoryInfo.color}-50 border border-${categoryInfo.color}-200`}
          >
            <div className="flex items-center space-x-2">
              <span className={`text-${categoryInfo.color}-600`}>{categoryInfo.icon}</span>
              <div>
                <p className={`font-medium text-${categoryInfo.color}-900`}>{categoryInfo.label}</p>
                <p className={`text-sm text-${categoryInfo.color}-700`}>
                  Confidence: {group.confidence}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Explanation */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-2">Category Analysis</h3>
        <p className="text-gray-700">{categoryInfo.description}</p>
      </div>

      {/* Insights Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {group.insights.pedagogicalNotes.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2 flex items-center">
              <Info className="w-4 h-4 mr-2" />
              Pedagogical Notes
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              {group.insights.pedagogicalNotes.map((note, idx) => (
                <li key={idx}>• {note}</li>
              ))}
            </ul>
          </div>
        )}

        {group.insights.keyDifferences.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-medium text-yellow-900 mb-2">Key Differences</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              {group.insights.keyDifferences.map((diff, idx) => (
                <li key={idx}>• {diff}</li>
              ))}
            </ul>
          </div>
        )}

        {group.insights.qualityIssues.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-medium text-red-900 mb-2 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Quality Issues
            </h3>
            <ul className="text-sm text-red-800 space-y-1">
              {group.insights.qualityIssues.map((issue, idx) => (
                <li key={idx}>• {issue}</li>
              ))}
            </ul>
          </div>
        )}

        {group.insights.commonElements.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-900 mb-2">Common Elements</h3>
            <ul className="text-sm text-green-800 space-y-1">
              {group.insights.commonElements.map((element, idx) => (
                <li key={idx}>• {element}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommended Action */}
      <div
        className={`bg-${actionInfo.color}-50 border border-${actionInfo.color}-200 rounded-lg p-4 mb-6`}
      >
        <h3 className={`font-medium text-${actionInfo.color}-900 mb-2`}>
          Recommended Action: {actionInfo.label}
        </h3>
        <p className={`text-${actionInfo.color}-800`}>{actionInfo.description}</p>
      </div>

      {/* All Lessons in Group */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">All Lessons in Group</h2>
        <div className="space-y-3">
          {group.lessons.map((lesson) => {
            const fullLesson = lessonDetails[lesson.lessonId];
            return (
              <div
                key={lesson.lessonId}
                className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    <EditableTitle
                      title={lesson.title}
                      lessonId={lesson.lessonId}
                      onTitleChange={handleTitleChange}
                      isEdited={!!titleEdits[lesson.lessonId]}
                      originalTitle={originalTitles[lesson.lessonId]}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">ID: {lesson.lessonId}</p>
                  <div className="text-sm text-gray-600 mt-1">
                    {lesson.gradelevels && lesson.gradelevels.length > 0 && (
                      <span>Grades: {lesson.gradelevels.join(', ')} • </span>
                    )}
                    <span>Score: {(lesson.canonicalScore || 0).toFixed(3)} • </span>
                    <span>
                      Completeness: {((lesson.metadataCompleteness || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  {lesson.lastModified && (
                    <p className="text-xs text-gray-500 mt-1">
                      Modified: {new Date(lesson.lastModified).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex flex-col gap-2">
                  {fullLesson?.file_link ? (
                    <a
                      href={fullLesson.file_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      View in Google Docs →
                    </a>
                  ) : (
                    <span className="px-3 py-1 text-sm bg-gray-300 text-gray-600 rounded">
                      No link available
                    </span>
                  )}
                  {lesson.contentHash && (
                    <span className="text-xs text-gray-400" title={`Hash: ${lesson.contentHash}`}>
                      Hash: {lesson.contentHash.substring(0, 8)}...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resolution Options */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Resolution Options</h2>

        <div className="space-y-4">
          {/* Resolution Mode Selection */}
          <div className="space-y-3">
            <label className="flex items-start space-x-3">
              <input
                type="radio"
                checked={resolutionMode === 'single'}
                onChange={() => setResolutionMode('single')}
                className="mt-1"
              />
              <div>
                <p className="font-medium">Single Canonical Lesson</p>
                <p className="text-sm text-gray-600">
                  Choose one lesson as canonical and archive the rest
                </p>
              </div>
            </label>

            <label className="flex items-start space-x-3">
              <input
                type="radio"
                checked={resolutionMode === 'split'}
                onChange={() => setResolutionMode('split')}
                className="mt-1"
              />
              <div>
                <p className="font-medium">Split Into Sub-Groups</p>
                <p className="text-sm text-gray-600">
                  Keep multiple canonical lessons (useful if you identify distinct approaches)
                </p>
              </div>
            </label>

            {group.recommendedAction === 'keep_all' && (
              <label className="flex items-start space-x-3">
                <input
                  type="radio"
                  checked={resolutionMode === 'keep_all'}
                  onChange={() => setResolutionMode('keep_all')}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">Keep All Lessons</p>
                  <p className="text-sm text-gray-600">
                    Preserve all versions as they have unique value
                  </p>
                </div>
              </label>
            )}
          </div>

          {/* Lesson Selection Based on Mode */}
          {resolutionMode === 'single' && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Select Canonical Lesson:</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {group.lessons.map((lesson) => (
                  <label
                    key={lesson.lessonId}
                    className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCanonical === lesson.lessonId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="canonical"
                      value={lesson.lessonId}
                      checked={selectedCanonical === lesson.lessonId}
                      onChange={(e) => setSelectedCanonical(e.target.value)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium">
                        <EditableTitle
                          title={lesson.title}
                          lessonId={lesson.lessonId}
                          onTitleChange={handleTitleChange}
                          isEdited={!!titleEdits[lesson.lessonId]}
                          originalTitle={originalTitles[lesson.lessonId]}
                        />
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <p>Score: {(lesson.canonicalScore || 0).toFixed(3)}</p>
                        <p>
                          Completeness: {((lesson.metadataCompleteness || 0) * 100).toFixed(0)}%
                        </p>
                        {lesson.gradelevels && lesson.gradelevels.length > 0 && (
                          <p>Grades: {lesson.gradelevels.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {resolutionMode === 'split' && (
            <div className="mt-4 space-y-4">
              <h3 className="font-medium">Select Lessons to Keep as Canonical:</h3>
              {group.subGroups ? (
                // If subGroups are defined, use them
                group.subGroups.map((subGroup) => (
                  <div key={subGroup.groupName} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium mb-2">{subGroup.groupName}</h4>
                    <p className="text-sm text-gray-600 mb-3">{subGroup.rationale}</p>
                    <div className="space-y-2">
                      {group.lessons
                        .filter((l) => subGroup.lessonIds.includes(l.lessonId))
                        .map((lesson) => (
                          <label
                            key={lesson.lessonId}
                            className={`flex items-start p-2 border rounded cursor-pointer ${
                              splitSelections[subGroup.groupName] === lesson.lessonId
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`canonical-${subGroup.groupName}`}
                              value={lesson.lessonId}
                              checked={splitSelections[subGroup.groupName] === lesson.lessonId}
                              onChange={(e) =>
                                setSplitSelections((prev) => ({
                                  ...prev,
                                  [subGroup.groupName]: e.target.value,
                                }))
                              }
                              className="mt-1 mr-3"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium">
                                <EditableTitle
                                  title={lesson.title}
                                  lessonId={lesson.lessonId}
                                  onTitleChange={handleTitleChange}
                                  isEdited={!!titleEdits[lesson.lessonId]}
                                  originalTitle={originalTitles[lesson.lessonId]}
                                  className="text-sm"
                                />
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                Score: {(lesson.canonicalScore || 0).toFixed(3)}
                              </p>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>
                ))
              ) : (
                // Manual selection when no subGroups defined
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-3">
                    Select which lessons should be kept as canonical. The unselected lessons will be
                    archived.
                  </p>
                  {group.lessons.map((lesson) => (
                    <label
                      key={lesson.lessonId}
                      className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                        splitSelections[lesson.lessonId]
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!splitSelections[lesson.lessonId]}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSplitSelections((prev) => ({
                              ...prev,
                              [lesson.lessonId]: lesson.lessonId,
                            }));
                          } else {
                            setSplitSelections((prev) => {
                              const newSelections = { ...prev };
                              delete newSelections[lesson.lessonId];
                              return newSelections;
                            });
                          }
                        }}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          <EditableTitle
                            title={lesson.title}
                            lessonId={lesson.lessonId}
                            onTitleChange={handleTitleChange}
                            isEdited={!!titleEdits[lesson.lessonId]}
                            originalTitle={originalTitles[lesson.lessonId]}
                          />
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <p>Score: {(lesson.canonicalScore || 0).toFixed(3)}</p>
                          <p>
                            Completeness: {((lesson.metadataCompleteness || 0) * 100).toFixed(0)}%
                          </p>
                          {lesson.gradelevels && lesson.gradelevels.length > 0 && (
                            <p>Grades: {lesson.gradelevels.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {resolutionMode !== 'keep_all' && (
            <div className="mt-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={mergeMetadata}
                  onChange={(e) => setMergeMetadata(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Merge metadata from all lessons into canonical</span>
              </label>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
          <button
            onClick={() => navigate('/admin/duplicates')}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => setShowConfirmation(true)}
            disabled={
              resolving ||
              (resolutionMode === 'single' && !selectedCanonical) ||
              (resolutionMode === 'split' && Object.keys(splitSelections).length === 0)
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resolving ? 'Processing...' : 'Apply Resolution'}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Confirm Resolution</h3>

            <div className="space-y-3 mb-6">
              {resolutionMode === 'keep_all' && (
                <p>
                  You are about to mark all {group.lessons.length} lessons as valuable variations
                  that should be preserved.
                </p>
              )}

              {resolutionMode === 'single' && (
                <>
                  <p>You are about to:</p>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    <li>
                      Set lesson "
                      {group.lessons.find((l) => l.lessonId === selectedCanonical)?.title}" as
                      canonical
                    </li>
                    <li>Archive {group.lessons.length - 1} duplicate lesson(s)</li>
                    {mergeMetadata && <li>Merge metadata into the canonical lesson</li>}
                  </ul>
                  {Object.keys(titleEdits).length > 0 && (
                    <div className="mt-3 p-2 bg-blue-50 rounded">
                      <p className="text-sm font-medium text-blue-900 mb-1">Title Updates:</p>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {Object.entries(titleEdits).map(([lessonId, newTitle]) => (
                          <li key={lessonId}>
                            "{originalTitles[lessonId]}" → "{newTitle}"
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {resolutionMode === 'split' && (
                <>
                  <p>
                    You are about to split this group into {group.subGroups?.length} sub-groups:
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {group.subGroups?.map((sg) => (
                      <li key={sg.groupName}>
                        {sg.groupName}: Keep "
                        {
                          group.lessons.find((l) => l.lessonId === splitSelections[sg.groupName])
                            ?.title
                        }
                        "
                      </li>
                    ))}
                  </ul>
                  {Object.keys(titleEdits).length > 0 && (
                    <div className="mt-3 p-2 bg-blue-50 rounded">
                      <p className="text-sm font-medium text-blue-900 mb-1">Title Updates:</p>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {Object.entries(titleEdits).map(([lessonId, newTitle]) => (
                          <li key={lessonId}>
                            "{originalTitles[lessonId]}" → "{newTitle}"
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              <p className="text-sm text-red-600 font-medium">This action cannot be undone.</p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                ref={confirmButtonRef}
                onClick={handleResolve}
                disabled={resolving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {resolving ? 'Processing...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
