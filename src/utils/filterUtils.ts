/**
 * Utility functions for filter-related operations
 */
import { FILTER_CONFIGS } from '@/utils/filterDefinitions';

/**
 * A node in the cultural-heritage option tree. The tree is now 3-4 tiers deep
 * (Americas › Latin American › Mexican), so `children` is recursive.
 */
interface HeritageNode {
  value: string;
  label: string;
  children?: HeritageNode[];
}

/**
 * Build a flat `value → label` lookup across the ENTIRE cultural-heritage
 * option tree, recursing through every tier (not just direct children). Used
 * by display surfaces (active pills, list rows, lesson detail) to resolve a
 * stored slug to its Title-Case display label regardless of depth.
 */
export const buildCultureLabelMap = (): Record<string, string> => {
  const out: Record<string, string> = {};
  const walk = (nodes: readonly HeritageNode[]) => {
    for (const node of nodes) {
      out[node.value] = node.label;
      if (node.children) walk(node.children);
    }
  };
  walk(FILTER_CONFIGS.culturalHeritage.options as readonly HeritageNode[]);
  return out;
};

/**
 * Return every transitive descendant value of a cultural-heritage node — all
 * children, grandchildren, etc. at any depth. The node itself is excluded.
 * Returns `[]` for leaf nodes and unknown values.
 */
export const getCultureDescendantValues = (value: string): string[] => {
  const collect = (nodes: readonly HeritageNode[]): string[] =>
    nodes.flatMap((node) => [node.value, ...collect(node.children ?? [])]);

  const find = (nodes: readonly HeritageNode[]): HeritageNode | undefined => {
    for (const node of nodes) {
      if (node.value === value) return node;
      const hit = find(node.children ?? []);
      if (hit) return hit;
    }
    return undefined;
  };

  const target = find(FILTER_CONFIGS.culturalHeritage.options as readonly HeritageNode[]);
  if (!target?.children) return [];
  return collect(target.children);
};

/**
 * Format category name for display
 */
export const formatCategoryName = (category: string): string => {
  const categoryNames: Record<string, string> = {
    gradeLevels: 'Grade',
    tags: 'Lesson Type',
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
    tags: '🏷️',
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
