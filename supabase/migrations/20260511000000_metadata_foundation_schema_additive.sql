-- =====================================================
-- Migration: 20260511000000_metadata_foundation_schema_additive.sql
-- =====================================================
-- Description: Additive schema for the metadata-rebuild foundation phase.
-- Adds three columns to `lessons`:
--   - series_id text             (D6 — series modeling scaffolding)
--   - part_number int            (D6 — series modeling scaffolding)
--   - crf_confirmed boolean      (D9 — CRF backend reviewer-confirmed marker)
--
-- This migration is purely additive. No data migration; no behavior change
-- to the writer/reader paths in this file. Series modeling consumers
-- (dedup-pipeline third-state work, see design doc §11) and the CRF auto-tag
-- pipeline (PR 2) read these columns in later work; foundation phase only
-- ships the column scaffolding.
--
-- See:
--   docs/plans/2026-05-03-metadata-rebuild-foundation-design.md §4
--   docs/plans/2026-05-03-metadata-rebuild-foundation-implementation.md Task 1.2
--
-- Idempotent: every statement uses IF NOT EXISTS, safe to re-run.

-- =====================================================
-- CHANGES
-- =====================================================

-- D6 — series_id (nullable text; sparse population expected initially)
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS series_id text;

-- D6 — part_number (nullable int)
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS part_number int;

-- D9 — crf_confirmed (NOT NULL DEFAULT false; PG ≥11 handles the default
-- via constant-default optimization without a full table rewrite).
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS crf_confirmed boolean NOT NULL DEFAULT false;

-- Partial indexes — sparse columns; index only the populated rows.
CREATE INDEX IF NOT EXISTS lessons_series_id_idx
  ON lessons(series_id)
  WHERE series_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS lessons_part_number_idx
  ON lessons(part_number)
  WHERE part_number IS NOT NULL;

-- Refresh PostgREST schema cache so the new columns are exposed via REST.
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- DROP INDEX IF EXISTS lessons_part_number_idx;
-- DROP INDEX IF EXISTS lessons_series_id_idx;
-- ALTER TABLE lessons DROP COLUMN IF EXISTS crf_confirmed;
-- ALTER TABLE lessons DROP COLUMN IF EXISTS part_number;
-- ALTER TABLE lessons DROP COLUMN IF EXISTS series_id;
