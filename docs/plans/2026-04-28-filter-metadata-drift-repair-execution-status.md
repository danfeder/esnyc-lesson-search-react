# Filter Metadata Drift Repair — Execution Status

**Last updated:** 2026-04-29 — Session 2 (PR-1 pushed + PR #471 opened; awaiting CI + bot reviews)
**Current PR:** [PR #471](https://github.com/danfeder/esnyc-lesson-search-react/pull/471) — Column-based RPC + alias tolerance (open)
**Current task:** Task 1.6 Step 5+ (waiting on CI apply to TEST DB + external bot reviews)
**Branch:** `feat/filter-drift-pr1-column-rpc` (pushed)
**Last commit on branch:** `faf732c docs(filter-drift): session 1 — PR-1 Tasks 1.1-1.5 complete`

## Done

- **PR-1 Task 1.1 (pre-flight)** — Session 1 — no commit (info-gathering)
- **PR-1 Task 1.2 (column-based search_lessons migration)** — Session 1 — `c791df2`
- **PR-1 Task 1.3 (TDD normalizeMetadata fix)** — Session 1 — `22a4814`
- **PR-1 Task 1.4 (database.types.ts patch)** — Session 1 — `b39eb92`
- **PR-1 Task 1.5 (local verification matrix)** — Session 1 — no commit (results captured below)
- **PR-1 Task 1.6 Steps 1-4 (pre-PR check + reviewer dispatch + push + open PR)** — Session 2 — no commit (PR #471 opened on GitHub)

## In flight

- **PR-1 Task 1.6 Step 5+** — waiting on CI to apply migration to TEST DB; waiting on external bot reviews (CodeRabbit, Claude Review). Session 3 picks up here.

## Blocked

(none)

## Decisions made during execution

Two big decisions made during scaffolding (Sessions 0a–0g) that future sessions need to know about:

- **PR-3 deferred indefinitely (2026-04-29).** Original plan was 3 active PRs; user reframed scope to 2 active (PR-1, PR-2) + 2 deferred (PR-3, PR-4) after considering future re-classification work. Re-classifying lessons against a current-gen AI model would likely revisit the taxonomy/vocabulary that PR-3 would lock in. Cheaper to defer than to commit and undo. PR-3 documentation kept intact in the impl plan for resumption. PR-1 alias helpers (`_alias_lesson_format` / `_alias_activity_type` / `_alias_cultural_heritage` / `_match_cooking_methods`) stay in the database indefinitely; their "remove in PR-3" comments stop being load-bearing. Post-PR-2 corpus has canonical SHAPE but mixed VOCABULARY for lf/at/cm — that's fine, aliases keep filters working.

- **academicConcepts rescue added across all three write paths (2026-04-29).** PROD probe surfaced that 693 rows have object-shape `metadata.academicIntegration` containing both `selected` (filter values) AND `concepts` (rich per-subject content like `{Science: [plant parts, life cycles]}`). 690 rows have non-empty concepts. The bare design doc §5 unwrap snippet would have destroyed all 690. Design doc undercounted this cohort as "~14 rows." Rescue logic added to: PR-1 reconstruction (read path; preserves to result-row sibling key `academicConcepts`); PR-2 M1 writer fix (extends `v_legacy_meta` builder); PR-2 M2 backfill (rescues at-rest before flattening); PR-2 M4 trigger (rescues before column-driven flatten). All four paths share "key present iff data present" semantics — empty/missing concepts produces NO `academicConcepts` key, no `{}` placeholders. Verified `academicConcepts` not an existing top-level key (no collision).

Other notable scaffolding-time choices (full audit trail in commit `15ac4d7`):
- Pre-flight probe SQL uses explicit `AS keys(key)` alias instead of fragile `jsonb_object_keys(...) k WHERE k IN (...)` pattern.
- Writer-roundtrip matrix expanded from 4 to 6 academicIntegration cases (added Row 5 concepts-rescue, Row 6 empty-concepts-not-rescued).
- Trigger smoke expanded from 1 to 3 cases (lessonFormat array; AI with concepts; AI with empty concepts).
- M2 cleanup SQL uses explicit `::uuid[]` casts + FK-safe deletion order (lessons → submission_reviews → submission_similarities → lesson_submissions) rather than `LIKE`-against-uuid (broken).

### Session 1 (2026-04-29) decisions

- **Cultural-heritage alias must run BEFORE `expand_cultural_heritage`, not after.** Probe (TEST DB, 2026-04-29): `expand_cultural_heritage(['asian'])` returns `['asian']` alone — no children expansion. `expand_cultural_heritage(['Asian'])` returns 8 children (`Filipino`, `Chinese`, `Thai`, `Asian`, `Korean`, `Japanese`, `Indian`, `Vietnamese`). The `cultural_heritage_hierarchy` table is keyed on Title-Case parents only. So the alias must inject the Title-Case parent BEFORE expansion: `expand_cultural_heritage(_alias_cultural_heritage(filter_cultures))`. Design doc §4 was ambiguous on order; this is the only ordering that makes the hierarchy work end-to-end. Locked into PR-1 migration `20260505000000_*`.

- **`_match_cooking_methods` includes a slug↔phrase alias for `'Basic prep only'`.** Pure case-insensitive (per design doc §4) handles `Stovetop`/`Oven` → `stovetop`/`oven`, but UI's `Basic prep only` does NOT lowercase-match column values `basic-prep` or `basic-prep-only` (hyphens + missing `only` suffix variant). Added explicit alias `'basic prep only' → ['basic prep only', 'basic-prep', 'basic-prep-only']` inside `_match_cooking_methods`. Without this, the `Basic prep only` filter would have shipped with 0 hits despite ~189 corpus rows having that data. (`filterDefinitions.ts` is not changed in PR-1, per locked decisions.)

- **Pre-flight (Task 1.1) confirmed clean baseline.** Deployed `search_lessons` source matches `20251001_production_baseline_snapshot.sql:1198-1357` byte-for-byte (modulo identifier-quoting style). `grep -ln search_lessons supabase/migrations/` returns only the baseline. `pg_depend` returned empty — `DROP FUNCTION` without `CASCADE` is safe. Verbatim signature captured in the migration file.

- **Task 1.4 surgical patch instead of full regen.** Locally-installed Supabase CLI 2.95.4 produces a different file shape (no `__InternalSupabase` field, adds `graphql_public` schema, no semicolons) than what's on disk. Those are CLI-version differences unrelated to PR-1's migration. Per impl plan Task 1.4's "stop and surface unrelated diffs" guidance, applied only the migration's actual impact: `filter_cooking_method? string → string[]` + 4 helper-function entries. Verified surgical patch matches CLI 2.95.4 output via grep.

- **Local verification matrix (Task 1.5) results.** Local DB has only 5 seeded lessons so the matrix mostly proves "compiles + runs" rather than validating filter semantics:

  | Test                                  | Hits |
  |---------------------------------------|-----:|
  | baseline (no filters)                 |    5 |
  | lessonFormat=single-period (slug)     |    0 |
  | lessonFormat=Single period (Title)    |    0 |
  | activityType=cooking-only (slug)      |    0 |
  | activityType=cooking (bare)           |    0 |
  | cookingMethods=stovetop (lower)       |    0 |
  | cookingMethods=Stovetop (Title)       |    0 |
  | academicIntegration=Math              |    2 |
  | culturalHeritage=asian (slug)         |    0 |

  Spot-check on metadata reconstruction confirmed `lessonFormat` returns as JSON STRING (scalar), `academicIntegration` returns as JSON ARRAY, `academicConcepts` key absent when no concepts data — all per design. (Note: local seed has weird data in `lesson_format` column — values like `'{"Full Lesson"}'` text-literals — but this is seed quirk, not a migration bug.) Real semantic validation runs against TEST DB after Session 2's CI apply.

### Session 2 (2026-04-29) decisions

- **Pre-push reviewer agent dispatched on `git diff main...HEAD`.** `feature-dev:code-reviewer` returned 1 Should-fix + 1 Nit. Both REJECTED after triage:
  - **Should-fix: add `IF EXISTS` to `DROP FUNCTION search_lessons(...)`.** Reviewer cited the project guideline at `supabase/migrations/CLAUDE.md:88` ("Use `IF NOT EXISTS` / `IF EXISTS` for safety"). Rejected per `feedback_pr_bot_review_workflow.md` "default-reject hardening that fails the 'user-visible bug or DB damage' bar." The migration's `NO CASCADE` already preserves the dependency-failure intent; absence of `IF EXISTS` is deliberate per the inline comment ("fail loudly — intended"). The realistic re-apply scenarios (`supabase db reset`, CI, PROD apply) all run from baseline forward where the function exists; no actual user-visible bug or DB damage from omitting. May revisit if external bots flag the same with stronger argument.
  - **Nit: `_match_cooking_methods` Args order swapped in `database.types.ts`.** Reviewer claimed `{ p_filter_methods, p_l_methods }` doesn't match SQL definition order `(p_l_methods, p_filter_methods)`. Rejected: Supabase auto-gen orders Args ALPHABETICALLY, not by source order (verified via surrounding `archive_duplicate_lesson` entry which is alphabetical c→l). The current order IS canonical CLI output (Task 1.4 status note already verified surgical patch matches CLI 2.95.4 output via grep). Changing it would create drift on the next regen. PostgREST uses named-parameter object syntax where property order doesn't matter at runtime anyway.

- **Helper function smoke tests (against local DB):**
  - `_alias_lesson_format('single-period')` → `['single-period', 'Single period']` ✓
  - `_alias_activity_type(['cooking-only', 'both'])` → `['cooking-only', 'both', 'cooking']` ✓
  - `_alias_cultural_heritage(['asian', 'east-asian'])` → `['east-asian', 'East Asian', 'asian', 'Asian']` ✓
  - `_match_cooking_methods(['stovetop'], ['Stovetop'])` → `true` (case-insensitive) ✓
  - `_match_cooking_methods(['basic-prep'], ['Basic prep only'])` → `true` (slug alias) ✓
  - `_match_cooking_methods(['stovetop'], ['Oven'])` → `false` (no false positives) ✓
  - `expand_cultural_heritage(_alias_cultural_heritage(['asian']))` → `['asian', 'Asian', 'Korean', 'Japanese', 'Chinese']` (full pipeline) ✓

- **Task 1.3 RED→GREEN.** Initial test run (3/6 fail): legacy object `{selected: ['Math']}` returned `['[object Object]']` instead of `['Math']`; `{selected: []}` returned `['[object Object]']` instead of `[]`; scalar `'Math'` returned `['Math']` instead of `[]`. After the IIFE replacement: 6/6 pass. Full vitest suite 473/473 (up from 467; 6 new tests added).

## Out-of-scope follow-ups captured here

- **`facetCounts.ts:55` array-shape hardening** — was scoped into PR-3 Task 3.5; with PR-3 deferred, this stays open in the `MEMORY.md` "Open hygiene follow-ups" list. Don't address inside PR-1 or PR-2.
- **17 `activity_type` location-leak rows** — investigation step gated inside PR-2 Task 2.5. The investigation produces the input mapping for M3 (Task 2.6); session that hits Task 2.5 must surface findings to user and wait for decision before drafting M3.

## Session log

### Session 0 — 2026-04-28 → 2026-04-29 — scaffolding only (multiple sub-sessions, 7 review rounds)

Major events:
- Design doc locked at `docs/plans/2026-04-28-filter-metadata-drift-repair-design.md` (v1 JSONB-as-source-of-truth approach archived at `-design-v1-jsonb.md`).
- Implementation plan drafted at `docs/plans/2026-04-28-filter-metadata-drift-repair-implementation.md` — 1860 lines after 7 rounds of external reviewer feedback.
- Initial scope: 3 active PRs (column RPC + writer fix + canonical vocab) + PR-4 deferred.
- Reviewer rounds 1-4: sequencing (M1-only verification ↔ all-in-one PR-2 batch), Netlify-first ordering gate for the original PR-3, both-surface canonicalization in M3, UUID-safe + FK-safe cleanup, `p_metadata` exposure in matrix calls, full trigger vocab map coverage, migration count consistency.
- **Strategic shift mid-review (round 5):** user reframed scope from "3 active PRs" to "2 active + PR-3 deferred" after considering future re-classification work as a more-impactful path than vocabulary canonicalization. Impact: PR-3 docs preserved but marked DEFERRED throughout; alias helpers stay; canonical-form decisions become "if PR-3 reactivates" notes.
- **PROD probe round 6:** user flagged "make sure we're not destroying richer details, especially academicIntegration.concepts." Probe confirmed 690 rows of rich concept data; design doc undercounted; bare unwrap would have destroyed all 690. Concepts rescue wired across PR-1 reconstruction + PR-2 M1/M2/M4.
- **Round 7 cleanups:** stale "PR 1 of 3" framings, "4 AI shapes" references, `rows_with_concepts` vs `rows_with_nonempty_concepts` metric mismatch.
- 3 commits on local main, NOT pushed: `21fb747` (design doc v2.2), `10e2650` (initial 4-file scaffold), `15ac4d7` (deferral + concepts rescue).

### Session 1 — 2026-04-29 — PR-1 Tasks 1.1 → 1.5 done locally

Major events:
- Branched off `main` to `feat/filter-drift-pr1-column-rpc`.
- **Task 1.1 (pre-flight):** Probed deployed `search_lessons` against TEST DB. Source matches baseline byte-for-byte; `pg_depend` empty; verbatim signature captured. No drift, baseline is source of truth. No commit.
- **Task 1.2 (column-based migration):** Drafted `supabase/migrations/20260505000000_filter_drift_pr1_column_based_search_lessons.sql` (430 lines): 4 alias helpers + new `search_lessons` body + per-field COALESCE metadata reconstruction + `academicConcepts` sibling-key rescue + `DROP/CREATE/GRANT/NOTIFY pgrst` mechanics. Cultural-heritage alias ordered BEFORE `expand_cultural_heritage` (probe-driven decision; see "Decisions" above). `_match_cooking_methods` extended with `Basic prep only` slug↔phrase alias beyond the design doc's case-insensitive-only spec. Local apply via `supabase db reset` clean (61 migrations including mine). Helper smoke + RPC smoke + RLS clean (2 pre-existing `archive_duplicate_lesson` failures expected per Phase 8b memory). Commit `c791df2`.
- **Task 1.3 (TDD normalizeMetadata fix):** Created `src/hooks/useLessonSearch.test.ts` (6 tests covering flat array / object-with-selected / empty selected / null / missing key / scalar). Added `export` to `normalizeMetadata` (visibility-only). RED confirmed (3/6 fail on legacy-object, empty-selected, scalar). Applied IIFE replacement of the `academicIntegration: asArray(...)` line (6 lines TS). GREEN: 6/6 pass; full vitest suite 473/473. Lint auto-fix reformatted the function signature (prettier). Commit `22a4814`.
- **Task 1.4 (types patch):** Surgical patch (rather than full regen) because local CLI 2.95.4 produces a different file shape than what's on disk (CLI-version differences unrelated to migration). Patched only the migration's actual impact: `filter_cooking_method? string → string[]` + 4 helper Function entries. Verified against `/tmp/database.types.ts.new` from full regen. Type-check + lint clean. Commit `b39eb92`.
- **Task 1.5 (local verification matrix):** 9-row filter matrix on local-with-5-seeded-lessons captured (mostly compiles-and-runs evidence; `academicIntegration=Math` returns 2 hits confirming column-based filter works). Spot-check confirmed metadata reconstruction: `lessonFormat` is JSON string (scalar), `academicIntegration` is JSON array, `academicConcepts` key absent when no concepts data. Real semantic validation deferred to Task 1.6 step 6 post-CI on TEST DB. No commit (verification is in-session evidence).
- 3 code commits on `feat/filter-drift-pr1-column-rpc`, NOT pushed: `c791df2` (migration), `22a4814` (TS fix + tests), `b39eb92` (types patch). Branch is 7 commits ahead of `origin/main` (4 docs from Session 0 + 3 code from Session 1).

### Session 2 — 2026-04-29 — PR-1 pushed + PR #471 opened

Major events:
- Session-start orientation: read kickoff + status + design doc + impl plan Task 1.6. Confirmed clean baseline (`type-check` ✓ `lint` ✓; worktree dirt is unrelated `.beads/*` + `.claude/scheduled_tasks.lock`).
- **Task 1.6 Step 1**: pre-PR check passed (`npm run type-check && npm run lint`).
- **Task 1.6 Step 2**: dispatched `feature-dev:code-reviewer` agent on `git diff main...HEAD`. 1 Should-fix + 1 Nit reported, both rejected after rebuttal-pass triage (rationale captured in "Decisions made during execution" above). No fix-up commits.
- **Task 1.6 Step 3**: pushed branch → `origin/feat/filter-drift-pr1-column-rpc`.
- **Task 1.6 Step 4**: opened **[PR #471](https://github.com/danfeder/esnyc-lesson-search-react/pull/471)** with body from impl plan template, including local 9-row matrix + helper smoke tests + TEST DB verification placeholder.
- Session ended pre-bot-review per natural session boundary (bot reviews land async, fresh-session triage is the established workflow).

Next session (Session 3): start at **Task 1.6 Steps 5-8**:
1. Check PR-1 CI status via `gh pr checks 471` and `gh run view <id> --log` for the migrate-test-db workflow. Watch for SASL Apply-step flake — rerun if hit (per MEMORY.md SASL flake entry).
2. After CI applies migration to TEST DB:
   a. Re-run the 9-row matrix via `mcp__supabase-test__execute_sql`. Compare counts to design doc §1 production-evidence table (~483 / ~299 / ~177 / ~189 / ~67). Document actual counts in PR #471 body via `gh pr edit 471 --body`. Spot-check metadata reconstruction on a returned row.
   b. Sanity-check regen: `npx supabase gen types typescript --project-id rxgajgmphciuaqzvwmox > /tmp/types_from_test.ts && diff /tmp/types_from_test.ts src/types/database.types.ts`. Expected: empty (apart from CLI-version differences). If drift, commit a fresh patch.
3. Wait for external bot reviewers (CodeRabbit, Claude Review, etc.). Collect findings from ALL FOUR PR surfaces (per `feedback_pr_comment_surfaces.md`):
   - `gh pr view 471 --comments` (issue-comments)
   - `gh api repos/danfeder/esnyc-lesson-search-react/pulls/471/reviews --jq '.[] | {user: .user.login, state, body}'` (review summaries)
   - `gh api repos/danfeder/esnyc-lesson-search-react/pulls/471/comments --jq '.[] | {user: .user.login, path, line, body}'` (line-attached review comments)
   - `gh pr checks 471` + `gh run view <id> --log-failed` for any failing check
4. Investigate and triage every finding (rebuttal pass per `feedback_bot_review_investigation.md`). Surface accept/reject recommendations to user with rationale BEFORE applying. Apply consolidated fix-up commits per round.
5. Per-round TEST DB re-verification for any DB-affecting fix-up (per `feedback_per_round_test_db_verification.md`).
6. Round-cap after 2 rounds.
7. After approval + merge: PROD migration runs after manual approval in `migrate-production.yml`. Verify via `mcp__supabase-remote__execute_sql` (same 9-row matrix). Watch for SASL Apply-step flake (PR-1 has only 1 migration so the rerun pattern is straightforward).
