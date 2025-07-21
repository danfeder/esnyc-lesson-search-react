import React, { useState, Fragment } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { X } from 'lucide-react';
import { SearchFilters } from '../../types';
import { FilterSection } from './FilterSection';
import { CulturalHeritageFilter } from './CulturalHeritageFilter';
import {
  CORE_COMPETENCIES,
  LESSON_FORMATS,
  ACADEMIC_SUBJECTS,
  SEL_COMPETENCIES,
  COOKING_METHODS,
} from '../../utils/filterConstants';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SearchFilters;
  // eslint-disable-next-line no-unused-vars
  onFiltersChange: (filters: SearchFilters) => void;
  facets?: Record<string, Record<string, number>>;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  facets = {},
}) => {
  const [selectedTab, setSelectedTab] = useState(0);

  // Grade level options
  const gradeOptions = [
    { value: '3K', label: '3K' },
    { value: 'PK', label: 'Pre-K' },
    { value: 'K', label: 'Kindergarten' },
    { value: '1', label: '1st Grade' },
    { value: '2', label: '2nd Grade' },
    { value: '3', label: '3rd Grade' },
    { value: '4', label: '4th Grade' },
    { value: '5', label: '5th Grade' },
    { value: '6', label: '6th Grade' },
    { value: '7', label: '7th Grade' },
    { value: '8', label: '8th Grade' },
  ];

  // Activity type options
  const activityOptions = [
    { value: 'cooking-only', label: 'Cooking Only' },
    { value: 'garden-only', label: 'Garden Only' },
    { value: 'both', label: 'Cooking + Garden' },
    { value: 'academic-only', label: 'Academic Only' },
  ];

  // Season options
  const seasonOptions = [
    { value: 'Fall', label: 'Fall' },
    { value: 'Winter', label: 'Winter' },
    { value: 'Spring', label: 'Spring' },
    { value: 'Summer', label: 'Summer' },
    { value: 'Beginning of year', label: 'Beginning of Year' },
    { value: 'End of year', label: 'End of Year' },
  ];

  // Location options
  const locationOptions = [
    { value: 'Indoor', label: 'Indoor' },
    { value: 'Outdoor', label: 'Outdoor' },
    { value: 'Both', label: 'Both' },
  ];

  // Thematic category options
  const themeOptions = [
    { value: 'Garden Basics', label: 'Garden Basics' },
    { value: 'Plant Growth', label: 'Plant Growth' },
    { value: 'Garden Communities', label: 'Garden Communities' },
    { value: 'Ecosystems', label: 'Ecosystems' },
    { value: 'Seed to Table', label: 'Seed to Table' },
    { value: 'Food Systems', label: 'Food Systems' },
    { value: 'Food Justice', label: 'Food Justice' },
  ];

  const tabClasses = ({ selected }: { selected: boolean }) =>
    `w-full py-3 text-sm font-medium leading-5 transition-all
    ${
      selected
        ? 'text-primary-700 border-b-2 border-primary-500'
        : 'text-gray-600 hover:text-gray-800 border-b-2 border-transparent'
    }`;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end sm:items-center justify-center text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-full sm:translate-y-0"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-full sm:translate-y-0"
            >
              <Dialog.Panel className="w-full h-[90vh] sm:h-auto sm:max-h-[80vh] sm:max-w-4xl transform overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                  <Dialog.Title as="h2" className="text-xl font-bold text-gray-900">
                    Filter Lessons
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Tabs */}
                <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
                  <Tab.List className="flex px-6 bg-white border-b border-gray-200">
                    <Tab className={tabClasses}>Essential</Tab>
                    <Tab className={tabClasses}>Themes & Culture</Tab>
                    <Tab className={tabClasses}>Advanced</Tab>
                  </Tab.List>

                  <Tab.Panels
                    className="p-6 overflow-y-auto"
                    style={{ height: 'calc(100% - 140px)' }}
                  >
                    {/* Essential Filters */}
                    <Tab.Panel className="space-y-6">
                      <FilterSection
                        title="Grade Level"
                        icon="📚"
                        options={gradeOptions}
                        selectedValues={filters.gradeLevels}
                        onChange={(values) => onFiltersChange({ ...filters, gradeLevels: values })}
                        facets={facets}
                        facetKey="gradeLevels"
                      />

                      <FilterSection
                        title="Activity Type"
                        icon="🍳"
                        options={activityOptions}
                        selectedValues={filters.activityType}
                        onChange={(values) => onFiltersChange({ ...filters, activityType: values })}
                        facets={facets}
                        facetKey="metadata.activityType"
                      />

                      <FilterSection
                        title="Season & Timing"
                        icon="🍂"
                        options={seasonOptions}
                        selectedValues={filters.seasons}
                        onChange={(values) => onFiltersChange({ ...filters, seasons: values })}
                        facets={facets}
                        facetKey="metadata.seasonTiming"
                        showYearRoundOption
                        includeAllSeasons={filters.includeAllSeasons}
                        onIncludeAllSeasonsChange={(checked) =>
                          onFiltersChange({ ...filters, includeAllSeasons: checked })
                        }
                      />

                      <FilterSection
                        title="Location"
                        icon="📍"
                        options={locationOptions}
                        selectedValues={filters.location}
                        onChange={(values) => onFiltersChange({ ...filters, location: values })}
                        facets={facets}
                        facetKey="metadata.locationRequirements"
                      />
                    </Tab.Panel>

                    {/* Themes & Culture */}
                    <Tab.Panel className="space-y-6">
                      <FilterSection
                        title="Thematic Category"
                        icon="🌿"
                        options={themeOptions}
                        selectedValues={filters.thematicCategories}
                        onChange={(values) =>
                          onFiltersChange({ ...filters, thematicCategories: values })
                        }
                        facets={facets}
                        facetKey="metadata.thematicCategories"
                      />

                      <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                          <span>🌍</span>
                          <span>Cultural Heritage</span>
                        </h3>
                        <CulturalHeritageFilter
                          selectedValues={filters.culturalHeritage}
                          onChange={(values) =>
                            onFiltersChange({ ...filters, culturalHeritage: values })
                          }
                          facets={facets}
                        />
                      </div>

                      <FilterSection
                        title="Core Competencies"
                        icon="⭐"
                        options={CORE_COMPETENCIES.map((comp) => ({
                          value: comp,
                          label: comp
                            .replace('and Related Academic Content', '')
                            .replace(
                              'Environmental and Community Stewardship',
                              'Environmental/Community Stewardship'
                            ),
                        }))}
                        selectedValues={filters.coreCompetencies}
                        onChange={(values) =>
                          onFiltersChange({ ...filters, coreCompetencies: values })
                        }
                        facets={facets}
                        facetKey="metadata.coreCompetencies"
                      />
                    </Tab.Panel>

                    {/* Advanced Filters */}
                    <Tab.Panel className="space-y-6">
                      <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                          <span>📋</span>
                          <span>Lesson Format</span>
                        </h3>
                        <select
                          value={filters.lessonFormat[0] || ''}
                          onChange={(e) =>
                            onFiltersChange({
                              ...filters,
                              lessonFormat: e.target.value ? [e.target.value] : [],
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="">All Formats</option>
                          {LESSON_FORMATS.map((format) => (
                            <option key={format} value={format}>
                              {format}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                          <span>🍳</span>
                          <span>Cooking Methods</span>
                        </h3>
                        <select
                          value={filters.cookingMethods}
                          onChange={(e) =>
                            onFiltersChange({
                              ...filters,
                              cookingMethods: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="">All Cooking Methods</option>
                          {COOKING_METHODS.map((method) => (
                            <option key={method} value={method}>
                              {method}
                            </option>
                          ))}
                        </select>
                      </div>

                      <FilterSection
                        title="Academic Integration"
                        icon="📚"
                        options={ACADEMIC_SUBJECTS.map((subject) => ({
                          value: subject,
                          label: subject,
                        }))}
                        selectedValues={filters.academicIntegration}
                        onChange={(values) =>
                          onFiltersChange({ ...filters, academicIntegration: values })
                        }
                        facets={facets}
                        facetKey="metadata.academicIntegration.selected"
                      />

                      <FilterSection
                        title="Social-Emotional Learning"
                        icon="💛"
                        options={SEL_COMPETENCIES.map((comp) => ({
                          value: comp,
                          label: comp,
                        }))}
                        selectedValues={filters.socialEmotionalLearning}
                        onChange={(values) =>
                          onFiltersChange({ ...filters, socialEmotionalLearning: values })
                        }
                        facets={facets}
                        facetKey="metadata.socialEmotionalLearning"
                      />
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
                  <button
                    onClick={onClose}
                    className="w-full btn-primary py-3 text-base font-medium"
                  >
                    Apply Filters
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
