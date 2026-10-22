/**
 * Utility functions for filter-related operations
 */
import { ALL_FIELD_CONFIGS, FILTER_CONFIGS } from '@/utils/filterDefinitions';
import type { HeritageOption } from '@/utils/heritageHierarchy.generated';
import { aliasToSlug, ancestorsBySlug } from '@/utils/heritageAncestry.generated';
import { INGREDIENT_PARENT_MAP } from '@/types/lessonMetadata.zod';

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

/**
 * Collapse a lesson's stored main-ingredient tags to their most specific
 * leaves — drop a GROUP (e.g. "Beans & legumes") when one of its specifics
 * (e.g. "Black beans") is also tagged on the same lesson. The ingredient
 * vocabulary is a two-tier group → specific tree (`INGREDIENT_PARENT_MAP`,
 * specific → parent group | null), and reviewers store both tiers, so a row
 * label that showed the first few stored values would spend a slot on a
 * redundant group word. Same idea as `collapseHeritageToLeaves`.
 *
 * Display-only (stored data is unchanged). A group with no tagged specific
 * survives (e.g. "Nightshades" when no "Tomatoes" is tagged), a group-only
 * array passes through intact, duplicates are dropped (first occurrence wins)
 * and stored order is preserved.
 */
export const collapseIngredientsToLeaves = (values: readonly string[]): string[] => {
  // Every group that is the parent of some specific on this lesson.
  const redundantGroups = new Set<string>();
  for (const value of values) {
    const parent = INGREDIENT_PARENT_MAP[value];
    if (parent) redundantGroups.add(parent);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (redundantGroups.has(value)) continue; // a group whose specific is also tagged — drop
    if (seen.has(value)) continue; // duplicate of a kept value — drop
    seen.add(value);
    out.push(value);
  }
  return out;
};
