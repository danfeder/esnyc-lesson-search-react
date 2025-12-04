import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { logger } from '@/utils/logger';
import {
  fetchDuplicateGroups,
  resolveDuplicateGroup,
  dismissDuplicateGroup,
  type DuplicateGroupForReview,
  type LessonResolution,
} from '@/services/duplicateGroupService';
import {
  DuplicateReviewHeader,
  LessonReviewCard,
  ResolutionActions,
  type Selection,
} from '@/components/Admin/DuplicatesNew';
import { addResolvedGroupToStorage } from '@/utils/duplicateGroupHelpers';

/**
 * Detail page for reviewing a single duplicate group.
 * Shows lessons in a grid with Keep/Archive selectors.
 */
export function AdminDuplicateReviewNew() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useEnhancedAuth();

  // Data state
  const [allGroups, setAllGroups] = useState<DuplicateGroupForReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state - map of lessonId to selection
  const [selections, setSelections] = useState<Map<string, Selection>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<'keepAll' | 'saveAndNext' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Find current group and index
  const currentIndex = useMemo(
    () => allGroups.findIndex((g) => g.groupId === groupId),
    [allGroups, groupId]
  );
  const currentGroup = currentIndex >= 0 ? allGroups[currentIndex] : null;

  // Load all groups on mount
  useEffect(() => {
    loadGroups();
  }, []);

  // Initialize selections when group changes
  useEffect(() => {
    if (currentGroup) {
      initializeSelections(currentGroup);
    }
  }, [currentGroup]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: Event) => {
      if (hasChanges) {
        e.preventDefault();
        // Required for Chrome - returnValue is deprecated but still needed
        (e as unknown as { returnValue: string }).returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  async function loadGroups() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDuplicateGroups({ includeResolved: false });
      setAllGroups(data);
    } catch (err) {
      logger.error('Error loading duplicate groups:', err);
      setError(err instanceof Error ? err.message : 'Failed to load duplicate groups');
    } finally {
      setLoading(false);
    }
  }

  function initializeSelections(group: DuplicateGroupForReview) {
    // Default: first lesson is kept, rest are kept too
    // User can change as needed
    const newSelections = new Map<string, Selection>();
    for (const lesson of group.lessons) {
      newSelections.set(lesson.lesson_id, { action: 'keep' });
    }
    setSelections(newSelections);
    setHasChanges(false);
    setSubmitError(null);
  }

  const handleSelectionChange = useCallback((lessonId: string, selection: Selection) => {
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(lessonId, selection);
      return next;
    });
    setHasChanges(true);
  }, []);

  const handleQuickKeep = useCallback(
    (keepLessonId: string) => {
      if (!currentGroup) return;

      // Set this lesson to keep, archive all others to it
      setSelections((prev) => {
        const next = new Map(prev);
        for (const lesson of currentGroup.lessons) {
          if (lesson.lesson_id === keepLessonId) {
            next.set(lesson.lesson_id, { action: 'keep' });
          } else {
            next.set(lesson.lesson_id, { action: 'archive', archiveTo: keepLessonId });
          }
        }
        return next;
      });
      setHasChanges(true);
    },
    [currentGroup]
  );

  // Get list of lessons currently marked as "Keep"
  const keptLessons = useMemo(() => {
    if (!currentGroup) return [];
    return currentGroup.lessons.filter((l) => selections.get(l.lesson_id)?.action === 'keep');
  }, [currentGroup, selections]);

  // Validate that we have at least one kept lesson and all archives have targets
  const hasValidSelection = useMemo(() => {
    if (!currentGroup || keptLessons.length === 0) return false;

    for (const lesson of currentGroup.lessons) {
      const sel = selections.get(lesson.lesson_id);
      if (!sel) return false;
      if (sel.action === 'archive' && !sel.archiveTo) return false;
    }
    return true;
  }, [currentGroup, selections, keptLessons]);

  // Navigation helpers
  const navigateToGroup = useCallback(
    (groupId: string) => {
      navigate(`/admin/duplicates/${groupId}`);
    },
    [navigate]
  );

  const navigateToList = useCallback(
    (message?: string, resolvedGroup?: DuplicateGroupForReview) => {
      navigate('/admin/duplicates', {
        state: message ? { message, resolvedGroup } : undefined,
      });
    },
    [navigate]
  );

  // Handle Keep All (dismiss group)
  const handleKeepAll = useCallback(async () => {
    if (!currentGroup) return;

    setIsSubmitting(true);
    setSubmittingAction('keepAll');
    setSubmitError(null);

    try {
      // Map detection method - dismissDuplicateGroup expects specific values
      let detectionMethod: 'same_title' | 'embedding' | 'both';
      if (currentGroup.detectionMethod === 'mixed') {
        detectionMethod = 'both';
      } else {
        detectionMethod = currentGroup.detectionMethod;
      }

      const result = await dismissDuplicateGroup(
        currentGroup.lessonIds,
        detectionMethod,
        'Dismissed via Keep All action'
      );

      if (!result.success) {
        setSubmitError(result.error || 'Failed to dismiss group');
        return;
      }

      // Save resolved group to sessionStorage
      addResolvedGroupToStorage(currentGroup);

      // Navigate to next group or back to list
      // Calculate next group ID BEFORE updating state to avoid race condition
      const nextGroupId =
        currentIndex < allGroups.length - 1 ? allGroups[currentIndex + 1].groupId : null;

      // Remove current group from state
      setAllGroups((prev) => prev.filter((g) => g.groupId !== currentGroup.groupId));

      if (nextGroupId) {
        navigateToGroup(nextGroupId);
      } else {
        navigateToList(
          `Kept all ${currentGroup.lessons.length} lessons as non-duplicates`,
          currentGroup
        );
      }
    } catch (err) {
      logger.error('Error dismissing group:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to dismiss group');
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  }, [currentGroup, currentIndex, allGroups, navigateToGroup, navigateToList]);

  // Handle Skip (go to next without saving)
  const handleSkip = useCallback(() => {
    const nextGroupId =
      currentIndex < allGroups.length - 1 ? allGroups[currentIndex + 1].groupId : null;

    if (nextGroupId) {
      navigateToGroup(nextGroupId);
    } else {
      navigateToList();
    }
  }, [currentIndex, allGroups, navigateToGroup, navigateToList]);

  // Handle Save & Next (resolve and continue)
  const handleSaveAndNext = useCallback(async () => {
    if (!currentGroup || !hasValidSelection) return;

    setIsSubmitting(true);
    setSubmittingAction('saveAndNext');
    setSubmitError(null);

    try {
      // Build resolution from selections
      const resolutions: LessonResolution[] = currentGroup.lessons.map((lesson) => {
        const sel = selections.get(lesson.lesson_id)!;
        if (sel.action === 'keep') {
          return { lessonId: lesson.lesson_id, action: 'keep' };
        } else {
          return { lessonId: lesson.lesson_id, action: 'archive', archiveTo: sel.archiveTo };
        }
      });

      // Check if any are actually being archived
      const hasArchives = resolutions.some((r) => r.action === 'archive');

      if (!hasArchives) {
        // All are kept - treat as Keep All
        await handleKeepAll();
        return;
      }

      const result = await resolveDuplicateGroup({
        groupId: currentGroup.groupId,
        resolutions,
      });

      if (!result.success) {
        setSubmitError(result.error || 'Failed to resolve group');
        return;
      }

      // Save resolved group to sessionStorage
      addResolvedGroupToStorage(currentGroup);

      // Navigate to next group or back to list
      const message = `Resolved group: kept ${result.keptCount}, archived ${result.archivedCount}`;

      // Calculate next group ID BEFORE updating state to avoid race condition
      const nextGroupId =
        currentIndex < allGroups.length - 1 ? allGroups[currentIndex + 1].groupId : null;

      // Remove current group from state
      setAllGroups((prev) => prev.filter((g) => g.groupId !== currentGroup.groupId));

      if (nextGroupId) {
        navigateToGroup(nextGroupId);
      } else {
        navigateToList(message, currentGroup);
      }
    } catch (err) {
      logger.error('Error resolving group:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to resolve group');
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  }, [
    currentGroup,
    hasValidSelection,
    selections,
    currentIndex,
    allGroups,
    handleKeepAll,
    navigateToGroup,
    navigateToList,
  ]);

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
          <span className="ml-3 text-gray-600">Loading duplicate group...</span>
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

  if (!currentGroup) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Group not found or already resolved.</p>
          <button
            onClick={() => navigateToList()}
            className="mt-2 text-sm text-yellow-700 hover:text-yellow-900 underline"
          >
            Back to list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 pb-24">
      {/* Header with back link and progress */}
      <DuplicateReviewHeader
        group={currentGroup}
        currentIndex={currentIndex}
        totalGroups={allGroups.length}
      />

      {/* Instructions */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Instructions:</strong> Review the lessons below and decide which to keep. Click a
          card to quickly select it as the only one to keep, or use the dropdowns for more control.
          Archived lessons will be linked to the lesson they're archived to.
        </p>
      </div>

      {/* Lesson grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentGroup.lessons.map((lesson) => (
          <LessonReviewCard
            key={lesson.lesson_id}
            lesson={lesson}
            selection={selections.get(lesson.lesson_id) || { action: 'keep' }}
            keptLessons={keptLessons}
            onSelectionChange={(sel) => handleSelectionChange(lesson.lesson_id, sel)}
            onQuickKeep={() => handleQuickKeep(lesson.lesson_id)}
          />
        ))}
      </div>

      {/* Selection summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>Selection:</strong>{' '}
          {keptLessons.length === currentGroup.lessons.length
            ? 'All lessons will be kept'
            : `${keptLessons.length} kept, ${currentGroup.lessons.length - keptLessons.length} will be archived`}
        </p>
      </div>

      {/* Fixed bottom action bar */}
      <ResolutionActions
        onKeepAll={handleKeepAll}
        onSkip={handleSkip}
        onSaveAndNext={handleSaveAndNext}
        isSubmitting={isSubmitting}
        submittingAction={submittingAction}
        hasValidSelection={hasValidSelection}
        error={submitError}
      />
    </div>
  );
}
