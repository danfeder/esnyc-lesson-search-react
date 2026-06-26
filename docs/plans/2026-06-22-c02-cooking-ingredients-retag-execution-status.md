# C02 — Cooking Skills & Main Ingredients Re-tag — Execution Status

**Last updated:** 2026-06-26 by Session 19 — **P3 carry-forward hardening (Task 4) DONE; STOPPED before the user-gated full LLM run.** Did the deferred PR-cycle archival first (moved the P2′ narrative + Sessions 6–17 logs → the archive file; learnings audited = all map to existing feedback memories, nothing new to promote this cycle). Then landed all three Task-4 hardening items + a Codex-driven strengthening, each supervisor-verified (re-read the diff + re-ran `npm run check` + full `npm run test:run`): **(4a `6c7751ad`)** `processC02Decision` now reconciles per-field on a stray-extra-key `.strict()` parse failure (was a spurious "failed"/re-run); **(4b `80501c7`)** explicit `assertNotC02RepairRun` refuses `--repair` on a C02 anchored run (was a silent hash-mismatch stale-skip); **(4c `c73a2d5`)** a corpus↔run freshness guard in `score-answer-key`'s C02 mode (faithful bodyHash check reusing the exact run pipeline — no false-positive on a matching pair), then **strengthened (`0ab71f9`)** from a 10-id spot-check to a FULL scan after a consolidated **GATE-3-style Codex (gpt-5.5) adversarial pass** over the Task-4 diff found a real gap (4a/4b had no findings). Full suite **1867** green, `npm run check` clean, scripts-only (no DB), git-revert reversible, **NOT pushed**. **NEXT this session/next: the full LLM run is USER-GATED — do not run without explicit go-ahead** (spends ~$38 Max credits + gates a user spot-check of the diff + prevalence report).

## Current State

