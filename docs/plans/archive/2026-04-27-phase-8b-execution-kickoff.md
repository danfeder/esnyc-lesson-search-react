# Phase 8b — Execution Kickoff Prompt

**Purpose:** paste the contents of the code block below verbatim at the start of each new Claude Code session that's executing Phase 8b. Each session bootstraps from this prompt with no prior conversation context — the design doc, implementation plan, status file, and git history are the only source of truth across sessions.

**How to use:**
1. Open a fresh Claude Code session in `/Users/danfeder/cCode/esynyc-lessonsearch-v2`.
2. Copy everything inside the triple-backtick block below.
3. Paste as the first message.
4. Wait for the agent to orient and report — don't tell it to start coding until it confirms what task is next.
5. At session end, the agent updates `docs/plans/2026-04-27-phase-8b-execution-status.md` so the next session knows where to pick up.

**When to update this kickoff:** if a hard rule changes (e.g., a new "never do X" emerges from a session) or a locked decision is genuinely re-opened. Don't edit casually — the rules' stability is what makes the across-session pattern work.

---

```
You are continuing execution of the Phase 8b approve_update workflow redesign.
This prompt will be pasted at the start of every session in this work — assume
no prior conversation context. Treat what's on disk + git history + the
execution status file as your only source of truth.

# WHAT YOU'RE BUILDING

The intent-first redesign of the lesson submission + reviewer flow for ESYNYC
Lesson Search v2. Three sequential PRs:
  PR 1: Schema (single FK migration)
  PR 2: Submitter flow + LessonSearchPicker + reviewer-side safety banner
  PR 3: Reviewer flow (full state-aware UX)

# WHERE THINGS LIVE

- docs/plans/2026-04-27-phase-8b-approve-update-redesign-design.md
  The WHY behind every decision. Read once at session start. Return when a
  "why are we doing it this way" question comes up.

- docs/plans/2026-04-27-phase-8b-approve-update-redesign-implementation.md
  The WHAT. Source of truth for the next task: exact file paths, code snippets,
  test commands, commit messages. Follow it for product scope and task order.
  Verify every snippet against the current code before applying it — line
  numbers, imports, types, prop names, and APIs may have drifted since the
  plan was written. Small repo-conformance adaptations are allowed; product
  or design changes are not. If a needed adaptation changes behavior or
  scope, stop and ask.

- docs/plans/2026-04-27-phase-8b-execution-status.md
  Source of truth for WHERE we are. Survives /clear because it's on disk +
  in git. If it doesn't exist, you're starting Session 1 — create it using
  the template at the bottom of this prompt.

# SESSION-START RITUAL (do this FIRST, every session)

1. Read this whole prompt.
2. Read the execution status file (or note it needs creating).
3. Read the design doc end-to-end. Settled decisions are NOT debatable
   (see "LOCKED" below).
4. Read the implementation plan from the task you're about to start through
   the next 1-2 tasks (don't read it all unless useful).
5. `git status --short --branch && git branch --show-current && git log --oneline -10`
   — confirm git matches the status file. If they diverge, trust git, then
   update the status file to match reality before proceeding.
6. If the worktree is dirty, identify whether the changes are part of
   Phase 8b before touching them. Never revert or overwrite unrelated user
   changes. If unsure, ask.
7. `npm run type-check && npm run lint` — confirm a clean baseline.
   If either fails, diagnose first. If the failure is unrelated to the
   current Phase 8b branch/task, report it and ask before changing
   unrelated files. If it is caused by current branch work, fix it before
   proceeding.
8. Tell me where you are and what task is next. Don't start coding until
   I confirm orientation.

# LOCKED DECISIONS — do NOT re-debate

These were settled across multi-session brainstorming + 4 rounds of bot
review. New concrete evidence can re-open them; generic "this could be
better" arguments cannot.

- Submission shape: intent-first (two-button picker → /submit/new or
  /submit/revising). NOT hybrid gate, search-first, or original Option C.
- Section 1 schema: ONLY the FK alter migration. The Phase-4 status guard
  already exists at 20260428000008_phase_4_status_guard.sql; verify it,
  don't modify it. No CHECK constraint.
- Three sequential PRs in the order above. NOT a mega-PR.
- PR2→PR3 gap mitigation: minimal yellow banner. NOT a confirmation modal,
  NOT a feature flag, NOT a disable-radio.
- Out of scope (captured as follow-ups in the design doc, do NOT scope-creep
  into 8b): override-tracking admin view, extraction-failure recovery,
  repeated-submission detection, prior-target restoration on review reload,
  past-submissions-first picker, claim mechanism for concurrent reviewers.

If you find yourself wanting to "improve" the design or plan mid-execution,
STOP and surface it to the user. Don't unilaterally rewrite the spec.

# HARD RULES (enforce every action)

DATA SAFETY (top priority — supersedes velocity):
- Schema changes ONLY through migration files. Never
  mcp__supabase-remote__apply_migration for schema.
- Before merging any DB-touching PR: wait for CI to apply migration to TEST,
  then verify with mcp__supabase-test__execute_sql.
- After PROD migration applies: verify with mcp__supabase-remote__execute_sql.
  Mandatory — the migrate-production.yml Verify step has known SASL flakes,
  so MCP verification is the source of truth.
- When in doubt about touching prod data, ask first.

MIGRATION DISCIPLINE:
- Before touching any file in supabase/migrations/, invoke the
  `database-migrations` skill via the Skill tool.
- Verify the new migration's date prefix sorts AFTER the latest existing one.
  Run `ls supabase/migrations/ | sort | tail -3` first. ASCII gotcha:
  digits < underscore, so `20260504000000_x` sorts BEFORE `20260504_x`.

PER-PR RITUAL (every PR, every time):
1. Pre-push review: DISPATCH a feature-dev:code-reviewer agent on
   `git diff main...HEAD`. The agent does the line-by-line read, not you —
   you cannot impartially review your own work. Investigate every finding
   per feedback_bot_review_investigation.md (verify against actual code,
   push back where the agent is wrong). Apply fix-up commits BEFORE push
   (or amend, since the work isn't pushed yet).
2. Run `npm run type-check && npm run lint` (mandatory pre-PR per CLAUDE.md).
3. Push the feature branch.
4. Open the PR with `gh pr create`.
5. Wait for external bot reviewers to land (CodeRabbit, Claude Review,
   etc.) — they ARE the second pass; do NOT dispatch a redundant
   feature-dev:code-reviewer here.
6. COLLECT findings from ALL FOUR PR surfaces — querying only one is a
   verification failure (per feedback_pr_comment_surfaces.md). Run all
   four every time:
     a. `gh pr view <PR> --comments` (issue-comments — where bots
        typically post their full report)
     b. `gh api repos/<owner>/<repo>/pulls/<PR>/reviews --jq '.[] |
        {user: .user.login, state, body}'` (review summaries)
     c. `gh api repos/<owner>/<repo>/pulls/<PR>/comments --jq '.[] |
        {user: .user.login, path, line, body}'` (line-attached review
        comments)
     d. `gh pr checks <PR>` + `gh run view <id> --log-failed` for any
        failing check (CI / test output)
   "0 findings" is a CLAIM that requires evidence from all four. Don't
   skip any.
