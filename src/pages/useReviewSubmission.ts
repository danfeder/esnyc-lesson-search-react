import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { parseDbError } from '@/utils/errorHandling';
import { logger } from '@/utils/logger';
import type { ReviewMetadata } from '@/types';
import { canonicalizeReviewMetadata } from '@/utils/canonicalizeReviewMetadata';
import { type SubmissionStatus } from '@/utils/submissionStatus';
import { computePreselection } from '@/pages/reviewPreselect';
import { computeInitialMetadataFromAiDraft } from '@/pages/reviewMetadataInit';
import { reAddActivityTypeSuffix } from '@/pages/reviewDetailHelpers';
import type { SimilarityWithLesson, SubmitterTargetLesson } from '@/pages/buildCandidateCards';
import { MAX_DUPLICATE_CARDS } from '@/pages/buildCandidateCards';

// As of Phase 4 (complete-review edge function + complete_review_atomic
// RPC), the DB-side CHECK on lesson_submissions.status accepts 'rejected'
// too. The UI here still only renders three decisions — Phase 8a will add
// the reject radio. The four-decision union is reserved for that flip.
export type ReviewDecision = 'approve_new' | 'approve_update' | 'needs_revision';

// SimilarityWithLesson + SubmitterTargetLesson live in
// `@/pages/buildCandidateCards` (Wave 5 PR-1a Task 1a.2) and are imported
// above so the pure card builder can co-locate the types it owns without a
// circular dependency. SubmissionDetail + ReviewDecision were relocated here
// (Wave 5 PR-1b Task 1b.1) alongside the load logic so the hook owns the
// fetch-shape contract and ReviewDetail imports them back.
export interface SubmissionDetail {
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
}

/**
 * The computed restore-vs-preselect seed the hook hands the page. The page
 * applies it to its own form `useState` via ONE seeding effect — the hook does
 * NOT own the form setters (LOCKED design Q1). Exactly one of the load path's
 * two branches (restore an existing review, or preselect from submitter intent)
 * produces this object, identically to the prior inline behavior.
 */
export interface ReviewInitialFormState {
  metadata: ReviewMetadata;
  decision: ReviewDecision;
  notes: string;
  selectedDuplicate: string | null;
  legacyDecisionWarning: string | null;
}

/**
 * A duplicate-cards load failure that leaves the reviewer with zero candidate
 * cards and no signal. Two failure modes (GATE 1B): the `submission_similarities`
 * list fetch failed (count unknown → `null`), or the `lessons_with_metadata`
 * details fetch failed for known similarity ids (`count` = how many, capped at the
 * 5 the UI would render).
 */
export interface DuplicatesLoadError {
  count: number | null;
}

export interface UseReviewSubmissionResult {
  submission: SubmissionDetail | null;
  loading: boolean;
  /**
   * R2-1: set ONLY when the `submission_reviews` fetch returns a DB error. When
   * non-null the page must block with a load-error screen (the form never
   * renders → no save can overwrite a prior review). `submission` and
   * `initialFormState` stay null in this case.
   */
  loadError: string | null;
  initialFormState: ReviewInitialFormState | null;
  /** Re-run the load (the load-error screen's Retry affordance). */
  reload: () => void;
  /**
   * Set when the candidate-cards would silently vanish due to a transient fetch
   * failure (similarities list OR details). The page renders a retry banner so the
   * reviewer doesn't mistake a load failure for "no duplicates" and approve a true
   * duplicate as new. null when similarities loaded fine (incl. genuinely zero) and
   * the details fetch succeeded — the partial/missing-id case still degrades to
   * "Unknown" cards in place.
   */
  duplicatesError: DuplicatesLoadError | null;
}

/**
 * R2-1 load-error copy. Surfaced when the `submission_reviews` fetch errors so
 * the reviewer reloads rather than unknowingly saving over a prior review.
 */
const REVIEWS_LOAD_ERROR_MESSAGE =
  "We couldn't load this submission's existing review. Reload before making a decision — " +
  'saving now could overwrite a previous review.';

/**
 * F2 load-error copy. Surfaced when the primary `lesson_submissions` fetch
 * returns a TRANSIENT error (any code other than PGRST116) so the reviewer can
 * retry instead of seeing a misleading "Submission not found" with no recovery.
 */
const SUBMISSION_LOAD_ERROR_MESSAGE =
  "We couldn't load this submission. Check your connection and try again.";

