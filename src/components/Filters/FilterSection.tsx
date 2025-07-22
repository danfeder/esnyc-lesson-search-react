import React, { useMemo, useCallback } from 'react';
import { Disclosure } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';
import { getFacetCount } from '../../utils/facetHelpers';

interface FilterSectionProps {
  title: string;
  icon: string;
  options: Array<{ value: string; label: string }>;
  selectedValues: string[];
  // eslint-disable-next-line no-unused-vars
  onChange: (values: string[]) => void;
  facets?: Record<string, Record<string, number>>;
  facetKey?: string;
  showYearRoundOption?: boolean;
  includeAllSeasons?: boolean;
  // eslint-disable-next-line no-unused-vars
  onIncludeAllSeasonsChange?: (checked: boolean) => void;
  defaultOpen?: boolean;
}

export const FilterSection = React.memo<FilterSectionProps>(
  ({
    title,
    icon,
    options,
    selectedValues,
    onChange,
    facets = {},
    facetKey,
    showYearRoundOption,
    includeAllSeasons,
    onIncludeAllSeasonsChange,
    defaultOpen = false,
  }) => {
    const handleCheckboxChange = useCallback(
      (value: string, checked: boolean) => {
        if (checked) {
          onChange([...selectedValues, value]);
        } else {
          onChange(selectedValues.filter((v) => v !== value));
        }
      },
      [selectedValues, onChange]
    );

    const handleSelectAll = useCallback(() => {
      if (selectedValues.length === options.length) {
        onChange([]);
      } else {
        onChange(options.map((opt) => opt.value));
      }
    }, [selectedValues, options, onChange]);

    const isAllSelected = useMemo(
      () => selectedValues.length === options.length,
      [selectedValues, options]
    );

    return (
      <Disclosure defaultOpen={defaultOpen}>
        {({ open }) => (
          <div className="border-b border-gray-200 pb-4">
            <Disclosure.Button
              className="flex w-full items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset rounded-md px-2 py-1"
              aria-expanded={open}
            >
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <span aria-hidden="true">{icon}</span>
                <span>{title}</span>
                {selectedValues.length > 0 && (
                  <span
                    className="ml-2 text-sm font-normal text-gray-600"
                    aria-label={`${selectedValues.length} filters selected`}
                  >
                    ({selectedValues.length} selected)
                  </span>
                )}
              </h3>
              <ChevronDown
                className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                  open ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </Disclosure.Button>

            <Disclosure.Panel className="mt-4">
              {options.length > 3 && (
                <div className="mb-3 flex justify-end">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {isAllSelected ? 'Clear All' : 'Select All'}
                  </button>
                </div>
              )}

              <div className="space-y-1">
                {options.map((option) => {
                  const count = facetKey
                    ? getFacetCount(facets, facetKey, option.value)
                    : undefined;

                  return (
                    <label
                      key={option.value}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedValues.includes(option.value)}
                          onChange={(e) => handleCheckboxChange(option.value, e.target.checked)}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                          aria-label={`${option.label}${count !== undefined ? `, ${count} lessons` : ''}`}
                          id={`filter-${title.toLowerCase().replace(/\s+/g, '-')}-${option.value.toLowerCase().replace(/\s+/g, '-')}`}
                        />
                        <span className="text-gray-700">{option.label}</span>
                      </div>
                      {count !== undefined && count > 0 && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {count}
                        </span>
                      )}
                    </label>
                  );
                })}

                {/* Year-round option for seasons */}
                {showYearRoundOption && onIncludeAllSeasonsChange && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={includeAllSeasons}
                        onChange={(e) => onIncludeAllSeasonsChange(e.target.checked)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-gray-700 italic">Include year-round lessons</span>
                    </label>
                  </div>
                )}
              </div>
            </Disclosure.Panel>
          </div>
        )}
      </Disclosure>
    );
  }
);

FilterSection.displayName = 'FilterSection';
