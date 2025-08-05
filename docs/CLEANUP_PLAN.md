# ESYNYC Lesson Search v2 - Codebase Cleanup Plan

## Overview
This document outlines a comprehensive cleanup and improvement plan for the ESYNYC Lesson Search v2 codebase. The plan is organized into 7 sections, each with its own feature branch, all merging into a main cleanup branch before final integration.

## Branching Strategy

```
main
└── cleanup/main (parent cleanup branch)
    ├── cleanup/remove-unnecessary-files
    ├── cleanup/documentation-updates
    ├── cleanup/code-quality
    ├── cleanup/archive-management
    ├── cleanup/feature-completion
    ├── cleanup/project-structure
    └── cleanup/security-performance
```

### Branch Flow:
1. Create `cleanup/main` from `main`
2. Create each `cleanup/*` branch from `cleanup/main`
3. Complete work in each branch
4. Merge each branch back to `cleanup/main` via PR
5. Final review and merge `cleanup/main` to `main`

## Section 1: Remove Unnecessary Files

**Branch:** `cleanup/remove-unnecessary-files`

### Tasks:
1. **Remove backup files:**
   - Delete `src/pages/ReviewDetail.tsx.backup`
   
2. **Clean system files:**
   - Remove all `.DS_Store` files (5 found)
   - Add `.DS_Store` to `.gitignore` if not already present
   
3. **Remove empty directories:**
   - Delete `.lighthouseci/`
   - Delete `supabase/functions/search-lessons-v2/`
   
4. **Archive legacy data:**
   - Create `archive/` directory at project root
   - Move `data/` directory to `archive/data/`
   - Create `archive/README.md` explaining archived content

### Verification:
- [ ] No backup files remain
- [ ] No .DS_Store files in repository
- [ ] No empty directories
- [ ] Legacy data properly archived

## Section 2: Documentation Updates

**Branch:** `cleanup/documentation-updates`

### Tasks:
1. **Create LICENSE file:**
   ```
   MIT License
   
   Copyright (c) 2024 Edible Schoolyard NYC
   
   [Standard MIT license text]
   ```

2. **Create CHANGELOG.md:**
   ```markdown
   # Changelog
   
   ## [2.0.0] - 2024-08-05
   ### Added
   - Complete React/TypeScript rewrite
   - Supabase backend integration
   - User authentication system
   - Review workflow for submissions
   
   ### Changed
   - Migrated from static JSON to PostgreSQL
   - Upgraded to React 19
   
   ## [1.0.0] - 2023-XX-XX
   - Initial vanilla JavaScript version
   ```

3. **Create CONTRIBUTING.md:**
   - Development setup instructions
   - Code style guidelines
   - PR process
   - Testing requirements

4. **Create scripts/README.md:**
   - Document each script's purpose
   - Usage examples
   - Required environment variables

5. **Update docs/IMPLEMENTATION_STATUS.md:**
   - Current feature status
   - Remove outdated information
   - Add completion dates

### Verification:
- [ ] All standard project files created
- [ ] Documentation is current and accurate
- [ ] No outdated information remains

## Section 3: Code Quality Improvements

**Branch:** `cleanup/code-quality`

### Tasks:
1. **Convert JS to TypeScript in scripts/:**
   - `import-data.js` → `import-data.ts`
   - `sync-to-algolia.js` → `sync-to-algolia.ts`
   - `configure-synonyms.js` → `configure-synonyms.ts`
   - `remove-algolia.js` → `remove-algolia.ts`
   - `create-reviewer-profile.js` → `create-reviewer-profile.ts`
   - `test-edge-function.js` → `test-edge-function.ts`
   - `create-test-profiles.js` → `create-test-profiles.ts`
   - `fix-rls-policies.js` → `fix-rls-policies.ts`

2. **Fix TODO/FIXME comments (5 found):**
   - Locate and address each TODO
   - Either implement or create GitHub issues

3. **Add test files:**
   - Create test files for critical components
   - Set up test structure for future additions
   - Target initial 30% coverage

### Verification:
- [ ] No JavaScript files in scripts/
- [ ] All TODOs addressed or tracked
- [ ] Test structure established

## Section 4: Archive Management

**Branch:** `cleanup/archive-management`

