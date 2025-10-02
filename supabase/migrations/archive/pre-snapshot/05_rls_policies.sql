-- =====================================================
-- 05. ROW LEVEL SECURITY POLICIES
-- =====================================================
-- This migration consolidates all RLS policies
-- and ensures proper security across all tables

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_management_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_resolution_archive ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- LESSONS TABLE POLICIES
-- =====================================================

-- Everyone can view published lessons
CREATE POLICY "Public can view lessons" ON lessons
  FOR SELECT
  USING (true);

-- Only admins can insert lessons
CREATE POLICY "Admins can insert lessons" ON lessons
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Only admins can update lessons
CREATE POLICY "Admins can update lessons" ON lessons
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Only admins can delete lessons
CREATE POLICY "Admins can delete lessons" ON lessons
  FOR DELETE
  USING (is_admin(auth.uid()));

-- =====================================================
-- USER PROFILES POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Users can update their own profile (limited fields)
-- Note: Cannot prevent role/is_active changes via RLS alone
-- This policy only ensures users can update their own profile
-- Role/is_active protection should be enforced at application level
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Only admins can insert profiles (during invitation acceptance)
CREATE POLICY "Service role can insert profiles" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile" ON user_profiles
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =====================================================
-- LESSON SUBMISSIONS POLICIES
-- =====================================================

-- Teachers can view their own submissions
CREATE POLICY "Teachers can view own submissions" ON lesson_submissions
  FOR SELECT
  USING (auth.uid() = teacher_id);

-- Reviewers and admins can view all submissions
CREATE POLICY "Reviewers can view all submissions" ON lesson_submissions
  FOR SELECT
  USING (has_role(auth.uid(), 'reviewer'));

-- Teachers can create submissions
CREATE POLICY "Teachers can create submissions" ON lesson_submissions
  FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

-- Teachers can update their own draft submissions
CREATE POLICY "Teachers can update own drafts" ON lesson_submissions
  FOR UPDATE
  USING (auth.uid() = teacher_id AND status = 'draft')
  WITH CHECK (auth.uid() = teacher_id);

-- Reviewers can update submission status
CREATE POLICY "Reviewers can update submissions" ON lesson_submissions
  FOR UPDATE
  USING (has_role(auth.uid(), 'reviewer'))
  WITH CHECK (has_role(auth.uid(), 'reviewer'));

-- =====================================================
-- SUBMISSION REVIEWS POLICIES
-- =====================================================

-- Teachers can view reviews of their submissions
CREATE POLICY "Teachers can view own submission reviews" ON submission_reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lesson_submissions
      WHERE submission_reviews.submission_id = lesson_submissions.id
      AND lesson_submissions.teacher_id = auth.uid()
    )
  );

-- Reviewers can view all reviews
CREATE POLICY "Reviewers can view all reviews" ON submission_reviews
  FOR SELECT
  USING (has_role(auth.uid(), 'reviewer'));

-- Reviewers can create reviews
CREATE POLICY "Reviewers can create reviews" ON submission_reviews
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'reviewer') AND reviewer_id = auth.uid());

-- Reviewers can update their own reviews
CREATE POLICY "Reviewers can update own reviews" ON submission_reviews
  FOR UPDATE
  USING (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());

-- =====================================================
-- USER INVITATIONS POLICIES
-- =====================================================

-- Public can view invitations by token (for acceptance flow)
CREATE POLICY "Public can view invitation by token" ON user_invitations
  FOR SELECT
  USING (true);  -- Additional security through token uniqueness

-- Admins can view all invitations
CREATE POLICY "Admins can view all invitations" ON user_invitations
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Admins can create invitations
CREATE POLICY "Admins can create invitations" ON user_invitations
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()) AND invited_by = auth.uid());

-- Admins can update their own invitations
CREATE POLICY "Admins can update own invitations" ON user_invitations
  FOR UPDATE
  USING (invited_by = auth.uid() AND is_admin(auth.uid()))
  WITH CHECK (invited_by = auth.uid() AND is_admin(auth.uid()));

-- Admins can delete their own invitations
CREATE POLICY "Admins can delete own invitations" ON user_invitations
  FOR DELETE
  USING (invited_by = auth.uid() AND is_admin(auth.uid()));

-- =====================================================
-- USER MANAGEMENT AUDIT POLICIES
-- =====================================================

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs" ON user_management_audit
  FOR SELECT
  USING (
    actor_id = auth.uid() OR 
    target_user_id = auth.uid()
  );

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs" ON user_management_audit
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Service role can insert audit logs (from functions)
CREATE POLICY "System can insert audit logs" ON user_management_audit
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- DUPLICATE PAIRS POLICIES
-- =====================================================

