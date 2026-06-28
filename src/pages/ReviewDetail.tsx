import { useState, useEffect, useId, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { parseDbError } from '@/utils/errorHandling';
import { logger } from '@/utils/logger';
import type { ReviewMetadata } from '@/types';
import { reviewFormPayloadSchema } from '@/types/reviewFormPayload.zod';
import { canonicalizeReviewMetadata } from '@/utils/canonicalizeReviewMetadata';
import { ALL_FIELD_CONFIGS } from '@/utils/filterDefinitions';
import { STATUS_LABEL, STATUS_TO_BADGE, type SubmissionStatus } from '@/utils/submissionStatus';
import { ReviewDocPanel } from '@/components/Review/ReviewDocPanel';
import { SubmitterIntentBanner } from '@/components/Review/SubmitterIntentBanner';
import { TitleMismatchWarning } from '@/components/Review/TitleMismatchWarning';
import { LessonSearchPicker, type LessonSearchResult } from '@/components/LessonSearchPicker';
import { shouldShowMismatchWarning } from '@/pages/reviewMismatch';
import { computePreselection } from '@/pages/reviewPreselect';
import { computeInitialMetadataFromAiDraft } from '@/pages/reviewMetadataInit';
import {
  ZOD_FIELD_TO_LABEL,
  reAddActivityTypeSuffix,
  parseExtractedContent,
  selectOptionsFromConfig,
  flattenHeritageOptions,
} from '@/pages/reviewDetailHelpers';
import {
  buildCandidateCards,
  type SimilarityWithLesson,
  type SubmitterTargetLesson,
} from '@/pages/buildCandidateCards';
import {
  IntButton,
  IntDecisionBar,
  IntDuplicateCard,
  IntFormField,
  IntPageHeader,
  IntPillGroup,
  IntProgressBar,
  IntStatusBadge,
} from '@/components/Internal';

// As of Phase 4 (complete-review edge function + complete_review_atomic
// RPC), the DB-side CHECK on lesson_submissions.status accepts 'rejected'
// too. The UI here still only renders three decisions — Phase 8a will add
// the reject radio. The four-decision union is reserved for that flip.
type ReviewDecision = 'approve_new' | 'approve_update' | 'needs_revision';

// SimilarityWithLesson + SubmitterTargetLesson moved to
// `@/pages/buildCandidateCards` (Wave 5 PR-1a Task 1a.2) and imported back
// above, so the pure card builder can co-locate the types it owns without a
// circular dependency on this page.
interface SubmissionDetail {
  id: string;
  created_at: string;
  google_doc_url: string;
  google_doc_id: string;
  submission_type: 'new' | 'update';
  original_lesson_id?: string;
  status: SubmissionStatus;
  extracted_content: string;
  extracted_title?: string;
  content_hash: string;
  content_embedding?: string;
  teacher: { email: string; full_name?: string };
  similarities?: SimilarityWithLesson[];
  submitterTargetLesson?: SubmitterTargetLesson | null;
  review?: { metadata: ReviewMetadata; decision: string; notes: string };
}

export function ReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [showSearch, setShowSearch] = useState<boolean>(false);

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

  const showCookingFields = useMemo(() => {
    const types = metadata.activityType ?? [];
    return types.includes('cooking') || types.includes('cooking-only');
  }, [metadata.activityType]);
  const showGardenFields = useMemo(() => {
    const types = metadata.activityType ?? [];
    return types.includes('garden') || types.includes('garden-only');
  }, [metadata.activityType]);

  const validateRequiredFields = useCallback(() => {
    const errors: string[] = [];
    if (!metadata.activityType?.length) errors.push('Activity Type');
    if (!metadata.location) errors.push('Location');
    if (!metadata.gradeLevels?.length) errors.push('Grade Levels');
    if (!metadata.themes?.length) errors.push('Thematic Categories');
    if (!metadata.season?.length) errors.push('Season & Timing');
    if (!metadata.coreCompetencies?.length) errors.push('Core Competencies');
    if (!metadata.socialEmotionalLearning?.length) errors.push('Social-Emotional Learning');
    if (showCookingFields) {
      if (!metadata.cookingMethods?.length) errors.push('Cooking Methods');
      if (!metadata.mainIngredients?.length) errors.push('Main Ingredients');
      if (!metadata.cookingSkills?.length) errors.push('Cooking Skills');
    }
    if (showGardenFields) {
      if (!metadata.gardenSkills?.length) errors.push('Garden Skills');
    }
    return errors;
  }, [metadata, showCookingFields, showGardenFields]);

  const fieldProgress = useMemo(() => {
    const required: { label: string; filled: boolean }[] = [
      { label: 'Activity Type', filled: (metadata.activityType?.length ?? 0) > 0 },
      { label: 'Location', filled: !!metadata.location },
      { label: 'Grade Levels', filled: (metadata.gradeLevels?.length ?? 0) > 0 },
      { label: 'Thematic Categories', filled: (metadata.themes?.length ?? 0) > 0 },
      { label: 'Season & Timing', filled: (metadata.season?.length ?? 0) > 0 },
      { label: 'Core Competencies', filled: (metadata.coreCompetencies?.length ?? 0) > 0 },
      {
        label: 'Social-Emotional Learning',
        filled: (metadata.socialEmotionalLearning?.length ?? 0) > 0,
      },
    ];
    if (showCookingFields) {
      required.push(
        { label: 'Cooking Methods', filled: (metadata.cookingMethods?.length ?? 0) > 0 },
        { label: 'Main Ingredients', filled: (metadata.mainIngredients?.length ?? 0) > 0 },
        { label: 'Cooking Skills', filled: (metadata.cookingSkills?.length ?? 0) > 0 }
      );
    }
    if (showGardenFields) {
      required.push({ label: 'Garden Skills', filled: (metadata.gardenSkills?.length ?? 0) > 0 });
    }
    const completed = required.filter((f) => f.filled).length;
    return { completed, total: required.length };
  }, [metadata, showCookingFields, showGardenFields]);

  const loadSubmission = useCallback(async () => {
    try {
      const { data: submissionData, error: submissionError } = await supabase
        .from('lesson_submissions')
        .select('*, content_embedding')
        .eq('id', id!)
        .single();

      if (submissionError) throw submissionError;
      if (!submissionData) {
        logger.error('No submission found with id:', id);
        setLoading(false);
        return;
      }

      const { data: similarities } = await supabase
        .from('submission_similarities')
        .select('*')
        .eq('submission_id', id!)
        .order('combined_score', { ascending: false });

      let similaritiesWithLessons: SimilarityWithLesson[] = [];
      if (similarities && similarities.length > 0) {
        const lessonIds = similarities.map((s) => s.lesson_id);
        const { data: lessons, error: lessonsError } = await supabase
          .from('lessons_with_metadata')
          .select('lesson_id, title, grade_levels, thematic_categories')
          .in('lesson_id', lessonIds);

        if (lessonsError) {
          logger.error('Error fetching similar lessons:', lessonsError);
        }

        if (lessons) {
          similaritiesWithLessons = similarities.map((sim) => {
            const lesson = lessons.find((l) => l.lesson_id === sim.lesson_id);
            return {
              ...sim,
              lesson: lesson || { title: 'Unknown', grade_levels: [], thematic_categories: [] },
            };
          });
        }
      }

      // Phase 8b: if submitter bound to a lesson that's NOT in the rendered
      // top-5 dup cards, fetch it separately so the unified card list can
      // render it as "Submitter's choice." CRITICAL: check against the
      // SLICED top-5 (not the full similarities array) — the render path
      // uses topDuplicates = submission.similarities.slice(0, 5), so a
      // submitter target sitting at rank 6+ of dup detection is not
      // visible in the cards UI and needs the same off-list treatment.
      const submitterTargetId = submissionData?.original_lesson_id ?? null;
      const renderedTopFive = similaritiesWithLessons.slice(0, 5);
      const targetInRenderedTopFive = submitterTargetId
        ? renderedTopFive.some((s) => s.lesson_id === submitterTargetId)
        : false;
      let submitterTargetLesson: SubmitterTargetLesson | null = null;
      if (submitterTargetId && !targetInRenderedTopFive) {
        const { data: targetData, error: targetErr } = await supabase
          .from('lessons_with_metadata')
          .select('lesson_id, title, summary, file_link, grade_levels, thematic_categories')
          .eq('lesson_id', submitterTargetId)
          .single();
        if (targetErr) {
          logger.error('Failed to fetch off-list submitter target:', targetErr);
        }
        // Coalesce nullable view fields. lessons_with_metadata is typed
        // with nullable lesson_id and title (Supabase view nullability)
        // — guard before constructing the SubmitterTargetLesson which
        // requires both.
        if (!targetErr && targetData && targetData.lesson_id && targetData.title) {
          submitterTargetLesson = {
            lesson_id: targetData.lesson_id,
            title: targetData.title,
            summary: targetData.summary,
            file_link: targetData.file_link,
            grade_levels: targetData.grade_levels,
            thematic_categories: targetData.thematic_categories,
          };
        }
      }

      const { data: reviews } = await supabase
        .from('submission_reviews')
        .select('*')
        .eq('submission_id', id!)
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('id', submissionData.teacher_id)
        .single();

      const fullSubmission: SubmissionDetail = {
        ...submissionData,
        created_at: submissionData.created_at || '',
        status: ((submissionData.status as SubmissionStatus) || 'submitted') as SubmissionStatus,
        extracted_content: submissionData.extracted_content || '',
        extracted_title: submissionData.extracted_title ?? undefined,
        content_hash: submissionData.content_hash || '',
        submission_type: (submissionData.submission_type || 'new') as 'new' | 'update',
        original_lesson_id: submissionData.original_lesson_id ?? undefined,
        content_embedding: submissionData.content_embedding ?? undefined,
        similarities: similaritiesWithLessons,
        submitterTargetLesson,
        review: reviews?.[0]
          ? {
              metadata: (reviews[0].tagged_metadata as ReviewMetadata) || {},
              decision: reviews[0].decision || '',
              notes: reviews[0].notes || '',
            }
          : undefined,
        teacher: {
          email: 'teacher@example.com',
          full_name: profile?.full_name || 'Unknown Teacher',
        },
      };

      setSubmission(fullSubmission);

      if (reviews && reviews.length > 0) {
        const review = reviews[0];
        // PR 6e E2c: legacy `tagged_metadata` rows (113 PROD, all approve_new)
        // store pre-canonical SLUG forms for the 6 small-vocab fields. After
        // E2b closed `reviewFormPayloadSchema`, reopening one without
        // canonicalizing would render the legacy selections deselected AND
        // reject re-save. Canonicalize the 6 vocab fields here, then let
        // reAddActivityTypeSuffix handle activityType (disjoint fields). No
        // DB write — the forensic rows stay legacy on disk.
        setMetadata(
          reAddActivityTypeSuffix(
            canonicalizeReviewMetadata((review.tagged_metadata as ReviewMetadata) || {})
          )
        );
        const existingDecision = review.decision as string;
        if (
          existingDecision === 'approve_new' ||
          existingDecision === 'approve_update' ||
          existingDecision === 'needs_revision'
        ) {
          setDecision(existingDecision);
        } else if (existingDecision) {
          // Legacy values like 'reject' that the new UI doesn't expose. Surface
          // it so the reviewer doesn't accidentally re-approve a previously
          // rejected submission.
          logger.warn(
            'Loaded review with unsupported decision, falling back to default:',
            existingDecision
          );
          setLegacyDecisionWarning(
            `This submission was previously marked "${existingDecision}". That option is no longer available — choose a new decision below.`
          );
        }
        setNotes(review.notes || '');
      }

      // Phase 8b: pre-select decision + target from submitter intent — but
      // only when no existing review row. The block above already restored
      // decision/notes/metadata from reviews?.[0] when present; pre-selecting
      // here would clobber that restoration. (selectedDuplicate is not
      // restored from a prior review — pre-existing limitation, out of 8b
      // scope.)
      if (!reviews || reviews.length === 0) {
        const preselection = computePreselection({
          submission_type: submissionData?.submission_type,
          original_lesson_id: submissionData?.original_lesson_id,
        });
        setDecision(preselection.decision);
        if (preselection.target) {
          setSelectedDuplicate(preselection.target);
        }

        const draft = computeInitialMetadataFromAiDraft(submissionData.ai_draft_metadata);
        if (draft) {
          setMetadata(reAddActivityTypeSuffix(draft));
        }
      }
    } catch (error) {
      logger.error('Error loading submission:', parseDbError(error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadSubmission();
  }, [id, loadSubmission]);

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
  // Computed during render — not hooks. Read by the useEffect below to
  // auto-expand the picker, and by the JSX to choose contextual help text.
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

  // Reset the search picker when navigating to a different submission.
  // Reset showSearch too so the auto-expand effect makes the open/closed
  // decision fresh per submission rather than carrying manual-toggle state
  // across navigation. Declared FIRST so its setShowSearch(false) lands
  // before the auto-expand effect's setShowSearch(true) on navigation —
  // React batches setState calls from effects in the same flush, last
  // writer wins; we want auto-expand to be the last writer when its
  // condition is met.
  useEffect(() => {
    setSelectedSearchLesson(null);
    setShowSearch(false);
  }, [submission?.id]);

  // Auto-expand the search picker when the submitter couldn't find a target
  // ((update, null)) or there are no candidate cards to choose from. One-
  // directional: only opens, never closes — closing while the reviewer is
  // mid-pick (candidateCards gains a Case-4 card → noDups flips false →
  // setShowSearch(false)) was the round-1 bug. Manual close via the toggle
  // button stays sticky because deps don't change on a user-initiated close.
  useEffect(() => {
    if (needsSearch || noDups) setShowSearch(true);
  }, [needsSearch, noDups]);

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
  const fieldError = (label: string) =>
    validationErrors.includes(label) ? `Required.` : undefined;

  // Single-select pill adapter: mode='single' lets IntPillGroup talk in arrays
  // while we store a single value on metadata.
  const singleProps = (
    current: string | undefined,
    onChange: (next: string | undefined) => void
  ) => ({
    mode: 'single' as const,
    selected: current ? [current] : [],
    onChange: (next: string[]) => onChange(next[0]),
  });

  const heritageOptions = flattenHeritageOptions(ALL_FIELD_CONFIGS.culturalHeritage);

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
          <div>
            <div className="adm-card">
              <div className="adm-section-eyebrow">Metadata</div>
              <p className="adm-section-desc">
                Fix tags before publishing. Reviewer has the final call.
              </p>
              <IntProgressBar
                filled={fieldProgress.completed}
                total={fieldProgress.total}
                ariaLabel="Required fields"
              />

              {legacyDecisionWarning && (
                <div role="status" className="adm-hint adm-hint--error adm-alert--error">
                  {legacyDecisionWarning}
                </div>
              )}

              {validationErrors.length > 0 && (
                <div
                  ref={errorBannerRef}
                  tabIndex={-1}
                  role="alert"
                  className="adm-hint adm-hint--error adm-alert--error"
                >
                  Missing required fields: {validationErrors.join(', ')}
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <IntFormField label="Activity type" required error={fieldError('Activity Type')}>
                  <IntPillGroup
                    options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.activityType)}
                    selected={metadata.activityType ?? []}
                    onChange={(v) => handleMetadataChange('activityType', v)}
                    ariaLabel="Activity type"
                  />
                </IntFormField>

                <IntFormField label="Location" required error={fieldError('Location')}>
                  <IntPillGroup
                    options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.location)}
                    {...singleProps(metadata.location, (v) => handleMetadataChange('location', v))}
                    ariaLabel="Location"
                  />
                </IntFormField>

                <IntFormField label="Grades" required error={fieldError('Grade Levels')}>
                  <IntPillGroup
                    variant="green"
                    options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.gradeLevels)}
                    selected={metadata.gradeLevels ?? []}
                    onChange={(next) => handleMetadataChange('gradeLevels', next)}
                    ariaLabel="Grades"
                  />
                </IntFormField>

                <IntFormField label="Seasons" required error={fieldError('Season & Timing')}>
                  <IntPillGroup
                    variant="green"
                    options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.seasonTiming)}
                    selected={metadata.season ?? []}
                    onChange={(next) => handleMetadataChange('season', next)}
                    ariaLabel="Seasons"
                  />
                </IntFormField>

                <IntFormField label="Thematic" required error={fieldError('Thematic Categories')}>
                  <IntPillGroup
                    variant="green"
                    options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.thematicCategories)}
                    selected={metadata.themes ?? []}
                    onChange={(next) => handleMetadataChange('themes', next)}
                    ariaLabel="Thematic categories"
                  />
                </IntFormField>

                <IntFormField label="Competencies" required error={fieldError('Core Competencies')}>
                  <IntPillGroup
                    options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.coreCompetencies)}
                    selected={metadata.coreCompetencies ?? []}
                    onChange={(next) => handleMetadataChange('coreCompetencies', next)}
                    ariaLabel="Core competencies"
                  />
                </IntFormField>

                <IntFormField
                  label="Social-emotional learning"
                  required
                  error={fieldError('Social-Emotional Learning')}
                >
                  <IntPillGroup
                    options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.socialEmotionalLearning)}
                    selected={metadata.socialEmotionalLearning ?? []}
                    onChange={(next) => handleMetadataChange('socialEmotionalLearning', next)}
                    ariaLabel="Social-emotional learning"
                  />
                </IntFormField>

                <IntFormField label="Academic">
                  <IntPillGroup
                    options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.academicIntegration)}
                    selected={metadata.academicIntegration ?? []}
                    onChange={(next) => handleMetadataChange('academicIntegration', next)}
                    ariaLabel="Academic integration"
                  />
                </IntFormField>

                <div className="adm-field">
                  <label className="adm-label" htmlFor={inputIds.heritage}>
                    Cultural heritage
                  </label>
                  <CreatableSelect
                    inputId={inputIds.heritage}
                    classNamePrefix="adm-rs"
                    isMulti
                    options={heritageOptions}
                    value={(metadata.culturalHeritage ?? []).map(
                      (v) => heritageOptions.find((o) => o.value === v) || { value: v, label: v }
                    )}
                    onChange={(next) =>
                      handleMetadataChange('culturalHeritage', next ? next.map((o) => o.value) : [])
                    }
                  />
                </div>
              </div>

              {showCookingFields && (
                <div style={{ marginTop: 8 }}>
                  <div className="adm-section-eyebrow" style={{ marginBottom: 8 }}>
                    Cooking details
                  </div>

                  <IntFormField
                    label="Cooking methods"
                    required
                    error={fieldError('Cooking Methods')}
                  >
                    <IntPillGroup
                      options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.cookingMethods)}
                      selected={metadata.cookingMethods ?? []}
                      onChange={(next) => handleMetadataChange('cookingMethods', next)}
                      ariaLabel="Cooking methods"
                    />
                  </IntFormField>

                  <div className="adm-field">
                    <label className="adm-label adm-label-req" htmlFor={inputIds.mainIngredients}>
                      Main ingredients
                    </label>
                    {/* Non-creatable Select: mainIngredients is a closed C02 */}
                    {/* canonical enum enforced by Zod + DB CHECK in C02. */}
                    {/* CreatableSelect would invite reviewer-typed values */}
                    {/* that the save path rejects. */}
                    <Select
                      inputId={inputIds.mainIngredients}
                      classNamePrefix="adm-rs"
                      isMulti
                      options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.mainIngredients)}
                      value={(metadata.mainIngredients ?? []).map((v) => ({
                        value: v,
                        label:
                          ALL_FIELD_CONFIGS.mainIngredients.options.find((o) => o.value === v)
                            ?.label || v,
                      }))}
                      onChange={(next) =>
                        handleMetadataChange(
                          'mainIngredients',
                          next ? next.map((o) => o.value) : []
                        )
                      }
                    />
                    {fieldError('Main Ingredients') && (
                      <p className="adm-hint adm-hint--error">Required.</p>
                    )}
                  </div>

                  <div className="adm-field">
                    <label className="adm-label adm-label-req" htmlFor={inputIds.cookingSkills}>
                      Cooking skills
                    </label>
                    {/* Non-creatable Select: cookingSkills is a closed C02 */}
                    {/* canonical enum enforced by Zod + DB CHECK in C02. */}
                    {/* CreatableSelect would invite reviewer-typed values */}
                    {/* that the save path rejects. */}
                    <Select
                      inputId={inputIds.cookingSkills}
                      classNamePrefix="adm-rs"
                      isMulti
                      options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.cookingSkills)}
                      value={(metadata.cookingSkills ?? []).map((v) => ({
                        value: v,
                        label:
                          ALL_FIELD_CONFIGS.cookingSkills.options.find((o) => o.value === v)
                            ?.label || v,
                      }))}
                      onChange={(next) =>
                        handleMetadataChange('cookingSkills', next ? next.map((o) => o.value) : [])
                      }
                    />
                    {fieldError('Cooking Skills') && (
                      <p className="adm-hint adm-hint--error">Required.</p>
                    )}
                  </div>
                </div>
              )}

              {showGardenFields && (
                <div style={{ marginTop: 8 }}>
                  <div className="adm-section-eyebrow" style={{ marginBottom: 8 }}>
                    Garden details
                  </div>
                  <div className="adm-field">
                    <label className="adm-label adm-label-req" htmlFor={inputIds.gardenSkills}>
                      Garden skills
                    </label>
                    {/* Non-creatable Select: gardenSkills is a closed enum (24 */}
                    {/* canonical values) enforced by Zod + SQL CHECK in PR 6e. */}
                    {/* CreatableSelect would invite reviewer-typed values that */}
                    {/* the save path rejects. */}
                    <Select
                      inputId={inputIds.gardenSkills}
                      classNamePrefix="adm-rs"
                      isMulti
                      options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.gardenSkills)}
                      value={(metadata.gardenSkills ?? []).map((v) => ({
                        value: v,
                        label:
                          ALL_FIELD_CONFIGS.gardenSkills.options.find((o) => o.value === v)
                            ?.label || v,
                      }))}
                      onChange={(next) =>
                        handleMetadataChange('gardenSkills', next ? next.map((o) => o.value) : [])
                      }
                    />
                    {fieldError('Garden Skills') && (
                      <p className="adm-hint adm-hint--error">Required.</p>
                    )}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 8 }}>
                <div className="adm-section-eyebrow" style={{ marginBottom: 8 }}>
                  Additional
                </div>

                <div className="adm-field">
                  <label className="adm-label" htmlFor={inputIds.observances}>
                    Observances &amp; holidays
                  </label>
                  {/* Non-creatable Select: observancesHolidays is a closed enum */}
                  {/* (16 canonical values) enforced by Zod + SQL CHECK in PR 6e. */}
                  {/* CreatableSelect would invite reviewer-typed values that */}
                  {/* the save path rejects. */}
                  <Select
                    inputId={inputIds.observances}
                    classNamePrefix="adm-rs"
                    isMulti
                    options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.observancesHolidays)}
                    value={(metadata.observancesHolidays ?? []).map((v) => ({
                      value: v,
                      label: v,
                    }))}
                    onChange={(next) =>
                      handleMetadataChange(
                        'observancesHolidays',
                        next ? next.map((o) => o.value) : []
                      )
                    }
                  />
                </div>

                <div className="adm-field">
                  <label className="adm-label" htmlFor={inputIds.culturalResponsiveness}>
                    Cultural responsiveness features
                  </label>
                  {/* Non-creatable Select: CRF is a closed enum (7 Brown CR */}
                  {/* master-list features) enforced by Zod + SQL CHECK in PR 1. */}
                  {/* CreatableSelect would invite reviewer-typed values that */}
                  {/* the save path silently rejects. */}
                  <Select
                    inputId={inputIds.culturalResponsiveness}
                    classNamePrefix="adm-rs"
                    isMulti
                    options={selectOptionsFromConfig(
                      ALL_FIELD_CONFIGS.culturalResponsivenessFeatures
                    )}
                    value={(metadata.culturalResponsivenessFeatures ?? []).map((v) => ({
                      value: v,
                      label: v,
                    }))}
                    onChange={(next) =>
                      handleMetadataChange(
                        'culturalResponsivenessFeatures',
                        next ? next.map((o) => o.value) : []
                      )
                    }
                  />
                </div>

                <IntFormField label="Processing notes" hint="Internal — not shown to teacher.">
                  <textarea
                    className="adm-textarea"
                    rows={3}
                    value={metadata.processingNotes || ''}
                    onChange={(e) => handleMetadataChange('processingNotes', e.target.value)}
                    placeholder="Internal notes about how this lesson was processed…"
                  />
                </IntFormField>
              </div>
            </div>
          </div>

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
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowSearch((v) => !v)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {showSearch
                  ? '− Hide library search'
                  : '+ Search the library for a different lesson'}
              </button>
              {showSearch && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-600 mb-2">{searchHelpText}</p>
                  {/* Intentionally NOT passing excludeRetired so the
                      reviewer can find retired competitors during dup-review
                      escape-hatch search (e.g., "this submission is a
                      re-import of retired Stone Soup"). Submitter flows
                      (RevisingSubmissionForm) opt in via excludeRetired;
                      reviewer flows leave the default false. */}
                  <LessonSearchPicker
                    selected={selectedSearchLesson}
                    onSelect={(l) => {
                      setSelectedSearchLesson(l);
                      setSelectedDuplicate(l.lesson_id);
                      setSaveError(null);
                    }}
                    onClear={() => {
                      // Capture the cleared id BEFORE resetting state to avoid
                      // a stale-read race between the two setters.
                      const clearedId = selectedSearchLesson?.lesson_id ?? null;
                      setSelectedSearchLesson(null);
                      if (clearedId && selectedDuplicate === clearedId) {
                        setSelectedDuplicate(null);
                      }
                    }}
                    cantFindOption={false}
                  />
                </div>
              )}
            </div>

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
