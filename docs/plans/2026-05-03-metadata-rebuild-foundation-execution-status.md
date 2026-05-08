# Metadata Rebuild — Foundation Phase — Execution Status

**Last updated:** 2026-05-08 — Session 51 (PR 4 SHIPPED + PROD-applied + verified; foundation-phase substrate complete through PR 4).

> **About this file.** Active status carrying forward only what the next 1-2 sessions need to orient. Full per-session journal for Sessions 1-46 lives in `2026-05-03-metadata-rebuild-foundation-execution-status-archive.md` (read on demand via grep). When a new PR cycle begins, that PR's session entries move to the archive at the start of the following PR; the active file always reflects current PR + a small carry-forward roll-up.

## Current State

**PR 4 (corpus cleanup) — SHIPPED + PROD-applied + verified.** PR #478 squash-merged 2026-05-08 21:47:58 UTC as `03970d0`. Both PROD workflows succeeded first-try (no SASL flake on `migrate-production.yml` apply step; no esm.sh CDN flake on `deploy-edge-functions.yml` matrix).

**Pre-PROD MCP probe (Session 51, before merge):** confirmed clean PROD pre-state — `retired_at`/`retired_reason` columns absent, 7 concept-recovery targets all NULL/missing, FSA still had original "& 2" title, 788 total lessons. Session 46/47/48 precedent applied as expected.

**Post-PROD verification (Session 51, after both PROD workflows succeeded):** 9/9 substance probes PASS on `mcp__supabase-remote__execute_sql` — P1 retired=21 ✓, P2 distinct_reasons=7 ✓, P3 FSA title='Food System Advocates (Part 1)' ✓, P4 view exposes both new cols ✓, P5 view_live_count=767 ✓ (= 788 − 21), P6 7/7 concepts populated with object shape ✓, P7 no array-shape archive concepts ✓, P8 7 cluster-key namespaces (`import:cas_food_justice / import:city_blossoms_botanical_artists / import:foodcorps_2017 / import:nyc_dep_watershed / import:nyc_doe_colonial_ny / import:oregon_doe_leaves / import:pflp_2003`) ✓, P9 search_lessons total_count=767 ✓.

**3-signal edge function verification (Session 51):** all 3 functional-change slugs deployed correctly — `smart-search` v24 + `search-lessons` v22 + `process-submission` v32 all show `.is('retired_at', null)` source content with the expected explanatory comments. (`detect-duplicates` had F4 comment-only intent-guard additions; redeployed in same workflow run, no functional change to verify.)

**Foundation-phase substrate after PR 4 ships:** PR 1 + PR 1b + PR 2 substrate + soft-retire columns on `lessons` + `lessons_with_metadata` view exposes them + 21 imports retired (7 cluster-key namespaces above) + 7 archive-only concepts restored + FSA Pt 1 retitle + 8 user-facing filter surfaces (search_lessons RPC + smart-search + search-lessons + useLessonStats + LessonSearchPicker submitter path + RevisingSubmissionForm + process-submission server-side validation + 2 embedding scripts) + 6 intentionally-unfiltered surfaces (detect-duplicates + ReviewDetail + ReviewDashboard + get_lesson_details_for_review + supabase.ts connectivity test + view itself) + `LessonSearchPicker.excludeRetired` prop infrastructure.

**Stage 1 worksheets — confirmed NOT YET STARTED (Session 51 post-merge discovery).** No worksheet artifacts exist on disk anywhere (`docs/plans/`, top-level dirs, etc.). The decision journal's wrap-up note (Session 9, 2026-05-03) listed "D1 content layer (Stage 1 heritage worksheet round)" as remaining work; foundation-phase implementation track has stayed on code work since then. Per design doc §5, the worksheet methodology is *"Claude drafts per-field canonical worksheets using `~/cCode/taggingv3/esynyc-taxonomy-schema-v2.md` as baseline + a corpus audit (Counter-style); 2 expert reviewers + user validate / amend / reject."* Claude is part of the worksheet-creation work, not just a consumer of validated worksheets.

**Next session picks up — start the next PR cycle.**

