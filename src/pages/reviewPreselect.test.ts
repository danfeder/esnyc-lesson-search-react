import { describe, it, expect } from 'vitest';
import { computePreselection } from '@/pages/reviewPreselect';

describe('computePreselection', () => {
  it('new → approve_new, no target', () => {
    expect(computePreselection({ submission_type: 'new', original_lesson_id: null })).toEqual({
      decision: 'approve_new',
      target: null,
    });
  });

  it('update with target → approve_update + target', () => {
    expect(
      computePreselection({ submission_type: 'update', original_lesson_id: 'lesson_1' })
    ).toEqual({ decision: 'approve_update', target: 'lesson_1' });
  });

  it('update without target → approve_update, no target', () => {
    expect(computePreselection({ submission_type: 'update', original_lesson_id: null })).toEqual({
      decision: 'approve_update',
      target: null,
    });
  });

  it('legacy unknown type → approve_new fallback', () => {
    expect(computePreselection({ submission_type: undefined, original_lesson_id: null })).toEqual({
      decision: 'approve_new',
      target: null,
    });
    expect(computePreselection({ submission_type: 'reject', original_lesson_id: null })).toEqual({
      decision: 'approve_new',
      target: null,
    });
  });
});
