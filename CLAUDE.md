# ESYNYC Lesson Search v2

## Quick Commands

```bash
# Development
npm run dev               # Start dev server (localhost:5173)
npm run type-check        # Required before commits
npm run lint:fix          # Auto-fix ESLint issues
npm run test              # Run all tests
npm run build             # Production build

# Database
npm run test:rls          # Test RLS policies (run after migrations)
npm run import-data       # Import lesson data to Supabase
supabase db push          # Apply migrations
supabase db reset         # Reset database
```

## Core Constraints

| Rule | Details |
|------|---------|
| **Filters** | Filter categories defined in `filterDefinitions.ts` - consult stakeholders before changes |
| **Logging** | Use `logger.debug()` from `@/utils/logger`, not `console.log` |
| **Env Vars** | Frontend vars require `VITE_` prefix |
| **Imports** | Use `@/` path aliases, not relative paths |
| **Pre-commit** | `npm run type-check` and `npm run lint` must pass |
| **RLS Testing** | Run `npm run test:rls` after any database migration |

## Filter Categories

Defined in `src/utils/filterDefinitions.ts`. Consult stakeholders before adding or removing filters.

**Current filters:**
- Activity Type (single-select)
- Location (single-select)
- Grade Levels (multi-select, grouped)
- Thematic Categories (multi-select)
- Season & Timing (single-select)
- Core Competencies (multi-select)
- Cultural Heritage (hierarchical multi-select)
- Lesson Format (single-select)
- Academic Integration (multi-select)
- Social-Emotional Learning (multi-select)
- Cooking Methods (single-select)

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **State**: Zustand
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Search**: PostgreSQL full-text search with synonym/typo expansion
- **Testing**: Vitest + React Testing Library

## Project Structure

```
src/
  components/     # UI components (each has CLAUDE.md)
  hooks/          # Custom React hooks
  lib/            # Supabase/Sentry configs
  pages/          # Route components
  stores/         # Zustand stores
  types/          # TypeScript definitions
  utils/          # Helpers, constants, filterDefinitions

supabase/
  functions/      # Edge functions (detect-duplicates, process-submission, etc.)
  migrations/     # Database schema

scripts/          # Data import, testing scripts
```

## Key Patterns

### ESLint Unused Parameters
```typescript
interface Props {
  // eslint-disable-next-line no-unused-vars
  onChange: (value: string) => void;
}
```

### Cultural Heritage Hierarchy
Parent selection includes all children. Selecting "Asian" automatically includes Chinese, Japanese, Korean, etc.

### Component Props
Name interfaces with `Props` suffix: `ComponentNameProps`

### Store Actions
Reset `currentPage` to 1 whenever filters change.

## Database

### Key Tables
- `lessons` - 831 lesson plans with FTS
- `user_profiles` - Users with roles
- `lesson_submissions` - Teacher submissions
- `duplicate_pairs` - Duplicate detection

### Role Hierarchy
`super_admin > admin > reviewer > teacher`

### RLS Debugging
```sql
SELECT * FROM user_profiles WHERE id = auth.uid();
SELECT is_admin(auth.uid());
```

## Common Errors

| Error | Fix |
|-------|-----|
| RLS policy violation | Check role with `is_admin(auth.uid())` |
| Module not found | Use `@/` imports |
| VITE_* undefined | Add `VITE_` prefix |

## Current Status

- Google Docs API: Working in production
- OpenAI embeddings: Working in production
- CSV export: Not yet implemented

## Documentation

Directory-specific guidance in each folder's `CLAUDE.md`:
- `src/components/` - Component patterns
- `src/stores/` - Zustand patterns
- `src/hooks/` - Hook patterns
- `src/types/` - TypeScript conventions
- `src/utils/` - Constants and utilities
- `supabase/functions/` - Edge function patterns
- `supabase/migrations/` - Migration guidelines
- `scripts/` - Data management
