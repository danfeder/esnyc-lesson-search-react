# TypeScript Guidelines

## Naming Conventions

| Type | Suffix | Example |
|------|--------|---------|
| Component Props | `Props` | `FilterSidebarProps` |
| Store State | `State` | `SearchState` |
| API Response | Generic | `ApiResponse<T>` |

## Case Conventions

```typescript
// Database (snake_case)
lesson_id, created_at, grade_levels

// Frontend (camelCase)
lessonId, createdAt, gradeLevels
```

## Filter Types

```typescript
// Single-select: string
lessonFormat: string;
cookingMethods: string;

// Multi-select: string[]
gradeLevels: string[];
coreCompetencies: string[];
```

## Key Patterns

```typescript
// Optional fields
interface LessonMetadata {
  thematicCategories?: string[];  // Use ? for optional
}

// Union types for status
type ReviewDecision = 'approve_new' | 'reject' | 'needs_revision';

// Generic response wrapper
interface ApiResponse<T> {
  data: T;
  error?: string;
}
```

## Export from index.ts

```typescript
export * from './lesson';
export * from './filters';
export type { Lesson, SearchFilters, User } from './index';
```

## Avoid

- `any` type - use `unknown` with type guards
- String literals without `as const`
- Direct object mutation
