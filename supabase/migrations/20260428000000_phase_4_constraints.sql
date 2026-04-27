-- =====================================================
-- Migration: 20260428000000_phase_4_constraints.sql
-- =====================================================
-- Description: Phase 4 of the lesson-submission Tier-1 work — constraint
-- changes. Splits out from the RPC + helper migrations (...000001 /
-- ...000002 / ...000003) because the Supabase CLI's statement splitter
-- struggles with multiple CREATE FUNCTION blocks in one file.
--
-- Two coordinated constraint changes:
--
--   1. UNIQUE(submission_id) on submission_reviews. Now safe to add after
--      Phase 3 dedup (PROD verified 0 multi-review submissions on
--      2026-04-27). Pairs with the RPC's UPSERT pattern in ...000003 — even
--      if a future write path bypasses the RPC, the constraint blocks
--      duplicate review rows.
--
--   2. Extend lesson_submissions.status CHECK to allow 'rejected'. Schema-
--      only change in this phase; the UI for the 'reject' decision lands in
--      Phase 8a. Ships now (per round-2 senior-dev review) so the RPC in
--      ...000003 is schema-complete from day one — the 'reject' branch in
--      the RPC body works end-to-end via tests/scripts even though it's
--      UI-unreachable until Phase 8a wires the radio.
--
-- Pre-conditions verified on PROD 2026-04-27:
--   - 0 submissions with more than one review row (Phase 3 invariant
--     holds), so the UNIQUE add will not fail with a duplicate-key error.
--   - Existing CHECK on lesson_submissions.status:
--       CHECK ((status = ANY (ARRAY['submitted','in_review',
--         'needs_revision','approved'])))
--     This migration replaces it with the same set plus 'rejected'.

-- =====================================================
-- CHANGES
-- =====================================================

ALTER TABLE public.submission_reviews
  ADD CONSTRAINT submission_reviews_submission_id_unique
  UNIQUE (submission_id);

ALTER TABLE public.lesson_submissions
  DROP CONSTRAINT IF EXISTS lesson_submissions_status_check;

ALTER TABLE public.lesson_submissions
  ADD CONSTRAINT lesson_submissions_status_check
  CHECK (status = ANY (ARRAY[
    'submitted'::text,
    'in_review'::text,
    'needs_revision'::text,
    'approved'::text,
    'rejected'::text
  ]));

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- Reverse order:
--
-- ALTER TABLE public.lesson_submissions
--   DROP CONSTRAINT IF EXISTS lesson_submissions_status_check;
-- ALTER TABLE public.lesson_submissions
--   ADD CONSTRAINT lesson_submissions_status_check
--   CHECK (status = ANY (ARRAY['submitted'::text, 'in_review'::text,
--     'needs_revision'::text, 'approved'::text]));
-- -- WARNING: rolling back the CHECK while any row has status='rejected'
-- -- will fail. Migrate those rows first (e.g., to 'needs_revision') or
-- -- defer the rollback.
--
-- ALTER TABLE public.submission_reviews
--   DROP CONSTRAINT IF EXISTS submission_reviews_submission_id_unique;
