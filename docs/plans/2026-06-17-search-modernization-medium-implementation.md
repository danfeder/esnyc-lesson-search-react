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

### Task S0.1 (TDD): fresh ranking-metric module
- Create `scripts/search-eval/metrics.ts` (pure functions): `hitRateAtK(resultIds, goldIds, k)`, `top1Relevant(resultIds, goldIds)`, `mrr(resultIds, goldIds)`, `overBroad(totalCount, corpusSize, threshold)`. Vitest in `scripts/search-eval/metrics.test.ts` — failing-first. (TS, run by tsx/vitest — see S0.3 for the runtime decision.)
- **GATE-1 fix:** add `scripts/search-eval/**/*.ts` to `tsconfig.scripts.json` `include` (currently only `stage2-retag`/`heritage`/`lib`) so these files are covered by `npm run type-check`.
- Verify: `npx vitest run scripts/search-eval/metrics.test.ts` green; `npm run type-check`.

### Task S0.2: query set + gold sets (COLLABORATIVE — supervisor + user)
- Create `scripts/search-eval/queries.json`: ~25–30 entries `{id, query, intent, category, provenance, idealLessonIds?, idealPredicate?, maxTotalCount?}`. Categories per design §4 (gap cases, vocab/SEL discriminating, teacher intents, controls incl. ≥1 multi-meaningful-term).
- For the ~8 highest-value queries: **build the frozen `idealLessonIds` with the user** (supervisor proposes a generous oracle SELECT, user prunes to truly-relevant). The rest use `idealPredicate`.
- Verify: JSON parses; supervisor confirms every entry has a provenance tag and a gold mechanism.

### Task S0.3: the harness script
- Create `scripts/search-eval/run-search-eval.ts` (**TS, run via `npx tsx`** — GATE-1 fix: a plain `.mjs`/`node` script can't import the TS `parseSearchQuery` module S1 needs; the repo convention is `npx tsx scripts/*.ts`): read-only, anon key, env-targetable (`SEARCH_EVAL_TARGET=local|test|prod`), its OWN `assertReadOnly` guard (refuse if a write client/service key is configured), calls `supabase.rpc('search_lessons', {search_query, page_size:50, ...})` per query, computes metrics, writes `scorecards/<target>-<n>.md` + updates `baseline.json` on an explicit `--write-baseline` flag only. Tolerates missing gold ids (reports, never crashes).
- Add `"eval:search": "npx tsx scripts/search-eval/run-search-eval.ts"` to `package.json`.
- Verify: `npm run eval:search` (target TEST) prints a scorecard; no writes (confirm via a read-only role / guard); `npm run type-check` covers the new files (tsconfig include from S0.1).

### Task S0.4: capture baseline + commit
- Capture `baseline.json` on **TEST** (`--write-baseline`, `SEARCH_EVAL_TARGET=test`); commit script + queries + baseline + scorecard. Commit: `feat(search-eval): read-only eval harness + committed TEST baseline (S0)`.
- Verify: `npm run type-check && npm run lint`; baseline reproduces green on a clean re-run against TEST.

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
