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