The remaining foundation-phase PRs in scope (per kickoff WHERE THINGS LIVE):
- **PR 3a** (search infra now): `search_vector` + embeddings + smart-search drift fix. Independent of Stage 1 — does NOT gate on curriculum-team worksheet outputs. **Ready to start anytime; the obvious unblocked code item.**
- **PR 3b** (search synonym population): folds into PR 6+; depends on Stage 2 re-tag outputs.
- **PR 5+** (D4 vocab canonicalization): Title Case canonical across ~10 vocab fields; Pydantic on all 17 fields. **Depends on Stage 1 worksheet outputs** — gated until at least heritage + concepts worksheets land.
- **PR 6+** (Stage 2 corpus re-tag + reviewer validation flow): depends on PR 5 + Stage 1 closure + Stage 2 reviewer-validation UX walk; flexible timing.

**Stage 1 worksheet round** is its own multi-session initiative, not a single PR. Per design doc §4 it's a separate parallel work track. When started, scaffold the four-file pattern (design + impl plan + kickoff prompt + status doc) per `feedback_multi_session_execution.md` rather than rolling it into the foundation-phase status doc. Heritage is first (~78 values; design doc estimates 300-500 Opus lesson-reads + novelty pass + reviewer/user validation hours); concepts (~211 values, biggest) second; ~8 smaller fields after. Total estimate: weeks-to-months of curriculum-team time.

**Recommended Session 52 first move:** PR 3a (search infra). It's the cleanest continuation of foundation-phase rhythm, unblocks tangible benefits (academicConcepts searchability + smart-search synonym drift fix), and runs through the established PR ritual (1-3 sessions). Stage 1 worksheet kickoff is bigger work that benefits from a separately-scaffolded multi-session initiative — best taken on after PR 3a ships.

**First-task ritual for Session 52:**
1. **PR-cycle archival** — per kickoff session-end ritual step 5: move Sessions 47-51 (PR 4 cycle) from active execution-status.md → archive file. Audit each entry for any process learnings worth promoting to `feedback_*.md` files OR hygiene follow-ups worth promoting to MEMORY.md before moving.
2. **Cherry-pick Session 51 docs commit (`c02e22c`)** from `feat/metadata-foundation-corpus-cleanup` to the new PR 3a branch (Session 47 precedent — the merged-branch session-end docs commit bundles into the next PR).
3. **Branch off updated `main`** at `03970d0` as `feat/metadata-foundation-search-infra` (or similar) for PR 3a.
4. **Read implementation plan PR 3a section** before scoping — verify scope still matches design intent + corpus state after PR 4.

**Branches:**
- `main` at `03970d0` (PR 4 squash-merge); origin matches
- `feat/metadata-foundation-corpus-cleanup` — PR #478 MERGED; the Session 51 session-end docs commit is local-only on this branch waiting to be cherry-picked into the next PR. Do NOT delete this branch until the cherry-pick happens.
- `feat/metadata-foundation-llm-tagging`, `backup/feat-metadata-foundation-llm-tagging-pre-rebase`, `docs/session-36-pr1b-shipped`, `feat/metadata-foundation-activity-type-multi`, `feat/metadata-foundation-schema` — all deletable at convenience

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

- **Migration verification-comment syntax (PR 4 round-1 F2 from Codex P3).** `supabase/migrations/20260520020000_search_lessons_filter_retired.sql:216` documents an expected post-apply count via `SELECT count(*) FROM (SELECT * FROM search_lessons() LIMIT 1000) sub; -- 767 (live)`. The inner query returns at most 20 rows (page_size default), so the outer LIMIT is a no-op. Correct syntax: `SELECT total_count FROM search_lessons(page_size => 1) LIMIT 1`. Not editing the pushed migration (database-migrations skill rule); document for future verification comments. Comment-only inaccuracy; doesn't affect runtime behavior. (Source: PR #478 round-1 Codex pass.)

- **Partial index `WHERE retired_at IS NULL` on `lessons` (PR 4 round-1 F5 from claude long-form Low).** Every `search_lessons` RPC call, smart-search query, and `useLessonStats` fetch now evaluates `retired_at IS NULL` against the full `lessons` table. At 788 rows this is negligible. A partial index `CREATE INDEX IF NOT EXISTS idx_lessons_retired_at_null ON lessons (lesson_id) WHERE retired_at IS NULL;` would help if corpus growth or `EXPLAIN ANALYZE` plans show pain. Codex defers; revisit when there's empirical evidence of cost. (Source: PR #478 round-1 claude long-form review.)

