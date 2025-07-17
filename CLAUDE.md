# ESNYC Lesson Search v2 - Project Documentation

## Project Overview

This is a modern React/TypeScript rewrite of the ESNYC Lesson Search application. It provides a searchable interface for 831 Edible Schoolyard NYC lesson plans with advanced filtering capabilities.

### Current Status: IN DEVELOPMENT
The project is transitioning from a vanilla JavaScript implementation (v1) to a React/TypeScript/Supabase stack (v2). The v1 files are still present but should be removed.

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
- 11 filter categories (all implemented):
  
  **Implemented Filters:**
  - Activity Type (Cooking, Garden, Both, Academic) - derived from skills
  - Location (Indoor, Outdoor, Both)
  - Grade Levels (3K through 8th with grade group selection)
  - Thematic Categories (7 themes: Garden Basics, Plant Growth, Garden Communities, Ecosystems, Seed to Table, Food Systems, Food Justice)
  - Season & Timing (4 seasons + Beginning/End of year + "Include year-round" option)
  - Core Competencies (6 ESNYC priorities)
  - Cultural Heritage (hierarchical with 5 main regions)
  - Lesson Format (Single period, Multi-session unit, etc.) - single-select dropdown
  - Academic Integration (Math, Science, Literacy/ELA, Social Studies, Health, Arts) - multi-select
  - Social-Emotional Learning (5 SEL competencies) - multi-select
  - Cooking Methods (No-cook, Stovetop, Oven, Basic prep only) - single-select dropdown
  
  **Searchable But Not Filters:**
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

## Current Tasks

### Phase 1: Cleanup & Setup ✅
- [x] Remove legacy v1 files
- [x] Create proper React index.html
- [x] Install missing dependencies
- [x] Create .env.example

### Phase 2: Core Implementation 🚧
- [ ] Create src/index.css with Tailwind
- [ ] Implement TypeScript interfaces
- [ ] Complete Zustand store
- [ ] Implement all components

### Phase 3: Feature Parity
- [ ] Implement all v1 filters
- [ ] Add CSV export
- [ ] Test with real data

### Phase 4: New Features
- [ ] User authentication
- [ ] Saved searches
- [ ] Collections

## Important Commands

```bash
# Development
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Data Management
npm run import-data  # Import lessons to Supabase

# Linting & Formatting
npm run lint         # Run ESLint
npm run format       # Run Prettier
```

## Component Status

### Implemented ✅
- App.tsx - Main app shell
- SearchPage.tsx - Main search page
- Basic component structure

### Needs Implementation 🚧
- All filter components
- Search functionality
- Results display
- Modal details
- CSV export

## Known Issues
1. Legacy v1 files still present
2. Missing dependencies need installation
3. Components are scaffolded but not fully implemented
4. Supabase connection needs testing

## Next Steps
1. Remove all v1 files (index.html, search.js, styles.css, server.js)
2. Create new Vite-compatible index.html
3. Install missing npm packages
4. Implement core components
5. Test Supabase integration

## Testing Checklist
- [ ] All filters work correctly
- [ ] Search returns relevant results
- [ ] Cultural hierarchy filtering works
- [ ] Ingredient grouping works
- [ ] CSV export includes all data
- [ ] Mobile responsive design
- [ ] Performance with full dataset

## Deployment Notes
- Requires Supabase project setup
- Environment variables must be configured
- Build with `npm run build`
- Deploy `dist` folder to hosting service