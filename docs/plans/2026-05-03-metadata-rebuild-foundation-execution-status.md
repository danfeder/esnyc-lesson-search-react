# Metadata Rebuild — Foundation Phase — Execution Status

**Last updated:** 2026-05-08 — Session 48 (PR 4 filter-surface follow-up: 8 user-facing surfaces filter retired imports + view migration that exposes `retired_at` to the view + LessonSearchPicker `excludeRetired` prop; pre-push code-reviewer agent caught and fixed P0 latent bug; ready to push and open PR).

> **About this file.** Active status carrying forward only what the next 1-2 sessions need to orient. Full per-session journal for Sessions 1-46 lives in `2026-05-03-metadata-rebuild-foundation-execution-status-archive.md` (read on demand via grep). When a new PR cycle begins, that PR's session entries move to the archive at the start of the following PR; the active file always reflects current PR + a small carry-forward roll-up.

## Current State

**PR 4 (corpus cleanup) — Sessions 47-48, ready to push 2026-05-08.** Branch `feat/metadata-foundation-corpus-cleanup` from main `cf2aad4` (PR 2 squash-merge 2026-05-07). 5 commits ahead (6 after this session-end docs commit): `0672cc8` (Session 46 docs cherry-pick) + `ed8ca21` (PR 4 substantive migrations: 21 imports retired + 7 archive concepts recovered + FSA retitle) + `868ed54` (Session 47 docs) + `f522740` (PR 4 follow-up: 8 user-facing surfaces filter retired) + `b0f2564` (P0 fix from pre-push review: view migration + ReviewDetail hardening comment). NOT pushed yet; PR opens immediately after the docs commit.

