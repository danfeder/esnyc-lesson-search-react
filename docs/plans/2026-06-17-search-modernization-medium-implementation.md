# Search Modernization (Medium Package) — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: use `superpowers:executing-plans` to implement task-by-task; `superpowers:test-driven-development` for every code-bearing task; `database-migrations` before touching `supabase/migrations/`.

**Goal:** Make the new canonical metadata first-class in the public `search_lessons` engine and close the confirmed search gaps (G1/G2/G3) — measure-first, each change eval-gated and reversible.

**Architecture:** The eval harness (S0) is the gate; changes ship cheapest-and-safest-first (S1 frontend G2 → S2 G3 indexing → S3 synonym bridge → S4 dead-code via PR-E). Canonical WHY: `2026-06-17-search-modernization-medium-design.md` — read it before any task.

**Tech Stack:** React 19 / TypeScript / Vite (frontend), Supabase Postgres (FTS via `search_lessons` RPC + `update_lesson_search_vector` trigger), Node ESM scripts, Vitest, Playwright.

**Design reference:** `docs/plans/2026-06-17-search-modernization-medium-design.md`.

**Per-PR ritual:** see the kickoff PER-PR RITUAL section + the feedback memories it cites. Don't restate per task.

**How to use:** verify every snippet against current code before applying (line numbers/APIs drift). Small repo-conformance adaptations OK; product/design changes require stopping to ask.

## PR breakdown

| PR | Title | Contains | Notes |
|---|---|---|---|
| S0 | search eval harness | `scripts/search-eval/*`, fresh ranking-metric module, `npm run eval:search`, committed baseline | No DB/engine change. Gates all later PRs. User co-authors ~8 gold sets. |
| S1 | G2 frontend preprocessing | `src/utils/parseSearchQuery.ts` + wiring + grade chip + eval delta | Ships via Netlify; one-deploy revert. |
| S2 | G3 field indexing | migration cloning `20260521000000` (SEL first; CC/AI by scorecard) | Full migration gate. |
| S3 | synonym bridge (conditional) | idempotent `INSERT … WHERE NOT EXISTS` of ~12–18 oneway rows | Ship only on measured lift. Supersedes retired PR-D D2. |
| — | PR-E rider | dead-code retirement folded into `feat/pr6e-stage2-cleanup` | After C2 + S2 PROD-verified. |

---

## PR S0 — Search eval harness

**Branch:** `feat/search-eval-s0` (cut fresh from `main`; the scaffolding docs commit may ride it or a docs PR).

**What ships:** a read-only Node harness that runs a committed ~25–30 query set through the live `search_lessons` RPC and scores it (hit@10 / top-1-relevant / MRR / over-broad), with a committed baseline. No DB or `src/` engine change.

**Why its own PR:** it's the measurement gate everything else depends on, and it carries zero engine risk (read-only).

**Pre-flight reads:** `supabase/functions/smart-search/index.ts` (token/expansion intent to mirror in queries, NOT the engine), the `search_lessons` body (`pg_get_functiondef` — return columns: `lesson_id,title,…,rank,total_count`), `src/hooks/useLessonSearch.ts:88-134`, `scripts/lib/evalMetrics.ts` (confirm `computeMetrics` is classification-only → scorer is fresh), `scripts/heritage/test-heritage-expansion.mjs:60-80` (the local-only/write harness NOT to mirror), `package.json` scripts block, `src/lib/supabase.ts` (anon client pattern).

> **Scoring model upgraded 2026-06-18** after the S0.2 dual adversarial review (Claude 4-lens + Codex). The metric module from the first pass (commit `93bcaa0`: `hitRateAtK`/`top1Relevant`/`mrr`/`overBroad`, flat-id) is the FOUNDATION; S0.1 now EXTENDS it to cluster-aware + two-tier + G3-isolation + dup-guard per design §4. Read design §4 "Scoring families" before implementing.

