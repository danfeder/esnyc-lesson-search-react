# Search Modernization (Medium Package) — Design Document

**Date:** 2026-06-17
**Status:** Locked — ready for implementation
**Related:** memory `project_search_modernization.md` (the investigation that produced this); `docs/plans/2026-06-11-metadata-rebuild-pr6-stage2-retag-execution-status.md` (parent track — PR D was retired into this); design judge-panel run `wf_6156054d-320` + investigation run `wf_fb08aeb5-3e4`; Codex sessions `019ed86a` (investigation) + `019ed885` (plan).

---

## 1. Why this exists

The metadata rebuild made the lesson **data** canonical (heritage tree, 208 academic concepts in framework+everyday vocab, locked enums, re-tagged corpus). This track makes that new richness **first-class in the public search** — and fixes the search-quality gaps an all-sides investigation (5-lens Claude workflow + adversarial verify + independent Codex, all firsthand PROD-verified 2026-06-17) confirmed on the live engine.

That investigation corrected two beliefs that had been wrong in the project's mental model, and both corrections are load-bearing here:
1. **Academic concepts ARE already indexed** (live trigger `update_lesson_search_vector()` flattens `metadata->'academicConcepts'` into weight C; migration `20260521000000_search_vector_with_concepts.sql`). The old `generate_lesson_search_vector(...)` helper is dead/unused.
2. **The public search engine is the `search_lessons` RPC**, NOT the `smart-search` edge function (which only powers zero-result suggestion chips via `useLessonSuggestions`). `src/lib/search.ts:8` `getSearchRpcName()` always returns `'search_lessons'`; `src/hooks/useLessonSearch.ts:129` calls it.

This track **grew out of the retired PR D** (bulk `search_synonyms` population). PR D's premise — "concepts aren't searchable, so bridge them with synonyms" — was false (concepts are indexed), and its mechanism was wrong (the table's whitespace CHECK + token matcher can't hold the multi-word everyday phrases). PR D is retired; its everyday-vocabulary asset is repurposed (small curated bridge now; the bulk map's real home is a future semantic tier). This is a legitimate workflow-level redesign per `feedback_workflows_not_sacred.md`, user-directed after the investigation.

## 2. Goals (each gated on the eval harness; each reversible; none may regress the live public search)

1. **Measure before tuning (closes G5).** No usage logs exist; the live public search is the only stakes-bearing surface. An eval harness with human-confirmed ideal results is the precondition for every other change.
2. **Close the dominant G2 failure (filler/grade explosion).** `compost lesson for 3rd grade` → **766 of 767 lessons**, irrelevant #1; the same intent as `compost` + grade-3 filter → a clean **92** (PROD-verified). Strip filler + route grade tokens.
3. **Make distinctive pedagogical metadata typed-searchable (G3).** SEL / core_competencies / academic_integration are filterable but not in the text index. SEL is the clear win (distinctive values like "Self-management"); core_competencies (100%-populated) and academic_integration (subjects like "Science" already saturate bodies) are conditional on measured lift.
4. **Bridge high-value everyday→official vocabulary (G1, small + safe).** `decay`→1 vs `decomposition`→60. A small hand-curated single-word synonym set, eval-gated. (The bulk bridge is retired; the full everyday-vocabulary fix is deferred to the semantic tier.)
5. **Retire dead code** (`generate_lesson_search_vector`, unused `search-lessons` edge fn).

## 3. The chosen shape: measure-first incremental modernization

The eval harness is the **backbone**: a read-only Node script that runs a committed query set through the live `search_lessons` RPC and writes a scorecard. It ships first, captures a baseline, and **gates every subsequent change** (each search-affecting PR re-runs it and commits the scorecard diff as a required review item). Changes are sequenced cheapest-and-safest-first, each reversible, each behind its own PR gate.

Sequence: **S0** eval harness → **S1** G2 frontend fix → **S2** G3 field indexing → **S3** synonym bridge (conditional) → **S4** dead-code cleanup (rides PR-E).

### Why this shape over the alternatives

