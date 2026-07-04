import type { ReviewMetadata } from '@/types';
import { reviewFormPayloadSchema } from '@/types/reviewFormPayload.zod';
import { type FilterConfig } from '@/utils/filterDefinitions';
import { type IntDuplicateMatchType } from '@/components/Internal';
import {
  CORE_COMPETENCIES_VALUES,
  SOCIAL_EMOTIONAL_LEARNING_VALUES,
  OBSERVANCES_HOLIDAYS_VALUES,
  COOKING_SKILLS_VALUES,
  GARDEN_SKILLS_VALUES,
  MAIN_INGREDIENTS_VALUES,
  INGREDIENT_PARENT_MAP,
} from '@/types/lessonMetadata.zod';

// Map review-form Zod field keys to the human labels used in the
// validation banner + per-IntFormField error states. Kept in sync with
// reviewFormPayloadSchema (src/types/reviewFormPayload.zod.ts) and the
// existing required-fields labels so a Zod failure highlights the same
// IntFormField as a missing-required failure would.
export const ZOD_FIELD_TO_LABEL: Record<keyof typeof reviewFormPayloadSchema.shape, string> = {
  activityType: 'Activity Type',
  location: 'Location',
  season: 'Season & Timing',
  themes: 'Thematic Categories',
  gradeLevels: 'Grade Levels',
  coreCompetencies: 'Core Competencies',
  socialEmotionalLearning: 'Social-Emotional Skills',
  cookingMethods: 'Cooking Methods',
  mainIngredients: 'Main Ingredients',
  gardenSkills: 'Garden Skills',
  cookingSkills: 'Cooking Skills',
  culturalHeritage: 'Cultural Heritage',
  academicIntegration: 'Academic Integration',
  observancesHolidays: 'Observances & Holidays',
  culturalResponsivenessFeatures: 'Cultural Responsiveness Features',
  processingNotes: 'Processing Notes',
  title: 'Lesson title',
  summary: 'Summary',
};

// Mirror of the save-path activityType strip in handleSaveReview. The
// IntPillGroup option values are slugs (`cooking-only`/`garden-only`/
// `academic-only`/`craft-only`); the canonical Zod enum + DB CHECK
// installed in PR 1 store `cooking`/`garden`/`academic`/`craft` (suffix
// stripped on save). Without re-adding the suffix when loading an
// existing review, a pill the reviewer previously selected appears
// unselected on reopen — the form looks blank even though the value
// is present and validates fine.
//
// Shape-tolerant by design: pre-D2.1 reviews stored `activityType` as a
// scalar string (113 PROD rows as of 2026-05-06). The `as ReviewMetadata`
// cast at the call site is a runtime lie for those rows. Calling `v.map`
// on a scalar throws `is not a function`, which surfaces in
// `ReviewErrorBoundary` instead of the review UI. Widen to `unknown`
// and handle scalar input so reopening any approved submission stays
// safe; legacy `'both'` fans out to multi-pill `[cooking-only, garden-only]`.
export function reAddActivityTypeSuffix(raw: ReviewMetadata): ReviewMetadata {
  const v: unknown = raw.activityType;
  if (v == null) return raw;

  if (typeof v === 'string') {
    if (v === '') return raw;
    if (v === 'both') return { ...raw, activityType: ['cooking-only', 'garden-only'] };
    return { ...raw, activityType: [v.endsWith('-only') ? v : `${v}-only`] };
  }

  if (Array.isArray(v) && v.length > 0) {
    return {
      ...raw,
      activityType: (v as string[]).map((s) => (s.endsWith('-only') ? s : `${s}-only`)),
    };
  }

  return raw;
}

