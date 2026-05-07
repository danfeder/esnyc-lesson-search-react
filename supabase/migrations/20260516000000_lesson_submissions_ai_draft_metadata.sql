-- Metadata-rebuild foundation phase, PR 2, Task 2.2a:
-- Add storage columns for submission-time LLM-drafted metadata.
--
-- Submitters provide zero classification metadata; the `process-submission`
-- edge function will run vocab-locked Opus tagging prompts and write canonical
-- drafts here. ReviewDetail.tsx reads `ai_draft_metadata` at form-init when no
-- `submission_reviews` row exists yet (Task 2.2b). The `complete_review_atomic`
-- RPC reads `ai_draft_metadata.tags` directly to populate `lessons.tags` on
-- approve_new / approve_update (Task 2.2c side-channel — review-form schema
-- doesn't model `tags`).
--
-- Storage shape invariant: `ai_draft_metadata` is in CANONICAL-KEYS shape
-- (matches `lessons.metadata` — array values for thematicCategories /
-- seasonTiming / locationRequirements; `cultural_responsiveness_features` as
-- text[] of master-list values; `tags` as text[] of closed-enum values). NOT
-- review-form shape (which uses single-select strings + `themes` / `season` /
-- `location` keys); the read-site applies `lessonToReviewMapper` for display.
--
-- RLS: columns inherit `lesson_submissions` table policies. Service-role write
-- from `process-submission` is unchanged from the existing pattern.

ALTER TABLE lesson_submissions
  ADD COLUMN IF NOT EXISTS ai_draft_metadata jsonb DEFAULT NULL;

ALTER TABLE lesson_submissions
  ADD COLUMN IF NOT EXISTS ai_draft_generated_at timestamptz DEFAULT NULL;

ALTER TABLE lesson_submissions
  ADD COLUMN IF NOT EXISTS ai_draft_model text DEFAULT NULL;

COMMENT ON COLUMN lesson_submissions.ai_draft_metadata IS
  'LLM-drafted metadata in CANONICAL-KEYS shape (matches lessons.metadata, not review-form shape). Populated by process-submission edge function via vocab-locked Opus prompts. Read at ReviewDetail form-init when no review row exists; tags side-channeled into lessons.tags via complete_review_atomic. NULL until the submission flow runs.';

COMMENT ON COLUMN lesson_submissions.ai_draft_generated_at IS
  'Timestamp when ai_draft_metadata was written by process-submission. NULL until the LLM tagging step runs.';

COMMENT ON COLUMN lesson_submissions.ai_draft_model IS
  'Model identifier used to generate ai_draft_metadata (e.g., "claude-opus-4-7"). Provenance for audit / regression diffs. NULL until the LLM tagging step runs.';

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- ALTER TABLE lesson_submissions DROP COLUMN IF EXISTS ai_draft_model;
-- ALTER TABLE lesson_submissions DROP COLUMN IF EXISTS ai_draft_generated_at;
-- ALTER TABLE lesson_submissions DROP COLUMN IF EXISTS ai_draft_metadata;
