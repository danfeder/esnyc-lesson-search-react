<!-- ===== START OF KICKOFF BODY (paste from here onward) ===== -->

You are continuing execution of **Theme B — Public "Broken-Windows" UX** (Wave 1 of the deferred-work campaign).
This prompt is pasted at the start of every session in this work — assume no prior conversation context. Treat what's on disk + git history + the execution status file as your only source of truth.

# WHAT YOU'RE BUILDING

The public lesson-search page — the only surface a teacher sees — has a cluster of outright-broken behaviors, all verified live against `main` @ `4e06e63` by a 10-agent discovery pass (2026-06-20) and Gate-A-reviewed. Theme B fixes them as Wave 1 of the campaign, in three risk-tiered sub-waves. W1a (pure-frontend) ships first as two PRs.

4 sequential PRs:
  PR 1 (W1a-cosmetic-a11y): C57 mobile filters · §3.2 checkbox a11y · copy/a11y one-liners (·Internal wordmark, SR announcer, dialog name, nested `<main>`) · C69 activityType badge · C84 suppress tags badge. Near-zero risk, no DB.
  PR 2 (W1a-behavior): C59 search loading-state (+ new IntListSkeleton) · C14 IntFormField ARIA · C79 LessonSearchPicker keyboard nav. Net-new code, no DB.
  PR 3 (W1b-search-rpc): ONE `search_lessons` migration — C136 (`&` crash) · C58 real sort · C11 ghost exclusion + deterministic order · location-Both · C84 path-a (expose tags). **SKELETON — lock design §4 Q1–Q5 first.** TEST-DB-gated.
  PR 4 (W1c-url-state): C114/C157 URL persistence. **SKELETON — lock design §4 Q6–Q8 first.** Pure-frontend.

# WHERE THINGS LIVE

- /Users/danfeder/cCode/esynyc-lessonsearch-v2/docs/plans/2026-06-20-theme-b-public-ux-design.md
  The WHY behind every decision (Gate-A-reviewed). Read once at session start. Status: **W1a Locked**; W1b/W1c carry enumerated open questions (§4) that lock at their PR-cycle start. Settled W1a decisions are NOT debatable.

- /Users/danfeder/cCode/esynyc-lessonsearch-v2/docs/plans/2026-06-20-theme-b-public-ux-implementation.md
  The WHAT. Per-task file paths, code snippets, test commands, commit messages. PR1/PR2 are concrete; PR3/PR4 are skeletons (author their tasks after locking the relevant design §4 questions). Verify every snippet against current code before applying — anchors + corpus counts drift; repo-conformance adaptations OK, product/design changes are not (stop and ask).

- /Users/danfeder/cCode/esynyc-lessonsearch-v2/docs/plans/2026-06-20-theme-b-public-ux-execution-status.md
  Source of truth for WHERE we are. Survives /clear. The "Current State" header at top is the load-bearing orientation piece.

- /Users/danfeder/cCode/esynyc-lessonsearch-v2/docs/plans/2026-06-20-theme-b-public-ux-execution-status-archive.md
  (May not exist yet — created at each PR-ship boundary.) Prior-session journal, reference-only via `grep -n`.

# SESSION-START RITUAL (do this FIRST, every session)

1. Read this whole prompt.
2. Read the active execution status file (Current State header is enough to orient; don't read the archive).
3. Read the design doc end-to-end. Settled W1a decisions are NOT debatable (see LOCKED below).
4. Read the implementation plan from the task you're about to start through the next 1-2 tasks.
5. `git status --short --branch && git branch --show-current && git log --oneline -10` — confirm git matches the status file. If they diverge, trust git, then fix the status file before proceeding.
6. If the worktree is dirty, identify whether the changes belong to Theme B before touching them. Never revert/overwrite unrelated user changes. If unsure, ask.
7. `npm run check` (= type-check + lint) — confirm a clean baseline. If it fails and the cause is unrelated to this branch, report + ask before changing unrelated files. (The Security-Audit CI check is expected-red — pre-existing `npm audit`/lhci noise — not a baseline failure.)
8. Tell me where you are and what task is next. Don't start coding or dispatch the first executor until I confirm orientation.

# EXECUTION MODE — SUPERVISOR + FRESH-CONTEXT SUBAGENTS

This session runs as a SUPERVISOR. You own orientation, user checkpoints, decisions, verification, and status bookkeeping — impl-plan tasks are EXECUTED by dispatched subagents (Agent tool) with fresh context. Keep supervisor context light so one session carries several tasks before a /clear + re-paste.

Supervisor context discipline:
- Delegate bulk reading (multi-file exploration, long diffs) to subagents that return conclusions.
- One impl-plan task per executor dispatch — never bundle two.
- Verify in the main loop before accepting any result — LOAD-BEARING (`feedback_workflow_orchestration.md`: supervisor verification catches real agent misses). Re-run the task's cheap checks yourself (`npm run check`, the task's key test), inspect `git show --stat`, spot-check the artifact.
- Checkpoint as you go: refresh the status Current State header after EACH verified task, not only at session end.
- When context gets heavy, run the session-end ritual and hand off. Don't START a dispatch you can't also afford to verify + checkpoint.

