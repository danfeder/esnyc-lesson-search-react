import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { formatCategoryName, getCategoryIcon } from '@/utils/filterUtils';
import type { SearchFilters } from '@/types';

interface GroupedFilterPillProps {
  category: keyof SearchFilters;
  values: string[];

  onRemove: (value: string) => void;
  onRemoveAll: () => void;
}

export const GroupedFilterPill = React.memo<GroupedFilterPillProps>(
  ({ category, values, onRemove, onRemoveAll }) => {
    const [isHovered, setIsHovered] = useState(false);

    // Use useCallback to prevent unnecessary re-renders
    const handleMouseEnter = useCallback(() => setIsHovered(true), []);
    const handleMouseLeave = useCallback(() => setIsHovered(false), []);

    const formattedCategory = formatCategoryName(category);
    const icon = getCategoryIcon(category);

    return (
      <span
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-primary-100 text-primary-800 hover:bg-primary-200 transition-colors group relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {icon && (
          <span className="text-primary-600" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="text-primary-600">{formattedCategory}:</span>

        {/* Show values with individual remove buttons on hover (desktop only) */}
        <span className="flex items-center gap-1">
          {!isHovered ? (
            // Default view: comma-separated values
            <span>{values.join(', ')}</span>
          ) : (
            // Hover view: individual values with remove buttons (desktop only)
            <span className="hidden sm:flex items-center gap-1.5">
              {values.map((value, index) => (
                <span key={value} className="flex items-center">
                  <span>{value}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(value);
                    }}
                    className="ml-1 p-0.5 rounded-full hover:bg-primary-300 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                    aria-label={`Remove ${formattedCategory} filter: ${value}`}
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                  {index < values.length - 1 && (
                    <span className="ml-1 text-primary-400" aria-hidden="true">
                      |
                    </span>
                  )}
                </span>
              ))}
            </span>
          )}
          {/* On mobile, always show the grouped values */}
          {isHovered && <span className="sm:hidden">{values.join(', ')}</span>}
        </span>

        {/* Main remove button (removes all) */}
        <button
          onClick={onRemoveAll}
          className="ml-2 p-0.5 rounded-full hover:bg-primary-300 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
          aria-label={`Remove all ${formattedCategory} filters`}
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </span>
    );
  }
);
