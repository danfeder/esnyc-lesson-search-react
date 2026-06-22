<!-- Paste the body between the START/END markers as the first message after /clear, every session. -->

<!-- ===== START OF KICKOFF BODY (paste from here onward) ===== -->

You are continuing execution of **Wave 4 — Data / Corpus Cleanup** (deferred-work campaign).
This prompt is pasted at the start of every session — assume no prior conversation context.
Treat what's on disk + git history + the execution status file as your only source of truth.

# WHAT YOU'RE BUILDING

Wave 4 of the deferred-work campaign: the **first wave that mutates real lesson-corpus data**, so
DATA SAFETY supersedes velocity throughout. It clears a handful of small, distinct cleanup debts,
each through the 3-tier pipeline (local → TEST → PROD-with-manual-approval), snapshot-before-mutate,
reversible-first.

4 PRs, lowest-risk-first:
  PR 1: Reversible data cleanups — C12 (17 stuck `lesson_submissions` → rejected + note), C83 (17 string-typed `submission_reviews.tagged_metadata->'season'` values normalized), C08 (retire the last ~2 live non-ESYNYC imports via `retired_at`). One migration + `.rollback`.
  PR 2: Ghost hard-delete + search-RPC cleanup — C11 (snapshot + `DELETE` 3 ghost "Unknown" rows + remove the hardcoded 3-ID exclusion from `search_lessons`) + C49 (drop the dead `filter_lesson_format` param + its inert frontend line). **Highest risk, isolated, irreversible.**
  PR 3: Vocabulary canonicalization — C02 (`cooking_skills`/`main_ingredients` 2nd-pass; snapshot table first).
  PR 4: Local dev-seed refresh — C88 (`data/consolidated_lessons.json`). No DB, no PROD.

Deferred (NOT this wave): C01 embeddings regen; C09/C07/C03 dedup-pipeline rework.

# WHERE THINGS LIVE

- `docs/plans/2026-06-22-wave4-data-corpus-cleanup-design.md`
  The WHY + locked decisions. Read once at session start.
  **CHECK ITS STATUS LINE:** if it says **Draft**, you are in (or before) the design-lock session —
  Session 1 works the doc's §4 "Open design questions" against real code/data, locks the answers
  (respecting the `[evidence-lockable]` vs `[user-verdict]` tags), flips Status to Locked, and
  authors the impl plan's concrete tasks. **NO implementation code before that happens.**

- `docs/plans/2026-06-22-wave4-data-corpus-cleanup-implementation.md`
  The WHAT. Currently a SKELETON (PR breakdown + pre-flight reads + `<!-- TBD Session 1 -->`
  placeholders). Session 1 authors the concrete tasks. Verify every snippet against current code
  before applying; small repo-conformance adaptations OK, product/design changes are not — stop and ask.

- `docs/plans/2026-06-22-wave4-data-corpus-cleanup-execution-status.md`
  Source of truth for WHERE we are. Survives /clear (on disk + git). The "Current State" header is
  the load-bearing orientation piece. (Archive sibling `-execution-status-archive.md` created per PR cycle.)

# SESSION-START RITUAL (do FIRST, every session)

