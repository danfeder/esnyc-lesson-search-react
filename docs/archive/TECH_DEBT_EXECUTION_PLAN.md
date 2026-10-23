# Tech Debt Execution Plan

## Part 1: Quick Wins (Execute Now)

### 1.1 Delete Dangerous Documentation
- [x] Delete `docs/development/FIXES_NEEDED.md` (references wrong icon library)

### 1.2 Remove Unused NPM Packages
- [x] Remove `tiktoken` from dependencies
- [x] Move `openai` to devDependencies
- [ ] Run `npm audit fix`
- [x] Verify build still works

### 1.3 Remove Dead Code - Exports
- [x] Remove `withProtection` HOC from `src/components/Auth/ProtectedRoute.tsx`
- [x] Remove `withProtection` from `src/components/Auth/index.ts` barrel export
- [x] Remove `ErrorBoundaryTest` from `src/components/Common/index.ts` barrel export

### 1.4 Remove Dead Code - Unused Functions
- [x] Remove `isFeatureEnabled()` from `src/utils/featureFlags.ts`
- [x] Remove `getAllFeatureFlags()` from `src/utils/featureFlags.ts`
- [x] Remove `isUniqueConstraintError()` from `src/utils/errorHandling.ts`
- [x] Remove unused functions from `src/utils/virtualization.ts`:
  - `calculateOptimalHeight()`
  - `getColumnCount()`
  - `calculateColumnWidth()`
  - `getOverscanCount()`

### 1.5 Documentation Quick Fixes
- [x] Condense Algolia section in `src/lib/CLAUDE.md` to 3 lines
- [x] Update date in `docs/IMPLEMENTATION_STATUS.md`

### 1.6 Verification
- [x] Run `npm run type-check`
- [x] Run `npm run lint`
- [x] Run `npm run build`
- [x] Run `npm test`

---

## Part 2: GitHub Issues Created

See the following GitHub issues for remaining tech debt work:

### Dead Code Cleanup
- #336: Remove unused type definitions
- #337: Remove unused filter helper functions

### Scripts Maintenance
- #338: Update or delete broken shell scripts
- #339: Archive one-time migration scripts

### Documentation Cleanup
- #342: Archive obsolete documentation
- #343: Review and update planning documents

### Type Safety
- #340: Fix type safety in ReviewDetail.tsx
- #341: Fix type safety in AdminDuplicates pages
- #344: Fix type safety in AdminAnalytics.tsx
- #345: Fix `as any` assertions

### Pattern Standardization
- #346: Standardize component declarations
- #347: Standardize Supabase error handling

### Test Coverage
- #348: Unblock FilterModal tests
- #349: Add SearchPage integration tests
- #350: Add hook tests
- #351: Add component tests for core UI
- #352: Expand RLS policy tests

### Features
- #354: Implement virtual scrolling in CulturalHeritageFilter

---

## Part 3: Execution Strategy

### Sprint 1: Foundation (Week 1)
**Goal:** Clean slate - remove noise, fix dangerous items

| Day | Tasks | Issues |
|-----|-------|--------|
| 1 | Quick wins (Part 1 above) | - |
| 2 | Create all GitHub issues | - |
| 3-4 | Dead code cleanup | #336, #337 |
| 5 | Scripts maintenance | #338, #339 |

**Deliverables:**
- All quick wins complete
- All issues created and labeled
- Dead code removed
- Scripts cleaned up

### Sprint 2: Documentation & Types (Week 2)
**Goal:** Clean documentation, safer types

| Day | Tasks | Issues |
|-----|-------|--------|
| 1-2 | Documentation cleanup | #342, #343 |
| 3-4 | Type safety - ReviewDetail | #340 |
| 5 | Type safety - Admin pages | #341, #344 |

**Deliverables:**
- Docs archived/updated
- Core type safety issues fixed
- No `any` in critical paths

### Sprint 3: Patterns & Testing Foundation (Week 3)
**Goal:** Consistent patterns, unblock testing

| Day | Tasks | Issues |
|-----|-------|--------|
| 1-2 | Fix remaining `as any` | #345 |
| 2-3 | Standardize components | #346 |
| 4-5 | Unblock FilterModal tests | #348 |

**Deliverables:**
- Consistent component patterns
- FilterModal tests working
- Error handling standardized

### Sprint 4: Test Coverage (Week 4)
**Goal:** Critical flows tested

| Day | Tasks | Issues |
|-----|-------|--------|
| 1-2 | SearchPage tests | #349 |
| 3-4 | Hook tests | #350 |
| 5 | Core component tests | #351 |

**Deliverables:**
- Core user flows tested
- Hooks tested
- Coverage at 40%+

### Sprint 5: Polish (Week 5)
**Goal:** Complete remaining items

| Day | Tasks | Issues |
|-----|-------|--------|
| 1 | Error handling pattern | #347 |
| 2-3 | RLS tests | #352 |
| 4-5 | Virtual scrolling | #354 |

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
