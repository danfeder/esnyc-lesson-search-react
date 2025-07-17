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
  gradeLevel?: string[];
  gardenSkills?: string[];
  cookingSkills?: string[];
  cookingMethods?: string[];
}

// Search and filter types
export interface SearchFilters {
  query: string;
  gradeLevels: string[];
  thematicCategories: string[];
  seasons: string[];
  coreCompetencies: string[];
  culturalHeritage: string[];
  location: string[];
  activityType: string[];
  lessonFormat: string[];
  academicIntegration: string[];
  socialEmotionalLearning: string[];
  cookingMethods: string; // Single-select, so string not array
  includeAllSeasons: boolean;
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

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters: SearchFilters;
  created_at: string;
}

export interface LessonCollection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  lesson_ids: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  lesson_id: string;
  created_at: string;
}

// UI state types
export interface ViewState {
  view: 'grid' | 'list';
  sortBy: 'title' | 'confidence' | 'grade' | 'modified';
  resultsPerPage: number;
  currentPage: number;
}

// Grade level groupings for UI
export interface GradeGroup {
  id: string;
  name: string;
  grades: string[];
  expanded: boolean;
}

// Cultural heritage hierarchy for UI
export interface CulturalRegion {
  id: string;
  name: string;
  subregions: CulturalSubregion[];
  expanded: boolean;
}

export interface CulturalSubregion {
  id: string;
  name: string;
  cultures: string[];
  expanded: boolean;
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
