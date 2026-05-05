import { lessonMetadataSchema } from '@/types/lessonMetadata.zod';
import { lessonToReview } from '@/utils/lessonToReviewMapper';
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
