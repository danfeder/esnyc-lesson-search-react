import type { ReviewMetadata } from '@/types';

// ReviewDetail validation/progress logic, extracted as pure functions of
// `metadata` (Wave 5 PR-1a Task 1a.5). The cooking/garden derivations gate
// which fields are *conditionally* required, so they live here alongside the
// validation/progress logic that consumes them — and are re-imported by
// ReviewDetail.tsx's JSX, which conditionally renders the cooking/garden
// sections off these same booleans. Behavior is preserved verbatim.

export interface FieldProgress {
  completed: number;
  total: number;
}

/** True when the submission's activity type includes a cooking variant. */
export function showCookingFields(metadata: ReviewMetadata): boolean {
  const types = metadata.activityType ?? [];
  return types.includes('cooking') || types.includes('cooking-only');
}

/** True when the submission's activity type includes a garden variant. */
export function showGardenFields(metadata: ReviewMetadata): boolean {
  const types = metadata.activityType ?? [];
  return types.includes('garden') || types.includes('garden-only');
}

/**
 * Returns the human labels of the required metadata fields that are still
 * missing. The 7 base fields are always required; cooking adds 3 and garden
 * adds 1, gated by the activity type.
 */
export function validateRequiredFields(metadata: ReviewMetadata): string[] {
  const errors: string[] = [];
  if (!metadata.activityType?.length) errors.push('Activity Type');
  if (!metadata.location) errors.push('Location');
  if (!metadata.gradeLevels?.length) errors.push('Grade Levels');
  if (!metadata.themes?.length) errors.push('Thematic Categories');
  if (!metadata.season?.length) errors.push('Season & Timing');
  if (!metadata.coreCompetencies?.length) errors.push('Core Competencies');
  if (!metadata.socialEmotionalLearning?.length) errors.push('Social-Emotional Learning');
  if (showCookingFields(metadata)) {
    if (!metadata.cookingMethods?.length) errors.push('Cooking Methods');
    if (!metadata.mainIngredients?.length) errors.push('Main Ingredients');
    if (!metadata.cookingSkills?.length) errors.push('Cooking Skills');
  }
  if (showGardenFields(metadata)) {
    if (!metadata.gardenSkills?.length) errors.push('Garden Skills');
  }
  return errors;
}

/** Computes the progress-bar counts (completed / total required fields). */
export function computeFieldProgress(metadata: ReviewMetadata): FieldProgress {
  const required: { label: string; filled: boolean }[] = [
    { label: 'Activity Type', filled: (metadata.activityType?.length ?? 0) > 0 },
    { label: 'Location', filled: !!metadata.location },
    { label: 'Grade Levels', filled: (metadata.gradeLevels?.length ?? 0) > 0 },
    { label: 'Thematic Categories', filled: (metadata.themes?.length ?? 0) > 0 },
    { label: 'Season & Timing', filled: (metadata.season?.length ?? 0) > 0 },
    { label: 'Core Competencies', filled: (metadata.coreCompetencies?.length ?? 0) > 0 },
    {
      label: 'Social-Emotional Learning',
      filled: (metadata.socialEmotionalLearning?.length ?? 0) > 0,
    },
  ];
  if (showCookingFields(metadata)) {
    required.push(
      { label: 'Cooking Methods', filled: (metadata.cookingMethods?.length ?? 0) > 0 },
      { label: 'Main Ingredients', filled: (metadata.mainIngredients?.length ?? 0) > 0 },
      { label: 'Cooking Skills', filled: (metadata.cookingSkills?.length ?? 0) > 0 }
    );
  }
  if (showGardenFields(metadata)) {
    required.push({ label: 'Garden Skills', filled: (metadata.gardenSkills?.length ?? 0) > 0 });
  }
  const completed = required.filter((f) => f.filled).length;
  return { completed, total: required.length };
}