> ✅ **P2′ MERGED (PR #543 → `3ce37a4` on `main`); P3 (apply) IN PROGRESS on `feat/c02-apply` — scripts-side tooling + carry-forward hardening ALL BUILT, STOPPED before the full LLM run (user-gated).** P3 is scoped ONLY to `cooking_skills` + `main_ingredients` (columns + their JSONB keys), NONE of the other 15 metadata fields (= D-P10; verify via GATE 2 Codex + TEST-DB diff). **Authoritative spec = design §3·PIVOT (D-P1..D-P12) + §8 "Greenlight criterion (re-framed)."**

**Phase: P3 — all scripts-side prep DONE, NOT YET RUN.** Branch `feat/c02-apply` off `main` (`3ce37a4`); **9 code commits ahead + this status commit, NOT pushed** (P3's PR opens after the run + migration). Full suite **1867** green, `npm run check` clean, scripts-only (no DB), git-revert reversible. **Key sequencing fact (code-explorer-verified Session 18): the full LLM run needs NO pre-run code change** — `finalC02`/`llmDecisions`/`flooredFields` already persist + the D-P10b concurrency-guard source arrays come from the corpus via `StagingRow.currentFields`. The diff + prevalence tooling consume the **per-field ship output** (`materializeC02Ship` in `ship-policy.ts`: floor-only ingredients + floor-retention cooking, D-P11), NOT raw `finalC02`; `C02_APPLY_FIELDS` lives in `ship-policy.ts` (single source of truth — P3.2 imports, does NOT redefine).

**Built so far on `feat/c02-apply` (each supervisor-verified):**
- **P3.1-diff (`3880313`)** — threaded `materializeC02Ship` into `generate-diff-report.ts` (a C02 run diffs ONLY the 2 C02 fields); narrowed the P2′.3 fail-closed throw to an opt-in `{c02ShipThreading}` (diff opts IN; apply stays REFUSED until P3.2 threads staging); added the ship-policy provenance bucket (floored/ship-changed spot-check sample — replaces `normalizationCount`).
- **P3.2-D-P10a (`212f9ca` + supervisor hardening `17d67e8`)** — scoped the `prepare-apply.ts` emitter to C02-only (the 🔴 all-fields-stomp fix): both write sites driven by `C02_APPLY_FIELDS`; removed grade/academicConcepts writes; optimistic concurrency guard (D-P10b, order-insensitive set-equality from `currentFields` → a reviewer-edited row is SKIPPED not stomped) + `c02_retag_skipped` capture; rollback table renamed `c02_retag_rollback`. **Supervisor catch (`17d67e8`):** `buildApplyMigrationSql` FAILS CLOSED if a C02 run carries any non-C02 changing row (would route to the legacy all-fields UPDATE).
- **P3.1-prevalence (`c49a026`)** — `prevalence-report.ts`: per canonical value (all 93, incl. zero-firers), the SHIPPED firing rate across all compared lessons + the CURRENT-corpus rate + signed delta (the "Tasting on 78%" scale check). Tool built+tested; the real report is generated AT run-time.
- **Task 4 carry-forward hardening (Session 19, `6c7751ad`/`80501c7`/`c73a2d5`/`0ab71f9`)** — the 3 pre-run hardening items + a Codex strengthening (see the Last-updated line + the Session-19 log). All scripts-only, TDD, supervisor-verified + Codex-cross-examined.

**NEXT (next session / when the user greenlights the run):**
1. **The full LLM run — 🛑 USER-GATED (~$38 Max credits + gates a user spot-check).** Frozen harness over all ~700 live lessons via the proxy (runbook below) → materialize the per-field ship output → generate the diff report + the prevalence report → **USER spot-checks the diff (floored/ship-changed sample) + reviews the prevalence report (calibration tripwire: cooking precision ≈ 0.833; if materially worse, STOP)** → freeze the manifest.
2. **THEN P3.2 migration authoring** — run the C02-scoped `prepare-apply.ts` over the staging JSONL → adapt into `supabase/migrations/<YYYYMMDDHHMMSS>_c02_retag_apply.sql` (snapshot-before-update, C02-only dual-write column+JSONB, concurrency guard, NO CHECK, sibling `.sql.rollback` restoring ONLY the 2 fields [D-P10c], post-update column↔JSONB lockstep assertion [D-P10d]) → **GATE 2 Codex** → invoke the `database-migrations` skill. The emitter already drafts the C02-scoped shape + a commented rollback recipe; (c)/(d) get authored into the real file here.
3. **THEN P3.3 TEST→PROD** + MCP-verify both (CI verify flakes, `reference_ci_flakes`).
4. **THEN P4a (frontend enforcement) → P4b (CHECK migration)** — expand/contract, separate PRs (§4 Q9).

**Proxy runbook (for the run):** CLIProxyAPI v7.2.33 Anthropic base URL = `http://127.0.0.1:8317` (old `…/api/provider/anthropic` is 404); start `~/.local/bin/cli-proxy-api -config ~/.cli-proxy-api/config.yaml &` → verify `lsof -nP -iTCP:8317 -sTCP:LISTEN` → `run-retag.ts --model claude-opus-4-8 --base-url http://127.0.0.1:8317 --concurrency 1`; ~$0.055/lesson (~$38 for ~700); confirm `cache_read>0` on call ≥2; `claude-opus-4-7` fallback.

**Live census (CORRECTED Session 6):** PROD `retired_at IS NULL` = **764 live rows**; **122 distinct cooking_skills** / **230 distinct main_ingredients**. Vocab target = **93 canonical** (23 cooking_skills + 70 main_ingredients: 24 groups + 46 specifics; B-lite pantry). Full forensics + the byte-source manifest are in the design doc §1/§5 + `q1-vocab-census.md`.

> _P2′-era working detail (the decisions/tuning-round/method narrative + Sessions 6–17 logs) is now in the **archive** (`…execution-status-archive.md`, PR cycle 2) — read on demand via `grep -n`. The locked method lives in design §3·PIVOT; the greenlight criterion in design §8._

## Done

- **P1 (Sessions 0–5) — MERGED** PR #542 → `a5ff8a9` on `main`. Scaffold + GATE 1A → §4 design lock (11 Q's) + GATE 1B → P1.1–P1.6 harness build (vocab manifest + alias-floor maps · both fields wired · R7/R8/R9 normalize rules · 3-layer set-cover sampler · 4-gate scoring + rules baseline). Full per-task detail + Sessions 0–5 → archive (PR cycle 1).
- **P2 pilot (Session 8) — RAN → FAILED** (both Opus models over-tagged via a blind re-read; all 4 gates). Triggered the method pivot (design §3·PIVOT). Artifacts retained as provenance.
- **P2′ (Sessions 6–17) — MERGED** PR #543 → `3ce37a4` on `main`. Scripts-only pivot rebuild: one canonical floor + anchored 2-field verify-and-diff tool/prompt + `reconcile.ts` + per-value gates + held-out sampler + **D-P11 per-field ship policy** (floor-only ingredients / floor-retention cooking) + **P2′.7 fresh-25 cooking canary GREENLIT** (shipped cooking P 0.819 / R 0.800 / F1 0.810). GATE 3/4 + 4 external bot rounds folded. Full per-session detail + the P2′ narrative → archive (PR cycle 2).
- **P3 scripts-side tooling (Session 18) + carry-forward hardening (Session 19)** — see the Current State "Built so far" list. No DB, not pushed.

## In flight

(**P3 apply — on `feat/c02-apply`.** All scripts-side tooling + Task-4 hardening built + supervisor-verified; **the full LLM run is the next step and is USER-GATED** (~$38 + a user spot-check). No PR open yet — P3's PR opens after the run + the migration. No DB touched.)

## Blocked

(none — the user-approval gates for the full LLM run, the pilot greenlight, and PROD migrations are EXPECTED, not blockers)

## Recent decisions worth carrying forward

- **✅ P2′.7 PILOT GREENLIT (Session 16, user "greenlight and build, only cooking + ingredients metadata, none other").** Fresh-25 cooking canary = SHIPPED cooking **P 0.819 / R 0.800 / F1 0.810** (≈ pilot 0.833; floor-retention +0.207 over floor-only). Codex cross-exam = MIXED (legitimate, calibration-not-blind). The binding precision-at-scale guard is **§8 ②** (P3.1 all-700 prevalence review + floored-row spot-check + the ~0.833 calibration tripwire).
- **D-P11 (per-field ship method, LOCKED Session 14):** `main_ingredients` = deterministic floor ONLY; `cooking_skills` = LLM + floor-retention (floor ∪ `finalC02.cooking`, KEEP/ADD allowed, never DROP a floored skill). Built as `materializeC02Ship` (`ship-policy.ts`); re-score gate reproduces 0.807/0.836/**0.872** with zero drift.
- **D-P12 (Session 15):** the fresh-25 canary is **cooking-scoped** (ingredients are floor-only deterministic → covered by the all-700 prevalence review).
- **Re-framed §8 greenlight (Sessions 13–15):** the binary "4 gates pass" is RETIRED as the ship test (gate ③ is structurally unreachable on ingredient specifics — the residual over-tags are incidental existing-tag specifics no mechanical method prunes); the 4 gates stay on as a DIAGNOSTIC. Ship = two USER-gated checkpoints on the SHIPPED per-field output (① pilot greenlight P2′.7 / ② pre-apply gate P3.1).
- **D-P10 (apply safety):** C02-only write scope (`C02_APPLY_FIELDS`) + optimistic concurrency guard + C02-targeted rollback + column↔JSONB lockstep. The current all-fields apply would STOMP the completed metadata rebuild — this is the highest-risk fix in P3.
- **Enforcement = expand/contract** (P3 data → P4a frontend deploy → P4b CHECK), mirroring `garden_skills`; never bundle P4a + P4b (§4 Q9).
- **Method = anchored verify-and-diff** (design §3·PIVOT): LLM sees the provenance-annotated current tags + proposes KEEP/DROP/ADD; one canonical floor + `reconcile.ts` (never append-only) merge into `finalC02`. The old "hybrid-floor full LLM re-read" was, as built, a blind re-read — DEAD.

## Decisions made during execution

**Session 1 (2026-06-23) — §4 locks.** User verdicts (AskUserQuestion, all on the recommended option): pantry **B-lite**; pilot size **70**; invariant mechanism **B** (R-rule + superRefine, no DB trigger); freeze-candidates **pre-add the 4 high-count** (Apples/Coconut/Oranges/Lime). Evidence-locked: Q2 flat string[]; Q3 normalize R-rules; Q5 gates ③④ are plumbing over existing `evalMetrics` (supervisor-verified); Q8 Title-Case value===label; Q11 → Opus-4.8-only (`project_c02_p2_opus_only`). Full rationale in design §4 + the archive (PR cycle 1, Session 1).

## Out-of-scope follow-ups captured here

(for the project memory after the initiative ships — seed list from design §10)
- Embeddings regeneration (rebuild's C2.4) — own session; relates to `project_embedding_pipeline_mismatch`.
- Filter-UI surfacing of the two ingredient tiers (group vs. specific in the public menu).
- A hard "1–3 specifics" cap (deliberately left as guidance).
- A DB trigger for the specific→group invariant (leaning app-layer only).
- Drop the retained C02 snapshot table(s) in a future cleanup once PROD-stable.
- **(Optional, low-priority) Collapse the now-redundant case-twin alias keys** in `c02-alias-map.json` — harmless under case-insensitive matching, left in place to minimize churn.
- **(Minor, DEFERRED — Session 12 Codex) `preflight-token-mass` has no `--model` flag** → it always uses `DEFAULT_MODEL` (opus-4-7). Immaterial for the C02 pilot (opus-4-7/4-8 share tokenizer + cache floor); a 1-line add before any non-opus / cross-family preflight.
- **(Initiative-close retrospective) Promote two niche learnings to memory:** the `existsSync`-skip CI gotcha (a committed test reading gitignored data dumps ENOENTs in CI on first push); "label a fresh-eval gold to the SAME standard the model was tuned to, or precision is confounded." Both are preserved verbatim in the archive (PR cycle 2, Sessions 16/17).

## Pointers to durable context

- Kickoff prompt: `2026-06-22-c02-cooking-ingredients-retag-kickoff.md`
- Design doc: `2026-06-22-c02-cooking-ingredients-retag-design.md` (§3·PIVOT D-P1..D-P12 + §8 greenlight = AUTHORITATIVE)
- Implementation plan: `2026-06-22-c02-cooking-ingredients-retag-implementation.md` (P1.1–P4b.1 tasks)
- Worksheet (decided vocab): `2026-06-12-metadata-rebuild-stage1-cooking-skills-ingredients-worksheet-decided.md`
- **Provisional canonical manifest (Session 1):** `docs/plans/c02-session1-discovery/q1-vocab-census.md` (the byte-source for `c02-vocab.json`)
- Harness: `scripts/stage2-retag/`
- Archive: `2026-06-22-c02-cooking-ingredients-retag-execution-status-archive.md` — **PR cycle 1 (P1, Sessions 0–5)** + **PR cycle 2 (P2′, Sessions 6–17 + the P2′ narrative)** — read on demand via `grep -n`.

## Recent session log

> **PR cycle 1 (P1, Sessions 0–5)** and **PR cycle 2 (P2′, Sessions 6–17)** are fully ARCHIVED (`…execution-status-archive.md`) — full per-session detail + learnings there. Only the current PR cycle (P3, Sessions 18+) stays here.

### Session 19 — 2026-06-26 — PR-cycle archival + P3 carry-forward hardening (Task 4)

Major events:
- Oriented (git HEAD `25bc9bf` = Session-18 checkpoint, consistent; branch `feat/c02-apply`, 5 commits ahead, not pushed; `npm run check` clean; full suite **1857**). Read the design doc end-to-end + the impl P3 tasks + the full status doc. User confirmed orientation → "yes" (Task 4 + archival this session, stop before the run).
- **PR-cycle archival (the Session-18 deferral):** moved the P2′-era Current-State narrative + Sessions 6–17 session logs → the archive (PR cycle 2). Audited every session's "candidates to promote" — all map to existing feedback memories; the two genuinely-new niche learnings (the `existsSync`-skip CI gotcha; eval-gold-standard calibration) deferred to the P4 initiative-close retrospective (preserved in the archive). **Nothing new to promote this cycle.**
- **Task 4 — carry-forward hardening (3 items, sequential fresh-context executors, each supervisor-verified in the main loop):**
  - **4a (`6c7751ad`)** — `processC02Decision` reconciles per-field on a stray-extra-key `.strict()` whole-object parse failure (both fields individually valid → was a spurious "failed"/`--resume` re-run; ship output was already correct via `reconstructCookingFinal`). +1 test (1858).
  - **4b (`80501c7`)** — new pure `assertNotC02RepairRun` at the top of `runRepairPass` refuses `--repair` on a C02 anchored run (marker = any record with `finalC02`/`llmDecisions`, C02-exclusive), instead of the silent hash-mismatch stale-skip; recovery is `--resume`. +4 tests (1862).
  - **4c (`c73a2d5`)** — corpus↔run freshness guard in `score-answer-key` C02 mode: recomputes the effective-input `bodyHash` from the corpus row via the EXACT run pipeline (`appendDocSurfaces`→`buildC02EffectiveInput`→`computeBodyHash`, all already-exported — no false-positive on a matching pair) + id-coverage + hashless-downgrade fallbacks. +4 tests (1866).
- **Consolidated GATE-3-style Codex (gpt-5.5) adversarial pass** over the whole Task-4 diff (inline contract honored): 4a/4b = no substantive findings (independently confirmed my analysis — missing-field keys fail the per-field schema so the clean-pass case is only the stray-key one; the 4b markers are C02-exclusive + a markerless wholesale-fail still stale-skips safely). 4c = one MED, ACCEPTED: the guard sampled only the first 10 sorted ids → a stale row at position 11+ could pass, yet the rules baseline + labels read ALL ~700 rows.
  - **Strengthened (`0ab71f9`, TDD red→green):** the freshness guard now FULL-scans every run record carrying a bodyHash (re-hashing ~700 rows is milliseconds), not a 10-id sample. Added a position-12-stale test that proved the gap. Full suite **1867**.
- **STOPPED before the full LLM run** (user-gated $ + spot-check) + before any migration. Session-end: archival + rewrote the Current State header to Session 19 + this log + committed the status doc. **No DB, no push, no PR.**

Dispatch pattern: 3 sequential fresh-context executors (one hardening item each — sequential because 4a/4b share `run-retag.ts`), each supervisor-verified in the main loop (re-ran `npm run check` + full `npm run test:run` + read the actual diff + analyzed the false-positive/masking risk myself) before accepting. 1 consolidated Codex cross-exam over the combined diff (inline, `--model gpt-5.5`). 1 supervisor-implemented strengthening directly (TDD — small, well-understood, full context already loaded). PR-cycle archival via Bash block-move (sed extract → append to archive) + a full lean rewrite of the status doc.

Learnings (candidates to promote — audit at initiative close):
- **A consolidated adversarial pass over a batch of small "hardening" diffs still earns its keep** — 2 of 3 items were clean, but the 3rd's spot-check-vs-full-scan gap was a real correctness miss on a guard whose whole job is to PROVE a match. Reinforces `feedback_codex_over_crossexamine`: cross-examine even small, well-verified hardening when it gates an expensive irreversible step.
- **A freshness/equality guard that can false-positive is worse than no guard** (it blocks legitimate work), so faithfulness (reuse the exact pipeline, never reimplement) AND completeness (full scan, not a sample) both matter — a sample is fine for a likelihood check but not for a "prove the snapshot" guard.

### Session 18 — 2026-06-26 — Merged P2′ #543; built P3 scripts-side tooling (diff + apply emitter + prevalence)

Major events:
- Oriented (git HEAD `f8573bf` = Session-17 ready-for-merge; `npm run check` clean; PR #543 all CI green except `claude-review` re-running on the docs commit). **User said "merge."** Confirmed `claude-review` passed (round 5 clean, on a docs-only commit) + PR MERGEABLE/CLEAN → **squash-merged #543 → `3ce37a4` on `main`**, deleted the branch. **Branched `feat/c02-apply` off `main`** for P3.
- **Code-explorer mapped the P3 apply/diff/run pipeline** (returned conclusions, kept supervisor context light). KEY finding: **the full LLM run needs NO pre-run code change** — the run already persists `finalC02`/`llmDecisions`/`flooredFields`, and the D-P10b concurrency-guard source arrays come from the corpus via `StagingRow.currentFields`. All scripts-side work is in the diff/apply tooling that CONSUMES the run output.
- **P3.1-diff (`3880313`)** — executor threaded `materializeC02Ship` into `generate-diff-report.ts`; supervisor-verified (re-ran check + suite 1827, read the full diff). Narrowed the fail-closed throw to an opt-in flag (diff opts in, apply stays refused); provenance bucket; `C02_APPLY_FIELDS` → `ship-policy.ts`.
- **P3.2-D-P10a (`212f9ca`)** — executor scoped the `prepare-apply.ts` emitter to C02-only + concurrency guard + skipped capture + rollback rename + `flooredC02Fields`. **Supervisor verification CAUGHT a real data-safety hole:** the emitter routes per-row, so a stray non-C02 changing row in a C02 run would silently emit a legacy all-fields UPDATE (stomp the other 15 fields) — the old fail-closed throw guarded exactly this, and narrowing it to opt-in removed the guard. Fixed TDD-first as a homogeneity guard in `buildApplyMigrationSql` (`17d67e8`). Suite 1846.
- **P3.1-prevalence (`c49a026`)** — executor built `prevalence-report.ts` (per-value shipped firing rate across all lessons via the shared ship path + current rate + delta, sorted desc — the "Tasting on 78%" scale check); supervisor-verified (check + suite 1857, inspected the tally). TOOL built+tested; real report generated at run-time.
- **STOPPED dispatching** (context budget) before the full LLM run (user-gated $ + spot-check) + before any migration. Session-end: rewrote the Current State header to P3, this log entry, committed the status doc. **No DB, no push, no PR.**

Dispatch pattern: 1 code-explorer (read-only map) + 3 sequential executors (one impl-plan task each), each supervisor-verified in the main loop (re-ran `npm run check` + full `npm run test:run` + read the actual diff) before accepting. 1 supervisor-authored data-safety fix-up (TDD). Sequential not parallel — the diff/apply tooling shares `selectComparedLessons` + the ship-materialization path, so worktree parallelism would have conflicted.

Learnings (candidates to promote):
- **Supervisor main-loop verification caught a real stomp-risk an executor (and its own Codex) missed.** A refactor that narrows a fail-closed guard to an opt-in must re-assert the invariant the guard used to enforce, at the new chokepoint. Reinforces `feedback_workflow_orchestration` (main-loop-verify is load-bearing).
- **"Effectively dead" ≠ "provably unreachable" for a data-mutation path.** When the cost of the hazard is silent PROD data loss, convert by-construction safety into an explicit fail-closed assertion — cheap insurance that passes the "absence = DB risk" bar.
