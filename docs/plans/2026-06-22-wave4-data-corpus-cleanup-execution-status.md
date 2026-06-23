# Wave 4 — Data / Corpus Cleanup — Execution Status

**Last updated:** 2026-06-22 by Session 4 (**PR3 SHIPPED → WAVE 4 COMPLETE**)

## Current State

**Phase:** **✅ WAVE 4 COMPLETE — all 3 PRs shipped + verified.** PR1 (C12+C83) = #538 `9f75a15` (PROD-applied + MCP-verified). PR2 (C11 ghost hard-delete + C49) = #539 `af75f65` (PROD-applied + MCP-verified; corpus 767→764). **PR3 (C88 dev-seed) = #540 squash `9db76d3` (merged 2026-06-22).** Active branch = `main`. **No further Wave-4 work.** C08 closed as a no-op; **C02 relocated to its own `scripts/stage2-retag` session (next-up, separate).** Defer C01 + C09/C07/C03.

**PR3 summary (C88 — no DB write, no migration, no PROD mutation):** authored `scripts/export-dev-seed.mjs`, a read-only PROD→local seed generator (anon publishable key only; parsed-`new URL().hostname` prod-guard; count-first paging + truncation/zero-row/invariant guards) + shared `scripts/lib/grade-levels.mjs` resolver (`gradeLevels ?? gradeLevel`, empty-array-safe) wired into BOTH `import-data.js` and `identify-and-restore-missing-lessons.ts` + `npm run export-dev-seed` + `scripts/README` docs. **The seed `data/consolidated_lessons.json` stays GITIGNORED** (it was deliberately removed + ignored in #133; the generator is the durable fix vs a re-staling committed snapshot — `[user-verdict]` Option B). **Round-trip gate (supervisor, local DB): 764/764 rows import with non-NULL `grade_levels`, 0 empty, 0 mismatch.** 3 bot rounds all triaged with GATE 3 (Claude reviewer + Codex) + GATE 4 (Codex, different family); notable calls: substring prod-guard → parsed-hostname exact-match (Codex-verified unbypassable); **rejected** the bot suggestion to soften the truncation guard (would hide silent data loss; Codex confirmed); corrected two overstated bot rationales (anon-key "exfiltration" — it's the public key; "data/ missing on clone" — `data/vocab/*` is tracked); documented (not over-engineered) a benign offset-paging race. Round-capped at round 3 (F1 reject, F2 EXPORT_SOURCE_URL deferred-as-harmless, F3 stale-count fixed).

**PR2 PROD verify (supervisor MCP, source of truth):** migration recorded; corpus live **767→764 (−3 delta)**; ghosts present/by-identity **0/0**; `wave4_c11_ghost_rollback` = **3** (recovery artifact preserved); `search_lessons` = **1 overload / 15-arg**, no `filter_lesson_format`; `search_lessons()` total_count **764** with **0 ghosts in results**; all 13 ref-probes post-delete **0**. TEST verify identical (745→742). PROD pre-approval scan was all-clear (3 ghosts, 0 cascade children, 0 probes) immediately before apply.

**PR2 commits** (squashed into `af75f65`):
- `5310754` refactor(wave4): drop dead `filter_lesson_format` frontend param (C49) — useLessonSearch.ts 4-line removal; urlParams guard 36/36 green.
- `aacf9d3` feat(wave4): hard-delete 3 ghosts + clean `search_lessons` RPC (C11, C49) — migration + `.rollback` + types regen (GATE 2/3/4 hardenings folded).
- `0f2f353` docs(wave4): status checkpoint.

**PR2 migration shape (`20260622010000_wave4_pr2_delete_ghosts_search_rpc.sql`):** snapshot 3 ghosts → `wave4_c11_ghost_rollback` (RLS, no policy); snapshot-completeness guard; CASCADE-child guard (`LOCK TABLE bookmarks, canonical_lessons IN SHARE MODE` + assert 0 children — atomic, fail-loud); env-independent + idempotent + **snapshot-driven** guarded DELETE (3 on TEST/PROD, 0 on local); recreate `search_lessons` from w1b baseline minus BOTH ghost-exclusion blocks + minus `filter_lesson_format` (15-arg) + re-GRANT(15-arg) + NOTIFY pgrst. `.rollback` recreates the prior 16-arg RPC (+re-GRANT/NOTIFY) + re-inserts snapshot. Independent supervisor diff: RPC recreate = EXACTLY the 3 mandated edits; rollback CREATE byte-identical to w1b.

**Pre-flight re-verified (supervisor, TEST+PROD, 2026-06-22):** corpus TEST 766/745/21 · PROD 788/767/21; ghosts identity_guarded=3 both; all 13 ref probes=0 both; 0 CASCADE children both → post-delete is a **−3 DELTA**. Live `search_lessons` was ONE 16-arg overload (incl. `order_by`) — forward DROP targets THAT (not w1b's pre-C58 15-arg DROP).

**Local verify:** `supabase db reset` applies clean (NOTICE `C11: hard-deleted 0`); function = 1 overload / 15-arg; migration recorded; `npm run check` exit 0; `test:rls` green (2 pre-existing unrelated `archive_duplicate_lesson` failures).

**Gates (PR2 pre-push):** GATE 2/3 Claude code-reviewer raised 1 CRITICAL (DROP allegedly 15-arg) → **REJECTED, false positive** (verified 16-arg pos-9=`text`; local overload_count=1 disproves). GATE 2/3 Codex → 7 findings; ACCEPTED 3 (CASCADE-child guard, snapshot-driven DELETE, PK-comment fix), REJECTED 4 (rationale logged). GATE 4 Codex re-confirm → points 2/3/4 clean; 1 new HIGH (CASCADE-guard TOCTOU) ACCEPTED → `LOCK TABLE` fix. All hardenings folded into `aacf9d3` + re-verified local.

> ⚠️ **Status-file reconciliation (Session 3):** the prior header claimed PR1 was "BUILT + UNPUSHED — awaiting user go." Git showed it had been pushed→merged→PROD-applied since Session 2 closed (the push/merge cycle was never recorded in this file). Per the session-start ritual, git is authoritative; this header was corrected to match reality after independent TEST+PROD MCP re-verification.

**PR1 — final landed state** (migration `20260622000000_wave4_pr1_close_stuck_submissions_fix_season.sql` + `.sql.rollback` + 2 snapshot tables, in `main`):
- **Supervisor independent re-verification (Session 3, read-only MCP, TEST + PROD) — all probes green:**
  - C12: stale `submitted` remaining **0/0** (TEST/PROD); closed **17 (15 new + 2 update) TEST / 14 (14 new + 0 update) PROD**; snapshot rows **17 TEST / 14 PROD**.
  - C83: string `season` remaining **0/0**; snapshot rows **17/17**; `[]` fallbacks **3/3**; non-empty arrays **14/14**.
  - All counts match the locked design + the merge-commit body exactly. Data-safe.

**Gate history (PR1, pre-merge — for the record):**
- **GATE 2** (Codex, pre-TEST): BLOCK → ACCEPTED 3 (snapshot-driven UPDATE/TOCTOU; target-scoped post-condition; atomic single-block rollback) + REJECTED 1 (drop-snapshot-in-rollback — contradicts the locked retain-as-recovery-artifact design).
- **GATE 3 Claude** code-reviewer: CLEAN. **GATE 3 Codex** (round 2): BLOCK → ACCEPTED 1 (LEFT-JOIN null-safe post-condition) + REJECTED rest (out-of-pipeline theoreticals). Re-apply caveat documented in the rollback header.
- (Push→bot-round→merge→PROD-approval cycle happened after Session 2's last status write; not separately logged here. The authoritative proof is the green TEST+PROD MCP re-verification above + run `27987378389`.)

**Remaining scope:** **PR 2 — Ghost hard-delete + RPC (C11 + C49)** — HIGHEST RISK, irreversible; branch from `main` (PR1 merged). PR 3 — dev seed (C88), independent, anytime, no DB write. C08 closed (no-op); C02 relocated to its own `stage2-retag` session.

**What the next step picks up (on user go):** start **PR2** — invoke `database-migrations`; re-run the C11 split-by-enforcement pre-delete scan on TEST **and** PROD with verbatim IDs (identity=3, all 14 ref probes=0, guarded count=3, 0 CASCADE children) before authoring; write the guarded hard-DELETE + snapshot table + `search_lessons` exclusion removal (C11) and the `filter_lesson_format` param/frontend/types cleanup (C49); GATE 2 Codex on the SQL; `supabase db reset && npm run test:rls && npm run check`; cut `chore/wave4-pr2-...` from `main`; per-PR ritual. **Explicit user go required for the specific PROD hard-delete.**

**Blockers:** none. PR1 closed clean.

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

- **Nothing building. ✅ WAVE 4 COMPLETE** — PR1 #538, PR2 #539, PR3 #540 all shipped. No open Wave-4 work.
- **PR-cycle archival:** folded into close — for a closed initiative the full Session 0–4 log stays in this doc as the historical record (not split to `-execution-status-archive.md`). Memory-promotable learnings were lifted to `project_deferred_work_campaign` + the satellite at close.
- **Next initiative (separate): C02** cooking_skills/main_ingredients vocab re-tag in its own `scripts/stage2-retag` session — carry-forward findings in design §3.1/§4 Q11–14a/§8.

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

### Session 3 — 2026-06-22 — PR1 reconciliation + PR2 (C11+C49) built → shipped → PROD-verified

Major events:
- **Caught a stale status file at session start:** it claimed "PR1 unpushed," but git showed **#538 merged + PROD-applied** (run `27987378389`). Trusted git, **independently re-verified PR1 on TEST+PROD via MCP** (all probes matched the locked design: C12 17/14 closed, C83 0 string / 17 snapshot / 3 `[]`+14 arrays), corrected the header. **Learning → promote: a /clear'd supervisor MUST diff git vs the status file first; the push→merge→PROD cycle from the prior session was never recorded.**
- **PR2 pre-flight (load-bearing, supervisor):** re-ran the full Q8 pre-delete scan on **TEST+PROD** (3 ghosts, identity-matched, all 13 ref-probes 0, 0 cascade children). **Caught two design-vs-reality gaps before authoring:** (a) the live `search_lessons` is the **16-arg** post-C58 signature (incl. `order_by`) — the forward DROP must target THAT, not w1b's line-184 pre-C58 15-arg DROP (would silently no-op → duplicate overload); (b) **local has 0 ghosts** → the impl-plan's literal "assert exactly 3 deleted" would fail `db reset` locally → re-shaped to an **env-independent + idempotent** guard (user-approved) consistent with PR1's pattern.
- **PR2 build:** Task 2.1 (C49 frontend, supervisor-direct 4-line delete; urlParams 36/36) + Task 2.2 (executor: migration + `.rollback` + types regen). Supervisor independently **diffed the `search_lessons` recreate vs w1b = exactly the 3 mandated edits**, and confirmed the rollback CREATE byte-identical to w1b.
- **3 gate rounds:** GATE 2/3 Claude reviewer raised 1 CRITICAL ("DROP is 15-arg") → **disproved 3 ways** (direct arg-count = 16, `text` at pos 9; local `overload_count=1`; Codex non-corroboration) = **false positive**. GATE 2/3 Codex → 7 findings, **accepted 3** (CASCADE-child guard, snapshot-driven DELETE, PK-comment fix) + rejected 4. GATE 4 Codex re-confirm → points 2/3/4 clean + 1 new HIGH (CASCADE-guard TOCTOU) → accepted, added `LOCK TABLE … IN SHARE MODE`. All folded while the migration was still local/unpushed (editable).
- **Shipped:** pushed → PR #539 → all CI + 4 bots pass → **TEST MCP verify all-green (−3 → 742)** → 2 post-merge bot nits triaged as non-issues (pushed migration, verified-impossible, fix=churn) → user merged (`af75f65`) → final PROD pre-approval scan clean → user approved → **PROD apply succeeded + MCP-verified (−3 → 764, ghosts gone, snapshot=3, clean 15-arg RPC, 0 dangling)**.

Decisions/learnings (promote at initiative close):
- **Cross-family + multi-signal verification earned its keep AGAIN:** the same-family Claude reviewer's lone CRITICAL was a miscount; the disproof came from a direct probe + the live DB overload count + Codex's non-corroboration. Never act on a single reviewer's CRITICAL without an independent probe.
- **Codex (different family) surfaced the real data-safety hardenings** (snapshot-driven delete, CASCADE-child guard + its TOCTOU) that the same-family pass missed — reinforces `feedback_codex_over_crossexamine`.
- **Supervisor pre-flight against the LIVE schema (pg_proc/pg_constraint) is load-bearing:** the 16-vs-15-arg DROP and the local-0-ghosts guard reshape were both invisible in the docs and would have been silent bugs.
- **Env-independent guards (pass on 0 rows locally, enforce where rows exist, idempotent) are the house pattern** for corpus mutations that must traverse local→TEST→PROD (PR1 + PR2 both).

Next session picks up: **PR3 (C88)** — fresh session. Cut `chore/wave4-pr3-dev-seed-refresh` from `main` (carries this session's uncommitted status-doc update); do the PR-cycle archival of Session 0–3 entries first; then author the read-only generator + round-trip-test the seed.

### Session 4 — 2026-06-22 — PR3 (C88) build → ship → merge → **WAVE 4 COMPLETE**

Major events:
- **Orientation:** caught the standing git-vs-status drift (header said "branch main / PR3 next"; git showed `chore/wave4-pr3-dev-seed-refresh` already cut with the Session-3 status commit `694af98`). Trusted git. **Supervisor pre-flight against live PROD (read-only MCP):** live=764 (not the doc's TEST-derived "~745"), 0 rows with `metadata.lessonFormat`, `anon` HAS direct SELECT on `lessons` (policy "viewable by everyone" `USING(true)`) — so the anon-key generator path is viable; `neither_key=0` + `col_empty_or_null=0` → emit-metadata-as-is + importer `gradeLevels ?? gradeLevel` guarantees non-NULL grades for all 764.
- **Task 3.1 (executor + supervisor re-verify):** `scripts/export-dev-seed.mjs` + `scripts/lib/grade-levels.mjs` (+ TDD test) + `import-data.js` resolver swap. **Round-trip gate (supervisor, local DB): 764/764 import non-NULL `grade_levels`, 0 empty/mismatch.**
- **`[user-verdict]` — seed stays GITIGNORED (Option B):** discovered the seed was deliberately removed + gitignored in #133 (the executor force-added it); surfaced the reverse-a-prior-decision choice; user chose keep-gitignored → the generator is the deliverable. Rebuilt the commit to exclude the 1.7M seed; added `npm run export-dev-seed` + README.
- **GATE 3** (Claude reviewer + Codex) pre-push; **3 bot rounds** each GATE-4-Codex'd (different family). Real fixes folded: sibling importer `identify-and-restore-missing-lessons.ts` (same grade bug, blast-radius-swept) → shared resolver; substring prod-guard → parsed-hostname exact-match; null-guard; mkdir insurance; stale-`831` message. **Rejected** softening the truncation guard (would hide silent data loss; Codex confirmed). Round-capped at round 3.
- **Shipped:** PR #540, all CI green every round → user go → **squash-merged `9db76d3` → Wave 4 COMPLETE.**

Decisions/learnings (promoted to `project_deferred_work_campaign` at close):
- **Verify a plan's FILE TARGETS against actual VCS status before "refreshing"** — the plan's "re-export `data/consolidated_lessons.json`" implied a committed file; it was deliberately gitignored in #133. Instance of "look at the target before overwriting."
- **Doc counts are point-in-time** — the design's "~745" was a TEST number; PROD-live was 764. Always re-query.
- **Cross-family GATE3/4 Codex earned its keep again** (caught the substring-guard bypass; confirmed the truncation-guard reject). Reinforces `feedback_codex_over_crossexamine`.
- **Initiative CLOSED.** Next (separate): C02 vocab re-tag in its own `scripts/stage2-retag` session.
