import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { IntAlert, IntButton, IntDecisionBar, IntDuplicateCard } from '@/components/Internal';
import { ReviewSearchPanel } from '@/components/Review/ReviewSearchPanel';
import { SubmitterIntentBanner } from '@/components/Review/SubmitterIntentBanner';
import { TitleMismatchWarning } from '@/components/Review/TitleMismatchWarning';
import { type LessonSearchResult } from '@/components/LessonSearchPicker';
import type {
  SubmissionDetail,
  DecisionOption,
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
  decisionOption: DecisionOption;
  setDecisionOption: Dispatch<SetStateAction<DecisionOption>>;
  notes: string;
  setNotes: Dispatch<SetStateAction<string>>;
  /**
   * The previous round's send-back ask when it's STALE (the teacher has
   * resubmitted since). Shown read-only above the note box for context — the
   * box itself seeds empty so the old ask can't ride a fresh decision out to
   * the teacher's card.
   */
  priorRevisionNote?: string | null;
  saveError: string | null;
  setSaveError: Dispatch<SetStateAction<string | null>>;
  saving: boolean;
  /**
   * Thin save trigger — the page's `handleSaveReview` (validate → map the UI
   * option to the server decision → maybe raise the approve-as-new guard →
   * `complete-review` invoke → navigate). Form-state ownership lives in the page.
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
  /**
   * Approve-as-new "are you sure?" guard (D7), owned by the page so it fires
   * AFTER form validation. When true the interstitial below names the top match
   * and offers Publish-anyway / Keep-reviewing.
   */
  showPublishGuard: boolean;
  /** Title of the exact/high match that triggered the guard (null hides it). */
  publishGuardMatchTitle: string | null;
  onConfirmPublishAnyway: () => void;
  onCancelPublishGuard: () => void;
}

/**
 * RIGHT column of the reviewer screen: the "is this already in the library?"
 * evidence cards + the one honest decision list (D7). Composes the
 * SubmitterIntentBanner / TitleMismatchWarning / ReviewSearchPanel sub-seams,
 * the candidate cards, the five-option decision list, the note textarea, the
 * saveError banner, the approve-as-new guard, and IntDecisionBar.
 *
 * The five UI options collapse to four server decisions in the page's save
 * handler: "already in the library" is a `reject` with a prefilled note (D8).
 * `handleSaveReview` stays in the page and is passed as `onSave`.
 */
