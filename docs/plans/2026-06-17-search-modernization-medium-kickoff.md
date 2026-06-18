<!-- Paste the body between the START/END markers as the first message of every session for this track. -->

<!-- ===== START OF KICKOFF BODY ===== -->

You are continuing execution of **Search Modernization (Medium Package)** for ESYNYC Lesson Search v2.
This prompt is pasted at the start of every session in this work — assume no prior conversation
context. Treat what's on disk + git history + the execution status file as your only source of truth.

# WHAT YOU'RE BUILDING

Make the new canonical metadata first-class in the **public** lesson search and close the
confirmed search-quality gaps — measure-first, each change eval-gated and reversible. The public
search engine is the **`search_lessons` Postgres RPC** (NOT `smart-search`, which is
suggestions-only). Academic concepts ARE already indexed (live trigger
`update_lesson_search_vector`); the gaps are: **G1** everyday words don't reach the official
vocabulary, **G2** multi-word queries explode, **G3** SEL/core_competencies/academic_integration
aren't typed-searchable, **G5** there's no eval set. This track grew out of the **retired PR D**
(bulk synonym load — wrong mechanism).

~4 PRs, eval-gated, cheapest-and-safest-first:
  S0: search eval harness + collaboratively-authored gold set (the GATE — ships first)
  S1: G2 frontend query preprocessing (filler strip + grade routing) — deeper OR→AND DEFERRED
  S2: G3 field indexing (SEL into the FTS vector; CC/AI only if the scorecard shows lift)
  S3: small curated everyday→official single-word synonym bridge (conditional on eval lift)
  PR-E rider: dead-code retirement (folded into the existing cleanup PR)

# WHERE THINGS LIVE

- docs/plans/2026-06-17-search-modernization-medium-design.md — WHY + LOCKED decisions. Status
  is **Locked**. Read once at session start; return for "why this way" questions.
- docs/plans/2026-06-17-search-modernization-medium-implementation.md — WHAT (per-task: files,
  snippets, verify, commit). Verify snippets against current code before applying; repo-conformance
  adaptations OK, product/design changes require stopping to ask.
- docs/plans/2026-06-17-search-modernization-medium-execution-status.md — WHERE WE ARE. The
  "Current State" header is the load-bearing orientation piece. Survives /clear.
- docs/plans/2026-06-17-search-modernization-medium-execution-status-archive.md — created when the
  status doc grows unwieldy / per PR ship. Reference-only via grep.
- Background: memory `project_search_modernization.md` (architecture truth + the corrected facts).

# SESSION-START RITUAL (do this FIRST, every session)

1. Read this whole prompt.
2. Read the execution status file — Current State header is enough for orientation.
3. Read the design doc end-to-end. Settled decisions are NOT debatable (see LOCKED below).
4. Read the impl plan from the task you're starting through the next 1–2 tasks.
5. `git status --short --branch && git branch --show-current && git log --oneline -10` — confirm
   git matches the status file; if they diverge, trust git, then fix the status file first.
6. If the worktree is dirty, identify whether changes are part of this track before touching them.
7. `npm run type-check && npm run lint` — confirm a clean baseline.
8. Tell me where you are and what's next. Don't start coding / dispatch the first executor until I
   confirm orientation.

# EXECUTION MODE — SUPERVISOR + FRESH-CONTEXT SUBAGENTS

Run as a SUPERVISOR: own orientation, user checkpoints, decisions, verification, and status-file
bookkeeping; dispatch impl-plan tasks to fresh-context subagents (Agent tool). Keep supervisor
context light so one session carries several tasks. **Supervisor-verify every executor result in
the main loop** (re-run the task's cheap checks yourself — `feedback_workflow_orchestration.md`:
it has caught real agent misses). Checkpoint the status header after EACH verified task. One
impl task per dispatch. If ultracode/workflow is on, the Workflow tool is the preferred
orchestration for fan-out phases (executor → adversarial verifier).

