import React from 'react';
import { X } from 'lucide-react';

interface FilterPillProps {
  category: string;
  value: string;
  onRemove: () => void;
}

export const FilterPill: React.FC<FilterPillProps> = ({ category, value, onRemove }) => {
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

  return (
    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-primary-100 text-primary-800 hover:bg-primary-200 transition-colors group">
      <span className="text-primary-600">{formatCategory(category)}:</span>
      <span>{value}</span>
      <button
        onClick={onRemove}
        className="ml-1 p-0.5 rounded-full hover:bg-primary-300 transition-colors"
        aria-label={`Remove ${category} filter: ${value}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );
};
