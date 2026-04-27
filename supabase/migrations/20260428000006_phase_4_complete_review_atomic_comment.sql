-- =====================================================
-- Migration: 20260428000006_phase_4_complete_review_atomic_comment.sql
-- =====================================================
-- Description: Documentation comment on complete_review_atomic. Split
-- into its own file for the same Supabase CLI splitter reason as
-- ...000004 / ...000005.

COMMENT ON FUNCTION public.complete_review_atomic(uuid, uuid, text, jsonb, text, text) IS 'Phase 4 atomic review-completion RPC. Invoked by the complete-review edge function only (EXECUTE granted to service_role only). Wraps the submission_reviews UPSERT, lesson_submissions UPDATE, and lesson INSERT or UPDATE plus lesson_versions INSERT in one transaction so partial failures roll back cleanly.';

-- ROLLBACK: COMMENT ON FUNCTION public.complete_review_atomic(uuid, uuid, text, jsonb, text, text) IS NULL;
