import { FILTER_CONFIGS } from '@/utils/filterDefinitions';
import { useSearchStore } from '@/stores/searchStore';
import type { FacetCounts } from '@/utils/facetCounts';
import { cn } from '@/utils/cn';
import { IntFilterSection } from './IntFilterSection';

interface IntMainIngredientsSectionProps {
  /**
   * TRUE corpus-wide badge counts (FP-01b). `undefined` while the corpus fetch
   * is in flight (or failed) — badges render blank; once loaded, a real zero
   * renders as `0` (D-4).
   */
  counts?: FacetCounts;
}

/** Per-tier indent step (px), matching the heritage section's child indent. */
const INDENT_STEP = 20;

/** Minimal structural shape of a Main Ingredients tree node (≤2 deep). */
interface IngredientNode {
  value: string;
  label: string;
  children?: IngredientNode[];
}

/**
 * Main Ingredients facet — sidebar slot #3 (right after Activity Type),
 * collapsed by default. Renders the group→specific tree (24 groups + 46
 * specifics) like Cultural Heritage, BUT with DIRECT-MATCH semantics — NOT
 * parent→children expansion.
 *
 * Checking a group (e.g. "Beans & legumes") matches lessons tagged with that
 * group VERBATIM: the data guarantees a specific's parent group rides along in
 * the same `main_ingredients` array (enforced on save by
 * `refineMainIngredientParents`, `lessonMetadata.zod.ts`; legacy rows healed by
 * the Brief 5 data fix), so no client- or server-side child expansion is needed
 * or wanted. Parent checkboxes therefore do NOT auto-check descendants; the RPC
 * (`l.main_ingredients && filter_main_ingredients`) and the facet predicate
 * (`overlaps`) match the selected value as-is. Do not add expansion here.
 *
 * Filters are stakeholder-sensitive (see src/utils/CLAUDE.md).
 */
export function IntMainIngredientsSection({ counts }: IntMainIngredientsSectionProps) {
  const selected = useSearchStore((s) => s.filters.mainIngredients);
  const toggleFilter = useSearchStore((s) => s.toggleFilter);
  const cfg = FILTER_CONFIGS.mainIngredients;

  const activeCount = selected.length;

  const renderNode = (node: IngredientNode, depth: number) => {
    const checked = selected.includes(node.value);
    // D-4: blank only while counts are loading/errored; a loaded zero renders 0.
    const count = counts ? (counts.mainIngredients[node.value] ?? 0) : undefined;
    // D-A: dim a loaded zero row (stays clickable); never a checked one.
    const dimmed = count === 0 && !checked;
    return (
      <div key={node.value}>
        <label
          className={cn('int-check', depth > 0 && 'int-check--child', dimmed && 'int-check--dim')}
          style={depth > 0 ? { paddingLeft: depth * INDENT_STEP } : undefined}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggleFilter('mainIngredients', node.value)}
          />
          <span className="int-check-box" />
          <span className="int-check-label">{node.label}</span>
          <span className="int-check-count">{count === undefined ? '' : count}</span>
        </label>
        {node.children?.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <IntFilterSection label={cfg.label} count={activeCount}>
      {(cfg.options as IngredientNode[]).map((node) => renderNode(node, 0))}
    </IntFilterSection>
  );
}
