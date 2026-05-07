# Metadata Rebuild — Foundation Phase — Execution Status

**Last updated:** 2026-05-07 — Session 37 (PR-cycle archival: Sessions 28-36 moved to archive; 2 patterns promoted to `feedback_pr_bot_review_workflow.md` — empirical-evidence-escalates and active-PR-session-orientation; PR 2 rebase remains next-session work).

> **About this file.** Active status carrying forward only what the next 1-2 sessions need to orient. Full per-session journal for Sessions 1-36 lives in `2026-05-03-metadata-rebuild-foundation-execution-status-archive.md` (~1600 lines, read on demand via grep). When a new PR cycle begins, that PR's session entries can move to the archive at the start of the following PR; the active file always reflects current PR + a small carry-forward roll-up.

## Current State

**PR #476 (PR 1b — D2.1 activity_type multi-select) SHIPPED + PROD-applied 2026-05-07.** Squash merge `bd9d6e4` on main. Both PROD workflows fired automatically on merge: `Production Database Migration` (run `25469722160`, all 4 jobs SUCCESS first attempt) + `Deploy Edge Functions` (run `25469722181`, 11/12 SUCCESS first attempt — only `complete-review` was modified by this PR; it succeeded). The 12th slot (`detect-duplicates`) failed on the documented `esm.sh` CDN 522 flake and reran clean via `gh run rerun --failed 25469722181`.

Round-3 bot review fired automatically on the round-2 fix-up's CI completion (3 voices: claude long-form constructive, claude[bot] state `COMMENTED` not `CHANGES_REQUESTED` with 4 follow-up findings, user's own Codex explicit "no blockers"). Round-cap critical-only rule applied; nothing met the bar; ship was correct.

**PROD MCP verification — 6/6 migration signals + 3-signal edge fn check, all green (Session 36):**
- Both migrations in `list_migrations`: `20260518000000_activity_type_multi_select` + `20260518100000_complete_review_atomic_activity_type_multi`.
- CHECK tightened: `CHECK (((activity_type IS NULL) OR (activity_type <@ ARRAY['cooking'::text, 'garden'::text, 'academic'::text, 'craft'::text])))`.
- 0 rows with `'both'`; 139 cooking+garden hybrid rows on PROD (TEST=135, ~3% PROD-fresher data drift, expected).
- `complete_review_atomic` source has UPDATE passthrough body; `lessons_normalize_write` trigger has `'both'` removed from allowed list (only in retirement comment).
- `complete-review` edge fn: version=4 (was 3), ezbr_sha256=`3fafd997ae454d17f0a8a8bf311f4ce4fc699818d357f9090386bb253603c4ba`, source contains the new Zod `safeParse` block + `reviewFormPayloadSchema` import + array-shape `activityType` enum in `_shared/metadataSchemas.ts`.

Pre-merge TEST DB verification (Session 34) — 6/6 PASS — and chrome-devtools-mcp visual smoke covering sidebar chips, multi-select pill behavior, ReviewDetail picker on scalar/array/multi-element fixtures all stand without re-verification (round-2 fix-up `7773ff5` was TS-only deletion; round-3 brought no DB-affecting changes).

**Branches:**
- `main` at `bd9d6e4` (PR 1b squash merge).
- `feat/metadata-foundation-activity-type-multi` (PR #476's merged branch) — deletable at convenience.
- `feat/metadata-foundation-llm-tagging` (PR 2) — 20 commits ahead of OLD main; needs rebase onto `bd9d6e4` next session. Paused.
- `feat/metadata-foundation-schema` (PR 1's merged branch) — also deletable at convenience.
- `docs/session-36-pr1b-shipped` (Session 36 status doc + Session 37 archival commit) — local-only, unpushed; carrier choice deferred to Session 38 (bundle into PR 2 rebase OR open small standalone docs PR).

**Foundation-phase substrate now live on PROD (post-PR-1 + PR-1b):**
- Schema: `lesson_format` dropped; `series_id` + `part_number` + `crf_confirmed` columns added; `activity_type` array-shape multi-select with closed enum at 4 values (`cooking / garden / academic / craft`); `tags` array column with closed enum; `cultural_responsiveness_features` closed to 7 Brown CR features.
- 3 CHECK constraints (`<@` containment, length-agnostic) + trigger value-validation helper.
- Zod canonical + bidirectional mappers + Deno mirror + `enums.json` + freshness CI test.
- Filter UI: `lessonFormat` removed; "Lesson Type" sidebar filter backed by `tags` (count badge `(0)` until tags added to `search_lessons` RETURNS TABLE — see follow-ups). Activity Type: 4-value multi-select chips, no `'both'`, no "Only" suffix.
- Edge functions: `complete-review` wired to Zod safeParse + array-shape `activityType`; `process-submission` has CRF prompt wired in (Session 26).

**Why PR 1b interrupted PR 2:** mid-Task-2.4 ground-truth resolution surfaced n=5/26 (~19%) multi-axis lessons; D2's original single-select was made on n=1 (Dr. Carver Lotion-Making). User retired `'both'` and switched to multi-element array. Decision journal D2.1.

**PR 2 rebase conflict expected:** PR 2's `20260517000000_*` and PR 1b's `20260518100000_*` both `CREATE OR REPLACE complete_review_atomic`; PR 2's older timestamp would apply BEFORE PR 1b's and get overwritten on a clean rebase. Resolution: rename PR 2's migration to a newer timestamp than `20260518100000_*` (e.g., `20260519000000_*`) AND re-fold PR 2's `tags` side-channel into PR 1b's array-passthrough body so the final RPC has both code paths. Verify post-rebase via `mcp__supabase-test__execute_sql pg_get_functiondef('complete_review_atomic'::regproc)`.

**Next session picks up:**
- **PR 2 rebase** onto `bd9d6e4`. `git checkout feat/metadata-foundation-llm-tagging && git rebase main`. Conflict resolution per above. Verify via TEST MCP.
- **Bundle Sessions 36 + 37 docs commits.** Cherry-pick from `docs/session-36-pr1b-shipped` onto rebased PR 2 branch, OR open a small standalone docs PR. Deferred from this session.

**`npm run type-check` + `npm run lint` green at main `bd9d6e4`.** 546/546 unit tests passing.

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

### Sessions 18-36 — archived

PR 2's earlier session entries (Sessions 18-27) and PR 1b's full implementation cycle (Sessions 28-36) live in `2026-05-03-metadata-rebuild-foundation-execution-status-archive.md`. Read on demand via `grep -n "Session N" archive.md` or targeted Read with offset/limit. Audit performed during the move surfaced 2 promotions to `feedback_pr_bot_review_workflow.md` (empirical-evidence-escalates pattern + active-PR session-orientation rule) and 1 watch-pattern preserved in Recent decisions (type-coupled cluster impl-plan flaw, single occurrence).
