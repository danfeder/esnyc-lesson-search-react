# C02 — Cooking Skills & Main Ingredients Re-tag — Execution Status ARCHIVE

> Frozen detail moved out of the live execution-status file to keep its Current State header lean. Read on demand via `grep -n`, **not** at session start. The live status file is `2026-06-22-c02-cooking-ingredients-retag-execution-status.md`.

---

## PR cycle 1 — P1 harness (`feat/c02-harness`) — Sessions 0–5

### Per-task as-built detail (P1.1–P1.6)

**P1.1 (`83da03f` + review fix-up `e5fed38`) — vocab manifest + alias-floor maps.** `c02-vocab.json` (23 cooking_skills / 24 groups / 46 specifics) + `c02-alias-map.json` (started 178 folds → 184 after the rice + Seeds/Nuts→Nuts & seeds near-synonym folds) + `c02-vocab.test.ts` (18 tests). Value-set / parent-map / idempotency mutation-tested. jq probes: counts, Melons parent, no Salt/Oil/Soy/Sugar literal, 0 transitive chains, 0 canonical-as-key.

**P1.2 (`18b3ebc`) — both fields in harness output.** Wired into `vocab.ts` (MAIN_PASS_FIELDS + 2 FieldVocab + bespoke `loadC02Manifest`/`c02MainIngredientsValues`/`c02IngredientParentMap`), `schema.ts` (both hand-listed sites + `mainIngredientsSchema()` orphan-specific `superRefine` attributed to `main_ingredients` for repair routing + `Stage2RetagResult`), the emitter prompt (4 `^### <field>` guidance sections). Collateral: field counts 12→14 ripple through ~5 downstream test count-assertions + the fixture. Verifier `pass-with-findings`; sole finding = LOW stale source-comment counts (→ swept in P1-close, Session 5).

**P1.3 (`272ee1a` + supervisor fix-up `3ddbdfc`) — alias-floor + parent-reconcile normalize rules.** `normalize.ts` gained R7 `cookingSkillsAliasFloor` + R8 `mainIngredientsAliasFloor` + R9 `ingredientParentReconcile`, registered after R1/R6/R4/R5 (R7/R8 strictly before R9). Alias + parent maps loaded once via memoized `loadC02Floor` singleton (Zod-validated; throws on an orphan canonical). The 184-key combined map split into `cookingFolds`/`ingredientFolds` by canonical-membership (clean partition, 0 cross-field) so R7/R8 are field-scoped. **Supervisor fix-up `3ddbdfc`:** the executor's positional-overwrite emitted a *duplicate* when two aliases fold to one canonical (Chopping+Dicing→Knife skills); its rationale "consumers de-dupe downstream" was FALSE — traced `normalizeRecordInput`→`validateRawInput`→`resultSchema.safeParse`, `uniqueEnumArray` uses `.refine(noDuplicates)` → REJECTS → kicks the row to repair. Fixed to de-dupe (first-occurrence). 37 normalize tests.

**Floor case-robustness fix-up (`397ed77`).** R7/R8 now match alias keys case-insensitively + trimmed via exported `matchKey(s) = s.normalize('NFC').trim().toLowerCase()` (NO diacritic/punct folding — out of scope). New exported pure `buildC02Floor(aliasMap, manifest)` builds field-scoped `Map<matchKey, canonical>` from (a) alias entries (partitioned by target field) AND (b) every canonical value at its own matchKey (the **canonical-case rule**). An `insert()` build-time collision guard THROWS on a matchKey mapping to two different canonicals. Fixed a real P1.1 bug: bare `Mixing` (180 lessons) never folded to `Mixing & stirring` though its lowercase twin did. +3 plural/synonym keys (`Avocados`, `Sun butter`/`Sunbutter`) → alias map 187 folds. +17 tests. Supervisor-verified: 0 collisions on 187-key data.

**P1.4 (`05a3b437`) — export/diff/validate plumbing.** Confirm-no-gap: both fields already flow through `export-corpus.ts` (`COLUMN_FIELDS`), `generate-diff-report.ts` (`FLAT_FIELDS` + `parseCorpusRecords` + `buildDiffReport`), and field-agnostic `validate-output.ts`, all via `MAIN_PASS_FIELDS`-derived seams. Only production change = behavior-preserving extraction of `buildCorpusRecord(row, body)` so export round-trips are unit-testable without a DB. +10 tests. Fixed two stale "11 fields"→13 comments (export-corpus:213, generate-diff-report:143).

