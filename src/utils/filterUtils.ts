/**
 * Utility functions for filter-related operations
 */
import { FILTER_CONFIGS } from '@/utils/filterDefinitions';
import type { HeritageOption } from '@/utils/heritageHierarchy.generated';

/**
 * Build a flat `value → label` lookup across the ENTIRE cultural-heritage
 * option tree, recursing through every tier (not just direct children). Used
 * by display surfaces (active pills, list rows, lesson detail) to resolve a
 * stored slug to its Title-Case display label regardless of depth.
 */
export const buildCultureLabelMap = (): Record<string, string> => {
  const out: Record<string, string> = {};
  const walk = (nodes: readonly HeritageOption[]) => {
    for (const node of nodes) {
      out[node.value] = node.label;
      if (node.children) walk(node.children);
    }
  };
  walk(FILTER_CONFIGS.culturalHeritage.options as readonly HeritageOption[]);
  return out;
};
