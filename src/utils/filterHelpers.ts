import { CULTURAL_HIERARCHY, INGREDIENT_GROUPS } from './filterConstants';
import type { Lesson } from '../types';

// Cultural heritage matching with hierarchy
export function matchesCulturalHeritage(
  lessonCultures: string[] | undefined,
  selectedCultures: string[]
): boolean {
  if (!lessonCultures || lessonCultures.length === 0) return false;

  for (const selected of selectedCultures) {
    // Direct match
    if (lessonCultures.includes(selected)) return true;

    // Check if lesson has any descendants of selected culture
    const descendants = CULTURAL_HIERARCHY[selected] || [];
    if (lessonCultures.some((culture) => descendants.includes(culture))) {
      return true;
    }
  }

  return false;
}

// Check if arrays have any matching values
export function hasAnyMatch(arr1: string[] | undefined, arr2: string[]): boolean {
  if (!arr1 || !arr2) return false;
  return arr1.some((item) => arr2.includes(item));
}

// Text search helper with ingredient grouping
export function matchesTextSearch(lesson: Lesson, searchTerm: string): boolean {
  const lowerSearchTerm = searchTerm.toLowerCase();

  // First check ingredient groups
  for (const [group, ingredients] of Object.entries(INGREDIENT_GROUPS)) {
    if (ingredients.some((ing) => ing.includes(lowerSearchTerm))) {
      if ((lesson.metadata.mainIngredients || []).includes(group)) {
        return true;
      }
    }
  }

  // Pre-process search term to handle numbers
  const processedTerm = lowerSearchTerm
    .replace(/\b3\b/g, 'three')
    .replace(/\b1st\b/gi, 'first')
    .replace(/\b2nd\b/gi, 'second')
    .replace(/\b3rd\b/gi, 'third');

  // Search in lesson content
  const searchableText = [
    lesson.title,
    lesson.summary,
    ...(lesson.metadata.mainIngredients || []),
    ...(lesson.metadata.thematicCategories || []),
    ...(lesson.metadata.culturalHeritage || []),
    ...(lesson.metadata.skills || []),
    ...(lesson.metadata.cookingSkills || []),
    ...(lesson.metadata.gardenSkills || []),
  ]
    .join(' ')
    .toLowerCase();

  return searchableText.includes(processedTerm) || searchableText.includes(lowerSearchTerm);
}

// Activity type matching based on skills
export function matchesActivityType(lesson: Lesson, selectedActivities: string[]): boolean {
  if (selectedActivities.length === 0) return true;

  const hasCooking = (lesson.metadata.cookingSkills?.length ?? 0) > 0;
  const hasGarden = (lesson.metadata.gardenSkills?.length ?? 0) > 0;

  // Check if lesson matches ANY of the selected activity types
  return selectedActivities.some((activity) => {
    switch (activity) {
      case 'cooking-only':
        return hasCooking && !hasGarden;
      case 'garden-only':
        return hasGarden && !hasCooking;
      case 'both':
        return hasCooking && hasGarden;
      case 'academic-only':
        return !hasCooking && !hasGarden;
      default:
        return false;
    }
  });
}

// Season filtering with "All Seasons" logic
export function matchesSeasonFilter(
  lesson: Lesson,
  selectedSeasons: string[],
  includeAllSeasons: boolean
): boolean {
  if (selectedSeasons.length === 0) return true;

  const lessonSeasons = lesson.metadata.seasonTiming || [];
  const hasSelectedSeason = hasAnyMatch(lessonSeasons, selectedSeasons);
  const hasAllSeasons = lessonSeasons.includes('All Seasons');

  return hasSelectedSeason || (includeAllSeasons && hasAllSeasons);
}