**Surface inventory locked (from Session 48 investigation):**
- **Filtered (8 surfaces):** `search_lessons` RPC body, `smart-search` edge fn, `search-lessons` edge fn (defensive — dead front-end caller), `useLessonStats` hook, `LessonSearchPicker` (new `excludeRetired` prop, default false), `RevisingSubmissionForm` caller (passes `excludeRetired`), `process-submission` update-target validation (defense-in-depth), `generate-embeddings.mjs` + `regenerate-all-embeddings.mjs` (don't burn OpenAI cost on retired).
- **Unfiltered (intentional asymmetry):** `detect-duplicates` edge fn, `get_lesson_details_for_review` RPC, `ReviewDetail` similar-lesson + off-list submitter target fetches, `ReviewDashboard` queue-badge title lookup, `src/lib/supabase.ts` connectivity test, `lessons_with_metadata` view itself. These exist so dup-checking + reviewer dup-flow catch future re-submissions of retired imports.
- **Out of scope:** ~13 admin/historical scripts in `scripts/` (one-shots, not user-facing).

**Per-consumer filter approach** (not view-bake): the 3 view-based call sites (`useLessonStats` / `smart-search` / `search-lessons`) call `.is('retired_at', null)` after `.from('lessons_with_metadata')` directly. The view stays unfiltered so `detect-duplicates` / `get_lesson_details_for_review` / `ReviewDetail` similar-lesson fetch / `ReviewDashboard` badges still see retired rows.

**P0 caught and fixed via pre-push review:** the 3 view-based `.is('retired_at', null)` calls would have failed with PostgREST 400 because `lessons_with_metadata` view (last redefined `20260512000000`) uses an explicit column list that doesn't auto-include columns added later. Migration `20260520030000_lessons_with_metadata_expose_retired.sql` recreates the view with `retired_at` + `retired_reason` appended at the end (PostgreSQL allows appending columns to `CREATE OR REPLACE VIEW`). NOTIFY pgrst reload schema for immediate cache invalidation. Local toggle test confirms 4 expected behaviors: view filtered count 5→4, view unfiltered stays 5, RPC count 5→4, view + RPC restoration on `retired_at = NULL`.

**PR 4 substantive code shipped Sessions 47-48 (3 migrations + 5 source edits + 2 test files + 1 hardening comment):**
- `20260520000000_corpus_cleanup_retire_imports.sql` (Session 47): `retired_at` / `retired_reason` columns + 21 retire UPDATEs + FSA retitle.
- `20260520010000_recover_archive_only_concepts.sql` (Session 47): restores `academicConcepts` from archive into 7 live rows.
- `20260520020000_search_lessons_filter_retired.sql` (Session 48): `CREATE OR REPLACE FUNCTION search_lessons` body adds `AND l.retired_at IS NULL` to count + select WHERE clauses.
- `20260520030000_lessons_with_metadata_expose_retired.sql` (Session 48): `CREATE OR REPLACE VIEW lessons_with_metadata` appends 2 new columns at the end.
- 5 source edits: `smart-search/index.ts`, `search-lessons/index.ts`, `useLessonStats.ts`, `LessonSearchPicker.tsx` (new `excludeRetired` prop), `RevisingSubmissionForm.tsx` (passes prop), `process-submission/index.ts` (server-side validation), `generate-embeddings.mjs`, `regenerate-all-embeddings.mjs`.
- 2 test files updated for the new chain shape (`useLessonStats.test.ts`, `LessonSearchPicker.test.tsx`); +2 new tests for `excludeRetired` prop.
- 1 hardening comment at `ReviewDetail.tsx:1319` documenting why reviewer flow intentionally does NOT pass `excludeRetired`.

**Local verification clean**: `supabase db reset` applies all 4 PR 4 migrations cleanly; type-check + lint clean; vitest 577/577 (was 575/575; +2 new for `excludeRetired` prop). MCP probes confirm:
- `lessons.retired_at` + `lessons.retired_reason` columns present with correct types
- `lessons_with_metadata` view exposes both new columns post-migration
- Toggle test: view filtered count drops 5→4 when LESSON-001 retired; view unfiltered stays at 5; `search_lessons()` RPC drops to 4; restored to 5 on `retired_at = NULL`

**Foundation-phase substrate after PR 4 ships:** all PR 1 / PR 1b / PR 2 substrate + soft-retire columns on `lessons` + view exposes them + 21 imports retired + 7 archive-only concepts restored + FSA Pt 1 retitle + 8 filter surfaces filtering retired rows + `LessonSearchPicker.excludeRetired` prop infrastructure for submitter-vs-reviewer asymmetry.

**Next session picks up — PR 4 push + bot review cycle:**
1. **Push branch + open PR** with `gh pr create`. CI applies migrations to TEST DB; this fires the round 0 verification window.
2. **Round 0 TEST DB verification** via `mcp__supabase-test__execute_sql`: 21 retired count + FSA new title + 7 concepts recovered shape + view exposes new columns + search_lessons RPC count drops appropriately.
3. **Bot review rounds + ritual** per `feedback_pr_bot_review_workflow.md` (CodeRabbit + Claude Review). Investigate every finding; default-reject hardening for internal-only paths.
4. **Per-round TEST DB re-verification** for any DB-affecting fix-up commits.
5. **Round-cap after 2 rounds of bot review.**
6. **Pre-PROD-apply MCP probe** (Session 46 pattern) before approving the production migration workflow.
7. **Post-PROD verify** via `mcp__supabase-remote__execute_sql` (21 retired count + view shape + RPC count).

**Branches:**
- `main` at `cf2aad4` (PR 2 squash-merge); origin matches
- `feat/metadata-foundation-corpus-cleanup` — this session's work, 5 commits ahead (6 after this session-end docs commit)
- `feat/metadata-foundation-llm-tagging` (PR 2 merged; deletable at convenience)
- `backup/feat-metadata-foundation-llm-tagging-pre-rebase`, `docs/session-36-pr1b-shipped`, `feat/metadata-foundation-activity-type-multi`, `feat/metadata-foundation-schema` (all deletable at convenience)

## Recent decisions worth carrying forward (PR 1 → PR 1b → PR 2)

These flowed out of the PR 1 + PR 1b rituals (Sessions 13-36). General patterns are captured in feedback files; project-specific calls captured here for visibility:

- **Squash-merge over rebase-merge** for foundation-phase PRs — per-task hashes are already preserved in the archive + decision journal; `main` stays clean with one merge commit per PR.
- **v-tag deferred to end-of-foundation-phase** — PR 1 + PR 1b are 2 of 6+; tagging mid-phase is premature.
- **Migrations-first, edge-functions-second** when both PROD workflows queue together — schema is source of truth; edge function rollback faster than migration rollback.
- **TEST DB sanity check before PROD-apply** — same audit query body run on both surfaces gives a TEST↔PROD diff for direct comparison; high-leverage one-time investment even when not strictly required by per-round-verification rule.
- **`gh run rerun --failed <run_id>`** is the right primitive when one matrix slot fails on transient CDN flake — only re-runs the failed slot, doesn't disturb succeeded peers, and the approval gate doesn't re-fire for already-succeeded gates. Confirmed across 2 PROD deploys (PR 1 `invitation-management` 2026-05-05 + PR 1b `detect-duplicates` 2026-05-07).
- **Bot voice convergence as P1 signal** — when 3 independent bot voices (formal review + long-form + Codex) agree on a finding, it's almost certainly a real bug. Absence of convergence correlates with absence of P1; useful for round-cap calls. (Captured in `feedback_pr_bot_review_workflow.md`.)
- **Empirical evidence can escalate single-voice low-confidence findings** — Codex P2 #1 in PR 1b round 1 was framed as "2 historical rows"; TEST/PROD MCP probe revealed 113 rows actually crashing every reviewer reopen. For any single-voice finding citing a row count, run the appropriate MCP probe before triaging. (Captured in `feedback_pr_bot_review_workflow.md`.)
- **Active-PR session-orientation** — when a session opens with status doc claiming "N commits unpushed" or "awaiting round N", verify against `git log @{u}..HEAD` AND `gh pr view <PR> --json reviews,comments` before proceeding. Pattern recurred 4× across PR 1b Sessions 33-36. (Captured in `feedback_pr_bot_review_workflow.md`.)
- **`mcp__supabase-remote__get_edge_function` 3-signal verification** — version increment + ezbr_sha256 match + source-content grep for known new code. CLI's "Deployed Functions" log line is NOT a guarantee. (Captured in MEMORY.md hygiene-follow-ups.)
- **esm.sh CDN 522 flakes are recurring on `deploy-edge-functions.yml`** — same per-job transient pattern as the migrate-production SASL flake. `gh run rerun --failed` is the working mitigation. (Captured in MEMORY.md hygiene-follow-ups.)
- **Type-coupled cluster impl-plan flaw (single-occurrence — watch for recurrence).** When a schema-shape change touches multiple consumer files, decompose-by-file impl plans break tsc invariants mid-session. Session 30 surfaced this in PR 1b: Tasks 1b.3 (Zod array shape) + 1b.4 (mappers) + 1b.5 (ReviewDetail consumer) had to ship as one cluster because the type narrowing cascaded across all three. Future similar work should bundle consumer-cluster from impl-plan time, OR explicitly note "intermediate tsc-break expected; cluster ships together" in the verify clauses. Stays as candidate (single occurrence) — promote to `feedback_*.md` if it recurs.
- **Cherry-pick approach over `git rebase` when stale-docs would generate multi-commit conflicts (single-occurrence — watch for recurrence).** Session 38 surfaced this on the PR 2 rebase: vanilla `git rebase main` would have triggered ~13 separate docs conflicts (one per PR 2 docs commit, since main's docs reflect Session 37's archive split while PR 2's stale docs were on Session 17-27 pre-split layout). Resolved by `git reset --hard main` + cherry-picking only the 7 code commits + re-bundling docs fresh (Sessions 36+37 cherry-picked from `docs/session-36-pr1b-shipped` + Session 38 written from scratch). Per-session docs commit history from PR 2 is lost (preserved in `backup/feat-metadata-foundation-llm-tagging-pre-rebase` for traceability), but session log entries are reconstructed in active status doc + archive. Tradeoff: cleaner code-only PR 2 commit chain (squash-merge friendly), but does need the docs reconstruction. Generalizable: identify the substantive (code/feature) commits vs the housekeeping (docs/status) commits; cherry-pick only the substantive set; re-run docs work fresh at the end.
- **Rebase-rename-sweep: rename ALL stale-timestamp migration files, not just body-conflicting ones (single-occurrence — watch for recurrence).** Session 38's PR 2 rebase renamed `20260517000000_complete_review_atomic_tags_side_channel.sql → 20260519000000_*` because of a body conflict with PR 1b's `20260518100000_*` on `complete_review_atomic`. The other PR 2 migration `20260516000000_lesson_submissions_ai_draft_metadata.sql` was NOT renamed because adding new columns on `lesson_submissions` doesn't conflict with anything in PR 1b — local `supabase db reset` applies in version order so it kept working. Only TEST CI's `supabase db push --dry-run` (which checks "any local file with timestamp before remote's last applied?") caught it 6 sessions later when PR 2 was finally pushed (Session 43→44). Rule for future rebases: scan ALL `supabase/migrations/*.sql` files on the rebased branch — if any timestamp is `<` the rebase target's last migration, rename regardless of body-conflict status. Stays as candidate (single occurrence) — promote to `feedback_*.md` if it recurs.
- **`database-migrations` skill rule has a documented exception class.** Standard rule: "NEVER edit a migration file that has been pushed to a remote branch." Session 44's back-sort fix had to rename a pushed migration. Exception is justified ONLY when: (a) the bug IS the filename / timestamp (body is correct), AND (b) the file was never applied to any remote DB (verified by MCP probe of `supabase_migrations.schema_migrations`). The skill's escape paths ("create new fix migration" / "reset TEST DB") cannot fix a back-sorted timestamp because the back-sorted file remains in the tree tripping dry-run; a reset is heavyweight and unnecessary when no remote state needs preserving. Document the exception explicitly in the migration file header + commit message + status doc when used.

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
- **Missing unit-test coverage for `validateRequiredFields` + `fieldProgress` in ReviewDetail.tsx.** Surfaced by PR 1b round-0 code-reviewer agent + bug-fix `be406c3` (Session 32). The 2-line truthy-check regression on the activityType field went undetected by the test suite because no test exercises the validators with empty-array fixtures. Cleanest path: refactor the validators into pure utility functions (e.g., `src/utils/reviewValidation.ts`) and add unit tests covering "Activity Type required when array is empty" + sibling cases. Out of scope for the PR 1b fix-up (kickoff: "A bug fix doesn't need surrounding cleanup"); worth a focused hygiene PR. The other 17 metadata fields use the same `?.length` pattern so a single test file would cover the regression surface for all required fields.

- **Missing unit-test coverage for `reAddActivityTypeSuffix` shape-tolerant loader.** Surfaced by PR 1b round 1 + fix-up `131168b` (Session 34). The pre-fix `if (!v || v.length === 0) return raw` followed by `v.map(...)` would have crashed on any of the 113 historical scalar `tagged_metadata.activityType` rows; visual smoke caught the post-fix happy paths but the test suite has no fixture-driven coverage. Cleanest path: same as the `validateRequiredFields` follow-up — extract to `src/utils/reviewMetadataLoaders.ts` (or fold into `reviewValidation.ts`) and add unit tests covering scalar `'garden'` / `'both'` / empty / null-undefined / array round-trip. Out of scope for the round-1 fix-up; worth a focused hygiene PR alongside the validator-test follow-up since both are in the same file and the same cleanup shape.

- **Activity_type prompt v3 garden FPs at 36 may need tightening if reviewer pushback emerges.** Session 41 canonical run: garden recall 1.000 (every garden-tagged lesson caught) but garden precision 0.679 (LLM tags garden topical on 36 lessons reviewers didn't tag). For draft-validate use case this is the right direction (reviewers easily remove extras; missed tags harder to catch). If post-deployment reviewer feedback shows "too many lessons getting garden tag," tightening options: (a) require explicit garden/food keyword density above some bar before topical-garden fires, (b) carve out lesson categories where topical-garden shouldn't fire (e.g., "general food worker / advocacy lessons that don't mention plants/growing"), (c) add a "weak topical" sub-tier. Not investigated at session-end; logged for visibility. Source: `/tmp/activity-type-eval-result-v3.json` per-sample data.

- **`academic` truth count = 1 in current activity_type sample set (just The Lorax Debate)** — per-value academic recall is binary (1.000 or 0.000). Future canonical re-runs need to keep correctly tagging Lorax to maintain the per-value floor. Single-row eval is fragile if the prompt drifts. Options when this becomes a flake risk: (a) add 2-3 more academic-only lessons to the sample set (would need to find/invent), (b) drop the per-value floor for academic only via threshold-config exemption, (c) accept the binary signal as load-bearing — a regression on Lorax tells us the prompt has shifted academic interpretation away from Rule Y. Not urgent; logged for visibility if future iterations find this constraining. Source: Session 41 final truth distribution after Rule Y retags.

- **Pre-PR-2 `any` types in `process-submission/index.ts:136-137`** — `let user: any = null` and `let supabaseClient: any` introduced 2025-08-06 in commit `2c14ff04` (~9 months pre-PR-2). Surfaced by claude-review round-2 P2 #1 on PR #477. `SupabaseClient` and `User` are importable from `@supabase/supabase-js`; replacement is mechanical. Rejected from PR 2 scope per kickoff "A bug fix doesn't need surrounding cleanup" + git blame proves pre-existing. Worth a focused hygiene PR alongside any future `process-submission` refactor; standalone is also fine but trivial enough that bundling makes sense. (Source: Session 45 round-2 triage.)

- **Per-field model provenance inside `ai_draft_metadata`** — `lesson_submissions.ai_draft_model text` records only the last writer (today: activity_type's model wins because it writes second). Both prompts use `claude-opus-4-7` so no provenance is wrong today, but if CRF and activity_type ever migrate to different models (e.g., CRF on Sonnet for cost savings, activity_type stays Opus), the column silently mis-attributes the CRF draft. Fix: store per-field model inside the JSONB (`{ _meta: { models: { crf: '...', activityType: '...' } } }`) or add a separate `ai_draft_models jsonb` column. Surfaced by claude-review round-1 P2 + round-2 inline P3. Not blocking PR 2; worth addressing when (a) a third LLM-auto-tag prompt lands, OR (b) CRF/activity_type model versions diverge for any reason. (Source: Session 45 round-2 triage.)

- **Explicit Anthropic call timeout in `process-submission/index.ts`** — Anthropic SDK default timeout is 600s; Supabase edge function wall-clock cap (~150s) is the binding constraint, so submissions can't hang indefinitely. But adding explicit `timeout: 30_000` per call would bound worst-case latency ~5x tighter and prevent accidentally consuming the entire edge-fn budget on one hung LLM call. Rejected from PR 2 because (a) the try/catch wrapping each call already handles transient failures gracefully (non-fatal pattern), (b) edge-fn timeout already exists as outer bound, (c) no production incident has surfaced this risk. Worth adding when a future PR is already touching this region (e.g., adding a third prompt). (Source: Session 45 round-2 triage; claude-review round-1 P3 #4.)

## Pointers to durable context

- **Kickoff prompt:** `docs/plans/2026-05-03-metadata-rebuild-foundation-kickoff.md` (paste at session start)
- **Design doc:** `docs/plans/2026-05-03-metadata-rebuild-foundation-design.md` (locked decisions rationale, compressed)
- **Decision journal:** `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` (per-card Decision + Reasoning + Implications)
- **Implementation plan:** `docs/plans/2026-05-03-metadata-rebuild-foundation-implementation.md` (WHAT for each PR's tasks)
- **Validator architecture (Gate B output):** `docs/plans/2026-05-03-metadata-rebuild-foundation-validator-architecture.md`
- **Archive (Sessions 1-46 full journal):** `docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status-archive.md`

Auto-loaded MEMORY (already in conversation context, do not re-read by default):
- `feedback_*.md` for process patterns: `feedback_pr_bot_review_workflow.md` / `feedback_bot_review_investigation.md` / `feedback_pr_comment_surfaces.md` / `feedback_per_round_test_db_verification.md` / `feedback_data_safety_top_priority.md` / `feedback_no_docs_push_during_pr.md` / `feedback_plain_language.md` / `feedback_opus_subagents.md` / `feedback_multi_session_execution.md` / `feedback_workflows_not_sacred.md` / `feedback_user_relearning.md`
- `project_metadata_rebuild_initiative.md` for high-level project state
- Project-specific memories: `project_metadata_three_regimes.md` / `project_vocabulary_drift_scope.md` / `project_lesson_format_conflated.md` / `project_dedup_third_state.md` / `project_metadata_cleanup_candidates.md` / `project_crf_stamp_theater.md` / `project_teacher_zero_metadata_model.md` / `project_imported_non_esynyc_drops.md`

## Recent session log

### Session 48 — 2026-05-08 — PR 4 follow-up: 8 filter surfaces + view migration + P0 fix from pre-push review (ready to push)

**Done (2 substantive commits + this session-end docs commit):**

- **Surface inventory pass** (~30 min). Targeted greps + MCP probes mapped every consumer of `lessons` / `lessons_with_metadata`. Result: 8 surfaces filter retired (search_lessons RPC + smart-search + search-lessons + useLessonStats + LessonSearchPicker + RevisingSubmissionForm + process-submission + 2 embedding scripts), 6 surfaces stay unfiltered (detect-duplicates + ReviewDetail + ReviewDashboard + get_lesson_details_for_review + supabase.ts connectivity test + view itself), ~13 admin scripts out of scope. Empirical TEST DB pre-commit probe: 0 current submissions / similarities / reviews / bookmarks reference any of the 21 retired IDs (only 2 expected dedup-winner rows in `duplicate_resolutions`). PR 4 is forward-looking, not backfilling broken state.

- **3 NEW surfaces beyond status doc's original 6** identified during inventory: `search-lessons` edge fn (defensive — dead front-end caller today, but deployed), `LessonSearchPicker` (new `excludeRetired` prop with submitter-vs-reviewer asymmetry), `process-submission` server-side validation (defense-in-depth even if picker UI is bypassed).

- **Per-consumer filter approach (not view-bake)** — locked because detect-duplicates / get_lesson_details_for_review / ReviewDetail similar-lesson fetch / ReviewDashboard badges all read from view (or `lessons` directly) AND need to keep seeing retired rows for future re-submission catch. View-bake forces consumers off the view; per-consumer is cleaner.

- **`LessonSearchPicker.excludeRetired` prop** — new `excludeRetired?: boolean` prop, default false. Threaded through `runSearch` useCallback dep array. RevisingSubmissionForm caller passes `excludeRetired`; ReviewDetail caller leaves default false (with a hardening comment per pre-push review's P1 #4 finding). 2 new tests cover both paths.

- **Migration 1 — `20260520020000_search_lessons_filter_retired.sql`** (192 lines). `CREATE OR REPLACE FUNCTION search_lessons` body adds `AND l.retired_at IS NULL` to BOTH count + select WHERE clauses. Body-only change → no GRANT re-issue needed. NOTIFY pgrst reload schema for cache safety.

- **Migration 2 — `20260520030000_lessons_with_metadata_expose_retired.sql`** (133 lines). `CREATE OR REPLACE VIEW lessons_with_metadata` appends `l.retired_at` + `l.retired_reason` at the end (PostgreSQL allows column appends to existing views). View stays unfiltered — consumers apply `.is('retired_at', null)` at query site for the asymmetry. Critical fix from pre-push review (without it, 3 view-based call sites would have hit PostgREST 400).

- **Source edits across 8 files** (commit `f522740`):
  - `smart-search/index.ts:155` + `search-lessons/index.ts:62` + `useLessonStats.ts:25-28` (3 view-based callers)
  - `LessonSearchPicker.tsx` (new prop + chain integration with useCallback dep)
  - `RevisingSubmissionForm.tsx:174` (passes `excludeRetired`)
  - `process-submission/index.ts:212` (server-side validation)
  - `generate-embeddings.mjs:129 + 240/244` (fetch + verify denominators)
  - `regenerate-all-embeddings.mjs:72/154/206` (regenerate + verify + mock fetch)

- **Tests updated** (commit `f522740`):
  - `useLessonStats.test.ts` mock chain updated to include `is` (terminal call), 4 of 9 tests modified, +1 assertion for `expect(isMock).toHaveBeenCalledWith('retired_at', null)`. All 9 pass.
  - `LessonSearchPicker.test.tsx` mock chain updated to include `is: vi.fn().mockReturnThis()` across 4 mock setups; +2 new tests covering `excludeRetired={true}` triggers `.is(...)` and unset-default does NOT trigger it. All pass.

- **Pre-push code-reviewer agent dispatched (Opus mode per `feedback_opus_subagents.md`)** on `git diff main...HEAD` — caught 1 P0 (the view doesn't expose `retired_at` → 3 callers would have 400'd at runtime), 3 P1s (2 deferred as "not bugs today / future hardening" + 1 actionable hardening comment), 1 P2 (defer). P0 fix applied in commit `b0f2564`: new view migration. P1 #4 hardening comment applied at `ReviewDetail.tsx:1319` documenting reviewer-flow rationale.

- **Local verification clean post-fix**: `supabase db reset` applies all 4 PR 4 migrations cleanly; `lessons_with_metadata` view confirmed exposing both new columns via information_schema query; toggle test passes (view filtered 5→4, view unfiltered stays 5, RPC drops to 4, restoration works); type-check + lint + vitest 577/577 clean.

- **Migration commit `f522740` + fix-up commit `b0f2564`** on `feat/metadata-foundation-corpus-cleanup`. Branch is now 5 commits ahead of main (Session 46 docs cherry-pick + 2 substantive Session 47 + Session 47 docs + Session 48 substantive + Session 48 fix-up); session-end docs commit makes 6 ahead.

**Decisions made:**

- **Per-consumer filter approach over view-bake** — confirmed cleanest given the asymmetry requirement (detect-duplicates / reviewer dup-flow keep seeing retired). View-bake would force consumers off the view, more refactor.

- **`LessonSearchPicker.excludeRetired` prop with default=false (not bake-into-component)** — chose prop over single behavior because of the genuine submitter/reviewer asymmetry. Default false preserves all existing callers (including `ReviewDetail`); the new submitter caller (`RevisingSubmissionForm`) explicitly opts in. Hardening comment at reviewer call-site prevents silent drift if future refactor flips the default.

- **Empirical TEST DB probe before locking surface inventory** — discovered 0 current state references any retired ID. PR 4 is forward-looking (catches future Stone Soup re-submissions); current state is empirically clean. Lower blast radius than the original 6-surface concern implied.

- **3 NEW surfaces beyond status doc's original 6** — added `search-lessons` edge fn (defensive symmetry), `LessonSearchPicker` (UX asymmetry), `process-submission` server-side validation (defense-in-depth). Status doc's "6 surfaces" was directional; investigation refined to 8.

- **CREATE OR REPLACE for both migrations (not DROP+CREATE)** — both `search_lessons` (signature unchanged, body-only change) and `lessons_with_metadata` view (PostgreSQL permits appending columns) can use the lighter pattern. No GRANT re-issue needed; existing function/view identity preserved.

- **Pre-push code-reviewer agent value confirmed.** P0 finding (view-doesn't-expose-retired) was a latent bug that local `supabase db reset` did NOT catch (the failing call sites use mocked tests; the local DB ran but the chain was never exercised against the actual view). Local toggle test only exercised the search_lessons RPC path, not the view path. Pre-push review is exactly the kind of independent eyes that catches this class of bug — a concrete data point for `feedback_pr_bot_review_workflow.md`.

**Process notes for Session 49+:**

- **Push branch immediately when next session starts** — substrate + filter surfaces are bundled per `feedback_no_docs_push_during_pr.md` spirit. CI applies all 4 PR 4 migrations to TEST DB on first push. Round 0 verification fires immediately after CI.

- **Round 0 verification queries** (run via `mcp__supabase-test__execute_sql` after CI applies migrations to TEST DB):
  - 21 retired count: `SELECT count(*) FROM lessons WHERE retired_at IS NOT NULL;` should return 21
  - 7 distinct reasons: `SELECT count(DISTINCT retired_reason) FROM lessons WHERE retired_at IS NOT NULL;` should return 7
  - FSA retitle: `SELECT title FROM lessons WHERE lesson_id = '1iqGFHrQ0rWfyoLo4R4n8FO9N-S7LW1ZpalaLNF5_Tmk';` should be `'Food System Advocates (Part 1)'`
  - View exposes columns: `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='lessons_with_metadata' AND column_name IN ('retired_at','retired_reason');` should return 2 rows
  - View live count: `SELECT count(*) FROM lessons_with_metadata WHERE retired_at IS NULL;` ≈ 767 (TEST corpus 788 minus 21)
  - Concepts recovery: `SELECT count(*) FROM lessons WHERE lesson_id = ANY(ARRAY[<7-id list>]) AND metadata->'academicConcepts' IS NOT NULL;` should return 7

- **Pre-PROD-apply MCP probe pattern** (Session 46 + 47 precedent) — same probes via `mcp__supabase-remote__execute_sql` AS A READ before approving PROD migration workflow. Belt-and-braces: TEST↔PROD diff via same query body to spot-check both surfaces.

- **Post-PROD verify** — same probes via `mcp__supabase-remote__execute_sql` after PROD migrations applied. Mandatory per kickoff hard rule (CI verify-step has known SASL flake).

- **Watch the migrate-production.yml SASL flake on apply step.** PR 4 has 4 migrations applying together (vs the typical 1-2). If the apply step flakes, `gh run rerun --failed <run_id>` is the working primitive (per memory's hygiene-follow-ups). Approval gate re-fires for re-approval. Migrations are idempotent (`CREATE OR REPLACE` + `IF NOT EXISTS` + `AND retired_at IS NULL` guards) so retry is safe.

- **Bot review rounds expected.** PR 1 had 5 rounds; PR 2 had 5 rounds. PR 4 should be lighter (smaller diff + cleaner separation of concerns) but expect 2-3 rounds at minimum. Round-cap after 2 per kickoff.

### Session 47 — 2026-05-08 — PR 4 cycle started: 21 imports soft-retired + 7 concepts recovered + FSA retitle (migrations local-only)

**Done (1 substantive commit `ed8ca21` + PR-cycle archival on disk + this session-end docs commit):**

- **Branch setup**: pulled main → `cf2aad4` (PR 2 squash); branched off as `feat/metadata-foundation-corpus-cleanup`; cherry-picked `07d9878` (Session 46 docs commit on the merged PR 2 branch) → `0672cc8`. Per Session 38 precedent, the merged-branch session-end docs commit bundles into the next PR.

- **Pre-flight investigation** (4 PROD probes via `mcp__supabase-remote__execute_sql`):
  1. **Drop list count** — all 21 listed lesson_ids confirmed; structural sweep for additional candidates returned 30 false positives (older ESYNYC `Aim:`/`Summary:` template that doesn't use the literal "Opening Circle"/"Engaging Activity"/"Question of the Day" phrases). Spec count "23" identified as stale early estimate; locked actual count is 21. TEST↔PROD parity exact.
  2. **FK + user-state audit** — bookmarks_total=0 (PROD has zero bookmarks anywhere), 0 lesson_versions on drops, 0 collections, 0 submissions, 0 reviews, 0 similarities. 2 historical references to drop list: Leaves We Eat (`0B1MDYcmyESHgWDIyelRWbHljZ1k`) + Stone Soup (`1syFNS-FUiVWUvkZRhfyxfXc0ukDrwnkO`) are canonical winners of dedup `group_6` and `group_82` (resolved 2025-09-01 `merge_and_archive`). Soft-delete preserves these references intact.
  3. **FSA current title** — confirmed "Food System Advocates (Part 1 & 2)" exists at lesson_id `1iqGFHrQ0rWfyoLo4R4n8FO9N-S7LW1ZpalaLNF5_Tmk`; tags + format columns NULL.
  4. **Archive-only concepts** — 7 distinct lesson_ids have ~19 concepts surviving only in `lesson_versions` archive (all archived 2026-04-27 Phase 6.2). The `v_title='Unknown'` outlier (`11oY-EaKF7FTeNxSE_xbsCmSytnBmjc9WPlyBF11Chz0` for live "Green Acai Bowls") still has a plausible concept (`{Science: [garden exploration]}`); only the concept JSONB blob is recovered, not the title field.

- **Three implementation decisions surfaced + locked** (see Current State for full statements):
  1. Soft-delete via `retired_at` + `retired_reason` columns with cluster-key namespace.
  2. 404 UX for direct-link to retired lessons.
  3. Filter retired in 6 surfaces (lessons_with_metadata view + search_lessons RPC + smart-search + lesson detail + facetCounts.ts + embedding regen); detect-duplicates + content-hash dedup intentionally NOT filtered.

- **Migration 1 — `20260520000000_corpus_cleanup_retire_imports.sql`** (107 lines). Adds 2 columns; UPDATEs 21 rows with cluster-key reasons; UPDATEs FSA row to drop "& 2"; idempotent guards.

- **Migration 2 — `20260520010000_recover_archive_only_concepts.sql`** (149 lines). Restores `academicConcepts` from `lesson_versions.metadata.academicIntegration.concepts` into live `lessons.metadata.academicConcepts` for 7 lesson_ids. DISTINCT ON (lesson_id) + ORDER BY version_number DESC defensively. Idempotent (`AND l.metadata->'academicConcepts' IS NULL OR ...`). Per-row ROLLBACK enumerated.

- **Local verification clean**: `supabase db reset` applies all migrations; MCP probe confirms columns; type-check + lint + vitest 575/575.

- **PR-cycle archival** (per kickoff session-end ritual step 5, fires at session 1 of new PR cycle): Sessions 37-46 (PR 2 ritual cycle) moved from active execution-status.md → archive file. Active file shrinks from 493 → ~135 lines (Current State + Recent decisions + Out-of-scope + Pointers + Auto-loaded MEMORY + Session 47 entry + archive pointer). Archive grows by ~417 lines (sessions 37-46 + intro section header summarizing the PR 2 cycle).

- **Migration commit `ed8ca21`** + this session-end docs commit on `feat/metadata-foundation-corpus-cleanup`. Branch is 2 commits ahead of main (Session 46 docs cherry-pick `0672cc8` + Session 47 migrations `ed8ca21`); session-end docs commit makes 3 ahead.

**Decisions made:**

- **Soft-delete over hard-delete or archive-table.** 0 bookmarks in PROD makes user-state preservation moot, but soft-delete still wins on (a) reversibility (UPDATE retired_at = NULL), (b) historical FK preservation (the 2 dup_resolutions / lesson_archive references stay intact), (c) smaller blast radius (no row deletes, no Phase 6.2 §4D FK-checklist gauntlet). Hard-delete + Drive-folder-backup adds operational overhead for a population that's pre-Phase-6.2 batch imports with no submission lineage. Archive-table approach would split rows across two tables and adds FK-handling work.

- **Cluster-key reason namespace, not free-text.** Free-text is more flexible but harder to aggregate. Cluster keys (e.g., `import:foodcorps_2017`) enable forward audit queries like "show all FoodCorps imports retired" without re-scanning content. Foundation-phase PR 4 has 7 cluster keys. Future retirement reasons can use other namespaces (e.g., `dedup:near_duplicate_winner` if dedup work later retires a row); namespace separation makes intent explicit.

- **404 UX over retirement page or banner.** 0 bookmarks anywhere in PROD means no user is depending on direct links. A retirement page would require a new component + a non-filtered query path; a banner would render the lesson normally and undercut the point of retirement. Phase 2 reviewer-UX redesign can revisit if a use case emerges.

- **Six filter surfaces, two intentionally exempt.** lessons_with_metadata view + search_lessons RPC + smart-search + lesson detail + facetCounts.ts + embedding regen all need the filter for consistency; partial application would create a confusing partial-retirement state (invisible from search but accessible by URL). detect-duplicates + content-hash dedup stay unfiltered because cross-checking against retired imports at submission time is useful (helps prevent re-importing the same FoodCorps Stone Soup).

- **Spec-count "23" → actual "21" — note in migration header, no further investigation.** The structural sweep returned 30 false positives + 0 obvious additional candidates. If 2 more candidates surface later (via, e.g., reviewer feedback or a more sophisticated Opus re-read), a follow-up migration can extend the retirement set; the soft-delete mechanism generalizes.

- **Migrations committed in one substantive commit, docs in a separate commit** (matches PR 1b/2 patterns). Cleaner git log for the next session's review pass.

**Process notes for Session 48+:**

- **Filter-surface follow-ups still local on this branch** — don't push until they land. Per `feedback_no_docs_push_during_pr.md` spirit, bundle CI cycles. Substrate migrations + filter surfaces ship as one PR.

- **TEST DB verification fires when CI applies migrations** (round 0 = PR open). Per `feedback_per_round_test_db_verification.md`, every subsequent fix-up round needs its own re-verification. The migration apply on TEST is the load-bearing probe (21 retired count + FSA new title + 7 concepts recovered).

- **Pre-PROD-apply MCP probe pattern as Session 46 surfaced** — keep doing the body-signal probe pre-PROD-apply as well as round-by-round. Distinct axis from per-round verification. Session 46 explicitly flagged this as a `feedback_per_round_test_db_verification.md` promotion candidate; consider adding the bullet during PR 4's pre-PROD-deploy session if not done sooner.

- **Pre-delete checklist for any future hard-deletes.** Phase 6.2 §4D pattern (FK refs INTO + FK ref OUT FROM via lessons.original_submission_id) doesn't apply to soft-delete but stays in `MEMORY.md` for future hard-delete work. The Session 47 audit (15-FK-table count probe) is the inverse pattern for soft-delete; document for future PR-cycle reference.

- **Watch for type-coupled cluster pattern in filter-surface follow-ups.** Adding `WHERE retired_at IS NULL` to `lessons_with_metadata` view changes the projection's row count; if any test fixture or RPC consumer counts rows in a way that drops retired lessons, those break together. Per Session 30 PR 1b learning, ship as one cluster commit if type-narrowing cascades.

- **The `search_lessons` RPC will need a DROP+CREATE pattern** if the filter clause changes function signature (e.g., adding a `filter_include_retired` boolean for forward flexibility). Otherwise a `CREATE OR REPLACE` is fine — same pattern Task 1.4b used to add `filter_tags`. Decide at impl time based on whether the API needs an opt-in escape hatch.

### Sessions 18-46 — archived

PR 2's design reference (Session 18) + earlier session entries (Sessions 18-27 implementation), PR 1b's full implementation cycle (Sessions 28-36), and PR 2 ritual cycle (Sessions 37-46) all live in `2026-05-03-metadata-rebuild-foundation-execution-status-archive.md`. Read on demand via `grep -n "Session N" archive.md` or targeted Read with offset/limit. Process learnings collected during Sessions 28-46 that promoted to feedback memory: empirical-evidence-escalates pattern + active-PR session-orientation rule (both in `feedback_pr_bot_review_workflow.md` post-Session 37). Watch-patterns preserved in Recent decisions above (type-coupled cluster impl-plan flaw / cherry-pick-over-rebase / rebase-rename-sweep / database-migrations skill exception class — all single-occurrence, promote to feedback if they recur).