export function parseExtractedContent(content: string): { title: string; summary: string } {
  const lines = content.split('\n').filter((line) => line.trim());
  let title = '';
  let summary = '';

  const titleMatch = content.match(/^(Title:|Lesson Title:|#\s+)?(.+)$/im);
  if (titleMatch && titleMatch[2]) {
    title = titleMatch[2].trim();
  } else if (lines.length > 0) {
    title = lines[0].trim();
  }

  const summaryMatch = content.match(
    /(?:Summary:|Overview:|Description:)\s*(.+?)(?:\n\n|\n(?=[A-Z]))/is
  );
  if (summaryMatch && summaryMatch[1]) {
    summary = summaryMatch[1].trim();
  } else {
    const contentAfterTitle = lines.slice(1).join('\n');
    const firstParagraph = contentAfterTitle.split(/\n\n/)[0];
    if (firstParagraph) {
      summary = firstParagraph.trim().substring(0, 500);
    }
  }

  return { title, summary };
}

// =============================================================================
// Mechanical template-tag prefill (FP5 Brief 2 — owner decision 2026-07-04).
//
// The next wave of lessons is submitted through the LOCKED 2026 Google Doc
// template (`1C0tCnRJXgdNxUJtv25aq2ZDnKHjTcjA0H6LIY248xQk`). Its cells carry
// LABELED lines that the doc extractor renders pipe-delimited, e.g.
//   [Table]
//   Core Competencies: | List all that apply: Environmental and community stewardship, social justice, ... |
// `parseTemplateTags` reads those cells DETERMINISTICALLY — exact (case-
// insensitive, punctuation-tolerant) matches against the closed vocab, or leave
// the field blank. It never fuzzy-matches and never auto-saves; it only prefills
// the reviewer FORM (reviewer edits freely, the normal canonicalize + Zod paths
// run unchanged on save). AI auto-tag is off (owner 2026-07-04), so this is the
// only automatic tag assist. See `withPrefilledTemplateTags` (reviewMetadataInit)
// for the only-fill-blank-fields merge into form state.
//
// THE core hazard: the template's cells ship with their OWN option lists as
// INSTRUCTIONS (Core Competencies ships "List all that apply: <all 5 options>";
// SEL ships "(pick all that apply or add your own): <all 7 options>"). A teacher
// who leaves the stock text has answered NOTHING. Guards, applied per field:
//   a. strip the known instruction prefixes before matching;
//   b. if EVERY stock option still survives (= untouched stock list), treat the
//      cell as UNANSWERED → prefill nothing for that field;
//   c. only exact value matches count (whole comma/pipe-delimited tokens, never
//      fuzzy or substring-across-words).
// =============================================================================

/** Fields `parseTemplateTags` can mechanically prefill (V1 scope). */
export interface TemplateTagPrefill {
  coreCompetencies?: string[];
  socialEmotionalLearning?: string[];
  cookingMethods?: string[];
  observancesHolidays?: string[];
  cookingSkills?: string[];
  mainIngredients?: string[];
  gardenSkills?: string[];
}

// Ordered anchors for every labeled section of the 2026 template (+ the legacy
// labels that still appear), so a field's cell is bounded to the text between
// its own label and the NEXT label. Bounding is what keeps, e.g., a "social
// justice" mention in the Objectives cell out of Core Competencies.
const SECTION_ANCHORS: RegExp[] = [
  /summary\s*:/i,
  /objectives?\s*:/i,
  /core competencies\s*:?/i,
  /cultural responsiveness/i,
  /social[-\s]?emotional skills/i,
  /garden connection\s*:/i,
  /how does this lesson promote/i,
  /food and nutrition standard/i,
  /pick a tag from each category/i,
  /agenda\s*\/?\s*class flow/i,
  /grade level variations/i,
  /site based variations/i,
  /back pocket activity/i,
];

/**
 * Normalize a candidate token or a vocab value to a comparable key: lowercase,
 * fold the punctuation Google Docs autocorrect silently injects (diacritics →
 * base letters so `Sautéing` matches `Sauteing`; curly quotes/apostrophes →
 * straight so `Women’s History Month` matches the straight-apostrophe vocab;
 * en/em dashes → hyphen), drop parentheticals (`self-management (safety)` →
 * `self-management`), collapse whitespace, and strip leading/trailing punctuation
 * (labels' colons, commas, periods). Internal punctuation is KEPT so `Mixing &
 * stirring`, `Literacy/ELA`, and `Self-management` still round-trip. Applied to
 * BOTH sides of every comparison, so matching stays exact, never fuzzy — the
 * folds only absorb keyboard/autocorrect variance, never widen the vocab.
 */
function normalizeTagToken(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics: e-acute -> e
    .replace(/[‘’]/g, "'") // curly apostrophes -> straight
    .replace(/[“”]/g, '"') // curly quotes -> straight
    .replace(/[–—]/g, '-') // en/em dash -> hyphen
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[^a-z0-9]+/, '')
    .replace(/[^a-z0-9]+$/, '')
    .trim();
}

/** Slice the cell text that follows `startRe`, up to the next section anchor. */
function sliceSectionAfter(flat: string, startRe: RegExp): string {
  const start = startRe.exec(flat);
  if (!start) return '';
  const afterLabel = start.index + start[0].length;
  let end = flat.length;
  for (const anchor of SECTION_ANCHORS) {
    const m = anchor.exec(flat);
    if (m && m.index >= afterLabel && m.index < end) end = m.index;
  }
  return flat.slice(afterLabel, end);
}

// Instruction prefixes the template ships inside the option cells (guard a).
const INSTRUCTION_PREFIXES: RegExp[] = [
  /list all that apply\s*:?/gi,
  /\(pick all that apply[^)]*\)\s*:?/gi,
  /pick all that apply(?:\s+or add your own)?\s*:?/gi,
];