Per executor dispatch, the subagent prompt MUST contain (it never sees this kickoff): the three doc paths + the task ID (with "read the design doc + your task section from disk first"); a digest of the LOCKED decisions + the NEVER list + (for PR3) the DATA-SAFETY/MIGRATION blocks; which skills the task needs (TDD, `database-migrations` for PR3); boundaries (commit on the feature branch OK; NEVER push, open a PR, touch PROD, or edit the four scaffold docs — the supervisor owns those); "if blocked or anything on disk contradicts the locked design, STOP and report — do not improvise" (subagents can't ask the user); required report = what was done + commits + verification commands run + ACTUAL output.

Supervisor-only (never delegated): user communication, `[user-verdict]` decisions, push / PR open (announce, don't ask) / merge / PROD approval, bot-round triage, all edits to the four scaffold docs.

This session has an ultracode/Workflow opt-in active: for fan-out phases (e.g. discovery, multi-finding verification) the Workflow tool is the preferred orchestration (executor → adversarial verifier); same context discipline + supervisor-verify gate apply.

# LOCKED DECISIONS — do NOT re-debate (full canonical list in the design doc §3–§5; pinned here = most at-risk)

- **Theme B = all of Wave 1**, three sub-waves: W1a frontend (2 PRs) → W1b one search-RPC migration → W1c URL state. **W1a ships first.**
- **W1a = 2 PRs split by risk:** PR1 cosmetic/a11y/facet (near-zero risk); PR2 C59 + C14 + C79 (net-new code).
- **Checkbox a11y (§3.2) IS in W1a PR1** (user decision 2026-06-20) — the highest-leverage public a11y win.
- **C84 = suppress the tags badge in PR1** (frontend stopgap); make-it-real (expose `tags` in the RPC + `LessonMetadata.tags` type + `normalizeMetadata`) is folded into **W1b**.
- **C57 fix = move the base `.int-mobile-filter-btn` rule above the `@media(max-width:767px)` block** (Option A) — no specificity hacks.
- **C59 skeleton = build a small `int-*` `IntListSkeleton`** (design cohesion per `feedback_design_cohesion.md`), NOT inline animate-pulse. Plus the Gate-A caveats: neutral empty hint for no-filter empty, guard the infinite-scroll trigger during placeholder, "stale results visible during refetch" is intended UX.
- **C69 = counting-side slug↔noun map in `facetCounts.ts`** (mirror `tallyHeritage`); **NO `'both'` fan-out** (retired; verbatim fallback); **fix the masking test fixtures**; do NOT change `filterDefinitions.ts` option values.
- **Nested-`<main>` = downgrade SearchPage's inner `<main>` to `<div id="main-content" className="int-main" tabIndex={-1}>`; keep App's `<main>`.** SkipLink stays search-route-only (app-wide skip link is out of scope).
- **C79 is internal-only** (submitter + reviewer); goes in PR2.
- **W1b migration is DROP FUNCTION + CREATE (not body-only CREATE OR REPLACE) IF `order_by` lands** — adding a param changes the signature (precedent `20260514000000`).

Out of scope (captured in design §9 — do NOT scope-creep):
  - Split-view dead-end <1100px (review §3.4) + toolbar overflow <768px (§4.8) — public P1/P2 NOT in the roadmap's Wave 1; flagged for a future wave.
  - Reviewer-side fixes (summary field, UserProfile titles, ReviewDashboard pagination, AI-draft chips, draft persistence) — Wave 5.
  - ReviewDetail decomposition (§3.8) — Wave 5, page-level tests first.
  - Closed-vocabulary selects (§3.9) — timed to Stage-2 vocab.
  - Display-layer label hygiene (§4.5), search AND-semantics (§4.6), unaccent — later waves.
  - Ghost-row **deletion** (W1b only HIDES them from search) — Wave 4 data-cleanup, pre-delete FK checklist.

If you want to "improve" the design or plan mid-execution, STOP and surface it. Don't unilaterally rewrite the spec.

# HARD RULES (enforce every action)

DATA SAFETY (top priority — PR3/W1b only):
- Schema changes ONLY through migration files. Never apply schema directly to PROD via MCP.
- Before merging the W1b PR: wait for CI to apply the migration to TEST, then verify via `mcp__supabase-test__execute_sql` against the live corpus (`search_lessons('herbs & spices')` returns rows; sort changes order; ghosts excluded; Indoor returns Both; tags present). Re-verify each post-bot-round that touches DB state.
- After PROD migration applies: verify via `mcp__supabase-remote__execute_sql` (3-signal). Mandatory — CI verify has known flakes (`reference_ci_flakes.md`).
- When in doubt about touching prod data, ask first.

MIGRATION DISCIPLINE (PR3/W1b only):
- Before touching any file in `supabase/migrations/`, invoke the `database-migrations` skill (and `/new-migration`).
- Verify the new migration's date prefix sorts AFTER the latest existing one (`ls supabase/migrations | sort | tail -3`). ASCII gotcha: digits < underscore (per MEMORY.md migration-naming note).
- **GATE 2 (Codex, pre-TEST):** before opening the PR / applying to TEST, run a Codex adversarial review of the migration SQL (idempotency, DROP/CREATE+GRANT completeness, the C11 ID-exclusion safety, quoting/escaping, the C136 sanitizer's match parity, rollback completeness). Triage + fix before push. ADDITIVE to the migration skill + local reset/RLS tests + TEST/PROD verification.

CODEX ADVERSARIAL REVIEW (the plugin IS installed — use it): Codex is a different model family (catches a different failure distribution). USER-invoked slash commands (`/codex:adversarial-review [--base <ref>] [--scope branch] [focus…]`, `/codex:review`, `/codex:status`, `/codex:result`) — you cannot fire them from the Skill tool. When driving a gate autonomously, dispatch the `codex:codex-rescue` agent (it runs Codex via the shared runtime) for the review. Triage Codex findings with the SAME discipline as bot reviews (`feedback_bot_review_investigation.md`): written rebuttal pass on EVERY finding; default-reject hardening that fails the user-visible-bug-or-DB-risk bar (these are internal-tool / low-risk PRs — calibrate acceptance accordingly). Codex is an INDEPENDENT input, not a replacement for the supervisor-verify gate or user judgment.
- GATE 1 (plan-lock) already done for W1a (design Gate A folded 2026-06-20). For PR3/PR4: GATE 1B (review the authored tasks) after locking design §4 questions, before dispatching executors.
- GATE 2 (pre-TEST migration): see MIGRATION DISCIPLINE.
- GATE 3 (pre-push): see PER-PR step 1.

PER-PR RITUAL (every PR — compact; canonical detail in the cited auto-loaded memories):
1. Pre-push: DISPATCH a code-reviewer agent on `git diff main...HEAD` (the agent reads, not you) AND GATE 3 a Codex adversarial review (`codex:codex-rescue`, different family) in parallel. Dedupe + rebuttal-pass; fix-ups BEFORE push. Re-dispatch on every subsequent push. (`feedback_bot_review_investigation.md`)
2. `npm run check` + `npm run test:run`, push, `gh pr create`.
3. Wait for external bot reviewers — they ARE the second pass.
4. Collect findings from ALL FOUR PR surfaces (issue-comments, review summaries, line-comments, checks/failed-run logs). "0 findings" needs evidence from all four. (`feedback_pr_comment_surfaces.md` — exact gh commands; the `/pr-triage` skill automates it)
5. Investigate + rebuttal-pass EVERY finding; default-reject hardening below the bar; surface accept/reject recommendations BEFORE applying. (`feedback_pr_bot_review_workflow.md`)
6. Consolidated fix-up commits — never amend pushed commits. Don't push a docs-only commit during an open PR cycle (`feedback_no_docs_push_during_pr.md`) — bundle it with the next fix-up.
7. Re-verify TEST DB after every round touching DB-applied state (PR3 only). (`feedback_per_round_test_db_verification.md`)
8. Round-cap after 2 bot rounds; a 3rd is critical-bugs-only.

WHAT NEVER TO DO WITHOUT EXPLICIT USER INSTRUCTION:
- `git push` to main (commits go through PRs only) · Merge a PR · Approve a PROD migration · `git push --force` · Rewrite the design/impl plan to "improve" mid-execution.
- `bd` commands — beads is retired (removed 2026-06-19); there is no issue tracker shim.

WHAT'S OK without asking:
- `git push -u origin feat/theme-b-...` for the current feature branch · `git commit` on the feature branch · `gh pr create` · reading/tests/baseline checks · dispatching review agents.

VERIFICATION BEFORE COMPLETION:
- Before claiming a task done, run its Verify commands and SEE green. "Tests pass" means you ran them and saw it, not that the diff looks right. Invoke `superpowers:verification-before-completion` if unclear.

TDD WHERE APPROPRIATE:
- Every code-bearing W1a task is test-first (failing test → implement → green → commit). Don't skip the failing-test step. Invoke `superpowers:test-driven-development`.

# SESSION SCOPE

A session carries as many tasks as supervisor context comfortably allows: dispatch → verify → checkpoint the status header → next. Session boundary = supervisor context budget, NOT task count. Always stop for: any user-gated decision (the Header copy string, merge, PROD approval, the W1b/W1c `[user-verdict]` questions), any anomaly needing user judgment, or heavy context (→ session-end ritual + hand off). Stop at commit boundaries — never hand off mid-task.

# SESSION-END RITUAL (do this LAST, every session)

1. `npm run check` (+ `npm run test:run`) — must pass.
2. `git status && git log --oneline -5 origin/main..HEAD` — confirm what landed.
3. Update the active execution status file: refresh the Current State header (~300-500 words: active PR / branch / last commits / next task / blockers); append a session-log entry (commit hashes + task IDs + decisions + learnings); update recent-decisions + out-of-scope follow-ups. The SUPERVISOR owns this file.
4. Commit the status file (and kickoff edits if you tweaked locks/rituals). Don't push a docs-only commit during an open PR cycle — bundle with the next fix-up.
5. PR-cycle archival (at the START of each new PR cycle, not mid-PR): move the prior PR's session entries into the archive file; audit for learnings worth promoting to feedback memories / MEMORY.md hygiene.
6. Initiative-close retrospective (FINAL session only): (a) lift out-of-scope follow-ups into project memory / the campaign roadmap; (b) audit the session log for feedback-memory-worthy learnings; (c) check whether anything learned should AMEND the scaffolding templates or the `/kickoff-feature` skill — propose, don't silently edit; (d) MEMORY.md hygiene — compress the initiative's index line to ≤40 words, flip the project memory frontmatter to closed, move rare-use forensics to a `reference_*.md`. **Then update the campaign roadmap** (`2026-06-20-deferred-work-roadmap.md`) marking Theme B / Wave 1 items shipped.
7. Tell me in 2-3 sentences what got done and what next session picks up. End there.

# AUTO-LOADED MEMORY (already in context, don't duplicate)

MEMORY.md references include `feedback_multi_session_execution.md` (the rule for this pattern), the per-PR-ritual / bot-review-investigation / comment-surfaces / per-round-test-db-verification / data-safety / design-cohesion / curriculum-facing-copy / workflow-orchestration memories, plus `project_deferred_work_campaign.md` (this is its Wave 1) and `reference_ci_flakes.md` (W1b PROD migration). They apply throughout.

# EXECUTION STATUS FILE TEMPLATE

The execution-status file already exists — `2026-06-20-theme-b-public-ux-execution-status.md`, created during scaffolding (logged as Session 0). The first EXECUTION session is **Session 1**; it updates that file (Current State header + a Session 1 log entry), it does not recreate it.

# RIGHT NOW

Read this prompt → read design doc → **read the status file FIRST** (its Current State header names the current task — you can't know which task to read in the impl plan until you've read it) → read the implementation plan from that task → `npm run check` → tell me where you are and what's next. Don't start coding until I confirm.

W1a is Locked — start at PR1 Task 1.1 unless the status file says otherwise. PR3/PR4 are design-lock skeletons: when you reach them, work the design doc's §4 open questions FIRST (respect the tags — `[evidence-lockable]` you may lock from evidence with a one-line rationale; `[user-verdict]` get evidence + a recommendation to the user, who decides — never lock those unilaterally), author the concrete tasks, run GATE 1B, then implement.

<!-- ===== END OF KICKOFF BODY ===== -->
