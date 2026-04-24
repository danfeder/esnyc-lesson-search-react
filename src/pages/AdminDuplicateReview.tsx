import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { logger } from '@/utils/logger';
import {
  dismissDuplicateGroup,
  fetchDuplicateGroups,
  resolveDuplicateGroup,
  type DuplicateGroupForReview,
  type LessonForReview,
  type LessonResolution,
} from '@/services/duplicateGroupService';
import { addResolvedGroupToStorage } from '@/utils/duplicateGroupHelpers';
import {
  IntAlert,
  IntConfidencePill,
  IntDetectionMethodChip,
  IntGroupReviewBar,
  IntLessonSpecCard,
  IntMetadataDiff,
  IntPageHeader,
  IntSpecRail,
  type IntConfidence,
  type IntDetectionMethod,
  type IntDiffField,
  type IntDiffMode,
} from '@/components/Internal';

type Selection = { action: 'keep' } | { action: 'archive'; archiveTo?: string };

const LESSON_DIFF_FIELDS: IntDiffField<LessonForReview>[] = [
  { key: 'activity_type', label: 'Activity type', kind: 'pills' },
  { key: 'grade_levels', label: 'Grade levels', kind: 'pills' },
  { key: 'thematic_categories', label: 'Thematic categories', kind: 'pills' },
  { key: 'season_timing', label: 'Season / timing', kind: 'pills' },
  { key: 'cultural_heritage', label: 'Cultural heritage', kind: 'pills' },
  { key: 'core_competencies', label: 'Core competencies', kind: 'pills' },
  { key: 'lesson_format', label: 'Lesson format', kind: 'text' },
  { key: 'content_length', label: 'Content length', kind: 'number' },
  { key: 'has_table_format', label: 'Has table format', kind: 'bool' },
];