/**
 * Match whole comma/pipe/newline-delimited tokens in `cellText` against a closed
 * `vocab`, case-insensitively and punctuation-tolerantly (guard c). Returns the
 * matches in `vocab` order (deterministic). When `stockOptions` is non-empty and
 * EVERY one still survives in the cell, the stock list is untouched → returns
 * `[]` (guard b). `aliases` maps extra template phrasings onto a canonical value.
 */
function matchClosedVocab(
  cellText: string,
  vocab: readonly string[],
  stockOptions: readonly string[] = [],
  aliases: Record<string, string> = {}
): string[] {
  let text = cellText;
  for (const re of INSTRUCTION_PREFIXES) text = text.replace(re, ' ');

  // Tokenize by pipe/semicolon/newline into SEGMENTS, then by comma into pieces.
  // A comma is BOTH an item separator AND a character inside one vocab value
  // ("Squash, cucumbers & melons"), so try each whole segment as a candidate too
  // — a directly-typed comma-containing value survives, while the normal
  // comma-separated list still tokenizes into its individual answers.
  const tokens = new Set<string>();
  for (const segment of text.split(/[|;\n]/)) {
    const whole = normalizeTagToken(segment);
    if (whole) tokens.add(whole);
    for (const piece of segment.split(',')) {
      const p = normalizeTagToken(piece);
      if (p) tokens.add(p);
    }
  }

  // Guard b: the untouched stock option list means the teacher answered nothing.
  if (stockOptions.length > 0 && stockOptions.every((opt) => tokens.has(normalizeTagToken(opt)))) {
    return [];
  }

  const lookup = new Map<string, string>();
  for (const value of vocab) lookup.set(normalizeTagToken(value), value);
  for (const [phrase, canonical] of Object.entries(aliases)) {
    lookup.set(normalizeTagToken(phrase), canonical);
  }

  const matched = new Set<string>();
  for (const token of tokens) {
    const canonical = lookup.get(token);
    if (canonical) matched.add(canonical);
  }
  return vocab.filter((value) => matched.has(value));
}

// The Core Competency the 2026 template dropped (owner 2026-07-04). It stays a
// legal STORED value — 388/431 active lessons still carry it — but new lessons
// never pick it: the prefill parser never emits it (below), and the reviewer
// form hides its pill unless the loaded metadata already carries it (FP5 B3).
export const SOCIAL_EMOTIONAL_INTELLIGENCE = 'Social-Emotional Intelligence';

/**
 * True when a review's INITIALLY-LOADED core competencies already carry the
 * legacy 'Social-Emotional Intelligence' value — the one signal that keeps its
 * pill on the reviewer form (FP5 B3). Judge from the metadata AS LOADED, never
 * the live selection, so unticking it mid-review doesn't make the pill vanish
 * (no undo trap). Case-insensitive for safety; stored values are canonical.
 */
export function loadedMetadataHasLegacySei(coreCompetencies: string[] | undefined): boolean {
  return (coreCompetencies ?? []).some(
    (v) => v.toLowerCase() === SOCIAL_EMOTIONAL_INTELLIGENCE.toLowerCase()
  );
}

// Core Competencies offered by the template = the app's 6 minus
// "Social-Emotional Intelligence" (the template deliberately dropped it; the
// owner said new lessons never pick it — so it's NEVER prefilled).
const CORE_COMPETENCY_TEMPLATE_OPTIONS = CORE_COMPETENCIES_VALUES.filter(
  (v) => v !== SOCIAL_EMOTIONAL_INTELLIGENCE
);

/**
 * Read the Heating-element line (Tags cell instruction, or anywhere) and map it
 * to stored kebab cooking-method values: none → basic-prep, stove → stovetop,
 * oven → oven. The stock instruction lists all three ("none, stove or oven") →
 * treated as untouched → returns [].
 */
function parseHeatingElement(flat: string): string[] {
  const m = /heating element\s*:?\s*([^.\n]*)/i.exec(flat);
  if (!m) return [];
  const seg = m[1].toLowerCase();
  const hasNone = /\bnone\b/.test(seg);
  const hasStove = /\bstove\b/.test(seg);
  const hasOven = /\boven\b/.test(seg);
  if (hasNone && hasStove && hasOven) return []; // untouched stock list
  const out: string[] = [];
  if (hasNone) out.push('basic-prep');
  if (hasStove) out.push('stovetop');
  if (hasOven) out.push('oven');
  return out;
}

