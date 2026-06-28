# Wave 5 — Reviewer/Admin Features — Execution Status ARCHIVE

**Reference-only.** This file holds session-log entries moved out of the active execution-status doc
(`2026-06-26-wave5-reviewer-admin-execution-status.md`) as each PR cycle closes, to keep the active
doc lean. Don't read end-to-end at session start — `grep -n` for what you need. The active doc's
"Current State" header + "Recent decisions worth carrying forward" + "Out-of-scope follow-ups" remain
the load-bearing orientation; this is the forensic trail.

**Archive log:**
- 2026-06-27 — PR-1a cycle start: moved Sessions 0–2 (scaffold → design-lock → PR-0 built + merged) here.

---

## PR-0 cycle (Sessions 0–2) — scaffold · design-lock · PR-0 safety net SHIPPED (#552, `3258365`)

### Session 0 — 2026-06-26 — scaffold + GATE 1A

Major events:
- Oriented via a parallel-read workflow (roadmap Wave 5 detail · campaign status · ReviewDetail anatomy/seams ·
  personalization-table backend reality) + independent baseline-snapshot cross-check + table shapes.
- Confirmed PR breakdown shape with the user (reversible-first; PR 0 tests → decompose → C107 → C111/112/113 →
  admin tail).
- Scaffolded the four-file pattern (design Draft + impl SKELETON + kickoff + status) on `chore/wave5-scaffold`.
- Ran GATE 1A (Codex gpt-5.5 inline + Claude reviewer); folded 19 findings into the design doc.
- STOP before design-lock and before any implementation code (per session scope). Next: Session 1 = design lock.

### Session 1 — 2026-06-26 — design lock + impl authoring + GATE 1B + RE-SCOPE

Major events:
- **Discovery:** 5-agent read-only workflow (`wf_a536efc9-c53`) re-verified all 11 §5 seam anchors + the
  §5.bis C107 graph + test infra + personalization shapes + render surfaces. Supervisor-verified the 4
  load-bearing corrections against the real files (search-page mock is rpc+functions not `.from()`;
  loadSubmission catch only logs / never hits ErrorBoundary; `useEnhancedAuth` has no `isAuthenticated`;
  bookmark surface = 3 leaves w/ role=button stopPropagation).
- **Locked Q2/Q3/Q4/Q8** from evidence + corrections C-a…C-f into design §4.
- **RE-SCOPE (user-confirmed):** Wave 5 narrowed to **PR 0–2 only** (ReviewDetail test net → decompose →
  C107). Personalization (PR 3–5) + admin tail (PR 6+) **deferred to a future wave** — only ~3 internal
  accounts (general-user login is a later rollout → personalization audience ≈0) + reviewers never collide
  (→ C22/C78 moot). Saved memory `project_user_base_accounts`; updated MEMORY.md + re-scope banners in
  design + impl + this status doc; §§6/7 + Q3/Q4/Q5/Q9/Q6/Q7 retained as future-wave reference.
- **Q1 user-verdict = split** PR-1 into PR-1a (easy seams) + PR-1b (risky core); data hook returns an
  initial-form-state object. Design **Status → Locked**.
- **Authored impl plan PR 0–2 concrete tasks** (0.1–0.3, 1a.1–1a.5, 1b.1–1b.4, 2.1) with file paths,
  anchors, verify cmds, commit msgs.
- **GATE 1B:** Codex (`gpt-5.5`, inline) + Claude reviewer, parallel — both **GO-WITH-CHANGES**, both
  confirmed every PR 0–2 anchor EXACT. Folded all findings into PR-0 (dual-shape mock; `tagged_metadata`
  fixture columns; 3rd `noReviewUpdateFixture` + behaviors 6–9 + 4-state banner coverage to pin
  preselect/auto-expand/view-toggle/closed-enum before their seams move; 1a.2 type co-location; PR-2
  fetch-dependency caveat). No BLOCKER.

