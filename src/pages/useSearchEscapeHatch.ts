import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { LessonSearchResult } from '@/components/LessonSearchPicker';

interface UseSearchEscapeHatchArgs {
  /** The current submission id; navigating to a new submission resets the hatch. */
  submissionId: string | undefined;
  /** (update, null-target) — submitter couldn't declare a merge target. */
  needsSearch: boolean;
  /** No candidate cards to choose from. */
  noDups: boolean;
  /**
   * Page-owned setter for the reviewer's search pick. `selectedSearchLesson`
   * stays owned by the page (the `buildCandidateCards` useMemo reads it
   * UPSTREAM of `noDups`, so a single hook can't own both it and the
   * auto-expand effect). The hook only RESETS it on navigation via this setter.
   */
  setSelectedSearchLesson: (l: LessonSearchResult | null) => void;
}

/**
 * Owns the search escape hatch's `showSearch` open/closed state and the two
 * effects that drive it. Lifted verbatim from ReviewDetail (Wave 5 PR-1b Task
 * 1b.2) — declaration order + dep arrays are a documented invariant (risk 4);
 * do not reorder or extend the dep arrays.
 */
export function useSearchEscapeHatch({
  submissionId,
  needsSearch,
  noDups,
  setSelectedSearchLesson,
}: UseSearchEscapeHatchArgs): {
  showSearch: boolean;
  setShowSearch: Dispatch<SetStateAction<boolean>>;
} {
  const [showSearch, setShowSearch] = useState<boolean>(false);

  // Reset the search picker when navigating to a different submission.
  // Reset showSearch too so the auto-expand effect makes the open/closed
  // decision fresh per submission rather than carrying manual-toggle state
  // across navigation. Declared FIRST so its setShowSearch(false) lands
  // before the auto-expand effect's setShowSearch(true) on navigation —
  // React batches setState calls from effects in the same flush, last
  // writer wins; we want auto-expand to be the last writer when its
  // condition is met.
  //
  // `setSelectedSearchLesson` is now a prop, so exhaustive-deps requires it in
  // this array. It's behavior-neutral: the page passes the raw `useState`
  // setter (stable identity), so the effect still only re-fires on
  // `submissionId` change. (`setShowSearch` is the hook's own local setter →
  // stable → not required in deps.)
  useEffect(() => {
    setSelectedSearchLesson(null);
    setShowSearch(false);
  }, [submissionId, setSelectedSearchLesson]);

  // Auto-expand the search picker when the submitter couldn't find a target
  // ((update, null)) or there are no candidate cards to choose from. One-
  // directional: only opens, never closes — closing while the reviewer is
  // mid-pick (candidateCards gains a Case-4 card → noDups flips false →
  // setShowSearch(false)) was the round-1 bug. Manual close via the toggle
  // button stays sticky because deps don't change on a user-initiated close.
  useEffect(() => {
    if (needsSearch || noDups) setShowSearch(true);
  }, [needsSearch, noDups]);

  return { showSearch, setShowSearch };
}
