# Filter Metadata Drift Repair — Execution Kickoff Prompt

**Purpose:** paste the contents of the code block below verbatim at the start of each new Claude Code session that's executing the filter metadata drift repair. Each session bootstraps from this prompt with no prior conversation context — the design doc, implementation plan, status file, and git history are the only source of truth across sessions.

**How to use:**
1. Open a fresh Claude Code session in `/Users/danfeder/cCode/esynyc-lessonsearch-v2`.
2. Copy everything inside the triple-backtick block below.
3. Paste as the first message.
4. Wait for the agent to orient and report — don't tell it to start coding until it confirms what task is next.
5. At session end, the agent updates `docs/plans/2026-04-28-filter-metadata-drift-repair-execution-status.md` so the next session knows where to pick up.

**When to update this kickoff:** if a hard rule changes (e.g., a new "never do X" emerges from a session) or a locked decision is genuinely re-opened. Don't edit casually — the rules' stability is what makes the across-session pattern work.

---

```
You are continuing execution of the filter metadata drift repair.
This prompt will be pasted at the start of every session in this work — assume
no prior conversation context. Treat what's on disk + git history + the
execution status file as your only source of truth.

# WHAT YOU'RE BUILDING

Repairing the column-vs-metadata drift in `lessons` that makes most filter
clicks return wrong counts (sometimes zero, often undercounting by 10–90%).
Production verification on 2026-04-28 confirmed five distinct mismatches
spanning shape drift (object/array/scalar inconsistencies in JSONB metadata
across two submission eras) and vocabulary drift (UI values that don't
match stored values, plus casing inconsistencies in the corpus).

The chosen architecture: normalized columns (`lesson_format text`,
`activity_type text[]`, `cooking_methods text[]`, `academic_integration text[]`,
etc.) become the **filter source of truth**. `search_lessons` filters on the
columns and reconstructs each result row's `metadata` from the columns
(per-field COALESCE overlay) so frontend facet counts can't drift from RPC
filter behavior. `complete_review_atomic` is rewritten to write
canonical-shape metadata + columns. A `lessons_normalize_write` BEFORE-trigger
arrives last to enforce column⇄metadata sync (column wins) on every future
write.

2 active PRs + 2 deferred (user decision 2026-04-29):
  PR 1: Column-based RPC + alias tolerance (1 migration + 5-line frontend fix) — ACTIVE
  PR 2: Writer fix + column hygiene + trigger (4 migrations in one PR) — ACTIVE
       PR-2 M2 includes a CONCEPTS RESCUE: 690 rows have rich
       `metadata.academicIntegration.concepts` (per-subject content like
       `{Science: [plant parts, life cycles]}`). M2 unwraps the object to
       a flat array AND moves concepts to a sibling key
       `metadata.academicConcepts` to preserve it. The rescue is in the
       impl plan Task 2.4; do NOT use the bare design-doc §5 unwrap
       snippet (it destroys concepts).
  PR 3: Canonical vocabulary — DEFERRED indefinitely. Reason: user is
       considering a future re-classification effort with a current-gen
       AI; PR-3 locks in spellings + frontend wire-protocol that the
       redesign would likely revisit.
  PR 4: Cultural heritage redesign — DEFERRED, gated on stakeholder

# WHERE THINGS LIVE

- /Users/danfeder/cCode/esynyc-lessonsearch-v2/docs/plans/2026-04-28-filter-metadata-drift-repair-design.md
  The WHY behind every decision. Read once at session start. Return when a
  "why are we doing it this way" question comes up.

- /Users/danfeder/cCode/esynyc-lessonsearch-v2/docs/plans/2026-04-28-filter-metadata-drift-repair-implementation.md
  The WHAT. Source of truth for the next task: exact file paths, code snippets
  (or design-doc section references for long SQL), test commands, commit
  messages. Follow it for product scope and task order. Verify every snippet
  against the current code before applying it — line numbers, imports, types,
  prop names, and APIs may have drifted since the plan was written. Small
  repo-conformance adaptations are allowed; product or design changes are
  not. If a needed adaptation changes behavior or scope, stop and ask.

- /Users/danfeder/cCode/esynyc-lessonsearch-v2/docs/plans/2026-04-28-filter-metadata-drift-repair-execution-status.md
  Source of truth for WHERE we are. Survives /clear because it's on disk +
  in git. If it doesn't exist, you're starting Session 1 — create it using
  the template at the bottom of this prompt.

- /Users/danfeder/cCode/esynyc-lessonsearch-v2/docs/plans/2026-04-28-filter-metadata-drift-repair-design-v1-jsonb.md
  Archived v1 (JSONB-as-source-of-truth, rejected). DO NOT modify. Refer
  here if a future session tries to re-debate switching back to JSONB-based
  filtering — the rejection rationale lives there.

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
   the filter drift repair before touching them. Never revert or overwrite
   unrelated user changes. If unsure, ask.
7. `npm run type-check && npm run lint` — confirm a clean baseline.
   If either fails, diagnose first. If the failure is unrelated to the
   current branch/task, report it and ask before changing unrelated files.
   If it is caused by current branch work, fix it before proceeding.
8. Tell me where you are and what task is next. Don't start coding until
   I confirm orientation.

# LOCKED DECISIONS — do NOT re-debate

These were settled during the design phase across multi-agent review.
New concrete evidence can re-open them; generic "this could be better"
arguments cannot.

- **Architecture: column-based filter source of truth.** RPC filters on
  normalized columns; result-row metadata reconstructed via per-field
  COALESCE overlay. NOT tolerant-RPC-over-JSONB (v1 plan, archived as
  -design-v1-jsonb.md). NOT hybrid column-primary + JSON-fallback.
- **Per-field COALESCE in metadata reconstruction, not naive `||` overlay.**
  `to_jsonb(NULL::text[])` produces JSON `null` and naive overlay would
  erase valid `original.x` values. Per-field CASE inside
  `jsonb_strip_nulls` solves this.
- **Three sequential PRs in the order above.** NOT a mega-PR. NOT writer-fix
  before column-based RPC (read-side widening must land first to mitigate
  the live drift cohort during PR-1→PR-2 gap).
- **PR-2 ordering: writer fix → backfill → column hygiene → install + enable
  trigger.** This eliminates the drift-during-deploy concern. NO
  `DISABLE`/`session_replication_role = 'replica'` dance — the trigger
  arrives last to a fully-canonical table.
- **PR-2 PROD apply needs a brief approval pause (~5 min).** Coordinate
  via reviewer notification. NOT a grant/revoke dance (Path B rejected).
- **PR-3 is DEFERRED** (user decision 2026-04-29). Documentation kept
  intact in the impl plan for when work resumes. Don't execute PR-3
  tasks without explicit user confirmation that PR-3 is reactivating.
  The PR-1 alias helpers stay in the database indefinitely; their
  "remove in PR-3" comments stop being load-bearing. Post-PR-2 corpus
  has canonical SHAPE but mixed VOCABULARY for lf/at/cm — that's fine,
  aliases keep filters working in mixed state.
- **academicConcepts sibling key preservation** (PR-2 M2). 690 rows have
  rich object-shape `academicIntegration` with both `selected` (filter
  values) and `concepts` (per-subject content). M2 rescues concepts to
  `metadata.academicConcepts` before unwrapping. Do NOT use the bare
  design-doc §5 unwrap snippet that drops concepts — see Task 2.4 step 2
  for the corrected SQL.
- **Canonical-form decisions (locked, with caveats):**
  - `lesson_format` → Title-Case-with-spaces (corpus dominance).
  - `activity_type` → bare nouns (`cooking`, `garden`, `academic`, `both`).
  - `cooking_methods` → lowercase + outlier mapping for `Sautéing`/`Steam` etc.
  - `cultural_heritage` → DEFERRED to PR-4. PR-3 leaves heritage values
    untouched. The `_alias_cultural_heritage` helper installed in PR-1
    survives PR-3 (the only cross-PR alias).
- **PR-4 (heritage redesign) is deferred and gated.** Don't scope-creep
  into PR-3.

Out of scope (captured as follow-ups in the design doc, do NOT scope-creep
into this initiative):
  - `lessonFormat` semantic conflation (single-select forces one value when
    both time-structure and context-independence often apply) — separate
    filter-redesign concern, tracked in `project_lesson_format_conflated.md`.
  - `grades_taught` / `subjects_taught` non-consultation (tracked in
    `project_grades_subjects_unused.md`).
  - `cultural_heritage_hierarchy` table redesign — coupled to PR-4.
  - New filter categories — stakeholder consult is its own decision.
  - Search ranking changes (`rank` calculation) — unrelated.
  - Embedding-pipeline mismatch (`project_embedding_pipeline_mismatch.md`)
    — separate active follow-up.
  - Audit-table observability for trigger coercion — current design uses
    `RAISE NOTICE`; possible PR-2-round-2 follow-up if log-only proves
    insufficient.

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
- **PR-2 specifically requires a brief reviewer-approval pause for the PROD
  apply.** Notify in advance, apply migrations, run drift-residue + writer
  shape checks, then notify reviewers they may resume. Don't skip the
  notification.
- **PR-3 Netlify-first gate is DEFERRED with PR-3.** When PR-3 reactivates,
  re-read this rule (preserved in impl plan Task 3.6 step 8). For the
  active scope (PR-1 + PR-2), no frontend-vs-DB ordering hazard exists:
  PR-1 widens read-side matches without touching the wire protocol, and
  PR-2 only changes write-path + storage shape (no frontend implication).

MIGRATION DISCIPLINE:
- Before touching any file in supabase/migrations/, invoke the
  `database-migrations` skill via the Skill tool.
- Verify the new migration's date prefix sorts AFTER the latest existing one.
  Run `ls supabase/migrations/ | sort | tail -3` first. ASCII gotcha:
  digits < underscore, so `20260505000000_x` sorts BEFORE `20260505_x` — pad
  with full HHMMSS zeros, never `YYYYMMDD_x`.
- The latest migration as of 2026-04-28 is
  `20260504000000_phase_8b_fk_on_delete_set_null.sql`. Other work may land
  before this initiative starts; verify each session.

INVESTIGATION-BEFORE-DRAFTING (specific to this initiative):
- **Task 2.5 (17 activity_type location-leak rows)**: query the rows on
  PROD, categorize each, then surface findings to the user with a
  recommendation. Wait for user decision on each row before drafting
  Migration 3. The design doc deliberately deferred this; don't guess.
- **Task 2.3 (writer-roundtrip test matrix)**: 4 AI shapes + 1 lessonFormat
  shape. The matrix data isn't in the design doc as fully-formed test
  fixtures — you'll need to construct synthetic submissions and call
  `complete_review_atomic` via service-role MCP. Surface fixture
  construction questions if anything's ambiguous.

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
- Modify the archived v1 design doc (-design-v1-jsonb.md)
- DROP FUNCTION search_lessons with CASCADE — surface dependents instead

WHAT'S OK without asking:
- `git push -u origin feat/...` for the current feature branch
- `git commit` on the feature branch (often, small)
- `gh pr create` for the current branch
- Reading anything, running tests, running type-check/lint
- Dispatching review agents via the Agent tool
- Read-only PROD probes via mcp__supabase-remote__execute_sql (for
  verification + the design doc's investigation steps)
- Running `mcp__supabase-test__execute_sql` for verification + writer
  roundtrip matrix synthetic calls (clean up synthetic rows after)

VERIFICATION BEFORE COMPLETION:
- Before claiming a task done, run the verification commands in that task's
  spec. Evidence before assertions. Invoke the
  `superpowers:verification-before-completion` skill if unclear.
- "Tests pass" requires that you ran them and saw the green output, not
  that the diff looks like it should pass.
- "Migration applies" requires that you ran `supabase db reset` locally
  AND verified the post-migration state via MCP, not just that the file
  was written.

TDD WHERE APPROPRIATE:
- Task 1.3 (`normalizeMetadata` fix) is explicitly TDD — write the
  failing test first, prove it fails, implement, prove it passes.
- Other tasks are migration-driven (write SQL, apply locally, verify);
  TDD doesn't fit shape there — the verification step IS the test.
- Invoke `superpowers:test-driven-development` for Task 1.3.

# SESSION SCOPE

Default: ONE task per session, or a small group of trivially-related tasks
(e.g., create migration + apply locally + verify + commit = one task;
that's fine). Stop at natural commit boundaries. Don't try to ship an
entire PR in one session unless it's tiny (PR 1 might fit; PR 2 will not).

If you finish a task with cycles to spare and the next task is small +
independent, do it. If the next task is substantive (e.g., a multi-migration
sequence in PR 2, or the activity_type investigation in Task 2.5), end
the session.

PR-2's investigation steps (Task 2.5 specifically) are good natural
session boundaries — surface findings, get user decision, end session,
draft Migration 3 in the next session with the user's instructions in
hand.

# SESSION-END RITUAL (do this LAST, every session)

1. `npm run type-check && npm run lint` — both must pass.
2. `git status && git log --oneline -5 origin/main..HEAD` — confirm what
   landed.
3. Update the execution status file:
   - What got done this session (commit hashes + task IDs)
   - Where the next session picks up (specific task ID + any setup needed)
   - Any blockers, surprises, or decisions made
   - Current branch + what's pushed vs. local
   - For investigation tasks: capture the findings + user decision in the
     "Decisions made during execution" section so the next session has the
     context it needs to draft the implementation.
4. Commit the status file.
5. Tell me in 2-3 sentences what got done and what the next session picks
   up. End there.

# AUTO-LOADED MEMORY (already in your context, don't duplicate)

Your auto-loaded MEMORY.md references include the per-PR-ritual, data-safety,
bot-review-investigation, comment-surfaces, per-round-test-db-verification,
multi-session-execution, workflows-not-sacred, user-relearning,
beads-broken, test-credentials, database-pipeline reference, and
SASL-flake hygiene memories. They apply throughout. Re-read them if a
question comes up that they might cover.

Two memory entries are particularly relevant to this initiative:
- `project_lesson_format_conflated.md` — the conflation issue is OUT OF
  SCOPE here but contextual.
- The `MEMORY.md` "facetCounts.ts:55 hardening" hygiene-follow-up entry
  is addressed in PR-3 Task 3.5; mark it done after PR-3 ships.

# EXECUTION STATUS FILE TEMPLATE (create on Session 1)

If docs/plans/2026-04-28-filter-metadata-drift-repair-execution-status.md
does not exist yet, create it with the content shown below:

---
# Filter Metadata Drift Repair — Execution Status

**Last updated:** YYYY-MM-DD HH:MM by Session N
**Current PR:** PR 1 — Column-based RPC + alias tolerance (not yet branched)
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
(things that came up that weren't in the design doc — e.g., "the deployed
search_lessons signature in Task 1.1 had drifted from the baseline due to
post-baseline migration X; referenced version X in the migration draft")

## Out-of-scope follow-ups captured here
(things you noticed but did NOT do, because they're out of scope; for
the project status memory after the initiative ships)

## Session log
### Session 1 — YYYY-MM-DD start, YYYY-MM-DD end — <one-line summary>
Major events:
- ...
---

# RIGHT NOW

Read this prompt → read design doc → read implementation plan from current
task → read status file → run baseline checks → tell me where you are and
what's next. Don't start coding until I confirm.
```
