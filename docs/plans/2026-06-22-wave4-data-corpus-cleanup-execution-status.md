# Wave 4 — Data / Corpus Cleanup — Execution Status

**Last updated:** 2026-06-22 by Session 1 (design-lock)

## Current State

**Phase:** Design **LOCKED** (Session 1). Build not yet started. Design doc Status = Locked; impl plan tasks authored.

**Scope (reshaped at lock from 4 PRs → 3):**
- **PR 1 — Reversible cleanups (C12 + C83).** C12 = close the stale never-reviewed submission backlog (env-independent: `status='submitted' AND created_at < '2026-05-01'`; **TEST 17 / PROD 14** — do NOT hardcode 17). C83 = normalize 17 string-typed `submission_reviews…->'season'` values to arrays via backfill-from-published-lesson (14) + `[]` fallback (3). One migration + `.rollback`, two snapshot tables.
- **PR 2 — Ghost hard-delete + RPC (C11 + C49).** Highest risk. Guarded `DELETE` of the 3 ghosts (snapshot first; pre-delete scan all-clear on TEST+PROD, guarded count=3) + `search_lessons` DROP+CREATE removing the 3-ID exclusion + dropping the dead `filter_lesson_format` param (C49 = delete `useLessonSearch.ts:147-150` + regen types).
- **PR 3 — Dev seed (C88).** Author a read-only PROD→seed generator; re-export `data/consolidated_lessons.json` from PROD-live (~745, camelCase envelope). No DB write, no PROD mutation.
- **C08 = CLOSED (no-op):** 0 import stragglers found (TEST+PROD sweep). **C02 = RELOCATED** to its own `stage2-retag` session (the deferred "PR F" content re-tag; carry-forward findings in design §3.1/§4/§8).

**Branch:** `chore/wave4-scaffold` — **UNPUSHED**. Session 1's design-lock docs commit on THIS branch (about to commit). **PR1 cuts from `chore/wave4-scaffold`** (NOT `main`) so the scaffold + design-lock docs bundle into PR1 (user decision). PR2/PR3 branch from `main` after PR1 merges (or stack — supervisor calls it).

**GATE 1B (done):** Codex adversarial review of the locked design + impl plan returned **7 findings, verdict BLOCK — all accepted + folded** before the docs commit. The two HIGH (C11 snapshot-completeness guard before the DELETE; C11 `.rollback` must re-GRANT + `NOTIFY pgrst`) + C83 fail-loud-on-unresolved (no silent `[]`) + C88 importer round-trip (`metadata.gradeLevel` singular vs `gradeLevels`) + C12 `updated_at` snapshot + 2 LOW (C83 fixture targets the review-form schema; C49 types-regen pinned local-post-apply). No below-bar hardening to reject — Codex's different-family lens earned its keep on the migration SQL.

**What the next (build) session picks up:** start **PR1**. Read impl plan §"PR 1" through Task 1.2; invoke `database-migrations`; **re-run the TEST+PROD count probes from the impl-plan "Evidence baseline" — counts drift, never trust the doc blind**; write the Task 1.1 Zod fixture (TDD) then the migration (Task 1.2); GATE 2 Codex on the SQL; `supabase db reset && npm run test:rls && npm run check`; push from the PR1 branch; per-PR ritual.

**Pre-next-PR verification:** before authoring the PR1 migration, re-confirm on TEST **and** PROD: stuck-submission counts by type + the `created_at < 2026-05-01` boundary (0 newer); the season census (17 string / 96 array) + the 3 empty-source linkages. Standing rule: every PR1/PR2 migration → TEST MCP verify before merge + PROD MCP verify after the manual approval gate.

**Blockers:** none (user-approval gates are expected, not blockers).

## Recent decisions worth carrying forward

