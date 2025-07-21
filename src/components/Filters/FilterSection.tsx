import React from 'react';
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
}

export const FilterSection: React.FC<FilterSectionProps> = ({
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
}) => {
  const handleCheckboxChange = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, value]);
    } else {
      onChange(selectedValues.filter((v) => v !== value));
    }
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((opt) => opt.value));
    }
  };

  const isAllSelected = selectedValues.length === options.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <span>{icon}</span>
          <span>{title}</span>
        </h3>
        {options.length > 3 && (
          <button
            onClick={handleSelectAll}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {isAllSelected ? 'Clear All' : 'Select All'}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {options.map((option) => {
          const count = facetKey ? getFacetCount(facets, facetKey, option.value) : undefined;

          return (
            <label
              key={option.value}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={(e) => handleCheckboxChange(option.value, e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
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
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
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
    </div>
  );
};