Per executor dispatch, the subagent prompt MUST contain (it never sees this kickoff): the four
doc paths + task ID (read design + task section from disk first); a digest of DATA SAFETY /
MIGRATION DISCIPLINE + LOCKED decisions + the NEVER list; required skills; boundaries (commit on
the feature branch OK; NEVER push/PR/PROD/edit-scaffold-docs); "if blocked or disk contradicts
the locked design, STOP and report — don't improvise"; required report format (what was done,
commits, verification commands + ACTUAL output). Subagent tiering: Fable/inherit for
judgment-heavy review, Opus for spec'd executors, Sonnet for bulk — never Haiku.

Supervisor-only (never delegated): user communication, `[user-verdict]` calls, push / PR open
(announce) / merge / PROD approval, the **collaborative gold-set authoring (S0)**, bot-round
triage, and all edits to the four scaffold docs.

# LOCKED DECISIONS — do NOT re-debate (full set in the design doc)

- Public search engine = `search_lessons` RPC; concepts ARE indexed (live `update_lesson_search_vector`).
- **Measure-first:** the eval harness (S0) ships first and gates every change; baseline on TEST;
  ranking scorer written fresh (computeMetrics is classification-only).
- **G2 fix = frontend** (`parseSearchQuery.ts`), filler/grade only. The deeper server-side OR→AND
  term-combination is **DEFERRED + documented** (design §9) to return to later (user decision 2026-06-17).
- **G3 per-field by measured value:** ship SEL; add core_competencies / academic_integration only
  if the PR-S2 scorecard shows lift. Clone migration `20260521000000`; backfill ALL rows.
- **Synonyms:** small (~12–18) single-token `oneway` everyday→official, hard-filtered, eval-gated;
  bulk 5,163-pair load RETIRED (wrong mechanism), not deferred.
- **Dead-code retirement** rides PR-E (a NEW addition), gated after C2 + S2 PROD-verified.

Out of scope (design §9; do NOT scope-creep): deeper G2 (OR→AND); full semantic/"Heavy" search +
embedding regen; embedding-pipeline bug fixes; bulk synonym load; filter-UI redesign.

If you want to "improve" the design/plan mid-execution, STOP and surface it to the user.

# HARD RULES (enforce every action)

DATA SAFETY (top priority): schema changes ONLY via migration files + CI (local → TEST → PROD);
never `mcp__supabase-remote__apply_migration` / direct PROD writes; the eval harness is READ-ONLY
(its own guard); read-only PROD SELECTs/censuses are fine. Before merging a DB PR: wait for CI to
apply to TEST, verify via `mcp__supabase-test__execute_sql`. After PROD apply: verify via
`mcp__supabase-remote__execute_sql` with VERBATIM identifiers from the migration source. When in
doubt about prod data, ask.

MIGRATION DISCIPLINE: invoke `database-migrations` before touching `supabase/migrations/`. Verify
date-prefix sorts AFTER the latest (`ls supabase/migrations | sort | tail -3`; digits < underscore).
**GATE 2 (Codex, pre-TEST):** before opening a migration PR, run a Codex adversarial review of the
SQL (idempotency, trigger recreate, backfill scope, grants, rollback). Triage + fix-up before push.

CODEX GATES (independent model family; user-invoked slash commands are `disable-model-invocation`,
so when driving autonomously run the wrapped companion via Bash:
`node "$CLAUDE_PLUGIN_ROOT/scripts/codex-companion.mjs" adversarial-review --base main --scope branch "<focus>"`,
prefer background + pull via `status`/`result`). Triage with bot-review discipline (rebuttal pass
every finding; default-reject below-bar hardening).
- GATE 1 (plan-lock): Codex-review the design doc / a substantial impl section BEFORE building. Fold accepted findings in first.
- GATE 2 (pre-TEST migration): above.
- GATE 3 (pre-push): in the PER-PR ritual, parallel to the Claude reviewer.

