# Metadata Rebuild — Foundation Phase — Execution Status

**Last updated:** 2026-05-06 — Session 28 (PR 1b Task 1b.1 shipped on `feat/metadata-foundation-activity-type-multi`; 1 commit `54124a5` ahead of `origin/main`).

> **About this file.** Active status carrying forward only what the next 1-2 sessions need to orient. Full per-session journal for Sessions 1-17 lives in `2026-05-03-metadata-rebuild-foundation-execution-status-archive.md` (965+ lines, read on demand via grep). When a new PR cycle begins, that PR's session entries can move to the archive at the start of the following PR; the active file always reflects current PR + a small carry-forward roll-up.

## Current State

**Active PR:** **PR 1b — D2 multi-select refinement.** Branch `feat/metadata-foundation-activity-type-multi` exists (created off `8497752` Session 28); 1 commit ahead of `origin/main` plus a forthcoming docs sync commit. Task 1b.1 shipped this session as `54124a5`; ~7 sub-tasks remain (1b.2 through 1b.8).

**Why PR 1b interrupts PR 2:** mid-Task-2.4 ground-truth resolution surfaced concrete evidence that D2's single-select decision was made on n=1 (Dr. Carver Lotion-Making) but actual rate is ~5/26 = 19% multi-axis lessons — extrapolates to ~30+ in the 772-row corpus. User decided to retire `'both'` and switch to true multi-element array. See decision journal D2.1 for full rationale.

**PR 2 branch state (paused):** `feat/metadata-foundation-llm-tagging` is 20 commits ahead of `origin/main` (Sessions 18-27). Untouched until PR 1b merges; then rebases onto new main. PR 2's `complete_review_atomic` extension (Task 2.2c, migration `20260517000000_*`) touched `tags`, not `activityType`. **Caveat:** PR 1b Task 1b.2 will modify the same `complete_review_atomic` RPC body (array passthrough for activityType) — a rebase conflict on PR 2's `20260517000000_*` migration is therefore expected and worth a heads-up when PR 2 resumes.

**Current task:** Session 29 picks up **Task 1b.2 — `complete_review_atomic` migration for array passthrough.** New migration at `supabase/migrations/20260518100000_*` (or `20260519000000_*`) that replaces `ARRAY[v_meta->>'activityType']` in the RPC's INSERT (approve_new) + UPDATE (approve_update) clauses with `_phase4_jsonb_text_array_or_null(v_meta->'activityType')`.

**Pre-Task-1b.2 verification (load-bearing for next session):** impl plan §Task 1b.2 cites line numbers from `20260517000000_complete_review_atomic_tags_side_channel.sql` — that migration is on PR 2 branch only, NOT on PR 1b's main. The actual source for `complete_review_atomic` on PR 1b's main is `20260512000000_drop_lesson_format.sql` plus subsequent carry-forward migrations. **First step Task 1b.2:** query TEST DB via `mcp__supabase-test__execute_sql` for `pg_get_functiondef('public.complete_review_atomic'::regproc::oid)` (or read the latest applicable migration on main directly). Find the activityType INSERT + UPDATE references, plan the fix. Do NOT trust impl plan's line numbers verbatim — they reference PR 2 branch state.

**Known unit-test breakage on PR 1b branch (will be fixed in Task 1b.3):** `src/types/edgeSharedSchemas.equivalence.test.ts` has 2 failing assertions (`activity_type values match` + the review-form `{ activityType: 'both' }` valid fixture). Cause: Deno mirror still has `'both'` in `ACTIVITY_TYPE_VALUES` (`supabase/functions/_shared/metadataSchemas.ts:25`); canonical Zod doesn't. Task 1b.3 syncs the mirror + updates fixtures. `npm run type-check` and `npm run lint` are green (Task 1b.1 commit included a 1-line fix on `reviewToLessonMapper.test.ts:201` to satisfy the narrowed literal union — `'both'` → `'cooking'` in the all-fields-populated round-trip fixture).

