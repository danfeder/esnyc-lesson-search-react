<!-- ===== START OF KICKOFF BODY (paste from here onward, after /clear) ===== -->

You are continuing execution of **Wave 6 — Search Depth (C41 AND-of-ORs + C42 scope-spike)**.
This prompt is pasted at the start of every session in this work — assume no prior conversation
context. Treat what's on disk + git history + the execution status file as your only source of truth.

# WHAT YOU'RE BUILDING

The public lesson search is too loose for multi-word queries: `expand_search_with_synonyms` flattens
every token + every synonym into one flat OR (`food | foods | waste | decay | …`), so a broad token
like "food" floods the results and multi-meaningful-term precision collapses (the eval scorecard
records `food waste` = **568 results, 2/10 precision**). **C41** fixes this by requiring each distinct
user term (synonyms OR'd within a term's group), AND'd across terms:
`(food|foods) & (waste) & (decay|decomposition)` — built with PostgreSQL **tsquery algebra**
(`plainto_tsquery` + `||` + `&&` + `numnode`), proven on the existing `scripts/search-eval/` harness.
The initiative also **scopes (does not build)** **C42**, the heavy semantic/embedding tier, as a
written go/no-go spike.

3 PRs (+1 contingent):
  PR A: Search-eval probes for multi-term precision (additive; capture the "before" baseline)
  PR B: C41 — AND-of-ORs term combination (the one migration; full DB discipline; eval-gated)
  PR C: C42 semantic-tier scope-spike (go/no-go doc; no code)
  PR D (contingent): two-pass relax — ONLY if PR B's scorecard shows an unacceptable recall cliff

# WHERE THINGS LIVE

- `docs/plans/2026-06-29-wave6-search-depth-design.md`
  The WHY + LOCKED decisions. **Status: Locked** — settled decisions are NOT debatable (see LOCKED
  below). Read once at session start; return for "why this way" questions. (GATE A folded; §3-4 carry
  the SQL specifics + the GATE-A F1–F5 fixes.)

- `docs/plans/2026-06-29-wave6-search-depth-implementation.md`
  The WHAT. Per-task file paths, SQL sketch (illustrative — adapt to the real current body; re-anchor
  by SYMBOL, line numbers drift), verify commands, commit messages. Follow it for scope + task order.
  Small repo-conformance adaptations OK; product/design changes → STOP and ask.

- `docs/plans/2026-06-29-wave6-search-depth-execution-status.md`
  Source of truth for WHERE we are; survives /clear. The Current State header is the load-bearing
  orientation piece. Don't read the archive (if any) at session start.

# SESSION-START RITUAL (do this FIRST, every session)

1. Read this whole prompt.
2. Read the active execution status file (Current State header is enough for orientation; recent
   decisions + session log add detail).
3. Read the design doc end-to-end. Settled decisions are NOT debatable (see "LOCKED").
4. Read the implementation plan from the task you're about to start through the next 1–2 tasks.
5. `git status --short --branch && git branch --show-current && git log --oneline -10` — confirm git
   matches the status file. If they diverge, trust git, then fix the status file before proceeding.
6. If the worktree is dirty, identify whether the changes are part of Wave 6 before touching them.
   Never revert/overwrite unrelated user changes. If unsure, ask.
7. `npm run check` (= type-check + lint) — confirm a clean baseline. If it fails, diagnose first; if
   unrelated to this branch/task, report + ask before changing unrelated files.
8. Tell me where you are and what task is next. Don't start coding or dispatch the first executor
   until I confirm orientation.

# EXECUTION MODE — SUPERVISOR + FRESH-CONTEXT SUBAGENTS

This session runs as a SUPERVISOR. You own orientation, user checkpoints, decisions, verification,
and status-file bookkeeping — impl-plan tasks are EXECUTED by dispatched subagents (Agent tool) with
fresh context. Keep supervisor context light so one session carries several tasks before a /clear.

Supervisor context discipline:
- Delegate bulk reading (multi-file exploration, long docs, large diffs) to a subagent that returns
  conclusions — consume summaries, not file dumps.
