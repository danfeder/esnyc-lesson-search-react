# Search Modernization (Medium Package) Execution Status

**Last updated:** 2026-06-18 by Session 5 (S1.3 grade chip DONE + verified; S1.4 next) on `feat/search-g2-frontend`

## Current State

**Active PR:** none open yet — **S0 is MERGED to `main`**; S1 (G2 frontend) building on `feat/search-g2-frontend`. **S1.1 + S1.2 + S1.3 DONE.** S1.1 (`7f29eba`): pure `parseSearchQuery` + 34 tests. S1.2 (`d14fec9`): wired into `useLessonSearch.ts` — `search_query`←`cleanedQuery`, `filter_grade_levels`←`effectiveGradeLevels` (explicit user grade filter WINS over detected); hook return shape UNCHANGED. **S1.3 (`60f1a40`):** removable auto-grade chip folded into `IntActivePills.tsx` — NOT a hook return-shape change (supervisor revised the earlier lean): the component derives auto-grades from the same pure `parseSearchQuery(filters.query)` and mirrors the hook's explicit-wins guard so the chip never claims a grade the hook didn't apply. Dismiss = `setFilters({ query: cleanedQuery })` → rewrites the box (via Header's existing `localQuery`←`filters.query` sync, `Header.tsx:193-195`) + broadens to all grades. Label `Grade 3 · auto` / `Grades K, 1, 2 · auto` (one combined chip). +7 vitest (124 Internal green). Built via executor→verifier workflow `wf_97c13781-39b`; supervisor-verified (re-read diff + independently re-ran type-check/lint/vitest). **S1.4 (eval delta + E2E) is next — the last S1 task before the per-PR ritual.**

**S1.4 (NEXT) — eval delta + E2E:** flip `scripts/search-eval/run-search-eval.ts` `resolveCall()` (line 244, marked `// S1.4`) from returning raw `{ search_query: entry.query }` to applying `parseSearchQuery(entry.query)` → `{ search_query: cleanedQuery || raw-fallback, filter_grade_levels: detectedGrades }` (import the pure module by relative path — it's alias-free, so the tsx harness imports the exact code the hook uses). Re-run `npm run eval:search` (target TEST) and commit the scorecard delta: must show **G2 lift** on the normalized G2 cases (raw explosion → focused, actual call == `expectedNormalizedCall`), **single-term queries unchanged**, **no control-query regression** beyond the tolerance band. Do NOT overwrite the S0 `baseline.json` (it is the raw-explosion reference the delta is measured against — confirm the harness's capture-vs-compare flag before running). Extend `e2e/search.spec.ts`: `compost lesson for 3rd grade` → focused set + the `· auto` grade chip visible + removable; single-term search unchanged. Then the per-PR ritual (pre-push code-reviewer + GATE-3 Codex in parallel → push → `gh pr create` → four-surface triage).

**S0 (eval harness) — DONE + MERGED.** PR #511 squash-merged to `main` 2026-06-18 18:10Z as `69c68e4`. The measurement gate is now on `main`: `scripts/search-eval/` (cluster-aware `metrics.ts` + read-only tsx `run-search-eval.ts` + `predicate.ts` + `readonly-guard.ts` + 35-entry two-tier `queries.json` + committed TEST `baseline.json` + `scorecards/test.md`), `npm run eval:search`, `SEARCH_EVAL_TARGET=local|test|prod` (default test). External review: `claude-review` **Approve** (5 non-blocking nits, all default-rejected as below-bar for an internal read-only tool) + `performance-review` pass. The Security Audit CI failure was the **pre-existing npm-audit pattern** (S0 added ZERO deps — `package-lock.json` unchanged vs main; one-line `package.json` script add), non-blocking, fails identically on main. Full S0 detail + session logs 0–3 → `…-execution-status-archive.md`.

**NOW: S1 — G2 frontend query preprocessing** on `feat/search-g2-frontend` (cut fresh from `main` 2026-06-18). Tasks S1.1→S1.4 (impl plan). The harness already has the S1 seam stubbed: `run-search-eval.ts` `resolveCall()` (~line 239, marked `// S1.4`) currently returns `{ search_query: entry.query }` raw; S1.4 replaces it with `parseSearchQuery(entry.query) -> { cleanedQuery, detectedGrades }`.

**S1.1 contract (load-bearing):** `parseSearchQuery(raw) -> { cleanedQuery: string; detectedGrades: string[] }` must reproduce the 6 frozen `normalizedCall` gold outputs (search_query←cleanedQuery, filter_grade_levels←detectedGrades):
- q01 `compost lesson for 3rd grade` → `compost` + `["3"]`
- q02 `garden lessons for kindergarten` → `garden` + `["K"]`
- q03 `worm composting for 2nd graders` → `worm composting` + `["2"]`
- q04 `a lesson about seeds for first grade` → `seeds` + `["1"]`
- q32 `compost lesson for third graders` → `compost` + `["3"]`
- q33 `seeds grades K-2` → `seeds` + `["K","1","2"]` (range expansion along canonical order)
Valid grades = `['3K','PK','K','1','2','3','4','5','6','7','8']` (filterDefinitions.ts:63-79 / scripts/CLAUDE.md). Module MUST be **pure/alias-free** (no `@/`, no `import.meta.env`) so the tsx harness imports the same code. Safety invariants: explicit grade cue required (never route a bare digit); ordinal+`grade(s)`/`grader(s)`/`kindergarten`/`pre-k`/`3k` cues; explicit user grade filter wins (S1.2 wiring); always strip the routed grade token from the FTS term; never strip filler to empty (keep last content token); false-positive guards `three sisters garden` + `grade a vegetables`.

**Status: S1.1–S1.3 are DONE; S1.4 is next** (full S1.4 plan in the S1.4 paragraph near the top of Current State). The S1.1 contract block above is retained as the `parseSearchQuery` reference.

**Branch:** `feat/search-g2-frontend` (fresh from `main`). No DB change in S1 → no TEST-DB-before-merge gate; ships via Netlify, one-deploy revert. `.env` TEST anon creds wired (gitignored) for `eval:search`.

**Last commit on main:** `69c68e4` (PR #511 — S0 eval harness).

**Substrate facts (TEST, where the baseline captures):** corpus = **766 total / 745 searchable** (`retired_at IS NULL`; eval scores against 745). `search_lessons(search_query text, +13 filter args DEFAULT NULL, page_size DEFAULT 20, page_offset DEFAULT 0)` returns `lesson_id text, title, summary, file_link, grade_levels, metadata jsonb, confidence jsonb, rank double precision, total_count bigint`. anon can call the RPC. Search is LIVE on PROD + healthy; concepts ARE indexed (`update_lesson_search_vector` trigger); public engine = `search_lessons` RPC. Gaps confirmed firsthand: G1 (everyday words), G2 (multi-word explosion), G3 (SEL/CC/AI not typed-searchable). No search-behavior change has shipped yet — S1 is the first.

## Recent decisions worth carrying forward

- **G2 fix = frontend** (`parseSearchQuery.ts`), filler/grade only; the deeper server-side OR→AND is DEFERRED + documented (design §9) to return to (user decision 2026-06-17).
- **Eval harness gates everything** and shipped first (S0 on main); baseline captured on TEST; ranking scorer written fresh (computeMetrics is classification-only).
- **G3 per-field by measured value** — ship SEL; CC/AI only if the S2 scorecard shows lift.
- **Synonyms (S3):** small (~12–18) single-token `oneway` everyday→official, hard-filtered, eval-gated; bulk 5,163-pair load RETIRED (wrong mechanism). Rollback = exact-tuple `DELETE`.
- **Gold set FROZEN + product-owner-confirmed** (on main in `queries.json`) — do NOT edit gold values without re-verifying + re-confirming with the product owner. (Full freeze provenance in archive.)
- **Grade chip = visible + removable** (LOCKED design §5; confirmed by user at S1 start 2026-06-18). **S1.3 sub-decisions confirmed by user 2026-06-18:** dismiss **rewrites the box to the cleaned term** (`setFilters({ query: cleanedQuery })`, stateless — no suppression flag); chip lives **in the existing `IntActivePills` row** labeled `· auto` (one combined chip for ranges). Supervisor revised the build to fold into `IntActivePills` (no `useLessonSearch` return-shape change) — simpler + keeps the hook pure.
- **Cross-family GATE-3 Codex earns its keep** on search PRs (caught the HIGH G3 metric bug + the q34 gold divergence in S0) — keep it in every search-PR pre-push ritual. (Promoted to [[feedback_pr_bot_review_workflow]].)

## Out-of-scope follow-ups captured here

- Deeper G2 (server-side OR→AND term combination) — DEFERRED, documented (design §9). The explicit "come back later" item.
- Full semantic/hybrid ("Heavy") search + embedding regen; embedding-pipeline bugs (`{content}`/`{text}` mismatch; stale recipe fields) — fix before any regen.
- Dead-code retirement rides PR-E (NEW addition to PR-E's E1/E2/E3 scope): `DROP FUNCTION generate_lesson_search_vector(10-arg)` + `supabase functions delete search-lessons` (TEST+PROD; deployed ACTIVE v22). Gated after C2 + S2 PROD-verified.

## Pointers to durable context

- Kickoff prompt: `2026-06-17-search-modernization-medium-kickoff.md`
- Design doc: `2026-06-17-search-modernization-medium-design.md` (LOCKED decisions; read every session)
- Implementation plan: `2026-06-17-search-modernization-medium-implementation.md` (per-task scope)
- **Archive (S0 cycle + sessions 0–3 logs):** `2026-06-17-search-modernization-medium-execution-status-archive.md`
- Investigation + plan provenance: memory `project_search_modernization.md`; runs `wf_fb08aeb5-3e4` (investigation) + `wf_6156054d-320` (plan panel); Codex `019ed86a` + `019ed885`.

## Recent session log

### Session 5 — 2026-06-18 — S1.3 grade chip DONE + verified

Branch: `feat/search-g2-frontend`. Continued S1 from S1.2.

Major events:
- **Orientation:** git ⇄ status agreed (S1.1 `7f29eba`, S1.2 `d14fec9`); clean type-check + lint baseline. Read design §5 + impl S1.3/S1.4 + all four code seams (`useLessonSearch.ts`, `SearchPage.tsx:43`, `searchStore.ts`, `IntActivePills.tsx`, `Header.tsx` HeaderSearch).
- **S1.3 sub-decisions surfaced to user** (impl plan flags S1.3 as a user-decision). User confirmed: dismiss **rewrites the box to cleaned term**; chip **in the pills row labeled `· auto`**. (User asked for a plain-language re-explanation first — see learnings.)
- **Supervisor design revision:** folded the chip into `IntActivePills` (derives auto-grades via the same pure `parseSearchQuery` + mirrors the hook's explicit-wins guard) instead of changing the `useLessonSearch` return shape — simpler, keeps the hook pure, no Header change (verified Header's `localQuery`←`filters.query` `useEffect` makes the box rewrite "for free").
- **S1.3 DONE** (commit `60f1a40`): built via executor→adversarial-verifier workflow `wf_97c13781-39b` (both pass; verifier verdict `pass`, 2 LOW non-blocking notes: grade-only dismiss clears box = intentional per parser; optional extra test coverage). Files: `IntActivePills.tsx` (+chip) + new `IntActivePills.test.tsx` (7 tests). Supervisor-verified: re-read full diff (guard mirrors `useLessonSearch.ts:95-99` exactly; commit scope = only the 2 files, zero forbidden paths), independently re-ran type-check (clean) + lint (clean) + vitest (7/7 + 124 Internal green).

NEXT: S1.4 — flip harness `resolveCall` to apply `parseSearchQuery` + re-run `eval:search` on TEST + commit scorecard delta (G2 lift, no control regression) + extend `e2e/search.spec.ts`. Then the per-PR ritual.

### Session 4 — 2026-06-18 — S0 MERGED (PR #511); S1 cycle started

Branch: `feat/search-g2-frontend` (cut from `main`). No code commits yet beyond this bookkeeping commit.

Major events:
- **Session-start divergence caught:** the prior status header said "next = push + open S0 PR," but git reality was ahead — branch already pushed and **PR #511 already OPEN**. Trusted git per the kickoff. Collected all four PR surfaces: `claude-review` Approve (5 non-blocking nits), `performance-review` pass, no line/formal-review findings, Security Audit fail = pre-existing npm-audit (proved zero new deps via unchanged `package-lock.json`). Rebuttal-passed all 5 nits → none warrant a fix-up.
- **Confirmed Codex review provenance** (user asked): Codex GATE-3 reviewed the S0 *code* pre-push (Session 3, commit `00e0e7d`); the code in PR #511 is byte-identical to what Codex reviewed (only a docs checkpoint commit followed). No post-push Codex (not a CI bot here); pre-push GATE-3 deemed sufficient.
- **Merged PR #511** (user-gated) — squash `69c68e4` to `main`; branch deleted; merge verified (state=MERGED, files on main).
- **PR-cycle archival:** created the archive doc (S0 detail + sessions 0–3); promoted 2 learnings to feedback memories ([[feedback_pr_bot_review_workflow]] cross-family GATE-3; [[feedback_workflow_orchestration]] on-disk executor brief); refreshed this Current State for S1.

- **S1.1 DONE** (commit `7f29eba`): pure `parseSearchQuery` built via executor→adversarial-verifier workflow (`wf_4fa5ea7b-e96`). Supervisor-verified: re-ran 34 vitest + type-check + lint; independent tsx probe = 6/6 frozen gold + 5/5 false-positive guards + edges. Verifier's 3 low findings all benign.
- **S1.2 DONE** (this commit): wired `parseSearchQuery` into `useLessonSearch.ts` via workflow `wf_77263ad6-8d3` (executor→verifier, both pass). Minimal non-breaking edit (import + 4 derived lines + 2 param swaps; queryKey + return shape untouched). New `useLessonSearch.wiring.test.tsx` (5 cases incl. explicit-wins + grade-only). Supervisor-verified: read the diff (no raw `filters.query` leak — referenced only to feed the parser), re-ran targeted tests (16/16) + type-check + lint; verifier ran full suite (1272 green, zero regression) + independently re-probed the module.

NEXT: S1.3 removable grade chip (expose auto-applied grades from the hook + render in SearchPage + dismiss via `setFilters({query: cleanedQuery})` — confirm) + E2E → S1.4 flip harness `resolveCall` + eval delta on TEST (must show G2 lift) → per-PR ritual.

> Earlier sessions (0–3, the full S0 build cycle) are archived in `…-execution-status-archive.md`.
