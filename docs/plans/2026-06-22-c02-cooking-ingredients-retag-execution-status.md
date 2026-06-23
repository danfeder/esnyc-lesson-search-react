# C02 — Cooking Skills & Main Ingredients Re-tag — Execution Status

**Last updated:** 2026-06-23 by Session 1 (design lock — §4 locked, tasks authored, GATE 1B folded)

## Current State

**Active PR:** none. **Branch strategy (user, 2026-06-23):** `feat/c02-harness` was branched off `chore/c02-scaffold` carrying both planning commits (`2fb3bb6` scaffold + `8834ec6` design lock) — the **planning docs ship inside the P1 PR**, no separate docs PR. Nothing pushed yet.

**Current task:** **P1.1 + P1.2 COMPLETE + supervisor-verified.** Next: **P1.3** — deterministic alias-floor + parent-reconcile normalize rules in `normalize.ts`: `R7 cookingSkillsAliasFloor` + `R8 mainIngredientsAliasFloor` (load `c02-alias-map.json`; overwrite each tag that is an alias key with its canonical) + `R9 ingredientParentReconcile` (for every emitted specific, APPEND its parent group if absent — never drop; **no-op for the 4 null-parents; DOES append `Squash, cucumbers & melons` for Melons**). Register in `NORMALIZATION_RULES` + as `applyXxx` calls in `normalizeRecordInput` (existing R1/R6/R4/R5 ~L190-193; only load-bearing order = R7/R8 floor BEFORE R9 reconcile). TDD: alias fold + **idempotent** (re-run = fixed point), parent-reconcile appends, never removes a meaningful specific, R9 no-op for the 4 null-parents, groups-never-alias-keys. **P1.1 already proved the idempotency precondition** (0 transitive chains, 0 canonical-as-key) so R7/R8 are a single-pass fixed point. Reuse the bespoke loader exports from P1.2 (`loadC02Manifest`, `c02IngredientParentMap`) — don't duplicate.

**⚠️ LOCK CORRECTION (Session 2, 2026-06-23, user-confirmed via AskUserQuestion):** the §4 Q1 manifest count was wrong — **main_ingredients = 24 groups + 46 specifics = 70 values** (was 43/67; the "34 worksheet" arithmetic dropped the 3 always-available extras Celery/Fennel/Melons). And **Melons is parented under "Squash, cucumbers & melons"** (was group-less) → **exactly 4 null-parent specifics** (Celery, Fennel, Seaweed (nori), Cocoa & chocolate). All 4 docs + the census §2c table/NOTE corrected. Total canonical = 23 cooking + 70 ingredients = 93.

**Branch:** `feat/c02-harness` (off `chore/c02-scaffold` @ `8834ec6`). Landed: P1.1 (`83da03f` + `e5fed38`), lock-correction docs (`f619a66`), **P1.2 (`18b3ebc`)**. P1.3–P1.6 next. The P1 PR (→ main) bundles the 2 planning commits + lock-correction docs + all P1 implementation commits.

**What Session 1 produced:** design `Status: LOCKED` (all 11 §4 questions resolved via a 6-agent discovery fan-out + 4 user verdicts, every anchor re-verified); impl plan concrete P1.1–P4b.1 tasks authored; `docs/plans/c02-session1-discovery/q1-vocab-census.md` (provisional manifest, reconciled to the locks); GATE 1B (Codex + Claude) run + all findings folded.

**The locks (carry forward):** Q2 flat `string[]` + parent-map superRefine · Q3 alias-floor + parent-reconcile R-rules in `normalize.ts` · Q4 3-layer strata + size **70** · Q5 4 gates over the **existing** `evalMetrics` precision/fp (NOT new metric math) · Q6 independent hard-case 2nd-pass gold key · Q7 harness R-rule + Zod superRefine, **no DB trigger** · Q8 Title-Case `value===label` · Q9 P3→P4a→P4b expand/contract (never bundle) · Q10 P-branch map · Q11 Opus-4.8-vs-Sonnet-4.6 bake-off (Sonnet wins ties). **Q1 vocab:** 23 cooking_skills + **70 provisional main_ingredients** (24 groups + 46 specifics incl. 4 pre-added Apples/Coconut/Oranges/Lime); **B-lite pantry** (Sugar→Sweeteners; drop Salt/Oil/Soy sauce); **freeze at end of P3**.