1. Read this whole prompt.
2. Read the active execution status file (Current State header is enough to orient; don't read the archive).
3. Read the design doc end-to-end. Settled decisions are NOT debatable (see LOCKED below).
4. Read the implementation plan from the task you're about to start through the next 1–2 tasks.
5. `git status --short --branch && git branch --show-current && git log --oneline -10` — confirm git matches the status file. If they diverge, trust git, then fix the status file before proceeding.
6. If the worktree is dirty, identify whether the changes are part of Wave 4 before touching them. Never revert/overwrite unrelated user changes. (Note: several `docs/plans/*-kickoff.md` + `heritage-worksheet-form/` are intentionally untracked — leave them; NEVER `git add -A`.)
7. `npm run check` — confirm a clean baseline (type-check + lint). If it fails, diagnose; if unrelated to this branch, report + ask before touching unrelated files.
8. Tell me where you are and what task is next. Don't start coding or dispatch the first executor until I confirm orientation.

# EXECUTION MODE — SUPERVISOR + FRESH-CONTEXT SUBAGENTS

This session runs as a SUPERVISOR: you own orientation, user checkpoints, decisions, verification, and
status bookkeeping — impl-plan tasks are EXECUTED by dispatched subagents (Agent tool) with fresh context.
Keep supervisor context light so one session carries several tasks.

- Delegate bulk reading to subagents that return conclusions; the supervisor consumes summaries.
- One impl-plan task per executor dispatch.
- **Verify in the main loop before accepting any executor result — LOAD-BEARING** (re-run the task's cheap verify commands yourself: `npm run check`, the key MCP probe, `git show --stat`; spot-check the artifact).
- **Checkpoint the status Current State header after EACH verified task**, not only at session end.
- Stop dispatching well before context fills; never hand off mid-task.
- If the workflow/ultracode opt-in is active, Workflow is the preferred orchestration for fan-out phases (executor → adversarial verifier); same supervisor-verify gate applies.

Per executor dispatch, the subagent prompt MUST contain (it never sees this kickoff): the four doc paths + task ID (instruct it to READ the design doc + its task section first); a digest of DATA SAFETY + LOCKED + the NEVER list; required skills (`database-migrations`, TDD); boundaries (commit on the feature branch OK; NEVER push / open a PR / touch PROD / edit the four scaffold docs); "if blocked or disk contradicts the locked design, STOP and report — do not improvise"; required report = what was done + commits + verify commands run + ACTUAL output.

Supervisor-only (never delegated): user communication, `[user-verdict]` decisions, push / PR open (announce) / merge / PROD approval, bot-round triage recommendations, all edits to the four scaffold docs.

# LOCKED DECISIONS — do NOT re-debate (full set in the design doc; at-risk locks pinned here)

- **Scope = Core 5 (C12, C83, C08, C11, C02) + tiny extras (C49, C88).** Defer C01 + C09/C07/C03. (User, 2026-06-22.)
- **C11 = HARD-delete** the 3 ghost rows (not soft-delete) + remove the hardcoded `search_lessons` exclusion. (User verdict.)
- **4 PRs, lowest-risk-first:** PR1 reversible bundle → PR2 isolated irreversible delete + RPC → PR3 bulk metadata → PR4 no-DB seed. PR2 before PR3 (shared rows), OR scope C02's UPDATE to exclude the ghost IDs.
- **Every corpus mutation goes through a migration file + `.rollback`, snapshot-before-mutate, verbatim IDs from source, TEST-verify before merge + PROD-verify after approval.** (Not data-only via MCP.)
- **Full 4-file scaffold weight** (this initiative). (User, 2026-06-22.)

Out of scope (do NOT scope-creep — captured in design §8): C01 embeddings; C09/C07/C03 dedup rework; hard-deleting the 21 already-retired imports; C65; C67; C117; C36; Wave-3 edge-CI follow-ups.

If you want to "improve" the design/plan mid-execution, STOP and surface it. Don't unilaterally rewrite the spec.

# HARD RULES (enforce every action)

DATA SAFETY (top priority — supersedes velocity):
- Schema/data changes ONLY through migration files. Never apply to PROD via MCP/direct SQL.
- Before merging any DB-touching PR: wait for CI to apply the migration to TEST, then verify via `mcp__supabase-test__execute_sql`.
- After PROD migration applies (manual approval gate): verify via `mcp__supabase-remote__execute_sql`. Mandatory — CI's verify step flakes (SASL), MCP is source of truth (`reference_ci_flakes`).
- Pre-delete (PR2): run the split-by-enforcement reference scan (design Q8) on TEST **and** PROD with verbatim IDs copied from the migration/source (`feedback_verbatim_identifiers_in_probes`) — a wrong ID returns plausible false-success. When in doubt about PROD data, ask first.

MIGRATION DISCIPLINE:
- Before touching any file in `supabase/migrations/`, invoke the `database-migrations` skill; use `/new-migration` to create files.
- Verify the date prefix sorts AFTER the latest existing. `ls supabase/migrations | sort | tail -3` first (latest `20260621000000`). ASCII gotcha: digits < underscore, so `YYYYMMDDHHMMSS_x` sorts before bare `YYYYMMDD_x`; same-day → distinct HHMMSS.
- **GATE 2 (Codex, pre-TEST):** before opening the PR / applying any migration to TEST, run a Codex adversarial review of the migration SQL (`/codex:adversarial-review --base main --scope branch "idempotency, section ordering, quoting, RLS/grants, NOTIFY pgrst, rollback completeness, snapshot-before-delete, constraint-vs-retired-rows"`). Triage + fix-up before push. Additive to the migration skill + local reset/RLS tests + TEST/PROD verify.

CODEX ADVERSARIAL REVIEW (the Codex plugin IS installed for this initiative — keep these gates):
Codex is a DIFFERENT model family → catches a different failure distribution (it earned its keep every bot
round of Waves 1–2, and GATE A's Codex lens is part of this wave's plan). User-invoked via `/codex:adversarial-review`,
`/codex:review`, `/codex:rescue`, etc. (they're `disable-model-invocation` — the supervisor cannot fire them from the
Skill tool). When driving a gate autonomously, prefer `codex:rescue` / the wrapped companion via Bash; **always say
"return findings INLINE"** (`feedback_codex_return_inline` — else it backgrounds + loses them; bit GATE A's design pass).
For LONG runs use `--background` + poll `status`/`result`. Triage Codex findings with the SAME discipline as bots
(`feedback_bot_review_investigation`): written rebuttal on EVERY finding; default-reject hardening that fails the
user-visible-bug-or-DB-risk bar. Independent input — does NOT replace supervisor-verify or user judgment. Note: Codex's
sandbox has NO network → it cannot run `npm audit` or hit the DB usefully; lean on it for SQL/code logic, not live data.
- GATE 1 (plan-lock), STAGED: **GATE 1A — design doc** reviewed + folded BEFORE impl/kickoff (DONE 2026-06-22: 4 grounded Claude lenses folded; Codex design pass best-effort). **GATE 1B — impl plan / a PR's concrete tasks** reviewed BEFORE dispatching build executors (NARROWER — code anchors, migration/rollback shapes, ordering, verify commands). **Kickoff + status = supervisor self-check, not a model gate.**
- GATE 2 (pre-TEST migration): see MIGRATION DISCIPLINE.
- GATE 3 (pre-push): Codex review in parallel with the Claude code-reviewer; dedupe + rebuttal-pass both.
- GATE 4 (pre-finalize): Codex 2nd opinion on any real suggested bot change (accept-leaning, or non-trivial reject-leaning) BEFORE finalizing. Pure-nit/no-code-change findings skip it.

PER-PR RITUAL (every PR — compact; canonical detail in the cited auto-loaded memories):
1. Pre-push: DISPATCH a code-reviewer agent on `git diff main...HEAD` (the agent reads, not you) + **GATE 3 Codex** in parallel. Dedupe + rebuttal-pass; fix-ups BEFORE push. Re-dispatch on every push. (`feedback_bot_review_investigation`)
2. `npm run check`, push, `gh pr create`.
3. Wait for external bot reviewers (they're the 2nd pass — no redundant agent here).
4. FOUR-SURFACE TRIAGE — `/pr-triage <PR>` (or the four `gh` queries): issue-comments, review summaries, line-comments, checks/failed-run logs. Confirm the underlying RUN (`gh run view <id> --json status,conclusion`), not the cached `gh pr checks`. "0 findings" needs evidence from all four. After a fix-up push, re-collect by timestamp. (`feedback_pr_comment_surfaces`)
5. Investigate + rebuttal-pass EVERY finding; default-reject hardening below the bar. **GATE 4 Codex** on real suggested changes. Surface reconciled accept/reject {bot · rebuttal · Codex} BEFORE applying. (`feedback_pr_bot_review_workflow`)
6. Consolidated fix-up commits — never amend pushed commits.
7. **Re-verify TEST DB after EVERY round that touched DB-applied state** (`feedback_per_round_test_db_verification`).
8. Round-cap after 2 bot rounds; 3rd round = critical-bugs-only.

WHAT NEVER TO DO WITHOUT EXPLICIT USER INSTRUCTION:
- `git push` to main (commits go through PRs only) · merge a PR · approve a PROD migration in CI/CD · `git push --force`
- Re-write the design/impl plan to "improve" mid-execution
- `git add -A` (would stage the intentionally-untracked `*-kickoff.md` + `heritage-worksheet-form/` — stage files explicitly; bit Wave-3 PR B)
- Hard-delete or mutate PROD lesson data without an explicit go for that specific change

WHAT'S OK without asking:
- `git push -u origin chore/wave4-...` for the current feature branch · `git commit` on the feature branch · `gh pr create`
- Reading anything, running tests/baseline checks, MCP **read** queries on TEST/PROD, dispatching review agents

VERIFICATION BEFORE COMPLETION:
- Before claiming a task done, run its verify commands; evidence before assertions. "Tests pass" = you ran them and saw green. (`superpowers:verification-before-completion`)

TDD WHERE APPROPRIATE:
- C83 Zod fixture + C49 frontend change are test-first. Don't skip the failing-test step.

# SESSION SCOPE

Carry as many tasks as supervisor context comfortably allows: dispatch → verify → checkpoint the status header → next. Session boundary = supervisor context budget, NOT task count. Always stop for: any user-gated decision (`[user-verdict]` questions, merge, PROD approval), any anomaly needing judgment, or heavy context → session-end ritual + hand off. Stop at commit boundaries — never mid-task.

# SESSION-END RITUAL (do LAST, every session)

1. `npm run check` — must pass.
2. `git status && git log --oneline -5 origin/main..HEAD` — confirm what landed.
3. Update the execution status file: refresh the Current State header (~300-500 words: active PR / branch / last commits / what next session picks up / blockers / pre-next-PR verification); append a session-log entry (commit hashes + task IDs + decisions + learnings); update recent-decisions + out-of-scope follow-ups. The SUPERVISOR owns this file.
4. Commit the status file (+ kickoff edits only if a ritual/lock changed).
5. **PR-cycle archival** (at the START of each new PR cycle): move the prior PR's session entries into `-execution-status-archive.md`; audit each for learnings to promote to feedback memories / MEMORY.md before moving.
6. **Initiative-close retrospective (FINAL session only):** (a) lift out-of-scope follow-ups into project memory / hygiene lists; (b) promote process learnings to feedback memories; (c) check whether anything should AMEND the scaffolding templates or `/kickoff-feature` (propose, don't silently edit); (d) **MEMORY.md hygiene on close** — compress this initiative's index line to a ≤40-word status+pointer, flip the campaign memory frontmatter to closed, relocate rare-use forensics to a `reference_*.md` satellite (MEMORY.md auto-loads, ~24.4KB hard cap).
7. Tell me in 2-3 sentences what got done + what next session picks up. End there.

# AUTO-LOADED MEMORY (already in context, don't duplicate)

`feedback_multi_session_execution` (this pattern's rule), `feedback_data_safety_top_priority`,
`feedback_per_round_test_db_verification`, `feedback_pr_bot_review_workflow`,
`feedback_bot_review_investigation`, `feedback_pr_comment_surfaces`, `feedback_verbatim_identifiers_in_probes`,
`feedback_codex_return_inline`, `feedback_prefer_codex_commands`, `feedback_codex_over_crossexamine`,
`reference_data_mutation_gotchas`, `reference_ci_flakes`, `project_deferred_work_campaign`,
`project_imported_non_esynyc_drops`, `project_metadata_cleanup_candidates`. Re-read on demand.

# EXECUTION STATUS FILE

Lives at `docs/plans/2026-06-22-wave4-data-corpus-cleanup-execution-status.md` (created at scaffold time). If missing, recreate from the status-doc template.

# RIGHT NOW

Read this prompt → read design doc → read impl plan from current task → read status file → `npm run check` → tell me where you are and what's next. Don't start coding until I confirm.

**The design doc Status is "Draft" → this is the design-lock session (Session 1).** Work the design's §4 "Open design questions" list — discovery against real code/data, lock answers into the doc, flip Status to Locked, author the impl plan's concrete tasks. **No implementation code this session.** Respect tags: `[evidence-lockable]` you may lock from evidence with a one-line rationale; `[user-verdict]` get evidence + a recommendation presented to the user, who decides — NEVER lock those unilaterally. (Several questions are already GATE-A-grounded — confirm the grounding holds, then lock.)

<!-- ===== END OF KICKOFF BODY ===== -->
