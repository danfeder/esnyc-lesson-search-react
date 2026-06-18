# Search Modernization (Medium Package) Execution Status

**Last updated:** 2026-06-17 by Session 1 (S0.1 shipped)

## Current State

**Active PR:** none open yet — **S0 (eval harness)** in progress on branch `feat/search-eval-s0`.

**Current task:** S0.1 **DONE + supervisor-verified**. **Next: S0.2 — query set + gold `idealLessonIds` (COLLABORATIVE — needs the user/product-owner; not delegable, never fabricated).** GATE 1 (Codex plan review) was DONE + folded last session.

**Branch:** `feat/search-eval-s0` — cut **fresh from `main`** this session (per kickoff), with the 3 docs commits cherry-picked over (`57d5619` C2-closeout, `8eb1479` scaffold, `3b1239f` GATE-1 fold) + kickoff sync (`6dae620`). The legacy `feat/pr6d-search-synonyms` is abandoned. NOTE: S0's eventual PR will carry the C2-closeout parent-track doc edit to main (harmless/accurate bookkeeping).

**S0.1 commits:** `93bcaa0` (ranking-metric module + 28 vitest cases + tsconfig.scripts include) + `9afbe5e` (verifier-finding comment fix). Files: `scripts/search-eval/metrics.ts` (pure `hitRateAtK`=recall@k / `top1Relevant` / `mrr`=per-query RR / `overBroad`), `metrics.test.ts`, `tsconfig.scripts.json`. Locked metric semantics live in the design + the module's doc comments. Verified: vitest 28/28, type-check + lint clean, adversarial verifier = pass.

**Last commit on main:** `e4d7830` (PR 6 C2 — Stage-2 re-tag apply; metadata-rebuild APPLY phase complete + PROD-verified).

**Substrate facts (TEST, where the baseline captures):** corpus = **766 lessons**; `search_lessons(search_query text, …12 filter args…, page_size int DEFAULT 20, page_offset int DEFAULT 0)` returns `lesson_id text, title, summary, file_link, grade_levels, metadata jsonb, confidence jsonb, rank double precision, total_count bigint`. `lesson_id` is **text**. These feed the `overBroad` threshold + the S0.3 harness RPC call + S0.2 oracle SELECTs.

**Substrate state:** Search is LIVE on PROD and healthy. Concepts ARE indexed (`update_lesson_search_vector` trigger). Public engine = `search_lessons` RPC. Gaps confirmed firsthand: G1 (everyday words), G2 (multi-word explosion), G3 (SEL/CC/AI not typed-searchable), G5 (no eval set). No search change has shipped yet.

## Recent decisions worth carrying forward

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
