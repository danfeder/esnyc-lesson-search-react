# Metadata Rebuild — Foundation Phase — Execution Status

**Last updated:** 2026-05-08 — Session 38 (PR 2 rebased onto PR 1b ship `bd9d6e4` via cherry-pick approach; migration `20260517000000_*` renamed → `20260519000000_*` with body re-folded for both tags side-channel + activity_type array passthrough; Sessions 36+37 docs bundled into PR 2; local DB + 6/6 RPC body signals verified clean).

> **About this file.** Active status carrying forward only what the next 1-2 sessions need to orient. Full per-session journal for Sessions 1-36 lives in `2026-05-03-metadata-rebuild-foundation-execution-status-archive.md` (~1600 lines, read on demand via grep). When a new PR cycle begins, that PR's session entries can move to the archive at the start of the following PR; the active file always reflects current PR + a small carry-forward roll-up.

## Current State

**PR 2 (lesson-submission LLM auto-tag — vocab-locked prompts) — REBASED + IN PROGRESS.** Branch `feat/metadata-foundation-llm-tagging` rebased onto `bd9d6e4` (main with PR 1b shipped) via cherry-pick approach Session 38. 10 commits ahead of main: 7 code (Tasks 2.1-2.3 done) + 2 docs cherry-picked from `docs/session-36-pr1b-shipped` (Sessions 36+37) + this session's docs commit. PR 2 not yet pushed; no PR open.

**Rebase resolved the `complete_review_atomic` `CREATE OR REPLACE` collision** between PR 2's `20260517000000_complete_review_atomic_tags_side_channel.sql` (tags side-channel) and main's `20260518100000_complete_review_atomic_activity_type_multi.sql` (activity_type array passthrough, PR 1b). Renamed PR 2's migration to `20260519000000_*` so it sorts last + re-folded the body to carry both features (declare `v_ai_draft jsonb` + pluck from `v_submission.ai_draft_metadata` + array passthrough for activity_type in INSERT and UPDATE + `tags` write in INSERT + `tags` carry-forward in UPDATE).

**Local verification — 6/6 RPC body signals via `mcp__supabase__execute_sql pg_get_functiondef('complete_review_atomic'::regproc)`:**
- `declares_v_ai_draft`: YES
- `plucks_ai_draft`: YES (`v_ai_draft := v_submission.ai_draft_metadata`)
- `insert_activity_type_array_passthrough`: YES (`_phase4_jsonb_text_array(v_meta->'activityType')`)
- `update_activity_type_array_passthrough`: YES (`_phase4_jsonb_text_array_or_null(v_meta->'activityType')`)
- `writes_tags_from_ai_draft`: YES (`_phase4_jsonb_text_array_or_null(v_ai_draft->'tags')`)
- `update_tags_carry_forward`: YES (`NULLIF(v_existing.tags, ARRAY[]::text[])`)

Plus schema check: `lesson_submissions.ai_draft_metadata` jsonb / `lessons.tags` ARRAY / `lessons.activity_type` ARRAY / `lessons.lesson_format` dropped. Migration sort: `20260516000000` → `20260518000000` → `20260518100000` → `20260519000000` (orphan `20260517000000_*` no longer exists). `npm run type-check` + `lint` clean. 569/569 tests passing (up from main's 546 — +23 from PR 2's new test files: reviewMetadataInit + evalMetrics).

