# Architecture Decision Records (ADRs)

## Overview

This document captures the key architectural decisions made for the ESYNYC Lesson Search v2 project, including the context, decision, and rationale for each choice.

## ADR-001: Migration from Vanilla JS to React/TypeScript

### Status
Accepted

### Context
The v1 application was built with vanilla JavaScript, jQuery, and static JSON files. This approach had limitations:
- Difficult to maintain and scale
- No type safety
- Poor performance with 831+ lessons
- Limited user features (no auth, personalization)

### Decision
Migrate to a modern React/TypeScript stack with:
- React 19 for UI
- TypeScript for type safety
- Vite for build tooling
- Supabase for backend

### Consequences
- **Positive**: Better maintainability, type safety, modern tooling
- **Negative**: Learning curve for team, migration effort

## ADR-002: Zustand for State Management

### Status
Accepted

### Context
We needed state management for filters, search results, and user data. Options considered:
- Redux: Powerful but complex
- Context API: Built-in but can cause performance issues
- Zustand: Lightweight and simple
- MobX: Reactive but different paradigm

### Decision
Use Zustand for its simplicity and minimal boilerplate.

### Rationale
- Small bundle size (8kb)
- TypeScript support out of the box
- No providers needed
- DevTools support
- Easy to learn

### Consequences
- **Positive**: Quick to implement, easy to understand
- **Negative**: Less ecosystem than Redux

## ADR-003: Supabase as Backend Platform

### Status
Accepted

### Context
Needed a backend solution that provides:
- Database (PostgreSQL)
- Authentication
- Real-time subscriptions
- Edge functions
- File storage

### Decision
Use Supabase as an all-in-one backend platform.

### Rationale
- Open source alternative to Firebase
- PostgreSQL gives us full-text search
- Built-in auth with RLS
- Edge functions for serverless compute
- Excellent DX with TypeScript

### Consequences
- **Positive**: Rapid development, integrated solution
- **Negative**: Vendor lock-in, learning curve for RLS

## ADR-004: Algolia for Search (Superseded)

### Status
Accepted

### Context
While PostgreSQL full-text search is good, we needed:
- Typo tolerance
- Synonym support
- Faceted search
- Fast response times
- Search analytics

### Decision
Superseded by PostgreSQL full-text search in 2025-09. Historical reference only.

### Rationale
- Purpose-built for search UX
- Excellent React integration
- Handles synonyms natively
- Sub-50ms response times
- Free tier sufficient for our needs

### Consequences
- **Positive**: Superior search experience
- **Negative**: Additional service dependency, sync complexity

## ADR-005: Tailwind CSS + Headless UI

### Status
Accepted

### Context
Needed a CSS solution that:
- Supports rapid prototyping
- Maintains consistency
- Works well with components
- Has good accessibility

### Decision
Use Tailwind CSS with Headless UI components.

### Rationale
- Utility-first approach matches component architecture
- Headless UI provides accessible primitives
- No CSS-in-JS runtime overhead
- Excellent dark mode support
- Tree-shaking removes unused styles

### Consequences
- **Positive**: Fast development, consistent design
- **Negative**: HTML can get verbose, learning curve

## ADR-006: Filter Categories (Updated)

### Status
Superseded (Nov 2025)

### Context
User research and stakeholder requirements identified many possible filter options. Need to balance functionality with usability.

### Original Decision (2024)
Implement exactly 11 filter categories, with additional attributes searchable but not filterable.

### Updated Decision (Nov 2025)
Filter count is no longer fixed. Filter categories can be added or removed as needed, with stakeholder consultation. All filters are defined in `filterDefinitions.ts`.

### Rationale for Update
- Project optimization efforts require flexibility
- Fixed count was overly restrictive
- Stakeholder consultation ensures appropriate changes

### Consequences
- **Positive**: More flexibility for optimization
- **Negative**: Changes require coordination with stakeholders

## ADR-007: PostgreSQL JSONB for Flexible Metadata

### Status
Accepted

### Context
Lesson metadata varies significantly and may evolve over time. Need flexible schema without constant migrations.

### Decision
Use PostgreSQL JSONB column for lesson metadata with TypeScript interfaces for type safety.

### Rationale
- Flexible schema evolution
- Still queryable with PostgreSQL
- GIN indexes for performance
- Type safety in application layer

