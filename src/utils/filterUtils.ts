/**
 * Utility functions for filter-related operations
 */
import { ALL_FIELD_CONFIGS, FILTER_CONFIGS } from '@/utils/filterDefinitions';
import type { HeritageOption } from '@/utils/heritageHierarchy.generated';
import { aliasToSlug, ancestorsBySlug } from '@/utils/heritageAncestry.generated';

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

/**
 * FP-16: a `stored value → display label` mapper for a single filter/metadata
 * field, built from that field's config `options` (recursing into `children`
 * for hierarchical configs). Values with no matching option pass through
 * verbatim, so display never hides data.
 *
 * The primary user is the lesson drawer, where kebab-stored fields (notably
 * Cooking Methods: `basic-prep` → "Basic prep") would otherwise render raw. A
 * field whose stored values already equal their labels (Title-Case vocab) maps
 * to itself — harmless, and it self-heals if a value ever drifts kebab.
 */
export const fieldValueLabeler = (
  configKey: keyof typeof ALL_FIELD_CONFIGS
): ((value: string) => string) => {
  const cfg = ALL_FIELD_CONFIGS[configKey];
  const map: Record<string, string> = {};
  const walk = (nodes: readonly HeritageOption[]) => {
    for (const node of nodes) {
      map[node.value] = node.label;
      if (node.children) walk(node.children);
    }
  };
  if (cfg) walk(cfg.options as readonly HeritageOption[]);
  return (value: string) => map[value] ?? value;
};

/**
 * FP-16: collapse a lesson's stored cultural-heritage tags to their most
 * specific leaves — drop any tag that is a broader ANCESTOR of another tag on
 * the same lesson. Owner saw a 3-deep "Asian, East Asian, Chinese"; this shows
 * only "Chinese".
 *
 * Display-only (stored data is unchanged). Stored values may be Title-Case
 * labels OR slugs; both normalize through `aliasToSlug` before the ancestor
 * check. Duplicate values that normalize to the same slug are de-duplicated
 * (first occurrence wins); the original stored strings are returned (order
 * preserved) so downstream `culturalLabel` formatting still applies.
 */
export const collapseHeritageToLeaves = (values: readonly string[]): string[] => {
  const slugs = values.map((v) => aliasToSlug[v] ?? v);
  // Every slug that appears as a PROPER ancestor of some tag on this lesson.
  const ancestorSet = new Set<string>();
  for (const slug of slugs) {
    const chain = ancestorsBySlug[slug];
    if (chain) {
      for (const ancestor of chain.slice(1)) ancestorSet.add(ancestor);
    }
  }
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((value, i) => {
    const slug = slugs[i];
    if (ancestorSet.has(slug)) return; // a broader ancestor of another leaf — drop
    if (seen.has(slug)) return; // duplicate of a kept leaf — drop
    seen.add(slug);
    out.push(value);
  });
  return out;
};
