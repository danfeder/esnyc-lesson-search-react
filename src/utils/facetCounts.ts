import type { LessonMetadata, SearchFilters } from '@/types';
import { FILTER_CONFIGS } from '@/utils/filterDefinitions';
import { aliasToSlug, ancestorsBySlug } from '@/utils/heritageAncestry.generated';

/**
 * TRUE facet-count badges (FP-01b).
 *
 * Badge contract: for filter category C and rendered option v,
 *   badge(C, v) = number of non-retired lessons in the WHOLE library that
 *   match v under C's matching rules (the same rules the `search_lessons`
 *   RPC applies) AND match every OTHER active filter category.
 * C's own current selections do not restrict C's badges (standard faceted-
 * search semantics: within a category the UI is OR/multi-select, so a
 * sibling's badge is what selecting that value alone would contribute).
 *
 * The free-text search query is DELIBERATELY not part of the badge universe:
 * reproducing the query predicate client-side would mean reimplementing
 * synonym expansion, the C41 strict-AND/two-pass-relax decision
 * (20260629010000_c41_pr_d_two_pass_relax.sql:220-273) and the pg_trgm
 * title/summary fuzzy branch — guaranteed to drift. Badges therefore mean
 * "lessons in the library with this tag, given your other filter picks",
 * whether or not a query is typed. (A future query-aware upgrade would
 * intersect the corpus with a query-matched lesson_id set — no rework of
 * this design needed.)
 *
 * Every category predicate below carries a citation of its SQL twin in
 * `search_lessons` (currently 20260629010000_c41_pr_d_two_pass_relax.sql,
 * WHERE clauses :287-310). If a migration ever changes a filter predicate
 * (`_match_location`, `_alias_activity_type`, heritage expansion, …) or adds
 * a filter category, the matching branch of `matchesFacetSelection` must
 * change with it or badges will silently drift from click behavior.
 */

/**
 * Filter keys whose values appear as facets in the internal sidebar.
 * Must align with SearchFilters keys in src/types/index.ts.
 */
export type FacetFilterKey =
  | 'gradeLevels'
  | 'activityType'
  | 'location'
  | 'thematicCategories'
  | 'seasonTiming'
  | 'coreCompetencies'
  | 'culturalHeritage'
  | 'academicIntegration'
  | 'socialEmotionalLearning'
  | 'cookingMethods';

export type FacetCounts = Record<FacetFilterKey, Record<string, number>>;

/**
 * The slim per-lesson shape facet counting needs — the ten facet-relevant
 * fields, nothing else. `Lesson` is structurally assignable.
 */
export interface FacetLesson {
  gradeLevels: string[];
  metadata: Pick<
    LessonMetadata,
    | 'thematicCategories'
    | 'seasonTiming'
    | 'coreCompetencies'
    | 'culturalHeritage'
    | 'locationRequirements'
    | 'activityType'
    | 'academicIntegration'
    | 'socialEmotionalLearning'
    | 'cookingMethods'
  >;
}

/**
 * Activity Type is stored as bare nouns (`cooking`/`garden`/`academic`/`craft`)
 * while the UI option values are slugs (`cooking-only`/…). The server bridges
 * the two by expanding the FILTER side (each slug → {slug, noun}) via
 * `_alias_activity_type` (20260513000000_alias_activity_type_add_craft.sql:37-57);
 * the client predicate mirrors that expansion through this pair of maps.
 * Unknown values pass through verbatim on both sides (no `'both'` fan-out —
 * C69: a stray stored `'both'` matches no rendered option and is simply
 * uncounted, so no double-count can occur).
 */
const ACTIVITY_TYPE_SLUG_BY_NOUN: Record<string, string> = {
  cooking: 'cooking-only',
  garden: 'garden-only',
  academic: 'academic-only',
  craft: 'craft-only',
};

const ACTIVITY_TYPE_NOUN_BY_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(ACTIVITY_TYPE_SLUG_BY_NOUN).map(([noun, slug]) => [slug, noun])
);

const EMPTY_COUNTS = (): FacetCounts => ({
  gradeLevels: {},
  activityType: {},
  location: {},
  thematicCategories: {},
  seasonTiming: {},
  coreCompetencies: {},
  culturalHeritage: {},
  academicIntegration: {},
  socialEmotionalLearning: {},
  cookingMethods: {},
});