7. INVESTIGATE & TRIAGE each finding (you do this; spawn a subagent only
   if a specific finding requires deeper code verification you can't do
   inline). Per feedback_bot_review_investigation.md: write a rebuttal
   pass for EVERY finding (including "minor" / "easy fix"). Per
   feedback_pr_bot_review_workflow.md: default-reject hardening /
   defense-in-depth / chrome that fails the "would absence produce a
   user-visible bug or risk DB damage" bar. Surface accept/reject
   recommendations to the user with rationale BEFORE applying.
8. Apply accepted findings as consolidated fix-up commits (do NOT amend
   pushed commits).
9. RE-VERIFY TEST DB after each round (if the round changed DB-applied
   state). For any PR carrying a migration: if the fix-up commits modified
   the migration, RLS, function source, or anything CI re-applies to TEST,
   re-run `mcp__supabase-test__execute_sql` for the same shape you
   verified at PR open. One-time verification is NOT sufficient — every
   round that touches DB-applied state needs its own evidence. Per
   feedback_per_round_test_db_verification.md.
10. ROUND-CAP AFTER 2 ROUNDS of bot review. If a 3rd round comes in, fix
    only critical bugs, document the rest, ship. Diminishing returns hits
    fast on iteration.

WHAT NEVER TO DO WITHOUT EXPLICIT USER INSTRUCTION:
- `git push` to main (commits go through PRs only)
- Merge a PR
- Approve a PROD migration in GitHub Actions
- `bd` commands (beads is broken — use TaskCreate)
- `git push --force` on any branch
- Modify .beads/ files (leave them alone)
- Re-write design doc or implementation plan to "improve" mid-execution

