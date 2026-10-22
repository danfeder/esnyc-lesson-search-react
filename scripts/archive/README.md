# Archived Scripts

This directory contains scripts that are no longer actively used but are kept for historical reference and debugging purposes.

## Contents

### `debug-edge-function.mjs`
- **Archived:** 2025-08-05
- **Original Purpose:** Debugging edge function issues during development
- **Reason for Archive:** Edge functions now stable, debugging moved to Supabase dashboard logs
- **Original Location:** `/scripts/`
- **Dependencies:** Node.js ES modules
- **Status:** Can be permanently deleted after 6 months if no issues arise

### `debug-user-email.sql`
- **Archived:** 2025-08-05  
- **Original Purpose:** SQL queries to debug user email retrieval issues
- **Reason for Archive:** Issue resolved with proper RLS policies and user profile views
- **Original Location:** `/scripts/`
- **Related Issues:** User email not displaying in admin dashboard
- **Status:** Keep for reference when debugging similar auth issues

### Scripts Archived 2025-12-01 (Tech Debt Phase 2)

| Script | Original Purpose |
|--------|-----------------|
| `resume-gemini-embeddings.ts` | Resume Gemini embeddings migration from specific point after timeout |
| `recover-failed-lessons.ts` | Recover lessons that failed due to malformed activity_type data |

### Scripts Archived 2025-11-28 (Codebase Cleanup PR #313)

The following scripts were archived as they are not registered in package.json and serve one-time or deprecated purposes:

| Script | Original Purpose |
|--------|-----------------|
| `backfill-publish-approved.ts` | One-time backfill for publish approval status |
| `create-reviewer-profile.js` | Create reviewer user profiles (one-time setup) |
| `create-test-profiles.js` | Create test user profiles (one-time setup) |
| `fix-mock-submissions.ts` | Fix mock submission data |
| `fix-rls-policies.js` | One-time RLS policy fixes |
| `generate-missing-embeddings.ts` | Generate embeddings for lessons missing them |
| `get-service-account-info.ts` | Debug Google service account configuration |
| `migrate-to-gemini-embeddings.ts` | One-time migration from OpenAI to Gemini embeddings |
| `test-duplicate-resolution.ts` | Test duplicate resolution functionality |
| `verify-gemini-migration.ts` | Verify Gemini embedding migration completed |
| `test-edge-function.js` | Duplicate of test-edge-function.ts |

### Scripts archived 2026-10-22 (refactor-audit scripts sweep)

Shipped migration generators and their helpers, moved here with `git mv` because each is
named as the generator / reasoning artifact in a shipped migration header (those headers
are historical and keep the ORIGINAL path on purpose).

**Relative paths/imports inside these files are stale relative to the original location —
reference only, do not run without updating.** Exact stale roots, should anyone follow a
migration header back here:

- `dedup-sweep/*.ts|.mjs` and `fp02-theme-normalize/generate-migration.ts` resolve the repo
  root as `resolve(…, '../..')` → would need `'../../..'`; fp02 also imports
  `'../../src/utils/filterDefinitions'` → would need `'../../../src/…'`.
- The four `.py` files use `REPO_ROOT = Path(__file__).resolve().parent.parent` → would need
  a third `.parent` (after which `emit-concepts-vocab.py` still finds
  `REPO_ROOT/"scripts"/"build-concepts-tool.py"`, which stays live in `scripts/`).
- `orphan-recovery/*.ts` import `'../lib/require-env.mjs'` → would need
  `'../../lib/require-env.mjs'`, and compute `repoRoot = path.resolve(__dirname, '..', '..')`
  → would need a third `'..'`.

| Archived item (original path) | Purpose | Generator for |
|-------------------------------|---------|---------------|
| `scripts/dedup-sweep/` (10 files: README, `constants.ts`, `trigram.ts`, `export-corpus.ts`, `generate-candidates.ts`, `deck-prompt.ts`, `run-deck.ts`, `build-deck-md.ts`, `record-decisions.mjs`, `generate-retire-migration.mjs`) | T4 duplicate-candidate sweep: corpus export, trigram candidate generation, review-deck fan-out, decision recording | `supabase/migrations/20260702160000_t4_dedup_retire.sql` (+ `.rollback`) via `generate-retire-migration.mjs`; `trigram.test.ts` was deleted, not archived |
| `scripts/fp02-theme-normalize/` (`generate-migration.ts`, `artifacts/mapping.json`) | FP-02 kebab-case theme value normalization: mapping + migration emitter | `supabase/migrations/20260703030000_normalize_kebab_theme_values.sql` (+ `.rollback`) |
| `scripts/orphan-recovery/` (`README.md`, `.gitignore`, `phase-2-category-a-backfill.ts`, `phase-5-b-new-publish.ts`, `snapshots/.gitkeep`, `dryrun-artifacts/.gitkeep`) | 2026-04 orphan-submission recovery: reasoning artifacts for the phase 2 / phase 5-B batches; local snapshots (gitignored, teacher content) are the undo source | `20260426010000_phase_2_category_a_backfill.sql`, `20260429000000_phase_5_b_new_publish.sql` |
| `scripts/generate-heritage-rewrite-migration.py` | Emits the PR5a cultural-heritage canonicalization migration from the heritage vocab | `20260611000000_pr5a_heritage_canonicalization.sql` |
| `scripts/generate-concepts-rewrite-migration.py` | Emits the PR5b academic-concepts canonicalization migration | `20260612000000_pr5b_concepts_canonicalization.sql` |
| `scripts/emit-concepts-vocab.py` | Emits `data/vocab/academic-concepts.vocab.json` from the returned concepts worksheet (imports the live `build-concepts-tool.py`) | `20260613000000_fold_urban_revitalization_concept.sql` |
| `scripts/parse-heritage-worksheet.py` | Parses the 2026-05 heritage worksheet into the heritage vocab consumed by the heritage generator above | input producer for `generate-heritage-rewrite-migration.py` |

