import { titlesAreSimilar } from '@/utils/titleSimilarity';
import type { CandidateCard } from '@/pages/buildCandidateCards';

interface TitleMismatchWarningProps {
  /**
   * Gate from `shouldShowMismatchWarning` — true only when the merge target was
   * auto-picked (submitter-bound or dup-detector hit), not a reviewer manual pick.
   */
  showMismatch: boolean;
  /** The decision-panel candidate cards — the selected one supplies the target title. */
  candidateCards: CandidateCard[];
  /** Currently-selected duplicate card id. */
  selectedDuplicate: string | null;
  /** submission.extracted_title — the submission's own title to compare against. */
  extractedTitle: string | undefined;
}

/**
 * Title-mismatch warning. Fires only when the target was auto-picked AND its
 * title diverges from the submission's extracted title (word-set Jaccard < 0.3
 * via the already-tested `titlesAreSimilar`). Suppressed for reviewer manual
 * picks via the `showMismatch` gate.
 */
export function TitleMismatchWarning({
  showMismatch,
  candidateCards,
  selectedDuplicate,
  extractedTitle,
}: TitleMismatchWarningProps) {
  if (!showMismatch) return null;
  const selectedCard = candidateCards.find((c) => c.id === selectedDuplicate);
  const targetTitle = selectedCard?.title ?? '';
  const submissionTitle = extractedTitle ?? '';
  if (!targetTitle || !submissionTitle) return null;
  if (titlesAreSimilar(targetTitle, submissionTitle)) return null;
  // Attribute the match honestly (D11): only the submitter's own pick carries
  // the "Submitter's choice" badge; every other auto-picked target came from
  // the duplicate checker. (Reviewer manual picks are suppressed upstream by
  // the showMismatch gate.)
  const bySubmitter = selectedCard?.matchLabel === "Submitter's choice";
  return (
    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
      Heads up:{' '}
      {bySubmitter ? 'the submitter linked this to' : 'the duplicate checker matched this to'}{' '}
      <strong>&ldquo;{targetTitle}&rdquo;</strong>, but the submission&apos;s extracted title is{' '}
      <strong>&ldquo;{submissionTitle}&rdquo;</strong> — confirm this is the right merge target.
    </div>
  );
}
