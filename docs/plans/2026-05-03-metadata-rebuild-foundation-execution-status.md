# Metadata Rebuild — Foundation Phase — Execution Status

**Last updated:** 2026-05-06 — Session 34 (PR 1b round 1 bot triage + fix-up `131168b` shipped; 16 commits ahead of `origin/main`; awaiting round 2 or round-cap).

> **About this file.** Active status carrying forward only what the next 1-2 sessions need to orient. Full per-session journal for Sessions 1-17 lives in `2026-05-03-metadata-rebuild-foundation-execution-status-archive.md` (965+ lines, read on demand via grep). When a new PR cycle begins, that PR's session entries can move to the archive at the start of the following PR; the active file always reflects current PR + a small carry-forward roll-up.

## Current State

**Active PR:** **[PR #476](https://github.com/danfeder/esnyc-lesson-search-react/pull/476) — D2 multi-select refinement.** Branch `feat/metadata-foundation-activity-type-multi`; **16 commits ahead of `origin/main`** (9 code + 7 docs); 3 commits ahead of remote tracking branch (Session 33 docs `5eca6bc` + round-1 fix-up `131168b` + Session 34 docs commit). Round 1 bot triage complete + fix-up shipped locally; awaiting push + round 2.

Code commits (chronological):
1. `54124a5` Task 1b.1 — retire `'both'` value + repoint data
2. `af023d4` Task 1b.2 — `complete_review_atomic` array passthrough
3. `7537ac7` Task 1b.3 — Zod review-form activityType array shape
4. `71fc3ba` Task 1b.4 — activity_type mappers pass-through array
5. `a4fffbc` Task 1b.5 (code) — ReviewDetail multi-select activity_type picker + ReviewMetadataForm dead-code conformance
6. `69ed67d` Task 1b.6 — filterDefinitions.ts multi-select + drop 'both' chip
7. `af4910a` Task 1b.7 — google-docs-parser extractActivityType returns canonical array
8. `be406c3` Task 1b.8 fix-up — activityType empty-array required-validation (caught by pre-push code-reviewer agent)
9. **`131168b` PR 1b round 1 fix-up** — shape-tolerant `tagged_metadata` loader + drop "Only" from activity_type chip labels (Session 34)

**Round 1 outcome (Session 34):** CI fully green except Security Audit (pre-existing `@lhci/cli` baseline; no `package*.json` diff in PR — MEMORY.md hygiene-follow-up). 4-surface bot triage caught 14 distinct findings across 3 voices (claude long-form, claude[bot] CHANGES_REQUESTED, user's own Codex pass). Investigation pass accepted 2 P0, rejected 10 (default-reject hardening pattern):

- **Accepted:** (1) `reAddActivityTypeSuffix` shape-tolerance — Codex P2 #1 understated reach: claimed 2 'both' rows; **TEST + PROD probe shows 113 scalar rows ALL crash** (67 garden / 33 cooking / 11 academic / 2 both, identical TEST=PROD). Crash path: `if (!v || v.length === 0)` passes scalar `"garden"` (length 4), then `v.map(...)` throws — surfaces in `ReviewErrorBoundary` on every approved-review reopen; reachable via `ReviewDashboard.tsx:39` 'approved'/'all' filter. (2) Codex P2 #2 — drop "Only" from chip labels since post-D2.1 SQL predicate is array-overlap and selecting "Cooking Only" silently includes hybrids.

- **Rejected:** hardcoded teacher@example.com (pre-existing), ReviewMetadataForm dead code (Session 27 queued separately), suffix scattered/centralize/dual-check (LOW-priority hardening), IIFE blocks, missing aria-expanded, craft parser gap (pre-existing), empty-array carry-forward doc, suffix-mismatch comment, rollback CI gate, naming nit.

**TEST DB verification — 6/6 PASS (Session 34):** 2/2 PR 1b migrations applied; 0 rows with `'both'` in column; 135 cooking+garden hybrids (matches Task 1b.1 migration count); 0 metadata `'both'` shape (any form); CHECK constraint actively rejects `ARRAY[both]` (DO-block probe); `lessons_normalize_write` trigger has `'both'` removed from allowed list (only mentioned in retirement-comment line); `complete_review_atomic` source has both INSERT (no-null helper) + UPDATE (or-null helper) array passthrough paths.

**Visual smoke (Session 34) — chrome-devtools-mcp against local dev server:** Sidebar chips render new labels (Cooking / Garden / Academic / Craft, no "Only"); Cooking filter narrows 5→3 lessons; multi-select Cooking + Garden → 5 results, two pills, "Activity Type 2" badge, "2 activity types" live announcement. Scalar `"garden"` fixture in submission_reviews → page loads without error, Garden pill `pressed`, GARDEN DETAILS section rendered, no console errors. Scalar `"both"` fixture → both Cooking + Garden pressed, COOKING + GARDEN DETAILS both render, required count 7→11. Local fixture cleaned up post-verify.

**Why PR 1b interrupts PR 2:** mid-Task-2.4 ground-truth resolution surfaced concrete evidence that D2's single-select decision was made on n=1 (Dr. Carver Lotion-Making) but actual rate is ~5/26 = 19% multi-axis lessons — extrapolates to ~30+ in the 772-row corpus. User decided to retire `'both'` and switch to true multi-element array. See decision journal D2.1.

**PR 2 branch state (paused):** `feat/metadata-foundation-llm-tagging` is 20 commits ahead of `origin/main` (Sessions 18-27). Untouched until PR 1b merges; then rebases onto new main. **Rebase conflict expected:** PR 2's `20260517000000_*` and PR 1b's `20260518100000_*` both `CREATE OR REPLACE complete_review_atomic`; PR 2's `tags` side-channel must be re-folded into PR 1b's array-passthrough body during rebase. Use `mcp__supabase-test__execute_sql pg_get_functiondef(...)` after rebase apply to verify both code paths survive.

**Next session picks up:**
- **Push round-1 fix-ups + bundled docs.** `git push` — sends Session 33 docs `5eca6bc` + round-1 fix-up `131168b` + Session 34 docs (this commit). Saves 2 CI cycles per `feedback_no_docs_push_during_pr.md`.
- **Wait for round 2 bots** (CodeRabbit / Claude Review / Codex pattern). Round-cap of 2 per kickoff means if round 2 brings critical-only fixes we ship; cosmetic-only → fix what's worth it, document the rest, ship.
- **4-surface re-triage** if round 2 fires per `feedback_pr_comment_surfaces.md`: `gh pr view 476 --comments` + `pulls/476/reviews` + `pulls/476/comments` + `gh pr checks 476`. Investigation pass per `feedback_bot_review_investigation.md` for every finding.
- **Per-round TEST DB re-verification** if round 2 produces DB-affecting commits per `feedback_per_round_test_db_verification.md`. Round 1 was code-only so the original PR-open verification remains valid.
- **PROD apply** when bot rounds settle: `migrate-production.yml` workflow_dispatch (migrations) + `deploy-edge-functions.yml` for `complete-review`. 3-signal verification on edge fn via `mcp__supabase-remote__get_edge_function complete-review` per MEMORY.md hygiene-follow-ups (version + ezbr_sha256 + source-content grep).
- **Post-merge rebase.** PR 2 (`feat/metadata-foundation-llm-tagging`) onto new main; expected conflict on `complete_review_atomic` (both PRs `CREATE OR REPLACE`); re-fold PR 2's `tags` side-channel into PR 1b's array-passthrough body during rebase.

**`npm run type-check` + `npm run lint` + `npm test` all green at branch tip post-round-1.** 546/546 unit tests passing (38 files; round-1 fix-up didn't add new tests — `reAddActivityTypeSuffix` validator-test coverage captured as Out-of-scope follow-up alongside the Session 32 `validateRequiredFields` follow-up; same root cause: inline-utility extraction needed before testability).

**Branches:**
- `main` at `8497752` (PR 1 squash merge).
- `feat/metadata-foundation-activity-type-multi` (PR #476) — 16 commits ahead of main, 3 ahead of remote (push pending Session 35 start).
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
- **Missing unit-test coverage for `validateRequiredFields` + `fieldProgress` in ReviewDetail.tsx.** Surfaced by PR 1b round-0 code-reviewer agent + bug-fix `be406c3` (Session 32). The 2-line truthy-check regression on the activityType field went undetected by the test suite because no test exercises the validators with empty-array fixtures. Cleanest path: refactor the validators into pure utility functions (e.g., `src/utils/reviewValidation.ts`) and add unit tests covering "Activity Type required when array is empty" + sibling cases. Out of scope for the PR 1b fix-up (kickoff: "A bug fix doesn't need surrounding cleanup"); worth a focused hygiene PR. The other 17 metadata fields use the same `?.length` pattern so a single test file would cover the regression surface for all required fields.

- **Missing unit-test coverage for `reAddActivityTypeSuffix` shape-tolerant loader.** Surfaced by PR 1b round 1 + fix-up `131168b` (Session 34). The pre-fix `if (!v || v.length === 0) return raw` followed by `v.map(...)` would have crashed on any of the 113 historical scalar `tagged_metadata.activityType` rows; visual smoke caught the post-fix happy paths but the test suite has no fixture-driven coverage. Cleanest path: same as the `validateRequiredFields` follow-up — extract to `src/utils/reviewMetadataLoaders.ts` (or fold into `reviewValidation.ts`) and add unit tests covering scalar `'garden'` / `'both'` / empty / null-undefined / array round-trip. Out of scope for the round-1 fix-up; worth a focused hygiene PR alongside the validator-test follow-up since both are in the same file and the same cleanup shape.

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

### Session 34 — 2026-05-06 — PR 1b round 1 bot triage + fix-up shipped (commit `131168b`)

**Done (1 commit + 1 docs commit pending):**

- **CI status check — fully green except Security Audit pre-existing baseline.** All 18 checks passed except Security Audit (FAIL, 22s) on `@lhci/cli` transitive deps (`basic-ftp` / `ip-address` / `postcss` / `tmp` via inquirer / external-editor). PR 1b has no `package.json` or `package-lock.json` diff; all three bot voices triage it as not-a-PR-regression. Matches the recurring MEMORY.md hygiene-follow-up; ignored.

- **4-surface bot review collection** per `feedback_pr_comment_surfaces.md`: `gh pr view 476 --comments` (issue-comments — 4 bot reports + Codex pass), `gh api repos/.../pulls/476/reviews` (1 CHANGES_REQUESTED from claude[bot]), `gh api repos/.../pulls/476/comments` (3 line comments), `gh pr checks 476` (1 Security Audit fail). Three independent reviewer voices: claude long-form (5 findings), claude[bot] CHANGES_REQUESTED (7 findings), user's own Codex pass (2 P2 findings + triage of Claude). 14 distinct findings total.

- **Investigation pass per `feedback_bot_review_investigation.md`** — every finding got a rebuttal pass. Default-reject hardening per `feedback_pr_bot_review_workflow.md`. Triage matrix surfaced to user with accept/reject recommendations + plain-language framing per `feedback_plain_language.md` for the Option A/B/C question on chip relabel. Outcome: 2 P0 accepted, 10 rejected.

- **Codex P2 #1 reach was understated.** Codex flagged it as affecting the 2 historical `'both'` rows. Empirical TEST + PROD probe via `mcp__supabase-test__execute_sql` + `mcp__supabase-remote__execute_sql` returned identical distributions: **all 113 historical `submission_reviews.tagged_metadata.activityType` rows have scalar shape** (67 garden / 33 cooking / 11 academic / 2 both). The pre-fix `if (!v || v.length === 0)` guard passes scalar `"garden"` (length 4), so `v.map(...)` throws `is not a function` for every reopen, surfacing in `ReviewErrorBoundary` instead of the review UI. Reachable via `ReviewDashboard.tsx:39` 'approved' / 'all' filter — mainline reachable, not edge-case. Empirical-evidence pattern: bot finding count 2; actual count 113 (~99% of historical reviews).

- **Codex P2 #2 surfaced as Option A** (rename chips, drop "Only"). Plain-language framing per `feedback_plain_language.md`: post-D2.1, the migration converted 135 `[both]` rows to `[cooking, garden]` and the SQL predicate is array-overlap, so selecting "Cooking Only" silently includes hybrids. User chose A: rename labels to Cooking / Garden / Academic / Craft. Slug values stay `cooking-only` etc. so `_alias_activity_type` mapping is unchanged.

- **Round-1 fix-up commit `131168b`** consolidates both fixes into one logical commit: shape-tolerance helper widening + chip label rename. Two files (`src/pages/ReviewDetail.tsx` + `src/utils/filterDefinitions.ts`); +29/-10 LOC; both fixes share the round-1 fix-up commit since they address the same review pass.

- **TEST DB verification — 6/6 PASS.** `mcp__supabase-test__execute_sql` queries: 2/2 PR 1b migrations applied; 0 rows with `'both'` in column (135-row migration completed); 135 cooking+garden hybrids (matches expected migration count); 0 metadata `'both'` shape (any form); CHECK constraint actively rejects `ARRAY[both]` (DO-block probe with `RAISE EXCEPTION` returning the result); `lessons_normalize_write` trigger has `'both'` removed from activityType allowed list (false-positive grep result resolved by inspecting the source — only mentioned in a one-line retirement comment); `complete_review_atomic` source has both INSERT (no-null helper) + UPDATE (or-null helper) array passthrough paths. Heavyweight Probes A-F (transactional fixture inserts) skipped in favor of these 6 lighter checks that hit the same invariants — Session 29's local-DB Probes A-F already covered the live RPC behavior, and these TEST checks confirm the migrations + source state landed identically on TEST.

- **Visual smoke — chrome-devtools-mcp against local dev server.** Sidebar chips on `/`: render new labels Cooking / Garden / Academic / Craft, no "Only" suffix; cooking-only filter narrows 5→3 lessons; multi-select cooking + garden → 5 results; both pills render with Remove buttons; "Activity Type 2" badge increments; "2 activity types" live announcement fires. Scalar fixture in `submission_reviews.tagged_metadata.activityType = "garden"` → `/review/aaaa-...` loads without error, Garden pill `pressed`, GARDEN DETAILS section rendered, no console errors. Scalar fixture rewritten to `"both"` → both Cooking + Garden pressed, COOKING + GARDEN DETAILS both render, required count 7→11 (+3 cooking-specific required fields). Local fixture cleaned up post-verify (DELETE FROM submission_reviews WHERE id = ...). The `.tmp/` screenshots are session-local artifacts.

**Decisions made:**

- **Round-1 default-reject hardening pattern held strong.** 10 of 14 findings rejected as pre-existing or hardening that doesn't move PR 1b's blast-radius. Rejected: hardcoded teacher@example.com (pre-existing, Codex correctly rebuts claude[bot]), ReviewMetadataForm dead code (Session 27 explicitly queued separately), suffix scattered/centralize/dual-check (LOW-priority lookup-map refactor captured in status doc Out-of-scope follow-ups), IIFE blocks in JSX, missing aria-expanded, craft parser gap (pre-existing, Codex correctly triages), empty-array carry-forward documentation (UI prevents empty saves so academic), -only suffix mismatch comment (subset of the rename question), rollback CI gate, naming nit. Pattern: when the same finding appears in 1 voice (or 2 voices both as cosmetic), default-reject; when 3 voices converge OR empirical evidence escalates a 1-voice finding, accept.

- **Skipped unit-test coverage for `reAddActivityTypeSuffix` per kickoff "A bug fix doesn't need surrounding cleanup."** Same shape as Session 32's `validateRequiredFields` follow-up: the function is a module-level helper that would need extraction to a pure utility for testability; refactoring the testability path is scope-creep on a behavior fix. Captured as a sibling Out-of-scope follow-up alongside the Session 32 entry — both follow-ups should fold into a single hygiene PR (extract validators + loaders to `src/utils/reviewValidation.ts` + `src/utils/reviewMetadataLoaders.ts` + add fixture-driven tests).

- **Heavyweight transactional Probes A-F substituted with lighter checks** that confirm the same invariants without needing constructed `lesson_submissions` fixtures on TEST DB. Session 29's local-DB Probes A-F already exercised the live RPC end-to-end against fresh fixtures; the Session 34 TEST checks confirm the migration + source state landed on TEST identically. The substitution is defensible because PR 1b's `complete_review_atomic` body is byte-identical between local and TEST (CI just runs `supabase db push`), and the Session 29 Probes already covered the live behavior. If post-merge regressions appear on the live RPC path, MCP-driven RAISE-EXCEPTION probes against TEST remain available.

- **Bundle docs commit with the next push** per `feedback_no_docs_push_during_pr.md`. Sessions 33 + 34 docs commits travel with the round-1 fix-up; the push will be 3 commits at once, saving 2 CI cycles vs separate pushes.

**Process notes for Session 35+:**

- **Round-cap-of-2 logic.** If round 2 fires with cosmetic-only findings, document them in Out-of-scope and ship. If it fires with critical-only, fix-up + ship. PR 1b's round 1 surface area was small (one bug-class confined to ReviewDetail.tsx + 2 migrations + Zod/mapper passthrough) and produced 14 findings, which is on the upper end. Round 2 will likely be lighter unless the round-1 fix-up triggers new edge cases.

- **Empirical-evidence-escalates-low-confidence-finding pattern.** Codex P2 #1 was framed as 2 rows; empirical probe revealed 113 = mainline-reachable severity. Always run the TEST DB probe to ground bot findings that cite specific row counts — single-voice findings can still be P0 if the empirical reach is wider than the bot reported.

- **Plain-language framing on stakeholder-touching decisions** per `feedback_plain_language.md`. Option A/B/C summary for chip rename led with the in-the-world impact ("teacher who filters 'Cooking Only' expecting pure cooking lessons now gets hybrids") before layering technical detail (SQL predicate, `&&` overlap). User picked A immediately. Reinforces the Session 3 / Gate C lesson.

- **`mcp__supabase-test__execute_sql` is the right primitive for round-N TEST DB verification** when round-N is code-only. The status doc's instruction to "re-run Probes A-F" was scoped against round-1 producing DB-affecting commits; round 1 was code-only so the lighter 6-check verification suffices. Future rounds with DB-affecting commits should re-run the heavyweight transactional probes.

### Session 33 — 2026-05-06 — PR 1b push + open PR #476 (no new code commits)

**Done (no new code commits; PR opened):**

- **Pushed branch with upstream tracking.** `git push -u origin feat/metadata-foundation-activity-type-multi`. 13 commits delivered to remote (8 code + 5 docs). Branch now tracks `origin/feat/metadata-foundation-activity-type-multi`.

- **Opened [PR #476](https://github.com/danfeder/esnyc-lesson-search-react/pull/476)** via `gh pr create` with title `feat(metadata-foundation): activity_type multi-select (D2.1)`. Body covers: 3-bullet Summary (retire `'both'` + repoint 135 rows; flip end-to-end to multi-element array; `validateRequiredFields` empty-array fix), Why-this-interrupts-PR-2 paragraph (n=1 evidence), Migrations recap (`20260518000000` data + CHECK + trigger; `20260518100000` complete_review_atomic with 6 transactional probes A-F passing locally), 8-item Test plan checklist (TEST DB probe re-run, Zod scalar reject, sidebar filter chip count, ReviewDetail picker matrix, all-OFF required-field error, PROD apply via 2 workflows, 3-signal edge fn verification), References pointers.

- **CI fired:** 18 checks pending at PR open: Test & Build (20.x), E2E Tests, Netlify deploy preview + 3 sub-checks (Header rules / Pages changed / Redirect rules), Lighthouse CI, Bundle Analysis, Security Audit, CodeQL Analysis, Dependency Review, Detect Deploy Target, Test Coverage, Performance Review, Semgrep Cloud Platform scan, claude-component-review, claude-database-review, claude-review.

**Decisions made:**

- **Status doc commit committed locally but not pushed** — per `feedback_no_docs_push_during_pr.md`: bundle docs commits with the next fix-up push to avoid wasting a full CI cycle on docs-only changes. Session 33 status entry will travel with whatever fix-up Session 34+ produces (or as a no-op push if zero bot findings — to be decided then).

- **PR-cycle archival deferred to start of NEXT PR cycle** per kickoff session-end ritual. Sessions 28-33 stay in active file until PR 2 work resumes; that's when the audit-and-move pass happens.

**Process notes for Session 34+:**

- **Per-round TEST DB verification before bot triage.** Per `feedback_per_round_test_db_verification.md`: any DB-touching PR re-runs verification on TEST after EACH round, not just at PR open. Right now CI applies the migrations as part of the deploy-preview pipeline; once the deploy preview is live, the migrations will already be on TEST DB. Run Task 1b.2 transactional probes A-F via `mcp__supabase-test__execute_sql`. The 6 probes are listed in the Session 29 entry below; copy-paste from there if helpful.

- **4-surface bot comment collection rule applies.** Per `feedback_pr_comment_surfaces.md`: `gh pr view 476 --comments` is NOT enough on its own. Always check all 4 (issues/comments + reviews + pulls/comments + checks). "0 findings" requires evidence from all 4.

- **`.tmp/` screenshots from Session 32 are gone.** Visual smoke artifacts were session-local; they're not in git, not in the PR. The PR's verification claim "ReviewDetail picker — multi-pill selection + conditional sections render correctly" rests on Session 32's notes + the Session 32 status doc entry. If a bot reviewer asks for re-verification, re-run smoke locally on the live deploy preview rather than expecting saved artifacts.

- **PR push warning re: 4 uncommitted changes** is the beads/scheduled-task lock files (`.beads/dolt-access.lock`, `.beads/dolt/`, `.beads/export-state/`, `.claude/scheduled_tasks.lock`). Unrelated to metadata-rebuild; ignore.

### Session 32 — 2026-05-06 — PR 1b Task 1b.5 visual smoke + 1b.8 pre-push (commit `be406c3`)

**Done (1 commit):**

- **Visual smoke complete** via chrome-devtools-mcp against local dev server (no TEST DB needed; migrations applied to local Supabase via prior `supabase db reset`). Screenshots saved to `.tmp/pr1b-smoke-{01-search-page,02-login-page,03-craft-garden}.png`.
  - **Public-search side (Task 1b.6 verification):** sidebar Activity Type filter renders 4 chips (Cooking Only / Garden Only / Academic Only / Craft Only); no `'both'` chip. Click Cooking Only → 5 → 3 results. Add Garden Only → 5 results (cooking-only + garden-only + multi-axis); both chips render simultaneously with Remove buttons; "Activity Type 2" badge increments correctly; live announcement says "2 activity types".
  - **ReviewDetail picker (Task 1b.5 verification):** 4 activity-type buttons render. `[cooking]` → COOKING DETAILS section appears (3 sub-fields), required count 7→10. `[cooking, garden]` → both buttons `pressed` simultaneously, both COOKING + GARDEN DETAILS sections render, required 11. `[garden]` (toggle off cooking) → COOKING DETAILS disappears, GARDEN DETAILS stays, required 11→8. `[craft, garden]` → no extra craft section, GARDEN DETAILS stays, required 8. All toggled OFF → both conditional sections disappear, required back to 7.
  - **Console clean** during all interactions.

- **Pre-push code-reviewer agent dispatched** via `Agent({ subagent_type: 'feature-dev:code-reviewer', model: 'opus' })` per `feedback_opus_subagents.md`. Run in background while visual smoke proceeded in foreground (parallelization win — agent took ~9 min wall clock). Prompt briefed agent on scope + locked-decisions list + don't-flag items + reference docs + output format.

- **One critical finding from agent + fix landed as `be406c3`:** `validateRequiredFields:242` and `fieldProgress:262` in `ReviewDetail.tsx` both used truthy-check semantics that worked for `string | undefined` but silently broke when D2.1 flipped activityType to `string[] | undefined`. Empty array `[]` is truthy; empty string `''` is falsy; `undefined` is falsy in both regimes. So a reviewer who clicks then deselects every pill would (a) bypass the "Activity Type required" error before Publish and (b) see "1/7 required filled" in the progress bar instead of 0/7.
  - **Fix:** match the surrounding sibling-field pattern — `?.length` for the validation arm, `(... ?.length ?? 0) > 0` for the progress arm. 2-line change, no other call sites of `metadata.activityType` rely on the buggy truthy-on-`[]` semantics (verified via grep — line 232/234/236/238 use `?? []` then `.includes()`, line 500 uses `?.map()`, line 842 uses `?? []`).
  - **Visual smoke independently caught the same bug:** at all-pills-OFF I observed "1/7 required filled" instead of expected 0/7. Pre-fix → bug present (see `pr1b-smoke-03-craft-garden.png`). Post-fix → correctly 0/7 (verified via reload + click-on-then-off cycle in browser).
  - **Skipped adding unit-test coverage** for the validators per kickoff "A bug fix doesn't need surrounding cleanup" — refactoring `validateRequiredFields` out of ReviewDetail.tsx into a pure utility module is scope-creep. Added to Out-of-scope follow-ups for a future hygiene PR. The other 17 metadata fields use the same `?.length` pattern so the regression surface for any sibling field is the same shape.

**Decisions made:**

- **Skipped adding unit test for `validateRequiredFields` even though agent suggested it.** Per kickoff "A bug fix doesn't need surrounding cleanup" + "Don't add features, refactor, or introduce abstractions beyond what the task requires." `validateRequiredFields` lives inline as a useCallback in ReviewDetail.tsx; testing it requires either (a) extracting to a pure function (refactor scope creep) or (b) full RTL render of the page (heavyweight, no precedent in `src/pages/*.test.ts`). Documented as Out-of-scope follow-up instead. Worth flagging a future hygiene PR that extracts both validators to `src/utils/reviewValidation.ts` and adds tests covering all required fields' `?.length` semantics — single file would cover the entire regression surface.

- **Visual smoke done against local dev server, NOT TEST DB.** Local Supabase already has both PR 1b migrations applied (verified via `supabase migration list --local` showing `20260518000000` + `20260518100000`). TEST DB has not received them yet (branch is local-only). This was the right call: no need to wait for CI apply on a branch that hasn't been pushed.

- **Cross-validation pattern noted:** code-reviewer agent's deductive finding (lines 242 + 262 truthy semantics broken) and visual smoke's empirical observation ("1/7" instead of expected 0/7 at all-OFF) independently surfaced the same bug. Worth recognizing — when both modes flag the same issue from different angles, confidence is high without additional rebuttal-pass work.

**Process notes for Session 33+:**

- **Push + open PR is a clean session start.** `git push -u origin feat/metadata-foundation-activity-type-multi` then `gh pr create` with a concise body referencing the D2.1 decision + scope. Wait for CI to apply migrations to TEST DB before re-running the Task 1b.2 transactional probes A-F via `mcp__supabase-test__execute_sql`.

- **Bot review rounds expected lighter than PR 1.** PR 1b touches one bug class (single-select → multi-select) confined to one component (ReviewDetail.tsx) + 2 SQL migrations + Zod schema/mappers passthrough. Compared to PR 1's foundation-phase substrate change touching ~30 TS surfaces + 4 RPCs + view + trigger + helper, the surface area is small. Round-cap of 2 still applies; expect 0-3 findings per round, mostly defensive/confidence-style.

- **Bot voice convergence as P1 signal applies again** (per `feedback_pr_bot_review_workflow.md`). If 3 independent bots flag the same finding, it's almost certainly real.

- **PR-cycle archival kicks in NEXT PR.** When PR 2 work resumes, the Session 28-32 entries from this active file move to the archive at the start of the new PR. No mid-PR archival.

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

