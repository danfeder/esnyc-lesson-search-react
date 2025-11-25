import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterSidebar } from '@/components/Filters/FilterSidebar';
import type { SearchFilters } from '@/types';

const defaultFilters: SearchFilters = {
  query: '',
  gradeLevels: [],
  thematicCategories: [],
  seasonTiming: [],
  coreCompetencies: [],
  culturalHeritage: [],
  location: [],
  activityType: [],
  lessonFormat: '',
  academicIntegration: [],
  socialEmotionalLearning: [],
  cookingMethods: [],
};

describe('FilterSidebar uses unified filterDefinitions', () => {
  it('renders Activity Type options from FILTER_CONFIGS', () => {
    render(
      <FilterSidebar
        filters={defaultFilters}
        onFiltersChange={() => {}}
        isOpen={true}
        onClose={() => {}}
        facets={{}}
      />
    );

    // Activity Type section is defaultOpen in FilterSidebar
    expect(screen.getByText('Cooking Only')).toBeInTheDocument();
    expect(screen.getByText('Garden Only')).toBeInTheDocument();
    expect(screen.getByText('Cooking + Garden')).toBeInTheDocument();
    expect(screen.getByText('Academic Only')).toBeInTheDocument();
  });

  it('renders Grade Level options from FILTER_CONFIGS', () => {
    render(
      <FilterSidebar
        filters={defaultFilters}
        onFiltersChange={() => {}}
        isOpen={true}
        onClose={() => {}}
        facets={{}}
      />
    );

    // Grade Level section is defaultOpen in FilterSidebar
    expect(screen.getByText('3K')).toBeInTheDocument();
    expect(screen.getByText('Pre-K')).toBeInTheDocument();
    expect(screen.getByText('Kindergarten')).toBeInTheDocument();
    expect(screen.getByText('1st Grade')).toBeInTheDocument();
  });

  it('renders Thematic Category option from FILTER_CONFIGS when expanded', async () => {
    const user = userEvent.setup();
    render(
      <FilterSidebar
        filters={defaultFilters}
        onFiltersChange={() => {}}
        isOpen={true}
        onClose={() => {}}
        facets={{}}
      />
    );

    const themesToggle = screen.getByRole('button', { name: /thematic category/i });
    await user.click(themesToggle);
    expect(screen.getByText('Garden Basics')).toBeInTheDocument();
  });

  it('renders Season & Timing option from FILTER_CONFIGS when expanded', async () => {
    const user = userEvent.setup();
    render(
      <FilterSidebar
        filters={defaultFilters}
        onFiltersChange={() => {}}
        isOpen={true}
        onClose={() => {}}
        facets={{}}
      />
    );

    const seasonToggle = screen.getByRole('button', { name: /season & timing/i });
    await user.click(seasonToggle);
    expect(screen.getByText('Winter')).toBeInTheDocument();
  });

  it('shows facet count badge when facets provided', () => {
    const facets = { 'metadata.activityType': { both: 99 } } as Record<
      string,
      Record<string, number>
    >;
    render(
      <FilterSidebar
        filters={defaultFilters}
        onFiltersChange={() => {}}
        isOpen={true}
        onClose={() => {}}
        facets={facets}
      />
    );

    // Activity Type is default open; ensure count appears alongside the label
    expect(screen.getByText('Cooking + Garden')).toBeInTheDocument();
    expect(screen.getByText('99')).toBeInTheDocument();
  });
});