- **Dead `search-lessons` edge fn (PR 4 round-1 F6 from claude long-form Low).** Has no live front-end caller today (front-end uses `search_lessons` RPC + `smart-search` edge fn) but stays deployed and is now kept-in-sync with the retired filter. "Kept in sync for symmetry" means every future filter change has one more place to remember. Cleanest fix is to undeploy via `supabase functions delete search-lessons --project-ref ...` after merging this PR; that's separate work outside PR 4 scope and follows the deferred-approval ordering hazard pattern from MEMORY.md (drain queued production-approval runs before approving them). (Source: PR #478 round-1 claude long-form review.)

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

### Session 51 — 2026-05-08 — PR 4 SHIPPED + PROD-applied + verified

**Done (1 squash-merge on main + this session-end docs commit on local PR 4 branch, bundled per `feedback_no_docs_push_during_pr.md` spirit — though here the "no PR open" state means the docs commit waits for cherry-pick rather than bundles into a push):**

- **Pre-merge orientation correction.** Session 50 docs claimed item 2 of "Next session picks up" was "Post Round-2 response on PR #478" — but a 4-surface PR comment query found the response WAS already posted at 21:00:45 UTC at the close of Session 50 (issue comment by danfeder, "## Round-2 review response (commits `bfb3786..b33eacc`)"). The active doc was a snapshot at session-close before that response went up. Reconciled to live PR state before any code work. **Pattern note:** the active doc's task list is a session-close snapshot; subsequent activity (push that triggers post-cap reviews + comment posting + bot follow-ups) can move state. Always reconcile via 4-surface PR query before trusting the doc. (Adjacent to `feedback_pr_bot_review_workflow.md` "Active-PR session-orientation" rule, but a slightly different flavor — this is "active-doc-vs-live-PR" not "status-doc-vs-git-log".)

