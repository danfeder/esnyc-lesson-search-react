# Metadata Rebuild — Foundation Phase — Execution Status

**Last updated:** 2026-05-07 — Session 46 (PR 2 SHIPPED + PROD-applied + verified; squash commit `cf2aad4` on main; PR 2 cycle is closed; this session-end docs commit lands on the merged branch and gets bundled into the next PR per Session 36 → 38 precedent).

> **About this file.** Active status carrying forward only what the next 1-2 sessions need to orient. Full per-session journal for Sessions 1-36 lives in `2026-05-03-metadata-rebuild-foundation-execution-status-archive.md` (~1600 lines, read on demand via grep). When a new PR cycle begins, that PR's session entries can move to the archive at the start of the following PR; the active file always reflects current PR + a small carry-forward roll-up.

## Current State

**PR #477 (PR 2 — lesson-submission LLM auto-tag, CRF + activity_type) — SHIPPED + PROD-applied + verified 2026-05-07.** Squash commit `cf2aad4` on main at 21:34:06 UTC. Both PROD migrations (`20260518200000_lesson_submissions_ai_draft_metadata` + `20260519000000_complete_review_atomic_tags_side_channel`) applied. PROD `process-submission` edge fn at version 31 (was 30 pre-deploy); ezbr_sha256 matches TEST exactly. 4/4 PROD MCP probes confirm the substrate. No SASL flake on the migration apply, no esm.sh CDN 522 flake on the edge fn deploy.

**Foundation-phase substrate live on PROD now includes:**
- All PR 1 substrate (lesson_format dropped + series_id + part_number + crf_confirmed + activity_type/tags multi-select array shape with closed enums + cultural_responsiveness_features array of 7 Brown CR features + 3 CHECK constraints + trigger value-validation + Zod canonical + Deno mirror + freshness CI test + filter UI + complete-review Zod-validated)
- All PR 1b substrate (`activity_type` array passthrough end-to-end via `complete_review_atomic`; retired the synthetic `both` value; repointed [both] → [cooking, garden] on PROD)
- **PR 2 substrate (NEW):** `lesson_submissions.ai_draft_metadata` JSONB + `ai_draft_generated_at` + `ai_draft_model`; submission-time CRF + activity_type LLM auto-tag in `process-submission` (Opus 4.7, eval-gated macroF1=0.937 / 0.887); `complete_review_atomic` reads `v_ai_draft` and writes tags to lessons.tags column on approve_new + 3-tier carry-forward chain on approve_update (`tags = COALESCE(NULLIF(v_existing.tags, ARRAY[]::text[]), _phase4_jsonb_text_array_or_null(v_ai_draft->'tags'), v_existing.tags)`); ReviewDetail pre-fills form from ai_draft on first review (when no existing review row).

**Eval-gate state (unchanged since Session 41):** CRF macroF1=0.937 (cleared Session 25); activity_type macroF1=0.887 (cleared Session 41 with Rule Y hybrid garden semantics); per-value F1 cooking 0.889 / garden 0.809 / academic 1.000 / craft 0.852; macro recall 0.956; `academic` truth count = 1 (Lorax binary); `maxPredictionRateForAbsentValues=0.10` guardrail dormant.

