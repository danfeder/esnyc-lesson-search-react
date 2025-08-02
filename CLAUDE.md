# ESYNYC Lesson Search v2 - Project Documentation

## Project Overview

This is a modern React/TypeScript rewrite of the ESYNYC Lesson Search application. It provides a searchable interface for 831 Edible Schoolyard NYC lesson plans with advanced filtering capabilities.

### Current Status: IN DEVELOPMENT
The project has been migrated from vanilla JavaScript (v1) to React/TypeScript/Supabase stack (v2). Most features are implemented, with only Google Docs API integration and CSV export remaining.

## Essential Commands

### Development
```bash
npm run dev          # Start development server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # Run TypeScript type checking
```

### Code Quality
```bash
npm run lint         # Check code quality
npm run lint:fix     # Auto-fix linting issues
npm run format       # Format code with Prettier
```

### Testing
```bash
npm test             # Run all tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Generate coverage report
```

### Accessibility Testing
```bash
npm run test:lighthouse # Lighthouse accessibility audit
# Consider adding: npm run test:axe for WCAG compliance
```

### Data Management
```bash
npm run import-data  # Import lesson data to Supabase
npm run sync-algolia # Sync data to Algolia search
npm run configure-synonyms # Set up search synonyms
```

### Database
```bash
# Run migrations (in Supabase dashboard or CLI)
supabase db push
supabase db reset    # Reset database to clean state
```

## Code Style Guidelines

### TypeScript Conventions
- Use explicit types for function parameters and return values
- Prefer interfaces over types for object shapes
- Use path aliases: `@/components` instead of relative imports
- Export types from `src/types/index.ts`

### React Component Patterns
- Use functional components with hooks
- Place component files in feature folders (e.g., `components/Filters/GradeFilter.tsx`)
- Export component props interfaces
- Use descriptive prop names

### State Management (Zustand)
- Keep stores focused on single domains
- Use TypeScript for store interfaces
- Implement actions as methods on the store
- Example pattern:
```typescript
interface StoreState {
  items: Item[];
  setItems: (items: Item[]) => void;
  addItem: (item: Item) => void;
}
```

### Import Order
1. React imports
2. Third-party libraries
3. Local components
4. Hooks
5. Utils/constants
6. Types
7. Styles

## Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query)
- **Styling**: Tailwind CSS + Headless UI
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Search**: Algolia Search with synonyms and typo tolerance

### Key Improvements Over v1
- Server-side search with better performance for large datasets
- User authentication and personalization features
- Type safety with TypeScript
- Modern component-based architecture
- Database storage instead of static JSON

## Project Structure

```
/src
  /components     # Reusable UI components
    /Filters      # Filter sidebar components
    /Layout       # Header, footer, layout components
    /Modal        # Modal components
    /Results      # Search results components
    /Search       # Search bar components
  /hooks          # Custom React hooks
  /lib            # Utilities and Supabase client
  /pages          # Page-level components
  /stores         # Zustand state stores
  /types          # TypeScript type definitions
  /utils          # Helper functions

/supabase
  /functions      # Edge functions for API
  /migrations     # Database schema migrations

/data            # Legacy JSON data (to be imported to Supabase)
```

## Features

### Core Features (Must Have)
- Full-text search across lesson titles, summaries, ingredients, skills
- **EXACTLY 11 filter categories** (all implemented):
  
  **Implemented Filters (11 total):**
  1. Activity Type (Cooking, Garden, Both, Academic) - derived from skills
  2. Location (Indoor, Outdoor, Both)
  3. Grade Levels (3K through 8th with grade group selection)
  4. Thematic Categories (7 themes: Garden Basics, Plant Growth, Garden Communities, Ecosystems, Seed to Table, Food Systems, Food Justice)
  5. Season & Timing (4 seasons + Beginning/End of year + "Include year-round" option)
  6. Core Competencies (6 ESYNYC priorities)
  7. Cultural Heritage (hierarchical with 5 main regions)
  8. Lesson Format (Single period, Multi-session unit, etc.) - single-select dropdown
  9. Academic Integration (Math, Science, Literacy/ELA, Social Studies, Health, Arts) - multi-select
  10. Social-Emotional Learning (5 SEL competencies) - multi-select
  11. Cooking Methods (No-cook, Stovetop, Oven, Basic prep only) - single-select dropdown
  
  **Searchable But Not Filters (NOT counted in the 11):**
  - Observances & Holidays (handled through search functionality)
  - Main Ingredients (with smart grouping via search synonyms)
  - Garden Skills (searchable in lesson content)
  - Cooking Skills (searchable in lesson content)
  - Materials/Equipment (searchable in lesson content)
  - Group Size (searchable in lesson content)
  - Duration/Prep Time (searchable in lesson content)

- Cultural heritage hierarchy (e.g., "Asian" includes Chinese, Japanese, Korean)
- Ingredient grouping (e.g., "Winter squash" includes butternut, pumpkin)
- CSV export functionality
- Mobile-responsive design

### New v2 Features (Planned)
- User authentication
- Saved searches
- Lesson collections
- Bookmarking favorite lessons
- Teacher profiles

