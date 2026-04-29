/**
 * Phase 8b Task 3.3 — pre-select reviewer decision + target from submitter intent.
 *
 * Pure function so it can be unit-tested independently of the React tree
 * (Task 3.9 covers the test suite). Behavior:
 *   - submission_type === 'update' → decision='approve_update', target = original_lesson_id (or null)
 *   - anything else (including legacy values + undefined)  → decision='approve_new', target=null
 *
 * Caller should only invoke setSelectedDuplicate(target) when target is non-null,
 * matching the prior inline behavior in ReviewDetail.tsx.
 */
export interface PreselectionInput {
  // String (not narrow union) so the DB row's `submission_type: string` shape
  // flows in directly; the helper only branches on the literal 'update' value
  // and falls back to approve_new for anything else (including legacy values).
  submission_type: string | null | undefined;
  original_lesson_id: string | null | undefined;
}

export interface PreselectionResult {
  decision: 'approve_new' | 'approve_update';
  target: string | null;
}

export function computePreselection(input: PreselectionInput): PreselectionResult {
  if (input.submission_type === 'update') {
    return {
      decision: 'approve_update',
      target: input.original_lesson_id ?? null,
    };
  }
  return { decision: 'approve_new', target: null };
}
