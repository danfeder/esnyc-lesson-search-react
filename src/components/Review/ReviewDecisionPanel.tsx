import type { Dispatch, SetStateAction } from 'react';
import { IntAlert, IntButton, IntDecisionBar, IntDuplicateCard } from '@/components/Internal';
import { ReviewSearchPanel } from '@/components/Review/ReviewSearchPanel';
import { SubmitterIntentBanner } from '@/components/Review/SubmitterIntentBanner';
import { TitleMismatchWarning } from '@/components/Review/TitleMismatchWarning';
import { type LessonSearchResult } from '@/components/LessonSearchPicker';
import type {
  SubmissionDetail,
  ReviewDecision,
  DuplicatesLoadError,
} from '@/pages/useReviewSubmission';
import type { CandidateCard, SimilarityWithLesson } from '@/pages/buildCandidateCards';
import type { FieldProgress } from '@/pages/reviewValidation';

interface ReviewDecisionPanelProps {
  submission: SubmissionDetail;
  /** Top-5 similarities — read by the intent banner to resolve an in-list title. */
  topDuplicates: SimilarityWithLesson[];
  candidateCards: CandidateCard[];
  /** Non-null when the wholesale duplicate-details fetch failed (see hook). */
  duplicatesError: DuplicatesLoadError | null;
  /** Retry handler for the duplicates banner (the hook's `reload`). */
  onRetryDuplicates: () => void;
  selectedDuplicate: string | null;
  setSelectedDuplicate: Dispatch<SetStateAction<string | null>>;
  decision: ReviewDecision;
  setDecision: Dispatch<SetStateAction<ReviewDecision>>;
  notes: string;
  setNotes: Dispatch<SetStateAction<string>>;
  saveError: string | null;
  setSaveError: Dispatch<SetStateAction<string | null>>;
  saving: boolean;
  /**
   * Thin save trigger — the page's `handleSaveReview` (validate → strip
   * activityType `-only` slugs → canonicalize → Zod → `complete-review` invoke →
   * navigate). It stays declared in the page (form-state ownership lives there);
   * the decision-bar Save buttons just call it.
   */
  onSave: () => void;
  /** `shouldShowMismatchWarning` gate (computed in the page). */
  showMismatch: boolean;
  fieldProgress: FieldProgress;
  showSearch: boolean;
  setShowSearch: Dispatch<SetStateAction<boolean>>;
  searchHelpText: string;
  selectedSearchLesson: LessonSearchResult | null;
  setSelectedSearchLesson: Dispatch<SetStateAction<LessonSearchResult | null>>;
}

/**
 * RIGHT column of the reviewer screen: duplicates + decision. Lifted verbatim
 * from ReviewDetail (Wave 5 PR-1b Task 1b.4) — markup/props/classNames
 * byte-identical. Composes the already-extracted SubmitterIntentBanner /
 * TitleMismatchWarning / ReviewSearchPanel sub-seams + the candidate cards,
 * decision radios, note textarea, saveError banner, and IntDecisionBar.
 *
 * `handleSaveReview` stays in the page and is passed as `onSave`; the
 * `complete-review` invoke payload is unchanged.
 */
export function ReviewDecisionPanel({
  submission,
  topDuplicates,
  candidateCards,
  duplicatesError,
  onRetryDuplicates,
  selectedDuplicate,
  setSelectedDuplicate,
  decision,
  setDecision,
  notes,
  setNotes,
  saveError,
  setSaveError,
  saving,
  onSave,
  showMismatch,
  fieldProgress,
  showSearch,
  setShowSearch,
  searchHelpText,
  selectedSearchLesson,
  setSelectedSearchLesson,
}: ReviewDecisionPanelProps) {
  return (
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

      {/* Task 1 (data-integrity): when the duplicate candidates would silently
          vanish due to a transient fetch failure, surface a non-blocking warning
          + Retry instead of zero cards — so the reviewer doesn't approve a true
          duplicate as new. Renders independent of card count (off-list /
          reviewer-search cards still render normally below). */}
      {duplicatesError && (
        <div className="adm-card">
          <IntAlert variant="error">
            {duplicatesError.count != null
              ? `Couldn't load ${duplicatesError.count} possible duplicate${
                  duplicatesError.count === 1 ? '' : 's'
                } for this submission.`
              : "Couldn't load possible duplicates for this submission."}{' '}
            Retry before deciding — approving as new could miss a real duplicate.
          </IntAlert>
          <div className="mt-3">
            <IntButton variant="primary" onClick={onRetryDuplicates}>
              Retry
            </IntButton>
          </div>
        </div>
      )}

      {candidateCards.length > 0 && (
        <div className="adm-card">
          <div className="adm-section-eyebrow">
            {candidateCards[0]?.matchLabel === "Submitter's choice"
              ? 'Candidate matches'
              : 'Possible duplicates'}
          </div>
          <p className="adm-section-desc">Select one to merge into instead of publishing new.</p>
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
          aria-label="Note to teacher"
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
        <IntAlert variant="error">Save failed — nothing was written. {saveError}</IntAlert>
      )}

      <IntDecisionBar
        eyebrow="Metadata"
        detail={`${fieldProgress.completed}/${fieldProgress.total} required filled`}
      >
        {decision === 'approve_new' && (
          <IntButton variant="primary" size="lg" onClick={onSave} disabled={saving}>
            {saving ? 'Publishing…' : 'Publish lesson'}
          </IntButton>
        )}
        {decision === 'approve_update' && (
          <IntButton
            variant="ink"
            size="lg"
            onClick={onSave}
            disabled={saving || !selectedDuplicate}
          >
            {saving ? 'Merging…' : 'Merge & archive'}
          </IntButton>
        )}
        {decision === 'needs_revision' && (
          <IntButton variant="ink" size="lg" onClick={onSave} disabled={saving}>
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
  );
}