/**
 * Loads a submission and its review context for the ReviewDetail page, and
 * computes the initial form-state seed (restore-vs-preselect). Extracted from
 * ReviewDetail (Wave 5 PR-1b Task 1b.1) WITHOUT changing fetch ordering (the
 * serial→parallel rewrite is PR-2). The only intended behavior change is the
 * R2-1 fix: a `submission_reviews` fetch error now BLOCKS (load-error screen)
 * instead of silently routing to a fresh preselect that could overwrite a prior
 * review. The `submission_similarities` / `user_profiles` fetch errors keep
 * degrading gracefully exactly as before — their dropped errors are now merely
 * `logger.warn`'d for observability.
 */
export function useReviewSubmission(id: string | undefined): UseReviewSubmissionResult {
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialFormState, setInitialFormState] = useState<ReviewInitialFormState | null>(null);
  const [duplicatesError, setDuplicatesError] = useState<DuplicatesLoadError | null>(null);

  const loadSubmission = useCallback(async () => {
    // Clear any prior load error so Retry starts from a clean slate. Also drop
    // any PRIOR submission/seed: loadSubmission only ever runs with loading ===
    // true (initial mount starts loading true; reload() sets it true first;
    // ReviewErrorBoundary's key={id} makes an id change a fresh remount), so the
    // `if (loading)` spinner always covers this brief null window — no not-found
    // flash on a successful reload. Without this, a re-fetch that hits the
    // not-found (PGRST116) / catch early-returns would leave the STALE prior
    // submission truthy, and ReviewDetail would render the old form for a row
    // that no longer exists (GATE 3, surfaced by Task 1's duplicates-banner
    // Retry → reload()). A failed reload now correctly falls to the not-found /
    // load-error screen instead.
    setLoadError(null);
    setDuplicatesError(null);
    setSubmission(null);
    setInitialFormState(null);
    try {
      // C107: the six fetches that build the review context run in THREE
      // dependency-ordered waves of Promise.all instead of six serial
      // round-trips. Per-result error discipline (only ordering changed by C107):
      // #1's resolved error now SPLITS (F2) — PGRST116 (0 rows) → not-found
      // screen, any other error → blocking load-error screen WITH Retry; the
      // reviews fetch BLOCKS (R2-1); the rest degrade + warn. A true network
      // *reject* in any wave (the supabase-js promise itself rejecting, NOT a
      // resolved `{ data, error }`) propagates to the outer try/catch →
      // logger.error → setLoadError(SUBMISSION_LOAD_ERROR_MESSAGE) → finally
      // setLoading(false) → the retryable load-error screen (R2-1: this extends
      // F2's retry treatment to connection-level failures; the earlier
      // "Submission not found" fall-through was misleading for a transient blip).
      // Still Promise.all, NOT allSettled (Q8 LOCKED — allSettled would
      // resilient-render and change behavior).

      // Wave A — the three id-only fetches (#1 submission, #2 similarities,
      // #5 latest review). Promise.all does NOT surface per-result errors, so
      // each result's guards are re-applied on the resolved batch below.
      const [
        { data: submissionData, error: submissionError },
        { data: similarities, error: similaritiesError },
        { data: reviews, error: reviewsError },
      ] = await Promise.all([
        supabase.from('lesson_submissions').select('*, content_embedding').eq('id', id!).single(),
        supabase
          .from('submission_similarities')
          .select('*')
          .eq('submission_id', id!)
          .order('combined_score', { ascending: false }),
        supabase
          .from('submission_reviews')
          .select('*')
          .eq('submission_id', id!)
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      if (submissionError) {
        // F2: `.single()` returns PGRST116 when it matches 0 rows — a genuine
        // "no such submission" (retrying won't help) → fall through to the
        // not-found screen. Any OTHER error is transient (DB/network), so block
        // with a load-error screen that offers Retry instead of a misleading
        // "Submission not found".
        if (submissionError.code === 'PGRST116') {
          logger.warn('No submission found with id:', id);
          return;
        }
        logger.error('Failed to load submission:', submissionError);
        setLoadError(SUBMISSION_LOAD_ERROR_MESSAGE);
        return;
      }
      // Belt-and-suspenders: `.single()` always pairs a 0-row match with a
      // PGRST116 error (handled above), so this guard is effectively unreachable
      // for the current fetch — kept as cheap defense-in-depth in case the query
      // shape ever changes (e.g. to `.maybeSingle()`), NOT a live code path.
      if (!submissionData) {
        logger.error('No submission found with id:', id);
        return;
      }

      // Degrade gracefully (no similarities → no dup cards), but surface the
      // dropped error for observability. Logged BEFORE the reviews-error block
      // so a double-fault (#2 AND #5 both error) still records the similarities
      // warn: in the serial version #2's error was logged at its own await,
      // before #5 was ever fetched, so the reviews `return` could never swallow
      // it. Wave A batches #2/#5, so this ordering restores exact serial log
      // parity (pure logging — no behavior change; runs after the submission
      // guards and before any state mutation).
      if (similaritiesError) {
        logger.warn('Error fetching submission similarities:', similaritiesError);
        // Symmetric with Mode 2's `!lessons` gate below: only flag the banner
        // when the list itself is missing. Defensive against a future
        // supabase-js / test-mock that returns data + error together — don't show
        // a false "couldn't load duplicates" banner when the similarities are
        // actually usable. logger.warn stays UNCONDITIONAL for observability
        // parity. Behavior-identical today: a similaritiesError makes
        // `similarities` null (Wave B is skipped, cards would silently vanish), so
        // the count-unknown banner still fires.
        if (!similarities) {
          setDuplicatesError({ count: null });
        }
      }

      // R2-1 (data-integrity fix): supabase-js resolves a DB error as
      // `{ data: null, error }` WITHOUT throwing, so a transient blip on the
      // reviews fetch would leave `reviews` null and silently route to the
      // preselect branch below — a fresh form whose later save would overwrite
      // the prior review via complete_review_atomic's ON CONFLICT. BLOCK
      // instead: surface a load-error screen so the form never renders and no
      // overwrite is possible. `finally` still runs setLoading(false);
      // submission + initialFormState stay null. (When this blocks, Waves B/C
      // simply don't run — final state is identical to the serial version:
      // loadError set, submission + initialFormState null.)
      if (reviewsError) {
        logger.error('Failed to load existing submission review:', reviewsError);
        setLoadError(REVIEWS_LOAD_ERROR_MESSAGE);
        return;
      }

      // Wave B — #3 (similar-lesson metadata, depends on #2's ids) and #6
      // (teacher profile, depends on #1's teacher_id) run in parallel. #3 stays
      // behind the `similarities.length > 0` guard; with no similarities its
      // slot resolves to an inert `{ data: null, error: null }` so the
      // downstream guard semantics are byte-identical to the serial version.
      const profilePromise = supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('id', submissionData.teacher_id)
        .single();
      const lessonsPromise =
        similarities && similarities.length > 0
          ? supabase
              .from('lessons_with_metadata')
              .select('lesson_id, title, grade_levels, thematic_categories')
              .in(
                'lesson_id',
                similarities.map((s) => s.lesson_id)
              )
          : Promise.resolve({ data: null, error: null });
      const [{ data: lessons, error: lessonsError }, { data: profile, error: profileError }] =
        await Promise.all([lessonsPromise, profilePromise]);

      let similaritiesWithLessons: SimilarityWithLesson[] = [];
      if (similarities && similarities.length > 0) {
        // Degrade gracefully (similar lessons render as "Unknown"), but surface
        // the dropped error for observability — same graceful-degrade tier as
        // the similarities/profile fetches (logger.warn, not error).
        if (lessonsError) {
          logger.warn('Error fetching similar lessons:', lessonsError);
          // Whole-query failure → `lessons` is null, so the map below can't run
          // and the duplicate cards silently vanish. Signal it (with the count
          // we know, capped at the 5 the UI renders) so the panel shows a retry
          // banner, not zero cards. The `!lessons` gate is INTENTIONAL (not dead
          // code): supabase-js never returns data + error together today, but a
          // future client / test-mock that did must not flash a false banner over
          // usable cards — so only flag when the list is actually missing. This
          // is the gate Mode 1's similarities-error block above mirrors.
          if (!lessons) {
            setDuplicatesError({ count: Math.min(similarities.length, MAX_DUPLICATE_CARDS) });
          }
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

      // Degrade gracefully (→ "Unknown Teacher"), but surface the dropped error
      // for observability (R2-1 cleanup — pure logging, no behavior change).
      if (profileError) {
        logger.warn('Error fetching submission teacher profile:', profileError);
      }

      // Wave C — Phase 8b: if submitter bound to a lesson that's NOT in the
      // rendered top-5 dup cards, fetch it separately so the unified card list
      // can render it as "Submitter's choice." CRITICAL: check against the
      // SLICED top-5 (not the full similarities array) — the render path
      // uses topDuplicates = submission.similarities.slice(0, MAX_DUPLICATE_CARDS), so a
      // submitter target sitting at rank 6+ of dup detection is not
      // visible in the cards UI and needs the same off-list treatment. This
      // off-list fetch depends on #1 (original_lesson_id) + #3 (renderedTopFive
      // built from the similar-lesson metadata), so it runs last, alone.
      const submitterTargetId = submissionData?.original_lesson_id ?? null;
      const renderedTopFive = similaritiesWithLessons.slice(0, MAX_DUPLICATE_CARDS);
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
        // Degrade gracefully (the off-list "Submitter's choice" card just
        // doesn't render), but surface the dropped error for observability —
        // same graceful-degrade tier as the other context fetches (warn).
        if (targetErr) {
          logger.warn('Failed to fetch off-list submitter target:', targetErr);
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
        teacher: {
          email: 'teacher@example.com',
          full_name: profile?.full_name || 'Unknown Teacher',
        },
      };

      setSubmission(fullSubmission);

      // Compute the initial form-state seed. EXACTLY ONE branch runs, keyed on
      // reviews?.length, identical to the prior inline restore-vs-preselect
      // logic — the page applies the result via one seeding effect.
      let seed: ReviewInitialFormState;
      if (reviews && reviews.length > 0) {
        const review = reviews[0];
        // PR 6e E2c: legacy `tagged_metadata` rows (113 PROD, all approve_new)
        // store pre-canonical SLUG forms for the 6 small-vocab fields. After
        // E2b closed `reviewFormPayloadSchema`, reopening one without
        // canonicalizing would render the legacy selections deselected AND
        // reject re-save. Canonicalize the 6 vocab fields here, then let
        // reAddActivityTypeSuffix handle activityType (disjoint fields). No
        // DB write — the forensic rows stay legacy on disk.
        const restoredMetadata = reAddActivityTypeSuffix(
          canonicalizeReviewMetadata((review.tagged_metadata as ReviewMetadata) || {})
        );
        const existingDecision = review.decision as string;
        let restoredDecision: ReviewDecision = 'approve_new';
        let legacyWarning: string | null = null;
        if (
          existingDecision === 'approve_new' ||
          existingDecision === 'approve_update' ||
          existingDecision === 'needs_revision'
        ) {
          restoredDecision = existingDecision;
        } else if (existingDecision) {
          // Legacy values like 'reject' that the new UI doesn't expose. Surface
          // it so the reviewer doesn't accidentally re-approve a previously
          // rejected submission. (decision falls back to the approve_new default.)
          logger.warn(
            'Loaded review with unsupported decision, falling back to default:',
            existingDecision
          );
          legacyWarning = `This submission was previously marked "${existingDecision}". That option is no longer available — choose a new decision below.`;
        }
        seed = {
          metadata: restoredMetadata,
          decision: restoredDecision,
          notes: review.notes || '',
          // selectedDuplicate is NOT restored from a prior review — pre-existing
          // limitation, out of 8b scope; preserved verbatim (risk 2).
          selectedDuplicate: null,
          legacyDecisionWarning: legacyWarning,
        };
      } else {
        // Phase 8b: pre-select decision + target from submitter intent — only
        // when no existing review row. (selectedDuplicate is preselect-only.)
        const preselection = computePreselection({
          submission_type: submissionData?.submission_type,
          original_lesson_id: submissionData?.original_lesson_id,
        });
        const draft = computeInitialMetadataFromAiDraft(submissionData.ai_draft_metadata);
        seed = {
          metadata: draft ? reAddActivityTypeSuffix(draft) : {},
          decision: preselection.decision,
          notes: '',
          selectedDuplicate: preselection.target ?? null,
          legacyDecisionWarning: null,
        };
      }
      setInitialFormState(seed);
    } catch (error) {
      // This is the reject / unexpected-throw catch-all: a genuine 0-row
      // not-found returns INLINE above (submissionError PGRST116 → not-found;
      // any other resolved submissionError → load-error; the !submissionData
      // belt-and-suspenders → not-found). Only a true promise REJECT (the
      // supabase-js promise ITSELF rejecting — a network/connection failure, not
      // a resolved `{ data, error }`) or an unexpected throw reaches here. Extend
      // F2's retry treatment to those connection-level failures: surface the
      // retryable load-error screen instead of the dead-end "Submission not
      // found" (loadError wins render precedence over the not-found branch, and
      // submission was already nulled at the top, so a mid-load throw shows a
      // clean Retry screen rather than a half-seeded form).
      logger.error('Error loading submission:', parseDbError(error));
      setLoadError(SUBMISSION_LOAD_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadSubmission();
  }, [id, loadSubmission]);

  // Retry affordance for the load-error screen AND Task 1's duplicates-banner.
  // Reset `loading` first so the reviewer sees the spinner — NOT a stale prior
  // submission's form — while the refetch is in flight: loadSubmission now
  // clears submission/initialFormState up front, so the spinner must cover that
  // null window (the R2-1 blocker also must not appear to lift until the retry
  // resolves). An id change is handled separately by ReviewErrorBoundary's
  // key={id} (a full remount of the review subtree), so reload() only ever
  // re-runs against the SAME id.
  const reload = useCallback(() => {
    setLoading(true);
    loadSubmission();
  }, [loadSubmission]);

  return { submission, loading, loadError, initialFormState, reload, duplicatesError };
}
