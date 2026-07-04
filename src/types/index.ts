// Academic Integration can be either a simple array or an object with concepts
export interface AcademicIntegrationObject {
  concepts: Record<string, string[]>;
  selected: string[];
}
export type AcademicIntegration = string[] | AcademicIntegrationObject;

// Core lesson data types
export interface Lesson {
  lessonId: string;
  title: string;
  summary: string;
  fileLink: string;
  gradeLevels: string[];
  metadata: LessonMetadata;
  last_modified?: string;
  processing_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LessonMetadata {
  thematicCategories?: string[];
  seasonTiming?: string[];
  coreCompetencies: string[];
  culturalHeritage: string[];
  locationRequirements?: string[];
  activityType: string[];
  mainIngredients?: string[];
  skills?: string[];
  equipment?: string[];
  duration?: string;
  groupSize?: string;
  gradeLevels?: string[];
  gardenSkills?: string[];
  cookingSkills?: string[];
  cookingMethods?: string[];
  observancesHolidays?: string[];
  academicIntegration?: AcademicIntegration;
  socialEmotionalLearning?: string[];
  culturalResponsivenessFeatures?: string[];
}

// Search and filter types
export interface SearchFilters {
  query: string;
  gradeLevels: string[];
  thematicCategories: string[];
  seasonTiming: string[]; // Changed from 'seasons' to match LessonMetadata
  coreCompetencies: string[];
  culturalHeritage: string[];
  location: string[];
  activityType: string[];
  mainIngredients: string[]; // Group→specific tree (direct match), sidebar slot #3
  academicIntegration: string[];
  socialEmotionalLearning: string[];
  cookingMethods: string[]; // Multi-select
}

// UI state types
export type ResultView = 'list' | 'grid' | 'split';
export type ResultDensity = 'comfy' | 'compact' | 'ultra';

export interface ViewState {
  sortBy: 'title' | 'modified' | 'relevance';
  currentPage: number;
  view: ResultView;
  density: ResultDensity;
}

// Review types for submission processing
export interface ReviewMetadata {
  // What gets published: reviewer-editable title + summary (prefilled from the
  // extracted doc). Persisted to lessons.title / lessons.summary via
  // complete_review_atomic (title precedence flipped to prefer the reviewer edit).
  title?: string;
  summary?: string;
  activityType?: string[]; // Multi-select for review
  location?: string; // Single select for review
  gradeLevels?: string[];
  themes?: string[];
  season?: string[]; // Multi-select for seasons
  coreCompetencies?: string[];
  socialEmotionalLearning?: string[];
  cookingMethods?: string[];
  mainIngredients?: string[];
  gardenSkills?: string[];
  cookingSkills?: string[];
  culturalHeritage?: string[];
  academicIntegration?: string[];
  observancesHolidays?: string[];
  culturalResponsivenessFeatures?: string[];
  processingNotes?: string;
}