- One impl-plan task per executor dispatch — never bundle two.
- **Verify in the main loop before accepting any executor's result — LOAD-BEARING**
  (`feedback_workflow_orchestration`). Re-run the task's cheap verification (self-checks, `npm run
  check`, the eval probe), inspect `git show --stat`, spot-check the artifact. Don't re-read everything.
- **Checkpoint as you go:** refresh the status doc's Current State header after EACH verified task.
- When context gets heavy, run the session-end ritual and hand off. Don't START a dispatch you can't
  also afford to verify + checkpoint.

Per executor dispatch, the subagent prompt MUST contain (it never sees this kickoff):
- The three doc paths + the task ID, with instruction to READ the design doc + its task section first.
- A digest of DATA SAFETY / MIGRATION DISCIPLINE, the LOCKED decisions, and the NEVER list.
- Which skills the task requires (TDD; `database-migrations` for PR B).
- Boundaries: committing on the feature branch is OK; NEVER push, open a PR, touch PROD, or edit the
  design / impl / status / kickoff docs — the supervisor owns those.
- "If blocked, or anything on disk contradicts the locked design, STOP and report what you found — do
  not improvise." (Subagents cannot ask the user questions.)
- Required report: what was done, commits made, verification commands run + their ACTUAL output.

Supervisor-only (never delegated): user communication, `[user-verdict]` decisions (PR A.1 probe
predicates need the user's sign-off), push / PR open (announce) / merge / PROD approval, bot-round
triage recommendations, all edits to the four docs. If ultracode/Workflow is active, the Workflow
tool is the preferred orchestration for fan-out phases (executor → adversarial verifier).

# LOCKED DECISIONS — do NOT re-debate

Full canonical list = the design doc (read every session). Pinned here (most at-risk of re-debate):
- **Strict AND-of-ORs, built with tsquery ALGEBRA, not string concatenation.** `plainto_tsquery`
  (NOT `to_tsquery` — injection safety, GATE-A F1) per token, `||` within a term's synonym group,
  `&&` across distinct terms, `numnode()` to drop stop-word-only groups.
- **Eval-gated.** `npm run eval:search` scorecard is the gate: PR A probes flip red→green with **zero
  regression** on frozen-recall/precision/dup-flood/sentinel/G3 + single-term controls unchanged.
- **Default mechanism = `expand_search_with_synonyms` returns `tsquery`; `search_lessons` consumes it
  directly with an empty-tsquery guard** (`expanded_tsquery IS NOT NULL AND numnode(...) > 0 AND …`,
  GATE-A F2). Return-type change ⇒ DROP+CREATE + re-GRANT + `NOTIFY pgrst` + `database.types.ts` regen
  (GATE-A F3/F4). Fallback (keep `text` return, leave RPC untouched) ONLY if the Task B.1 caller-grep
  finds a hidden caller.
- **PR order A → B → C** (probes/baseline → migration → spike). PR D (two-pass relax) is contingent on
  a measured recall cliff — NOT pre-built.
- **RPC external signature unchanged** → no frontend change, no PGRST202 split-deploy window. But the
  change is a return-type change + RPC redefinition (not a one-line body edit) — full migration discipline.

Out of scope (design §9; do NOT scope-creep): C42 BUILD; C07/C01/C09 (embedding mismatch/regen/dedup);
C162 (unaccent); C43 (semantic seed data); C121/C122 (SSO/2FA — the other W6 cluster); two-pass relax
(unless PR B's eval forces it); new pgTAP infra (only a lightweight assertion is in scope).

If you want to "improve" the design/plan mid-execution, STOP and surface it. Don't unilaterally rewrite.

# HARD RULES (enforce every action)

DATA SAFETY (top priority — supersedes velocity):
- Schema changes ONLY through migration files. Never apply schema directly to PROD via MCP/SQL.
- Before merging the PR B migration: wait for CI to apply it to TEST, then verify via
  `mcp__supabase-test__execute_sql` (the expander output, the collapsed `total_count`, the `'the of and'`
  empty-tsquery no-error probe).
- After PROD applies: verify via `mcp__supabase-remote__execute_sql` (read-only). Mandatory — CI's verify
  step flakes (`reference_ci_flakes`); MCP is source of truth.
- When in doubt about touching prod data, ask first.

MIGRATION DISCIPLINE (PR B):
- Before touching any file in `supabase/migrations/`, invoke the `database-migrations` skill.
- Verify the new migration's date prefix sorts AFTER the latest. `ls supabase/migrations | sort | tail -3`
  first. ASCII gotcha: digits < underscore (`20260629000000_x` sorts BEFORE `20260629_x`) — use a full
  14-digit `YYYYMMDDHHMMSS` prefix that sorts after `20260622010000_*`.
- The RPC's external signature is unchanged, so the additive-RPC split-deploy rule does NOT apply (no
  PGRST202 window). But re-GRANT both functions + `NOTIFY pgrst, 'reload schema'` + regen types.
- **GATE 2 (Codex, pre-TEST):** before opening the PR / applying to TEST, dispatch the `codex:codex-rescue`
  agent (pin `--model gpt-5.5`, READ-ONLY, return INLINE) on the migration SQL — idempotency, DROP/CREATE
  ordering, `plainto_tsquery`/`numnode`/`&&` logic, the empty-tsquery guard, rank NULL-handling, GRANT
  completeness, `NOTIFY pgrst`, rollback completeness, trigram-fallback interaction. Additive to the
  migration skill + local reset/RLS + TEST/PROD verification.

CODEX ADVERSARIAL REVIEW (independent model-family gate): USER-invoked `/codex:*` slash commands are
`disable-model-invocation` (the supervisor CANNOT fire them from the Skill tool). When driving a gate
autonomously, dispatch the **`codex:codex-rescue` agent** (Agent tool) — pin **`--model gpt-5.5`**, keep
Supabase READ-ONLY, **return findings INLINE** (`feedback_codex_return_inline`, `feedback_codex_model_pin`).
Triage Codex findings with the same discipline as bot reviews (`feedback_bot_review_investigation`):
written rebuttal pass on EVERY finding; default-reject hardening that fails the user-visible-bug-or-DB-risk
bar. Err toward MORE cross-examination (`feedback_codex_over_crossexamine`). Codex is INDEPENDENT — does
NOT replace supervisor-verify or user judgment.
- GATE 1 (plan-lock): design GATE A + impl GATE B BOTH RAN + folded during scaffolding (2026-06-29). Done.
- GATE 2 (pre-TEST migration): see MIGRATION DISCIPLINE.
- GATE 3 (pre-push): see PER-PR step 1.
- GATE 4 (pre-finalize, Codex 2nd opinion on bot findings): see PER-PR step 5.

PER-PR RITUAL (every PR — compact; canonical detail in the cited feedback memories):
1. Pre-push: DISPATCH a code-reviewer agent on `git diff main...HEAD` AND **GATE 3** a Codex adversarial
   review of the same diff in parallel. Dedupe + rebuttal-pass; fix-ups BEFORE push. Re-dispatch each push.
2. `npm run check`, push, `gh pr create`.
3. Wait for external bot reviewers — they ARE the second pass.
4. FOUR-SURFACE TRIAGE — `/pr-triage <PR>` (or the four `gh` surfaces in `feedback_pr_comment_surfaces`):
   issue-comments, review summaries, line-comments, checks/failed-run logs. Confirm the underlying RUN
   (`gh run view <id> --json status,conclusion`), not cached `gh pr checks`. "0 findings" needs evidence
   from ALL FOUR. After a fix-up push, re-collect by timestamp.
5. Rebuttal-pass EVERY finding; default-reject hardening below the bar. **GATE 4:** for any real suggested
   change (lean-accept, or non-trivial lean-reject), dispatch a Codex 2nd opinion (inline) on finding +
   code + your rebuttal BEFORE finalizing. Surface reconciled accept/reject recs before applying. Pure
   nits skip GATE 4.
6. Consolidated fix-up commits — never amend pushed commits.
7. Re-verify TEST DB after every round that touches DB-applied state (PR B only)
   (`feedback_per_round_test_db_verification`).
8. Round-cap after 2 bot rounds; a 3rd is critical-bugs-only.

WHAT NEVER TO DO WITHOUT EXPLICIT USER INSTRUCTION:
- `git push` to main (commits go through PRs only) · Merge a PR · Approve a PROD migration ·
  `git push --force` on any branch · Re-write the design/impl plan to "improve" mid-execution ·
  Edit already-pushed migration files (create a NEW fix migration) · Add gold queries to `queries.json`
  without the user's sign-off on the predicates (PR A Task A.1 is a `[user-verdict]` gate).

WHAT'S OK without asking:
- `git push -u origin <feature-branch>` · `git commit` on it · `gh pr create` · reading/tests/baseline
  checks · dispatching review agents · READ-ONLY MCP queries (TEST/PROD verification).

VERIFICATION BEFORE COMPLETION:
- Before claiming a task done, run its Verify commands. "Tests/eval pass" requires you ran them and saw
  green. Invoke `superpowers:verification-before-completion` if unclear.

TDD WHERE APPROPRIATE:
- PR A's probes are authored before the change they measure; PR B's eval scorecard is the red→green gate.
  Invoke `superpowers:test-driven-development`.

# SESSION SCOPE

A session carries as many tasks as supervisor context comfortably allows: dispatch → verify →
checkpoint, then next. Boundary = supervisor context budget, NOT task count. Always stop for: any
user-gated decision (the PR A.1 probe predicates; merge; PROD approval), any anomaly needing user
judgment, or heavy supervisor context (then session-end ritual + hand off). Stop at natural commit
boundaries — never hand off mid-task.

# SESSION-END RITUAL (do this LAST, every session)

1. `npm run check` — must pass.
2. `git status && git log --oneline -5 origin/main..HEAD` — confirm what landed.
3. Update the active execution status file: refresh the Current State header (~300–500 words; active PR /
   branch / last commits / what next session picks up / blockers / pre-next-PR verification); append a
   session-log entry (commit hashes + task IDs, decisions, process learnings); update recent-decisions +
   Out-of-scope follow-ups. Supervisor owns this file — subagents never write it.
4. Commit the status file (+ kickoff edits if you tweaked locked decisions/rituals). Per
   `feedback_no_docs_push_during_pr`, bundle a docs-only commit with the next fix-up push if a PR is open.
5. PR-cycle archival (START of each new PR cycle): move the prior PR's session entries to the archive
   file; audit each for learnings worth promoting to feedback memories / MEMORY.md.
6. Initiative-close retrospective (FINAL session only): (a) lift out-of-scope follow-ups into project
   memory; (b) audit the log for feedback-memory-worthy learnings; (c) check whether anything should
   amend the `~/.claude/templates/multi-session-execution/` templates or `/kickoff-feature` — propose,
   don't silently edit; (d) MEMORY.md hygiene-on-close.
7. Tell me in 2–3 sentences what got done and what next session picks up. End there.

# AUTO-LOADED MEMORY (already in context, don't duplicate)

MEMORY.md auto-loads `project_deferred_work_campaign` (wave history + standing gates),
`project_search_modernization` (the S0–S3 predecessor track — this initiative is its deferred "deeper
G2"), `feedback_multi_session_execution`, `feedback_workflow_orchestration`, the per-PR-ritual /
data-safety / bot-review-investigation / comment-surfaces / per-round-test-db-verification / codex
memories, plus `reference_ci_flakes` and `reference_database_pipeline`. They apply throughout.

# RIGHT NOW

Read this prompt → read design doc (Status: **Locked**) → read implementation plan from PR A Task A.1 →
read status file → `npm run check` → tell me where you are and what's next. Don't start coding until I
confirm.

**Design is LOCKED (GATE A + GATE B both folded during the 2026-06-29 scaffold session). Execution
starts at PR A Task A.1 — propose the multi-term eval-probe predicates and get the user's sign-off
(`[user-verdict]`) BEFORE editing the frozen `queries.json`.** Branch `test/wave6-search-eval-multiterm-probes`
off `main`.

<!-- ===== END OF KICKOFF BODY ===== -->
