-- =====================================================
-- Migration: 20260427000000_phase_3_multi_review_dedup.sql
-- =====================================================
-- Description: Phase 3 of the lesson-submission Tier-1 work (Tier-2 #12).
-- Creates submission_reviews_archive and de-duplicates the 16 submissions
-- that currently have 2–4 review rows each. After this migration every
-- submission has at most one row in submission_reviews; the older rows
-- are preserved in submission_reviews_archive with archive_reason
-- 'multi_review_dedup_2026_04'.
--
-- Why this matters: ReviewDetail.tsx loads submission_reviews for a given
-- submission with NO ORDER BY and reads reviews?.[0]. With multiple rows
-- the displayed "current review" is non-deterministic. This migration
-- removes the ambiguity in the existing data; a companion frontend change
-- adds `.order('created_at', { ascending: false }).limit(1)` to the load
-- query so the *read* path stays deterministic if duplicates ever recur.
-- Note: the *write* path in ReviewDetail.tsx still uses a plain INSERT
-- with no ON CONFLICT — a reviewer who saves the form twice can still
-- create a new duplicate row. That gap closes in Phase 4, which adds the
-- UNIQUE(submission_id) constraint and replaces the direct INSERT with
-- the atomic complete_review RPC. Until Phase 4 ships, occasional new
-- dupes are possible; this migration plus the .limit(1) read guard
-- ensures the UI still shows a deterministic answer in the meantime.
--
-- Canonical-row rule (verified deterministic on PROD: no NULL created_at,
-- no ties on (submission_id, created_at)):
--   row_number() OVER (PARTITION BY submission_id
--                      ORDER BY created_at DESC, id DESC) = 1
-- The id DESC tie-breaker is defensive — there are zero ties today.
--
-- Verified pre-conditions on PROD 2026-04-27:
--   - submission_reviews has exactly 12 columns (id, submission_id,
--     reviewer_id, tagged_metadata, detected_duplicates,
--     canonical_lesson_id, review_started_at, review_completed_at,
--     time_spent_seconds, created_at, decision, notes). If a future
--     migration adds a column to submission_reviews before this one runs,
--     this archive INSERT will silently leave that column out — re-check
--     the column list against information_schema.columns before applying
--     downstream of any submission_reviews schema change.
--   - 16 multi-review submissions, 36 affected rows total, 20 to archive,
--     16 to remain.
--   - All 36 rows have decision='approve_new'; tagged_metadata + notes are
--     byte-identical within each submission (the "reviewer saved the form
--     twice" pattern, not a multi-reviewer race). Confirmed via snapshot
--     in scripts/orphan-recovery/snapshots/multi-review-pre-20260427.json.
--   - Held-out Phase-2 orphans (Applesauce ea271d13…, Acai Bowls
--     16603243…) have exactly one review row each; they are not in this
--     dedup set.
--
-- Idempotency:
--   - CREATE TABLE uses IF NOT EXISTS; ENABLE ROW LEVEL SECURITY is
--     idempotent.
--   - Archive INSERT is gated by WHERE NOT EXISTS (… archive WHERE id =
--     ta.id) so already-archived ids are skipped.
--   - DELETE only removes rows whose id is already in the archive with
--     reason 'multi_review_dedup_2026_04'.
-- Re-running this migration on already-deduped data is a no-op.
--
-- Concurrency note: supabase db push wraps each migration in a single
-- transaction, so the snapshot here is consistent. New review rows
-- inserted concurrently (between this transaction's snapshot CTE and
-- COMMIT) won't be seen and could leave a stale duplicate after commit.
-- Treated as low-risk: the migration runs in seconds, is idempotent, and
-- the post-deploy verification SELECT will surface any leftover. The
-- UNIQUE(submission_id) constraint added in Phase 4 will prevent any
-- recurrence going forward.

-- =====================================================
-- CHANGES
-- =====================================================

-- 1. Archive table. Mirrors submission_reviews columns exactly, plus
--    archive bookkeeping. NO foreign keys are carried over: archived rows
--    intentionally reference historical state that may not still exist.
CREATE TABLE IF NOT EXISTS public.submission_reviews_archive (
  id                       uuid           NOT NULL,
  submission_id            uuid           NOT NULL,
  reviewer_id              uuid           NOT NULL,
  tagged_metadata          jsonb          NOT NULL DEFAULT '{}'::jsonb,
  detected_duplicates      jsonb,
  canonical_lesson_id      text,
  review_started_at        timestamptz,
  review_completed_at      timestamptz,
  time_spent_seconds       integer,
  created_at               timestamptz,
  decision                 text,
  notes                    text,
  -- Archive bookkeeping:
  archived_at              timestamptz    NOT NULL DEFAULT now(),
  archive_reason           text           NOT NULL,
  PRIMARY KEY (id)
);

COMMENT ON TABLE public.submission_reviews_archive IS
  'Historical record of submission_reviews rows that were superseded by a '
  'later review or by a deduplication migration. Locked down: no SELECT '
  'policy granted; reads happen only via service role / superuser.';

-- 2. Lock down with RLS. New tables always get RLS enabled per project
--    convention (supabase/migrations/CLAUDE.md). No policies are added in
--    this migration: the table is intentionally inaccessible to anon and
--    authenticated roles. Future UI work that wants to expose archived
--    review history must add an explicit SELECT policy.
ALTER TABLE public.submission_reviews_archive ENABLE ROW LEVEL SECURITY;

-- 3. Archive non-canonical rows. Idempotent via WHERE NOT EXISTS.
WITH ranked AS (
  SELECT id, submission_id, reviewer_id, tagged_metadata, detected_duplicates,
         canonical_lesson_id, review_started_at, review_completed_at,
         time_spent_seconds, created_at, decision, notes,
         row_number() OVER (
           PARTITION BY submission_id
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM public.submission_reviews
), to_archive AS (
  SELECT id, submission_id, reviewer_id, tagged_metadata, detected_duplicates,
         canonical_lesson_id, review_started_at, review_completed_at,
         time_spent_seconds, created_at, decision, notes
  FROM ranked
  WHERE rn > 1
)
INSERT INTO public.submission_reviews_archive (
  id, submission_id, reviewer_id, tagged_metadata, detected_duplicates,
  canonical_lesson_id, review_started_at, review_completed_at,
  time_spent_seconds, created_at, decision, notes,
  archived_at, archive_reason
)
SELECT
  ta.id, ta.submission_id, ta.reviewer_id, ta.tagged_metadata, ta.detected_duplicates,
  ta.canonical_lesson_id, ta.review_started_at, ta.review_completed_at,
  ta.time_spent_seconds, ta.created_at, ta.decision, ta.notes,
  now(), 'multi_review_dedup_2026_04'
FROM to_archive ta
WHERE NOT EXISTS (
  SELECT 1 FROM public.submission_reviews_archive a WHERE a.id = ta.id
);

-- 4. Delete the now-archived rows from submission_reviews. Scoped to every
--    id currently in submission_reviews_archive with archive_reason
--    'multi_review_dedup_2026_04' — on the first run that's exactly the
--    20 rows the INSERT above just wrote; on re-runs those ids are already
--    absent from submission_reviews so the DELETE is a 0-row no-op.
--    Future operators: do NOT manually re-use this archive_reason string
--    when copying historical rows into the archive — the next run of this
--    migration would treat them as in-scope for deletion. Mint a fresh
--    archive_reason (e.g., 'multi_review_dedup_2026_05') for any later
--    cleanup pass.
DELETE FROM public.submission_reviews
WHERE id IN (
  SELECT id FROM public.submission_reviews_archive
  WHERE archive_reason = 'multi_review_dedup_2026_04'
);

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- Re-insert archived rows, then drop the archive bookkeeping rows. Safe to
-- run any time; gated by NOT EXISTS so it won't double-insert. After
-- rollback the table itself is left in place (DROP TABLE
-- submission_reviews_archive separately if desired).
--
-- IMPORTANT: After running the INSERT below, count the rows it wrote
-- (`GET DIAGNOSTICS` in plpgsql, or run a separate `SELECT count(*) FROM
-- public.submission_reviews_archive WHERE archive_reason =
-- 'multi_review_dedup_2026_04'` and compare to the post-INSERT count of
-- public.submission_reviews rows for those submission_ids). A delta
-- smaller than 20 means an intervening write claimed one of the
-- submission_id slots between the dedup and the rollback (likely from
-- Phase 4's complete_review RPC after it ships). The NOT EXISTS guard
-- silently skips that row. Investigate before declaring rollback complete.
--
-- INSERT INTO public.submission_reviews (
--   id, submission_id, reviewer_id, tagged_metadata, detected_duplicates,
--   canonical_lesson_id, review_started_at, review_completed_at,
--   time_spent_seconds, created_at, decision, notes
-- )
-- SELECT
--   a.id, a.submission_id, a.reviewer_id, a.tagged_metadata, a.detected_duplicates,
--   a.canonical_lesson_id, a.review_started_at, a.review_completed_at,
--   a.time_spent_seconds, a.created_at, a.decision, a.notes
-- FROM public.submission_reviews_archive a
-- WHERE a.archive_reason = 'multi_review_dedup_2026_04'
--   AND NOT EXISTS (SELECT 1 FROM public.submission_reviews sr WHERE sr.id = a.id);
--
-- DELETE FROM public.submission_reviews_archive
-- WHERE archive_reason = 'multi_review_dedup_2026_04';
--
-- -- (Optionally, then:)
-- -- DROP TABLE IF EXISTS public.submission_reviews_archive;
