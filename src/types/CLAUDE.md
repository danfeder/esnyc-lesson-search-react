# TypeScript Guidelines

> **`database.types.ts` is generated, not hand-written** (`npm run db:types` / `db:types:remote`), and is ~1,600 lines. **Don't read it whole** — `grep` for the specific table/column/type name you need. Never hand-edit it; regenerate from the schema instead.

## Naming Conventions

| Type | Suffix | Example |
|------|--------|---------|
| Component Props | `Props` | `FilterSidebarProps` |
| Store State | `State` | `SearchState` |

## Case Conventions

```typescript
// Database (snake_case)
lesson_id, created_at, grade_levels

// Frontend (camelCase)
lessonId, createdAt, gradeLevels
```

## Filter Types

```typescript
// Multi-select: string[]
gradeLevels: string[];
coreCompetencies: string[];
cookingMethods: string[];
```

## Key Patterns

```typescript
// Optional fields
interface LessonMetadata {
  thematicCategories?: string[];  // Use ? for optional
}

// Union types for status
type ReviewDecision = 'approve_new' | 'reject' | 'needs_revision';
```

## Export from index.ts

```typescript
export * from './lesson';
export * from './filters';
export type { Lesson, SearchFilters } from './index';
```

## Avoid

- `any` type - use `unknown` with type guards
- String literals without `as const`
- Direct object mutation
