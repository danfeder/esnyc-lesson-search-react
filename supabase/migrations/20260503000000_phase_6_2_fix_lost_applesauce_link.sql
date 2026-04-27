-- =====================================================
-- Migration: 20260503000000_phase_6_2_fix_lost_applesauce_link.sql
-- =====================================================
-- Description: Phase 6.2 fix-up. Restores tracking for the previously
-- published Applesauce submission `68ce56c5-e3f0-40be-be07-35e9f3be84eb`
-- (submitted 2025-08-19), which was orphaned in the FK sense by Phase
-- 6.2's §4D DELETE of the synthetic duplicate row
-- `lesson_79f89defede54a1e87632373e74486a5`.
--
-- Background:
--   The library had two Applesauce rows for the same Google Doc
--   `1hwLrvv9CUTx2rw2UMTDhqmLXQTd0hEsxan3HvNpPwa8`:
--     - `1hwLrvv9...` (canonical, lesson_id == doc_id, predates the
--       submission system, original_submission_id NULL).
--     - `lesson_79f89def...` (synthetic, created by an older import
--       path; original_submission_id = `68ce56c5...`, content_hash
--       `ce5c371320...`, content_len 6796).
--
--   2025-08-19: teacher submits Applesauce → published to the synthetic
--     row `lesson_79f89def...` (matched the doc to the synth row's path).
--   2025-09-09: same/another teacher submits Applesauce again →
--     approved as `approve_new` but never published; entered the orphan
--     set as `ea271d13-78db-437c-aa9f-594ce567f90c`. The dedup pipeline
--     correctly flagged the cosine 0.9999 match against the synth row
--     (recorded in `submission_similarities`) but the reviewer approved
--     as new anyway.
--   2026-04-27: Phase 6.2 (PR #466) treated `ea271d13` as a B-UPDATE to
--     the canonical `1hwLrvv9...` row (§4A archive + §4B UPDATE), then
--     §4D deleted the synthetic duplicate `lesson_79f89def...`. The
--     pre-delete FK clearance scan checked refs INTO the synth row
--     across 9 tables (all zero) but did NOT check the synth row's own
--     `lessons.original_submission_id` (which was `68ce56c5...`). Result:
--     `68ce56c5` lost its publication-history FK link. The post-Phase-6.2
--     PROD verification probe found `true_unrecovered_orphans = 1` —
--     `68ce56c5`, the lone unaccounted approved submission.
--
-- Why a sibling archive row instead of restoring the synthetic row:
--   - The synthetic row was a true duplicate of the canonical (same doc,
--     near-identical content). Restoring it would reverse Phase 6.2's
--     dup-cleanup intent. The library should have ONE Applesauce row
--     for this doc, not two.
--   - The submission record itself (`lesson_submissions.id =
--     68ce56c5...`) still exists with full content, hash, embedding,
--     and tagged_metadata — no teacher work is lost.
--   - The right framing: BOTH `68ce56c5` and `ea271d13` are effectively
--     B-update submissions to the canonical `1hwLrvv9...` row (re-uploads
--     of the same Google Doc 3 weeks apart). Phase 6.2 §4 captured
--     `ea271d13` correctly; this fix captures `68ce56c5` symmetrically.
--   - Both submissions saw the SAME pre-merge state of the canonical
--     row (the OLD short content, content_hash `07c415ad...`, 2556
--     chars), because nothing else updated the canonical row between
--     2025-08-19 and 2026-04-27. So this fix legitimately mirrors
--     `ea271d13`'s archive row — same pre-state, different
--     `archived_from_submission_id`.
--
-- Effect after apply:
--   - `lesson_versions` gains one new row: `lesson_id =
--     1hwLrvv9...`, `archived_from_submission_id = 68ce56c5...`,
--     `archive_reason = 'historical_b_update_recovery_2026_04'`,
--     content_text + metadata + title + summary + grade_levels +
--     file_link copied from the existing `ea271d13` archive row
--     (i.e., the BEFORE state of `1hwLrvv9...` immediately prior
--     to Phase 6.2 §4B).
--   - `true_unrecovered_orphans` count goes 1 → 0.
--   - 113/113 approved submissions now have either a lesson row
--     (via `original_submission_id`) OR a recovery archive row
--     (via `archived_from_submission_id`). The orphan-recovery
--     sub-initiative is fully closed.
--
-- Source-row handling:
--   The migration COPIES from the existing `ea271d13` archive row
--   rather than re-deriving the BEFORE state from scratch — that
--   row IS the canonical record of the BEFORE state and is the
--   single source of truth. If the `ea271d13` archive row is
--   somehow missing (impossible per Phase 6.2's idempotency
--   guarantees + PROD verification, but defensible to guard for),
--   this migration is a 0-row no-op rather than failing or
--   inserting partial data.
--
-- Idempotency: per-row `NOT EXISTS` guard on the new
-- `archived_from_submission_id`. Re-application is a 0-row no-op.
--
-- Rollback (single statement):
--   DELETE FROM lesson_versions
--   WHERE lesson_id = '1hwLrvv9CUTx2rw2UMTDhqmLXQTd0hEsxan3HvNpPwa8'
--     AND archived_from_submission_id = '68ce56c5-e3f0-40be-be07-35e9f3be84eb'::uuid
--     AND archive_reason = 'historical_b_update_recovery_2026_04';
--
-- Process learning (added to MEMORY.md "Open hygiene follow-ups"):
--   When deleting a lesson row, also check
--   `lessons.original_submission_id` ON the row being deleted, not
--   just FK refs INTO it. Phase 6.2 §4D's pre-delete clearance
--   missed this direction.

-- =====================================================
-- CHANGES
-- =====================================================

INSERT INTO lesson_versions (
  lesson_id, title, summary, file_link, grade_levels, metadata, content_text,
  version_number, archived_from_submission_id, archive_reason
)
SELECT
  lv.lesson_id, lv.title, lv.summary, lv.file_link, lv.grade_levels, lv.metadata, lv.content_text,
  lv.version_number,
  '68ce56c5-e3f0-40be-be07-35e9f3be84eb'::uuid,
  'historical_b_update_recovery_2026_04'
FROM lesson_versions lv
WHERE lv.lesson_id = '1hwLrvv9CUTx2rw2UMTDhqmLXQTd0hEsxan3HvNpPwa8'
  AND lv.archived_from_submission_id = 'ea271d13-78db-437c-aa9f-594ce567f90c'::uuid
  AND lv.archive_reason = 'historical_b_update_recovery_2026_04'
  AND NOT EXISTS (
    SELECT 1 FROM lesson_versions
    WHERE lesson_id = '1hwLrvv9CUTx2rw2UMTDhqmLXQTd0hEsxan3HvNpPwa8'
      AND archived_from_submission_id = '68ce56c5-e3f0-40be-be07-35e9f3be84eb'::uuid
      AND archive_reason = 'historical_b_update_recovery_2026_04'
  );

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- DELETE FROM lesson_versions
-- WHERE lesson_id = '1hwLrvv9CUTx2rw2UMTDhqmLXQTd0hEsxan3HvNpPwa8'
--   AND archived_from_submission_id = '68ce56c5-e3f0-40be-be07-35e9f3be84eb'::uuid
--   AND archive_reason = 'historical_b_update_recovery_2026_04';
