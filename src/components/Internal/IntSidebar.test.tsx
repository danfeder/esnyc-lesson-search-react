import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { IntSidebar } from './IntSidebar';
import { useSearchStore } from '@/stores/searchStore';
import type { FacetCounts } from '@/utils/facetCounts';

/**
 * Minimal facet-count stub: every filter key maps to an empty value→count map,
 * with per-test overrides. The sidebar reads `counts[key][opt.value]` for the
 * per-option badge, so an empty map yields a 0 count (blank badge) by default.
 */
function makeCounts(overrides: Partial<FacetCounts> = {}): FacetCounts {
  return {
    gradeLevels: {},
    tags: {},
    activityType: {},
    location: {},
    thematicCategories: {},
    seasonTiming: {},
    coreCompetencies: {},
    culturalHeritage: {},
    academicIntegration: {},
    socialEmotionalLearning: {},
    cookingMethods: {},
    ...overrides,
  };
}

/**
 * Resolve the `.int-filter` section wrapper that carries the given section
 * heading text (the `IntFilterSection` head button label). Options + their
 * `.int-check-count` badges live inside this wrapper.
 */
function sectionByLabel(label: string) {
  const heading = screen.getByText(label);
  const section = heading.closest('.int-filter');
  if (!section) throw new Error(`No .int-filter wrapper for section "${label}"`);
  return section;
}

describe('IntSidebar', () => {
  beforeEach(() => {
    // The sidebar reads array filters per key; reset the two we assert on so the
    // sections render their full static option list and no rows are pre-checked.
    useSearchStore.setState((s) => ({
      filters: { ...s.filters, tags: [], activityType: [] },
    }));
  });

  it('renders no count badge in the Lesson Type (tags) section', () => {
    // tags ("Lesson Type") options come from FILTER_CONFIGS.tags.options (static
    // config: Orientation, Bilingual Handouts) — not from `counts` — so the
    // section always renders its option rows in jsdom. The tags count is always
    // 0 by design (search_lessons returns no `tags` column), so its badge is a
    // misleading blank span on a working filter; it must be suppressed entirely.
    render(<IntSidebar counts={makeCounts()} />);

    const tagsSection = sectionByLabel('Lesson Type');
    // Sanity: the section actually rendered option rows (not vacuously empty).
    expect(tagsSection.querySelectorAll('.int-check').length).toBeGreaterThan(0);
    // The fix: NO per-option count span anywhere in the tags section.
    expect(tagsSection.querySelectorAll('.int-check-count').length).toBe(0);
  });

  it('still renders count badges in other sections (suppression is tags-only)', () => {
    // activityType keeps its badge: give the slug a real count and assert the
    // span survives — proves the suppression is scoped to tags, not global.
    render(<IntSidebar counts={makeCounts({ activityType: { 'cooking-only': 3 } })} />);

    const activitySection = sectionByLabel('Activity Type');
    const badges = activitySection.querySelectorAll('.int-check-count');
    expect(badges.length).toBeGreaterThan(0);
    expect(activitySection.textContent).toContain('3');
  });
});
