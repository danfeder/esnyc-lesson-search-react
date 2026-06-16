import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { IntCulturalHeritageSection } from './IntCulturalHeritageSection';
import { useSearchStore } from '@/stores/searchStore';
import type { FacetCounts } from '@/utils/facetCounts';

/**
 * Minimal facet-count stub. Only the `culturalHeritage` map is read by the
 * component; the rest are empty maps since FacetCounts is a record of
 * value→count maps per filter key.
 */
function makeCounts(culturalHeritage: Record<string, number> = {}): FacetCounts {
  return {
    gradeLevels: {},
    tags: {},
    activityType: {},
    location: {},
    thematicCategories: {},
    seasonTiming: {},
    coreCompetencies: {},
    culturalHeritage,
    academicIntegration: {},
    socialEmotionalLearning: {},
    cookingMethods: {},
  };
}

describe('IntCulturalHeritageSection', () => {
  beforeEach(() => {
    // Reset the only piece of store state the component touches.
    useSearchStore.setState((s) => ({ filters: { ...s.filters, culturalHeritage: [] } }));
  });

  it('renders nested options to grandchild depth (recursive render)', () => {
    render(<IntCulturalHeritageSection counts={makeCounts()} />);

    // Top tier
    expect(screen.getByText('Americas')).toBeInTheDocument();
    expect(screen.getByText('Asian')).toBeInTheDocument();
    // Sub tier (depth 1)
    expect(screen.getByText('Latin American')).toBeInTheDocument();
    expect(screen.getByText('East Asian')).toBeInTheDocument();
    // Grandchild tier (depth 2) — proves recursion past the old 2-level limit
    expect(screen.getByText('Mexican')).toBeInTheDocument();
    expect(screen.getByText('Chinese')).toBeInTheDocument();
  });

  it('applies depth-proportional indent to nested nodes', () => {
    render(<IntCulturalHeritageSection counts={makeCounts()} />);

    // Top-level node: no child class, no inline indent.
    const top = screen.getByText('Americas').closest('label')!;
    expect(top.className).toContain('int-check');
    expect(top.className).not.toContain('int-check--child');
    expect(top.style.paddingLeft).toBe('');

    // Depth-1 node: child class + 20px indent.
    const depth1 = screen.getByText('Latin American').closest('label')!;
    expect(depth1.className).toContain('int-check--child');
    expect(depth1.style.paddingLeft).toBe('20px');

    // Depth-2 (grandchild) node: child class + 40px indent (deeper than depth-1).
    const depth2 = screen.getByText('Mexican').closest('label')!;
    expect(depth2.className).toContain('int-check--child');
    expect(depth2.style.paddingLeft).toBe('40px');
  });

  it('toggles the grandchild slug verbatim, independent of its parents', () => {
    render(<IntCulturalHeritageSection counts={makeCounts()} />);

    const grandchild = screen.getByText('Mexican').closest('label')!;
    const checkbox = grandchild.querySelector('input[type="checkbox"]')!;
    fireEvent.click(checkbox);

    // Handler fired with the node's kebab slug only — no client-side parent
    // auto-check (server handles recursive expansion).
    expect(useSearchStore.getState().filters.culturalHeritage).toEqual(['mexican']);

    fireEvent.click(checkbox);
    expect(useSearchStore.getState().filters.culturalHeritage).toEqual([]);
  });

  it('renders the per-node facet count, sourced unchanged', () => {
    render(<IntCulturalHeritageSection counts={makeCounts({ chinese: 7, americas: 12 })} />);

    const grandchild = screen.getByText('Chinese').closest('label')!;
    expect(within(grandchild).getByText('7')).toBeInTheDocument();

    const top = screen.getByText('Americas').closest('label')!;
    expect(within(top).getByText('12')).toBeInTheDocument();
  });
});
