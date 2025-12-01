# Tech Debt Audit Report
**Date:** December 2025
**Scope:** Comprehensive audit of ESYNYC Lesson Search v2

---

## Executive Summary

| Category | Items Found | Critical | High | Medium | Low |
|----------|-------------|----------|------|--------|-----|
| Dead Code | 21 | 0 | 2 | 8 | 11 |
| Scripts Cruft | 7 | 2 | 2 | 3 | 0 |
| Inconsistent Patterns | 12 | 0 | 4 | 6 | 2 |
| Test Gaps | 85+ files | 4 | 8 | 10 | - |
| Dependency Issues | 6 | 0 | 3 | 2 | 1 |
| Documentation Drift | 23 | 1 | 3 | 12 | 7 |
| TODO/FIXME | 11 | 0 | 2 | 1 | 8 |
| Type Safety | 70+ | 0 | 8 | 25 | 37 |
| **TOTAL** | **235+** | **7** | **32** | **67** | **66+** |

**Overall Tech Debt Score: 6.5/10** (Moderate - manageable with focused effort)

---

## 1. Dead Code (21 items)

### High Priority - Remove These

| Item | File | Type |
|------|------|------|
| `withProtection` HOC | `src/components/Auth/ProtectedRoute.tsx` | Never used |
| `ErrorBoundaryTest` | `src/components/Common/ErrorBoundaryTest.tsx` | Dev-only, never imported |

### Medium Priority - Unused Functions

| Function | File | Notes |
|----------|------|-------|
| `isFeatureEnabled()` | `src/utils/featureFlags.ts` | Use `FEATURES` directly instead |
| `getAllFeatureFlags()` | `src/utils/featureFlags.ts` | Never called |
| `isUniqueConstraintError()` | `src/utils/errorHandling.ts` | Only `isEmailDuplicateError` used |
| `calculateOptimalHeight()` | `src/utils/virtualization.ts` | Never called |
| `getColumnCount()` | `src/utils/virtualization.ts` | Never called |
| `calculateColumnWidth()` | `src/utils/virtualization.ts` | Never called |
| `getOverscanCount()` | `src/utils/virtualization.ts` | Never called |

### Low Priority - Likely Unused Types

| Type | File | Notes |
|------|------|-------|
| `SavedSearch` | `src/types/index.ts` | Defined but never imported |
| `LessonCollection` | `src/types/index.ts` | Defined but never imported |
| `Bookmark` | `src/types/index.ts` | Defined but never imported |
| `GradeGroup` | `src/types/index.ts` | Appears unused |
| `CulturalRegion` | `src/types/index.ts` | Local interface used instead |
| `CulturalSubregion` | `src/types/index.ts` | Local interface used instead |

---

## 2. Scripts Cruft (7 items)

### Critical - Update or Delete

| Script | Issue | Action |
|--------|-------|--------|
| `deploy-edge-functions.sh` | References non-existent functions | DELETE or UPDATE |
| `apply-production-migration.sh` | References removed scripts | UPDATE |

### High Priority - Archive

| Script | Reason |
|--------|--------|
| `resume-gemini-embeddings.ts` | One-time migration complete |
| `recover-failed-lessons.ts` | Hardcoded IDs from past incident |

### Medium Priority - Document

| Script | Issue |
|--------|-------|
| `test-full-submission-workflow.mjs` | Undocumented |
| Shell scripts | Not in package.json |
| Backup scripts | Need npm script entry |

---

## 3. Inconsistent Patterns (12 categories)

### High Priority