const KEYS: readonly FacetFilterKey[] = [
  'gradeLevels',
  'activityType',
  'location',
  'thematicCategories',
  'seasonTiming',
  'coreCompetencies',
  'culturalHeritage',
  'academicIntegration',
  'socialEmotionalLearning',
  'cookingMethods',
] as const;

/** Minimal structural shape of a filter option node (heritage nodes nest). */
interface OptionNode {
  value: string;
  children?: OptionNode[];
}

/** Flatten an option tree (depth-first) into its option values. */
function flattenOptionValues(nodes: OptionNode[]): string[] {
  const values: string[] = [];
  const walk = (list: OptionNode[]) => {
    for (const node of list) {
      values.push(node.value);
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return values;
}

/**
 * The RENDERED option values per category — the only keys badges are computed
 * for. Sourced read-only from FILTER_CONFIGS (filterDefinitions.ts is
 * stakeholder-gated; never edited from here). Heritage flattens the nested
 * tree (top + sub tiers; hidden `internal` vocab nodes are NOT rendered and
 * therefore get no badge — their lessons still roll up into rendered
 * ancestors via the expansion below). Consequence, intended: a stored value
 * no rendered option can express (a stray `'both'` activity noun, an unknown
 * heritage label) appears under no badge — nothing in the UI could display
 * it — and no fan-out/double-count can occur (preserves the C69 no-fan-out
 * invariant by construction).
 */
const OPTION_VALUES_BY_KEY: Record<FacetFilterKey, readonly string[]> = {
  gradeLevels: flattenOptionValues(FILTER_CONFIGS.gradeLevels.options),
  activityType: flattenOptionValues(FILTER_CONFIGS.activityType.options),
  location: flattenOptionValues(FILTER_CONFIGS.location.options),
  thematicCategories: flattenOptionValues(FILTER_CONFIGS.thematicCategories.options),
  seasonTiming: flattenOptionValues(FILTER_CONFIGS.seasonTiming.options),
  coreCompetencies: flattenOptionValues(FILTER_CONFIGS.coreCompetencies.options),
  culturalHeritage: flattenOptionValues(FILTER_CONFIGS.culturalHeritage.options),
  academicIntegration: flattenOptionValues(FILTER_CONFIGS.academicIntegration.options),
  socialEmotionalLearning: flattenOptionValues(FILTER_CONFIGS.socialEmotionalLearning.options),
  cookingMethods: flattenOptionValues(FILTER_CONFIGS.cookingMethods.options),
};

/**
 * Expand a lesson's stored Cultural Heritage values into a SLUG set covering
 * the value itself and ALL its ancestors (C1.6). Stored values are Title-Case
 * labels (e.g. "Mexican") or already-canonical slugs; each is normalized to
 * its slug and expanded UP the tree (chinese → east-asian → asian).
 *
 * Server parity: `search_lessons` instead expands the SELECTION DOWN to its
 * subtree labels via `expand_cultural_heritage(_alias_cultural_heritage(...))`
 * (20260616000000_heritage_recursive_expansion.sql:204-250). Down-expanding
 * the selection is equivalent to up-expanding the lesson over the same tree,
 * so `selection ∩ heritageSlugSet(lesson) ≠ ∅` matches exactly what clicking
 * matches (verified label-by-label on TEST, audit §2b). An unknown stored
 * value keeps its verbatim self (no ancestors) — mirroring the server's
 * unknown-input passthrough — and is matchable only if the selection carries
 * that same verbatim value (the UI never sends one).
 *
 * Shared by the badge tally AND the cross-category restriction predicate so
 * the two can never drift.
 */
function heritageSlugSet(stored: string[]): Set<string> {
  const slugs = new Set<string>();
  for (const value of stored) {
    const slug = aliasToSlug[value];
    if (slug === undefined) {
      slugs.add(value);
      continue;
    }
    for (const ancestor of ancestorsBySlug[slug] ?? [slug]) {
      slugs.add(ancestor);
    }
  }
  return slugs;
}

/** Tolerant accessor: `academicIntegration` may be a string[] or `{ selected }`. */
function academicValues(ai: FacetLesson['metadata']['academicIntegration']): string[] {
  if (!ai) return [];
  if (Array.isArray(ai)) return ai;
  return ai.selected ?? [];
}

/**
 * Per-lesson normalized artifacts, computed once per lesson per count pass so
 * the per-option predicate loop does no repeated normalization work.
 */
interface PreparedLesson {
  gradeLevels: string[];
  thematicCategories: string[];
  seasonTiming: string[];
  coreCompetencies: string[];
  academicIntegration: string[];
  socialEmotionalLearning: string[];
  /** Raw stored activity values (bare nouns on real rows). */
  activityType: string[];
  /** Lowercased stored locations (the SQL compares lowercase both sides). */
  locationLower: string[];
  /** Lowercased stored cooking methods (ditto). */
  cookingLower: string[];
  /** Stored heritage values expanded up to self + all ancestors, as slugs. */
  heritageSlugs: Set<string>;
}

function prepareLesson(lesson: FacetLesson): PreparedLesson {
  const meta = lesson.metadata;
  return {
    gradeLevels: lesson.gradeLevels ?? [],
    thematicCategories: meta.thematicCategories ?? [],
    seasonTiming: meta.seasonTiming ?? [],
    coreCompetencies: meta.coreCompetencies ?? [],
    academicIntegration: academicValues(meta.academicIntegration),
    socialEmotionalLearning: meta.socialEmotionalLearning ?? [],
    activityType: meta.activityType ?? [],
    locationLower: (meta.locationRequirements ?? []).map((v) => v.toLowerCase()),
    cookingLower: (meta.cookingMethods ?? []).map((v) => v.toLowerCase()),
    heritageSlugs: heritageSlugSet(meta.culturalHeritage ?? []),
  };
}

/** Plain case-sensitive array overlap — the client twin of SQL `&&`. */
function overlaps(stored: string[], selected: string[]): boolean {
  return selected.some((v) => stored.includes(v));
}

/**
 * Expand a Location selection the way `_match_location` does
 * (20260620000000_search_lessons_w1b.sql:137-161): Indoor→{indoor,both},
 * Outdoor→{outdoor,both}, Both→{both}, anything else → its lowercase self.
 * This is the F3 fix — the Indoor badge counts indoor-stored AND both-stored
 * lessons, exactly what clicking Indoor returns.
 */
function expandLocationSelection(selected: string[]): Set<string> {
  const expanded = new Set<string>();
  for (const value of selected) {
    const lower = value.toLowerCase();
    if (lower === 'indoor' || lower === 'outdoor') expanded.add('both');
    expanded.add(lower);
  }
  return expanded;
}

/**
 * The single per-category match predicate — the client twin of the
 * `search_lessons` WHERE clauses (20260629010000_c41_pr_d_two_pass_relax.sql:287-310).
 * Used by BOTH the badge tally (one option at a time) and the cross-category
 * restriction (the category's full active selection), so tally and match
 * semantics cannot drift apart.
 *
 * An empty selection imposes no restriction (mirrors the RPC's
 * `filter_x IS NULL OR array_length(...) IS NULL OR ...` guards).
 */
function matchesPrepared(lesson: PreparedLesson, key: FacetFilterKey, selected: string[]): boolean {
  if (selected.length === 0) return true;
  switch (key) {
    // SQL twin: `l.grade_levels && filter_grade_levels` (:287-288)
    case 'gradeLevels':
      return overlaps(lesson.gradeLevels, selected);
    // SQL twin: `l.thematic_categories && filter_themes` (:289-290).
    // Counted verbatim, case-sensitive — the ~74 kebab-drifted PROD rows
    // (`seed-to-table`) match neither the filter nor the option, so the badge
    // stays consistent with click behavior; when the FP-02 data fix
    // normalizes them, badges self-correct with zero code change here.
    case 'thematicCategories':
      return overlaps(lesson.thematicCategories, selected);
    // SQL twin: `l.season_timing && filter_seasons` (:291-292)
    case 'seasonTiming':
      return overlaps(lesson.seasonTiming, selected);
    // SQL twin: `l.core_competencies && filter_competencies` (:293-294)
    case 'coreCompetencies':
      return overlaps(lesson.coreCompetencies, selected);
    // SQL twin: `l.cultural_heritage && expand_cultural_heritage(_alias_...)`
    // (:295-296; expansion built at :214-218). See heritageSlugSet for the
    // down-vs-up expansion equivalence argument.
    case 'culturalHeritage':
      return selected.some((slug) => lesson.heritageSlugs.has(slug));
    // SQL twin: `_match_location(l.location_requirements, filter_location)`
    // (:297-299 → 20260620000000_search_lessons_w1b.sql:137-161).
    case 'location': {
      const expanded = expandLocationSelection(selected);
      return lesson.locationLower.some((v) => expanded.has(v));
    }
    // SQL twin: `l.activity_type && _alias_activity_type(filter_activity_type)`
    // (:300-301 → 20260513000000_alias_activity_type_add_craft.sql:37-57).
    case 'activityType':
      return selected.some((slug) => {
        const noun = ACTIVITY_TYPE_NOUN_BY_SLUG[slug];
        return (
          lesson.activityType.includes(slug) ||
          (noun !== undefined && lesson.activityType.includes(noun))
        );
      });
    // SQL twin: `l.academic_integration && filter_academic` (:303-304)
    case 'academicIntegration':
      return overlaps(lesson.academicIntegration, selected);
    // SQL twin: `l.social_emotional_learning && filter_sel` (:305-306)
    case 'socialEmotionalLearning':
      return overlaps(lesson.socialEmotionalLearning, selected);
    // SQL twin: `_match_cooking_methods(l.cooking_methods, filter_cooking_method)`
    // (:307-308 → 20260505000000_filter_drift_pr1_column_based_search_lessons.sql:159-183).
    // Lowercase compare both sides. The SQL's `'basic prep only'` legacy alias
    // branch is unreachable from this app (the UI sends the kebab option
    // values only — filterDefinitions.ts:157-168), so it is not replicated.
    case 'cookingMethods': {
      const lowered = selected.map((v) => v.toLowerCase());
      return lesson.cookingLower.some((v) => lowered.includes(v));
    }
  }
}

/**
 * Does this lesson match `selected` under category `key`'s rules? Server
 * parity per the SQL-twin citations on `matchesPrepared`. Pure function.
 */
export function matchesFacetSelection(
  lesson: FacetLesson,
  key: FacetFilterKey,
  selected: string[]
): boolean {
  return matchesPrepared(prepareLesson(lesson), key, selected);
}

/**
 * TRUE badge counts over the full corpus: for each category C and each
 * RENDERED option v, count the lessons matching v (per C's rules) AND every
 * OTHER active filter category. C's own selection never restricts C's badges
 * (self-category exclusion — fixes the audit-F4 intersection bug); the
 * free-text query is deliberately not consulted (see module doc).
 *
 * Pure function; safe to call from a useMemo. Cost is ~80 rendered options ×
 * corpus size of small membership checks — low-single-digit ms at ~700 rows.
 */
export function computeTrueFacetCounts(
  lessons: FacetLesson[],
  filters: SearchFilters
): FacetCounts {
  const counts = EMPTY_COUNTS();
  const selections = KEYS.map((key) => filters[key] ?? []);

  for (const lesson of lessons) {
    const prepared = prepareLesson(lesson);

    // One match bit per category vs its ACTIVE selection (inactive ⇒ true).
    const bits = KEYS.map((key, i) => matchesPrepared(prepared, key, selections[i]));
    const failures = bits.reduce((n, bit) => (bit ? n : n + 1), 0);
    // A lesson is in category C's badge universe iff every OTHER category
    // matches: 0 failures ⇒ in every universe; exactly 1 ⇒ only in the
    // failing category's own universe; ≥2 ⇒ in none.
    if (failures > 1) continue;
    const soleFailure = failures === 1 ? bits.indexOf(false) : -1;

    for (let i = 0; i < KEYS.length; i++) {
      if (soleFailure !== -1 && soleFailure !== i) continue;
      const key = KEYS[i];
      const bucket = counts[key];
      for (const value of OPTION_VALUES_BY_KEY[key]) {
        if (matchesPrepared(prepared, key, [value])) {
          bucket[value] = (bucket[value] ?? 0) + 1;
        }
      }
    }
  }
  return counts;
}