PER-PR RITUAL (compact; canonical detail in the cited feedback memories):
1. Pre-push: dispatch a code-reviewer agent on `git diff main...HEAD` + GATE-3 Codex in parallel;
   dedupe + rebuttal-pass; fix-ups before push. (`feedback_bot_review_investigation.md`)
2. `npm run type-check && npm run lint`, push, `gh pr create`.
3. Wait for external bots.
4. Collect findings from ALL FOUR PR surfaces. (`feedback_pr_comment_surfaces.md`)
5. Rebuttal-pass every finding; default-reject below-bar hardening. (`feedback_pr_bot_review_workflow.md`)
6. Consolidated fix-up commits (never amend pushed commits).
7. Re-verify TEST DB **and re-run `eval:search`** after every DB-affecting round. (`feedback_per_round_test_db_verification.md`)
8. Round-cap after 2 bot rounds; 3rd is critical-only.

WHAT NEVER TO DO WITHOUT EXPLICIT USER INSTRUCTION: push to main; merge a PR; approve a PROD
migration; `git push --force`; re-write design/impl to "improve" mid-execution; ship a search
change without an `eval:search` delta; `bd` commands (beads broken — track state in the status doc).

WHAT'S OK without asking: `git push -u origin feat/...` for the current branch; `git commit` on the
feature branch; `gh pr create`; reading/tests/baseline checks; read-only SQL via MCP (local/TEST
free; PROD read-only probes); dispatching review agents.

VERIFICATION BEFORE COMPLETION: run the task's verify commands; "tests pass" requires green output
you saw. Every search-affecting PR commits a fresh `eval:search` scorecard delta.

TDD: the impl plan flags TDD tasks (parseSearchQuery, the metric module). Failing-test-first →
implement → green → commit. Invoke `superpowers:test-driven-development`.

# SESSION SCOPE

Carry as many tasks as supervisor context allows: dispatch → verify → checkpoint the status header
→ next. Boundary = supervisor context budget, not task count. Always stop for: user-gated decisions
(merge, PROD approval, `[user-verdict]`, the gold-set authoring), anomalies needing user judgment,
or heavy context (then session-end ritual + hand off). Never hand off mid-task.

# SESSION-END RITUAL

1. `npm run type-check && npm run lint` — must pass.
2. `git status && git log --oneline -5 origin/main..HEAD`.
3. Update the status file: refresh the Current State header (tight, ~300-500 words); append a
   session-log entry (commits + task IDs + decisions + learnings); update recent-decisions +
   out-of-scope follow-ups. The SUPERVISOR owns this file.
4. Commit the status file (bundle docs with the next fix-up push; no docs-only CI burn during an open PR).
5. PR-cycle archival at the START of each new PR cycle (move prior PR's entries to the archive;
   promote learnings to feedback memories first).
6. Initiative-close retrospective (FINAL session only): lift out-of-scope follow-ups into memory;
   audit the session log for promotable learnings; check whether anything should amend the
   scaffolding templates / `/kickoff-feature` (propose, don't silently edit). Also update the
   parent track (`2026-06-11-metadata-rebuild-pr6-stage2-retag-execution-status.md`) + memory
   `project_search_modernization.md`.
7. Tell me in 2-3 sentences what got done + what's next. End there.

# AUTO-LOADED MEMORY (already in context, don't duplicate)

MEMORY.md references include `project_search_modernization.md`, `project_metadata_rebuild_initiative.md`,
`feedback_multi_session_execution.md`, `feedback_workflow_orchestration.md`, the per-PR-ritual /
data-safety / bot-review-investigation / comment-surfaces / per-round-test-db-verification memories.

# RIGHT NOW

Read this → design doc → impl plan from the current task → status file → baseline checks → tell me
where you are and what's next. Don't start coding until I confirm. The design Status is **Locked**,
so this is execution, not design-lock. Next up: GATE 1 Codex review of the design doc (if not yet
done), then S0 (eval harness) — with the gold set built collaboratively with the user.

<!-- ===== END OF KICKOFF BODY ===== -->
