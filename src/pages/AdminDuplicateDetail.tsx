import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { logger } from '@/utils/logger';
import { prepareTitleUpdatesForRpc } from '@/utils/validation';
import type {
  DuplicateGroup,
  DuplicateReport,
  V3ReportGroup,
  V2ReportGroup,
  LessonWithMetadata,
} from '@/types/admin';
import { isV3Report } from '@/types/admin';
import { DuplicateHeader } from '@/components/Admin/Duplicates/DuplicateHeader';
import { DuplicateInsights } from '@/components/Admin/Duplicates/DuplicateInsights';
import { DuplicateLessonList } from '@/components/Admin/Duplicates/DuplicateLessonList';
import { DuplicateResolution } from '@/components/Admin/Duplicates/DuplicateResolution';

export function AdminDuplicateDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useEnhancedAuth();
  const [group, setGroup] = useState<DuplicateGroup | null>(null);
  const [selectedCanonical, setSelectedCanonical] = useState<string | string[]>('');
  const [mergeMetadata, setMergeMetadata] = useState(true);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonDetails, setLessonDetails] = useState<Record<string, LessonWithMetadata>>({});
  const [resolutionMode, setResolutionMode] = useState<'single' | 'split' | 'keep_all'>('single');
  const [splitSelections, setSplitSelections] = useState<Record<string, string>>({});
  const [titleEdits, setTitleEdits] = useState<Record<string, string>>({});
  const [originalTitles, setOriginalTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (groupId) {
      loadGroupDetails();
    }
  }, [groupId]);

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

      const report = (await response.json()) as DuplicateReport;
      let foundGroup: V3ReportGroup | undefined;

      if (isV3Report(report)) {
        // v3 groups are organized by category
        for (const [categoryName, categoryGroups] of Object.entries(report.categorizedGroups)) {
          foundGroup = categoryGroups.find((g) => g.groupId === groupId);
          if (foundGroup) {
            // Ensure the category is set from the parent category if not already set
            if (!foundGroup.category) {
              foundGroup = { ...foundGroup, category: categoryName };
            }
            break;
          }
        }
      } else {
        // v2 report structure - convert to v3 format
        const v2Group = (report as { groups: V2ReportGroup[] }).groups.find(
          (g) => g.groupId === groupId
        );
        if (v2Group) {
          foundGroup = {
            groupId: v2Group.groupId,
            lessonCount: v2Group.lessonCount,
            lessons: v2Group.lessons.map((l) => ({
              lessonId: l.lessonId,
              title: l.title,
            })),
            category: 'UNCATEGORIZED',
            confidence: 'low' as const,
            recommendedAction: 'manual_review' as const,
            recommendedCanonical: v2Group.recommendedCanonical,
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

      // Transform V3ReportGroup to DuplicateGroup for state
      const transformedGroup: DuplicateGroup = {
        groupId: foundGroup.groupId,
        category: foundGroup.category || 'UNCATEGORIZED',
        confidence: foundGroup.confidence || 'low',
        recommendedAction: foundGroup.recommendedAction || 'manual_review',
        recommendedCanonical: foundGroup.recommendedCanonical || '',
        lessonCount: foundGroup.lessonCount,
        lessons: foundGroup.lessons.map((l) => ({
          lessonId: l.lessonId,
          title: l.title,
          canonicalScore: l.canonicalScore,
          metadataCompleteness: l.metadataCompleteness,
          scoreBreakdown: l.scoreBreakdown,
        })),
        insights: foundGroup.insights || {
          keyDifferences: [],
          commonElements: [],
          qualityIssues: [],
          pedagogicalNotes: [],
        },
        subGroups: foundGroup.subGroups,
        similarityMatrix: foundGroup.similarityMatrix,
      };

      setGroup(transformedGroup);

      // Store original titles for comparison
      const origTitles: Record<string, string> = {};
      foundGroup.lessons.forEach((lesson) => {
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
        foundGroup.subGroups.forEach((sg) => {
          const bestLesson = foundGroup.lessons
            .filter((l) => sg.lessonIds.includes(l.lessonId))
            .sort((a, b) => (b.canonicalScore || 0) - (a.canonicalScore || 0))[0];
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
      const lessonIds = foundGroup.lessons.map((l) => l.lessonId);
      const { data: lessons, error: dbError } = await supabase
        .from('lessons_with_metadata')
        .select('*')
        .in('lesson_id', lessonIds);

      if (dbError) throw dbError;

      const detailsMap: Record<string, LessonWithMetadata> = {};
      lessons?.forEach((lesson) => {
        if (lesson.lesson_id) {
          detailsMap[lesson.lesson_id] = lesson;
        }
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

              if (!data || typeof data !== 'object') {
                throw new Error('Invalid response from resolve_duplicate_group');
              }
              const result = data as { success?: boolean; error?: string };
              if (!result.success) {
                throw new Error(result.error || 'Resolution failed');
              }
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
            const result = data as { success: boolean; error?: string } | null;
            if (!result?.success) throw new Error(result?.error || 'Resolution failed');
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

              const result = data as { success: boolean; error?: string } | null;
              if (!result?.success) throw new Error(result?.error || 'Resolution failed');
            } else {
              // No unselected lessons to archive, just update titles if needed
              if (titleUpdatesForRpc) {
                // Call the RPC with empty duplicate_ids just to update titles
                const rpcParams = {
                  p_group_id: group.groupId,
                  p_canonical_id: selectedLessonIds[0],
                  p_duplicate_ids: [],
                  p_duplicate_type: 'pedagogical',
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

                const result = data as { success: boolean; error?: string } | null;
                if (!result?.success) throw new Error(result?.error || 'Resolution failed');
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
          p_sub_group_name: undefined,
          p_parent_group_id: undefined,
          p_title_updates: prepareTitleUpdatesForRpc(titleEdits),
        });

        if (resolveError) {
          logger.error('Resolution error:', resolveError);
          throw resolveError;
        }

        const result = data as { success: boolean; error?: string } | null;
        if (!result?.success) {
          logger.error('Resolution failed with data:', result);
          throw new Error(result?.error || 'Resolution failed');
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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <DuplicateHeader group={group} />

      <DuplicateInsights insights={group.insights} />

      <DuplicateLessonList
        group={group}
        lessonDetails={lessonDetails}
        titleEdits={titleEdits}
        originalTitles={originalTitles}
        onTitleChange={handleTitleChange}
      />

      <DuplicateResolution
        group={group}
        resolutionMode={resolutionMode}
        setResolutionMode={setResolutionMode}
        selectedCanonical={selectedCanonical}
        setSelectedCanonical={setSelectedCanonical}
        splitSelections={splitSelections}
        setSplitSelections={setSplitSelections}
        titleEdits={titleEdits}
        originalTitles={originalTitles}
        onTitleChange={handleTitleChange}
        onResolve={handleResolve}
        resolving={resolving}
        mergeMetadata={mergeMetadata}
        setMergeMetadata={setMergeMetadata}
      />
    </div>
  );
}
