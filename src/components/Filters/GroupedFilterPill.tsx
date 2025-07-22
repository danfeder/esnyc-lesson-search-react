import React, { useState } from 'react';
import { X } from 'lucide-react';

interface GroupedFilterPillProps {
  category: string;
  values: string[];
  onRemove: (value: string) => void;
  onRemoveAll: () => void;
}

export const GroupedFilterPill: React.FC<GroupedFilterPillProps> = ({
  category,
  values,
  onRemove,
  onRemoveAll,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Format category name for display
  const formatCategory = (cat: string): string => {
    const categoryNames: Record<string, string> = {
      gradeLevels: 'Grade',
      activityType: 'Activity',
      seasons: 'Season',
      thematicCategories: 'Theme',
      culturalHeritage: 'Culture',
      coreCompetencies: 'Competency',
      lessonFormat: 'Format',
      cookingMethods: 'Method',
      academicIntegration: 'Subject',
      socialEmotionalLearning: 'SEL',
      location: 'Location',
    };
    return categoryNames[cat] || cat;
  };

  // Get category icon
  const getCategoryIcon = (cat: string): string => {
    const categoryIcons: Record<string, string> = {
      gradeLevels: '📚',
      activityType: '🍳',
      seasons: '🍂',
      thematicCategories: '🌿',
      culturalHeritage: '🌍',
      coreCompetencies: '⭐',
      lessonFormat: '📋',
      cookingMethods: '🍳',
      academicIntegration: '📚',
      socialEmotionalLearning: '💛',
      location: '📍',
    };
    return categoryIcons[cat] || '';
  };

  const formattedCategory = formatCategory(category);
  const icon = getCategoryIcon(category);

  return (
    <span
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-primary-100 text-primary-800 hover:bg-primary-200 transition-colors group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {icon && (
        <span className="text-primary-600" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="text-primary-600">{formattedCategory}:</span>

      {/* Show values with individual remove buttons on hover (desktop) */}
      <span className="flex items-center gap-1">
        {!isHovered ? (
          // Default view: comma-separated values
          <span>{values.join(', ')}</span>
        ) : (
          // Hover view: individual values with remove buttons
          <span className="flex items-center gap-1.5">
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
      </span>

      {/* Main remove button (removes all) */}
      <button
        onClick={onRemoveAll}
        className="ml-2 p-0.5 rounded-full hover:bg-primary-300 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
        aria-label={`Remove all ${formattedCategory} filters`}
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      {/* Mobile-friendly dropdown on small screens */}
      <div className="sm:hidden absolute top-full left-0 mt-1 z-10 hidden group-focus-within:block">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[200px]">
          {values.map((value) => (
            <div
              key={value}
              className="flex items-center justify-between p-1 hover:bg-gray-50 rounded"
            >
              <span className="text-sm">{value}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(value);
                }}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
                aria-label={`Remove ${formattedCategory} filter: ${value}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <div className="border-t border-gray-200 mt-1 pt-1">
            <button
              onClick={onRemoveAll}
              className="w-full text-left p-1 text-sm text-red-600 hover:bg-red-50 rounded"
            >
              Clear all {formattedCategory.toLowerCase()}s
            </button>
          </div>
        </div>
      </div>
    </span>
  );
};
