import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { FilterPill } from './FilterPill';
import { GroupedFilterPill } from './GroupedFilterPill';
import { useSearchStore } from '../../stores/searchStore';
import type { SearchFilters } from '../../types';

interface FilterPillsProps {
  onAddFilters: () => void;
}

export const FilterPills: React.FC<FilterPillsProps> = ({ onAddFilters }) => {
  const { filters, removeFilter, clearFilters, setFilters } = useSearchStore();

  // Convert current filters to pill format
  const activeFilters = useMemo(() => {
    const pills: Array<{ category: keyof SearchFilters; value: string }> = [];

    // Handle array-based filters
    const arrayFilters: Array<keyof SearchFilters> = [
      'gradeLevels',
      'thematicCategories',
      'seasonTiming',
      'coreCompetencies',
      'culturalHeritage',
      'location',
      'activityType',
      'lessonFormat',
      'academicIntegration',
      'socialEmotionalLearning',
    ];

    arrayFilters.forEach((key) => {
      const values = filters[key] as string[];
      if (Array.isArray(values)) {
        values.forEach((value) => {
          pills.push({ category: key, value });
        });
      }
    });

    // Handle single-value filters
    if (filters.cookingMethods) {
      pills.push({ category: 'cookingMethods', value: filters.cookingMethods });
    }

    return pills;
  }, [filters]);
  const hasActiveFilters = activeFilters.length > 0 || filters.query.trim() !== '';

  // Group filters by category
  const groupedFilters = useMemo(
    () =>
      activeFilters.reduce(
        (acc, filter) => {
          if (!acc[filter.category]) {
            acc[filter.category] = [];
          }
          acc[filter.category].push(filter.value);
          return acc;
        },
        {} as Record<keyof SearchFilters, string[]>
      ),
    [activeFilters]
  );

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {/* Search query pill */}
      {filters.query.trim() && (
        <FilterPill
          category="Search"
          value={`"${filters.query}"`}
          onRemove={() => setFilters({ query: '' })}
        />
      )}

      {/* Filter pills - grouped by category */}
      {Object.entries(groupedFilters).map(([category, values]) => {
        const categoryKey = category as keyof SearchFilters;

        if (values.length === 1) {
          // Single value - use regular FilterPill
          return (
            <FilterPill
              key={`${category}-${values[0]}`}
              category={category}
              value={values[0]}
              onRemove={() => removeFilter(categoryKey, values[0])}
            />
          );
        } else {
          // Multiple values - use GroupedFilterPill
          return (
            <GroupedFilterPill
              key={category}
              category={categoryKey}
              values={values}
              onRemove={(value) => removeFilter(categoryKey, value)}
              onRemoveAll={() => {
                // Remove all values for this category
                values.forEach((value) => removeFilter(categoryKey, value));
              }}
            />
          );
        }
      })}

      {/* Add filters button */}
      <button
        onClick={onAddFilters}
        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border-2 border-dashed border-gray-300 text-gray-600 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        aria-label="Open filter modal to add more filters"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        <span>Add Filters</span>
      </button>

      {/* Clear all button */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-2 py-1"
          aria-label="Clear all active filters and search query"
        >
          Clear All
        </button>
      )}
    </div>
  );
};
