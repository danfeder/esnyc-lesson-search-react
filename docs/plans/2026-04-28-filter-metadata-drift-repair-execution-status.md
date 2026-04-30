# Filter Metadata Drift Repair — Execution Status

**Last updated:** 2026-04-30 — Session 11 (Task 2.8 Steps 5-6 done — round-1 four-surface triage all-reject + TEST DB integrated-flow verification all-pass + PR body updated + round-1 ack comment posted)
**Current PR:** **[PR #472](https://github.com/danfeder/esnyc-lesson-search-react/pull/472)** — OPEN, awaiting human merge approval (no fix-up commits needed; round-cap pre-empted by zero-finding round 1)
**Current task:** Session 12 picks up at **merge approval + PROD apply coordination** (Task 2.8 Step 8) — notify reviewers of ~5 min approval pause, merge PR via rebase, watch for SASL Apply-step flake on `migrate-production.yml`, run drift-residue + post-deploy safety query against PROD via `mcp__supabase-remote__execute_sql`, notify reviewers approvals may resume.
**Branch:** `feat/filter-drift-pr2-writer-fix-trigger` PUSHED to origin (10 code+docs commits across Sessions 4-10 + Session 11 docs commit pending push)
**Last commit on branch:** `cafd092 docs(filter-drift): session 10 — PR-2 pushed, PR #472 opened, CI running` (Session 11 docs commit will follow)

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
- **PR-2 Task 2.5 (investigate the 17 activity_type location-leak rows on PROD)** — Session 7 — no commit (info-gathering + user decision; full 17-row mapping captured below in "Session 7 decisions" for Session 8's M3 draft); 4 PROD probes total — (1) 17-row inventory with title/summary, (2) existing activity_type vocabulary distribution (cooking 299 / garden 278 / both 137 / academic 57 + leaked indoor 14 / outdoor 3), (3) 3-row deeper context probe on the "Unknown / Error processing" rows (column metadata DID extract for them despite title/summary failure: thematic_categories/academic_integration populated; cooking_methods/garden_skills empty), (4) corpus-wide deterministic-classifier validation showing cooking_methods + garden_skills columns predict activity_type with 97-99.7% precision per ESYNYC convention (`both` strictly = "Cooking + Garden", NOT "cooking + academic"). Documentation grep surfaced canonical semantic in `filterDefinitions.ts:23-32` (UI labels: `cooking-only`="Cooking Only", `garden-only`="Garden Only", `both`="Cooking + Garden", `academic-only`="Academic Only") and `LESSON_SUBMISSION_SPECS.md:718` ("Activity Type - Single-select (Cooking/Garden/Both/Academic)"). User-decision step IS the natural session boundary; M3 draft deferred to Session 8.
- **PR-2 Task 2.7 (Migration 4 — install + enable lessons_normalize_write trigger)** — Session 9 — `9192228` — drafted `supabase/migrations/20260509000000_filter_drift_pr2_m4_normalize_trigger.sql` (403 lines). Helper `_meta_array_matches_column(jsonb, text[])` (STABLE SQL function, multiset-equality comparator) + trigger function `lessons_normalize_write()` with 11 sections — (A) concepts rescue (must run BEFORE AI flatten; idempotent NOT-EXISTS guard), (B) lesson_format scalar with array→scalar coercion + sync, (C) academic_integration object→array flatten + sync, (D-K) 8 text[] fields (activity_type, cooking_methods, thematic_categories, season_timing, location_requirements, core_competencies, cultural_heritage, social_emotional_learning) with column⇄metadata sync. RAISE NOTICE on every actual coercion, silent on canonical input. Plus `DROP TRIGGER IF EXISTS lessons_normalize_write_trg ON lessons` + `CREATE TRIGGER lessons_normalize_write_trg BEFORE INSERT OR UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.lessons_normalize_write()` + COMMENT ON FUNCTION + COMMENT ON TRIGGER. Local apply via `supabase db reset` clean (64 migrations including new M4); seed.sql post-apply triggered 46 NOTICEs (all canonical column → meta sync since seed inserts have NULL metadata; expected behavior). 5 verification smokes ALL pass: Smoke 1 lessonFormat ["Single period"] → scalar "Single period" + lf_meta_type='string'; Smoke 2 AI {selected:["Math"], concepts:{Math:["fractions"]}} → ai_meta=["Math"] flat array + ac_meta={"Math":["fractions"]} top-level + ac_key_present=true; Smoke 3 AI {selected:["Science"], concepts:{}} → ai_meta=["Science"] flat array + ac_meta=null + ac_key_present=false (empty concepts NOT rescued); Smoke 4 column-wins (col=["cooking","garden"] + meta=["cooking"]) → meta rewritten to ["cooking","garden"]; Smoke 5 idempotency (no-op UPDATE on canonical row) → both column AND metadata unchanged. Trigger pg_trigger inspection: tgname=lessons_normalize_write_trg, tgenabled='O' (origin/enabled), BEFORE INSERT OR UPDATE FOR EACH ROW. Helper + trigger function both INVOKER mode (no SECURITY DEFINER); helper STABLE, trigger function VOLATILE. type-check + lint clean.

- **PR-2 Task 2.6 (Migration 3 — column-data hygiene)** — Session 8 — `56bb59a` — drafted `supabase/migrations/20260508000000_filter_drift_pr2_m3_column_hygiene.sql` (186 lines) with two cleanups: (A) activity_type location-leak fix using a CTE-driven `WITH leak_mapping(lesson_id, new_activity_type, new_metadata_value) AS (VALUES ...)` mapping for the 17 rows + single UPDATE writing both column AND metadata.activityType (canonical array shape `["cooking"]` etc. for 14 set rows; `metadata - 'activityType'` to delete the key for 3 cleared rows so PR-1 reconstruction's empty-column fallback doesn't leak); (B) academic_integration column-vs-meta hygiene with two UPDATEs — Pop A derives column from post-M2 canonical array via `array_agg(value FROM jsonb_array_elements_text(metadata->'academicIntegration'))`, Pop B forces metadata to match column via `jsonb_set(... '{academicIntegration}', to_jsonb(academic_integration))` with ordered `array_agg(value ORDER BY value)` set-comparison. All three UPDATEs idempotent. Pre-flight PROD probes (4 queries) confirmed 17 leak rows still match Session 7 mapping exactly + Pop A=2 PROD rows (lower than design doc's "~5" estimate; both NULL-column object-shape AI rows that M2 unwraps) + Pop B=4 PROD rows (matches design doc; all 4 column ⊃ meta.selected, concepts preserved on subset). Local apply via `supabase db reset` clean (63 migrations including M3). type-check + lint clean.

- **PR-2 Task 2.8 Steps 1-4 (pre-PR check + pre-push reviewer dispatch + push + open PR)** — Session 10 — no commit (Session 10 docs commit pending) — `npm run type-check && npm run lint` ✓ ✓; `feature-dev:code-reviewer` (Sonnet, default) dispatched on `git diff main...HEAD` against full 4-migration body — agent self-rebutted 10 candidate findings during trace and reported **zero genuine issues above the 80-confidence threshold** (Findings 1-10 all withdrawn after walk-through; theoretical NULL-element edge case in `_meta_array_matches_column` and theoretical empty-string lessonFormat element noted as Nit/below-bar with zero practical exposure per pre-flight probes). No fix-up commits. `git push -u origin feat/filter-drift-pr2-writer-fix-trigger` clean (single new branch on origin, tracking set up). **PR [#472](https://github.com/danfeder/esnyc-lesson-search-react/pull/472) opened** with adapted body (4-migration summary + Why-this-matters + PROD coordination + 9-line Test plan with [x]/[ ] markers + local pre-flight evidence table for M1 6-row matrix + M4 5-smoke summary).

- **PR-2 Task 2.8 Steps 5-6 (round-1 four-surface bot review triage + TEST DB integrated-flow verification)** — Session 11 — no code commit (Session 11 docs commit pending) — CI completed, all 17 checks green except known pre-existing `Security Audit` (`@lhci/cli` chain). Four-surface query produced 1 substantive review (`claude-review`, 9879 bytes, 4 awareness items — all rejected per `feedback_pr_bot_review_workflow.md` user-visible-bug-or-DB-damage bar; rationale captured in Session 11 log + posted as round-1 ack [issuecomment-4349219607](https://github.com/danfeder/esnyc-lesson-search-react/pull/472#issuecomment-4349219607)). `claude-database-review` ran clean but did NOT post a comment (different from PR-1 pattern; surfaced for transparency). 0 line-attached comments, 0 GitHub reviews. **No fix-up commits warranted.** TEST DB verification via `mcp__supabase-test__execute_sql` ALL PASS: 6-counter shape-residue all 0 (short keys / object AI / array LF / lowercase location col / lowercase location meta / activity_type leak); concepts preservation 677/772 (matches PROD pre-flight 690/788 ratio); 7-row writer matrix (6 approve_new + 1 approve_update against row 1's lesson) all match expected — Bug A + Bug B + concepts rescue confirmed in BOTH approve_new AND approve_update branches; row 7 archived row 1's pre-update state to lesson_versions ✓; 3 trigger drift smokes via direct SQL all canonicalize correctly (array→scalar lf, object→flat AI with concepts rescue, empty-concepts skip); RLS 5/7 pass with same 2 pre-existing `archive_duplicate_lesson` failures as PR-1 baseline (Phase 8b legacy). PR body Verification section updated with full evidence including 7-row matrix table + 3-row trigger smoke table + cleanup verification.

## In flight

PR #472 — round-1 triage complete (zero fix-ups), TEST DB verification all-pass. Awaiting human merge approval. Effective round-cap pre-empted by zero-finding round 1 (round-cap rule kicks in after round 2; if no further bot rounds land, this is the final state).

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

### Session 7 (2026-04-29) decisions

**Task 2.5 — 17 activity_type location-leak rows.** All 17 rows had the same shape on PROD: `activity_type` column equals `location_requirements` value (`['indoor']` or `['outdoor']`), `metadata->>'activityType'` was NULL/missing — strong import-bug signal where location field got copied into activity_type field by a pre-Phase-4 import path.

**Documentation discovery (re-calibration of first-pass recommendations).** Initial text-based classification from title/summary suggested `both` for many cooking-with-academic-content lessons (e.g., "read an article, then cook"). Grep through `src/utils/filterDefinitions.ts:23-32` and `docs/LESSON_SUBMISSION_SPECS.md:718` revealed the canonical UI labels: `both` = "**Cooking + Garden**" (NOT cooking + academic). Corpus-wide validation probe confirmed the semantic with 97-99.7% precision: `cooking_methods` populated + `garden_skills` empty → `cooking`; `garden_skills` populated + `cooking_methods` empty → `garden`; BOTH populated → `both`; NEITHER populated → `academic`. Re-classified all 17 rows using `cooking_methods` + `garden_skills` columns as the deterministic classifier (these columns DID extract correctly even on the 3 "Error processing" rows where title/summary failed).

**User decision (2026-04-29):** approved Decision 1 (the 14 unambiguous rows per the deterministic classifier) + Decision 2 option B (clear the 3 "Unknown / Error processing" rows to `ARRAY[]::text[]`; let `complete_review_atomic` populate them on next reviewer touch).

**Final 17-row mapping for Session 8's M3 draft:**

| # | lesson_id | title | leaked column | → final value (column AND metadata) |
|---:|---|---|:---:|:---:|
| 1 | `1aqSoaGDAVFvSWjZJeKAEIkHvPdrWKsxq` | Black Bean Burgers | `['indoor']` | `cooking` |
| 2 | `1cCe0ugBM572aGRojx1RfR6wE5FuBA3CjFetD8NKffvs` | Pesticides | `['outdoor']` | `garden` |
| 3 | `1iwA2l4QPsqXJqu5lP8Ix5BarlTjIhxTQ` | Winter After School - Session 2 | `['indoor']` | `cooking` |
| 4 | `1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd` | Unknown (Error) | `['indoor']` | `ARRAY[]::text[]` (clear) |
| 5 | `1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU` | Unknown (Error) | `['indoor']` | `ARRAY[]::text[]` (clear) |
| 6 | `1lGcRDLkd7n5-CulckQb-rt1M5Q7SeA3K` | Making Potting Soil | `['indoor']` | `garden` |
| 7 | `1n8wS0X-dXAw9sfQuLFgsMg_kNvACph3cT4yd9p2i1eg` | Who's Who in the Food System | `['indoor']` | `academic` |
| 8 | `1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8` | Unknown (Error) | `['indoor']` | `ARRAY[]::text[]` (clear) |
| 9 | `1nzZC51049bxqfXYRxWX5Z-TwEL-8uS4H1nbWX7cgPFk` | Five Senses Scavenger Hunt | `['outdoor']` | `garden` |
| 10 | `1P8fqhHyo7FIzysTkrh628cbOfkpYAQw1` | Plant Part Stir Fry | `['indoor']` | `both` |
| 11 | `1sHwSvaFaZC9wpHOqr-dQBMEl-paf6zZV` | Cajun Black Eyed Peas sliders | `['indoor']` | `cooking` |
| 12 | `1sn_6veDzL8P0fyHIrGIRRpD5BPp86ZuOB2CR7wnDF6Q` | Mixed Greens and Cornbread | `['indoor']` | `both` |
| 13 | `1v7aPRuAM9q1jdffDr1IqgxZUKqTZ7By-` | Biodiversity | `['outdoor']` | `garden` |
| 14 | `1V7feFPt6bZc0b695g_3Qe_U4AAE-xO5s` | Sri Lankan Curry | `['indoor']` | `cooking` |
| 15 | `1vDebvrcoPdDcoooLnpF64P3ade4l8ZRqVkfSlEAyYts` | Fattoush | `['indoor']` | `cooking` |
| 16 | `1xwTiqazvuLxwYiNB-y6xLaRRVFkDkvOgYroXPstQLjE` | African American Food Traditions | `['indoor']` | `cooking` |
| 17 | `1YeRlyncgM-gMS-Aica2Fk7wjBsRN9-K6` | Fattoush (dup of #15) | `['indoor']` | `cooking` |

**Distribution: 7 `cooking`, 4 `garden`, 2 `both`, 1 `academic`, 3 cleared.** Session 8 M3 draft uses these as the `lesson_id IN (...) → CASE` mapping; per Task 2.6 step 1, M3 must update BOTH `activity_type` column AND `metadata.activityType` (canonical shape: JSON array `["<value>"]` for the 14 set rows; `metadata - 'activityType'` to delete the key for the 3 cleared rows — column gets `ARRAY[]::text[]`).

**Side observation (out-of-scope for M3, captured for follow-up):** rows #15 and #17 are byte-duplicates ("Fattoush" with identical title + summary). Worth flagging for a future content-dedup pass (separate from M3 leak fix).

### Session 9 (2026-04-29) decisions

**Added private helper `_meta_array_matches_column(jsonb, text[])`** for multiset-equality comparison (STABLE SQL function). Used 9 times in `lessons_normalize_write` (once per text[] field) — keeps each per-field sync block to ~16 lines. Multiset semantic (`array_agg(... ORDER BY)` without DISTINCT) preserves duplicates: if column has `['a','a']`, meta must too; otherwise the trigger rewrites meta to match column. The impl plan didn't explicitly call for this helper but Task 2.7's "write the SQL inline, not pseudo-code" directive applies to NOT writing pseudocode, not to NOT factoring helpers. Pattern is consistent with PR-1's `_alias_*` and `_match_cooking_methods` helpers. Helper is INVOKER-mode (no SECURITY DEFINER) — only called from the trigger, which runs under whatever role does the INSERT/UPDATE (typically SECURITY DEFINER `complete_review_atomic` as postgres, or service_role direct writes; anon never reaches it).

**Defensive scalar→array coercion for ALL text[] fields, not just AI.** The impl plan said scalar handling is only required for `lessonFormat` (the explicit drift case). I extended scalar→array coercion to every text[] field (activity_type, cooking_methods, AI, thematic_categories, season_timing, location_requirements, core_competencies, cultural_heritage, social_emotional_learning). Probe 4 confirmed these keys are array-only at rest on PROD, so the scalar branch is dead code on canonical input — but it protects against future writers who pass scalar accidentally (e.g., a hand-rolled MCP script that uses `to_jsonb('cooking')` instead of `to_jsonb(ARRAY['cooking'])`). Trade-off: ~3 extra lines per field × 8 fields = 24 lines for forward-compat. Worth it.

**Concepts rescue placement: BEFORE AI flatten, NOT inside AI flatten.** Section (A) runs first, before any other coercion. Reason: if I rescued inside section (C) (the AI handling), I'd have to inspect the object shape twice — once to extract concepts, again to flatten selected. Splitting them keeps each block focused. The NOT-EXISTS guard ensures re-running on a row with already-populated `academicConcepts` is a no-op.

**Empty `concepts: {}` does NOT trigger rescue (Smoke 3 confirms).** Per the locked "key present iff data present" semantic. The guard `NEW.metadata->'academicIntegration'->'concepts' <> '{}'::jsonb` short-circuits when concepts is the empty object. Matches M1 writer fix and M2 backfill rescue conventions.

**Trigger uses CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS + CREATE TRIGGER pattern.** PostgreSQL doesn't support `CREATE OR REPLACE TRIGGER` (only `CREATE TRIGGER`). DROP IF EXISTS guards re-application. On first apply, the local output emitted "trigger does not exist, skipping" NOTICE — expected, harmless.

**Local seed.sql triggers 46 NOTICEs on `db reset`** because seed lessons have populated columns but NULL metadata. Each text[] column → meta canonical sync emits one NOTICE. The 5 seed rows × ~9 fields each = 46 NOTICEs (LESSON-003 + LESSON-005 have empty `cooking_methods` AND `cultural_heritage` so 8 NOTICEs each instead of 10). This is expected: seed.sql doesn't represent production-canonical writes; production writes via `complete_review_atomic` post-M1 produce canonical column⇄meta pairs which trigger zero NOTICEs. Local NOTICE flood is loud-but-harmless evidence that the trigger fires on every INSERT.

**LESSON-001 etc. seed quirk persists.** Local seed inserts `lesson_format = ARRAY['Full Lesson']::text[]` into a `text` column; Postgres array→text coercion turns this into the literal string `'{Full Lesson}'`. Trigger sees that as the column value and writes meta.lessonFormat = `"{Full Lesson}"`. Pre-existing seed quirk (noted in Session 1); not a trigger bug.

### Session 8 (2026-04-29) decisions

**Pop A actual count: 2 (vs design doc estimate of ~5).** Both PROD rows are NULL-column rows with object-shape `metadata.academicIntegration` carrying `selected: ['Science', 'Literacy/ELA']` plus rich concepts. M2's UPDATE 2 will canonicalize them to flat array; M3 Pop A then derives column. SQL uses general WHERE clause (`column NULL AND meta is non-empty array`), so the lower count doesn't change M3's logic — just the expected impact.

**Pop B actual count: 4 (matches design doc estimate of ~4).** All 4 PROD rows have column ⊃ meta.selected (e.g., col `["Health","Math"]` vs meta `["Math"]`); the 4 rows had rich object-shape AI with concepts on the meta-subset, so the column-wins fix preserves concepts via M2's rescue at top-level `metadata.academicConcepts`. No data loss.

**At-rest `metadata.activityType` shape divergence on PROD (impl plan Task 2.6 step 1 cross-check fired).** Spot-check on 5 canonical (non-leak) rows + corpus-wide count surfaced that **only 1 of 771 canonical rows has the assumed canonical-array shape at rest**: 689 rows have `metadata.activityType = NULL` (key absent), 81 rows have a string scalar (e.g., `"cooking"`), 1 row has an array. M1's writer (lines 223 + 297) writes ONLY the column from `v_meta->>'activityType'`; metadata is never normalized to array shape. The impl plan firmly states "M3 must write array" and PR-1 reconstruction outputs array via `to_jsonb(l.activity_type)`, so the 14 leak-fix set rows become the second cohort with canonical-array at rest. The remaining 770 non-canonical rows stay non-canonical until the M4 trigger force-canonicalizes them on next touch (column-wins on UPDATE). PR-1 reconstruction masks this on read; no filter behavior is affected. Surfaced for design-doc-level record per the impl plan's instruction; not a blocker for M3.

**CTE-driven leak-fix mapping (one UPDATE, not many).** Chose `WITH leak_mapping(lesson_id, new_activity_type, new_metadata_value) AS (VALUES (..., ARRAY['cooking']::text[], '["cooking"]'::jsonb), ...)` over multiple grouped UPDATEs (one per canonical bucket). Single statement reads cleanly + groups all 17 rows + handles "set" vs "cleared" rows via `CASE WHEN m.new_metadata_value IS NULL THEN COALESCE(metadata, '{}'::jsonb) - 'activityType' ELSE jsonb_set(...) END`. The NULL-marker pattern in VALUES is the cleanest way to express "delete the key" as a per-row option.

**Local "verification gap" via `supabase db reset` ordering.** Supabase applies seed.sql AFTER all migrations, so M3's data fixes operate on an empty `lessons` table during apply, and the 5 seed rows are inserted post-fix. The 4-counter probe initially returned `ai_col_meta_mismatch_remaining = 5` (all 5 seed rows have populated column + missing AI key, which IS exactly the Pop B WHERE-clause condition). Manually re-running M3's three UPDATEs against the loaded seed data brought all 4 counters to 0/0/0/0 and confirmed Pop B's `jsonb_set` produces canonical-array meta on real rows. The migration logic is correct; the local "test" via `db reset` just doesn't exercise the data-fix path. Real semantic verification will run against TEST DB after CI applies M3 to production-cloned data on PR open. Captured pattern for future data-fix migrations: don't trust local `db reset` as a verification surface for migrations that operate on existing data.

## Out-of-scope follow-ups captured here

- **`facetCounts.ts:55` array-shape hardening** — was scoped into PR-3 Task 3.5; with PR-3 deferred, this stays open in the `MEMORY.md` "Open hygiene follow-ups" list. Don't address inside PR-1 or PR-2.
- **17 `activity_type` location-leak rows** — investigation step gated inside PR-2 Task 2.5. The investigation produces the input mapping for M3 (Task 2.6); session that hits Task 2.5 must surface findings to user and wait for decision before drafting M3.
- **`location_requirements` casing drift (NEW, Session 3)** — TEST DB V-4 verification surfaced 92 rows (12% of corpus) with lowercase values: `indoor` 43, `outdoor` 27, `both` 22 (alongside Title-Case `Indoor` 414, `Outdoor` 82, `Both` 183). UI sends Title-Case from `filterDefinitions.ts:location` so these 92 rows are silently missed by the Indoor/Outdoor/Both filters. **User decision 2026-04-29: option B** — defer to PR-2 M2 (column hygiene) which canonicalizes column values across the corpus, rather than expanding PR-1 with a `_alias_location` helper. **PR-2 M2 must be extended** to canonicalize `location_requirements` to Title-Case alongside lf/at/cm. Not in design doc; capture this in M2 task spec when PR-2 starts.
- **3 rows with `metadata.academicIntegration.concepts = {}` empty-object (NEW, Session 3)** — PR-1's rescue clause would surface these as `academicConcepts: {}` (slight divergence from the locked "key present iff data present" semantic). User-visible impact: ~3 rows show an empty-object key. PR-2 M2 backfill should either skip empty `{}` concepts when moving to top-level `academicConcepts`, or PR-1's rescue could be tightened with `AND l.metadata->'academicIntegration'->'concepts' <> '{}'::jsonb`. Defer to PR-2.
- **`gradeLevel`/`gradeLevels` key mismatch in `useLessonSearch.ts:normalizeMetadata` (PRE-EXISTING, Session 3)** — function returns key `gradeLevel` (singular) but `LessonMetadata` interface declares `gradeLevels` (plural). The `as LessonMetadata` cast hides this. R2-2 round-2 fix kept the cast for this reason. Round-3 verification (PROD probe) confirmed: 697 PROD rows have `metadata.gradeLevel` (singular), 81 have `metadata.gradeLevels` (plural), 0 have both. Frontend grep confirmed `IntListRow.tsx` is the only consumer of `Lesson.metadata.*` from search RPC and reads `cookingSkills`/`gardenSkills` only — NOT a runtime bug. `Lesson.gradeLevels` (top-level, set by `mapRowToLesson` from `row.grade_levels` column) is what the UI uses. Cleanup in a future hygiene PR: rename `gradeLevel` → `gradeLevels` in normalizeMetadata + drop the `as LessonMetadata` cast.
- **`approve_update` silently drops `academicConcepts` on full metadata replace (NEW, Session 12 round-2)** — surfaced by claude-review round-2 on PR #472 (2026-04-30, [issuecomment-4349240876](https://github.com/danfeder/esnyc-lesson-search-react/pull/472#issuecomment-4349240876)). `complete_review_atomic`'s `approve_update` branch replaces the full `metadata` blob with `v_legacy_meta` (built from `p_metadata`). If a reviewer's input metadata doesn't include `academicConcepts`, the existing row's `metadata.academicConcepts` is silently overwritten with NULL. The M4 trigger's section A only rescues from object-shape `academicIntegration.concepts` in the *incoming* write, not from the existing row's pre-update `metadata`. **PR-2 *creates* this surface** (pre-PR-2, `academicConcepts` didn't exist; post-PR-2, ~690 rows have populated concepts). Recoverable from `lesson_versions` archive, but the live row UI reads loses the data. Pre-existing whole-blob-replace pattern from Phase 4. **Fix options**: (a) modify `complete_review_atomic` `approve_update` branch to carry forward `v_existing.metadata->'academicConcepts'` when caller doesn't supply it, OR (b) modify `complete-review` edge function to always include `academicConcepts` in input. Out of scope for PR-2 per round-2 triage; mirrored in `MEMORY.md` Open hygiene follow-ups for tracking. Bot's own recommendation: "Approve with note to track."

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

### Session 7 — 2026-04-29 — Task 2.5 investigation complete; user decision captured for M3

Major events:
- Session-start orientation: read kickoff + status + design doc + impl plan Task 2.5–2.6. `type-check` + `lint` clean baseline; usual `.beads/*` + `.claude/scheduled_tasks.lock` worktree dirt (unrelated).
- **Task 2.5 Step 1 (PROD probe — 17-row inventory).** Query against `lessons` filtered by `activity_type IN (ARRAY['indoor'], ARRAY['outdoor']) OR ...` returned exactly 17 rows (14 `['indoor']` + 3 `['outdoor']`) matching design doc §5 baseline. All 17 rows show `metadata->>'activityType' = NULL` and `activity_type` column equals `location_requirements` value — strong import-bug signal.
- **First-pass text-based recommendation built** from titles + summary excerpts: 7 `both` / 5 `garden` / 3 `academic` / 2 `cooking`. Surfaced to user.
- **User asked: "is there documentation in the project around what should be cooking, gardening, academic, or both?"** → triggered re-investigation:
  - **Doc grep finding 1**: `src/utils/filterDefinitions.ts:23-32` defines the canonical UI labels: `cooking-only`="Cooking Only", `garden-only`="Garden Only", **`both`="Cooking + Garden"** (NOT cooking + academic), `academic-only`="Academic Only".
  - **Doc grep finding 2**: `docs/LESSON_SUBMISSION_SPECS.md:718` confirms the 4-category schema "Activity Type - Single-select (Cooking/Garden/Both/Academic)".
  - **Corpus validation probe** confirmed the semantic with 97-99.7% precision: among the 771 non-leaked rows, `cooking_methods`+`garden_skills` columns deterministically classify activity_type — `cooking` rows have cooking_methods/no garden_skills (298/299 = 99.7%), `garden` rows have garden_skills/no cooking_methods (276/278 = 99.3%), `both` rows have BOTH populated (133/137 = 97%), `academic` rows have NEITHER populated (57/57 = 100%).
- **Re-classification pass** using the deterministic classifier on all 17 leaked rows. The `cooking_methods` and `garden_skills` columns DID extract correctly even on the 3 "Error processing lesson" rows where title/summary failed (those 3 had empty cooking_methods + empty garden_skills + thematic_categories=["Garden Basics"] + academic_integration=["Science"]).
- **Revised recommendation surfaced**: 7 `cooking` / 4 `garden` / 4 `academic` / 2 `both`. Explained re-calibration vs first pass; highlighted that 7 rows initially called `both` are actually `cooking` (cooking-with-academic-context, no garden activity).
- **User-requested clarification ("what specifically are you asking me to decide?")** → restructured to two crisp decisions: (1) approve the 14 unambiguous rows; (2) for the 3 "Unknown / Error processing" rows (#4, #5, #8) choose between `academic` per the rule OR clear to `ARRAY[]::text[]`.
- **User decision (2026-04-29)**: approved Decision 1 + Decision 2 option B (clear the 3 Unknown rows entirely). Final mapping captured in "Session 7 (2026-04-29) decisions" above for Session 8's M3 draft.
- 4 PROD probes total this session, all read-only (explicitly authorized in kickoff). No commit until session-end docs commit.

Decisions made this session (already in "Decisions made during execution" above):
- Used corpus's own deterministic classifier (`cooking_methods` + `garden_skills` columns) over text-based interpretation of title/summary. The classifier matches ESYNYC convention with 97-99.7% precision per corpus statistics.
- Cleared the 3 import-error rows entirely (option B) per user choice — `complete_review_atomic` will populate them correctly on next reviewer touch. Preferred over inferring `academic` from empty-empty signal given the import-error context.
- Did NOT draft M3 in this session — user-decision step IS the natural session boundary per kickoff guidance.

Next session (Session 8): pick up at **PR-2 Task 2.6 — Migration 3 (column-data hygiene)**.

1. Branch already on `feat/filter-drift-pr2-writer-fix-trigger`. M1 (`9e5b245`) + M2 (`c582ad6`) + Session 7 docs commit on local.
2. Per impl plan Task 2.6: draft `supabase/migrations/<DATE_PREFIX>_filter_drift_pr2_m3_column_hygiene.sql` using the 17-row mapping in "Session 7 (2026-04-29) decisions" above. Migration prefix `20260508000000_*` — next-available HHMMSS-padded slot after M2's `20260507000000_*`.
3. Two cleanups in M3 per design doc §5 Migration 3 + Task 2.6:
   - **(A) `activity_type` location-leak fix** (17 rows). MUST update both `activity_type` column AND `metadata.activityType`. Canonical metadata shape: JSON array `["<value>"]` for the 14 set rows; for the 3 cleared rows, column = `ARRAY[]::text[]` and metadata uses `metadata - 'activityType'` to delete the key entirely. Use a single UPDATE with `CASE lesson_id` mapping for both surfaces.
   - **(B) `academic_integration` column-vs-meta mismatches (~7 rows)**. Re-derive `academic_integration` column from `metadata->'academicIntegration'` (now canonical flat array post-M2) where the column is null but meta has data. Pre-flight probe: count current mismatches on PROD post-M1 (M1 fixes future writes; M2 already canonicalized metadata; B catches pre-existing column-empty-but-meta-populated rows).
4. Idempotent SQL. Local apply via `supabase db reset` should be clean. Verification probe: 0 rows where `array_length(activity_type, 1) = 0 AND metadata ? 'activityType'`; 0 rows in the 17-row leak set with old `['indoor']`/`['outdoor']` values; counts of `cooking`/`garden`/`both`/`academic` increase by the expected amounts (7/4/2/1).
5. Then Task 2.7 (Migration 4 — install + enable trigger). Then Task 2.8 (per-PR ritual + PROD coordination including the brief reviewer-approval pause per locked decision).

### Session 8 — 2026-04-29 — PR-2 M3 drafted, applied locally, logic verified

Major events:
- Session-start orientation: read kickoff + status + design doc §5 Migration 3 + impl plan Task 2.6. `type-check` + `lint` clean baseline; usual `.beads/*` + `.claude/scheduled_tasks.lock` worktree dirt (unrelated).
- **Task 2.6 pre-flight PROD probes** (4 read-only queries; explicitly authorized in kickoff):
  - **17-row sanity check**: confirmed all 17 leaked lesson_ids on PROD match Session 7's mapping exactly (14 indoor + 3 outdoor; ordered by `activity_type[1] ASC, lesson_id ASC`).
  - **Pop A count**: 2 rows (lower than design doc estimate of ~5). Both are NULL-column rows with object-shape AI `{selected: ['Science', 'Literacy/ELA'], concepts: {Science: [...], Literacy/ELA: [...]}}` — M2 will canonicalize, M3 derives column.
  - **Pop B count**: 4 rows (matches design doc estimate). All 4 have column ⊃ meta.selected (e.g. col=`["Health","Math"]` vs meta=`["Math"]`); rich concepts on the meta-subset, preserved by M2's rescue.
  - **Spot-check on canonical (non-leak) rows**: 4 of 5 canonical rows have `metadata.activityType = NULL`; 1 of 5 has scalar string. Corpus-wide count: 689 NULL + 81 string + 1 array (out of 771 canonical rows). The "design-doc-level concern" cross-check fired — see "Session 8 decisions" above for proceed-as-planned rationale.
- **Task 2.6 (M3 migration) drafted** as `supabase/migrations/20260508000000_filter_drift_pr2_m3_column_hygiene.sql` (186 lines):
  - **(A) leak fix**: CTE-driven `WITH leak_mapping(lesson_id, new_activity_type, new_metadata_value) AS (VALUES ...)` for the 17 rows. Single UPDATE writes both column AND metadata.activityType. The CASE handles NULL-marker rows (3 cleared rows) by deleting the metadata key via `COALESCE(metadata, '{}'::jsonb) - 'activityType'`; set rows get `jsonb_set(..., '{activityType}', '["cooking"]'::jsonb)` (canonical array shape).
  - **(B Pop A)** verbatim from impl plan: `array_agg(value FROM jsonb_array_elements_text(metadata->'academicIntegration'))` correlated subquery in SET; WHERE limits to NULL-column-with-non-empty-array-meta.
  - **(B Pop B)** verbatim from impl plan: `jsonb_set(... '{academicIntegration}', to_jsonb(academic_integration))`; ordered `array_agg(value ORDER BY value)` set-comparison handles unordered-set semantics so spurious orderings don't trigger updates.
  - ROLLBACK note as comments at file end (one-way migration; B Pop B not cleanly reversible since pre-M2 object-shape data is gone).
- **Local apply** via `supabase db reset`: clean (63 migrations including new M3). Standard `branch not found` warning from broken beads pre-commit hook (per `project_beads_broken.md`), unrelated.
- **Local 4-counter verification** initially returned `ai_col_meta_mismatch_remaining = 5` (all 5 seed rows have populated column + missing AI key — exactly Pop B's WHERE condition). Diagnosed: supabase applies seed.sql AFTER migrations, so M3's data fixes don't reach seed-loaded rows. Manually re-ran M3's three UPDATEs against the post-seed data → 4-counter probe returns 0/0/0/0 ✓; spot-check on the 5 seed rows confirms canonical-array `metadata.academicIntegration` matches column on all 5. Migration logic confirmed correct; the `db reset`-based local "verification" is just a wrong tool for data-fix migrations. Real semantic verification will run against TEST DB after CI apply on PR open.
- **Pre-commit baseline still clean**: `npm run type-check` ✓ `npm run lint` ✓ (SQL-only commit, no TS impact). Commit `56bb59a`.

Decisions made this session (already in "Session 8 (2026-04-29) decisions" above):
- Pop A actual count 2 (vs ~5 design doc estimate); Pop B 4 (matches estimate).
- At-rest meta.activityType shape divergence on PROD: 770 of 771 canonical rows are non-array; M3 follows impl plan and writes array for the 14 set rows; M4 trigger handles the rest on next touch.
- CTE-driven mapping with NULL-marker handling for cleared rows is the cleanest expression; avoids splitting into multiple UPDATEs.
- Local `db reset` doesn't verify data-fix migrations because seed.sql post-applies; manual re-run validates logic.

Next session (Session 9): pick up at **PR-2 Task 2.7 — Migration 4 (install + enable `lessons_normalize_write` trigger)**.

1. Branch already on `feat/filter-drift-pr2-writer-fix-trigger`. M1 (`9e5b245`) + M2 (`c582ad6`) + M3 (`56bb59a`) + Session docs commits on local. Migration prefix `20260509000000_*` — next-available HHMMSS-padded slot after M3's `20260508000000_*` (verify with `ls supabase/migrations/ | sort | tail -3` per impl plan rule).
2. Per design doc §5 Migration 4 + impl plan Task 2.7: define `lessons_normalize_write()` and attach as `BEFORE INSERT OR UPDATE` trigger on `lessons`. Created and enabled in one step (the table is fully canonical post-M3 for the rows M2/M3 touched, so no DISABLE dance needed). Trigger function: column⇄metadata sync (column wins), shape coercion (lessonFormat ["x"] → "x", AI {selected: [...]} → [...]), `RAISE NOTICE` on every coercion.
3. Trigger smoke (per locked decision: 3 cases minimum) — clean approve via `complete_review_atomic` (zero NOTICEs); deliberately-drifted direct INSERT with `lessonFormat: ["Single period"]` (one NOTICE; stored row has scalar); object-shape AI direct INSERT with concepts (one NOTICE; concepts rescued to academicConcepts).
4. Then Task 2.8 (per-PR ritual: pre-push reviewer dispatch, push, open PR, bot-review iteration ≤2 rounds, TEST DB writer-roundtrip integrated-flow matrix per impl plan Task 2.3 step 2 — including `approve_update` branch this round, drift-residue + writer-shape checks, brief reviewer-approval pause coordination per locked decision before PROD apply).

### Session 9 — 2026-04-29 — PR-2 M4 drafted, applied locally, 5 smokes verified

Major events:
- Session-start orientation: read kickoff + status + design doc §5 Migration 4 + impl plan Task 2.7. `type-check` + `lint` clean baseline; usual `.beads/*` + `.claude/scheduled_tasks.lock` worktree dirt (unrelated). Confirmed M3's `20260508000000_*` is the latest migration on disk; next slot is `20260509000000_*`.
- **Task 2.7 (M4 migration) drafted** as `supabase/migrations/20260509000000_filter_drift_pr2_m4_normalize_trigger.sql` (403 lines). Three pieces:
  1. **Helper `_meta_array_matches_column(jsonb, text[])`** — STABLE SQL function; multiset-equality (`array_agg(... ORDER BY value)` without DISTINCT preserves duplicates). Used 9 times by the trigger function (once per text[] field).
  2. **Trigger function `lessons_normalize_write()` (~330 lines including comments)** — 11 sections:
     - **(A) Concepts rescue** (must run BEFORE AI flatten). NOT-EXISTS guard makes re-running on already-rescued rows a no-op.
     - **(B) lesson_format** scalar with explicit array→scalar coercion + sync.
     - **(C) academic_integration** with object→array flatten (after concepts rescue) + sync.
     - **(D-K) 8 text[] fields** (activity_type, cooking_methods, thematic_categories, season_timing, location_requirements, core_competencies, cultural_heritage, social_emotional_learning) — column⇄metadata sync only. Defensive scalar→array coercion included for forward-compat (probe 4 confirmed array-only at rest, but cheap safety).
     - **`RAISE NOTICE`** on every actual coercion. Silent on canonical input (no spurious noise).
  3. **`DROP TRIGGER IF EXISTS lessons_normalize_write_trg ON public.lessons`** + `CREATE TRIGGER ... BEFORE INSERT OR UPDATE FOR EACH ROW EXECUTE FUNCTION lessons_normalize_write()` + `COMMENT ON FUNCTION` + `COMMENT ON TRIGGER`.
- **Local apply via `supabase db reset`** clean (64 migrations including new M4). On first apply: emitted expected "trigger does not exist, skipping" NOTICE from `DROP TRIGGER IF EXISTS` (harmless). Then seed.sql post-apply emitted 46 RAISE NOTICEs as the trigger fired on each seed INSERT (5 lessons × ~9 fields each; LESSON-003 + LESSON-005 emit only 8 each since their cooking_methods + cultural_heritage are empty arrays → no-op branch). All 46 NOTICEs are canonical column → meta sync (seed inserts have NULL metadata; trigger derives meta from column). Expected behavior; production writes via `complete_review_atomic` post-M1 produce canonical column⇄meta pairs and emit zero NOTICEs.
- **5 verification smokes via service-role MCP**, all pass exactly per design:
  - **Smoke 1** (drifted lessonFormat input): `'{"lessonFormat": ["Single period"]}'` → row has `lesson_format='Single period'`, `lf_meta='"Single period"'` (jsonb scalar), `lf_meta_type='string'`. Bug A drift coerced ✓
  - **Smoke 2** (object-shape AI WITH concepts): `'{"academicIntegration": {"selected": ["Math"], "concepts": {"Math": ["fractions"]}}}'` → row has `ai_col=['Math']`, `ai_meta=["Math"]` (flat array), `ac_meta={"Math":["fractions"]}` (top-level), `ac_key_present=true`. Concepts rescue + AI flatten + column derivation all correct ✓
  - **Smoke 3** (object-shape AI WITHOUT concepts): `'{"academicIntegration": {"selected": ["Science"], "concepts": {}}}'` → row has `ai_col=['Science']`, `ai_meta=["Science"]` (flat), `ac_meta=null`, `ac_key_present=false`. Empty concepts NOT rescued (matches "key present iff data present" semantic) ✓
  - **Smoke 4** (column-wins precedence): existing row updated with `activity_type=['cooking','garden']` + `metadata.activityType=["cooking"]` → trigger rewrote meta to `["cooking","garden"]`. Column wins on disagreement ✓
  - **Smoke 5** (idempotency): no-op `UPDATE lessons SET title = title WHERE lesson_id = ...` on a fully canonical row → both column AND metadata unchanged. Confirmed via `IS NOT DISTINCT FROM` comparison: `column_unchanged=true, metadata_unchanged=true` ✓
- **Trigger pg_trigger inspection**: `tgname=lessons_normalize_write_trg`, `tgenabled='O'` (enabled, fires on origin/local writes), full def `CREATE TRIGGER lessons_normalize_write_trg BEFORE INSERT OR UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION lessons_normalize_write()`. Helper + trigger function pg_proc inspection: helper `provolatile='s'` (STABLE), trigger `provolatile='v'` (VOLATILE); both `prosecdef=false` (INVOKER mode, no SECURITY DEFINER).
- **Pre-commit baseline still clean**: `npm run type-check` ✓ `npm run lint` ✓ (SQL-only commit, no TS impact). Commit `9192228` (notes "branch not found" warning from broken beads pre-commit hook per `project_beads_broken.md`, unrelated).

Decisions made this session (already in "Session 9 (2026-04-29) decisions" above):
- Added private helper `_meta_array_matches_column(jsonb, text[])` — STABLE multiset-equality comparator; used 9× across the trigger function. Pattern consistent with PR-1's `_alias_*` helpers.
- Defensive scalar→array coercion extended to all text[] fields (not just lessonFormat per impl plan); ~24 lines for forward-compat against future writers passing scalar input.
- Concepts rescue placement: BEFORE AI flatten, in its own (A) section rather than inside (C). Cleaner separation; idempotent NOT-EXISTS guard.
- Empty `concepts: {}` does NOT trigger rescue (Smoke 3 confirms); matches M1+M2 "key present iff data present" semantic.
- Local seed.sql 46-NOTICE flood is expected (column → meta sync on raw seed inserts with NULL metadata); not a trigger bug.

Next session (Session 10): pick up at **PR-2 Task 2.8 — push, coordinate approval pause, per-PR ritual**.

1. Branch already on `feat/filter-drift-pr2-writer-fix-trigger`. M1 (`9e5b245`) + M2 (`c582ad6`) + M3 (`56bb59a`) + M4 (`9192228`) + Session 4-9 docs commits on local. 10 commits ahead of `origin/main`.
2. Per impl plan Task 2.8 (also ref design doc §5 + locked decision on brief reviewer-approval pause for PROD apply):
   - **Step 1**: `npm run type-check && npm run lint` (mandatory pre-PR check).
   - **Step 2**: Dispatch `feature-dev:code-reviewer` agent on `git diff main...HEAD` (pre-push). Investigate findings per `feedback_bot_review_investigation.md`; apply fix-up commits BEFORE push.
   - **Step 3**: `git push -u origin feat/filter-drift-pr2-writer-fix-trigger`.
   - **Step 4**: `gh pr create` with body from impl plan Task 2.8 step 4 (4-migration summary + concepts preservation note + PROD coordination note).
   - **Step 5-6**: Wait for CI + bot reviews. Triage per `feedback_bot_review_investigation.md` rebuttal-pass discipline; round-cap after 2 rounds. Apply round-1+round-2 fix-ups; re-verify TEST DB after each round per `feedback_per_round_test_db_verification.md`.
   - **Step 6 (TEST DB integrated-flow matrix)**: per impl plan Task 2.3 step 2 — same 6 academicIntegration cases + 1 lessonFormat assertion as Session 5's local matrix, but THIS round include the `approve_update` branch (skipped in Session 5 because Phase-4 changes had already shipped via PR-1). Plus drift-residue checks on TEST DB: `array_lf_remaining=0`, `object_ai_remaining=0`, `short_keys_remaining=0`. Plus trigger-coerces-deliberate-drift check (insert deliberately-drifted row direct via SQL on TEST; expect coerce + 1 RAISE NOTICE). Plus concepts-preservation count check: `concepts_preserved_count` matches pre-flight `rows_with_nonempty_concepts` (≈690).
   - **Step 7 (PROD coordination)**: notify reviewers in advance of the brief approval pause (~5 min). Approve PROD migration via `migrate-production.yml`. After apply, run drift-residue + writer-shape verification via `mcp__supabase-remote__execute_sql`. Notify reviewers they may resume. Verify trigger attached on PROD via `pg_trigger` query.
3. Task 2.8 is substantial — full per-PR ritual + bot-review iteration + TEST DB integrated matrix + PROD coordination is multi-session by nature (PR open ⇒ end session ⇒ next session for round-1 triage ⇒ next session for round-2 triage if any ⇒ next session for merge + PROD apply + verify). Don't try to ship the whole PR in one session.

### Session 10 — 2026-04-29 — PR-2 pushed, **PR #472 opened**, CI running

Major events:
- Session-start orientation: read kickoff + status + git state. `type-check` + `lint` clean baseline; usual `.beads/*` + `.claude/scheduled_tasks.lock` worktree dirt (unrelated). Confirmed branch state matches Session 9's "Next session" expectation: M1+M2+M3+M4 + 5 docs commits all local, 10 commits ahead of `origin/main`, latest code commit `9192228`.
- **Task 2.8 Step 1 (mandatory pre-PR check)**: `npm run type-check && npm run lint` ✓ ✓ (both clean).
- **Task 2.8 Step 2 (pre-push reviewer agent)**: dispatched `feature-dev:code-reviewer` (default Sonnet) on `git diff main...HEAD` with detailed brief covering 7 priority focus areas (M2 data safety, M1 typeof correctness, M4 trigger correctness, M3 17-row mapping integrity, concepts-rescue alignment across all paths, idempotency, row-context safety) plus locked-decisions list and skip-list (don't redebate locked decisions, don't waste cycles on hardening that fails the user-visible-bug-or-DB-damage bar). Agent traced through every requested code path and self-rebutted 10 candidate findings during the walk-through:
  - M2 `||` operator pattern correctness — verified preserves all non-target top-level keys.
  - M1 typeof CASE all-five-cases (array / object-with-selected / object-with-empty-selected / object-missing-selected / object-with-jsonb-null-selected) — all produce correct non-NULL flat arrays.
  - M4 section A (concepts rescue) ordering vs section C (AI flatten) — confirmed A-before-C is required and correct.
  - M4 `_meta_array_matches_column` NULL-element edge case — theoretical only, zero corpus exposure per probes.
  - M4 section B/C `v_meta_value` stale-read risk — traced reassignment paths, no stale reads.
  - M3 17-row CTE mapping — counted 7+4+2+1+3=17 distinct IDs, idempotent JOIN semantic, NULL-marker handles cleared rows correctly.
  - M2 Update 3 empty-string lessonFormat element — below bar, the 1 PROD outlier is `["standalone"]` (non-empty).
  - M3 Pop B `to_jsonb(text[])` NULL-element handling — column populated by `_phase4_jsonb_text_array` which filters nulls; below bar.
  - M1 forward-compat `academicConcepts` override — intentional behavior.
  - M4 second NOTICE on object-shape AI input — slightly misleading log text, no data issue.
  - **Final verdict: zero findings above 80 confidence threshold.** Agent quote: "The four migrations are functionally correct, idempotent, FK-safe, and the concept-rescue semantics are consistent across all four write paths. The code is ready to push."
- **Task 2.8 Step 3 (push)**: `git push -u origin feat/filter-drift-pr2-writer-fix-trigger` clean — single new branch created on origin, upstream tracking set. No fix-up commits between Step 2 and Step 3 (zero findings).
- **Task 2.8 Step 4 (open PR)**: `gh pr create` opened **[PR #472](https://github.com/danfeder/esnyc-lesson-search-react/pull/472)**. Body adapted from impl plan Task 2.8 step 4 template — kept the same shape (Summary / Why this matters / PROD coordination needed / Test plan / Verification placeholder) but updated migration counts to actual probe-confirmed numbers (M2: added 95 location-casing rows beyond template's 775; M3: replaced template's "~5 AI mismatches" with split 2 Pop A + 4 Pop B; both INSERT and UPDATE branches called out for M1 academicConcepts rescue). Added local pre-flight evidence table (M1 6-row matrix from Session 5 + M4 5-smoke summary from Session 9). Test-plan checkboxes marked [x] for completed local verification, [ ] for pending TEST DB integrated work.
- **CI status as of session-end**: 13 of 14 checks pending; Dependency Review the only resolved check (passed). E2E Tests pending (gates on TEST DB CI apply); Netlify deploy preview pending; both `claude-review` and `claude-database-review` bot reviewers pending. Did NOT poll for completion; CI is async work that should not consume session cycles.

Decisions made this session (no surprises):
- Dispatched the pre-push reviewer with default Sonnet model (matching PR-1's pre-push pattern). Considered overriding to Opus given PR-2's larger surface area + data-fix migrations, but Sonnet was adequate on PR-1 and the local rehearsal evidence (5 trigger smokes + 6-row writer matrix + 4 PROD pre-flight probes per migration) is the primary correctness story. If a future PR has heavier algorithmic complexity, may want Opus.
- Adapted PR body numbers to probe-confirmed actuals rather than template estimates. Reasoning: the template was written before pre-flight PROD probes, and accurate numbers improve the public-facing record. Specifically: M2 added 95 location-casing rows (Session 6 OOS extension), M3 replaced the "~5 AI mismatches" with the actual 2+4 split.
- Did NOT poll for CI completion at session-end. Per kickoff "Steps 5–7 (CI + bot iteration + TEST DB matrix + PROD apply) run on bot/CI cadence... those land in Session 11+." This is the natural session boundary.
- Did NOT immediately run TEST DB matrix even though CI started. Reason: matrix needs to run AFTER CI applies migrations to TEST DB (which is gated by Test & Build → migrate → E2E sequence). Polling cycles + CI wait is itself the session's idle time.

Next session (Session 11): pick up at **PR-2 Task 2.8 Steps 5-6 (round 1 bot triage + TEST DB integrated-flow matrix)**.

1. Branch state: `feat/filter-drift-pr2-writer-fix-trigger` pushed; PR #472 open. By the time Session 11 starts, CI should have completed (~10-20 min from Session 10 push) and bot reviews should have landed.
2. Per impl plan Task 2.8 step 5: **all-four-surface bot review query** (per `feedback_pr_comment_surfaces.md`):
   - `gh pr view 472 --comments` (issue-comments — bot full reports)
   - `gh api repos/danfeder/esnyc-lesson-search-react/pulls/472/reviews` (review summaries)
   - `gh api repos/danfeder/esnyc-lesson-search-react/pulls/472/comments` (line comments)
   - `gh pr checks 472` + any `gh run view <id> --log-failed` for failed CI checks
3. Triage findings per `feedback_bot_review_investigation.md` rebuttal-pass discipline. Default-reject hardening that fails the user-visible-bug-or-DB-damage bar; surface accept/reject recommendations to user with rationale BEFORE applying any fix-ups.
4. **Step 6 (TEST DB integrated-flow matrix)**: confirm CI applied M1+M2+M3+M4 to TEST DB (check `mcp__supabase-test__execute_sql` against `supabase_migrations.schema_migrations` for the 4 new prefixes). Then run via `mcp__supabase-test__execute_sql`:
   - 4-counter shape-residue query: `array_lf_remaining=0`, `object_ai_remaining=0`, `short_keys_remaining=0`, `lowercase_location_remaining=0`. (Plus 17-row activity_type leak count = 0 as 5th counter.)
   - Concepts-preservation count: rows with non-empty `metadata.academicConcepts` should match pre-flight `rows_with_nonempty_concepts` (PROD baseline 690; TEST may differ if reset weekly).
   - 6-row writer-roundtrip matrix on `complete_review_atomic`, this time including the `approve_update` branch — fresh synthetic submissions via service-role MCP, expect same 6 outcomes as Session 5 local matrix. Clean up via UUID-safe + FK-safe deletion sequence.
   - Trigger-coerces-deliberate-drift smoke: insert (or UPDATE) a row with deliberately drifted shape direct via SQL; expect column⇄meta coercion + RAISE NOTICE captured in logs.
5. If round-1 fix-ups touch any DB-applied state (migration body, RLS, function source), re-verify TEST DB after the fix-up CI re-applies — per `feedback_per_round_test_db_verification.md`.
6. Round-cap after 2 rounds. Apply only critical bug fixes in round 3+; document the rest.
7. Steps 7 (PROD apply coordination + brief reviewer-approval pause + drift-residue verification on PROD + trigger attached verification + reviewer notification of resume) lands in Session 12+, gated on round-cap + user merge approval.

### Session 11 — 2026-04-30 — PR-2 round-1 four-surface triage zero-fix-ups + TEST DB integrated-flow verification all-pass

Major events:
- Session-start orientation: read kickoff + status + design doc + impl plan Task 2.8 Steps 5-6. `npm run type-check && npm run lint` clean. Worktree dirt unrelated (`.beads/*` + `.claude/scheduled_tasks.lock`).
- **Task 2.8 Step 5 (round-1 four-surface bot review triage):**
  - **CI status**: 17 checks complete. All pass except known pre-existing `Security Audit` (`@lhci/cli` chain — postcss / tmp / uuid / inquirer / external-editor advisory IDs match the `MEMORY.md` "Open hygiene follow-ups" entry; same noise as PR-1's round 1 was rejected on). Test & Build, claude-review, claude-database-review, E2E, Lighthouse, semgrep all green. Deploy preview built.
  - **Four-surface query** per `feedback_pr_comment_surfaces.md`:
    - `gh pr view 472 --comments` → 3 total: 1 netlify deploy preview, 1 github-actions e2e dry-run, 1 substantive `claude-review` (9879 bytes).
    - `gh api .../pulls/472/reviews` → 0 (no submitted GitHub reviews).
    - `gh api .../pulls/472/comments` → 0 (no line-attached comments).
    - `gh pr checks 472` → all green except Security Audit (pre-existing).
  - **`claude-database-review` did NOT post a comment on this PR** (PR-1 round-1 had paired claude-review + claude-database-review; PR-472 has only claude-review). The check passed; the SDK ran with output hidden ("full output hidden for security"). Surfacing for transparency; not a blocker. Possible explanations: SDK config change between PR-1 and PR-2; or the database-review run determined no comment-worthy findings. Either way the PR has effective single-reviewer round-1 coverage instead of double.
  - **Round-1 findings triage** (4 awareness items from `claude-review`, all rejected per `feedback_pr_bot_review_workflow.md` "default-reject hardening that fails user-visible-bug-or-DB-damage bar"):
    1. **M1 `'null'::jsonb` sentinel for empty `lessonFormat`** — REJECT. Column is filter source of truth; no consumer reads `metadata.lessonFormat` for filter behavior. Sentinel choice is stylistic with zero behavioral effect.
    2. **`approve_update` overwrites full metadata** (could silently drop existing `metadata.academicConcepts` if reviewer's input doesn't include concepts) — REJECT. Pre-existing whole-blob replace pattern not introduced by PR-2; `lesson_versions` archive preserves history; out-of-scope hardening.
    3. **M4 trigger emits `RAISE NOTICE` from `lesson_format`-derived-from-meta-scalar branch** — REJECT. Only fires on direct-SQL inserts where column is empty AND meta has scalar value; `complete_review_atomic` always provides the column. Local seed produces same 46-NOTICE pattern documented in Session 9; production write-path emits zero NOTICEs on canonical input.
    4. **`_meta_array_matches_column` returns `false` for NULL column input** — REJECT. All 9 call sites guard with `COALESCE(array_length(...), 0) > 0` before invoking; the helper's NULL-input behavior is dead code in production paths. Documenting contract for future callers, not a defect.
  - **No fix-up commits warranted.** Code as pushed is correct. Round-cap pre-empted by zero-finding round 1 (the round-cap rule kicks in after round 2; if no further bot rounds land, the PR is effectively round-capped at round 1).
- **Task 2.8 Step 6 (TEST DB integrated-flow verification via `mcp__supabase-test__execute_sql`):** ALL PASS.
  - **Shape-residue (6 counters):** `short_keys_remaining=0`, `object_shape_ai_remaining=0`, `array_lesson_format_remaining=0`, `lowercase_location_col_remaining=0`, `lowercase_location_meta_remaining=0`, `activity_type_leak_remaining=0`. Total: 772 lessons.
  - **Concepts preservation:** `concepts_preserved_count=677` out of 772 = 87.7%, matches PROD pre-flight `rows_with_nonempty_concepts=690 / 788 = 87.6%` (TEST DB has ~16 fewer rows from weekly reset cadence; ratio is right in line).
  - **Writer-roundtrip matrix (7 rows: rows 1-6 approve_new + row 7 approve_update against row 1's lesson):** all 7 match expected exactly. UUIDs `00000011-aaaa-bbbb-cccc-00000000000{1..7}` (fresh prefix, no collision with Session 5 local-only run's UUIDs). Row 7's approve_update produced `ai_meta=["Biology"]` (object→flat from input `{"selected":["Biology"],"concepts":{"Biology":["mitosis"]}}`), `ac_meta={"Biology":["mitosis"]}`, `lf_meta="Multi-session unit"` (scalar), `ai_col=["Biology"]` (Bug B fix in UPDATE branch confirmed), `version_number 1→2`, archive row in `lesson_versions` with `archived_ai=["Math","Science"]` (row 1's pre-update state preserved). Bug A + Bug B + concepts rescue all confirmed in BOTH `approve_new` AND `approve_update` branches.
  - **Trigger drift smoke (3 cases via direct-SQL bypass of `complete_review_atomic`):** all 3 deliberately-drifted inputs canonicalized correctly. Smoke 1: array `["Single period"]` → scalar `"Single period"` ✓. Smoke 2: `{"selected":["Math"],"concepts":{"Math":["fractions"]}}` → flat `["Math"]` + concepts rescued to top-level `{"Math":["fractions"]}` ✓. Smoke 3: `{"selected":["Science"],"concepts":{}}` → flat `["Science"]` + `ac_key_present=false` (empty concepts not rescued) ✓.
  - **`mcp__supabase-test__get_logs` postgres service** for trigger NOTICE capture: PG `RAISE NOTICE` emits to client stream (delivered to MCP execute_sql call which doesn't surface them), NOT to the postgres log persistence layer. Migration-apply log lines for the trigger DDL ARE present (CREATE FUNCTION / CREATE TRIGGER / COMMENT statements visible) but actual fire-time NOTICE strings are not capturable from `get_logs`. **Behavioral evidence (canonical output from drifted input) IS the proof the trigger fired and coerced** — stronger evidence than the NOTICE strings would be (NOTICE could fire without coercion working; the coercion shows in the output). Documented in PR body Verification section.
  - **Cleanup:** all 7 matrix synthetic submissions + 6 published lessons + 1 lesson_versions archive entry + 3 trigger-smoke lessons removed via FK-safe ordered DELETEs (lesson_versions → lessons → submission_reviews → submission_similarities → lesson_submissions). Post-cleanup verification: `smoke_remain=0`, `matrix_lesson_remain=0`, `sub_remain=0`, `version_remain=0`.
  - **`npm run test:rls`:** 5/7 scenarios pass; 2 pre-existing `archive_duplicate_lesson` failures (`validates lesson existence`, `prevents self-archiving`). Same baseline as PR-1's Session 1 — Phase 8b legacy. Not a PR-2 regression.
- **PR body updated** (Test plan checkboxes flipped to [x]; Verification (TEST DB — post-CI Session 11 results) section populated with full evidence including the 7-row writer matrix table + 3-row trigger smoke table + cleanup verification).
- **Round-1 acknowledgment comment posted** ([issuecomment-4349219607](https://github.com/danfeder/esnyc-lesson-search-react/pull/472#issuecomment-4349219607)) summarizing four-surface coverage + 4-finding triage decisions + TEST DB results + round status.

Decisions made this session (no surprises):
- Used a fresh UUID prefix `00000011-aaaa-bbbb-cccc-` for the TEST DB matrix (vs Session 5's local `00000000-aaaa-bbbb-cccc-`) per impl plan Task 2.3 step 2: "use a fresh UUID prefix to avoid collisions with anything left from the matrix's prior runs." Defensive even though TEST DB resets weekly.
- Extended the matrix to 7 rows (added approve_update as row 7) since impl plan Task 2.8 Step 6 calls out approve_update branch verification specifically and Session 5's local matrix only covered approve_new. Row 7 targeted row 1's published lesson with object-shape AI + concepts to exercise Bug B in UPDATE branch's column derivation simultaneously with v_legacy_meta builder.
- Added 6th shape-residue counter (`activity_type_leak_remaining` for M3's 17-row leak fix) beyond impl plan's 4-counter spec. Defensive — confirms M3 cleanup is reflected in TEST DB.
- **Did NOT capture literal trigger NOTICE strings** in the verification block. PG `RAISE NOTICE` goes to client stream (which MCP execute_sql discards); `mcp__supabase-test__get_logs` returns postgres-server-persisted log entries which don't include client NOTICE messages. The behavioral coercion IS the proof. Documented in PR body for transparency.
- **Did NOT push fix-ups for any of the 4 bot findings.** All 4 are awareness items, not bugs. The pre-push reviewer agent's zero-finding result (Session 10) is reinforced by round-1 bot triage's zero-genuine-finding result. PR is ready to ship as-pushed.

Next session (Session 12): pick up at **PR-2 merge approval + PROD apply coordination** (Task 2.8 Step 8).

1. **User-gated:** wait for human merge approval on the PR before doing anything PROD-touching. Don't merge unilaterally.
2. **Pre-merge coordination:** notify reviewers of upcoming ~5-min approval pause. The kickoff specifies "coordinate via reviewer notification" but doesn't specify the channel — likely Slack or email; ask user which.
3. **Merge:** `gh pr merge 472 --rebase --delete-branch` (project convention is rebase-merge per Session 4 PR-1 verification).
4. **PROD apply:** `migrate-production.yml` triggers on merge push. Watch for SASL Apply-step flake (PR #468 2026-04-28 + PR #446 2026-04-27 confirmed pattern; mitigation = `gh run rerun --failed <run_id>` after first failure). Approval gate re-fires on rerun.
5. **PROD verification via `mcp__supabase-remote__execute_sql`** after apply succeeds:
   - Drift-residue post-deploy safety query: `SELECT COUNT(*) FILTER (WHERE jsonb_typeof(metadata->'lessonFormat') = 'array' AND created_at >= '<migration_start_time>') AS post_deploy_array_lf, COUNT(*) FILTER (WHERE jsonb_typeof(metadata->'academicIntegration') = 'object' AND created_at >= '<migration_start_time>') AS post_deploy_object_ai FROM lessons;` — expected 0/0. If non-zero, run M2's shape-coercion UPDATE against just those rows.
   - Full shape-residue query (no time filter) — expected matches TEST DB pattern: 0/0/0/0/0/0.
   - Spot-check `complete_review_atomic` source on PROD via `pg_get_functiondef` — confirm PR-2 M1 fix is present (`to_jsonb(v_meta->>'lessonFormat')` not `jsonb_build_array(...)`; `jsonb_typeof(v_meta->'academicIntegration')` typeof-aware unwrap present; `academicConcepts` rescue present).
   - Spot-check trigger installation via `pg_trigger` — confirm `lessons_normalize_write_trg` exists, `tgenabled='O'`, BEFORE INSERT OR UPDATE.
6. **Post-deploy resume notification:** notify reviewers approvals may resume.
7. **Out-of-scope cleanup hooks for the future** (don't close until done): the session 10 docs commit `cafd092` will land in this session's push along with the Session 11 docs commit; both cosmetic, no DB impact.
