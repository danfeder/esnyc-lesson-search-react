# TypeScript Type Definitions

## ⚠️ CRITICAL: Naming Conventions

YOU MUST follow these exact naming patterns:

```typescript
// Component Props - ALWAYS end with "Props"
interface ComponentNameProps { }
interface FilterSidebarProps { }

// Store States - ALWAYS end with "State"  
interface SearchState { }
interface AuthState { }

// API Responses - ALWAYS use generic wrapper
interface ApiResponse<T> { }
interface PaginatedResponse<T> { }

// Database vs Frontend field names
lessonId    // Frontend (camelCase)
lesson_id   // Database (snake_case)
```

## 🔄 Common Type Conversions

### Database ↔ Frontend
```typescript
// Database response (snake_case)
interface DBLesson {
  lesson_id: string;
  created_at: string;
  grade_levels: string[];
  cultural_heritage: string[];
}

// Frontend type (camelCase)
interface Lesson {
  lessonId: string;
  createdAt: string;
  gradeLevels: string[];
  culturalHeritage: string[];
}

// Conversion function
export function dbToFrontend(db: DBLesson): Lesson {
  return {
    lessonId: db.lesson_id,
    createdAt: db.created_at,
    gradeLevels: db.grade_levels,
    culturalHeritage: db.cultural_heritage,
  };
}
```

## 📋 Filter Type Rules

### Single-Select vs Multi-Select

```typescript
export interface SearchFilters {
  // Multi-select filters use string[]
  gradeLevels: string[];
  thematicCategories: string[];
  coreCompetencies: string[];
  culturalHeritage: string[];
  academicIntegration: string[];
  socialEmotionalLearning: string[];
  
  // Single-select filters use string
  lessonFormat: string;      // NOT string[]!
  cookingMethods: string;    // NOT string[]!
  
  // Search query
  query: string;
  
  // Boolean flags
  includeAllSeasons: boolean;
}
```

## 🚨 Common Type Errors & Solutions

### Optional vs Required Fields
```typescript
// ❌ WRONG - All fields required
interface LessonMetadata {
  thematicCategories: string[];  // Error if missing
  coreCompetencies: string[];
}

// ✅ CORRECT - Most metadata is optional
interface LessonMetadata {
  thematicCategories?: string[];  // Use ? for optional
  coreCompetencies: string[];     // Only required fields
}
```

### Union Types for Status
```typescript
// Review decision types
type ReviewDecision = 
  | 'approve_new' 
  | 'approve_update' 
  | 'reject' 
  | 'needs_revision';

// Submission status
type SubmissionStatus = 
  | 'draft' 
  | 'submitted' 
  | 'under_review' 
  | 'approved' 
  | 'rejected';
```

### Discriminated Unions
```typescript
// Filter change event types
type FilterAction =
  | { type: 'SET_FILTER'; key: string; value: string | string[] }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'TOGGLE_FILTER'; key: string; value: string };
```

## 📦 Export Pattern

ALL types MUST be exported from `index.ts`:

```typescript
// types/index.ts
export * from './lesson';
export * from './filters';
export * from './auth';
export * from './api';

// Re-export commonly used types
export type {
  Lesson,
  SearchFilters,
  User,
  ApiResponse,
} from './index';
```

## 🎯 Type Guards

```typescript
// Check if value is array (for filter types)
export function isMultiSelectFilter(
  key: keyof SearchFilters
): boolean {
  const multiSelectKeys = [
    'gradeLevels',
    'thematicCategories',
    'coreCompetencies',
    'culturalHeritage',
    'academicIntegration',
    'socialEmotionalLearning',
  ];
  return multiSelectKeys.includes(key);
}

// Type guard for API responses
export function isApiError(
  response: ApiResponse<any>
): response is ApiResponse<never> & { error: string } {
  return 'error' in response && response.error !== undefined;
}
```

## 🔧 Generic Types

### API Response Wrapper
```typescript
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

// Usage
const response: ApiResponse<Lesson[]> = await fetchLessons();
if (response.error) {
  // Handle error
} else {
  // Use response.data
}
```

### Paginated Response
```typescript
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}
```

## 🏗️ Complex Type Patterns

### Hierarchical Data
```typescript
export interface CulturalRegion {
  id: string;
  name: string;
  subregions: CulturalSubregion[];
  expanded: boolean;  // UI state
}

export interface CulturalSubregion {
  id: string;
  name: string;
  cultures: string[];
  expanded: boolean;
}
```

### Partial Updates
```typescript
// For PATCH operations
export type LessonUpdate = Partial<Omit<Lesson, 'lessonId' | 'createdAt'>>;

// Usage
const update: LessonUpdate = {
  title: 'New Title',
  // Other fields optional
};
```

### Strict Object Keys
```typescript
// Ensure only valid filter keys
export type FilterKey = keyof SearchFilters;

// Function that only accepts valid keys
function updateFilter<K extends FilterKey>(
  key: K,
  value: SearchFilters[K]
) {
  // Type-safe filter update
}
```

## ⚠️ NEVER DO THIS

```typescript
// ❌ Using 'any'
let data: any = fetchData();

// ✅ Use 'unknown' and type guards
let data: unknown = fetchData();
if (isLesson(data)) {
  // Now TypeScript knows it's a Lesson
}

// ❌ String literals without const
let role = 'admin';

// ✅ Use const assertion or enum
const role = 'admin' as const;
// or
enum UserRole {
  Teacher = 'teacher',
  Reviewer = 'reviewer',
  Admin = 'admin',
}
```

## 📐 Utility Types

```typescript
// Make all properties optional except specified
type RequireOnly<T, K extends keyof T> = 
  Partial<T> & Pick<T, K>;

// Usage: Lesson with only required fields
type MinimalLesson = RequireOnly<Lesson, 'lessonId' | 'title'>;

// Deep partial for nested objects
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object 
    ? DeepPartial<T[P]> 
    : T[P];
};
```