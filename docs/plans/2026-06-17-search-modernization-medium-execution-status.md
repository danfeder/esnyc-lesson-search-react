# Search Modernization (Medium Package) Execution Status

**Last updated:** 2026-06-18 by Session 1 (S0.2 dual review → scoring-model upgrade)

## Current State

**Active PR:** none open yet — **S0 (eval harness)** in progress on branch `feat/search-eval-s0`.

**Current task:** S0.2 in progress (assembling two-tier gold for product-owner sign-off). S0.1 base metric module shipped (`93bcaa0`/`9afbe5e`); **S0.1-extend** (cluster-aware + two-tier + G3-isolation + dup-guard, 69 vitest cases) shipped + verified (`634b754`, executor→verifier `wf_e6c12a91-bd4`). Twin finding: the 12 empty-summary `lesson_…` rows in the pools are REAL searchable near-dupes (3.3–10.5KB content + vector), so they cluster with their twin (recall counts the pair once). Only 1 true content_hash cluster corpus-wide (3 "Unknown" ghosts, not in any gold). **The S0.2 query-set + gold went through a DUAL adversarial review** (Claude 4-lens fan-out `wf_8a2690f3-c67` + independent Codex read-only `bjwa14g6e`, both against the live TEST corpus). Both converged: the locked simple metric (hit@10 vs flat id list) would give **false readings in ≥4 ways** → **user APPROVED a scoring-model upgrade 2026-06-18** (two-tier cluster gold, per-query scoring families, G2-normalized scoring, G3 rank-movement, q22 sentinel-not-gold, dup-flood guard, + coverage/robustness queries → ~32). Design §4 + impl S0.1–S0.4 updated to match (this session). **NEXT:** (a) **S0.1-extend** — rework metrics.ts to cluster-aware + new functions (TDD; delegable); (b) assemble the two-tier gold (primary/acceptable clusters) from the dual-review adjudication and get product-owner sign-off; (c) S0.3 harness + S0.4 baseline. Codex CANNOT reach TEST directly (both `.env` keys stale, no psql conn string, CLI on PROD) — reviews ran on a supervisor-built data snapshot at `.tmp/codex-goldset-review/`. GATE 1 was done+folded earlier.

**Branch:** `feat/search-eval-s0` — cut **fresh from `main`** this session (per kickoff), with the 3 docs commits cherry-picked over (`57d5619` C2-closeout, `8eb1479` scaffold, `3b1239f` GATE-1 fold) + kickoff sync (`6dae620`). The legacy `feat/pr6d-search-synonyms` is abandoned. NOTE: S0's eventual PR will carry the C2-closeout parent-track doc edit to main (harmless/accurate bookkeeping).

**S0.1 commits:** `93bcaa0` (ranking-metric module + 28 vitest cases + tsconfig.scripts include) + `9afbe5e` (verifier-finding comment fix). Files: `scripts/search-eval/metrics.ts` (pure `hitRateAtK`=recall@k / `top1Relevant` / `mrr`=per-query RR / `overBroad`), `metrics.test.ts`, `tsconfig.scripts.json`. Locked metric semantics live in the design + the module's doc comments. Verified: vitest 28/28, type-check + lint clean, adversarial verifier = pass.

**Last commit on main:** `e4d7830` (PR 6 C2 — Stage-2 re-tag apply; metadata-rebuild APPLY phase complete + PROD-verified).

**Substrate facts (TEST, where the baseline captures):** corpus = **766 lessons**; `search_lessons(search_query text, …12 filter args…, page_size int DEFAULT 20, page_offset int DEFAULT 0)` returns `lesson_id text, title, summary, file_link, grade_levels, metadata jsonb, confidence jsonb, rank double precision, total_count bigint`. `lesson_id` is **text**. These feed the `overBroad` threshold + the S0.3 harness RPC call + S0.2 oracle SELECTs.

**Substrate state:** Search is LIVE on PROD and healthy. Concepts ARE indexed (`update_lesson_search_vector` trigger). Public engine = `search_lessons` RPC. Gaps confirmed firsthand: G1 (everyday words), G2 (multi-word explosion), G3 (SEL/CC/AI not typed-searchable), G5 (no eval set). No search change has shipped yet.

## Recent decisions worth carrying forward