## Database Schema

### Main Tables
- `lessons` - Stores all lesson data with full-text search vector
- `user_profiles` - Teacher profiles with school/grade info
- `saved_searches` - User's saved filter combinations
- `lesson_collections` - Curated lesson lists
- `bookmarks` - User's bookmarked lessons

## Development Setup

### Prerequisites
- Node.js 18+
- Supabase account
- PostgreSQL (via Supabase)

### Environment Variables
Create `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ALGOLIA_APP_ID=your_algolia_app_id
VITE_ALGOLIA_SEARCH_API_KEY=your_algolia_search_api_key
ALGOLIA_ADMIN_API_KEY=your_algolia_admin_key (for data sync only, not in frontend)
```

### Installation
```bash
npm install
npm run dev
```

### Database Setup
1. Run migrations in Supabase
2. Import lesson data: `npm run import-data`

## Current Implementation Status

### Completed ✅
- [x] All 11 filter categories implemented
- [x] Search functionality with Algolia
- [x] User authentication system
- [x] Admin dashboard for submissions
- [x] Duplicate detection system
- [x] All UI components
- [x] Database schema and migrations
- [x] Testing setup

### Remaining Tasks 🚧
- [ ] Google Docs API integration (currently mocked)
- [ ] CSV export functionality
- [ ] OpenAI embeddings in edge functions
- [ ] Production environment configuration

## Project-Specific Instructions

### Working with Filters (EXACTLY 11 Categories)
- Never add or remove filter categories - there must be exactly 11
- Filter components are in `src/components/Filters/`
- Each filter updates the `filterStore` in Zustand
- Filters are registered in `src/utils/constants.ts`

### Adding New Features
1. Check if it affects the 11 filter categories rule
2. Add types to `src/types/index.ts`
3. Update relevant Zustand store
4. Create component in appropriate feature folder
5. Add tests for new functionality

### Working with Supabase
- Edge functions are in `supabase/functions/`
- Use `supabase.from('table').select()` pattern
- Always handle errors with try-catch
- RLS policies are enforced - check permissions

### Common Gotchas
- Environment variables must start with `VITE_` for frontend access
- Supabase migrations must be numbered sequentially
- Algolia search requires manual synonym configuration
- Cultural heritage uses hierarchical filtering (parent includes children)
- Google Docs API integration currently uses mock data


## Testing Checklist
- [ ] All filters work correctly
- [ ] Search returns relevant results
- [ ] Cultural hierarchy filtering works
- [ ] Ingredient grouping works
- [ ] CSV export includes all data
- [ ] Mobile responsive design
- [ ] Performance with full dataset

## Architecture Decisions

### Why These Technologies?
- **React + TypeScript**: Type safety and modern component patterns
- **Vite**: Fast development and optimized production builds
- **Zustand**: Lightweight state management without boilerplate
- **Supabase**: Integrated auth, database, and edge functions
- **Algolia**: Purpose-built search with typo tolerance and synonyms
- **Tailwind + Headless UI**: Rapid UI development with accessibility

### Database Design Rationale
- Single `lessons` table with JSONB for flexible metadata
- PostgreSQL full-text search for content
- Vector embeddings for future semantic search
- Normalized tables for user data and relationships

### Component Organization
- Feature-based folders for related components
- Shared components in root components folder
- Pages represent routes
- Hooks encapsulate reusable logic

## Deployment Notes
- Requires Supabase project setup
- Environment variables must be configured (see .env.example)
- Build with `npm run build`
- Deploy `dist` folder to hosting service
- Supports both Netlify and Vercel (see package.json scripts)

## Recursive CLAUDE.md Structure

Claude Code automatically discovers CLAUDE.md files throughout the project:

### Directory-Specific Context
```
/                           # This file - project overview
├── src/
│   ├── components/CLAUDE.md    # Component patterns
│   ├── hooks/CLAUDE.md         # Custom hook patterns
│   └── pages/CLAUDE.md         # Page structure patterns
├── supabase/
│   ├── functions/CLAUDE.md     # Edge function patterns
│   └── migrations/CLAUDE.md    # Migration guidelines
└── scripts/CLAUDE.md           # Data management scripts
```

### How It Works
- Claude reads CLAUDE.md files from current directory up to root
- When working in subdirectories, Claude automatically includes relevant context
- Each directory can have specific instructions for that area
- No manual imports needed - it's automatic!

### Import Strategy for Detailed Docs
For comprehensive documentation, import when needed:
```
@docs/api-reference.md         # Full API documentation
@docs/component-guide.md       # Detailed component guide
@docs/architecture-decisions.md # Architecture rationale
```

## Living Documentation

### When to Update CLAUDE.md
- New frequently-used commands added
- Architecture decisions made
- Common patterns established
- Gotchas discovered

### Quick Update Method
Start your message with `#` to quickly add to CLAUDE.md:
```
# npm run test:watch is useful for TDD
```

### Documentation Maintenance
- Review this file monthly
- Remove outdated information
- Keep focused on developer needs
- Import detailed docs when needed