### Deleted outright 2026-10-22 (not archived)

Sixty tracked files were deleted rather than archived (per `docs/ARCHIVE_POLICY.md`: ≥ 6-month-old
debug scripts / test data, zero consumers, regenerable). Git history is the record. Restore any
of them with:

```bash
git show ba34cac0:scripts/<file> > scripts/<file>   # ba34cac0 = the main commit the sweep branched from
```

- **Duplicate-detection toolchain (2025-07/08):** `analyze-duplicates.mjs`, `analyze-duplicates-v2.ts`,
  `analyze-duplicates-v3.ts`, `auto-resolve-duplicates.ts`, `undo-all-duplicate-resolutions.ts`,
  `identify-and-restore-missing-lessons.ts`, `test-openai-api.ts`, `test-duplicate-detection.mjs`,
  `test-similarity-search.mjs` (+ npm scripts `test:openai`, `auto-resolve-duplicates`,
  `analyze-duplicates-v2`, `analyze-duplicates-v3`, `undo-resolutions`, `restore-missing`)
- **Embeddings pipeline (obsolete vector space; no `generate-embeddings` edge function exists):**
  `generate-embeddings.mjs`, `generate-embeddings-long-lessons.mjs`, `regenerate-all-embeddings.mjs`,
  `test-prepare-lesson-text.mjs`, `migrate-metadata-to-columns.mjs`
- **Google-Docs import one-offs (2025-07/08):** `setup-google-docs-api.mjs`, `test-google-docs-api.mjs`,
  `test-google-docs-real.mjs`, `import-raw-text-content.mjs`, `verify-raw-text-mapping.mjs`,
  `fix-javascript-extraction.mjs`, `update-last-modified-dates.mjs`
- **2025-08 hash / extraction repair:** `analyze-hash-issues.mjs`, `analyze-remaining-issues.mjs`,
  `check-partial-extractions.mjs`, `final-fix-partial.mjs`, `fix-content-hashes.mjs`,
  `fix-incomplete-content.mjs`, `generate-content-hashes.mjs`, `archive-incomplete-lessons.mjs`,
  `analyze-content-quality.mjs`
- **Superseded smoke scripts (live smoke = `scripts/test-edge-functions.mjs`):** `test-edge-function.ts`,
  `test-edge-function-detailed.mjs`, `test-submission-flow.mjs`, `test-full-submission-workflow.mjs`,
  `test-workflow-components.mjs`, `check-sql-functions.mjs`, `import-test-data.mjs`
- **One-off SQL (superseded by `supabase/seed.sql` + migrations):** `setup-test-users.sql`,
  `make-first-admin.sql`, `fix-rls-enablement.sql`, `fix-existing-user-profile.sql`,
  `fix-existing-user-profile-v2.sql`, `update-test-user-emails.sql`, `verify-auth-emails.sql`,
  `verify-user-management-setup.sql`, `check-duplicate-resolution.sql`
- **Spent codemod:** `replace-console-logs.cjs`
- **eval-data track (2026-05; harness + labeled samples, zero consumers):** `eval-llm-tagging-prompt.ts`,
  `build-activity-type-samples.ts`, and `scripts/eval-data/` (`activity-type-relabel-worksheet.md`,
  `activity-type-relabel-worksheet-v2.md`, `activity-type-samples.README.md`, `activity-type-samples.json`,
  `activity-type-thresholds.json`, `activity-type-vocab.json`, `crf-samples.README.md`, `crf-samples.json`,
  `crf-thresholds.json`, `crf-vocab.json`) (+ npm script `eval:llm-tagging`)
- **Test file for an archived feature:** `dedup-sweep/trigram.test.ts` (12 tests)

## Usage Notes

These scripts should NOT be run in production. They were created for specific debugging scenarios that have been resolved.

If you need to reference these scripts:
1. Review the code to understand the debugging approach
2. Create new scripts based on current requirements
3. Do not directly execute without updating for current schema

## Archive Policy

Scripts in this directory:
- Are not part of the build or deployment process
- Should not be imported or required by active code
- May contain outdated API calls or schema references
- Should be reviewed before any reuse