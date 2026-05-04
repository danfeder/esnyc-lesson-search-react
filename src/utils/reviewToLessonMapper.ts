/**
 * Maps a review-form payload (review-form keys, single-select strings) into
 * canonical lesson metadata (canonical keys, array values).
 *
 * Mirrors the SQL translation in `complete_review_atomic` (migration
 * 20260428000003 lines 142-167). The TS mapper exists so the read site
 * (ReviewDetail.tsx form-init when AI drafts arrive in canonical keys, per
 * PR 2 Task 2.2) and the LLM-draft writer (process-submission, per PR 2)
 * can transform without round-tripping through SQL.
 *
 * Translation rules:
 *   - activityType: string (single-select) → [string] (single-element array)
 *   - location: string → locationRequirements: [string]
 *   - themes → thematicCategories (key rename, array preserved)
 *   - season → seasonTiming (key rename, array preserved)
 *   - all other array fields: same key, preserved
 *   - all other string fields: same key, preserved
 *   - empty / missing values are dropped (matches SQL `''` → `[]` collapse)
 *
 * Round-trip property: `lessonToReview(reviewToLesson(x))` equals `x` for
 * every valid review payload (tested in `reviewToLessonMapper.test.ts`).
 */
import type { LessonMetadataValidated } from '@/types/lessonMetadata.zod';
import type { ReviewFormPayloadValidated } from '@/types/reviewFormPayload.zod';

export function reviewToLesson(input: ReviewFormPayloadValidated): LessonMetadataValidated {
  const out: LessonMetadataValidated = {};

  // Single-select string → single-element array (mirrors SQL ARRAY[...] wrap).
  if (input.activityType) {
    out.activityType = [input.activityType];
  }
  if (input.location) {
    out.locationRequirements = [input.location];
  }

  // Key renames (review form → canonical lesson).
  if (input.themes && input.themes.length > 0) {
    out.thematicCategories = input.themes;
  }
  if (input.season && input.season.length > 0) {
    out.seasonTiming = input.season;
  }

  // Same-key arrays (preserved when non-empty).
  if (input.gradeLevels && input.gradeLevels.length > 0) {
    out.gradeLevels = input.gradeLevels;
  }
  if (input.coreCompetencies && input.coreCompetencies.length > 0) {
    out.coreCompetencies = input.coreCompetencies;
  }
  if (input.socialEmotionalLearning && input.socialEmotionalLearning.length > 0) {
    out.socialEmotionalLearning = input.socialEmotionalLearning;
  }
  if (input.cookingMethods && input.cookingMethods.length > 0) {
    out.cookingMethods = input.cookingMethods;
  }
  if (input.mainIngredients && input.mainIngredients.length > 0) {
    out.mainIngredients = input.mainIngredients;
  }
  if (input.gardenSkills && input.gardenSkills.length > 0) {
    out.gardenSkills = input.gardenSkills;
  }
  if (input.cookingSkills && input.cookingSkills.length > 0) {
    out.cookingSkills = input.cookingSkills;
  }
  if (input.culturalHeritage && input.culturalHeritage.length > 0) {
    out.culturalHeritage = input.culturalHeritage;
  }
  if (input.academicIntegration && input.academicIntegration.length > 0) {
    out.academicIntegration = input.academicIntegration;
  }
  if (input.observancesHolidays && input.observancesHolidays.length > 0) {
    out.observancesHolidays = input.observancesHolidays;
  }
  if (input.culturalResponsivenessFeatures && input.culturalResponsivenessFeatures.length > 0) {
    out.culturalResponsivenessFeatures = input.culturalResponsivenessFeatures;
  }

  // Same-key strings (preserved when non-empty).
  if (input.processingNotes) {
    out.processingNotes = input.processingNotes;
  }
  if (input.summary) {
    out.summary = input.summary;
  }

  return out;
}
