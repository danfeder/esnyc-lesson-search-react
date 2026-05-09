# Metadata Rebuild — Foundation Phase — Execution Status

**Last updated:** 2026-05-08 — Session 57 (PR #479 Round 2 bots triaged → all DEFER/REJECT; 5/5 TEST DB probes pass; deploy-preview spot-check pass; ready for merge approval).

> **About this file.** Active status carrying forward only what the next 1-2 sessions need to orient. Full per-session journal for Sessions 1-51 lives in `2026-05-03-metadata-rebuild-foundation-execution-status-archive.md` (read on demand via grep). When a new PR cycle begins, that PR's session entries move to the archive at the start of the following PR; the active file always reflects current PR + a small carry-forward roll-up.

## Current State

**PR 3a (search infra) — PR #479 OPEN, READY FOR MERGE APPROVAL.** `feat/metadata-foundation-search-infra-3a` branched off `main` at `03970d0` (PR 4 squash-merge); HEAD = `87f0267` matches origin (no unpushed commits — the Session 56 push bundled all 3 prior commits as planned). Recent commits: Session 54 Task 3a.3 ship (`81b5d2e`) → Session 55 Task 3a.4 ship (`4595235`) → Session 56 docs (`0b34348`) → **Session 56 Round-1 fix-ups (`010f0ea`) — Apple Story drift repair migration + _flatten_academic_concepts defensive guard migration + smart-search fetchSynonyms try/catch fallback** → Session 56 docs (`87f0267`). Type-check + lint clean baseline. PR at https://github.com/danfeder/esnyc-lesson-search-react/pull/479.

**CI status:** all green except known-baseline Security Audit (`@lhci/cli` chain — recurring per MEMORY.md hygiene follow-ups). E2E Tests now PASS (Apple Story drift fix repaired the Round-1 P1 blocker). `claude-review`, `claude-database-review`, Test & Build, Lighthouse, Bundle Analysis, CodeQL, Test Coverage, Deploy Preview, Deploy to TEST — smart-search, semgrep — all PASS.

**Round 2 bot reviews — landed + triaged Session 57; all DEFER or REJECT (no fix-up commits needed):**
- **Codex Round 2** (posted by danfeder against `87f0267`): explicit "No new blocking findings from me." Codex P1 (Apple Story) + Codex P2 (`_flatten_academic_concepts` guard) confirmed fixed. CI E2E logs show `Finished supabase db push` then `50 passed / 3 skipped` — clears the prior TEST migration blocker. One nit (future-dated `2026-05-11` in drift-repair-2 migration comment) REJECTED — refers to precedent migration's filename timestamp `20260511120000_*` per project's future-dated-timestamp convention, not a calendar audit date; can't edit pushed migration anyway.
- **Claude long-form Round 2:** 7 findings, all P2/P3, all deferred:
  - **P2 #1 (per-request synonym fetch, no caching):** DEFER — claude's own framing "follow-up rather than blocker"; ~73 rows, current scale negligible; gracefully degrades via Round 1 try/catch. Out-of-scope follow-up logged.
  - **P2 #2 (broad `hispanic`/`halloween` token expansions):** ACCEPTED via spot-check — locked tradeoff, eyeball-validated on deploy preview Session 57. See spot-check verdict block below.
  - **P2 #3 (`GRANT ALL TO anon` on `_flatten_academic_concepts`):** DEFER — claude's framing "matches existing patterns in the codebase, so not a blocker"; broader grant cleanup is its own work. Out-of-scope follow-up logged.
  - **P3 #4 (per-call `byTerm` / `bidirectionalBySynonym` map builds):** DEFER — claude framing "non-issue at scale"; coupled with P2 #1.
  - **P3 #5 (double `CASE WHEN jsonb_typeof` evaluation in flatten_safer):** DEFER — IMMUTABLE function; Postgres can constant-fold; cost = 0. Pushed migration, can't edit per skill rule.
  - **P3 #6 (inconsistent VALUES casts in seed migration):** DEFER — standard Postgres pattern (first row establishes types for CTE); cosmetic; pushed migration.
  - **P3 #7 (missing non-object fixtures in `test-prepare-lesson-text.mjs`):** DEFER — already noted in Session 56 follow-ups; SQL function tested locally with 10 inputs.

**5/5 TEST DB verification probes — ALL PASS Session 57** (per `feedback_per_round_test_db_verification.md` — re-verified after CI re-applied migrations to TEST):
1. **Apple Story key strip** ✅ — `lesson_2d43fc766fa14401b48065f167003ded`: `metadata ? 'seasonTiming' = false`, `column_array_len = 0`, `metadata->'seasonTiming' = null`. The drift-repair-2 migration successfully stripped the non-canonical key.
2. **`_flatten_academic_concepts` guard** ✅ — function body contains `CASE WHEN jsonb_typeof(p_concepts) = 'object' THEN p_concepts ELSE '{}'::jsonb END` wrapping both `jsonb_each` calls. Function signature unchanged.
3. **`search_synonyms` count** ✅ — 73 rows (60 existing + 13 new from seed migration).
4. **6-term tsquery validity** ✅ — all 6 affected terms (christmas / thanksgiving / halloween / easter / latino / hispanic) produce valid tsquery via `to_tsquery('english', expand_search_with_synonyms(...))`. No syntax errors.
5. **CHECK constraint rejection** ✅ — multi-word INSERT raises `check_violation` as expected.

**Deploy-preview spot-check Session 57 (claude P2 #2 ASK):**
- **`hispanic`** (227 results, 30% of corpus): top 4 = literal "Hispanic Heritage Month" lessons (Honduran/Mexican); top 5-10 = Latin American/Spanish content; tail brings in African American / North American lessons via `american` token expansion. Relevance ranking puts on-target results first.
- **`halloween`** (289 results, 38% of corpus): top 7 = pumpkin-themed lessons (exactly what a teacher wants); top 8+ = Fall garden lessons via `fall` expansion + cultural celebrations via `celebration` expansion (Eid, Pesto Celebration). Broad but ranked below on-target.
- **Verdict:** ship-acceptable. Locked tradeoff lives up to its billing — way better than the pre-fix state where these searches emitted 500s on every request.

**Pre-merge gate:** user approval to merge. Once merged, PROD migration workflow triggers → manual approval gate → migrations apply → MCP verification on PROD via the same 5 probes against `mcp__supabase-remote__execute_sql`.

**Foundation-phase substrate live in PROD:** PR 1 + PR 1b + PR 2 + PR 4 all shipped + PROD-applied + verified. PR 4's full substrate (soft-retire columns + 21 retired imports + 7 concept-recovery rows + FSA Pt 1 retitle + 8 user-facing filter surfaces) verified Session 51 via 9-probe MCP query. Stage 1 worksheets DO NOT YET EXIST (verified Session 51 post-merge); PR 5 stays gated until heritage + concepts worksheets land.

**PR 3a task status:**
- ✅ Task 3a.1 — smart-search drift resolution decision (Option B locked Session 52).
- ✅ Task 3a.2 — search_vector regeneration shipped Session 53 (`9a21354`).
- ✅ Task 3a.3 — generate-embeddings includes academicConcepts shipped Session 54 (`81b5d2e`).
- ✅ Task 3a.4 — smart-search refactor + seed migration shipped Session 55 (`4595235`); PR #479 opened.
- ✅ Task 3a.5 — PR ritual completed Session 57: Round 1 fix-ups (`010f0ea`) → Round 2 bot reviews triaged (all defer/reject) → 5/5 TEST DB probes pass → spot-check pass. **Awaiting merge approval only.**

**Round 1 + Round 2 fix-ups + sub-decisions:** historical detail captured in commits `010f0ea` (Round 1 fix-ups), `4595235` (Task 3a.4 main), and migration body comments (`20260520120000_*` Apple Story drift repair, `20260522000000_*` synonym seed + CHECK constraint, `20260523000000_*` flatten guard). Round-2 triage detail above. Session 56 + 57 entries below have the full investigation chain.

**Remaining foundation-phase PRs in scope:**
- **PR 3a** (this work, PR #479 open): `search_vector` + embeddings + smart-search drift fix.
- **PR 3b** (later): `search_synonyms` population with concept-derived everyday↔framework pairs. Folds into PR 6+; depends on Stage 2 re-tag outputs.
- **PR 5+** (later): D4 vocab canonicalization (Title Case canonical across ~10 vocab fields; Pydantic on all 17 fields). **Depends on Stage 1 worksheet outputs** — gated until at least heritage + concepts worksheets land.
- **PR 6+** (later): Stage 2 corpus re-tag + reviewer validation flow.

**Stage 1 worksheet round** is its own multi-session initiative, not a single PR. Per design doc §4 it's a separate parallel work track. When started, scaffold the four-file pattern (design + impl plan + kickoff prompt + status doc) per `feedback_multi_session_execution.md` rather than rolling it into the foundation-phase status doc. Heritage is first (~78 values); concepts (~211 values, biggest) second; ~8 smaller fields after.

**Branches:**
- `main` at `03970d0` (PR 4 squash-merge); origin matches.
- `feat/metadata-foundation-search-infra-3a` — current PR 3a branch (PR #479 open). HEAD = `87f0267` matches origin. 11 commits ahead of `main`. Awaiting merge approval.
- Stale branches deletable at convenience: `feat/metadata-foundation-corpus-cleanup` (PR #478 merged), `feat/metadata-foundation-llm-tagging`, `backup/feat-metadata-foundation-llm-tagging-pre-rebase`, `docs/session-36-pr1b-shipped`, `feat/metadata-foundation-activity-type-multi`, `feat/metadata-foundation-schema`.

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

- **`generate_lesson_search_vector` is now dead code in the trigger path.** Session 53 Task 3a.2 rewrote `update_lesson_search_vector()` to inline the setweight chain (so it can call `_flatten_academic_concepts` for the new C-weight block). The legacy `generate_lesson_search_vector(...)` immutable helper is no longer called from anywhere in the codebase (verified via grep across `supabase/migrations/`, `supabase/functions/`, `scripts/`, `src/`); it's still GRANT'd to anon / authenticated / service_role for any hypothetical external consumer. Cleanup option: drop the function + revoke its grants in a small follow-up migration if confidence is high that no Supabase Studio query / one-off ad-hoc tool calls it. Low-priority hygiene; keeping the function around costs a few hundred bytes of catalog state. (Source: Session 53 Task 3a.2.)

- **`scripts/generate-embeddings.mjs` `--test` mode is end-to-end broken.** Hardcoded URL at line 49 (`epedjebjemztzdyhqace.supabase.co`) points to a deleted Supabase project; the matching `TEST_SUPABASE_SERVICE_KEY` in `.env` is also stale per `project_test_key_stale.md`. The current TEST project is `rxgajgmphciuaqzvwmox`. So `node scripts/generate-embeddings.mjs --test --dry-run` cannot connect. Fix options: (a) update both the hardcoded URL AND have user refresh the env var, (b) replace `--test` with a `VITE_SUPABASE_URL=...` env-var-driven approach matching the rest of the script's conventions, (c) remove `--test` entirely and rely on the `VITE_SUPABASE_URL` + `requireNonProd` guard pattern alone. Surfaced Session 54 when the planned Task 3a.3 verification path turned out to be blocked. Out of scope for Task 3a.3 per "a bug fix doesn't need surrounding cleanup"; worth a focused script-hygiene PR. (Source: Session 54.)

- **`data/consolidated_lessons.json` is stale and predates `academicConcepts`.** 831 lessons from 2024-11-18, used by `npm run import-data` for local seeding. Predates the v3 batch tagging run that populated `academicConcepts` (2025-07-10) — 0 of 831 rows have populated concepts. Local-seeded verification of any concept-handling code path (or other v3-era metadata fields) is unreliable from this file. Fix: re-export from current PROD or TEST and replace; or build a fresh seed pipeline. Out of scope; surfaced Session 54 when evaluating local-seed verification path for Task 3a.3. (Source: Session 54.)

- **Pre-existing key-name drift in `scripts/generate-embeddings.mjs:prepareLessonText`.** Current code reads `lesson.metadata.thematicCategory` (singular) and treats `lesson.metadata.culturalHeritage` as a string. Canonical post-PR-1 schema uses `thematicCategories` (plural, array) and `culturalHeritage` (often array). For modern submission-era / post-B-update rows, those `if` branches silently emit nothing because the key access returns `undefined`. Effect: embeddings for modern rows miss the theme + heritage signals entirely. Pre-existing (predates foundation phase, predates Zod canonical). Fix: align key names with canonical schema + array-vs-string handling. The new `scripts/test-prepare-lesson-text.mjs` harness can be extended with plural-shape fixtures once fixed. Out of scope for Task 3a.3 per "a bug fix doesn't need surrounding cleanup"; worth a focused embeddings-hygiene PR. (Source: Session 54.)

- **Pre-existing dead inner `if` in `smart-search/index.ts` prefix-variant block.** Lines 70-77 of refactored `smart-search/index.ts` contain `if (term.length > 4) { expandedTerms.add(term.substring(0, term.length - 1)); expandedTerms.add(term + 's'); if (term.endsWith('s')) { expandedTerms.add(term.substring(0, term.length - 1)); } }`. The inner `if` block adds a value already added 3 lines earlier (Set no-op). Surfaced by pre-push code-reviewer agent on PR #479. Confirmed pre-existing at `81b5d2e:smart-search/index.ts:100-104`; refactor preserved verbatim per the locked B-b "preserve current behavior" decision. Comments in OLD code ("Remove last character" then "Remove plural") suggest the author intended `-es` or `-ies` plural-specific stripping that was never actually implemented. Real fix needs investigation of the original intent + decision on whether to implement the suggested stripping or just remove the dead branch. Out of scope for Task 3a.4 per kickoff "A bug fix doesn't need surrounding cleanup"; worth a focused smart-search hygiene PR alongside any related work. (Source: Session 55 pre-push review.)

- **`expand_search_with_synonyms` SQL function still has the `\s`-matches-`\x1f` regex flavor.** The function only OR-joins synonym arrays with spaces between elements; the new CHECK constraint added in PR 3a Task 3a.4 prevents whitespace from entering the data, so the function's output stays valid for `to_tsquery` post-PR-3a. But if a future contributor disables the constraint temporarily (e.g., for a data migration) and inserts whitespace-bearing values, the SQL function would silently emit broken tsquery output. Belt-and-braces fix: have the SQL function explicitly tokenize each synonym on whitespace before OR-joining, so it produces valid tsquery regardless of input. Defensive only; not needed today. (Source: Session 55.)

- **Senior-dev's E'\x1f' separator suggestion empirically wrong; documented in migration body.** The PR 3a Task 3a.4 senior-dev consult recommended `array_to_string(synonyms, E'\x1f')` for the CHECK constraint expression because they assumed Unit Separator (0x1f) is a non-printable non-whitespace separator. Local diagnostic probe revealed Postgres' AREs treat `\x1f` (and other low-ASCII control chars) as whitespace, despite POSIX C locale not classifying them as such. The migration uses empty separator `''` instead with full rationale in body comments. Worth documenting somewhere durable that "E'\x1f' is matched by `\s` in PG regex" so future contributors don't repeat the mistake — could go in the migration body, in a hypothetical regex-cheatsheet comment in `_shared/`, or as a lint rule. Low priority. (Source: Session 55.)

- **Missing unit-test coverage for `expandSearchTerms` (smart-search/index.ts).** Surfaced by claude-review on PR #479 round 1. The refactored signature `expandSearchTerms(query, synonyms)` accepts an in-memory `SynonymRow[]` and is fully testable in isolation (no DB dependency). Cleanest path: Vitest spec covering (a) bidirectional reverse lookup, (b) oneway one-direction expansion, (c) typo_correction expansion, (d) prefix-variant behavior for >4-char terms, (e) plural-munging branch (or empty array if the dead inner `if` is removed first). Out of scope for the round-1 fix-up; worth a focused smart-search hygiene PR alongside the dead-`if` cleanup follow-up already on this list. (Source: Session 56 PR #479 round 1.)

- **`test-prepare-lesson-text.mjs` not in CI / fixture ordering assumption.** Surfaced by claude-review on PR #479 round 1. The standalone harness is functional locally but isn't wired into `npm run test`, so it won't catch shape regressions in CI. Two paths: (a) add `package.json:test:embeddings` script + invoke from CI, or (b) port the 4 fixtures to Vitest. The fixture ordering assumption (assertions check substring `'Concepts: Arts, visual arts, Science, ...'` which depends on `Object.entries` insertion order) only matters if the harness is ever run against live DB data — V8 preserves insertion order for inline string-keyed object literals, so the in-tree fixtures stay deterministic. Out of scope for the round-1 fix-up; bundle with the broader test-coverage hygiene PR. (Source: Session 56 PR #479 round 1.)

- **tsquery operator injection from `search_synonyms` rows (defensive only, no current risk).** Surfaced by claude-review on PR #479 round 1. `buildSmartSearchQuery` appends `:*` to each term without sanitizing tsquery-special characters (`|`, `&`, `!`, `<`, `>`, `(`, `)`). The new CHECK constraint blocks whitespace but not those operators. Real risk minimal because only admins write to `search_synonyms` (RLS denies anon/authenticated INSERT; service-role-only). Worth considering an additional CHECK condition `term !~ '[|&!<>()]' AND array_to_string(synonyms, '') !~ '[|&!<>()]'` for defense in depth if a future migration ever needs to add tsquery-syntactically-fragile terms. Defensive only; no current need. (Source: Session 56 PR #479 round 1.)

- **Per-request `search_synonyms` fetch in smart-search edge fn (no caching).** Surfaced by claude-review on PR #479 round 2 (P2). `fetchSynonyms()` hits the DB on every search request; table is ~73 rows + changes only via migrations — near-perfect candidate for module-level caching with a TTL or simple in-memory singleton. Cache miss already degrades gracefully via the Round 1 try/catch. Round 2 framing: "follow-up rather than blocker given the locked B-b decision." Couples with another Round 2 P3 finding: `byTerm` / `bidirectionalBySynonym` maps are rebuilt on every `expandSearchTerms` call — would hoist naturally above the function once caching lands. Bundle both into a focused smart-search caching PR if synonym reads ever become measurable. (Source: Session 57 PR #479 round 2.)

- **`GRANT ALL ON FUNCTION _flatten_academic_concepts TO anon`** is over-permissive for an internal trigger helper. Surfaced by claude-review on PR #479 round 2 (P2). External callers don't need it (only the FTS trigger calls the function). `GRANT EXECUTE TO authenticated, service_role` (or no anon grant) would align with least-privilege. Matches existing project patterns (other `text[]` helpers grant similarly), so not a blocker on this PR. Worth a broader function-grant audit if least-privilege cleanup becomes a focused initiative. (Source: Session 57 PR #479 round 2.)

- **Project convention: future-dated migration filename timestamps are intentional.** Codex Round 2 of PR #479 flagged the `20260520120000_*` migration's body comment "Apple Story did not have lessonFormat at audit time on 2026-05-11" as an inconsistent/future date. Resolution: 2026-05-11 references the precedent migration's filename timestamp `20260511120000_*`, not a calendar audit date — the project deliberately uses near-future timestamps to guarantee correct sort ordering for new migrations. Future bot reviewers may flag similar dates; the convention is real but undocumented. Could go in `supabase/migrations/CLAUDE.md` as a "you'll see future dates in migration filenames; it's intentional" note. Trivial. (Source: Session 57 PR #479 round 2.)

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

### Session 57 — 2026-05-08 — PR #479 Round 2 triaged + 5/5 TEST DB probes pass + spot-check pass; awaiting merge approval

**Done (no code commits — verification + triage + status doc refresh):**

- **State reconciliation at session start.** Status doc claimed 3 unpushed commits; git showed HEAD = origin (`87f0267`). Trusted git per kickoff "if they diverge, trust git, then update the status file to match reality." Confirmed via `git log @{u}..HEAD` (empty) + PR #479 `gh pr view` (state OPEN, latest comment from Codex Round 2 against `87f0267`).

- **Round 2 bot review collection (4-surface query per `feedback_pr_comment_surfaces.md`):**
  - `gh pr view 479 --comments` (issue-comments) — 7 total: 3 automated (netlify deploy preview / e2e dry-run / edge fn deploy) + 4 substantive (claude long-form Round 1 + Codex Round 1 by danfeder + claude long-form Round 2 + Codex Round 2 by danfeder).
  - `gh api .../pulls/479/reviews` — empty (no formal review summaries).
  - `gh api .../pulls/479/comments` (line-attached) — empty.
  - `gh pr checks 479` — E2E Tests now PASS (was Round-1 P1 blocker, now repaired by drift-repair-2 migration); all CI green except known-baseline Security Audit (`@lhci/cli` chain per MEMORY.md hygiene).

- **Round 2 findings triaged with rebuttal pass per `feedback_bot_review_investigation.md`:**
  - **Codex Round 2 (`87f0267`):** explicit "No new blocking findings from me." Codex P1 + P2 confirmed fixed via the drift-repair-2 + flatten-safer migrations. CI E2E logs show `Finished supabase db push` then `50 passed / 3 skipped`. One nit on future-dated 2026-05-11 in drift-repair-2 comment — REJECTED as project-convention misread (filename timestamp reference, not calendar date; pushed migration anyway).
  - **Claude Round 2:** 7 findings, all P2/P3, all DEFER:
    - P2 #1 per-request synonym fetch (no caching) → DEFER per claude's own framing "follow-up rather than blocker"; OOS follow-up logged.
    - P2 #2 broad token expansions (hispanic/halloween) → ACCEPTED via deploy-preview spot-check (see below).
    - P2 #3 `GRANT ALL TO anon` on `_flatten_academic_concepts` → DEFER (matches existing pattern); OOS follow-up logged.
    - P3 #4 per-call map builds → DEFER (claude framing "non-issue at scale"; coupled with P2 #1).
    - P3 #5 double `CASE WHEN jsonb_typeof` → DEFER (IMMUTABLE function, Postgres can constant-fold; pushed migration can't edit).
    - P3 #6 inconsistent VALUES casts → DEFER (standard Postgres pattern; cosmetic; pushed migration).
    - P3 #7 missing non-object fixtures in `test-prepare-lesson-text.mjs` → DEFER (already on Session 56 follow-ups list).
  - **Round-cap rule applied:** "after 2 rounds, fix only critical bugs." None of Round 2's findings qualify; default-reject hardening per `feedback_pr_bot_review_workflow.md`. No fix-up commits this round.

- **5/5 TEST DB verification probes — ALL PASS** (per `feedback_per_round_test_db_verification.md` + `feedback_verbatim_identifiers_in_probes.md` for verbatim lesson_id + term values copied from migration source files):
  1. Apple Story (`lesson_2d43fc766fa14401b48065f167003ded`) `seasonTiming` key stripped: `metadata ? 'seasonTiming' = false`, `column_array_len = 0`, `metadata->'seasonTiming' = null`.
  2. `_flatten_academic_concepts` body contains `CASE WHEN jsonb_typeof(p_concepts) = 'object' THEN p_concepts ELSE '{}'::jsonb END` wrapping both `jsonb_each` calls; signature unchanged.
  3. `search_synonyms` total count = 73 (60 existing + 13 new).
  4. All 6 affected terms (christmas / thanksgiving / halloween / easter / latino / hispanic) produce valid tsquery via `to_tsquery('english', expand_search_with_synonyms(...))` — no syntax errors. Sample: `halloween` → `'celebr' | 'fall' | 'halloween' | 'octob' | 'pumpkin'`.
  5. CHECK constraint `search_synonyms_lexemes_no_whitespace` rejects multi-word INSERT (raises `check_violation`) — verified via DO block with explicit exception handler.

- **Deploy-preview spot-check (claude Round 2 P2 #2):** ran `hispanic` and `halloween` searches against `https://deploy-preview-479--esynyc-lessonlibrary-v2.netlify.app` via `chrome-devtools-mcp`:
  - **`hispanic`:** 227 results (30% of 751-row corpus). Top 4 = literal "Hispanic Heritage Month" lessons (Honduran/Mexican); top 5-10 = Latin American/Spanish content (Tex-Mex, Tostones, Tortilla Espanola, Pupusas); tail brings in African American / North American lessons via `american` token expansion. Relevance ranking puts on-target results first.
  - **`halloween`:** 289 results (38% of corpus). Top 7 = pumpkin-themed (Pumpkin Muffins, All About Pumpkins, Yogurt Pumpkin Pie Dip, etc.) — exactly what a teacher would want; top 8+ = Fall garden lessons via `fall` expansion + cultural celebrations via `celebration` expansion (Eid, Pesto Celebration). Broad but ranked below on-target.
  - **Verdict:** ship-acceptable. Locked tradeoff lives up to its billing — way better than the pre-fix state where these searches emitted 500s on every request.

- **Status doc refreshed:** Current State header rewritten to reflect "ready for merge approval" + 5/5 probes pass + spot-check pass; Round 1/2 historical detail blocks trimmed (commit messages + Session 56/57 entries cover the investigation chain); Branches block updated (HEAD matches origin, 11 commits ahead of main); 3 Round-2 OOS follow-ups added.

**Decisions made:**

- **Round-cap stop point applied.** Both bot voices independently agreed at Round 2: Codex explicit "No new blocking findings"; claude P2 + P3 hardening explicitly framed as follow-ups. No P1 either round; no shared findings between Codex and claude Round 2 — strong convergence-absence signal that we're at the natural ship line. Round-3-or-later would need a critical bug, not more hardening.
- **Spot-check via chrome-devtools-mcp over MCP DB probe.** User chose chrome-devtools when offered three spot-check options; preserved fidelity (real frontend, real ranking, real result list) over speed. Took ~3 minutes including page load. Worth the time for a P2 product-QA judgment call where ranking matters.

**Process notes / observations:**

- **State-vs-doc divergence is a recurring orientation hazard.** Status doc claimed 3 unpushed commits at session start; git was authoritative truth (commits had been pushed by Session 56 close). Per `feedback_pr_bot_review_workflow.md` already on the candidate list — this is roughly the 5th occurrence across PR cycles. Reinforces the "verify against `git log @{u}..HEAD` AND `gh pr view` before proceeding" rule. The fix is mechanical (kickoff prompt's session-start ritual step 5 already prescribes the verification), so nothing to change in process — just keep doing it.

- **Two-bot consultation pattern not used this session.** Decisions were unambiguous (round-cap on default-reject hardening + spot-check via deploy preview); no fresh-agent consultation needed. Pattern is for non-trivial decisions with multiple plausible options; round-2 triage when both bots agree on "follow-up only" doesn't qualify.

- **Chrome-devtools-mcp spot-check pattern, first use this initiative.** Worked cleanly: `list_pages` → `navigate_page` → `wait_for` (text-based; cheaper than `take_snapshot` for "is the page loaded" check) → `take_snapshot` (used implicitly via `wait_for` follow-on snapshot) → `fill` on input uid → `wait_for` (results loaded) → re-snapshot to read result text → `click` Clear button → `fill` next query. The accessibility-tree snapshot gave clean readable result lists with grade band + title + summary in single text labels — no screenshot needed for textual results inspection. Low cost; high-value for any future PR where a user-facing search/filter behavior change needs an eyeball check before merge.

**Process notes for Session 58+:**

- **Awaiting user merge approval.** Ready-state confirmed: 5/5 TEST probes pass, deploy preview spot-check pass, all CI green except known Security Audit baseline, both bot voices at "no blockers." Per kickoff "What never to do without explicit user instruction: Merge a PR" — wait for user.

- **Post-merge PROD verification mandatory** (per kickoff data-safety rules + `feedback_data_safety_top_priority.md`): once user approves the merge AND the PROD migration workflow's manual approval gate is approved, re-run the same 5 probes against `mcp__supabase-remote__execute_sql`. Plus re-run `mcp__supabase-remote__get_edge_function smart-search` and verify (a) version increment, (b) `ezbr_sha256` change vs prior version, (c) source content grep for the new `fetchSynonyms` function definition (per MEMORY.md hygiene "edge function deploy false-success" pattern). PR 1's PROD deploy (Session 51) confirmed this 3-signal verification is reliable.

- **Watch for migrate-production SASL flake** (per MEMORY.md hygiene). Apply-step variant has hit twice in this initiative (PR #446 + #468); rerun `gh run rerun --failed <run_id>` is the working mitigation. PR 3a has 5 pending migrations to apply; if any one of them gets the SASL handshake collision, it's a transient retry-resolvable failure, not a real apply failure — verify post-rerun via PROD MCP.

- **PR cycle close ritual (do at start of next PR cycle, not now per kickoff §session-end §5):** when starting the next branch, archive PR 3a session entries (52-57) into the archive file. None of Session 52-57 surfaced new feedback memories worth promoting (state-vs-doc divergence is already a candidate in `feedback_pr_bot_review_workflow.md`; chrome-devtools-mcp spot-check is a one-occurrence pattern, watch for recurrence before promoting).

### Session 56 — 2026-05-08 — PR #479 Round 1 fix-ups shipped (Apple Story drift + _flatten guard + smart-search fallback)

**Done (1 fix-up commit + this Session-56 docs commit, both unpushed; bundle with prior unpushed Session-55 docs in next push):**

- **Round 1 bot reviews investigated (4-surface query per `feedback_pr_comment_surfaces.md`):**
  - `gh pr view 479 --comments` (issue-comments) — Netlify deploy preview / TEST DB dry-run / edge fn deploy / claude-review long-form / Codex pass-by-danfeder
  - `gh api repos/.../pulls/479/reviews` — empty (no formal review summaries)
  - `gh api repos/.../pulls/479/comments` (line-attached) — empty (no inline review comments)
  - `gh pr checks 479` — E2E Tests RED (P1 blocker), Security Audit RED (known baseline), claude-review/claude-database-review/Test & Build/Test Coverage/Bundle/Lighthouse/CodeQL all green

- **Round 1 findings triaged with empirical investigation per `feedback_bot_review_investigation.md`:**
  - **Codex P1 (BLOCKER) — confirmed via 4 MCP probes + CI log inspection:**
    - TEST + PROD audit: Apple Story (`lesson_2d43fc76...`) is the ONLY drifted row on both surfaces (`metadata.seasonTiming = ["end-of-year"]` + empty column).
    - Migration history probe: `supabase_migrations.schema_migrations` on TEST shows applied through `20260520030000` only — `20260521000000` rolled back cleanly mid-apply.
    - CI log: confirmed exact failure path — `lessons_normalize_write` derives `season_timing = {end-of-year}`, `valid_seasons` CHECK rejects, statement 8 aborts.
    - Trigger logic confirmed: §G uses derive-from-metadata only when column is empty (Apple Story's case).
  - **Codex P2 (defensive) — confirmed zero current impact via 2 MCP probes:** TEST 684 object + 88 SQL-NULL; PROD 697 object + 91 SQL-NULL. No JSON null / array / string / number rows. Defensive harden only.
  - **Claude Medium (resilience) — confirmed via `smart-search/index.ts` code read:** `fetchSynonyms` throws → outer catch (line 186-198) returns 500. Pre-refactor TS dictionary made expansion infallible.
  - **Claude Medium #4 (anon SELECT not verified) — REJECTED:** verified Session 55 + Codex agrees.
  - **Claude Low items — REJECTED** per default-reject-hardening rule.

- **3 fix-ups (commit `010f0ea`):**
  - `supabase/migrations/20260520120000_season_timing_drift_repair_2.sql` — slots BEFORE `20260521000000`; pattern-based seasonTiming key strip; mirrors PR #475 round 2 precedent (`20260511120000_season_timing_drift_repair.sql`) minus `lessonFormat` predicate (defunct post-PR-1).
  - `supabase/migrations/20260523000000_flatten_academic_concepts_safer.sql` — slots AFTER `20260522000000`; `CREATE OR REPLACE` adds `CASE WHEN jsonb_typeof(p_concepts) = 'object' THEN p_concepts ELSE '{}'::jsonb END` wrapper around both `jsonb_each` calls.
  - `supabase/functions/smart-search/index.ts` — try/catch around `fetchSynonyms` call only; failures degrade to empty `synonyms` array (no expansion); restored prior resilience.

- **Local validation:**
  - `supabase db reset` clean (all 3 migrations + 2 new fix-up migrations apply).
  - Migration B helper test: 10 input shapes (NULL / JSON null / `[]` / `[1,2,3]` / `"hello"` / `42` / `true` / `{}` / canonical / non-array value) — all pass without erroring; canonical output unchanged.
  - Migration A WHERE-clause test: 10 cases (5 drift / 5 non-drift) — predicate matches drift only, leaves canonical / column-populated / empty-array / absent-key alone.
  - `node scripts/test-prepare-lesson-text.mjs` — 4/4 PASS.
  - `npm run type-check && npm run lint` — clean.
  - `npm run test:rls` — 5/2 (same pre-existing baseline failures from Session 53; not related to PR 3a).

- **Pre-push code-reviewer agent (Opus, `feature-dev:code-reviewer`):** No Critical or Major findings. Confirmed: Migration A WHERE clause precise (matches Apple Story shape, excludes canonical/column-populated/empty/absent), strip operator safe, idempotent, ASCII-lex timestamp slotting correct. Migration B handles all non-object cases without erroring, canonical-shape output unchanged, inner array-only filter still needed for non-array sub-values, grants survive `CREATE OR REPLACE`. smart-search try/catch correctly scoped (only around `fetchSynonyms`, not `buildSmartSearchQuery` or `textSearch`); `synonyms` defaults to `[]` cleanly. Trio together restores PR 3a to passing state.

**Decisions made:**

- **Codex P2 disposition: ship inline now (vs defer as out-of-scope follow-up).** User chose "ship inline" via AskUserQuestion. Reasoning: cost trivial (1 small CREATE OR REPLACE migration), value real for any future Stage 2 batch run that produces non-object academicConcepts shape (the Pydantic validators upstream are belt-and-braces, not load-bearing). User values DB safety highly per `feedback_data_safety_top_priority.md`.

- **Fix-up shape: 2 migrations + 1 code change (vs 1 combined migration + 1 code change).** Two migrations because the helper `_flatten_academic_concepts` doesn't exist until `20260521000000` runs, so the harden cannot run before it. Cleanest path is: drift repair before `20260521000000`, helper harden after `20260522000000`. Single combined migration cannot achieve both timing constraints.

- **Don't edit `20260521000000` body in-place** (per `database-migrations` skill rule + supabase/migrations/CLAUDE.md `STOP` block). Even though TEST + PROD never applied the file body successfully, the rule applies broadly to pushed migration files. New fix-up migrations only.

**Process notes / observations:**

- **Recurrence of bare-UPDATE-fires-trigger-on-drift bug class.** This is the SECOND occurrence in the foundation-phase initiative — first was PR #475 round 2 (Session 14, fixed via `20260511120000_season_timing_drift_repair.sql`), now PR #479 round 1 (Session 56, fixed via `20260520120000_season_timing_drift_repair_2.sql`). Pattern: any migration that does a bulk UPDATE on `lessons` to fire `lessons_normalize_write_trg` will hit `valid_seasons` CHECK on rows with column-empty + non-canonical metadata seasonTiming. The fix shape is identical (defensive WHERE-clause strip). Future migrations of this shape (Stage 2 re-tag, vocab canonicalization migrations in PR 5+) should pre-check for the drift before doing bulk metadata UPDATEs. **Watch-pattern, third recurrence promotes to feedback memory.** The precedent migration's body comment + this fix-up's body comment together serve as the durable documentation; future contributors who hit the same CHECK violation will land on either via grep for `valid_seasons` in `supabase/migrations/`.

- **Per-PR ritual followed cleanly:** pre-push reviewer dispatched (Opus, no Critical/Major) → fix-ups stayed minimal → local validation comprehensive (5 separate verification surfaces) → status doc updated before push. The kickoff's 8-step ritual structure works well for a moderate-size fix-up cycle.

- **Out-of-scope follow-ups captured below:** test coverage gap for `expandSearchTerms`, `test-prepare-lesson-text.mjs` not-in-CI / fixture ordering, tsquery operator injection defensive harden. None blocking; all candidates for a focused smart-search hygiene PR.

**Process notes for Session 57+:**

- **Push triggers Round 2 CI cycle.** Once pushed, CI re-applies migrations (now 5 pending: 3 from PR 3a head + 2 fix-ups). Round 2 bot reviews land 5-15 min after push. Round-cap rule: after 2 rounds, fix only critical bugs. So Round 2 is the LAST round of substantive iteration — anything after that should be ship-or-defer.

- **TEST DB re-verification (per `feedback_per_round_test_db_verification.md`) is mandatory after CI applies.** Five probes listed in Current State header. Don't skip even if CI is green — same audit-query body that ran in this session can be re-run once TEST is updated.

- **Bundle Session-56 docs + prior Session-55 docs + fix-up commit into one push.** Per `feedback_no_docs_push_during_pr.md`. Three commits going up at once.

### Session 55 — 2026-05-08 — Task 3a.4 shipped (smart-search reads search_synonyms from DB + whitespace constraint); PR #479 opened

**Done (1 code commit + this Session-55 docs commit which stays unpushed per no-docs-push-during-pr):**

- **Task 3a.4 (`4595235`):** Three coupled changes shipped together:
  - **`supabase/functions/smart-search/index.ts` rewrite.** Drops the hardcoded `searchSynonyms` / `spellingSuggestions` Records (~58 entries, lines 18-75 of pre-refactor). New `fetchSynonyms()` helper reads `search_synonyms` table at request time via the existing anon-keyed supabase client (anon already has SELECT grant + RLS policy `Public can view synonyms`). `expandSearchTerms` / `buildSmartSearchQuery` take a `SynonymRow[]` argument and re-implement the `bidirectional` / `oneway` / `typo_correction` branching in TS. Filter-only requests (no query) skip the synonyms fetch entirely. `:*` prefix matching + word-stem-plural munging preserved verbatim per the locked B-b decision.
  - **`supabase/migrations/20260522000000_seed_search_synonyms_from_smart_search.sql` (new file).** INSERTs 13 missing entries with `WHERE NOT EXISTS` triple-key idempotency guard. ALTER TABLE ADD CONSTRAINT `search_synonyms_lexemes_no_whitespace` uses `term !~ '\s' AND array_to_string(synonyms, '') !~ '\s'`.
  - **`supabase/seed.sql` 2-line edit.** Tokenize `cherry tomato` → `cherry`; `pico de gallo` → `pico` + `gallo`. Necessary because the new constraint validates pre-seeded local DB rows at `supabase db reset` time.

- **Pre-task probes:** TEST + PROD `search_synonyms` snapshot (60 rows each, identical content + schema). RLS state confirmed (anon SELECT + Public-can-view RLS policy). `expand_search_with_synonyms` SQL function definition retrieved.

- **Local validation:** `supabase db reset` clean. Probes confirmed count = 18 (5 seed + 13 migration); all 6 affected terms (christmas / thanksgiving / halloween / easter / latino / hispanic) produce valid tsquery via `to_tsquery('english', expand_search_with_synonyms(...))`; CHECK constraint correctly rejects `INSERT` of `ARRAY['multi word value']`. Edge fn smoke (christmas dinner / thanksgiving harvest / middel) returns valid `expandedQuery` with no tsquery syntax errors. `npm run type-check && npm run lint` clean.

- **PR #479 opened:** https://github.com/danfeder/esnyc-lesson-search-react/pull/479 — bot reviews pending.

**Decisions made:**

- **Read mechanism = B-b** (locked via AskUserQuestion mid-task): edge fn reads raw `search_synonyms` table; bidirectional/oneway/typo branching re-implemented in TS; preserves prefix matching + plural munging. `expand_search_with_synonyms()` SQL fn was rejected for direct call because (a) it loses the `:*` prefix and stem munging, and (b) the SQL function uses POSIX regex matching that's identical to a substring search and doesn't compose with the FTS query-shaping the edge fn does.

- **Migration scope = β** (locked via AskUserQuestion mid-task): add the 13 specific entries the TS dictionary covered that the DB lacked (after MCP probe revealed the DB is already richer than originally assumed — only 13 distinct triples were missing, not "near-empty seed of ~58 entries" as the kickoff prompt had implied).

- **Multi-word phrase handling = Option 1 + Option 7** (locked via senior-dev consult): tokenize multi-word phrases into individual word tokens (`winter celebration` → `winter` + `celebration`) AND add CHECK constraint preventing future whitespace-bearing inserts. Five additional options surfaced for the senior dev that I hadn't originally considered (Option 4 substrate fix; Option 5 phrase operator `<->`; Option 6 switch to `websearch_to_tsquery`; Option 7 CHECK constraint; Option 8 hybrid TS-only fix). The senior dev's reasoning chain — that phrase semantics never worked anyway, so tokenization is the safest executable approximation, and a CHECK constraint pairs naturally to prevent regression — was the highest-confidence answer.

- **CHECK separator = empty string `''`, NOT the senior-dev's E'\x1f' suggestion.** This is an EMPIRICAL CORRECTION: the senior dev recommended `array_to_string(synonyms, E'\x1f')` because they assumed `\x1f` (Unit Separator) is a non-printable non-whitespace separator. Local `supabase db reset` failed when the constraint validated pre-seeded data; diagnostic probe (`SELECT E'\x1f' ~ '\s'`) returned `true` on TEST DB. Postgres' AREs treat `\x1f` (and several other low-ASCII control chars) as whitespace, despite POSIX C locale not classifying them as such. Empty separator avoids the problem because it doesn't introduce any character that could match `\s`; whitespace inside any individual synonym still surfaces in the joined string.

**Process notes / observations:**

- **Two-bot consultation pattern, third use this PR cycle (Tasks 3a.1, 3a.3, 3a.4).** Each use surfaced 1-3 options I had not originally considered. The pattern's value is consistent enough across 3 occurrences that it's worth promoting to feedback memory next session. Concrete pattern: when implementing a non-trivial decision, write a self-contained brief (kickoff context + bug description + options I've considered + constraints) and have the user paste it to a fresh agent. The fresh agent reliably surfaces options I missed because it has no context-bias from my own analysis.

- **Empirical-correction-of-expert-advice pattern.** The senior dev's E'\x1f' separator was wrong empirically; the bug only surfaced when local `supabase db reset` failed mid-migration. Lesson: when an expert's recommendation includes a specific implementation detail (like a separator choice), local-test the implementation BEFORE assuming it's correct. The diagnostic probe (`SELECT E'\x1f' ~ '\s', E'\x1f' ~ '[[:space:]]', ' ' ~ '\s'`) was valuable for explicitly checking the regex behavior across 3 chars × 2 patterns.

- **Pre-push code-reviewer agent (Opus, `feature-dev:code-reviewer`).** Found 1 finding (Finding 1: dead inner `if` in expandSearchTerms prefix-variant block, confidence 65). Investigation per `feedback_bot_review_investigation.md`: confirmed pre-existing in OLD code at `81b5d2e:smart-search/index.ts:100-104`; refactor preserves verbatim per the locked B-b decision; out-of-scope per the kickoff "A bug fix doesn't need surrounding cleanup" principle. Logged as out-of-scope follow-up below + in PR description. Reviewer also flagged Finding 2 (whitespace-only `expandedQuery` shape change) but reviewer agreed no fix needed because the consumer hook gates on `query.length > 0` post-trim. Net pre-push outcome: 0 must-fix findings, ship as-is.

- **Senior-dev-brief writeup pattern.** I wrote `.tmp/senior-dev-brief-multi-word-synonyms.md` as a self-contained brief that the user took to a senior dev agent. The brief was 7 numbered options + decision constraints + file references + reporting format. This was the third time this PR cycle that "write the brief and let the user dispatch the agent" was used — pattern composes naturally with the kickoff's "When initial framing is wrong... correcting in the next consultation message is faster than starting fresh" guidance.

**Process notes for Session 56+:**

- **PR #479 awaits bot reviews.** Per kickoff per-PR ritual: wait for external bots (CodeRabbit, Claude long-form, Codex) to land — they ARE the second pass; do NOT dispatch another code-reviewer agent. Once findings land, collect from all four PR surfaces (`gh pr view 479 --comments` + `gh api repos/.../pulls/479/reviews` + `gh api repos/.../pulls/479/comments` + `gh pr checks 479`); investigate each per `feedback_bot_review_investigation.md`; surface accept/reject recommendations BEFORE applying.

- **TEST DB verification once CI applies.** Per `feedback_per_round_test_db_verification.md`, post-CI verification on TEST: count = 73; expand_search_with_synonyms returns valid tsquery for all 6 affected terms; CHECK constraint blocks multi-word INSERT. Repeat after every round of post-PR fix-ups, not just at PR open.

- **Session-end docs commit stays unpushed** per `feedback_no_docs_push_during_pr.md`. Bundle with the next fix-up push (or final ritual closure if no fix-ups land).

### Session 54 — 2026-05-08 — Task 3a.3 shipped (generate-embeddings includes academicConcepts + verification harness)

**Done (1 code commit + this session-end docs commit):**

- **Task 3a.3 (`81b5d2e`):** `scripts/generate-embeddings.mjs` updated; `scripts/test-prepare-lesson-text.mjs` created. Substantive change: `prepareLessonText` flattens `metadata.academicConcepts` (`{Subject: [concept,...]}`) into the embedded text alongside themes / heritage / skills / ingredients. Subject keys + concept values both flow into the comma-separated token list, mirroring the SQL helper `_flatten_academic_concepts` from Task 3a.2 so semantic similarity reflects both layers. Defensive null/empty-object handling — no `Concepts:` line emitted when no usable tokens. Three additional changes that ride along:
  - **`--lesson-ids=ID1,ID2` flag** — bypasses the null-embedding filter so already-embedded rows can be re-processed. General ops utility for targeted re-embed after content fixes; no current consumer in this PR.
  - **ESM main-module guard** — auto-run + `requireNonProd()` invocation moved behind `if (process.argv[1] === fileURLToPath(import.meta.url))`. `prepareLessonText` exported. This makes the script importable by verification harnesses without firing DB-connecting side effects.
  - **`scripts/test-prepare-lesson-text.mjs` harness** — exercises 4 fixture shapes derived from a 2026-05-08 `mcp__supabase-test__execute_sql` probe of TEST corpus rows. Cases: multi-subject multi-concept (Sun Study), multi-subject single-concept-each (Roots and Shoots), single-subject multi-concept (Water Cycle and Dumplings), null edge case (Orientation Lesson). Run via `node scripts/test-prepare-lesson-text.mjs`. All 4 assertions pass; no DB or OpenAI credentials required.

- **Pre-flight on TEST DB**: probed `academicConcepts` shape distribution — 435 multi-subject / 228 single-subject / 88 null / 0 empty-object across 751 active rows. Selected 4 specific rows for fixture sourcing.

- **Local validation**:
  - `node scripts/test-prepare-lesson-text.mjs` — 4/4 PASS.
  - `npm run type-check && npm run lint` — both clean. Lint covers `.ts/.tsx` only (per `package.json:lint`); `.mjs` files aren't covered, which is acceptable.
  - `node --check` on both scripts — both parse cleanly.

**Decisions made:**

- **Verification scope: C-plus (export + checked-in fixture harness) over A (`--print-fixtures` CLI flag) over B-plus (local-seeded DB dry-run).** Two-bot consultation this session. **Reasoning chain:** original plan Task 3a.3 verification path (`--test --dry-run --lesson-ids=...`) was blocked by stale `--test` config (URL points to deleted project; key in .env is stale). First fallback considered: A — embed `--print-fixtures` CLI mode in the script itself. Senior-dev pushback: ops scripts shouldn't carry verification-only CLI modes; reusable artifact is the pure function + expected output, captured cleanly by a separate test file. Second fallback considered: B-plus — seed local DB with full corpus via `npm run import-data` and run `--dry-run --lesson-ids=...` against local. Probe rejected this: `data/consolidated_lessons.json` is Nov 2024 (5+ months old), 0 of 831 rows have populated `academicConcepts`. Per the senior dev's decision rule: "stale local seed with few/no concepts is worse than four MCP-derived fixtures." Final landing: **C-plus** — export `prepareLessonText`, add ESM main-module guard, ship `scripts/test-prepare-lesson-text.mjs` with 4 fixtures derived from live MCP probes. Fixture-based artifact is reproducible in-tree; future shape changes can be tested via the same harness; operational script stays clean of verification-only modes.

- **Full corpus embedding regeneration deferred to PR 6+ (Stage 2 corpus re-tag).** Initial cost framing in the prior status doc was over-cautious — at `text-embedding-3-small` rates ($0.02/1M tokens) and ~2K tokens/lesson, a full 751-row TEST regen is ~$0.03. So cost was never the deciding factor. The actual reasoning is staleness: TEST embeddings would go stale immediately when Stage 2 re-tags concept content. The natural batching boundary is when the underlying content meaningfully changes — that's PR 6+. PROD regen would be churn before then.

- **`--lesson-ids` flag kept despite being unused in this verification.** Composes naturally with future TEST DB or local DB workflows once the env-state issues are resolved; ~10 LOC; general ops utility for targeted re-embed after content fixes.

**Process notes / minor mishaps:**

- **Two-bot consultation pattern, second use this PR cycle.** First use was Task 3a.1 decision Session 52 (Option B locked). This session, sequential consultation walked verification scope from Option C (the original plan) through B → A → fixture-only → C-plus, with each step refined by surfacing concrete blockers (stale TEST URL, stale local seed JSON, scope-creep risk of CLI fixture mode). Pattern: when initial framing is wrong (e.g., "cost is the deciding factor"), correcting the framing in the next consultation message is faster than starting fresh; it also surfaces decision-rule refinements that would have been missed otherwise. Watch-pattern (single PR, two occurrences — promote to feedback memory if it recurs in future PRs).

- **Out-of-scope hygiene observations are real, not decorative.** Three follow-ups added this session — stale `--test` URL, stale `consolidated_lessons.json`, pre-existing `thematicCategory`/`culturalHeritage` key-name drift in `prepareLessonText`. All three would have stayed invisible without the verification-path investigation; the `prepareLessonText` drift in particular is silently degrading embedding quality for modern submission-era rows today. Worth surfacing in a focused embeddings-hygiene PR alongside the script's broken `--test` mode.

**Process notes for Session 55+:**

- **Task 3a.4 is next.** Smart-search drift fix per Option B (locked Session 52): refactor `smart-search/index.ts` to read from `search_synonyms` DB table at request time + one-time seed migration with the ~58 TS dictionary entries (~30 synonyms `bidirectional` + ~13 spelling-suggestions `typo_correction`).

- **Pre-Task-3a.4 verification list (still applies, restated for visibility — see Current State header).**

- **Fixture-harness pattern is now in-tree.** `scripts/test-prepare-lesson-text.mjs` sets a precedent for future verification harnesses on operational scripts that have stale or broken DB-connection modes. ESM main-module guard + export + standalone harness file. Pattern composes with any other script where the pure-function logic is worth verifying without DB/API credentials.

### Session 53 — 2026-05-08 — Task 3a.2 shipped (search_vector regeneration migration including academicConcepts)

**Done (1 code commit + this session-end docs commit):**

- **Task 3a.2 (`9a21354`):** Migration `20260521000000_search_vector_with_concepts.sql` adds `academicConcepts` to FTS at weight C. Three artifacts:
  - Helper `public._flatten_academic_concepts(jsonb) -> text` — IMMUTABLE; flattens `{Subject: [concept,...]}` to space-separated text (subject keys + concept values).
  - Trigger fn `update_lesson_search_vector()` rewritten with inline setweight chain (no longer delegates to `generate_lesson_search_vector` — that helper stays in place for any external consumer; trigger no longer calls it). The new chain folds concepts into the C-weight block alongside thematic_categories / cultural_heritage / garden_skills / cooking_skills.
  - Trigger `update_lesson_search_vector_trigger` recreated with `metadata` added to its UPDATE OF column list. Concepts have no column-shape mirror in `lessons`, so concept-only metadata writes (e.g., via `complete_review_atomic`) previously didn't fire the trigger; this closes the gap.
  - One-time backfill `UPDATE lessons SET metadata = metadata` fires the new trigger for every existing row.

- **Pre-flight verification on TEST DB**: confirmed `academicConcepts` shape is uniformly `{Subject: [concept,...]}` object (663/751 active rows populated; 0 rows with array-shape or other type). Sample rows showed e.g. `{"Science": ["plant parts"], "Social Studies": ["cultural traditions", "immigration stories"]}`.

- **Local validation**:
  - Helper test (6 input cases): object → flattened correctly; empty / null → empty string; non-array value → just subject key (no error); deep array → multiple concept tokens; empty array → just subject key.
  - Trigger fires on metadata-only update: added concepts to LESSON-001 via `UPDATE lessons SET metadata = jsonb_set(...)`; `search_vector` picked up `'photosynthesi':29C`, `'fraction':28C`, etc.
  - Rows without concepts: no phantom tokens.
  - `npm run type-check && npm run lint` clean.
  - `npm run test:rls`: 5 passed / 2 failed (`archive_duplicate_lesson validates lesson existence` + `archive_duplicate_lesson prevents self-archiving`); confirmed pre-existing by re-running on baseline (same failures appear without my migration in tree). Test runner overall verdict still ✅ "RLS implementation is working correctly!".

**Decisions made:**

- **Inline setweight in trigger fn over extending `generate_lesson_search_vector`'s parameter list**. PostgreSQL's `CREATE OR REPLACE FUNCTION` cannot change a function's parameter list (would create an overload, not a replacement). DROP/CREATE-with-grants would have churned the security model unnecessarily. Inlining the setweight chain in `update_lesson_search_vector()` (the only caller of the helper today) is cleaner. The legacy `generate_lesson_search_vector` stays granted to anon / authenticated / service_role for any external consumer; it becomes effectively dead code in the trigger path. Could be retired in a follow-up cleanup migration if desired (logged as out-of-scope follow-up below).

- **Backfill via `UPDATE lessons SET metadata = metadata`** over direct `UPDATE lessons SET search_vector = (...)`. The "no-op metadata write" approach is DRY (single source of formula in the trigger fn). Verified the cost is bounded: ~751 active rows on TEST + ~767 on PROD; both `lessons_normalize_write_trg` (no UPDATE OF filter) and the new search_vector trigger fire; rows already conform to validators (post-PR-1b state).

**Process notes / minor mishaps:**

- **Stash mishap.** When verifying the RLS-test failure was pre-existing, I chained `git stash && npm run test:rls ; git stash pop`. `git stash` returned "No local changes to save" (my migration was untracked, and `git stash` doesn't catch untracked files by default). The chained `git stash pop` then popped an OLD unrelated stash from `feat/url-persistence` (months-old branch state), leaving merge markers in `.beads/issues.jsonl`. Recovered with `git checkout HEAD -- .beads/issues.jsonl`. **Lesson:** never chain `git stash && ... ; git stash pop` without first checking `git stash list` to confirm what's at the top, or capturing the stash's success status. The pattern works fine when there's something to stash; when there isn't, the chained pop unstashes whatever was already on top from prior sessions. Either: (a) only stash tracked-file changes (which my untracked migration was not), or (b) use `git stash -u` to include untracked, or (c) skip the stash dance entirely when the only uncommitted state is untracked. Watch-pattern (single occurrence — promote to feedback memory if it recurs).

**Process notes for Session 54+:**

- **Task 3a.3 prerequisite**: editing `scripts/generate-embeddings.mjs` to include `academicConcepts` is fast (small file edit). The actual TEST corpus re-run is real OpenAI API cost — get user confirmation before kicking off. Pattern: ship the script edit (small commit) and queue the run as a separate user-confirmed step.

- **Task 3a.4 ordering reminder**: Pre-Task-3a.4 verification list still applies (verify `search_synonyms` row count + content on TEST + PROD before writing the seed migration; choose conflict-handling strategy). Don't skip it.

- **Stash discipline**: when verifying baseline behavior with stash, use `git stash list` first or `git stash push --include-untracked --keep-index <path>` style commands to be explicit about what's getting saved. Or use a separate worktree.

### Session 52 — 2026-05-08 — PR 3a cycle started: archival + branch setup + Task 3a.1 decision (Option B locked)

**Done (2 cherry-pick commits + 1 archival commit + 1 feedback memory promotion + this session-end docs commit):**

- **Branch setup**: pulled main → `03970d0` (PR 4 squash-merge); branched as `feat/metadata-foundation-search-infra-3a`; cherry-picked `c02e22c` (Session 51 main docs) + `d4cc621` (Session 51 follow-up correcting Stage 1 worksheet framing) from the merged PR 4 branch (renumbered as `92f5636` + `d9377f9` after the cherry-pick). Branch is now 3 commits ahead of main. Session 47 precedent followed (cherry-pick merged-branch session-end docs into next PR).

- **PR-cycle archival**: per kickoff session-end ritual step 5, Sessions 47-51 (PR 4 cycle) moved from active execution-status.md → archive file. Archive grew by 248 lines (now 2258 lines); active shrank by 252 lines (now 115 lines pre-Session-52-log-entry). Session 49's missing header (Session 49 docs commit `786203b` shipped without `### Session N — date — title`) reconstructed from commit message and inserted at archive time.

- **Process-learning promotion**: hallucinated-IDs-in-migration-outcome-probes pattern (recurred 2× in PR 4 — Sessions 49 + 50) promoted to new feedback memory `feedback_verbatim_identifiers_in_probes.md` per kickoff "audit each entry for promotions" rule. MEMORY.md updated with pointer entry under Working preferences. Other PR 4 watch-pattern candidates (active-doc-vs-live-PR reconciliation / UNSTABLE-merge-state precedent / don't-assert-track-status-without-checking) retained as candidates pending recurrence per Session 51's framing — single-occurrence threshold not met.

- **Task 3a.1 decision (smart-search drift resolution)**: Option B locked (drop TS hardcoded list, read from DB). Smart-search edge fn will be refactored to read `search_synonyms` from DB at request time; ~58 hardcoded TS entries (lines 18-75) will be seeded into the DB via a one-time migration. See Current State for the full decision context + pre-Task-3a.4 verification list.

- **Pre-flight reads** (from kickoff §HARD RULES + impl plan PR 3a pre-flight): confirmed current state of `smart-search/index.ts:18-75` (TS hardcoded), `scripts/generate-embeddings.mjs:81-91` (currently embeds themes / heritage / skills / ingredients but NOT concepts → Task 3a.3 fixes), decision journal D5 §305-348 (drift resolution sub-question at line 330; smart-search edge fn rewrite scoped at line 345), and the baseline migration's `expand_search_with_synonyms` definition (line 161 of `20251001_production_baseline_snapshot.sql`).

**Decisions made:**

- **Option B for smart-search drift** (over Option A "populate both layers" or Option C "hybrid with caching"). Architectural cleanliness over minor request-latency cost. Concept-derived synonyms arriving in PR 3b / PR 6+ will populate the DB layer; keeping a TS mirror would require continuous re-sync indefinitely. Hybrid (Option C) was rejected as premature optimization for a low-traffic edge fn.

- **Promote hallucinated-IDs pattern over "leave as candidate"** despite Session 51's default of waiting for additional recurrence. Concentrated 2× recurrence within ONE PR cycle (Sessions 49 + 50) suggested active risk; the rule is concrete and short; promotion cost minimal. Session 51's "single occurrence" gating doesn't apply since the pattern hit twice.

**Process notes for Session 53+:**

- **Pre-Task-3a.4 verification is load-bearing.** Before writing the smart-search refactor + seed migration, verify the current `search_synonyms` row count + content via TEST + PROD MCP. The seed migration's conflict-handling depends on this.

- **Task ordering inside PR 3a is flexible.** 3a.2 (search_vector regen) and 3a.4 (smart-search refactor) are independent — either can ship first within the PR. Suggested sequence is 3a.2 → 3a.3 → 3a.4 → 3a.5 because the search_vector migration is the smallest scoped task and gives momentum before the larger refactor.

- **PR 3a is a "small substrate + 2 small touchpoints" PR**, not a multi-task megapush like PR 1 or PR 4. Expect 1-3 sessions to complete + 1 round of bot review at most. No DB-wide schema changes; lower migration risk than prior PRs.

- **Seed migration's idempotency**: per foundation-phase pattern across all migrations, the seed migration must handle re-running gracefully (`INSERT ... ON CONFLICT DO NOTHING` preferred default).

### Sessions 18-51 — archived

PR 2's design reference (Session 18) + earlier session entries (Sessions 18-27 implementation), PR 1b's full implementation cycle (Sessions 28-36), PR 2 ritual cycle (Sessions 37-46), and PR 4 ritual cycle (Sessions 47-51) all live in `2026-05-03-metadata-rebuild-foundation-execution-status-archive.md`. Read on demand via `grep -n "Session N" archive.md` or targeted Read with offset/limit. Process learnings collected during Sessions 28-46 that promoted to feedback memory: empirical-evidence-escalates pattern + active-PR session-orientation rule (both in `feedback_pr_bot_review_workflow.md` post-Session 37). Watch-patterns preserved in Recent decisions above (type-coupled cluster impl-plan flaw / cherry-pick-over-rebase / rebase-rename-sweep / database-migrations skill exception class — all single-occurrence, promote to feedback if they recur). PR 4 cycle watch-patterns held to candidate status pending recurrence: active-doc-vs-live-PR reconciliation (Session 51) / UNSTABLE-merge-state precedent for baseline-only failures (Session 51) / don't-assert-track-status-without-checking (Session 51) / hallucinated-IDs-in-migration-outcome-probes (Sessions 49+50, **2 occurrences within PR 4 — empirical-evidence escalation candidate**).
