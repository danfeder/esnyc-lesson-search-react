/**
 * Maps canonical lesson metadata (canonical keys) into a review-form
 * payload (review-form keys).
 *
 * Inverse of `reviewToLessonMapper`. Used at the read site — when
 * ReviewDetail.tsx initializes the form for a submission whose
 * `lesson_submissions.ai_draft_metadata` was populated by the LLM-draft
 * writer (PR 2 Task 2.2), the draft arrives in canonical keys and must be
 * mapped back to review-form keys for display.
 *
 * Asymmetry note: `locationRequirements: string[]` → `location: string`
 * picks the first element. The SQL writer only produces single-element
 * arrays for this field, so the lossy branch is unreachable in practice.
 *
 * AcademicIntegration sub-shape: canonical permits both string[] and
 * { concepts, selected } object regimes. Review form is string[] only;
 * this mapper extracts `selected` from the object form.
 */
import type {
  LessonMetadataValidated,
  AcademicIntegrationValue,
  CulturalHeritageValue,
} from '@/types/lessonMetadata.zod';
import type { ReviewFormPayloadValidated } from '@/types/reviewFormPayload.zod';
import { normalizeThematicCategories } from '@/utils/thematicNormalize';

export function lessonToReview(input: LessonMetadataValidated): ReviewFormPayloadValidated {
  const out: ReviewFormPayloadValidated = {};

  if (input.activityType && input.activityType.length > 0) {
    out.activityType = input.activityType;
  }
  if (input.locationRequirements && input.locationRequirements.length > 0) {
    out.location = input.locationRequirements[0];
  }

  // Key renames (canonical → review form).
  // FP-02 Tier-1 guard: legacy kebab theme values ('seed-to-table') are
  // normalized to the canonical Title-Case vocabulary at form-init, so the
  // pill UI can display them and a reviewer save self-repairs a drifted row
  // instead of round-tripping the drift back into the DB (which now rejects
  // it via the valid_thematic_categories CHECK).
  if (input.thematicCategories && input.thematicCategories.length > 0) {
    out.themes = normalizeThematicCategories(input.thematicCategories);
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
    // The lesson side keeps culturalHeritage open (`string[]`) while the review
    // field is now the closed CulturalHeritageEnum[] (Brief 4). This is the read
    // path — it only DISPLAYS existing stored values, and the closed list is derived
    // from the current corpus so every stored value is in-list on PROD. Narrow at
    // the boundary (mirrors the academicIntegration object branch below); any truly
    // off-list value still displays via the form's tolerant value-map and is caught
    // by the closed Zod enum on save.
    out.culturalHeritage = input.culturalHeritage as CulturalHeritageValue[];
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
      // The object form's `selected` is canonical `string[]` (the object
      // sub-schema keeps it open); the review field is now the closed
      // AcademicIntegrationEnum[] (PR 6e E2b). This identity copy is
      // behaviour-preserving, so narrow at the boundary.
      out.academicIntegration = input.academicIntegration.selected as AcademicIntegrationValue[];
    }
  }

  // Same-key strings.
  if (input.processingNotes) {
    out.processingNotes = input.processingNotes;
  }
  if (input.summary) {
    out.summary = input.summary;
  }

  return out;
}
