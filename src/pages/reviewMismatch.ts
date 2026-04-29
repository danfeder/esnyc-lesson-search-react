/**
 * Phase 8b Task 3.7 — title-mismatch warning gate.
 *
 * The mismatch banner only fires on auto-picks (submitter-bound target or a
 * dup-detector hit). When the reviewer has actively picked a target via the
 * search escape hatch, that's a deliberate confirmation — suppress.
 *
 * Pure function so it can be unit-tested independently of the React tree
 * (Task 3.9 covers the test suite).
 */
export function shouldShowMismatchWarning(args: {
  selectedTarget: string | null;
  submitterTargetId: string | null;
  topDuplicateIds: string[];
  searchPickedId: string | null;
}): boolean {
  const { selectedTarget, submitterTargetId, topDuplicateIds, searchPickedId } = args;
  if (!selectedTarget) return false;

  const isManualPick = selectedTarget === searchPickedId;
  if (isManualPick) return false;

  const isSubmitterPick = selectedTarget === submitterTargetId;
  const isDupDetectorPick = topDuplicateIds.includes(selectedTarget);
  return isSubmitterPick || isDupDetectorPick;
}