| Pattern | Standard | Deviations | Files |
|---------|----------|------------|-------|
| Component declarations | `React.FC<Props>` | `function` in 40% | Auth/*, Review/*, Schools/* |
| Supabase error handling | try-catch-finally | Mixed patterns | Schools/*, Pages/* |
| Loading states | Separate loading/error | Inconsistent | Various pages |
| Type assertions | Proper typing | Multiple `as any` | ReviewActions, GoogleDocEmbed |

### Medium Priority

| Pattern | Issue | Files |
|---------|-------|-------|
| Memoization | Inconsistent `React.memo()` | SearchBar, Results/*, Review/* |
| State management | Local vs Zustand | ReviewDetail could use store |
| Async patterns | Mix of `.then()` and async/await | SubmissionPage |
| Hook returns | Various shapes | Multiple hooks |

---

## 4. Test Coverage Gaps

### Current Coverage: ~16%

| Category | Total | Tested | Gap |
|----------|-------|--------|-----|
| Components | 44 | 2 | 42 untested |
| Hooks | 5 | 0 | 5 untested |
| Utils | 15+ | 6 | 9 untested |
| Pages | 18 | 1 | 17 untested |
| RLS Policies | 15+ tables | 1 | 14 untested |

### Critical Missing Tests

1. **SearchPage** - Main user flow untested
2. **LessonModal/LessonCard** - Core UI untested
3. **SubmissionPage** - Form validation untested
4. **ReviewDetail/ReviewDashboard** - Admin flow untested
5. **useEnhancedAuth** - Auth hook untested

### Blocked Tests

- **FilterModal.test.tsx** - 44 tests skipped due to Headless UI mocking
- **search-flow.test.tsx** - 2 filter tests skipped

---

## 5. Dependency Issues (6 items)

### Remove (Unused)

| Package | Size | Notes |
|---------|------|-------|
| `openai` | 12MB | Move to devDependencies or remove |
| `tiktoken` | Large | Completely unused |
| `csv-parse` | - | Feature not implemented |

### Security Vulnerabilities

- **5 low severity** from `@lhci/cli` dependency chain
- Fix: `npm audit fix`

### Consider Removing

| Package | Notes |
|---------|-------|
| `@lhci/cli` | Has vulnerabilities, only for lighthouse testing |
| `http-server` | Can use alternatives |

---

## 6. Documentation Drift (23 items)

### Critical - Delete Immediately

| File | Issue |
|------|-------|
| `docs/development/FIXES_NEEDED.md` | References @heroicons/react (not used - we use lucide-react) |

### High Priority - Update

| File | Issue |
|------|-------|
| `src/lib/CLAUDE.md` | Too much Algolia legacy content |
| `docs/IMPLEMENTATION_STATUS.md` | Last updated Sept 2025 |
| `docs/archive/MIGRATION_WORKFLOW_PLAN.md` | Archived - superseded by MIGRATION_WORKFLOW.md |

### Medium Priority - Archive ✅ COMPLETED

Archived in PR #357:
- 5 planning docs (MIGRATION_WORKFLOW_PLAN, CLAUDE_ACTIONS_ENHANCEMENT_PLAN, SUPABASE_IMPROVEMENTS_PLAN, CLEANUP_PLAN, LESSON_SUBMISSION_WORKPLAN)
- 4 historical docs (duplicate-analysis-expert-report, duplicate-resolution-plan, duplicate-detection-improvement-plan, architecture-cleanup-guide)

---

## 7. TODO/FIXME Comments (11 items)

### Important - Implement

| TODO | File | Effort |
|------|------|--------|
| CSV Export | `SearchPage.tsx:64` | 2-3 hours |
| Metadata merging logic | `duplicate_resolution_tables.sql:147` | Blocked - needs stakeholder input |

### Minor - Fix When Convenient

| TODO | File | Notes |
|------|------|-------|
| Virtual scrolling | `VirtualizedCulturalHeritageFilter.tsx:217` | 1 hour, low impact |

### Stale - Remove

| Item | File | Notes |
|------|------|-------|
| Security headers TODO | `SECURITY.md:94` | Configure in Netlify, not code |
| Template placeholders | Various | Keep as examples |
| Skipped tests | FilterModal.test.tsx | Keep until infrastructure fixed |

---

## 8. Type Safety Issues (70+ items)

### High Priority - Fix These

| Issue | File | Lines |
|-------|------|-------|
| Untyped submission result | `SubmissionPage.tsx` | 16 |
| Untyped similarities array | `ReviewDetail.tsx` | 184 |
| Untyped new lesson object | `ReviewDetail.tsx` | 327 |
| Untyped update data | `ReviewDetail.tsx` | 438 |
| Unvalidated metadata casts | `ReviewDetail.tsx` | 236, 252 |
| Untyped duplicate groups | `AdminDuplicates.tsx` | 66 |
| `as any` on form input | `ReviewActions.tsx` | 33 |
| Window API bypass | `GoogleDocEmbed.tsx` | 102 |

### Medium Priority - 25 items

- Generic `Record<string, any>` types
- Inline parameter typing (`lesson: any`)
- Non-null assertions without guards
- Loose generic constraints

### Files Needing Most Attention

1. `ReviewDetail.tsx` - 6 high-priority issues
2. `AdminDuplicateDetail.tsx` - 5 medium-priority issues
3. `AdminAnalytics.tsx` - 3 medium-priority issues
4. `ReviewMetadataForm.tsx` - 2 medium-priority issues

---

## Prioritized Action Plan

### Phase 1: Quick Wins (1-2 days)

- [x] Delete `docs/development/FIXES_NEEDED.md`
- [x] Remove unused exports (`withProtection`, `ErrorBoundaryTest`)
- [x] Remove unused npm packages (`tiktoken`, `csv-parse`)
- [x] Move `openai` to devDependencies
- [ ] Run `npm audit fix`
- [x] Condense Algolia section in `src/lib/CLAUDE.md`

### Phase 2: Dead Code Cleanup (2-3 days)

- [x] Remove unused functions in `featureFlags.ts`
- [x] Remove unused functions in `virtualization.ts`
- [x] Remove `isUniqueConstraintError()` from `errorHandling.ts`
- [ ] Archive obsolete scripts
- [ ] Delete/update broken shell scripts

### Phase 3: Documentation Cleanup (1-2 days)

- [x] Update `IMPLEMENTATION_STATUS.md`
- [ ] Archive `MIGRATION_WORKFLOW_PLAN.md`
- [ ] Archive duplicate detection docs
- [ ] Create `/docs/archive/` directory
- [ ] Move obsolete docs to archive

### Phase 4: Type Safety (3-5 days)

- [ ] Fix high-priority `any` types in ReviewDetail.tsx
- [ ] Add proper interfaces for API responses
- [ ] Fix `as any` in ReviewActions.tsx
- [ ] Add runtime validation for metadata casts
- [ ] Create `DuplicateAnalysisReport` interface

### Phase 5: Pattern Standardization (2-3 days)

- [ ] Standardize component declarations to `React.FC`
- [ ] Standardize Supabase error handling
- [ ] Standardize loading/error state patterns
- [ ] Document patterns in CLAUDE.md files

### Phase 6: Test Coverage (5-10 days)

- [ ] Unblock FilterModal tests (or move to E2E)
- [ ] Create SearchPage integration test
- [ ] Add LessonModal/LessonCard tests
- [ ] Add hook tests (useLessonSearch, useEnhancedAuth)
- [ ] Expand RLS policy tests
- [ ] Add submission flow tests

### Phase 7: Feature Implementation (2-3 days)

- [ ] Implement CSV export (`SearchPage.tsx:64`)
- [ ] Implement virtual scrolling in CulturalHeritageFilter

---

## Metrics to Track

| Metric | Current | Target |
|--------|---------|--------|
| Test coverage (files) | 16% | 50% |
| `any` type count | 34 | <10 |
| Unused exports | 21 | 0 |
| Skipped tests | 8 | 0 |
| Outdated docs | 23 | 0 |
| npm vulnerabilities | 5 | 0 |

---

## Estimated Total Effort

| Phase | Days | Priority |
|-------|------|----------|
| Phase 1: Quick Wins | 1-2 | Immediate |
| Phase 2: Dead Code | 2-3 | High |
| Phase 3: Documentation | 1-2 | High |
| Phase 4: Type Safety | 3-5 | Medium |
| Phase 5: Patterns | 2-3 | Medium |
| Phase 6: Testing | 5-10 | Medium |
| Phase 7: Features | 2-3 | Low |
| **TOTAL** | **16-28 days** | - |

---

## Conclusion

The codebase is in **moderately good shape** with clear areas for improvement:

**Strengths:**
- Well-documented CLAUDE.md files
- Good Zustand store patterns
- Solid testing infrastructure (when used)
- Clean component organization
- Archive management is exemplary

**Weaknesses:**
- Low test coverage (16%)
- Type safety issues in admin pages
- Documentation accumulation without cleanup
- Inconsistent patterns in newer code

**Recommendation:** Focus on Phase 1-3 first (quick wins, dead code, docs) to reduce noise, then tackle type safety and testing incrementally.
