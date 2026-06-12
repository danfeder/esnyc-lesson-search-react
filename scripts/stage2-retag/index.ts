/**
 * Stage 2 corpus re-tag pipeline (PR 6a).
 *
 * Entry-point stub — the runner modules (export-corpus, run-retag,
 * validate-output, generate-diff-report, prepare-apply) land in later tasks.
 * This file exists so the dedicated type-check + lint surface (OQ12) has a
 * target from task A2 onward.
 */

export const STAGE2_RETAG_PIPELINE = 'stage2-retag' as const;
