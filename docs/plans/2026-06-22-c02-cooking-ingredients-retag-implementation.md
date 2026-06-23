# C02 — Cooking Skills & Main Ingredients Re-tag — Implementation Plan

> **✅ TASKS AUTHORED 2026-06-23 (Session 1).** The design doc §4 is **LOCKED** (all 11 mechanism questions resolved). The concrete P1–P4b tasks below were authored against the verified anchors + the locked decisions and reviewed at **GATE 1B** (Codex + Claude). **Executors:** verify every `file:line` anchor against current code before editing (line numbers drift); small repo-conformance adaptations are OK, product/scope changes are NOT — if a needed change alters behavior or scope, STOP and ask. Use `superpowers:executing-plans` task-by-task.

> **For Claude:** REQUIRED SUB-SKILL once tasks exist: use `superpowers:executing-plans` to implement task-by-task.

**Goal:** Re-tag `cooking_skills` + `main_ingredients` across ~700 live lessons to the decided canonical vocabulary (clean **and** complete), then lock the reviewer write-surfaces so they can't re-pollute.

**Architecture:** Hybrid-floor full LLM re-read via the existing `scripts/stage2-retag/` harness — the LLM reads every lesson; a deterministic alias-map **floor** anchors the ~92–94% clean core; the LLM owns the judgment work (vague-tag replacement, Herbs/Alliums split, adding the 1–3 starred specifics, dropping cosmetic noise). Canonical surface = the typed `text[]` columns (which feed `search_vector`); the apply dual-writes the `metadata` JSONB mirror. See design doc §3 for WHY.

**Tech Stack:** TypeScript (`scripts/stage2-retag/` harness + Vitest), React/TS frontend (reviewer dropdowns + Zod), Supabase/Postgres (apply + enforcement migrations), Anthropic SDK (**Opus 4.8 only** — the Sonnet bake-off was skipped per the 2026-06-23 user decision `project_c02_p2_opus_only`; fable-5 suspended; `claude-opus-4-7` fallback).

**Design reference:** `docs/plans/2026-06-22-c02-cooking-ingredients-retag-design.md` — read it (incl. the GATE-A folds) before any task.

**Sub-skills (per phase):** `superpowers:test-driven-development` (harness + Zod tasks are test-first), `superpowers:verification-before-completion` (run each task's Verify step), `superpowers:requesting-code-review` (between phases), `database-migrations` (before ANY `supabase/migrations/` file).

**Per-PR ritual (mandatory):** the canonical spec lives in the kickoff's PER-PR RITUAL + the feedback memories it cites. One-line shape: pre-push reviewer-agent dispatch + **GATE 3 Codex** (parallel) → `npm run check` → push + `gh pr create` → four-surface triage → rebuttal-pass every finding + **GATE 4 Codex** on real suggested changes → consolidated fix-ups → per-round TEST re-verify → round-cap after 2. **GATE 2 Codex** on every migration SQL before TEST apply. Don't restate per-task; cite it.

## PR / phase breakdown

| PR / phase | Title | Contains | DB? | Notes |
|---|---|---|---|---|
| **P1** | Harness extension + floor + pilot tooling | Two fields + two-level shape into schema/prompt/vocab/export/normalize/validate; the deterministic alias-map floor; extend sample/score for the rules baseline + 4 gates; the canonical **VALUES manifest + parent map** artifact | **No DB** (scripts only) | own branch, mergeable independently; git-revert reversible |
| **P2** | Pilot | Sample 70; AI-draft gold key → user adjudicate (+ hard-case protocol); **single Opus-4.8 run** (no bake-off — superseded 2026-06-23); score the 4 gates; **greenlight decision** + cost projection | No DB | artifacts in harness `artifacts/`; new `feat/c02-pilot` branch (P1's `feat/c02-harness` is merged) |
| **P3** | Full run + apply | Winning model over ~700 → staging + diff + user spot-check; **one migration**: snapshot → dual-write column + JSONB → idempotent → `.sql.rollback`; **NO CHECK yet** | **migration** | **highest risk**; snapshot + `.sql.rollback`; GATE 2 |
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

## P2 — Pilot

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

## P3 — Full run + apply migration

**Branch:** `feat/c02-apply` · **migration (highest risk).**

**GATE 2 Codex** on the SQL before TEST. Invoke the `database-migrations` skill before touching `supabase/migrations/`.

**Pre-flight reads:** `prepare-apply.ts` (snapshot DDL/INSERT L490-529, `applyUpdate` dual-write **L540-582**); `supabase/migrations/20260617000000_pr6c2_retag_apply.sql` (snapshot table DDL L69, INSERT…ON CONFLICT DO NOTHING L96-99); `supabase/migrations/20260622000000_wave4_pr1_*` + its `.sql.rollback` (the sibling-file rollback style); `20260519000000_*tags_side_channel.sql` (dual-write JSONB 166/168 + column 376/386); `20260618000000_search_vector_add_sel.sql` (main_ingredients B-weight :62, cooking_skills C-weight :67, trigger fires on `UPDATE OF` both columns L86-89).

**3.1 — Full run.** Run the winning model over all live lessons (`retired_at IS NULL`) → staging JSONL → `generate-diff-report` → **user spot-check** the diff (esp. floored rows via the `normalizationCount` edge-case bucket). **Freeze the manifest now:** add any genuinely-missing high-frequency food the run surfaces to `c02-vocab.json` and re-run if added; after this point the value set is closed.

**3.2 — Apply migration (GENERATE, don't hand-write the SQL — GATE-1B).** Run `prepare-apply.ts` — it already emits the snapshot DDL/INSERT + per-lesson dual-write UPDATE **generically from `FLAT_FIELDS`** (which auto-includes the two new fields once they're in `MAIN_PASS_FIELDS`) AND **escapes SQL literals** via its `sqlTextArrayLiteral`/`sqlJsonbLiteral` helpers, removing the apostrophe/ampersand hazard for Title-Case values like `Sautéing & stir-frying`. Then ADAPT the generated draft into the reviewed migration `supabase/migrations/<YYYYMMDDHHMMSS>_c02_retag_apply.sql` (prefix sorts AFTER the latest — `ls supabase/migrations | sort | tail -3` first; ASCII gotcha): (a) rename the snapshot table `pr6_retag_rollback`→`public.c02_retag_rollback` (RLS-enabled, no policies); (b) keep snapshot-`INSERT … ON CONFLICT DO NOTHING` **BEFORE any UPDATE**; (c) confirm absolute full-replace dual-write (typed `text[]` column AND camelCase `metadata` jsonb_set `cookingSkills`/`mainIngredients`), **no** grade-style guard (these two are authoritatively rewritten); (d) **NO CHECK** (Q9); (e) **replace** the generator's PR-6 in-migration comment-block rollback with a sibling `*.sql.rollback` (Wave-4 style): one idempotent `DO` block restoring column+metadata FROM `c02_retag_rollback`. **GATE 2 Codex** on the final SQL (idempotency, snapshot-before-update ordering, column↔JSONB lockstep, escaping, rollback completeness).
   - *Commit:* `feat(c02): apply migration — snapshot + dual-write canonical retag, no CHECK (P3.2)`

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
