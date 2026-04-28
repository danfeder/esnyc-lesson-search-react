import { useState, useEffect, useId, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { parseDbError } from '@/utils/errorHandling';
import { logger } from '@/utils/logger';
import { sanitizeContent } from '@/utils/sanitize';
import { FEATURES } from '@/utils/featureFlags';
import type { ReviewMetadata } from '@/types';
import { ALL_FIELD_CONFIGS, type FilterConfig } from '@/utils/filterDefinitions';
import { STATUS_LABEL, STATUS_TO_BADGE, type SubmissionStatus } from '@/utils/submissionStatus';
import { GoogleDocEmbed } from '@/components/Review/GoogleDocEmbed';
import {
  IntButton,
  IntDecisionBar,
  IntDocFrame,
  IntDuplicateCard,
  IntFormField,
  IntPageHeader,
  IntPillGroup,
  IntProgressBar,
  IntStatusBadge,
  type IntDuplicateMatchType,
} from '@/components/Internal';

// As of Phase 4 (complete-review edge function + complete_review_atomic
// RPC), the DB-side CHECK on lesson_submissions.status accepts 'rejected'
// too. The UI here still only renders three decisions — Phase 8a will add
// the reject radio. The four-decision union is reserved for that flip.
type ReviewDecision = 'approve_new' | 'approve_update' | 'needs_revision';

interface SimilarityWithLesson {
  lesson_id: string;
  combined_score: number | null;
  match_type: string | null;
  title_similarity: number | null;
  content_similarity: number | null;
  lesson: {
    title: string | null;
    grade_levels: string[] | null;
    thematic_categories: string[] | null;
  };
}

// Phase 8b: shape of the off-list submitter-target lookup. Used both as
// the local-variable type in loadSubmission and as the optional field on
// SubmissionDetail so the rendering code (banner + unified card list)
// can read it. lesson_id and title are non-null here because we
// coalesce/guard at the construction site (loadSubmission) before
// assigning — even though the underlying lessons_with_metadata view
// types both as nullable. If either is null in the row, the off-list
// lookup is treated as failed (submitterTargetLesson stays null) and
// the banner falls into the "update with id but title couldn't be
// loaded" yellow state.
interface SubmitterTargetLesson {
  lesson_id: string;
  title: string;
  summary?: string | null;
  file_link?: string | null;
  grade_levels?: string[] | null;
  thematic_categories?: string[] | null;
}

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

function parseExtractedContent(content: string): { title: string; summary: string } {
  const lines = content.split('\n').filter((line) => line.trim());
  let title = '';
  let summary = '';

  const titleMatch = content.match(/^(Title:|Lesson Title:|#\s+)?(.+)$/im);
  if (titleMatch && titleMatch[2]) {
    title = titleMatch[2].trim();
  } else if (lines.length > 0) {
    title = lines[0].trim();
  }

  const summaryMatch = content.match(
    /(?:Summary:|Overview:|Description:)\s*(.+?)(?:\n\n|\n(?=[A-Z]))/is
  );
  if (summaryMatch && summaryMatch[1]) {
    summary = summaryMatch[1].trim();
  } else {
    const contentAfterTitle = lines.slice(1).join('\n');
    const firstParagraph = contentAfterTitle.split(/\n\n/)[0];
    if (firstParagraph) {
      summary = firstParagraph.trim().substring(0, 500);
    }
  }

  return { title, summary };
}

function normalizeMatchType(raw: string | null): IntDuplicateMatchType | null {
  if (!raw) return null;
  if (raw === 'exact' || raw === 'high' || raw === 'medium' || raw === 'low') return raw;
  return null;
}

function selectOptionsFromConfig(config: FilterConfig) {
  return config.options.map((o) => ({ value: o.value, label: o.label }));
}

/** Hierarchical -> flat options for cultural heritage CreatableSelect. */
function flattenHeritageOptions(config: FilterConfig) {
  return config.options.flatMap((parent) => {
    const parentOpt = { value: parent.value, label: parent.label };
    const childOpts = (parent.children ?? []).map((c) => ({
      value: c.value,
      label: `${parent.label} → ${c.label}`,
    }));
    return [parentOpt, ...childOpts];
  });
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

  const [viewMode, setViewMode] = useState<'embed' | 'text'>(() => {
    if (!FEATURES.GOOGLE_DOC_EMBED) return 'text';
    if (typeof window !== 'undefined' && window.localStorage) {
      return (window.localStorage.getItem('reviewViewMode') as 'embed' | 'text') || 'embed';
    }
    return 'embed';
  });

  const handleSetViewMode = useCallback((mode: 'embed' | 'text') => {
    setViewMode(mode);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('reviewViewMode', mode);
    }
  }, []);

  const showCookingFields = useMemo(
    () =>
      metadata.activityType === 'cooking-only' ||
      metadata.activityType === 'both' ||
      metadata.activityType === 'cooking',
    [metadata.activityType]
  );
  const showGardenFields = useMemo(
    () =>
      metadata.activityType === 'garden-only' ||
      metadata.activityType === 'both' ||
      metadata.activityType === 'garden',
    [metadata.activityType]
  );

  const validateRequiredFields = useCallback(() => {
    const errors: string[] = [];
    if (!metadata.activityType) errors.push('Activity Type');
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
      { label: 'Activity Type', filled: !!metadata.activityType },
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
        setMetadata((review.tagged_metadata as ReviewMetadata) || {});
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
        if (submissionData?.submission_type === 'update') {
          setDecision('approve_update');
          if (submissionData.original_lesson_id) {
            setSelectedDuplicate(submissionData.original_lesson_id);
          }
        } else {
          setDecision('approve_new');
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
          metadata,
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
                    {...singleProps(metadata.activityType, (v) =>
                      handleMetadataChange('activityType', v)
                    )}
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
                    <CreatableSelect
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
                    <CreatableSelect
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
                    <CreatableSelect
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

                <IntFormField label="Lesson format">
                  <IntPillGroup
                    options={selectOptionsFromConfig(ALL_FIELD_CONFIGS.lessonFormat)}
                    {...singleProps(metadata.lessonFormat, (v) =>
                      handleMetadataChange('lessonFormat', v)
                    )}
                    ariaLabel="Lesson format"
                  />
                </IntFormField>

                <div className="adm-field">
                  <label className="adm-label" htmlFor={inputIds.observances}>
                    Observances &amp; holidays
                  </label>
                  <CreatableSelect
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
                  <CreatableSelect
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
          <div>
            <IntDocFrame
              fileName={`${headerTitle.toLowerCase().replace(/\s+/g, '-')}.gdoc`}
              externalHref={submission.google_doc_url}
              toggle={
                FEATURES.GOOGLE_DOC_EMBED
                  ? {
                      options: [
                        { value: 'embed', label: 'Doc' },
                        { value: 'text', label: 'Text' },
                      ],
                      value: viewMode,
                      onChange: (v) => handleSetViewMode(v as 'embed' | 'text'),
                    }
                  : undefined
              }
              padded={viewMode === 'text'}
            >
              {FEATURES.GOOGLE_DOC_EMBED && viewMode === 'embed' ? (
                <GoogleDocEmbed
                  docId={submission.google_doc_id}
                  docUrl={submission.google_doc_url}
                  height="calc(100vh - 18rem)"
                  fallbackToText={() => handleSetViewMode('text')}
                  onError={(error) => {
                    logger.error('Google Doc embed error:', error.message);
                  }}
                />
              ) : (
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'var(--esy-font-body)',
                    fontSize: 14,
                    color: 'var(--color-esy-ink)',
                    margin: 0,
                  }}
                >
                  {sanitizeContent(submission.extracted_content)}
                </pre>
              )}
            </IntDocFrame>
          </div>

          {/* RIGHT — duplicates + decision */}
          <div>
            {topDuplicates.length > 0 && (
              <div className="adm-card">
                <div className="adm-section-eyebrow">Possible duplicates</div>
                <p className="adm-section-desc">
                  Select one to merge into instead of publishing new.
                </p>
                <div className="adm-dup-list">
                  {topDuplicates.map((d) => {
                    const grades = d.lesson.grade_levels?.length
                      ? `Grades ${d.lesson.grade_levels.join(', ')}`
                      : 'Grades —';
                    return (
                      <IntDuplicateCard
                        key={d.lesson_id}
                        dup={{
                          id: d.lesson_id,
                          title: d.lesson.title || 'Untitled',
                          meta: `${grades} · ${d.lesson_id}`,
                          similarity: d.combined_score ?? 0,
                          matchType: normalizeMatchType(d.match_type),
                        }}
                        selected={selectedDuplicate === d.lesson_id}
                        onSelect={() => {
                          setSelectedDuplicate(
                            selectedDuplicate === d.lesson_id ? null : d.lesson_id
                          );
                          setSaveError(null);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Phase 8b: binding-intent banner */}
            {(() => {
              const type = submission?.submission_type;
              const targetId = submission?.original_lesson_id;
              // SimilarityWithLesson has lesson_id at top level, lesson.title nested.
              // submitterTargetLesson (off-list fetch) has title at top level.
              const targetTitle =
                submission?.submitterTargetLesson?.title ||
                topDuplicates.find((d) => d.lesson_id === targetId)?.lesson?.title ||
                null;

              // (update, X, title-known) — happy path
              if (type === 'update' && targetId && targetTitle) {
                return (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                    <span className="font-medium text-blue-900">Submitter says:</span>{' '}
                    <span className="text-blue-900">
                      Updating <strong>{targetTitle}</strong>
                    </span>
                  </div>
                );
              }
              // (update, X, title lookup FAILED) — degraded but still update intent.
              // CRITICAL: must NOT fall through to the green "new" banner; that's the
              // worst-possible misrender (reviewer thinks it's new when submitter
              // declared an update). Render yellow with the raw lesson_id and a
              // "verify before approving" prompt.
              if (type === 'update' && targetId && !targetTitle) {
                return (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm flex items-start">
                    <AlertTriangle size={16} className="text-amber-700 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-amber-900">Submitter says:</span>{' '}
                      <span className="text-amber-900">
                        Updating lesson <code>{targetId}</code> — but its title couldn&apos;t be
                        loaded. Please search the library to confirm the right merge target before
                        approving.
                      </span>
                    </div>
                  </div>
                );
              }
              // (update, null) — explicit can't-find-it
              if (type === 'update' && !targetId) {
                return (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm flex items-start">
                    <AlertTriangle size={16} className="text-amber-700 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-amber-900">Submitter says:</span>{' '}
                      <span className="text-amber-900">
                        Updating, but couldn&apos;t find target — please search to identify.
                      </span>
                    </div>
                  </div>
                );
              }
              // (new) — only fall here when type is genuinely 'new'
              return (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                  <span className="font-medium text-emerald-900">Submitter says:</span>{' '}
                  <span className="text-emerald-900">New lesson</span>
                </div>
              );
            })()}

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
