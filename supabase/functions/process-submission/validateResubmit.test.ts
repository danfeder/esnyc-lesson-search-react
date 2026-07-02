import { describe, it, expect } from 'vitest';
import { validateResubmit } from './validateResubmit.ts';

const OWNER = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';

describe('validateResubmit', () => {
  it('allows the owner to resubmit a needs_revision row', () => {
    expect(validateResubmit({ teacher_id: OWNER, status: 'needs_revision' }, OWNER)).toEqual({
      ok: true,
    });
  });

  it('rejects a different signed-in user with an ownership error', () => {
    expect(validateResubmit({ teacher_id: OWNER, status: 'needs_revision' }, OTHER)).toEqual({
      ok: false,
      error: "This isn't your submission.",
    });
  });

  it('checks ownership before status (non-owner never sees the status message)', () => {
    // Owner mismatch AND wrong status → must return the ownership error, not the status one.
    expect(validateResubmit({ teacher_id: OWNER, status: 'approved' }, OTHER)).toEqual({
      ok: false,
      error: "This isn't your submission.",
    });
  });

  it('rejects the owner when the row is not awaiting revisions', () => {
    for (const status of ['submitted', 'in_review', 'approved', 'rejected']) {
      expect(validateResubmit({ teacher_id: OWNER, status }, OWNER)).toEqual({
        ok: false,
        error: "This submission isn't waiting on revisions.",
      });
    }
  });

  it('rejects when teacher_id is null/undefined', () => {
    expect(validateResubmit({ teacher_id: null, status: 'needs_revision' }, OWNER)).toEqual({
      ok: false,
      error: "This isn't your submission.",
    });
    expect(validateResubmit({ status: 'needs_revision' }, OWNER)).toEqual({
      ok: false,
      error: "This isn't your submission.",
    });
  });
});