- **Design LOCKED 2026-06-22 (Session 1)** via read-only discovery workflow (7 lanes + 4 adversarial verifiers) → supervisor re-verify on TEST+PROD → user verdicts. All §4 questions resolved.
- **User verdicts (2026-06-22):** C08 dropped/closed (0 stragglers); C83 3 residuals → `[]`; **C02 → its own `stage2-retag` session** (user: stage2-retag dry-run was shippable; C02 fine as its own session); C12 = `rejected` + **distinct** stale/orphan notes; C88 = **PROD-live** export.
- **Material lock-time findings (changed the plan):**
  - **C12 TEST≠PROD:** PROD has 14 stuck (all `new`, 0 `update`), TEST 17 (15+2); 0 submitted after 2026-05-01 either DB → migration scoped env-independently by date threshold, asserts a post-condition (not a hardcoded count), with a snapshot table.
  - **C83 join correction:** the backfill keys off the `lessons.original_submission_id = submission_reviews.submission_id` OUT-ref (NULL `canonical_lesson_id` on 16/17), `canonical_lesson_id` only for "Applesauce". CTE-driven, no hardcoded IDs. 14 backfill / 3 → `[]`.
  - **C11 verified on BOTH DBs:** 3 rows, all 14 ref probes = 0, guarded count = 3, 0 CASCADE children — TEST+PROD. PROD corpus 788/767 vs TEST 766/745 → post-delete smoke is a **delta −3**, not absolute.
  - **C02 reframe:** surface-sync is a non-issue (2-row divergence; column canonical, feeds search_vector); the real work is the vocab mapping (123→23 / 227→58) which is a content re-tag, not SQL → harness session. Reviewer dropdowns + Zod open + no DB CHECK = re-pollution gap → goes with the C02 session.
  - **C49:** fully inert (`undefined` stripped at the wire); delete 4 frontend lines + regen types; expand/contract is hygiene-only.
  - **C88:** no export script exists → PR3 must author a read-only generator emitting the legacy camelCase envelope `import-data.js` consumes (else silent 0-row import).
- **Doc corrections folded:** Zod schema is `src/types/lessonMetadata.zod.ts` (not `src/utils/`); `search_lessons` recreate baseline = `20260620000000_search_lessons_w1b.sql`.

## Done

- **Session 0:** scaffold (4 docs) + GATE A design review.
- **Session 1:** design-lock — discovery workflow, supervisor TEST+PROD re-verify, 6 user verdicts, design doc flipped to LOCKED + reshaped to 3 PRs, impl plan tasks authored. GATE 1B Codex review dispatched.

## In flight

(none — GATE 1B Codex review done + folded; design-lock docs commit is next)

## Blocked

(none)

## Decisions made during execution

- See "Recent decisions" above — the §4 locks are recorded in the design doc itself (canonical).

## Out-of-scope follow-ups captured here

- **C02 → own `stage2-retag` session (next-up after Wave 4).** Carry-forward findings in design §3.1/§4 Q11–14a/§8. Includes the reviewer-dropdown rewrite + optional Zod-enum/DB-CHECK enforcement.
- **C08 closed** — neutralize the stale "~2 expected stragglers" note in MEMORY.md / roadmap on initiative close.
- C01 embeddings regen; C09/C07/C03 dedup-pipeline rework (own sessions / ~Wave 5).
- Hard-deleting the 21 already-retired imports (stay soft-deleted unless a future archival policy calls for it).
- Drop the persistent Wave-4 snapshot tables (`wave4_c12_submissions_rollback`, `wave4_c83_season_rollback`, `wave4_c11_ghost_rollback`) in a future cleanup migration once PROD-verified stable (per the `pr6_retag_rollback` precedent).
- C65 / C67 / C117 / C36; Wave-3 edge-CI follow-ups.

## Pointers to durable context

- Kickoff prompt: `2026-06-22-wave4-kickoff.md` (updated to 3-PR scope at lock)
- Design doc: `2026-06-22-wave4-data-corpus-cleanup-design.md` (Status: **LOCKED**)
- Implementation plan: `2026-06-22-wave4-data-corpus-cleanup-implementation.md` (tasks **authored**)
- Roadmap: `2026-06-20-deferred-work-roadmap.md` · Master tracker: `2026-06-21-deferred-campaign-status.md`
- Memory: `project_deferred_work_campaign`, `reference_data_mutation_gotchas`, `project_imported_non_esynyc_drops`, `project_metadata_cleanup_candidates`, `reference_ci_flakes`, `project_metadata_rebuild_initiative`, `project_stage2_mechanism_exploration`
- Archive: `2026-06-22-wave4-data-corpus-cleanup-execution-status-archive.md` (created at first PR-cycle boundary)

