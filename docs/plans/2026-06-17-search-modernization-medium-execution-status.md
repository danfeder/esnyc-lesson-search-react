# Search Modernization (Medium Package) Execution Status

**Last updated:** 2026-06-18 by Session 3 (S0.3 harness + S0.4 baseline built+verified+committed; pre-push review done; S0 ready to ship)

## Current State

**Active PR:** none open yet — **S0 (eval harness) is BUILD-COMPLETE + pre-push-reviewed** on `feat/search-eval-s0`; next action = push + open the S0 PR.

**S0 status: DONE (S0.1–S0.4), ready to ship.** The eval harness — the measurement gate every later PR depends on — is built, verified, committed.
- **S0.1** `metrics.ts` cluster-aware ranking module; **S0.3 fix** added pure `rankMovement()`. 76 vitest cases.
- **S0.2** `queries.json` 35-entry two-tier gold — FROZEN, triple-verified, product-owner-confirmed. **Do not edit gold without re-verifying + re-confirming with the product owner.**
- **S0.3** `run-search-eval.ts` (read-only tsx harness) + pure `predicate.ts` + `readonly-guard.ts` (+tests). `npm run eval:search`; `SEARCH_EVAL_TARGET=local|test|prod` (default test). Built + adversarially-verified via workflow `wf_e9c31225-5be` (verdict pass, 0 findings) then supervisor-re-verified (independent recall@10=6/7 hand-check on `decomposition`; read-only source audit; content_hash dup-decoupling confirmed via the November twin).
- **S0.4** `baseline.json` + `scorecards/test.md` captured on TEST (snapshot 2026-06-18, corpus 745); byte-reproducible; `--write-baseline` idempotent.
- **Commits:** `6f6fb7c` (harness + baseline, S0.3+S0.4) + `00e0e7d` (pre-push review fix-up).

**Pre-push review DONE (Session 3):** Claude code-reviewer + Codex GATE-3 (independent model family). 4 findings, all rebuttal-passed → 3 fixed, 1 documented:
- [Codex HIGH] G3 rank-movement dropped absent→ranked transitions (the primary S2 success case). Fixed via tested `rankMovement()` (absent = beyond-window PAGE_SIZE+1). **Without this, S2's G3 lift would have read as near-zero.**
- [Codex MED] `--write-baseline` now ignores any existing baseline → deterministic capture (verified: writing twice = byte-identical).
- [Claude] over-broad denominator now reads `_snapshot.searchableCorpus` at runtime (single source of truth), not a hardcoded 745.
- [Claude, documented] `predicate.ts` `splitTopLevel` doesn't decode the SQL `''` escape — inert today (no apostrophe predicate) + fails LOUD (errored table), so documented, not fixed.
- Committed `baseline.json`/`scorecard` byte-unchanged by the fix (movement fix is inert at S0 where baseline==current).

**Baseline tells the expected PRE-FIX story (honest gate):** G2 explosion captured (q01/q32=744/742, q02=744 — S1 must crush); G1 gaps (decay=1, rotting-food recall@10=0, typo=2, kimchi=1 — S3 targets); G3 isolation=0 (q10 isoHits@50=0 — S2 targets); strong lexical baselines + clean controls (q07=0.857, sentinel jaccard=1.0, garden 586 within max 600).

**NEXT:** push `feat/search-eval-s0` + open the S0 PR (per-PR ritual: external bots → four-surface triage → fix-ups). S0 has NO DB/`src/` change → no TEST-DB-before-merge gate; E2E should pass unchanged. After S0 merges → **S1** (G2 frontend `parseSearchQuery` — flip the `resolveCall` seam, see `run-search-eval.ts` `// S1.4`). The status-doc edit + the kickoff/scaffold are bundled into the S0 PR push (no docs-only CI burn).

**Branch:** `feat/search-eval-s0` (fresh from `main`; 3 scaffold-docs commits + kickoff sync cherry-picked over; legacy `feat/pr6d-search-synonyms` abandoned). S0's PR carries the C2-closeout parent-track doc edit to main (harmless/accurate bookkeeping). `TEST_SUPABASE_*` anon creds wired in gitignored `.env`; `TEST_SUPABASE_SERVICE_KEY` still stale — MCP for any TEST write/admin (see [[project_test_key_stale]]).

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

### Session 3 — 2026-06-18 — S0.3 harness + S0.4 baseline built+verified+committed; S0 pre-push-reviewed

Commits on `feat/search-eval-s0`: `6f6fb7c` (harness + TEST baseline, S0.3+S0.4) + `00e0e7d` (pre-push review fix-up) + this status-doc commit.

Major events:
- **S0.3 harness built via `Workflow` `wf_e9c31225-5be`** (executor → adversarial-verifier). Executor wrote `run-search-eval.ts` + pure `predicate.ts` + `readonly-guard.ts` (+tests) per an on-disk build brief (`.tmp/s03-executor-brief.md`); verifier verdict = pass, 0 findings (re-ran all checks, hand-checked a metric, audited read-only + predicate faithfulness + q09 special-case). Supervisor independently re-verified: re-ran 114 tests + eval (0 errored/35), hand-checked `decomposition` recall@10 = 6/7 = 0.857 against live TEST top-10, audited the read-only guarantee in source, and confirmed the dup-flood/gold cluster decoupling (the November twin has DISTINCT content_hash → dupFlood=0 correct).
- **Substrate prereqs confirmed live (TEST):** `search_lessons` 15-arg signature; `lessons.content_hash` + array cols (`main_ingredients`/`core_competencies`/`cultural_heritage`/`social_emotional_learning`) anon-readable; **anon REST works over HTTPS from a node/tsx process** (RPC + SELECT) — the harness uses a real anon client, NOT MCP; the TEST anon key is a JWT (role=anon) so the guard decodes + asserts it.
- **S0.4 baseline captured on TEST** (`--write-baseline`), byte-reproducible across re-runs; `baseline.json` + `scorecards/test.md` committed (stable per-target filename for git-diffable deltas).
- **Pre-push review (per-PR ritual step 1):** dispatched a Claude `feature-dev:code-reviewer` + Codex GATE-3 adversarial-review (`codex-companion.mjs`, independent model family) in parallel on the S0 diff. 4 findings, rebuttal-passed; 3 fixed (Codex-HIGH G3 absent→ranked movement via tested `rankMovement()`; Codex-MED deterministic `--write-baseline`; Claude corpus-size single-source), 1 documented-not-fixed (predicate `''` escape — inert + fails-loud). Committed artifacts byte-unchanged by the fix; 121 tests green.

Learnings (promote to feedback memories at PR-cycle archival):
- **Cross-family GATE-3 earns its keep again:** Codex (different family) found the HIGH-severity G3 movement bug that the same-family Claude reviewer AND the workflow's adversarial verifier both missed — the harness would have under-reported S2's core signal. Mirrors the S0.2 q34 catch: different-model-family review finds *shared blind spots* fan-out redundancy can't. Keep GATE-3 Codex on every search-PR pre-push.
- **Harness determinism is a real review axis:** a stateful `--write-baseline` (reading the prior baseline while writing the new one) silently weakens the "reproducible gate" claim. For any committed measurement artifact, test idempotency (write twice → identical) explicitly.
- **Point executors at an on-disk build brief** (`.tmp/s03-executor-brief.md`) instead of embedding the full spec in the workflow prompt — keeps workflow-script literals small (avoids the JS-parser gotcha) and gives the executor a single authoritative reference.

NEXT: push + open the S0 PR → external-bot triage → merge (user-gated) → S1.

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
