# Wave 4 — Data / Corpus Cleanup — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: use `superpowers:executing-plans` to implement task-by-task once tasks are authored.
>
> ⚠️ **THIS IS A SKELETON (design-lock mode).** The design doc (`...-design.md`) ships `Status: Draft` — per-item SQL mechanism is open. **Session 1 is a design-lock session:** work the design's §4 "Open design questions" against real code/data, lock the answers into the design doc, flip its Status to Locked, THEN author the concrete tasks below (replacing each `<!-- TBD Session 1 -->`). **No implementation code until that happens.** Do NOT write detailed task SQL against the unlocked design — it would encode guesses as instructions.

**Goal:** Clear the corpus's small, distinct data-cleanup debts (C12/C83/C08/C11/C02/C49/C88) safely, reversible-first, one blast-radius per PR.

**Architecture:** 4 PRs, lowest-risk-first — see design doc §3. PR1 reversible data cleanups · PR2 ghost hard-delete + search-RPC cleanup (isolated, irreversible) · PR3 vocab canonicalization · PR4 dev-seed refresh. Design doc is canonical for WHY.

**Tech Stack:** PostgreSQL (Supabase migrations + `.rollback`), React/TS frontend (PR2's C49 frontend line + types regen), Vitest, MCP TEST/PROD verification.

**Design reference:** `docs/plans/2026-06-22-wave4-data-corpus-cleanup-design.md`. Read it (and its §4 open questions + their GATE-A-grounded notes) before any task.

**Sub-skills to invoke (per phase):**
- `database-migrations` — before touching any file in `supabase/migrations/` (every PR1–PR3 migration)
- `/new-migration` — to create each migration file (enforces the `YYYYMMDDHHMMSS_` ASCII-sort rule; latest is `20260621000000`)
- `superpowers:test-driven-development` — for any code-bearing task (C83 Zod fixture, C49 frontend line removal)
- `superpowers:verification-before-completion` — before claiming any task done
- `superpowers:requesting-code-review` — between PRs

**Per-PR ritual (mandatory):** canonical spec in the kickoff PER-PR RITUAL section + the cited feedback memories. One-line: pre-push reviewer agent + GATE 3 Codex → `npm run check` → push + `gh pr create` → wait for bots → four-surface triage → rebuttal-pass every finding + GATE 4 Codex → consolidated fix-ups → per-round TEST-DB re-verify → round-cap after 2. GATE 2 Codex on every migration SQL before TEST apply. Don't restate per-task; cite it.

**How to use this plan:** each task (once authored) has file paths, anchor symbols, snippets to adapt, verify commands, commit message. Execute in order. Verify every snippet against current code first. Repo-conformance adaptations OK; product/design changes require stopping to ask.

## PR breakdown

| PR | Title | Contains | Notes |
|---|---|---|---|
| 1 | Reversible data cleanups | C12 (17 stuck submissions → rejected + note), C83 (17 `season` review values normalized), C08 (retire last ~2 live imports) | One migration + `.rollback`. All reversible. Lowest risk → ships first. |
| 2 | Ghost hard-delete + search-RPC cleanup | C11 (snapshot + `DELETE` 3 ghosts) + remove hardcoded 3-ID exclusion from `search_lessons` + C49 (drop dead `filter_lesson_format` param + frontend line) | **Highest risk, isolated.** Irreversible delete (snapshot first). RPC `DROP+CREATE` → re-grant + `NOTIFY pgrst`. |
| 3 | Vocabulary canonicalization | C02 (`cooking_skills`/`main_ingredients` 2nd-pass) | Bulk metadata UPDATE via rebuild pipeline; snapshot table first; scope `retired_at IS NULL` excl. ghost IDs. |
| 4 | Local dev-seed refresh | C88 (`data/consolidated_lessons.json`) | No DB, no PROD. Land anytime. |

---

## PR 1 — Reversible data cleanups (C12 + C83 + C08)

**Branch:** `chore/wave4-pr1-reversible-cleanups`

**What ships:** one migration flipping 17 stuck `lesson_submissions` to rejected + reason note (C12); normalizing the 17 string-typed `submission_reviews.tagged_metadata->'season'` values (C83); setting `retired_at` on the last ~2 live non-ESYNYC imports (C08). Plus `.rollback`.

**Why its own PR:** all reversible, no search-RPC change, no row deletion — safest, ships first to build TEST→PROD-verify rhythm.

**Pre-flight reads (Session 1, before authoring tasks):**
- `supabase/migrations/20260520000000_corpus_cleanup_retire_imports.sql` — the soft-delete precedent C08 mirrors (`retired_at` + `retired_reason`)
- `lesson_submissions` schema via MCP: confirm `reviewer_notes` column + the `status` CHECK (`['submitted','in_review','needs_revision','approved','rejected']`)
- `src/utils/lessonMetadata.zod.ts:49,197` — `SeasonTimingEnum` + `seasonTiming: z.array(...)`; `src/.../reviewToLessonMapper.ts:40-41` — the `season`→`seasonTiming` rename
- memory `project_imported_non_esynyc_drops` §"Drop signature" — for the C08 re-sweep
- triggers on `lesson_submissions` (MCP `pg_trigger`) + edge `send-email` callers — confirm a status flip fires no email (Q2)

### Task 1.1 — C12: flip 17 stuck submissions <!-- TBD Session 1: lock Q1/Q2/Q3, author migration + .rollback + MCP verify -->
### Task 1.2 — C83: normalize 17 `season` review values <!-- TBD Session 1: lock Q4/Q5; prefer backfill-from-approved-lesson; author migration + Zod fixture + verify -->
### Task 1.3 — C08: re-sweep + retire last ~2 imports <!-- TBD Session 1: lock Q6/Q7 (user confirms each straggler); author retired_at migration + verify -->

---

## PR 2 — Ghost hard-delete + search-RPC cleanup (C11 + C49)

**Branch:** `chore/wave4-pr2-ghost-delete-rpc`

**What ships:** a migration that snapshots the 3 ghost rows to a dedicated rollback table, `DELETE`s them, and `DROP+CREATE`s `search_lessons` to remove the hardcoded 3-ID exclusion + drop the dead `filter_lesson_format` param — re-granting EXECUTE + `NOTIFY pgrst, 'reload schema'`. Plus the frontend C49 cleanup (delete `useLessonSearch.ts:150` + regen `database.types.ts`).

**Why its own PR:** isolates the only irreversible change in the wave + the search-RPC signature change.

**Pre-flight reads (Session 1):**
- `supabase/migrations/20260620000000_search_lessons_w1b.sql` — the live `search_lessons`: ghost-exclusion (`:283-287` count / `:376-380` result), `filter_lesson_format` param (`:203`), grants + `NOTIFY` (`:397-405`). The recreate must preserve EVERYTHING except the exclusion + the dropped param.
- memory `reference_data_mutation_gotchas` — pre-delete checklist; `reference_ci_flakes` — reverse-PGRST202 / expand-contract
- `src/hooks/useLessonSearch.ts:150` + `src/types/database.types.ts:1444` — the inert `filter_lesson_format` caller
- the existing search E2E + manual smoke path

### Task 2.1 — Pre-delete reference scan (Q8) on TEST + PROD, verbatim IDs <!-- TBD Session 1: run the (a) enforced-FK + (b) unenforced-text-ref + OUT-ref + CASCADE-child probes; lock results -->
### Task 2.2 — Snapshot + DELETE migration (Q9) <!-- TBD Session 1: dedicated rollback table, SELECT* before DELETE; + .rollback -->
### Task 2.3 — `search_lessons` DROP+CREATE: remove exclusion + drop param (C49); re-grant + NOTIFY <!-- TBD Session 1 -->
### Task 2.4 — Frontend C49 cleanup: delete useLessonSearch.ts:150 + regen types <!-- TBD Session 1: TDD-light; npm run check; search smoke -->

---

## PR 3 — Vocabulary canonicalization (C02)

**Branch:** `chore/wave4-pr3-vocab-canonicalization`

**What ships:** bulk UPDATE of `cooking_skills`/`main_ingredients` metadata values to the locked vocab, snapshotting affected `metadata` to a rollback table first; scoped to `retired_at IS NULL` excluding the 3 ghost IDs (order-independent vs PR2).

**Pre-flight reads (Session 1):**
- the vocab worksheet (commit `93b929e` — `...cooking-skills-ingredients-worksheet-decided.md`); confirm it covers both fields
- a metadata-rebuild canonicalization migration as the pipeline template (the `metadata-foundation` PRs)
- `src/utils/filterDefinitions.ts:174,271` — confirm both fields are `METADATA_CONFIGS` ("NOT search filters")

### Task 3.1 — Load locked vocab + derive messy→canonical mapping (Q11) <!-- TBD Session 1 -->
### Task 3.2 — Snapshot + UPDATE migration (Q12/Q13) + .rollback + distribution verify <!-- TBD Session 1 -->

---

## PR 4 — Local dev-seed refresh (C88)

**Branch:** `chore/wave4-pr4-dev-seed-refresh`

**What ships:** regenerate `data/consolidated_lessons.json` (currently 831 rows / 0 `academicConcepts` / 1662 dropped-`lessonFormat` occurrences — stale, predates the rebuild). No DB, no PROD.

**Pre-flight reads (Session 1):**
- `data/consolidated_lessons.json` (head) + whatever script exports it (`scripts/`)

### Task 4.1 — Re-export the seed (Q14: source = PROD live; current schema fields) <!-- TBD Session 1: local npm run dev smoke + build -->

---

## Test plan

### Unit / Integration
- C83: Zod fixture asserting the normalized `season`/`seasonTiming` values parse against `SeasonTimingEnum`.
- C49: `npm run check` clean after the frontend line removal + types regen.

### E2E
- PR2: existing search E2E must stay green against the TEST deploy preview (RPC recreate); manual search smoke (no "Unknown" rows, location-Both + sort intact, live count drops by exactly 3).

### RLS
- No RLS changes expected. `npm run test:rls` must pass unchanged after each migration.

### Manual smoke (per `superpowers:verification-before-completion`)
- PR1: reviewer queue no longer shows the 17 stuck submissions as actionable; TEST shows the 17 flipped + notes set, ~17 `season` values normalized, stragglers `retired_at` set.
- PR2: 3 ghosts gone (`count=0`), snapshot table populated, search live count −3, no dangling refs (re-run Q8 probes post-delete).
- PR3: post-UPDATE value distribution matches locked vocab; rollback table populated.
- PR4: `npm run dev` loads with the refreshed seed.
