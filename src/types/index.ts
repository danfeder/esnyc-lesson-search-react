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
  confidence: {
    overall: number;
    title: number;
    summary: number;
    gradeLevels: number;
  };
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
  lessonFormat: string[];
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
  lessonFormat: string; // Single-select dropdown
  academicIntegration: string[];
  socialEmotionalLearning: string[];
  cookingMethods: string[]; // Multi-select
}

export interface FacetCount {
  value: string;
  count: number;
}

// User and authentication types
export interface User {
  id: string;
  email: string;
  profile: UserProfile;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  school?: string;
  grades_taught: string[];
  subjects: string[];
  created_at: string;
  updated_at: string;
}

// UI state types
export interface ViewState {
  sortBy: 'title' | 'confidence' | 'grade' | 'modified' | 'relevance';
  resultsPerPage: number;
  currentPage: number;
}

// Review types for submission processing
export interface ReviewMetadata {
  activityType?: string; // Single select for review
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
  lessonFormat?: string; // Single select for review
  academicIntegration?: string[];
  observancesHolidays?: string[];
  culturalResponsivenessFeatures?: string[];
  processingNotes?: string;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  totalPages: number;
}