**Branches:**
- `main` at `bd9d6e4` (PR 1b squash merge).
- `feat/metadata-foundation-llm-tagging` (PR 2, rebased) — 10 commits ahead of main; not yet pushed; no PR open yet.
- `backup/feat-metadata-foundation-llm-tagging-pre-rebase` — pre-rebase state of PR 2 (before this session's `git reset --hard main`); allows recovery if rebase needs to be undone. Deletable after PR 2 ships.
- `docs/session-36-pr1b-shipped` — Sessions 36+37 docs commits; now bundled into PR 2 (cherry-picked); branch is redundant and can be deleted at convenience.
- `feat/metadata-foundation-activity-type-multi` (PR #476's merged branch) — deletable at convenience.
- `feat/metadata-foundation-schema` (PR 1's merged branch) — deletable at convenience.

**Foundation-phase substrate live on PROD (post-PR-1 + PR-1b, unchanged this session):**
- Schema: `lesson_format` dropped; `series_id` + `part_number` + `crf_confirmed` columns added; `activity_type` array-shape multi-select with closed enum at 4 values (`cooking / garden / academic / craft`); `tags` array column with closed enum; `cultural_responsiveness_features` closed to 7 Brown CR features.
- 3 CHECK constraints (`<@` containment, length-agnostic) + trigger value-validation helper.
- Zod canonical + bidirectional mappers + Deno mirror + `enums.json` + freshness CI test.
- Filter UI: `lessonFormat` removed; "Lesson Type" sidebar filter backed by `tags`. Activity Type: 4-value multi-select chips, no `'both'`, no "Only" suffix.
- Edge functions: `complete-review` Zod-validated; `process-submission` has CRF prompt wired in.

**On PR 2 branch (local-only, NOT yet on PROD):**
- Tasks 2.1-2.3 done: per-prompt readiness audit (Gate C); `lesson_submissions.ai_draft_metadata` columns migration; ReviewDetail reads AI drafts at form init; eval-gate harness + canonical run; CRF prompt wired into `process-submission` edge fn; tags side-channel via merged-body migration `20260519000000_*`.
- Tasks 2.4-2.5 pending: activity_type prompt + tags prompt with their respective eval-gate canonical runs. Both vocab-locked per Gate C output.

**Next session picks up:**
- **Task 2.4 (activity_type prompt)** per impl plan §697-706. Watch the type-coupled cluster pattern (Session 30 PR 1b learning): if Task 2.4 introduces type-shape changes touching multiple consumer files (Zod + mappers + edge fn + tests), plan to ship them as a cluster commit rather than decomposed by file.
- After Tasks 2.4 + 2.5 ship: PR 2 push + open + per-PR ritual (pre-push code-reviewer agent → push → external bot reviewers → 4-surface triage → fix-up → round-cap).
- **TEST DB verification deferred until PR 2 push** — CI applies new migrations + edge fn updates when PR opens; per-round verification rule applies starting from round 0 (initial PR review).

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
- **Archive (Sessions 1-36 full journal):** `docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status-archive.md`

Auto-loaded MEMORY (already in conversation context, do not re-read by default):
- `feedback_*.md` for process patterns: `feedback_pr_bot_review_workflow.md` / `feedback_bot_review_investigation.md` / `feedback_pr_comment_surfaces.md` / `feedback_per_round_test_db_verification.md` / `feedback_data_safety_top_priority.md` / `feedback_no_docs_push_during_pr.md` / `feedback_plain_language.md` / `feedback_opus_subagents.md` / `feedback_multi_session_execution.md` / `feedback_workflows_not_sacred.md` / `feedback_user_relearning.md`
- `project_metadata_rebuild_initiative.md` for high-level project state
- Project-specific memories: `project_metadata_three_regimes.md` / `project_vocabulary_drift_scope.md` / `project_lesson_format_conflated.md` / `project_dedup_third_state.md` / `project_metadata_cleanup_candidates.md` / `project_crf_stamp_theater.md` / `project_teacher_zero_metadata_model.md` / `project_imported_non_esynyc_drops.md`

## Recent session log

### Session 37 — 2026-05-07 — PR-cycle archival + 2 feedback promotions

**Done (1 docs commit on `docs/session-36-pr1b-shipped`, accumulating with Session 36's `c6b68f7`):**

- **Moved Sessions 28-36 from active file into archive** per kickoff session-end ritual step 5 ("PR-cycle archival, do at the START of each new PR cycle"). Active file shrunk from 392 lines to ~95 lines (Current State + decisions + out-of-scope + pointers + this single session entry). Archive grew by 9 sessions (PR 1b cycle: Tasks 1b.1-1b.8 implementation Sessions 28-32 + PR push/round-1/round-2/ship Sessions 33-36).

- **Reconstructed missing Session 34 header.** During the move the source file was missing `### Session 34 — 2026-05-06 — PR 1b round 1 bot triage + fix-up shipped (commit \`131168b\`)` between Sessions 33 and 35 (3 blank lines where the header should have been; body started at "**Done (1 commit + 1 docs commit pending):**"). Fix-up reconstructed from cross-references in surrounding sessions: Session 35's "Round-cap-of-2 rule activated for round 3+" + Session 36's "round-2 fix-up's CI completion" + Out-of-scope follow-up's `131168b` reference all triangulate to Session 34 = round-1-fix-up. Committed the reconstruction as part of the archive append.

- **Promoted 2 patterns to `feedback_pr_bot_review_workflow.md`** per Session 36's process notes (which explicitly flagged them as candidates for promotion):
  1. **Empirical evidence can escalate a single-voice low-confidence finding to P0.** From Session 34 (PR 1b round 1): Codex P2 #1 framed as "2 historical rows"; TEST + PROD MCP probe revealed all 113 historical scalar `tagged_metadata.activityType` rows had the bad shape, every reviewer reopen crashing to error boundary. Reachable via 'approved'/'all' filter — mainline. The pattern: for any single-voice finding citing a small row count, run the corresponding MCP probe before triage; the escalation can be load-bearing.
  2. **Active-PR session-orientation rule (always check PR review state at session-start).** From the 4-occurrence pattern across Sessions 33→34→35→36: when a session opens and the prior session's status doc claims "N commits unpushed" or "awaiting round N", that's stale because the prior session's docs commit didn't push (per `feedback_no_docs_push_during_pr.md` they bundle with next fix-up), CI ran on the pushed fix-up, bots reviewed it, round N+1 fired between sessions. Mitigation: at session-start, run `git log @{u}..HEAD` AND `gh pr view <PR> --json reviews,comments` for any active PR. Trust git + live PR state; refresh Current State header inline before proceeding.

- **Type-coupled cluster impl-plan flaw NOT promoted (single occurrence).** Session 30 surfaced this in PR 1b — schema-shape change cascaded through Tasks 1b.3 + 1b.4 + 1b.5 type-couplings, breaking tsc invariants if shipped piecemeal. The note explicitly self-described as "candidate for `feedback_*` if it recurs"; PR 1b's later sessions (31, etc.) had truly independent tasks (Session 31 explicitly noted the contrast) so no recurrence yet. Stays in the active file's Recent decisions section as a watch-pattern for PR 2+; promote if it recurs.

- **Audit pass on Out-of-scope follow-ups** — no new resolutions to remove, no new entries to add. Current 12 entries all carry forward.

**Decisions made:**

- **`docs/session-36-pr1b-shipped` accumulates Session 37's commit too** rather than branching for the archival. Per kickoff session-end ritual step 4 ("Commit the status file"), this session's docs work commits on the current branch. The carrier choice (bundle into rebased PR 2 OR open standalone docs PR) was already deferred from Session 36; deferring it again to Session 38 is the cleanest call. The branch now holds 2 commits ahead of main: Session 36's status update + Session 37's archival.

- **Did NOT delete the merged feature branches** (`feat/metadata-foundation-activity-type-multi`, `feat/metadata-foundation-schema`). Per past PR 1 + PR 1b precedent ("deletable at convenience"), branch retention is user-side cleanup. Keeping them avoids any risk of deleting work that hasn't fully replicated forward; user can run `git branch -D` at any time.

- **Did NOT touch `feat/metadata-foundation-llm-tagging`** (PR 2 branch). Rebase work is the substantive next-session task; archival session stays scoped to docs-only changes per kickoff "ONE task per session" guidance.

**Process notes for Session 38+:**

- **Order on next session:** PR 2 rebase first (substantive), then carrier choice (small follow-up). The PR 2 rebase is non-trivial (`complete_review_atomic` `CREATE OR REPLACE` collision + tags side-channel re-fold + migration timestamp rename to sort after `20260518100000_*`). Plan: `git checkout feat/metadata-foundation-llm-tagging && git rebase main`, work the conflict via Edit, verify via `mcp__supabase-test__execute_sql pg_get_functiondef(...)` post-rebase, commit-amend the rename + body merge as one logical fix-up.

- **Carrier choice options for the docs commits.** Bundle into rebased PR 2: simplest, no extra PR overhead, but the docs commits land in PR 2's history under PR 2's title. Open a standalone docs PR: cleaner separation, but adds PR overhead for what's effectively just session-end housekeeping. The bundle path matches `feedback_no_docs_push_during_pr.md` spirit (don't burn CI cycles on docs-only pushes).

- **Watch the type-coupled cluster pattern.** PR 2's Task 2.4-2.5 will write to columns + Zod + mappers + edge function (LLM auto-tag wires across all four surfaces). If the impl plan has decompose-by-file ordering and any task introduces a type-shape change, expect tsc-break invariants to require cluster shipping like Session 30. Better to plan cluster commits up front than rediscover the pattern.

### Session 38 — 2026-05-08 — PR 2 rebase onto PR 1b (main `bd9d6e4`) + Sessions 36+37 docs bundled

**Done (10 commits on `feat/metadata-foundation-llm-tagging` after rebase, accumulating with this session-end docs commit):**

- **Rebased PR 2 onto `bd9d6e4`** (main with PR 1b shipped) via cherry-pick approach. `git reset --hard main` + cherry-picked 7 code commits in chronological order (the 13 stale docs commits from PR 2 dropped). New SHAs: `66ad77d` (Task 2.2a — ai_draft_metadata columns) → `97c35ab` (Task 2.2b — ReviewDetail reads draft, autosquashed test fix-up included) → `1e9fa8a` (Task 2.2c — tags side-channel migration RENAMED + body merged) → `7cd2a3f` (Task 2.2 — eval-gate harness) → `5eeaf47` (Task 2.3 partial — CRF eval inputs) → `efefcff` (Task 2.3 ship — CRF canonical run) → `67a3cd7` (Task 2.3 step 5 — CRF auto-tag in process-submission edge fn).

- **Migration rename + body merge** (commit `1e9fa8a`). Renamed `20260517000000_complete_review_atomic_tags_side_channel.sql` → `20260519000000_*` so it sorts AFTER PR 1b's `20260518100000_complete_review_atomic_activity_type_multi.sql`. Body re-folded to carry both: PR 1b's array-passthrough for `activityType` (INSERT site uses `_phase4_jsonb_text_array(v_meta->'activityType')`; UPDATE site uses `_phase4_jsonb_text_array_or_null(v_meta->'activityType')` + COALESCE chain) AND PR 2's tags side-channel (declare `v_ai_draft jsonb`, pluck from `v_submission.ai_draft_metadata`, write `tags` column in INSERT, carry-forward `tags` in UPDATE). Header comment documents the rebase + rename context for future readers; rollback comment updated to point at PR 1b's body as the revert target. ROUND of CREATE OR REPLACE preserved grants; signature unchanged.

- **Test fix-up for `reviewMetadataInit.test.ts`** (autosquashed into `97c35ab`). PR 2's original test expected `activityType: 'cooking'` (scalar) per merge-base `lessonToReview` mapper signature; PR 1b changed `lessonToReview` to return arrays, so the test had to update to `activityType: ['cooking']`. Auto-squashed via `git commit --fixup=<sha>` + `GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash bd9d6e4` so the per-commit invariant "every commit's tests pass" holds for git bisect. Other 5 tests in `reviewMetadataInit.test.ts` (null/undefined inputs, schema-failure cases, empty draft) all unchanged.

- **Bundled Sessions 36 + 37 docs into PR 2.** Cherry-picked `c6b68f7` (Session 36 — PR 1b SHIPPED + PROD-applied + verified) + `af431f8` (Session 37 — PR-cycle archival + 2 feedback promotions) onto rebased PR 2 branch. Both applied cleanly (status doc + archive only; no code overlap). Carrier choice resolved per Session 37's deferred decision: bundle into PR 2 over standalone docs PR.

- **Local DB rebuild verified.** `supabase db reset` ran cleanly (all migrations applied; seed complete: 5 lessons + 3 users). Final `complete_review_atomic` body inspected via `mcp__supabase__execute_sql pg_get_functiondef` — 6/6 verification signals YES (declare + pluck + INSERT array passthrough + UPDATE array passthrough + INSERT tags from draft + UPDATE tags carry-forward). Schema check confirms `lesson_submissions.ai_draft_metadata jsonb` / `lessons.tags ARRAY` / `lessons.activity_type ARRAY` / `lessons.lesson_format` dropped. Migration list shows `20260516000000` → `20260518000000` → `20260518100000` → `20260519000000` (correct order; orphan `20260517000000_*` is gone). 569/569 tests passing.

- **Backup branch `backup/feat-metadata-foundation-llm-tagging-pre-rebase` created** before `git reset --hard main`. Allows recovery of the original 20-commit PR 2 branch if rebase needs to be undone. Deletable after PR 2 ships.

**Decisions made:**

- **Cherry-pick approach instead of `git rebase main`** (captured as new bullet in "Recent decisions worth carrying forward"). Vanilla rebase would have hit ~13 separate docs conflicts (one per docs commit since main's docs are now PR 1b's Session 37 archival state vs PR 2's older Session 17-27 layout). Cherry-picking only the 7 code commits bypassed all docs conflicts; docs re-bundled cleanly via fresh cherry-picks + this session-end docs commit.

- **Migration sort-key `20260519000000`** chosen to sort cleanly after PR 1b's `20260518100000_*`. Convention: when same-day or adjacent migrations conflict, advance one full UTC day to dodge the digits-vs-underscore ASCII gotcha (per MEMORY.md migration-naming note). Today's actual date is 2026-05-08; `20260519` is purely a sort key.

- **Bundle Sessions 36 + 37 docs into PR 2** (carrier choice resolved per Session 37's deferred decision). Cherry-picked into rebased PR 2 branch directly; standalone docs PR rejected as overhead-heavy for what was effectively PR 1b's session-end housekeeping. Matches `feedback_no_docs_push_during_pr.md` spirit — no separate CI cycle for docs-only changes.

- **Test fix-up auto-squashed instead of standalone fix-up commit.** Per-commit "tests pass" invariant matters for git bisect; the test was correct vs the merge-base mapper but wrong against the rebased mapper, so it semantically belongs IN the cherry-picked Task 2.2b commit, not as a follow-up.

- **Did NOT delete merged feature branches or `docs/session-36-pr1b-shipped` this session.** Per past PR 1 + PR 1b precedent ("deletable at convenience"), branch retention is user-side cleanup. Leaving them in place avoids any risk of deleting work that hasn't fully replicated forward; user can `git branch -D` at any time.

**Process notes for Session 39+:**

- **Vanilla `git rebase` is rarely the right primitive when stale-docs commits are involved.** The cherry-pick approach generalizes: identify the substantive (code/feature) commits vs the housekeeping (docs/status) commits; cherry-pick only the substantive set; re-run docs work fresh at the end. Watch for recurrence of this pattern; promote to feedback memory if it happens again on a future rebase.

- **Watch the type-coupled cluster pattern in Task 2.4.** PR 1b's Session 30 learning: when a task's schema-shape change touches Zod + mappers + consumer files + tests, ship as one cluster commit, not decomposed by file. Task 2.4 (activity_type prompt) is more contained than PR 1b's Task 1b.3-1b.5 cluster, but if it adds new vocab keys or field shapes, watch for the pattern.

- **TEST DB verification deferred until PR 2 push.** Rebase substrate work is local-only this session; TEST DB will get the new migrations + edge fn updates when PR 2 opens (CI applies). Per-round verification rule applies to PR rounds (round 0 = initial open), not pre-PR sessions. The 6/6 RPC body signals + schema check via local MCP at session-end give high confidence that TEST will be clean on first apply.

### Sessions 18-36 — archived

PR 2's earlier session entries (Sessions 18-27) and PR 1b's full implementation cycle (Sessions 28-36) live in `2026-05-03-metadata-rebuild-foundation-execution-status-archive.md`. Read on demand via `grep -n "Session N" archive.md` or targeted Read with offset/limit. Audit performed during the move (Session 37) surfaced 2 promotions to `feedback_pr_bot_review_workflow.md` (empirical-evidence-escalates pattern + active-PR session-orientation rule) and 1 watch-pattern preserved in Recent decisions (type-coupled cluster impl-plan flaw, single occurrence).