### Task S0.1 (TDD): extend the ranking-metric module to the upgraded scoring model
Refactor `scripts/search-eval/metrics.ts` so gold-bearing functions operate on **clusters** (`string[][]`; a singleton `[id]` is the simple case, twins share a cluster). Keep behavior-equivalent for singletons. Pure functions, never throw, TDD (extend `metrics.test.ts`, failing-first for each new function):
- `recallAtK(topIds: string[], goldClusters: string[][], k): number` — clusters with ≥1 id in top-k / #clusters (empty gold → NaN). (generalizes `hitRateAtK`.)
- `precisionAtK(topIds, relevantClusters: string[][], k): number` — **distinct** relevant clusters appearing in top-k / k (dedup-aware: duplicate twins can't inflate it). `relevantClusters` = primary ∪ acceptable.
- `top1Relevant(topIds, primaryClusters): boolean` — result #1 belongs to a primary cluster.
- `mrr(topIds, primaryClusters): number` — reciprocal rank of first primary-cluster hit.
- `duplicateFloodCount(topIds, k, clusterKeyOf: (id)=>string): number` — # of top-k slots that are a 2nd+ member of any content cluster (UX alarm; clusterKeyOf maps id→content-hash key, supplied by the harness).
- `isolationHitsAtK(topIds, isolationIds: string[], k): number` — # isolation lessons in top-k (G3, k=50).
- `firstRankOf(topIds, targetIds: string[]): number | null` — 1-based rank of the first target id (G3 first-isolation rank/MRR; null if absent).
- `ranksOf(topIds, targetIds: string[]): (number|null)[]` — per-target 1-based ranks (for median/best rank-movement across runs).
- `jaccard(a: string[], b: string[]): number` — set overlap for the q22 sentinel.
- keep `overBroad(totalCount, corpusSize, threshold)` unchanged.
- tsconfig include for `scripts/search-eval/**/*.ts` already added (commit `93bcaa0`).
- Verify: `npx vitest run scripts/search-eval/metrics.test.ts` green (incl. cluster + dedup + isolation edge cases); `npm run type-check && npm run lint`.

### Task S0.2: query set + two-tier gold (COLLABORATIVE — supervisor + user; relevance adjudication already done from the dual review)
- Create `scripts/search-eval/queries.json`: ~32 entries. Per-entry shape:
  `{ id, query, intent, category, provenance, scoring: "frozen-recall"|"frozen-precision"|"predicate"|"g3-isolation"|"sentinel"|"control-maxcount", primaryClusters?: string[][], acceptableClusters?: string[][], predicate?: {description, sql}, isolationIds?: string[], normalizedCall?: {search_query, filter_grade_levels}, maxTotalCount?: number, snapshot?: {...}, provenanceNote }`.
- Clusters carry **content-twins together**; primary vs acceptable per the dual-review adjudication (design §4). Predicate entries carry a concrete, snapshot-pinned, re-tag-survivable `sql` definition with sampled FP/FN noted. G3 entries carry the `isolationIds` (tag-but-no-lexical-mention sets, human-audited). G2 entries carry the expected `normalizedCall`. q22 = `sentinel` (excluded from quality score).
- **Pin a dated TEST snapshot** (counts + the snapshot date/commit) in a header block of queries.json.
- **The product owner signs off** the primary/acceptable cluster lists before they're frozen.
- Verify: JSON parses; every entry has provenance + a scoring family + its required fields; supervisor + user confirm the gold.

### Task S0.3: the harness script
- Create `scripts/search-eval/run-search-eval.ts` (**TS, run via `npx tsx`**): read-only, anon key, env-targetable (`SEARCH_EVAL_TARGET=local|test|prod`), its OWN `assertReadOnly` guard (refuse if a write client/service key is configured). Per query:
  - **G2 normalized scoring:** import + apply `parseSearchQuery` (once S1 exists) to derive `{search_query, filter_grade_levels}`; at S0 baseline `parseSearchQuery` doesn't exist yet, so record the raw call AND mark the expected normalizedCall so the S1 delta is attributable.
  - call `supabase.rpc('search_lessons', {search_query, page_size:50, ...})`; fetch `content_hash` (or equivalent) for returned ids to build the dup cluster-key map; compute the metrics for the entry's scoring family.
  - **g3-isolation** queries page to 50; compute `isolationHits@50` + `firstRankOf` + `ranksOf` (rank-movement vs baseline). **sentinel** computes `jaccard` vs stored snapshot + total_count band, reported OUTSIDE the quality score. **predicate** evaluates the pinned predicate over the top-10.
  - writes `scorecards/<target>-<n>.md` (quality scores + the separately-reported sentinel/dup-flood diagnostics) + updates `baseline.json` only on `--write-baseline`. Tolerates missing gold ids (reports, never crashes).
- Add `"eval:search": "npx tsx scripts/search-eval/run-search-eval.ts"` to `package.json`.
- Verify: `npm run eval:search` (target TEST) prints a scorecard; no writes (confirm via guard); `npm run type-check && npm run lint`.

### Task S0.4: capture baseline + commit
- Capture `baseline.json` on **TEST** (`--write-baseline`, `SEARCH_EVAL_TARGET=test`); commit script + queries + baseline + scorecard. Commit: `feat(search-eval): read-only eval harness + two-tier gold + committed TEST baseline (S0)`.
- Verify: `npm run type-check && npm run lint`; baseline reproduces stable on a clean re-run against TEST.

---

## PR S1 — G2 frontend query preprocessing

**Branch:** `feat/search-g2-frontend`.

**What ships:** `parseSearchQuery` strips filler + routes grade tokens to `filter_grade_levels`; wired into the search hook; a visible removable grade chip; eval scorecard delta committed.

**Pre-flight reads:** `src/hooks/useLessonSearch.ts:88-134` (searchParams assembly: `search_query` line 102, `filter_grade_levels` line 103, `rpc` line 129), `src/utils/filterDefinitions.ts` (valid grade values + labels), `src/stores/*` search store (where `filters.gradeLevels` lives), the SearchBar/SearchPage components (chip placement).

### Task S1.1 (TDD): `src/utils/parseSearchQuery.ts`
- **Must be a pure, dependency-free module** (GATE-1 fix): no `@/` alias imports, no `import.meta.env`, no other src deps — so the `tsx` eval harness (S0.3) imports the exact same code the frontend hook uses. If it needs grade-vocab values, inline them or import from a plain constants module that is itself alias-free.
- `parseSearchQuery(raw: string): { cleanedQuery: string; detectedGrades: string[] }`. Filler stoplist (`lesson`,`lessons`,`for`,`about`,`a`,`the`,…); grade-cue detection requiring an explicit cue ("grade"/"grades"/ordinal/"kindergarten"/"pre-k"/"3k") → map to valid values `['3K','PK','K','1'..'8']`; **never route a bare digit**; never strip to empty (keep last content token). Vitest: positives, false-positives (`three sisters garden`, `grade a vegetables`), grade-only, 3K/PK edge.
- Verify: `npx vitest run` for the new test green; `npm run type-check`.

### Task S1.2: wire into the search hook
- In `useLessonSearch.ts` before the `rpc` call: `const { cleanedQuery, detectedGrades } = parseSearchQuery(filters.query ?? '')`; pass `search_query: cleanedQuery || undefined`; merge `detectedGrades` into `filter_grade_levels` **only when the user has not set an explicit grade filter** (explicit filter wins); always use `cleanedQuery` for the FTS term.
- Verify: `npm run type-check && npm run lint`; manual: existing single-term search unchanged.

### Task S1.3: grade chip UI (user-decision: visible removable chip — confirm at PR start)
- Render auto-applied grades as a removable chip near the search bar; removing it re-runs without the routed grade.
- Verify: E2E + manual smoke.

### Task S1.4: eval delta + E2E
- Update `run-search-eval.ts` to import + apply `parseSearchQuery` before the RPC (now feasible — tsx + pure module; keeps the gate honest about real app behavior); re-run `eval:search` on TEST; commit the scorecard delta (must show G2 lift, single-term queries unchanged, no control regression beyond the tolerance band).
- Add/extend `e2e/search.spec.ts`: "compost lesson for 3rd grade" → focused set + grade chip.
- Commit: `feat(search): G2 frontend query preprocessing — filler strip + grade routing (S1)`.

---

## PR S2 — G3 field indexing

**Branch:** `feat/search-g3-index`. **Sub-skill:** `database-migrations` (invoke BEFORE creating the file). GATE 2 Codex before push.

**What ships:** one migration folding `social_emotional_learning` into the FTS C-weight block (CC/AI conditional on scorecard).

**Pre-flight:** `ls supabase/migrations | sort | tail -3` (date-prefix sorts AFTER); `supabase/migrations/20260521000000_search_vector_with_concepts.sql` (full — the template: function body lines ~77-121, trigger `UPDATE OF`, backfill `UPDATE … SET metadata = metadata`); the live `update_lesson_search_vector` body.

### Task S2.1: migration — add SEL to the vector
- New migration `supabase/migrations/<date>_search_vector_add_sel.sql`: `CREATE OR REPLACE update_lesson_search_vector()` adding `array_to_string(NEW.social_emotional_learning,' ')` into the existing C-weight `to_tsvector(...)`; recreate the trigger with `social_emotional_learning` added to `UPDATE OF`; backfill `UPDATE public.lessons SET metadata = metadata` (ALL rows — `max(updated_at)`=2026-04-27 predates the re-tag). Rollback block in comments. Verify date-prefix sort.
- Verify: `supabase db reset` + `npm run test:rls` clean; idempotent re-apply.

### Task S2.2: gate + TEST verify
- GATE 2: Codex adversarial review of the migration (idempotency / trigger recreate / backfill scope / grants). Triage + fix-up.
- Push → PR; CI applies to TEST; `mcp__supabase-test__execute_sql`: confirm a known SEL-only lesson now matches its SEL value in `search_vector`; row-count sanity; re-run `eval:search` on TEST (lift on discriminating SEL queries; no regression).

### Task S2.3 (conditional): core_competencies / academic_integration
- Only if the S2.2 scorecard shows lift: a follow-up migration (or extend before TEST verify) adding the field(s). Default: **exclude both** unless measured. Document the decision from the scorecard.

---

## PR S3 — Synonym bridge (conditional, most-deferrable)

**Branch:** `feat/search-synonym-bridge`. **Sub-skill:** `database-migrations`.

### Task S3.1: build + justify the pair list
- From `scripts/stage2-retag/artifacts/full-run.fable.jsonl`, extract single-token-both-sides non-identity pairs (≈24); apply the hard filter (drop identity / lossy / over-broad — design §6); add the few hand-authored gap pairs (`decay→decomposition`, probe-verified). Land ~12–18 with per-pair eval justification in the migration comment.
- Verify: each candidate's everyday term is a true synonym of the official concept (no `worms→decomposition`).

### Task S3.2: idempotent migration + eval gating
- `INSERT … SELECT … WHERE NOT EXISTS` on `(term, synonym_type, synonyms)`, `synonym_type='oneway'` (precedent: `20260522000000`). **GATE-1 fix — rollback = exact-tuple `DELETE`:** the down/rollback block deletes only rows matching the exact `(term, synonym_type, synonyms)` tuples inserted (same VALUES list). The table has no tag/source column — do NOT add one or `DELETE` by bare `term`.
- GATE 2 Codex; TEST verify rows load + `expand_search_with_synonyms` picks them up; per-batch `eval:search` lift with **no control regression**. **Ship only net-positive; else abandon the PR.**
- Explicitly supersedes PR-D's D2 (smoke `expand_search_with_synonyms`, NOT smart-search).

---

## PR-E rider — dead-code retirement (folded into existing `feat/pr6e-stage2-cleanup`)

**NEW addition to PR-E** (E1/E2/E3 don't currently scope it). Gated after C2 AND S2 are PROD-verified (so the trigger provably no longer references the twin).
- `DROP FUNCTION public.generate_lesson_search_vector(text,text,text[],text[],text[],text[],text[],text[],text[],text)` + `REVOKE` its anon/authenticated/PUBLIC grants. Pre-drop: `pg_depend` + repo grep confirm no caller.
- **Retire the `search-lessons` edge fn (GATE-1 fix — it is deployed ACTIVE v22 on PROD; the deploy workflow discovers dirs via `find … -type d` and only ever runs `supabase functions deploy`, never delete — so deleting the repo dir alone leaves the function LIVE):** (a) delete `supabase/functions/search-lessons/`; (b) run `supabase functions delete search-lessons` for TEST **and** PROD through the approved path; (c) MCP-verify removal via `mcp__supabase-{test,remote}__list_edge_functions` (slug absent). Follow the edge-fn deletion ordering hazard note in memory (drain queued deploy runs that pre-date the retirement merge).
- Verify: `eval:search` no-op regression proof; `db reset` + `test:rls` clean.

---

## Test plan

### Unit (vitest)
- `parseSearchQuery`: filler/grade/false-positive/never-empty/3K-PK.
- eval metrics: hit@10 / top-1 / MRR / over-broad on fixtures.

### Integration / eval
- `npm run eval:search`: committed baseline; scorecard diff is a required review item on every search-affecting PR.

### E2E
- `e2e/search.spec.ts`: S1 multi-word → focused + grade chip; single-term unchanged.

### RLS
- `npm run test:rls` must pass unchanged on S2/S3 (no RLS changes expected).

### Manual smoke (per `superpowers:verification-before-completion`)
- S1 deploy: marquee queries in live UI + grade chip behavior.
- S2/S3 PROD apply: PROD MCP verbatim verify + re-run `eval:search` against PROD.
