import { FILTER_CONFIGS } from '@/utils/filterDefinitions';
import { useSearchStore } from '@/stores/searchStore';
import type { FacetCounts } from '@/utils/facetCounts';
import { IntFilterSection } from './IntFilterSection';

interface IntCulturalHeritageSectionProps {
  counts: FacetCounts;
}

/**
 * Preserves the app's existing hierarchy (5 regions → subregions) rather than
 * flattening to the 8-option list the prototype showed. Filters are
 * stakeholder-sensitive (see src/utils/CLAUDE.md).
 */
export function IntCulturalHeritageSection({ counts }: IntCulturalHeritageSectionProps) {
  const selected = useSearchStore((s) => s.filters.culturalHeritage);
  const toggleFilter = useSearchStore((s) => s.toggleFilter);
  const cfg = FILTER_CONFIGS.culturalHeritage;

  const activeCount = selected.length;
  const countFor = (value: string) => counts.culturalHeritage[value] ?? 0;

  return (
    <IntFilterSection label={cfg.label} count={activeCount}>
      {cfg.options.map((region) => (
        <div key={region.value}>
          <label className="int-check">
            <input
              type="checkbox"
              checked={selected.includes(region.value)}
              onChange={() => toggleFilter('culturalHeritage', region.value)}
            />
            <span className="int-check-box" />
            <span className="int-check-label">{region.label}</span>
            <span className="int-check-count">{countFor(region.value) || ''}</span>
          </label>
          {(region.children ?? []).map((child) => (
            <label key={child.value} className="int-check int-check--child">
              <input
                type="checkbox"
                checked={selected.includes(child.value)}
                onChange={() => toggleFilter('culturalHeritage', child.value)}
              />
              <span className="int-check-box" />
              <span className="int-check-label">{child.label}</span>
              <span className="int-check-count">{countFor(child.value) || ''}</span>
            </label>
          ))}
        </div>
      ))}
    </IntFilterSection>
  );
}