- **Scoring-model upgrade (2026-06-18, user-approved) — the eval must not give false readings.** Dual adversarial review (Claude 4-lens + Codex) found the simple hit@10-vs-flat-id design would lie in ≥4 ways. Adopted: (1) **two-tier cluster gold** (twins=one cluster, primary=counted / acceptable=not-penalized) — resolves the Claude-vs-Codex relevance disagreements without nDCG; (2) **per-query scoring families** (frozen-recall / frozen-precision / predicate / g3-isolation / sentinel / control-maxcount); (3) **G2 scored on the normalized `parseSearchQuery` call**, not raw (else G2 reads "broken" forever); (4) **G3 scored by rank-movement** of the tag-but-no-lexical-mention isolation sets (RDM=29/SM=42/SJ=25), `isolationHits@50` — NOT top-10 recall; (5) **q22 `compost worms soil` = stability sentinel excluded from quality** (freezing today's top-10 as gold violates engine-independence); (6) **dup-flood guard** (`duplicateFloodCount`/dedup-aware precision). Coverage adds: `mexican food`, `apple`, `food waste`, `making good choices` (combined G1+G3, labeled) + a robustness pack (grade-wording variants, 1 typo, `kimchi`). SEL: keep exact-label probes AND add everyday phrasings.
- **PR D RETIRED → this track.** Bulk 5,163-pair synonym load is wrong-mechanism (whitespace CHECK + token matcher). Repurposed: small curated single-word bridge (S3) now; bulk map → deferred semantic tier.
- **G2 fix = frontend** (`parseSearchQuery.ts`), filler/grade only; the deeper server-side OR→AND is DEFERRED + documented (design §9) to return to (user decision 2026-06-17).
- **Eval harness gates everything** and ships first; baseline captured on TEST; ranking scorer written fresh (computeMetrics is classification-only).
- **G3 per-field by measured value** — ship SEL; CC/AI only if the scorecard shows lift.
- **Gold set is collaborative** — user signs off ~8 ideal-result lists; this is the one human dependency that makes the eval trustworthy.
- **GATE 1 fold (3 Codex findings, all repo-verified):** (1) eval harness must be a **`.ts` run via `npx tsx`** (repo convention; a `.mjs`/`node` script can't import the TS `parseSearchQuery`) + add `scripts/search-eval/**` to `tsconfig.scripts.json`; `parseSearchQuery` must be pure/alias-free so both frontend + harness import it. (2) PR-E rider must run **`supabase functions delete search-lessons`** for TEST+PROD — it's deployed ACTIVE v22 and the deploy workflow never undeploys on dir-delete. (3) S3 synonym rollback = **exact-tuple `DELETE`** (no tag column exists on `search_synonyms`).

## Out-of-scope follow-ups captured here

- Deeper G2 (server-side OR→AND term combination) — DEFERRED, documented (design §9). The explicit "come back later" item.
- Full semantic/hybrid ("Heavy") search + embedding regen; embedding-pipeline bugs (`{content}`/`{text}` mismatch; stale recipe fields) — fix before any regen.
- Dead-code retirement rides PR-E (NEW addition to PR-E's E1/E2/E3 scope).

## Pointers to durable context

- Kickoff prompt: `2026-06-17-search-modernization-medium-kickoff.md`
- Design doc: `2026-06-17-search-modernization-medium-design.md` (LOCKED decisions; read every session)
- Implementation plan: `2026-06-17-search-modernization-medium-implementation.md` (per-task scope)
- Investigation + plan provenance: memory `project_search_modernization.md`; runs `wf_fb08aeb5-3e4` (investigation) + `wf_6156054d-320` (plan panel); Codex `019ed86a` + `019ed885`.
- Archive: `2026-06-17-search-modernization-medium-execution-status-archive.md` (created when needed)

## Recent session log

### Session 0 — 2026-06-17 — scaffolding

Major events:
- Investigation (all-sides: 5-lens workflow + adversarial verify + independent Codex) established the corrected search architecture + gaps; user chose the "Medium" package; PR D retired.
- Design judge-panel (5 plans + critique + synthesis) + independent Codex plan produced the locked sequence/decisions (Q1–Q5).
- Scaffolded the four-file plan (design Locked + this status + impl + kickoff).
- NEXT: GATE 1 Codex review of the design doc → then build S0 (eval harness), with the gold set built collaboratively with the user.
