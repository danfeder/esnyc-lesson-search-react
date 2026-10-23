import { describe, it, expect } from 'vitest';
import { badgeForStatus } from '@/utils/submissionStatus';

describe('badgeForStatus', () => {
  it('maps a rejected submission to the rejected badge', () => {
    expect(badgeForStatus('rejected')).toBe('rejected');
  });
  it('falls back to submitted for an unknown status', () => {
    expect(badgeForStatus('bogus')).toBe('submitted');
  });
});
