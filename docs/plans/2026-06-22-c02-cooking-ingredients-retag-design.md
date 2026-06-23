# C02 — Cooking Skills & Main Ingredients Re-tag — Design Document

**Date:** 2026-06-22
**Status:** **Draft — strategy + decisions LOCKED; mechanism questions open (see §4); Session 1 is a design-lock session that locks §4 against the real harness code, then authors the impl plan's concrete tasks. NO implementation code until §4 is locked.**
**Review:** GATE A adversarial review (Codex cross-family + a Claude anchor-verify agent, 2026-06-22) folded — 2 HIGH (close the vocab into a byte-identical manifest; PROD expand/contract deploy choreography) + ~11 MED/LOW; anchors corrected against current code.
**Related:**
- Discussion kickoff: `docs/plans/2026-06-22-c02-vocab-retag-discussion-kickoff.md`
- Decided vocabulary worksheet: `docs/plans/2026-06-12-metadata-rebuild-stage1-cooking-skills-ingredients-worksheet-decided.md`
- Wave-4 carry-forward findings: `docs/plans/2026-06-22-wave4-data-corpus-cleanup-design.md` §3.1 / §4 Q11–14a / §8
- Re-tag harness: `scripts/stage2-retag/` (export → normalize → run-retag → validate → diff → apply + answer-key scoring)
- Memory: `project_metadata_rebuild_initiative` ("PR F" definition), `project_deferred_work_campaign`, `feedback_data_safety_top_priority`, `feedback_per_round_test_db_verification`, `feedback_codex_over_crossexamine`, `feedback_multi_session_execution`

> **Provenance of the file:line anchors below:** captured 2026-06-22 from a read-only grounding pass (3 agents) + a PROD read-only census + a Codex cross-exam. Line numbers may have drifted; **Session 1 verifies every anchor against current code before authoring tasks.**

---

## 1. Why this exists

The 2026 "metadata rebuild" canonicalized every lesson-metadata field except two — `cooking_skills` and `main_ingredients` — which were deliberately carved out as the rebuild's deferred **"PR F"** (the two largest, messiest vocabularies). C02 is that second pass. As of 2026-06-22 (PROD, `retired_at IS NULL`): **`cooking_skills` = 122 distinct values across 435 lessons** (1,758 appearances); **`main_ingredients` = 230 distinct across 430 lessons** (1,847 appearances) — versus the rebuilt `cultural_heritage` at ~70. The sprawl is years of free-form reviewer entry with no enforcement.