- **Pre-PROD MCP probe (4 probes batched):** column pre-state (`retired_at`/`retired_reason` absent on PROD `lessons` table — `col_count=0`); 7 concept-recovery targets (`has_concepts_key=false, concepts_type=null` for all 7 lesson_ids); FSA pre-retitle (`'Food System Advocates (Part 1 & 2)'`); total + view + RPC presence (788 lessons; view doesn't yet have new cols; `search_lessons` exists). All 4 probes confirmed clean PROD pre-state. Session 49 lesson-id hallucination did NOT recur this session — copied verbatim from migration `20260520010000_*` header.

- **Squash-merge of PR #478** via `gh pr merge 478 --squash`. Merge commit `03970d0`. PR title `feat(metadata-foundation): PR 4 — corpus cleanup (21 imports retired)` + comprehensive PR body became the squash commit subject + body. PR `mergeStateStatus=UNSTABLE` due to the documented baseline `Security Audit` failure (`@lhci/cli` transitive vulns); merge proceeded because UNSTABLE just signals not-all-green CI, not a real blocker, and the user has merge admin rights.

- **Both PROD workflows succeeded first-try.** `migrate-production.yml` (run 25581184726): 4/4 jobs (Check Migration Changes, Verify Recent Backup, Migration Dry Run, Apply to Production) all SUCCESS. `deploy-edge-functions.yml` (run 25581184711): SUCCESS. Neither flake fired this round (no SASL on apply, no esm.sh CDN 522 on edge functions). Both queued at 21:48:01 UTC; user approved both after status doc handoff.

- **Post-PROD verification on PROD (single batched 9-probe query via `mcp__supabase-remote__execute_sql`):** 9/9 substance PASS — see Current State for the full table. P8 returned literal `<7 cluster keys>` placeholder mismatch in my probe code (status `FAIL`) but the actual value matched the expected pattern of 7 cluster-key namespaces; cosmetic not substantive — the 9/9 framing is the right read.

- **3-signal edge function verification on the 3 functional-change slugs** via `mcp__supabase-remote__get_edge_function`: `smart-search` v24 / `search-lessons` v22 / `process-submission` v32 all confirmed deployed with the expected `.is('retired_at', null)` body change + the explanatory comments wired into Session 48's source edits. (`detect-duplicates` had F4 comment-only changes; the workflow redeployed it in the same matrix run, but no functional surface to verify.)

- **Title-discrepancy logged.** PROD lesson `1uwZRLYoxThlJxDq-vV3cePHmEMGMCpj5Opk0nHVvqqI` shows `'African American Food Traditions – Museum (45 min)'` (with " (45 min)" suffix); migration `20260520010000_recover_archive_only_concepts.sql:21` comment says without the suffix. Not a bug — the migration only touches `metadata.academicConcepts`, not `title` — but the comment was stale on the displayed title text. Logging for post-merge follow-up only; no action.

**Decisions made:**

- **`gh pr merge 478 --squash` despite UNSTABLE mergeStateStatus.** UNSTABLE = not-all-green CI; the failing check is the documented `Security Audit` baseline noise (per MEMORY.md hygiene-follow-ups + Codex Round 2 explicitly confirmed). User has admin rights; explicit "you can do the merge yourself" authorization. Default-allow merge. If a similar baseline-only UNSTABLE state recurs on a future PR with explicit user authorization, this is now precedent.

- **No SASL flake mitigation invoked.** Per memory, the migrate-production.yml SASL apply-step variant is recurring (Phase 2 PR #446 + Phase 8b PR #468 + PR 4 was the next candidate). Did NOT fire this run. Lucky-run; doesn't disprove the pattern. Stays in MEMORY.md hygiene-follow-ups as a recurring risk for future migrations.

- **No esm.sh CDN 522 flake mitigation invoked.** Per memory, `deploy-edge-functions.yml` per-job esm.sh transient flakes happen occasionally (PR 1 PROD `invitation-management` 2026-05-05 was the first confirmed). Did NOT fire this run. Same observation — stays in MEMORY.md.

**Process notes for Session 52+:**

- **PR-cycle archival is the first task.** Move Sessions 47-51 (PR 4 cycle) from active execution-status.md → archive file. Audit each entry for process learnings worth promoting to `feedback_*.md` files OR hygiene follow-ups worth promoting to MEMORY.md before moving.

- **Stage 1 worksheets DO NOT EXIST.** Verified Session 51 post-merge: no worksheet artifacts on disk anywhere. The decision journal's wrap-up note framed worksheets as "remaining work after foundation-phase implementation begins"; foundation-phase implementation has run since then but stayed on code work. **PR 5 is gated until heritage + concepts worksheets land.** Default to PR 3a (search infra — independent of Stage 1) as the unblocked code item; scaffold Stage 1 worksheet round as its own separate multi-session initiative when ready.

- **Cherry-pick this Session 51 docs commit (`c02e22c`)** from `feat/metadata-foundation-corpus-cleanup` to the new PR 3a branch as Session 47 did with `0672cc8` (Session 46 docs cherry-pick). The session-end docs commit on a merged-branch is the established pattern.

- **Process-learning candidates to consider promoting:**
  - **Active-doc-vs-live-PR reconciliation** (this session's pre-merge orientation correction). Adjacent to `feedback_pr_bot_review_workflow.md`'s "Active-PR session-orientation" rule but a slightly different surface — the rule is currently framed as "git log vs status doc" reconciliation; this session's pattern is "live PR state vs status doc snapshot" reconciliation. Single occurrence (this session); leave as candidate. Promote if it recurs.
  - **UNSTABLE-merge-state precedent for baseline-only failures.** Single occurrence (PR 4); the pattern is documented in active doc's Pre-existing CI noise section and in this session entry. If it recurs on PR 5+ or PR 3a, promote to feedback or MEMORY hygiene.
  - **Don't assert track-status without checking** (this session's worksheet-status discovery). My initial Session 51 wrap-up framed the next-session decision as "ask whether Stage 1 worksheets have advanced" — implying a parallel curriculum-team track was running with worksheets accumulating. User asked the direct question, I checked, no worksheets exist. The framing was sloppy: "verify before claiming" is implicit in `feedback_data_safety_top_priority.md` for prod state, but it applies equally to track-status assertions ("X is happening on a parallel track" → check first). Single occurrence; could promote as a `feedback_verification_before_track_status_claims.md` if it recurs, or fold into existing verification-before-completion patterns.

### Session 50 — 2026-05-08 — PR 4 round-2 IN clean + Codex R2-1 cosmetic cleanup + spot-check + ready to merge

**Done (1 cosmetic fix-up commit + this session-end docs commit, bundled per `feedback_no_docs_push_during_pr.md`):**

- **Session-orientation reconciliation**: status doc claimed "ready to push fix-up and await round 2" but `git log @{u}..HEAD` returned empty — Session 49 push had already happened (commits `bfb3786` + `786203b` were already on origin, head OID matched PR HEAD). Same `feedback_pr_bot_review_workflow.md` "Active-PR session-orientation" pattern that recurred 4× in PR 1b sessions 33-36 + once in Session 49. Reconciled all 4 PR comment surfaces against reality before any code work.

- **Round 2 triage** (3-surface convergence on ship — full collection per kickoff hard rule §6):
  - claude-review formal review (commit `786203b`, 20:32 UTC, 4 min after Session 49 docs commit): "0 P0/P1 findings. Ready to merge from a code-quality perspective." 2 P3 observations (process-submission error message merge, regenerate-embeddings retired-no-embedding diagnostic).
  - claude long-form review (commit `786203b`, 20:31 UTC): 1 "Minor" finding ("missing negative test for `excludeRetired=false`") which is a **false positive** — the test exists at `LessonSearchPicker.test.tsx:284`; same bot's own inline comment at L284 says "Clean approach"; Codex Round 2 confirmed. Plus 3 informational items (raw lessons query in LessonSearchPicker, view body duplication across migrations, dead `search-lessons` edge fn) all already deferred from Round 1.
  - Codex round-2 user-pass (commit `786203b`, 20:47 UTC): "No P1/P2 issues found on the new head." 1 P3 cosmetic: 2 stray `post-PR-4` comments in `useLessonStats.test.ts:22,175` — F3's grep targeted literal `PR 4` and missed the hyphenated form.

- **Round 2 dispositions (1/4 acceptance, default-reject calibration band)**:
  - **R2-1 ACCEPT (Codex P3)**: stripped `(post-PR-4)` from `useLessonStats.test.ts:22` ("Chain shape: from(...).select(...).is('retired_at', null)") and `:175` ("Rejection happens at the terminal `is()` call.") — preserved the WHY, dropped the task reference. Mirrors F3 (CLAUDE.md). Grep post-fix confirms 0 hits across `src/`. Migration file `20260520030000:130` also has `post-PR-4` in a verification comment but is NOT edited (pushed/applied migration; F2 disposition pattern; database-migrations skill rule).
  - **R2-2 REJECT (claude-review P3, process-submission error msg)**: Codex defers; debuggability nuance for direct-API callers, not user-visible.
  - **R2-3 REJECT (claude-review P3, regenerate-embeddings diagnostic)**: Codex defers; correct for normal operation; latent gap only if rows un-retire.
  - **R2-4 REJECT (claude long-form, false positive)**: negative test exists. Confirmed by inline comment + Codex Round 2.

- **TEST DB spot-check via `mcp__supabase-test__execute_sql`** (per Session 49's relaxed-rubric note for non-DB-affecting rounds): 21 retired ✓, 7 distinct reasons ✓, 751 live via view ✓, FSA new title ✓, view exposes 2 new columns ✓, 7/7 concepts populated with object shape ✓. Round 0 numbers unchanged.

- **Repeated Session 49's mistake of using hallucinated lesson_ids on the concept-recovery probe** — initial probe returned `concepts_populated = 1` because 6 of 7 IDs didn't match the migration target list. Re-ran with verbatim IDs from migration `20260520010000_*` header → 7/7 confirmed. Reinforces Session 49's "copy lesson_ids verbatim from migration source" lesson; this is a recurring pattern worth flagging for any future migration-outcome probe.

- **Pre-existing CI noise on `Security & Dependencies`** (`@lhci/cli` transitive vulns: basic-ftp / ip-address / postcss / tmp). Documented in MEMORY.md hygiene-follow-ups; recurs on every PR. Codex Round 2 explicitly confirmed as baseline.

- **Type-check + lint + vitest 14/14** on `useLessonStats.test.ts` post-edit. Local clean.

**Decisions made:**

- **Round-cap activated per kickoff hard rule §10**: Round 2 IN with bot-voice convergence on ship. R2-1 was a 2-line cosmetic that mirrored an already-accepted F3 disposition; R2-2/R2-3/R2-4 fall in default-reject. Foundation-phase ship pattern.
- **Bundle Session 50 cosmetic fix-up with this session-end docs commit per `feedback_no_docs_push_during_pr.md`** — saves a CI cycle on docs-only changes; bot review on the bundled push is the same "no DB changes" rubric as Session 49.
- **Migration file's `post-PR-4` reference NOT edited** — `20260520030000:130` is a pushed/applied migration. F2-pattern disposition: comment-only inaccuracy, document for future verification comments to use the literal-no-task-prefix form, but don't violate the database-migrations skill rule.

**Process notes for Session 51+:**

- **Push Session 50 fix-up + docs commit together** (this is the Session 50 push). CI re-runs on the new HEAD; expect green except the pre-existing Security Audit baseline.
- **Post Round-2 response on PR #478** — short writeup with the 4-finding disposition table, acceptance trajectory, round-cap rationale, and "ready to merge + approve PROD migration workflow" gate. Mirror Session 49's Round-1 response structure.
- **Pre-PROD MCP probe** before merge — same probe shape as Round 0 verification, run via `mcp__supabase-remote__execute_sql` confirming PROD pre-state: 0 retired (`SELECT count(*) FROM lessons WHERE retired_at IS NOT NULL`), 7 concept-recovery target rows currently NULL/missing, FSA still has the original "& 2" title. This is the Session 46+47+48 pattern.
- **PR merge → migrate-production.yml triggers**: user merges (squash-merge per Recent decisions) → workflow queues for manual approval → user approves → applies migrations → automatic verify-step (cosmetic SASL flake possible per memory; PROD MCP verification is the source of truth).
- **Apply-step SASL flake mitigation** (MEMORY.md): if Apply step itself flakes (NOT cosmetic — migration didn't apply), `gh run rerun --failed <run_id>` re-runs only Apply, approval gate re-fires for re-approval. Migrations idempotent → retry safe. Verify post-rerun via PROD MCP that the actual schema state changed.
- **Post-PROD MCP verify** mandatory per kickoff hard rule — full Round-0 probe set re-run on `mcp__supabase-remote__execute_sql`.
- **PR-cycle archival deferred to Session 51 first task** per kickoff session-end ritual step 5: when starting next PR's first session, move Sessions 47-50 from active file → archive.



**Done (1 substantive commit `bfb3786` + this session-end docs commit):**

- **Session-orientation check** flagged status doc was stale on push state — branch was actually pushed and PR #478 OPEN with round 1 already in. Pattern matches `feedback_pr_bot_review_workflow.md` "Active-PR session-orientation" rule (recurred 4× across PR 1b sessions 33-36). Reconciled active doc to reality before any code work.

- **Round 0 TEST DB verification probes** via `mcp__supabase-test__execute_sql` (single batched 13-probe query). All probes returned correct values: 21 retired ✓, 7 distinct retired_reason groups ✓, FSA new title ✓, view exposes 2 new columns ✓, 7/7 concepts recovered with `object` shape ✓, 0 array-shape archive concepts anywhere (F7 verification gate passed) ✓, search_lessons total_count 751 = 772−21 ✓, view live count 751 ✓. PROD pre-state diagnostic confirmed all 7 concept-recovery targets currently NULL with `object`-shape archives ready to populate on PROD-apply.

- **My initial P6 probe used hallucinated lesson_ids** (only 1 of 7 IDs matched the actual migration target list). Re-ran with correct IDs from migration `20260520010000_*` header → all 7 confirmed populated. Lesson for future migration-outcome probes: copy lesson_ids verbatim from migration source rather than typing from memory.

- **Round 1 bot review triage** (3 reviewer surfaces — claude-review formal + claude long-form + Codex via user-pass). 7 findings consolidated; rebuttal pass per `feedback_bot_review_investigation.md`:
  - **F1 ACCEPT** (Codex P2): `database.types.ts` missing `retired_at`/`retired_reason` on `Tables.lessons.{Row,Insert,Update}` + `Views.lessons_with_metadata.{Row,Insert,Update}`. Hand-patched 6 type blocks (12 field additions). Hand-patch path correct per status doc out-of-scope note that the file is hand-patched since PR 1.
  - **F2 REJECT (document)** (Codex P3): migration verification-comment syntax inaccuracy. Editing pushed/applied migration violates database-migrations skill rule; comment-only fix is semantically safe but doesn't justify breaking the rule. Documented in out-of-scope follow-ups for future migrations.
  - **F3 ACCEPT** (claude-review P2 + claude long-form Low): 13 `PR 4` references stripped from 9 files (`LessonSearchPicker.tsx`, `LessonSearchPicker.test.tsx`, `useLessonStats.ts`, `useLessonStats.test.ts`, `ReviewDetail.tsx`, `search-lessons/index.ts`, `smart-search/index.ts`, `process-submission/index.ts`, `generate-embeddings.mjs` ×2, `regenerate-all-embeddings.mjs` ×3). Per CLAUDE.md project root: "Don't reference the current task". Kept the explanatory WHY content; stripped only the task-prefix. Migration internal comments left alone (per database-migrations skill rule + the date-stamped artifact framing).
  - **F4 ACCEPT (light)** (claude-review P1, Codex P3): 4 sites in `detect-duplicates/index.ts` got 1-line intent comments explaining why they intentionally read the full corpus (no retired filter): hash check (L221), semantic embedding (L252), metadata enrichment (L268), fallback title search (L297). Symmetric with `ReviewDetail.tsx:1319`'s existing hardening comment.
  - **F5 REJECT** (claude long-form Low): partial index hypothetical at corpus 788. Documented with revisit trigger.
  - **F6 REJECT** (claude long-form Low): dead `search-lessons` edge fn. Already in surface inventory + tracked. Documented with the deferred-approval ordering hazard caveat.
  - **F7 REJECT (verified clean)** (claude-review P3): TEST DB probe `P8_archive_array_shape_skipped = 0` — no array-shape archive concepts exist anywhere. PROD diagnostic confirms all 7 concept-recovery targets have object-shape archives. Codex framed as "verification gate"; gate just passed.

- **Consolidated fix-up commit `bfb3786`** applies F1+F3+F4 in one commit. 12 files changed, +35/-17 net. Local verification clean: type-check + lint + 577/577 vitest (matches PR 4 baseline; F3 strips don't affect test count, F4 added intent-only comments).

- **Source `PR 4` reference grep post-fix-up** returns zero hits across `src/`, `supabase/`, `scripts/` — F3 is complete (migration internal comments retained intentionally).

**Decisions made:**

- **Round 1 acceptance trajectory: 3/7.** Squarely in `feedback_pr_bot_review_workflow.md` default-reject calibration band — accepted F1 (real type-correctness gap), F3 (CLAUDE.md compliance), F4 (light hardening symmetric with existing pattern). Rejected F2/F5/F6 with documentation; F7 was verifiably moot.

- **Pushed-migration comment correction (F2): document, don't fix.** The cited inaccuracy is in a SQL comment in an already-applied migration. Editing pushed migrations violates database-migrations skill rule even though the proposed fix is semantically safe. Codex itself rates P3. Document for future migrations to use the correct verification syntax.

- **Light-touch F4 over heavyweight refactor.** Bot's recommendation could have been spun into "refactor `detect-duplicates` to make the filter-or-not choice an explicit parameter" but a 1-line intent comment per query site is cheap insurance and matches the existing ReviewDetail hardening pattern. Refactor is out of scope for foundation-phase PR 4.

- **No DB-affecting commits this round** — fix-up touches only TS source / test / scripts / edge fn body comments + intent comments. Per-round TEST DB re-verification is therefore a quick spot-check rather than full reprobe (round 0 probes remain load-bearing). One concrete data point for `feedback_per_round_test_db_verification.md`: rounds with zero DB-affecting changes get a relaxed verification rubric.

**Process notes for Session 50+:**

- **Push fix-up `bfb3786` + this session-end docs commit together** per `feedback_no_docs_push_during_pr.md`. CI re-runs on the new HEAD; bots emit round 2 reviews after that.

- **Round 2 bot review expected.** Bots may push back on the rejects (F2/F5/F6). Default-reject re-applies; document if they re-flag. F7 is verifiably moot — TEST DB probes prove zero array-shape archives.

- **Round-cap after round 2** per kickoff hard rule. If a 3rd round comes in, fix only critical bugs, document the rest, ship.

- **Pre-PROD-apply MCP probe pattern** (Session 46 + 47 + 48 precedent) — same probes via `mcp__supabase-remote__execute_sql` AS A READ before approving PROD migration workflow. Belt-and-braces: TEST↔PROD diff via same query body to spot-check both surfaces.

- **Watch the migrate-production.yml SASL flake on apply step.** PR 4 has 4 migrations applying together. If the apply step flakes, `gh run rerun --failed <run_id>` re-runs only the failed slot; approval gate re-fires for re-approval. Migrations are idempotent so retry is safe.

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
