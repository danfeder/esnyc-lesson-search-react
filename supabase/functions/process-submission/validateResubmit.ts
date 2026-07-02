// Ownership + status gate for the resubmit-after-revisions flow.
//
// The teacher calls process-submission with their JWT; the function then writes
// with the service-role client (RLS forbids teacher UPDATEs on
// lesson_submissions). This pure helper is the in-code authorization check that
// stands in for the RLS the service client bypasses. Kept dependency-free so it
// unit-tests under vitest (see validateResubmit.test.ts) exactly as the edge
// runtime sees it.

export interface ResubmitGateRow {
  teacher_id?: string | null;
  status?: string | null;
}

export type ResubmitGateResult = { ok: true } | { ok: false; error: string };

/**
 * Decide whether `userId` may resubmit `row`.
 *
 * Ownership is checked before status so a non-owner never learns anything about
 * the row's state. Error strings are plain-language and surfaced verbatim to the
 * teacher (the caller returns them as HTTP 200 { success:false }).
 */
export function validateResubmit(row: ResubmitGateRow, userId: string): ResubmitGateResult {
  if (row.teacher_id !== userId) {
    return { ok: false, error: "This isn't your submission." };
  }
  if (row.status !== 'needs_revision') {
    return { ok: false, error: "This submission isn't waiting on revisions." };
  }
  return { ok: true };
}
