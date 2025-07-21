import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CULTURAL_HIERARCHY } from '../../utils/filterConstants';
import { getFacetCount } from '../../utils/facetHelpers';

interface CulturalHeritageFilterProps {
  selectedValues: string[];
  // eslint-disable-next-line no-unused-vars
  onChange: (values: string[]) => void;
  facets?: Record<string, Record<string, number>>;
}

interface CulturalRegionProps {
  regionName: string;
  subregions: string[];
  selectedValues: string[];
  // eslint-disable-next-line no-unused-vars
  onChange: (values: string[]) => void;
  facets: Record<string, Record<string, number>>;
}

const CulturalRegion: React.FC<CulturalRegionProps> = ({
  regionName,
  subregions,
  selectedValues,
  onChange,
  facets,
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
        (value) => value !== regionName && !subregions.includes(value)
      );
      onChange(newValues);
    }
  };

  const handleSubregionChange = (subregion: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, subregion]);
    } else {
      onChange(selectedValues.filter((value) => value !== subregion));
    }
  };

  const isRegionSelected = selectedValues.includes(regionName);
  const hasSelectedSubregions = subregions.some((sub) => selectedValues.includes(sub));

  return (
    <div className="border-b border-gray-100 pb-2 mb-2" role="treeitem" aria-expanded={isExpanded}>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${regionName} region`}
          aria-expanded={isExpanded}
          aria-controls={`region-${regionName.toLowerCase().replace(/\s+/g, '-')}-content`}
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
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            aria-label={`${regionName} region with ${getFacetCount(facets, 'metadata.culturalHeritage', regionName)} lessons`}
            aria-describedby={`region-${regionName.toLowerCase().replace(/\s+/g, '-')}-desc`}
          />
          <span
            className={`text-sm font-medium ${isRegionSelected || hasSelectedSubregions ? 'text-primary-700' : 'text-gray-700'}`}
          >
            {regionName}
          </span>
          <span
            className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full"
            aria-hidden="true"
          >
            {getFacetCount(facets, 'metadata.culturalHeritage', regionName)}
          </span>
        </label>
      </div>

      {isExpanded && (
        <div
          id={`region-${regionName.toLowerCase().replace(/\s+/g, '-')}-content`}
          className="ml-6 mt-2 space-y-1 animate-slide-up"
          role="group"
          aria-label={`${regionName} subregions`}
        >
          {subregions.map((subregion) => (
            <label
              key={subregion}
              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors duration-200"
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(subregion)}
                onChange={(e) => handleSubregionChange(subregion, e.target.checked)}
                className="w-3 h-3 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label={`${subregion} with ${getFacetCount(facets, 'metadata.culturalHeritage', subregion)} lessons`}
              />
              <span className="text-sm text-gray-600">{subregion}</span>
              <span
                className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full ml-auto"
                aria-hidden="true"
              >
                {getFacetCount(facets, 'metadata.culturalHeritage', subregion)}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export const CulturalHeritageFilter: React.FC<CulturalHeritageFilterProps> = ({
  selectedValues,
  onChange,
  facets = {},
}) => {
  // Get top-level regions (those that have subregions)
  const topLevelRegions = Object.keys(CULTURAL_HIERARCHY).filter(
    (region) =>
      CULTURAL_HIERARCHY[region].length > 0 &&
      // Only include regions that aren't subregions of other regions
      !Object.values(CULTURAL_HIERARCHY).some((subregions) => subregions.includes(region))
  );

  return (
    <div
      className="space-y-1 max-h-64 overflow-y-auto"
      role="tree"
      aria-label="Cultural Heritage Filter Options"
    >
      {topLevelRegions.map((region) => (
        <CulturalRegion
          key={region}
          regionName={region}
          subregions={CULTURAL_HIERARCHY[region]}
          selectedValues={selectedValues}
          onChange={onChange}
          facets={facets}
        />
      ))}
    </div>
  );
};