## Session log

### Session 0 — 2026-06-22 — scaffold (planning session)

Major events:
- Scoped Wave 4 with the user (plain-language walkthrough + 3 AskUserQuestion answers): Core 5 + tiny extras (C49/C88); C11 hard-delete; full 4-file scaffold.
- Grounded the deletion-candidate populations on TEST DB (766/745/21 corpus; 17 stuck submissions; 3 ghost rows live; 21 imports already soft-deleted).
- Authored the 4 scaffold docs (design Draft / impl SKELETON / kickoff / status).
- **GATE A** = grounded multi-lens design review (4 Claude lenses + Codex cross-family); findings folded; notably the HIGH that C02 was thought dual-write.
- Bookkeeping fold: corrected the master tracker + Wave-3 exec doc "C33 in flight" → "merged → Wave 3 DONE".

### Session 1 — 2026-06-22 — design-lock

Major events:
- **Discovery workflow** (`wave4-design-lock-discovery`, 11 agents: 7 read-only lanes + 4 adversarial verifiers) re-confirmed every §4 grounding against TEST DB + code. All four data-relevant lanes (B/C/D/F) verified `confirmed=true`.
- **Supervisor re-verification (load-bearing):** independently re-ran the C11 pre-delete scan on **both TEST and PROD** (identity=3, guarded=3, all 14 ref probes=0), the PR1/C02/C08 metrics, the C83 linkage aggregate, and spot-read the C49/C02 code anchors. All matched discovery.
- **Caught a TEST≠PROD divergence the TEST-only discovery missed:** C12 PROD = 14 stuck (0 update) vs TEST 17 → re-grounded C12 to an env-independent date-threshold scope before authoring.
- **6 user verdicts** via 2 AskUserQuestion rounds + a C02 deep-dive conversation: C08 closed; C83 → `[]`; **C02 relocated to its own re-tag session** (the big one); C12 distinct notes; C88 PROD-live.
- **Locked the design doc** (Status Draft→LOCKED, scope 4→3 PRs, §4 all answers written, §1/§3/§5/§6/§7/§8 reshaped) and **authored the impl plan tasks** (PR1 C12+C83 migration skeletons + Zod fixture; PR2 C11+C49; PR3 C88 generator). Supervisor authored these directly (scaffold-doc edits are not delegated).
- **GATE 1B:** Codex adversarial review of the locked design + impl plan (per the user's "more Codex cross-examination" directive) → 7 findings, verdict BLOCK, **all accepted + folded into design + impl** (2 C11 HIGH, C83/C88/C12 MED, 2 LOW — see the GATE 1B note in Current State).

Decisions/learnings:
- TEST-only discovery is insufficient for user-state tables (`lesson_submissions`, `submission_reviews`) — ground PR1 scope on PROD too. (Promote to feedback memory on close.)
- The discovery workflow's adversarial verifiers earned their keep (caught the OUT-ref join model, the surface-gap-framing error, the pr6_retag_rollback provenance footnote).
- Codex (different model family) caught what the same-family discovery+supervisor missed on the SQL: the silent-`[]` coercion trap, the incomplete-snapshot-before-delete hole, the rollback-loses-grants gap, and the importer `gradeLevel`/`gradeLevels` round-trip mismatch. Reinforces `feedback_codex_over_crossexamine`.

Next session picks up: **start PR1 build** — re-run TEST+PROD count probes → Zod fixture (Task 1.1) → migration + `.rollback` + 2 snapshot tables (Task 1.2) → GATE 2 Codex → `db reset`+`test:rls`+`check` → cut PR1 branch from `chore/wave4-scaffold` → per-PR ritual.
