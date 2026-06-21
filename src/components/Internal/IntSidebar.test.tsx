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
    // Full filter reset for inter-test isolation (mirrors ScreenReaderAnnouncer.test.tsx).
    // clearFilters() resets every key to [] so each section renders its full
    // static option list and no rows are pre-checked.
    useSearchStore.getState().clearFilters();
  });

  it('does not render the retired "Lesson Type" (tags) section', () => {
    // The vestigial "Lesson Type" (tags) facet was retired in W1c — it is no
    // longer in FILTER_CONFIGS / CHECKBOX_KEYS, so the section must not render.
    render(<IntSidebar counts={makeCounts()} />);

    expect(screen.queryByText('Lesson Type')).toBeNull();
  });

  it('renders per-option count badges in checkbox sections', () => {
    // activityType shows its badge: give the slug a real count and assert the
    // span survives — proves badges still render after the tags retirement.
    render(<IntSidebar counts={makeCounts({ activityType: { 'cooking-only': 3 } })} />);

    const activitySection = sectionByLabel('Activity Type');
    const badges = activitySection.querySelectorAll('.int-check-count');
    expect(badges.length).toBeGreaterThan(0);
    expect(activitySection.textContent).toContain('3');
  });
});