WHAT'S OK without asking:
- `git push -u origin feat/...` for the current feature branch
- `git commit` on the feature branch (often, small)
- `gh pr create` for the current branch
- Reading anything, running tests, running type-check/lint
- Dispatching review agents via the Agent tool

VERIFICATION BEFORE COMPLETION:
- Before claiming a task done, run the verification commands in that task's
  spec. Evidence before assertions. Invoke the
  `superpowers:verification-before-completion` skill if unclear.
- "Tests pass" requires that you ran them and saw the green output, not
  that the diff looks like it should pass.

TDD WHERE APPROPRIATE:
- The implementation plan flags TDD tasks explicitly. Follow the
  failing-test-first → implement → green → commit loop. Don't skip the
  failing-test step (it proves the test actually exercises the new code).
- Invoke `superpowers:test-driven-development` for these tasks.

# SESSION SCOPE

Default: ONE task per session, or a small group of trivially-related tasks
(e.g., create file + run test + commit = one task; that's fine). Stop at
natural commit boundaries. Don't try to ship an entire PR in one session
unless it's tiny (PR 1 might fit).

If you finish a task with cycles to spare and the next task is small +
independent, do it. If the next task is substantive, end the session.

# SESSION-END RITUAL (do this LAST, every session)

1. `npm run type-check && npm run lint` — both must pass.
2. `git status && git log --oneline -5 origin/main..HEAD` — confirm what
   landed.
3. Update the execution status file:
   - What got done this session (commit hashes + task IDs)
   - Where the next session picks up (specific task ID + any setup needed)
   - Any blockers, surprises, or decisions made
   - Current branch + what's pushed vs. local
4. Commit the status file.
5. Tell me in 2-3 sentences what got done and what the next session picks
   up. End there.

# AUTO-LOADED MEMORY (already in your context, don't duplicate)

Your auto-loaded MEMORY.md references include the per-PR-ritual, data-safety,
bot-review-investigation, workflows-not-sacred, user-relearning,
beads-broken, test-credentials, and database-pipeline reference memories.
They apply throughout. Re-read them if a question comes up that they
might cover.

# EXECUTION STATUS FILE TEMPLATE (create on Session 1)

If docs/plans/2026-04-27-phase-8b-execution-status.md does not exist yet,
create it with the content shown below:

---
# Phase 8b Execution Status

**Last updated:** YYYY-MM-DD HH:MM by Session N
**Current PR:** PR 1 — Schema (single FK migration)
**Current task:** Task 1.1 (not yet started)
**Branch:** main (not yet branched for PR 1)
**Last commit on branch:** (none)

## Done
(empty)

## In flight
(none yet)

## Blocked
(none)

## Decisions made during execution
(things that came up that weren't in the design doc — e.g., "IntDuplicateCard's
badge prop turned out to be named `badgeLabel` not `matchLabel`; fixed in
commit abc1234")

## Out-of-scope follow-ups captured here
(things you noticed but did NOT do, because they're out of 8b scope; for
the project status memory after 8b ships)
---

# RIGHT NOW

Read this prompt → read design doc → read implementation plan from current
task → read status file → run baseline checks → tell me where you are and
what's next. Don't start coding until I confirm.
```
