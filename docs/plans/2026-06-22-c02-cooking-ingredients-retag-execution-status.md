# C02 — Cooking Skills & Main Ingredients Re-tag — Execution Status

**Last updated:** 2026-06-23 by Session 5 (**P1 PR being opened** — pre-push review folded, fix-ups committed, pushing `feat/c02-harness` → main)

## Current State

**Phase:** P1 COMPLETE (P1.1–P1.6, all supervisor-verified). **Session 5 = opening the P1 PR + carrying it to merge-ready.** Full suite **75/1580 green**, `npm run check` clean. Per-task P1 as-built detail + Sessions 0–4 log are now in the **archive** (`…execution-status-archive.md`) — read on demand, not at session start.

**P1 pre-push review — DONE (Session 5).** Ran a superpowers code-reviewer + GATE 3 Codex (`codex:codex-rescue`, inline) in parallel on `git diff main...HEAD`. Both: **no HIGH/MED**. Triaged + folded 3 LOW + 1 Codex MED into two fix-up commits (`9a311a8` comment sweep + `b923b71` review fix-ups):
- **gate ④ case-fold** (`c02-gates.ts`) — never-stored literal scan was exact-case; now `matchKey`-normalized so `salt`/` Oil ` can't slip the greenlight gate. +1 TDD test.
- **under-coverage fail-hard** (`sample-answer-key.ts --c02`) — the ≥2× HARD guarantee only WARNed + exited 0; now fails closed (exit 1). No-op on the real corpus (0 warnings).
- **faithful normalize-rule fixture** (`validate-output.test.ts`) — was a closed loop on fake camelCase rule names; switched to the real kebab keys.
- **P1-close stale field-count comment sweep** (→ 14/15/13) across schema/vocab/run-retag/export-corpus/index/sample-answer-key. Intentional pre-C02 "13-field" scorer refs + prepare-apply (deferred to P3) left alone.
- **DEFERRED (Codex LOW, harmless):** same-target alias-map case-twin keys — collision guard only throws on *different*-target; idempotency holds. Still in the out-of-scope list.

**P1 PR = #542** (https://github.com/danfeder/esnyc-lesson-search-react/pull/542). **Bot triage round 1 DONE:** all CI green (Security Audit / claude-review / semgrep / CodeQL / E2E / Test&Build). `claude[bot]` left 8 findings → **1 real fix** (#6 dead `byId` map removed) + all others rebutted/deferred, **GATE-4 Codex-validated** ("no cases where you are wrongly dismissing a real bug"):
- **#1 (HIGH `--resume` re-bill) REJECTED** — bot misquoted; real condition is `record.strict === current.strict` (not `=== false`); conservative cross-identity re-process is intentional + doesn't bite a same-version P3 resume; pre-existing code.
- **#2 (MED alias-floor provenance overcount) DECLINED** — dedup is part of the floor's documented contract; output always correct; `uniqueItems:true` makes dup-canonical input invalid-by-contract; no decision impact.
- **#3/#4/#5 DEFERRED** — pre-existing harness code (git blame = 2026-06-12), not C02-introduced; harness-debt, revisit in P3 (esp. #3 diff-report casing double-count).
- **#7/#8 DECLINED** — INFO; gate-4 still correctly fails on a never-stored literal; 70-row double-parse is negligible.

