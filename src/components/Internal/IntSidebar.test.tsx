import { render, screen, fireEvent } from '@testing-library/react';
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
    mainIngredients: {},
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

  it('FP-18: renders Location as two friendly checkboxes, no "Both"', () => {
    render(<IntSidebar counts={makeCounts()} />);

    const locationSection = sectionByLabel('Location');
    expect(locationSection.querySelectorAll('.int-check').length).toBe(2);
    expect(locationSection.textContent).toContain('Indoor-friendly');
    expect(locationSection.textContent).toContain('Outdoor-friendly');
    expect(locationSection.textContent).not.toContain('Both');
  });

  it('Brief 5: Main Ingredients renders immediately after Activity Type (slot #3), collapsed', () => {
    render(<IntSidebar counts={makeCounts()} />);

    // Section order is read off the IntFilterSection head buttons in DOM order.
    const heads = Array.from(document.querySelectorAll('.int-filter .int-filter-head'));
    const labels = heads.map((h) => h.textContent ?? '');
    const activityIdx = labels.findIndex((t) => t.includes('Activity Type'));
    const ingredientsIdx = labels.findIndex((t) => t.includes('Main Ingredients'));
    expect(activityIdx).toBeGreaterThanOrEqual(0);
    // The design decision (D-C): slot #3 = the section right after Activity Type.
    expect(ingredientsIdx).toBe(activityIdx + 1);
    // Collapsed by default (no defaultOpen passed).
    expect(heads[ingredientsIdx].getAttribute('aria-expanded')).toBe('false');
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

  it('renders a loaded zero as "0" (D-4: a real zero is information)', () => {
    // Counts are LOADED (object provided) but Cooking has no matches — the
    // badge must read "0", not blank (the old `{count || ''}` blank-zero bug).
    render(<IntSidebar counts={makeCounts({ activityType: { 'garden-only': 5 } })} />);

    const activitySection = sectionByLabel('Activity Type');
    const cookingRow = Array.from(activitySection.querySelectorAll('label.int-check')).find((row) =>
      row.textContent?.includes('Cooking')
    );
    expect(cookingRow).toBeDefined();
    expect(cookingRow!.querySelector('.int-check-count')!.textContent).toBe('0');
  });

  it('renders blank badges while counts are undefined (corpus loading or failed)', () => {
    render(<IntSidebar counts={undefined} />);

    // No fake zeros anywhere: every checkbox badge is empty…
    const badges = document.querySelectorAll('.int-check-count');
    expect(badges.length).toBeGreaterThan(0);
    badges.forEach((badge) => expect(badge.textContent).toBe(''));
    // …and grade pills render no count span at all.
    expect(document.querySelectorAll('.int-grade-pill-count').length).toBe(0);
  });

  it('renders a count inside each grade pill once counts are loaded (D-3)', () => {
    render(<IntSidebar counts={makeCounts({ gradeLevels: { K: 27 } })} />);

    const pills = Array.from(document.querySelectorAll('.int-grade-pill'));
    const kPill = pills.find((p) => p.textContent?.startsWith('K'));
    expect(kPill).toBeDefined();
    expect(kPill!.querySelector('.int-grade-pill-count')!.textContent).toBe('27');
    // A grade absent from the map renders 0 (loaded-zero rule applies here too).
    const pill3K = pills.find((p) => p.textContent?.startsWith('3K'));
    expect(pill3K!.querySelector('.int-grade-pill-count')!.textContent).toBe('0');
  });

  it('renders the badge explainer line above the filter sections (item 7b)', () => {
    render(<IntSidebar counts={makeCounts()} />);
    const hint = screen.getByText('Numbers show how many lessons carry each tag.');
    expect(hint).toBeInTheDocument();
    // Top placement: the hint precedes the first filter section in DOM order so
    // expanded sections can't push it below the fold.
    const firstFilter = document.querySelector('.int-filter');
    expect(firstFilter).not.toBeNull();
    expect(
      hint.compareDocumentPosition(firstFilter!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('item 7a: only Grade Level starts expanded; other facets start collapsed', () => {
    render(<IntSidebar counts={makeCounts()} />);
    const heads = Array.from(document.querySelectorAll('.int-filter .int-filter-head'));
    const headByLabel = (label: string) => heads.find((h) => (h.textContent ?? '').includes(label));

    expect(headByLabel('Grade Level')!.getAttribute('aria-expanded')).toBe('true');
    // Activity Type and Season & Timing used to start expanded (the old trio);
    // now every facet except Grade Level starts collapsed.
    expect(headByLabel('Activity Type')!.getAttribute('aria-expanded')).toBe('false');
    expect(headByLabel('Season')!.getAttribute('aria-expanded')).toBe('false');
  });

  it('"Clear all" clears facet selections but keeps the typed query (D-E)', () => {
    // A query plus an active facet → the "Clear all" button renders (its
    // visibility gate counts facets only, excluding the query).
    useSearchStore.getState().setFilters({ query: 'compost', gradeLevels: ['3'] });
    render(<IntSidebar counts={makeCounts()} />);

    fireEvent.click(screen.getByRole('button', { name: /clear all/i }));

    const { filters } = useSearchStore.getState();
    expect(filters.gradeLevels).toEqual([]);
    // The search text is NOT wiped (the D-E fix — the button used to call the
    // full-reset clearFilters, which cleared the query too).
    expect(filters.query).toBe('compost');
  });

  // D-A: a loaded zero-count option dims (still clickable); a checked/active
  // option never dims; nothing dims while counts are blank (loading/errored).
  describe('zero-row dimming (D-A)', () => {
    const checkRow = (section: ReturnType<typeof sectionByLabel>, label: string) =>
      Array.from(section.querySelectorAll('label.int-check')).find((r) =>
        r.textContent?.includes(label)
      )!;

    it('dims a loaded zero-count checkbox row that is not checked', () => {
      // Garden has a real count; Cooking is absent from the map ⇒ 0.
      render(<IntSidebar counts={makeCounts({ activityType: { 'garden-only': 5 } })} />);
      const section = sectionByLabel('Activity Type');

      const cookingRow = checkRow(section, 'Cooking');
      expect(cookingRow.querySelector('.int-check-count')!.textContent).toBe('0');
      expect(cookingRow.className).toContain('int-check--dim');

      // A positive-count row is never dimmed.
      expect(checkRow(section, 'Garden').className).not.toContain('int-check--dim');
    });

    it('never dims a checked row, even at count 0', () => {
      // Check Cooking, then hand it a 0 count (self-category selections never
      // restrict their own numbers, so a picked-but-zero row can occur).
      useSearchStore.getState().toggleFilter('activityType', 'cooking-only');
      render(<IntSidebar counts={makeCounts({ activityType: {} })} />);
      const section = sectionByLabel('Activity Type');

      const cookingRow = checkRow(section, 'Cooking');
      expect(cookingRow.querySelector('input')).toBeChecked();
      expect(cookingRow.querySelector('.int-check-count')!.textContent).toBe('0');
      expect(cookingRow.className).not.toContain('int-check--dim');
    });

    it('dims nothing while counts are still loading (undefined)', () => {
      render(<IntSidebar counts={undefined} />);
      expect(document.querySelectorAll('.int-check--dim').length).toBe(0);
      expect(document.querySelectorAll('.int-grade-pill--dim').length).toBe(0);
    });

    it('dims a zero-count grade pill but not an active one', () => {
      useSearchStore.getState().toggleFilter('gradeLevels', 'K'); // K becomes active
      render(<IntSidebar counts={makeCounts({ gradeLevels: { K: 0, '3K': 0 } })} />);
      const pills = Array.from(document.querySelectorAll('.int-grade-pill'));

      const kPill = pills.find((p) => p.textContent?.startsWith('K'))!;
      expect(kPill.className).toContain('active');
      expect(kPill.className).not.toContain('int-grade-pill--dim');

      const pill3K = pills.find((p) => p.textContent?.startsWith('3K'))!;
      expect(pill3K.className).toContain('int-grade-pill--dim');
    });
  });
});
