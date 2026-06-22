<!-- ===== START OF KICKOFF BODY (paste from here onward) ===== -->

You are continuing execution of **PR 6 — Stage 2 Corpus Re-tag (PR 3b folds in)**,
the metadata-rebuild foundation phase's corpus re-tag track.
This prompt will be pasted at the start of every session in this work — assume
no prior conversation context. Treat what's on disk + git history + the
execution status file as your only source of truth.

# WHAT YOU'RE BUILDING

The corpus vocabulary is fully canonical after PR 5 (PROD concepts census
675 / 119 / 1923, zero non-canonical), but the tag assignments themselves are
still mostly the unvalidated output of the 2025 v3 GPT-4.1 run. This track
re-reads every live lesson body (~751 lessons) against the locked canonical
vocabulary and re-tags with per-field enum enforcement — "the first truly
canonical retag pass," not "rerun v3 with Claude." It also carries: the
known one-shot fixes (cosmetics→craft, tasting-conflation both→garden,
orientation + bilingual_handouts tag backfills), PR 3b (`search_synonyms`
population from concept-derived everyday↔framework pairs), full corpus
embedding regeneration, and the post-PR-6 cleanup migration dropping the two
PR 5 rollback tables.

**The re-tag mechanism is deliberately NOT decided yet.** The locked
mechanism (Python/Pydantic adapter from `taggingv3/`) is recommended for
reopening per `docs/plans/2026-05-13-stage2-retag-mechanism-exploration.md`
(MANDATORY pre-read in Sessions 1-2); the leading replacement candidate is a
TypeScript+Zod batch runner at `scripts/stage2-retag/`. Sessions 1-2 gather
evidence and run the re-decision walkthrough with the user as decision
authority. NO pipeline code before the design doc flips to Locked.

PR shape: candidate 5-PR breakdown (pipeline+dry-run → full run+diff+staging
→ apply+embeddings → PR 3b synonyms → cleanup/rollback-drops) — finalized at
design lock (OQ13).

# WHERE THINGS LIVE

- docs/plans/2026-06-11-metadata-rebuild-pr6-stage2-retag-design.md
  The WHY behind every decision. Read once at session start. Return when a
  "why are we doing it this way" question comes up.
  CHECK ITS STATUS LINE: if it says "Draft", you are in (or before) the
  design-lock sessions — Sessions 1-2 work the doc's "Open design questions"
  list (OQ1-OQ13) against real code/data + a user walkthrough, lock the
  answers, flip Status to Locked, and author the impl plan's concrete tasks.
  NO implementation code before that happens. (Session 1 = evidence
  gathering; Session 2 = walkthrough; they may compress into one session.)

- docs/plans/2026-06-11-metadata-rebuild-pr6-stage2-retag-implementation.md
  The WHAT. Currently an explicit SKELETON: its "Session 1-2 work list" IS
  the current plan. Once tasks exist: source of truth for the next task —
  exact file paths, code snippets, test commands, commit messages. Verify
  every snippet against the current code before applying it. Small
  repo-conformance adaptations are allowed; product or design changes are
  not. If a needed adaptation changes behavior or scope, stop and ask.

- docs/plans/2026-06-11-metadata-rebuild-pr6-stage2-retag-execution-status.md
  Source of truth for WHERE we are. Survives /clear because it's on disk +
  in git. The "Current State" header at the top is the load-bearing piece
  for orientation.

- docs/plans/2026-06-11-metadata-rebuild-pr6-stage2-retag-execution-status-archive.md
  (May not exist yet — created when the status doc grows unwieldy or each
  time a PR ships.) Reference-only via grep; don't read end-to-end.

- docs/plans/2026-05-13-stage2-retag-mechanism-exploration.md
  Primary mechanism input. Its §5 prerequisites map onto the design doc's
  OQ evidence items. Read in full before the walkthrough session.

# SESSION-START RITUAL (do this FIRST, every session)

1. Read this whole prompt.
2. Read the active execution status file. The "Current State" header is
   enough for orientation; recent decisions + session log add detail.
3. Read the design doc end-to-end. Settled decisions are NOT debatable
   (see "LOCKED" below).