export function AdminDuplicateReview() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useEnhancedAuth();

  const [allGroups, setAllGroups] = useState<DuplicateGroupForReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selections, setSelections] = useState<Map<string, Selection>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);
  const [diffMode, setDiffMode] = useState<IntDiffMode>('only-differing');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<'resolve' | 'dismiss' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentIndex = useMemo(
    () => allGroups.findIndex((g) => g.groupId === groupId),
    [allGroups, groupId]
  );
  const currentGroup = currentIndex >= 0 ? allGroups[currentIndex] : null;
  const prevGroup = currentIndex > 0 ? allGroups[currentIndex - 1] : null;
  const nextGroup =
    currentIndex >= 0 && currentIndex < allGroups.length - 1 ? allGroups[currentIndex + 1] : null;

  const loadGroups = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Initialize selections when group changes. Default: first lesson kept, rest archive to it.
  useEffect(() => {
    if (!currentGroup) return;
    const keepId = currentGroup.lessons[0].lesson_id;
    const next = new Map<string, Selection>();
    for (const l of currentGroup.lessons) {
      if (l.lesson_id === keepId) {
        next.set(l.lesson_id, { action: 'keep' });
      } else {
        next.set(l.lesson_id, { action: 'archive', archiveTo: keepId });
      }
    }
    setSelections(next);
    setHasChanges(false);
    setSubmitError(null);
  }, [currentGroup]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: Event) => {
      if (hasChanges) {
        e.preventDefault();
        (e as unknown as { returnValue: string }).returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Quick-keep: click a card → that lesson becomes canonical, rest flip to archive with archiveTo = keeper.
  const handleQuickKeep = useCallback(
    (keepLessonId: string) => {
      if (!currentGroup) return;
      setSelections((prev) => {
        const next = new Map(prev);
        for (const l of currentGroup.lessons) {
          if (l.lesson_id === keepLessonId) {
            next.set(l.lesson_id, { action: 'keep' });
          } else {
            next.set(l.lesson_id, { action: 'archive', archiveTo: keepLessonId });
          }
        }
        return next;
      });
      setHasChanges(true);
    },
    [currentGroup]
  );

  const handleArchiveTargetChange = useCallback((lessonId: string, targetId: string) => {
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(lessonId, { action: 'archive', archiveTo: targetId });
      return next;
    });
    setHasChanges(true);
  }, []);

  const keptLessons = useMemo(() => {
    if (!currentGroup) return [] as LessonForReview[];
    return currentGroup.lessons.filter((l) => selections.get(l.lesson_id)?.action === 'keep');
  }, [currentGroup, selections]);

  const archivedLessons = useMemo(() => {
    if (!currentGroup) return [] as LessonForReview[];
    return currentGroup.lessons.filter((l) => selections.get(l.lesson_id)?.action === 'archive');
  }, [currentGroup, selections]);

  const hasValidSelection = useMemo(() => {
    if (!currentGroup || keptLessons.length === 0) return false;
    for (const l of currentGroup.lessons) {
      const sel = selections.get(l.lesson_id);
      if (!sel) return false;
      if (sel.action === 'archive' && !sel.archiveTo) return false;
    }
    return true;
  }, [currentGroup, selections, keptLessons.length]);

  const navigateToList = useCallback(
    (message?: string, resolvedGroup?: DuplicateGroupForReview) => {
      navigate('/admin/duplicates', {
        state: message ? { message, resolvedGroup } : undefined,
      });
    },
    [navigate]
  );

  const handleDismiss = useCallback(async () => {
    if (!currentGroup) return;
    setIsSubmitting(true);
    setSubmittingAction('dismiss');
    setSubmitError(null);
    try {
      const dm: 'same_title' | 'embedding' | 'both' =
        currentGroup.detectionMethod === 'mixed' ? 'both' : currentGroup.detectionMethod;
      const result = await dismissDuplicateGroup(
        currentGroup.lessonIds,
        dm,
        'Dismissed via Keep All action'
      );
      if (!result.success) {
        setSubmitError(result.error || 'Failed to dismiss group');
        return;
      }
      addResolvedGroupToStorage(currentGroup);
      setHasChanges(false);
      const nextId = nextGroup?.groupId ?? null;
      setAllGroups((prev) => prev.filter((g) => g.groupId !== currentGroup.groupId));
      if (nextId) {
        navigate(`/admin/duplicates/${nextId}`);
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
  }, [currentGroup, nextGroup, navigate, navigateToList]);

  const handleResolve = useCallback(async () => {
    if (!currentGroup || !hasValidSelection) return;
    // If nothing is being archived, fall through to dismiss (same semantics)
    if (archivedLessons.length === 0) {
      await handleDismiss();
      return;
    }
    setIsSubmitting(true);
    setSubmittingAction('resolve');
    setSubmitError(null);
    try {
      const resolutions: LessonResolution[] = currentGroup.lessons.map((l) => {
        const sel = selections.get(l.lesson_id);
        if (!sel) throw new Error(`Missing selection for lesson ${l.lesson_id}`);
        if (sel.action === 'keep') {
          return { lessonId: l.lesson_id, action: 'keep' };
        }
        return { lessonId: l.lesson_id, action: 'archive', archiveTo: sel.archiveTo };
      });
      const result = await resolveDuplicateGroup({
        groupId: currentGroup.groupId,
        resolutions,
      });
      if (!result.success) {
        setSubmitError(result.error || 'Failed to resolve group');
        return;
      }
      addResolvedGroupToStorage(currentGroup);
      setHasChanges(false);
      const message = `Resolved group: kept ${result.keptCount}, archived ${result.archivedCount}`;
      const nextId = nextGroup?.groupId ?? null;
      setAllGroups((prev) => prev.filter((g) => g.groupId !== currentGroup.groupId));
      if (nextId) {
        navigate(`/admin/duplicates/${nextId}`);
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
    archivedLessons.length,
    handleDismiss,
    selections,
    nextGroup,
    navigate,
    navigateToList,
  ]);

  const isAdmin =
    user?.role === 'admin' || user?.role === 'reviewer' || user?.role === 'super_admin';

  if (!isAdmin) {
    return (
      <div className="int-shell-root">
        <div className="adm-page">
          <p className="adm-section-desc">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="int-shell-root">
        <div className="adm-page">
          <p className="adm-section-desc">Loading duplicate group…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="int-shell-root">
        <div className="adm-page">
          <IntAlert variant="error" title="Couldn't load duplicate groups">
            {error}{' '}
            <button type="button" className="adm-link" onClick={() => loadGroups()}>
              Try again
            </button>
          </IntAlert>
        </div>
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <div className="int-shell-root">
        <div className="adm-page">
          <IntAlert variant="info" title="Group not found">
            This duplicate group may have already been resolved. Go back to the queue to pick
            another.{' '}
            <button
              type="button"
              className="adm-link"
              onClick={() => navigate('/admin/duplicates')}
            >
              Back to queue
            </button>
          </IntAlert>
        </div>
      </div>
    );
  }

  const n = currentGroup.lessons.length;
  const pct = Math.round((currentGroup.avgSimilarity ?? 0) * 100);
  const keptLesson = keptLessons[0];
  const archivedCount = archivedLessons.length;

  const summaryNode = isSubmitting ? (
    <>Submitting…</>
  ) : archivedCount === 0 ? (
    <>All {n} lessons will be kept (no change).</>
  ) : (
    <>
      Will keep <span className="canonical-name">{keptLesson?.title ?? '—'}</span> as canonical and
      archive <strong>{archivedCount}</strong> lesson{archivedCount === 1 ? '' : 's'}. Each archived
      lesson is soft-deleted and its redirect target is stored on{' '}
      <code
        style={{
          fontSize: 11,
          background: 'var(--color-esy-paper-alt)',
          padding: '1px 4px',
          borderRadius: 3,
        }}
      >
        lessons.canonical_id
      </code>
      ; the group decision is recorded in{' '}
      <code
        style={{
          fontSize: 11,
          background: 'var(--color-esy-paper-alt)',
          padding: '1px 4px',
          borderRadius: 3,
        }}
      >
        duplicate_resolutions
      </code>
      .
    </>
  );

  return (
    <div className="int-shell-root">
      <div className="adm-page">
        <IntPageHeader
          title={currentGroup.lessons[0].title}
          description={`Cluster of ${n} lessons · ${currentGroup.pairCount} flagged pair${
            currentGroup.pairCount === 1 ? '' : 's'
          }. Pick the canonical lesson; the rest will be archived and linked to it. If this isn't a true duplicate, dismiss — lessons stay untouched and the detector won't re-flag them.`}
          back={{ label: 'Back to queue', onClick: () => navigate('/admin/duplicates') }}
        />

        <div className="adm-group-progress">
          <span className="adm-group-progress-counter">
            Group <strong>{currentIndex + 1}</strong> of {allGroups.length}
          </span>
          <div className="adm-group-progress-meta">
            <code
              style={{
                fontSize: 11,
                color: 'var(--color-esy-ink-50)',
                background: 'var(--color-esy-paper-alt)',
                padding: '1px 6px',
                borderRadius: 3,
              }}
            >
              {currentGroup.groupId}
            </code>
            <span className="sep">·</span>
            <span>
              Avg similarity <strong style={{ color: 'var(--color-esy-ink)' }}>{pct}%</strong>
            </span>
            <span className="sep">·</span>
            <IntConfidencePill confidence={currentGroup.confidence as IntConfidence} />
            <span className="sep">·</span>
            <IntDetectionMethodChip method={currentGroup.detectionMethod as IntDetectionMethod} />
          </div>
          <div className="adm-group-progress-nav">
            <button
              type="button"
              className={`adm-btn adm-btn--sm${prevGroup ? '' : ' adm-btn--disabled'}`}
              onClick={() => prevGroup && navigate(`/admin/duplicates/${prevGroup.groupId}`)}
              disabled={!prevGroup}
              aria-label="Previous group"
            >
              <ChevronLeft size={12} aria-hidden="true" /> Prev
            </button>
            <button
              type="button"
              className={`adm-btn adm-btn--sm${nextGroup ? '' : ' adm-btn--disabled'}`}
              onClick={() => nextGroup && navigate(`/admin/duplicates/${nextGroup.groupId}`)}
              disabled={!nextGroup}
              aria-label="Next group"
            >
              Next <ChevronRight size={12} aria-hidden="true" />
            </button>
          </div>
        </div>

        <section style={{ marginBottom: 18 }}>
          <header className="adm-section-head">
            <h2>Lessons in this group</h2>
            <span className="adm-section-head-meta">
              Pick canonical · {n} lesson{n === 1 ? '' : 's'}
            </span>
          </header>
          <IntSpecRail pair={n === 2}>
            {currentGroup.lessons.map((l) => {
              const sel = selections.get(l.lesson_id);
              return (
                <IntLessonSpecCard
                  key={l.lesson_id}
                  lesson={l}
                  groupLessons={currentGroup.lessons}
                  isCanonical={sel?.action === 'keep'}
                  locked={isSubmitting}
                  onKeep={() => handleQuickKeep(l.lesson_id)}
                  archiveTargetId={sel?.action === 'archive' ? sel.archiveTo : undefined}
                  onArchiveTargetChange={(targetId) =>
                    handleArchiveTargetChange(l.lesson_id, targetId)
                  }
                  groupId={currentGroup.groupId}
                />
              );
            })}
          </IntSpecRail>
        </section>

        <section style={{ marginBottom: 18 }}>
          <header className="adm-section-head">
            <h2>Metadata comparison</h2>
            <span className="adm-section-head-meta">
              {n} lesson{n === 1 ? '' : 's'} compared
            </span>
          </header>
          <IntMetadataDiff
            items={currentGroup.lessons}
            fields={LESSON_DIFF_FIELDS}
            mode={diffMode}
            onModeChange={setDiffMode}
            isCanonical={(l) => selections.get(l.lesson_id)?.action === 'keep'}
          />
        </section>

        <IntGroupReviewBar
          summary={summaryNode}
          primaryLabel={
            archivedCount === 0
              ? 'Keep all (no change)'
              : `Resolve (keep ${keptLessons.length}, archive ${archivedCount})`
          }
          dismissLabel="Dismiss group"
          onResolve={handleResolve}
          onDismiss={handleDismiss}
          resolveDisabled={!hasValidSelection}
          dismissDisabled={false}
          isSubmitting={isSubmitting}
          submittingAction={submittingAction}
          error={submitError}
        />
      </div>
    </div>
  );
}
