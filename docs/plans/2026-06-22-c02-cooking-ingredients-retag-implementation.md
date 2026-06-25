# C02 — Cooking Skills & Main Ingredients Re-tag — Implementation Plan

> **🔄 PIVOT — P2/P3 RE-AUTHORED 2026-06-23 (Session 9).** The P2 pilot FAILED (blind full-LLM re-read → over-tagging). The method was re-locked in design **§3·PIVOT** and the pilot/apply tasks were re-authored as **P2′** below (+ D-P10 safety fixes folded into P3). GATE 1B re-run on the P2′ tasks. **Read design §3·PIVOT (D-P1..D-P10) before any P2′/P3 task — it supersedes §3 / §4-Q3 / §4-Q5 / §4-Q6.** P1 is merged + unchanged; P4a/P4b unchanged.
>
> **✅ TASKS AUTHORED 2026-06-23 (Session 1).** The design doc §4 is **LOCKED** (all 11 mechanism questions resolved). The concrete P1–P4b tasks below were authored against the verified anchors + the locked decisions and reviewed at **GATE 1B** (Codex + Claude). **Executors:** verify every `file:line` anchor against current code before editing (line numbers drift); small repo-conformance adaptations are OK, product/scope changes are NOT — if a needed change alters behavior or scope, STOP and ask. Use `superpowers:executing-plans` task-by-task.

> **For Claude:** REQUIRED SUB-SKILL once tasks exist: use `superpowers:executing-plans` to implement task-by-task.

**Goal:** Re-tag `cooking_skills` + `main_ingredients` across ~700 live lessons to the decided canonical vocabulary (clean **and** complete), then lock the reviewer write-surfaces so they can't re-pollute.

**Architecture (PIVOT — design §3·PIVOT, supersedes the old §3):** **Anchored verify-and-diff** via the `scripts/stage2-retag/` harness — the LLM sees the lesson body **plus** the current tags (provenance-annotated) and proposes **KEEP/DROP/ADD**, not a from-scratch re-tag. **One canonical floor** (folds aliases, executes drops, drops junk, splits `Herbs & Aromatics`) anchors the clean core; a code-level **`reconcile.ts`** merges floor + LLM into `finalC02` (never append-only). **Per-value gates** with a **recomputed baseline** guard precision; a **3-layer test strategy** (69-key workhorse / fresh-25 canary / corpus prevalence) guards the greenlight. Canonical surface = the typed `text[]` columns (feed `search_vector`); the apply dual-writes the `metadata` JSONB mirror, **C02-only scope** (D-P10). The old "hybrid-floor full re-read" was, as built, a *blind* re-read (floor inert) — SUPERSEDED.

**Tech Stack:** TypeScript (`scripts/stage2-retag/` harness + Vitest), React/TS frontend (reviewer dropdowns + Zod), Supabase/Postgres (apply + enforcement migrations), Anthropic SDK (**Opus 4.8 only** — the Sonnet bake-off was skipped per the 2026-06-23 user decision `project_c02_p2_opus_only`; fable-5 suspended; `claude-opus-4-7` fallback).

**Design reference:** `docs/plans/2026-06-22-c02-cooking-ingredients-retag-design.md` — read it (incl. the GATE-A folds) before any task.

