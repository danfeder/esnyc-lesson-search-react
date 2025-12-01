Fix: publish approved submissions + persist extracted title; update search mappings

Summary
- Persist Google Doc title at submission time and use it when publishing approved lessons.
- Publish approved lessons to base table columns (not the view) and ensure arrays + metadata are correctly set.
- Fix search mappings so base columns (e.g., activity_type) surface reliably in results.
- Provide SQL docs for RLS fixes, a title‑first batch publisher, and a one‑time title backfill.

Changes
- Edge Functions
  - process-submission: stores extracted_title alongside extracted_content in lesson_submissions.
  - smart-search: maps activityType from row.activity_type first, then falls back to metadata.
- Frontend
  - ReviewDetail.tsx: approve_new prefers submission.extracted_title → parsed title → fallback; writes directly to lessons with array columns set; keeps metadata JSON for compatibility.
  - useSearch.ts: fallback search now maps activityType from row.activity_type first.
- Scripts
  - scripts/backfill-publish-approved.ts: service‑role backfill for approved submissions (optional alternative to SQL function).
- DB Docs (run in Supabase dashboard)
  - 2025-09-01-publish-approved-rls.sql: RLS fixes for lessons/lesson_versions.
  - 2025-09-01-add-extracted-title-to-submissions.sql: adds lesson_submissions.extracted_title (+ optional backfill).
  - 2025-09-01-publish-approved-batch-v8.sql: robust SECURITY DEFINER publisher (title‑first, defensive JSON handling, season normalization).
  - 2025-09-01-backfill-lesson-titles-from-submissions.sql: one‑time fix for existing “Untitled Lesson” rows.
- Docs
  - docs/archive/duplicate-detection-improvement-plan.md: planned improvements for duplicate detection (archived).

Rollout
1) Apply RLS and extracted_title migrations.
2) Replace publisher with v8 and (optionally) backfill titles for existing rows.
3) Deploy Edge functions: process-submission and smart-search.
4) Validate by approving a new submission and confirming title/metadata appear correctly in search.

Validation
- New submissions: lesson_submissions.extracted_title is populated.
- Approve as new: lessons.title matches the Doc title (e.g., “Varenyky”).
- Search shows correct title and activity type.

Notes
- Earlier draft publisher docs are omitted from this PR to keep it tidy. Duplicate detection plan included for visibility.
