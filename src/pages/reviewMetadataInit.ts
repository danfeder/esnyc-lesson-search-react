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
 * Existing values in `metadata` WIN (a restored review — or a future AI draft —
 * that already set title/summary is preserved, not overwritten). Never mutates
 * the input.
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
    title: metadata.title ?? (prefillTitle || undefined),
    summary: metadata.summary ?? (prefillSummary || undefined),
  };
}
