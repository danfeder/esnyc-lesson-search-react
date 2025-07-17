import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { SearchFilters } from '../../types';
import { CORE_COMPETENCIES, LESSON_FORMATS } from '../../utils/filterConstants';
import { CulturalHeritageFilter } from './CulturalHeritageFilter';

interface FilterSidebarProps {
  filters: SearchFilters;
  // eslint-disable-next-line no-unused-vars
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

const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  icon,
  children,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 pb-4 mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 text-left hover:text-primary-600 transition-colors duration-200"
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

      {isOpen && <div className="mt-3 space-y-2 animate-slide-up">{children}</div>}
    </div>
  );
};

interface CheckboxGroupProps {
  options: { value: string; label: string; count?: number }[];
  selectedValues: string[];
  // eslint-disable-next-line no-unused-vars
  onChange: (values: string[]) => void;
}

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({ options, selectedValues, onChange }) => {
  const handleChange = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, value]);
    } else {
      onChange(selectedValues.filter((v) => v !== value));
    }
  };

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
};

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onFiltersChange,
  isOpen,
  onClose,
  facets = {},
}) => {
  // Helper function to get facet count for a specific value
  const getFacetCount = (facetName: string, value: string): number => {
    return facets[facetName]?.[value] || 0;
  };
  const gradeOptions = [
    { value: '3K', label: '3K', count: getFacetCount('gradeLevels', '3K') },
    { value: 'PK', label: 'Pre-K', count: getFacetCount('gradeLevels', 'PK') },
    { value: 'K', label: 'Kindergarten', count: getFacetCount('gradeLevels', 'K') },
    { value: '1', label: '1st Grade', count: getFacetCount('gradeLevels', '1') },
    { value: '2', label: '2nd Grade', count: getFacetCount('gradeLevels', '2') },
    { value: '3', label: '3rd Grade', count: getFacetCount('gradeLevels', '3') },
    { value: '4', label: '4th Grade', count: getFacetCount('gradeLevels', '4') },
    { value: '5', label: '5th Grade', count: getFacetCount('gradeLevels', '5') },
    { value: '6', label: '6th Grade', count: getFacetCount('gradeLevels', '6') },
    { value: '7', label: '7th Grade', count: getFacetCount('gradeLevels', '7') },
    { value: '8', label: '8th Grade', count: getFacetCount('gradeLevels', '8') },
  ];

  const themeOptions = [
    { value: 'Garden Basics', label: 'Garden Basics', count: getFacetCount('metadata.thematicCategories', 'Garden Basics') },
    { value: 'Plant Growth', label: 'Plant Growth', count: getFacetCount('metadata.thematicCategories', 'Plant Growth') },
    { value: 'Garden Communities', label: 'Garden Communities', count: getFacetCount('metadata.thematicCategories', 'Garden Communities') },
    { value: 'Ecosystems', label: 'Ecosystems', count: getFacetCount('metadata.thematicCategories', 'Ecosystems') },
    { value: 'Seed to Table', label: 'Seed to Table', count: getFacetCount('metadata.thematicCategories', 'Seed to Table') },
    { value: 'Food Systems', label: 'Food Systems', count: getFacetCount('metadata.thematicCategories', 'Food Systems') },
    { value: 'Food Justice', label: 'Food Justice', count: getFacetCount('metadata.thematicCategories', 'Food Justice') },
  ];

  const seasonOptions = [
    { value: 'Fall', label: 'Fall', count: getFacetCount('metadata.seasonTiming', 'Fall') },
    { value: 'Winter', label: 'Winter', count: getFacetCount('metadata.seasonTiming', 'Winter') },
    { value: 'Spring', label: 'Spring', count: getFacetCount('metadata.seasonTiming', 'Spring') },
    { value: 'Summer', label: 'Summer', count: getFacetCount('metadata.seasonTiming', 'Summer') },
    { value: 'Beginning of year', label: 'Beginning of Year', count: getFacetCount('metadata.seasonTiming', 'Beginning of year') },
    { value: 'End of year', label: 'End of Year', count: getFacetCount('metadata.seasonTiming', 'End of year') },
  ];

  const activityOptions = [
    { value: 'cooking-only', label: 'Cooking Only', count: getFacetCount('metadata.activityType', 'cooking-only') },
    { value: 'garden-only', label: 'Garden Only', count: getFacetCount('metadata.activityType', 'garden-only') },
    { value: 'both', label: 'Cooking + Garden', count: getFacetCount('metadata.activityType', 'both') },
    { value: 'academic-only', label: 'Academic Only', count: getFacetCount('metadata.activityType', 'academic-only') },
  ];

  const locationOptions = [
    { value: 'Indoor', label: 'Indoor', count: getFacetCount('metadata.locationRequirements', 'Indoor') },
    { value: 'Outdoor', label: 'Outdoor', count: getFacetCount('metadata.locationRequirements', 'Outdoor') },
    { value: 'Both', label: 'Both', count: getFacetCount('metadata.locationRequirements', 'Both') },
  ];

  const coreCompetencyOptions = CORE_COMPETENCIES.map((comp) => ({
    value: comp,
    label: comp
      .replace('and Related Academic Content', '')
      .replace('Environmental and Community Stewardship', 'Environmental/Community Stewardship'),
    count: getFacetCount('metadata.coreCompetencies', comp),
  }));

  const lessonFormatOptions = LESSON_FORMATS.map((format) => ({
    value: format,
    label: format,
    count: getFacetCount('metadata.lessonFormat', format),
  }));

  const activeFilterCount =
    filters.gradeLevels.length +
    filters.thematicCategories.length +
    filters.seasons.length +
    filters.coreCompetencies.length +
    filters.activityType.length +
    filters.location.length +
    filters.culturalHeritage.length +
    (filters.lessonFormat.length > 0 ? 1 : 0);

  const clearAllFilters = () => {
    onFiltersChange({
      ...filters,
      gradeLevels: [],
      thematicCategories: [],
      seasons: [],
      coreCompetencies: [],
      activityType: [],
      location: [],
      culturalHeritage: [],
      lessonFormat: [],
      includeAllSeasons: false,
    });
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
                  onClick={clearAllFilters}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
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
                selectedValues={filters.seasons}
                onChange={(values) => onFiltersChange({ ...filters, seasons: values })}
              />
              <div className="mt-4 pt-4 border-t border-gray-200">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.includeAllSeasons}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        includeAllSeasons: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 italic">Include year-round lessons</span>
                </label>
              </div>
            </FilterSection>

            <FilterSection title="Core Competencies" icon="⭐">
              <CheckboxGroup
                options={coreCompetencyOptions}
                selectedValues={filters.coreCompetencies}
                onChange={(values) => onFiltersChange({ ...filters, coreCompetencies: values })}
              />
            </FilterSection>

            <FilterSection title="Cultural Heritage" icon="🌍">
              <CulturalHeritageFilter
                selectedValues={filters.culturalHeritage}
                onChange={(values) => onFiltersChange({ ...filters, culturalHeritage: values })}
              />
            </FilterSection>

            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4 mt-8">
              Advanced Filters
            </h3>

            <FilterSection title="Lesson Format" icon="📋">
              <div className="space-y-2">
                <select
                  value={filters.lessonFormat[0] || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      lessonFormat: e.target.value ? [e.target.value] : [],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
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
          </div>
        </div>
      </div>
    </>
  );
};
