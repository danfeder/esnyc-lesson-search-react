import { lessonMetadataSchema } from '@/types/lessonMetadata.zod';
import { lessonToReview } from '@/utils/lessonToReviewMapper';
import { parseExtractedContent } from '@/pages/reviewDetailHelpers';
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
