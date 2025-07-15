import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CULTURAL_HIERARCHY } from '../../utils/filterConstants';

interface CulturalHeritageFilterProps {
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

interface CulturalRegionProps {
  regionName: string;
  subregions: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

const CulturalRegion: React.FC<CulturalRegionProps> = ({
  regionName,
  subregions,
  selectedValues,
  onChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRegionChange = (checked: boolean) => {
    if (checked) {
      // Add region and all its subregions
      const newValues = [...selectedValues, regionName, ...subregions];
      onChange([...new Set(newValues)]); // Remove duplicates
    } else {
      // Remove region and all its subregions
      const newValues = selectedValues.filter(
        value => value !== regionName && !subregions.includes(value)
      );
      onChange(newValues);
    }
  };

  const handleSubregionChange = (subregion: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, subregion]);
    } else {
      onChange(selectedValues.filter(value => value !== subregion));
    }
  };

  const isRegionSelected = selectedValues.includes(regionName);
  const hasSelectedSubregions = subregions.some(sub => selectedValues.includes(sub));

  return (
    <div className="border-b border-gray-100 pb-2 mb-2">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          )}
        </button>
        
        <label className="flex items-center space-x-2 cursor-pointer flex-1">
          <input
            type="checkbox"
            checked={isRegionSelected}
            onChange={(e) => handleRegionChange(e.target.checked)}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <span className={`text-sm font-medium ${isRegionSelected || hasSelectedSubregions ? 'text-primary-700' : 'text-gray-700'}`}>
            {regionName}
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {subregions.length}
          </span>
        </label>
      </div>

      {isExpanded && (
        <div className="ml-6 mt-2 space-y-1 animate-slide-up">
          {subregions.map((subregion) => (
            <label
              key={subregion}
              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors duration-200"
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(subregion)}
                onChange={(e) => handleSubregionChange(subregion, e.target.checked)}
                className="w-3 h-3 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">{subregion}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export const CulturalHeritageFilter: React.FC<CulturalHeritageFilterProps> = ({
  selectedValues,
  onChange
}) => {
  // Get top-level regions (those that have subregions)
  const topLevelRegions = Object.keys(CULTURAL_HIERARCHY).filter(region => 
    CULTURAL_HIERARCHY[region].length > 0 && 
    // Only include regions that aren't subregions of other regions
    !Object.values(CULTURAL_HIERARCHY).some(subregions => subregions.includes(region))
  );

  return (
    <div className="space-y-1 max-h-64 overflow-y-auto">
      {topLevelRegions.map((region) => (
        <CulturalRegion
          key={region}
          regionName={region}
          subregions={CULTURAL_HIERARCHY[region]}
          selectedValues={selectedValues}
          onChange={onChange}
        />
      ))}
    </div>
  );
};