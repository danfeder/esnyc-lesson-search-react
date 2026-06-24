/**
 * Unit tests for the dedicated C02 verify-and-diff system prompt (design
 * §3·PIVOT D-P4 / impl P2′.2).
 *
 * The pivot rewrites the task as KEEP/DROP/ADD against the body — not re-tag
 * from scratch — with explicit per-label ADD criteria for the two over-predicted
 * sentinels (Tasting, Kitchen & food safety) and negative few-shots
 * (garnish-isn't-an-ingredient; pantry-staple precision). This test asserts the
 * locked content is present so a future prompt edit cannot silently drop it.
 */
import { describe, expect, it } from 'vitest';

import { loadC02SystemPrompt } from './schema';

const prompt = loadC02SystemPrompt();

describe('C02 verify-and-diff prompt — task framing', () => {
  it('frames the task as KEEP/DROP/ADD against the body, not re-tag-from-scratch', () => {
    expect(prompt).toMatch(/KEEP/);
    expect(prompt).toMatch(/DROP/);
    expect(prompt).toMatch(/ADD/);
    expect(prompt.toLowerCase()).toContain('verify');
  });

  it('scopes the task to the two C02 fields only', () => {
    expect(prompt).toContain('cooking_skills');
    expect(prompt).toContain('main_ingredients');
  });

  it('tells the model how to weight the provenance annotations (confidence-typed anchor)', () => {
    expect(prompt).toContain('exact-canonical');
    expect(prompt).toContain('alias-fold');
    expect(prompt).toContain('parent-derived');
  });
});

describe('C02 verify-and-diff prompt — per-label ADD criteria (locked)', () => {
  it('Tasting = sensory comparison / vocabulary / assessment, NOT merely eating the dish', () => {
    expect(prompt).toContain('Tasting');
    // sensory comparison / vocabulary / assessment signal
    expect(prompt.toLowerCase()).toMatch(/sensory|vocabulary|assessment/);
    // the explicit negative bar: eating/sampling the dish is NOT tasting
    expect(prompt.toLowerCase()).toMatch(/eat|sampl/);
    expect(prompt.toLowerCase()).toContain('not `tasting`');
  });

  it('Kitchen & food safety = taught/practiced/assessed or a dedicated agenda segment, NOT incidental', () => {
    expect(prompt).toContain('Kitchen & food safety');
    expect(prompt.toLowerCase()).toMatch(/taught|practiced|assessed|dedicated|agenda/);
    // the explicit negative bar: not incidental knife/wash/heat
    expect(prompt.toLowerCase()).toMatch(/incidental/);
  });
});

describe('C02 verify-and-diff prompt — negative few-shots (locked)', () => {
  it('includes the garnish-isn’t-an-ingredient negative example', () => {
    expect(prompt.toLowerCase()).toContain('garnish');
  });

  it('includes the pantry-staple precision negative example', () => {
    expect(prompt.toLowerCase()).toMatch(/pantry/);
    // salt / oil / soy sauce never-stored framing
    expect(prompt.toLowerCase()).toMatch(/salt|oil|soy sauce/);
  });
});
