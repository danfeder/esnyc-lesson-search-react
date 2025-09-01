import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  cookingMethods: '',
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
});

