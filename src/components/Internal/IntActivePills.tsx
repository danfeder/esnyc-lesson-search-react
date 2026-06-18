import { useMemo, useCallback } from 'react';
import { FILTER_CONFIGS } from '@/utils/filterDefinitions';
import { buildCultureLabelMap } from '@/utils/filterUtils';
import { parseSearchQuery } from '@/utils/parseSearchQuery';
import { useSearchStore } from '@/stores/searchStore';
import type { SearchFilters } from '@/types';

type FilterKey = keyof SearchFilters;

interface ActivePill {
  key: FilterKey;
  value: string;
  label: string;
}

// Recursive value → label lookup across the full cultural-heritage tree
// (every tier, not just direct children).
const CULTURE_LABELS = buildCultureLabelMap();

function labelFor(key: FilterKey, value: string): string {
  if (key === 'gradeLevels') return `Grade ${value}`;
  if (key === 'culturalHeritage') return CULTURE_LABELS[value] ?? value;
  if (!(key in FILTER_CONFIGS)) return value;
  const cfg = FILTER_CONFIGS[key as keyof typeof FILTER_CONFIGS];
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

  // Mirrors useLessonSearch's effectiveGradeLevels explicit-wins guard — both
  // call the same pure parseSearchQuery, so the routing logic cannot diverge.
  // Intentional duplication (avoids a hook return-shape change); keep the two
  // guards in sync. An explicit user grade filter wins, suppressing the
  // auto-detected grades so the chip never claims a grade the search didn't apply.
  const { cleanedQuery, detectedGrades } = useMemo(
    () => parseSearchQuery(filters.query ?? ''),
    [filters.query]
  );
  const hasExplicitGrade = (filters.gradeLevels?.length ?? 0) > 0;
  const autoGrades = hasExplicitGrade ? [] : detectedGrades;

  // Dismissing the auto chip rewrites the box to the cleaned term, which routes
  // no grade on the next parse — broadening to all grades and removing the chip.
  // Declared before the early return so hook order stays stable across renders.
  const dismissAutoGrade = useCallback(
    () => setFilters({ query: cleanedQuery }),
    [setFilters, cleanedQuery]
  );

  if (pills.length === 0 && autoGrades.length === 0) return null;

  const remove = (pill: ActivePill) => {
    if (pill.key === 'query') {
      setFilters({ query: '' });
    } else if (Array.isArray(filters[pill.key])) {
      removeFilter(pill.key, pill.value);
    } else {
      setFilters({ [pill.key]: '' } as Partial<SearchFilters>);
    }
  };

  const autoGradeLabel =
    autoGrades.length === 1
      ? `Grade ${autoGrades[0]} · auto`
      : `Grades ${autoGrades.join(', ')} · auto`;

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
      {autoGrades.length > 0 && (
        <span data-testid="auto-grade-chip" className="int-pill">
          {autoGradeLabel}
          <button
            type="button"
            onClick={dismissAutoGrade}
            aria-label="Remove auto-applied grade filter and search all grades"
          >
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
      )}
    </div>
  );
}
