# Filter Metadata Drift Repair — Execution Status

**Last updated:** 2026-04-29 — Session 6 (PR-2 M2 drafted + applied locally + verified; branch local, not yet pushed)
**Current PR:** (none — branch `feat/filter-drift-pr2-writer-fix-trigger` is local; M1+M2 committed but no PR open yet)
**Next PR:** PR-2 — Writer fix + column hygiene + trigger (M1+M2 committed, M3/M4 still to draft)
**Current task:** Session 7 picks up at **PR-2 Task 2.5** — investigate the 17 `activity_type` location-leak rows on PROD (info-gathering + present findings to user; do NOT draft M3 in same session)
**Branch:** `feat/filter-drift-pr2-writer-fix-trigger` (4 commits ahead of `origin/main`: Session 4 docs ride-along + Session 5 M1 + Session 5 docs + Session 6 M2; Session 6 docs pending)
**Last commit on branch:** `c582ad6 fix(db): filter-drift PR-2 M2 — backfill historical drift rows`

## Done

- **PR-1 Task 1.1 (pre-flight)** — Session 1 — no commit (info-gathering)
- **PR-1 Task 1.2 (column-based search_lessons migration)** — Session 1 — `c791df2`
- **PR-1 Task 1.3 (TDD normalizeMetadata fix)** — Session 1 — `22a4814`
- **PR-1 Task 1.4 (database.types.ts patch)** — Session 1 — `b39eb92`
- **PR-1 Task 1.5 (local verification matrix)** — Session 1 — no commit (results captured below)
- **PR-1 Task 1.6 Steps 1-4 (pre-PR check + reviewer dispatch + push + open PR)** — Session 2 — no commit (PR #471 opened on GitHub)
- **PR-1 Task 1.6 Steps 5-6 (CI verification + round-1 bot triage + round-1 fix-ups)** — Session 3 — `5a26a13` (TS-1+TS-3 tests + M-1 GIN index)
- **PR-1 Task 1.6 Step 7a (round-2 bot triage + round-2 fix-up + round-cap)** — Session 3 — `2c3c8ff` (R2-2 typeof narrowing on duration/groupSize)
- **PR-1 Task 1.6 Step 7b (PR body verification matrix update + round-1+round-2 acknowledgment comment)** — Session 3 — no commit (GitHub UI updates)
- **PR-1 Task 1.6 Step 7 (merge + PROD apply + PROD verification)** — Session 4 — merged via `gh pr merge 471 --rebase --delete-branch` (rebased SHAs `b8d09e7`–`db98914`); PROD apply via `migrate-production.yml` run `25131961626` (4/4 jobs success, no SASL flake); 13-row PROD matrix + 4 structural checks + 5-row metadata-shape spot-check all pass
- **PR-2 Task 2.1 (pre-flight verification of `complete_review_atomic`)** — Session 5 — no commit (info-gathering); deployed PROD source confirmed byte-equivalent to `20260428000008_phase_4_status_guard.sql` (status guard + both expected bugs present); no Phase 5+ migration mutates the function (verified via grep — Phase 5/6/6.2 only mention it in comments); PROD cohort snapshot 2026-04-29 matches design doc baseline (1 array_lf / 693 object_ai / 81 short_keys / 690 rich_concepts / 3 empty_concepts / 788 total)
- **PR-2 Task 2.2 (Migration 1 — writer fix)** — Session 5 — `9e5b245` — drafted `20260506000000_filter_drift_pr2_m1_writer_fix.sql` (403 lines, full function body via `CREATE OR REPLACE`): Bug A `lessonFormat` array→scalar (`to_jsonb(text)` not `jsonb_build_array(text)`), Bug B `academic_integration` typeof-aware unwrap in v_legacy_meta + both INSERT and UPDATE branches' column derivation, plus `academicConcepts` rescue with "key present iff data present" semantic + forward-compat sibling-key path. Local apply via `supabase db reset` clean (61 migrations). Function source verified live via `pg_get_functiondef`: `to_jsonb(v_meta->>'lessonFormat')` present, `jsonb_typeof(v_meta->'academicIntegration')` present, `jsonb_build_array(v_meta->>'lessonFormat')` GONE, `academicConcepts` present, signature unchanged.
- **PR-2 Task 2.3 (local writer-roundtrip matrix — M1-only writer-isolation)** — Session 5 — no commit (in-session evidence) — 6-row matrix executed locally via service-role MCP against fresh `complete_review_atomic` calls; all 6 rows match design-doc expectations exactly (results table below); cleanup via FK-safe deletion order returned all 4 counts to 0.
- **PR-2 Task 2.4 (Migration 2 — backfill historical drift rows)** — Session 6 — `c582ad6` — drafted `20260507000000_filter_drift_pr2_m2_backfill.sql` (209 lines) with 4 idempotent UPDATEs: (1) long-form key promotion themes/season/location → thematicCategories/seasonTiming/locationRequirements with scalar→array coercion; (2) academicIntegration object-shape unwrap WITH concepts rescue (revised vs design doc — uses `(metadata - 'academicIntegration') || jsonb_strip_nulls(jsonb_build_object(...))` to preserve concepts at sibling top-level `academicConcepts`); (3) lessonFormat array→scalar unwrap; (4) location_requirements casing canonicalization in BOTH column AND metadata for 95 lowercase rows (extension per Session 3 OOS finding). Pre-flight PROD probes confirmed clean to proceed: 0 unknown inner keys in AI objects, 0 collision on existing `academicConcepts` top-level key, 0 null subject values inside concepts (jsonb_strip_nulls recursion safe). Local apply via `supabase db reset` clean (62 migrations including M2). All 6 drift counters at 0 locally (concepts_preserved_count = 0 expected; local seed has no object-shape AI). type-check + lint clean. Real semantic verification runs against TEST DB after CI apply.

## In flight

(none — clean stopping point: M1+M2 committed locally, no PR open. Session 7 starts at Task 2.5 — info-gathering on the 17 activity_type location-leak rows.)

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
- **`location_requirements` casing drift (NEW, Session 3)** — TEST DB V-4 verification surfaced 92 rows (12% of corpus) with lowercase values: `indoor` 43, `outdoor` 27, `both` 22 (alongside Title-Case `Indoor` 414, `Outdoor` 82, `Both` 183). UI sends Title-Case from `filterDefinitions.ts:location` so these 92 rows are silently missed by the Indoor/Outdoor/Both filters. **User decision 2026-04-29: option B** — defer to PR-2 M2 (column hygiene) which canonicalizes column values across the corpus, rather than expanding PR-1 with a `_alias_location` helper. **PR-2 M2 must be extended** to canonicalize `location_requirements` to Title-Case alongside lf/at/cm. Not in design doc; capture this in M2 task spec when PR-2 starts.
- **3 rows with `metadata.academicIntegration.concepts = {}` empty-object (NEW, Session 3)** — PR-1's rescue clause would surface these as `academicConcepts: {}` (slight divergence from the locked "key present iff data present" semantic). User-visible impact: ~3 rows show an empty-object key. PR-2 M2 backfill should either skip empty `{}` concepts when moving to top-level `academicConcepts`, or PR-1's rescue could be tightened with `AND l.metadata->'academicIntegration'->'concepts' <> '{}'::jsonb`. Defer to PR-2.
- **`gradeLevel`/`gradeLevels` key mismatch in `useLessonSearch.ts:normalizeMetadata` (PRE-EXISTING, Session 3)** — function returns key `gradeLevel` (singular) but `LessonMetadata` interface declares `gradeLevels` (plural). The `as LessonMetadata` cast hides this. R2-2 round-2 fix kept the cast for this reason. Round-3 verification (PROD probe) confirmed: 697 PROD rows have `metadata.gradeLevel` (singular), 81 have `metadata.gradeLevels` (plural), 0 have both. Frontend grep confirmed `IntListRow.tsx` is the only consumer of `Lesson.metadata.*` from search RPC and reads `cookingSkills`/`gardenSkills` only — NOT a runtime bug. `Lesson.gradeLevels` (top-level, set by `mapRowToLesson` from `row.grade_levels` column) is what the UI uses. Cleanup in a future hygiene PR: rename `gradeLevel` → `gradeLevels` in normalizeMetadata + drop the `as LessonMetadata` cast.

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

### Session 3 — 2026-04-29 — PR-1 round-capped (round-1 + round-2 review iterations) + ready to merge

Major events:
- Session-start orientation: read kickoff + status + git state. `type-check` + `lint` clean baseline.
- **Round-1 CI completion**: polled until all checks resolved. Security Audit fail is the pre-existing `@lhci/cli` hygiene followup (not from PR-1). E2E Tests passed (CI applied `20260505000000_*` to TEST DB cleanly). 4 `claude[bot]` review summaries + 9 line comments landed.
- **Round-1 triage** (4 ACCEPT, 12 REJECT): rebuttal pass per `feedback_bot_review_investigation.md`. Highlights:
  - **Verified M-1 (GIN index gap)**: TEST DB index inventory confirmed `idx_lessons_activity_type` is btree on `((metadata ->> 'activityType'))` — dead under PR-1's column query. New `idx_lessons_activity_type_col` GIN required.
  - **Rejected M-3 (anon grant on `_alias_*`)**: bot was technically wrong — `search_lessons` has no `SECURITY DEFINER` keyword, runs as INVOKER, helpers need anon grant or function breaks. Verified by reading migration source.
  - **Rejected F-1 / accepted R2-2 instead**: round-1 F-1 ("`as` → `satisfies`") was rejected because dropping the cast would surface unrelated `gradeLevel`/`gradeLevels` mismatch. Round-2 came back with the targeted typeof-guard fix on `m.duration: unknown` / `m.groupSize: unknown` — accepted.
- **Round-1 fix-up `5a26a13`**: TS-1 + TS-3 normalizeMetadata tests + new GIN index migration `20260505010000_filter_drift_pr1_activity_type_gin_index.sql` (additive, idempotent). Local `supabase db reset` clean; tests 8/8.
- **Round-2 CI completion**: polled. All Claude reviews + E2E + semgrep + perf checks passed. M-1 GIN index confirmed live on TEST DB. Activity_type counts unchanged post-index (slug=293, bare=293; garden_slug=275, garden_bare=275) — correctness preserved.
- **Round-2 triage** (1 ACCEPT, 15 REJECT): R2-2 typeof guards on duration/groupSize (concrete fix, low risk). Cast retained because dropping reveals unrelated `gradeLevel`/`gradeLevels` key mismatch — captured as out-of-scope follow-up.
- **Round-2 fix-up `2c3c8ff`**: 2-line typeof narrowing. Tests 8/8, type-check ✓, lint ✓.
- **TEST DB verification matrix executed** (`mcp__supabase-test__execute_sql`, 13 rows including V-4 themes/seasons/location):

  | # | Test | Hits |
  |---|---|---:|
  | 1 | baseline (no filters) | 772 |
  | 2 | lessonFormat=`single-period` (slug) | 471 |
  | 3 | lessonFormat=`Single period` (Title) | 471 |
  | 4 | activityType=`[cooking-only]` (slug) | 293 |
  | 5 | activityType=`[cooking]` (bare) | 293 |
  | 6 | cookingMethods=`[stovetop]` (lower) | 174 |
  | 7 | cookingMethods=`[Stovetop]` (Title) | 174 |
  | 8 | cookingMethods=`[Basic prep only]` | 195 |
  | 9 | academicIntegration=`[Math]` | 99 |
  | 10 | culturalHeritage=`[asian]` (slug) | 67 |
  | 11 | filter_themes=`[Seed to Table]` | 416 |
  | 12 | filter_seasons=`[Fall]` | 440 |
  | 13 | filter_location=`[Indoor]` | 414 (⚠️ misses 43 lowercase) |

  All 5 documented production drift mismatches resolve correctly. Numbers within design-doc §1 tolerance. Metadata reconstruction shapes verified on real corpus rows: `lessonFormat`=string, `academicIntegration`=array, `academicConcepts`=present-iff-data.

- **PR body updated** with full TEST DB matrix + V-4 location drift finding + M-1 GIN status.
- **Acknowledgment comment posted** ([issuecomment-4347198219](https://github.com/danfeder/esnyc-lesson-search-react/pull/471#issuecomment-4347198219)) summarizing all round-1 + round-2 triage decisions per `feedback_bot_review_investigation.md` rebuttal-pass discipline.
- **Round-cap declared** (per "round-cap after 2 rounds" workflow). PR ready for human merge approval.
- **Round-3 verification pass** (added after user feedback during session-end): round-3 brought a new `claude[bot]` issue-comment + `CHANGES_REQUESTED` review on commit `2c3c8ff`. Per kickoff workflow "fix only critical bugs, document the rest, ship." Two findings warranted PROD probes (`mcp__supabase-remote__execute_sql`):
  - **Scalar `academicIntegration`**: 0 PROD rows. PR-1's `[]`-for-scalar behavior affects no production data; not a regression. (PROD totals: 693 object-shape, 87 array-shape, 0 scalar = 788 total.)
  - **`gradeLevel`/`gradeLevels` mismatch**: confirmed pre-existing, no runtime impact (697 rows singular / 81 plural / 0 both; only `IntListRow.tsx` consumes `Lesson.metadata.*` from the search RPC and reads `cookingSkills`/`gardenSkills`).
  - All other round-3 findings are restatements of round-1/round-2 already-triaged items (WHERE-clause-dup, IIFE, arg order, academicConcepts modeling, alias long-tail, dead-JSONB-index hygiene).
  - **Follow-up comment posted** ([issuecomment-4347241763](https://github.com/danfeder/esnyc-lesson-search-react/pull/471#issuecomment-4347241763)) documenting the round-3 verification + reaffirming round-cap.

### Session 4 — 2026-04-29 — PR-1 merged + PROD-applied + PROD-verified end-to-end

Major events:
- Session-start orientation: read kickoff + status + git state. `type-check` + `lint` clean baseline. Worktree dirt unrelated (`.beads/*` + `.claude/scheduled_tasks.lock`). Confirmed PR #471 still OPEN, `mergeStateStatus: UNSTABLE`, `reviewDecision: CHANGES_REQUESTED` (round-3 already triaged + documented in Session 3). Reported orientation; user authorized merge.
- **PR-1 merge.** Project convention is rebase-merge (verified via 5 most recent merged PRs — no merge-commit titles). `gh pr merge 471 --rebase --delete-branch` succeeded. All 9 commits (4 docs ancestors from Session 0 scaffolding that intentionally rode along + 5 PR-1 work commits) rebased cleanly onto origin/main. New SHAs `b8d09e7` (migration) → `db98914` (Session 3 docs). Feature branch deleted on origin + locally.
- **`migrate-production.yml` run `25131961626` triggered on merge push.** All 4 jobs success after user's manual production-environment approval: Check Migration Changes ✓, Migration Dry Run ✓, Verify Recent Backup ✓, Apply to Production ✓. **NO SASL Apply-step flake this run** — both migrations applied cleanly first try (pattern was `20260505000000_filter_drift_pr1_column_based_search_lessons` then `20260505010000_filter_drift_pr1_activity_type_gin_index`).
- **Structural verification on PROD** (`mcp__supabase-remote__execute_sql`):
  - **Migration list**: both `20260505000000` and `20260505010000` present at the head of `supabase_migrations.schema_migrations` ✓
  - **`search_lessons` signature**: `filter_cooking_method text[]` (was `text` in baseline), `filter_lesson_format text` scalar (correct, single-select per design) ✓
  - **`idx_lessons_activity_type_col` GIN index** on `activity_type` column present ✓
    - Note: old btree `idx_lessons_activity_type` on `((metadata->>'activityType'))` still exists. Dead under PR-1 column query (filter no longer reads metadata for activityType); kept for hygiene-PR cleanup later. Not a correctness issue, just dead bytes.
  - **All 4 alias helpers deployed** with correct signatures: `_alias_activity_type(p_values text[])`, `_alias_cultural_heritage(p_values text[])`, `_alias_lesson_format(p_value text)`, `_match_cooking_methods(p_l_methods text[], p_filter_methods text[])` ✓
- **13-row PROD verification matrix** (same shape as Session 3's TEST DB matrix; PROD corpus 788 vs TEST 772):

  | # | Test | TEST | PROD | Notes |
  |---|---|---:|---:|---|
  | 1 | baseline (no filters) | 772 | 788 | corpus drift (TEST is reset weekly) |
  | 2 | lessonFormat=`single-period` (slug) | 471 | 481 | matches Title (alias works) ✓ |
  | 3 | lessonFormat=`Single period` (Title) | 471 | 481 | matches slug ✓ |
  | 4 | activityType=`[cooking-only]` (slug) | 293 | 299 | matches bare (alias works) ✓ |
  | 5 | activityType=`[cooking]` (bare) | 293 | 299 | matches slug ✓ |
  | 6 | cookingMethods=`[stovetop]` (lower) | 174 | 178 | matches Title (case-insensitive) ✓ |
  | 7 | cookingMethods=`[Stovetop]` (Title) | 174 | 178 | matches lower ✓ |
  | 8 | cookingMethods=`[Basic prep only]` | 195 | 201 | slug↔phrase alias ✓ |
  | 9 | academicIntegration=`[Math]` | 99 | 104 | column-based filter unblock ✓ |
  | 10 | culturalHeritage=`[asian]` (slug) | 67 | 68 | alias→expand pipeline ✓ |
  | 11 | filter_themes=`[Seed to Table]` | 416 | 424 | unchanged (column-based) ✓ |
  | 12 | filter_seasons=`[Fall]` | 440 | 446 | unchanged (column-based) ✓ |
  | 13 | filter_location=`[Indoor]` | 414 | 421 | ⚠️ ~12% undercount, deferred to PR-2 M2 |

  All 5 documented production drift mismatches resolve correctly on PROD. Tests 2≡3, 4≡5, 6≡7 all match (slug-vs-Title alias works on real corpus). Test 8 (Basic prep only slug↔phrase) at 201 within expected range. Test 9 (Math) at 104 — column-based filter is unblocking what was undercounted by the JSONB filter. Test 10 (asian → expand) at 68 — full alias→`expand_cultural_heritage` pipeline works.

- **Metadata reconstruction shapes verified on 5 real PROD rows** (filtered to academicIntegration=Math): all 5 returned `lessonFormat` as JSON string (scalar per design), `academicIntegration` as JSON array (per design), `academicConcepts` key present as object — concepts rescue working on real corpus ✓
- **PR-1 fully shipped.** Code merged, PROD-applied, verified end-to-end. UI behavior on PROD search filters now matches the design intent (mostly — V-4 location finding remains as the planned PR-2 M2 fix).

Next session (Session 5): start at **PR-2 Task 2.1 — writer-fix `complete_review_atomic`** per impl plan §2 + design doc §5.

1. Branch: `git checkout -b feat/filter-drift-pr2-writer-column-trigger` off `main` (which already has PR-1 commits as of `db98914`).
2. Pre-flight investigation: probe `process-submission` v29 PROD writer shape baseline (TS source path) before drafting M1 writer changes — capture what the current writer produces vs what canonical-shape requires.
3. Then sequence per locked decision: M1 writer fix → M2 backfill (extend scope to canonicalize `location_requirements` casing per Session 3 V-4 finding + handle empty-`{}` concepts per Session 3 finding) → M3 column hygiene (gated on Task 2.5 investigation of 17 activity_type location-leak rows; surface findings to user before drafting) → M4 trigger install + enable.
4. Writer-roundtrip test matrix (Task 2.3): 6 academicIntegration cases + 1 lessonFormat scalar — fixtures from impl plan Task 2.3 step 1, NOT design-doc older 4-row version. Synthetic submissions via service-role MCP; clean up via UUID-safe + FK-safe SQL block in Task 2.3.
5. PR-2 PROD apply needs the brief reviewer-approval pause coordination per locked decision (notify in advance, apply, run drift-residue + writer-shape checks, notify reviewers to resume).

### Session 5 — 2026-04-29 — PR-2 M1 drafted, applied locally, matrix verified

Major events:
- Session-start orientation: read kickoff + status + design doc + impl plan Task 2.1–2.3. `type-check` + `lint` clean baseline; worktree dirt is the usual `.beads/*` + `.claude/scheduled_tasks.lock` (unrelated).
- **Branched** `feat/filter-drift-pr2-writer-fix-trigger` off `main` (which carries PR-1 + Session 4 docs `dae77e8` riding along).
- **Task 2.1 (pre-flight)** — PROD `complete_review_atomic` confirmed byte-equivalent to `20260428000008` via `pg_get_functiondef` position-checks: both expected bugs present (`jsonb_build_array(v_meta->>'lessonFormat')` ✓, `COALESCE(v_meta->'academicIntegration', '[]'::jsonb)` ✓), status guard present, signature unchanged. `grep` of all post-Phase-4 migrations (Phase 5, 6, 6.2) confirms only comment references — no `CREATE OR REPLACE FUNCTION complete_review_atomic` after `20260428000008`. PROD cohort snapshot 2026-04-29 matches design doc baseline (1/693/81/690/3/788). Design doc §5 snippets apply directly.
- **Task 2.2 (M1 migration)** — drafted `supabase/migrations/20260506000000_filter_drift_pr2_m1_writer_fix.sql` as a full `CREATE OR REPLACE FUNCTION` body (signature unchanged → no DROP). Two body changes: Bug A `lessonFormat` builder → `to_jsonb(scalar)`, Bug B `academicIntegration` typeof-aware CASE in v_legacy_meta + INSERT branch (`_phase4_jsonb_text_array(...)`) + UPDATE branch (`_phase4_jsonb_text_array_or_null(...)` wrapped in `COALESCE`). Plus `academicConcepts` rescue (object-shape AI with non-empty `concepts` → top-level sibling key) + forward-compat sibling-key path (caller passes `academicConcepts` directly). Empty-`{}` concepts intentionally NOT rescued (matches PR-2 M2 backfill convention). ROLLBACK comment block at file end. Local apply via `supabase db reset` clean. Function source verified live via `pg_get_functiondef` position-checks: BOTH old bugs GONE, BOTH fixes present, `academicConcepts` present, signature `(p_submission_id uuid, p_reviewer_id uuid, p_decision text, p_metadata jsonb, p_notes text, p_selected_lesson_id text)` unchanged. Source length 11577 → 13749 (concepts rescue + comments). Commit `9e5b245`.
- **Task 2.3 (local writer-roundtrip matrix)** — 6 synthetic `lesson_submissions` rows inserted at UUIDs `00000000-aaaa-bbbb-cccc-00000000000{1..6}` with `teacher_id = 11111111-1111-1111-1111-111111111111` (canonical local seed) + `status = 'submitted'`. Then 6 `complete_review_atomic(p_decision := 'approve_new', p_reviewer_id := <reviewer@test.com>, p_metadata := <matrix row>, ...)` calls via `UNION ALL` in one MCP call (PG executes in arbitrary order but each row is independent). All 6 calls returned fresh `lesson_*` IDs. Inspection query confirms ALL 6 rows match the expected matrix exactly:

  | Row | Input `academicIntegration` | `metadata.academicIntegration` | `metadata.academicConcepts` | `academic_integration` col | `metadata.lessonFormat` | `lesson_format` col |
  |---:|---|---|---|---|---|---|
  | 1 | `["Math","Science"]` | `["Math","Science"]` (array) | (key absent) | `["Math","Science"]` | `"Single period"` (string) | `Single period` |
  | 2 | `{"selected":["Math"]}` | `["Math"]` (array) | (key absent) | `["Math"]` | `"Single period"` (string) | `Single period` |
  | 3 | omitted | `[]` (array) | (key absent) | `[]` | `"Single period"` (string) | `Single period` |
  | 4 | `{"selected":[]}` | `[]` (array) | (key absent) | `[]` | `"Single period"` (string) | `Single period` |
  | 5 | `{"selected":["Math"],"concepts":{"Math":["fractions"]}}` | `["Math"]` (array) | `{"Math":["fractions"]}` | `["Math"]` | `"Single period"` (string) | `Single period` |
  | 6 | `{"selected":["Math"],"concepts":{}}` | `["Math"]` (array) | (key absent) | `["Math"]` | `"Single period"` (string) | `Single period` |

  **Bug A closed** (`lf_meta_type = "string"` for all 6 rows — never `"array"`). **Bug B closed** (`ai_col` is a proper text[] for all rows, including object-shape inputs at rows 2/4/5/6 — no stringified-JSON elements). **Concepts rescue WORKS** (row 5 only). **Empty-`{}` concepts NOT rescued** (row 6 absent — matches "key present iff data present" semantic). UUID-safe + FK-safe cleanup deleted from `lessons` → `submission_reviews` → `submission_similarities` → `lesson_submissions`; all 4 post-cleanup counts = 0.

- **Pre-commit baseline still clean** post-Session-5 changes: `npm run type-check` ✓ `npm run lint` ✓ (SQL-only commit, no TS impact expected and confirmed).

Decisions made this session (no surprises):
- Migration prefix `20260506000000_*` — next-available HHMMSS-padded slot after PR-1's `20260505010000_*`. Consistent with PR-1's pattern.
- Used canonical local seed `11111111-1111-1111-1111-111111111111` for `teacher_id` per impl plan Task 2.3 convention. The FK is to `auth.users.id` only; the chosen UUID happens to map to admin@test.com locally but the writer doesn't care (function takes `teacher_id` as an FK reference, not a role check).
- `UNION ALL` of 6 function calls in one MCP call — efficient and correct because each call references a distinct submission_id (no read-after-write within the statement).
- Did NOT exercise the `approve_update` branch in this matrix. Per impl plan §2.3, the approve_new matrix is sufficient: v_legacy_meta builder is shared between branches; Change B is structurally symmetric (`_phase4_jsonb_text_array_or_null` wrapped in COALESCE on UPDATE side, `_phase4_jsonb_text_array` on INSERT side — same CASE expression). Approve_update gets an integrated test in Task 2.3 Step 2 (post-CI TEST DB integrated-flow).

Next session (Session 6): pick up at **PR-2 Task 2.4 — Migration 2 (backfill historical drift rows)**.

1. Branch is already on `feat/filter-drift-pr2-writer-fix-trigger`. M1 commit `9e5b245` still local; status doc commit will land alongside.
2. Per impl plan Task 2.4: backfill the 81 short-key rows (`themes`/`season`/`location` → long-form keys) + 693 object-shape AI rows (unwrap `{selected: [...]}` → `[...]` while RESCUING concepts to sibling `academicConcepts` key) + 1 array-shape `lessonFormat` outlier (unwrap to scalar). **Extended scope per Session 3 OOS items**: also canonicalize `location_requirements` column casing (92 lowercase rows → Title-Case) AND skip empty-`{}` concepts when moving to top-level `academicConcepts` (3 PROD rows).
3. Idempotent SQL. Local apply + verification probe (zero short_keys / zero object_ai / zero array_lf remaining); then commit. Plus handle the location-casing extension correctly (corpus is mixed-case; 414 Title-Case + 43 lowercase `Indoor`/`indoor` etc.).
4. Don't tackle Task 2.5 (17 activity_type location-leak investigation) in the same session — that's a discrete user-decision step that's a natural session boundary.

### Session 6 — 2026-04-29 — PR-2 M2 drafted, applied locally, verified

Major events:
- Session-start orientation: read kickoff + status + design doc Migration 2 spec + impl plan Task 2.4. `type-check` + `lint` clean baseline; usual `.beads/*` + `.claude/scheduled_tasks.lock` worktree dirt (unrelated).
- **Task 2.4 pre-flight probes (PROD)**:
  - **AI cohort + unknown-keys probe**: 693 object_rows / 690 rows_with_nonempty_concepts / **0 rows_with_unknown_inner_keys** / 87 already_canonical_array / 81 short_keys / 1 array_lf / 788 total — matches Session 5 baseline; safe to proceed (no unknown inner keys to handle).
  - **Location casing probe**: Title-Case Indoor 421 / Both 188 / Outdoor 82 + lowercase indoor 46 / outdoor 27 / both 22 = **95 lowercase rows** (Session 3 saw 92; +3 drift over 4 days, expected since writer fix isn't yet on PROD).
  - **academicConcepts collision probe**: 0 rows have an existing top-level `academicConcepts` key — no collision.
  - **Concepts internal-null probe (NEW this session)**: 1284 subject pairs across 690 rows; 100% array-shape values; 0 nulls. Confirms `jsonb_strip_nulls` recursion is safe (no internal subject-value nulls to incidentally strip).
- **Task 2.4 (M2 migration)** — drafted `supabase/migrations/20260507000000_filter_drift_pr2_m2_backfill.sql` (209 lines) with 4 idempotent UPDATEs:
  - **(1)** Long-form key promotion (themes/season/location → thematicCategories/seasonTiming/locationRequirements; scalar→array via `jsonb_build_array`; COALESCE preserves any existing long-form key). Verbatim from design doc §5 Migration 2.
  - **(2)** academicIntegration object-shape unwrap WITH concepts rescue. Pattern: `(metadata - 'academicIntegration') || jsonb_strip_nulls(jsonb_build_object('academicIntegration', COALESCE(...->'selected', '[]'::jsonb), 'academicConcepts', CASE WHEN concepts is non-empty object THEN concepts ELSE NULL END))`. The `jsonb_strip_nulls` drops the `academicConcepts` key when source is missing/empty (so the 3 empty-`{}` rows do NOT get a placeholder; matches M1 writer-fix "key present iff data present" semantic). REVISED vs design doc §5 — see Task 2.4 step 2 for rescue rationale.
  - **(3)** lessonFormat array unwrap to scalar (`["x"]` → `"x"`). Verbatim from design doc.
  - **(4)** location_requirements casing canonicalization in BOTH column AND metadata. Two sub-statements: (4a) text[] column with `unnest` + CASE; (4b) jsonb array with `jsonb_set` + `jsonb_agg(CASE...)`. Order: (4) runs after (1) so it catches any lowercase values newly promoted by (1). Extension beyond design doc §5 — Session 3 OOS finding.
  - **ROLLBACK note** as comments at file end: one-way migration, but concepts data IS preserved at top-level `academicConcepts` (legacy shape reconstructable cheaply).
- **Local apply** via `supabase db reset`: clean (62 migrations including new M2). All other migrations unchanged (the `bed61a4...branch not found` warning is from the broken beads pre-commit hook, not from supabase or the migration — see `project_beads_broken.md`).
- **Local verification probe** returns all 6 drift counters at 0: `short_keys_remaining` 0, `object_shape_remaining` 0, `array_lf_remaining` 0, `concepts_preserved_count` 0 (expected — local seed has no object-shape AI), `lowercase_location_col_remaining` 0, `lowercase_location_meta_remaining` 0. `total_rows = 5` (local seed). Real semantic verification runs against TEST DB after CI apply on PR open.
- **Pre-commit baseline still clean**: `npm run type-check` ✓ `npm run lint` ✓ (SQL-only commit, no TS impact). Commit `c582ad6`.

Decisions made this session (no surprises):
- Migration prefix `20260507000000_*` — next-available HHMMSS-padded slot after M1's `20260506000000_*`. Consistent with PR-1/M1 pattern.
- Added internal-null probe for concepts BEFORE drafting (defensive): `jsonb_strip_nulls` recurses, and the impl plan didn't address whether internal subject-value nulls could be incidentally stripped. PROD probe confirmed 0 internal nulls — safe to use the impl plan's recommended `jsonb_strip_nulls` pattern. Captured as a probe step for future similar work.
- Combined both column-side (4a) and metadata-side (4b) location-casing into the same M2 file (rather than splitting into a separate M3-precursor). Order is deliberate: (1) promotion happens first (could create new lowercase metadata.locationRequirements); (4) canonicalization happens last to catch both pre-existing lowercase AND newly-promoted lowercase. Idempotent in either order due to WHERE-clause guarding, but the chosen order is the clearer mental model.
- Did NOT roll Task 2.5 (17 activity_type location-leak rows) into this session — that investigation needs user decision before drafting M3, which is a discrete session-boundary step (matches kickoff guidance).

Next session (Session 7): pick up at **PR-2 Task 2.5 — investigate the 17 activity_type location-leak rows on PROD**.

1. Branch already on `feat/filter-drift-pr2-writer-fix-trigger`. M2 commit `c582ad6` and Session 6 docs commit (pending) on local.
2. Per impl plan Task 2.5: query the 17 rows on PROD via `mcp__supabase-remote__execute_sql` (filter `activity_type IN (ARRAY['indoor'], ARRAY['outdoor']) OR ...`), categorize each row by what `metadata->>'activityType'`, `location_requirements`, and `title`/summary suggest the correct value should be (`cooking`, `garden`, `academic`, `both`, or NULL/empty), and **surface findings to the user as a question table with a recommendation**. Wait for user decision on each row category before proceeding to Task 2.6 (Migration 3).
3. Investigation only — no commit, no migration drafting in this session. The user-decision step IS the natural session boundary.
4. **In a subsequent session**, draft Task 2.6 Migration 3 (column-data hygiene) using the user's mapping decisions. Then Task 2.7 Migration 4 (trigger install + enable). Then Task 2.8 (per-PR ritual + PROD coordination).
