# PR 5 — D4 Vocabulary Canonicalization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan
> task-by-task.
>
> **STATUS: SKELETON.** Per the four-file pattern, the impl plan is written AFTER the design doc
> locks. The design doc (`2026-06-11-metadata-rebuild-pr5-canonicalization-design.md`) is Draft —
> Session 1 locks the 9 open mechanism questions, then THIS file gets its concrete tasks authored
> (file paths, snippets, probe SQL, commit messages) as the second half of Session 1 or Session 2.
> Do not execute from this skeleton.

**Goal:** Rewrite every populated `culturalHeritage` and `academicConcepts` value in the lesson
corpus to its Stage-1-locked canonical form, and ship the durable alias → canonical vocabulary
artifacts that PR 6 / auto-tag / filter UI consume.

**Architecture:** Two sequential data PRs (5a heritage rehearsal → 5b concepts at scale), each:
parser-emitted vocabulary artifact → alias-map migration → minimal filter alignment →
probe-verified at local/TEST/PROD. Canonical WHY reference: the design doc.

**Tech Stack:** PostgreSQL migrations (supabase), Python worksheet parsers
(`scripts/parse-heritage-worksheet.py`, parser in `scripts/build-concepts-tool.py`),
TypeScript (`src/utils/filterDefinitions.ts` alignment), MCP SQL probes.

**Design reference:** `docs/plans/2026-06-11-metadata-rebuild-pr5-canonicalization-design.md` —
read before starting any task.

**Sub-skills to invoke:**
- `database-migrations` — before touching any file in `supabase/migrations/` (mind the
  same-day-prefix ASCII sort gotcha)
- `superpowers:verification-before-completion` — before claiming any task done
- `superpowers:test-driven-development` — for parser/artifact-emitter changes

**Per-PR ritual:** as specified in the kickoff prompt (pre-push reviewer agent → push → four-surface
bot triage → rebuttal pass → consolidated fix-ups → per-round TEST DB re-verification → round-cap 2).

## PR breakdown

| PR | Title | Contains | Notes |
|---|---|---|---|
| 5a | Heritage canonicalization | Heritage vocab artifact + alias migration + filter alignment + probes | Rehearsal PR. ~88 values / 17 merges / 20 vocab-only `new` adds. |
| 5b | Concepts canonicalization | Concepts vocab artifact + alias migration (82 folds, 7 drops, `sorting_and_categorization` rename) + derived-state refresh | Reuses 5a mechanism. Lands only after 5a is PROD-verified. |

---

## Session 1 — design lock (NOT a code session)

**Deliverables, in order:**

1. Discovery reads/queries answering design-doc §4 questions 4, 5, 7 (where values live, concepts
   nested shape, derived-state refresh behavior) — run against local + TEST via MCP, read the
   relevant migrations/triggers.
2. Locked answers written into design doc §4 (Draft → Locked) with one-line rationale each.
3. Concrete task list authored into THIS file (replacing the placeholders below) for PR 5a; PR 5b
   tasks may stay coarse until 5a ships.
4. Status doc updated; scaffolding-update commit.

## PR 5a — Heritage canonicalization

**Branch:** `feat/pr5a-heritage-canonicalization`

**Pre-flight reads (verify against current code; line numbers drift):**
- `scripts/parse-heritage-worksheet.py` (entire — the artifact emitter extends this)
- `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md` §3-§7 (verdict vocab,
  per-entry shape, alias_map conventions) + §16 (the 88-row summary)
- `src/utils/filterDefinitions.ts` (heritage hierarchy block)
- Latest migrations touching `metadata`/FTS (for trigger + naming patterns)

### Task A.1: <vocabulary artifact emitter> <!-- TBD Session 1 -->
### Task A.2: <alias-map migration> <!-- TBD Session 1 -->
### Task A.3: <filterDefinitions alignment> <!-- TBD Session 1 -->
### Task A.4: <probe set + rollback snapshot> <!-- TBD Session 1 -->
### Task A.5: <PR open + TEST verification + merge + PROD verification> <!-- TBD Session 1 -->

## PR 5b — Concepts canonicalization

**Branch:** `feat/pr5b-concepts-canonicalization`

**Pre-flight reads:**
- `docs/plans/2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md` (provenance
  header + the 8 resolution notes)
- Parser internals of `scripts/build-concepts-tool.py` (`parse_worksheet`, field extraction)
- PR 3a migration(s) that added `academicConcepts` to `search_vector`

### Tasks B.x: <authored after 5a ships, from the proven 5a mechanism> <!-- TBD -->

---

## Test plan <!-- TBD Session 1 — placeholders only -->

### Unit
- Artifact emitter: alias maps round-trip the worksheet verdicts (counts: heritage 51/17/20,
  concepts 119/82/7); every merge target resolves to a keep.

### Integration / DB
- Before/after distinct-value census per field at each tier; per-alias row counts copied verbatim
  from the artifacts; zero rows retain any alias after apply; idempotency (re-apply = no-op).

### RLS
- No RLS changes expected; `npm run test:rls` must pass unchanged.

### Manual smoke
- Heritage filter still returns results for every visible checkbox post-rewrite (TEST deploy
  preview); search for a canonicalized concept term returns the same lessons as its old alias did.
