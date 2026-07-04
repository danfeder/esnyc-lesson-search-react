import { lessonMetadataSchema } from '@/types/lessonMetadata.zod';
import { lessonToReview } from '@/utils/lessonToReviewMapper';
import {
  parseExtractedContent,
  parseTemplateTags,
  type TemplateTagPrefill,
} from '@/pages/reviewDetailHelpers';
import { logger } from '@/utils/logger';
import type { ReviewMetadata } from '@/types';

// Returns null on missing/invalid draft; caller applies reAddActivityTypeSuffix.
export function computeInitialMetadataFromAiDraft(aiDraft: unknown): ReviewMetadata | null {
  if (aiDraft === null || aiDraft === undefined) return null;
  const parsed = lessonMetadataSchema.safeParse(aiDraft);
  if (!parsed.success) {
    logger.warn(
      'AI draft failed lessonMetadata canonical schema; falling back to empty form',
      parsed.error.flatten()
    );
    return null;
  }
  return lessonToReview(parsed.data) as ReviewMetadata;
}

/**
 * Prefill the reviewer-editable "what gets published" fields (title + summary)
 * from the submission. Title prefers the stored `extracted_title`, then the
 * title parsed from the doc body; summary comes from the parsed doc body.
 * A NON-BLANK existing value in `metadata` WINS (a restored review — or a future
 * AI draft — that already set title/summary is preserved). A blank / whitespace
 * stored value is treated as "no value" and re-derives from the doc: this covers
 * the interaction between the two T2b behaviors — a reviewer can clear the title
 * and save `needs_revision` (which skips the required-tags gate), persisting an
 * empty title; on reopen we re-prefill from the doc rather than showing a blank
 * field, honoring the "prefilled from the doc — edit if needed" UI promise.
 * Never mutates the input.
 */
export function withPrefilledTitleSummary(
  metadata: ReviewMetadata,
  source: { extractedTitle?: string | null; extractedContent?: string | null }
): ReviewMetadata {
  const parsed = parseExtractedContent(source.extractedContent ?? '');
  const prefillTitle = source.extractedTitle?.trim() || parsed.title || '';
  const prefillSummary = parsed.summary || '';
  return {
    ...metadata,
    title: metadata.title?.trim() ? metadata.title : prefillTitle || undefined,
    summary: metadata.summary?.trim() ? metadata.summary : prefillSummary || undefined,
  };
}

// The closed-vocab tag fields `parseTemplateTags` can mechanically prefill.
const TEMPLATE_TAG_FIELDS: (keyof TemplateTagPrefill)[] = [
  'coreCompetencies',
  'socialEmotionalLearning',
  'cookingMethods',
  'observancesHolidays',
  'cookingSkills',
  'mainIngredients',
  'gardenSkills',
];

/**
 * Mechanically prefill the closed-vocab tag fields from the 2026 template's
 * labeled cells (FP5 Brief 2). ONLY fills a field that is currently EMPTY
 * (undefined or []), so a restored review's existing reviewer selections — and
 * an already-set field on the preselect path — always win, exactly like the
 * title/summary prefill. Fields the parser can't exact-match stay untouched, so
 * a non-template doc renders the form exactly as today. Never mutates the input.
 */
export function withPrefilledTemplateTags(
  metadata: ReviewMetadata,
  extractedContent: string | null | undefined
): ReviewMetadata {
  const prefill = parseTemplateTags(extractedContent ?? '');
  const out: ReviewMetadata = { ...metadata };
  const writable = out as Record<string, string[] | undefined>;
  for (const field of TEMPLATE_TAG_FIELDS) {
    const current = metadata[field];
    const proposed = prefill[field];
    const isEmpty = !Array.isArray(current) || current.length === 0;
    if (isEmpty && proposed && proposed.length > 0) {
      writable[field] = proposed;
    }
  }
  return out;
}

/**
 * Detect a doc title that changed between review rounds (title-changed-on-
 * resubmit hint). Returns the doc's CURRENT title — derived exactly the way
 * `withPrefilledTitleSummary` derives its prefill (stored `extracted_title`
 * first, then the title parsed from the doc body) — when BOTH it and the
 * restored round-1 title are non-blank and differ after trimming +
 * case-folding; otherwise null.
 *
 * This is a SIGNAL ONLY, not a precedence change: the restored title still
 * wins the Title field by design (see `withPrefilledTitleSummary` — the T2b
 * "reviewer's title is what gets published" contract). The hint just tells
 * the reviewer the doc now says something else, so a teacher's rename on
 * resubmit isn't silently overridden without anyone noticing.
 *
 * A blank restored title returns null: the prefill re-derives the field from
 * the doc in that case, so field and doc already agree — nothing to hint.
 */
export function detectDocTitleChange(
  restoredTitle: string | undefined,
  source: { extractedTitle?: string | null; extractedContent?: string | null }
): string | null {
  const restored = restoredTitle?.trim();
  if (!restored) return null;
  const parsed = parseExtractedContent(source.extractedContent ?? '');
  const docTitle = source.extractedTitle?.trim() || parsed.title?.trim() || '';
  if (!docTitle) return null;
  return docTitle.toLowerCase() === restored.toLowerCase() ? null : docTitle;
}
