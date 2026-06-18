# Search Modernization (Medium Package) Execution Status

**Last updated:** 2026-06-18 by Session 2 (S0.2 gold FROZEN + triple-verified; S0.3 unblocked)

## Current State

**Active PR:** none open yet — **S0 (eval harness)** in progress on branch `feat/search-eval-s0`.

**Current task:** S0.2 **DONE + committed** (`97ed020`). `scripts/search-eval/queries.json` (35 entries, two-tier cluster gold) is **FROZEN and triple-verified**. **NEXT = S0.3** (the harness script `run-search-eval.ts`) — now unblocked (TEST anon creds wired + smoke-proven, see below).

**S0.2 closeout (Session 2):**
- **Deep verification (the owed re-check):** 8-agent live re-derivation workflow (`wf_5521dc30-78d`) + adversarial completeness critic + supervisor 4-query spot-check. **All PASS, zero failures** — every oracle re-run verbatim on TEST, all PRIMARY titles return live rows (build-rule-6 clean), all twins co-clustered, all EXCLUDEs absent, isolation sets exact by **bidirectional set-equality** (29/42/25; q31≡q10), all pinned counts zero-drift, q22 sentinel top-10 jaccard 1.0, corpus 745.
- **q12 supervisor pick RESOLVED** (user/product-owner-confirmed): 5 activity-based PRIMARY clusters (Compost Relay; Compost Relay & Stew twin; Plant Part Olympics; Teamwork Challenge; Teamwork in the Garden); acceptable empty. `_candidatePool`/`_needsSupervisorPick` removed.
- **Independent Codex cross-check** (different model family, raw-row snapshot at `.tmp/codex-goldset-review/pools.json`): caught **1 REAL spec-vs-data divergence** — q34 had carried q05's *acceptable* tier, but spec line 179 scores q34 "vs the q05-07 PRIMARY" only → **q34 acceptableClusters emptied** (inert for frozen-recall; *all 8 same-family agents had normalized it away* — validates the cross-family pass). Rejected 1 false alarm (q23 maxTotalCount=600 is a guard-ceiling above current=586, by spec line 174).
- q27 degenerate 'Unknown' ghost row KEPT (user decision, documented); q03 indentation tidied; `_snapshot` note refreshed.