**Bot triage round 2 DONE** (`7258a93`). The bot does a FRESH FULL review each round (not a delta), so round 2 surfaced **6 deeper findings** — all C02-new, **none a correctness/DB/wrong-greenlight bug**. Fixed 3 (#1 `normalizeRecordInput` PURE-docstring accuracy; #2 gate-③ documented-choice comment; #6 `--c02` corpus pre-flight guard → actionable error instead of cryptic ENOENT). Deferred #3/#4/#5 (redundant file reads / partition recompute — negligible at 70 rows) + the **#2 gate-③ tuning** to P2 (carry-forwards f/g).

**Round 3 (fresh review) passed all checks.** Then a **Codex merge-readiness review** (user-requested) surfaced **3 real *vacuous-pass* holes** in the gate/sampler logic — same class as the gate-②/gate-④ bugs already fixed. User chose **harden all 3 before merge** (`96c0ab1`, TDD red→green): gate ③ now FAILS on zero added-specifics predicted (was vacuous null→pass); gate ① now FAILS on an empty clean-core (was 0-vs-0 pass); a new `assertCorpusHasC02Tags` guard aborts loudly on a stale corpus missing both fields (was silent empty-tags), wired into both the sampler `runC02` and scorer `runC02Mode`. **GATE-4 Codex re-verified all 3 CORRECT + no false-fails/false-throws → MERGE-READY: yes, no blockers.** Suite 75/1580, check clean.

**Bot triage round 4 DONE** (`779eeb7`). The round-4 fresh review caught a **real 🔴 bug** + 2 🟡 (critical-only review per the round-cap earned its keep): **🔴 `FinalLabelRecord`/`blank()` (`sample-answer-key.ts`) omitted the 2 C02 fields** — since P1.2 added them to `MAIN_PASS_FIELDS` the worksheet RENDERS them, but the `--parse` path's `field in current` branch SILENTLY DISCARDED the human-adjudicated gold tags (the P2 gold key would carry zero C02 data). Fixed (interface + blank + round-trip test). **🟡 gate ④** mirrored gate ③ (null Sweeteners now fails closed). **🟡 gate ①** got a `cleanCoreHasGold` guard (all-untagged clean-core now fails, not just zero-rows). **🔵 declined a 3rd time** (alias-floor dedup provenance — the suggested fix would make a pure-dedup output change silent; Codex agreed + sharpened: it misses tail-dup `['a','a','b']→['a','b']`). +3 TDD tests (red→green stash-verified). **GATE-4 Codex re-verified all 3 CORRECT + no false-fails → MERGE-READY: yes.** Suite **75/1583**, check clean.

**⚠️ Codex model fix (user, 2026-06-23):** leaving `codex-rescue`'s model unset routes non-deterministically (rollouts showed 5.5/5.4/4.1 mixed; one GATE-4 landed on 5.4). NOW pin **`--model gpt-5.5`** on every Codex call (see `feedback_codex_model_pin`). Round-4 GATE-4 re-confirmed on **gpt-5.5** (rollout-verified `"model":"gpt-5.5"`) — all 3 fixes CORRECT, MERGE-READY: yes.

**Remaining:** the `779eeb7` push triggers a round-5 fresh review → **critical-only** per round-cap → CI green → **USER merges P1** (merge is user-gated) → P2. **No DB in P1 → no TEST/PROD verify.**

**P2 (after P1 merges) — key carry-forwards:**
- (a) **P2.1 MUST regenerate `artifacts/corpus.jsonl`** — the on-disk one (765 lines, pre-2026-06-12) LACKS `cooking_skills`/`main_ingredients`; the C02 sampler + rules-baseline read current tags from corpus record fields. The `CorpusRecordForSampling` type carries the two fields.
- (b) P2.2 gold key is USER-GATED (AI-drafts → user-adjudicates + the Q6 independent judgment-row 2nd pass).
- (c) P2.3 bake-off = `--model claude-opus-4-8` vs `claude-sonnet-4-6` over the 70-key (run `preflight-token-mass` first; needs Console credits).
- (d) P2.4 greenlight is USER-GATED (4 gates; tie→Sonnet; Opus must earn it; `claude-opus-4-7` fallback).
- (e) the C02 sampler covers all **93** values (both fields), not just the 70 ingredient values — per-value scoring needs ≥2 support on both fields.
- (f) **Gate ③ zero-specifics — RESOLVED in P1** (`96c0ab1`, Codex merge-review + user sign-off): gate ③ now FAILS when a contestant predicts zero added specifics (requires `addedSpecificPrecision !== null`), so a model emitting only group tags can't clear ③ vacuously. Also hardened in the same commit: gate ① fails on an empty clean-core; `assertCorpusHasC02Tags` aborts on a stale corpus. No longer a P2 decision.
- (g) **P2 efficiency cleanups (round-2 bot; negligible at 70 rows, do when P2 exercises the harness at scale):** add `dropKeys: Set<string>` to `C02Floor` so `buildC02SamplerContext` stops re-reading the alias-map file (#3); memoize `loadC02Manifest` in `vocab.ts` like `loadC02Floor` (#4); pass a precomputed `judgmentRow` into `bootstrapGate2Delta` instead of recomputing `partitionKey` (#5).

**The locks (carry forward):** Q2 flat `string[]` + parent-map superRefine · Q3 alias-floor + parent-reconcile R-rules in `normalize.ts` · Q4 3-layer strata + size **70** · Q5 4 gates over the **existing** `evalMetrics` precision/fp (NOT new metric math) · Q6 independent hard-case 2nd-pass gold key · Q7 harness R-rule + Zod superRefine, **no DB trigger** · Q8 Title-Case `value===label` · Q9 P3→P4a→P4b expand/contract (never bundle) · Q10 P-branch map · Q11 Opus-4.8-vs-Sonnet-4.6 bake-off (Sonnet wins ties). **Q1 vocab = 93 canonical:** 23 cooking_skills + 70 main_ingredients (24 groups + 46 specifics, 4 null-parents: Celery/Fennel/Seaweed (nori)/Cocoa & chocolate; Melons parented under "Squash, cucumbers & melons"); **B-lite pantry** (Sugar→Sweeteners; drop Salt/Oil/Soy sauce); **freeze the manifest at end of P3**.

**Live census correction:** PROD 2026-06-23 = **121 distinct cooking_skills / 202 main_ingredients** (design §1's 122/230 was stale).

**Pre-next-PR verification (if any):** none (no DB until P3). P1 is scripts-only, git-revert reversible.

## Recent decisions worth carrying forward

- **Method = hybrid-floor full LLM re-read** (decided in the 2026-06-22 scoping discussion + a Codex cross-exam): LLM reads every lesson; deterministic alias-map floor anchors the ~94% clean core; LLM does the judgment work. NOT rules-only (can't add specifics), NOT blind full-LLM (regresses the core).
- **Prior $121 fable run produced ZERO output for these two fields** (verified) — no reusable work; fable-5 is suspended, so the pilot re-runs an Opus-vs-Sonnet bake-off.
- **Vocab amendments (user, 2026-06-22):** +Seaweed (nori), +Cocoa & chocolate (group-less specifics), +Sunflower butter/Tahini/Peanut butter (under Nuts & seeds); Hummus→Chickpeas remap; Frying→Sautéing & stir-frying. Solo sign-off (no curriculum-team round).
- **Pilot gold key = AI-drafts-user-adjudicates** + an independent hard-case protocol; greenlit on 4 separate gates, not a macro score.
- **Enforcement = expand/contract** (P3 data → P4a frontend deploy → P4b CHECK), mirroring `garden_skills`.
- **Floor matching is now case-insensitive + trim** (Session 4, user-asked, supervisor-verified safe = 0 collisions): `matchKey = NFC.trim().toLowerCase()` + a canonical-case rule + a build-time collision guard + 3 machine-checked invariants. *Strengthens* the Q3 idempotency lock ("no canonical is an alias key" → "no canonical matchKey-collides with an alias key pointing elsewhere") rather than changing scope. **Lowercase+trim only, NOT diacritic/punctuation folding** — that adds collision surface for little gain, and P4a closes both fields to dropdowns so future free-form case/accent drift becomes impossible; the floor's robustness matters mainly for the historical corpus (P3) + the P1.6 rules-baseline. This was the fix for the `Mixing` (180-lesson) alias-map gap.
- **Gate ④ never-stored scan is case-folded** (Session 5): the literal scan compares on `matchKey`, so a casing/spacing variant (`salt`, ` Oil `) can't slip a never-stored literal past the greenlight gate. The ≥2× sampler coverage is a **hard CLI failure** (exit 1), not just a warning.

## Done

- **P1 (Sessions 0–5)** — scaffold + GATE 1A → §4 design lock (11 Q's) + impl-plan P1.1–P4b.1 + GATE 1B → P1.1–P1.6 harness build (vocab manifest + alias-floor maps · both fields wired into schema/vocab/prompt · R7/R8/R9 normalize rules · export/diff/validate plumbing · 3-layer set-cover sampler · 4-gate scoring + rules baseline) → pre-push review folded + fix-ups. **All supervisor-verified; full suite 75/1576 green.** Per-task as-built + Sessions 0–4 session log → **archive file**. P1 PR opened Session 5.

## In flight

(P1 PR #542 — round-4 caught + fixed a 🔴 gold-key data-loss bug; gpt-5.5-confirmed MERGE-READY; round-5 review + CI pending on `779eeb7`; awaiting USER merge)

## Blocked

(none — user-approval gates for the pilot greenlight and PROD migrations are EXPECTED, not blockers)

## Decisions made during execution

**Session 1 (2026-06-23) — §4 locks.** User verdicts (AskUserQuestion, all came back on the recommended option): pantry **B-lite**; pilot size **70**; invariant mechanism **B** (R-rule + superRefine, no DB trigger); freeze-candidates **pre-add the 4 high-count** (Apples/Coconut/Oranges/Lime). Evidence-locked: Q2 flat string[]; Q3 normalize R-rules; Q5 gates ③④ are plumbing over existing `evalMetrics` (supervisor-verified — corrects the design's "new metric families" framing); Q8 Title-Case value===label; Q11 bake-off mechanism. Ratified recommendations (presented, no pushback): Q1 freeze-after-P3 + 70-value roster; Q5 thresholds (①strict ②+0.05 both-fields ③0.7/5% ④0.8, re-tunable at pilot); Q6 independent 2nd-pass; Q9 Option-A choreography; Q10 P-branch/artifact map. Full rationale in design §4.

## Out-of-scope follow-ups captured here

(for the project memory after the initiative ships — seed list from design §10)
- Embeddings regeneration (rebuild's C2.4) — own session; relates to `project_embedding_pipeline_mismatch`.
- Filter-UI surfacing of the two ingredient tiers (group vs. specific in the public menu).
- A hard "1–3 specifics" cap (deliberately left as guidance).
- A DB trigger for the specific→group invariant (leaning app-layer only).
- Drop the retained C02 snapshot table(s) in a future cleanup once PROD-stable.
- **(Optional, low-priority) Collapse the now-redundant case-twin alias keys** in `c02-alias-map.json` (e.g. `Chopping`+`chopping`, `Measuring`+`measuring`) — harmless under case-insensitive matching (the collision guard only throws on *different*-target collisions), left in place to minimize churn. Codex flagged ~20 same-target collisions (P1 GATE 3); a future tidy-up could dedupe them.

## Pointers to durable context

- Kickoff prompt: `2026-06-22-c02-cooking-ingredients-retag-kickoff.md`
- Design doc: `2026-06-22-c02-cooking-ingredients-retag-design.md` (LOCKED decisions + §4 open questions)
- Implementation plan: `2026-06-22-c02-cooking-ingredients-retag-implementation.md` (P1.1–P4b.1 tasks authored)
- Worksheet (decided vocab): `2026-06-12-metadata-rebuild-stage1-cooking-skills-ingredients-worksheet-decided.md`
- **Provisional canonical manifest (Session 1):** `docs/plans/c02-session1-discovery/q1-vocab-census.md` (census + 70-value set + parent map — the byte-source for P1.1's `c02-vocab.json`; later lock-corrected to 46 specifics / Melons parented)
- Harness: `scripts/stage2-retag/`
- Archive: `2026-06-22-c02-cooking-ingredients-retag-execution-status-archive.md` (per-task P1 as-built detail + Sessions 0–4 log — read on demand via `grep -n`)

## Recent session log

> Sessions 0–4 are in the **archive file** (full per-session detail + learnings). Only the current PR cycle's latest session stays here.

### Session 5 — 2026-06-23 — P1 PR open (pre-push review + fix-ups + PR-cycle archival)

Major events:
- Oriented: confirmed **P1 complete** (git + status agree; the kickoff "next = P1.3" RIGHT-NOW line was stale, as the kickoff itself warns). Baseline green (`npm run check` clean, 75/1575).
- Ran the **P1 pre-push review**: superpowers code-reviewer + **GATE 3 Codex** (codex-rescue, inline) in parallel on `git diff main...HEAD`. Both verdicts = ship, **no HIGH/MED**.
- Triaged 3 LOW + 1 Codex MED; folded the worthwhile ones + the P1-close stale-comment sweep into `9a311a8` (comment sweep) + `b923b71` (review fix-ups). Deferred the harmless same-target alias-collision (Codex LOW). Suite **75/1576** green, check clean.
  - gate ④ case-fold (+TDD red→green) · under-coverage fail-hard (CLI exit 1) · faithful normalize-rule fixture (kebab keys) · stale field-count comments → 14/15/13.
- **PR-cycle archival:** moved per-task P1 as-built detail + Sessions 0–4 log to the archive file; trimmed the Current State header.
- [push `-u` + `gh pr create` + four-surface bot triage — in progress this session.]

Learnings (candidates to promote):
- A holistic **seams-and-whole** pre-push review still caught 2 real issues on an already-incrementally-reviewed PR: a greenlight-gate exact-case gap (gate ④) and a near-vacuous test fixture (camelCase rule names that `normalize.ts` never emits). Per-task reviews miss boundary issues.
- **Fail-closed on the ≥2× guarantee** (Codex MED): a WARN-and-exit-0 silently undercut the locked "HARD guarantee" — the fix is a no-op on the real corpus today and a P2 safety net. Cheap fail-safe reflex worth keeping.

Next: complete the bot triage; on green, the user merges P1 → then P2 (regenerate the corpus first, then gold key + bake-off).
