// Category explanations
export const CATEGORY_INFO: Record<
  string,
  { label: string; description: string; iconName: string; color: string }
> = {
  FORMATTING_ONLY: {
    label: 'Formatting Differences',
    description: 'Minor formatting or typo differences only - safe to auto-merge',
    iconName: 'Check',
    color: 'green',
  },
  EXACT_CONTENT: {
    label: 'Exact Duplicates',
    description: 'Identical content with different IDs - delete redundant copies',
    iconName: 'Check',
    color: 'green',
  },
  GRADE_ADAPTATIONS: {
    label: 'Grade-Level Adaptations',
    description: 'Same lesson adapted for different grades - keep all versions',
    iconName: 'Users',
    color: 'blue',
  },
  TITLE_INCONSISTENCIES: {
    label: 'Title Variations',
    description: 'Similar content with different titles - needs standardization',
    iconName: 'AlertTriangle',
    color: 'yellow',
  },
  CULTURAL_VARIATIONS: {
    label: 'Cultural Variations',
    description: 'Different cultural perspectives on same topic - preserve diversity',
    iconName: 'BookOpen',
    color: 'purple',
  },
  SEASONAL_VARIATIONS: {
    label: 'Seasonal Adaptations',
    description: 'Same lesson adapted for different seasons',
    iconName: 'Calendar',
    color: 'orange',
  },
  PEDAGOGICAL_VARIATIONS: {
    label: 'Different Teaching Approaches',
    description: 'Distinct pedagogical methods - may warrant keeping multiple versions',
    iconName: 'BookOpen',
    color: 'indigo',
  },
};

// Action recommendations
export const ACTION_INFO: Record<string, { label: string; description: string; color: string }> = {
  auto_merge: {
    label: 'Safe to Auto-Merge',
    description: 'These can be automatically consolidated without loss',
    color: 'green',
  },
  manual_review: {
    label: 'Manual Review Needed',
    description: 'Requires human judgment to decide on consolidation',
    color: 'yellow',
  },
  keep_all: {
    label: 'Keep All Versions',
    description: 'Each version has unique pedagogical value',
    color: 'blue',
  },
  split_group: {
    label: 'Split Into Sub-Groups',
    description: 'Contains distinct approaches that should be separated',
    color: 'purple',
  },
};

// Static mapping for Tailwind classes to prevent purging
export const COLOR_CLASSES: Record<string, string> = {
  green: 'bg-green-50 border-green-200 text-green-900 text-green-600 text-green-700 text-green-800',
  blue: 'bg-blue-50 border-blue-200 text-blue-900 text-blue-600 text-blue-700 text-blue-800',
  yellow:
    'bg-yellow-50 border-yellow-200 text-yellow-900 text-yellow-600 text-yellow-700 text-yellow-800',
  purple:
    'bg-purple-50 border-purple-200 text-purple-900 text-purple-600 text-purple-700 text-purple-800',
  red: 'bg-red-50 border-red-200 text-red-900 text-red-600 text-red-700 text-red-800',
  gray: 'bg-gray-50 border-gray-200 text-gray-900 text-gray-600 text-gray-700 text-gray-800',
  orange:
    'bg-orange-50 border-orange-200 text-orange-900 text-orange-600 text-orange-700 text-orange-800',
  indigo:
    'bg-indigo-50 border-indigo-200 text-indigo-900 text-indigo-600 text-indigo-700 text-indigo-800',
};
