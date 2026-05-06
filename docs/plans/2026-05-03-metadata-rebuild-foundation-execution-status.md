# Metadata Rebuild — Foundation Phase — Execution Status

**Last updated:** 2026-05-06 — Session 31 (PR 1b Tasks 1b.6 + 1b.7 shipped on `feat/metadata-foundation-activity-type-multi`; 8 commits ahead of `origin/main`).

> **About this file.** Active status carrying forward only what the next 1-2 sessions need to orient. Full per-session journal for Sessions 1-17 lives in `2026-05-03-metadata-rebuild-foundation-execution-status-archive.md` (965+ lines, read on demand via grep). When a new PR cycle begins, that PR's session entries can move to the archive at the start of the following PR; the active file always reflects current PR + a small carry-forward roll-up.

## Current State

**Active PR:** **PR 1b — D2 multi-select refinement.** Branch `feat/metadata-foundation-activity-type-multi`; **8 commits ahead of `origin/main`** (excluding the 2 docs commits Session 30 and the PR-cycle archival, total 10 commits ahead):
1. `54124a5` Task 1b.1 — retire `'both'` value + repoint data
2. `af023d4` Task 1b.2 — `complete_review_atomic` array passthrough
3. `7537ac7` Task 1b.3 — Zod review-form activityType array shape
4. `71fc3ba` Task 1b.4 — activity_type mappers pass-through array
5. `a4fffbc` Task 1b.5 (code) — ReviewDetail multi-select activity_type picker + ReviewMetadataForm dead-code conformance
6. `69ed67d` Task 1b.6 — filterDefinitions.ts multi-select + drop 'both' chip
7. `af4910a` Task 1b.7 — google-docs-parser extractActivityType returns canonical array

Tasks 1b.5-visual-smoke + 1b.8 remain (~2 sub-tasks; both gated on PR push).

**Why PR 1b interrupts PR 2:** mid-Task-2.4 ground-truth resolution surfaced concrete evidence that D2's single-select decision was made on n=1 (Dr. Carver Lotion-Making) but actual rate is ~5/26 = 19% multi-axis lessons — extrapolates to ~30+ in the 772-row corpus. User decided to retire `'both'` and switch to true multi-element array. See decision journal D2.1.

**PR 2 branch state (paused):** `feat/metadata-foundation-llm-tagging` is 20 commits ahead of `origin/main` (Sessions 18-27). Untouched until PR 1b merges; then rebases onto new main. **Rebase conflict expected:** PR 2's `20260517000000_*` and PR 1b's `20260518100000_*` both `CREATE OR REPLACE complete_review_atomic`; PR 2's `tags` side-channel must be re-folded into PR 1b's array-passthrough body during rebase. Use `mcp__supabase-test__execute_sql pg_get_functiondef(...)` after rebase apply to verify both code paths survive.

**Next session picks up:**
- **Task 1b.8 — PR push ritual.** Per kickoff PER-PR RITUAL: pre-push code-reviewer agent (Opus) on `git diff main...HEAD`; investigate every finding; apply fix-up commits BEFORE push; `npm run type-check && npm run lint && npm test` must pass; push branch; open PR; wait for external bots; 4-surface comment triage; bot review cycles (round-cap after 2 rounds); per-round TEST DB verification via `mcp__supabase-test__execute_sql`. PR-1b-specific verification once CI applies migrations to TEST DB: re-run Task 1b.2 transactional probes A-F; confirm 135-row `'both'` migration was idempotent (already verified locally Session 28; re-confirm on TEST); verify Zod review-form schema rejects scalar at runtime; confirm sidebar Activity Type filter behaves correctly (4 chips, multi-select).
- **Task 1b.5 visual smoke** can fold into Task 1b.8's pre-push verification (chrome-devtools-mcp against local dev server — not gated on TEST DB migrations) OR run after CI applies migrations. Local-dev-server option is faster and lets reviewer pre-verify before bot rounds. Cover: multi-pill selection on activity_type; conditional cooking/garden sections render correctly across `[cooking]` / `[garden]` / `[cooking, garden]` / `[craft, garden]` etc.; save round-trip preserves array shape.
- **Post-merge:** rebase `feat/metadata-foundation-llm-tagging` (PR 2) onto new main; expected conflict on `complete_review_atomic` (both PRs `CREATE OR REPLACE`); re-fold PR 2's `tags` side-channel into PR 1b's array-passthrough body during rebase. Verify via `mcp__supabase-test__execute_sql pg_get_functiondef(...)` after rebase apply that both code paths survive.

