import React, { useState, useMemo, useCallback } from 'react';
// TODO: Replace with @tanstack/react-virtual
// import { FixedSizeList as List } from 'react-window';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CULTURAL_HIERARCHY } from '../../utils/filterConstants';
import { getFacetCount } from '../../utils/facetHelpers';

// Constants for virtualization
// const LIST_HEIGHT = 256; // 16rem = 256px (max-h-64) - TODO: Use when migrating to @tanstack/react-virtual
const ROW_HEIGHT = 40; // Height of each row in pixels

interface CulturalHeritageFilterProps {
  selectedValues: string[];
  // eslint-disable-next-line no-unused-vars
  onChange: (values: string[]) => void;
  facets?: Record<string, Record<string, number>>;
}

interface FlattenedItem {
  type: 'region' | 'subregion';
  name: string;
  regionName?: string;
  subregions?: string[];
  level: number;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    items: FlattenedItem[];
    expandedRegions: Set<string>;
    selectedValues: string[];
    facets: Record<string, Record<string, number>>;
    // eslint-disable-next-line no-unused-vars
    onToggleExpand: (region: string) => void;
    // eslint-disable-next-line no-unused-vars
    onRegionChange: (regionName: string, subregions: string[], checked: boolean) => void;
    // eslint-disable-next-line no-unused-vars
    onSubregionChange: (subregion: string, checked: boolean) => void;
  };
}

const Row: React.FC<RowProps> = ({ index, style, data }) => {
  const {
    items,
    expandedRegions,
    selectedValues,
    facets,
    onToggleExpand,
    onRegionChange,
    onSubregionChange,
  } = data;

  const item = items[index];

  if (item.type === 'region') {
    const isExpanded = expandedRegions.has(item.name);
    const isRegionSelected = selectedValues.includes(item.name);
    const hasSelectedSubregions =
      item.subregions?.some((sub) => selectedValues.includes(sub)) || false;

    return (
      <div style={style} className="border-b border-gray-100 pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onToggleExpand(item.name)}
            className="p-1 hover:bg-gray-100 rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.name} region`}
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
              onChange={(e) => onRegionChange(item.name, item.subregions || [], e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            />
            <span
              className={`text-sm font-medium ${
                isRegionSelected || hasSelectedSubregions ? 'text-primary-700' : 'text-gray-700'
              }`}
            >
              {item.name}
            </span>
            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
              {getFacetCount(facets, 'metadata.culturalHeritage', item.name)}
            </span>
          </label>
        </div>
      </div>
    );
  }

  // Subregion
  return (
    <div style={style} className="ml-6">
      <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors duration-200">
        <input
          type="checkbox"
          checked={selectedValues.includes(item.name)}
          onChange={(e) => onSubregionChange(item.name, e.target.checked)}
          className="w-3 h-3 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        />
        <span className="text-sm text-gray-600">{item.name}</span>
        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full ml-auto">
          {getFacetCount(facets, 'metadata.culturalHeritage', item.name)}
        </span>
      </label>
    </div>
  );
};

export const VirtualizedCulturalHeritageFilter: React.FC<CulturalHeritageFilterProps> = React.memo(
  ({ selectedValues, onChange, facets = {} }) => {
    const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());

    // Get top-level regions
    const topLevelRegions = useMemo(
      () =>
        Object.keys(CULTURAL_HIERARCHY).filter(
          (region) =>
            CULTURAL_HIERARCHY[region].length > 0 &&
            !Object.values(CULTURAL_HIERARCHY).some((subregions) => subregions.includes(region))
        ),
      []
    );

    // Flatten the hierarchy for virtualization
    const flattenedItems = useMemo(() => {
      const items: FlattenedItem[] = [];

      topLevelRegions.forEach((region) => {
        items.push({
          type: 'region',
          name: region,
          subregions: CULTURAL_HIERARCHY[region],
          level: 0,
        });

        if (expandedRegions.has(region)) {
          CULTURAL_HIERARCHY[region].forEach((subregion) => {
            items.push({
              type: 'subregion',
              name: subregion,
              regionName: region,
              level: 1,
            });
          });
        }
      });

      return items;
    }, [topLevelRegions, expandedRegions]);

    const handleToggleExpand = useCallback((region: string) => {
      setExpandedRegions((prev) => {
        const next = new Set(prev);
        if (next.has(region)) {
          next.delete(region);
        } else {
          next.add(region);
        }
        return next;
      });
    }, []);

    const handleRegionChange = useCallback(
      (regionName: string, subregions: string[], checked: boolean) => {
        if (checked) {
          const newValues = [...selectedValues, regionName, ...subregions];
          onChange([...new Set(newValues)]);
        } else {
          const newValues = selectedValues.filter(
            (value) => value !== regionName && !subregions.includes(value)
          );
          onChange(newValues);
        }
      },
      [selectedValues, onChange]
    );

    const handleSubregionChange = useCallback(
      (subregion: string, checked: boolean) => {
        if (checked) {
          onChange([...selectedValues, subregion]);
        } else {
          onChange(selectedValues.filter((value) => value !== subregion));
        }
      },
      [selectedValues, onChange]
    );

    const itemData = {
      items: flattenedItems,
      expandedRegions,
      selectedValues,
      facets,
      onToggleExpand: handleToggleExpand,
      onRegionChange: handleRegionChange,
      onSubregionChange: handleSubregionChange,
    };

    return (
      <div
        role="tree"
        aria-label="Cultural Heritage Filter Options"
        aria-describedby="cultural-heritage-help"
      >
        <div id="cultural-heritage-help" className="sr-only">
          Use arrow keys to navigate between regions and subregions. Press Enter or Space to expand
          or collapse regions. Check or uncheck items to filter results.
        </div>
        {/* Temporary non-virtualized list - TODO: Migrate to @tanstack/react-virtual */}
        <div className="max-h-64 overflow-y-auto">
          {flattenedItems.map((_item, index) => (
            <Row key={index} index={index} style={{ height: ROW_HEIGHT }} data={itemData} />
          ))}
        </div>
      </div>
    );
  }
);

VirtualizedCulturalHeritageFilter.displayName = 'VirtualizedCulturalHeritageFilter';
