-- =====================================================
-- Migration: 20260504000000_phase_8b_fk_on_delete_set_null.sql
-- =====================================================
-- Description: Phase 8b Section 1 — re-create the FK on
-- lesson_submissions.original_lesson_id with ON DELETE SET NULL.
--
-- Rationale: Phase 8b makes the submitter's binding intent ("updating
-- lesson X") a first-class signal. If a reviewer or admin later
-- deletes lesson X, the submission row should survive with its intent
-- neutralized (original_lesson_id = NULL) rather than cascade-deleting
-- the submission. The original FK had no ON DELETE clause (defaults to
-- NO ACTION), which would block the lesson delete — also wrong, since
-- a delete shouldn't be vetoed by an old submission's reference.
--
-- Section 1 of the design doc had a second item (RPC status guard) but
-- that already exists from Phase 4 (see 20260428000008_phase_4_status_guard.sql),
-- which refuses re-entry on terminal statuses ('approved', 'rejected').
-- This file is the only schema migration needed for Phase 8b.

ALTER TABLE public.lesson_submissions
  DROP CONSTRAINT IF EXISTS lesson_submissions_original_lesson_id_fkey;

ALTER TABLE public.lesson_submissions
  ADD CONSTRAINT lesson_submissions_original_lesson_id_fkey
    FOREIGN KEY (original_lesson_id)
    REFERENCES public.lessons(lesson_id)
    ON DELETE SET NULL;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- ALTER TABLE public.lesson_submissions
--   DROP CONSTRAINT IF EXISTS lesson_submissions_original_lesson_id_fkey;
-- ALTER TABLE public.lesson_submissions
--   ADD CONSTRAINT lesson_submissions_original_lesson_id_fkey
--     FOREIGN KEY (original_lesson_id)
--     REFERENCES public.lessons(lesson_id);
