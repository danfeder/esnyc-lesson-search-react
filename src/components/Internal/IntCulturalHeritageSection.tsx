import { FILTER_CONFIGS } from '@/utils/filterDefinitions';
import { useSearchStore } from '@/stores/searchStore';
import type { FacetCounts } from '@/utils/facetCounts';
import type { HeritageOption } from '@/utils/heritageHierarchy.generated';
import { cn } from '@/utils/cn';
import { IntFilterSection } from './IntFilterSection';

interface IntCulturalHeritageSectionProps {
  counts: FacetCounts;
}

/** Per-tier indent step (px). Depth 1 keeps the legacy 20px child indent. */
const INDENT_STEP = 20;

/**
 * Renders the cultural-heritage option tree recursively to whatever depth the
 * generated data has (e.g. Americas › Latin American › Mexican, or Asian › East
 * Asian › Chinese). Each node — at any depth — keeps its own checkbox; toggling
 * it calls `toggleFilter` with the node's kebab `value` verbatim. The client
 * sends slugs as-is; parent checkboxes do NOT auto-check descendants (recursive
 * expansion happens server-side). Facet counts are rendered per node, sourced
 * the same way as before.
 *
 * Hierarchy is generated from vocab.json (see heritageHierarchy.generated.ts);
 * filters are stakeholder-sensitive (see src/utils/CLAUDE.md).
 */
export function IntCulturalHeritageSection({ counts }: IntCulturalHeritageSectionProps) {
  const selected = useSearchStore((s) => s.filters.culturalHeritage);
  const toggleFilter = useSearchStore((s) => s.toggleFilter);
  const cfg = FILTER_CONFIGS.culturalHeritage;

  const activeCount = selected.length;
  const countFor = (value: string) => counts.culturalHeritage[value] ?? 0;

  const renderNode = (node: HeritageOption, depth: number) => (
    <div key={node.value}>
      <label
        className={cn('int-check', depth > 0 && 'int-check--child')}
        style={depth > 0 ? { paddingLeft: depth * INDENT_STEP } : undefined}
      >
        <input
          type="checkbox"
          checked={selected.includes(node.value)}
          onChange={() => toggleFilter('culturalHeritage', node.value)}
        />
        <span className="int-check-box" />
        <span className="int-check-label">{node.label}</span>
        <span className="int-check-count">{countFor(node.value) || ''}</span>
      </label>
      {node.children?.map((child) => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <IntFilterSection label={cfg.label} count={activeCount}>
      {(cfg.options as HeritageOption[]).map((node) => renderNode(node, 0))}
    </IntFilterSection>
  );
}