**Pre-task verification:** Task 1b.8's verification is intrinsic to the PER-PR RITUAL — no pre-task work. Verify line numbers in impl plan against current files only if any fix-up rounds modify code (kickoff "verify every snippet" rule).

**`npm run type-check` + `npm run lint` + `npm test` all green at branch tip.** 546/546 unit tests passing (38 files, including 33 google-docs-parser tests post-Task-1b.7).

**Branches:**
- `main` at `8497752` (PR 1 squash merge).
- `feat/metadata-foundation-activity-type-multi` (PR 1b) — 6 commits ahead, local-only, no upstream pushed yet; CI on TEST DB has not applied PR 1b migrations.
- `feat/metadata-foundation-llm-tagging` (PR 2) — 20 commits ahead, paused.
- `feat/metadata-foundation-schema` (PR 1's merged branch) — deletable at convenience.

**Foundation-phase substrate now live on PROD (post-PR-1):**
- Schema: `lesson_format` dropped, `series_id` + `part_number` + `crf_confirmed` columns added, `activity_type` enum at 5 values incl. `'both'` (PR 1b retires `'both'` post-merge — Tasks 1b.1+1b.2 done locally), `tags` array column with closed enum, `cultural_responsiveness_features` closed to 7 Brown CR features.
- 3 CHECK constraints (`<@` containment, length-agnostic) + trigger value-validation helper.
- Zod canonical + bidirectional mappers + Deno mirror + `enums.json` + freshness CI test.
- Filter UI: `lessonFormat` removed; "Lesson Type" sidebar filter backed by `tags` column (count badge shows `(0)` until tags is added to `search_lessons` RETURNS TABLE — see follow-ups).
- Edge functions: `complete-review` wired to Zod safeParse; `process-submission` has CRF prompt wired in (Session 26).

**Last-applied verification (post-PROD-apply, 2026-05-05):** 15-point MCP audit on TEST + PROD both 15/15 PASS. `complete-review` deploy verified via `mcp__supabase-remote__get_edge_function`: version=3, ezbr_sha256=`9115a1d9261d2fb1352e709fb3d0b1a44efa94908dae502c100da6c7a6047c39`, source contains the new Zod safeParse block + `_shared/metadataSchemas.ts` mirror. Migration apply succeeded on first try; 1 of 12 edge fn deploys (`invitation-management`) failed on `esm.sh` 522 CDN flake, rerun via `gh run rerun --failed 25385024748` succeeded on second attempt. PR 1 didn't change `invitation-management/index.ts`; failure was unrelated.

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

### Session 31 — 2026-05-06 — PR 1b Tasks 1b.6 + 1b.7 shipped (commits `69ed67d` + `af4910a`)

**Done (2 commits):**

- **Commit `69ed67d` — Task 1b.6 (filterDefinitions.ts multi-select):** `src/utils/filterDefinitions.ts:32-42` — `type: 'single'` → `'multiple'`; dropped the `{ value: 'both', label: 'Cooking + Garden' }` chip option. 4 chips remain (cooking-only / garden-only / academic-only / craft-only). Pre-edit grep confirmed `filters.activityType` is already typed as array at consumer sites (`useLessonSearch.ts:112` `filters.activityType?.length`; `ScreenReaderAnnouncer.tsx:19` `filters.activityType.length`; `useLessonSuggestions.ts:30,56`), so the `type: 'single'` → `'multiple'` flip propagated cleanly without downstream type-check breakage.

- **Commit `af4910a` — Task 1b.7 (google-docs-parser canonical array shape):** `supabase/functions/_shared/google-docs-parser.ts` — `extractActivityType` return type `string | undefined` → `string[] | undefined`; all 7 return paths emit canonical column shape (`['cooking']`, `['garden']`, `['academic']`, `['cooking', 'garden']`) instead of slugs (`'cooking-only'`, `'garden-only'`, `'both'`, etc.). Updated `MetadataSketch.activityType?: string` → `string[]` at line 66; updated file-level value-shape comment to clarify activityType uses column-canonical values while other fields still use filter-slug values. Updated 6 unit-test fixtures in `google-docs-parser.test.ts` (lines 122/127/134/146/155/231) from `.toBe('slug')` to `.toEqual(['canonical'])`; rewrote test names to match. The "below frequency threshold" `toBeUndefined()` test at line 141 was correctly preserved unchanged — `if (activity) sketch.activityType = activity` at line 305 still skips assignment for `undefined` returns. 33/33 google-docs-parser tests pass; 546/546 full suite green.

**Decisions made:**

- **Canonical-vs-slug emission decision for Task 1b.7.** Impl plan only explicitly addressed the hybrid-mode `'both'` case → `['cooking', 'garden']` (canonical). For singletons (cooking-only / garden-only / academic-only), the impl plan said only "similar fix" without specifying. Chose canonical (`['cooking']` etc.) for ALL return paths, not slug-form (`['cooking-only']`):
  - **Internal consistency** with the explicitly-canonical hybrid case.
  - **Matches `lessons.activity_type` column shape** post-D2.1 (canonical 4-value enum: cooking / garden / academic / craft).
  - **Bug-fix bundled.** detect-duplicates' `calculateJaccardSimilarity` `normalize()` is just `String(item).toLowerCase().trim()` — no slug→canonical translation. Pre-PR-1b parser slug emission (`'cooking-only'` → `['cooking-only']` after auto-wrap at `detect-duplicates/index.ts:188`) vs canonical column (`['cooking']`) → the activityType arm of `calculateMetadataOverlap` was scoring 0% match on most submissions. Canonical emission fixes this incidentally; impl plan's verify clause "Jaccard scoring still works on submissions" was technically true but understated — slug-vs-canonical mismatch already affected scoring. The fix is bundled in-scope per kickoff's "small repo-conformance adaptations are allowed" rule.

- **File-level comment on `MetadataSketch` updated** to be accurate post-D2.1: "values match what's stored on the lessons side: activityType uses canonical column values (cooking, garden, academic, craft); other fields use filter values from src/utils/filterDefinitions.ts." Avoids the previous phrasing "values match the canonical filter values defined in filterDefinitions.ts" which was now inaccurate for activityType.

- **Stale impl plan reference: line 141 of test file (`toBeUndefined()` for below-frequency case) was listed in impl plan's "lines to update" but didn't actually need updating** — the function still returns `undefined` for the no-signal case, and `if (activity) sketch.activityType = activity` at line 305 still skips assignment, so the existing `expect(sketch.activityType).toBeUndefined()` passes unchanged. Did NOT update the impl plan (kickoff "don't unilaterally rewrite the spec" rule); for Session 32+ working subsequent tasks, just trust current-code state and run tests over impl plan line-by-line.

**Process notes for Session 32+:**

- **Task 1b.8 PR ritual** is the only remaining task. Pre-push code-reviewer agent (Opus per `feedback_opus_subagents.md`) on `git diff main...HEAD` — investigate every finding per `feedback_bot_review_investigation.md`. PR push, then external bot reviews (CodeRabbit / Claude Review / Codex per recent observed bot-set), 4-surface comment triage per `feedback_pr_comment_surfaces.md`, per-round TEST DB verification per `feedback_per_round_test_db_verification.md`, round-cap after 2 rounds per kickoff.

- **Task 1b.5 visual smoke can fold into Task 1b.8 pre-push verification** — chrome-devtools-mcp against local dev server (not TEST DB) verifies the reviewer-side UI logic without needing TEST DB migrations applied. Faster than waiting for CI apply + Netlify deploy preview. Cover: multi-pill selection on activity_type; conditional cooking/garden sections render across `[cooking]` / `[garden]` / `[cooking, garden]` / `[craft, garden]`; save round-trip preserves array shape via mappers.

- **Post-merge rebase of PR 2 onto new main** — expected conflict on `complete_review_atomic` (both PR 1b's `20260518100000_*` and PR 2's `20260517000000_*` `CREATE OR REPLACE` the RPC). Re-fold PR 2's `tags` side-channel into PR 1b's array-passthrough body during conflict resolution. Verify via `mcp__supabase-test__execute_sql pg_get_functiondef(...)` post-rebase that both code paths survive.

- **Type-coupled cluster awareness — opposite of Session 30.** Tasks 1b.6 + 1b.7 were truly independent (different files, different runtimes, no shared types). Bundling them in one session was clean — neither task's verify clause depended on the other. Compare to Session 30's 1b.3+1b.4+1b.5-code cluster which had to ship together because the schema-shape change cascaded. Future-session calculus: bundle independent tasks freely; cluster type-coupled tasks with explicit "tsc-break expected mid-session" framing.

### Session 30 — 2026-05-06 — PR 1b Tasks 1b.3 + 1b.4 + 1b.5-code shipped (commits `7537ac7` + `71fc3ba` + `a4fffbc`)

**Done (3 commits):**

- **Commit `7537ac7` — Task 1b.3 (Zod review-form activityType array shape):** changed `reviewFormPayloadSchema.activityType` from `ActivityTypeEnum.optional()` (single string) to `z.array(ActivityTypeEnum).optional()` (multi-element). Synced the Deno mirror at `supabase/functions/_shared/metadataSchemas.ts` (line 25 + 107) including the leftover `'both'` removal that Task 1b.1 missed. Updated `ReviewMetadata.activityType?: string` → `string[]` in `src/types/index.ts:103`. Equivalence test fixtures updated (32 → 35 tests; both prior failing assertions now green): added `{ activityType: ['both'] }` invalid for both schemas (D2.1 retirement); rewrote review-form valid fixtures from scalar to array; removed the now-stale `{ activityType: ['cooking'] }` invalid case (now valid for review-form too); added scalar-rejection invalid cases.

- **Commit `71fc3ba` — Task 1b.4 (mappers passthrough):** dropped the single-string ↔ single-element-array translation for activityType in both `reviewToLesson` and `lessonToReview` (now passthrough — both schemas use array shape post-1b.3). Narrowed `lessonToReviewMapper.ts` docstring asymmetry note to mention only `location` (the activityType branch is no longer asymmetric); trimmed `reviewToLessonMapper.ts` translation rules. Mapper tests: renamed "wraps single-select" / "extracts first element" tests to "passes activityType array through" (single + multi variants per direction); added multi-element fixtures to round-trip property; DROPPED the "intentionally lossy for canonical with multi-element activityType" test (no longer lossy); acceptance fixture retyped to array shape.

- **Commit `a4fffbc` — Task 1b.5 (code) + ReviewMetadataForm dead-code conformance:** wired the four ReviewDetail.tsx activityType touchpoints to `string[]` shape — `reAddActivityTypeSuffix` maps over array; `showCookingFields` / `showGardenFields` use `.includes()`-on-array; save-path strip uses `metadata.activityType?.map(s => s.replace(/-only$/, ''))`; IntPillGroup invocation switches to native `selected={... ?? []}` + `onChange` (default `mode='multi'`). The `singleProps` adapter stays — still used for `location`. ReviewMetadataForm.tsx (zero external imports per Session 27 N1 audit; deletion still queued separately) gets the same `.includes()`-on-array pattern for type-conformance to keep tsc green at branch tip. Bundled small follow-up: `reviewToLessonMapper.test.ts` round-trip-property comment narrowed + prettier auto-format from `npm run lint:fix`.

**Process notes:**

- **Impl plan flaw surfaced + path-1 path chosen.** Impl plan's Task 1b.3 verify clause says `npm run type-check` clean, but the schema-shape change inherently breaks every downstream consumer (`reviewToLessonMapper.ts:32`, `lessonToReviewMapper.ts:34`, `ReviewDetail.tsx` 12 errors at lines 125-851, `ReviewMetadataForm.tsx` 6 errors at lines 26-36). Per kickoff "small repo-conformance adaptations are allowed" + "session-end ritual: tsc must pass," bundled 1b.3 + 1b.4 + 1b.5-code + ReviewMetadataForm conformance into one session as 3 commits. User approved path 1.

- **ReviewMetadataForm.tsx scope adjustment.** Status doc Session 27 N1 said deletion "NOT in PR 1b" (queued for separate hygiene PR). The schema-shape change forced a type-conformance update on the dead-code component (`===` → `.includes()`-on-array on lines 26-36) to keep tsc green at branch tip. This is a small adaptation, not the deletion that's queued separately — a-okay per scope boundaries.

- **`npm run lint:fix` auto-formatted prettier issues** in `reviewToLessonMapper.test.ts` after Task 1b.4's commit. The fix-up + comment narrowing got bundled into the Task 1b.5 commit rather than amending 1b.4 (per kickoff "Prefer to create a new commit rather than amending an existing commit"). Mildly off-theme but in the same chain of changes.

- **Visual smoke deferred.** Task 1b.5 verify clause includes chrome-devtools-mcp visual smoke (multi-pill selection, conditional sections, save round-trip). Code-only landing this session; visual smoke moved to Session 31's pre-Task-1b.6 verification or Task 1b.8 PR ritual. Branch is local-only — TEST DB has not received the migrations yet, so visual smoke is gated on PR 1b push.

- **Verify-clause vs reality gap (process learning, candidate for `feedback_*` if it recurs).** When a schema-type change touches multiple consumer files, decompose-by-file impl plans need a "type-coupled cluster" framing — all consumers ship together OR session-end ritual bends. Future similar work: bundle consumer-cluster from the start in the impl plan, OR explicitly note "intermediate tsc-break expected; cluster ships together" in the verify clause.

### Session 29 — 2026-05-06 — PR 1b Task 1b.2 shipped (commit `af023d4`)

**Done (commit `af023d4`):**

- **Wrote migration `20260518100000_complete_review_atomic_activity_type_multi.sql` (~325 LOC) + sibling `.rollback`.** CREATE OR REPLACE on `complete_review_atomic` carrying the full RPC body from the source-of-truth baseline (`20260512000000_drop_lesson_format.sql` lines 319-643). Two activityType expressions changed; ~325 surrounding lines copy verbatim because PostgreSQL functions are CREATE OR REPLACE-only.

- **Pre-task verification followed Session 28's process note:** queried TEST DB via `mcp__supabase-test__execute_sql pg_get_functiondef('public.complete_review_atomic'::regproc::oid)` to confirm the live state matches `20260512000000_*`. Did NOT trust impl plan §Task 1b.2's stale line refs (which point to `20260517000000_*` on PR 2 branch). Cross-referenced against the local migration file via `grep -n activityType` to find the actual two spots that needed changing.

- **Repo-conformance adaptation vs impl plan spec:**
  - Impl plan suggested `_phase4_jsonb_text_array_or_null(v_meta->'activityType')` for **both** INSERT and UPDATE.
  - Adopted: `_phase4_jsonb_text_array(v_meta->'activityType')` for INSERT (matches sibling-field convention — `gradeLevels` line 470, `themes` line 474, `season` line 475 etc. all use the no-null version, returning `[]` on absent input).
  - Kept: `COALESCE(_phase4_jsonb_text_array_or_null(v_meta->'activityType'), v_existing.activity_type, ARRAY[]::text[])` for UPDATE (matches `gradeLevels` 548-552, `thematicCategories` 558-562, etc., COALESCE chain that preserves existing column when reviewer doesn't supply).
  - Rationale: closer to "small repo-conformance adaptation" per kickoff guidance than impl plan's literal text. Behaviorally equivalent at column write level for `[]` vs NULL → trigger normalize_write would coerce both to same shape; the COALESCE-vs-direct-call structure matters for whether existing column survives reviewer non-supply.

- **Local verification — all 6 transactional probes PASS** via `mcp__supabase__execute_sql` DO blocks with terminal `RAISE EXCEPTION` for rollback (auto-commit at MCP layer + RAISE EXCEPTION at DO block level produces clean transactional rollback per probe; result surfaces via the exception message which MCP returns as error.message):
  - **Probe A:** approve_new INSERT with `["cooking","garden"]` → column `{cooking,garden}` ✓ (THE bug fix — previously stringified to `["cooking","garden"]` as a single-element).
  - **Probe B:** approve_new INSERT with `["cooking"]` → `{cooking}` ✓ (back-compat).
  - **Probe C:** approve_new INSERT with absent activityType key → `{}` ✓ (matches sibling-field empty-array default).
  - **Probe D:** approve_new INSERT with scalar `"cooking"` → `{cooking}` ✓ (legacy back-compat via helper's scalar branch — wraps single string into single-element array).
  - **Probe E:** approve_update on LESSON-002 with `["cooking","garden"]` → column updated to `{cooking,garden}` ✓ (overwrites prior `{cooking}`).
  - **Probe F:** approve_update on LESSON-002 with absent key → existing `{cooking}` preserved ✓ (COALESCE chain falls through to v_existing.activity_type).

- **`npm run type-check && npm run lint` clean.** Migration-only change; no TS surfaces touched. The 2 known equivalence-test failures from Task 1b.1 carry forward into Task 1b.3.

- **Branch is local-only (no upstream).** No CI run; TEST DB has NOT received the new migration yet. Plan-aligned: TEST DB verification deferred to Task 1b.8 PR push + CI apply.

**Process notes for Session 30+:**

- **`RAISE EXCEPTION` as a result-surfacing primitive in MCP-driven plpgsql probes.** MCP's `execute_sql` does not surface `RAISE NOTICE` messages (verified via probe). DO blocks don't return result sets. Workaround: `RAISE EXCEPTION 'PROBE-X pass=% actual=%', ..., ...` returns the formatted message via the response's `error.message` field. Side benefit: aborts the transaction, rolling back any setup INSERTs / RPC calls — leaves the local DB clean. Pattern applies anywhere we want plpgsql-level assertions over `mcp__supabase__execute_sql` without writing real test fixtures.

- **The `lesson_submissions` table requires `google_doc_id` (NOT NULL) for any test fixture INSERT.** First probe pass missed this; six errors all returned `null value in column "google_doc_id" of relation "lesson_submissions" violates not-null constraint`. Use any unique string per probe (`'doc-probeA'`, etc.) — uniqueness is FK-irrelevant for a transactional rollback probe, just non-null.

- **Rebase-conflict heads-up for PR 2** (carried into the Current State header): PR 2's `20260517000000_complete_review_atomic_tags_side_channel.sql` and PR 1b's `20260518100000_complete_review_atomic_activity_type_multi.sql` both `CREATE OR REPLACE` the RPC. After PR 1b merges, PR 2's rebase will need to re-fold the `tags` side-channel logic into PR 1b's body (or apply both as separate migrations and ensure end-state has both code paths).

- **Impl plan §Task 1b.2 line refs were stale** (cited `20260517000000_*` lines 218-220 INSERT + 300-304 UPDATE — that file is on PR 2 branch only). Did NOT update the impl plan: kickoff says "don't unilaterally rewrite the spec." Future Session 30+ working Task 1b.3 should also verify line refs against current files before applying.

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

### Sessions 18-27 — archived

PR 2's session entries (Sessions 18-27) and the PR 2 paused design reference moved to `2026-05-03-metadata-rebuild-foundation-execution-status-archive.md` mid-PR-1b (Session 30 cleanup, 2026-05-06). PR 2 work is paused until PR 1b ships; resume by reading the archived sessions on demand. Audit performed during the move surfaced no new feedback or memory promotions — operational patterns (RAISE EXCEPTION probes, MCP truncation recovery, 3-stage eval rollout, cross-check filter) are documented in their archived session entries; the cache_read=0 / esm.sh CDN flake / 3-signal edge-fn verification patterns are already captured in MEMORY.md hygiene-follow-ups.

