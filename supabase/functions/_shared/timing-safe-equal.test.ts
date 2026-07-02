import { describe, it, expect } from 'vitest';
import { timingSafeEqual } from './timing-safe-equal.ts';

const enc = (s: string) => new TextEncoder().encode(s);

describe('timingSafeEqual', () => {
  it('returns true for byte-identical arrays', () => {
    expect(timingSafeEqual(enc('service-role-key'), enc('service-role-key'))).toBe(true);
  });

  it('returns false when a single byte differs (same length)', () => {
    expect(timingSafeEqual(enc('service-role-key'), enc('service-role-keZ'))).toBe(false);
  });

  it('detects a differing byte regardless of position', () => {
    const a = enc('AAAAAAAAAA');
    for (let i = 0; i < a.length; i++) {
      const b = new Uint8Array(a);
      b[i] = b[i] ^ 0x01; // flip one bit in position i
      expect(timingSafeEqual(a, b)).toBe(false);
    }
  });

  it('returns false for arrays of differing length', () => {
    expect(timingSafeEqual(enc('short'), enc('shorter'))).toBe(false);
    expect(timingSafeEqual(new Uint8Array(0), new Uint8Array(1))).toBe(false);
  });

  it('returns true for two empty arrays', () => {
    expect(timingSafeEqual(new Uint8Array(0), new Uint8Array(0))).toBe(true);
  });
});