Process learnings:
- The re-scope collapsed 5 of the 9 design questions (Q5/Q9/Q6/Q7 → deferred) — surfacing the *audience*
  reality before grinding through mechanism questions saved a lot of motion. Worth asking "who uses this"
  early on any feature wave.
- GATE 1B caught a real coverage gap (PR-0 pinned only the restore branch, not preselect/effect-ordering)
  that would have let PR-1b silently regress — the gate earned its keep on a plan-only review.

Decisions roll-up: see "Recent decisions worth carrying forward" + the design §4 locked answers. Commits:
docs-only on `chore/wave5-scaffold` (see `git log`). Branch not pushed.

### Session 2 — 2026-06-26/27 — PR-0 built end-to-end + GATE 3 + 3 bot rounds + MERGED (#552)

Major events:
- Reconciled a **stale kickoff RIGHT-NOW banner** (still said "design-lock / Draft") against git — design-lock was already done (`61ae519`). Trusted git, repointed the banner at PR-0 (`43ac2f6`).
- **Housekeeping verdict (user): "carry docs forward"** → cut `test/wave5-reviewdetail-safety-net` from `chore/wave5-scaffold`; the 2 scaffold doc commits ride inside PR-0's PR (no separate docs PR).
- **Built PR-0 via 3 fresh-context executor dispatches, each supervisor-verified:** 0.1 table-aware supabase mock (dual-shape terminals) + 3 fixtures (`9d237ae`); 0.2 page-level RTL gate test, 13 behaviors + a 4th `degradedUpdateFixture` for the yellow banner (`3b530ef`, `92213d5`); 0.3 export-in-place helper unit suites + 6 export-only ReviewDetail additions, diff confirmed export-only (`cc1c96d`). Verified `tagged_metadata` (not `metadata`) + the decision enum against real code before accepting fixtures.
- **GATE 3 (pre-push):** code-reviewer agent + Codex (`gpt-5.5`, inline) in parallel on `git diff main...HEAD -- src/`. Rebuttal-passed all 7 findings. **Accepted** C-2 (non-null preselect-target seed unpinned), C-3 (save `submissionId`/`selectedLessonId` + merge-save unpinned), F1 (mock missing `ilike`/`is`/etc.); **accept-lite** F3 (pin doc-embed flag), F2/H-2 (kept honest comment — investigated, **no value≠label case exists** in the frozen closed-enum vocab). **Rejected** C-1 (mock arg-blindness = the locked dispatch-by-table tradeoff; PR-2 manual smoke is the mitigation) + H-1 (candidate-card coverage = PR-1a Task 1a.2's mandatory TDD 4-case unit test). Fix-ups in `ba97c1b`. Grounded the C-2/C-3 accepts by reading the real seed block (L472–486) + save body (L571–579) myself first.
- **Final net:** 15 page-level behaviors + 23 helper units; **full suite 2002 green**, `npm run check` clean, zero production-logic change.
- **Opened PR-0 = #552** (user go-ahead). Round-1 CI all green (E2E/Test&Build/CodeQL/semgrep/Lighthouse/coverage + Security Audit + deploy preview). Four-surface triage: only `claude[bot]` posted (6 findings); no line comments, no review-state reviews, `claude-database-review` silent (no DB). Rebuttal-passed all 6 + GATE-4 2nd opinion: accepted F3 (reviews-error→silent-preselect pin) + F4/F5/F6 (test hygiene), deferred F1 (name collision → PR-1a note), rejected F2 (self-resolves PR-1a). Fix-up `9304e34`; pushed with the docs/status bundle → round 2.
- **Round 2:** all CI green; `claude[bot]` 3 findings → R2-1 (High, error-drop/silent-overwrite) DEFERRED to PR-1b (real bug, out of pure-additive scope; test 12 pins it; recorded as a prominent Out-of-scope follow-up), R2-2 (`@/` alias) + R2-3 (corrected my own inaccurate F5 comment) accepted. Verified both code claims (L323/L390/L397 drop `error`; off-list lookup keys on `targetInRenderedTopFive`) myself before triaging. User verdict: **"quick cleanup, then merge."** Cleanup `61a917d` pushed (round 3).
- **Round 3:** all green + mergeable CLEAN; `claude[bot]` 5 findings = re-raises of already-triaged/deferred items (R3-2=R2-1, R3-3=mock two-terminal, R3-4=PR-1a relocation, R3-5=beforeEach) + one NEW dormant LOW nit (R3-1, mutation-method mock returns read data). Per the **round-cap (3rd = critical-only)** + user authorization → **squash-merged PR-0 (`3258365`, #552)** + deleted the branch. Decomposition gate satisfied.

Process learnings:
- **GATE 3 earned its keep on a test-only PR:** Codex C-2/C-3 found real holes (the non-null-preselect-target seed + the merge-save `selectedLessonId` path were unpinned) that PR-1b's extraction could have silently regressed — the spec'd 9 behaviors missed them. Closing holes for the exact seams the next PR moves is faithful to "covered before any move," not scope creep.
- **Reject discipline mattered too:** two "Critical/High" findings (C-1, H-1) were already mitigated by locked design decisions — accepting them would have re-introduced order-sensitivity (C-1) or duplicated PR-1a's planned coverage (H-1). The rebuttal pass paid off both directions.
- Supervisor-grounding (reading L472–486 / L571–579 myself before triaging the Criticals) made the accept/reject calls evidence-based rather than trusting the reviewers' assumptions.
- **Codex was rate-limited (until 2026-06-29)** — the `codex:codex-rescue` agent auto-fell-back to a direct Claude-family file read for the GATE-4 2nd opinion (`feedback_make_failing_tools_work`). Usable for a low-stakes test-only PR, but NOT a true independent-model-family signal; for a higher-stakes (DB/behavior) round, wait for Codex or escalate. Recorded the weaker-signal caveat in the triage.
- **Calibrated-skipped the pre-push GATE-3 re-dispatch** on the round-1 fix-up (test-only +139, GATE-4-vetted + supervisor-verified, round-2 external bots are the second pass, Codex unavailable). Proportionality over rote ritual — noted explicitly.
- **The bot re-raised the same High finding (R2-1) across rounds 2 and 3**, framing it as "a characterization test that guards the bug instead of a fix." Correct response held: PR-0's job is to PIN current behavior (pure-additive); the FIX + the test-12 update belong in PR-1b where the load logic moves into the hook. Pinning-now-fixing-later is the intended sequence, not an anti-pattern — but the bug is real and is now a tracked, prominent follow-up (data-integrity).
- **Round-cap discipline paid off:** without it, rounds 4/5 would have chased cosmetic re-raises indefinitely. Calling the cap (with each round-3 item explicitly dispositioned, not hand-waved) is the right close.

Decisions roll-up: see "Recent decisions worth carrying forward" + the Out-of-scope R2-1 follow-up. **PR-0 MERGED (`3258365`). Next: PR-1a.**

### Session 3 — 2026-06-27/28 — PR-1a built end-to-end + GATE 3 + 3 bot rounds + MERGED (#553)

Major events:
- **Session-start ritual:** read kickoff + status + design doc end-to-end + impl plan PR-1a section; `npm run check` clean baseline; verified git matches (PR-0 `3258365` merged on main, worktree dirty only with the 2 carry-forward docs + unrelated untracked `docs/plans/*.md`). Confirmed PR-0's 6 `export` helpers + 4 test files present, `ReviewDetail.tsx` = 1,483 lines. User confirmed orientation.
- **Cut `refactor/wave5-reviewdetail-easy-seams` from main** (`3258365`). First commit bundled the carry-forward docs (status + kickoff, from PR-0's merge onto main) + the PR-0-cycle session-log archival (ritual step 5: Sessions 0–2 → new archive file). Untracked unrelated docs NOT staged.
- **Ritual-step-5 learnings audit (Sessions 0–2):** all process learnings already covered by existing feedback memories (GATE 3/round-cap/reject-discipline → `feedback_pr_bot_review_workflow` + `feedback_bot_review_investigation`; Codex-fallback → `feedback_make_failing_tools_work`). The "ask who uses this early on a feature wave" learning overlaps `project_user_base_accounts`; not promoting a new memory mid-initiative — revisit at initiative-close retrospective (ritual step 6).
- **PR-1a build complete (all 5 extractions, each supervisor-verified):** 1a.1 `240663a` · 1a.2 `cf1e469` · 1a.3 `36fcd1c` · 1a.4 `7e5550a` · 1a.5 `8ddd36f`. `ReviewDetail.tsx` 1483→1120 lines (−363/−24.5%). Full suite 2031 green; +28 new unit tests (buildCandidateCards 7, reviewValidation 21). Zero behavior change.
- **GATE 3 (pre-push) — both families CLEAN:** Claude code-reviewer + **Codex `gpt-5.5`** (re-ran after the user reset the usage limit → genuine cross-family signal, not a fallback) both confirmed byte-parity across all 5 extractions + the dep-array superset reasoning + banner invariant + dedup/ordering + no circular imports + prop completeness. Zero behavior drift. No fix-ups.
- **PR #553 opened (2026-06-28); 3 bot rounds, all `claude[bot]`, no `claude-database-review` (no DB), all CI green every round.** Round 1: 7 findings; accepted comment-cleanup (non-semantic) + misleading-`(new)`-comment fix; rejected the `return null` guard (behavior change); deferred F1 logger (GATE-4 Codex AGREE-DEFER) / F3 / F5 / F6. Round 2 (fix-up `f708d44`): "shippable as-is," 5 non-blocking; R2-A corrected MY F1 note (verified `GoogleDocEmbed` myself: error → "Unable to Load Document" screen + MANUAL "Show Text View" button, not silent fallback); R2-B/R2-C = real branch-coverage holes → added 2 cases (additive); R2-D/R2-E/F6 → deferred to PR-1b cosmetic bucket. User: "add 2 tests, then merge." Round 3 (final, `383dbfa`): "No correctness bugs found"; GATE-4 Codex on the one "needs-fix-before-merge" flag (`ReviewDocPanel:31` unvalidated localStorage cast) → AGREE-DEFER-AND-MERGE (verified byte-identical + sole-writer + no reachable invalid-value path; bonus: found an unused `ReviewContent.tsx` referencing the key). **Squash-merged PR-1a (`e4c248d`, #553)** + branch auto-deleted. main: `ReviewDetail.tsx` 1,120 lines, all 6 modules present.

Process learnings:
- **Supervisor-verify caught the one risky change every time:** 1a.5's `[metadata]` dep-array narrowing was the sole non-byte-identical edit; the executor flagged it, I reasoned the superset property, and BOTH GATE-3 families + BOTH later bot rounds independently confirmed it — exactly the verify-chain working as designed.
- **`feedback_bot_review_investigation` cuts both ways:** investigating R2-A myself (reading `GoogleDocEmbed.tsx`) revealed MY OWN tracked F1 note was wrong ("auto-recovery" → actually a manual button). Investigate every finding, including the ones that flatter the bot — sometimes they correct you.
- **GATE-4 earns its keep at the merge boundary:** the bot escalated a pre-existing localStorage cast to "needs fix before merge"; a 1-min Codex 2nd opinion (AGREE-DEFER) let me merge over it with confidence + a documented rebuttal, rather than either blocking or hand-waving.
- **Round-cap + "deliberate final round" framing:** round 3 added 2 genuinely-valuable safety-net coverage tests (not bot-chasing) and then HARD-capped — the cap is against thrash, not against valuable additive work.

Decisions roll-up: PR-1a SHIPPED (`e4c248d`, #553). Next: PR-1b (core/risky seams + the R2-1 fix). All cosmetic-cleanup nits folded into the PR-1b cleanup bucket (carried in the live status doc's Out-of-scope section).