**S0.3 unblocked (this session):** the harness is a standalone `tsx` script needing a Supabase **anon client** (can't use MCP). `.env` TEST keys were stale (ref `epedjebjemztzdyhqace`, deleted project). Fetched the live TEST anon key via MCP `get_publishable_keys` (ref `rxgajgmphciuaqzvwmox`) → **refreshed `.env` `TEST_SUPABASE_ANON_KEY` + added `TEST_SUPABASE_URL`** (local, gitignored). Smoke-tested: anon → `search_lessons` RPC works (`'compost'` → total_count 178). Target→creds convention for the harness: local=`VITE_*`, test=`TEST_SUPABASE_URL`+`TEST_SUPABASE_ANON_KEY`, prod=`PROD_*`. **`TEST_SUPABASE_SERVICE_KEY` is STILL stale (untouched) — use MCP for any write/admin TEST work.** See memory [[project_test_key_stale]].

**Then:** S0.3 harness (read-only, own `assertReadOnly`, G2-normalized scoring, sentinel/predicate/isolation handling, `npm run eval:search`) → S0.4 capture TEST baseline + commit → close S0.

**Branch:** `feat/search-eval-s0` — cut **fresh from `main`** this session (per kickoff), with the 3 docs commits cherry-picked over (`57d5619` C2-closeout, `8eb1479` scaffold, `3b1239f` GATE-1 fold) + kickoff sync (`6dae620`). The legacy `feat/pr6d-search-synonyms` is abandoned. NOTE: S0's eventual PR will carry the C2-closeout parent-track doc edit to main (harmless/accurate bookkeeping).

**S0.1 commits:** `93bcaa0` (ranking-metric module + 28 vitest cases + tsconfig.scripts include) + `9afbe5e` (verifier-finding comment fix). Files: `scripts/search-eval/metrics.ts` (pure `hitRateAtK`=recall@k / `top1Relevant` / `mrr`=per-query RR / `overBroad`), `metrics.test.ts`, `tsconfig.scripts.json`. Locked metric semantics live in the design + the module's doc comments. Verified: vitest 28/28, type-check + lint clean, adversarial verifier = pass.

**Last commit on main:** `e4d7830` (PR 6 C2 — Stage-2 re-tag apply; metadata-rebuild APPLY phase complete + PROD-verified).

**Substrate facts (TEST, where the baseline captures):** corpus = **766 total rows / 745 searchable** (`retired_at IS NULL`; 21 retired) — the eval scores against **745** (the prior "766 lessons" note conflated total-vs-searchable). `search_lessons(search_query text, + 13 filter args ALL DEFAULT NULL, page_size int DEFAULT 20, page_offset int DEFAULT 0)` returns `lesson_id text, title, summary, file_link, grade_levels, metadata jsonb, confidence jsonb, rank double precision, total_count bigint`. `lesson_id` is **text**; `total_count` is identical on every row. **anon can call the RPC** (smoke-proven). These feed the `overBroad` threshold + the S0.3 harness RPC call + S0.2 oracle SELECTs.

**Substrate state:** Search is LIVE on PROD and healthy. Concepts ARE indexed (`update_lesson_search_vector` trigger). Public engine = `search_lessons` RPC. Gaps confirmed firsthand: G1 (everyday words), G2 (multi-word explosion), G3 (SEL/CC/AI not typed-searchable), G5 (no eval set). No search change has shipped yet.

## Recent decisions worth carrying forward

- **S0.2 gold FROZEN (2026-06-18) — verified 3 ways before freezing.** Deep 8-agent live re-derivation + critic + supervisor spot-check (all PASS) AND an independent Codex cross-check (raw-row snapshot). q12 = 5 activity-based primaries (user/product-owner pick); q27 ghost row kept (user); q34 acceptable emptied (Codex catch — spec line 179). The gold is now the trustworthy gate; **do not edit `queries.json` gold values without re-running the verification + re-confirming with the product owner.**
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

### Session 2 — 2026-06-18 — S0.2 gold FROZEN + triple-verified; S0.3 unblocked

Commit on `feat/search-eval-s0`: `97ed020` (freeze + deep-verify S0.2 gold) + this status-doc commit.

Major events:
- **Deep verification of `queries.json`** (the owed re-check, blocking item #1): `Workflow` fan-out `wf_5521dc30-78d` = 8 fresh-context agents re-deriving every oracle live on TEST (one per gold family) + adversarial completeness critic; then supervisor 4-query MCP spot-check. **All PASS, zero failures.**
- **q12 supervisor pick** (blocking item #2, collaborative): user/product-owner-confirmed 5 activity-based PRIMARY clusters; q27 ghost row kept; q03 indentation tidied. Frozen via a precise text-splice (preserved all other entry formatting).
- **Independent Codex pass** (user recommendation): chose the **raw-row-snapshot** approach over psql (Codex companion runs read-only/no-network sandbox; for gold verification the data-fetch layer isn't the risk — the reasoning layer is). Built `.tmp/codex-goldset-review/pools.json` via a Sonnet snapshot-builder, ran `codex-companion.mjs task --effort high`. Codex caught **1 real finding** (q34 acceptable tier — fixed) + **1 false alarm** (q23 guard-ceiling — rejected with rebuttal).
- **S0.3 credential prereq resolved:** `.env` TEST keys were stale (ref `epedjebjemztzdyhqace`); fetched live TEST anon key via MCP, refreshed `.env` (`TEST_SUPABASE_ANON_KEY` + new `TEST_SUPABASE_URL`, gitignored), smoke-tested anon→`search_lessons` RPC (compost=178). Updated memory [[project_test_key_stale]].

Learnings (promote to feedback memories at PR-cycle archival):
- **Cross-family verification earns its keep:** the Codex pass found a real spec-vs-data divergence (q34) that ALL 8 same-family Claude verifiers had collectively normalized away (they treated q05≡q34 full-identity as correct). Different-model-family review catches *shared* misreadings that fan-out redundancy cannot.
- **Codex DB-access reality:** the companion's review/task path is read-only sandbox with **network disabled by default**, so live psql/DB queries from Codex aren't turnkey. For data-verification tasks, feed Codex a supervisor-built **raw-row snapshot** (exact oracle SQL + raw rows) and let it re-derive — independent at the reasoning layer, which is where the risk is. psql-for-Codex deferred to S2/S3 migration reviews if ever needed.
- **Harness can't use MCP:** the standalone `tsx` harness needs a real anon Supabase client; MCP is supervisor-only. The live TEST anon key is fetchable via MCP `get_publishable_keys`.

NEXT: S0.3 harness (`run-search-eval.ts`) → S0.4 TEST baseline + commit → close S0.

### Session 1 — 2026-06-17/18 — S0.1 + S0.1-extend shipped; S0.2 gold built (dual-reviewed)

Commits on `feat/search-eval-s0` (cut fresh from `main`, 3 scaffold docs cherry-picked over): `93bcaa0`+`9afbe5e` (S0.1 metric base), `634b754` (S0.1-extend cluster-aware metrics), `ce148cf` (scoring-model upgrade docs), `f203c96` (gold provenance spec + S0.1-extend checkpoint), `8316f96` (queries.json), + status-doc commits.

Major events:
- **S0.1** ranking-metric module (TDD) + **S0.1-extend** to the upgraded scoring model — both executor→adversarial-verifier workflows, both supervisor-re-verified (69 vitest green).
- **S0.2 dual adversarial review** of the query set + gold: Claude 4-lens fan-out (`wf_8a2690f3-c67`) + independent **Codex** read-only (`bjwa14g6e`). Codex couldn't reach TEST (both `.env` keys stale, no psql conn string, CLI on PROD) → reviewed a supervisor-built data snapshot (`.tmp/codex-goldset-review/`). psql WAS installed (`/opt/homebrew/opt/libpq/bin/psql` 18.4) but unusable without a TEST conn string.
- Reviews converged: simple metric design would give false readings in ≥4 ways → **user-approved scoring-model upgrade** (see Recent decisions). Folded into design §4 + impl + a committed `scripts/search-eval/gold-provenance.md` build spec.
- **queries.json built** (35 entries) by a fresh-context executor live against TEST (`wf_b779e095-7bd`), LIGHT-verified PASS.

Learnings (promote to feedback memories at next PR-cycle archival):
- **Codex DB access pattern:** Codex (`codex exec --sandbox read-only -o <file>`) is a strong independent reviewer but has NO live TEST access here; feed it a supervisor-built snapshot. Both `.env` TEST keys (anon+service) are stale/deleted-project — REST 401s; the live TEST project is MCP-only.
- **Workflow gotcha:** huge prompt template literals can trip the JS parser ("Unexpected token … TS syntax"); keep agent prompts SHORT and point them at on-disk spec files (`gold-provenance.md`) instead of embedding everything.
- **Concept tags ARE indexed** → using concept-tag membership as binary gold is a soft-circularity; resolved by human-adjudicated two-tier gold + concept tag as candidate-generator only.

NEXT: deeper queries.json verify (owed) + q12 pick → S0.3 harness → S0.4 baseline.

### Session 0 — 2026-06-17 — scaffolding

Major events:
- Investigation (all-sides: 5-lens workflow + adversarial verify + independent Codex) established the corrected search architecture + gaps; user chose the "Medium" package; PR D retired.
- Design judge-panel (5 plans + critique + synthesis) + independent Codex plan produced the locked sequence/decisions (Q1–Q5).
- Scaffolded the four-file plan (design Locked + this status + impl + kickoff).
- NEXT: GATE 1 Codex review of the design doc → then build S0 (eval harness), with the gold set built collaboratively with the user.
