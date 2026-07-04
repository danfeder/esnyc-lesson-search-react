import type { ReviewMetadata } from '@/types';
import { reviewFormPayloadSchema } from '@/types/reviewFormPayload.zod';
import { type FilterConfig } from '@/utils/filterDefinitions';
import { type IntDuplicateMatchType } from '@/components/Internal';

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
