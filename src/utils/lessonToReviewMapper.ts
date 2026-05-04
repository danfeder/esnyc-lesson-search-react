/**
 * Maps canonical lesson metadata (canonical keys, array values) into a
 * review-form payload (review-form keys, single-select strings).
 *
 * Inverse of `reviewToLessonMapper`. Used at the read site — when
 * ReviewDetail.tsx initializes the form for a submission whose
 * `lesson_submissions.ai_draft_metadata` was populated by the LLM-draft
 * writer (PR 2 Task 2.2), the draft arrives in canonical keys and must be
 * mapped back to review-form keys for display.
 *
 * Asymmetry note: review-form is single-select for activityType and
 * location, so the round-trip
 *   `reviewToLesson(lessonToReview(canonical))`
 * is lossless ONLY when canonical's activityType and locationRequirements
 * have at most one element. The SQL writer (`complete_review_atomic`) only
 * ever produces single-element arrays for these fields, so the lossy
 * branch is unreachable in practice — but multi-element canonical arrays
 * from imports or the Stage 2 re-tag pipeline would lose tail elements
 * here. Foundation phase tolerates this; if Stage 2 ever produces
 * multi-element activityType, revisit at PR 6+ scope.
 *
 * AcademicIntegration sub-shape: canonical permits both string[] and
 * { concepts, selected } object regimes. Review form is string[] only;
 * this mapper extracts `selected` from the object form.
 */
import type { LessonMetadataValidated } from '@/types/lessonMetadata.zod';
import type { ReviewFormPayloadValidated } from '@/types/reviewFormPayload.zod';

export function lessonToReview(input: LessonMetadataValidated): ReviewFormPayloadValidated {
  const out: ReviewFormPayloadValidated = {};

  // Array → single-select string (take first element when present).
  if (input.activityType && input.activityType.length > 0) {
    out.activityType = input.activityType[0];
  }
  if (input.locationRequirements && input.locationRequirements.length > 0) {
    out.location = input.locationRequirements[0];
  }

  // Key renames (canonical → review form).
  if (input.thematicCategories && input.thematicCategories.length > 0) {
    out.themes = input.thematicCategories;
  }
  if (input.seasonTiming && input.seasonTiming.length > 0) {
    out.season = input.seasonTiming;
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
  if (input.observancesHolidays && input.observancesHolidays.length > 0) {
    out.observancesHolidays = input.observancesHolidays;
  }
  if (input.culturalResponsivenessFeatures && input.culturalResponsivenessFeatures.length > 0) {
    out.culturalResponsivenessFeatures = input.culturalResponsivenessFeatures;
  }

  // academicIntegration: canonical can be array or { concepts, selected } object.
  // Review-form is array only; extract `selected` from the object form.
  if (input.academicIntegration) {
    if (Array.isArray(input.academicIntegration)) {
      if (input.academicIntegration.length > 0) {
        out.academicIntegration = input.academicIntegration;
      }
    } else if (input.academicIntegration.selected.length > 0) {
      out.academicIntegration = input.academicIntegration.selected;
    }
  }

  // Same-key strings.
  if (input.lessonFormat) {
    out.lessonFormat = input.lessonFormat;
  }
  if (input.processingNotes) {
    out.processingNotes = input.processingNotes;
  }
  if (input.summary) {
    out.summary = input.summary;
  }

  return out;
}
