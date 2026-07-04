import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { IntMainIngredientsSection } from './IntMainIngredientsSection';
import { useSearchStore } from '@/stores/searchStore';
import type { FacetCounts } from '@/utils/facetCounts';

/**
 * Minimal facet-count stub. Only the `mainIngredients` map is read by the
 * component; the rest are empty maps (FacetCounts is a record of value→count
 * maps per filter key).
 */
function makeCounts(mainIngredients: Record<string, number> = {}): FacetCounts {
  return {
    gradeLevels: {},
    activityType: {},
    location: {},
    mainIngredients,
    thematicCategories: {},
    seasonTiming: {},
    coreCompetencies: {},
    culturalHeritage: {},
    academicIntegration: {},
    socialEmotionalLearning: {},
    cookingMethods: {},
  };
}

describe('IntMainIngredientsSection', () => {
  beforeEach(() => {
    useSearchStore.setState((s) => ({ filters: { ...s.filters, mainIngredients: [] } }));
  });

  it('renders groups with their nested specifics + a group-less specific at top level', () => {
    render(<IntMainIngredientsSection counts={makeCounts()} />);
    // Group (top level)
    expect(screen.getByText('Beans & legumes')).toBeInTheDocument();
    // Specific under that group (depth 1)
    expect(screen.getByText('Black beans')).toBeInTheDocument();
    // A group-less specific renders as its own top-level leaf
    expect(screen.getByText('Celery')).toBeInTheDocument();
  });

  it('applies depth-proportional indent (group depth 0, specific depth 1)', () => {
    render(<IntMainIngredientsSection counts={makeCounts()} />);
    const group = screen.getByText('Beans & legumes').closest('label')!;
    expect(group.className).toContain('int-check');
    expect(group.className).not.toContain('int-check--child');
    expect(group.style.paddingLeft).toBe('');

    const specific = screen.getByText('Black beans').closest('label')!;
    expect(specific.className).toContain('int-check--child');
    expect(specific.style.paddingLeft).toBe('20px');
  });

  // The load-bearing invariant of this whole feature: DIRECT MATCH, not
  // parent→children expansion. Checking a group must NOT auto-check its specifics
  // (a future "make it consistent with heritage" refactor would break this).
  it('toggling a group does NOT auto-check its specifics (direct match)', () => {
    render(<IntMainIngredientsSection counts={makeCounts()} />);
    const groupBox = screen
      .getByText('Beans & legumes')
      .closest('label')!
      .querySelector('input[type="checkbox"]')!;
    fireEvent.click(groupBox);

    // Only the group value is stored — verbatim, no fan-out to children.
    expect(useSearchStore.getState().filters.mainIngredients).toEqual(['Beans & legumes']);
    // A specific under the group stays UNCHECKED.
    const specificBox = screen
      .getByText('Black beans')
      .closest('label')!
      .querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(specificBox.checked).toBe(false);
  });

  it('toggles a specific value verbatim, independent of its parent group', () => {
    render(<IntMainIngredientsSection counts={makeCounts()} />);
    const box = screen
      .getByText('Black beans')
      .closest('label')!
      .querySelector('input[type="checkbox"]')!;
    fireEvent.click(box);
    expect(useSearchStore.getState().filters.mainIngredients).toEqual(['Black beans']);
    fireEvent.click(box);
    expect(useSearchStore.getState().filters.mainIngredients).toEqual([]);
  });

  it('renders the per-node facet count for a group and a specific', () => {
    render(
      <IntMainIngredientsSection
        counts={makeCounts({ 'Beans & legumes': 81, 'Black beans': 12 })}
      />
    );
    const group = screen.getByText('Beans & legumes').closest('label')!;
    expect(within(group).getByText('81')).toBeInTheDocument();
    const specific = screen.getByText('Black beans').closest('label')!;
    expect(within(specific).getByText('12')).toBeInTheDocument();
  });

  it('renders a loaded zero as "0" (D-4)', () => {
    render(<IntMainIngredientsSection counts={makeCounts({ 'Beans & legumes': 81 })} />);
    const specific = screen.getByText('Black beans').closest('label')!;
    expect(specific.querySelector('.int-check-count')!.textContent).toBe('0');
  });

  it('renders blank badges while counts are undefined (corpus loading or failed)', () => {
    render(<IntMainIngredientsSection counts={undefined} />);
    const badges = document.querySelectorAll('.int-check-count');
    expect(badges.length).toBeGreaterThan(0);
    badges.forEach((badge) => expect(badge.textContent).toBe(''));
  });
});
