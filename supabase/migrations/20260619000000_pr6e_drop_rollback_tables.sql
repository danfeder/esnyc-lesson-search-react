-- =====================================================
-- Migration: 20260619000000_pr6e_drop_rollback_tables.sql
-- =====================================================
-- Description:
--   PR E (Metadata-rebuild Stage-2 re-tag — track cleanup). Drop the three
--   rollback/snapshot tables that captured pre-apply state for the canonicalization
--   and re-tag writes. They were retained ONLY as a manual restore window:
--
--     * public.pr5a_heritage_rollback  — pre-PR-5a heritage snapshot
--         (cultural_heritage column + metadata->'culturalHeritage' mirror)
--         created by 20260611000000_pr5a_heritage_canonicalization.sql
--     * public.pr5b_concepts_rollback  — pre-PR-5b academicConcepts snapshot
--         created by 20260612000000_pr5b_concepts_canonicalization.sql
--         (also written to by 20260613000000_fold_urban_revitalization_concept.sql)
--     * public.pr6_retag_rollback      — pre-PR-6-C2 full-row snapshot of every
--         re-tagged lesson (text[] cols + content_text + metadata jsonb)
--         created by 20260617000000_pr6c2_retag_apply.sql
--
--   These are dropped now because the re-tag (PR C2) is PROD-VERIFIED, which
--   closes the safety window. Per PR 5 locked design §4.8: "drop only AFTER the
--   re-tag is PROD-verified." OQ13 likewise locks PR E to drop exactly these
--   three rollback tables (+ staging — see note below).
--
--   Row counts at drop time (supervisor PROD-verified, read-only, 2026-06-19):
--     pr5a_heritage_rollback  = 37
--     pr5b_concepts_rollback  = 676
--     pr6_retag_rollback      = 754
--   recorded here for the historical record (the data itself is discarded).
--
--   Dependency check (supervisor PROD-verified, read-only): ZERO dependents on
--   all three — no views, no foreign keys from any other table, no rules. A plain
--   DROP TABLE (NO CASCADE) is therefore both sufficient and the SAFEST form: if
--   any unexpected dependent existed, a non-CASCADE drop would FAIL LOUDLY rather
--   than silently cascade away something we did not intend to remove.
--
--   "+ any staging table" in the PR E plan (E1) refers to NOTHING in the database:
--   the C2 staging artifacts were local, gitignored SQL files — not DB tables.
--   So this migration drops exactly THREE tables, nothing else.
--
--   IRREVERSIBLE BY DESIGN: the snapshot data is permanently discarded. The
--   re-tag is PROD-verified, so the restore window has intentionally closed —
--   there is no rollback for this migration (recreating empty tables would not
--   restore the snapshots). This migration writes to NO live table; it only
--   drops snapshot tables.

-- =====================================================
-- CHANGES
-- =====================================================

DROP TABLE IF EXISTS public.pr5a_heritage_rollback;
DROP TABLE IF EXISTS public.pr5b_concepts_rollback;
DROP TABLE IF EXISTS public.pr6_retag_rollback;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- IRREVERSIBLE — the snapshot data is discarded by design (the safety window has
-- closed now that the re-tag is PROD-verified). Recreating the empty tables would
-- NOT restore the captured pre-apply state, so no rollback is provided here.
