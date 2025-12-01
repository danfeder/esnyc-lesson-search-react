# Tech Debt Execution Plan

## Part 1: Quick Wins (Execute Now)

### 1.1 Delete Dangerous Documentation
- [ ] Delete `docs/development/FIXES_NEEDED.md` (references wrong icon library)

### 1.2 Remove Unused NPM Packages
- [ ] Remove `tiktoken` from dependencies
- [ ] Remove `csv-parse` from dependencies
- [ ] Move `openai` to devDependencies
- [ ] Run `npm audit fix`
- [ ] Verify build still works

### 1.3 Remove Dead Code - Exports
- [ ] Remove `withProtection` HOC from `src/components/Auth/ProtectedRoute.tsx`
- [ ] Remove `withProtection` from `src/components/Auth/index.ts` barrel export
- [ ] Remove `ErrorBoundaryTest` from `src/components/Common/index.ts` barrel export

### 1.4 Remove Dead Code - Unused Functions
- [ ] Remove `isFeatureEnabled()` from `src/utils/featureFlags.ts`
- [ ] Remove `getAllFeatureFlags()` from `src/utils/featureFlags.ts`
- [ ] Remove `isUniqueConstraintError()` from `src/utils/errorHandling.ts`
- [ ] Remove unused functions from `src/utils/virtualization.ts`:
  - `calculateOptimalHeight()`
  - `getColumnCount()`
  - `calculateColumnWidth()`
  - `getOverscanCount()`

### 1.5 Documentation Quick Fixes
- [ ] Condense Algolia section in `src/lib/CLAUDE.md` to 3 lines
- [ ] Update date in `docs/IMPLEMENTATION_STATUS.md`

### 1.6 Verification
- [ ] Run `npm run type-check`
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Run `npm test`

---

## Part 2: GitHub Issues to Create

### Issue Template

```markdown
## Description
[What needs to be done]

## Files Affected
- `path/to/file.ts`

## Acceptance Criteria
- [ ] Specific task 1
- [ ] Specific task 2
- [ ] Tests pass
- [ ] Type-check passes

## Priority
[Critical/High/Medium/Low]

## Estimated Effort
[X hours/days]

## Labels
tech-debt, [category]
```

### Issues to Create

#### Category: Dead Code Cleanup
1. **Remove unused type definitions** - Low priority
   - Files: `src/types/index.ts`
   - Items: `SavedSearch`, `LessonCollection`, `Bookmark`, `GradeGroup`, `CulturalRegion`, `CulturalSubregion`
   - Effort: 1 hour

2. **Remove/archive unused filter helper functions** - Low priority
   - Files: `src/utils/filterHelpers.ts`
   - Items: `matchesCulturalHeritage()`, `matchesTextSearch()`, `matchesActivityType()`, `matchesSeasonFilter()`
   - Effort: 1 hour

#### Category: Scripts Maintenance
3. **Update or delete broken shell scripts** - High priority
   - Files: `scripts/deploy-edge-functions.sh`, `scripts/apply-production-migration.sh`
   - Effort: 2 hours

4. **Archive one-time migration scripts** - Medium priority
   - Files: `scripts/resume-gemini-embeddings.ts`, `scripts/recover-failed-lessons.ts`
   - Effort: 30 minutes

#### Category: Documentation Cleanup
5. **Archive obsolete documentation** - Medium priority
   - Create `docs/archive/` directory
   - Move: `MIGRATION_WORKFLOW_PLAN.md`, duplicate detection docs (6 files), architecture cleanup docs
   - Effort: 1 hour

6. **Review and update planning documents** - Medium priority
   - Files: `CLAUDE_ACTIONS_ENHANCEMENT_PLAN.md`, `SUPABASE_IMPROVEMENTS_PLAN.md`
   - Check implementation status, archive completed items
   - Effort: 2 hours

#### Category: Type Safety
7. **Fix type safety in ReviewDetail.tsx** - High priority
   - Lines: 184, 236, 252, 292, 327, 438
   - Create proper interfaces for submission data
   - Effort: 3-4 hours

8. **Fix type safety in AdminDuplicates pages** - Medium priority
   - Files: `AdminDuplicates.tsx`, `AdminDuplicateDetail.tsx`
   - Create `DuplicateAnalysisReport` interface
   - Effort: 2-3 hours

9. **Fix type safety in AdminAnalytics.tsx** - Medium priority
   - Create `ActivityRecord` interface
   - Type chart data properly
   - Effort: 2 hours

10. **Fix `as any` assertions** - High priority
    - Files: `ReviewActions.tsx:33`, `GoogleDocEmbed.tsx:102`, `AdminUsers.tsx:545`
    - Effort: 1-2 hours

