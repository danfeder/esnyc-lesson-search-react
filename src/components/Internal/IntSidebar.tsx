import { FILTER_CONFIGS } from '@/utils/filterDefinitions';
import { useSearchStore } from '@/stores/searchStore';
import type { FacetCounts, FacetFilterKey } from '@/utils/facetCounts';
import type { SearchFilters } from '@/types';
import { cn } from '@/utils/cn';
import { IntFilterSection } from './IntFilterSection';
import { IntCulturalHeritageSection } from './IntCulturalHeritageSection';

/**
 * Filter categories rendered as a simple checkbox list, in order.
 * `gradeLevels` and `culturalHeritage` get bespoke sections.
 */
const CHECKBOX_KEYS: readonly FacetFilterKey[] = [
  'activityType',
  'location',
  'thematicCategories',
  'seasonTiming',
  'coreCompetencies',
  'academicIntegration',
  'socialEmotionalLearning',
  'cookingMethods',
] as const;

interface IntSidebarProps {
  /**
   * TRUE corpus-wide badge counts (FP-01b). `undefined` while the corpus
   * fetch is in flight (or failed) — badges render blank in that window; once
   * loaded, a real zero renders as `0` (D-4).
   */
  counts?: FacetCounts;
}

export function IntSidebar({ counts }: IntSidebarProps) {
  const filters = useSearchStore((s) => s.filters);
  const toggleFilter = useSearchStore((s) => s.toggleFilter);
  // D-E: "Clear all" clears facet selections only — the typed search query and
  // the sort choice survive (NOT the full-reset clearFilters).
  const clearFilterSelections = useSearchStore((s) => s.clearFilterSelections);

  const activeCountFor = (key: keyof SearchFilters): number => {
    const v = filters[key];
    // Every facet filter is a string[]; only `query` is a string, and the sole
    // caller (totalActive) already excludes it — so an array length is the only
    // reachable count.
    return Array.isArray(v) ? v.length : 0;
  };

  const totalActive = (Object.keys(filters) as Array<keyof SearchFilters>)
    .filter((k) => k !== 'query')
    .reduce((sum, k) => sum + activeCountFor(k), 0);

  const gradeCfg = FILTER_CONFIGS.gradeLevels;
  const gradeOptions = gradeCfg.options.map((o) => o.value);

  return (
    <aside className="int-sidebar" aria-label="Filters">
      <div className="int-sidebar-head">
        <h2>Filters</h2>
        {totalActive > 0 && (
          <button type="button" className="int-sidebar-clear" onClick={clearFilterSelections}>
            Clear all
          </button>
        )}
      </div>

      <IntFilterSection label="Grade Level" count={filters.gradeLevels.length} defaultOpen>
        <div className="int-grades">
          {gradeOptions.map((grade) => {
            const active = filters.gradeLevels.includes(grade);
            // undefined while the corpus loads (badges blank, no dimming);
            // a number once loaded. D-A: dim a loaded zero — never an active pill.
            const count = counts ? (counts.gradeLevels[grade] ?? 0) : undefined;
            const dimmed = count === 0 && !active;
            return (
              <button
                key={grade}
                type="button"
                className={cn(
                  'int-grade-pill',
                  active && 'active',
                  dimmed && 'int-grade-pill--dim'
                )}
                onClick={() => toggleFilter('gradeLevels', grade)}
                aria-pressed={active}
              >
                {grade}
                {/* Inside this guard counts is loaded, so count is a number (incl. 0). */}
                {counts && <span className="int-grade-pill-count">{count}</span>}
              </button>
            );
          })}
        </div>
      </IntFilterSection>

      {CHECKBOX_KEYS.map((key) => {
        const cfg = FILTER_CONFIGS[key];
        if (!cfg) return null;
        const selected = (filters[key] ?? []) as string[];
        const defaultOpen = key === 'activityType' || key === 'seasonTiming';
        return (
          <IntFilterSection
            key={key}
            label={cfg.label}
            count={selected.length}
            defaultOpen={defaultOpen}
          >
            {cfg.options.map((opt) => {
              const checked = selected.includes(opt.value);
              // undefined while loading (blank badge, no dim); a number once loaded.
              const count = counts ? (counts[key][opt.value] ?? 0) : undefined;
              // D-A: dim a loaded zero row (stays clickable); never a checked one.
              const dimmed = count === 0 && !checked;
              return (
                <label key={opt.value} className={cn('int-check', dimmed && 'int-check--dim')}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFilter(key, opt.value)}
                  />
                  <span className="int-check-box" />
                  <span className="int-check-label">{opt.label}</span>
                  {/* D-4: blank only while counts are loading/errored; a real
                      zero is information ("none within your other filters"). */}
                  <span className="int-check-count">{count === undefined ? '' : count}</span>
                </label>
              );
            })}
          </IntFilterSection>
        );
      })}

      <IntCulturalHeritageSection counts={counts} />

      {/* D-A: quiet explainer for what the badge numbers mean. */}
      <p className="int-sidebar-hint">Numbers show how many lessons carry each tag.</p>
    </aside>
  );
}