| Option | Why rejected |
|---|---|
| **Bulk 5,163-pair `search_synonyms` load (the retired PR D)** | Wrong mechanism: the `search_synonyms_lexemes_no_whitespace` CHECK forbids spaces and ~98% of everyday phrases are multi-word; the matcher is token-level. Shredding phrases into common words injects noise into the live search (makes it worse). Retired, not just deferred. |
| **Full semantic / hybrid (keyword+embedding) rebuild — the "Heavy" tier** | High effort + a new live-search ranking path + medium-high risk; needs the eval set AND the embedding-pipeline bug fixes as prerequisites. Deliberately deferred; this track leaves a clean on-ramp (eval set, retained 5,163-pair artifact). |
| **Blind relevance tuning (no eval set)** | Unsafe on a live, log-less public surface — can't distinguish improvement from regression. This is exactly why S0 ships first. |
| **G2 fixed server-side now (OR→AND term combination)** | Heavier blast radius on the single live RPC + zero-result-cliff risk for multi-term queries. Deferred + documented (§9) to return to once the eval set can prove its value; the frontend filler/grade fix handles the dominant case first. |

## 4. S0 — Search eval harness (the gate)

**Locked decisions (investigation Q2):**
- **~25–30 queries** in a committed `scripts/search-eval/queries.json`, every query provenance-traceable (no usage logs ⇒ provenance is the only defense against author bias): reproduced gap cases (`decay`, `decomposition`, `compost`, `compost lesson for 3rd grade`, G2 false-positive guards like `three sisters garden`), one everyday phrasing per high-frequency concept/SEL value (incl. **discriminating** SEL values), ~6 obvious teacher intents, and control/regression queries incl. ≥1 **multi-meaningful-term** query (e.g. `compost worms soil`) to keep G2's scope honest.
- **"Ideal result" = an engine-independent, human-confirmed gold `lesson_id` set** per query — NOT "the subset the good query already returns" (circular). For the ~8 highest-value queries: frozen id lists **the product owner signs off** (built collaboratively — user + supervisor). For the rest: property predicates that survive re-tags (e.g. "top-10 all contain the term in title/summary/concepts").
- **Metric:** hit-rate@10 (primary — "is the right lesson on page 1") + **top-1-relevant boolean** (catches the G2 "irrelevant #1" mode hit-rate misses) + MRR (secondary diagnostic) + an **over-broad flag** (returns > threshold of corpus). Skip nDCG (needs graded relevance the team can't cheaply produce). A **tolerance band** on regression, not brittle zero-jitter.
- **Lives as** a standalone read-only Node script (`scripts/search-eval/run-search-eval.mjs`, anon key, its own `assertReadOnly` guard — NOT a mirror of the local-only/write-based heritage harness) + `queries.json` + committed `baseline.json` + scorecards, run via `npm run eval:search`. **Not a vitest** (needs the ~767-row DB; CI has no live Supabase — same precedent as `test:rls`). Pure helpers (parsing, metric math) ARE vitest-tested. The ranking scorer is **written fresh** — `scripts/lib/evalMetrics.ts` `computeMetrics` is a multi-label classification metric (no rank/k concept) and cannot be reused.
- **Baseline environment:** capture on **TEST** for reproducibility (local has 5 seed rows; a PROD-captured baseline won't reproduce green locally).

## 5. S1 — G2 multi-word fix: frontend query preprocessing

**Locked decision (investigation Q1): the fix lives in the FRONTEND**, in a new `src/utils/parseSearchQuery.ts` called from `useLessonSearch.ts` before the RPC call (line 129). It strips a small filler list and routes grade tokens into `filter_grade_levels` (line 103), passing the cleaned term as `search_query` (line 102).

**Why frontend over the RPC body / `expand_search_with_synonyms`:** the damage is provably *upstream* of the engine — `expand_search_with_synonyms('compost lesson for 3rd grade')` expands to a 13-way OR (`3|3rd|...|compost|for|grade|lesson|...`) where "lesson"/"grade" match nearly the whole body-indexed corpus and drown "compost". The RPC also ranks on `similarity(title, RAW search_query)`, so shortening the query frontend-side lifts the trigram path too — the frontend fix wins **both** ranking paths at once. Frontend wins on testability (plain vitest, no DB), reversibility (one deploy revert, no migration/PROD-approval), and **zero blast radius** on the single live RPC that 100% of public search hits (verified: no other RPC callers). The eval harness imports `parseSearchQuery` and applies it before calling the RPC, so the gate stays honest about real end-to-end behavior.

**Scope honesty:** this fixes the **filler/grade** sub-case (the dominant, high-frequency one). It does NOT change the engine's OR-combination of multiple *meaningful* terms — that (OR→AND) is the deferred deeper work (§9).

**Grade-router safety invariants (from the risk-safety analysis):** require an explicit grade cue ("grade"/"grades"/ordinal/"kindergarten"/"pre-k") — **never route a bare digit**; map only to valid `filter_grade_levels` values (`3K`,`PK`,`K`,`1`..`8`; 3K/PK are group-only — handle explicitly); an **explicit user grade filter always wins**; the routed grade token is **always stripped from the FTS term** even when routing is suppressed; never strip the last content token to empty (grade-only queries route the grade + run a show-all-of-grade path). Surface the auto-applied grade as a visible, removable **chip** (user-decision, see §7-equivalent in impl).

## 6. S2 — G3 field indexing + S3 synonym bridge

### S2 (locked, investigation Q4)
Clone `20260521000000`: `CREATE OR REPLACE update_lesson_search_vector()` adding the chosen field(s) into the **existing C-weight block** (peers of thematic/heritage/concepts); recreate the trigger adding the chosen columns to its `UPDATE OF` list (currently `…content_text, metadata` — SEL/CC/AI absent); **backfill ALL rows** via `UPDATE public.lessons SET metadata = metadata` (mandatory — `max(updated_at)` is 2026-04-27, *before* the June re-tag, so a delta backfill misses everything). Rollback block in comments. The dead-twin retirement does NOT go here (keeps the diff single-purpose).

**Per-field by measured value (not blanket):** **social_emotional_learning** (729 rows, distinctive values like "Self-management"/"Responsible decision-making") is the clear win — ship it. **core_competencies** (788/788 rows = effectively a stopword for ranking; long phrases) and **academic_integration** (subjects "Science"=515/"Literacy"=433 already saturate bodies) add cost/noise for ~zero discriminating value — **include only if the PR-S2 scorecard shows lift.** G3 eval queries must use *discriminating* values (test "responsible decision-making", not "science", or the scorecard falsely flat-lines).

### S3 — synonym bridge (locked, investigation Q3; conditional/most-deferrable)
~**12–18** rows, `synonym_type='oneway'` (everyday→official; never bidirectional — bidirectional re-introduces the broadening this package fixes), both sides single-token (forced by the whitespace CHECK). Idempotent `INSERT … WHERE NOT EXISTS` on `(term, synonym_type, synonyms)` per the `20260522000000` precedent (no UNIQUE on `term`); each row tagged for clean `DELETE` rollback. **Hard selection filter:** from the artifact there are exactly **24** unique non-identity single-token pairs (not 5,163); then drop (1) identity pairs (`seeds→seeds`), (2) lossy bridges where the everyday word isn't a synonym of the concept (`worms→decomposition`, `bees→pollinators`), (3) over-broad common-word targets (`coloring→drawing`). Survivors are the safe high-value pairs (`compost→decomposition`, `composting→decomposition`, `decomposers→decomposition`, `pollination→pollinators`, `chlorophyll→photosynthesis`, `pickling/canning→preservation`, `camouflage→adaptations`, `fungi/yeast→microorganisms`, …) plus a few hand-authored gap pairs the artifact lacks but probes prove valuable (`decay→decomposition`). Each gated on measured eval lift with **no control-query regression**; ship only net-positive, else abandon.

## 7. Section 4 — Migration / shipping strategy

| # | PR | Contains | Notes |
|---|---|---|---|
| S0 | **search eval harness** | `scripts/search-eval/` (script + queries.json + baseline.json + scorecards) + `npm run eval:search` + fresh ranking-metric module + vitest for pure helpers | No DB, no engine change. Gates everything. User signs off ~8 gold sets. |
| S1 | **G2 frontend preprocessing** | `src/utils/parseSearchQuery.ts` + vitest; wire into `useLessonSearch.ts` (lines 102-103, 129); commit eval delta | No migration → ships via Netlify; one-deploy revert. |
| S2 | **G3 field indexing** | One migration cloning `20260521000000` (C-weight + trigger `UPDATE OF` + all-row backfill); rollback in comments | Per-field by scorecard. Full migration gate (local→TEST→PROD). |
| S3 | **synonym bridge (conditional)** | One idempotent `INSERT … WHERE NOT EXISTS` migration of ~12–18 oneway rows | Supersedes PR-D's D2 (smoke `expand_search_with_synonyms`, NOT smart-search). Ship only on lift. |
| — | **PR-E rider (dead code)** | Folded into existing `feat/pr6e-stage2-cleanup`: `DROP FUNCTION generate_lesson_search_vector(10-arg)` + revoke grants; delete `supabase/functions/search-lessons/` | NEW addition to PR-E (E1/E2/E3 don't currently scope it). Gated after C2 AND S2 PROD-verified. |

### Gap risk between PRs
None dangerous — each PR is independently shippable and the site is in a maintenance window. S1 (frontend) and S2 (migration) touch different surfaces and can develop in parallel, but **their PROD landings must be serialized** so each scorecard delta is attributable.

### TEST DB rehearsal
- S0/S1: no schema change — run `eval:search` read-only; S1 also E2E `search.spec` on the Netlify preview.
- S2/S3: `supabase db reset` + `test:rls` locally; CI applies to TEST; `mcp__supabase-test__execute_sql` verbatim verify (new tokens searchable on a known row; row-count sanity) + re-run `eval:search` on TEST.

### Rollback paths
- S1: frontend git revert / redeploy; no data side effects.
- S2: rollback block recreates the prior trigger/function + re-backfills; migration is one idempotent transaction.
- S3: `DELETE` the tagged synonym rows.
- PR-E rider: recreate the dropped function + grants; restore the edge fn dir.

### Per-PR ritual
Per `feedback_pr_bot_review_workflow.md` (compact list lives in the kickoff): pre-push reviewer-agent dispatch + GATE-3 Codex (parallel) → baseline checks → push + `gh pr create` → wait for external bots → four-surface triage → rebuttal-pass every finding → consolidated fix-ups → per-round TEST DB + `eval:search` re-verify on DB-touching rounds → round-cap after 2.

### Known issues / pre-existing flakes
`migrate-production.yml` SASL flake (rerun-on-failure) + `deploy-edge-functions.yml` esm.sh 522 flake — both per project memory; PROD MCP verification is the source of truth.

## 8. Section 5 — Testing strategy

### Unit (vitest)
- `parseSearchQuery`: filler strip, grade-cue detection (positive + false-positive: `three sisters`, `grade a vegetables`), never-empty, explicit-filter-wins, 3K/PK edge.
- ranking-metric helpers: hit@10 / top-1 / MRR / over-broad math on fixtures.

### Integration / eval
- `npm run eval:search`: committed baseline; each search-affecting PR commits the scorecard diff (required review item).

### E2E (Playwright)
- `search.spec`: S1 — typing "compost lesson for 3rd grade" returns a focused set with a removable grade chip; single-term searches unchanged.

### RLS
- No RLS changes expected; `npm run test:rls` must pass unchanged on S2/S3.

### Manual smoke (per `superpowers:verification-before-completion`)
- After S1 deploy: run the marquee queries in the live UI; confirm grade chip + no over-broad result page.
- After S2/S3 PROD apply: PROD MCP verify + re-run `eval:search` against PROD.

## 9. Out of scope (captured for future work)

- **Deeper G2 — server-side OR→AND term combination** for multiple *meaningful* terms (`compost worms soil` is still OR'd inside the RPC). **DEFERRED + documented to return to (user decision 2026-06-17).** Risk: zero-result cliff; needs the eval set to prove value and a careful RPC-body change. This is the explicit "come back to it later" item.
- **Full semantic / hybrid (keyword+embedding) search — the "Heavy" tier**, incl. full-corpus embedding regeneration. The everyday-vocabulary's real home; the retained 5,163-pair artifact is its seed material.
- **Bulk 5,163-pair `search_synonyms` load** — retired (wrong mechanism), not merely deferred.
- **Embedding-pipeline bug fixes** (`{content}` vs `{text}` param mismatch in `regenerate-all-embeddings.mjs` vs `generate-embeddings`; recipe references absent fields) — relevant only to the deferred semantic tier; logged so they're fixed before any regen.
- **Filter UI redesign / surfacing the heritage hierarchy** — separate track.

## 10. References

- Memory: `project_search_modernization.md` (architecture truth + decision), `project_metadata_rebuild_initiative.md` (parent), `feedback_workflows_not_sacred.md`, `feedback_data_safety_top_priority.md`, `feedback_workflow_orchestration.md`.
- Investigation synthesis: workflow run `wf_fb08aeb5-3e4`; plan judge-panel: run `wf_6156054d-320`; Codex sessions `019ed86a` (investigation) + `019ed885` (plan).
- Parent track: `docs/plans/2026-06-11-metadata-rebuild-pr6-stage2-retag-*.md` (PR D retired here; PR E gains the dead-code rider).
- Live engine: `search_lessons` RPC body (PROD `pg_get_functiondef`); `update_lesson_search_vector` trigger; `src/lib/search.ts`, `src/hooks/useLessonSearch.ts`, `supabase/functions/_shared/search-helpers.ts`; migration `20260521000000_search_vector_with_concepts.sql` (G3 template) + `20260522000000_seed_search_synonyms_from_smart_search.sql` (synonym idempotency precedent).
