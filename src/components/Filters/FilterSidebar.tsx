import React, { useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { SearchFilters } from '@/types';
import { FILTER_CONFIGS } from '@/utils/filterDefinitions';
import { VirtualizedCulturalHeritageFilter } from './VirtualizedCulturalHeritageFilter';
import { getFacetCount } from '@/utils/facetHelpers';
import { useSearchStore } from '@/stores/searchStore';
import { ErrorBoundary, DefaultErrorFallback } from '@/components/Common/ErrorBoundary';

interface FilterSidebarProps {
  filters: SearchFilters;

  onFiltersChange: (filters: SearchFilters) => void;
  isOpen: boolean;
  onClose: () => void;
  facets?: Record<string, Record<string, number>>;
}

interface FilterSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const FilterSection = React.memo<FilterSectionProps>(
  ({ title, icon, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
      <div className="border-b border-gray-200 pb-4 mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full py-2 text-left hover:text-primary-600 transition-colors duration-200"
          aria-expanded={isOpen}
          aria-controls={`filter-section-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="flex items-center space-x-2">
            <span className="text-lg">{icon}</span>
            <span className="font-semibold text-gray-900">{title}</span>
          </div>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {isOpen && (
          <div
            className="mt-3 space-y-2 animate-slide-up"
            id={`filter-section-${title.toLowerCase().replace(/\s+/g, '-')}`}
            role="region"
            aria-label={`${title} filter options`}
          >
            {children}
          </div>
        )}
      </div>
    );
  }
);

interface CheckboxGroupProps {
  options: { value: string; label: string; count?: number }[];
  selectedValues: string[];

  onChange: (values: string[]) => void;
}

const CheckboxGroup = React.memo<CheckboxGroupProps>(({ options, selectedValues, onChange }) => {
  const handleChange = useCallback(
    (value: string, checked: boolean) => {
      if (checked) {
        onChange([...selectedValues, value]);
      } else {
        onChange(selectedValues.filter((v) => v !== value));
      }
    },
    [selectedValues, onChange]
  );

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200"
        >
          <input
            type="checkbox"
            checked={selectedValues.includes(option.value)}
            onChange={(e) => handleChange(option.value, e.target.checked)}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 flex-1">{option.label}</span>
          {option.count !== undefined && (
            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
              {option.count}
            </span>
          )}
        </label>
      ))}
    </div>
  );
});

export const FilterSidebar = React.memo<FilterSidebarProps>(
  ({ filters, onFiltersChange, isOpen, onClose, facets = {} }) => {
    const { clearFilters } = useSearchStore();

    // Options from unified definitions + facet counts
    const gradeOptions = useMemo(
      () =>
        FILTER_CONFIGS.gradeLevels.options.map((opt) => ({
          value: opt.value,
          label: opt.label,
          count: getFacetCount(facets, 'gradeLevels', opt.value),
        })),
      [facets]
    );

    const themeOptions = useMemo(
      () =>
        FILTER_CONFIGS.thematicCategories.options.map((opt) => ({
          value: opt.value,
          label: opt.label,
          count: getFacetCount(facets, 'metadata.thematicCategories', opt.value),
        })),
      [facets]
    );

    const seasonOptions = useMemo(
      () =>
        FILTER_CONFIGS.seasonTiming.options.map((opt) => ({
          value: opt.value,
          label: opt.label,
          count: getFacetCount(facets, 'metadata.seasonTiming', opt.value),
        })),
      [facets]
    );

    const activityOptions = useMemo(
      () =>
        FILTER_CONFIGS.activityType.options.map((opt) => ({
          value: opt.value,
          label: opt.label,
          count: getFacetCount(facets, 'metadata.activityType', opt.value),
        })),
      [facets]
    );

    const locationOptions = useMemo(
      () =>
        FILTER_CONFIGS.location.options.map((opt) => ({
          value: opt.value,
          label: opt.label,
          count: getFacetCount(facets, 'metadata.locationRequirements', opt.value),
        })),
      [facets]
    );

    const coreCompetencyOptions = useMemo(
      () =>
        FILTER_CONFIGS.coreCompetencies.options.map((opt) => ({
          value: opt.value,
          label: opt.label,
          count: getFacetCount(facets, 'metadata.coreCompetencies', opt.value),
        })),
      [facets]
    );

    const lessonFormatOptions = useMemo(
      () =>
        FILTER_CONFIGS.lessonFormat.options.map((opt) => ({
          value: opt.value,
          label: opt.label,
          count: getFacetCount(facets, 'metadata.lessonFormat', opt.value),
        })),
      [facets]
    );

    const academicIntegrationOptions = useMemo(
      () =>
        FILTER_CONFIGS.academicIntegration.options.map((opt) => ({
          value: opt.value,
          label: opt.label,
          count: getFacetCount(facets, 'metadata.academicIntegration.selected', opt.value),
        })),
      [facets]
    );

    const socialEmotionalLearningOptions = useMemo(
      () =>
        FILTER_CONFIGS.socialEmotionalLearning.options.map((opt) => ({
          value: opt.value,
          label: opt.label,
          count: getFacetCount(facets, 'metadata.socialEmotionalLearning', opt.value),
        })),
      [facets]
    );

    const cookingMethodsOptions = useMemo(
      () => [
        {
          value: 'No-cook',
          label: 'No-cook (salads, cold preparations)',
          count: getFacetCount(facets, 'metadata.cookingMethods', 'No-cook'),
        },
        {
          value: 'Stovetop',
          label: 'Stovetop (sautéing, boiling, simmering)',
          count: getFacetCount(facets, 'metadata.cookingMethods', 'Stovetop'),
        },
        {
          value: 'Oven',
          label: 'Oven (roasting, baking)',
          count: getFacetCount(facets, 'metadata.cookingMethods', 'Oven'),
        },
        {
          value: 'Basic prep only',
          label: 'Basic prep only (cutting, mixing, assembling)',
          count: getFacetCount(facets, 'metadata.cookingMethods', 'Basic prep only'),
        },
      ],
      [facets]
    );

    const activeFilterCount =
      (filters.query?.trim() ? 1 : 0) + // Include search query in count
      filters.gradeLevels.length +
      filters.thematicCategories.length +
      filters.seasonTiming.length +
      filters.coreCompetencies.length +
      filters.activityType.length +
      filters.location.length +
      filters.culturalHeritage.length +
      (filters.lessonFormat ? 1 : 0) +
      filters.academicIntegration.length +
      filters.socialEmotionalLearning.length +
      filters.cookingMethods.length;

    const handleClearAll = () => {
      clearFilters(); // Use store's clearFilters function to clear both search and filters
    };

    return (
      <>
        {/* Mobile Overlay */}
        {isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />
        )}

        {/* Sidebar */}
        <div
          className={`
        fixed lg:sticky top-0 left-0 h-full lg:h-auto
        w-80 bg-white shadow-xl lg:shadow-sm border-r border-gray-200
        transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        overflow-y-auto
      `}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-gray-900">Filters</h2>
                {activeFilterCount > 0 && (
                  <span className="bg-primary-100 text-primary-800 text-sm font-medium px-2 py-1 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                    title="Clear all filters and search"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="lg:hidden p-1 hover:bg-gray-100 rounded-lg"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Primary Filters */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
                Primary Filters
              </h3>

              <FilterSection title="Activity Type" icon="🍳" defaultOpen>
                <CheckboxGroup
                  options={activityOptions}
                  selectedValues={filters.activityType}
                  onChange={(values) => onFiltersChange({ ...filters, activityType: values })}
                />
              </FilterSection>

              <FilterSection title="Grade Level" icon="📚" defaultOpen>
                <CheckboxGroup
                  options={gradeOptions}
                  selectedValues={filters.gradeLevels}
                  onChange={(values) => onFiltersChange({ ...filters, gradeLevels: values })}
                />
              </FilterSection>

              <FilterSection title="Location" icon="📍">
                <CheckboxGroup
                  options={locationOptions}
                  selectedValues={filters.location}
                  onChange={(values) => onFiltersChange({ ...filters, location: values })}
                />
              </FilterSection>

              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4 mt-8">
                Topic & Content
              </h3>

              <FilterSection title="Thematic Category" icon="🌿">
                <CheckboxGroup
                  options={themeOptions}
                  selectedValues={filters.thematicCategories}
                  onChange={(values) => onFiltersChange({ ...filters, thematicCategories: values })}
                />
              </FilterSection>

              <FilterSection title="Season & Timing" icon="🍂">
                <CheckboxGroup
                  options={seasonOptions}
                  selectedValues={filters.seasonTiming}
                  onChange={(values) => onFiltersChange({ ...filters, seasonTiming: values })}
                />
              </FilterSection>

              <FilterSection title="Core Competencies" icon="⭐">
                <CheckboxGroup
                  options={coreCompetencyOptions}
                  selectedValues={filters.coreCompetencies}
                  onChange={(values) => onFiltersChange({ ...filters, coreCompetencies: values })}
                />
              </FilterSection>

              <FilterSection title="Academic Integration" icon="📚">
                <CheckboxGroup
                  options={academicIntegrationOptions}
                  selectedValues={filters.academicIntegration}
                  onChange={(values) =>
                    onFiltersChange({ ...filters, academicIntegration: values })
                  }
                />
              </FilterSection>

              <FilterSection title="Social-Emotional Learning" icon="💛">
                <CheckboxGroup
                  options={socialEmotionalLearningOptions}
                  selectedValues={filters.socialEmotionalLearning}
                  onChange={(values) =>
                    onFiltersChange({ ...filters, socialEmotionalLearning: values })
                  }
                />
              </FilterSection>

              <FilterSection title="Cultural Heritage" icon="🌍">
                <ErrorBoundary fallback={DefaultErrorFallback}>
                  <VirtualizedCulturalHeritageFilter
                    selectedValues={filters.culturalHeritage}
                    onChange={(values) => onFiltersChange({ ...filters, culturalHeritage: values })}
                    facets={facets}
                  />
                </ErrorBoundary>
              </FilterSection>

              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4 mt-8">
                Advanced Filters
              </h3>

              <FilterSection title="Lesson Format" icon="📋">
                <div className="space-y-2">
                  <select
                    value={filters.lessonFormat || ''}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        lessonFormat: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    aria-label="Select lesson format"
                  >
                    <option value="">All Formats</option>
                    {lessonFormatOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </FilterSection>

              <FilterSection title="Cooking Methods" icon="🍳">
                <CheckboxGroup
                  options={cookingMethodsOptions}
                  selectedValues={filters.cookingMethods}
                  onChange={(values) => onFiltersChange({ ...filters, cookingMethods: values })}
                />
              </FilterSection>
            </div>
          </div>
        </div>
      </>
    );
  }
);

FilterSidebar.displayName = 'FilterSidebar';
