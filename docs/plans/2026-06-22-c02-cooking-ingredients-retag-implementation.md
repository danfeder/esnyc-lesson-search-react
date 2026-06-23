# C02 — Cooking Skills & Main Ingredients Re-tag — Implementation Plan

> **⚠️ SKELETON — the design doc is `Status: Draft` (design-lock mode).** Its §4 has **11 open mechanism questions** that Session 1 locks against the real harness code BEFORE concrete tasks are authored here. **Do NOT write task steps against the unlocked design** — they would encode guesses as instructions. Session 1: work §4 in order → flip the design Status to **Locked** → author the concrete tasks in this file → run **GATE B** (Codex + Claude) on the authored tasks. **No implementation code until §4 is locked.**

> **For Claude:** REQUIRED SUB-SKILL once tasks exist: use `superpowers:executing-plans` to implement task-by-task.

**Goal:** Re-tag `cooking_skills` + `main_ingredients` across ~700 live lessons to the decided canonical vocabulary (clean **and** complete), then lock the reviewer write-surfaces so they can't re-pollute.

**Architecture:** Hybrid-floor full LLM re-read via the existing `scripts/stage2-retag/` harness — the LLM reads every lesson; a deterministic alias-map **floor** anchors the ~92–94% clean core; the LLM owns the judgment work (vague-tag replacement, Herbs/Alliums split, adding the 1–3 starred specifics, dropping cosmetic noise). Canonical surface = the typed `text[]` columns (which feed `search_vector`); the apply dual-writes the `metadata` JSONB mirror. See design doc §3 for WHY.

**Tech Stack:** TypeScript (`scripts/stage2-retag/` harness + Vitest), React/TS frontend (reviewer dropdowns + Zod), Supabase/Postgres (apply + enforcement migrations), Anthropic SDK (**Opus 4.8 / Sonnet 4.6** — fable-5 suspended).

**Design reference:** `docs/plans/2026-06-22-c02-cooking-ingredients-retag-design.md` — read it (incl. the GATE-A folds) before any task.