### Consequences
- **Positive**: Flexibility, no migration hell
- **Negative**: Less database-level validation

## ADR-008: Edge Functions for Serverless API

### Status
Accepted

### Context
Need API endpoints for search, processing, and integrations without managing servers.

### Decision
Use Supabase Edge Functions (Deno runtime) for all API logic.

### Rationale
- Serverless scaling
- Co-located with database
- TypeScript support
- No cold start issues with Deno
- Built-in CORS handling

### Consequences
- **Positive**: No server management, automatic scaling
- **Negative**: Deno ecosystem smaller than Node.js

## ADR-009: React Query for Data Fetching

### Status
Accepted

### Context
Need robust data fetching with caching, synchronization, and optimistic updates.

### Decision
Use TanStack Query (React Query) for all data fetching.

### Rationale
- Powerful caching strategies
- Background refetching
- Optimistic updates
- DevTools for debugging
- Handles race conditions

### Consequences
- **Positive**: Robust data synchronization
- **Negative**: Additional abstraction layer

## ADR-010: Component-First Architecture

### Status
Accepted

### Context
Need to organize code for a team and ensure reusability.

### Decision
Organize by feature/component rather than by file type.

### Rationale
- Co-locates related code
- Easier to find components
- Natural code splitting boundaries
- Encourages reusability

### Example
```
components/
  Filters/
    GradeFilter.tsx
    GradeFilter.test.tsx
    GradeFilter.stories.tsx
```

### Consequences
- **Positive**: Better organization, easier navigation
- **Negative**: Some shared utilities need common folder

## ADR-011: Mock First Development

### Status
Accepted

### Context
External integrations (Google Docs API, OpenAI) require API keys and setup that may block development.

### Decision
Implement mock versions first, real integrations second.

### Rationale
- Unblocks frontend development
- Allows testing without API costs
- Clear interface definition
- Easy to swap implementations

### Consequences
- **Positive**: Faster development, clear contracts
- **Negative**: Risk of mock/real divergence

## ADR-012: Row Level Security (RLS)

### Status
Accepted

### Context
Need fine-grained access control for different user roles.

### Decision
Use Supabase RLS policies for all data access control.

### Rationale
- Security at database level
- Cannot be bypassed
- Declarative policies
- Works with real-time subscriptions

### Consequences
- **Positive**: Robust security model
- **Negative**: Complex policies, performance impact

## ADR-013: Git Branching Strategy

### Status
Proposed

### Context
Need a branching strategy for team collaboration.

### Decision
Use GitHub Flow with protected main branch.

### Rationale
- Simple and proven
- Works well with CI/CD
- Feature branches for isolation
- PR reviews for quality

### Consequences
- **Positive**: Clear workflow, quality gates
- **Negative**: Requires discipline

## ADR-014: Error Handling Strategy

### Status
Accepted

### Context
Need consistent error handling across the application.

### Decision
- Error boundaries for React components
- Try-catch in edge functions
- User-friendly error messages
- Detailed logs in development

### Rationale
- Prevents white screen of death
- Better user experience
- Easier debugging

### Consequences
- **Positive**: Robust application, better UX
- **Negative**: Additional error handling code

## ADR-015: Testing Strategy

### Status
Accepted

### Context
Need to ensure quality and prevent regressions.

### Decision
- Vitest for unit tests
- React Testing Library for components
- Playwright for E2E tests (future)
- 80% coverage target

### Rationale
- Fast test execution
- Good React ecosystem support
- Realistic component testing
- Balance coverage vs effort

### Consequences
- **Positive**: Quality assurance, refactoring confidence
- **Negative**: Test maintenance overhead

## Future Decisions

### Pending Decisions
1. **Monitoring/Observability**: How to monitor production
2. **CI/CD Pipeline**: Automated testing and deployment
3. **Caching Strategy**: Redis or Supabase caching
4. **File Storage**: Approach for lesson PDFs/media
5. **Analytics**: User behavior tracking approach

### Decision Template
```markdown
## ADR-XXX: [Decision Title]

### Status
[Proposed | Accepted | Deprecated | Superseded]

### Context
[What is the issue we're facing?]

### Decision
[What have we decided to do?]

### Rationale
[Why did we make this decision?]

### Consequences
- **Positive**: [What good comes from this?]
- **Negative**: [What are the trade-offs?]
```