**A grounding pass settled the central reframing** (it is *not* a SQL value-rename like the rebuild's 5a/5b migrations):
- The prior ~$121 fable-5 re-tag run (rebuild PR 6, `20260617000000_pr6c2_retag_apply.sql`) **produced ZERO output for these two fields** — they were excluded from the harness schema, prompt, vocab, corpus input, and apply migration. There is **no reusable model output**; whatever method we pick is fresh work. ("The dry-run was shippable" is true only for the *other* 12 fields.)
- By volume, a deterministic find-and-replace built from the worksheet's alias map covers **~94% of `cooking_skills` appearances and ~92% of `main_ingredients` appearances**. But rules can only *re-label* existing tags — they cannot realize the worksheet's design: the **two-level "starred specifics" tier is largely unpopulated** in legacy data (must be *added* by reading), the old **`Herbs & Aromatics`** catch-all (48 lessons) conflates two new groups (Fresh herbs vs Alliums) and can't be split without reading, and the vague tags (`Basic Skills`, `Cooking Techniques`) must be *replaced by the real skill taught*.
- All three reviewer write-surfaces are **unguarded** for these two fields (free-form `CreatableSelect`, open `z.array(z.string())`, no DB CHECK) — so any clean-up re-pollutes immediately unless enforcement ships with it. `garden_skills` is the already-shipped closed-loop template.

This is therefore a **content re-tag + an enforcement lockdown**, done via the proven `scripts/stage2-retag/` harness, in its own multi-session track.

## 2. Goals & constraints

1. **Clean *and* complete, not just consistent.** Canonicalize both fields to the decided vocabulary AND realize the worksheet's intent — replace vague cooking tags with real skills, split conflated ingredient groups, add the 1–3 starred specifics, drop cosmetic/craft noise. Consistency alone (rules-only) is explicitly insufficient (it leaves the two-level tier empty).
2. **Don't regress the clean core.** The worksheet's alias map already gets ~92–94% right; the re-tag must not *lose* correct-but-clean tags to LLM drift. A deterministic floor protects them.
3. **Prove quality before paying for the full run.** A pilot on a hand-adjudicated gold subset must clear explicit, *separate* gates before the full-corpus run is greenlit.
4. **Lock the surfaces so it can't re-pollute.** Close both fields end-to-end (dropdown + Zod enum + DB CHECK), mirroring `garden_skills` — *after* the data is canonical, and shipped so reviewers never hit save failures.
5. **Data safety supersedes velocity** (`feedback_data_safety_top_priority`). 3-tier local→TEST→PROD-with-approval; snapshot-before-mutate; the apply is a reviewed, idempotent migration with `.rollback`; dual-write the typed column AND the `metadata` JSONB; touch the corpus once.

## 3. The chosen shape: **hybrid-floor full re-read**

The LLM reads **every** lesson and proposes canonical `cooking_skills` + `main_ingredients` (groups + conditional starred specifics) against the locked vocabulary. A **deterministic alias-map floor** then anchors the clean core: where the worksheet's fold-in map gives an unambiguous canonical value, that value is authoritative and the LLM cannot regress it; the LLM's contribution is *kept* for the judgment work — vague-tag replacement, the `Herbs & Aromatics` split, **adding** starred specifics, and dropping noise. A full read is unavoidable because the two-level specifics can only be *added* by reading each lesson; the floor is a guardrail on that read, not an alternative to it.

`main_ingredients` carries the heavier judgment load; `cooking_skills` is mostly floored (94% deterministic, vocabulary effectively locked).

> **Architecture nuance (lock the precise split in Session 1 / at the pilot gate):** "how much the LLM is trusted vs. the floor overrides" is tuned by the pilot's AI-vs-rules scores. The *default* is floor-first (Codex's "reverse the burden of proof": deterministic on the clean core, LLM on the residual). The pilot may widen LLM coverage only if it demonstrably beats rules without regressing the core.

### Why this shape over the alternatives

| Option | Why rejected |
|---|---|
| **Rules-only (Method 1, deterministic find-and-replace)** | Covers ~92–94% of appearances and is cheap/reversible, but *cannot* add the starred specifics (the whole point of the two-level design), split `Herbs & Aromatics`, replace vague tags with real skills, or drop cosmetic noise — it only re-labels what exists. Leaves the corpus "consistent but not complete," and a later content pass would touch the corpus twice (violates Goal 1 + Constraint 5). |
| **Full-LLM with no deterministic floor** | A blind LLM re-read can *regress* the ~94% clean core that the worksheet alias map already gets right (drop/alter a correct-but-clean tag, hallucinate). Wastes the alias-map work the user already did, and trusts the model on exactly the easy cases where rules are strictly safer. |
| **Per-field method (rules for cooking_skills, LLM for ingredients)** | Reasonable, but the full read needed for ingredients' specifics is the cost driver; `cooking_skills` rides that same read nearly free. Floor-first within one full read subsumes this with less special-casing — and the floor still makes `cooking_skills` ~94% deterministic in practice. |
| **Reuse the PR-6 fable run** | Impossible — the run produced zero output for these two fields (verified). |

## 4. Open design questions — TO LOCK IN SESSION 1

> Session 1 (design-lock) works this list against the real harness/code, writes a locked answer + one-line rationale under each, flips Status to **Locked**, then authors the impl plan's concrete tasks. `[evidence-lockable]` = lock from discovery evidence; `[user-verdict]` = present evidence + recommendation, user decides. **Anchors below corrected per GATE A; still verify against current code before authoring tasks.**

