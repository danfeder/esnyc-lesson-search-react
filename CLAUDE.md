# ESYNYC Lesson Search v2 - Claude Code Documentation

## 🚀 QUICK COMMANDS - RUN THESE FREQUENTLY

```bash
npm run dev               # Start development server (http://localhost:5173)
npm run type-check        # YOU MUST run before any commit
npm run lint:fix          # YOU MUST run to fix ESLint issues  
npm run test              # Run all tests
npm run test:rls          # Test RLS policies after DB changes
npm run build             # Build for production

# Data Management
npm run import-data       # Import lesson data to Supabase
npm run sync-algolia      # Sync data to Algolia search
npm run configure-synonyms # Set up search synonyms

# Database
supabase db push          # Apply migrations
supabase db reset         # Reset database to clean state
```

## ⚠️ CRITICAL RULES - NEVER VIOLATE THESE

1. **EXACTLY 11 FILTERS** - NEVER add or remove filter categories. There must be EXACTLY 11.
2. **NO console.log** in production code - Use `logger.debug()` from `utils/logger.ts` instead
3. **VITE_ PREFIX REQUIRED** for ALL frontend environment variables
4. **RUN TYPE-CHECK** before EVERY commit - `npm run type-check` MUST pass
5. **TEST RLS POLICIES** after ANY migration - `npm run test:rls` MUST pass
6. **ESLint no-unused-vars** - Add `// eslint-disable-next-line no-unused-vars` for parameters
7. **Path Aliases** - ALWAYS use `@/components` not relative imports like `../components`
8. **Google Docs API** - Currently MOCKED, returns fake data (see extract-google-doc function)

## 🔥 COMMON WORKFLOWS

### Adding a New Component
```bash
1. YOU MUST check if it affects the 11 filters rule
2. Create in feature folder: components/FeatureName/ComponentName.tsx
3. Define Props interface: interface ComponentNameProps { }
4. Export from barrel: Add to components/FeatureName/index.ts
5. Run type-check: npm run type-check
6. Fix ESLint: npm run lint:fix
```

### Debugging Supabase RLS Errors
```bash
1. Run: npm run test:rls
2. Check user role: SELECT * FROM user_profiles WHERE id = auth.uid()
3. Test function: SELECT is_admin(auth.uid())
4. NEVER disable RLS without admin approval
5. Common fix: Check if table has RLS enabled in migration
```

### Working with Filters (EXACTLY 11)
```typescript
// The 11 filters are sacred - NEVER change count:
1. Activity Type        7. Cultural Heritage
2. Location            8. Lesson Format  
3. Grade Levels        9. Academic Integration
4. Thematic Categories 10. Social-Emotional Learning
5. Season & Timing     11. Cooking Methods
6. Core Competencies

// Located in: src/utils/filterDefinitions.ts
```

### ESLint Parameter Fixes
```typescript
// ALWAYS add this comment for unused parameters:
// eslint-disable-next-line no-unused-vars
onChange: (value: string) => void;
```

## 🏗️ PROJECT STRUCTURE

```
/src
  /components     # UI components (filters, layout, modals, results, search)
  /hooks          # Custom React hooks  
  /lib            # Supabase, Algolia, Sentry configs
  /pages          # Page components (routes)
  /stores         # Zustand state management
  /types          # TypeScript definitions
  /utils          # Helper functions, constants

/supabase
  /functions      # Edge functions (detect-duplicates, process-submission, etc.)
  /migrations     # Database schema (01-11 + dated migrations)

/scripts         # Data import, testing, migration scripts
/data           # Legacy JSON data
```

## 📋 CURRENT STATUS

**IN DEVELOPMENT** - Most features complete, remaining:
- [ ] Google Docs API integration (currently mocked)
- [ ] CSV export functionality  
- [ ] OpenAI embeddings in edge functions
- [ ] Production environment configuration

## 🔧 TECH STACK

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **State**: Zustand (see `/src/stores/CLAUDE.md`)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Search**: Algolia (with synonyms & typo tolerance)
- **Testing**: Vitest + React Testing Library

## 🗄️ DATABASE ESSENTIALS

### Key Tables
- `lessons` - 831 lesson plans with full-text search
- `user_profiles` - User accounts with roles (teacher/reviewer/admin)
- `lesson_submissions` - Teacher-submitted lessons
- `duplicate_pairs` - Duplicate detection results

### User Roles Hierarchy
```
super_admin → admin → reviewer → teacher
```

## 🐛 COMMON ERRORS & SOLUTIONS

| Error | Solution |
|-------|----------|
| "RLS policy violation" | Check user role with `is_admin(auth.uid())` |
| "no-unused-vars" | Add `// eslint-disable-next-line no-unused-vars` |
| "Module not found" | Use `@/` alias imports |
| "VITE_* not defined" | Prefix env vars with `VITE_` |
| "Cannot read lessons" | Check if RLS enabled: `ALTER TABLE lessons ENABLE ROW LEVEL SECURITY` |
| "Type error in filter" | Verify against 11 filters in `filterDefinitions.ts` |

## 📚 DETAILED DOCUMENTATION

For in-depth information, see:
- Architecture: `/docs/architecture-decisions.md`
- Database Schema: `/docs/DATABASE_SAFETY_CHECKLIST.md`
- Testing Guide: `/docs/TESTING_GUIDE.md`
- Deployment: `/docs/DEPLOYMENT_CHECKLIST.md`
- RLS Security: `/docs/RLS_SECURITY.md`

## 🚦 QUICK CHECKLIST BEFORE COMMIT

```bash
✓ npm run type-check      # No TypeScript errors
✓ npm run lint            # No linting errors  
✓ npm test                # All tests pass
✓ No console.log          # Use logger.debug()
✓ 11 filters maintained   # Count unchanged
```

## 💡 IMPORTANT REMINDERS

- **Cultural Heritage Hierarchy**: Parent includes ALL children (e.g., "Asian" → Chinese, Japanese, Korean, etc.)
- **Ingredient Grouping**: Smart search (e.g., "butternut squash" → "Winter squash")
- **Season Logic**: "Include year-round" option for seasonal filters
- **Supabase Migrations**: Must be numbered sequentially
- **Algolia Synonyms**: Require manual configuration after data sync
- **Edge Functions**: Test locally with `supabase functions serve <name> --no-verify-jwt`

## 📂 DIRECTORY-SPECIFIC DOCS

Each directory has its own Claude.md for context-specific guidance:
- `/src/components/CLAUDE.md` - Component patterns
- `/src/stores/CLAUDE.md` - Zustand store patterns  
- `/src/hooks/CLAUDE.md` - Custom hook patterns
- `/src/types/CLAUDE.md` - TypeScript conventions
- `/src/utils/CLAUDE.md` - Constants & utilities
- `/src/lib/CLAUDE.md` - External library configs
- `/supabase/functions/CLAUDE.md` - Edge function patterns
- `/supabase/migrations/CLAUDE.md` - Migration guidelines
- `/scripts/CLAUDE.md` - Data management scripts