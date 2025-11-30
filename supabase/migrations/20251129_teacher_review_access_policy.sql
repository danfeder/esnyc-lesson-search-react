-- Migration: 20251129_teacher_review_access_policy.sql
-- Description: Add RLS policy for teachers to view reviews on their own submissions
-- Issue: #122 - Security: Add RLS policies for review access control

-- Teachers can view reviews for submissions they submitted
-- This allows teachers to see feedback on their lesson submissions
CREATE POLICY "Teachers can view own submission reviews" ON "public"."submission_reviews"
  FOR SELECT
  TO "authenticated"
  USING (
    EXISTS (
      SELECT 1 FROM "public"."lesson_submissions"
      WHERE "lesson_submissions"."id" = "submission_reviews"."submission_id"
      AND "lesson_submissions"."teacher_id" = "auth"."uid"()
    )
  );

-- Rollback:
-- DROP POLICY IF EXISTS "Teachers can view own submission reviews" ON "public"."submission_reviews";