#### Category: Pattern Standardization
11. **Standardize component declarations** - Medium priority
    - Convert `function Component()` to `const Component: React.FC<Props>`
    - Files: Auth/*, Review/*, Schools/*
    - Effort: 2-3 hours

12. **Standardize Supabase error handling** - Medium priority
    - Implement consistent try-catch-finally pattern
    - Files: Schools/*, various pages
    - Effort: 2-3 hours

#### Category: Test Coverage
13. **Unblock FilterModal tests** - High priority
    - Either fix Headless UI mocking or convert to E2E tests
    - 44 tests currently skipped
    - Effort: 4-6 hours

14. **Add SearchPage integration tests** - High priority
    - Test search + filter flow
    - Test pagination
    - Test URL parameter sync
    - Effort: 4-6 hours

15. **Add hook tests** - Medium priority
    - `useLessonSearch`, `useEnhancedAuth`, `useLessonSuggestions`, `useLessonStats`, `useDebounce`
    - Effort: 4-6 hours

16. **Add component tests for core UI** - Medium priority
    - `LessonModal`, `LessonCard`, `ResultsGrid`
    - Effort: 3-4 hours

17. **Expand RLS policy tests** - Medium priority
    - Add tests for all 15+ tables
    - Test role-based access
    - Effort: 3-4 hours

#### Category: Features
18. **Implement CSV export** - Medium priority
    - File: `SearchPage.tsx:64`
    - Export search results with metadata
    - Effort: 2-3 hours

19. **Implement virtual scrolling in CulturalHeritageFilter** - Low priority
    - File: `VirtualizedCulturalHeritageFilter.tsx:217`
    - Swap to @tanstack/react-virtual
    - Effort: 1-2 hours

---

## Part 3: Execution Strategy

### Sprint 1: Foundation (Week 1)
**Goal:** Clean slate - remove noise, fix dangerous items

| Day | Tasks | Issues |
|-----|-------|--------|
| 1 | Quick wins (Part 1 above) | - |
| 2 | Create all GitHub issues | - |
| 3-4 | Dead code cleanup | #1, #2 |
| 5 | Scripts maintenance | #3, #4 |

**Deliverables:**
- All quick wins complete
- All issues created and labeled
- Dead code removed
- Scripts cleaned up

### Sprint 2: Documentation & Types (Week 2)
**Goal:** Clean documentation, safer types

| Day | Tasks | Issues |
|-----|-------|--------|
| 1-2 | Documentation cleanup | #5, #6 |
| 3-4 | Type safety - ReviewDetail | #7 |
| 5 | Type safety - Admin pages | #8, #9 |

**Deliverables:**
- Docs archived/updated
- Core type safety issues fixed
- No `any` in critical paths

### Sprint 3: Patterns & Testing Foundation (Week 3)
**Goal:** Consistent patterns, unblock testing

| Day | Tasks | Issues |
|-----|-------|--------|
| 1-2 | Fix remaining `as any` | #10 |
| 2-3 | Standardize components | #11 |
| 4-5 | Unblock FilterModal tests | #13 |

**Deliverables:**
- Consistent component patterns
- FilterModal tests working
- Error handling standardized

### Sprint 4: Test Coverage (Week 4)
**Goal:** Critical flows tested

| Day | Tasks | Issues |
|-----|-------|--------|
| 1-2 | SearchPage tests | #14 |
| 3-4 | Hook tests | #15 |
| 5 | Core component tests | #16 |

**Deliverables:**
- Core user flows tested
- Hooks tested
- Coverage at 40%+

### Sprint 5: Polish (Week 5)
**Goal:** Complete remaining items

| Day | Tasks | Issues |
|-----|-------|--------|
| 1 | Error handling pattern | #12 |
| 2-3 | RLS tests | #17 |
| 4 | CSV export | #18 |
| 5 | Virtual scrolling | #19 |

**Deliverables:**
- All tech debt issues resolved
- Features implemented
- Coverage at 50%+

---

## Labels for GitHub Issues

- `tech-debt` - All tech debt items
- `dead-code` - Unused code removal
- `documentation` - Doc updates
- `type-safety` - TypeScript improvements
- `testing` - Test coverage
- `patterns` - Code standardization
- `feature` - New functionality
- `priority:critical` - Do immediately
- `priority:high` - Do this sprint
- `priority:medium` - Do next sprint
- `priority:low` - Backlog

---

## Success Metrics

| Metric | Before | After Sprint 5 |
|--------|--------|----------------|
| Test coverage | 16% | 50%+ |
| `any` types | 34 | <10 |
| Unused exports | 21 | 0 |
| Skipped tests | 8 | 0 |
| Outdated docs | 23 | 0 |
| npm vulnerabilities | 5 | 0 |
| GitHub issues open | 0 | 0 |
