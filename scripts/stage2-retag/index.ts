/**
 * Stage 2 corpus re-tag pipeline (PR 6a).
 *
 * Module inventory:
 *   - export-corpus.ts        — A4: exports the live lesson corpus to
 *                               artifacts/corpus.jsonl (id, title, body,
 *                               current field values).
 *   - vocab.ts                — A3: locked canonical vocab for the 12
 *                               main-pass fields (enums.json + worksheet
 *                               artifacts + smaller-fields data file).
 *   - schema.ts               — A5: monolithic `submit_tags` tool schema,
 *                               Zod result schema, token-mass estimate.
 *   - preflight-token-mass.ts — A5 guard: live count_tokens budget check +
 *                               cache-floor check (static fallback offline).
 *   - run-retag.ts            — A6: the synchronous monolithic runner
 *                               (main pass + per-field repair pass).
 *   - normalize.ts            — code-enforced mechanical tagging rules
 *                               (R1 academic-exclusivity strip, R4
 *                               concepts/integration reconcile, R5
 *                               synonym-pair lint); pure + idempotent, with
 *                               non-silent `normalizations` provenance.
 *   - validate-output.ts      — A7: run-level output validation summary.
 *   - generate-diff-report.ts — A7: per-field corpus diff + plain-language
 *                               markdown report (Protocol-B artifact).
 *   - prepare-apply.ts        — lands in PR B (apply artifacts; not here).
 *
 * This file remains the dedicated type-check + lint surface target (OQ12).
 */

export const STAGE2_RETAG_PIPELINE = 'stage2-retag' as const;
