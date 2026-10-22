import type { KeyboardEvent } from 'react';
import type { Lesson } from '@/types';
import { FILTER_CONFIGS } from '@/utils/filterDefinitions';
import {
  buildCultureLabelMap,
  collapseHeritageToLeaves,
  collapseIngredientsToLeaves,
} from '@/utils/filterUtils';
import { cn } from '@/utils/cn';

// Prefixed with `act-` so no modifier can collide with a Tailwind utility
// (a bare `grow` matched Tailwind's built-in `.grow { flex-grow: 1 }`, which
// stretched the Grow badge and shoved the row's other meta labels to the edge).
type ActivityClass = 'act-cook' | 'act-grow' | 'act-both' | 'act-craft' | 'act-academic';

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
    if (hasCook && hasGrow) return { label: 'Cook + Grow', className: 'act-both' };
    if (hasCook) return { label: 'Cook', className: 'act-cook' };
    if (hasGrow) return { label: 'Grow', className: 'act-grow' };
    if (hasCraft) return { label: 'Craft', className: 'act-craft' };
    if (hasAcademic) return { label: 'Academic', className: 'act-academic' };
    // Only unrecognized nouns — fall through to the skills-based fallback below.
  }

  // Fallback (activity_type empty/unrecognized): the legacy skills heuristic.
  const hasC = (lesson.metadata.cookingSkills?.length ?? 0) > 0;
  const hasG = (lesson.metadata.gardenSkills?.length ?? 0) > 0;
  if (hasC && hasG) return { label: 'Cook + Grow', className: 'act-both' };
  if (hasC) return { label: 'Cook', className: 'act-cook' };
  if (hasG) return { label: 'Grow', className: 'act-grow' };
  return { label: 'Academic', className: 'act-academic' };
}

// Canonical grade order, single-sourced from the gradeLevels filter config
// (3K, PK, K, 1…8) so an added/renamed grade there flows here automatically.
// Unknown values sort to the end, preserving their relative input order.
const GRADE_ORDER = FILTER_CONFIGS.gradeLevels.options.map((o) => o.value);
const gradeRank = (g: string): number => {
  const i = GRADE_ORDER.indexOf(g);
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

// Canonical season order, single-sourced from the seasonTiming filter config
// (Fall, Winter, Spring, Summer). Unknown values sort to the end, preserving
// their relative input order — same policy as GRADE_ORDER.
const SEASON_ORDER = FILTER_CONFIGS.seasonTiming.options.map((o) => o.value);
const seasonRank = (s: string): number => {
  const i = SEASON_ORDER.indexOf(s);
  return i === -1 ? SEASON_ORDER.length : i;
};

/** Cap on every list segment of the row/card meta line (ingredients, garden skills, subjects, heritage). */
export const ROW_LABEL_MAX = 3;

/**
 * The Seasons segment of the meta line. Every tagged season, de-duplicated
 * and sorted into vocab order (stored `[Spring, Fall]` reads "Fall, Spring");
 * when every season in the vocab is present the whole list collapses to the
 * single display word "Year-round" (derived from the data exactly as "K–5" is
 * derived from six stored grades — it is not a filter value). Empty →
 * undefined so the caller omits the segment and its dot.
 */
export function intSeasonLabel(seasons: readonly string[] | undefined): string | undefined {
  if (!seasons || seasons.length === 0) return undefined;
  const sorted = [...new Set(seasons)].sort((a, b) => seasonRank(a) - seasonRank(b));
  if (SEASON_ORDER.every((s) => sorted.includes(s))) return 'Year-round';
  return sorted.join(', ');
}

/**
 * The meta line shown after the activity badge on list rows AND card footers
 * (one rule, two renderers). Segments, in order, each omitted when empty:
 *
 *  1. Seasons — every tagged season in vocab order; all four → "Year-round"
 *     (`intSeasonLabel`).
 *  2. What — the first non-empty of `mainIngredients` (leaf-collapsed via
 *     `collapseIngredientsToLeaves`, so a group word never spends a slot when
 *     its specific is also tagged) → `gardenSkills` → `academicIntegration`.
 *     Data presence, not the badge, picks the list: a Grow lesson that carries
 *     ingredients shows them; a Cook lesson with none shows its subjects.
 *     First ROW_LABEL_MAX values in stored order, comma-joined.
 *  3. Heritage — exactly the drawer's FP-16 leaf collapse
 *     (`collapseHeritageToLeaves`), label-mapped, first ROW_LABEL_MAX values
 *     comma-joined. The cap counts leaves, so a broad ancestor never displaces
 *     a leaf (collapse happens before the cap).
 *
 * Theme is deliberately NOT on the line (it stays in the drawer and the
 * sidebar filter): a closed 7-word taxonomy where one word lands on a third
 * of all rows is not a scan fact. Nothing else is added (no Location, cooking
 * methods, observances, competencies or SEL) and there is no "+N" overflow
 * marker — the drawer holds the full lists.
 */
export function intMetaSegments(lesson: Lesson): string[] {
  const meta = lesson.metadata;
  const segments: string[] = [];

  const seasons = intSeasonLabel(meta.seasonTiming);
  if (seasons) segments.push(seasons);

  const ingredients = collapseIngredientsToLeaves(meta.mainIngredients ?? []);
  const gardenSkills = meta.gardenSkills ?? [];
  // `academicIntegration` may be a string[] or `{ selected: string[] }`
  // (`normalizeMetadata` flattens it at the hook boundary, but a factory-built
  // lesson may still carry the object form).
  const academic = meta.academicIntegration;
  const subjects = Array.isArray(academic) ? academic : (academic?.selected ?? []);
  const what =
    ingredients.length > 0 ? ingredients : gardenSkills.length > 0 ? gardenSkills : subjects;
  if (what.length > 0) segments.push(what.slice(0, ROW_LABEL_MAX).join(', '));

  const heritage = collapseHeritageToLeaves(meta.culturalHeritage ?? [])
    .slice(0, ROW_LABEL_MAX)
    .map(culturalLabel);
  if (heritage.length > 0) segments.push(heritage.join(', '));

  // Theme add-back (owner decision, OFF by default): to restore the theme as a
  // 4th segment capped at one value, insert exactly this before `return`:
  //   const themes = meta.thematicCategories ?? [];
  //   if (themes.length > 0) segments.push(themes[0]);

  return segments;
}

interface IntListRowProps {
  lesson: Lesson;
  selected: boolean;

  onClick: (lesson: Lesson) => void;
}

export function IntListRow({ lesson, selected, onClick }: IntListRowProps) {
  const activity = intActivityLabel(lesson);
  const segments = intMetaSegments(lesson);

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
          {segments.map((segment, i) => (
            // One flex item per segment, dot INSIDE it, so a wrapped segment carries its
            // dot to the new line instead of leaving it dangling at the end of the old one.
            // Index keys: segment strings are distinct in practice but nothing guarantees it.
            <span key={i}>
              <span className="dot">·</span>
              <span>{segment}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="int-row-right">
        <span className="int-row-open">Open</span>
      </div>
    </div>
  );
}
