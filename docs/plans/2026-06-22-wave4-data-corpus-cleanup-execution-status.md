# Wave 4 — Data / Corpus Cleanup — Execution Status

**Last updated:** 2026-06-22 by Session 2 (PR1 build)

## Current State

**Phase:** PR1 (C12 + C83) **BUILT + locally verified + dual-gate-reviewed**, on branch `chore/wave4-pr1-reversible-cleanups` (cut from `chore/wave4-scaffold`). **UNPUSHED — awaiting user go to push** (push starts the CI → TEST-apply cycle).

**PR1 commits** (atop scaffold + design-lock `bd64f14`):
- `daf1499` test(wave4): C83 Zod contract-lock fixture (6 assertions, field-isolated `.shape.season`; green).
- `c84b676` feat(wave4): C12 + C83 migration `20260622000000_wave4_pr1_close_stuck_submissions_fix_season.sql` + `.sql.rollback` + 2 snapshot tables (hardened through 2 Codex rounds).

**Evidence re-verified (supervisor, TEST+PROD, 2026-06-22) — baseline holds exactly:** C12 TEST 17 (15 new+2 update) / PROD 14 (14 new, 0 update), 0 submitted after 2026-05-01 on both; C83 TEST=PROD 17 string (year-round×13/end-of-year×2/winter×2) / 96 array; linkage 17/17/14/3/0/0 (unresolved=0, non_array=0 → the C83 pre-guard will never fire).

**Migration shape (hardened):** env-independent date-threshold scope (NO hardcoded 17); both C12 UPDATEs + C83 pre-guard/CTE are SNAPSHOT-DRIVEN (`UPDATE … FROM snapshot`, guarded `status='submitted'`/`jsonb_typeof='string'`) so mutation ⊆ snapshot + idempotent; C83 fail-loud pre-guard + dual post-condition (target-scoped LEFT-JOIN null-safe + whole-table `string=0`); rollback = single atomic `DO` block with the `updated_at` trigger disabled for exact restore; both snapshot tables RLS-enabled/no-policy, retained as recovery artifact.

**Local verify:** `supabase db reset` applies clean (both RAISE NOTICE lines, 0 rows local); `npm run test:rls` ✅ (16/16; the 2 `archive_duplicate_lesson` scenario failures are pre-existing/unrelated); `npm run check` exit 0.

**Gate results (PR1 pre-push):**
- **GATE 2** (Codex, pre-TEST): BLOCK → 4 findings. ACCEPTED 3 (snapshot-driven UPDATE/TOCTOU; target-scoped post-condition; atomic single-block rollback) + REJECTED 1 (drop-snapshot-in-rollback — contradicts the locked retain-as-recovery-artifact design).
- **GATE 3 Claude** code-reviewer: CLEAN (no high-confidence findings; confirms conformance + the 3 fixes correct).
- **GATE 3 Codex** (round 2): BLOCK → ACCEPTED 1 hardening (LEFT-JOIN null-safe post-condition) + REJECTED rest (retained-snapshot counterexample needs an out-of-pipeline manual re-apply; scalar fail-loud is working-as-designed). Re-apply caveat documented in the rollback header.

**Remaining scope:** PR 2 — Ghost hard-delete + RPC (C11 + C49), highest risk, branch from `main` after PR1 merges. PR 3 — dev seed (C88), independent, anytime. C08 closed (no-op); C02 relocated to its own `stage2-retag` session.

**What the next step picks up:** on user go — push `chore/wave4-pr1-reversible-cleanups` + `gh pr create`; per-PR ritual (wait for external bots → 4-surface triage → rebuttal + GATE 4 → fix-ups). After CI applies to TEST: `mcp__supabase-test__execute_sql` verify (17 closed + 2 note texts, 0 string season, 3 fallbacks `[]`, snapshot tables 17/17). PROD MCP verify after the manual approval gate (14 closed; season identical).

**Blockers:** none (Codex's residual BLOCK rests on out-of-supported-pipeline scenarios, rejected with written rationale; user to weigh in before push).

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
- **Session 1:** design-lock — discovery workflow, supervisor TEST+PROD re-verify, 6 user verdicts, design doc flipped to LOCKED + reshaped to 3 PRs, impl plan tasks authored. GATE 1B Codex review dispatched + folded (`bd64f14`).
- **Session 2:** PR1 build — re-verified TEST+PROD baseline; Task 1.1 C83 Zod fixture (`daf1499`); Task 1.2 C12+C83 migration+rollback (`c84b676`); GATE 2 + GATE 3 (Claude clean, 2 Codex rounds triaged); locally verified. **PR1 unpushed, awaiting user go.**

## In flight

- **PR1 built + verified + gated; UNPUSHED.** Next action = push + `gh pr create` on user go, then per-PR ritual + TEST-DB verify after CI applies.

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

### Session 2 — 2026-06-22 — PR1 build (C12 + C83)

Major events:
- **Re-verified the evidence baseline myself** (read-only MCP) on TEST + PROD: all six probes matched the doc exactly (C12 17/14, C83 17-string/96-array, linkage 17/17/14/3/0/0). Cut `chore/wave4-pr1-reversible-cleanups` from `chore/wave4-scaffold` @ `bd64f14`.
- **Task 1.1** (executor + main-loop re-verify): C83 Zod contract-lock fixture, 6 assertions incl. field-isolated `.shape.season.safeParse` so the string-rejection is proven against the `z.array(SeasonTimingEnum)` enum-array contract, not object completeness. `daf1499`, test green.
- **Task 1.2** (executor + main-loop re-verify): C12+C83 migration + `.sql.rollback` + 2 snapshot tables. Supervisor independently confirmed the trigger name (`trigger_lesson_submissions_updated_at`, baseline:2774), the `status` CHECK includes `'rejected'`, the `.sql.rollback` convention. `c84b676`.
- **GATE 2 Codex** (different family) returned **BLOCK** while the same-family Claude verifier returned "sound" — the cross-family value. Accepted 3 (snapshot-driven UPDATEs to close a TOCTOU window; target-scoped post-condition; single-atomic-block rollback) + rejected 1 with rationale (drop-snapshot-in-rollback contradicts the locked retain-as-recovery-artifact design). Folded the 3 fixes by `--amend` (unpushed).
- **GATE 3:** Claude code-reviewer = CLEAN (independently confirmed the 3 fixes correct). Codex round 2 = BLOCK on residual edge cases → accepted 1 cheap hardening (LEFT-JOIN null-safe post-condition) + rejected the rest (retained-snapshot counterexample needs an unsupported manual re-apply; scalar fail-loud is working-as-designed). Documented the re-apply caveat in the rollback header. Re-verified local + re-amended (`c84b676`).

Decisions/learnings:
- **Cross-family review earned its keep again**: same-family Claude said "sound", Codex (different family) surfaced the snapshot-vs-mutation TOCTOU + the non-atomic rollback. Accept Codex's data-safety hardenings even when low-probability, reject its out-of-pipeline theoreticals with written rationale (reinforces `feedback_codex_over_crossexamine`).
- **codex:codex-rescue backgrounds + drops findings even when told "return inline"** — the fix that worked: dispatch with an explicit *poll-until-findings* contract ("never return saying 'running in background'; poll `result` in a loop"). The first GATE-3 Codex dispatch backgrounded at 5.7 min and was unrecoverable (no SendMessage tool available in this env). (Promote to `feedback_codex_return_inline` on close.)

Next step picks up: **push PR1 on user go** → per-PR ritual → TEST-DB MCP verify after CI applies → PROD verify after manual approval.