**Sub-skills (per phase):** `superpowers:test-driven-development` (harness + Zod tasks are test-first), `superpowers:verification-before-completion` (run each task's Verify step), `superpowers:requesting-code-review` (between phases), `database-migrations` (before ANY `supabase/migrations/` file).

**Per-PR ritual (mandatory):** the canonical spec lives in the kickoff's PER-PR RITUAL + the feedback memories it cites. One-line shape: pre-push reviewer-agent dispatch + **GATE 3 Codex** (parallel) → `npm run check` → push + `gh pr create` → four-surface triage → rebuttal-pass every finding + **GATE 4 Codex** on real suggested changes → consolidated fix-ups → per-round TEST re-verify → round-cap after 2. **GATE 2 Codex** on every migration SQL before TEST apply. Don't restate per-task; cite it.

## PR / phase breakdown

| PR / phase | Title | Contains | DB? | Notes |
|---|---|---|---|---|
| **P1** | Harness extension + floor + pilot tooling | Two fields + two-level shape into schema/prompt/vocab/export/normalize/validate; the deterministic alias-map floor; extend sample/score for the rules baseline + 4 gates; the canonical **VALUES manifest + parent map** artifact | **No DB** (scripts only) | own branch, mergeable independently; git-revert reversible |
| **P2** | Pilot (RAN → FAILED Session 8) | Sample 70 → 69-key; AI-draft gold key → user adjudicate; single Opus-4.8/4.7 run → **failed all 4 gates by over-tagging** (blind re-read). Artifacts retained. **SUPERSEDED by P2′.** | No DB | the 69-key + both run outputs + scorecards carry forward |
| **P2′** | Pivot harness rebuild + re-pilot | One canonical floor; anchored 2-field verify-and-diff tool + prompt; `reconcile.ts`; per-value gates + recomputed baseline; held-out sampler; re-pilot on the 69; fresh-25 label + greenlight | **No DB** (scripts only) | branch `feat/c02-pilot`; git-revert reversible; own PR; design §3·PIVOT D-P1..D-P9 |
| **P3** | Full run + apply | Winning config over ~700 → staging + diff + user spot-check + **corpus-wide prevalence review**; **one migration**: snapshot → dual-write column + JSONB → idempotent → `.sql.rollback`; **C02-only scope + concurrency guard + targeted rollback** (D-P10); **NO CHECK yet** | **migration** | **highest risk**; snapshot + `.sql.rollback`; GATE 2 |
| **P4a** | Enforcement — frontend | Non-creatable dropdowns + canonical options + Zod enums (2 app files + **4** edge-mirror lines) + specific→group `superRefine` | frontend | merges → auto-deploys; ship BEFORE P4b |
| **P4b** | Enforcement — CHECK | `valid_cooking_skills` + `valid_main_ingredients` CHECKs, after a drift re-census | **migration** | **separate** PR/approval from P4a (expand/contract, §4 Q9); GATE 2 |

---

## SESSION 1 — DESIGN LOCK ✅ DONE 2026-06-23

All §4 Q1–Q11 resolved (6-agent read-only discovery fan-out + 4 user verdicts), design Status → **Locked**, P1–P4b tasks authored below, GATE 1B run. Key locks: flat `string[]` output + parent-map superRefine (Q2); alias-floor R-rules in `normalize.ts` (Q3); 3-layer strata + size 70 (Q4); 4 gates reading the **existing** `evalMetrics` precision/fp — not new metric math (Q5); B-lite pantry + freeze-after-P3 + 70 provisional main_ingredients values (24 groups + 46 specifics) (Q1); invariant via harness R-rule + Zod superRefine, no DB trigger (Q7); Title-Case `value===label` (Q8); P3→P4a→P4b expand/contract (Q9). Provisional manifest: `docs/plans/c02-session1-discovery/q1-vocab-census.md`.

Original instructions (historical): Work design doc §4 Q1–Q11 **in order**; write a locked answer + one-line rationale under each; respect the tags (`[evidence-lockable]` you may lock from evidence; `[user-verdict]` → present evidence + a recommendation, the user decides — never lock unilaterally). Then flip the design Status to **Locked**, author the P1–P4 tasks below, and run GATE B.

**Pre-flight reads for the lock (discovery against real code):**
- Harness: `scripts/stage2-retag/{schema.ts, vocab.ts, run-retag.ts, normalize.ts, validate-output.ts, sample-answer-key.ts, score-answer-key.ts, prepare-apply.ts}`, `scripts/stage2-retag/prompts/`, `data/*.vocab.json` (+ `data/smaller-fields.vocab.json`).
- Vocabulary: `docs/plans/2026-06-12-metadata-rebuild-stage1-cooking-skills-ingredients-worksheet-decided.md`.
- Enforcement surfaces: `src/utils/filterDefinitions.ts` (gardenSkills L231–268 pattern), `src/pages/ReviewDetail.tsx` (~L1000/1027/1058–1062), `src/types/lessonMetadata.zod.ts` (215/217), `src/types/reviewFormPayload.zod.ts` (67/68), `supabase/functions/_shared/metadataSchemas.ts` (170/172/209/210), `src/types/edgeSharedSchemas.equivalence.test.ts`.
- Precedents: `supabase/migrations/20260617000000_pr6c2_retag_apply.sql` (snapshot + CHECK), `supabase/migrations/20260519000000_complete_review_atomic_tags_side_channel.sql` (dual-write 166/168 + 376/386), `supabase/migrations/20260618000000_search_vector_add_sel.sql` (62 / 65–72), the Wave-4 `20260622000000_*` migration + its `.sql.rollback`.

<!-- Session 1 done 2026-06-23: §4 locked, concrete P1–P4b tasks authored below, GATE 1B run. The pre-flight reads above were the discovery surface for the lock. -->

> **Anchor-drift notes for executors (verified 2026-06-23, fold into your pre-flight):** `applyUpdate` is **L540-582** (not 531); the `academic_concepts` structured precedent is heavier than "free" (its own repair branch, JSONB-only — irrelevant to the flat path we chose); `normalize.ts` header overstates that `validate-output` routes through the normalizer (it doesn't — normalization is pre-Zod in `run-retag`); `score-answer-key` currently has **3** gates (not 4) — C02 restructures, not extends; live census is **122 / 230** distinct, 764 live rows (the earlier "121/202" was a TEST-DB query mislabeled as PROD — corrected Session 6, see status doc).

---

## P1 — Harness extension + deterministic floor + pilot tooling

**Branch:** `feat/c02-harness` · **No DB.**

**All tasks TDD** (`superpowers:test-driven-development`) — the harness is heavily unit-tested; extend the sibling `*.test.ts`.

**Pre-flight reads:** design §3 + §4 Q1–Q5/Q8/Q11; `docs/plans/c02-session1-discovery/q1-vocab-census.md` §2–§4; `scripts/stage2-retag/{schema.ts,vocab.ts,run-retag.ts,normalize.ts,validate-output.ts,sample-answer-key.ts,score-answer-key.ts,generate-diff-report.ts}`; `scripts/lib/evalMetrics.ts`; `scripts/stage2-retag/prompts/stage2-retag.md`; `scripts/stage2-retag/data/*.vocab.json`.

**1.1 — Provisional canonical vocab + alias-floor data files.** From q1-vocab-census.md §2/§4 build the machine source-of-truth: `scripts/stage2-retag/data/c02-vocab.json` = `cookingSkills` (23), `mainIngredientsGroups` (24), `mainIngredientsSpecifics` (46 `{value, parent}` incl. the 4 group-less `null` + the 4 pre-added Apples/Coconut/Oranges/Lime; Melons parented under `Squash, cucumbers & melons`) — Title-Case `value===label`, pantry B-lite (Sugar→Sweeteners; NO Salt/Oil/Soy-sauce literals). Plus `c02-alias-map.json` = ONLY the **unambiguous** deterministic folds (kebab/case twins §4c; exact synonyms; §5 remaps Hummus→Chickpeas, Nori/Seaweed→`Seaweed (nori)`, Chocolate/Cocoa→`Cocoa & chocolate`). **Do NOT** alias the vague tags (`Basic Skills`, `Cooking Techniques`) — those are LLM-judgment (replace with the real skill), not floor folds.
   - *Test:* (a) manifest parses; (b) every specific `parent` is `null` or a real group; (c) **no canonical value is an alias-map key** (idempotency precondition for 1.3); (d) no alias maps to a non-canonical value.
   - *Commit:* `feat(c02): provisional canonical vocab manifest + parent map + alias-floor maps (P1.1)`

**1.2 — Add both fields to the harness output (schema + vocab + emitter prompt).**
   - `vocab.ts`: add `cooking_skills` + `main_ingredients` to `MAIN_PASS_FIELDS` (L36-49) + two `FieldVocab` entries in `loadVocab` (L168-281): column `cooking_skills`/`main_ingredients`, jsonbKey `cookingSkills`/`mainIngredients`, string-array, multi; main_ingredients vocab = groups ∪ specifics from `c02-vocab.json`.
   - `schema.ts`: add an explicit line for each field in **BOTH** `buildSubmitTagsTool`'s `properties` map (~L251-280) **and** `buildResultSchema`'s `.object({…})` (~L404-419) — these are **hand-listed, not auto-generated** from `MAIN_PASS_FIELDS` (GATE-1B finding); both reuse the existing `enumArray` (L216-230) / `uniqueEnumArray` helpers. Attach a `.superRefine` to **main_ingredients only** rejecting an orphan specific per the parent map (Q2). Update `schema.test.ts:298` (asserts `cooking_skills=[]` as a non-main-pass field).
   - emitter prompt `prompts/stage2-retag.md`: add the two fields — two-level guidance ("tag the group; add 1–3 specific values only when a specific food is central"), the `Herbs & Aromatics`→Fresh herbs/Alliums split, vague-tag replacement (assign the real technique; never emit `Basic Skills`/`Cooking Techniques`), pantry B-lite ("tag Sugar→Sweeteners only when the lesson is about it; never tag Salt/Oil/Soy sauce").
   - *Test:* schema generates both fields; the main_ingredients refinement rejects `['Tomatoes']` w/o `Nightshades`, accepts `['Nightshades','Tomatoes']`; cooking_skills is a flat enum.
   - *Commit:* `feat(c02): add cooking_skills + main_ingredients to harness output schema + prompt (P1.2)`

**1.3 — Deterministic alias-floor + parent-reconcile normalize rules.** `normalize.ts`: add `R7 cookingSkillsAliasFloor` + `R8 mainIngredientsAliasFloor` (overwrite each tag that is an alias-map key with its canonical; load `c02-alias-map.json`) and `R9 ingredientParentReconcile` (Q7 harness side: for every emitted specific, **append** its parent group if absent — never drop). Register all three in `NORMALIZATION_RULES` (L46-55) + as new `applyXxx` calls in `normalizeRecordInput` (the existing calls run **R1, R6, R4, R5** at L190-193; the two new fields are independent of those, so the only **load-bearing** order is R7/R8 alias-floor **before** R9 parent-reconcile).
   - *Test:* `normalize.test.ts` — (a) alias fold correct + **idempotent** (re-run is a fixed point); (b) parent-reconcile appends the missing group; (c) never removes a reviewer-meaningful specific; (d) **R9 is a no-op for the 4 `null`-parent specifics** (Celery/Fennel/Seaweed (nori)/Cocoa & chocolate) but DOES append `Squash, cucumbers & melons` for Melons; (e) **groups are never alias-map keys** (extend the 1.1 invariant to groups) so floor∘reconcile is a combined fixed point.
   - *Commit:* `feat(c02): deterministic alias-floor + parent-reconcile normalize rules (P1.3)`

**1.4 — Corpus export / validate / diff for the two fields.** Confirm both fields flow through corpus export (current values as diff context), `validate-output.ts` (field-agnostic — confirm no gap), `generate-diff-report.ts`. Add any missing plumbing.
   - *Test:* a corpus export round-trips both fields; the diff report shows before/after for them.
   - *Commit:* `feat(c02): plumb the two fields through export + diff-report (P1.4)`

**1.5 — 3-layer sample strata.** `sample-answer-key.ts` (`stratumKey` ~L244): add (1) hard-case quotas keyed off current-tag values (vague cooking tags, `Herbs & Aromatics`, orphan foods); (2) deterministic seeded **set-cover** guaranteeing every group + every specific ≥2× — target = **expected post-retag membership** (seed from the alias-floor predictions / a pre-scan, NOT current tags, since added specifics have near-zero current carriers); (3) clean-core slice retaining `activity_type×quartile`. Size **70** (≈25/25/20).
   - *Test:* `sample-answer-key.test.ts` — the key covers every group + specific ≥2×; layer sizes as expected; deterministic under a fixed seed.
   - *Commit:* `feat(c02): 3-layer answer-key strata (hard-case + set-cover + clean-core) (P1.5)`

**1.6 — 4-gate scoring + rules baseline.** `score-answer-key.ts`: restructure `GateResults` into the 4 C02 gates reading the **already-computed** `evalMetrics` per-value `precision`/`fp`/`predictionCount` + `evaluateThresholds`'s `minPrecisionPerValue`/`maxPredictionRateForAbsentValues` (**no new metric math** — supervisor-verified the primitives exist at `evalMetrics.ts` L16-26/164/172); add a **rules-baseline contestant** (the alias-floor alone, no LLM) — note it has **no file loader** (`score-answer-key` loads contestants via `loadRunContestant`/`loadV3FromCorpus`; the rules baseline must be **computed** by running R7/R8/R9 over the corpus rows and scored as a synthetic contestant, and gate ② reads THIS contestant, not v3); add a per-lesson clean-core/judgment-row label to the key; wire the Q5 thresholds (①strict ②+0.05 both-fields-pass tie-fails ③0.7 + ≤5% ④0.8); report a bootstrap CI alongside the gate-② delta (informational, non-gating).
   - *Test:* `score-answer-key.test.ts` — each gate passes/fails on crafted fixtures; gate ③ counts a singleton over-prediction; gate ② fails on a tie.
   - *Commit:* `feat(c02): restructure scoring into the 4 C02 gates + rules baseline (P1.6)`

**P1 exit:** `npm run check` + `npm run test:run` green; per-PR ritual (reviewer agent + GATE 3 Codex parallel; four-surface triage); merge `feat/c02-harness`.

## P2 — Pilot — ⚠️ RAN → FAILED (Session 8); SUPERSEDED by P2′ below

> **The P2 pilot RAN and FAILED** (both Opus models over-tagged; all 4 gates). Tasks 2.1–2.4 below are **historical** (what was executed). The 69-key, both run outputs, and the scorecards carry forward into **P2′**. Do NOT re-run P2 as written — the method pivoted (design §3·PIVOT).

> **⚠️ Model = Opus 4.8 ONLY (no bake-off).** The §4 Q11 Opus-vs-Sonnet bake-off was **superseded 2026-06-23** by user decision (`project_c02_p2_opus_only`): run Opus 4.8 once, score it alone against the same 4 gates, fall back to `claude-opus-4-7` only if it fails. P2.3/P2.4 below reflect this.

**No DB.** Artifacts in `scripts/stage2-retag/artifacts/` (bulk gitignored; commit a scorecard summary) — not a throwaway branch (§4 Q10). New branch `feat/c02-pilot` (P1's `feat/c02-harness` is merged).

**2.1 — Regenerate the PROD corpus, top-up the floor, then generate the 70-lesson key.** Three sub-steps (added Session 6 — the on-disk `corpus.jsonl` is the stale 765-line Jun-12 export and LACKS both fields; and a coverage audit found a few clean folds the TEST-sourced census missed):
   - **2.1a — Export-corpus guard fix + regen.** `export-corpus.ts` hardcodes `EXPECTED_LIVE_ROWS=767` + a 2-id `GHOST_STUB_LESSON_IDS` set; Wave-4 (#539) hard-deleted those ghost rows, so live is now **764** and those 2 stub ids are **absent** (verified: 0 present, 0 other error-stubs/short-body rows on live PROD). Update `EXPECTED_LIVE_ROWS→764` + **empty** `GHOST_STUB_LESSON_IDS` (→ `EXPECTED_EXPORT_ROWS=764`), keep the Who's-Who sidecar override; TDD against `export-corpus.test.ts`. Then run the read-only PROD export → `corpus.jsonl` (764 lines, both new fields present). Corpus is gitignored — commit only the `export-corpus.ts` + test changes.
   - **2.1b — Floor top-up.** Add the clean deterministic folds the TEST census missed to `c02-alias-map.json` (TDD; re-assert the load-time invariants — no canonical is a key, no match-key collisions, every value→canonical, idempotent): `Beans`/`Peas`→`Beans & legumes`, `Squash`→`Squash, cucumbers & melons`, `Parmesan cheese`/`Mozzarella cheese`→`Cheese`, `Sour Cream`/`Buttermilk`/`Condensed milk`→`Dairy`, `Various seeds`→`Nuts & seeds`, `Beyond Sausage (pea protein)`→`Tofu & plant proteins`, `Lettuce`→`Leafy greens`, `Cereal/grains`/`Whole wheat wraps`→`Grains & starches`, `Beet juice`→`Beets`. (NOT cooking_skills — those uncovered values are genuinely LLM-judgment; NOT `herbs-aromatics`, which is the LLM-split catch-all.)
   - **2.1c — Sample.** Run the 1.5 sampler (`--c02`) over the regenerated corpus → the 70-lesson key. Commit the id list + sample manifest.
   - *Commits:* `fix(c02): export-corpus census guard 767→764 + drop deleted ghost stubs (P2.1a)` · `feat(c02): floor top-up — clean folds the TEST census missed (P2.1b)` · `chore(c02): generate the 70-lesson pilot answer-key sample (P2.1c)`

**2.2 — Gold key (USER-GATED).** AI drafts tags for the 70; **user adjudicates each**; for the judgment rows (vague-tag, Herbs split, added specifics, pantry) run the **independent second-pass adjudication** (Q6 — user, or a different AI lens than the Opus drafting model) before acceptance. Produces the gold `answer-key.final.jsonl`. **Stop for the user.**

**2.3 — Opus 4.8 run** (no bake-off — superseded 2026-06-23). Run `preflight-token-mass` first (confirm the grown tool-schema prefix < 12K `TOKEN_MASS_BUDGET` and > the Opus 4096 floor). Then **one run** over the key: `--model claude-opus-4-8` (first 3 lessons `--concurrency 1` to confirm `cache_read > 0`). Capture per-lesson `totalCostUsd`; project × ~700, separating `cache_creation` (first call) vs `cache_read` (0.1×). *(Needs Console credits — flag if a credit-balance 400 hits.)*

**2.4 — Score + greenlight (USER-GATED).** Score **Opus 4.8 alone** on the 4 gates vs the gold key (no model tie-break). Opus 4.8 must *earn* the greenlight by clearing ALL four (the fabrication caveat `schema.ts:42-44` is why the gates remain the safety net); `claude-opus-4-7` is the fallback baseline only if Opus 4.8 doesn't clear. Commit `artifacts/c02-pilot-scorecard.md` (per-field micro-F1, per-gate pass/fail, cost, model used). **Present the greenlight + cost to the user; do NOT start P3 without explicit approval.**

## P2′ — Pivot harness rebuild + re-pilot (design §3·PIVOT)

**Branch:** `feat/c02-pilot` (continues) · **No DB** (scripts only; git-revert reversible) · own PR.

**All tasks TDD** (`superpowers:test-driven-development`). Read design **§3·PIVOT (D-P1..D-P10)** before any task. The anchors below were verified 2026-06-23 (Session-9 grounding workflow); **re-confirm before editing** (line numbers drift).

**Verified anchors (Session 9):**
- `run-retag.ts`: `corpusLineSchema`/`loadCorpus` L1115-1132 (strips existing tags — the unlock point); `buildMessageRequest` L1304-1324 (user turn = body only, L1322); per-lesson call L1573-1592 (body=`content_text` L1590); `appendDocSurfaces` seam L1480-1483; `computeBodyHash` body L312-314 (call site L1578; **resume** body-map L489-530; **repair** L1740-1743 — D-P9 touches all three); result schema L327-333; forced-tool name `SUBMIT_TAGS_TOOL_NAME` L1319-1322 + extraction L1273-1280; reconcile insertion point ~L1596 (between `callForcedTool` and `buildRunRecord`); RunRecord persistence L229-287/350-388 (persists `rawInput` only today).
- `normalize.ts`: `applyAliasFloor` L267-290; `applyIngredientParentReconcile` (R9, append-only) L298-319; `buildC02Floor` L196-240; `loadC02Floor` L244-257; `matchKey` L155-157; `normalizeRecordInput` L424-459; **`drops` ignored** L134-139.
- `sample-answer-key.ts`: `predictMembership`/`foldField` L470-506 (runtime "floor over existing tags"); `buildC02Sample` L640-809 (no exclude param); `stratifiedSample` `excluded:Set` L305-357; set-cover **warnings** L758-769 but the **CLI hard-fail exit is L1432-1443**; `runC02` L1372-1416.
- `score-answer-key.ts`: `loadRunContestant` L506-521 (reads `rawInput`); `runC02Mode` reconcile/score insertion L648-663; `scoreContestant` L176-228.
- `c02-gates.ts`: `evaluateGate3` (pooled) L362-411; `computeRulesBaseline`/`predictMembership` L188-200; `labelLessons` L126-158; `evaluateGate1/2` L290-356; constants L62-82.
- `scripts/lib/evalMetrics.ts`: `PerValueMetrics` L16-26; `evaluateThresholds`/`minPrecisionPerValue`/`maxPredictionRateForAbsentValues` L164-184.
- `prepare-apply.ts`: `FLAT_FIELDS` L92-97; `comparedToStagingRow` L274-326; `applyUpdate` L540-582; snapshot DDL/INSERT L490-529; grade guard L549-557.
- `build-c02-answer-key.ts`: gold-key floor (drops unmapped) L139-158/184-206 — **diverges from `predictMembership`; D-P3 unifies them.**

**P2′.1 — One canonical floor (D-P3).** Refactor the floor into a single exported function the reconciler, scorer, gold-key builder, and baseline all call. It must: fold aliases → **execute the `drops` list** (today inert) → drop unmapped/non-canonical legacy junk → **remove the `Herbs & Aromatics` literal** (not a fold; it becomes an LLM split candidate). Floor-data hygiene in `c02-alias-map.json`/`drops`: `Basic Skills`/`Cooking Techniques` → removed-not-folded (LLM replaces with the real skill); `Forming patties` → drop; confirm `Olive oil` drop actually executes; `Herbs & Aromatics` → removed (split). **Reconcile the two divergent floor implementations** (`predictMembership` keeps junk; `build-c02-answer-key` drops it) into one definition.
   - The unified floor's return carries **per-tag provenance** (`exact-canonical`/`alias-fold`/`parent-derived`/`ambiguous`) as a FIELD — D-P5's anchor annotation (P2′.2) reads this field, it does NOT spin up a second floor implementation.
   - *Test:* floor executes drops; unmapped junk removed; `Herbs & Aromatics` not emitted verbatim; **the scorer, baseline, reconciler, and gold-key builder all import/call the SAME function** (import-identity, not just equal outputs — `sample-answer-key.ts:470-505` `predictMembership` and `build-c02-answer-key.ts:139-206` must be replaced by it); idempotent fixed point; canonical-only output; provenance field present + correct.
   - *Commit:* `feat(c02): unify the canonical floor — execute drops, drop junk, split Herbs&Aromatics (P2′.1)`

**P2′.2 — Thread existing tags + anchored 2-field tool + verify-and-diff prompt (D-P4/D-P5/D-P9).**
   - Widen the run-time corpus reader (`corpusLineSchema` L1115) to retain `cooking_skills`/`main_ingredients` (already in `corpus.jsonl` — `export-corpus.ts:251-269` writes them generically; **no regen needed, but add a freshness preflight** asserting the on-disk corpus is current rather than blindly re-exporting); thread into the run loop.
   - Build a **dedicated 2-field C02 tool** (not the all-14-field `submit_tags`): cooking_skills + main_ingredients only, **KEEP/DROP/ADD** structured output + a reason code per drop/add. **Naming contract:** the forced-tool name is hardcoded `SUBMIT_TAGS_TOOL_NAME` (L1319-1322) + extraction L1273-1280 — decide reuse-the-name vs parameterize, and wire BOTH the request and the extraction.
   - Assemble the **anchored body block**: append the current tags with **provenance annotation** — read the provenance FIELD off P2′.1's unified floor return (`exact-canonical`/`alias-fold`/`parent-derived`/`ambiguous`), do NOT re-derive it — via a new seam mirroring `appendDocSurfaces` (L1480); **drops & unmapped NEVER enter the anchor** (D-P5).
   - Rewrite the prompt (a dedicated C02 prompt, or `prompts/stage2-retag.md`) to **verify-and-diff** with explicit **per-label ADD criteria** (Tasting = sensory comparison/vocab/assessment, *not* eating the dish; Kitchen & food safety = taught/practiced/assessed or a dedicated agenda segment, *not* incidental knife/wash/heat) + **negative few-shots** (garnish-isn't-an-ingredient; pantry-staple precision).
   - Update `computeBodyHash` (L312-314) to hash the **full effective input** (body + raw current tags + floored anchor + manifest version + reconciliation policy) — and update **all three consumers** (main call L1578, **resume** body-map L489-530, **repair** L1740-1743) so none reuses a stale answer when anchors change (D-P9).
   - *Test:* corpus schema retains both fields; the 2-field tool schema is exactly KEEP/DROP/ADD (no other field); the prompt contains the locked ADD criteria + negative examples; the assembled user turn contains the provenance-annotated anchor with drops/unmapped excluded; the effective-input hash changes **independently** for each input (body, raw tags, manifest version, reconcile policy).
   - *Commit:* `feat(c02): anchored verify-and-diff — thread existing tags, 2-field tool, provenance anchor, diff prompt (P2′.2)`

**P2′.3 — `reconcile.ts` + run-record contract (D-P6).** New module `reconcileC02Tags({existing, floored, llmDecisions, floor})` → `{finalCookingSkills, finalMainIngredients, provenance}`: floor-anchored core + the LLM's KEEP/DROP/ADD; enforce the specific→group invariant; **reject/resolve parent/child conflicts** (drop-parent-keep-child is contradictory → keep the parent); reject decisions that don't partition the anchor. **Never append-only.**
   - **Validation flow:** the 2-field KEEP/DROP/ADD decision object will NOT satisfy the current all-field result schema (`run-retag.ts:327-333`) — define: decision-schema validation → floor + reconcile → **`finalC02` canonical validation**. For the two C02 fields the legacy R7/R8/R9 path is **superseded by reconcile** (state this so they aren't double-applied).
   - **Run-record schema contract:** persist BOTH the raw LLM decisions AND `finalC02` as **NEW** record fields — do NOT overwrite `rawInput` (today the record persists `rawInput` only, L229-287/350-388). Update the record schema + parser + every consumer (diff, score, apply) to read `finalC02`.
   - Insert at run time ~L1596 (between `callForcedTool` and `buildRunRecord`).
   - *Test:* KEEP∪DROP **exactly partitions** the anchor (a non-partitioning decision is REJECTED); ADD disjoint from the anchor; **drop-parent+keep-child → parent retained**; `finalC02` canonical+unique+ordered; deterministic; an LLM-dropped floor tag is actually removed (subtractive proof); an LLM add survives; the record carries BOTH raw decisions and `finalC02`.
   - *Commit:* `feat(c02): reconcile.ts + run-record finalC02 contract — floor-anchored keep/drop/add (P2′.3)`

**P2′.4 — Per-value gates + baseline recompute (D-P7/D-P8).** In `c02-gates.ts`: AUGMENT `evaluateGate3`'s pooled precision (≥0.70) with a **per-specific** floor (≥0.60 where `truthCount≥3 AND predictionCount≥3`) via a support-aware wrapper (NOT raw `minPrecisionPerValue`); add named sentinels (`Tasting`/`Kitchen & food safety` ≥0.70, `Sweeteners` ≥0.80); below-support values stay informational but still feed the pooled denominator. **Recompute the rules baseline against the cleaned floor (P2′.1)** and lock Gate1/Gate2 to it (D-P7). Make the scorer read **`finalC02`** (reconciled), not `rawInput`. All thresholds in named constants (re-tunable at the pilot).
   - *Test:* per-specific gate fails a low-precision specific at `truthCount≥3 & predictionCount≥3` AND **ignores** one at `predictionCount<3` (test both sides of the support guard) while still counting its FPs in the pool; sentinels gated; baseline reflects the cleaned floor; **a fixture with conflicting `rawInput` vs `finalC02` proves the scorer reads `finalC02`**.
   - *Commit:* `feat(c02): per-value gates augment pooled + recompute baseline on cleaned floor (P2′.4)`

**P2′.5 — Held-out sampler (D-P2).** Add `excludeIds:Set<string>` (+ a `--exclude-key <path>` flag) threaded through all three layers of `buildC02Sample` (L640) + `runC02` (L1372); for the held-out draw use the 69-key ids as `excludeIds` + a NEW seed over the remaining 695; add an **explicit relaxed-coverage mode flag** for the held-out (representative stratified draw, not full ≥2× coverage) so the 69-key strict mode is untouched — this avoids the **CLI hard-fail exit (L1432-1443)** at size ~25; emit + commit the disjoint ID manifest **before** any labeling.
   - *Test:* the held-out excludes the 69; disjoint; deterministic under the new seed; the relaxed-mode flag suppresses the hard-fail at size 25 **while strict mode (the 69-key path) still hard-fails on under-coverage**.
   - *Commit:* `feat(c02): held-out sampler — disjoint ~25 slice, exclude the 69 (P2′.5)`

**P2′.6 — Re-pilot on the 69 (Opus 4.8) — USER-GATED.** `preflight-token-mass` first (D-P9 changes the prefix; confirm < budget). Run the anchored+reconciled harness over the 69 (proxy/Opus-4.8 per the status-doc runbook); score on the 4 gates (per-value). Iterate the prompt/few-shots **against the 69** until the gates pass. If the gates still fail on the universal catch-alls, **STOP and present the D-P1 keep-only-lock recommendation — do NOT implement the lock without user approval.** Commit the scorecard summary (bulk run gitignored). **Stop for the user** at the gate result.

**P2′.8 — Per-field ship policy + floor-retention cooking + field-isolated validation (D-P11) — ⚠️ RUN BEFORE the P2′.7 freeze.** Scripts-only; rides the P2′ branch. Decision (a) locked Session 14 → the full run ships a **different source per field**, so the harness must materialize that and stop one field's failure from killing the other. **TDD.**

   **(1) MUST-HAVE — `materializeC02Ship` + re-score the 69 reproduces D-P11.** A new explicit `materializeC02Ship(...)` (own module, e.g. `ship-policy.ts`) that produces the **apply input** per field from a run record + the unified floor (`applyC02Floor` over the row's existing tags):
   - `main_ingredients` = **floor-only** (`floorTagValues(floor.ingredients)`; the LLM ingredient decision is IGNORED entirely).
   - `cooking_skills` = **floor ∪ the LLM's cooking final** (floor-retention; LLM may KEEP/ADD but never drops a floored skill). Read the cooking final from `record.finalC02.cooking_skills` **when present, ELSE reconstruct `keep ∪ valid-add`** from the raw decision (`rawInput.cooking_skills`; `keep` = strings, `add`/`drop` = `{value,reason}` objects — handle BOTH shapes; drop any off-vocab cooking value against the manifest). This finalC02-or-raw read is what makes the ship layer **inherently field-isolated** — an off-vocab *ingredient* (which crashed `finalC02` for 4 pilot records) can never affect the ship output, because ingredients come from the floor and cooking from the cooking decision.
   - This per-field ship object is the canonical thing `generate-diff-report`/`prepare-apply` consume (supersedes the carry-forward "thread `finalC02` into the diff" — it is NOT raw `finalC02`).
   - **Re-score gate (locks D-P11's numbers into real code):** a committed script/test that runs `materializeC02Ship` over the **stored r4 run** (`c02-run.opus-4-8.p2prime-r4.jsonl`, all 69, reconstructing the 4) and asserts: cooking floor-retention F1 ≈ **0.872** (P≈0.833/R≈0.915), LLM-as-is cooking ≈ 0.836, floor-only cooking ≈ 0.807; ingredients ship == the floor. This supersedes the throwaway `c02-cooking-floor-vs-llm.ts` analysis with a maintained equivalent. (Numbers may shift by ≤0.005 if computed through cleaner code — flag, don't silently absorb, a larger drift.)
   - *Test:* ship emits floor-only ingredients (an LLM ingredient ADD is ABSENT from the ship output) + floor-retention cooking (a floored skill the LLM dropped IS present; an LLM cooking ADD IS present); the 4 pilot records (no `finalC02`) yield non-empty cooking via the raw-decision reconstruction; floor-retention cooking ⊇ the floor for every row (no clean-core data loss); off-vocab cooking add is dropped.

   **(2) SHOULD-HAVE — run-time field-isolation (only if contained; else DEFER to P3.1).** Make `run-retag.ts`/`reconcile.ts` validate the two C02 fields **independently** so a future full run captures a valid per-field `finalC02` even when one field has an off-vocab value (don't rely on the ship layer's raw-reconstruction as the only safety net at corpus scale). **Boundary:** if this can't be done as a contained change at the validation boundary and would require restructuring the validated reconcile core, **STOP and report** — it then rides P3.1 (the full run), and (1)'s finalC02-or-raw read already covers the pilot + re-score. Do not destabilize the P2′.3-validated reconcile to force this in.
   - *Commit:* `feat(c02): per-field ship policy — floor-only ingredients + floor-retention cooking (P2′.8)`

**P2′.7 — Fresh-25 label + final greenlight (D-P2) — USER-GATED.** **Freeze** the prompt/reconciler + **the per-field ship policy (P2′.8)** + the gate thresholds (no re-tuning after this point); commit the disjoint 25 ids (P2′.5); label them **independently — `cooking_skills` only (D-P12;** ingredient labeling is redundant under floor-only ingredients, subsumed by the P3.1 all-700 prevalence review) — two body-only derivations that see neither model output nor anchors + user adjudication (the Q6 protocol); run the frozen harness over the 25 + **materialize the per-field ship output** + score **cooking only**. **Acceptance contract:** the 25 is the anti-overfit CANARY — the **only fresh, independently-labeled cooking-precision check** before the full run — it must hold **aggregate `cooking_skills` precision/recall on the SHIPPED floor-retention cooking output** (NOT raw `finalC02`) + the named cooking sentinels (Tasting/Kitchen-safety, at their thresholds where supported); the **per-value 46-specific gating stays on the 69** (25 rows can't measure 46 values — D-P2), and ingredient quality at scale is the P3.1 prevalence review's job. Present the greenlight + cost projection. **Do NOT start P3 without explicit approval.**

---

## P3 — Full run + apply migration

**Branch:** `feat/c02-apply` · **migration (highest risk).**

**GATE 2 Codex** on the SQL before TEST. Invoke the `database-migrations` skill before touching `supabase/migrations/`.

**Pre-flight reads:** `prepare-apply.ts` (snapshot DDL/INSERT L490-529, `applyUpdate` dual-write **L540-582**); `supabase/migrations/20260617000000_pr6c2_retag_apply.sql` (snapshot table DDL L69, INSERT…ON CONFLICT DO NOTHING L96-99); `supabase/migrations/20260622000000_wave4_pr1_*` + its `.sql.rollback` (the sibling-file rollback style); `20260519000000_*tags_side_channel.sql` (dual-write JSONB 166/168 + column 376/386); `20260618000000_search_vector_add_sel.sql` (main_ingredients B-weight :62, cooking_skills C-weight :67, trigger fires on `UPDATE OF` both columns L86-89).

**3.1 — Full run.** Run the frozen anchored+reconciled config over all live lessons (`retired_at IS NULL`) → **materialize the per-field ship output (P2′.8 / D-P11): `main_ingredients` = floor-only, `cooking_skills` = floor ∪ `finalC02.cooking_skills`** → staging JSONL (**which must capture each row's pre-apply C02 source arrays/hash for the D-P10b concurrency guard**) → `generate-diff-report` reading the **per-field ship output** (NOT raw `finalC02`; D-P6/D-P11) → **user spot-check** the diff (esp. floored / ship-changed rows — selected by an explicit **ship-policy provenance bucket** in the diff report, **NOT** `normalizationCount`: C02 fields bypass `normalize` and the floor lands later in `materializeC02Ship`, so `normalizationCount` does not flag floored C02 rows — **add this bucket in P3.1**, Session-15 audit carry-forward) → **corpus-wide per-value prevalence review** = a **committed per-value prevalence report** (per-tag firing rate across all ~700 — would have caught "Tasting on 78%") + an **explicit user stop** before apply (D-P2 scale gate; "reads like an over-tag" is a user judgment on the committed report, not an automatic rule). **Freeze the manifest now:** add any genuinely-missing high-frequency food the run surfaces to `c02-vocab.json` and re-run if added; after this point the value set is closed.

**3.2 — Apply scope fix + migration (D-P10; GENERATE, don't hand-write the SQL — GATE-1B).**

**FIRST, scope the apply emitter to C02 only (D-P10a).** 🔴 The current `prepare-apply.ts` writes ALL ~14 fields generically from `FLAT_FIELDS` (column loop L552-554; JSONB chain L563-568) + `gradeLevels`/`academicConcepts` (L569-574) — a C02 run+apply today would **STOMP the completed metadata rebuild**. Add an explicit `C02_APPLY_FIELDS = ['cooking_skills','main_ingredients'] as const` and drive BOTH write sites from it; **remove** the `gradeLevels`+`academicConcepts` jsonb_set and the grade-column write (L549/555-557) for strict C02 scope; narrow `changeMagnitude`/`changedRows` (`comparedToStagingRow` L283-310) to the two C02 fields so "changing" means "a C02 field changed." Keep the snapshot **full-row** (conservative for forensics). The apply (and diff) read **`finalC02`** (D-P6), not `rawInput`. **TDD covers ALL of D-P10:** the emitted UPDATE touches only the two columns + their two JSONB keys (a); a stale-source row is skipped + lands in the report (b); the rollback touches only the two keys (c); the post-update column↔JSONB lockstep assertion fires (d).

**THEN** run `prepare-apply.ts` (it **escapes SQL literals** via `sqlTextArrayLiteral`/`sqlJsonbLiteral` — removes the apostrophe/ampersand hazard for `Sautéing & stir-frying`) and ADAPT the draft into `supabase/migrations/<YYYYMMDDHHMMSS>_c02_retag_apply.sql` (prefix sorts AFTER the latest — `ls supabase/migrations | sort | tail -3` first; ASCII gotcha):
   - (a) rename the snapshot table `pr6_retag_rollback`→`public.c02_retag_rollback` (RLS-enabled, no policies);
   - (b) snapshot-`INSERT … ON CONFLICT DO NOTHING` **BEFORE any UPDATE**;
   - (c) **C02-only dual-write** — typed `text[]` columns `cooking_skills`/`main_ingredients` AND camelCase `metadata` jsonb_set `cookingSkills`/`mainIngredients` ONLY; no other field, no grade guard;
   - (d) **concurrency guard (D-P10b)** — each UPDATE's WHERE also matches the row's **pre-apply C02 source arrays/hash captured in the P3.1 staging artifact** (define null + element-order comparison semantics), so a row a reviewer edited since export is **skipped, not stomped**; emit a **committed skipped-ID report** artifact;
   - (e) **NO CHECK** (Q9);
   - (f) **C02-targeted rollback (D-P10c)** — sibling `*.sql.rollback` (Wave-4 style): an idempotent `DO` block restoring **only** the two columns + two JSONB keys FROM `c02_retag_rollback` (NOT full metadata — avoids clobbering unrelated post-apply edits);
   - (g) a post-update assertion that column ↔ JSONB are equal for the two fields (D-P10d lockstep).
   **GATE 2 Codex** on the final SQL (C02-only scope, concurrency guard, idempotency, snapshot-before-update ordering, column↔JSONB lockstep, escaping, targeted-rollback completeness).
   - *Commit:* `feat(c02): C02-scoped apply migration — snapshot + concurrency-guarded dual-write, targeted rollback, no CHECK (P3.2)`

**3.3 — TEST→PROD.** Local `supabase db reset` + `npm run test:rls`; apply to TEST → **MCP-verify** (distinct-count drop on both fields, sample rows, search still returns, JSONB↔column lockstep) → PROD approval → **PROD MCP-verify** (mandatory — CI verify flakes, `reference_ci_flakes`). Re-verify TEST after any fix-up round.

## P4a — Enforcement: frontend (`feat/c02-enforce`)

**Frontend; merges → auto-deploys. Ship BEFORE P4b** (§4 Q9). **TDD** on the Zod. Derive every literal from the **frozen** manifest (P3.1) — byte-identical across all surfaces.

**Pre-flight reads:** `src/utils/filterDefinitions.ts` (gardenSkills L240-267, cookingSkills L271, mainIngredients L174); `src/pages/ReviewDetail.tsx` (L1000/1027 CreatableSelects, L1058-1061 justification comment + Select L1062); `src/types/lessonMetadata.zod.ts` (open arrays 215/217, `GARDEN_SKILLS_VALUES` region); `src/types/reviewFormPayload.zod.ts` (67/68, import block L32-42); `supabase/functions/_shared/metadataSchemas.ts` (`GARDEN_SKILLS_VALUES` L91-116, open arrays 170/172 + 209/210); `src/types/edgeSharedSchemas.equivalence.test.ts`.

**4a.1 — filterDefinitions.** Replace the cookingSkills (L271+) + mainIngredients (L174+) kebab option sets with the canonical Title-Case `value===label` lists from the frozen manifest; carry the gardenSkills `value===label` justification comment (`filterDefinitions.ts:235-237` — the *value===label round-trip* rationale, distinct from the ReviewDetail one).
   - *Commit:* `feat(c02): close cookingSkills + mainIngredients filter configs to canonical vocab (P4a.1)`

**4a.2 — ReviewDetail.** Swap the two `CreatableSelect` (L1000, L1027) → non-creatable `Select`; copy the gardenSkills *non-creatable* justification comment (`ReviewDetail.tsx:1058-1062` — distinct from the filterDefinitions comment in 4a.1).
   - *Commit:* `feat(c02): non-creatable Select for cooking_skills + main_ingredients (P4a.2)`

**4a.3 — Zod (all four schemas + edge mirror).** Add `COOKING_SKILLS_VALUES` + `MAIN_INGREDIENTS_VALUES` consts + `CookingSkillsEnum`/`MainIngredientsEnum` + `INGREDIENT_PARENT_MAP` (byte-identical to the frozen manifest) in `lessonMetadata.zod.ts`; replace the open arrays at lessonMetadata.zod **215/217**, reviewFormPayload.zod **67/68** (import the enums), edge `metadataSchemas` **170/172 + 209/210** (add the two VALUES consts here too — all four close together). Add the specific→group `superRefine` (reads `INGREDIENT_PARENT_MAP`, rejects an orphan specific) to all four schemas. Update the equivalence-test fixtures to real canonical values + add **off-vocab** and **orphan-specific** negative fixtures to BOTH invalid blocks.
   - *Test:* post-canonical values parse; an orphan specific (`['Tomatoes']` w/o `Nightshades`) and an off-vocab value both reject; `edgeSharedSchemas.equivalence` stays green; `npm run check` + `npm run test:run`.
   - *Commit:* `feat(c02): close Zod enums + specific→group superRefine across all 4 schemas (P4a.3)`

## P4b — Enforcement: DB CHECK (`feat/c02-check`, migration)

**Separate PR/approval from P4a; deploy P4a first** (§4 Q9). **GATE 2 Codex.** Invoke `database-migrations`.

**4b.1 — Drift re-census + CHECK.** Pre-merge: drift re-census on **TEST and PROD** (`count rows where cooking_skills/main_ingredients NOT <@ <frozen vocab>`). If >0, re-canonicalize those rows in the SAME migration (snapshot-driven, Wave-4 style) BEFORE the constraint (a non-empty drift makes `ADD CONSTRAINT` fail). Then add `valid_cooking_skills` + `valid_main_ingredients` (pg_constraint-guarded `DO` block, `col IS NULL OR col <@ ARRAY[<frozen Title-Case literals>]::text[]`, **byte-identical** to the Zod VALUES) AFTER any data fix. Sibling `.sql.rollback`: `DROP CONSTRAINT` **plus**, **if** the drift re-canonicalization mutated any rows, a snapshot-backed restore of those rows' column+metadata (Wave-4 style — populate a `c02_check_drift_rollback` snapshot table BEFORE the drift UPDATE); if zero rows drifted, the rollback is DROP-CONSTRAINT-only — state which case applies in the migration header. **GATE 2 Codex** (CHECK vs un-migrated rows, byte-identity, rollback completeness, quoting). TEST apply → MCP-verify (CHECK present, a known off-vocab insert rejects) → PROD approval → PROD MCP-verify. Re-verify TEST per round.
   - *Commit:* `feat(c02): valid_cooking_skills + valid_main_ingredients CHECKs (P4b.1)`

---

## Test plan (high-level; concretize per task in Session 1)

### Unit
- Harness: two-level parent-map validation refinement; deterministic floor (alias → canonical); rules baseline; the 4-gate scoring incl. false-positive/precision metrics. Extend the existing `scripts/stage2-retag/*.test.ts`.
- Zod (P4a): post-canonical values parse against the new enums; `superRefine` rejects an orphan specific; `edgeSharedSchemas.equivalence` stays green; off-vocab fixtures fail.

### Integration / Migration
- P3/P4b: local `supabase db reset` + `npm run test:rls` unchanged; TEST-DB MCP probes (distinct-count drop, CHECK present, search returns expected); PROD MCP verify after approval. Also run `npm run check` + `npm run test:run` (the mandated pre-PR pair, CLAUDE.md) — trivially green for SQL-only phases but required.

### E2E
- No new E2E; the existing search E2E must stay green after the apply.

### Manual smoke (per `superpowers:verification-before-completion`)
- Reviewer dropdown shows canonical values only (no free-form box) for both fields.
- A known multi-ingredient lesson shows group + the right starred specifics.
- Public search still returns expected results; distinct-value count dropped as expected.
