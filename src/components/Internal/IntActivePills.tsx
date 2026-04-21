import { FILTER_CONFIGS } from '@/utils/filterDefinitions';
import { useSearchStore } from '@/stores/searchStore';
import type { SearchFilters } from '@/types';

type FilterKey = keyof SearchFilters;

interface ActivePill {
  key: FilterKey;
  value: string;
  label: string;
}

// Flat lookup of value → label across every hierarchical cultural-heritage
// option (parent + children).
function buildCultureLabelMap(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const opt of FILTER_CONFIGS.culturalHeritage.options) {
    out[opt.value] = opt.label;
    for (const child of opt.children ?? []) {
      out[child.value] = child.label;
    }
  }
  return out;
}

const CULTURE_LABELS = buildCultureLabelMap();

function labelFor(key: FilterKey, value: string): string {
  if (key === 'gradeLevels') return `Grade ${value}`;
  if (key === 'culturalHeritage') return CULTURE_LABELS[value] ?? value;
  const cfg = FILTER_CONFIGS[key as string];
  if (!cfg) return value;
  const match = cfg.options.find((o) => o.value === value);
  return match?.label ?? value;
}

function collectPills(filters: SearchFilters): ActivePill[] {
  const pills: ActivePill[] = [];
  if (filters.query) {
    pills.push({ key: 'query', value: filters.query, label: `"${filters.query}"` });
  }
  (Object.keys(filters) as FilterKey[]).forEach((key) => {
    if (key === 'query') return;
    const value = filters[key];
    if (Array.isArray(value)) {
      for (const v of value) pills.push({ key, value: v, label: labelFor(key, v) });
    } else if (typeof value === 'string' && value) {
      pills.push({ key, value, label: labelFor(key, value) });
    }
  });
  return pills;
}

export function IntActivePills() {
  const filters = useSearchStore((s) => s.filters);
  const setFilters = useSearchStore((s) => s.setFilters);
  const removeFilter = useSearchStore((s) => s.removeFilter);

  const pills = collectPills(filters);
  if (pills.length === 0) return null;

  const remove = (pill: ActivePill) => {
    if (pill.key === 'query') {
      setFilters({ query: '' });
    } else if (Array.isArray(filters[pill.key])) {
      removeFilter(pill.key, pill.value);
    } else {
      setFilters({ [pill.key]: '' } as Partial<SearchFilters>);
    }
  };

  return (
    <div className="int-pills">
      {pills.map((pill) => (
        <span key={`${pill.key}:${pill.value}`} className="int-pill">
          {pill.label}
          <button type="button" onClick={() => remove(pill)} aria-label={`Remove ${pill.label}`}>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </span>
      ))}
    </div>
  );
}