**Tasks deferred to follow-up PR:** Task 2.5 — tags LLM prompt + eval — sample-set methodology decision pending (tags column is PR-1-new with no historical reviewer-labeling so the eval-gate methodology that anchored CRF and activity_type doesn't apply). Decision shape: synthetic worksheet (manually authored sample set) vs. organic post-deploy data (collect after enough reviewer-tagged submissions arrive) vs. defer until Stage 2 worksheet round.

**Branches:**
- `main` at `cf2aad4` (PR 2 squash-merge); origin matches
- `feat/metadata-foundation-llm-tagging` (merged; deletable at convenience; this session's docs commit lands on it)
- `backup/feat-metadata-foundation-llm-tagging-pre-rebase` (created Session 38 pre-rebase; deletable now PR 2 has shipped)
- `docs/session-36-pr1b-shipped`, `feat/metadata-foundation-activity-type-multi`, `feat/metadata-foundation-schema` (all deletable at convenience)

**Next session picks up — choose the next PR (user-decision):**

```bash
git checkout main && git pull origin main
git status --short --branch && git log --oneline -5
npm run type-check && npm run lint
```

**Three options for the next PR:**
1. **PR 3a — search infra** (search_vector + embeddings + smart-search drift fix; independent of Stage 1 outputs; impl-plan ready in `…-foundation-implementation.md`)
2. **PR 4 — corpus drops** (23 third-party imports + concept recovery + N1 retitle; independent of Stage 1; pre-delete checklist matters per Phase 6.2 §4D learning — verify FK refs INTO each row + `lessons.original_submission_id` OUT FROM each row before deleting)
3. **Post-PR-2 tags-LLM follow-up PR** (sample-set methodology decision required first; smaller scope than 3a or 4; rides the same `submit_tags` tool-call infra PR 2 just shipped)

**PR-cycle archival fires at session-1 of whichever PR is next.** Sessions 37-46 (currently in this active file) move to the archive at that time per kickoff session-end ritual step 5.

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

### Session 39 — 2026-05-06 — PR 2 Task 2.4 step 1: activity_type prompt + worksheet v2 stub + harness absent-values guardrail

**Done (1 code commit `fccd05e` + this session-end docs commit pending):**

- **Activity_type prompt** at `supabase/functions/process-submission/prompts/activity-type.md` (47 lines). Mirrors CRF prompt structure: role intro → 4 canonical values with example agenda blocks → selection rules with substantial-block bar + tie-breakers → input format (priority order: agenda timed blocks > summary > skills lists > title) → output via `submit_tags` tool, multi-label.
- **Vocab + thresholds + samples README** scaffolded under `scripts/eval-data/activity-type-{vocab,thresholds,samples.README}.{json,md}`. Vocab matches `ACTIVITY_TYPE_VALUES` from `_shared/metadataSchemas.ts` (4 values, multi-label). Thresholds carry CRF baseline (macroF1=0.7 + minRecallPerValue=0.5) plus the new `maxPredictionRateForAbsentValues=0.10` guardrail. README documents methodology + regeneration SQL + harness invocation + the craft-zero-truth caveat.
- **Worksheet v2** at `scripts/eval-data/activity-type-relabel-worksheet-v2.md` (2331 lines, 113 entries). Pulled all 113 reviewer-tagged submissions from TEST DB via 4 chunked MCP queries (offset 0/30/60/90, limit 30 each). Each entry: numbered header with title, submission_id + old single-label + body length, summary excerpt (350 chars via SQL `SUBSTRING ... FOR 350` from `position('summary' IN lower(content))`) + agenda excerpt (500 chars from `position('agenda' IN lower(content))`) in `<details>` blocks, empty `**New labels (multi-label):**` line. SQL extracts already replaced newlines with spaces via `REGEXP_REPLACE` so excerpts are single-line; titles with stray `` (vertical tab) characters cleaned during formatting. Two duplicate-title rows (entries 104 + 105: "Welcome and Exploration: How humans work in the garden") flagged inline as "duplicate submission" with byte-identical bodies.
- **Harness `maxPredictionRateForAbsentValues` threshold** added to `scripts/lib/evalMetrics.ts` (~12 LOC). When a vocabulary value has `truthCount === 0` AND `sampleCount > 0`, computes `predictionCount / sampleCount` and fails if > ceiling. Failure message names the value + the rate + the absent-from-truth context: `prediction rate X.XXX for "<value>" exceeds ceiling Y when value is absent from truth (N of M samples)`. Threshold schema mirror in `scripts/eval-llm-tagging-prompt.ts` updated; help text extended with the new flag. 4 new unit tests added (above-ceiling fail; at-ceiling pass; truthCount>0 no-op; empty-input no-op); 21/21 evalMetrics tests passing.
- **Comment block on the new threshold key** documents the WHY: CRF's reference set has truth coverage for all 7 features (truthCount ≥ 48 per feature on 353 rows); activity_type's reference set may have zero craft labels under old vocab so per-value craft recall is undefined, but a runaway false-positive rate is still a fail. Generalizes to any vocabulary value missing from truth; not craft-specific.

**Decisions made:**

- **Worksheet body excerpts use `<details>` blocks rather than blockquotes or markdown tables.** v1 used `<details>` and the format read cleanly during reviewer triage. Blockquotes would force line-by-line `>` prefixing on multi-line excerpts; tables would break on the `|` characters embedded in Google-Docs-table-extracted bodies. `<details>` keeps the worksheet visually compact when scrolling and lets the reviewer expand only the rows where summary alone is ambiguous.
- **Single SQL substring window per excerpt section, not full-body context.** Pulled 350 chars of summary + 500 chars of agenda per row. Tried full-body excerpts in the first sample query (~5K-17K chars/row) — would have hit MCP's 25K-token output cap inside 5 rows. Trimmed to the structurally-meaningful sections (Summary cell + Agenda cell) where body content has predictable shape. If reviewer needs longer context for any row, regeneration SQL is documented in the samples README + the worksheet footer offers per-row pull on request.
- **Pre-formatted markdown via SQL string concatenation considered, rejected.** Could have built the row markdown inside the SQL `SELECT` and pasted output verbatim; would have saved ~20% of the formatting cost client-side. Tradeoff: harder to debug if format glitches; tighter coupling between query + worksheet structure. Decided client-side formatting is more flexible for the one-off worksheet build (per-row tweaks easier).
- **No "Reviewer's Distilled" line per row.** v1 had Claude-pre-summarized 1-sentence synopses per row. v2 omits — the summary excerpt + agenda excerpt are already pulled from the body, and reviewer-side reasoning is more grounded when working from raw body excerpts than from Claude's pre-judgment. Cuts ~$30 in API cost (113 reads × Opus body summarization) + ~30 min of session-side processing time. Worth it.
- **maxPredictionRateForAbsentValues uses `>` not `>=`** for the ceiling comparison. A rate exactly at the ceiling passes, mirroring `minRecallPerValue` semantics where the floor compares with `<`. The unit test "passes when an absent-from-truth value is predicted at or below the ceiling" exercises the edge case at rate=0.1, ceiling=0.1.
- **Threshold key named for the general principle, not the specific use case.** `maxPredictionRateForAbsentValues` rather than `maxCraftRate` or `craftGuardrail`. Future eval gates may have other vocabulary values absent from a given truth set (e.g., a tags eval where neither orientation nor bilingual_handouts shows up in the user's labeling); this rule fires for all of them automatically.

**Process notes for Session 40+:**

- **User labeling is the bottleneck.** Worksheet v2 stub stops at the empty `**New labels (multi-label):**` lines; user fills 113 rows over ~2-3 hrs. Resume after user signals done. Parser to write Session 40 will be similar shape to whatever ad-hoc parsing CRF samples used; if no formal parser exists, build a small `scripts/build-activity-type-samples.mjs` that reads worksheet markdown + writes samples.json.
- **Watch for the CLIProxyAPI cache_read=0 cost gotcha at canonical eval time.** Per Session 25 + MEMORY.md, every harness call through the proxy shows `cache_read=0` even with explicit `cache_control: ephemeral`. Per-call cost ~3-4× direct Console API rates. Activity_type canonical run on 113 samples expected ~$30 via proxy vs ~$7 direct. User has $200 Max extra-usage budget; ~6 prompts at proxy rates fits, but if running tight, drop the `--base-url` flag and bill against Console API instead.
- **No type-coupled cluster pattern fired this session.** Per Session 30 PR 1b learning, schema-shape changes touching Zod + mappers + edge fn + tests need to ship as one cluster commit. Task 2.4 step 1 added a new threshold key to one file (evalMetrics.ts) + threshold-schema mirror in one file (eval-llm-tagging-prompt.ts) + threshold-config JSON + unit tests; no schema-shape change. Watch for the pattern at Task 2.4 step 4 (wire into process-submission/index.ts) — should mostly be additive (one more `loadX()` + one more Anthropic call + one more Zod validation), no type narrowing across consumers.

### Session 40 — 2026-05-06 — PR 2 Task 2.4 step 2: worksheet labels + samples.json built

**Done (1 code commit `a426114` + this session-end docs commit pending):**

- **User completed worksheet labels** between sessions: 113/113 entries filled in, 0 invalid labels (all in canonical 4-value vocab `cooking / garden / academic / craft`), 0 empty lines. Local pre-build parse confirmed parseability before any DB work. Per-label distribution: garden 68 / cooking 34 / craft 13 / academic 11; 12 multi-label rows (10.6%, range 2-2 labels per multi row). Old-vs-new shifts: garden 67→68, cooking 33→34, academic 11→11 (unchanged), `both` 2→0 (retired; expressed as `cooking, garden`), craft 0→13 (new value; reviewers were forced to mis-classify these in the old vocab).

- **Bodies pulled from TEST DB via `mcp__supabase-test__execute_sql`** in a single query (id + extracted_content for the 113 reviewer-tagged submissions, ordered `extracted_title NULLS LAST, ls.id` matching worksheet order). 113-row payload was 696,399 chars (~700KB) and exceeded the inline MCP cap; the persisted-output file path was returned in the error message. Extracted the JSON-wrapped result via small `extract-bodies.mjs` helper that parses outer JSON → inner JSON → regex match between `<untrusted-data-XXX>` markers → bodies array. Written to `/tmp/activity-type-bodies.json` (intermediate, not committed). 113 unique IDs; perfect overlap with worksheet IDs (0 missing, 0 extra).

- **Built `scripts/build-activity-type-samples.ts`** (200 LOC, npx tsx). Mirrors harness style (zod schema validation, similar argv parsing, similar logging output). Reads worksheet via regex split on `^---$` then per-chunk extraction of `- **ID:** \`uuid\`` and `**New labels (multi-label):** values` (strip inline `<!-- -->` comments before split-by-comma + trim + lowercase). Reads bodies dump + vocab JSON. Validates: every worksheet ID has a body in the bodies dump; every truth label is in vocab; no entry has an empty/missing label line. Exits 0 on success / 1 + per-error report on validation failure. De-duplicates within a single label list with a warn log if duplicates collapsed (none triggered).

- **Ran build → emitted `scripts/eval-data/activity-type-samples.json`** (805 lines, 664KB, 113 entries). Schema matches harness's `sampleSchema = z.object({id, body, truth: string[]})`. Total body chars 652,580 matches MCP sanity query.

- **Verified end-to-end via perfect-prediction dry-run** (no API spend): generated truth-as-predicted from samples.json via 1-line node helper, ran `--dry-run-with-predictions` against full 113-row sample set with all thresholds active. Result: `samples=113`, all per-value P=R=F1=1.000, macroF1=microF1=1.000, exit 0. Confirmed: harness's zod sampleSchema parses; truth-in-vocab validation passes; metrics math runs across all 4 values; threshold logic evaluates; output file format intact.

- **Updated `activity-type-samples.README.md`**: replaced "Eval-gate caveat — `craft` may have zero truth labels" section with "Eval-gate guardrails — actual state after relabeling" reflecting craft truth count = 13 (guardrail dormant, per-value P/R applies); expanded distribution table with both pre- and post-relabel columns; added "How samples.json was built" pipeline section documenting the bodies-pull → build-script invocation. Total body chars + min/max/avg added so future readers can size their MCP pulls.

**Decisions made:**

- **Single full-pull MCP query over chunked batches.** Initial plan was 12 batches of 10 rows (113 rows / 100K-char inline cap = ~12 batches at avg row size). After running batch 0/12 and seeing the persisted-output mechanism fire on the very first batch, realized persistence already bypasses the inline cap — switched to a single 113-row query. Saved 11 round-trips. The `Error: result (696,399 characters) exceeds maximum allowed tokens` is not a failure mode; the persisted file path is fully usable.

- **Build script committed (not ad-hoc).** CRF samples were assembled ad-hoc with no committed build script (verified via `git show 5eeaf47 --stat`); v2 of activity_type takes a different path because (a) Session 39's process notes explicitly called for a build script, (b) Task 2.5 (tags) and any future Gate-C-classified vocab-locked prompts will need similar parser infrastructure, (c) the worksheet → samples.json reproduction is high-leverage to keep machine-driven (avoids manual JSON crafting + paste mistakes). 200 LOC TS file mirrors the harness's style for maintainer continuity.

- **`/tmp/activity-type-bodies.json` intermediate not committed.** Same rationale as CRF's pull (no committed bodies dump): the bodies are already in samples.json once merged, and the regeneration recipe in README + the build-script invocation cover reproducibility. Avoids duplicating ~700KB of body text across two committed files.

- **Worksheet labels committed in the same commit as samples.json + build script.** Worksheet labels are the source-of-truth that drove samples.json; bundling them keeps the data lineage visible in one commit. Matches the way Session 39 bundled prompt + worksheet stub + harness extension into a single Task 2.4 step 1 commit.

- **README distribution table given both pre- and post-relabel columns.** Earlier README had only pre-relabel (single-label) distribution; post-relabel (multi-label) adds a "count truth-occurrences" framing that's cleaner than trying to express multi-label in row-counts. The split also visually shows the `both` retirement and the craft surfacing.

**Process notes for Session 41+:**

- **CLIProxyAPI vs Console API decision required before Task 2.4 step 3.** Per MEMORY.md, proxy adds cache_read=0 → ~3-4× cost vs direct Console API. Activity_type canonical run on 113 samples: ~$30 proxy / ~$7 direct. User's $200 Max extra-usage budget covers ~6 prompts at proxy rates, but if running tight on budget, drop the `--base-url` flag and bill against Console API. CRF run (Session 25) used proxy at $30.23. The decision should surface to the user before the run, not be silently chosen.

- **Most-likely-fail values on canonical run: craft (over-prediction) or academic (small denominator).** Craft: prompt biases toward conservative tagging (substantial-block bar) but `academic, craft` and `craft` are easy to over-recall on lessons with substantial closing art segments. Per-value floor 0.5 recall on 13-row truth = need ≥ 7/13 craft TPs and per-value precision floor not in thresholds. Academic: 11-row truth means each missed academic = 0.091 recall drop; LLM probably tags more conservatively than reviewers on subtle academic-discussion frames. If gate fails, study the per-value confusion in the JSON output before iterating prompt.

- **Watch for the type-coupled cluster pattern at step 4.** Wiring activity_type into `process-submission/index.ts` should be structurally parallel to CRF's wire-up (Task 2.3 step 5, commit `67a3cd7`): one new prompt-load helper, one new Anthropic call, one new Zod-validate-into-`ai_draft_metadata`. Likely additive, no type narrowing — but if a shared interface like `AiDraftPayload` needs widening, ship as one cluster commit covering edge fn + Zod schema + any consumer reads.

- **No PR 2 push this session.** Branch is now 13 commits ahead of main. PR 2 push waits on Tasks 2.4 (3-5) + 2.5 closure. Bundle session-end docs commits with the next code push (`feedback_no_docs_push_during_pr.md` spirit: don't burn CI cycles on docs-only changes).

### Session 41 — 2026-05-07 — PR 2 Task 2.4 step 3: activity_type eval gate cleared + Rule Y hybrid garden

**Done (1 code commit `5e25431` + this session-end docs commit pending):**

- **Canonical eval gate cleared at macroF1=0.887** (gate floor 0.700) on the post-Rule-Y truth set. Per-value F1: cooking 0.889 / garden 0.809 / academic 1.000 / craft 0.852. Macro recall 0.956 / macro precision 0.836. Result file `/tmp/activity-type-eval-result-v3.json` (not committed; CRF pattern doesn't commit eval results).

- **Rule Y design call (mid-session)**: user introduced `garden` as a hybrid tag firing for both hands-on garden activity AND food/agriculture/garden topical content. `academic` becomes mode-exclusive and narrow. The user authored this rule mid-session after seeing v2's failure mode (garden→craft confusion) revealed the reviewers had been using "garden" both topically (lesson is about pollinators / food systems / etc.) and activity-based (students do hands-on garden work) inconsistently across samples. Rule Y disambiguates: garden is hybrid by design; academic is the rare narrow fallback for non-food/non-garden conceptual content (e.g., The Lorax Debate).

- **17 truth retags applied** via one-off helper `/tmp/apply-retags.mjs` (not committed; intentional — script reads `/tmp/retag-pairs.json` and edits worksheet markdown by ID-matching regex):
  - 7 `[academic]` → `[garden]` or `[garden, craft]` (food/agriculture topical lessons that previously got academic by reviewer judgment): Meet The Food System; African American Food Traditions; Foods From Around the World; How Food Moves (Food Miles); School Lunch Heroes (added craft); The Apple Story (added craft); The Ugly Vegetables (added craft).
  - 10 `[garden]` → `[garden, craft]` (lessons that already had garden topical truth but had substantial craft activity reviewers didn't tag): All About Birds, Anthotype, Bug Camouflage, Butterflies, Exquisite Plants, Ladybugs, Garden Community, Tea Bags, Honey Bee Pollinators, What Gardeners Wear.
  - The Lorax Debate stays as the sole `[academic]` entry — deforestation/environmentalism, not food/agriculture.

- **Iteration trajectory** (3 full canonical runs + 1 smoke):
  - Smoke (5 samples, original prompt): macroF1=0.756 on tiny denominator; passed gate but unrepresentative — only 1 of 5 samples exhibited the academic FP problem.
  - v1 full (113 samples, original prompt): macroF1=0.605 — failed. Academic FPs 72 of 113 (LLM tagged academic on 73% of lessons; reviewers tagged it on 11). Confusion matrix revealed dominant pattern: opening rituals + closing reflections triggering academic across hands-on lessons.
  - v2 full (113 samples, mode-exclusive academic prompt + 3 academic-handson outlier retags): macroF1=0.670 — failed (improved by 0.065 but didn't clear). Academic FPs dropped 72→6 (massive precision improvement); but garden FNs grew 19→23 via new garden→craft confusion pattern (LLM read garden-themed-craft lessons as `[craft]` instead of `[garden]`). User's analysis: reviewers were using "garden" both topically and activity-based; the v2 prompt forced activity-based interpretation, dropping topical garden tags.
  - **v3 full (113 samples, Rule Y prompt + 17 retags): macroF1=0.887 — passed.** Garden recall now 1.000 (was 0.667 in v2); garden precision 0.679 (LLM aggressive on topical tag, fits draft-validate use case where reviewers easily remove extras).

- **README updated** (`scripts/eval-data/activity-type-samples.README.md`):
  - Distribution table extended to three columns: pre-relabel old vocab / post-v2-relabel / post-Rule-Y retag.
  - Added "Canonical run result (Session 41)" block with full per-value metrics + actual cost.
  - Updated cost note: Console API direct ~$2 per 113-sample run (was $7 projection; ~3-4× cheaper than CLIProxyAPI proxy as expected).

- **Cost actuals**: Console API direct billing ~$2 per full canonical run (vs my $5.43 estimate; vs $30 via CLIProxyAPI proxy with `cache_read=0` cost gotcha). User tracked actuals from Anthropic console; my pricing estimates were ~3× over. Total session spend: ~$6 of $9 budget (smoke $0.13 + v1 $2 + v2 $2 + v3 $2). ~$3 budget margin remaining.

**Decisions made:**

- **Direct Console API over CLIProxyAPI proxy** for this run. User had $9 in console credits; proxy would have cost ~$30 via Max billing (cache_read=0 gotcha). Decision: swap `ANTHROPIC_API_KEY` in `.env.local` for a Console key (`sk-ant-api03-...`), keep proxy key under separate name `ANTHROPIC_CONSOLE_API_KEY`, use shell prefix `ANTHROPIC_API_KEY="$(grep ... .env.local | cut -d= -f2)"` to inject at runtime without polluting shell history. dotenv's `override: false` default keeps shell env winning over `.env.local`. Both keys coexist; future runs can pick which billing path.

- **Smoke-then-full vs straight-to-full**: did smoke first ($0.13) to verify Console key works + measure per-call cost. Smoke passed (macroF1=0.756 on 5) but had unreliable signal on academic FPs (only 1 of 5 samples exhibited the problem). For subsequent iterations (v2, v3), went straight to full instead of smoking — v1's full data showed smoke was too small to predict full-run behavior.

- **Rule Y design over alternatives**: when v2 failed, considered three paths — (A) retag the 14 garden→craft outlier truths to `[craft]`, (B) loosen prompt to read garden-themed-craft as `[garden, craft]`, (C) accept v2 as close-to-pass + adjust gate threshold. User picked B with caveat: "garden tag fires for anything plant/agriculture-related, including food systems, food culture, agricultural history" — which became Rule Y (hybrid tag). Strong design call that simplified the entire mental model; reviewer truth was using `garden` inconsistently both topically and activity-based.

- **Retag scope**: 17 lessons total, not the broader cooking-lessons-with-food-discussion. User's intent reading: garden topical fires when the lesson's CONTENT is about food/garden/agriculture (discussion topic, summary, objectives), not just because cooking lessons "involve food." 31 `[cooking]`-only truth labels left untouched — those represent the user's earlier judgment that the cooking activity was the dominant frame, not garden topical.

- **Ship v3 without further iteration**: macroF1=0.887 cleared by 0.187. Garden precision 0.679 (36 garden FPs) is the only soft spot; LLM is being slightly aggressive on the topical tag, applying it where reviewers didn't. For the draft-validate use case, this is the right direction (reviewers easily remove extras; missed tags harder to catch). Pattern across iterations showed each tightening introduced new failure modes; further iteration likely diminishing returns.

- **Don't commit eval result JSON**: CRF pattern doesn't commit `/tmp/*-eval-result.json`; canonical run is regeneratable from prompt + samples + thresholds. Headline numbers captured in commit message + README + this status entry.

- **Don't commit one-off retag scripts**: `/tmp/apply-retags.mjs` and `/tmp/retag-pairs.json` are one-off helpers. Session log + README documents the retag intent; the helper script regex pattern (`(- \\*\\*ID:\\*\\* \`<id>\`[^\\n]*\\n[\\s\\S]*?\\n)\\*\\*New labels \\(multi-label\\):\\*\\*[^\\n]+`) is the reusable bit and is captured here.

**Process notes for Session 42+:**

- **Task 2.4 step 4 should be structurally parallel to CRF wire-up.** Activity_type adds one more prompt loader + one more Anthropic call + one more Zod validation in `process-submission/index.ts`. Key differences from CRF: multi-label tool call (`submit_tags` not `submit_tag`); array shape return (`activityType: string[]`); merge-not-overwrite into `ai_draft_metadata` (CRF writes `cultural_responsiveness_features` key; activity_type adds `activityType` key without dropping CRF's). Verify CRF's pattern handles read-modify-write of `ai_draft_metadata` cleanly before adding the second writer.

- **Watch for the type-coupled cluster pattern at step 4 (per Session 30 PR 1b learning)** — wiring activity_type into the edge function should be additive (one new prompt + one new call site + one new Zod validate). No type narrowing across consumers expected. But if a shared interface like `AiDraftPayload` needs widening, ship as one cluster commit.

- **CLIProxyAPI cost gotcha confirmed**: actual proxy cost was ~$30 (Session 25 CRF) vs ~$2 direct (Session 41 activity_type). The 15× ratio mostly comes from the prompt-cache miss (proxy adds Claude Code's session prompt per call, breaks cache). For future eval runs with budget pressure, direct Console API is dramatically cheaper. The proxy still has a place when burning Max credits is preferred over Console balance.

- **My API cost estimates were ~3× over actuals.** Across smoke + v1 + v2 + v3, my projected cost per call was 2.7-3.5× the actual. Likely my chars-per-token assumption (3.5) was too low, OR Anthropic's billing has a discount I'm unaware of, OR there's a workspace-credit subsidy. For future projections, anchor on user-observed actuals not my pricing math; my math is consistently overestimating.

- **Single-truth-row eval values are stringent.** Academic now has 1 truth row in the 113-sample set. Per-value academic recall is binary: 1.000 if the LLM correctly tags Lorax, 0.000 if it doesn't. Future canonical re-runs need to keep producing this 1/1 to maintain the per-value floor. If the 1-row category becomes a flake risk, options: (a) add 2-3 more academic-only lessons to the sample set (would need to find/invent), (b) drop the per-value floor for academic only via threshold-config exemption, (c) accept the binary signal as load-bearing — a regression on Lorax tells us the prompt has shifted academic interpretation away from the rule.

### Session 46 — 2026-05-07 — PR 2 SHIPPED + PROD-applied + verified (CRF + activity_type LLM auto-tag)

**Done (1 squash-merge to main + this session-end docs commit on the merged feature branch):**

- **Active-PR session-orientation correction** (6th occurrence of the "stale unpushed claim" pattern; rule already captured in `feedback_pr_bot_review_workflow.md`): status doc claimed "1 code commit ahead of origin + docs commit pending" but `git log @{u}..HEAD` was empty at session start — Session 45's CRF test fix-up `c92b94c` AND Session 45's docs commit `8d645c0` had both already pushed. CI ran on `8d645c0` between Session 45 and Session 46.

- **Round-3 bot voice triaged (4-surface query per `feedback_pr_comment_surfaces.md`).** Round-3 fired on `8d645c0`: claude formal review COMMENTED ("No P0/P1 findings. Four P3 observations inline; none block merge") + claude long-form issue comment + 4 inline P3 comments + Codex round-3 reviewer pass at 21:20 UTC ("**No new blocking P1/P2 findings**"; recommends ship). **Both bot voices converged on ship.** Triage shape: 1 P1 (no Anthropic call timeout — already in OOS follow-ups), 2 P2 (`ai_draft_model` last-writer-wins — already in OOS follow-ups; missing test for "existing review row" — `!existingReview` guard at `ReviewDetail.tsx:460` is correct by construction), 5 P3 nits (4 carry-overs from rounds 1-2 + 1 new `evalMetrics.averageDefined` NaN typing nit — callers handle correctly per claude's own admission). Per round-cap rule "fix only critical bugs" — no critical bugs surfaced.

- **Pre-PROD-apply MCP body-signal probe on TEST DB** (added belt-and-braces hygiene step prompted by user mid-session: "did we already do that?"). Status doc claim was that Session 45's commit was test-only so no fresh per-round verification needed; that's true at the round level. But the *pre-PROD-apply* TEST DB body-signal probe via MCP had not been run for PR 2 specifically (only via CI auto-apply + E2E green). Ran the probe; 6/6 green — all 3 ai_draft_* columns present + both PR 2 migrations (`20260518200000`, `20260519000000`) applied + `complete_review_atomic` body has `v_ai_draft` + reads `ai_draft_metadata` + INSERT writes tags from draft + UPDATE has 3-tier COALESCE chain reading `v_ai_draft` (`tags = COALESCE(NULLIF(v_existing.tags, ARRAY[]::text[]), _phase4_jsonb_text_array_or_null(v_ai_draft->'tags'), v_existing.tags)`) + edge fn TEST version 9 has Anthropic SDK + CRF prompt + activity_type prompt with RMW merge. False alarm on initial regex (looked for `_phase4_..(v_ai_draft` as the FIRST arg of COALESCE, but it's the SECOND arg behind `NULLIF(v_existing.tags...)` — chain order is "existing wins, then LLM draft, then preserve NULL").

- **PR #477 squash-merged via `gh pr merge 477 --squash`** at 2026-05-07T21:34:06Z. Squash commit `cf2aad4` on main. PR was MERGEABLE (UNSTABLE mergeStateStatus only because of pre-existing Security Audit failure on `@lhci/cli` chain, not blocking).

- **PROD migrate + edge-function deploy approved by user; both succeeded on first approval.** `migrate-production.yml` run `25523339957` + `deploy-edge-functions.yml` run `25523339945` — no SASL handshake flake on Apply step, no esm.sh CDN 522 flake on edge fn deploy. Order followed kickoff Recent decisions ("migrations-first, edge-functions-second when both PROD workflows queue together").

- **Post-PROD-apply MCP verification ALL GREEN (4 surfaces, 3-signal pattern):**
  - `lesson_submissions.ai_draft_*` columns: 3/3 present (jsonb + timestamptz + text, all nullable)
  - `schema_migrations`: both PR 2 migrations applied (`20260518200000` + `20260519000000`)
  - `complete_review_atomic` body: 4/4 signals (`v_ai_draft` declared, reads `ai_draft_metadata`, array passthrough for v_ai_draft, `tags = COALESCE(NULLIF(v_existing.tags...` chain present); body_length 14,900 == TEST exactly
  - `process-submission` edge fn: version 30 → **31** (signal 1: version increment ✓); ezbr_sha256 `94e8bb71...` IDENTICAL to TEST's deploy of same merge commit (signal 2: cross-environment match ✓); source has `import Anthropic`, CRF prompt block, activity_type prompt block with RMW merge into `ai_draft_metadata` (signal 3: source-content grep for new code ✓).

- **PR 2 SHIPPED.** Foundation-phase substrate now includes submission-time Opus 4.7 LLM auto-tag for two fields: cultural_responsiveness_features (gated on body containing "cultural responsiveness" header text — older legacy template ~45% of corpus skipped) + activity_type (always-on, multi-label per Rule Y hybrid garden semantics).

**Decisions made:**

- **User-mid-session intercept on TEST DB verification surfaced an axis gap.** Per-round verification covers the "round changed DB-applied state?" axis, but pre-PROD-apply verification covers the "is TEST DB confirmed in expected post-merge state via MCP?" axis. Both axes apply. Session 45's status-doc claim "no fresh verification needed" was correct at the per-round axis but didn't trip the pre-PROD-apply axis. The 2-min MCP body-signal probe is high-leverage and should fire pre-PROD-apply regardless of per-round-verification status. Worth promoting to the per-round verification feedback memory or kickoff PER-PR RITUAL — see Process notes for Session 47+.

- **`gh pr merge --squash` without `--delete-branch`.** Per past PR 1 + PR 1b precedent, branch retention is user-side cleanup ("deletable at convenience"). Auto-deletion would foreclose any need to recover the per-task hashes from the feature branch.

- **Stay on the merged feature branch for this session's docs commit** (vs. checkout main + create `docs/session-46-pr2-shipped`). Session 36's pattern was the latter, but Session 46's docs are short (~150 lines append + Current State refresh) and the next-PR session can cherry-pick from any branch. Lower-friction path: commit on `feat/metadata-foundation-llm-tagging` (already deletable). If user prefers the dedicated docs branch, easy to recreate later.

- **No new out-of-scope follow-ups added this session.** Session 45's three (any-types cleanup, per-field models provenance, Anthropic call timeout) cover the round-3 substantive findings; round-3's only NEW item was the `evalMetrics.averageDefined` NaN typing nit which is too minor to track.

**Process notes for Session 47+:**

- **PR-cycle archival fires at the START of the next PR (Session 47 if it opens a fresh branch).** Sessions 37-46 in the active file move to the archive at that time per kickoff session-end ritual step 5.

- **Branch cleanup deferrable.** All 5 metadata-foundation feature/backup/docs branches are deletable at user convenience. No urgency.

- **Foundation-phase next-PR options.** Three branches the user can pick (see Current State for command-line first steps). PR 3a (search infra) and PR 4 (corpus drops) are independent of Stage 1; the post-PR-2 tags-LLM follow-up needs its sample-set methodology decision before any code work begins.

- **No v-tag yet.** Per Recent decisions "v-tag deferred to end-of-foundation-phase" — PR 2 is the third foundation-phase PR; tagging mid-phase is premature.

- **Pre-PROD-apply MCP probe pattern is high-leverage — promote to feedback memory.** This session's user-prompted "did we already do that?" check turned a routine 2-min step into a confirmed-green pre-flight check that would have caught any TEST-DB-not-actually-applied case before PROD apply triggered. Candidate: append a bullet to `feedback_per_round_test_db_verification.md` distinguishing "per-round verification" (round changed DB-state?) from "pre-PROD-apply verification" (TEST DB confirmed in expected post-merge state?), making both fire independently. Or fold into kickoff PER-PR RITUAL step 9 explicitly. Decide on Session 47.

### Session 45 — 2026-05-07 — PR 2 round 2 triage + 1 accept (CRF test coverage); round-cap activated

**Done (1 code commit `c92b94c` + this session-end docs commit pending):**

- **Active-PR session-orientation correction**: Session 44 status doc claimed "4 commits ahead of origin awaiting push" but `git log @{u}..HEAD` was empty at session start — push happened post-Session 44 docs commit (likely as part of Session 44's session-end ritual after the doc was written). Origin now at `6596782`. CI ran on push; E2E + CodeQL turned green (Session 44's fix-ups landed correctly); only Security Audit remains red (pre-existing `@lhci/cli` chain per MEMORY hygiene-follow-ups). This is the 5th occurrence of the "stale unpushed claim" pattern (Sessions 33, 34, 35, 36, 45) — already captured in `feedback_pr_bot_review_workflow.md`'s active-PR session-orientation rule.

- **Round-2 bot review triaged (4-surface query per `feedback_pr_comment_surfaces.md`).** New review on `6596782` from `claude` at 16:14 UTC: `CHANGES_REQUESTED` with 7 findings (3 P2 + 4 P3). User's Codex round-2 pass at 19:18 UTC recommended 1 accept + round-cap. My rebuttal pass converged with Codex on the same shape: 1 accept, 6 reject.

  - **ACCEPT (1)**: P2 — Missing `culturalResponsivenessFeatures` test in `reviewMetadataInit.test.ts`. Real coverage gap; CRF is the *other* field this PR auto-tags but only `activityType` was tested end-to-end. Two tests added: (a) valid CRF passthrough using actual master-list value `'Communicates high expectations'`, (b) invalid CRF returns null (mirrors existing `activityType` invalid-enum test). 8/8 tests passing (was 6).

  - **REJECT (6)**: P2 `any` types at lines 136-137 — `git blame` proves pre-existing from `2c14ff04` 2025-08-06, ~9 months pre-PR-2; out of scope per kickoff. P2 TOCTOU race on `ai_draft_metadata` SELECT→merge→UPDATE — no realistic concurrent-write path (both LLM steps run sequentially in one edge invocation; `regenerateEmbedding` skips both); atomic JSONB merge is hypothetical-future-proofing. P3 `as ReviewMetadata` cast — load-bearing because `lessonToReview` returns `ReviewFormPayloadValidated` (Zod-inferred), not `ReviewMetadata` (legacy hand-written interface); removing it would couple the new mapper to legacy interface, wrong direction per Gate B architecture. P3 CRF Select `label: v` — verified all 7 master-list features have `value === label` in `filterDefinitions.ts:67-86`, byte-identical output; the cookingSkills/gardenSkills config-lookup pattern exists because *those* fields have slug-vs-label divergence which CRF doesn't. P3 no content truncation — production must match eval harness; `eval-llm-tagging-prompt.ts:191` sends full `body` with no cap. Truncating in production but not eval would cause production to underperform eval (eval-gated metrics CRF macroF1=0.937 / activity_type macroF1=0.887 reflect full-content behavior). Embedding's 8K cap is OpenAI hard limit; Opus is 200K. P3 `evalMetrics.ts` Array.includes — ~10K ops per metric run at current 113-353 sample sizes, harness is one-shot project-internal infra, not a hot path.

  - **Round-1 inline carry-overs all rebutted in same pass:** `ai_draft_model` last-writer-wins (both prompts use same model; logged as out-of-scope); merged JSONB not re-validated (existingDraft was written by *the same function* with prior Zod validation; no untrusted source); two Anthropic clients (code-style nit); no Anthropic call timeout (SDK default 600s, edge-fn cap ~150s is binding constraint; logged as out-of-scope); ReviewDetail form-init guard (verified at `ReviewDetail.tsx:460` — AI draft block lines 470-473 IS inside `if (!reviews || reviews.length === 0)`; bot's "guard isn't visible in diff" claim was wrong).

- **Fix-up commit `c92b94c`** — added 2 tests to `src/pages/reviewMetadataInit.test.ts`. vitest 8/8 green; type-check + lint clean. Test value `'Communicates high expectations'` chosen from actual Brown CR master list per Codex round-2 guidance — Claude's sample `'Windows-mirrors-and-sliding-doors'` is not a real CR feature.

- **3 new out-of-scope follow-ups added** to status doc: (1) pre-PR-2 `any` types cleanup PR; (2) per-field `_models` provenance inside `ai_draft_metadata` for future model divergence; (3) explicit 30s Anthropic call timeout for resilience hardening.

- **Round-cap activated** per kickoff PER-PR RITUAL ("round-cap after 2 rounds"). Round 1 = Session 44 fix-ups (back-sort migration rename + CodeQL regex). Round 2 = Session 45 fix-up (CRF test coverage). Any round-3 bot voice triages to "fix critical bugs only, document the rest, ship" — design preferences, perf nits, and pre-existing issues all auto-defer.

**Decisions made:**

- **Skipped fresh TEST DB verification this session.** Session 45's commit is test-only (no DB-applied state changed). The 6/6 RPC body signal probe + edge-function 3-signal verification can wait until pre-PROD-deploy. Per `feedback_per_round_test_db_verification.md` the rule is "every round that touches DB-applied state needs its own evidence" — test-only round doesn't trigger it. Session 44's push (which CI applied) is the most recent DB-affecting verification, and Codex round-2 confirmed via E2E logs the apply step ran and listed both renamed migrations correctly.

- **Bot voice convergence as round-cap signal: Codex round-2 + my rebuttal pass aligned independently on 1 accept (CRF test). The convergence between independent analyses on the same accept choice — and on the same rejection rationales — is the signal that no real bug is being missed. Single-voice from claude on the rejected findings is the absence-of-convergence pattern that justifies the round-cap.

**Process notes for Session 46+:**

- **Push timing.** Per `feedback_no_docs_push_during_pr.md` bundle the docs commit with the next code push. Session 46 picks up with `git push` to send Session 45's code fix-up + this docs commit together. Watch CI for ~10 min to confirm checks remain green.

- **Round-3 watchpoint.** If a third claude review fires, follow round-cap protocol: only fix findings that show convergence with another bot voice OR represent real production bugs. Use the same 4-surface query + rebuttal pass shape — but compress the report (kickoff "ROUND-CAP AFTER 2 ROUNDS — fix only critical bugs, document the rest, ship").

- **Ready-to-ship boundary.** Once CI is green and no round-3 bot voice arrives within ~1 hour of CI completing, the PR is ready for user-decision merge. `c92b94c` + Session 45 docs is the last fix-up; pre-PROD-deploy verification (3-signal edge fn + 6/6 RPC body) fires after squash-merge but before approving the production migration in CI.

### Session 44 — 2026-05-07 — PR 2 round 1 fix-ups: migration rename for back-sort + CodeQL regex slice

**Done (2 code commits + this session-end docs commit pending — local only per `feedback_no_docs_push_during_pr.md` until next push):**

- **Active-PR session-orientation per Session 43's process note**: ran `git log @{u}..HEAD` + `gh pr view 477 --json reviews,comments,state,mergeable` + `gh pr checks 477` + four-surface comment query (issue-comments + reviews + line-comments + failing-job logs). Findings: bots have all completed reviews (claude-review + GHAS CodeQL + user's own Codex pass at 15:45); 3 failing checks (E2E Tests, Security Audit, CodeQL); zero P1 from bot voice convergence — bot voice is single-voice `claude` on substance + single-voice `GHAS` on the regex; Security Audit is the pre-existing `@lhci/cli` chain (already in MEMORY hygiene-follow-ups, not introduced by this PR).

- **Migration back-sort root cause investigated** via `mcp__supabase-test__execute_sql` + `mcp__supabase-remote__execute_sql` against `supabase_migrations.schema_migrations`. Both TEST and PROD are at `20260518100000` (PR 1b's tip) — neither PR 2 migration is recorded on either DB, and `lesson_submissions.ai_draft_metadata` columns do NOT exist on TEST (column probe returned `[]`). **Codex review's claim ("TEST has 20260516000000 and 20260519000000 recorded") was WRONG** per fresh probe — likely Codex hallucinated or read against a different DB. Rule learning: single-source MCP claims in review comments can be stale; always re-probe at the time of action, not at the time of review.

- **CI behavior chain confirmed**: `supabase db push --dry-run` (line 59 of `.github/workflows/e2e.yml`) exits 1 on the back-sort detection ("Found local migration files to be inserted before the last migration on remote database"); `set -o pipefail` propagates the exit code; GHA's default fail-fast skips the subsequent `supabase db push` step (line 121) because its `if:` check doesn't override the implicit `success()`. The migration genuinely never applied. The bug is the FILENAME (timestamp), not the body.

- **Fix-up commit 1 (`fff430d`) — migration rename via `git mv`**: `20260516000000_lesson_submissions_ai_draft_metadata.sql` → `20260518200000_lesson_submissions_ai_draft_metadata.sql`. New timestamp sorts cleanly post-PR-1b (`> 20260518100000`) and before PR 2's RPC migration that reads these columns (`< 20260519000000`). Body unchanged (additive `ADD COLUMN IF NOT EXISTS` + comments). Header gets a context block explaining the rename + rationale for the rule exception (mirrors `20260519000000_*`'s own rename header pattern).

- **Fix-up commit 2 (`4ea642b`) — CodeQL regex slice**: replaced `replace(/<!--.*?-->/g, '')` on `scripts/build-activity-type-samples.ts:90` with `indexOf('<!--')` + `slice` approach. Clears 2 CodeQL alerts (alerts #23 "Incomplete multi-character sanitization" + #24 "Bad HTML filtering regexp"). Behavior-equivalent on real worksheet input — only 1 occurrence of `<!--` in the entire current worksheet, in the intro section, not in any label line. Inline comment documents the intent: treat `<!--` as a line-comment terminator, not as one half of an HTML tag pair.

- **Local verification clean**: `supabase db reset` (all 15 migrations apply in correct order; 4 ai_draft_* columns present per local MCP probe; `schema_migrations` shows `20260518000000 → 20260518100000 → 20260518200000 → 20260519000000`) + 573/573 tests + type-check + lint all green.

- **Other claude bot findings rejected per user's own Codex triage** (concur with all rejections): `ai_draft_model` last-writer-wins (P3 — both models are `claude-opus-4-7` today, no real divergence); `user`/`supabaseClient: any` (pre-existing on `origin/main`); `SubmissionDetail` missing `ai_draft_metadata` field (type-doc only — `ReviewDetail` reads through `submissionData`, not the typed interface); merged JSONB not re-validated before write (P3 hardening, no current risk); duplicate Anthropic client + missing LLM timeouts + literal vocab values in tests + CLI `console.log` (all P3 nits, kickoff "don't refactor beyond task" applies).

**Decisions made:**

- **Rule-exception rename over reset-TEST-DB**. The `database-migrations` skill + `supabase/migrations/CLAUDE.md` explicitly say "NEVER edit a migration file that has been pushed." The skill offers two escape paths: (a) "create a new fix migration", or (b) "reset TEST DB". Neither fits this bug — (a) can't fix a back-sorted FILENAME (the back-sorted file would still be in the tree tripping `db push --dry-run`); (b) is heavyweight (~800 rows of TEST data) and unnecessary because no remote DB has the migration applied. The rule's spirit is "don't drift TEST/PROD" — that drift cannot occur when TEST has nothing applied. Documented the exception explicitly in the migration file header + commit message + a new bullet in Recent decisions covering the exception class. User pre-approved the rename approach in this session before any file changes.

- **Two fix-up commits, not one combined**. Cleaner git log + bisect; matches Session 43's "round-N fix-up pattern." Squash-merge collapses to one commit on main anyway.

- **Skipped Security Audit fix.** Pre-existing `@lhci/cli`/`tmp`/`postcss`/`basic-ftp`/`ip-address` chain (already in MEMORY.md hygiene-follow-ups). Not introduced by this PR. Belongs to a focused dependency-upgrade PR; outside this round's scope per `feedback_pr_bot_review_workflow.md` rule "default-reject hardening for internal-only."

**Process notes for Session 45+:**

- **Push bundle = 4 commits ahead of origin**: Session 43 docs (`4ef9cb0`) + rename (`fff430d`) + regex (`4ea642b`) + Session 44 docs. Per `feedback_no_docs_push_during_pr.md`, Session 43's docs commit rides along with the fix-ups instead of pushing standalone (avoid CI cycle on docs-only changes).

- **TEST DB verification fires when CI applies the renamed migration** (this is round 1 of bot review per `feedback_per_round_test_db_verification.md`). Required probes: 6/6 RPC body signals on `complete_review_atomic` (declare `v_ai_draft jsonb` + pluck from `lesson_submissions.ai_draft_metadata` + INSERT array passthrough for `activityType` + UPDATE array passthrough for `activityType` + INSERT tags from draft + UPDATE tags carry-forward) + tags column distribution unchanged on legacy rows (no NULL → [] flip) + 3-signal edge fn pattern (version + ezbr_sha256 + source-content grep for `loadCrfPrompt` AND `loadActivityTypePrompt` AND both `submit_tags` tool definitions) + 4-case submission smoke matrix (gated on `ANTHROPIC_API_KEY` set on TEST). The renamed migration is functionally identical to the original; TEST should apply cleanly on first try.

- **Watch the rebase-rename-sweep pattern** (newly captured in Recent decisions): when rebasing migrations onto a branch with newer-timestamp migrations, ALL files on the rebased branch with timestamps EARLIER than the rebase target's tip migration must be renamed, regardless of body-conflict status. Local `supabase db reset` won't catch the issue because it applies in version order — only `db push --dry-run` against TEST does. Single occurrence so far (Session 38's miss); promote to `feedback_*.md` if it recurs on a future rebase.

- **Round-cap rule applies after one more round**: this is round 1. Per kickoff PER-PR RITUAL step 10, after 2 rounds of bot review fix only critical bugs and ship. If a round-2 fires (next session if bots return after the push), apply the same rebuttal pass + four-surface query + per-round TEST DB re-verification.

- **Anticipated next-session shape**: (a) push bundle → wait for CI to apply migrations + run E2E + CodeQL clean → run TEST DB verification round 1 → if green and no new bot findings, await user merge approval; (b) if round 2 fires, apply same triage rules and re-verify.

### Session 43 — 2026-05-07 — PR 2 PUSHED + OPENED as #477 (CRF + activity_type only; tags LLM deferred)

**Done (1 fix-up code commit `233dfd3` + this session-end docs commit pending — local only per `feedback_no_docs_push_during_pr.md`):**

- **PR-scope decision settled.** Recommended (and user confirmed) shipping PR 2 with CRF + activity_type only and deferring tags LLM to a follow-up PR. Reasoning: tags column is brand-new from PR 1 with no historical reviewer-labeling, so the eval-gate methodology that anchored the prior two prompts (CRF on 353 reviewer-tagged rows, activity_type on 113 reviewer-tagged rows) doesn't apply. Tags sample-set decision (synthetic worksheet vs. organic post-deploy data vs. defer until reviewers tag enough lessons) gets its own PR after the question is answered. Trades scope-completeness in one PR for shorter time-to-deploy on the two prompts that ARE eval-gated and ready, plus avoids a half-eval-gated middle path for tags.

- **Pre-push code-reviewer agent dispatched** (`feature-dev:code-reviewer`, model=opus per `feedback_opus_subagents.md`) on `git diff main...HEAD` (~9,125 insertions / 224 deletions across 27 files). Prompt covered: PR scope + what's deferred + key files for special attention (CRF + activity_type LLM blocks, the dual-purpose `complete_review_atomic` migration, the `ai_draft_metadata` column-add migration, ReviewDetail draft-init reader, Zod canonical + Deno mirror equivalence) + what to look for (correctness, data-safety, logical inconsistency, scope creep) + what to de-prioritize (hardening, style, test-coverage). **Findings: 0 P0/P1, 3 P2, 3 P3.**

- **Triage applied (rebuttal pass per `feedback_bot_review_investigation.md`):**
  - **ACCEPTED P2-1 — rollback comment block** added to `20260516000000_lesson_submissions_ai_draft_metadata.sql`. Sibling migration already had the trailer; `supabase/migrations/CLAUDE.md` template specifies it as required. Pure compliance.
  - **ACCEPTED P2-2 — `NULL → []` flip on tags column** during approve_update for legacy lessons. The pre-fix COALESCE chain ended in `ARRAY[]::text[]`, flipping `v_existing.tags = NULL` to `[]` on every approve_update even though no tags writer ships in this PR. The INSERT path on line 263 uses `_phase4_jsonb_text_array_or_null` (returns NULL) — UPDATE was asymmetric. Fix: drop final `ARRAY[]::text[]` arm; COALESCE returns NULL when all three arms are NULL; `valid_tags` CHECK accepts NULL. UPDATE now matches INSERT.
  - **REJECTED P2-3** (Zod result.data discard in complete-review): pre-existing PR-1 code; per kickoff "don't refactor beyond task." Defense-in-depth value half-realized but not in scope.
  - **REJECTED P3-1** (CRF block comment phrasing on RMW direction): the comment is on the activity_type block (Step 4.6, labeled as such); reads fine in context. Agent's "ambiguity" call doesn't hold up against the surrounding cues.
  - **REJECTED P3-2** (CRF regex `header` vs `anywhere`): pre-existing CRF code from Task 2.3 step 5 (`67a3cd7`). Same scope-creep argument as P2-3.
  - **REJECTED P3-3**: agent itself flagged "not a real issue" — activity_type's lack of content gate is intentional (activity_type works on any submission body; CRF skip is pre-D9-template specific).

- **Pre-push verification clean:** `npm run type-check` + `npm run lint` + `npm run test` (573/573 passing) + `supabase db reset` (all migrations apply with the new COALESCE chain).

- **PR opened** at https://github.com/danfeder/esnyc-lesson-search-react/pull/477 with full description: scope summary (CRF + activity_type with eval gate metrics), what's deliberately deferred (tags LLM + Stage-1-gated prompts + reviewer picker UI), pre-push review summary (0 P0/P1, 2 P2 fix-ups applied, 4 rejected with rationale), 12-item Test plan checklist covering CI apply + complete_review_atomic body signals + edge function deploy verification + 4-case submission smoke matrix + round-cap rule.

**Decisions made:**

- **Cherry-pick approach NOT needed for this push** (unlike Session 38's PR 2 rebase). Branch was rebased clean against `bd9d6e4` in Session 38; no further rebase work needed before push.

- **Read-modify-write pattern accepted as-is** (not refactored to single-write-at-end). Reviewer agent dismissed this proactively per kickoff de-prioritization. Worth noting: pattern stays viable for Task 2.5 (tags) when it eventually ships — third writer reads merged-after-CRF-and-activity_type JSONB and overlays tags key. If 4+ writers eventually exist, refactor to accumulator-pattern; until then, RMW is fine.

- **Single fix-up commit** for both P2 changes (rather than amending each into the original commit). Nothing was pushed when the agent reviewed; amending was an option. Picked fix-up for transparency in local git log + traceability of "what was changed in review." Squash-merge collapses to one commit on main anyway.

- **Session-end docs commit lands locally only.** Per `feedback_no_docs_push_during_pr.md`: don't push session-end docs commits when a PR is open. Bundle with next fix-up push (or final pre-merge docs roll-up if no fix-ups needed). Avoids burning a CI cycle on docs-only changes.

**Process notes for Session 44+:**

- **Active-PR session-orientation rule applies** at session start. Status doc at session-end says "PR #477 open, awaiting bot reviews" — that's stale by next session because bots reviewed in the gap. Run `git log @{u}..HEAD` + `gh pr view 477 --json reviews,comments,state,mergeable` + `gh pr checks 477` BEFORE any other work. The four-surface query (`gh pr view --comments` + `gh api .../reviews` + `gh api .../comments` + `gh run view --log-failed`) is mandatory for "0 findings" claims (per `feedback_pr_comment_surfaces.md`).

- **TEST DB verification per-round.** First verification fires when CI applies the migrations (round 0 = PR open). Per `feedback_per_round_test_db_verification.md`, every subsequent round that produces DB-affecting fix-up commits needs its own re-verification — not just one-time at PR open. The 6-signal RPC body check + tags-column-distribution check + edge function 3-signal check are the load-bearing probes.

- **`ANTHROPIC_API_KEY` secret on TEST** is the gating prerequisite for any submission smoke testing. Without it, the LLM blocks gracefully skip and the smoke can only verify "no crash on missing key," not "drafts populate correctly." Confirm secret is set BEFORE running submission tests. Same will apply for PROD deploy.

- **Watch for the SASL flake** at the Apply step of `migrate-production.yml` AND the esm.sh CDN 522 flake at `deploy-edge-functions.yml` (per MEMORY.md hygiene-follow-ups). Both are recurring transient patterns; mitigation is `gh run rerun --failed <run_id>`. Approval gate behavior differs: SASL re-fires the gate (CLI re-handshakes), CDN doesn't (matrix slot has its own re-run path).

- **No code changes anticipated next session** unless bot rounds surface real findings. Prepare for: (a) zero-findings ship path (TEST DB verify → user PROD-merge approval → PROD verify), (b) 1-2 round fix-up cycle (re-dispatch fresh review per kickoff "every push that follows" rule, NOT just round 0).

### Session 42 — 2026-05-07 — PR 2 Task 2.4 step 4: activity_type prompt wired into process-submission edge function

**Done (1 code commit `5c6b7ea` + this session-end docs commit pending):**

- **Activity_type prompt wired into `supabase/functions/process-submission/index.ts`** (+129 lines). Module-level constants + loader: `ACTIVITY_TYPE_MODEL = 'claude-opus-4-7'`, `ACTIVITY_TYPE_PROMPT_URL` pointing to `./prompts/activity-type.md`, `loadActivityTypePrompt()` cache helper. New `ACTIVITY_TYPE_VALUES` import added to the existing `_shared/metadataSchemas.ts` import block.

- **Step 4.6 wire-up block** placed immediately after the CRF block (Step 4.5), before the duplicate-detection branch. Skip predicate is `!regenerateEmbedding` only — no body-content preflight (unlike CRF's "Cultural Responsiveness" header check) since activity_type works on summary + agenda + skills which every ESYNYC submission carries. Tool: `submit_tags` with `selected_values` array enum-restricted to `ACTIVITY_TYPE_VALUES` (4 values) + `uniqueItems: true`. Multi-label per D2.1.

- **Read-modify-write into `ai_draft_metadata`.** After Zod validation succeeds, the block SELECTs the existing `ai_draft_metadata` JSONB, spreads it into a new object, overlays the `activityType` key, and UPDATEs the row. CRF's writer at lines 404-411 of the merge-base does a plain UPDATE (overwrites the JSONB column wholesale); a second writer with the same pattern would drop CRF's `culturalResponsivenessFeatures` key. RMW preserves CRF's data without touching CRF's code. Sequential within the request — no race with CRF.

- **Failure paths**: Zod validation fail → log + skip write; SELECT fail → log + skip write; UPDATE fail → log + continue; outer try/catch → log + continue. Submission flow never blocks on tagging. Same shape as CRF.

- **Type-check + lint pass**: clean baseline before commit, clean after commit.

**Decisions made:**

- **RMW over alternatives** (`jsonb_set` raw SQL or refactor to single accumulator-write). Three options were on the table:
  - **(A) RMW (chosen)**: read existing JSONB, merge in JS, write back. One extra SELECT per writer. Simple, doesn't touch CRF. Scales to Task 2.5 (tags) by adding a third writer that reads the merged-after-CRF+activity_type JSONB.
  - **(B) `jsonb_set` raw SQL**: atomic, single round-trip, but requires raw SQL via `rpc()` or a helper function. Adds infrastructure for a problem that doesn't exist (no concurrency between writers within a single request).
  - **(C) Refactor to single end-of-flow write**: collect all prompt outputs in an in-memory accumulator, write once at the end. Cleanest at scale but requires touching CRF's commit (`67a3cd7`) which is already in the PR 2 chain. Kickoff guidance: "Don't add features, refactor, or introduce abstractions beyond what the task requires." Defer to Task 2.5 if multi-write round-trip cost becomes painful at 3+ writers.

  Picked (A) for minimal-diff + extension friendliness for Task 2.5. (C) is queued as a candidate refactor when 4+ writers exist and the round-trip cost is measurably painful.

- **No body-content skip predicate.** Considered mirroring CRF's regex check on the body content for activity_type — but the activity_type prompt explicitly works on summary + agenda + skills (the standard ESYNYC submission template), not on a specific section header. A submission with empty body produces noisy predictions but Zod still validates the array; cost is one wasted Anthropic call. Adding a predicate would cost more in maintenance than it saves in calls.

- **`ai_draft_model` column reflects the last writer.** When both CRF and activity_type fire, both writes hit `ai_draft_model = 'claude-opus-4-7'` so the column is identical regardless of order. If models diverge (e.g., a future Haiku-classified prompt), the column would only reflect the last writer. Schema accepts this for foundation phase; revisit when models actually diverge (Phase 2).

- **`submit_tags` tool name shared with CRF.** Both blocks declare a tool named `submit_tags` in separate Anthropic API calls. The two tool definitions have different enum lists (`ACTIVITY_TYPE_VALUES` vs `CULTURAL_RESPONSIVENESS_FEATURE_VALUES`); the prompt cache treats them as distinct cache slots based on the serialized tool definition + system prompt. No conflict.

**Process notes for Session 43+:**

- **PR 2 push decision required.** Session 41's "Next session picks up" framed Task 2.5 (tags) as the next coding task; with step 4 done, the user can choose to:
  - **(a) Open PR 2 now** with CRF + activity_type only. Tags ships as a small follow-up PR after Task 2.5's sample-set question is answered. Faster time-to-TEST for the two prompts that ARE eval-gated.
  - **(b) Continue to Task 2.5** (tags prompt + eval). Bigger PR scope, longer time-to-TEST, but ships all three vocab-locked prompts in one PR.
  Surface to user at session start.

- **Task 2.5 sample-set question is the highest-impact open decision.** Tags has no historical reviewer truth (the column is brand-new from PR 1). Three options:
  - **(i) Hand-curated synthetic worksheet (~30-50 lessons)**: reviewer-tags a small set across orientation / bilingual_handouts / neither for the canonical eval gate. ~1-2 hrs of user time.
  - **(ii) Skip canonical eval; smoke-test only**: ship the prompt without the eval gate's structured signal. Eval gate would have to come post-deploy when reviewer activity organically produces a sample set.
  - **(iii) Defer Task 2.5 entirely**: ship CRF + activity_type only; tags waits until reviewers have organically tagged enough lessons through the post-deploy review flow.
  Surface to user at session start.

- **Watch for the type-coupled cluster pattern** if Task 2.5 (or any Gate-C-classified vocab-locked prompt) introduces type-narrowing across edge function + Zod schemas + mappers. This session's wire-up was purely additive (one more loader + one more call site + one more Zod validate); no cluster invariants tripped. Same shape expected for Task 2.5 unless tags introduces something unusual.

- **TEST DB verification deferred until PR 2 push.** Per the per-round verification rule, verification fires when the PR opens (round 0) and after every fix-up round. Pre-push there is nothing on TEST or PROD that's affected by this session's local-only commit.

### Sessions 18-36 — archived

PR 2's earlier session entries (Sessions 18-27) and PR 1b's full implementation cycle (Sessions 28-36) live in `2026-05-03-metadata-rebuild-foundation-execution-status-archive.md`. Read on demand via `grep -n "Session N" archive.md` or targeted Read with offset/limit. Audit performed during the move (Session 37) surfaced 2 promotions to `feedback_pr_bot_review_workflow.md` (empirical-evidence-escalates pattern + active-PR session-orientation rule) and 1 watch-pattern preserved in Recent decisions (type-coupled cluster impl-plan flaw, single occurrence).