export function ReviewDecisionPanel({
  submission,
  topDuplicates,
  candidateCards,
  duplicatesError,
  onRetryDuplicates,
  selectedDuplicate,
  setSelectedDuplicate,
  decisionOption,
  setDecisionOption,
  notes,
  setNotes,
  priorRevisionNote,
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
  showPublishGuard,
  publishGuardMatchTitle,
  onConfirmPublishAnyway,
  onCancelPublishGuard,
}: ReviewDecisionPanelProps) {
  const hasCandidates = candidateCards.length > 0;
  const selectedTitle = candidateCards.find((c) => c.id === selectedDuplicate)?.title ?? null;
  // Options 2 & 3 bind a chosen card; disabled until one is selected.
  const cardBoundDisabled = !selectedDuplicate;
  const isRejectPath = decisionOption === 'reject' || decisionOption === 'reject_duplicate';

  // Option 3's auto-prefill, kept in one place so the panel can recognize an
  // UNEDITED prefill (the regex matches the prefill shape regardless of which
  // title it names) — a stale "already in the library" note must never go out
  // naming the wrong lesson or riding a different decision (bot rounds 1+2).
  // A note the reviewer typed or amended never matches and is never touched.
  const dupNotePrefill = (title: string) => `This lesson is already in the library as "${title}".`;
  const DUP_NOTE_PREFILL_RE = /^This lesson is already in the library as ".*"\.$/;

  // Leaving option 3 (radio switch, or card deselect via the fallback below)
  // clears an unedited prefill (bot round 1).
  const chooseOption = (next: DecisionOption) => {
    if (
      decisionOption === 'reject_duplicate' &&
      next !== 'reject_duplicate' &&
      DUP_NOTE_PREFILL_RE.test(notes)
    ) {
      setNotes('');
    }
    setDecisionOption(next);
    setSaveError(null);
  };

  // RE-BINDING the card while option 3 stays active (clicking another card, or
  // picking a different lesson via the search hatch) must refresh an unedited
  // prefill to the new title — otherwise the teacher-visible reason names the
  // wrong lesson (bot round 2; the search-pick variant is the same class).
  useEffect(() => {
    if (decisionOption !== 'reject_duplicate') return;
    if (!DUP_NOTE_PREFILL_RE.test(notes)) return; // reviewer edited it — hands off
    if (selectedTitle !== null && notes !== dupNotePrefill(selectedTitle)) {
      setNotes(dupNotePrefill(selectedTitle));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTitle, decisionOption, notes]);

  return (
    <div>
      {/* Binding-intent banner — rendered FIRST so the reviewer reads what the
          submitter declared BEFORE the candidate cards, mismatch warning, and
          search escape hatch. */}
      <SubmitterIntentBanner
        submissionType={submission.submission_type}
        targetId={submission.original_lesson_id}
        submitterTargetLesson={submission.submitterTargetLesson}
        topDuplicates={topDuplicates}
      />

      {/* Transient duplicate-details fetch failure → non-blocking warning +
          Retry instead of zero cards, so the reviewer doesn't approve a true
          duplicate as new. */}
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

      {/* D7: the plain question, with the candidate cards as evidence beneath. */}
      {hasCandidates && (
        <div className="adm-card">
          <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>
            Is this lesson already in the library?
          </p>
          <p className="adm-section-desc">
            If one of these is the same lesson, select it — then choose &ldquo;Publish as an
            update&rdquo; or &ldquo;Already in the library&rdquo; below.
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
                  const next = selectedDuplicate === c.id ? null : c.id;
                  setSelectedDuplicate(next);
                  setSaveError(null);
                  // Clearing the selection while a card-bound option is active
                  // would strand the decision — fall back to "publish as new"
                  // (via chooseOption, so an unedited option-3 prefill clears too).
                  if (
                    !next &&
                    (decisionOption === 'approve_update' || decisionOption === 'reject_duplicate')
                  ) {
                    chooseOption('approve_new');
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Title-mismatch warning — fires only when the target was auto-picked and
          its title diverges from the submission's extracted title. */}
      <TitleMismatchWarning
        showMismatch={showMismatch}
        candidateCards={candidateCards}
        selectedDuplicate={selectedDuplicate}
        extractedTitle={submission.extracted_title}
      />

      {/* Search escape hatch — collapsed by default, auto-expanded for
          (update, null) and zero-candidate cases. */}
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

          {/* 1. Publish as a new lesson */}
          <label className="adm-radio">
            <input
              type="radio"
              name="decision"
              value="approve_new"
              checked={decisionOption === 'approve_new'}
              onChange={() => chooseOption('approve_new')}
            />
            Publish as a new lesson
          </label>

          {/* 2. Publish as an update to <selected> — card-bound */}
          {hasCandidates && (
            <label className="adm-radio" style={{ opacity: cardBoundDisabled ? 0.55 : 1 }}>
              <input
                type="radio"
                name="decision"
                value="approve_update"
                checked={decisionOption === 'approve_update'}
                disabled={cardBoundDisabled}
                onChange={() => chooseOption('approve_update')}
              />
              <span>
                Publish as an update to{' '}
                {selectedTitle ? (
                  <strong>&ldquo;{selectedTitle}&rdquo;</strong>
                ) : (
                  'the selected lesson'
                )}
                <span style={{ display: 'block', fontSize: 12, color: 'var(--color-esy-ink-50)' }}>
                  Replaces the library copy; the old version is archived.
                </span>
              </span>
            </label>
          )}

          {/* 3. Don't publish — already in the library — card-bound */}
          {hasCandidates && (
            <label className="adm-radio" style={{ opacity: cardBoundDisabled ? 0.55 : 1 }}>
              <input
                type="radio"
                name="decision"
                value="reject_duplicate"
                checked={decisionOption === 'reject_duplicate'}
                disabled={cardBoundDisabled}
                onChange={() => {
                  chooseOption('reject_duplicate');
                  // Prefill the editable teacher note with the selected title.
                  if (selectedTitle) {
                    setNotes(dupNotePrefill(selectedTitle));
                  }
                }}
              />
              <span>
                Don&apos;t publish — it&apos;s already in the library
                {selectedTitle ? (
                  <>
                    {' '}
                    (duplicate of <strong>&ldquo;{selectedTitle}&rdquo;</strong>)
                  </>
                ) : null}
              </span>
            </label>
          )}

          {/* 4. Send back for revisions */}
          <label className="adm-radio">
            <input
              type="radio"
              name="decision"
              value="needs_revision"
              checked={decisionOption === 'needs_revision'}
              onChange={() => chooseOption('needs_revision')}
            />
            Send back for revisions
          </label>

          {/* 5. Reject with a reason the teacher will see */}
          <label className="adm-radio">
            <input
              type="radio"
              name="decision"
              value="reject"
              checked={decisionOption === 'reject'}
              onChange={() => chooseOption('reject')}
            />
            Reject — with a reason the teacher will see
          </label>
        </fieldset>

        {hasCandidates && cardBoundDisabled && (
          <p className="adm-section-desc" style={{ marginTop: 8 }}>
            Select a matching lesson above to enable the update / already-in-the-library options.
          </p>
        )}
      </div>

      <div className="adm-card">
        <div className="adm-section-eyebrow">
          {isRejectPath ? 'Reason for the teacher' : 'Note to the teacher'}
        </div>
        {/* Context from the previous round, read-only. The box below starts
            empty on a resubmit so the old ask isn't sent out again by accident. */}
        {priorRevisionNote && (
          <p className="adm-section-desc">
            Last round you asked: &ldquo;{priorRevisionNote}&rdquo;. The teacher has resubmitted
            since — write a fresh note (or leave it empty).
          </p>
        )}
        <textarea
          className="adm-textarea"
          aria-label={isRejectPath ? 'Reason for the teacher' : 'Note to the teacher'}
          rows={4}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaveError(null);
          }}
          placeholder={
            isRejectPath
              ? 'Required. The teacher will see this reason under My Submissions.'
              : 'Optional. The teacher will see this note with your decision under My Submissions.'
          }
        />
      </div>

      {saveError && (
        <IntAlert variant="error">Save failed — nothing was written. {saveError}</IntAlert>
      )}

      {/* Approve-as-new are-you-sure guard (D7) — raised by the page after
          validation passes when a card is exact/high. */}
      {decisionOption === 'approve_new' && showPublishGuard && publishGuardMatchTitle && (
        <div className="adm-callout adm-callout--warning" role="alert">
          <p className="adm-callout-title">This looks like an existing lesson</p>
          <p>
            &ldquo;{publishGuardMatchTitle}&rdquo; is already in the library and looks nearly
            identical. Publish this as a new lesson anyway?
          </p>
          <div className="adm-callout-actions" style={{ display: 'flex', gap: 8 }}>
            <IntButton
              variant="primary"
              size="sm"
              onClick={onConfirmPublishAnyway}
              disabled={saving}
            >
              {saving ? 'Publishing…' : 'Publish anyway'}
            </IntButton>
            <IntButton variant="ghost" size="sm" onClick={onCancelPublishGuard}>
              Keep reviewing
            </IntButton>
          </div>
        </div>
      )}

      <IntDecisionBar
        eyebrow="Metadata"
        detail={`${fieldProgress.completed}/${fieldProgress.total} required filled`}
      >
        {decisionOption === 'approve_new' && (
          <IntButton variant="primary" size="lg" onClick={onSave} disabled={saving}>
            {saving ? 'Publishing…' : 'Publish lesson'}
          </IntButton>
        )}
        {decisionOption === 'approve_update' && (
          <IntButton
            variant="ink"
            size="lg"
            onClick={onSave}
            disabled={saving || !selectedDuplicate}
          >
            {saving ? 'Publishing…' : 'Publish update'}
          </IntButton>
        )}
        {decisionOption === 'reject_duplicate' && (
          <IntButton
            variant="ink"
            size="lg"
            onClick={onSave}
            disabled={saving || !selectedDuplicate}
          >
            {saving ? 'Saving…' : "Don't publish"}
          </IntButton>
        )}
        {decisionOption === 'needs_revision' && (
          <IntButton variant="ink" size="lg" onClick={onSave} disabled={saving}>
            {saving ? 'Sending…' : 'Send for revision'}
          </IntButton>
        )}
        {decisionOption === 'reject' && (
          <IntButton variant="ink" size="lg" onClick={onSave} disabled={saving}>
            {saving ? 'Rejecting…' : 'Reject submission'}
          </IntButton>
        )}
      </IntDecisionBar>
    </div>
  );
}
