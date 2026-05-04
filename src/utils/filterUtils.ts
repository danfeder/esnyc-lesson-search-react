/**
 * Utility functions for filter-related operations
 */

/**
 * Format category name for display
 */
export const formatCategoryName = (category: string): string => {
  const categoryNames: Record<string, string> = {
    gradeLevels: 'Grade',
    activityType: 'Activity',
    seasonTiming: 'Season',
    thematicCategories: 'Theme',
    culturalHeritage: 'Culture',
    coreCompetencies: 'Competency',
    cookingMethods: 'Method',
    academicIntegration: 'Subject',
    socialEmotionalLearning: 'SEL',
    location: 'Location',
  };
  return categoryNames[category] || category;
};

/**
 * Get category icon for display
 */
export const getCategoryIcon = (category: string): string => {
  const categoryIcons: Record<string, string> = {
    gradeLevels: '📚',
    activityType: '🎯',
    seasonTiming: '🍂',
    thematicCategories: '🌿',
    culturalHeritage: '🌍',
    coreCompetencies: '⭐',
    cookingMethods: '🍳',
    academicIntegration: '📚',
    socialEmotionalLearning: '💛',
    location: '📍',
  };
  return categoryIcons[category] || '';
};