**P1.5 (`4b910a8`) — 3-layer set-cover sampler.** New C02 sampler in `sample-answer-key.ts` (size 70, deterministic; Protocol-A `run()` untouched). `predictMembership(record)` reuses the REAL floor (`loadC02Floor` newly exported) ∪ a committed `data/c02-coverage-keywords.json` body-keyword augment (22 patterns incl. the 7 grounding-required). 3 layers: hard-case (cap 20; vague-cooking / herbs-aromatics / orphan-food) → deterministic greedy set-cover hitting EVERY one of the 93 canonical values ≥2× → clean-core `activity_type×quartile` fill to exactly 70. HARD ≥2× guarantee + a defensive `WARN <2 achievable candidates` log. +18 synthetic-fixture tests. Supervisor independently verified via a from-scratch 92-lesson synthetic corpus → 70 selected (12+38+20), all 93 ≥2×, 0 warnings, determinism confirmed.

**P1.6 (`14762c5` + review fix-up `8c60430`) — 4-gate scoring + rules baseline (closes P1).** Additive `c02-gates.ts` (13-field `evaluateGates`/`scoreContestant` UNTOUCHED; `score-answer-key.ts` gains a `--c02` CLI mode). `evaluateC02Gates(winner, rules, key, corpus)` over the 2 fields: ①clean-core no-regression (winner per-field micro-F1 ≥ rules, strict) ②judgment-rows +0.05 both-fields, tie fails ③46-specifics pooled precision ≥0.7 + never-in-key ≤5% ④Sweeteners precision ≥0.8 + no Salt/Oil/Soy-sauce literal survives. `computeRulesBaseline(corpus)` runs the REAL floor over current tags (gate ② reads this, not v3). Seeded bootstrap CI on the gate-② delta (informational). +22 tests. **Supervisor-caught LOW (`8c60430`):** gate-② `delta >= 0.05` spuriously failed a mathematically-exact +0.05 (IEEE-754 renders 0.0499…93); fixed via `gate2DeltaPasses()` with a 1e-9 epsilon (tie still fails). TDD red→green.

### Lock correction (Session 2, 2026-06-23, user-confirmed)

The §4 Q1 manifest count was wrong — **main_ingredients = 24 groups + 46 specifics = 70 values** (was 43/67; the "34 worksheet" arithmetic dropped the 3 always-available extras Celery/Fennel/Melons). And **Melons is parented under "Squash, cucumbers & melons"** (was group-less) → **exactly 4 null-parent specifics** (Celery, Fennel, Seaweed (nori), Cocoa & chocolate). All 4 docs + the census §2c table/NOTE corrected. Total canonical = 23 cooking + 70 ingredients = 93.

### GATE provenance (P1)

- **GATE 1A** folded into the design 2026-06-22 (Codex + Claude).
- **GATE 1B** folded 2026-06-23 — Codex (codex-rescue) + Claude reviewer in parallel on the authored impl plan; both converged on a HIGH (manifest 63 vs locked 67) + a Codex HIGH (P4b rollback under-specified). All folded: manifest reconciled to 67/43 + the 4 pre-added foods given parents; P3.2 reframed to GENERATE via `prepare-apply`'s `sqlTextArrayLiteral` escaping; P1.2 names both hand-listed `schema.ts` sites; P1.3 adds R9 idempotency + null-parent tests; P4b conditional snapshot-restore. Both reviewers confirmed every code anchor accurate.
- **P1 PR pre-push review (Session 5)** — superpowers code-reviewer + GATE 3 Codex in parallel on `git diff main...HEAD`. Both: no HIGH/MED. 3 LOW + 1 Codex MED triaged + folded (see Session 5 log).

---

## Recent session log (PR cycle 1, archived)

### Session 0 — 2026-06-22 — scoping discussion + four-file scaffold

- Scoped C02: grounded the state (read-only fan-out + PROD census + a Codex method cross-exam), reached all decisions (method, vocab amendments, pilot gates, enforcement, data-safety), then scaffolded via `/kickoff-feature` in design-lock mode.
- Authored the four files; **GATE 1A folded** into the design doc (Codex + Claude).

### Session 1 — 2026-06-23 — design lock + task authoring + GATE 1B