/**
 * Deterministically prefill closed-vocab tag fields from the 2026 template's
 * labeled cells. Returns ONLY the fields it could fill with ≥1 exact match;
 * everything else stays absent so the caller leaves the form field untouched.
 * A non-template doc (legacy submission body with no template labels) yields an
 * empty object. Pure — never mutates, never fuzzy-matches, never auto-saves.
 */
export function parseTemplateTags(content: string): TemplateTagPrefill {
  const flat = (content ?? '').replace(/\[Table\]/g, '\n');
  const result: TemplateTagPrefill = {};

  const coreCompetencies = matchClosedVocab(
    sliceSectionAfter(flat, /core competencies\s*:?/i),
    CORE_COMPETENCY_TEMPLATE_OPTIONS,
    CORE_COMPETENCY_TEMPLATE_OPTIONS
  );
  if (coreCompetencies.length > 0) result.coreCompetencies = coreCompetencies;

  const socialEmotionalLearning = matchClosedVocab(
    sliceSectionAfter(flat, /social[-\s]?emotional skills/i),
    SOCIAL_EMOTIONAL_LEARNING_VALUES,
    // Stock SEL list = the 7 template words (self-management shown as
    // "self-management (safety)", normalized to Self-management).
    ['Bravery', 'Kindness', 'Respect', 'Self-management', 'Collaboration', 'Pride', 'Joy']
  );
  if (socialEmotionalLearning.length > 0) {
    result.socialEmotionalLearning = socialEmotionalLearning;
  }

  const cookingMethods = parseHeatingElement(flat);
  if (cookingMethods.length > 0) result.cookingMethods = cookingMethods;

  // The Tags cell name-drops vocab-adjacent words in its long instruction
  // ("compost", "stove or oven", "region of the world"…). Strip that instruction
  // sentence, then match each closed vocab against only what the teacher left.
  const tagsCell = sliceSectionAfter(flat, /pick a tag from each category\s*:?/i).replace(
    /for all lessons\s*:[\s\S]*?etc\s*\)/i,
    ' '
  );

  const observancesHolidays = matchClosedVocab(tagsCell, OBSERVANCES_HOLIDAYS_VALUES);
  if (observancesHolidays.length > 0) result.observancesHolidays = observancesHolidays;

  const cookingSkills = matchClosedVocab(tagsCell, COOKING_SKILLS_VALUES);
  if (cookingSkills.length > 0) result.cookingSkills = cookingSkills;

  const gardenSkills = matchClosedVocab(tagsCell, GARDEN_SKILLS_VALUES);
  if (gardenSkills.length > 0) result.gardenSkills = gardenSkills;

  const mainIngredientMatches = matchClosedVocab(tagsCell, MAIN_INGREDIENTS_VALUES);
  if (mainIngredientMatches.length > 0) {
    // The Zod refinement rejects an orphan specific on save, so auto-add each
    // matched specific's parent group (INGREDIENT_PARENT_MAP). Return in the
    // frozen vocab order (groups precede specifics) so a parent always lands
    // ahead of its child.
    const needed = new Set(mainIngredientMatches);
    for (const value of mainIngredientMatches) {
      const parent = INGREDIENT_PARENT_MAP[value];
      if (parent) needed.add(parent);
    }
    result.mainIngredients = MAIN_INGREDIENTS_VALUES.filter((v) => needed.has(v));
  }

  return result;
}

export function normalizeMatchType(raw: string | null): IntDuplicateMatchType | null {
  if (!raw) return null;
  if (raw === 'exact' || raw === 'high' || raw === 'medium' || raw === 'low') return raw;
  return null;
}

export function selectOptionsFromConfig(config: FilterConfig) {
  // Flatten one or more levels of `children` (depth-first, parent before its
  // specifics) so a group→specific tree config (e.g. the promoted Main
  // Ingredients — 24 groups + 46 specifics) offers EVERY value in the reviewer
  // <Select>, not just the top-level groups. Flat configs (no children) are
  // unaffected. value === label on the tree configs, so chip labels resolve.
  const out: Array<{ value: string; label: string }> = [];
  const walk = (options: FilterConfig['options']): void => {
    for (const o of options) {
      out.push({ value: o.value, label: o.label });
      if (o.children && o.children.length > 0) walk(o.children);
    }
  };
  walk(config.options);
  return out;
}