**Sub-skills (per phase):** `superpowers:test-driven-development` (harness + Zod tasks are test-first), `superpowers:verification-before-completion` (run each task's Verify step), `superpowers:requesting-code-review` (between phases), `database-migrations` (before ANY `supabase/migrations/` file).

**Per-PR ritual (mandatory):** the canonical spec lives in the kickoff's PER-PR RITUAL + the feedback memories it cites. One-line shape: pre-push reviewer-agent dispatch + **GATE 3 Codex** (parallel) → `npm run check` → push + `gh pr create` → four-surface triage → rebuttal-pass every finding + **GATE 4 Codex** on real suggested changes → consolidated fix-ups → per-round TEST re-verify → round-cap after 2. **GATE 2 Codex** on every migration SQL before TEST apply. Don't restate per-task; cite it.

## PR / phase breakdown

| PR / phase | Title | Contains | DB? | Notes |
|---|---|---|---|---|
| **P1** | Harness extension + floor + pilot tooling | Two fields + two-level shape into schema/prompt/vocab/export/normalize/validate; the deterministic alias-map floor; extend sample/score for the rules baseline + 4 gates; the canonical **VALUES manifest + parent map** artifact | **No DB** (scripts only) | own branch, mergeable independently; git-revert reversible |
| **P2** | Pilot + bake-off | Sample ~60–80; AI-draft gold key → user adjudicate (+ hard-case protocol); Opus-vs-Sonnet bake-off; score the 4 gates; **greenlight decision** + cost projection | No DB | artifacts; may ride P1's branch or a throwaway (§4 Q10) |
| **P3** | Full run + apply | Winning model over ~700 → staging + diff + user spot-check; **one migration**: snapshot → dual-write column + JSONB → idempotent → `.sql.rollback`; **NO CHECK yet** | **migration** | **highest risk**; snapshot + `.sql.rollback`; GATE 2 |
| **P4a** | Enforcement — frontend | Non-creatable dropdowns + canonical options + Zod enums (2 app files + **4** edge-mirror lines) + specific→group `superRefine` | frontend | merges → auto-deploys; ship BEFORE P4b |
| **P4b** | Enforcement — CHECK | `valid_cooking_skills` + `valid_main_ingredients` CHECKs, after a drift re-census | **migration** | **separate** PR/approval from P4a (expand/contract, §4 Q9); GATE 2 |

---

## SESSION 1 — DESIGN LOCK (no implementation code)

Work design doc §4 Q1–Q11 **in order**; write a locked answer + one-line rationale under each; respect the tags (`[evidence-lockable]` you may lock from evidence; `[user-verdict]` → present evidence + a recommendation, the user decides — never lock unilaterally). Then flip the design Status to **Locked**, author the P1–P4 tasks below, and run GATE B.

**Pre-flight reads for the lock (discovery against real code):**
- Harness: `scripts/stage2-retag/{schema.ts, vocab.ts, run-retag.ts, normalize.ts, validate-output.ts, sample-answer-key.ts, score-answer-key.ts, prepare-apply.ts}`, `scripts/stage2-retag/prompts/`, `data/*.vocab.json` (+ `data/smaller-fields.vocab.json`).
- Vocabulary: `docs/plans/2026-06-12-metadata-rebuild-stage1-cooking-skills-ingredients-worksheet-decided.md`.
- Enforcement surfaces: `src/utils/filterDefinitions.ts` (gardenSkills L231–268 pattern), `src/pages/ReviewDetail.tsx` (~L1000/1027/1058–1062), `src/types/lessonMetadata.zod.ts` (215/217), `src/types/reviewFormPayload.zod.ts` (67/68), `supabase/functions/_shared/metadataSchemas.ts` (170/172/209/210), `src/types/edgeSharedSchemas.equivalence.test.ts`.
- Precedents: `supabase/migrations/20260617000000_pr6c2_retag_apply.sql` (snapshot + CHECK), `supabase/migrations/20260519000000_complete_review_atomic_tags_side_channel.sql` (dual-write 166/168 + 376/386), `supabase/migrations/20260618000000_search_vector_add_sel.sql` (62 / 65–72), the Wave-4 `20260622000000_*` migration + its `.sql.rollback`.

<!-- TBD Session 1: after the lock, author the concrete P1–P4 tasks below with file paths, code snippets, test commands, commit messages. -->

---

## P1 — Harness extension + deterministic floor + pilot tooling

**Branch:** `feat/c02-harness` · **No DB.**

**Pre-flight reads:** the harness files above + the worksheet + `data/*.vocab.json`.

<!-- TBD Session 1 — placeholder task shape (author concretely after lock):
  1.1  Author the canonical VALUES manifest + specific→group parent map artifact (§4 Q1).
  1.2  Extend schema.ts / emitter prompt / vocab.ts (MAIN_PASS_FIELDS) for the two fields + the two-level main_ingredients shape (§4 Q2).
  1.3  Deterministic floor module + alias map (cooking_skills + main_ingredients fold-ins from the worksheet) (§4 Q3).
  1.4  Extend export-corpus / normalize / validate-output for the two fields (re-include them in the corpus export; parent-map refinement).
  1.5  Extend sample-answer-key strata (over-sample hard cases + cover every group/specific ≥2× + clean-core slice) (§4 Q4).
  1.6  Extend score-answer-key: rules baseline + the 4 separate gates incl. NEW false-positive/precision metric families (§4 Q5).
  Each task TDD; unit tests alongside (the harness is heavily unit-tested). -->

## P2 — Pilot + bake-off

**Artifacts only** (placement per §4 Q10).

<!-- TBD Session 1 — placeholder:
  2.1  Sample ~60–80 (§4 Q4 final size = user-verdict).
  2.2  AI-draft gold key → user adjudicates; run the hard-case adjudication protocol (§4 Q6).
  2.3  Opus 4.8 vs Sonnet 4.6 bake-off (§4 Q11); cost projection.
  2.4  Score the 4 gates; produce the greenlight decision (user-gated). -->

## P3 — Full run + apply migration

**Branch:** `feat/c02-apply` · **migration (highest risk).**

**Pre-flight reads:** `prepare-apply.ts`, the PR-6 apply migration, the Wave-4 migration + `.sql.rollback`, `complete_review_atomic`.

<!-- TBD Session 1 — placeholder:
  3.1  Run the winning model over ~700 lessons → staging + diff + user spot-check.
  3.2  Apply migration: snapshot table BEFORE update → dual-write column + JSONB (absolute values) → idempotent → sibling `.sql.rollback`. NO CHECK (§4 Q9). GATE 2 Codex on the SQL.
  3.3  TEST apply → MCP verify (distinct-count drop, sample rows, search returns) → PROD approval → PROD MCP verify. -->

## P4 — Enforcement lockdown (expand/contract)

**Branches:** `feat/c02-enforce` (frontend, P4a) then `feat/c02-check` (migration, P4b) — **separate PRs**, deploy P4a before P4b (§4 Q9).

**Pre-flight reads:** `filterDefinitions.ts`, `ReviewDetail.tsx`, `lessonMetadata.zod.ts`, `reviewFormPayload.zod.ts`, `_shared/metadataSchemas.ts`, `edgeSharedSchemas.equivalence.test.ts` — mirror the shipped `garden_skills` closed loop.

<!-- TBD Session 1 — placeholder:
  4a.1 filterDefinitions: replace cookingSkills (L271) + mainIngredients (L174) kebab options with canonical (casing per §4 Q8); value===label.
  4a.2 ReviewDetail: swap the two CreatableSelect → non-creatable Select (copy gardenSkills justification comment).
  4a.3 Zod: CookingSkillsEnum + MainIngredientsEnum replacing open arrays at lessonMetadata.zod.ts:215/217, reviewFormPayload.zod.ts:67/68, metadataSchemas.ts:170/172/209/210 (all four); specific→group superRefine; off-vocab negative fixtures + edge parity test.
  4b.1 Migration: valid_cooking_skills + valid_main_ingredients CHECKs (byte-identical to the Zod VALUES) after a drift re-census; GATE 2 Codex; TEST→PROD verify. -->

---

## Test plan (high-level; concretize per task in Session 1)

### Unit
- Harness: two-level parent-map validation refinement; deterministic floor (alias → canonical); rules baseline; the 4-gate scoring incl. false-positive/precision metrics. Extend the existing `scripts/stage2-retag/*.test.ts`.
- Zod (P4a): post-canonical values parse against the new enums; `superRefine` rejects an orphan specific; `edgeSharedSchemas.equivalence` stays green; off-vocab fixtures fail.

### Integration / Migration
- P3/P4b: local `supabase db reset` + `npm run test:rls` unchanged; TEST-DB MCP probes (distinct-count drop, CHECK present, search returns expected); PROD MCP verify after approval.

### E2E
- No new E2E; the existing search E2E must stay green after the apply.

### Manual smoke (per `superpowers:verification-before-completion`)
- Reviewer dropdown shows canonical values only (no free-form box) for both fields.
- A known multi-ingredient lesson shows group + the right starred specifics.
- Public search still returns expected results; distinct-value count dropped as expected.