**Done in Session 27 (planning + docs only — no code commits beyond this docs commit):**
- Investigated activity_type ground-truth source candidates: 113 reviewer-tagged submissions on TEST/PROD (avg body 5.5K chars, distribution garden 67 / cooking 33 / academic 11 / both 2 / craft 0).
- Built v1 worksheet at 26 craft-suspect candidates × single-label.
- User identified the missing-value problem: `craft` was new in PR 1, no reviewer queue activity since, so 113 reviewer labels were forced into the old 4-value vocab. Empirical check confirmed 5+ multi-axis lessons mis-labeled.
- User-driven D2 re-open after evidence accumulated. User chose Option B (true multi-select) over A (rename `both` → `multi`) over C (status quo with caveat).
- User chose B-1 (retire `both` entirely) over B-2 (keep as legacy synonym). Rationale: cleaner semantic surface; mechanical migration.
- I dispatched Opus code-explorer dependency sweep across 15 categories. Result: ~70 surfaces, ~12 high-risk, 8 in PR 1b scope. Substrate already array-shaped (column `text[]`, CHECK `<@`, trigger validation array-tolerant).
- I investigated three NEEDS-HUMAN-REVIEW flags from sweep:
  - **N1: `ReviewMetadataForm.tsx` is dead code** (zero external imports). Cleanup queued as separate hygiene follow-up; NOT in PR 1b.
  - **N2: filter state is NOT URL-synced** (Zustand+localStorage only). E2E test `e2e/filters.spec.ts:27-42` is deceptive (only checks URL string preservation). No URL handling changes needed. Cleanup queued.
  - **N3: `generate-content-hashes.mjs` is dormant** (last touched in safety-wrap PR #435 to PREVENT prod runs). No update needed.
- Wrote 4 doc updates as one coherent commit:
  1. Decision journal: full D2.1 entry with reasoning + downstream implications + cleanup-follow-ups.
  2. Design doc: D2 line annotated to 4-value multi-select with D2.1 reference at lines 101 + 108 + 163.
  3. Implementation plan: new "PR 1b — D2 multi-select refinement" section inserted between PR 1 and PR 2 with 8 sub-tasks (1b.1-1b.8); Task 2.4 spec updated to multi-label + worksheet v2 framing.
  4. Execution status: this Current State header replaced; Session 27 entry below.
- Worksheet v1 (26 candidates) preserved on disk with deprecation banner at top; not deleted per user instruction.

**Sub-skill notes for Task 1b.1+:**
- Per database-migrations skill: invoke before touching any file in `supabase/migrations/`.
- Migration date prefix needs `ls supabase/migrations | sort | tail -3` check; latest is likely `20260517000000_complete_review_atomic_tags_side_channel.sql` (PR 2 branch's migration). New PR 1b migrations branch off main, so the latest on main is `20260516000000_lesson_submissions_ai_draft_metadata.sql` or earlier — verify on the actual main branch.
- Per ASCII-sort gotcha (memory note): if same-day timestamp prefix conflicts arise, use next day's date.

**Branches:**
- `main` is at `8497752` (PR 1 squash merge). Latest as of Session 26.
- `feat/metadata-foundation-llm-tagging` (PR 2 branch) — 19 commits ahead. Paused until PR 1b ships.
- `feat/metadata-foundation-activity-type-multi` (PR 1b branch) — to be created Session 28 off main.
- `feat/metadata-foundation-schema` (PR 1's now-merged branch) — can be deleted at convenience.

**Foundation-phase substrate now live on PROD (unchanged from Session 26):**
- Schema: `lesson_format` dropped, `series_id` + `part_number` + `crf_confirmed` columns added, `activity_type` enum at 5 values incl. `'both'` (retiring in PR 1b), `tags` array column with closed enum, `cultural_responsiveness_features` closed to 7 Brown CR features.
- 3 CHECK constraints + trigger value-validation helper, all `<@` containment (length-agnostic).
- Zod canonical schemas + bidirectional mappers + Deno mirror + `enums.json` cross-runtime artifact + freshness CI test.
- Filter UI: `lessonFormat` removed, "Lesson Type" sidebar filter backed by tags column.
- `complete-review` edge function wired to Zod safeParse; CRF prompt wired into `process-submission` (Session 26).

**Done in Session 26 (commit `5dce6f2`):**
- **Step 4.5 — CRF auto-tag wired into `process-submission/index.ts`** between embedding (Step 4) and duplicate detection (Step 5). Anthropic SDK constructed lazily with `Deno.env.get('ANTHROPIC_API_KEY')`; `claude-opus-4-7` invoked with system prompt + tool `submit_tags` schema (forced via `tool_choice: {type: 'tool'}`); response's `tool_use` block parsed for `selected_values`; Zod-validated against `lessonMetadataSchema` (canonical-keys camelCase `culturalResponsivenessFeatures`); written to `lesson_submissions.ai_draft_metadata` alongside `ai_draft_generated_at = now()` and `ai_draft_model = 'claude-opus-4-7'`. `crf_confirmed` stays `false` per D9 (Phase 2 reviewer UX flips it).
- **Skip detection** via `/cultural\s+responsiveness/i.test(content)` — Session 23 audit showed 580/772 (75%) PROD lessons match; modern-template reliably matches, legacy ~25% doesn't (D9-aligned). Also skip on `regenerateEmbedding=true` flow and when `ANTHROPIC_API_KEY` env var unset (graceful degradation in local dev / pre-secret-deploy).
- **Failure path is non-blocking** — try/catch logs the error, submission flow continues. Mirrors the existing embedding-error pattern.
- **`@anthropic-ai/sdk@^0.95.0` added** to `supabase/functions/deno.json` (npm: pattern, mirroring PR 1's `npm:zod@^3.24.0` resolution).
- **Prompt loading**: lazy + module-scope cached via `Deno.readTextFile(new URL('./prompts/cultural-responsiveness-features.md', import.meta.url))`. Warm-start cost saving across submissions in the same edge worker.
- **Caching mirrors harness**: `cache_control: ephemeral` on system + tool blocks. The harness saw `cache_read=0` due to CLIProxyAPI cloaking; the edge function calls Console API directly so caching should work normally (verify on TEST DB).
- `npm run type-check && npm run lint` clean. `supabase/functions/**` is excluded from both per project tooling — strict TS for the edge function is best-effort; runtime verification at TEST DB deploy.

**Done in Session 25 (commit `ceb8234`):**
- **Full 353-sample CRF eval-gate run cleared.** Macro F1=0.937 / Micro F1=0.945 / per-feature P=0.87-0.99 R=0.83-0.99 F1=0.88-0.98 across all 7 master-list features. Output JSON at `/tmp/crf-eval-full-353.json` (run-local; not committed). Final cost $30.23.
- **CLIProxyAPI v6.10.8 stood up locally** (`~/.local/bin/cli-proxy-api`, config `~/.cli-proxy-api/config.yaml`, OAuth credentials `~/.cli-proxy-api/claude-mail@danfeder.org.json`). Bills against user's Claude Max extra-usage credits. Backgrounded server on `127.0.0.1:8317`. Tool-use forced output works through proxy on `claude-opus-4-7`.
- **Harness gained `--base-url` flag** (~10 LOC). Falls back to `ANTHROPIC_BASE_URL` env var. Help text documents the CLIProxyAPI usage pattern with the trailing-`/v1` gotcha.
- **`scripts/eval-data/crf-thresholds.json`** created with starting gates (`macroF1: 0.7`, `minRecallPerValue: 0.5`).
- **Sequenced verification**: 5-sample warmup (5/5 perfect, $0.40) → 20-sample baseline (19/20 perfect, $1.76, macroF1=0.981) → full 353 (passed, $30.23, macroF1=0.937).

**Done in Session 24 (commit `5be10f2`):** Task 2.3 steps 1+2 — sample assembly + prompt drafting. Re-verified Session 23's column⊆body filter on TEST DB (353 / 90+68+83+112 distribution unchanged). Pulled all 353 rows via MCP (response was 1.4M chars → saved to tool-result file); extracted via Node regex anchored on `\n<untrusted-data-...>\n` fence to avoid in-prose mentions of the same tag. Wrote `scripts/eval-data/crf-samples.json` (1.35MB, 353 entries shaped `{id, body, truth}`). Validated truth labels exactly match the 7 canonical Title-Case strings in `src/types/generated/enums.json:cultural_responsiveness_features`. Wrote `scripts/eval-data/crf-vocab.json` (multi-label, 7 values). Wrote `crf-samples.README.md` with regeneration SQL + per-feature coverage table (range 14% → 62% — all 7 features have ≥48 rows, plenty for per-value precision/recall). Wrote `cultural-responsiveness-features.md` prompt: 7 master-list features verbatim with definitions + ~30 example practices + selection rules (canonical strings only / Title Case / extract from CR cell when present / infer when absent / **conservative bias — empty array when nothing clearly demonstrated**). Smoke-tested the harness against new fixtures via dry-run: synthetic-pass case (predictions=truth) → exit 0 + macros all 1.000; synthetic-fail case (predictions=[]) → exit 1 + named per-feature recall failures + macro F1 NaN. File plumbing verified end-to-end without API spend.

**Decisions baked in Session 24 (recorded for downstream):**
- **Sample `body` = full lesson `content_text`** (mirrors prod call-site shape — `process-submission` will pass full body; prompt parses CR cell internally). Median body 3226 chars / p95 5525 / max 20477. Cost ~$2-5 per 353-sample iteration with prompt cache; budget for 5-10 iterations is ~$25-50, acceptable.
- **No stamp-stripped held-out slice in v1.** Defer to a future iteration if reviewers want inference-quality signal beyond bulk extraction. Rationale: simpler v1; if extraction-on-bulk-353 clears the gate, that's the canonical-reference proof; held-out is informational, not gating.
- **Truth labels are canonical Title-Case verbatim from `enums.json`** — no case translation needed at eval time; the prompt instructs Opus to emit the exact strings.
- **File order is alphabetic by `lesson_id`** (no stratified ordering). `--limit N` slices the alphabetic prefix, not a stratified sample. Documented in README.

**Done in Session 23 (no code commits — investigation + decision only):** Resolved the open question carried out of Session 22: where do labeled hold-out samples for CRF come from. Decision: stamps-as-truth (defer to existing curriculum work where it exists); legacy lessons without stamps stay out of scope per D9 (user can revisit later). Investigation: lesson bodies live in `lessons.content_text` (all 772 populated); body CRF stamps split into 3 formats (Format A old-template question ~20 / Format B prose stamp ~117 / Format C comma-list ~475); only Format C aligns with column data — Formats B+A have v3 GPT-4.1 augmented columns. Programmatic filter (`every column feature appears as case-insensitive substring in body's CRF cell`) yields **353 clean rows** (90 with 1 feature / 68 with 2 / 83 with 3 / 112 with 4+). Filter automatically excludes v3-augmented rows. Spot-check on 30 random samples confirmed the cross-check filter beats the regex-only filter (regex had ~63% precision; cross-check is ~100% by construction). Ready for Session 24 to assemble the eval-gate input file + draft the prompt + run dry baseline.

**Done in Session 22 (commit `8fddfcd`):** Task 2.2 — eval-gate harness. Three files added: `scripts/eval-llm-tagging-prompt.ts` (CLI + Anthropic tool-use forced-output + prompt caching on system + tool blocks + concurrency limiter + token-usage rollup); `scripts/lib/evalMetrics.ts` (pure metric computation — multi-label internal model, per-value TP/FP/FN with null-safe semantics for values with no support, macro + micro averages, threshold evaluation); `scripts/lib/evalMetrics.test.ts` (17 unit tests covering edge cases). TDD discipline followed: RED verified (test failed on missing-import) before GREEN. CLI flags: `--prompt --samples --vocab --threshold-config --output --dry-run-with-predictions --concurrency --limit --model`. Exit 0/1 vs threshold. Smoke-tested via `/tmp` fixtures (pass case = exit 0, fail case = exit 1 with named threshold failures). Adds `@anthropic-ai/sdk@^0.95.0` dep + `eval:llm-tagging` npm script alias. **Note for Session 23+:** the harness is input-agnostic; sourcing labeled hold-out samples for CRF / activity_type / tags is each prompt task's concern (curriculum-team-validated rows or reviewer-touched submissions are the candidate sources). Default model is `claude-opus-4-7`; ANTHROPIC_API_KEY required in `.env.local` for non-dry-run runs (user will add).

**Done in Session 21 (commit `a1870fb`):** Task 2.2c — `complete_review_atomic` extended with tags side-channel. `v_ai_draft jsonb` declared, plucked from `lesson_submissions.ai_draft_metadata`; `tags` added to `approve_new` INSERT (value `_phase4_jsonb_text_array_or_null(v_ai_draft->'tags')`); `approve_update` UPDATE SET extended with carry-forward `tags = COALESCE(NULLIF(v_existing.tags, ARRAY[]::text[]), _phase4_jsonb_text_array_or_null(v_ai_draft->'tags'), v_existing.tags, ARRAY[]::text[])`. Mirrors academicConcepts carry-forward pattern. 4/4 local probes via transactional `DO ... RAISE EXCEPTION` rollback PASS.

**Done in Session 20 (commit `1d2da52`):** Task 2.2b — ReviewDetail.tsx reads `submissionData.ai_draft_metadata` at form init (no-review-row branch only), parses against `lessonMetadataSchema`, maps canonical → review-form via `lessonToReview`, applies `reAddActivityTypeSuffix`, calls `setMetadata`. Pure helper at `src/pages/reviewMetadataInit.ts` mirroring `reviewPreselect.ts` pattern; 6 unit tests.

**Done in Session 19 (commits `2b046a4` + `574c8a4`):** Task 2.2a migration — 3 `ai_draft_*` columns added to `lesson_submissions`. Impl plan updated for Task 2.2c insertion + Task 2.5 framing trim.

**Branches:**
- `main` is at `8497752` (PR 1 squash merge).
- `feat/metadata-foundation-llm-tagging` is the active PR 2 branch (11 commits ahead).
- `feat/metadata-foundation-schema` (PR 1's now-merged branch) can be deleted at convenience.

**Foundation-phase substrate now live on PROD:**
- Schema: `lesson_format` dropped (column + JSONB key from all rows), 3 new columns added (`series_id` text / `part_number` int / `crf_confirmed` bool), `activity_type` enum expanded to 5 values (`cooking / garden / both / academic / craft`), `tags` array column with closed enum (`orientation / bilingual_handouts`), `cultural_responsiveness_features` closed to the 7 Brown CR master-list features.
- 3 CHECK constraints installed: `valid_activity_type` / `valid_tags` / `valid_cultural_responsiveness_features` (all `<@` contained-by on the column-level array).
- Trigger value-validation via `_validate_meta_enum_values(jsonb, key, allowed[], lesson_id)` helper invoked from `lessons_normalize_write` for the same 3 keys.
- Zod canonical schemas + bidirectional mappers + Deno mirror with CI equivalence test + `enums.json` cross-runtime artifact + freshness CI test.
- Filter UI: `lessonFormat` removed from definitions / sidebar / URL params / facet counts. New "Lesson Type" sidebar filter backed by `tags` array column (count badge always shows `(0)` until tags is added to RPC RETURNS TABLE — see follow-ups).
- Edge function `complete-review` wired to `safeParse` on metadata payload (defense-in-depth before invoking `complete_review_atomic` RPC).

**Last-applied verification (post-PROD-apply, 2026-05-05):**
- 15-point MCP audit: TEST + PROD both 15/15 PASS — schema columns / drops / CHECKs / helper / trigger / CRF drift cleanup / both seasonTiming repair rows scrubbed.
- `complete-review` deploy verified via `mcp__supabase-remote__get_edge_function`: version=3, ezbr_sha256=`9115a1d9261d2fb1352e709fb3d0b1a44efa94908dae502c100da6c7a6047c39`, source contains the new Zod safeParse block + `_shared/metadataSchemas.ts` mirror.
- Migration apply succeeded on first try (no SASL flake on this run).
- 1 of 12 edge fn deploys (`invitation-management`) failed initially on transient `esm.sh` 522 CDN flake; rerun via `gh run rerun --failed 25385024748` succeeded on second attempt. PR 1 didn't change `invitation-management/index.ts`; failure was unrelated.

## PR 2 design — verification complete + Option A picked (Session 18, 2026-05-05)

### Narrow status-doc question — answered

**Does `complete_review_atomic` overwrite vs preserve unset `tags` keys when the reviewer saves?**

✅ **`lessons.tags` column is PRESERVED.** The `approve_update` UPDATE clause (`supabase/migrations/20260512000000_drop_lesson_format.sql:544-637`) does NOT mention `tags` (or `crf_confirmed` / `series_id` / `part_number`). PostgreSQL preserves columns not in SET. Empirically confirmed via TEST DB transactional probe (DO block with INSERT + simulated UPDATE + RAISE EXCEPTION rollback — `tags={orientation}` before+after).

⚠️ **`lessons.metadata.tags` JSONB key is CLEARED** on every approve_update because `v_legacy_meta` rebuild at lines 383-406 excludes the key. Acceptable: the column is the canonical store post-PR-1; metadata.tags is duplicate/legacy.

ℹ️ **Trigger `lessons_normalize_write`** (latest: `20260515000000_metadata_value_validation.sql`) has a (V) value-validation block on `metadata.tags` (lines 236-258) but does NOT sync between column and metadata. Tags is decoupled from the column⇄metadata sync that covers the other 11 fields (sections C-K).

### Broader gap surfaced — and decision

**There is no flow path from LLM draft → `lessons.tags` column.** Each step in PR 2's planned chain drops `tags`:

1. `lessonToReviewMapper.ts` — no `tags` line (review-form schema doesn't have it).
2. `reviewFormPayloadSchema.ts:21-24` — explicitly excludes `tags`. Default Zod `.strip()` drops unknown keys silently.
3. `complete-review/index.ts:118` — validates against schema; tags-shaped data stripped before reaching RPC.
4. `complete_review_atomic` `approve_new` INSERT (lines 455-503) — no `tags` column → defaults NULL.
5. `complete_review_atomic` `approve_update` UPDATE — doesn't touch `tags` column → never populated either.

Same structural gap applies to `series_id` / `part_number` / `crf_confirmed`, but only **tags** is in PR 2's LLM-draft scope (the others are manual/structural/backend-set). **Of the 8 vocab-locked PR 2 prompts, 7 work via existing flow; only tags is orphaned.**

### Option A picked — backend side-channel via `complete_review_atomic`

**Decision:** extend `complete_review_atomic` to read `lesson_submissions.ai_draft_metadata.tags` and write `lessons.tags` directly. Reviewer doesn't see/edit tags in PR 2 scope; defers to Phase 2 picker UI redesign.

**Rationale:**
- Smallest change; one migration extending an existing RPC.
- Matches design doc §6 explicit "Frankenstein UX between foundation and Phase 2 is acceptable" stance.
- Eval gate (precision/recall on labeled holdout) is the defense against bad LLM drafts; Stage 2 batch re-tag will catch up corpus-wide later.
- Same backend pattern would extend to `series_id` / `part_number` / `crf_confirmed` if ever LLM-drafted (none in PR 2 scope).

**Rejected:**
- **B** (frontend tags picker added now): scope creep into Phase 2 picker-UI redesign; ~200-400 LOC frontend work; designing one-off picker now without broader Phase 2 UX context risks doing it twice.
- **C** (skip tags entirely in PR 2): "Lesson Type" sidebar filter from PR 1 stays useless for new submissions until Phase 2; would force Stage 2 batch re-tag to be the only path to populate `lessons.tags`.

### Implementation note — Task 2.2c (new, Session 19)

Insert a new task between Tasks 2.2b and 2.3 in the impl plan:

**Task 2.2c: Extend `complete_review_atomic` with orphaned-column side-channel (option A)**

Pattern mirrors the existing `20260510000000_approve_update_concepts_carry_forward.sql` migration:
- Look up `v_existing` lesson on `approve_update`. Already done.
- Add: SELECT the LLM draft from `lesson_submissions.ai_draft_metadata` for `p_submission_id` into a local `v_ai_draft jsonb` variable.
- For `approve_new` INSERT: extend column list to include `tags`. Value: `_phase4_jsonb_text_array(v_ai_draft->'tags')` or similar (resolve at task-start time against current `_phase4_jsonb_text_array_or_null` semantics).
- For `approve_update` UPDATE: extend SET clause with carry-forward-flavored `tags = COALESCE(NULLIF(v_existing.tags, ARRAY[]::text[]), _phase4_jsonb_text_array_or_null(v_ai_draft->'tags'), v_existing.tags, ARRAY[]::text[])` — preserve existing if non-empty, else take LLM draft.
- Migration is idempotent CREATE OR REPLACE; same RPC signature; ~30-50 LOC delta.

Task 2.5 (tags prompt) becomes simpler — just LLM prompt + draft writer; "reviewer validates" framing removed.

Source: round-5 bot finding (long-form formal F2 + line `lessonToReviewMapper.ts:29`) re-investigated and resolved.

## Recent decisions worth carrying forward (PR 1 → PR 2)

These flowed out of the PR 1 ritual (Sessions 13-17). General patterns are captured in feedback files; project-specific calls captured here for visibility:

- **Squash-merge over rebase-merge** for foundation-phase PRs — per-task hashes are already preserved in the archive + decision journal; `main` stays clean with one merge commit per PR.
- **v-tag deferred to end-of-foundation-phase** — PR 1 is one of 6+, tagging mid-phase is premature.
- **Migrations-first, edge-functions-second** when both PROD workflows queue together — schema is source of truth; edge function rollback faster than migration rollback.
- **TEST DB sanity check before PROD-apply** — same audit query body run on both surfaces gives a TEST↔PROD diff for direct comparison; high-leverage one-time investment even when not strictly required by per-round-verification rule.
- **`gh run rerun --failed <run_id>`** is the right primitive when one matrix slot fails on transient CDN flake — only re-runs the failed slot, doesn't disturb succeeded peers, and the approval gate doesn't re-fire for already-succeeded gates.
- **Bot voice convergence as P1 signal** — when 3 independent bot voices (formal review + long-form + Codex) agree on a finding, it's almost certainly a real bug. Absence of convergence correlates with absence of P1; useful for round-cap calls. (Captured in `feedback_pr_bot_review_workflow.md`.)
- **`mcp__supabase-remote__get_edge_function` 3-signal verification** — version increment + ezbr_sha256 match + source-content grep for known new code. CLI's "Deployed Functions" log line is NOT a guarantee. (Captured in MEMORY.md hygiene-follow-ups.)
- **esm.sh CDN 522 flakes are recurring on `deploy-edge-functions.yml`** — same per-job transient pattern as the migrate-production SASL flake. `gh run rerun --failed` is the working mitigation. (Captured in MEMORY.md hygiene-follow-ups.)

## Out-of-scope follow-ups (tracked here for PR 5+ / Phase 2 / future hygiene)

- **CLIProxyAPI cache_read=0 inflates per-prompt eval cost.** Confirmed across 3 runs Session 25 (5/20/353 samples): every harness call shows `cache_read=0` despite explicit `cache_control: ephemeral` on system + tools blocks. The proxy's cloaking layer adds Claude Code's system prompt (~2.3K-4.5K tokens) per request, but the per-call content varies enough (session ID, timestamps?) that the Anthropic edge doesn't cache-hit across calls. **Effect:** per-call cost ~3-4x direct Console API rates. Real cost was ~$0.086/sample vs ~$0.020/sample with proper caching. **Implication for PR 2 cost projection:** Tasks 2.4 (activity_type) and 2.5 (tags) and any Gate-C-classified vocab-locked prompts will each cost ~$30 to canonical-eval through the proxy, vs ~$7 if billed against Console API. User's $200 Max extra usage covers ~6 prompts at proxy rates. If running tight on budget, consider switching to Console API for later prompts (no harness change needed — just remove the `--base-url` flag). Not investigated whether the proxy has a config option to suppress per-call session metadata or pass cache_control through; could be worth ~30 min of investigation before Tasks 2.4/2.5 if cost matters. (Source: Session 25 token-usage rollups across all 3 eval runs.)
- **`seasonTiming` Zod-vs-DB asymmetry.** TEST + PROD: 17 zod-failing rows in `submission_reviews.tagged_metadata.season`, all on parent `lesson_submissions.status='approved'` (not reachable via active reviewer queue). Practical reviewer-block today ≈ zero. Stage 1 worksheet round + corpus cleanup migration is the long-term fix; PR 5+ earliest. (Source: round-5 bot finding L2.)
- **`lessons.metadata.seasonTiming` JSON-blob drift.** ~213 rows on TEST. 3 substantive value classes: structural-mismatch (e.g., `'Beginning of year'`, `'End of year'`), time-of-year (e.g., `'All Seasons'`, `'year-round'`), case-mixing typos (e.g., `'fall'`, `'winter'` lowercase). Stage 1 worksheet round decides canonical handling per-class; trigger validation extended after corpus is clean. PR 5+ earliest. (Source: Session 12 Decision 2.)
- **Tags facet count badge always shows `(0)`.** `facetCounts.ts:50` returns `[]` for tags because `tags` is not in `search_lessons` RETURNS TABLE. Fixable when `tags` is added to the RPC result shape post-PR-2 (or hidden via UX choice in the meantime). (Source: round-5 bot finding L3.)
- **Activity Type slug-vs-canonical comment** on `FILTER_CONFIGS.activityType` — slug `cooking-only` (UI) vs canonical `cooking` (DB). Architecture doc already covers it; LOW-priority to add a one-line filter-config comment for future contributors. (Source: round-5 bot finding L4.)
- **`reAddActivityTypeSuffix` lookup-map refactor.** Current implementation strips/re-adds `-only` suffix via simple regex; a `Partial<Record<canonical, slug>>` lookup map makes the mapping enumerable and would fail safely if a 6th canonical activity type were added without `filterDefinitions.ts` sync. LOW-priority hardening. (Source: round-5 bot findings L1+L4+F1+C1, four-way cross-cite.)
- **Equivalence test additive-optional drift gap** — current test catches "field added to one but not other"; doesn't catch "field added to BOTH but typed as optional." `z.strictObject(...)` wrapper or key-count assertion would close cheaply when surfaced. (Source: round-5 bot finding F3+C4.)
- **`database.types.ts` is hand-patched** since Session 13's PR 1 fix-up. Next full regen via `supabase gen types typescript --local` would silently drop the manual patches (semicolons + framing differences). Worth a dedicated cleanup PR when the cosmetic regen IS the point.
- **`react-select` Select / CreatableSelect dual import** — both are used on `ReviewDetail.tsx`. Bundle Analysis CI passed; treeshaking handles it. Verify in any future bundle audit.
- **Pre-fill display of slug-valued pills.** Canonical metadata loaded from DB pre-Session 16 didn't highlight slug-valued pills (pill `value`s are slugs like `cooking-only`; DB stores canonical `cooking`). Session 16 added `reAddActivityTypeSuffix` at the load site so this is now wired correctly — leaving here for visibility / regression-tracking.

## Pointers to durable context

- **Kickoff prompt:** `docs/plans/2026-05-03-metadata-rebuild-foundation-kickoff.md` (paste at session start)
- **Design doc:** `docs/plans/2026-05-03-metadata-rebuild-foundation-design.md` (locked decisions rationale, compressed)
- **Decision journal:** `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` (per-card Decision + Reasoning + Implications)
- **Implementation plan:** `docs/plans/2026-05-03-metadata-rebuild-foundation-implementation.md` (WHAT for each PR's tasks)
- **Validator architecture (Gate B output):** `docs/plans/2026-05-03-metadata-rebuild-foundation-validator-architecture.md`
- **Archive (Sessions 1-17 full journal):** `docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status-archive.md`

Auto-loaded MEMORY (already in conversation context, do not re-read by default):
- `feedback_*.md` for process patterns: `feedback_pr_bot_review_workflow.md` / `feedback_bot_review_investigation.md` / `feedback_pr_comment_surfaces.md` / `feedback_per_round_test_db_verification.md` / `feedback_data_safety_top_priority.md` / `feedback_no_docs_push_during_pr.md` / `feedback_plain_language.md` / `feedback_opus_subagents.md` / `feedback_multi_session_execution.md` / `feedback_workflows_not_sacred.md` / `feedback_user_relearning.md`
- `project_metadata_rebuild_initiative.md` for high-level project state
- Project-specific memories: `project_metadata_three_regimes.md` / `project_vocabulary_drift_scope.md` / `project_lesson_format_conflated.md` / `project_dedup_third_state.md` / `project_metadata_cleanup_candidates.md` / `project_crf_stamp_theater.md` / `project_teacher_zero_metadata_model.md` / `project_imported_non_esynyc_drops.md`

## Recent session log

### Session 28 — 2026-05-06 — PR 1b Task 1b.1 shipped (commit `54124a5` + docs sync forward)

**Done (commit `54124a5` + this docs sync commit):**

- **Branched `feat/metadata-foundation-activity-type-multi` off `8497752` (origin/main).** Pre-flight: local main had diverged 12 commits ahead / 1 behind because pre-PR-1 docs commits were never reset to follow PR 1's squash merge. Investigated diff thoroughly: the 12 "ahead" commits are docs-only (sessions 1-9 docs + PR 1 prep), and their content is preserved as the squash commit `8497752`; the 207 "unique-to-local-main" lines were pre-PR-1 stale code that PR 1 intentionally deleted (e.g., `lesson_format` references in seed.sql, old `lessonFormat` test in searchStore.test.ts, the old `ZOD_FIELD_TO_LABEL` block in ReviewDetail.tsx). Confirmed nothing unique to local main; hard-reset to `origin/main`; cut PR 1b branch. Branch is currently 1 commit ahead.

- **TEST DB MCP probes confirmed migration scope:**
  - `lessons.activity_type` distribution on TEST: cooking 298 / garden 278 / both 135 / academic 58 / `[]` 3 (total 772).
  - 134 array-shape `[both]` rows + 1 string-shape `"both"` JSONB row in `lessons.metadata->'activityType'`.
  - Zero rows where `activity_type` column ≠ `[both]` but `metadata` mentions `'both'` (clean repointing path).
  - 2 historical `submission_reviews.tagged_metadata` rows with `activityType = "both"` on already-approved completed submissions (out of scope per impl plan; display-only artifact, no save path triggered).
  - 0 rows in `lesson_versions.metadata` or `lesson_archive.metadata` mention `'both'`.
  - Helper `_meta_array_matches_column` returns false for non-array shapes — confirms trigger section (D) auto-syncs metadata to `to_jsonb(NEW.activity_type)` on UPDATE of column from `[both]` → `[cooking,garden]` for both array-shape and string-shape rows.

- **Wrote migration `20260518000000_activity_type_multi_select.sql` (~330 LOC) + sibling `.rollback`.** Three steps:
  1. UPDATE column `[both]` → `[cooking, garden]` + defensive metadata UPDATE for both array (`["both"]`) and string (`"both"`) shapes.
  2. DROP + recreate `valid_activity_type` CHECK without `'both'` (4 values now).
  3. CREATE OR REPLACE `lessons_normalize_write` trigger with `'both'` removed from activityType `_validate_meta_enum_values` allowed list. Body byte-identical to `20260515000000` apart from the one-line drop. Updated COMMENT ON FUNCTION mentions D2.1 retirement.

- **Source-of-truth updates:**
  - `src/types/lessonMetadata.zod.ts:37` drops `'both'` from `ACTIVITY_TYPE_VALUES`.
  - `src/types/generated/enums.json` regenerated via `npm run generate:enums` (4 values now).
  - **Repo-conformance fix** `src/utils/reviewToLessonMapper.test.ts:201`: replaces `'both'` with `'cooking'` in all-fields-populated round-trip fixture to satisfy the narrowed Zod-derived literal union. Round-trip property still tested with same surface coverage.

- **Local verification:**
  - `supabase db reset` succeeded; all migrations applied cleanly through `20260518000000`.
  - Local MCP probes: CHECK reflects 4-value list; trigger function reflects 4-value list; multi-element [cooking, garden] insert accepted; single-element `[both]` insert rejected by CHECK; metadata `activityType = "both"` rejected by trigger; all 5 seed lessons survive (incl. multi-element row from `seed.sql:78-82`).
  - `npm run type-check` clean; `npm run lint` clean; `npm run test:rls` 5 passed / 2 failed (pre-existing `archive_duplicate_lesson` scenario failures, unrelated).
  - 2 expected unit-test failures in `edgeSharedSchemas.equivalence.test.ts` (Deno mirror lags canonical until Task 1b.3) — documented in the Current State header.

- **Forward-ported foundation-phase docs from PR 2 branch:** decision journal / design / impl plan / kickoff / status doc + new archive file + Session 27's worksheet artifact. Without this, PR 1b's diff would be incoherent (Task 1b.1 implementation without an impl plan §"PR 1b" section to reference). PR 2's eventual rebase onto post-PR-1b main will see those same docs already on main; conflict resolution = "take theirs" (PR 2's later versions win for any docs PR 2 keeps editing) or "take ours" (preserve PR 1b's docs state).

**Process notes for Session 29+:**

- **Ground-truth via TEST DB MCP probing** instead of trusting impl plan or design doc line numbers. The impl plan's Task 1b.2 spec cites lines `218-220` and `300-304` of `20260517000000_complete_review_atomic_tags_side_channel.sql` — but that migration is on PR 2 branch only. PR 1b's main has the RPC sourced from `20260512000000_drop_lesson_format.sql` plus carry-forward migrations. **Pattern:** for any task whose impl plan spec was authored against PR 2's branch state, query TEST DB for the actual current source via `pg_get_functiondef(...)` first; do NOT replace SQL by line number alone.

- **Repo-conformance test-fixture fix paired with Zod value-list change.** Bundling `reviewToLessonMapper.test.ts:201` with the Task 1b.1 commit was a small in-scope fix to keep type-check green. Without it, the narrowed `ActivityTypeEnum` union (4 values now) failed to accept the `'both'` literal in the round-trip fixture, breaking `tsc --noEmit`. Per kickoff "small repo-conformance adaptations are allowed; product or design changes are not" — this is in-scope. Value swapped to `'cooking'` (still-valid). Round-trip property still tested.

- **Approach to Task 1b.2 stale impl plan line refs:** the kickoff says "Verify every snippet against the current code before applying it — line numbers, imports, types, prop names, and APIs may have drifted since the plan was written." Specifically applies here: the impl plan's "20260517 line 218-220 + 300-304" references should be replaced with whatever the actual `complete_review_atomic` source is on PR 1b's main at session 29 start.

- **Migration timestamp on this branch:** Task 1b.1 used `20260518000000_*`. Task 1b.2 should use `20260518100000_*` (sub-second offset) or `20260519000000_*` (next day). Both PR 2's `20260516`/`20260517` and PR 1b's `20260518` will coexist on post-PR-1b main; PR 2's rebase will see them sort BEFORE PR 1b's, but Supabase tracks applied migrations by version filename so apply-order mismatch is purely cosmetic.

### Session 27 — 2026-05-06 — D2 reopened → D2.1 multi-select refinement; PR 1b plan written (docs commit only, no code)

**Done (one docs commit pending — this session-end ritual):**
- **Began Task 2.4 step 1 (ground-truth source resolution).** Pulled corpus distribution + reviewer-tagged subset:
  - PROD `lessons.activity_type`: cooking 306 / garden 282 / both 139 / academic 58 / `[]` 3 / craft 0 (788 total).
  - TEST `lessons.activity_type`: cooking 298 / garden 278 / both 135 / academic 58 / `[]` 3 / craft 0 (772 total).
  - 113 reviewer-tagged submissions on TEST + PROD (113 of 130 / 113 of 127 approved); reviewer label distribution garden 67 / cooking 33 / academic 11 / both 2 / craft 0. All 113 have body content in `lesson_submissions.extracted_content` (avg 5.5K chars).
  - Reviewer-vs-v3-column concordance check: 97/102 (95.1%) match — but reviewer labels and lesson column values trace to the SAME data flow (reviewer→submission_reviews→lessons), so concordance is structural, not independent judgment.
- **Built v1 ground-truth worksheet** at `scripts/eval-data/activity-type-relabel-worksheet.md` covering 26 craft-suspect candidates × single-label format. Heuristic: title word-boundary craft regex (puppet/paint/mural/cyanotype/printing/collage/etc.) + body-craft-phrase scan. 6 title-hit candidates + 20 body-only candidates.
- **User identified the `craft`-is-new problem.** Reviewer queue ran Aug-Sep 2025 (pre-PR-1, before craft existed in vocab). 113 reviewer labels were forced into the old 4-value vocab. Empirical title scan + body excerpt review surfaced 5+ clear craft-flavored lessons mis-labeled (Sun Printing ×2 / Mural Painting 101 / Puppet Pollinators / Bug Camouflage / Edible Flower Collages). Conservative extrapolation: ~30+ multi-axis lessons in 772-row corpus that single-select cannot represent without loss.
- **D2 re-opened by user with concrete evidence per kickoff threshold.** Three options surfaced in plain language:
  - (A) rename `both` → `multi`: tiny change, info loss
  - (B) true multi-select: most accurate, schema already array-shaped, modest reviewer cognitive shift
  - (C) status quo with documented limitation: zero design churn but pollutes eval gate metrics
- **User picked B**, instructed "plan/work meticulously to fit this change into our implementation plan." Then chose B-1 (retire `both` entirely) over B-2 (legacy synonym).
- **Sequencing decided (Option α — PR 1b before PR 2 continues):** rejected (β) folding D2 refinement into PR 2 (off-theme bloat) and (γ) ship-PR-2-as-is-and-refactor-later (eval gate becomes meaningless data; submission-time prompt outputs single-label that reviewer can't fix because UI is still single-select).
- **Dispatched Opus code-explorer dependency sweep** across 15 categories. Result: ~70 surfaces, ~12 high-risk, 8 in PR 1b scope. Substrate already array-shaped: column `text[]`, CHECK `<@` containment (length-agnostic), trigger validation array-tolerant via `_validate_meta_enum_values` (handles both scalar and array shapes), `_alias_activity_type` SQL function `'both'` ELSE-branch falls through harmlessly post-data-migration. Local-dev `seed.sql:70-72` already uses `ARRAY['garden', 'cooking']` exercising multi-element trigger path today.
- **Resolved 3 NEEDS-HUMAN-REVIEW flags from sweep:**
  - **N1: `ReviewMetadataForm.tsx` is dead code.** Exported from `src/components/Review/index.ts:5` but zero external imports. ReviewDetail.tsx is the active reviewer surface. Cleanup queued as separate hygiene PR; NOT in PR 1b.
  - **N2: filter state is NOT URL-synced.** `useSearchStore` Zustand + localStorage only; `useSearchParams` only used in AcceptInvitation.tsx for invitation tokens. E2E test `e2e/filters.spec.ts:27-42` ("filter state can be applied via URL") only checks that the URL string SURVIVES navigation — does NOT verify filter is actually applied to results. Test is deceptive; cleanup queued as separate hygiene follow-up. PR 1b has zero URL handling changes.
  - **N3: `generate-content-hashes.mjs` is dormant.** Last touched in PR #435 (the prod-guard wrap that PREVENTS accidental prod runs). Only references in old WEEK1 reports + sibling one-off scripts. No CI / cron / npm-script alias. No update needed.
- **Wrote 4 doc updates as one coherent commit** (THIS commit, this session):
  1. `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` — full Decision 2.1 entry between Decision 2 and Decision 3.
  2. `docs/plans/2026-05-03-metadata-rebuild-foundation-design.md` — D2 lines 101 + 108 + 163 annotated to 4-value multi-select.
  3. `docs/plans/2026-05-03-metadata-rebuild-foundation-implementation.md` — new "PR 1b — D2 multi-select refinement" section between PR 1 and PR 2 (8 sub-tasks 1b.1-1b.8); Task 2.4 spec revised to multi-label + worksheet v2 framing.
  4. THIS file — Current State header replaced with PR 1b pivot; Session 27 entry below.
- **Worksheet v1 preserved on disk** with deprecation banner at top per user instruction; v2 (113 rows × multi-label) gets built post-PR-1b.

**Pending for Session 28+:**
- Branch off main: `git checkout main && git pull && git checkout -b feat/metadata-foundation-activity-type-multi`.
- Start **Task 1b.1** (data migration + Zod allowed-value drop + enums.json regen). See impl plan §"Task 1b.1: Migration — retire `'both'` value + repoint data" for files + verification + commit message.
- Stick to PR-1b scope; do NOT bundle ReviewMetadataForm cleanup or E2E test fix or any other off-theme changes.
- Per kickoff PER-PR ritual: dispatch code-reviewer agent before push; bot review cycle with round-cap-after-2-rounds; TEST DB verify + PROD apply via workflow_dispatch + 3-signal MCP verification.

**Process notes worth remembering:**
- **Pre-existing single-element constraints concentrate in 8 surfaces** (per the dependency sweep). Multi-select refinement is mostly mechanical because the substrate (column + CHECK + trigger + GIN index + RPC filter clauses + canonical Zod) was always array-shaped. The application-layer enforcement (review-form Zod scalar + mapper wrap/unwrap + ReviewDetail picker + filter config `type: 'single'`) is what's removing.
- **D2 → D2.1 timing matters.** Re-opening a locked decision mid-execution requires concrete evidence (5/26 = 19% multi-axis rate from reviewer worksheet) — generic "this could be better" doesn't qualify. Documented in decision journal D2.1 + this session log so future readers can trace why D2 refined. The kickoff prompt's locked-decisions clause explicitly allows this re-opening pattern.
- **Plain language framing helped.** User noted multi-axis nature ("`both` could apply to something like craft AND garden?"); I confirmed historical scope (cooking + garden only); user surfaced multi-select option in everyday terms ("maybe this is worth switching `both` to something more flexible"). Sequence A→B→C was framed without project jargon. Per `feedback_plain_language.md` reinforcement.
- **Meticulous-planning request was the load-bearing instruction.** User explicitly asked "plan/work meticulously to fit this change into our implementation plan" rather than letting me dive into code. Resulted in: dependency sweep (read-only investigation); 3-flag triage (N1/N2/N3); doc updates as one coherent commit; PR 1b code work deferred to next session. Pattern worth preserving for future locked-decision re-opening events.

### Session 26 — 2026-05-06 — Task 2.3 step 5: CRF prompt wired into `process-submission` edge function (commit `5dce6f2`)

**Done (commit `5dce6f2`):**
- **`supabase/functions/deno.json`** — added `"@anthropic-ai/sdk": "npm:@anthropic-ai/sdk@^0.95.0"` to the imports map (1-line addition, alphabetically before `zod`). Edge runtime resolves `import Anthropic from '@anthropic-ai/sdk'` through this map at deploy time. Mirrors PR 1's Zod resolution pattern per design §5.
- **`supabase/functions/process-submission/index.ts`** — three additions, no removals:
  1. **Imports + module helpers** at the top: `Anthropic` SDK default import; `lessonMetadataSchema` + `CULTURAL_RESPONSIVENESS_FEATURE_VALUES` from `_shared/metadataSchemas.ts`; `CRF_MODEL = 'claude-opus-4-7'` constant; `CRF_PROMPT_URL` derived from `import.meta.url`; `loadCrfPrompt()` async function that reads + caches the prompt at module scope on first call.
  2. **Step 4.5 — CRF auto-tag block** inserted between Step 4 (embedding) and Step 5 (duplicate detection). Skip-conditions checked first (`!regenerateEmbedding && /cultural\s+responsiveness/i.test(content)`). Inner block: Deno-env `ANTHROPIC_API_KEY` lookup with skip-on-absent; prompt load; Anthropic SDK construction; `client.messages.create()` with system + tool blocks (both `cache_control: ephemeral`), `tool_choice: {type: 'tool', name: 'submit_tags'}`, single user-turn message containing the full body content; tool_use response parsing with type narrowing (`block.type === 'tool_use' && block.name === 'submit_tags'`); Zod safeParse against `lessonMetadataSchema`; on success, supabaseAdmin update writing `ai_draft_metadata` (canonical-keys shape) + timestamp + model. ~96 LOC.
  3. **Failure path** wraps the entire block in try/catch with structured logging. Mirrors existing embedding-error-handling pattern (log + continue, don't block submission).
- **Skip-detection regex** `/cultural\s+responsiveness/i` was the cheapest match for the prompt's input precondition. Session 23 audit confirmed: 580/772 (75%) PROD lessons have the phrase. Modern-template lessons reliably match; legacy ~25% don't. D9 explicit: "leave older legacy lessons as-is + re-tag modern-template lessons only" — skip is the corpus-population gate at submission time.
- **Tool schema mirrors harness exactly**: `{type: 'object', properties: {selected_values: {type: 'array', items: {type: 'string', enum: [...VALUES]}, uniqueItems: true}}, required: ['selected_values']}`. Spreading the readonly tuple `[...CULTURAL_RESPONSIVENESS_FEATURE_VALUES]` into a writable `string[]` to satisfy the SDK's `input_schema` typing.
- **Storage shape**: canonical-keys (camelCase `culturalResponsivenessFeatures`) per migration `20260516000000_lesson_submissions_ai_draft_metadata.sql:12` invariant — "ai_draft_metadata is in CANONICAL-KEYS shape". Translation to review-form shape happens at read-time in ReviewDetail.tsx via `lessonToReview` mapper (Task 2.2b's `reviewMetadataInit.ts`).
- **Verification**: `npm run type-check && npm run lint` clean. `supabase/functions/**` is excluded from both per project tooling (`tsconfig.json:"include": ["src"]`, `eslint.config.js` ignores list) — strict TS for edge functions is best-effort; runtime verification happens at TEST DB deploy.

**Pending for Session 27 (Task 2.4 — activity_type prompt):**
- Same shape as Tasks 2.3a-d for CRF. Vocabulary: 5-value enum (`cooking / garden / both / academic / craft`), single-label, locked at PR 1.
- **Sample assembly**: ground-truth source resolution first. Candidates: (a) PROD `lessons.activity_type` column for all 772 rows (but 88% from v3 GPT-4.1 batch tagging — provenance-ambiguous like CRF was at session 23); (b) reviewer-touched submissions where reviewer manually set activity_type (smaller, higher-quality subset); (c) manual-label a small set against the 5-value vocab (50-100). Resolve at session start.
- **Prompt drafting**: based on the 5-value definitions in PR 1's design doc, with body-signal-source guidance (lesson summary + skills + agenda).
- **Eval-gate run**: harness already exists; thresholds TBD (likely macroF1 ≥ 0.7, minRecallPerValue ≥ 0.5 mirroring CRF). Cost ~$30 per round at proxy rates (per session 25 process notes); ~$7 direct API.
- **Wire into edge function**: extend `index.ts` Step 4.5 to also tag activity_type. The current implementation's `draft` object is already structured to accept multiple keys (`{culturalResponsivenessFeatures: ..., activityType: ...}`), so the addition is mostly: load the new prompt; call Anthropic with single-label tool schema; merge into the `draft` object before Zod validation. Single update writes both fields together (efficient — one DB round-trip).

**Pending Task 2.3 step 6 (TEST DB verification)** — gated on PR 2 push:
- After Tasks 2.4 + 2.5 + any Gate-C-classified vocab-locked prompts ship, push the branch and open PR 2.
- Set `ANTHROPIC_API_KEY` secret on TEST DB project (Supabase dashboard).
- CI applies migrations to TEST DB + deploys edge function to TEST.
- Submit a test lesson via TEST DB with body CR section → confirm `lesson_submissions.ai_draft_metadata.culturalResponsivenessFeatures` populates with a 7-feature subset; `ai_draft_generated_at` and `ai_draft_model` populated.
- Submit one without body CR section → confirm prompt skipped (no draft, ai_draft_metadata stays NULL).
- Could also verify locally via `supabase functions serve` + local Supabase stack, but full local end-to-end test requires Google Doc extraction working locally (extract-google-doc edge function + service account credentials), which is more plumbing than TEST DB. Defer to TEST DB.

**Process notes:**
- **`Deno.readTextFile(URL)` precedent**: this is the first usage in the codebase's edge functions (grep confirmed). Documented Supabase behavior says static files in the function directory are bundled at deploy time and accessible via `import.meta.url` paths. If TEST DB deploy reveals the .md isn't bundled (Supabase CLI bundler may strip non-TS files in some configurations), fallback path: convert prompt to a TS string export (e.g., `prompts/cultural-responsiveness-features.ts` with `export const CRF_PROMPT = \`...\``), import directly, drop the runtime file IO. The graceful-failure mode (try/catch logs + continues) means the submission flow isn't blocked even if file IO fails — function degrades to "no CRF draft on this submission" which is the same as a non-CR-section lesson today.
- **Sequential placement** chosen over parallel-with-embedding (Promise.all). Reasoning: smaller diff (no refactor of existing embedding code), simpler error semantics (each step's catch is local), kickoff's "Don't add features beyond what the task requires" rule. Adds ~5-15s to submission processing time depending on Opus 4.7 latency on a typical 3-5K-token body. If user-facing wait becomes a UX issue, refactor to parallel later.
- **Cache effectiveness on TEST DB unverified yet**: harness saw `cache_read=0` due to CLIProxyAPI's per-request cloaking (Session 25 process note). Edge function calls Anthropic Console API directly through the SDK with no cloaking layer, so cache_control ephemeral on system + tool blocks should work as documented. First production call writes the cache, subsequent ones in 5-min window read it. Verify by monitoring `[CRF auto-tag]` log lines for response-time delta between first and N-th call.
- **Plan-vs-code minor adaptation**: impl plan §Task 2.3 says "Zod validation against `lessonMetadata.zod.ts` (canonical-keys shape — `cultural_responsiveness_features` is `text[]` of the 7 features)". The actual Zod key is `culturalResponsivenessFeatures` (camelCase) — the plan's snake_case was descriptive shorthand, not the literal storage key. The Zod schema (`_shared/metadataSchemas.ts:73`) and the storage-shape invariant (migration comment) both confirm camelCase canonical keys. Wrote to camelCase per schema source-of-truth. Not a behavior change — just clarifying for future reference.
- **The current implementation's `draft` object** is structured to accept multiple keys for Tasks 2.4 + 2.5 + future Gate-C-classified vocab-locked prompts. Each future prompt's predicted output gets merged into the same `draft: Record<string, unknown>` before Zod safeParse + DB write. Single supabase.from('lesson_submissions').update() writes all fields together, one DB round-trip per submission.

### Session 25 — 2026-05-06 — Task 2.3 ship: CRF prompt cleared canonical eval gate (commit `ceb8234`)

**Done (commit `ceb8234`):**
- **Stood up CLIProxyAPI v6.10.8** (released 2 days prior, 2026-05-04) to route Anthropic API calls through user's Claude Max extra-usage credits instead of pay-per-token Console API. Path chosen after rejecting (a) direct OAuth-as-API-key in `@anthropic-ai/sdk` (HTTP 400 `extra_usage` rejection on tool-use traffic per hermes-agent #15080) and (b) `claude -p` subprocess refactor (drops tool-use forced output → parser noise pollutes metrics). Pre-built `darwin_aarch64` binary (12.4MB, SHA256 verified) installed to `~/.local/bin/cli-proxy-api`. Local proxy config at `~/.cli-proxy-api/config.yaml` bound to `127.0.0.1:8317` only, with auto-generated proxy-side API key in `~/.cli-proxy-api/.api-key` (chmod 600). `.env.local` (gitignored) holds the proxy-side key as `ANTHROPIC_API_KEY` for harness pickup. OAuth login via `cli-proxy-api -claude-login` flow (browser-based; user logged in with `mail@danfeder.org`); credentials at `~/.cli-proxy-api/claude-mail@danfeder.org.json` with built-in 15-min auto-refresh.
- **Harness `--base-url` flag added** (~10 LOC). New `Args.baseUrl?: string` field; new `--base-url` CLI case; `Anthropic` constructor now takes optional `baseURL` via spread (`...(args.baseUrl ? { baseURL: args.baseUrl } : {})`); falls back to `ANTHROPIC_BASE_URL` env var if unset. Help text documents the proxy usage pattern + gotcha (the SDK appends `/v1/messages` itself, so baseURL must NOT include trailing `/v1`).
- **Threshold config file** at `scripts/eval-data/crf-thresholds.json` with starting gates: `macroF1=0.7`, `minRecallPerValue=0.5` (per Session 23 plan; harness threshold schema doesn't gate on `macroRecall` — F1 + per-value-recall floor cover the same ground).
- **Three-stage eval rollout** to fail-fast at low cost:
  - **5-sample warmup** at concurrency 3, $0.40 → 5/5 perfect, all P/R/F1=1.000.
  - **20-sample baseline** at concurrency 5, $1.76 → 19/20 perfect, macroF1=0.981. Single FP-bearing lesson investigated: 4 LLM predictions vs 2 human stamps; reading body confirmed the 2 "extras" (Promotes student-centered + Encourages learning within context of culture) are defensibly demonstrated by the lesson content. Pattern: LLM is less-conservative-than-the-original-conservative-human-stamper, not hallucinating.
  - **Full 353** at concurrency 5, $30.23 → macroF1=0.937, micro F1=0.945. Per-feature: P=0.87-0.99, R=0.83-0.99, F1=0.88-0.98. Lowest F1 = "Promotes positive perspectives on parents and families" at 0.879. All thresholds cleared by ~5x.
- **User decision: ship as-is.** No iteration round. Total Session 25 spend ≈ $32.40 of $200 Max extra-usage budget; ~$167.60 remaining for activity_type / tags / Gate-C-classified prompts in PR 2.

**Pending for Session 26 (Task 2.3 step 5 + step 6):**
- **Wire prompt into `supabase/functions/process-submission/index.ts`.** Anthropic call site: detect body CR section presence (skip prompt if absent — D9 explicit, ~45% of older corpus has no body CR section); call `claude-opus-4-7` with the prompt + body; Zod-validate response against `lessonMetadataSchema.cultural_responsiveness_features` (canonical-keys shape, `text[]` of the 7 features); merge into `ai_draft_metadata` write payload alongside `ai_draft_generated_at = now()` + `ai_draft_model = 'claude-opus-4-7'`; `crf_confirmed` stays `false` (Phase 2 reviewer UX flips it).
- **Edge function deno deps**: add `npm:@anthropic-ai/sdk@0.95` to `supabase/functions/process-submission/deno.json` (or wherever `deno.json` lives); mirrors PR 1's Zod `npm:zod@3` pattern per design §5.
- **TEST DB verification**: submit a test lesson via local/TEST flow with body CR section → confirm `ai_draft_metadata.cultural_responsiveness_features` populates with 7-feature subset; submit one without body CR section → confirm prompt skipped (no draft).
- **For future PR 2 prompts (activity_type / tags / Gate-C)**: each gets its own labeled hold-out + threshold + eval-gate run via the harness. Cost projection per prompt: ~$30 with the proxy (3-4x what direct API would cost) due to cache_read=0 — see process notes below.
- **CLIProxyAPI lifecycle**: server is currently running in background on `127.0.0.1:8317` (PID was `62810` at session-end). To stop: `pkill -f cli-proxy-api`. To restart: `~/.local/bin/cli-proxy-api -config ~/.cli-proxy-api/config.yaml &`. Token auto-refresh handles 8h access-token TTL; refresh token stays valid until manual re-login. Per "track latest, lock for run duration" pattern from research findings, future sessions should `curl -L` the latest release tarball before each new prompt's eval cycle (current install can stay if the release hasn't moved).

**Process notes:**
- **Proxy cloaking defeats prompt caching across calls.** All 3 runs showed `cache_read=0` despite the harness sending `cache_control: ephemeral` on system + tools blocks. The proxy's cloaking layer adds Claude Code's full system prompt (~2.3K-4.5K tokens of cached content) per request, but each request gets unique-enough cloaking content (likely session/timestamp variance) that subsequent calls don't cache-hit. Effect: per-call cost is ~3-4x direct Console API rates for our workload shape. Captured as out-of-scope follow-up below for PR 2 cost projections; doesn't change ship-via-proxy decision (user's stated preference is to draw down extra usage credits).
- **Ground-truth ambiguity is by design** for the stamps-as-truth methodology chosen in Session 23. The 20-sample FP investigation surfaced that "false positives" against the human-stamp truth are often defensible LLM identifications of features the conservative teacher chose not to mention. Production flow (draft-for-reviewer-validation) makes this a low-cost asymmetry — reviewer trims with one click. No need to push the prompt toward more conservative behavior; current 96.4% precision against conservative human stamps is the right operating point.
- **Cost-quality is sub-linear in prompt iteration past macroF1 ≈ 0.93.** With 5x headroom over the macroF1 0.7 gate and recall ≥0.83 across all 7 features, marginal returns from another $30 iteration round are low. The final 0.06 of macroF1 would likely come at the cost of recall on harder-to-detect features. Lock the discipline in for Tasks 2.4 / 2.5: ship at >2x gate margins, only iterate on quantitatively-flagged regressions.
- **3-stage eval rollout caught the URL-path bug at $0 cost.** First warmup attempt failed at the 404 stage (proxy logs showed `POST /api/provider/anthropic/v1/v1/messages` — SDK was appending `/v1/messages` to a baseURL ending in `/v1`). Spent $0 on the bad config (no API calls completed); fixed help text + retried. Pattern: always run a 5-sample warmup before scaling, even when the harness has been verified in dry-run. Real network paths surface real bugs. Lock this in for the rest of PR 2.
- **`@anthropic-ai/sdk` request-path conventions**: SDK accepts `baseURL` as origin + path-prefix (e.g., `https://api.anthropic.com`); appends method-specific paths like `/v1/messages` itself. Proxy users must NOT include `/v1` in baseURL. Documented in harness help text.
- **OAuth scopes from `cli-proxy-api -claude-login`** include `user:inference` (the API call permission), `user:sessions:claude_code`, `user:mcp_servers`, `user:profile`, `user:file_upload`. The first is what makes scripted API calls work; the others come along for free.



**Done (commit `5be10f2`):**
- New file `scripts/eval-data/crf-samples.json` — 353 rows, schema `{id: lesson_id, body: full content_text, truth: text[]}`. Source: same column⊆body filter from Session 23 re-run on TEST DB; distribution unchanged. Sorted by `lesson_id` for determinism.
- New file `scripts/eval-data/crf-samples.README.md` — regeneration SQL, per-feature coverage table (Reshapes curriculum 218 / Communicates high expectations 212 / Promotes student-centered instruction 172 / Encourages learning within context of culture 139 / Incorporates different individual and cultural learning styles 139 / Positions teacher as facilitator 112 / Promotes positive perspectives on parents and families 48), v1 scope notes (no held-out slice; alphabetic order).
- New file `scripts/eval-data/crf-vocab.json` — `{name, mode: 'multi-label', values: [...7]}`. Values verbatim from `src/types/generated/enums.json:cultural_responsiveness_features`.
- New file `supabase/functions/process-submission/prompts/cultural-responsiveness-features.md` — system prompt for Opus. Structure: role + task framing → 7 features verbatim (definitions + ~30 example practices from master list) → selection rules (canonical strings only / Title Case translation when body uses lowercase / extract from CR cell when present / infer from teaching practices when absent / **bias toward conservative tagging — empty array when nothing clearly demonstrated**) → input format → tool-call instruction. Token-cost-amortized via prompt caching on system + tool blocks (per the harness's `cache_control: ephemeral`).
- Smoke verification: dry-run pipeline (no API spend). PASS case (predictions = truth, --limit 10) → exit 0, all macros 1.000, all per-value 1.000. FAIL case (predictions = [], --limit 10) → exit 1, per-feature failures named for all 7, macro F1 NaN below 0.7 floor. File plumbing reads new sample/vocab shapes correctly.
- Validation: every truth-label across all 353 rows is in the canonical 7-value enum (verified at write-time by matching truth ⊂ enums.json values).
- `npm run type-check && npm run lint` clean. No code-paths changed; pure data + markdown additions.

**Pending for Session 25 (Task 2.3 steps 3-6):**
- **Threshold config** at `scripts/eval-data/crf-thresholds.json`. Starting with `{macroF1: 0.7, minRecallPerValue: 0.5}` per Session 23's plan. Harness threshold schema doesn't gate on `macroRecall` directly; F1 + per-value-recall floor cover the same ground.
- **First real eval run.** Requires `ANTHROPIC_API_KEY` in `.env.local`. Suggested cadence: `--limit 20` first (~$0.30) to set baseline; if metrics look right and prompt is reading correctly, scale to all 353 (~$2-5 with prompt cache hits beyond first call).
- **Prompt iteration.** If gate misses, refine prompt and rerun. Common patterns: tighten conservative-bias guidance; add specific examples from failing rows; clarify multi-feature handling. Capture per-iteration metrics in commit messages.
- **Wire into `process-submission/index.ts`** (Task 2.3 step 5). Add Anthropic call site at submission flow; check for "cultural responsiveness" presence in body before invoking; Zod-validate output against `lessonMetadataSchema.cultural_responsiveness_features`; merge into `ai_draft_metadata` write payload alongside `ai_draft_generated_at` + `ai_draft_model`. Edge function deno deps need `npm:@anthropic-ai/sdk@0.95` in `supabase/functions/process-submission/deno.json` (mirroring how PR 1 added Zod via npm: imports). `crf_confirmed` stays `false` — Phase 2 reviewer UX will flip it.
- **TEST DB verification** (Task 2.3 step 6). Submit a test lesson via the local/TEST flow: with body CR section → confirm `ai_draft_metadata.cultural_responsiveness_features` populates; without body CR section → confirm prompt skipped (no draft).
- **Decision still open:** whether to add the held-out stamp-stripped slice (~20 rows). Defer to post-first-eval — if extraction passes the gate on full-body samples, held-out adds informational value but no decision-changing signal. If extraction misses, held-out is academic.

**Process notes (none promoted to feedback files yet):**
- **MCP response truncation pattern.** Pulling 353 rows × ~3.5KB body each = 1.4M chars → exceeds `mcp__supabase-test__execute_sql` response limit. The response is auto-saved to `~/.claude/projects/.../tool-results/<file>.txt`. Format: `[{type:'text', text: <stringified-wrapper-json>}]`. Inner wrapper has `result` field with the SQL data wrapped in `<untrusted-data-UUID>` fence tags. The opening tag appears 4 times in the prose (preamble x2 + actual fence x2); regex must anchor on `\n<tag>\n` (newlines on both sides) to hit only the actual fence, not the in-prose mentions. First regex attempt without newline anchoring matched the wrong span and tried to JSON.parse a string starting with " boundaries.\n\n<...>". Lesson: when MCP results overflow, the file path and fence pattern are the recovery path — not a re-query in chunks (which would lose row determinism across pulls).
- **Dry-run-with-synthetic-predictions before any API spend.** ~30 seconds of harness invocation against a constructed predictions file confirmed (a) the new sample/vocab files load against the harness's Zod schema, (b) the metric module computes correctly on real CRF shapes, (c) exit codes 0/1 wire correctly through `set -o pipefail` for CI gating later. Trivial cost; non-trivial confidence boost. Pattern locked in for Tasks 2.4 and 2.5 — always dry-run pass+fail cases before spending Anthropic tokens.
- **Body sizes are manageable for full-body input.** Median 3226 chars / p95 5525 / max 20477. Cost-modeled at ~$2-5 per 353-sample iteration assuming prompt-cache hits beyond first call. No need to truncate or window the body. The CR cell appears near the start of every body (right after grade/season header), so even max-body lessons keep the priority signal in early tokens.
- **Token-cost amortization via prompt caching.** Harness already wraps system prompt + tool block in `cache_control: ephemeral`. The 7-feature + 30-example prompt is ~1500 tokens; that gets cached after first call → 90% reduction on subsequent calls. Real 353-sample run cost dominated by per-sample body tokens (avg ~875 tokens body × 353 = 309K tokens × $15/MTok = $4.63), not the prompt itself.

### Session 23 — 2026-05-06 — Task 2.3 scoping: eval-gate ground-truth source resolved (no code; investigation + decision)

**Done (no code commits — only this status-doc edit):**
- Surfaced the carry-forward open question from Session 22: where labeled hold-out samples for CRF come from. User picked: **stamps-as-truth** for lessons that have explicit body CRF stamps (defer to existing curriculum work even if conservative under-tagging); legacy lessons without stamps stay out of scope per D9 (separate decision for later, not foundation-phase scope).
- Verified lesson bodies live in `lessons.content_text` (all 772 lessons populated, 100% coverage). 580 (75%) have "cultural responsiveness" phrase in body; 679 (88%) have populated `cultural_responsiveness_features` column.
- Sampled 5 lessons + 30 random regex-matching lessons → discovered three distinct body CRF stamp formats:
  - **Format A — old template question** (~20 lessons): "Cultural Responsiveness | Are any New York City cultures represented..." — free-prose answer to a prompt, no feature names. Mostly empty column.
  - **Format B — prose stamp, 1 feature** (~117 lessons): "Cultural Responsiveness: This lesson positions the teacher as facilitator by..." Body mentions 1 feature; column has 2-4 features → v3 GPT-4.1 augmented.
  - **Format C — comma-list, like Fattoush** (~475 by regex): "Cultural Responsiveness: encourages learning within the context of culture, incorporates..." Lowercase verbatim master-list names. For these, column ≈ body (just normalized to Title Case).
- Verified Fattoush case (`1vDebvrcoPdDcoooLnpF64P3ade4l8ZRqVkfSlEAyYts`) via Workspace MCP: 5 features stamped in body, exact verbatim of 7-feature master list (matched #1, 2, 3, 5, 6 from `~/Downloads/Cultural Responsiveness Guidelines.md`). Conservative under-tag (skipped #4 student-centered + #7 facilitator even though both arguably present).
- Quick spot-check on 30 random `[a-z]`-after-colon regex matches: ~63% truly clean Format C; ~17% prose-with-augmented-column; ~10% per-line-prose ("Feature: explanation\n"); ~7% empty/template; ~3% partial-list-with-augmentation. Regex-only filter not precise enough.
- Tightened to programmatic cross-check filter: every feature in column must appear as case-insensitive substring in body's CRF cell (600-char window). Yields **353 clean lessons** (73% of the 487 with both populated column + body phrase). Distribution: 90 / 68 / 83 / 112 across feature counts 1 / 2 / 3 / 4+. Automatically excludes v3-augmented rows by construction.
- 353 is plenty for stratified eval-gate input: ~330 bulk + ~20 stamp-stripped held-out slice. No hand-labeling needed.

**Pending for Session 24:**
- **Task 2.3 sample assembly:** build the labeled eval-gate input file (`scripts/eval-data/crf-samples.json` or similar) from the 353 clean rows. Stratify across feature count buckets and (ideally) across the 7 master-list features. Set aside ~20 for the stamp-stripped held-out slice — strip the `Cultural Responsiveness: ...` cell from those bodies before passing to the prompt.
- **Task 2.3 prompt drafting:** create the prompt file (`supabase/functions/process-submission/prompts/cultural-responsiveness-features.md` or similar) with the 7 master-list features + 35 example practices + body-CR-section input format.
- **Threshold-config + dry baseline:** initial thresholds = macro recall ≥ 0.8, macro F1 ≥ 0.7, per-feature recall ≥ 0.5 (no feature drops out). Run `npm run eval:llm-tagging --dry-run-with-predictions` first to verify file plumbing without burning API tokens; then a real run to set baseline.
- **Iterate prompt** until thresholds clear; document final thresholds + metrics.
- **Wire into `process-submission/index.ts`** (Anthropic call + Zod validation against `lessonMetadataSchema` + write to `ai_draft_metadata.cultural_responsiveness_features`).
- **TEST DB verification:** submit a test lesson with body CR section → confirm draft populates; submit one without → confirm prompt skipped.

**Process notes (none promoted to feedback files):**
- **Spot-checking sample data is cheap and high-value when filtering DB rows by heuristic regex.** First impression from Fattoush ("clean comma-separated verbatim list") was an unrepresentative best case. The 30-row spot-check immediately showed the regex was capturing 3-4 different shapes, not 1. Cost: one SQL query + 5 minutes of eyeballing. Saved committing to a noisy ground-truth set that would have polluted the eval gate.
- **Cross-check filter (column ⊆ body) is a stronger primitive than regex pattern matching for this kind of "verify the curated label against the source text" problem.** Regex tests "does the surface look right"; cross-check tests "does the data ACTUALLY appear in the source." For ground-truth labeling problems where you want to exclude programmatic augmentation, cross-check is the cleaner mental model. Lock this in for similar filter design later.
- **The user's "trust existing human tagging" framing collapsed cleanly to "trust where the body matches the column."** Body stamps are the human work; column augmentations beyond the body stamp are NOT human work (they're v3 GPT-4.1). The cross-check filter operationalizes the user's framing into a concrete query.
- **Workspace MCP `get_doc_as_markdown` worked first try for the Fattoush spot-check.** Used `df@esynyc.org` per memory; doc URL → ID extraction handled by the tool. Output included structured tables (the CRF cell rendered as a one-row markdown table). Useful pattern for any future "look at this lesson" requests.

### Session 22 — 2026-05-06 — Task 2.2 shipped: eval-gate harness for LLM-tagging prompts

**Done (commit `8fddfcd`):**
- New file `scripts/lib/evalMetrics.ts` — pure-function metric computation. Multi-label internal model (`string[][]` for both predictions and truth; single-label encoded as 1-element arrays). Per-value `PerValueMetrics` carries truthCount + predictionCount + TP/FP/FN + precision (null when TP+FP=0) + recall (null when TP+FN=0) + F1 (null when either is null). `MacroMetrics` averages over only non-null per-value values; NaN if all are undefined (empty input). `MicroMetrics` aggregates TP/FP/FN across all vocab values then computes single P/R/F1. `evaluateThresholds(result, config)` returns `{ passed, failures }` with named per-value failures; null per-value metrics are skipped (no-support → can't fail).
- New file `scripts/lib/evalMetrics.test.ts` — 17 unit tests: perfect predictions / multi-label intersection (per-value TP/FP/FN math) / null precision when never predicted / null recall when never in truth / null both when value absent / macro excludes nulls / single-label as 1-element arrays / unequal-length input throws / empty input handled / truthCount + predictionCount per value / micro on aggregate / threshold pass + fail cases (macro F1 + min recall + min precision per value with named failures + null-recall skip).
- New file `scripts/eval-llm-tagging-prompt.ts` — CLI + Anthropic invocation. Tool-use forced-output classification: tool schema mirrors vocabulary (single-value `selected_value` with enum vs multi-label `selected_values: array<enum>`); `tool_choice: { type: 'tool', name }` forces the call. Prompt caching via `cache_control: ephemeral` on the system block AND the tool block (system prompt + tool schema are stable across N samples; cache hit beyond first request). Concurrency limiter (cursor-based worker pool, default 5). Per-sample error handling — API failures or unexpected tool output map to `predicted: []` so the sample counts as all-FN; never aborts the run. Token-usage rollup printed at end (input / output / cache_create / cache_read). Output JSON includes full per-sample predictions for debugging + JSON-spec-compliant NaN→null replacer.
- CLI flags: `--prompt --samples --vocab --threshold-config --output --dry-run-with-predictions --concurrency --limit --model --help`. Exit 0 if eval gate passes, 1 if not (or input invalid). Default model `claude-opus-4-7`. `ANTHROPIC_API_KEY` loaded via `dotenv` from `.env.local` (matches existing scripts pattern).
- Smoke-tested with hand-built `/tmp` fixtures: --help (exit 0); dry-run pass case (perfect predictions → all metrics 1.0, exit 0); dry-run fail case (partial predictions with "C" no support → macro F1 = 0.667 below 0.7 floor + recall 0.000 for "C" below 0.5 floor; exit 1; both failures named; null-precision rendered as `-` in summary; null serialized to `null` in JSON output).
- Added `@anthropic-ai/sdk@^0.95.0` to devDependencies + `eval:llm-tagging` npm script alias.
- Verification: `npm run type-check && npm run lint` clean; full `npm test -- --run` 40/40 files / 563/563 tests green (up from 39/546 — added 1 file with 17 tests).

**Pending for Session 23:**
- **Task 2.3** — first prompt (CRF / D9, canonical reference). Vocab: 7 master-list Brown CR features + 35 example practices for body-text mapping. Body-signal source: body CR section (~55% of corpus has it; older 45% no body CR section → prompt skipped, `crf_confirmed` stays false). Files: edit `supabase/functions/process-submission/index.ts` (Anthropic call + Zod validation against `lessonMetadataSchema` from PR 1 + write to `ai_draft_metadata`); create prompt file (`supabase/functions/process-submission/prompts/cultural-responsiveness-features.md` or similar). Eval gate: source labeled hold-out (TBD — curriculum-team-validated rows? reviewer-touched submissions? PROD rows where `crf_confirmed=true` + body CR section?), set thresholds, run via `npm run eval:llm-tagging`, ship if passes.
- **Open question for Session 23 kickoff:** where do labeled samples come from for CRF? Three candidates surface from the design doc + decision journal: (a) curriculum-team-validated worksheet output (Stage-1-gated, but CRF is vocab-locked so this would mean spinning up a one-off CRF labeling pass for the eval gate); (b) reviewer-touched submissions where the reviewer already applied CRF features manually (but `lessons.cultural_responsiveness_features` was set by v3 GPT-4.1 batch tagging on un-reviewed imports for ~88% of PROD rows per audit — provenance unclear); (c) hand-label a small set (50-100) against the master list for the eval-gate run. Resolve before starting Task 2.3 implementation.

**Process notes (none promoted to feedback files):**
- **TDD pure-function module is the right shape; CLI orchestration smoke-tested instead.** The metric module is small + pure → fast TDD cycle (RED → impl → GREEN in 2 steps; the only test edit was a math correction in the micro-average test where I'd written TP=2 in a comment when the example actually had TP=1, confirmed by hand-tracing the multi-label intersection). The CLI is mostly orchestration (file I/O glue + Anthropic call site + concurrency); unit-testing it would mean mocking Anthropic + file system, which is high-overhead for low value. Smoke testing in dry-run mode is the right substitute — exercises the full flow except the network call. Lock this pattern in for the rest of PR 2's harness-adjacent work.
- **Math errors in test code don't surface until impl runs (RED).** I wrote a buggy assertion in the micro-average test (expected `2/3` for a 1-sample multi-label intersection that actually has TP=FP=FN=1 → P=R=F1=0.5). Caught it before writing impl by hand-tracing. Saved a wasted RED→impl cycle. Lesson: hand-trace the math in test assertions before writing impl, especially for multi-label cases where intuition is unreliable.
- **Scripts directory is excluded from `npm run type-check` AND `npm run lint`.** `tsconfig.json` has `"include": ["src"]`; `eslint.config.js` has `scripts/**` in the ignores list. So strict typing in scripts is best-effort; vitest tests there still run (vitest's vite-plugin picks up `.test.ts` regardless of tsconfig). Means: write strict TS in scripts, trust tsx + vitest to surface runtime issues, no compile-time guard. Considered putting the metric module in `src/utils/` to get type-checking, but it's eval-harness-internal and doesn't belong in the React app surface. Trade-off accepted; not a blocker.
- **Anthropic SDK 0.95 supports `cache_control: ephemeral` on both system blocks AND tool blocks**, which is the right cache target for an eval gate (system prompt + tool schema are stable across N samples → cache hits on every call beyond the first). Confirmed via SDK type definitions; smoke run didn't actually exercise cache (dry-run mode skips Anthropic). First real CRF eval run in Session 23 will validate the caching path empirically.
- **Pre-existing `openai` package is in devDependencies**; matched that pattern for `@anthropic-ai/sdk`. Edge functions don't share package.json; they'll need their own `npm:@anthropic-ai/sdk@0.95` resolution in `deno.json` when Task 2.3 wires the call into `process-submission/index.ts`. (Mirrors how PR 1 handled Zod via `npm:zod@3` per design §5.)



**Done (commit `a1870fb`):**
- Created migration `supabase/migrations/20260517000000_complete_review_atomic_tags_side_channel.sql` (418 LOC total; ~70 LOC actual function-body delta + extensive header explaining why-Option-A and why-this-pattern).
- `CREATE OR REPLACE FUNCTION public.complete_review_atomic(...)` with signature unchanged; preserves grants. Body mirrors latest source at `20260512000000_drop_lesson_format.sql:319-644` plus 4 deltas:
  1. DECLARE: `v_ai_draft jsonb` added.
  2. After existing FOR UPDATE submission lookup: `v_ai_draft := v_submission.ai_draft_metadata` (no second SELECT — `%ROWTYPE` already includes the column).
  3. `approve_new` INSERT: `tags` added to column list (positioned after `cultural_responsiveness_features`, before `metadata`); value `_phase4_jsonb_text_array_or_null(v_ai_draft->'tags')`.
  4. `approve_update` UPDATE SET: `tags = COALESCE(NULLIF(v_existing.tags, ARRAY[]::text[]), _phase4_jsonb_text_array_or_null(v_ai_draft->'tags'), v_existing.tags, ARRAY[]::text[])` carry-forward chain.
- Local applied via `supabase db reset` (clean — no migration order issues, no constraint failures, no idempotency concerns since `CREATE OR REPLACE`).
- 4 verification probes via `mcp__supabase__execute_sql` transactional `DO $$ ... RAISE EXCEPTION 'PROBE N RESULT: ...' $$` blocks (the trailing RAISE auto-rolls back the implicit transaction AND surfaces the assertion via the error message — much cleaner than nested `EXCEPTION WHEN OTHERS` for one-shot probes):
  - **Probe 1** (approve_new + draft={"tags":["orientation"]}): result `tags={orientation}` ✓
  - **Probe 2** (approve_update + existing tags={orientation} + draft={"tags":["bilingual_handouts"]}): result `tags={orientation}` (existing preserved) ✓
  - **Probe 3** (approve_update + existing tags=ARRAY[]::text[] + draft={"tags":["bilingual_handouts"]}): result `tags={bilingual_handouts}` (draft applied) ✓
  - **Probe 4 bonus** (approve_new + ai_draft_metadata=NULL — pre-PR-2 cohort): result `tags=<NULL>` (non-destructive) ✓
- Function-def grep confirmed all 4 markers present (`v_ai_draft        jsonb`, `v_ai_draft := v_submission.ai_draft_metadata`, `_phase4_jsonb_text_array_or_null(v_ai_draft`, `NULLIF(v_existing.tags, ARRAY[]::text[])`).
- Type-check + lint clean.

**Pending for Session 22:**
- **Task 2.2** — eval-gate harness for per-prompt precision/recall on labeled hold-out. Pre-2.3 dependency (each prompt deploys only after clearing its threshold). TS scaffolding (`scripts/eval-llm-tagging-prompt.ts` or similar). Standalone session — non-trivial. After 2.2: prompts in order CRF (2.3) → activity_type (2.4) → tags (2.5).

**Process notes (none promoted to feedback files):**
- **Plan-vs-code verification caught a small reasoning error in the impl plan.** Plan §Task 2.2c step 3 said "use `_phase4_jsonb_text_array_or_null` for INSERT because column defaults to empty `text[]`". Actual baseline definition is `"tags" "text"[]` (nullable, no default). The plan's reasoning is wrong (no default exists); the action still holds because `lessons.tags` is nullable AND `valid_tags` CHECK accepts NULL. Net: followed plan literally; reasoning error was harmless. Worth noting because the "verify before applying" discipline (kickoff §RIGHT NOW: "Verify every snippet against the current code before applying it") caught and confirmed the plan's literal action even when the plan's stated reason was incorrect.
- **Empirical CHECK-constraint discovery for probe scaffolding.** First probe attempt used `status='under_review'` which violated `lesson_submissions_status_check`. Real valid values: `submitted/in_review/needs_revision/approved/rejected`. One failed probe → one `pg_get_constraintdef` lookup → fixed. Cheap. Future PR 2 probes (if any) will use `in_review` directly. Not generalizing — initiative-specific.
- **Probe pattern: `RAISE EXCEPTION` at end auto-rolls back AND surfaces assertion via error message.** With `mcp__supabase__execute_sql`'s autocommit-per-call transport, a successful DO block commits; an unhandled RAISE rolls back. Putting the assertion in the exception message means the surface (PgMetaDatabaseError → message) carries the result. Cleaner than nested `EXCEPTION WHEN OTHERS` + savepoint juggling for one-shot probes. Locking this in for the rest of PR 2's verification work.

### Session 20 — 2026-05-05 — Task 2.2b shipped: ReviewDetail reads ai_draft_metadata at form init

**Done (commit `1d2da52`):**
- New helper `src/pages/reviewMetadataInit.ts` exporting `computeInitialMetadataFromAiDraft(aiDraft: unknown): ReviewMetadata | null`. SafeParses against `lessonMetadataSchema`; maps canonical → review-form via `lessonToReview`; returns null on missing/invalid (caller falls back to today's empty-form behavior). Logs schema-failure path to `logger.warn` for debugging when a real prompt malfunction lands.
- Test file `src/pages/reviewMetadataInit.test.ts` — 6 cases (null / undefined / invalid enum value / wrong shape / empty draft / populated draft). TDD-followed (RED verified before GREEN). Mirrors `reviewPreselect.test.ts` pattern.
- `src/pages/ReviewDetail.tsx` — added import; in `!reviews || reviews.length === 0` branch (after existing preselection logic, lines ~456-462), call helper and run result through `reAddActivityTypeSuffix` before `setMetadata`. Slug-suffix rule stays at the call site so it covers both the existing `tagged_metadata` path (line 416) and the new draft path (single source of truth for the slug logic).
- `src/types/database.types.ts` — hand-patched `lesson_submissions` Row + Insert + Update with 3 new `ai_draft_*` columns alphabetically inserted at the top of each block. Per existing follow-up: file is hand-patched since Session 13's PR 1 fix-up; auto-regen would silently drop manual changes.
- Verification: `npm run type-check && npm run lint` clean; full `npm test` 39/39 files / 546/546 tests green.

**Pending for Session 21:**
- **Task 2.2c** — side-channel RPC migration extending `complete_review_atomic` to read `ai_draft_metadata.tags` and write `lessons.tags` directly via carry-forward semantics. Standalone session because: DB migration → TEST DB verification → PROD-apply discipline. Pattern reference is `20260510000000_approve_update_concepts_carry_forward.sql`. Spec'd in impl plan §"Task 2.2c".

**Process notes (none promoted to feedback files):**
- **Helper-extraction call: keep slug-suffix rule at call site.** Considered moving `reAddActivityTypeSuffix` (currently a 6-line private function in ReviewDetail.tsx) into a shared module so the helper could apply it internally. Rejected: it's already in one place; the new code path adds only one more call site (line 462), still trivially auditable; moving it would be a refactor adjacent to but not strictly required for the task. Helper takes responsibility for canonical→review-form projection only; the call site applies the suffix. Diff stayed +74 / -0 instead of expanding to a 3-file refactor.
- **Defense-in-depth via `safeParse` even though this is a read site, not a write site.** Per design doc §5 the canonical schema is enforced at every TS write surface; ReviewDetail.tsx is technically a read site for the LLM draft. But applying `safeParse` here too means a malformed draft (vocab violation from prompt drift, JSON-shape bug, anything) gets logged + skipped rather than corrupting the form state — degrades to today's empty-form behavior instead of bricking the reviewer flow. ~3 extra LOC with no UX cost. The eval gate (Task 2.2) is the *primary* defense; this is the last-line safety net at draft-display time.
- **TDD-flagged task → RED verified before GREEN.** Wrote test first, ran `npx vitest run src/pages/reviewMetadataInit.test.ts`, got "Failed to resolve import './reviewMetadataInit'" (expected feature-missing failure, not typo). Then wrote helper minimally and re-ran — 6/6 green. Followed the iron law per `superpowers:test-driven-development`.
- **Initial comments ran long; trimmed for project CLAUDE.md "one short line max" rule.** First draft of helper had a 6-line module comment; ReviewDetail.tsx call site had a 4-line block comment. Trimmed to 1 line + 0 lines respectively. The information that survived: caller responsibility for `reAddActivityTypeSuffix` (genuinely non-obvious WHY). Information that was cut: PR/task context (belongs in commit message), reviewer-wins semantics (evident from code structure — the new path is in the no-reviews branch), today's-fallback behavior (also evident from null-return contract). Pattern: when a comment can be replaced by reading 2 lines of nearby code, it's narration, not WHY.

### Session 19 — 2026-05-05 — Impl plan updated for Option A + Task 2.2a migration shipped (first PR 2 code commit)

**Done:**
- Updated `docs/plans/2026-05-03-metadata-rebuild-foundation-implementation.md`: inserted **Task 2.2c** (extend `complete_review_atomic` with orphaned-column side-channel; Option A) between Tasks 2.2b and 2.2 (eval-gate harness). Trimmed **Task 2.5** framing to drop "reviewer validates" — reviewer doesn't see/edit tags in PR 2 scope. Commit `574c8a4`.
- Created **Task 2.2a** migration `supabase/migrations/20260516000000_lesson_submissions_ai_draft_metadata.sql`. Adds 3 nullable columns to `lesson_submissions`: `ai_draft_metadata jsonb`, `ai_draft_generated_at timestamptz`, `ai_draft_model text`. Idempotent (`ADD COLUMN IF NOT EXISTS`). Column comments document canonical-keys-shape invariant + read-site contract for `ReviewDetail.tsx` (Task 2.2b) and `complete_review_atomic` side-channel (Task 2.2c).
- Verified locally via `supabase db reset` (clean apply) + column-shape probe via `mcp__supabase__execute_sql` (3 rows present, expected types + comments). `npm run type-check && npm run lint` clean.
- Commit `2b046a4` — first code commit on PR 2 branch.

**Pending for Session 20:**
- **Task 2.2b** — ReviewDetail.tsx form-init wiring to read `ai_draft_metadata` via `lessonToReviewMapper`. Will likely need a `database.types.ts` hand-patch for the 3 new columns (per existing out-of-scope follow-up — file is hand-patched since Session 13's PR 1 fix-up; auto-regen silently drops manual changes).
- **Task 2.2c** — side-channel RPC migration extending `complete_review_atomic`. Spec'd in impl plan §"Task 2.2c"; pattern reference is `20260510000000_approve_update_concepts_carry_forward.sql`.

**Process notes (none promoted to feedback files):**
- Migration date prefix: latest existing was `20260515000000_*`; used `20260516000000_*` (next day, midnight) — clean ASCII sort, no gotcha. All recent foundation-phase migrations use day-incrementing-timestamp pattern with HHMMSS=000000.
- `column_default` reads as NULL in `information_schema.columns` for `DEFAULT NULL` declarations — expected PostgreSQL behavior (literal `NULL` default is identical to no default for nullable columns). Comments are the source of truth for documenting nullability intent.

### Session 18 — 2026-05-05 — PR 2 kickoff: branch + pre-PR-2 verification + Option A picked

**Done:**
- Created branch `feat/metadata-foundation-llm-tagging` off `origin/main`. Cherry-picked 2 docs commits from PR 1's now-merged branch (5fd5706 = Session 17 docs + 402a9ef = active/archive split) to carry forward per `feedback_no_docs_push_during_pr.md`.
- Pre-PR-2 verification per status doc 4-step plan:
  1. Read latest `complete_review_atomic` definition (`20260512000000_drop_lesson_format.sql:319-644`).
  2. Read latest `lessons_normalize_write` trigger (`20260515000000_metadata_value_validation.sql`).
  3. Read `lessonToReviewMapper.ts` / `reviewToLessonMapper.ts` / `reviewFormPayloadSchema.ts` / `complete-review/index.ts`.
  4. TEST DB transactional probe via `mcp__supabase-test__execute_sql` (DO block + RAISE EXCEPTION rollback). Result: `lessons.tags` column preserved across simulated UPDATE; `metadata.tags` JSONB cleared (expected); `crf_confirmed` / `series_id` / `part_number` all preserved.
- Surfaced deeper gap during investigation: **no flow path** exists from LLM draft → `lessons.tags` column. Same structural issue applies to 3 other PR-1 columns but only `tags` is in PR 2's LLM-draft scope. 7 of 8 vocab-locked PR 2 prompts work via existing flow; only `tags` is orphaned.
- Walked user through findings in plain language. User picked **Option A** (backend side-channel via `complete_review_atomic`).
- Documented verification + decision + Task 2.2c implementation note in this status doc.

**Pending for Session 19:**
- Update impl plan: insert Task 2.2c (side-channel migration) between 2.2b and 2.3; trim Task 2.5 framing.
- Then start Task 2.2a (ai_draft_metadata column migration).

**Process learnings worth carrying:**
- **Pre-PR verification gates that look narrow can surface structural design holes.** The status doc's "preserves vs overwrites" question was easy to answer empirically; the bigger question ("is there a flow path at all?") was the real find. When verifying a design assumption, also ask whether the assumption itself is structurally satisfied. Captured in `feedback_pr_bot_review_workflow.md`-adjacent territory; not promoted to a feedback file yet because this is a bot-review-derived gate-style verification, not a generic pattern.
- **Plain-language re-explanation matters for design decisions**, especially when the technical framing collapses to "only field X is stuck of N." First-pass framing made the trade-off feel more abstract than it was; user's "walk me through more clearly" yielded a much sharper decision once narrowed to the actual scope ("only `tags` is orphaned, not all 4 PR-1 columns"). Reinforces `feedback_plain_language.md`.
