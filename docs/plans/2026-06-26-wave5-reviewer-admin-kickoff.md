<!-- ===== START OF KICKOFF BODY (paste from here onward, after /clear) ===== -->

You are continuing execution of **Wave 5 — Reviewer/Admin Features** (deferred-work campaign).
This prompt is pasted at the start of every session in this work — assume no prior conversation
context. Treat what's on disk + git history + the execution status file as your only source of truth.

# WHAT YOU'RE BUILDING

Wave 5 of the deferred-work campaign: internal reviewer/admin features whose backends largely
already exist but whose UIs were never built, gated by one piece of structural tech debt. The
headline is decomposing **`src/pages/ReviewDetail.tsx`** (a 1,483-line monolith, the reviewer's
primary surface, zero page-level tests, serial data loading) — **once, behind page-level tests** —
then building the rest on the clean structure. The three personalization tables
(`bookmarks` / `saved_searches` / `lesson_collections`) already exist in the applied baseline with
RLS, PROD-verified, with zero frontend wiring — so those are "missing-UI only."

7 PR groups, reversible-first (frontend-only spine; DB work last):
  PR 0: ReviewDetail safety net (page-level RTL + pure-helper unit tests; the gate for PR 1)
  PR 1: ReviewDetail decomposition (extract seams; no behavior change)
  PR 2: C107 parallel data-loading (serial→parallel in the extracted hook)
  PR 3: C111 Bookmarks UI (auth-gated action across result views + "My Bookmarks")
  PR 4: C112 Saved Searches UI (store `SearchFilters` as jsonb)
  PR 5: C113 Collections UI (lesson_ids text[]; sharing rung + array-mutation per open Qs)
  PR 6+: Admin tail — C28 analytics · C22 assignee (migration+RPC) · C74/C78 override-view / claim-lock

# WHERE THINGS LIVE

- `docs/plans/2026-06-26-wave5-reviewer-admin-design.md`
  The WHY + locked strategy. Read once at session start; return for "why this way" questions.
  **CHECK ITS STATUS LINE:** if it says **"Draft"**, you are in (or before) the design-lock
  session — Session 1 works the doc's §4 "Open design questions" list against the real
  code/data, locks the answers, flips Status to Locked, and authors the impl plan's concrete
  tasks. **NO implementation code before that happens.**

- `docs/plans/2026-06-26-wave5-reviewer-admin-implementation.md`
  The WHAT. Currently a **SKELETON** (PR breakdown + pre-flight reads + `<!-- TBD Session 1 -->`
  task placeholders). Session 1 fills in concrete tasks once the design locks. Verify every
  snippet against current code before applying — line numbers/imports/types drift. Small
  repo-conformance adaptations OK; product/design changes → stop and ask.

