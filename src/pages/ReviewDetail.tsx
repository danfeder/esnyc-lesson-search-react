import { useState, useEffect, useLayoutEffect, useId, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { parseDbError } from '@/utils/errorHandling';
import { logger } from '@/utils/logger';
import type { ReviewMetadata } from '@/types';
import { reviewFormPayloadSchema } from '@/types/reviewFormPayload.zod';
import { canonicalizeReviewMetadata } from '@/utils/canonicalizeReviewMetadata';
import { STATUS_LABEL, STATUS_TO_BADGE } from '@/utils/submissionStatus';
import { ReviewDocPanel } from '@/components/Review/ReviewDocPanel';
import { ReviewMetadataForm } from '@/components/Review/ReviewMetadataForm';
import { ReviewSearchPanel } from '@/components/Review/ReviewSearchPanel';
import { SubmitterIntentBanner } from '@/components/Review/SubmitterIntentBanner';
import { TitleMismatchWarning } from '@/components/Review/TitleMismatchWarning';
import { type LessonSearchResult } from '@/components/LessonSearchPicker';
import { shouldShowMismatchWarning } from '@/pages/reviewMismatch';
import { ZOD_FIELD_TO_LABEL, parseExtractedContent } from '@/pages/reviewDetailHelpers';
import { buildCandidateCards } from '@/pages/buildCandidateCards';
import { useReviewSubmission, type ReviewDecision } from '@/pages/useReviewSubmission';
import { useSearchEscapeHatch } from '@/pages/useSearchEscapeHatch';
import {
  showCookingFields as deriveShowCookingFields,
  showGardenFields as deriveShowGardenFields,
  validateRequiredFields as computeRequiredFieldErrors,
  computeFieldProgress,
} from '@/pages/reviewValidation';
import {
  IntButton,
  IntDecisionBar,
  IntDuplicateCard,
  IntPageHeader,
  IntStatusBadge,
} from '@/components/Internal';

// ReviewDecision + SubmissionDetail (and the load logic) live in
// `@/pages/useReviewSubmission` (Wave 5 PR-1b Task 1b.1). ReviewDecision is
// imported back above for the page's `decision` form state. SimilarityWithLesson
// + SubmitterTargetLesson live in `@/pages/buildCandidateCards` (PR-1a Task 1a.2).

export function ReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  // Data load + the computed restore-vs-preselect seed live in the
  // useReviewSubmission hook (Wave 5 PR-1b Task 1b.1). The hook owns
  // submission/loading/loadError + the seed; the page keeps its own form state
  // and applies the seed via one effect below.
  const { submission, loading, loadError, initialFormState, reload } = useReviewSubmission(id);
  const [saving, setSaving] = useState(false);
  const [metadata, setMetadata] = useState<ReviewMetadata>({});
  const [decision, setDecision] = useState<ReviewDecision>('approve_new');
  const [notes, setNotes] = useState('');
  const [selectedDuplicate, setSelectedDuplicate] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [legacyDecisionWarning, setLegacyDecisionWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Phase 8b Task 3.6: search escape hatch — collapsible LessonSearchPicker
  // for reviewers to override the submitter's pick or find a target the
  // submitter couldn't. selectedSearchLesson must be declared BEFORE the
  // candidateCards useMemo (which reads it via deps).
  const [selectedSearchLesson, setSelectedSearchLesson] = useState<LessonSearchResult | null>(null);

  const errorBannerRef = useRef<HTMLDivElement | null>(null);

  // Stable input ids so CreatableSelect labels actually associate. react-select
  // doesn't accept a top-level `id` that wires the inner input — must use
  // `inputId` and a matching <label htmlFor>.
  const baseId = useId();
  const inputIds = {
    heritage: `${baseId}-heritage`,
    mainIngredients: `${baseId}-main-ingredients`,
    cookingSkills: `${baseId}-cooking-skills`,
    gardenSkills: `${baseId}-garden-skills`,
    observances: `${baseId}-observances`,
    culturalResponsiveness: `${baseId}-cultural-responsiveness`,
  };

  // Validation/progress logic + the cooking/garden conditional-field
  // derivations live in `@/pages/reviewValidation` as pure functions of
  // `metadata` (Wave 5 PR-1a Task 1a.5). Memoized here so the page's JSX and
  // save flow keep stable references; behavior is unchanged.
  const showCookingFields = useMemo(() => deriveShowCookingFields(metadata), [metadata]);
  const showGardenFields = useMemo(() => deriveShowGardenFields(metadata), [metadata]);

  const validateRequiredFields = useCallback(
    () => computeRequiredFieldErrors(metadata),
    [metadata]
  );

  const fieldProgress = useMemo(() => computeFieldProgress(metadata), [metadata]);

  // Seed the page's form state from the hook's computed restore-vs-preselect
  // object. The hook holds `initialFormState` in its own state so the reference
  // is stable across re-renders — this effect runs once per load. useLayoutEffect
  // (not useEffect) applies the seed SYNCHRONOUSLY in the same commit the data
  // arrives, so the form never paints a default-state frame before seeding —
  // preserving the prior behavior where loadSubmission set decision/metadata in
  // the same batch as the submission (no visible flash, no test-observable race
  // between the seed and the first render with `submission` set).
  useLayoutEffect(() => {
    if (initialFormState) {
      setMetadata(initialFormState.metadata);
      setDecision(initialFormState.decision);
      setNotes(initialFormState.notes);
      setSelectedDuplicate(initialFormState.selectedDuplicate);
      setLegacyDecisionWarning(initialFormState.legacyDecisionWarning);
    }
  }, [initialFormState]);

  useEffect(() => {
    // Pill groups don't expose individual aria-invalid targets, so focus the
    // banner itself — the visible list of missing fields is the recovery path.
    if (validationErrors.length > 0 && errorBannerRef.current) {
      errorBannerRef.current.focus();
      errorBannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [validationErrors]);

  const handleMetadataChange = useCallback(
    <K extends keyof ReviewMetadata>(filterKey: K, value: ReviewMetadata[K]) => {
      setMetadata((prev) => ({ ...prev, [filterKey]: value }));
      // Stale "save failed" banner becomes confusing the moment the
      // reviewer changes anything — they're clearly preparing a fresh
      // attempt. Clear on any meaningful state change.
      setSaveError(null);
    },
    []
  );

  const handleSaveReview = async () => {
    if (!submission) return;

    const errors = validateRequiredFields();
    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setValidationErrors([]);
    setSaveError(null);

    // activityType UI option values end in `-only` (cooking-only / garden-only
    // / etc.); canonical Zod enum + DB CHECK reject the suffix. Strip on the
    // save path only — keeping form state in UI-slug form lets IntPillGroup
    // match the stored value back to its slug option (otherwise the freshly-
    // clicked pill visually deselects on next render).
    // PR 6e E2c: universal safety net — canonicalize the 6 small-vocab fields
    // immediately before the closed-schema validation regardless of how the
    // form was populated (e.g. a residual legacy slug that survived the load
    // path, or a future bug). Already-canonical values pass through unchanged.
    const payload: ReviewMetadata = canonicalizeReviewMetadata({
      ...metadata,
      activityType: metadata.activityType?.map((s) => s.replace(/-only$/, '')),
    });

    // PR 1 Task 1.5: defense-in-depth Zod validation against the same
    // reviewFormPayloadSchema the complete-review edge function enforces.
    // Required-fields above already covers the common UX case; this catches
    // shape drift (e.g., a future bug that sends a wrong type for a closed-
    // enum field) before the network round-trip.
    const parseResult = reviewFormPayloadSchema.safeParse(payload);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      const invalidLabels = Object.keys(fieldErrors).map(
        (key) => ZOD_FIELD_TO_LABEL[key as keyof typeof ZOD_FIELD_TO_LABEL] ?? key
      );
      setValidationErrors(invalidLabels);
      setSaveError('Some fields have invalid values — see highlighted fields above.');
      logger.error('Review form Zod validation failed:', fieldErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);

    try {
      // Phase 4: the entire save flow goes through the complete-review edge
      // function, which auths the JWT, ensures the submission embedding is
      // fresh enough for the decision, and calls complete_review_atomic.
      // The RPC wraps submission_reviews + lesson_submissions + lessons +
      // lesson_versions writes in one transaction, closing the orphan-
      // creation pathway that the Tier-1 work is recovering from.
      const { data, error: invokeError } = await supabase.functions.invoke('complete-review', {
        body: {
          submissionId: submission.id,
          decision,
          metadata: payload,
          notes,
          selectedLessonId: decision === 'approve_update' ? selectedDuplicate : null,
        },
      });

      if (invokeError) throw invokeError;
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        throw new Error(typeof data.error === 'string' ? data.error : 'complete-review failed');
      }

      navigate('/review');
    } catch (error) {
      const parsed = parseDbError(error);
      logger.error('Error saving review:', parsed);
      // Atomicity is the whole point of Phase 4 — when the RPC rolls back,
      // the reviewer must SEE that nothing happened. The pre-existing
      // silent-catch left them clicking again with no feedback.
      const message =
        error instanceof Error && error.message
          ? error.message
          : typeof parsed === 'string'
            ? parsed
            : 'Save failed. Please try again or check the console for details.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  // Server orders by combined_score DESC; just take the top 5.
  const topDuplicates = useMemo(
    () => submission?.similarities?.slice(0, 5) ?? [],
    [submission?.similarities]
  );

  // Phase 8b: unified card list for the decision panel. The mapping +
  // 4-branch composition lives in the pure `buildCandidateCards` builder
  // (Wave 5 PR-1a Task 1a.2; table-driven unit tests in
  // buildCandidateCards.test.ts). Same inputs, same dependency array.
  const candidateCards = useMemo(
    () => buildCandidateCards({ submission, topDuplicates, selectedSearchLesson }),
    [submission, topDuplicates, selectedSearchLesson]
  );

  // Phase 8b Task 3.6: derived plain values for the search escape hatch.
  // Computed during render — not hooks. Passed to the useSearchEscapeHatch
  // hook below to auto-expand the picker, and read by the JSX to choose
  // contextual help text.
  const needsSearch = submission?.submission_type === 'update' && !submission?.original_lesson_id;
  const noDups = candidateCards.length === 0;
  const searchHelpText = needsSearch
    ? "Use this to find the lesson the submitter couldn't"
    : submission?.original_lesson_id
      ? "Use this if you disagree with the submitter's pick"
      : 'Use this when no card above is the right match';

  // Phase 8b Task 3.7: gate for the title-mismatch warning. Pure derivation —
  // returns true only when the merge target was auto-picked (submitter-bound
  // or surfaced by the dup detector). Reviewer manual picks via the search
  // escape hatch are deliberate confirmations and are suppressed.
  const showMismatch = shouldShowMismatchWarning({
    selectedTarget: selectedDuplicate,
    submitterTargetId: submission?.original_lesson_id ?? null,
    topDuplicateIds: topDuplicates.map((d) => d.lesson_id),
    searchPickedId: selectedSearchLesson?.lesson_id ?? null,
  });

  // Search escape hatch: owns `showSearch` + the reset/auto-expand effects
  // (declaration order + dep arrays preserved verbatim — risk 4: reset-first,
  // one-directional auto-expand on [needsSearch, noDups], sticky manual close).
  // `selectedSearchLesson` stays page-owned (buildCandidateCards reads it
  // UPSTREAM of `noDups`); the hook only resets it via the passed setter. See
  // useSearchEscapeHatch for the full effect-ordering rationale.
  const { showSearch, setShowSearch } = useSearchEscapeHatch({
    submissionId: submission?.id,
    needsSearch,
    noDups,
    setSelectedSearchLesson,
  });

  // parseExtractedContent is pure but a few hundred lines of regex; memoize once.
  const parsedContent = useMemo(
    () =>
      submission ? parseExtractedContent(submission.extracted_content) : { title: '', summary: '' },
    [submission]
  );

  if (loading) {
    return (
      <div className="int-shell-root">
        <div className="adm-page adm-page--narrow">
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-esy-ink-70)' }}>
            Loading submission…
          </div>
        </div>
      </div>
    );
  }

  // R2-1: a submission_reviews fetch error BLOCKS here — must win over the
  // not-found branch below (submission is null in the error case). Blocking
  // means the review form never renders, so a transient DB blip can't route the
  // reviewer to a fresh preselect that overwrites a prior review on save. Retry
  // re-runs the load.
  if (loadError) {
    return (
      <div className="int-shell-root">
        <div className="adm-page adm-page--narrow">
          <IntPageHeader
            title="Couldn't load this review"
            description={loadError}
            back={{ label: 'Review queue', onClick: () => navigate('/review') }}
            actions={
              <IntButton variant="primary" onClick={() => reload()}>
                Retry
              </IntButton>
            }
          />
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="int-shell-root">
        <div className="adm-page adm-page--narrow">
          <IntPageHeader
            title="Submission not found"
            description="No submission with that id."
            back={{ label: 'Review queue', onClick: () => navigate('/review') }}
          />
        </div>
      </div>
    );
  }

  const headerTitle = submission.extracted_title || parsedContent.title || 'Untitled submission';
  const submittedOn = submission.created_at
    ? new Date(submission.created_at).toLocaleDateString()
    : '';

  return (
    <div className="int-shell-root">
      <div className="adm-page adm-page--full">
        <IntPageHeader
          title={headerTitle}
          back={{ label: 'Review queue', onClick: () => navigate('/review') }}
          description={`Submitted by ${submission.teacher.full_name || submission.teacher.email}${
            submittedOn ? ` on ${submittedOn}` : ''
          }`}
          actions={
            <a
              href={submission.google_doc_url}
              target="_blank"
              rel="noopener noreferrer"
              className="adm-btn adm-btn--ink"
            >
              Open Google Doc <ExternalLink size={12} aria-hidden />
            </a>
          }
        />

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
            margin: '-12px 0 16px',
            fontSize: 13,
            color: 'var(--color-esy-ink-70)',
          }}
        >
          <IntStatusBadge status={STATUS_TO_BADGE[submission.status]}>
            {STATUS_LABEL[submission.status]}
          </IntStatusBadge>
          <span>
            {submission.submission_type === 'new' ? 'New lesson' : 'Update to existing lesson'}
          </span>
          {topDuplicates.length > 0 && (
            <span
              style={{
                color: 'var(--color-esy-orange-revision)',
                fontFamily: 'var(--esy-font-display)',
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {topDuplicates.length} possible dup{topDuplicates.length === 1 ? '' : 'es'}
            </span>
          )}
        </div>

        <div className="adm-split adm-split--3col">
          {/* LEFT — metadata */}
          <ReviewMetadataForm
            metadata={metadata}
            onChange={handleMetadataChange}
            inputIds={inputIds}
            showCookingFields={showCookingFields}
            showGardenFields={showGardenFields}
            fieldProgress={fieldProgress}
            validationErrors={validationErrors}
            errorBannerRef={errorBannerRef}
            legacyDecisionWarning={legacyDecisionWarning}
          />

          {/* MIDDLE — document */}
          <ReviewDocPanel
            headerTitle={headerTitle}
            googleDocUrl={submission.google_doc_url}
            googleDocId={submission.google_doc_id}
            extractedContent={submission.extracted_content}
          />

          {/* RIGHT — duplicates + decision */}
          <div>
            {/* Phase 8b: binding-intent banner. Rendered FIRST so the reviewer
                reads what the submitter declared BEFORE the candidate cards,
                mismatch warning, and search escape hatch — all of which
                depend on or react to that declared intent. */}
            <SubmitterIntentBanner
              submissionType={submission.submission_type}
              targetId={submission.original_lesson_id}
              submitterTargetLesson={submission.submitterTargetLesson}
              topDuplicates={topDuplicates}
            />

            {candidateCards.length > 0 && (
              <div className="adm-card">
                <div className="adm-section-eyebrow">
                  {candidateCards[0]?.matchLabel === "Submitter's choice"
                    ? 'Candidate matches'
                    : 'Possible duplicates'}
                </div>
                <p className="adm-section-desc">
                  Select one to merge into instead of publishing new.
                </p>
                <div className="adm-dup-list">
                  {candidateCards.map((c) => (
                    <IntDuplicateCard
                      key={c.id}
                      dup={{
                        id: c.id,
                        title: c.title,
                        meta: c.meta,
                        similarity: c.similarity,
                        matchType: c.matchType,
                        matchLabel: c.matchLabel,
                      }}
                      selected={selectedDuplicate === c.id}
                      onSelect={() => {
                        setSelectedDuplicate(selectedDuplicate === c.id ? null : c.id);
                        setSaveError(null);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Phase 8b Task 3.7: title-mismatch warning. Fires only when the
                target was auto-picked (submitter-bound or dup-detector hit)
                AND the target's title diverges from the submission's
                extracted title (word-set Jaccard < 0.3). Suppressed for
                reviewer manual picks via the search escape hatch. */}
            <TitleMismatchWarning
              showMismatch={showMismatch}
              candidateCards={candidateCards}
              selectedDuplicate={selectedDuplicate}
              extractedTitle={submission.extracted_title}
            />

            {/* Phase 8b Task 3.6: search escape hatch — collapsed by default,
                auto-expanded for (update, null) and zero-candidate cases. */}
            <ReviewSearchPanel
              showSearch={showSearch}
              onToggle={() => setShowSearch((v) => !v)}
              searchHelpText={searchHelpText}
              selectedSearchLesson={selectedSearchLesson}
              setSelectedSearchLesson={setSelectedSearchLesson}
              selectedDuplicate={selectedDuplicate}
              setSelectedDuplicate={setSelectedDuplicate}
              setSaveError={setSaveError}
            />

            <div className="adm-card">
              <div className="adm-section-eyebrow">Decision</div>
              <fieldset className="adm-radio-group" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="sr-only">Choose a decision</legend>
                <label className="adm-radio">
                  <input
                    type="radio"
                    name="decision"
                    value="approve_new"
                    checked={decision === 'approve_new'}
                    onChange={() => {
                      setDecision('approve_new');
                      setSaveError(null);
                    }}
                  />
                  Approve &amp; publish
                </label>
                <label className="adm-radio">
                  <input
                    type="radio"
                    name="decision"
                    value="approve_update"
                    checked={decision === 'approve_update'}
                    onChange={() => {
                      setDecision('approve_update');
                      setSaveError(null);
                    }}
                  />
                  Merge into existing
                </label>
                <label className="adm-radio">
                  <input
                    type="radio"
                    name="decision"
                    value="needs_revision"
                    checked={decision === 'needs_revision'}
                    onChange={() => {
                      setDecision('needs_revision');
                      setSaveError(null);
                    }}
                  />
                  Request revisions
                </label>
              </fieldset>
            </div>

            <div className="adm-card">
              <div className="adm-section-eyebrow">
                Note to {(submission.teacher.full_name || 'teacher').split(' ')[0]}
              </div>
              <textarea
                className="adm-textarea"
                rows={4}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setSaveError(null);
                }}
                placeholder="Optional. Will be emailed to the teacher along with the decision."
              />
            </div>

            {saveError && (
              <div role="alert" className="adm-hint adm-hint--error adm-alert--error">
                Save failed — nothing was written. {saveError}
              </div>
            )}

            <IntDecisionBar
              eyebrow="Metadata"
              detail={`${fieldProgress.completed}/${fieldProgress.total} required filled`}
            >
              {decision === 'approve_new' && (
                <IntButton variant="primary" size="lg" onClick={handleSaveReview} disabled={saving}>
                  {saving ? 'Publishing…' : 'Publish lesson'}
                </IntButton>
              )}
              {decision === 'approve_update' && (
                <IntButton
                  variant="ink"
                  size="lg"
                  onClick={handleSaveReview}
                  disabled={saving || !selectedDuplicate}
                >
                  {saving ? 'Merging…' : 'Merge & archive'}
                </IntButton>
              )}
              {decision === 'needs_revision' && (
                <IntButton variant="ink" size="lg" onClick={handleSaveReview} disabled={saving}>
                  {saving ? 'Sending…' : 'Send for revision'}
                </IntButton>
              )}
            </IntDecisionBar>

            {decision === 'approve_update' && !selectedDuplicate && (
              <p className="text-sm text-gray-600 mt-2">
                Pick a target lesson to merge into, or change to Approve as new.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
