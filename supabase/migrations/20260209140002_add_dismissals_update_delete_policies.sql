-- =====================================================
-- Migration: 20260209140002_add_dismissals_update_delete_policies.sql
-- =====================================================
-- Description: Add missing UPDATE and DELETE RLS policies on
--   duplicate_group_dismissals table. Currently admins can create
--   and view dismissals but cannot correct or remove them.

-- =====================================================
-- CHANGES
-- =====================================================

CREATE POLICY "Admins can update dismissed groups"
  ON duplicate_group_dismissals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'reviewer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'reviewer')
    )
  );

CREATE POLICY "Admins can delete dismissed groups"
  ON duplicate_group_dismissals
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'reviewer')
    )
  );

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- DROP POLICY IF EXISTS "Admins can update dismissed groups" ON duplicate_group_dismissals;
-- DROP POLICY IF EXISTS "Admins can delete dismissed groups" ON duplicate_group_dismissals;
