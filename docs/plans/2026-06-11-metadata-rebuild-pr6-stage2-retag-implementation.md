# PR 6 — Stage 2 Corpus Re-tag (PR 3b folds in) — Implementation Plan

> **SKELETON — design-lock mode.** The design doc
> (`2026-06-11-metadata-rebuild-pr6-stage2-retag-design.md`) ships as
> **Draft** with 13 enumerated open design questions. Sessions 1-2 gather
> evidence + run the mechanism re-decision walkthrough, lock the design,
> and THEN author the concrete tasks here. Do NOT write pipeline code or
> detailed task steps against the unlocked design — they would encode
> guesses as instructions.

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans`
> to implement this plan task-by-task once tasks exist.

**Goal:** Re-tag the full live corpus (~751 lessons) from lesson bodies against the locked canonical vocabulary with per-field enum enforcement, reviewer spot-check, and a staged, rollback-protected PROD apply; populate `search_synonyms` from the re-tag outputs (PR 3b); regenerate corpus embeddings; drop the PR 5 rollback tables.

**Architecture:** TBD at design lock (OQ1: TypeScript+Zod batch runner at `scripts/stage2-retag/` is the leading candidate vs the originally-locked Python/Pydantic adapter). The design doc is canonical for WHY; exploration doc §4 sketches the candidate TS shape.

**Tech Stack:** TypeScript / Supabase / PostgreSQL; Anthropic SDK with `tool_choice` schema forcing + `cache_control` (the `process-submission/index.ts:368-398` + `scripts/eval-llm-tagging-prompt.ts:149-189` pattern); remainder TBD with OQ1/OQ4.

**Design reference:** `docs/plans/2026-06-11-metadata-rebuild-pr6-stage2-retag-design.md`. Read it before starting any task.

**Sub-skills to invoke (per phase):**
- `superpowers:test-driven-development` — code-bearing tasks test-first (check surface per OQ12)
- `superpowers:verification-before-completion` — run each task's Verify step before claiming done
- `database-migrations` — before touching any file in `supabase/migrations/`
- `superpowers:requesting-code-review` — between PRs

**Per-PR ritual (mandatory, every PR):** canonical spec lives in the kickoff prompt's PER-PR RITUAL section + the feedback memories it cites. One-line shape: pre-push reviewer-agent dispatch → baseline checks → push + `gh pr create` → wait for external bots → collect findings from all four PR surfaces → rebuttal-pass every finding → consolidated fix-ups → re-verify TEST DB per DB-touching round → round-cap after 2.

---

## Session 1-2 work list (design lock — this IS the current plan)

Evidence gathering (Session 1), mapped to design-doc OQs / exploration §5 prerequisites:

1. PROD census of the ~8 smaller vocab fields' distinct values + drift shapes (OQ2 evidence; census PROD, not TEST). <!-- TBD Session 1 -->
2. `lessons.content_text` freshness + quality audit on live rows (OQ5): nulls, length distribution, control chars, random-sample vs Google Doc canonical. Output: body-source readiness statement. <!-- TBD Session 1 -->
3. Token-economics dry-run, 10-20 lessons, per-field AND monolithic shapes; capture input tokens / cache hits / projected full-run cost (OQ3). Requires a throwaway harness off `scripts/eval-llm-tagging-prompt.ts` — throwaway, not pipeline code. <!-- TBD Session 1 -->
4. Inspect 5-10 `taggingv3` sample outputs → specific strong/weak/confidently-wrong examples; sketch 2-3 eval/QA protocol candidates (OQ6). <!-- TBD Session 1 -->
5. Verify current Anthropic Batch API data-retention policy (OQ4). <!-- TBD Session 1 -->
6. Re-read the two in-repo canonical-pattern call sites; confirm the call shape survives into Stage 2 (exploration §5 item 6). <!-- TBD Session 1 -->
7. If `claude -p` periphery use is live for OQ9: re-verify flag surface (`--bare`, `--tools`, `--json-schema`, `--max-budget-usd`, `--max-turns`). <!-- TBD Session 1 -->

Walkthrough (Session 2, user = decision authority): work OQ1-OQ13 in the design doc, write locked answers + rationale under each, flip design Status to Locked, amend foundation impl plan lines 11/856-867 + decision journal if OQ1 reopens-and-changes the mechanism, then author the concrete tasks below.

## Candidate PR breakdown (TBD Session 2 — walkthrough may merge/split/reorder)

| PR | Title (candidate) | Contains | Notes |
|---|---|---|---|
| A | Pipeline scaffolding + dry-run | Runner + check surface (OQ12) + export/validate steps; no DB writes | Code-only; artifacts land locally |
| B | Full run + diff report + staging | Full-corpus run artifacts; human-readable diff; staged table | Reviewer spot-check (OQ6/OQ8) gates progression |
| C | Apply + embedding regen | Apply migration with rollback snapshot; corpus embedding regeneration | DB-touching; PROD MCP verification mandatory |
| D | PR 3b — `search_synonyms` population | Concept-derived everyday↔framework pairs migration | Depends on B/C outputs |
| E | Cleanup | Drop `pr5a_heritage_rollback` + `pr5b_concepts_rollback` (+ any Stage-2 staging tables) | After C is PROD-verified (PR 5 design §4.8) |

**Pre-flight reads (every implementation PR, refresh against current code):**
- `docs/plans/2026-05-13-stage2-retag-mechanism-exploration.md` (mechanism context)
- `src/types/lessonMetadata.zod.ts` (canonical schema + enum source) and `src/types/generated/enums.json`
- `supabase/functions/process-submission/index.ts` (canonical Anthropic call shape — mirror, don't extend)
- `scripts/eval-llm-tagging-prompt.ts` (closest script precedent)
- `scripts/CLAUDE.md` (prod-guard + script conventions)
- Heritage §16 table + concepts returned worksheet (vocab inputs)

### Task placeholders

<!-- TBD Session 2 — authored after design lock. Each task gets: ID, files,
     anchor symbols, code snippets, test commands, verify step, commit
     message template, per the template contract. -->

---

## Test plan

TBD at design lock (OQ12 decides the check surface for `scripts/stage2-retag/`; OQ6 decides the eval/spot-check protocol; OQ7 decides apply-step verification probes). Fixed: `npm run type-check && npm run lint` baseline every session; `npm run test:rls` unchanged unless a migration touches policies; PROD MCP after-probes with verbatim identifiers after every apply.
