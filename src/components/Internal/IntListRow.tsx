import type { KeyboardEvent } from 'react';
import type { Lesson } from '@/types';
import { buildCultureLabelMap } from '@/utils/filterUtils';
import { cn } from '@/utils/cn';

type ActivityClass = 'cook' | 'grow' | 'both' | 'craft' | 'academic';

interface ActivityLabel {
  label: string;
  className: ActivityClass;
}

// FP-17: the card/row badge derives from the `activity_type` field (the same
// field the Activity Type filter uses — bare nouns cooking/garden/academic/craft),
// falling back to the legacy skills heuristic only when activity_type is empty
// or carries no recognized noun. This closes the "Craft activity → no badge / a
// wrong Academic badge" gap: a craft lesson with no cooking/garden skills now
// reads "Craft" instead of falling through to "Academic".
export function intActivityLabel(lesson: Lesson): ActivityLabel {
  const types = lesson.metadata.activityType ?? [];
  if (types.length > 0) {
    const hasCook = types.includes('cooking');
    const hasGrow = types.includes('garden');
    const hasCraft = types.includes('craft');
    const hasAcademic = types.includes('academic');
    if (hasCook && hasGrow) return { label: 'Cook + Grow', className: 'both' };
    if (hasCook) return { label: 'Cook', className: 'cook' };
    if (hasGrow) return { label: 'Grow', className: 'grow' };
    if (hasCraft) return { label: 'Craft', className: 'craft' };
    if (hasAcademic) return { label: 'Academic', className: 'academic' };
    // Only unrecognized nouns — fall through to the skills-based fallback below.
  }

  // Fallback (activity_type empty/unrecognized): the legacy skills heuristic.
  const hasC = (lesson.metadata.cookingSkills?.length ?? 0) > 0;
  const hasG = (lesson.metadata.gardenSkills?.length ?? 0) > 0;
  if (hasC && hasG) return { label: 'Cook + Grow', className: 'both' };
  if (hasC) return { label: 'Cook', className: 'cook' };
  if (hasG) return { label: 'Grow', className: 'grow' };
  return { label: 'Academic', className: 'academic' };
}

// Canonical grade order (matches filterDefinitions.gradeLevels option order).
// Unknown values sort to the end, preserving their relative input order.
const GRADE_ORDER = ['3K', 'PK', 'K', '1', '2', '3', '4', '5', '6', '7', '8'] as const;
const gradeRank = (g: string): number => {
  const i = (GRADE_ORDER as readonly string[]).indexOf(g);
  return i === -1 ? GRADE_ORDER.length : i;
};

/**
 * Sort a grade array into canonical order (3K, PK, K, 1…8) and de-duplicate —
 * grades are a set, and stored arrays can arrive in reviewer/import order, so
 * display surfaces must not assume sorted (or unique). Dedup also keeps the
 * contiguity check honest (a repeated grade can't mask a gap).
 */
export function sortGradeLevels(grades: readonly string[]): string[] {
  return [...new Set(grades)].sort((a, b) => gradeRank(a) - gradeRank(b));
}

/**
 * A compact grades label. Sorts through canonical order first (so "Sunprints",
 * stored {1,2,3,K}, reads "K–3" not the backwards "1–K"). A run of >2 grades
 * renders as a first–last range ONLY when it is contiguous in canonical order;
 * a set with gaps (e.g. K, 4, 8) renders as a comma list so the dash never
 * implies grades the lesson doesn't cover.
 */
export function intGradesLabel(grades: string[] | undefined): string {
  if (!grades || grades.length === 0) return '—';
  const sorted = sortGradeLevels(grades);
  if (sorted.length <= 2) return sorted.join(', ');
  const first = gradeRank(sorted[0]);
  const last = gradeRank(sorted[sorted.length - 1]);
  // Contiguous iff the run exactly spans first..last with no gaps or unknowns.
  const contiguous = last < GRADE_ORDER.length && last - first + 1 === sorted.length;
  return contiguous ? `${sorted[0]}–${sorted[sorted.length - 1]}` : sorted.join(', ');
}

// Recursive value → label lookup across the full cultural-heritage tree
// (every tier, not just direct children).
const CULTURE_LABELS = buildCultureLabelMap();

export function culturalLabel(value: string): string {
  return CULTURE_LABELS[value] ?? value;
}

interface IntListRowProps {
  lesson: Lesson;
  selected: boolean;

  onClick: (lesson: Lesson) => void;
}

export function IntListRow({ lesson, selected, onClick }: IntListRowProps) {
  const activity = intActivityLabel(lesson);
  const meta = lesson.metadata;
  const season = meta.seasonTiming?.[0];
  const theme = meta.thematicCategories?.[0];
  const heritage = meta.culturalHeritage?.[0];

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(lesson);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn('int-list-row', selected && 'selected')}
      onClick={() => onClick(lesson)}
      onKeyDown={handleKeyDown}
    >
      <div className="int-row-grades">{intGradesLabel(lesson.gradeLevels)}</div>
      <div className="int-row-main">
        <h3 className="int-row-title">{lesson.title}</h3>
        <p className="int-row-summary">{lesson.summary}</p>
        <div className="int-row-meta">
          <span className={`activity ${activity.className}`}>{activity.label}</span>
          {season && (
            <>
              <span className="dot">·</span>
              <span>{season}</span>
            </>
          )}
          {theme && (
            <>
              <span className="dot">·</span>
              <span>{theme}</span>
            </>
          )}
          {heritage && (
            <>
              <span className="dot">·</span>
              <span>{culturalLabel(heritage)}</span>
            </>
          )}
        </div>
      </div>
      <div className="int-row-right">
        <span className="int-row-open">Open</span>
      </div>
    </div>
  );
}