**Live census correction:** PROD 2026-06-23 = **121 distinct cooking_skills / 202 main_ingredients** (design §1's 122/230 was stale).

**Pre-next-PR verification (if any):** none (no DB until P3). P1 is scripts-only, git-revert reversible.

**P1-close cleanups (deferred, do once before the P1 PR):** (1) **stale field-count comments** — after P1.2 added 2 fields, `MAIN_PASS_FIELDS`=14 / properties=15, but source comments at `schema.ts:12,86,429`, `vocab.ts:4,66,221`, `run-retag.ts:662`, `sample-answer-key.ts:66,421` still say "12 fields"/"13 properties" (comments only, zero behavior impact — all real counts computed at runtime). Bump to 14/15 in one sweep (mind the nuance: "main-pass"=14, "required properties"=15, "column-backed"=13 since academic_concepts has no column). Verifier-flagged LOW, P1.2.

**Gate provenance:** GATE 1A folded into the design 2026-06-22 (Codex + Claude). **GATE 1B folded 2026-06-23** — Codex (codex-rescue) + Claude reviewer in parallel on the authored impl plan; both converged on a HIGH (manifest said 63 values vs the locked 67) + a Codex HIGH (P4b rollback under-specified). All findings folded: manifest reconciled to 67/43 + the 4 pre-added foods given parents; P3.2 reframed to GENERATE via the `prepare-apply` generator (its `sqlTextArrayLiteral` escaping kills the apostrophe/ampersand hazard) rather than hand-author; P1.2 names both hand-listed `schema.ts` sites; P1.3 adds R9 idempotency + null-parent tests; P4b conditional snapshot-restore; §7 "apply migration"→"P4b CHECK migration"; comment double-cite split; rules-baseline-has-no-loader note; P2-table cleanup. Both reviewers confirmed every code anchor accurate.

## Recent decisions worth carrying forward

- **Method = hybrid-floor full LLM re-read** (decided in the 2026-06-22 scoping discussion + a Codex cross-exam): LLM reads every lesson; deterministic alias-map floor anchors the ~94% clean core; LLM does the judgment work. NOT rules-only (can't add specifics), NOT blind full-LLM (regresses the core).
- **Prior $121 fable run produced ZERO output for these two fields** (verified) — no reusable work; fable-5 is suspended, so the pilot re-runs an Opus-vs-Sonnet bake-off.
- **Vocab amendments (user, 2026-06-22):** +Seaweed (nori), +Cocoa & chocolate (group-less specifics), +Sunflower butter/Tahini/Peanut butter (under Nuts & seeds); Hummus→Chickpeas remap; Frying→Sautéing & stir-frying. Solo sign-off (no curriculum-team round).
- **Pilot gold key = AI-drafts-user-adjudicates** + an independent hard-case protocol; greenlit on 4 separate gates, not a macro score.
- **Enforcement = expand/contract** (P3 data → P4a frontend deploy → P4b CHECK), mirroring `garden_skills`.

## Done

- **Session 0 (2026-06-22):** four-file scaffold + GATE 1A.
- **Session 1 (2026-06-23):** §4 design lock (all 11 Q's), impl-plan tasks P1.1–P4b.1 authored, GATE 1B run + folded, Q1 manifest reconciled. Design `Status: LOCKED`.
- **Session 2 (2026-06-23):** lock correction (43→46 / Melons parent, user-confirmed) + **P1.1 done** — `c02-vocab.json` (23/24/46) + `c02-alias-map.json` (184 folds + drops) + `c02-vocab.test.ts` (18 tests). Executor→adversarial-verifier workflow; supervisor-verified (independent idempotency + count probes + test re-run + 2 MED review fixes folded).
- **Session 2 (2026-06-23):** **P1.2 done** (`18b3ebc`) — both fields wired into `vocab.ts` (MAIN_PASS_FIELDS + 2 FieldVocab + bespoke `loadC02Manifest`/`c02IngredientParentMap`), `schema.ts` (both hand-listed sites + main_ingredients `superRefine` + `Stage2RetagResult`), emitter prompt. Verifier `pass-with-findings` (mutation-tested 3 mutants; runtime-traced superRefine reject/accept; grepped all MAIN_PASS_FIELDS consumers = no missed site). Supervisor-verified independently. Only finding = LOW stale comment counts (deferred to P1-close sweep).

## In flight

(none)

## Blocked

(none — user-approval gates for the pilot greenlight and PROD migrations are EXPECTED, not blockers)

## Decisions made during execution

**Session 1 (2026-06-23) — §4 locks.** User verdicts (AskUserQuestion, all came back on the recommended option): pantry **B-lite**; pilot size **70**; invariant mechanism **B** (R-rule + superRefine, no DB trigger); freeze-candidates **pre-add the 4 high-count** (Apples/Coconut/Oranges/Lime). Evidence-locked: Q2 flat string[]; Q3 normalize R-rules; Q5 gates ③④ are plumbing over existing `evalMetrics` (supervisor-verified — corrects the design's "new metric families" framing); Q8 Title-Case value===label; Q11 bake-off mechanism. Ratified recommendations (presented, no pushback): Q1 freeze-after-P3 + 67-value roster; Q5 thresholds (①strict ②+0.05 both-fields ③0.7/5% ④0.8, re-tunable at pilot); Q6 independent 2nd-pass; Q9 Option-A choreography; Q10 P-branch/artifact map. Full rationale in design §4.

## Out-of-scope follow-ups captured here

(for the project memory after the initiative ships — seed list from design §10)
- Embeddings regeneration (rebuild's C2.4) — own session; relates to `project_embedding_pipeline_mismatch`.
- Filter-UI surfacing of the two ingredient tiers (group vs. specific in the public menu).
- A hard "1–3 specifics" cap (deliberately left as guidance).
- A DB trigger for the specific→group invariant (leaning app-layer only).
- Drop the retained C02 snapshot table(s) in a future cleanup once PROD-stable.

## Pointers to durable context

- Kickoff prompt: `2026-06-22-c02-cooking-ingredients-retag-kickoff.md`
- Design doc: `2026-06-22-c02-cooking-ingredients-retag-design.md` (LOCKED decisions + §4 open questions)
- Implementation plan: `2026-06-22-c02-cooking-ingredients-retag-implementation.md` (SKELETON until Session 1)
- Worksheet (decided vocab): `2026-06-12-metadata-rebuild-stage1-cooking-skills-ingredients-worksheet-decided.md`
- **Provisional canonical manifest (Session 1):** `docs/plans/c02-session1-discovery/q1-vocab-census.md` (census + 67-value set + parent map — the byte-source for P1.1's `c02-vocab.json`)
- Harness: `scripts/stage2-retag/`
- Archive: `2026-06-22-c02-cooking-ingredients-retag-execution-status-archive.md` (created when needed)

## Recent session log

### Session 0 — 2026-06-22 — scoping discussion + four-file scaffold

Major events:
- Scoped C02 in a discussion session: grounded the state (read-only fan-out + PROD census + a Codex method cross-exam), reached all the decisions (method, vocab amendments, pilot gates, enforcement, data-safety), then scaffolded via `/kickoff-feature` in **design-lock mode**.
- Authored the four files; **GATE 1A folded** into the design doc (Codex + Claude). Next: `/clear` → paste the kickoff → Session 1 = design lock.

### Session 1 — 2026-06-23 — design lock + task authoring + GATE 1B

Major events:
- Ran a 6-agent read-only discovery **Workflow** grounding all 11 §4 questions against current code (re-verified every anchor; one agent ran a live PROD census + wrote `q1-vocab-census.md`). Supervisor-verified the load-bearing Q5 correction myself (`evalMetrics.ts` already exposes per-value precision/fp).
- Brought the 4 highest-value user-verdicts (pantry, pilot size, invariant mechanism, freeze-candidates) via AskUserQuestion — all returned on the recommended option; ratify-list accepted without pushback.
- Locked all 11 §4 questions inline + flipped design Status → **LOCKED**; fixed §1 census (122/230→121/202) + §5/§6/§7 consistency.
- Authored concrete impl-plan tasks **P1.1–P4b.1** (anchors, tests, verify cmds, commit msgs).
- GATE 1B: Codex + Claude in parallel; both converged on the manifest 63-vs-67 HIGH + Codex's P4b-rollback HIGH; **all findings folded**; both confirmed every code anchor accurate.

Learnings (candidates to promote):
- `prepare-apply.ts` already dual-writes column+JSONB generically from `FLAT_FIELDS` **and escapes SQL literals** — GENERATE the P3 migration draft, don't hand-author (kills the apostrophe/ampersand quoting hazard for Title-Case values).
- `scripts/lib/evalMetrics.ts` already carries the false-positive primitives — the design's "new metric families" framing was wrong; gates ③④ are pure wiring.
- Discovery flagged real census drift (main_ingredients 230→202) — always re-census live before authoring vocab tasks.

Next: Session 2 = P1 implementation (branch `feat/c02-harness`, P1.1 first, TDD).

### Session 2 — 2026-06-23 — lock correction + P1.1 (vocab manifest + alias-floor)

Major events:
- Ran P1.1 as an **executor→adversarial-verifier Workflow** (ultracode). Run #1 **blocked correctly**: the executor caught that the locked manifest's "43 specifics" contradicts the census §2c table (46 rows) — the "34 worksheet" arithmetic dropped the 3 always-available extras. No artifact committed; tree left pristine.
- Supervisor independently verified against the worksheet (header literally reads "starter 34 + always-available extras") + found a **second** error: Melons was group-less in the lock but the worksheet parents it under "Squash, cucumbers & melons" (3× stated, "discoverable home" rationale). Brought both to the user via **AskUserQuestion** → both confirmed on the recommended option (46/70; Melons parented → 4 null-parents).
- Corrected the lock across all 4 scaffold docs + census §2c table/NOTE; updated the workflow script (executor + verifier prompts) to bake in the adjudication.
- Run #2 **complete**: `83da03f` (`c02-vocab.json` 23/24/46 + `c02-alias-map.json` 178 folds + `c02-vocab.test.ts` 17 tests). Verifier verdict **pass-with-findings** — value-set/parent-map/idempotency PASS (mutation-tested the test with 4 planted mutants, all caught); 2 MED alias under-folds (`rice` dropped; Seeds/Nuts family uncovered vs floored Legumes/Citrus).
- Supervisor main-loop verify: independent jq probes (counts, Melons parent, no Salt/Oil/Soy/Sugar literal, 0 transitive chains, 0 canonical-as-key) + re-ran the test (17/17). Folded both MED fixes → `e5fed38` (rice + Seeds/Nuts→Nuts & seeds + provenance note documenting the near-synonym-vs-exact-group-name floor line + a positive §4c-twin test). Final: 184 folds, 18 tests, full suite 73 files/1464 tests green, `npm run check` clean.

Learnings (candidates to promote):
- **Executor "stop-and-report" on a locked-spec contradiction is load-bearing** — the blocked run prevented building a wrong byte-source that propagates to Zod + DB CHECK. The supervisor-surfaced 2nd error (Melons) shows: when one lock-error is found, re-derive the whole neighborhood from the authoritative source before re-dispatching.
- **The worksheet > the discovery census** when they conflict — the census §2c was a transcription of the worksheet and carried 2 errors; the worksheet (the decided source) is authoritative.
- Verifier **mutation-testing the test file** (planting mutants to prove non-vacuity) is a strong adversarial pattern worth reusing for TDD-task verification.

**P1.2 (same session, `18b3ebc`):** dispatched a 2nd executor→verifier Workflow. Executor wired both fields in cleanly (bespoke `loadC02Manifest`/`c02MainIngredientsValues`/`c02IngredientParentMap` in `vocab.ts`; both hand-listed `schema.ts` sites; a `mainIngredientsSchema()` helper carrying the orphan-specific `superRefine` attached to main_ingredients only, error-path attributed to `main_ingredients` so the repair pass re-prompts the right field; prompt sections matching the `^### <field>` extractor regex; `schema.test.ts:298` unknown-key probe swapped to a genuinely out-of-schema key). Collateral test-count + fixture conformance (the locked Q2 auto-propagation grows field counts 12→14). Verifier `pass-with-findings`: every audit PASS (schema-gen both sites, superRefine reject/accept runtime-traced, flat cooking enum, no missed consumer site, bespoke loader 70/23, prompt 4/4 guidance, tests mutation-confirmed via 3 planted mutants); sole finding = LOW stale source-comment counts (tracked → P1-close sweep). Supervisor main-loop verify: `git show --stat`, grepped both schema sites for both fields, fixture-record count (3 = zod-passing only), re-ran the P1.2 test (18/18) + `npm run check` (clean) + harness suite (538) myself. Accepted; no fix-up needed.

Learnings (P1.2):
- The locked Q2 "auto-propagates through tool/Zod/repair/validate/score" is real but **the two `schema.ts` hand-listed sites are the exception** (GATE-1B was right) — and adding fields legitimately ripples into ~5 downstream test count-assertions + a fixture. That collateral is faithful conformance, not scope creep; verify it's faithful (the verifier grepped every consumer + confirmed the fixture only touched zod-passing records).
- `superRefine` error-path attribution (`addIssue({path:[]})` → object prefixes the field key) is load-bearing for the repair pipeline routing — not in the plan but the executor caught + verified it. Worth knowing for P4a's Zod superRefines.

Next: **P1.3** (alias-floor + parent-reconcile normalize rules, TDD) — see Current State header for the full spec.