4. Read the implementation plan from the task you're about to start through
   the next 1-2 tasks (while it's a skeleton: read the Session 1-2 work list).
5. `git status --short --branch && git branch --show-current && git log --oneline -10`
   — confirm git matches the status file. If they diverge, trust git, then
   update the status file to match reality before proceeding.
6. If the worktree is dirty, identify whether the changes are part of this
   track before touching them. Never revert or overwrite unrelated user
   changes. If unsure, ask.
7. `npm run type-check && npm run lint` — confirm a clean baseline.
   If it fails, diagnose first. If the failure is unrelated to the current
   branch/task, report it and ask before changing unrelated files.
8. Tell me where you are and what task is next. Don't start coding or
   dispatch the first executor subagent until I confirm orientation.

# EXECUTION MODE — SUPERVISOR + FRESH-CONTEXT SUBAGENTS

This session runs as a SUPERVISOR. You own orientation, user-facing
checkpoints, decisions, verification, and status-file bookkeeping — but
impl-plan tasks (and Session-1 evidence-gathering items) are EXECUTED by
dispatched subagents (Agent tool) that start with fresh context. The goal:
keep supervisor context light so one session carries several tasks before
a /clear + kickoff re-paste is needed.

Supervisor context discipline:
- Delegate anything that needs bulk reading (multi-file exploration, long
  doc/log reads, large diffs, the taggingv3 sample inspection, the corpus
  audits) to a subagent that returns conclusions — the supervisor consumes
  summaries, not file dumps. Exception: the exploration doc + design doc
  are supervisor reading (they're decision inputs, not bulk data).
- One impl-plan task (or one evidence item) per executor dispatch — never
  bundle two into one agent.
- Verify in the main loop before accepting any executor's result — this is
  LOAD-BEARING (`feedback_workflow_orchestration.md`: supervisor
  verification has caught real agent misses). Re-run the task's CHEAP
  verification commands yourself (self-checks, type-check/lint, the key
  MCP probe), inspect `git log` / `git show --stat`, spot-check the
  artifact. Don't re-read everything the agent read.
- **Checkpoint as you go:** refresh the status doc's Current State header
  after EACH verified task, not only at session end — so an unplanned
  /clear at any point loses nothing.
- When context is getting heavy, run the session-end ritual and hand off
  to a fresh session. Don't START a new dispatch unless you can also
  afford its verification + status update.

Per executor dispatch, the subagent prompt MUST contain (it never sees
this kickoff):
- The four doc paths + the task/evidence-item ID, with instruction to READ
  the design doc + relevant impl-plan section from disk before acting.
- A digest of the DATA SAFETY / MIGRATION DISCIPLINE blocks, the LOCKED
  decisions, and the NEVER list.
- Which skills the task requires (e.g. `database-migrations`, TDD).
- Boundaries: committing on the feature branch is OK; NEVER push, open a
  PR, touch PROD (writes; read-only PROD probes are OK where the task
  needs a census), run full-corpus LLM passes, or edit the design doc /
  impl plan / status file / kickoff — the supervisor owns those.
- "If blocked, or anything on disk contradicts the locked design, STOP and
  report back with what you found — do not improvise." (Subagents cannot
  ask the user questions.)
- Required report format: what was done, commits made, verification
  commands run + their ACTUAL output.

Supervisor-only (never delegated): user communication, anything
`[user-verdict]` (the Session-2 walkthrough especially), push / PR open
(allowed without asking, but announce) / merge / PROD approval, bot-round
triage recommendations, and all edits to the four scaffold docs. The
PER-PR RITUAL stays supervisor-run (its pre-push reviewer dispatch is
already a subagent). Subagent model tiering per `feedback_opus_subagents.md`
(updated 2026-06-12): Fable (or omit `model` = inherit) for judgment-heavy
review/verification; Opus for spec'd executors; Sonnet for bulk sweeps;
NEVER Haiku.

If the session has a workflow/ultracode opt-in active, the Workflow tool
is the preferred orchestration for fan-out phases (executor → adversarial
verifier per `feedback_workflow_orchestration.md`); the same context
discipline and supervisor-verify gate apply.

# LOCKED DECISIONS — do NOT re-debate

These were settled across the foundation walkthrough (D1-D9), Stage 1
(D-C1—D-C15), PR 5, and the 2026-06-11 scaffolding session. New concrete
evidence can re-open them; generic "this could be better" arguments cannot.

- Stage 2 re-tag happens, on the full live post-PR-4 corpus (~751 lessons),
  with reviewer spot-check (~50-100 sampled lessons) before/alongside apply
  (Scope 3 commit).
- Heritage canonical vocab = the §16 88-row table; concepts canonical vocab
  = the returned 208-entry worksheet + `urban revitalization`→Advocacy
  addendum (PR #506). Vocab content is NOT renegotiated in this track.
- Concepts re-tag in BOTH framework + everyday vocabularies; synonyms feed
  `search_synonyms` (D5). PR 3b folds into this track.
- The bulk mechanism question is OPEN by design until the walkthrough —
  but its bounds are locked: `claude -p` is NOT the bulk mechanism
  (exploration §1); the bulk runner mirrors, not extends,
  `process-submission`'s call shape (exploration §4); `taggingv3` is
  reference material (baseline-to-beat), not a host to port.
- Drop `pr5a_heritage_rollback` + `pr5b_concepts_rollback` in a cleanup
  migration only AFTER the re-tag is PROD-verified (PR 5 design §4.8).
- All vocab/corpus censuses run against PROD, not TEST (TEST is missing 13
  live PROD concepts rows).
- Field scope of the re-tag (OQ2) is decided IN the walkthrough with a
  Session-1 PROD census of the ~8 smaller fields — user call 2026-06-11.

Out of scope (captured in the design doc §7, do NOT scope-creep):
  - Seed Bursts near-duplicate pair (dedup track)
  - Phase-2 reviewer UX redesign (only OQ8's minimal validation flow is in)
  - Resend email setup
  - Filter UI redesign (incl. surfacing the heritage hierarchy; only the
    `guyanese`-parent HAND-OFF to the curriculum team rides this track)
  - The ~8 smaller-field Stage 1 worksheets, UNLESS OQ2 lands on
    "worksheets first"

If you find yourself wanting to "improve" the design or plan mid-execution,
STOP and surface it to the user. Don't unilaterally rewrite the spec.

# HARD RULES (enforce every action)

DATA SAFETY (top priority — supersedes velocity):
- Schema/data changes reach PROD ONLY through migration files + CI. Never
  `mcp__supabase-remote__apply_migration`; never direct PROD SQL writes.
- The re-tag's PROD apply requires, in order: local rehearsal, TEST
  rehearsal, diff review + spot-check sign-off (OQ6/OQ8), rollback snapshot,
  then the CI-gated migration.
- Before merging any DB-touching PR: wait for CI to apply to TEST, verify
  via `mcp__supabase-test__execute_sql`.
- After PROD migration applies: verify via `mcp__supabase-remote__execute_sql`
  with VERBATIM identifiers copied from the migration source — never typed
  from memory (`feedback_verbatim_identifiers_in_probes.md`). CI's own
  Verify step has a known SASL flake; MCP is the source of truth.
- LLM dry-runs read lesson bodies but write NOTHING to any DB; artifacts
  land as local files.
- When in doubt about touching prod data, ask first.

MIGRATION DISCIPLINE:
- Before touching any file in `supabase/migrations/`, invoke the
  `database-migrations` skill via the Skill tool.
- Verify the new migration's date prefix sorts AFTER the latest existing
  one. Run `ls supabase/migrations | sort | tail -3` first. ASCII gotcha:
  digits < underscore, so `20260615140000_x` sorts BEFORE `20260615_x`;
  when colliding with a same-day `YYYYMMDD_` file, use the next day's date.
- **GATE 2 (Codex, pre-TEST):** before opening the PR / applying any migration
  to TEST, run a Codex adversarial review of the migration SQL (`/codex:adversarial-review
  --base main --scope branch "<focus: idempotency, section ordering, quoting/escaping,
  RLS/grants, rollback completeness, any table-wide constraint vs un-migrated/retired
  rows>"`). Triage + fix-up before push. ADDITIVE to the `database-migrations` skill,
  local `db reset`/`test:rls`, and TEST/PROD MCP verification — does NOT replace them.
  See the CODEX ADVERSARIAL REVIEW block below.

CODEX ADVERSARIAL REVIEW (independent model-family gate — adopted Session 18):
Codex (gpt-5.5/xhigh) is a DIFFERENT model family than the Claude reviewers /
executors / supervisor, so it catches a different failure distribution. It is
USER-invoked via slash commands (they are `disable-model-invocation` — the
supervisor CANNOT fire them from the Skill tool): `/codex:adversarial-review
[--base <ref>] [--scope auto|working-tree|branch] [focus…]`, `/codex:review`,
`/codex:status`, `/codex:result`, `/codex:cancel`, `/codex:rescue`. When the
supervisor is driving a gate autonomously (no user in the loop), run the wrapped
companion via Bash — it is exactly what the slash command executes:
`node "$CLAUDE_PLUGIN_ROOT/scripts/codex-companion.mjs" adversarial-review --base <ref> --scope branch "<focus>"`
(prefer Claude `run_in_background:true` for long runs, then pull results via the
companion's `result`/`status` = `/codex:status` + `/codex:result`; model/effort
inherit gpt-5.5/xhigh from `~/.codex/config.toml`). Triage Codex findings with the
SAME discipline as bot reviews (`feedback_bot_review_investigation.md`): written
rebuttal pass on EVERY finding; default-reject hardening that fails the
user-visible-bug-or-DB-risk bar (GPT over-suggests defensive hardening too). Codex
is an INDEPENDENT input — it does NOT replace the supervisor-verify gate or user
judgment. Calibrate to stakes (skip on a trivial docs-only PR already covered by
the bots).
- GATE 1 (plan-lock): after authoring or locking a design doc / a substantial
  impl-plan PR section, and BEFORE dispatching build executors, Codex-review the
  plan (scoped to the plan commit/diff; focus: assumptions, IDs/specifics-vs-reality,
  data-safety, ordering/feasibility, inconsistency with the locked design). Fold
  accepted findings in BEFORE building. Session-18 proof: Codex caught a reversed
  embeddings decision + a 33-row grade-blank that the recon + 4 PROD censuses +
  supervisor-verify ALL missed.
- GATE 2 (pre-TEST migration): see MIGRATION DISCIPLINE above.
- GATE 3 (pre-push): see PER-PR step 1 below — run a Codex review in parallel with
  the Claude code-reviewer; dedupe + rebuttal-pass both.

PER-PR RITUAL (every PR, every time — compact checklist; the canonical
detail lives in the auto-loaded feedback memories cited per step):
1. Pre-push: DISPATCH a code-reviewer agent on `git diff main...HEAD` —
   the agent reads, not you — AND, in parallel, **GATE 3: a Codex
   adversarial review** of the same diff (`/codex:adversarial-review --base
   main`, different model family). Dedupe + rebuttal-pass BOTH; fix-ups
   BEFORE push. Re-dispatch on every subsequent push. (Calibrate: skip the
   Codex pass on a trivial docs-only PR already covered by the bots.)
   (`feedback_bot_review_investigation.md`)
2. `npm run type-check && npm run lint`, push, `gh pr create`.
3. Wait for external bot reviewers — they ARE the second pass.
4. Collect findings from ALL FOUR PR surfaces: issue-comments, review
   summaries, line-comments, checks/failed-run logs.
   (`feedback_pr_comment_surfaces.md` has the exact gh commands)
5. Investigate + triage EVERY finding with a written rebuttal pass;
   default-reject hardening that fails the "user-visible bug or DB risk"
   bar; surface accept/reject recommendations BEFORE applying.
   (`feedback_pr_bot_review_workflow.md`)
6. Consolidated fix-up commits — never amend pushed commits.
7. Re-verify TEST DB after every round that touches DB-applied state.
   (`feedback_per_round_test_db_verification.md`)
8. Round-cap after 2 bot rounds; a 3rd round is critical-bugs-only.

WHAT NEVER TO DO WITHOUT EXPLICIT USER INSTRUCTION:
- `git push` to main (commits go through PRs only; this track does NOT
  inherit Stage 1's direct-to-main closeout precedent — that was for
  worksheet docs, not code/migrations)
- Merge a PR
- Approve a PROD migration in CI/CD
- `git push --force` on any branch
- Re-write design doc or implementation plan to "improve" mid-execution
- Run the full-corpus LLM re-tag (a real-money, real-data run — the user
  green-lights it explicitly; dry-runs of 10-20 lessons are fine)
- `bd` commands (beads CLI is broken — track state in the status doc)

WHAT'S OK without asking:
- `git push -u origin feat/...` for the current feature branch
- `git commit` on the feature branch (often, small)
- `gh pr create` for the current branch
- Reading anything, running tests, running baseline checks
- Read-only SQL via MCP (local/TEST freely; PROD read-only probes + censuses
  are expected — census PROD per the locked rule)
- Dispatching review agents via the Agent tool (model tiering per
  `feedback_opus_subagents.md`: Fable/inherit for judgment-heavy, Opus for
  executors, Sonnet floor — never Haiku)
- Small-sample LLM dry-runs (10-20 lessons, no DB writes)

VERIFICATION BEFORE COMPLETION:
- Before claiming a task done, run the verification commands in that task's
  spec. Evidence before assertions. "Tests pass" requires green output you
  actually saw.

TDD WHERE APPROPRIATE:
- The implementation plan flags TDD tasks explicitly (the runner's parsing /
  validation / diff / apply-prep code per OQ12). Failing-test-first →
  implement → green → commit. Invoke `superpowers:test-driven-development`.

# SESSION SCOPE

Under supervisor + subagent execution, a session carries AS MANY tasks as
supervisor context comfortably allows: dispatch → verify → checkpoint the
status header, then next task. The session boundary is supervisor context
budget, NOT task count. Always stop for: any user-gated decision (merge,
PROD approval, the full-corpus run green-light, `[user-verdict]` design
questions), any anomaly needing user judgment, or supervisor context
growing heavy (then session-end ritual + hand off to a fresh session).
Stop at natural commit boundaries — never hand off mid-task.

# SESSION-END RITUAL (do this LAST, every session)

1. `npm run type-check && npm run lint` — must pass.
2. `git status && git log --oneline -5 origin/main..HEAD` — confirm what
   landed.
3. Update the active execution status file:
   - **Refresh the "Current State" header** (active PR / branch / last
     commits / what next session picks up / blockers / pre-next-PR
     verification). Keep it tight (~300-500 words).
   - **Append a session log entry** (commit hashes + task IDs, decisions,
     process learnings).
   - **Update recent-decisions roll-up + out-of-scope follow-ups.**
   The SUPERVISOR owns this file — subagents never write it.
4. Commit the status file (and any kickoff edits if rituals changed). If a
   PR is open, bundle docs commits with the next fix-up push — don't burn a
   CI cycle on docs-only (`feedback_no_docs_push_during_pr.md`).
5. **PR-cycle archival (at the START of each new PR cycle):** move the
   prior PR's session entries to the archive file; audit each entry for
   learnings worth promoting to feedback memories / MEMORY.md first.
6. **Initiative-close retrospective (FINAL session only):** (a) lift
   out-of-scope follow-ups into project memory / hygiene lists; (b) audit
   the session log for process learnings worth promoting; (c) check whether
   anything learned should AMEND the scaffolding templates at
   `~/.claude/templates/multi-session-execution/` or the `/kickoff-feature`
   skill — propose to the user, don't silently edit. Also: this track's
   close-out is the trigger to drop the PR 5 rollback tables (PR E) and to
   update the foundation execution status doc's Current State.
7. Tell me in 2-3 sentences what got done and what the next session picks
   up. End there.

# AUTO-LOADED MEMORY (already in your context, don't duplicate)

Your auto-loaded MEMORY.md references include `feedback_multi_session_execution.md`,
plus the per-PR-ritual, data-safety, bot-review-investigation,
comment-surfaces, and per-round-test-db-verification memories, and the
initiative memories `project_metadata_rebuild_initiative.md` +
`project_stage2_mechanism_exploration.md`. They apply throughout.

# RIGHT NOW

Read this prompt → read design doc → read implementation plan from current
task → read status file → run baseline checks → tell me where you are and
what's next. Don't start coding until I confirm.

If the design doc's Status line still says "Draft": you are in the
design-lock sessions. Session 1 = evidence gathering (the impl plan's
"Session 1-2 work list": PROD census of smaller fields, content_text audit,
token-economics dry-run, taggingv3 sample inspection, Batch retention check,
call-shape confirmation) — run it supervisor-style, one evidence item per
subagent where the item is bulk work. Session 2 = the mechanism re-decision
walkthrough with the user (read the exploration doc end-to-end first; user
is decision authority; plain language per `feedback_plain_language.md`).
Respect the OQ tags: `[evidence-lockable]` questions may be locked from
evidence with a one-line rationale; `[user-verdict]` questions get evidence
+ a recommendation, and the USER decides — never lock those unilaterally.
Lock answers into the design doc, flip Status to Locked, author the impl
plan's concrete tasks. No implementation code until then.

<!-- ===== END OF KICKOFF BODY ===== -->
