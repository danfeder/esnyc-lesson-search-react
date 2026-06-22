# Wave 4 — Data / Corpus Cleanup — Execution Status

**Last updated:** 2026-06-22 by Session 0 (scaffold session)

## Current State

**Active PR:** none yet — not branched. Next is **PR 1** (reversible data cleanups: C12/C83/C08).

**Current task:** **Session 1 = DESIGN-LOCK** (the design doc Status is `Draft`). No implementation code yet. Session 1 works the design doc §4 "Open design questions" (Q1–Q14) against real code/data, locks each answer (respecting `[evidence-lockable]` vs `[user-verdict]` tags), flips the design Status to Locked, and authors the impl plan's concrete tasks (replacing the `<!-- TBD Session 1 -->` placeholders). Many questions are already **GATE-A-grounded** (see Recent decisions) — confirm the grounding still holds on TEST, then lock; the `[user-verdict]` ones (Q1 status/note text, Q4 `year-round`/`end-of-year` season mapping, Q7 retire-or-keep each straggler, Q13 one-PR-vs-split, Q14 seed source) need a user walkthrough.

**Branch:** `main` (scaffold committed to a `chore/wave4-*` scaffold branch → PR; not yet branched for PR 1).

**Last commit on branch:** (scaffold commit — see session log)

**Last commit on main:** `a8efac9` (Wave 3 C33 edge-deploy verify, #537)

**Pre-next-PR verification (if any):** none yet. (Standing: every PR1–PR3 migration → TEST MCP verify before merge + PROD MCP verify after the manual approval gate.)

## Recent decisions worth carrying forward

- **Scope locked (user 2026-06-22):** Core 5 (C12, C83, C08, C11, C02) + tiny extras (C49, C88); C11 = **hard-delete**; full 4-file scaffold weight. Defer C01 + C09/C07/C03.
- **GATE A (design review) done + folded 2026-06-22** — 4 grounded Claude lenses (FK-safety, reality-claims, sequencing, consistency), each verifying against repo + TEST DB. Codex cross-family lens backgrounded instead of returning inline (known orphan flake) → dispatched best-effort; the 4-lens grounded review is the backbone. Key folds:
  - **C83 is reviews-only:** 17 string-typed values in `submission_reviews.tagged_metadata->'season'` (`year-round`×13, `end-of-year`×2, `winter`×2) fail the `seasonTiming: z.array(SeasonTimingEnum)` Zod schema; `lessons.metadata.seasonTiming` is 766/766 clean → no live-lesson impact. `year-round`/`end-of-year` aren't in the canonical enum → mapping is a `[user-verdict]`; cleanest mechanism = backfill from each review's approved lesson.
  - **C11 pre-delete checklist must split enforced-FK vs unenforced-text-ref** — a hard DELETE does NOT error on loose text/text[] refs, so "zero refs" must be data-queried, not inferred. 6 enforced FKs (IN-ref column = `lesson_submissions.original_lesson_id`, NOT `lesson_id`) + unenforced refs incl. `lesson_collections.lesson_ids[]` + `duplicate_group_dismissals.lesson_ids[]` (array-overlap probes). All clear on TEST for the 3 ghosts; re-run on PROD verbatim. All 3 ghosts have `original_submission_id = NULL` + zero CASCADE children.
  - **C11 snapshot → dedicated rollback table** (safer than polluting `lesson_versions`, which needs a computed NOT-NULL `version_number`).
  - **C49 is safe to fold into PR2:** `useLessonSearch.ts:150` sends `filter_lesson_format: undefined` but `JSON.stringify` strips undefined keys so PostgREST never receives it; the C49 PR also deletes that dead line + regens `database.types.ts`.
  - **PR2 RPC recreate must re-grant EXECUTE + `NOTIFY pgrst, 'reload schema'`** (mirror W1b `20260620000000_search_lessons_w1b.sql:397-405`).
  - **PR2 before PR3** (shared 3 ghost rows) OR scope C02's UPDATE to `retired_at IS NULL` excl. ghost IDs (preferred, order-independent).
  - **C12 note column = `reviewer_notes`** (not `review_notes`); `'rejected'` is in the status CHECK.
  - Corpus counts confirmed on TEST: 766 total / 745 live / 21 retired; 17 stuck submissions (15 new + 2 update); 3 ghost rows. Commit `93b929e` = the cooking_skills/main_ingredients vocab worksheet. `consolidated_lessons.json` = 831 rows / 0 `academicConcepts` / 1662 dropped-`lessonFormat` → confirmed stale (C88).

## Done

(empty — scaffold only; execution starts Session 1)

## In flight

(none yet)

## Blocked

(none — user-approval gates are expected, not blockers)

## Decisions made during execution

(none yet — Session 1 will lock the §4 design questions here + in the design doc)

## Out-of-scope follow-ups captured here

- C01 embeddings regen; C09/C07/C03 dedup-pipeline rework (own sessions / ~Wave 5)
- Hard-deleting the 21 already-retired imports (stay soft-deleted unless a future archival policy calls for it)
- C65 / C67 / C117 / C36; Wave-3 edge-CI follow-ups (C33 composite-action extraction, poll-budget bump)

## Pointers to durable context

- Kickoff prompt: `2026-06-22-wave4-data-corpus-cleanup-kickoff.md`
- Design doc: `2026-06-22-wave4-data-corpus-cleanup-design.md` (Status: Draft → locked in Session 1)
- Implementation plan: `2026-06-22-wave4-data-corpus-cleanup-implementation.md` (SKELETON → tasks authored in Session 1)
- Roadmap: `2026-06-20-deferred-work-roadmap.md` · Master tracker: `2026-06-21-deferred-campaign-status.md`
- Memory: `project_deferred_work_campaign`, `reference_data_mutation_gotchas`, `project_imported_non_esynyc_drops`, `project_metadata_cleanup_candidates`, `reference_ci_flakes`
- Archive: `2026-06-22-wave4-data-corpus-cleanup-execution-status-archive.md` (created at first PR-cycle boundary)

## Session log

### Session 0 — 2026-06-22 — scaffold (planning session)

Major events:
- Scoped Wave 4 with the user (plain-language walkthrough + 3 AskUserQuestion answers): Core 5 + tiny extras (C49/C88); C11 hard-delete; full 4-file scaffold.
- Grounded the deletion-candidate populations on TEST DB (766/745/21 corpus; 17 stuck submissions; 3 ghost rows live; 21 imports already soft-deleted via `20260520000000_corpus_cleanup_retire_imports.sql`).
- Authored the 4 scaffold docs (design Draft / impl SKELETON / kickoff / this status) in design-lock mode.
- **GATE A** = a grounded multi-lens design review (Workflow: 4 Claude lenses + Codex cross-family); all accepted findings folded into the design doc; conflict between two lenses on C83's location resolved by direct TEST query (reviews-only, `season` key).
- Bookkeeping fold (trust-git-then-fix): corrected the master tracker + Wave-3 exec doc "C33 in flight" → "C33 merged `a8efac9` → Wave 3 DONE" in the scaffold commit.

Next session picks up: **Session 1 = design-lock** — paste the kickoff, work the §4 open questions, lock the design, author the impl tasks. No code.