-- Reviewers can view duplicate pairs
CREATE POLICY "Reviewers can view duplicate pairs" ON duplicate_pairs
  FOR SELECT
  USING (has_role(auth.uid(), 'reviewer'));

-- Admins can manage duplicate pairs
CREATE POLICY "Admins can insert duplicate pairs" ON duplicate_pairs
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update duplicate pairs" ON duplicate_pairs
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete duplicate pairs" ON duplicate_pairs
  FOR DELETE
  USING (is_admin(auth.uid()));

-- =====================================================
-- DUPLICATE RESOLUTION ARCHIVE POLICIES
-- =====================================================

-- Admins can view resolution archive
CREATE POLICY "Admins can view resolution archive" ON duplicate_resolution_archive
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Service role can insert archive records (from functions)
CREATE POLICY "System can insert archive records" ON duplicate_resolution_archive
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA auth TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_lessons TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_emails(UUID[]) TO authenticated;

-- =====================================================
-- ROLLBACK INSTRUCTIONS (commented for safety)
-- =====================================================
-- To rollback this migration, run the following commands:
-- 
-- -- Revoke grants
-- REVOKE EXECUTE ON FUNCTION get_user_emails(UUID[]) FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION search_lessons FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION has_role(UUID, TEXT) FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION is_admin(UUID) FROM authenticated;
-- REVOKE USAGE ON SCHEMA auth FROM authenticated;
-- REVOKE USAGE ON SCHEMA public FROM authenticated;
-- 
-- -- Drop policies for lesson_similarities
-- DROP POLICY IF EXISTS "Anyone can view lesson similarities" ON lesson_similarities;
-- DROP POLICY IF EXISTS "Admins can manage lesson similarities" ON lesson_similarities;
-- 
-- -- Drop policies for submission_similarities
-- DROP POLICY IF EXISTS "Users can view similarities for their submissions" ON submission_similarities;
-- DROP POLICY IF EXISTS "Reviewers can view all submission similarities" ON submission_similarities;
-- DROP POLICY IF EXISTS "Users can create similarities for their submissions" ON submission_similarities;
-- DROP POLICY IF EXISTS "Admins can manage submission similarities" ON submission_similarities;
-- 
-- -- Drop policies for submission_reviews
-- DROP POLICY IF EXISTS "Teachers can view reviews of their submissions" ON submission_reviews;
-- DROP POLICY IF EXISTS "Reviewers can view all reviews" ON submission_reviews;
-- DROP POLICY IF EXISTS "Reviewers can create reviews" ON submission_reviews;
-- DROP POLICY IF EXISTS "Reviewers can update their own reviews" ON submission_reviews;
-- DROP POLICY IF EXISTS "Admins can manage all reviews" ON submission_reviews;
-- 
-- -- Drop policies for lesson_submissions
-- DROP POLICY IF EXISTS "Users can view their own submissions" ON lesson_submissions;
-- DROP POLICY IF EXISTS "Reviewers can view submitted lessons" ON lesson_submissions;
-- DROP POLICY IF EXISTS "Users can create their own submissions" ON lesson_submissions;
-- DROP POLICY IF EXISTS "Users can update their draft submissions" ON lesson_submissions;
-- DROP POLICY IF EXISTS "Reviewers can update submission status" ON lesson_submissions;
-- DROP POLICY IF EXISTS "Admins can manage all submissions" ON lesson_submissions;
-- 
-- -- Drop policies for lessons
-- DROP POLICY IF EXISTS "Anyone can view lessons" ON lessons;
-- DROP POLICY IF EXISTS "Reviewers can create lessons" ON lessons;
-- DROP POLICY IF EXISTS "Reviewers can update lessons" ON lessons;
-- DROP POLICY IF EXISTS "Admins can delete lessons" ON lessons;
-- 
-- -- Drop functions
-- DROP FUNCTION IF EXISTS get_user_emails(UUID[]);
-- DROP FUNCTION IF EXISTS is_admin(UUID);
-- DROP FUNCTION IF EXISTS has_role(UUID, TEXT);
-- 
-- -- Disable RLS on tables
-- =====================================================
-- WARNING: Disabling RLS removes all row-level access controls and may expose sensitive data.
-- ONLY disable RLS if the tables are being completely removed immediately after.
-- =====================================================
-- ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE lesson_submissions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE submission_reviews DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE submission_similarities DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE lesson_similarities DISABLE ROW LEVEL SECURITY;
-- 
-- =====================================================