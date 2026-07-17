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
  // Drive provenance (public subset — file id and sync/verified timestamps are
  // deliberately NOT part of the public domain type). Dates are ISO strings
  // from the RPC; attribution/source are narrowed to the trusted unions at
  // mapping time (mapRowToLesson) so the drawer's safety gate stays simple.
  driveMimeType?: string;
  driveCreatedAt?: string;
  driveModifiedAt?: string;
  driveCreatorName?: string;
  driveCreatorAttribution?: 'created' | 'adapted';
  driveCreatorSource?: 'drive_activity' | 'reviewer_confirmed';
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
  // NOTE: pagination is NOT stored here — it lives in React Query as the
  // infinite-query `pageParam` (see useLessonSearch). A filter/sort change
  // rebuilds the query key, which restarts the query at page 0 for free, so
  // the store never needs a currentPage field (FP4 Brief 4 item 4).
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
  // Drive provenance — the reviewer's creator confirmation. Defaults to
  // omitted; 'created'/'adapted' require a safe public full name. The server
  // (complete_review_atomic) derives source + verified time — the client
  // never sends them.
  driveCreatorAttribution?: 'created' | 'adapted' | 'omit';
  driveCreatorName?: string;
}