- `docs/plans/2026-06-26-wave5-reviewer-admin-execution-status.md`
  Source of truth for WHERE we are; survives /clear. The "Current State" header at the top is
  the load-bearing orientation piece (active PR / branch / last commits / what's next / blockers).

- `docs/plans/2026-06-26-wave5-reviewer-admin-execution-status-archive.md`
  (May not exist yet — created when the status doc grows unwieldy or each time a PR ships.)
  Reference-only via `grep -n`; don't read end-to-end at session start.

# SESSION-START RITUAL (do this FIRST, every session)

1. Read this whole prompt.
2. Read the active execution status file (Current State header is enough for orientation; recent
   decisions + session log add detail). Don't read the archive at session start.
3. Read the design doc end-to-end. Settled decisions are NOT debatable (see "LOCKED" below).
4. Read the implementation plan from the task you're about to start through the next 1–2 tasks.
5. `git status --short --branch && git branch --show-current && git log --oneline -10` — confirm
   git matches the status file. If they diverge, trust git, then fix the status file before proceeding.
6. If the worktree is dirty, identify whether the changes are part of Wave 5 before touching them.
   Never revert/overwrite unrelated user changes. If unsure, ask.
7. `npm run check` (= type-check + lint) — confirm a clean baseline. If it fails, diagnose first;
   if unrelated to this branch/task, report + ask before changing unrelated files.
8. Tell me where you are and what task is next. Don't start coding or dispatch the first executor
   until I confirm orientation.

# EXECUTION MODE — SUPERVISOR + FRESH-CONTEXT SUBAGENTS

This session runs as a SUPERVISOR. You own orientation, user checkpoints, decisions, verification,
and status-file bookkeeping — but impl-plan tasks are EXECUTED by dispatched subagents (Agent tool)
that start with fresh context. Keep supervisor context light so one session carries several tasks
before a /clear + kickoff re-paste.

Supervisor context discipline:
- Delegate bulk reading (multi-file exploration, long docs, large diffs) to a subagent that returns
  conclusions — consume summaries, not file dumps.
- One impl-plan task per executor dispatch — never bundle two.
- **Verify in the main loop before accepting any executor's result — LOAD-BEARING**
  (`feedback_workflow_orchestration`: supervisor verification catches real agent misses). Re-run the
  task's cheap verification (self-checks, `npm run check`, the key probe), inspect `git show --stat`,
  spot-check the artifact. Don't re-read everything the agent read.
- **Checkpoint as you go:** refresh the status doc's Current State header after EACH verified task,
  not only at session end — so an unplanned /clear loses nothing.
- When context gets heavy, run the session-end ritual and hand off. Don't START a dispatch you can't
  also afford to verify + checkpoint.

Per executor dispatch, the subagent prompt MUST contain (it never sees this kickoff):
- The four doc paths + the task ID, with instruction to READ the design doc + its task section first.
- A digest of DATA SAFETY / MIGRATION DISCIPLINE, the LOCKED decisions, and the NEVER list.
- Which skills the task requires (TDD always; `database-migrations` for migration tasks).
- Boundaries: committing on the feature branch is OK; NEVER push, open a PR, touch PROD, or edit the
  design / impl / status / kickoff docs — the supervisor owns those.
- "If blocked, or anything on disk contradicts the locked design, STOP and report what you found —
  do not improvise." (Subagents cannot ask the user questions.)
- Required report: what was done, commits made, verification commands run + their ACTUAL output.

Supervisor-only (never delegated): user communication, `[user-verdict]` decisions, push / PR open
(announce) / merge / PROD approval, bot-round triage recommendations, all edits to the four docs.

Ultracode/Workflow opt-in (if active this session): the Workflow tool is the preferred orchestration
for fan-out phases (executor → adversarial verifier); same context discipline + supervisor-verify gate.

# LOCKED DECISIONS — do NOT re-debate

Full canonical list = the design doc (read every session). Pinned here (most at-risk of re-debate):
- **Test-first decomposition.** No structural change to ReviewDetail before PR 0's page-level RTL
  net + pure-helper unit tests merge. Standing gate; non-negotiable.
- **Reversible-first PR order:** PR 0 (tests) → PR 1 (decompose) → PR 2 (C107) → PR 3/4/5
  (personalization, frontend-only) → PR 6+ (admin tail, DB last). PR 0 before PR 1; PR 3 before PR 5.
- **Personalization rides existing backends.** `bookmarks`/`saved_searches`/`lesson_collections`
  already exist + RLS-protected (PROD-verified). Read their applied shapes from the **baseline
  snapshot / `database.types.ts`, NEVER from `10_future_user_features.sql.skip`** (skipped + stale).
- **Behavior, not call-sequence,** is what the ReviewDetail page test asserts (so C107's reordering
  doesn't break it).
- **DB/schema work only in the admin tail,** behind full migration discipline + the additive-RPC
  split-deploy rule.

Out of scope (design §10; do NOT scope-creep): F4/F5 process tooling; C27 search-query logging
(so C28 ships without the "Library searches" KPI); broader C157 shareable-URL encoding; anonymous
public collections route (unless the user opts it in via Q5); C73; deeper dedup/search (Wave 6).

If you want to "improve" the design/plan mid-execution, STOP and surface it. Don't unilaterally rewrite.

# HARD RULES (enforce every action)

DATA SAFETY (top priority — supersedes velocity):
- Schema changes ONLY through migration files. Never apply schema directly to PROD via MCP/SQL.
- Before merging any DB-touching PR: wait for CI to apply the migration to TEST, then verify via
  `mcp__supabase-test__execute_sql`.
- After PROD migration applies: verify via `mcp__supabase-remote__execute_sql` (read-only). Mandatory —
  CI's own verify step flakes; MCP is source of truth.
- The personalization spine (PR 3–5) adds no schema BUT introduces the first real authenticated
  writes to those tables — manually verify cross-user RLS isolation on the deploy preview.
- When in doubt about touching prod data, ask first.

MIGRATION DISCIPLINE (admin tail only):
- Before touching any file in `supabase/migrations/`, invoke the `database-migrations` skill.
- Verify the new migration's date prefix sorts AFTER the latest. `ls supabase/migrations | sort | tail -3`
  first. ASCII gotcha: digits < underscore (`20260504000000_x` sorts BEFORE `20260504_x`).
- Additive RPC the frontend calls → SPLIT the PR (migration/RPC PR first → TEST verify + `NOTIFY pgrst,
  'reload schema'` → then frontend PR) to avoid the PGRST202 stale-client window (`reference_ci_flakes`).
- **GATE 2 (Codex, pre-TEST):** before opening the migration PR / applying to TEST, run a Codex
  adversarial review of the migration SQL (idempotency, ordering, quoting, RLS/grants, rollback
  completeness, any table-wide constraint vs un-migrated rows). Additive to the migration skill +
  local reset/RLS tests + TEST/PROD verification.

CODEX ADVERSARIAL REVIEW (independent model-family gate): Codex is a DIFFERENT family → catches a
different failure distribution. USER-invoked slash commands are `disable-model-invocation` (the
supervisor CANNOT fire `/codex:*` from the Skill tool). When driving a gate autonomously, dispatch the
**`codex:codex-rescue` agent** (Agent tool) — instruct it to pin **`--model gpt-5.5`**, keep any
Supabase access READ-ONLY, and **return findings INLINE** (`feedback_codex_return_inline`,
`feedback_codex_model_pin`). Triage Codex findings with the same discipline as bot reviews
(`feedback_bot_review_investigation`): written rebuttal pass on EVERY finding; default-reject hardening
that fails the user-visible-bug-or-DB-risk bar. Err toward MORE cross-examination on substantive work
(`feedback_codex_over_crossexamine`). Codex is an INDEPENDENT input — does NOT replace supervisor-verify
or user judgment. Calibrate to stakes.
- GATE 1 (plan-lock), STAGED: **1A — design doc** reviewed + folded BEFORE impl/kickoff authored
  (done 2026-06-26 in the scaffold session). **1B — implementation plan** reviewed BEFORE dispatching
  build executors (runs in Session 1 once the concrete tasks exist; narrower than 1A — validate code
  anchors, task ordering, verify commands; don't re-litigate locked design).
- GATE 2 (pre-TEST migration): see MIGRATION DISCIPLINE.
- GATE 3 (pre-push): see PER-PR step 1.
- GATE 4 (pre-finalize, Codex 2nd opinion on bot findings): see PER-PR step 5.

PER-PR RITUAL (every PR — compact; canonical detail in the cited feedback memories):
1. Pre-push: DISPATCH a code-reviewer agent on `git diff main...HEAD` (the agent reads, not you) AND
   **GATE 3** a Codex adversarial review of the same diff in parallel. Dedupe + rebuttal-pass; fix-ups
   BEFORE push. Re-dispatch on every subsequent push. (`feedback_bot_review_investigation`)
2. `npm run check`, push, `gh pr create`.
3. Wait for external bot reviewers — they ARE the second pass.
4. FOUR-SURFACE TRIAGE — `/pr-triage <PR>` (or the four `gh` surfaces in `feedback_pr_comment_surfaces`):
   issue-comments, review summaries, line-comments, checks/failed-run logs. Confirm the underlying RUN
   (`gh run view <id> --json status,conclusion`), not cached `gh pr checks`. "0 findings" needs evidence
   from ALL FOUR. After a fix-up push, re-collect by timestamp.
5. Rebuttal-pass EVERY finding; default-reject hardening below the bar. **GATE 4:** for any real
   suggested change (lean-accept, or non-trivial lean-reject), dispatch a Codex 2nd opinion (inline) on
   finding + code + your rebuttal BEFORE finalizing. Surface reconciled accept/reject recs with rationale
   before applying. Pure-nit/no-code-change findings skip GATE 4. (`feedback_pr_bot_review_workflow`)
6. Consolidated fix-up commits — never amend pushed commits.
7. Re-verify TEST DB after every round that touches DB-applied state (`feedback_per_round_test_db_verification`).
8. Round-cap after 2 bot rounds; a 3rd is critical-bugs-only.

WHAT NEVER TO DO WITHOUT EXPLICIT USER INSTRUCTION:
- `git push` to main (commits go through PRs only)
- Merge a PR · Approve a PROD migration in CI/CD · `git push --force` on any branch
- Re-write the design doc or impl plan to "improve" mid-execution
- Edit already-pushed migration files (create a NEW fix migration instead)

WHAT'S OK without asking:
- `git push -u origin <feature-branch>` for the current feature branch · `git commit` on it · `gh pr create`
- Reading anything, running tests/baseline checks, dispatching review agents.

VERIFICATION BEFORE COMPLETION:
- Before claiming a task done, run its Verify commands. "Tests pass" requires you ran them and saw green.
  Invoke `superpowers:verification-before-completion` if unclear.

TDD WHERE APPROPRIATE:
- The impl plan flags TDD tasks; PR 0 is entirely TDD. Failing-test-first → implement → green → commit.
  Invoke `superpowers:test-driven-development`.

# SESSION SCOPE

A session carries as many tasks as supervisor context comfortably allows: dispatch → verify →
checkpoint the status header, then next. Boundary = supervisor context budget, NOT task count. Always
stop for: any user-gated decision (merge, PROD approval, `[user-verdict]` design questions), any anomaly
needing user judgment, or heavy supervisor context (then session-end ritual + hand off). Stop at natural
commit boundaries — never hand off mid-task.

# SESSION-END RITUAL (do this LAST, every session)

1. `npm run check` — must pass.
2. `git status && git log --oneline -5 origin/main..HEAD` — confirm what landed.
3. Update the active execution status file: refresh the Current State header (~300–500 words; active PR /
   branch / last commits / what next session picks up / blockers / pre-next-PR verification); append a
   session-log entry (commit hashes + task IDs, decisions, process learnings); update recent-decisions
   roll-up + Out-of-scope follow-ups. Supervisor owns this file — subagents never write it.
4. Commit the status file (+ kickoff edits if you tweaked locked decisions/rituals). Per
   `feedback_no_docs_push_during_pr`, bundle a docs-only commit with the next fix-up push if a PR is open.
5. PR-cycle archival (START of each new PR cycle, not mid-PR): move the prior PR's session entries to the
   archive file; audit each for learnings worth promoting to feedback memories / MEMORY.md.
6. Initiative-close retrospective (FINAL session only): (a) lift out-of-scope follow-ups into project
   memory; (b) audit the log for feedback-memory-worthy learnings; (c) check whether anything should
   amend the `~/.claude/templates/multi-session-execution/` templates or `/kickoff-feature` — propose,
   don't silently edit; (d) MEMORY.md hygiene-on-close (compress the index line to ≤40 words, flip the
   project memory frontmatter to closed, move rare-use forensics to a `reference_*.md` satellite).
7. Tell me in 2–3 sentences what got done and what next session picks up. End there.

# AUTO-LOADED MEMORY (already in context, don't duplicate)

MEMORY.md auto-loads `project_deferred_work_campaign` (wave history + standing gates),
`feedback_multi_session_execution`, `feedback_workflow_orchestration`, the per-PR-ritual /
data-safety / bot-review-investigation / comment-surfaces / per-round-test-db-verification /
codex memories, plus `reference_ci_flakes` and `reference_database_pipeline`. They apply throughout.

# EXECUTION STATUS FILE TEMPLATE

The status file already exists (`...-execution-status.md`, created in the 2026-06-26 scaffold session).
If it were ever missing, recreate it from the template at the bottom of the status-doc template.

# RIGHT NOW

Read this prompt → read design doc → read implementation plan from current task → read status file →
`npm run check` → tell me where you are and what's next. Don't start coding until I confirm.

**Design-lock is DONE (Session 1, commit `61ae519`); the design doc Status line reads "LOCKED".**
We are now in **PR-0 execution** — building the ReviewDetail safety net (the gate that unblocks all
decomposition). Wave 5 is re-scoped to **PR 0–2 only** (test net → decompose → C107); PR 3–6+ deferred.
Work the impl plan's **PR-0 tasks 0.1 → 0.2 → 0.3** in order (table-aware supabase mock + fixtures →
page-level RTL characterization test → pure-helper unit suites). All design Qs are resolved (Q1 = split
PR-1 into 1a/1b; Q2/Q3/Q4/Q8 evidence-locked; Q5/Q6/Q7/Q9 deferred with the personalization/admin
tracks). Dispatch executors task-by-task (TDD/characterization), supervisor-verify each, checkpoint the
status doc after each. **Branch (chosen 2026-06-26, "carry docs forward"):** PR-0 work lands on
`test/wave5-reviewdetail-safety-net`, cut from `chore/wave5-scaffold` so the 2 scaffold doc commits ride
inside PR-0's PR. Read the impl plan's PR-0 tasks (esp. the dual-shape mock, the `tagged_metadata`
fixture columns, and the 9 page behaviors + 4-state banner coverage) before dispatching.

<!-- ===== END OF KICKOFF BODY ===== -->