1. **Final canonical VALUES manifest + parent map + open-specifics freeze** `[user-verdict]` (**BLOCKING — GATE A D1/D6/Codex-7**). Materialize ONE committed artifact that the harness enum (Q2), the Zod enums (§7.2), and the DB CHECKs (§7.3) all derive from byte-identically. It must contain: (a) the **exact closed value set** = groups ∪ specifics ∪ any pantry-staple literals; (b) the **specific→group parent map** — `null` parent for the confirmed group-less specifics (worksheet: Celery, Fennel, Melons; C02 additions: Seaweed (nori), Cocoa & chocolate), a concrete parent for every other specific; (c) a decision to **FREEZE** the worksheet's "open to adding further specifics as the re-tag reveals true counts" door (a closed CHECK cannot ship against an open-ended list — re-tag-discovered new foods get added to the manifest *before* the freeze, then it's closed); (d) the **pantry-staple disposition** (Salt / Oil / Soy sauce / Sugar: canonical value, map-to-group e.g. Sugar→Sweeteners, or never-stored — wired to gate ④). This is the prerequisite to half of §4 and to all of §7. <!-- TBD Session 1 -->
2. **Two-level output shape in the harness** `[evidence-lockable]`. How to represent "group tags + conditional 1–3 specifics in one `main_ingredients` value set" in `scripts/stage2-retag/schema.ts` (output/tool schema), the emitter prompt, `vocab.ts` (`MAIN_PASS_FIELDS`), and `validate-output.ts`. NOTE (GATE A/Codex-1): the harness already emits one **structured** field — `academic_concepts` is a subject-keyed object (`schema.ts:411-413`), so structured output is not new ground; the real choice is **flat `string[]` over {groups ∪ specifics} + a parent-map validation refinement** (default) vs. a second structured shape. *Discovery:* `schema.ts:174`, `vocab.ts:36`, `validate-output.ts`, `run-retag.ts`. <!-- TBD Session 1 -->
3. **Deterministic floor mechanism** `[evidence-lockable]`. Where the alias-map floor lives and how it reconciles with LLM output — a new reconcile module vs. extending `normalize.ts` (which already runs deterministic cross-field rules R1/R4/R5/R6) vs. applied in `prepare-apply.ts`. Encodes the worksheet's fold-in map (cooking_skills + main_ingredients aliases) as data. *Discovery:* `normalize.ts`, `prepare-apply.ts` (`ROLLBACK_TABLE`:89, snapshot DDL/INSERT 490-529, `applyUpdate` dual-write 531-582/552-575). <!-- TBD Session 1 -->
4. **Pilot sampling strata + size** — strata `[evidence-lockable]`, **final size `[user-verdict]`** (cost/coverage tradeoff). Extend `sample-answer-key.ts` (today strata = `activity_type × body-length quartile`, ~L243) to **over-sample hard cases** (vague cooking tags, `Herbs & Aromatics`, the orphan foods) **+ cover every group and every canonical specific ≥2×** + a **clean-core slice** (regression detection). Codex flagged ~40–60 too small for 24 groups + ~39 specifics → present ~60–80 as the recommendation; user picks. *Discovery:* `sample-answer-key.ts:4,243`. <!-- TBD Session 1 -->
5. **4-gate scoring — metrics + thresholds** — plumbing `[evidence-lockable]`, **thresholds + gate-② definition `[user-verdict]`** (GATE A D3/D4). Extend `score-answer-key.ts` (today: per-field micro-F1 + per-value recall; singletons informational/non-gating at `SUPPORT_FLOOR=2`, L260 + L288-298). Gates ③ (false-positive rate on *added* specifics) and ④ (pantry-staple precision) need **new precision/false-positive metric families** — per-value *recall* structurally cannot see false positives; budget two new metrics. Gate ② ("beats rules on judgment rows") must be **defined as a test**: judgment-row eligibility set, the metric, the minimum delta, tie behavior, per-field-independent or combined. Decide singleton gating for ingredient specifics. *Discovery:* `score-answer-key.ts:6,66,260,288-298`. <!-- TBD Session 1 -->
6. **Gold-key adjudication protocol** `[user-verdict]` (NEW — GATE A D5). The rules baseline is **blind on exactly the judgment rows** (it can't add specifics, split `Herbs & Aromatics`, or replace vague tags), so "AI-drafts + rules-baseline check" carries the clean core but NOT the hard cases. Define an **independent hard-case adjudication pass** (Herbs/Alliums split, added specifics, vague-tag replacement, pantry staples) so the gold key isn't AI-marking-its-own-homework on the rows that matter. <!-- TBD Session 1 -->
7. **Specific→group invariant — enforcement MECHANISM only** `[user-verdict]` (policy is LOCKED in §7: enforce specific→group; "1–3" is guidance, not a cap — GATE A D4-split). Open: app-layer Zod `superRefine` only vs. also a DB trigger vs. a harness `normalize.ts`-style deterministic rule. Recommendation to present: harness-emit-correct + Zod `superRefine` (+ optionally a normalize R-rule), **no DB trigger** (overkill for an internal-reviewer field) — surface the tradeoff. The parent map from Q1 is the source of truth. <!-- TBD Session 1 -->
8. **Vocab value casing** `[evidence-lockable]`. Stored form: **Title-Case `value===label`** (mirrors shipped `garden_skills` L231-268 / `observances_holidays`) vs. kebab (like `cooking_methods`). Default: Title-Case `value===label` (closest analog; round-trips through the closed enum). Whatever is chosen, the manifest (Q1), the Zod `VALUES`, the DB CHECK arrays, and the dropdown options are **byte-identical**. *Discovery:* `filterDefinitions.ts` (gardenSkills L231-268, cookingSkills L271, mainIngredients L174); `lessonMetadata.zod.ts`. <!-- TBD Session 1 -->
9. **PROD deploy choreography (expand/contract)** `[user-verdict]` (NEW — GATE A D2, **blocking for P3/P4**). The frontend auto-deploys on merge but migrations need manual PROD approval (`reference_ci_flakes`), so deploy order ≠ merge order. Lock the explicit sequence: **P3 PROD data canonical (approved migration, no CHECK) → P4 closed frontend/Zod deploys → P4 CHECK migration (separate approval, after a drift re-census)**. Do NOT bundle the closed frontend + the CHECK migration as one PR. Decide whether the brief "data clean but UI still free-form" window is accepted (low edit volume) or mitigated. <!-- TBD Session 1 -->
10. **PR / branch breakdown + artifact placement** `[user-verdict]` (policy portion). Confirm the phase→PR mapping (§8): harness extension + floor + pilot tooling = **scripts-only, no DB** (own PR, mergeable independently); full-run **apply** = migration PR (snapshot + dual-write + `.sql.rollback`); enforcement split per Q9. Decide whether pilot artifacts/run live on the harness PR or a throwaway branch. <!-- TBD Session 1 -->
11. **Model bake-off + cost estimate** `[evidence-lockable]`. fable-5 (PR-6 winner) is **suspended** (export-control freeze) — re-run a small **Opus 4.8 vs Sonnet 4.6** bake-off on the pilot and project full-run cost for the winner (the ~$121 figure was fable). Note the repo's prior **Opus-4.8 fabrication notes** (`schema.ts:40`, `run-retag.ts:175`) — Opus is not assumed safe; the bake-off decides on fresh evidence. <!-- TBD Session 1 -->

## 5. Vocabulary — the canonical target (LOCKED)

The decided worksheet lists are the canonical target, **plus the C02-discussion amendments** (user-decided 2026-06-22). Sign-off is **solo** (the user; no curriculum-team round — consistent with how the worksheet itself was decided).

**Cooking skills:** the worksheet's **23**, with one change — **"Frying" / "Stovetop frying" fold into `Sautéing & stir-frying`** via the alias map (no 24th skill; the re-read assigns the real technique). Vocabulary is otherwise effectively locked (bucket-c was 13 trivial singletons, ~0.9% of appearances).

**Main ingredients:** the worksheet's 24 groups + ~34 specifics (two-level), **plus three amendment groups (five new specific values) and one remap**:
- **`Seaweed (nori)`** — new group-less specific; merges `Nori` / `Nori (seaweed)` / `Seaweed` (stars in all 7 sushi/kimbap/seaweed lessons; same "distinct category" logic the worksheet used for Mushrooms).
- **`Cocoa & chocolate`** — new group-less specific; merges `Chocolate` / `Cocoa` / `Cocoa powder`.
- **`Sunflower butter`, `Tahini`, `Peanut butter`** — new specifics under the **existing `Nuts & seeds` group** (so they inherit a real parent; allergy-substitute relevance + tahini stars).
- **`Hummus` → re-map to the existing `Chickpeas` specific** (a chickpea dish, not a new term).
- Everything else in the orphan tail is **drop-or-remap, handled by the re-read** (cosmetic/craft noise — Shea butter, Lavender, Rose petals, Peppermint oil — *dropped*; composites — Ice cream, Marshmallows, Jelly, Jam, Granola, Applesauce, Agar agar — dropped or folded; Kimchi→Cabbage/Cruciferous, Beyond Sausage→Tofu & plant proteins, Vanilla→Spices).

The pantry-staple rule (worksheet decision-table #1) holds: salt/oil/soy sauce/sugar tagged only when the lesson is *about* them — their exact disposition (canonical value vs. map-to-group vs. never-stored) is set in the §4 Q1 manifest.

**The exact closed value set is NOT yet frozen** (GATE A D1): the worksheet states the ingredient vocab is *"open to adding further specifics as the re-tag reveals true counts"* — which a byte-identical closed DB CHECK cannot ship against. §4 Q1 materializes the final VALUES manifest + the specific→group **parent map** and freezes that door before §7 enforcement is authored. Known group-less specifics (`null` parent): Celery, Fennel, Melons (worksheet) + Seaweed (nori), Cocoa & chocolate (C02 additions); every other specific maps to its group.

## 6. The pilot (the quality gate)

- **Gold answer key — AI drafts, user adjudicates.** The AI proposes tags for the pilot lessons; the user reviews and corrects each (faster than from-scratch). `[user-verdict resolved 2026-06-22]`. **Circularity caveat (GATE A D5):** the rules baseline is *blind on exactly the judgment rows* (it can't add specifics, split Herbs & Aromatics, or replace vague tags), so on the hardest rows the genuine-user-correction carries the weight — §4 Q6 defines an independent hard-case adjudication protocol for those rows. (`normalize.ts`'s cross-field rules R1/R4/R5/R6 are a precedent for deterministically catching specific→group violations.)
- **Subset** (§4 Q3): stratified to over-sample hard cases + cover every group/specific ≥2× + a clean-core slice; size ~60–80 (lock in Session 1).
- **Model bake-off** (§4 Q8): Opus 4.8 vs Sonnet 4.6 (fable suspended); pick the winner on these two fields.
- **Four separate gates** (§4 Q4), NOT a single macro score: ① no regression on the clean core · ② beats the rules baseline on judgment rows · ③ low false-positive rate on *added* specifics · ④ pantry-staple precision. The full-corpus run is greenlit only when all four pass.

## 7. Enforcement — close the surfaces (LOCKED scope; mechanism in §4 Q5/Q6)

Mirror the shipped `garden_skills` closed loop, for BOTH fields, **after** the data is canonical:
1. **Reviewer dropdown** — swap the two `CreatableSelect` controls (`ReviewDetail.tsx` mainIngredients ~L1000, cookingSkills ~L1027) to non-creatable `Select` (copy the gardenSkills justification comment ~L1058–1061); replace the old kebab option value-sets in `filterDefinitions.ts` (cookingSkills L271, mainIngredients L174) with the canonical vocab (casing per §4 Q6).
2. **Zod** — add `CookingSkillsEnum` + `MainIngredientsEnum` (VALUES + `z.enum`), replacing the open `z.array(z.string())` at `lessonMetadata.zod.ts:215,217` and `reviewFormPayload.zod.ts:67,68`. **The edge mirror `_shared/metadataSchemas.ts` has open arrays in BOTH schemas** (GATE A/Codex-2): the lesson-metadata schema at `:170,172` AND the review-payload schema at `:209,210` — close **all four**, or off-vocab survives the metadata path. The `edgeSharedSchemas.equivalence` test enforces parity (move them together; add off-vocab negative fixtures for both). Plus the specific→group `superRefine` (§4 Q7), whose deterministic machinery can mirror `normalize.ts`'s cross-field rules.
3. **DB CHECK** — `valid_cooking_skills` + `valid_main_ingredients`, byte-identical arrays to the Zod VALUES, added in the apply migration **after** the canonical data is written (a table-wide CHECK can only follow canonicalization).

**Sequencing guard (GATE A D2):** the CHECK can only land AFTER both (a) the data is canonical AND (b) the closed frontend/Zod is *deployed* — else reviewer edits of legacy values hit constraint violations. Because the frontend auto-deploys on merge but migrations need manual PROD approval (the expand/contract hazard, `reference_ci_flakes`), this is a **deploy-order** choreography, not just merge-order — locked in §4 Q9. Do NOT bundle the closed frontend and the CHECK migration in one PR.

## 8. Migration / shipping strategy (PR skeleton — confirm in §4 Q7)

| Phase / PR | Contains | DB? | Risk | Reversibility |
|---|---|---|---|---|
| **P1 — Harness extension + floor + pilot tooling** | Add the two fields + two-level shape to schema/prompt/vocab/export/normalize/validate; deterministic alias-map floor; extend sample/score for the 4 gates + rules baseline | **No DB** (scripts only) | low | git revert |
| **P2 — Pilot + bake-off** (may ride P1's branch or a throwaway) | Sample ~60–80; AI-draft gold key → user adjudicate; Opus-vs-Sonnet bake-off; score the 4 gates; **greenlight decision** | No DB | low | n/a (artifacts) |
| **P3 — Full run + apply** | Winning model over ~700 lessons → staging + diff + user spot-check; **one migration**: snapshot → dual-write column + `metadata` JSONB → idempotent → `.sql.rollback`; **NO CHECK yet** (frontend still free-form → no save failures) | **migration** | **highest** (corpus-wide rewrite) | snapshot table + `.sql.rollback` |
| **P4 — Enforcement lockdown** (expand/contract, §4 Q9) | First: non-creatable dropdowns + Zod enums (2 app files + **4** edge-mirror lines) + `superRefine` → merge → frontend deploys. THEN, as a **separate** migration after a drift re-census: the `valid_cooking_skills` + `valid_main_ingredients` CHECKs | **frontend + migration (split)** | medium | git revert + drop-constraint rollback |

**Dual-write requirement:** the apply must write BOTH the typed `text[]` column and the `metadata` JSONB (the `complete_review_atomic` precedent dual-writes both — JSONB keys at `…tags_side_channel.sql:166`(mainIngredients)/`:168`(cookingSkills), column writes at `:376`(main_ingredients)/`:386`(cooking_skills)); an UPDATE to either auto-fires the BEFORE-UPDATE `search_vector` trigger (`20260618000000_search_vector_add_sel.sql` — `main_ingredients` is a standalone **B-weight** at `:62`, `cooking_skills` rides a **combined C-weight** block at `:65-72`) so no manual poke is needed, but both surfaces must be written for lockstep.

### TEST DB rehearsal / rollback / per-PR ritual
- **P3/P4 migrations:** apply to TEST → MCP-verify (distinct-count drop, sample rows, CHECK present, search still returns) → PROD approval → PROD MCP-verify. Re-verify per round (`feedback_per_round_test_db_verification`). Snapshot table populated BEFORE any UPDATE; rollback artifact = a sibling **`*.sql.rollback`** restoring prior column+JSONB from the snapshot (the Wave-4 corpus-mutation pattern — `20260622000000_*` used `.sql.rollback` + a retained snapshot table; **not** the older PR-6 comment-block style), rehearsed on TEST before PROD.
- **Per-PR ritual:** pre-push reviewer agent + GATE 3 Codex (parallel) → baseline checks → push + `gh pr create` → four-surface triage → rebuttal-pass every finding + GATE 4 Codex on real suggested changes → consolidated fix-ups → per-round TEST re-verify → round-cap after 2. **GATE 2 Codex on the apply + enforcement migration SQL before TEST.**
- **Known flakes:** `migrate-production.yml` SASL apply/verify flake → PROD MCP verify mandatory + rerun (`reference_ci_flakes`).

## 9. Testing strategy

- **Harness unit tests** (P1): the two-level validation refinement (group↔specific), the deterministic floor (alias map → canonical), the rules baseline, the 4-gate scoring — extend the existing `*.test.ts` alongside each module (the harness is already heavily unit-tested).
- **Zod fixtures** (P4): post-canonical values parse against the new enums; the specific→group `superRefine` rejects an orphan specific; edge mirror parity test stays green.
- **Migration** (P3/P4): local `supabase db reset` + `npm run test:rls` unchanged; TEST-DB MCP probes for distinct-count + CHECK + search.
- **Manual smoke:** reviewer dropdown shows canonical values only (no free-form), a known multi-ingredient lesson shows group + specifics, public search still returns expected results.
- **No new E2E**; existing search E2E must stay green after the apply.

## 10. Out of scope (captured for future work)

- **Embeddings regeneration** (the rebuild's C2.4) — a metadata-inclusive embedding recipe + full-corpus regen after the re-tag changes metadata. Separate track; relates to `project_embedding_pipeline_mismatch`.
- **Filter-UI surfacing of the two ingredient tiers** (group vs. specific in the public filter menu) — a filter-UI-track concern, not this track (worksheet QUESTION A note).
- **Hard "1–3 specifics" cap** — deliberately left as guidance, not enforced.
- **Curriculum-team validation round** — user chose solo sign-off.
- **DB trigger for the specific→group invariant** — leaning app-layer only (§4 Q7); revisit only if reviewer drift appears.

## 11. References

- Worksheet (decided vocab): `docs/plans/2026-06-12-metadata-rebuild-stage1-cooking-skills-ingredients-worksheet-decided.md`
- Wave-4 carry-forward: `docs/plans/2026-06-22-wave4-data-corpus-cleanup-design.md` §3.1 / §4 Q11–14a / §8
- Harness: `scripts/stage2-retag/` (+ `artifacts/answer-key-scorecard.md` — the 13-field precedent that excludes these two)
- PR-6 apply precedent: `supabase/migrations/20260617000000_pr6c2_retag_apply.sql` (snapshot + CHECK pattern)
- Dual-write precedent: `supabase/migrations/20260519000000_complete_review_atomic_tags_side_channel.sql`
- gardenSkills closed-loop template: `src/utils/filterDefinitions.ts` (L231–267), `src/pages/ReviewDetail.tsx` (L1058–1062), `src/types/lessonMetadata.zod.ts`
- Memory: `project_metadata_rebuild_initiative`, `project_deferred_work_campaign`, `project_vocabulary_drift_scope`, `feedback_data_safety_top_priority`, `feedback_per_round_test_db_verification`, `feedback_codex_over_crossexamine`, `feedback_multi_session_execution`
