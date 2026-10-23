# Archived Documentation

This directory contains documentation that is no longer actively maintained but is preserved for historical reference.

## Archive Contents

### Planning Documents (Archived December 2025)

| Document | Original Purpose | Status |
|----------|------------------|--------|
| `MIGRATION_WORKFLOW_PLAN.md` | Planning doc for database migration CI/CD | **Implemented** - See `docs/MIGRATION_WORKFLOW.md` |
| `CLAUDE_ACTIONS_ENHANCEMENT_PLAN.md` | Plan to enhance Claude Code GitHub Actions | Partially implemented, superseded by current workflows |
| `SUPABASE_IMPROVEMENTS_PLAN.md` | Infrastructure improvements plan | Quick wins completed, remaining items deprioritized |
| `CLEANUP_PLAN.md` | General codebase cleanup plan | Completed or superseded |
| `LESSON_SUBMISSION_WORKPLAN.md` | Lesson submission feature workplan | **Implemented** - Feature complete |

### Historical Analysis (Archived December 2025)

| Document | Original Purpose | Notes |
|----------|------------------|-------|
| `duplicate-analysis-expert-report.md` | Expert analysis of duplicate detection | Historical analysis from August 2025 |
| `duplicate-resolution-plan.md` | Plan for duplicate resolution feature | **Implemented** - Feature complete |
| `duplicate-detection-improvement-plan.md` | Improvements to duplicate detection | Historical planning document |
| `architecture-cleanup-guide.md` | Guide for architecture cleanup | Completed cleanup tasks |

### Superseded guides & completed one-offs (Archived October 2026)

| Document | Original Purpose | Status |
|----------|------------------|--------|
| `ROADMAP_2025-08.md` | August-2025 development roadmap (status, backlog, 2026 wishlist) | Frozen; live planning is in `docs/plans/` |
| `CLAUDE_ACTIONS_V1_MIGRATION_SUMMARY_2025-08.md` | Record of the Aug-2025 Claude Actions v1 migration | Completed; workflows since pruned |
| `SUBMISSION_PIPELINE_TESTING_GUIDE_2025.md` | Manual walkthrough of the original submission pipeline (auth, submission, duplicate detection) | Superseded by the Tier-1 submission flow, `e2e/`, and `docs/TESTING_GUIDE.md` |
| `SUBMISSION_PIPELINE_TESTING_CHECKLIST_2025.md` | Quick-reference checklist for the same walkthrough | Superseded (see above) |

### Reference docs archived October 2026 (refactor-audit docs pass)

| Document | Original location | Why archived |
|----------|-------------------|--------------|
| `IMPLEMENTATION_STATUS.md` | `docs/` | "As of December 2025" status page; superseded by `docs/ARCHITECTURE.md` and the per-directory `CLAUDE.md` files |
| `db-baseline-2025-09-01.md` | `docs/` | Phase-0 DB snapshot notes (2025-09); the live baseline is `supabase/migrations/20251001_production_baseline_snapshot.sql` |
| `search-architecture-v2.md` | `docs/` | 2025 search design plan — shipped; current search is described in `docs/ARCHITECTURE.md` (its `VITE_ENABLE_SEARCH_V2` flag never shipped) |
| `TECH_DEBT_AUDIT_2025-12.md` / `TECH_DEBT_EXECUTION_PLAN.md` | `docs/` | December-2025 audit + checklist, both superseded (see the SUPERSEDED banner) |
| `google-docs-embedding.md` | `docs/` | 2025-08 implementation plan for the Google-Doc embed; the feature shipped long ago |
| `reports/WEEK{1,2}_COMPLETION_REPORT.md` | `docs/reports/` | July-2025 weekly reports from the original build |
| `sessions/*` (3) | `docs/sessions/` | Oct-2025 architecture-cleanup session logs and handoffs |
| `PRs/*` (4) | `docs/PRs/` | Draft PR descriptions for the 2025 search-unification phases (all merged) |
| `development/*` (2) | `docs/development/` | 2025 development plan and the Algolia→PostgreSQL migration plan (completed; the `algolia-synonyms.json` it names was removed in 2026-10) |
| `migrations/*.sql` (4) | `docs/migrations/` | Hand-applied 2025-09 SQL for `publish_approved_submissions` (function retired by the 2026-10 cleanup); kept for audit trail only |

Also removed outright (not archived): `docs/production-schema-full.sql` and `docs/production-vs-local-diff.sql` — generated Oct-2025 dumps, recoverable from git history (`git show <merge-commit>^:docs/production-schema-full.sql`).

## Usage Notes

- These documents are **read-only references**
- Do not update archived documentation
- If you need to revive a plan, create a new document in `docs/` and reference the archived version
- For current documentation, see the parent `docs/` directory

## Archive Policy

Documents are archived when:
- The planned feature has been fully implemented
- The planning approach has been superseded
- The document hasn't been updated in 3+ months and is no longer relevant

## See Also

- `scripts/archive/` - Archived utility scripts
- `supabase/migrations/archive/` - Archived database migrations
