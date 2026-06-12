/**
 * Unit tests for the preflight's cache-floor guard (pre-push review item 4).
 *
 * The comparison logic is asserted via the exported `assessCacheFloor`
 * helper on the STATIC path — no API calls (the live `count_tokens`
 * measurement stays the deferred A8 check). Floors per the prompt-caching
 * docs: opus-family 4096 tokens, sonnet 2048; below floor + 5% margin the
 * cache_control breakpoints silently no-op and the cost projection is
 * invalid, so the preflight FAILS for opus and WARNS for sonnet.
 */
import { describe, expect, it } from 'vitest';

import { CACHE_FLOOR_MARGIN, assessCacheFloor } from './preflight-token-mass';
import {
  OPUS_MIN_CACHEABLE_PREFIX_TOKENS,
  SONNET_MIN_CACHEABLE_PREFIX_TOKENS,
  buildSubmitTagsTool,
  estimateTokenMass,
  loadSystemPrompt,
} from './schema';
import { loadVocab } from './vocab';

describe('cache-floor constants', () => {
  it('encode the documented per-family cacheable minimums', () => {
    expect(OPUS_MIN_CACHEABLE_PREFIX_TOKENS).toBe(4096);
    expect(SONNET_MIN_CACHEABLE_PREFIX_TOKENS).toBe(2048);
    expect(CACHE_FLOOR_MARGIN).toBeCloseTo(1.05, 10);
  });
});

describe('assessCacheFloor', () => {
  const OPUS_THRESHOLD = Math.ceil(OPUS_MIN_CACHEABLE_PREFIX_TOKENS * CACHE_FLOOR_MARGIN); // 4301
  const SONNET_THRESHOLD = Math.ceil(SONNET_MIN_CACHEABLE_PREFIX_TOKENS * CACHE_FLOOR_MARGIN); // 2151

  it('passes opus prefixes at/above floor + 5% margin', () => {
    expect(assessCacheFloor('claude-opus-4-7', OPUS_THRESHOLD).level).toBe('pass');
    expect(assessCacheFloor('claude-opus-4-7', 6274).level).toBe('pass');
  });

  it('FAILS opus-family prefixes below floor + 5% margin', () => {
    const verdict = assessCacheFloor('claude-opus-4-7', OPUS_THRESHOLD - 1);
    expect(verdict.level).toBe('fail');
    expect(verdict.floor).toBe(OPUS_MIN_CACHEABLE_PREFIX_TOKENS);
    expect(verdict.threshold).toBe(OPUS_THRESHOLD);
    // exactly at the raw floor is still inside the margin → fail
    expect(assessCacheFloor('claude-opus-4-7', OPUS_MIN_CACHEABLE_PREFIX_TOKENS).level).toBe(
      'fail'
    );
  });

  it('WARNS (not fails) for sonnet prefixes below floor + 5% margin', () => {
    const verdict = assessCacheFloor('claude-sonnet-4-6', SONNET_THRESHOLD - 1);
    expect(verdict.level).toBe('warn');
    expect(verdict.floor).toBe(SONNET_MIN_CACHEABLE_PREFIX_TOKENS);
    expect(assessCacheFloor('claude-sonnet-4-6', SONNET_THRESHOLD).level).toBe('pass');
  });

  it('spells out the cost implication in the failure message', () => {
    const verdict = assessCacheFloor('claude-opus-4-7', 1000);
    expect(verdict.message).toContain("below the model's cacheable minimum");
    expect(verdict.message).toContain('silently no-ops');
    expect(verdict.message).toContain('cost projection is invalid');
  });

  it('passes unknown model families with a check-manually note', () => {
    const verdict = assessCacheFloor('claude-haiku-4-5', 100);
    expect(verdict.level).toBe('pass');
    expect(verdict.floor).toBeNull();
    expect(verdict.message).toContain('check the prompt-caching docs manually');
  });

  it('applies correctly to the CURRENT static prefix estimate (documents the offline verdict)', () => {
    // As of this commit the chars/4 static estimate lands at ~4.3K — above
    // the raw 4096 opus floor but INSIDE the 5% margin band (threshold
    // 4301), so the offline preflight verdict is a conservative FAIL. The
    // live count_tokens measurement is the real check: the impl plan
    // expects ~6-8K, which clears the floor comfortably. This test asserts
    // the helper applies the documented rule to the real data either way,
    // so it survives prompt growth across A8 iterations.
    const staticEstimate = estimateTokenMass(loadSystemPrompt(), buildSubmitTagsTool(loadVocab()));
    expect(staticEstimate).toBeGreaterThanOrEqual(OPUS_MIN_CACHEABLE_PREFIX_TOKENS);
    const verdict = assessCacheFloor('claude-opus-4-7', staticEstimate);
    expect(verdict.level).toBe(staticEstimate >= OPUS_THRESHOLD ? 'pass' : 'fail');
  });
});
