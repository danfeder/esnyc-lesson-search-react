import { FILTER_CONFIGS } from '@/utils/filterDefinitions';
import { useSearchStore } from '@/stores/searchStore';
import type { FacetCounts, FacetFilterKey } from '@/utils/facetCounts';
import type { SearchFilters } from '@/types';
import { cn } from '@/utils/cn';
import { IntFilterSection } from './IntFilterSection';
import { IntCulturalHeritageSection } from './IntCulturalHeritageSection';

/**
 * Filter categories rendered as a simple checkbox list, in order.
 * `gradeLevels` and `culturalHeritage` get bespoke sections; `lessonFormat`
 * is handled as a radio-style checklist because the store stores a single
 * string, not an array.
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
  counts: FacetCounts;
}

export function IntSidebar({ counts }: IntSidebarProps) {
  const filters = useSearchStore((s) => s.filters);
  const toggleFilter = useSearchStore((s) => s.toggleFilter);
  const setFilters = useSearchStore((s) => s.setFilters);
  const clearFilters = useSearchStore((s) => s.clearFilters);

  const activeCountFor = (key: keyof SearchFilters): number => {
    const v = filters[key];
    if (Array.isArray(v)) return v.length;
    if (typeof v === 'string') return v && key !== 'query' ? 1 : 0;
    return 0;
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
          <button type="button" className="int-sidebar-clear" onClick={clearFilters}>
            Clear all
          </button>
        )}
      </div>

      <IntFilterSection label="Grade Level" count={filters.gradeLevels.length} defaultOpen>
        <div className="int-grades">
          {gradeOptions.map((grade) => {
            const active = filters.gradeLevels.includes(grade);
            return (
              <button
                key={grade}
                type="button"
                className={cn('int-grade-pill', active && 'active')}
                onClick={() => toggleFilter('gradeLevels', grade)}
                aria-pressed={active}
              >
                {grade}
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
              const count = counts[key][opt.value] ?? 0;
              return (
                <label key={opt.value} className="int-check">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFilter(key, opt.value)}
                  />
                  <span className="int-check-box" />
                  <span className="int-check-label">{opt.label}</span>
                  <span className="int-check-count">{count || ''}</span>
                </label>
              );
            })}
          </IntFilterSection>
        );
      })}

      <IntCulturalHeritageSection counts={counts} />

      {FILTER_CONFIGS.lessonFormat && (
        <IntFilterSection
          label={FILTER_CONFIGS.lessonFormat.label}
          count={filters.lessonFormat ? 1 : 0}
        >
          {FILTER_CONFIGS.lessonFormat.options.map((opt) => {
            const checked = filters.lessonFormat === opt.value;
            const count = counts.lessonFormat[opt.value] ?? 0;
            return (
              <label key={opt.value} className="int-check">
                <input
                  type="radio"
                  name="lessonFormat"
                  checked={checked}
                  onChange={() => setFilters({ lessonFormat: checked ? '' : opt.value })}
                />
                <span className="int-check-box" />
                <span className="int-check-label">{opt.label}</span>
                <span className="int-check-count">{count || ''}</span>
              </label>
            );
          })}
        </IntFilterSection>
      )}
    </aside>
  );
}
