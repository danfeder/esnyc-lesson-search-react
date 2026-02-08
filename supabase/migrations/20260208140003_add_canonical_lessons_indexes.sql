-- =====================================================
-- Migration: 20260208140003_add_canonical_lessons_indexes.sql
-- =====================================================
-- Description: Add missing indexes on canonical_lessons for common query patterns.
--   The resolved_by FK column has no index, causing sequential scans
--   when filtering by who resolved a duplicate.

-- =====================================================
-- CHANGES
-- =====================================================

-- Index for filtering by resolver (admin queries)
CREATE INDEX IF NOT EXISTS idx_canonical_lessons_resolved_by
  ON canonical_lessons (resolved_by);

-- Index for filtering by resolution type (common filter)
CREATE INDEX IF NOT EXISTS idx_canonical_lessons_resolution_type
  ON canonical_lessons (resolution_type);

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- DROP INDEX IF EXISTS idx_canonical_lessons_resolved_by;
-- DROP INDEX IF EXISTS idx_canonical_lessons_resolution_type;
