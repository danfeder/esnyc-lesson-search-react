import React, { useState, Fragment, useEffect, useRef } from 'react';
import { Dialog, Transition, Tab, Disclosure } from '@headlessui/react';
import { X, ChevronDown } from 'lucide-react';
import { SearchFilters } from '../../types';
import { FilterSection } from './FilterSection';
import { VirtualizedCulturalHeritageFilter } from './VirtualizedCulturalHeritageFilter';
import { LazyTabPanel } from './LazyTabPanel';
import { ErrorBoundary, DefaultErrorFallback } from '../Common/ErrorBoundary';
import { FILTER_CONFIGS } from '@/utils/filterDefinitions';

// Constants
const TAB_COUNT = 3; // Number of tabs in the modal

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SearchFilters;

  onFiltersChange: (filters: SearchFilters) => void;
  facets?: Record<string, Record<string, number>>;
}

export const FilterModal = React.memo<FilterModalProps>(
  ({ isOpen, onClose, filters, onFiltersChange, facets = {} }) => {
    const [selectedTab, setSelectedTab] = useState(0);
    const closeButtonRef = useRef<globalThis.HTMLButtonElement>(null);
    const applyButtonRef = useRef<globalThis.HTMLButtonElement>(null);

    // Handle keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: globalThis.KeyboardEvent) => {
        if (!isOpen) return;

        // Escape key closes modal
        if (e.key === 'Escape') {
          onClose();
        }

        // Tab navigation between tabs (Ctrl/Cmd + Left/Right arrow)
        if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
          e.preventDefault();
          setSelectedTab((prev) => (prev + 1) % TAB_COUNT);
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
          e.preventDefault();
          setSelectedTab((prev) => (prev - 1 + TAB_COUNT) % TAB_COUNT);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Options sourced from unified filter definitions
    const gradeOptions = FILTER_CONFIGS.gradeLevels.options;

    const activityOptions = FILTER_CONFIGS.activityType.options;

    const seasonOptions = FILTER_CONFIGS.seasonTiming.options;

    const locationOptions = FILTER_CONFIGS.location.options;

    const themeOptions = FILTER_CONFIGS.thematicCategories.options;

    const tabClasses = ({ selected }: { selected: boolean }) =>
      `w-full py-3 text-sm font-medium leading-5 transition-all
    ${
      selected
        ? 'text-primary-700 border-b-2 border-primary-500'
        : 'text-gray-600 hover:text-gray-800 border-b-2 border-transparent'
    }`;

    return (
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose} initialFocus={closeButtonRef}>
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
                <Dialog.Panel className="w-full h-[90vh] sm:h-[80vh] sm:max-w-4xl transform flex flex-col rounded-t-2xl sm:rounded-2xl bg-white text-left align-middle shadow-xl transition-all overflow-hidden">
                  {/* Header */}
                  <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <Dialog.Title as="h2" className="text-xl font-bold text-gray-900">
                      Filter Lessons
                    </Dialog.Title>
                    <button
                      ref={closeButtonRef}
                      onClick={onClose}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      aria-label="Close filter modal"
                    >
                      <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Tabs */}
                  <Tab.Group
                    selectedIndex={selectedTab}
                    onChange={setSelectedTab}
                    className="flex-1 min-h-0 flex flex-col"
                  >
                    <Tab.List
                      className="flex-shrink-0 flex px-6 bg-white border-b border-gray-200"
                      aria-label="Filter categories"
                    >
                      <Tab className={tabClasses} aria-label="Essential filters tab">
                        Essential
                      </Tab>
                      <Tab className={tabClasses} aria-label="Themes and culture filters tab">
                        Themes & Culture
                      </Tab>
                      <Tab className={tabClasses} aria-label="Advanced filters tab">
                        Advanced
                      </Tab>
                    </Tab.List>

                    <Tab.Panels className="flex-1 min-h-0 overflow-hidden">
                      {/* Essential Filters */}
                      <LazyTabPanel
                        className="h-full overflow-y-auto p-6 space-y-6"
                        index={0}
                        selectedIndex={selectedTab}
                      >
                        <FilterSection
                          title="Grade Level"
                          icon="📚"
                          options={gradeOptions}
                          selectedValues={filters.gradeLevels}
                          onChange={(values) =>
                            onFiltersChange({ ...filters, gradeLevels: values })
                          }
                          facets={facets}
                          facetKey="gradeLevels"
                          defaultOpen={true}
                        />

                        <FilterSection
                          title="Activity Type"
                          icon="🍳"
                          options={activityOptions}
                          selectedValues={filters.activityType}
                          onChange={(values) =>
                            onFiltersChange({ ...filters, activityType: values })
                          }
                          facets={facets}
                          facetKey="metadata.activityType"
                        />

                        <FilterSection
                          title="Season & Timing"
                          icon="🍂"
                          options={seasonOptions}
                          selectedValues={filters.seasonTiming}
                          onChange={(values) =>
                            onFiltersChange({ ...filters, seasonTiming: values })
                          }
                          facets={facets}
                          facetKey="metadata.seasonTiming"
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
                      </LazyTabPanel>

                      {/* Themes & Culture */}
                      <LazyTabPanel
                        className="h-full overflow-y-auto p-6 space-y-6"
                        index={1}
                        selectedIndex={selectedTab}
                      >
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

                        <Disclosure>
                          {({ open }) => (
                            <div className="border-b border-gray-200 pb-4">
                              <Disclosure.Button className="flex w-full items-center justify-between text-left">
                                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                  <span>🌍</span>
                                  <span>Cultural Heritage</span>
                                  {filters.culturalHeritage.length > 0 && (
                                    <span className="ml-2 text-sm font-normal text-gray-600">
                                      ({filters.culturalHeritage.length} selected)
                                    </span>
                                  )}
                                </h3>
                                <ChevronDown
                                  className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                                    open ? 'rotate-180' : ''
                                  }`}
                                />
                              </Disclosure.Button>
                              <Disclosure.Panel className="mt-4">
                                <ErrorBoundary fallback={DefaultErrorFallback}>
                                  <VirtualizedCulturalHeritageFilter
                                    selectedValues={filters.culturalHeritage}
                                    onChange={(values) =>
                                      onFiltersChange({ ...filters, culturalHeritage: values })
                                    }
                                    facets={facets}
                                  />
                                </ErrorBoundary>
                              </Disclosure.Panel>
                            </div>
                          )}
                        </Disclosure>

                        <FilterSection
                          title="Core Competencies"
                          icon="⭐"
                          options={FILTER_CONFIGS.coreCompetencies.options}
                          selectedValues={filters.coreCompetencies}
                          onChange={(values) =>
                            onFiltersChange({ ...filters, coreCompetencies: values })
                          }
                          facets={facets}
                          facetKey="metadata.coreCompetencies"
                        />
                      </LazyTabPanel>

                      {/* Advanced Filters */}
                      <LazyTabPanel
                        className="h-full overflow-y-auto p-6 space-y-6"
                        index={2}
                        selectedIndex={selectedTab}
                      >
                        <Disclosure>
                          {({ open }) => (
                            <div className="border-b border-gray-200 pb-4">
                              <Disclosure.Button className="flex w-full items-center justify-between text-left">
                                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                  <span>📋</span>
                                  <span>Lesson Format</span>
                                  {filters.lessonFormat && (
                                    <span className="ml-2 text-sm font-normal text-gray-600">
                                      ({filters.lessonFormat})
                                    </span>
                                  )}
                                </h3>
                                <ChevronDown
                                  className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                                    open ? 'rotate-180' : ''
                                  }`}
                                />
                              </Disclosure.Button>
                              <Disclosure.Panel className="mt-4">
                                <select
                                  value={filters.lessonFormat || ''}
                                  onChange={(e) =>
                                    onFiltersChange({
                                      ...filters,
                                      lessonFormat: e.target.value,
                                    })
                                  }
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                  aria-label="Select lesson format"
                                >
                                  <option value="">All Formats</option>
                                  {FILTER_CONFIGS.lessonFormat.options.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </Disclosure.Panel>
                            </div>
                          )}
                        </Disclosure>

                        <FilterSection
                          title="Cooking Methods"
                          icon="🍳"
                          options={FILTER_CONFIGS.cookingMethods.options}
                          selectedValues={filters.cookingMethods}
                          onChange={(values) =>
                            onFiltersChange({ ...filters, cookingMethods: values })
                          }
                          facets={facets}
                          facetKey="metadata.cookingMethods"
                        />

                        <FilterSection
                          title="Academic Integration"
                          icon="📚"
                          options={FILTER_CONFIGS.academicIntegration.options}
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
                          options={FILTER_CONFIGS.socialEmotionalLearning.options}
                          selectedValues={filters.socialEmotionalLearning}
                          onChange={(values) =>
                            onFiltersChange({ ...filters, socialEmotionalLearning: values })
                          }
                          facets={facets}
                          facetKey="metadata.socialEmotionalLearning"
                        />
                      </LazyTabPanel>
                    </Tab.Panels>
                  </Tab.Group>

                  {/* Footer */}
                  <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
                    <button
                      ref={applyButtonRef}
                      onClick={onClose}
                      className="w-full btn-primary py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      aria-label="Apply selected filters and close modal"
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
  }
);

FilterModal.displayName = 'FilterModal';