### Tasks:
1. **Document archived migrations:**
   - Create `supabase/migrations/archive/README.md`
   - List each archived migration and why it was archived
   - Add archive date and archiver

2. **Organize script archives:**
   - Review `scripts/archive/` contents
   - Document why scripts were archived
   - Consider further consolidation

3. **Create archive policy:**
   - Document when to archive vs delete
   - Archive naming conventions
   - Retention periods

### Verification:
- [ ] All archives documented
- [ ] Clear archive policy established
- [ ] No undocumented archives

## Section 5: Feature Completion Documentation

**Branch:** `cleanup/feature-completion`

### Tasks:
1. **Create ROADMAP.md:**
   ```markdown
   # Development Roadmap
   
   ## In Progress
   - [ ] Google Docs API Integration
   - [ ] CSV Export Functionality
   - [ ] OpenAI Embeddings
   
   ## Planned
   - [ ] Advanced analytics dashboard
   - [ ] Bulk operations
   ```

2. **Create implementation guides:**
   - `docs/guides/google-docs-integration.md`
   - `docs/guides/csv-export-implementation.md`
   - `docs/guides/openai-setup.md`

3. **Update edge function documentation:**
   - Document mock implementations
   - Provide real implementation examples

### Verification:
- [ ] Clear roadmap established
- [ ] Implementation guides complete
- [ ] No undocumented features

## Section 6: Project Structure Improvements

**Branch:** `cleanup/project-structure`

### Tasks:
1. **Create environment examples:**
   - `.env.production.example`
   - `.env.staging.example`

2. **Create deployment checklist:**
   - `docs/DEPLOYMENT_CHECKLIST.md`
   - Pre-flight checks
   - Post-deployment verification

3. **Add GitHub templates:**
   - `.github/ISSUE_TEMPLATE/bug_report.md`
   - `.github/ISSUE_TEMPLATE/feature_request.md`
   - `.github/pull_request_template.md`

4. **Set up GitHub Actions:**
   - `.github/workflows/ci.yml` (tests, linting)
   - `.github/workflows/deploy.yml` (deployment)

### Verification:
- [ ] All templates created
- [ ] CI/CD pipeline configured
- [ ] Deployment process documented

## Section 7: Security & Performance

**Branch:** `cleanup/security-performance`

### Tasks:
1. **Create SECURITY.md:**
   - Vulnerability reporting process
   - Security contact information
   - Disclosure policy

2. **Document security model:**
   - `docs/security/rls-policies.md`
   - `docs/security/authentication-flow.md`
   - `docs/security/data-protection.md`

3. **Create performance docs:**
   - `docs/performance/benchmarks.md`
   - `docs/performance/optimization-guide.md`
   - Current performance metrics

### Verification:
- [ ] Security policies documented
- [ ] Performance baselines established
- [ ] Best practices documented

## Implementation Timeline

### Week 1:
- Day 1-2: Section 1 (Remove Unnecessary Files)
- Day 3-4: Section 2 (Documentation Updates)
- Day 5: Review and merge first two sections

### Week 2:
- Day 1-2: Section 3 (Code Quality)
- Day 3: Section 4 (Archive Management)
- Day 4-5: Section 5 (Feature Completion)

### Week 3:
- Day 1-2: Section 6 (Project Structure)
- Day 3-4: Section 7 (Security & Performance)
- Day 5: Final review and merge to main

## Success Metrics

- **File Cleanup:** 10-15 files removed/archived
- **Documentation:** 40% increase in documentation coverage
- **Code Quality:** 0 JavaScript files in scripts/, 30%+ test coverage
- **Organization:** Clear structure for future development
- **Security:** Documented security model and policies

## Review Process

Each section PR should include:
1. Checklist of completed tasks
2. Before/after file count
3. Documentation of decisions made
4. Testing verification

## Final Merge Checklist

Before merging `cleanup/main` to `main`:
- [ ] All section branches merged
- [ ] Full test suite passing
- [ ] Documentation reviewed
- [ ] No broken links
- [ ] Build successful
- [ ] Deployment guide updated
- [ ] Team notification sent

---

This plan will result in a cleaner, better-documented, and more maintainable codebase ready for future development.