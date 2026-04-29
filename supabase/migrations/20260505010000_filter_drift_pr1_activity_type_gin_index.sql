-- =====================================================
-- Migration: 20260505010000_filter_drift_pr1_activity_type_gin_index.sql
-- =====================================================
-- Description:
--   Filter Metadata Drift Repair, PR-1 fix-up — add GIN index on the
--   activity_type column.
--
--   Round-1 review of PR #471 surfaced that the column-based
--   search_lessons (20260505000000) introduced a sequential-scan path
--   for activity_type filtering: the new query
--     l.activity_type && _alias_activity_type(filter_activity_type)
--   needs a GIN index on the activity_type text[] column, but the
--   existing idx_lessons_activity_type is a btree on the JSONB path
--   ((metadata ->> 'activityType')) — usable by the OLD JSONB query
--   only, dead under the column-based query.
--
--   Impact at 831 rows is negligible (sub-millisecond seq scan), but
--   it's a clear regression vs. the prior JSONB query and grows with
--   corpus. Other column filters (thematic_categories, season_timing,
--   core_competencies, cultural_heritage, location_requirements,
--   cooking_methods, academic_integration, social_emotional_learning)
--   already have GIN indexes on the column itself; this migration
--   closes the activity_type gap.
--
--   The dead JSONB-path btree (idx_lessons_activity_type) is left in
--   place. Harmless, may serve any non-RPC code paths still reading
--   metadata->>'activityType'. Cleanup deferred to a future hygiene
--   migration if needed.
--
-- Design reference: docs/plans/2026-04-28-filter-metadata-drift-repair-design.md
--   §4 — PR-1 scope (activity_type alias-tolerance and column query)
--
-- Implementation reference: bot review M-1 finding on PR #471.
-- =====================================================


-- IF NOT EXISTS for safety (idempotent re-apply).
CREATE INDEX IF NOT EXISTS idx_lessons_activity_type_col
  ON public.lessons USING gin (activity_type);


-- =====================================================
-- ROLLBACK
-- =====================================================
-- DROP INDEX IF EXISTS public.idx_lessons_activity_type_col;