- Ran a 6-agent read-only discovery Workflow grounding all 11 §4 questions against current code (re-verified every anchor; one agent ran a live PROD census + wrote `q1-vocab-census.md`). Supervisor-verified the load-bearing Q5 correction (`evalMetrics.ts` already exposes per-value precision/fp).
- Brought the 4 highest-value user-verdicts (pantry, pilot size, invariant mechanism, freeze-candidates) via AskUserQuestion — all returned on the recommended option.
- Locked all 11 §4 questions inline + flipped design Status → LOCKED; fixed §1 census (122/230→121/202).
- Authored concrete impl-plan tasks P1.1–P4b.1. GATE 1B run + all findings folded.

Learnings (promoted/aligned):
- `prepare-apply.ts` already dual-writes column+JSONB generically from `FLAT_FIELDS` **and escapes SQL literals** — GENERATE the P3 migration draft, don't hand-author.
- `scripts/lib/evalMetrics.ts` already carries the false-positive primitives — gates ③④ are pure wiring, not new metric math.
- Discovery flagged real census drift (main_ingredients 230→202) — always re-census live before authoring vocab tasks.

### Session 2 — 2026-06-23 — lock correction + P1.1 + P1.2

- Ran P1.1 as an executor→adversarial-verifier Workflow. Run #1 **blocked correctly** (executor caught the locked "43 specifics" vs census 46-row contradiction; no artifact committed). Supervisor independently found a **second** error (Melons mis-parented); brought both to the user via AskUserQuestion → both confirmed (46/70; Melons parented → 4 null-parents). Corrected across all 4 docs + census. Run #2 complete (`83da03f`); folded 2 MED alias under-folds → `e5fed38`.
- **P1.2** (`18b3ebc`): 2nd executor→verifier Workflow; both fields wired in cleanly. Supervisor re-ran tests + check independently. Sole finding = LOW stale comments.

Learnings (promoted/aligned):
- Executor "stop-and-report" on a locked-spec contradiction is load-bearing — prevented building a wrong byte-source. When one lock-error is found, re-derive the whole neighborhood from the authoritative source.
- The worksheet > the discovery census when they conflict (the census transcription carried the 2 errors).
- Verifier mutation-testing the test file (planting mutants to prove non-vacuity) is a strong adversarial pattern.

### Session 3 — 2026-06-23 — P1.3

- Ran P1.3 as an executor→adversarial-verifier Workflow. Executor (`272ee1a`) TDD'd R7/R8/R9. Verifier `pass` (6 mutants caught).
- **Supervisor main-loop verify caught a defect the verifier missed** → fix-up `3ddbdfc` (positional-overwrite duplicate vs `uniqueEnumArray` reject; traced the full data-flow into the Zod refinement).

Learnings (promoted/aligned):
- A tested wrong-rationale survives an adversarial verifier — supervisor end-to-end data-flow tracing is the gate that caught it. Reinforces `feedback_workflow_orchestration`: main-loop verify is load-bearing, not ceremonial.
- Enum-constrained LLM output narrows but doesn't eliminate a floor bug's blast radius — the P1.6 rules-baseline runs the same floor over raw corpus values where collisions are guaranteed.

### Session 4 — 2026-06-23 — P1.5 grounding + floor case-robustness fix-up + P1.5 + P1.6

- **P1.5 grounding** (read-only analyst): confirmed ≥2× coverage universally achievable for all 93 values under `floor ∪ keyword` (empty hard tail). Surfaced the on-disk corpus lacks the 2 fields (P2 regen concern).
- **Discovered + fixed a real P1.1 bug:** case-sensitive floor matching missed bare `Mixing` (180 lessons). User chose to fix systemically; supervisor pre-verified case-insensitive matching provably safe (0 collisions); executor→verifier Workflow shipped `397ed77`.
- **P1.5** (`4b910a8`): 3-layer set-cover sampler. Supervisor independently verified via a from-scratch synthetic corpus.
- **P1.6** (`14762c5` + `8c60430`): 4-gate scoring + rules baseline (closes P1). Supervisor investigated the verifier's "benign LOW" → confirmed a real false-negative → fixed TDD.

Learnings (promoted/aligned):
- A grounding pass before the heaviest task pays for itself — de-risked the set-cover AND surfaced an unrelated 180-lesson floor bug.
- Case-sensitive deterministic matching is a latent trap — normalize match-keys + bake collision-safety into machine-checked invariants.
- A verifier's "benign LOW" still deserves the rebuttal pass (`feedback_bot_review_investigation`). Float-`>=` on a derived ratio is a latent footgun — extract a named epsilon-tolerant predicate.
